import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type HydratedCoin, type SimpleMakeUnsignedNFTOfferRequest } from '../client/ChiaCloudWalletClient';
import { bech32m } from 'bech32';
import {
  useWalletConnection,
  useWalletCoins,
  useWalletState,
  useNFTOffers
} from '../hooks/useChiaWalletSDK';
import { injectModalStyles } from './modal-styles';
import { PiInfo } from 'react-icons/pi';
import { SavedOffer } from './types';
import { Selector, type SelectorItem } from './Selector';
import { convertIpfsUrl } from '../utils/ipfs';

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNft?: HydratedCoin | null;
  onOfferCreated?: (offerData: any) => void;
  onRefreshWallet?: () => void;
  // New props for initial values from global dialog system
  initialOfferAmount?: string;
  initialDepositAddress?: string;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  isOpen,
  onClose,
  selectedNft: initialSelectedNft,
  onOfferCreated,
  onRefreshWallet,
  initialOfferAmount,
  initialDepositAddress
}) => {
  // Get wallet state from hooks (using same pattern as other modals)
  const { address } = useWalletConnection();
  const { nftCoins, refresh: refreshCoins } = useWalletCoins();
  const walletState = useWalletState();
  const { syntheticPublicKey } = walletState;
  const { createNFTOffer, isCreatingOffer } = useNFTOffers();

  // Inject shared modal styles
  React.useEffect(() => {
    injectModalStyles();
  }, []);

  // Local NFT metadata state - we'll fetch metadata directly from metadataUris
  const [nftMetadata, setNftMetadata] = useState<Map<string, any>>(new Map());
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());

  // wUSDC.b asset ID
  const WUSDC_ASSET_ID = 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d';

  const [selectedNft, setSelectedNft] = useState<HydratedCoin | null>(null);
  const [offerAmount, setOfferAmount] = useState(initialOfferAmount || '');
  const [depositAddress, setDepositAddress] = useState(initialDepositAddress || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const hasRefreshedOnOpen = useRef(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle modal opening/closing and initial setup
  useEffect(() => {
    if (isOpen) {
      setOfferAmount(initialOfferAmount || '');
      setDepositAddress(initialDepositAddress || (address || ''));
      setError(null);

      if (initialSelectedNft) {
        setSelectedNft(initialSelectedNft);
        // Load metadata for the initial NFT
        loadNftMetadata(initialSelectedNft);
      }

      if (!hasRefreshedOnOpen.current) {
        hasRefreshedOnOpen.current = true;
        refreshCoins();
      }
    } else {
      hasRefreshedOnOpen.current = false;
    }
  }, [isOpen, initialSelectedNft, initialOfferAmount, initialDepositAddress, address]);

  // Helper function to get launcher ID from HydratedCoin
  const getLauncherId = (nft: HydratedCoin): string | null => {
    const driverInfo = nft.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT' && driverInfo.info?.launcherId) {
      return driverInfo.info.launcherId;
    }
    return null;
  };

  // Use NFT coins from wallet directly - metadata will be fetched from metadataUris
  const nftCoinsToDisplay = useMemo(() => {
    return nftCoins;
  }, [nftCoins]);

  // Auto-populate deposit address with main wallet address
  useEffect(() => {
    if (address && !depositAddress) {
      setDepositAddress(address);
    }
  }, [address, depositAddress]);

  // NFT metadata management functions
  const fetchNftMetadata = useCallback(async (metadataUri: string): Promise<any> => {
    try {
      // Configure fetch to properly handle redirects and timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(metadataUri, {
        method: 'GET',
        redirect: 'follow', // Explicitly follow redirects (default but being explicit)
        mode: 'cors', // Handle CORS properly
        cache: 'default', // Use browser caching
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, */*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // More detailed error information
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch metadata (${response.status} ${response.statusText}): ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Try to parse as JSON anyway, some servers don't set proper content-type
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          console.warn('Metadata response is not valid JSON:', text.substring(0, 200));
          return null;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Metadata fetch timed out:', metadataUri);
      } else {
        console.error('Error fetching NFT metadata:', error, 'URI:', metadataUri);
      }
      return null;
    }
  }, []);

  const getCachedNftMetadata = useCallback((cacheKey: string): any => {
    if (!address) return null;

    try {
      const storageKey = `chia_nft_metadata_${address.substring(0, 16)}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const cache = JSON.parse(stored);
        const cached = cache[cacheKey];
        if (cached && Date.now() - cached.timestamp < 86400000) { // 24 hours
          return cached.data;
        }
      }
    } catch (error) {
      console.error('Error reading cached NFT metadata:', error);
    }
    return null;
  }, [address]);

  const setCachedNftMetadata = useCallback((cacheKey: string, metadata: any): void => {
    if (!address) return;

    try {
      const storageKey = `chia_nft_metadata_${address.substring(0, 16)}`;
      const existing = localStorage.getItem(storageKey);
      const cache = existing ? JSON.parse(existing) : {};

      cache[cacheKey] = {
        data: metadata,
        timestamp: Date.now()
      };

      localStorage.setItem(storageKey, JSON.stringify(cache));
    } catch (error) {
      console.error('Error caching NFT metadata:', error);
    }
  }, [address]);

  const loadNftMetadata = useCallback(async (nftCoin: HydratedCoin): Promise<void> => {
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;

    // Check if already loaded or loading
    if (nftMetadata.has(cacheKey) || loadingMetadata.has(cacheKey)) {
      return;
    }

    // Check localStorage cache first
    const cachedData = getCachedNftMetadata(cacheKey);
    if (cachedData) {
      setNftMetadata(prev => new Map(prev.set(cacheKey, cachedData)));
      return;
    }

    // Mark as loading
    setLoadingMetadata(prev => new Set(prev.add(cacheKey)));

    try {
      const metadata = await fetchNftMetadata(metadataUri);
      if (metadata) {
        setNftMetadata(prev => new Map(prev.set(cacheKey, metadata)));
        setCachedNftMetadata(cacheKey, metadata);
      }
    } catch (error) {
      console.error('Error loading NFT metadata:', error);
    } finally {
      setLoadingMetadata(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  }, [nftMetadata, loadingMetadata, fetchNftMetadata, getCachedNftMetadata, setCachedNftMetadata]);

  // Load metadata for all NFT coins when they change
  useEffect(() => {
    if (nftCoinsToDisplay.length > 0) {
      nftCoinsToDisplay.forEach((nft: HydratedCoin) => {
        // Always load metadata from metadataUris
        loadNftMetadata(nft);
      });
    }
  }, [nftCoinsToDisplay, loadNftMetadata]);

  // Utility functions
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  const getNftMetadata = (nft: HydratedCoin): any => {
    // Get metadata from the downloaded JSON (from metadataUris)
    const driverInfo = nft.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return null;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nft.coin.parentCoinInfo}_${nft.coin.puzzleHash}_${metadataUri}`;
    return nftMetadata.get(cacheKey);
  };

  const isNftMetadataLoading = (nft: HydratedCoin): boolean => {
    // Check if metadata is loading
    const driverInfo = nft.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return false;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nft.coin.parentCoinInfo}_${nft.coin.puzzleHash}_${metadataUri}`;
    return loadingMetadata.has(cacheKey);
  };

  const getNftDisplayName = (nft: HydratedCoin): string => {
    // Get name from downloaded metadata
    const metadata = getNftMetadata(nft);
    if (metadata?.name) {
      return metadata.name;
    }

    // Fall back to on-chain metadata
    const driverInfo = nft.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT') {
      const onChainMetadata = driverInfo.info?.metadata;
      if (onChainMetadata?.editionNumber && onChainMetadata?.editionTotal) {
        return `NFT Edition ${onChainMetadata.editionNumber}/${onChainMetadata.editionTotal}`;
      }
      const launcherId = driverInfo.info?.launcherId || 'Unknown';
      return `NFT ${launcherId.substring(0, 8)}...${launcherId.substring(launcherId.length - 8)}`;
    }
    return 'Unknown NFT';
  };

  const getNftCollectionName = (nft: HydratedCoin): string => {
    // Get collection name from downloaded metadata
    const metadata = getNftMetadata(nft);
    if (metadata?.collection?.name) {
      return metadata.collection.name;
    }

    // Fall back to launcher ID
    const driverInfo = nft.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT') {
      const launcherId = driverInfo.info?.launcherId || 'Unknown';
      return `Collection ${launcherId.substring(0, 8)}...${launcherId.substring(launcherId.length - 8)}`;
    }
    return 'Unknown Collection';
  };

  const getNftEditionInfo = (nft: HydratedCoin): string | undefined => {
    // Get edition info from downloaded metadata
    const metadata = getNftMetadata(nft);
    if (metadata?.series_number && metadata?.series_total) {
      return `#${metadata.series_number} of ${metadata.series_total}`;
    }
    
    // Also check for edition_number/edition_total (alternate field names)
    if (metadata?.edition_number && metadata?.edition_total) {
      return `#${metadata.edition_number} of ${metadata.edition_total}`;
    }
    
    return undefined;
  };

  // Offer saving helper functions
  const getOffersStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_active_offers';
    return `chia_active_offers_${pubKey.substring(0, 16)}`;
  }, []);

  const getNftImageUrl = useCallback((nft: HydratedCoin): string | undefined => {
    // Get image from downloaded metadata
    const metadata = getNftMetadata(nft);
    
    // Try common image field names from the metadata JSON
    if (metadata?.image) {
      return convertIpfsUrl(metadata.image);
    }
    
    if (metadata?.data_uris && metadata.data_uris.length > 0) {
      return convertIpfsUrl(metadata.data_uris[0]);
    }
    
    // Also check on-chain data URIs as fallback
    const driverInfo = nft.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT' && driverInfo.info?.metadata?.dataUris && driverInfo.info.metadata.dataUris.length > 0) {
      return convertIpfsUrl(driverInfo.info.metadata.dataUris[0]);
    }
    
    if (metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value) {
      return convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value);
    }
    
    return undefined;
  }, [getNftMetadata]);

  const saveOfferToStorage = useCallback((offerData: {
    nft: HydratedCoin;
    amount: number;
    depositAddress: string;
    wusdcAssetId: string;
    offerString: string;
    timestamp: number;
    isSigned: boolean;
    originalRequest?: any;
    dexieOfferId?: string;
    dexieOfferUrl?: string;
  }) => {
    if (!address) return;

    try {
      // Create SavedOffer object
      const savedOffer: SavedOffer = {
        id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: offerData.timestamp,
        status: 'active',
        nft: {
          coin: offerData.nft,
          metadata: getNftMetadata(offerData.nft),
          name: getNftDisplayName(offerData.nft),
          collection: getNftCollectionName(offerData.nft),
          edition: getNftEditionInfo(offerData.nft),
          imageUrl: getNftImageUrl(offerData.nft)
        },
        requestedPayment: {
          amount: offerData.amount,
          assetId: offerData.wusdcAssetId,
          assetName: 'wUSDC.b',
          depositAddress: offerData.depositAddress
        },
        offerData: {
          offerString: offerData.offerString,
          isSigned: offerData.isSigned
        },
        originalRequest: offerData.originalRequest || {} as any,
        // Dexie marketplace integration
        dexieOfferId: offerData.dexieOfferId,
        dexieOfferUrl: offerData.dexieOfferUrl
      };

      // Get existing offers
      const storageKey = getOffersStorageKey(address);
      const existing = localStorage.getItem(storageKey);
      const existingOffers: SavedOffer[] = existing ? JSON.parse(existing) : [];

      // Add new offer
      const updatedOffers = [savedOffer, ...existingOffers];

      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedOffers));

      console.log('Offer saved to localStorage:', savedOffer.id);
    } catch (error) {
      console.error('Error saving offer to localStorage:', error);
    }
  }, [address, getOffersStorageKey, getNftMetadata, getNftDisplayName, getNftCollectionName, getNftEditionInfo, getNftImageUrl]);

  // Event handlers
  const selectNft = (nft: HydratedCoin) => {
    setSelectedNft(nft);
  };

  // Validation function for Chia addresses
  const validateChiaAddress = (address: string): { isValid: boolean; error?: string } => {
    try {
      if (!address || typeof address !== 'string') {
        return { isValid: false, error: 'Address must be a non-empty string' };
      }

      const decoded = bech32m.decode(address);

      if (decoded.prefix !== 'xch') {
        return { isValid: false, error: 'Invalid address prefix: must be "xch"' };
      }

      if (decoded.words.length !== 52) {
        return { isValid: false, error: 'Invalid address data length' };
      }

      return { isValid: true };
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? `Invalid address encoding: ${err.message}` : 'Invalid address encoding',
      };
    }
  };

  const validateOfferAmount = (): boolean => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      setError('Please enter a valid offer amount');
      return false;
    }

    if (!depositAddress || depositAddress.trim() === '') {
      setError('Please enter a deposit address');
      return false;
    }

    // Validate Chia address format
    const addressValidation = validateChiaAddress(depositAddress);
    if (!addressValidation.isValid) {
      setError(`Invalid deposit address: ${addressValidation.error}`);
      return false;
    }

    if (!syntheticPublicKey) {
      setError('Synthetic public key not available. Please reconnect your wallet.');
      return false;
    }

    return true;
  };

  const submitOfferToDexie = async (offerString: string): Promise<{
    success: boolean;
    data?: {
      id: string;
      offer_url?: string;
      [key: string]: any;
    };
    error?: string;
  }> => {
    try {
      const response = await fetch('https://api.dexie.space/v1/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          offer: offerString
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Dexie API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('Offer successfully submitted to Dexie:', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Failed to submit offer to Dexie:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit offer to Dexie'
      };
    }
  };

  const submitOffer = async () => {
    if (!validateOfferAmount() || !selectedNft || !syntheticPublicKey) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Use the SDK hook to create the offer
      const simpleOfferRequest: SimpleMakeUnsignedNFTOfferRequest = {
        requested_payments: {
          cats: [{
            asset_id: WUSDC_ASSET_ID,
            deposit_address: depositAddress,
            amount: parseFloat(offerAmount)
          }]
        },
        nft_json: selectedNft
      };

      // Create the offer using the hook
      const result = await createNFTOffer(simpleOfferRequest);

      if (!result.success) {
        throw new Error((result as any).error);
      }

      // Submit to Dexie API and capture the response
      const dexieResult = await submitOfferToDexie(result.data.signed_offer);

      // Prepare the offer data including Dexie data
      const offerData = {
        nft: selectedNft,
        amount: parseFloat(offerAmount),
        depositAddress: depositAddress,
        wusdcAssetId: WUSDC_ASSET_ID,
        offerString: result.data.signed_offer,
        timestamp: Date.now(),
        isSigned: true,
        originalRequest: simpleOfferRequest,
        // Include Dexie data if submission was successful
        dexieOfferId: dexieResult.success ? dexieResult.data?.id : undefined,
        dexieOfferUrl: dexieResult.success ? dexieResult.data?.offer_url : undefined
      };

      // Save to localStorage with Dexie information

      // Save to localStorage first
      saveOfferToStorage(offerData);


      // Submit to Dexie API (don't await - run in parallel)
      submitOfferToDexie(result.data.signed_offer);

      // Also call the callback if provided (for parent component compatibility)
      onOfferCreated?.(offerData);

      console.log('Offer created and stored:', {
        localOfferId: offerData.timestamp,
        dexieOfferId: offerData.dexieOfferId,
        dexieSuccess: dexieResult.success,
        dexieError: dexieResult.error
      });

      // Show success message
      setSuccessMessage('Offer created successfully! Your offer has been submitted to the marketplace.');
      
      // Close modal after showing success message for 2 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        closeModal();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
      console.error('Error creating offer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedNft(null);
    setOfferAmount('');
    setDepositAddress(address || '');
    setError(null);
    (onClose)();
  };

  const refreshWalletData = () => {
    setIsRefreshingWallet(true);
    onRefreshWallet?.();

    setTimeout(() => {
      setIsRefreshingWallet(false);
    }, 3000);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="px-6 pb-4">
      {error && (
        <div className="p-3 rounded border border-red-300 text-red-500 bg-red-500/10 text-sm my-2 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {!syntheticPublicKey && (
        <div className="p-3 rounded border border-blue-300 text-blue-400 bg-blue-500/10 text-sm my-2 flex items-center gap-2">
          <PiInfo size={16} />
          <span>
            {isRefreshingWallet ? 'Refreshing wallet connection...' : 'Wallet is still connecting... Please wait for the connection to complete.'}
          </span>
          <button
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={refreshWalletData}
            style={{ borderColor: '#272830', color: '#EEEEF0' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            disabled={isRefreshingWallet}
          >
            {isRefreshingWallet ? (
              <>
                <div className="w-3.5 h-3.5 border border-blue-300 border-t-blue-500 rounded-full animate-spin"></div>
                Refreshing...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6"></path>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded border text-green-400 bg-green-500/10 text-sm my-2 flex items-center gap-2" style={{ borderColor: '#22c55e' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Select GPU */}
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-medium text-left">Select GPU</label>
          {(() => {
            const idForNft = (n: HydratedCoin) => getLauncherId(n) || `${n.coin.parentCoinInfo}_${n.coin.puzzleHash}`;
            const items: SelectorItem[] = nftCoinsToDisplay.map((n) => ({ id: idForNft(n), label: getNftDisplayName(n) }));
            const selectedId = selectedNft ? idForNft(selectedNft) : null;
            return (
              <Selector
                items={items}
                selectedId={selectedId || undefined}
                onSelect={(itemId) => {
                  const found = nftCoinsToDisplay.find((n) => idForNft(n) === itemId);
                  if (found) selectNft(found);
                }}
                placeholder="Select a GPU to sell"
              />
            );
          })()}
        </div>

        {/* Requested currency and Amount */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-medium text-left">Requested currency</label>
            <Selector
              items={[{ id: 'wusdc', label: 'wUSDC.b' }]}
              selectedId={'wusdc'}
              onSelect={() => { }}
              placeholder="Select currency"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-medium text-left">Amount</label>
            <div className="relative flex items-center">
              <input
                type="number"
                step="0.000001"
                min="0"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder={`0.0 ${WUSDC_ASSET_ID === 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d' ? 'wUSDC.b' : ''}`}
                className="w-full px-4 py-2 border rounded text-sm focus:outline-none placeholder-gray-300"
                style={{ backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Deposit address */}
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-medium text-left">Deposit address</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={depositAddress}
              onChange={(e) => setDepositAddress(e.target.value)}
              placeholder="xch1..."
              className="w-full px-4 py-2 border rounded text-sm focus:outline-none placeholder-gray-300"
              style={{ backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex gap-2  mb-2 p-0">
          <button type="button" onClick={onClose}
            className="px-5 py-2 bg-transparent border rounded font-medium w-1/4"
            style={{ borderColor: '#272830', color: '#EEEEF0' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            disabled={isSubmitting || isCreatingOffer}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitOffer}
            disabled={isSubmitting || isCreatingOffer || !offerAmount || !depositAddress || !syntheticPublicKey}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed w-3/4"
            style={{ backgroundColor: '#2C64F8', color: '#EEEEF0' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e56e8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C64F8'}
          >
            {(isSubmitting || isCreatingOffer) ? (
              <>
                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(238, 238, 240, 0.3)', borderTopColor: '#EEEEF0' }}></div>
                Creating Offer...
              </>
            ) : !syntheticPublicKey ? (
              'Wallet Not Ready'
            ) : (
              'Create Offer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 