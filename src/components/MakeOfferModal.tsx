import React, { useState, useEffect, useCallback } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin, type SimpleMakeUnsignedNFTOfferRequest } from '../client/ChiaCloudWalletClient';
import { bech32m } from 'bech32';
import { 
  useWalletConnection, 
  useWalletCoins,
  useWalletState,
  useNFTOffers
} from '../hooks/useChiaWalletSDK';
import { injectModalStyles } from './modal-styles';
import { SavedOffer } from './types';

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
  const { address, isConnected } = useWalletConnection();
  const { hydratedCoins } = useWalletCoins();
  const walletState = useWalletState();
  const { syntheticPublicKey } = walletState;
  const { createNFTOffer, isCreatingOffer } = useNFTOffers();
  
  // Inject shared modal styles
  React.useEffect(() => {
    injectModalStyles();
  }, []);
  
  // Local NFT metadata state (similar to ChiaWalletModal pattern)
  const [nftMetadata, setNftMetadata] = useState<Map<string, any>>(new Map());
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());

  // wUSDC.b asset ID
  const WUSDC_ASSET_ID = 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d';

  const [selectedNft, setSelectedNft] = useState<HydratedCoin | null>(null);
  const [offerAmount, setOfferAmount] = useState(initialOfferAmount || '');
  const [depositAddress, setDepositAddress] = useState(initialDepositAddress || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select-nft' | 'confirm'>('select-nft');
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);

  // Initialize selectedNft when modal opens with a pre-selected NFT and handle initial values
  useEffect(() => {
    if (isOpen && initialSelectedNft) {
      setSelectedNft(initialSelectedNft);
      setStep('confirm'); // Skip NFT selection step if NFT is pre-selected
    } else if (isOpen && !initialSelectedNft) {
      // Reset to selection step when opening without pre-selected NFT
      setStep('select-nft');
      setSelectedNft(null);
    }
    
    // Update initial values when modal opens
    if (isOpen) {
      setOfferAmount(initialOfferAmount || '');
      setDepositAddress(initialDepositAddress || (address || ''));
      setError(null);
    }
  }, [isOpen, initialSelectedNft, initialOfferAmount, initialDepositAddress, address]);

  // Filter NFTs only
  const nftCoinsToDisplay = hydratedCoins.filter((coin: HydratedCoin) => {
    const driverInfo = coin.parentSpendInfo.driverInfo;
    return driverInfo?.type === 'NFT';
  });

  // Auto-populate deposit address with main wallet address
  useEffect(() => {
    if (address && !depositAddress) {
      setDepositAddress(address);
    }
  }, [address, depositAddress]);

  // NFT metadata management functions
  const fetchNftMetadata = useCallback(async (metadataUri: string): Promise<any> => {
    try {
      const response = await fetch(metadataUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
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
      nftCoinsToDisplay.forEach((nftCoin: HydratedCoin) => {
        loadNftMetadata(nftCoin);
      });
    }
  }, [nftCoinsToDisplay, loadNftMetadata]);

  // Utility functions
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };

  const convertIpfsUrl = (url: string): string => {
    if (!url) return url;
    
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }
    
    if (!url.startsWith('http') && url.length > 40) {
      return `https://ipfs.io/ipfs/${url}`;
    }
    
    return url;
  };

  const getNftMetadata = (nftCoin: HydratedCoin): any => {
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return null;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return nftMetadata.get(cacheKey);
  };

  const isNftMetadataLoading = (nftCoin: HydratedCoin): boolean => {
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return false;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return loadingMetadata.has(cacheKey);
  };

  const getNftDisplayName = (nftCoin: HydratedCoin): string => {
    const metadata = getNftMetadata(nftCoin);
    if (metadata?.name) {
      return metadata.name;
    }
    
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
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

  const getNftCollectionName = (nftCoin: HydratedCoin): string => {
    const metadata = getNftMetadata(nftCoin);
    if (metadata?.collection?.name) {
      return metadata.collection.name;
    }
    
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT') {
      const launcherId = driverInfo.info?.launcherId || 'Unknown';
      return `Collection ${launcherId.substring(0, 8)}...${launcherId.substring(launcherId.length - 8)}`;
    }
    return 'Unknown Collection';
  };

  const getNftEditionInfo = (nftCoin: HydratedCoin): string | undefined => {
    const metadata = getNftMetadata(nftCoin);
    if (metadata?.series_number && metadata?.series_total) {
      return `#${metadata.series_number} of ${metadata.series_total}`;
    }
    return undefined;
  };

  // Offer saving helper functions
  const getOffersStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_active_offers';
    return `chia_active_offers_${pubKey.substring(0, 16)}`;
  }, []);

  const getNftImageUrl = useCallback((nftCoin: HydratedCoin): string | undefined => {
    const metadata = getNftMetadata(nftCoin);
    if (metadata?.data_uris && metadata.data_uris.length > 0) {
      return metadata.data_uris[0];
    }
    if (metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value) {
      return metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value;
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
        originalRequest: offerData.originalRequest || {} as any
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
    setStep('confirm');
  };

  const goBack = () => {
    if (step === 'confirm') {
      setStep('select-nft');
      setSelectedNft(null);
      setOfferAmount('');
      setDepositAddress(address || '');
    }
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
        nft_data: selectedNft
      };

      // Create the offer using the hook
      const result = await createNFTOffer(simpleOfferRequest);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Prepare the offer data
      const offerData = {
        nft: selectedNft,
        amount: parseFloat(offerAmount),
        depositAddress: depositAddress,
        wusdcAssetId: WUSDC_ASSET_ID,
        offerString: result.data.signed_offer,
        timestamp: Date.now(),
        isSigned: true,
        originalRequest: simpleOfferRequest
      };
      
      // Always save to localStorage directly
      saveOfferToStorage(offerData);
      
      // Also call the callback if provided (for parent component compatibility)
      onOfferCreated?.(offerData);

      closeModal();
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
    setStep('select-nft');
    setError(null);
    onClose();
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
    <>
      <div className="modal-overlay make-offer-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
        <div className="modal-content make-offer-content">
          <div className="modal-header">
            <div className="header-content">
              {step !== 'select-nft' && (
                <button className="back-btn" onClick={goBack}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5"></path>
                    <path d="M12 19l-7-7 7-7"></path>
                  </svg>
                </button>
              )}
              <h3>
                {step === 'select-nft' ? 'Make Offer - Select NFT' : 'Make Offer - Confirm'}
              </h3>
            </div>
            <button className="close-btn" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!syntheticPublicKey && (
            <div className="info-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>
                {isRefreshingWallet ? 'Refreshing wallet connection...' : 'Wallet is still connecting... Please wait for the connection to complete.'}
              </span>
              <button 
                className="refresh-wallet-btn" 
                onClick={refreshWalletData} 
                disabled={isRefreshingWallet}
              >
                {isRefreshingWallet ? (
                  <>
                    <div className="refresh-spinner"></div>
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

          {step === 'select-nft' ? (
            <div className="step-content">
              <p className="step-description">Select the NFT you want to make an offer for:</p>
              
              {nftCoinsToDisplay.length === 0 ? (
                <div className="no-items">
                  <p>No NFTs found in your wallet</p>
                </div>
              ) : (
                <div className="nft-grid">
                  {nftCoinsToDisplay.map((nft: HydratedCoin, index: number) => {
                    const metadata = getNftMetadata(nft);
                    const isLoading = isNftMetadataLoading(nft);
                    const editionInfo = getNftEditionInfo(nft);
                    
                    return (
                      <div key={index} className="nft-card" onClick={() => selectNft(nft)}>
                        <div className="nft-image">
                          {isLoading ? (
                            <div className="nft-loading">
                              <div className="nft-spinner"></div>
                            </div>
                          ) : metadata?.data_uris && metadata.data_uris.length > 0 ? (
                            <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                          ) : metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                            <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                          ) : (
                            <div className="nft-placeholder">🖼️</div>
                          )}
                        </div>
                        <div className="nft-info">
                          <h4>{getNftDisplayName(nft)}</h4>
                          <p className="nft-collection">{getNftCollectionName(nft)}</p>
                          {editionInfo && <p className="nft-edition">{editionInfo}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="step-content">
              <div className="offer-summary">
                <h4>Offer Summary</h4>
                
                <div className="summary-section">
                  <h5>NFT to Offer:</h5>
                  <div className="nft-summary-card">
                    <div className="nft-summary-image">
                      {selectedNft && isNftMetadataLoading(selectedNft) ? (
                        <div className="nft-loading">
                          <div className="nft-spinner"></div>
                        </div>
                      ) : selectedNft ? (
                        (() => {
                          const metadata = getNftMetadata(selectedNft);
                          return metadata?.data_uris && metadata.data_uris.length > 0 ? (
                            <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                          ) : metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                            <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                          ) : (
                            '🖼️'
                          );
                        })()
                      ) : null}
                    </div>
                    <div className="nft-summary-info">
                      <h6>{selectedNft ? getNftDisplayName(selectedNft) : ''}</h6>
                      <p>{selectedNft ? getNftCollectionName(selectedNft) : ''}</p>
                      {selectedNft && getNftEditionInfo(selectedNft) && (
                        <p className="nft-edition">{getNftEditionInfo(selectedNft)}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h5>Payment Token:</h5>
                  <div className="cat-summary-card">
                    <div className="cat-summary-icon">💰</div>
                    <div className="cat-summary-info">
                      <h6>wUSDC.b</h6>
                      <p>Asset ID: {formatAddress(WUSDC_ASSET_ID)}</p>
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h5>Offer Amount:</h5>
                  <div className="amount-input-group">
                    <input 
                      type="number" 
                      step="0.000001" 
                      min="0" 
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="Enter amount..."
                      className="amount-input"
                      disabled={isSubmitting}
                    />
                    <span className="amount-unit">wUSDC.b</span>
                  </div>
                </div>

                <div className="summary-section">
                  <h5>Deposit Address:</h5>
                  <input 
                    type="text" 
                    value={depositAddress}
                    onChange={(e) => setDepositAddress(e.target.value)}
                    placeholder="Enter Chia address (xch...) or puzzle hash..."
                    className="deposit-address-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="action-buttons">
                <button className="cancel-btn" onClick={closeModal} disabled={isSubmitting || isCreatingOffer}>
                  Cancel
                </button>
                <button 
                  className="submit-btn" 
                  onClick={submitOffer} 
                  disabled={isSubmitting || isCreatingOffer || !offerAmount || !depositAddress || !syntheticPublicKey}
                >
                  {isSubmitting || isCreatingOffer ? (
                    <>
                      <div className="button-spinner"></div>
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
          )}
        </div>
      </div>
    </div>

    {/* MakeOfferModal-specific styles */}
      <style>{`
        /* Make Offer Modal Specific Styles */
        .modal-overlay.make-offer-overlay {
          z-index: 1100;
        }

        .modal-content.make-offer-content {
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-content h3 {
          margin: 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }

        .back-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          color: white;
          background: #333;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          color: white;
          background: #333;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          margin-bottom: 20px;
          color: #ef4444;
          font-size: 14px;
        }

        .info-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          margin-bottom: 20px;
          color: #3b82f6;
          font-size: 14px;
        }

        .refresh-wallet-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 6px;
          color: #3b82f6;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: auto;
        }

        .refresh-wallet-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.6);
        }

        .refresh-wallet-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-spinner {
          width: 12px;
          height: 12px;
          border: 1.5px solid rgba(59, 130, 246, 0.3);
          border-top: 1.5px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .step-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .step-description {
          margin: 0;
          color: #ccc;
          font-size: 14px;
        }

        .no-items {
          text-align: center;
          padding: 40px 20px;
          color: #888;
          background: #262626;
          border-radius: 12px;
          border: 1px solid #333;
        }

        .no-items p {
          margin: 0;
          font-size: 14px;
        }

        .nft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .nft-card {
          background: #262626;
          border-radius: 12px;
          border: 1px solid #333;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nft-card:hover {
          background: #333;
          border-color: #6bc36b;
          transform: translateY(-2px);
        }

        .nft-image {
          width: 100%;
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nft-placeholder {
          font-size: 48px;
          color: #666;
        }

        .nft-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .nft-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #333;
          border-top: 2px solid #6bc36b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .nft-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nft-info h4 {
          margin: 0 0 4px 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.3;
        }

        .nft-collection {
          margin: 0 0 4px 0;
          color: #888;
          font-size: 12px;
        }

        .nft-edition {
          margin: 0;
          color: #6bc36b;
          font-size: 11px;
          font-weight: 500;
        }

        .offer-summary {
          background: #262626;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #333;
        }

        .offer-summary h4 {
          margin: 0 0 20px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .summary-section {
          margin-bottom: 20px;
        }

        .summary-section:last-child {
          margin-bottom: 0;
        }

        .summary-section h5 {
          margin: 0 0 8px 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .nft-summary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #333;
          border-radius: 8px;
        }

        .nft-summary-image {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
          overflow: hidden;
        }

        .nft-summary-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nft-summary-info h6 {
          margin: 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .nft-summary-info p {
          margin: 4px 0 0 0;
          color: #888;
          font-size: 12px;
        }

        .cat-summary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #333;
          border-radius: 8px;
        }

        .cat-summary-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #404040;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .cat-summary-info h6 {
          margin: 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .cat-summary-info p {
          margin: 4px 0 0 0;
          color: #888;
          font-size: 12px;
        }

        .amount-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .amount-input {
          flex: 1;
          padding: 12px;
          background: #333;
          border: 1px solid #404040;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-family: monospace;
        }

        .amount-input:focus {
          outline: none;
          border-color: #6bc36b;
        }

        .amount-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .amount-unit {
          color: #888;
          font-size: 14px;
          font-weight: 500;
        }

        .deposit-address-input {
          width: 100%;
          padding: 12px;
          background: #333;
          border: 1px solid #404040;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-family: monospace;
        }

        .deposit-address-input:focus {
          outline: none;
          border-color: #6bc36b;
        }

        .deposit-address-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .cancel-btn {
          flex: 1;
          padding: 12px;
          background: none;
          border: 1px solid #333;
          border-radius: 8px;
          color: #888;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #333;
          color: white;
        }

        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .submit-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #6bc36b;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #4a9f4a;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}; 