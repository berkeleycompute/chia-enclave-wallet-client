import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PiHandCoins, PiKey } from "react-icons/pi";
import {
  useWalletConnection,
  useWalletBalance,
  useWalletCoins,
  // useSendTransaction,
  useUnifiedWalletClient
} from '../hooks/useChiaWalletSDK';
import { SentTransaction } from './types';
import { UnifiedWalletClient } from '../client/UnifiedWalletClient';
import {
  useSpacescanNFTs,
  useSpacescanBalance,
  useSpacescanXCHTransactions,
  useSpacescanNFTTransactions,
  useSpacescanTokenTransactions,
  getTokenDisplayName,
  type SpacescanNFT,
  type SpacescanTransaction,
  type SpacescanNFTTransaction,
  type SpacescanTokenTransaction
} from '../client/SpacescanClient';
import { SendFundsModal } from './SendFundsModal';
import { ReceiveFundsModal } from './ReceiveFundsModal';
import { MakeOfferModal } from './MakeOfferModal';
import { ActiveOffersModal } from './ActiveOffersModal';
import { NFTDetailsModal } from './NFTDetailsModal';
import { TransactionsModal } from './TransactionsModal';
import { ViewAssetsModal } from './ViewAssetsModal';
import { sharedModalStyles } from './modal-styles';
// Import the new dialog hooks
import {
  useSendFundsDialog,
  useMakeOfferDialog,
  useReceiveFundsDialog,
  useActiveOffersDialog,
  useNFTDetailsDialog,
  useTransactionsDialog,
  useViewAssetsDialog
} from '../hooks/useDialogs';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';
import { PiX } from 'react-icons/pi';
import { useMnemonic } from '../hooks/useWalletInfo';
import { useGlobalDialogs } from './GlobalDialogProvider';

export interface ChiaWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  jwtToken?: string | null;
  onWalletUpdate?: (walletData: any) => void;
  // Unified client prop
  walletClient?: UnifiedWalletClient;
  // Optional footer content above disconnect button
  footer?: React.ReactNode;
}

export const ChiaWalletModal: React.FC<ChiaWalletModalProps> = ({
  isOpen,
  onClose,
  jwtToken,
  onWalletUpdate,
  walletClient,
  footer,
}) => {
  // Use provided client or fall back to hooks
  const hookWalletClient = useUnifiedWalletClient();
  const actualWalletClient = walletClient || hookWalletClient;

  // Extract values for easier access
  const { walletState } = actualWalletClient;

  // Still need hooks for connection methods and balance operations
  const hookConnection = useWalletConnection();
  const hookBalance = useWalletBalance();

  // Extract connection methods (always use hooks for these)
  const {
    connect,
    disconnect,
    setJwtToken
  } = hookConnection;

  const {
    isLoading: balanceLoading,
    refresh: refreshBalance
  } = hookBalance;

  // Extract values from unified wallet state
  const {
    isConnected,
    address,
    coinCount,
    error,
    isConnecting = false,
  } = walletState;

  const {
    hydratedCoins,
    isLoading: coinsLoading,
    error: coinsError
  } = useWalletCoins();

  // Dialogs
  const sendFundsDialog = useSendFundsDialog();
  const receiveFundsDialog = useReceiveFundsDialog();
  const makeOfferDialog = useMakeOfferDialog();
  const activeOffersDialog = useActiveOffersDialog();
  const nftDetailsDialog = useNFTDetailsDialog();
  const transactionsDialog = useTransactionsDialog();
  const viewAssetsDialog = useViewAssetsDialog();

  // Use Spacescan for NFTs and balance
  const {
    nfts: spacescanNfts,
    loading: _nftsLoading,
    error: _nftsError,
    count: _nftCount,
    refetch: _refetchNfts
  } = useSpacescanNFTs(address);

  // Use Spacescan for balance display
  const spacescanBalance = useSpacescanBalance(address);

  // Use Spacescan for transaction history (last 100 transactions)
  const spacescanXchTransactions = useSpacescanXCHTransactions(address, 100, 0);
  const spacescanNftTransactions = useSpacescanNFTTransactions(address, 100, 0);
  const spacescanTokenTransactions = useSpacescanTokenTransactions(address, 100, 0);

  // Use Spacescan NFTs as the primary NFT source
  const nftCoins = spacescanNfts;

  // Asset/offer counts
  const assetsCount = useMemo(() => (Array.isArray(nftCoins) ? nftCoins.length : 0), [nftCoins]);
  const [offersCount, setOffersCount] = useState<number>(0);

  // Helper functions for NFT data (moved to component level)
  const getNftMetadata = (nft: SpacescanNFT | HydratedCoin): any => {
    // Handle Spacescan NFT format
    if ('nft_id' in nft) {
      return nft.metadata || null;
    }

    // Handle legacy HydratedCoin format
    const driverInfo = (nft as HydratedCoin).parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return null;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${(nft as HydratedCoin).coin.parentCoinInfo}_${(nft as HydratedCoin).coin.puzzleHash}_${metadataUri}`;
    return nftMetadata.get(cacheKey);
  };

  const getNftDisplayName = (nft: SpacescanNFT | HydratedCoin): string => {
    // Handle Spacescan NFT format
    if ('nft_id' in nft) {
      // Use the name field directly from Spacescan API
      if (nft.name) {
        return nft.name;
      }
      // Fallback to metadata name
      const metadata = nft.metadata;
      if (metadata?.name) {
        return metadata.name;
      }
      if (nft.edition_number && nft.edition_total) {
        return `NFT Edition ${nft.edition_number}/${nft.edition_total}`;
      }
      return `NFT ${nft.nft_id.substring(0, 8)}...${nft.nft_id.substring(nft.nft_id.length - 8)}`;
    }

    // Handle legacy HydratedCoin format
    const metadata = getNftMetadata(nft);
    if (metadata?.name) {
      return metadata.name;
    }

    const driverInfo = (nft as HydratedCoin).parentSpendInfo.driverInfo;
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

  const getNftCollectionName = (nft: SpacescanNFT | HydratedCoin): string => {
    // Handle Spacescan NFT format
    if ('nft_id' in nft) {
      if (nft.collection_name) {
        return nft.collection_name;
      }
      if (nft.metadata?.collection?.name) {
        return nft.metadata.collection.name;
      }
      if (nft.collection_id) {
        return `Collection ${nft.collection_id.substring(0, 8)}...${nft.collection_id.substring(nft.collection_id.length - 8)}`;
      }
      return `Collection ${nft.nft_id.substring(0, 8)}...${nft.nft_id.substring(nft.nft_id.length - 8)}`;
    }

    // Handle legacy HydratedCoin format
    const metadata = getNftMetadata(nft);
    if (metadata?.collection?.name) {
      return metadata.collection.name;
    }

    const driverInfo = (nft as HydratedCoin).parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT') {
      const launcherId = driverInfo.info?.launcherId || 'Unknown';
      return `Collection ${launcherId.substring(0, 8)}...${launcherId.substring(launcherId.length - 8)}`;
    }
    return 'Unknown Collection';
  };

  const getNftEditionInfo = (nft: SpacescanNFT | HydratedCoin): string | undefined => {
    // Handle Spacescan NFT format
    if ('nft_id' in nft) {
      if (nft.edition_number && nft.edition_total) {
        return `#${nft.edition_number} of ${nft.edition_total}`;
      }
      const metadata = nft.metadata;
      if (metadata?.series_number && metadata?.series_total) {
        return `#${metadata.series_number} of ${metadata.series_total}`;
      }
      return undefined;
    }

    // Handle legacy HydratedCoin format
    const metadata = getNftMetadata(nft);
    if (metadata?.series_number && metadata?.series_total) {
      return `#${metadata.series_number} of ${metadata.series_total}`;
    }
    return undefined;
  };

  const getNftImageUrl = (nft: SpacescanNFT | HydratedCoin): string | undefined => {
    // Handle Spacescan NFT format
    if ('nft_id' in nft) {

      return `https://edge.silicon-staging.net/spacescan/mintgarden/nfts/${nft.nft_id}/thumbnail`
    }

    // Handle legacy HydratedCoin format
    const metadata = getNftMetadata(nft);
    if (metadata?.data_uris && metadata.data_uris.length > 0) {
      return metadata.data_uris[0];
    }
    if (metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value) {
      return metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value;
    }
    return undefined;
  };

  // const { sendXCH, isSending } = useSendTransaction();

  // Replace manual modal states with dialog hooks (migrated above)

  // Local UI state
  const [currentView, setCurrentView] = useState<'main' | 'transactions'>('main');
  const [sentTransactions, setSentTransactions] = useState<SentTransaction[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  // NFT metadata state (keep this as it's specific to this modal)
  const [nftMetadata, setNftMetadata] = useState<Map<string, any>>(new Map());
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());

  // Auto-connect when JWT token is provided
  useEffect(() => {
    if (jwtToken && !isConnected && !isConnecting) {
      console.log('🔑 Auto-connecting with provided JWT token');
      setJwtToken(jwtToken).then(() => {
        connect();
      });
    }
  }, [jwtToken, isConnected, isConnecting, setJwtToken, connect]);

  // Memoize wallet data to prevent unnecessary re-renders
  const walletData = useMemo(() => ({
    connected: isConnected,
    address: address,
    balance: spacescanBalance.xch || 0,
    coinCount: coinCount,
    formattedBalance: spacescanBalance.formattedBalance
  }), [isConnected, address, spacescanBalance.xch, spacescanBalance.formattedBalance, coinCount]);

  // Use ref to track previous wallet data
  const prevWalletDataRef = useRef<any>(null);

  // Combined transactions from all Spacescan sources
  const allTransactions = useMemo(() => {
    const combined: Array<{
      id: string;
      type: 'XCH' | 'NFT' | 'TOKEN';
      amount?: number;
      nft_id?: string;
      asset_id?: string;
      created_at_time: number;
      confirmed_at_height: number;
      spent_at_time?: number;
      spent_at_height?: number;
      coin_name: string;
      data: SpacescanTransaction | SpacescanNFTTransaction | SpacescanTokenTransaction;
    }> = [];

    // Add XCH transactions
    spacescanXchTransactions.transactions.forEach(tx => {
      const timestamp = new Date(tx.time).getTime() / 1000; // Convert ISO string to timestamp
      combined.push({
        id: tx.coin_id,
        type: 'XCH',
        amount: tx.amount_mojo, // Use mojo amount for consistency
        created_at_time: timestamp,
        confirmed_at_height: tx.height,
        spent_at_time: undefined, // XCH transactions don't have spent info in this format
        spent_at_height: undefined,
        coin_name: tx.coin_id,
        data: tx
      });
    });

    // Add NFT transactions
    spacescanNftTransactions.transactions.forEach(tx => {
      const timestamp = new Date(tx.time).getTime() / 1000; // Convert ISO string to timestamp
      combined.push({
        id: tx.coin_id,
        type: 'NFT',
        nft_id: tx.nft_id,
        created_at_time: timestamp,
        confirmed_at_height: tx.height,
        spent_at_time: undefined, // NFT transactions don't have spent info in this format
        spent_at_height: undefined,
        coin_name: tx.coin_id,
        data: tx
      });
    });

    // Add Token transactions
    spacescanTokenTransactions.transactions.forEach(tx => {
      const timestamp = new Date(tx.time).getTime() / 1000; // Convert ISO string to timestamp
      combined.push({
        id: tx.coin_id,
        type: 'TOKEN',
        amount: tx.token_amount,
        asset_id: tx.asset_id,
        created_at_time: timestamp,
        confirmed_at_height: tx.height,
        spent_at_time: undefined, // Token transactions don't have spent info in this format
        spent_at_height: undefined,
        coin_name: tx.coin_id,
        data: tx
      });
    });

    // Sort by creation time (newest first)
    return combined.sort((a, b) => b.created_at_time - a.created_at_time);
  }, [spacescanXchTransactions.transactions, spacescanNftTransactions.transactions, spacescanTokenTransactions.transactions]);

  // Helper function to format transaction amount
  const formatTransactionAmount = (transaction: typeof allTransactions[0]): string => {
    if (transaction.type === 'XCH' && transaction.amount) {
      const xchAmount = transaction.amount / 1e12; // Convert mojo to XCH
      return `${xchAmount.toFixed(6)} XCH`;
    } else if (transaction.type === 'TOKEN' && transaction.amount) {
      // For token transactions, use the token display name mapping
      const tokenData = transaction.data as any;
      const tokenDisplayName = getTokenDisplayName(transaction.asset_id || '', tokenData.token_id);
      return `${transaction.amount} ${tokenDisplayName}`;
    } else if (transaction.type === 'NFT') {
      return 'NFT';
    }
    return 'Unknown';
  };

  // Emit wallet updates only when data actually changes
  useEffect(() => {
    if (onWalletUpdate && isConnected && !spacescanBalance.loading) {
      const prevData = prevWalletDataRef.current;
      const currentData = walletData;

      // Only call onWalletUpdate if the data has actually changed
      if (!prevData ||
        prevData.connected !== currentData.connected ||
        prevData.address !== currentData.address ||
        prevData.balance !== currentData.balance ||
        prevData.coinCount !== currentData.coinCount ||
        prevData.formattedBalance !== currentData.formattedBalance) {

        prevWalletDataRef.current = currentData;
        onWalletUpdate(currentData);
      }
    }
  }, [onWalletUpdate, isConnected, spacescanBalance.loading, walletData]);

  // Storage key generators for NFT metadata
  const getNftMetadataStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_nft_metadata';
    return `chia_nft_metadata_${pubKey.substring(0, 16)}`;
  }, []);

  const getOffersStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_active_offers';
    return `chia_active_offers_${pubKey.substring(0, 16)}`;
  }, []);

  const refreshOffersCount = useCallback(() => {
    if (!address) {
      setOffersCount(0);
      return;
    }
    try {
      const storageKey = getOffersStorageKey(address);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const offers = JSON.parse(stored);
        const activeCount = Array.isArray(offers)
          ? offers.filter((o: any) => o && o.status === 'active').length
          : 0;
        setOffersCount(activeCount);
      } else {
        setOffersCount(0);
      }
    } catch (e) {
      setOffersCount(0);
    }
  }, [address, getOffersStorageKey]);

  useEffect(() => {
    refreshOffersCount();
  }, [refreshOffersCount, address, makeOfferDialog.isOpen, activeOffersDialog.isOpen]);

  // NFT metadata functions (keep as they're specific to this modal)
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
          'Accept': 'application/json, */*',
          'User-Agent': 'Chia-Wallet-Client/1.0'
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
      const stored = localStorage.getItem(getNftMetadataStorageKey(address));
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
  }, [address, getNftMetadataStorageKey]);

  const setCachedNftMetadata = useCallback((cacheKey: string, metadata: any): void => {
    if (!address) return;

    try {
      const storageKey = getNftMetadataStorageKey(address);
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
  }, [address, getNftMetadataStorageKey]);

  const loadNftMetadata = useCallback(async (nftCoin: HydratedCoin): Promise<void> => {
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0]; // Use first URI
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
    const nftCoins = hydratedCoins.filter(coin => {
      const driverInfo = coin.parentSpendInfo.driverInfo;
      return driverInfo?.type === 'NFT';
    });

    // Load metadata for each NFT coin
    nftCoins.forEach(nftCoin => {
      loadNftMetadata(nftCoin);
    });
  }, [hydratedCoins, loadNftMetadata]);

  // Save offer to localStorage
  /*
  const saveOffer = useCallback((offerData: {
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

      console.log('Offer saved:', savedOffer.id);
    } catch (error) {
      console.error('Error saving offer:', error);
    }
  }, [address, getOffersStorageKey, nftMetadata]);
  */

  // Utility functions
  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 7)}...${address.substring(address.length - 4)}`;
  }, []);

  const formatTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }, []);

  // NFT utility functions
  /*
  const getCoinType = useCallback((hydratedCoin: HydratedCoin): string => {
    const driverInfo = hydratedCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'CAT') return 'CAT';
    if (driverInfo?.type === 'NFT') return 'NFT';
    return 'XCH';
  }, []);
  */

  /*
  const getCoinTypeIcon = useCallback((coinType: string): string => {
    switch (coinType) {
      case 'CAT': return '🎭';
      case 'NFT': return '🖼️';
      default: return '💰';
    }
  }, []);
  */

  /*
  const getAssetInfo = useCallback((hydratedCoin: HydratedCoin): string => {
    const driverInfo = hydratedCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'CAT') {
      const assetId = driverInfo.assetId || 'Unknown';
      return `Asset ID: ${assetId.substring(0, 8)}...${assetId.substring(assetId.length - 8)}`;
    } else if (driverInfo?.type === 'NFT') {
      const launcherId = driverInfo.info?.launcherId || 'Unknown';
      const metadata = driverInfo.info?.metadata;
      if (metadata?.editionNumber && metadata?.editionTotal) {
        return `Edition ${metadata.editionNumber}/${metadata.editionTotal}`;
      }
      return `Launcher: ${launcherId.substring(0, 8)}...${launcherId.substring(launcherId.length - 8)}`;
    }
    return 'Standard XCH';
  }, []);
  */

  /*
  const formatCoinAmount = useCallback((hydratedCoin: HydratedCoin): string => {
    const coinType = getCoinType(hydratedCoin);
    const amount = Number(hydratedCoin.coin.amount);

    if (coinType === 'XCH') {
      return `${(amount / 1000000000000).toFixed(6)} XCH`;
    } else if (coinType === 'CAT') {
      // For CAT tokens, we might need proper decimal handling
      return `${(amount / 1000000000000).toFixed(6)} units`;
    } else {
      return `${amount.toString()} NFT`;
    }
  }, [getCoinType]);
  */

  // NFT metadata utility functions
  // Legacy NFT metadata functions removed - now using Spacescan API

  const convertIpfsUrl = useCallback((url: string): string => {
    if (!url) return url;

    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }

    if (!url.startsWith('http') && url.length > 40) {
      return `https://ipfs.io/ipfs/${url}`;
    }

    return url;
  }, []);

  const addSentTransaction = useCallback((amount: number, recipient: string, fee: number = 0, transactionId?: string, blockchainStatus?: string) => {
    const transaction: SentTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'outgoing',
      amount,
      recipient,
      fee,
      timestamp: Date.now(),
      status: 'pending',
      transactionId,
      blockchainStatus
    };

    setSentTransactions(prev => [...prev, transaction]);
    setCurrentView('transactions');
  }, []);

  const handleTransactionSent = useCallback((transactionData: any) => {
    addSentTransaction(
      transactionData.amount,
      transactionData.recipient,
      transactionData.fee,
      transactionData.transactionId,
      transactionData.blockchainStatus
    );

    // Refresh balance after sending transaction
    setTimeout(() => {
      refreshBalance();
    }, 1000);
  }, [addSentTransaction, refreshBalance]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      console.log('Copied to clipboard:', text);
      // Reset the success state after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Export private key - open modal from GlobalDialogProvider
  const globalDialogs = (() => {
    try {
      return useGlobalDialogs();
    } catch {
      return null;
    }
  })();
  const { exportMnemonic, loading: isExportingMnemonic } = useMnemonic({ jwtToken });
  const handleExportPrivateKey = useCallback(async () => {
    if (globalDialogs) {
      // Use global modal if provider exists
      (globalDialogs as any).openExportKeyDialog?.();
      return;
    }
    // Fallback: export mnemonic and copy
    try {
      const phrase = await exportMnemonic();
      if (phrase) {
        await copyToClipboard(phrase);
      }
    } catch {}
  }, [globalDialogs, exportMnemonic, copyToClipboard]);

  // Event handlers
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const closeModal = () => {
    onClose();
    setCurrentView('main');
    // Close all dialogs using hooks
    sendFundsDialog.close();
    receiveFundsDialog.close();
    makeOfferDialog.close();
    activeOffersDialog.close();
    nftDetailsDialog.close();
    transactionsDialog.close();
    viewAssetsDialog.close();
  };

  // Inline NFT details view removed; using dedicated NFTDetailsModal instead

  /*
  const getConnectionStatus = (): string => {
    if (!isConnected) return 'Not connected';
    if (isConnecting) return 'Connecting...';
    if (error) return 'Connection error';
    return 'Connected';
  };
  */

  // Show loading states
  const isLoading = isConnecting || balanceLoading || coinsLoading;
  const hasError = error || coinsError;

  return (
    <>
      {/* Send Modal */}
      <SendFundsModal
        isOpen={sendFundsDialog.isOpen}
        onClose={sendFundsDialog.close}
        onCloseWallet={closeModal}
        onTransactionSent={handleTransactionSent}
      />

      {/* Receive Modal */}
      <ReceiveFundsModal
        isOpen={receiveFundsDialog.isOpen}
        onClose={receiveFundsDialog.close}
        onCloseWallet={closeModal}
      />

      {/* Make Offer Modal */}
      <MakeOfferModal
        isOpen={makeOfferDialog.isOpen}
        onClose={makeOfferDialog.close}
        onCloseWallet={closeModal}
        onOfferCreated={() => {
          refreshOffersCount();
        }}
        onRefreshWallet={refreshBalance}
      />

      {/* Active Offers Modal */}
      <ActiveOffersModal
        isOpen={activeOffersDialog.isOpen}
        onClose={activeOffersDialog.close}
        onCloseWallet={closeModal}
        onOfferUpdate={() => {
          // Refresh offers when status changes
          console.log('Offers updated');
        }}
        onCreateOffer={() => {
          makeOfferDialog.open();
        }}
      />

      {/* NFT Details Modal */}
      <NFTDetailsModal
        isOpen={nftDetailsDialog.isOpen}
        onClose={nftDetailsDialog.close}
        onCloseWallet={closeModal}
        nft={nftDetailsDialog.selectedNft}
      />

      {/* Transactions Modal */}
      <TransactionsModal
        isOpen={transactionsDialog.isOpen}
        onClose={transactionsDialog.close}
        onCloseWallet={closeModal}
      />

      {/* View Assets Modal */}
      <ViewAssetsModal
        isOpen={viewAssetsDialog.isOpen}
        onClose={viewAssetsDialog.close}
        onCloseWallet={closeModal}
        onNFTSelected={(nft) => {
          try {
            // If received NFT is legacy type, open NFT details dialog
            // This cast aligns with our NFTDetailsModal expectations
            nftDetailsDialog.open((nft as unknown) as HydratedCoin);
          } catch (e) {
            console.warn('Unable to open NFT details from ViewAssetsModal selection');
          }
        }}
      />

      {/* Main Modal */}
      {isOpen && (
        <div
          className="modal-overlay"
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          tabIndex={0}
        >
          <div className="modal-content" role="document" tabIndex={0}>
            <div className="modal-header">
              <div className="modal-header-inner">
                <div className="wallet-info">
                  <div className="wallet-avatar">
                    <div className="avatar-circle">
                    </div>
                    <div className="wallet-badge">
                      <svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5149 2.74281V1.02852C10.5149 0.876967 10.4547 0.731624 10.3476 0.624458C10.2404 0.517298 10.095 0.457092 9.9435 0.457092H2.51493C2.21182 0.457092 1.92113 0.577498 1.70681 0.791829C1.49248 1.00616 1.37207 1.29685 1.37207 1.59995M1.37207 1.59995C1.37207 1.90305 1.49248 2.19374 1.70681 2.40807C1.92113 2.6224 2.21182 2.74281 2.51493 2.74281H11.0864C11.2379 2.74281 11.3833 2.80301 11.4904 2.91017C11.5976 3.01734 11.6578 3.16268 11.6578 3.31424V5.59995M1.37207 1.59995V9.59995C1.37207 9.90304 1.49248 10.1937 1.70681 10.4081C1.92113 10.6224 2.21182 10.7428 2.51493 10.7428H11.0864C11.2379 10.7428 11.3833 10.6826 11.4904 10.5754C11.5976 10.4683 11.6578 10.3229 11.6578 10.1714V7.88566M11.6578 5.59995H9.9435C9.64041 5.59995 9.34973 5.72035 9.13538 5.93469C8.92104 6.14903 8.80064 6.43972 8.80064 6.74281C8.80064 7.04589 8.92104 7.33658 9.13538 7.55092C9.34973 7.76526 9.64041 7.88566 9.9435 7.88566H11.6578M11.6578 5.59995C11.8093 5.59995 11.9547 5.66018 12.0618 5.76732C12.169 5.87446 12.2292 6.01984 12.2292 6.17138V7.31424C12.2292 7.46578 12.169 7.61115 12.0618 7.71829C11.9547 7.82544 11.8093 7.88566 11.6578 7.88566" stroke="#3E67C1" strokeWidth="0.857143" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div className="wallet-details">
                    <div className="wallet-address-row">
                      <h3 className="wallet-address">
                        {address ? formatAddress(address) : 'xch1g9u...y4ua'}
                      </h3>
                      <div className="copy-icon" onClick={() => copyToClipboard(address || 'xch1g9u...y4ua')}>
                        {copySuccess ? (
                          <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.25 4.75L5.5 11.5L2.75 8.75" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M1 10.0001C1 10.8285 1.67157 11.5001 2.5 11.5001H4V10.5001H2.5C2.22386 10.5001 2 10.2762 2 10.0001V3.00006C2 2.72392 2.22386 2.50006 2.5 2.50006H9.5C9.77614 2.50006 10 2.72392 10 3.00006V4.50002H5.5C4.67158 4.50002 4 5.17159 4 6.00002V13C4 13.8284 4.67158 14.5 5.5 14.5H12.5C13.3284 14.5 14 13.8284 14 13V6.00002C14 5.17159 13.3284 4.50002 12.5 4.50002H11V3.00006C11 2.17163 10.3284 1.50006 9.5 1.50006H2.5C1.67157 1.50006 1 2.17163 1 3.00006V10.0001ZM5 6.00002C5 5.72388 5.22386 5.50002 5.5 5.50002H12.5C12.7761 5.50002 13 5.72388 13 6.00002V13C13 13.2762 12.7761 13.5 12.5 13.5H5.5C5.22386 13.5 5 13.2762 5 13V6.00002Z" fill="#7C7A85" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className="account-type">Connected</p>
                  </div>
                </div>
              </div>
              <button className="header-btn close-btn-absolute" onClick={closeModal} aria-label="Close modal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.8504 6.45054C19.2097 6.09126 19.2097 5.50874 18.8504 5.14946C18.4912 4.79018 17.9086 4.79018 17.5494 5.14946L11.9999 10.6989L6.45043 5.14946C6.09113 4.79018 5.50862 4.79018 5.14934 5.14946C4.79006 5.50874 4.79006 6.09126 5.14934 6.45054L10.6988 12L5.14934 17.5495C4.79006 17.9088 4.79006 18.4912 5.14934 18.8506C5.50862 19.2098 6.09113 19.2098 6.45043 18.8506L11.9999 13.3011L17.5494 18.8506C17.9086 19.2098 18.4912 19.2098 18.8504 18.8506C19.2097 18.4912 19.2097 17.9088 18.8504 17.5495L13.301 12L18.8504 6.45054Z" fill="#7C7A85" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {isLoading && !isConnected ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Connecting to wallet...</p>
                </div>
              ) : hasError && !isConnected ? (
                <div className="error-state">
                  <p className="error-message">{error || coinsError}</p>
                  <button className="retry-btn" onClick={connect}>
                    Retry
                  </button>
                </div>
              ) : isConnected ? (
                <>
                  {currentView === 'main' ? (
                    <>
                      {/* Action Buttons */}
                      <div className="action-buttons">
                        <button className="action-btn send-btn" onClick={() => sendFundsDialog.open()}>
                          <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.4574 1.79248C14.3317 1.66682 14.1747 1.57694 14.0027 1.53212C13.8307 1.4873 13.6498 1.48915 13.4787 1.53748H13.4693L1.47307 5.17748C1.27832 5.23361 1.10522 5.34759 0.976711 5.50432C0.848201 5.66105 0.77035 5.85313 0.753473 6.05511C0.736597 6.25708 0.781492 6.45942 0.882209 6.6353C0.982927 6.81119 1.13471 6.95231 1.31745 7.03998L6.62495 9.62498L9.2062 14.9294C9.28648 15.1007 9.41413 15.2455 9.57405 15.3466C9.73397 15.4477 9.91949 15.5009 10.1087 15.5C10.1374 15.5 10.1662 15.4987 10.1949 15.4962C10.3968 15.4799 10.5888 15.4022 10.7452 15.2736C10.9016 15.145 11.0149 14.9717 11.0699 14.7769L14.7074 2.78061C14.7074 2.77748 14.7074 2.77436 14.7074 2.77123C14.7564 2.60059 14.7591 2.41998 14.7151 2.24797C14.6712 2.07596 14.5822 1.91875 14.4574 1.79248ZM10.1143 14.4906L10.1112 14.4994V14.495L7.60745 9.35123L10.6074 6.35123C10.6973 6.2567 10.7466 6.13083 10.7449 6.00045C10.7432 5.87007 10.6907 5.74549 10.5985 5.65329C10.5063 5.56109 10.3817 5.50856 10.2514 5.50689C10.121 5.50522 9.9951 5.55455 9.90057 5.64436L6.90057 8.64436L1.75495 6.14061H1.75057H1.75932L13.7499 2.49998L10.1143 14.4906Z" fill="#7C7A85" />
                          </svg>
                          <span>Send</span>
                        </button>
                        <button className="action-btn receive-btn" onClick={() => receiveFundsDialog.open()}>
                          <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.89625 7.35375C3.80243 7.25993 3.74972 7.13268 3.74972 7C3.74972 6.86732 3.80243 6.74007 3.89625 6.64625C3.99007 6.55243 4.11732 6.49972 4.25 6.49972C4.38268 6.49972 4.50993 6.55243 4.60375 6.64625L8.25 10.2931V2C8.25 1.86739 8.30268 1.74021 8.39645 1.64645C8.49021 1.55268 8.61739 1.5 8.75 1.5C8.88261 1.5 9.00979 1.55268 9.10355 1.64645C9.19732 1.74021 9.25 1.86739 9.25 2V10.2931L12.8962 6.64625C12.9427 6.59979 12.9979 6.56294 13.0586 6.5378C13.1192 6.51266 13.1843 6.49972 13.25 6.49972C13.3157 6.49972 13.3808 6.51266 13.4414 6.5378C13.5021 6.56294 13.5573 6.59979 13.6038 6.64625C13.6502 6.6927 13.6871 6.74786 13.7122 6.80855C13.7373 6.86925 13.7503 6.9343 13.7503 7C13.7503 7.0657 13.7373 7.13075 13.7122 7.19145C13.6871 7.25214 13.6502 7.3073 13.6038 7.35375L9.10375 11.8538C9.05731 11.9002 9.00217 11.9371 8.94147 11.9623C8.88077 11.9874 8.81571 12.0004 8.75 12.0004C8.68429 12.0004 8.61923 11.9874 8.55853 11.9623C8.49783 11.9371 8.44269 11.9002 8.39625 11.8538L3.89625 7.35375ZM14.25 13H3.25C3.11739 13 2.99021 13.0527 2.89645 13.1464C2.80268 13.2402 2.75 13.3674 2.75 13.5C2.75 13.6326 2.80268 13.7598 2.89645 13.8536C2.99021 13.9473 3.11739 14 3.25 14H14.25C14.3826 14 14.5098 13.9473 14.6036 13.8536C14.6973 13.7598 14.75 13.6326 14.75 13.5C14.75 13.3674 14.6973 13.2402 14.6036 13.1464C14.5098 13.0527 14.3826 13 14.25 13Z" fill="#7C7A85" />
                          </svg>
                          <span>Receive</span>
                        </button>
                      </div>

                      {/* Balance Section */}
                      <div className="balance-section">
                        <div className="balance-item">
                          <div className="balance-left">
                            <div className="token-icon-small">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M13.2019 6.10456C12.8363 6.12729 12.0596 6.21872 11.7577 6.27461C10.8985 6.43363 10.1713 6.68895 9.59736 7.03318C8.89069 7.45698 8.47902 7.78375 7.93465 8.353L7.58269 8.72104L7.32782 9.07199C7.01028 9.50926 6.89933 9.6915 6.68376 10.1297C6.44521 10.6147 6.24284 11.1842 6.1606 11.6021C6.14587 11.6769 6.11801 11.8104 6.09866 11.8988L6.06349 12.0596L6.03837 13.2961L6.15313 13.9884L6.19481 13.9966C6.21772 14.0011 6.28814 13.9611 6.35129 13.9078C6.90817 13.4378 8.17309 12.7935 9.47599 12.3162C9.62284 12.2624 9.81399 12.1913 9.90077 12.1582C10.1277 12.0717 10.9892 11.7816 11.2601 11.7006C11.3869 11.6626 11.6818 11.5743 11.9154 11.5043C12.1491 11.4342 12.5368 11.3226 12.7771 11.2561C13.0174 11.1896 13.3536 11.0956 13.5242 11.0471C13.971 10.9203 14.0169 10.9287 13.6366 11.0677C13.2292 11.2165 12.2937 11.6074 11.8548 11.8122C11.788 11.8434 11.6296 11.9156 11.5028 11.9728C10.8382 12.2724 9.46424 12.9692 8.86916 13.3084C7.38025 14.1572 6.08485 14.9936 4.90052 15.8708C4.50089 16.1668 4.14444 16.4339 4.05096 16.5074C3.99088 16.5546 3.76696 16.7297 3.55336 16.8966C3.33976 17.0634 3.03244 17.3065 2.87041 17.4367C2.70839 17.5669 2.53637 17.7045 2.48811 17.7425C2.43986 17.7805 2.40039 17.8222 2.40039 17.8352C2.40039 17.8746 2.49792 17.8619 2.56656 17.8136C2.6657 17.7439 2.99387 17.5673 3.55336 17.2827C5.19942 16.4454 6.32192 15.997 6.91186 15.9413L7.09058 15.9243L7.37305 16.2184C7.92215 16.79 8.54068 17.2028 9.28996 17.4978C10.5043 17.9759 11.9229 18.0379 13.2869 17.6726C14.0207 17.4761 14.7341 17.1723 15.2992 16.8157C16.7651 15.8907 18.4099 13.7797 20.2126 10.5096C20.3751 10.2148 20.5081 9.969 20.5081 9.96336C20.5081 9.9577 20.6073 9.76487 20.7286 9.53485C21.0386 8.94693 21.6004 7.77861 21.6004 7.7219V7.67454L20.9754 7.46505C20.4264 7.28105 20.148 7.19088 19.7314 7.06209C18.9531 6.82151 17.4213 6.44182 16.6001 6.28594C16.2209 6.21395 15.6567 6.14915 15.0831 6.11169C14.7481 6.0898 13.5148 6.08513 13.2019 6.10456Z" fill="#0E9F6E" />
                              </svg>
                            </div>
                            <div className="balance-details">
                              <h4 className="token-name">Chia</h4>
                              {spacescanBalance.loading ? (
                                <p className="token-balance">Loading...</p>
                              ) : spacescanBalance.error ? (
                                <p className="token-balance">Error</p>
                              ) : (
                                <p className="token-balance">{spacescanBalance.formattedBalance} XCH</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Options */}
                      <div className="menu-options">
                        <div className="offers-row">
                          <button
                            className={`menu-item`}
                            onClick={() => {
                              activeOffersDialog.open();
                            }}
                            title={''}
                          >
                            <div className="menu-icon-large">
                              <PiHandCoins size={24} />
                            </div>
                            <span>Offers ({offersCount})</span>
                          </button>
                          <div className="offers-divider"></div>
                          <button
                            className="menu-item"
                            onClick={() => viewAssetsDialog.open()}
                          >
                            <div className="menu-icon-large">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M18.0898 10.37C19.0351 10.7224 19.8763 11.3075 20.5355 12.0712C21.1948 12.8349 21.6509 13.7524 21.8615 14.7391C22.0722 15.7257 22.0307 16.7495 21.7408 17.7158C21.451 18.6822 20.9221 19.5598 20.2032 20.2676C19.4843 20.9754 18.5985 21.4905 17.6278 21.7652C16.657 22.04 15.6327 22.0655 14.6495 21.8395C13.6663 21.6134 12.7559 21.1431 12.0026 20.472C11.2493 19.8009 10.6774 18.9507 10.3398 18" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M7 6H8V10" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16.7098 13.88L17.4098 14.59L14.5898 17.41" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <span>Assets ({assetsCount})</span>
                          </button>
                        </div>

                        <button className="menu-item" onClick={() => transactionsDialog.open()}>
                          <div className="menu-icon-large">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" clipRule="evenodd" d="M4.0002 6.39999C3.55837 6.39999 3.2002 6.75817 3.2002 7.19999C3.2002 7.64182 3.55837 7.99999 4.0002 7.99999H20.0002C20.442 7.99999 20.8002 7.64182 20.8002 7.19999C20.8002 6.75817 20.442 6.39999 20.0002 6.39999H4.0002ZM3.2002 12C3.2002 11.5582 3.55837 11.2 4.0002 11.2H20.0002C20.442 11.2 20.8002 11.5582 20.8002 12C20.8002 12.4418 20.442 12.8 20.0002 12.8H4.0002C3.55837 12.8 3.2002 12.4418 3.2002 12ZM3.2002 16.8C3.2002 16.3582 3.55837 16 4.0002 16H20.0002C20.442 16 20.8002 16.3582 20.8002 16.8C20.8002 17.2418 20.442 17.6 20.0002 17.6H4.0002C3.55837 17.6 3.2002 17.2418 3.2002 16.8Z" fill="#7C7A85" />
                            </svg>
                          </div>
                          <span>Transactions</span>
                        </button>

                        <button className="menu-item" onClick={handleExportPrivateKey} disabled={isExportingMnemonic}>
                          <div className="menu-icon-large">
                            <PiKey size={16} />
                          </div>
                          <span>{isExportingMnemonic ? 'Exporting...' : 'Export private key'}</span>
                        </button>
                      </div>


                    </>
                  ) : null}
                </>
              ) : (
                <div className="connect-state">
                  <p>Connect your Chia wallet to get started</p>
                  <button className="connect-btn" onClick={connect}>
                    Connect Wallet
                  </button>
                </div>
              )}

              {/* Footer Section - Inside Modal Body */}
              {isConnected && footer && footer}
            </div>

            {/* Disconnect Section - Bottom */}
            {isConnected && (
              <div className="disconnect-section">
                <button className="disconnect-btn" onClick={disconnect}>
                  <div className="disconnect-icon-large">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_1772_59567)">
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.8002 1.60001C3.91653 1.60001 3.2002 2.31636 3.2002 3.20001V20.8C3.2002 21.6837 3.91655 22.4 4.8002 22.4H16.8002C17.242 22.4 17.6002 22.0418 17.6002 21.6C17.6002 21.1582 17.242 20.8 16.8002 20.8H4.8002V3.20001H16.8002C17.242 3.20001 17.6002 2.84183 17.6002 2.40001C17.6002 1.95818 17.242 1.60001 16.8002 1.60001H4.8002ZM20.166 7.83433C19.8535 7.52189 19.3469 7.52189 19.0344 7.83433C18.7221 8.14674 18.7221 8.65327 19.0344 8.96569L21.2688 11.2H10.4002C9.95837 11.2 9.6002 11.5582 9.6002 12C9.6002 12.4418 9.95837 12.8 10.4002 12.8H21.2688L19.0344 15.0343C18.7221 15.3467 18.7221 15.8533 19.0344 16.1658C19.3469 16.4781 19.8535 16.4781 20.166 16.1658L23.766 12.5657C24.0783 12.2533 24.0783 11.7467 23.766 11.4343L20.166 7.83433Z" fill="#7C7A85" />
                      </g>
                      <defs>
                        <clipPath id="clip0_1772_59567">
                          <rect width="24" height="24" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <span>Disconnect Wallet</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Styles */}
      <style>{`

        /* Wallet Modal Specific Styles - Figma Design */
        .modal-content {
          background: #131418;
          border-radius: 16px;
          width: 90%;
          min-width: 400px;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #272830;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          color: white;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        /* Override any inherited button transforms */
        .modal-content button:hover {
          transform: none !important;
        }

        .modal-content::-webkit-scrollbar {
          display: none;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 32px 16px 0 16px;
          border-bottom: none !important;
        }

        .modal-header-inner {
          padding: 0 14px;
          width: 100%;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .wallet-avatar {
          position: relative;
        }

        .avatar-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(to bottom, #0e9f6e, #014737);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          position: relative;
        }



        .wallet-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          background: #131418;
          border: 1px solid #272830;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wallet-badge svg {
          width: 13px;
          height: 12px;
        }

        .wallet-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .wallet-address-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wallet-address {
          margin: 0;
          color: #ffffff;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          font-family: 'system-ui', sans-serif;
          text-align: left;
        }

        .copy-icon {
          width: 18px;
          height: 18px;
          cursor: pointer;
          color: #7c7a85;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .copy-icon:hover {
          background: rgba(124, 122, 133, 0.1);
          border-radius: 3px;
        }

        .copy-icon svg {
          max-width: 15px;
          max-height: 15px;
          width: auto;
          height: auto;
          transition: all 0.2s ease;
        }

        .account-type {
          margin: 0;
          color: #7c7a85;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.5;
          font-family: 'system-ui', sans-serif;
          text-align: left;
        }

        .data-freshness {
          color: #666;
          font-size: 12px;
          margin-left: 4px;
        }

        .close-btn, .back-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover, .back-btn:hover {
          color: white;
          background: #333;
        }

        .close-btn-absolute {
          position: absolute;
          top: 28px;
          right: 20px;
          width: 24px;
          height: 24px;
          background: none;
          border: none;
          color: #7c7a85;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .close-btn-absolute:hover {
          color: #ffffff;
        }

        .modal-body {
          padding: 16px;
          padding-top: 4px;
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(251, 146, 60, 0.1);
          border: 1px solid rgba(251, 146, 60, 0.3);
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #fb923c;
        }

        .refresh-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          color: white;
          background: #333;
        }

        .loading-state, .error-state, .connect-state {
          text-align: center;
          padding: 40px 20px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top: 3px solid #6bc36b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: #ef4444;
          margin-bottom: 16px;
        }

        .retry-btn, .connect-btn {
          background: #6bc36b;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .retry-btn:hover, .connect-btn:hover {
          background: #4a9f4a;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          padding: 0px 16px 0 16px;
          margin: 0 0 24px 0;
          width: 100%;
        }

        .action-btn {
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 4px;
          border: 1px solid #272830;
          background: transparent;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          color: #eeeef0;
          font-size: 14px;
          font-family: 'system-ui', sans-serif;
        }

        .action-btn:hover {
          border-color: #3b82f6;
          transform: none !important;
        }

        .action-btn svg,
        .action-btn img {
          max-width: 16px;
          max-height: 16px;
          width: auto;
          height: auto;
          color: #eeeef0;
          object-fit: contain;
        }

        .balance-section {
          margin: 0 0 0px 0;
          width: 100%;
        }

        .balance-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 14px;
          background: transparent;
          border: none;
          border-radius: 8px;
        }



        .balance-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .token-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .token-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .token-icon-small {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .token-icon-small svg {
          max-width: 24px;
          max-height: 24px;
          width: auto;
          height: auto;
        }

        .balance-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }

        .token-name {
          margin: 0;
          color: #ffffff;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          font-family: 'system-ui', sans-serif;
        }

        .token-balance {
          margin: 0;
          color: #7c7a85;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.5;
          font-family: 'system-ui', sans-serif;
        }



        .balance-amount {
          margin: 0;
          color: #22c55e;
          font-size: 18px;
          font-weight: 700;
        }

        .balance-subtitle {
          margin: 4px 0 0 0;
          color: #9CA3AF;
          font-size: 14px;
          font-weight: 500;
        }

        .balance-amount.syncing {
          color: #fb923c;
        }

        .balance-amount.error {
          color: #ef4444;
        }

        .balance-subtitle {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .balance-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .balance-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #333;
          border-top: 2px solid #fb923c;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .balance-error {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .balance-retry {
          background: #ef4444;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .balance-retry:hover {
          background: #dc2626;
        }

        .menu-options {
          margin: 0 0 0px 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .offers-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .offers-row .menu-item {
          flex: 1;
        }

        .offers-divider {
          width: 1px;
          height: 24px;
          background-color: #272830;
          flex-shrink: 0;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          border-radius: 8px;
        }

        .menu-item:hover {
          background: #1b1c22;
        }

        .menu-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          color: #ffffff;
          flex-shrink: 0;
        }

        .menu-icon svg {
          width: 18px;
          height: 18px;
        }

        .menu-icon-large {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          color: #ffffff;
          flex-shrink: 0;
        }

        .menu-icon-large svg,
        .menu-icon-large img {
          max-width: 24px;
          max-height: 24px;
          width: auto;
          height: auto;
          object-fit: contain;
          color: #7C7A85;
        }

        .menu-item span {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
          font-family: 'system-ui', sans-serif;
          line-height: 1.5;
        }

        .menu-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .badge {
          background: #6bc36b;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: auto;
        }

        .badge {
          background: #6bc36b;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-indicator {
          font-size: 12px;
          margin-left: auto;
        }

        .disconnect-section {
          margin-top: 0;
          padding: 12px 16px;
          border-top: 1px solid #272830;
        }

        .disconnect-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          border-radius: 8px;
        }

        .disconnect-btn:hover {
          background: #1b1c22;
          box-shadow: none;
          transform: none !important;
        }

        .disconnect-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          color: #ffffff;
          flex-shrink: 0;
        }

        .disconnect-icon svg {
          width: 18px;
          height: 18px;
        }

        .disconnect-icon-large {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          color: #ffffff;
          flex-shrink: 0;
        }

        .disconnect-icon-large svg,
        .disconnect-icon-large img {
          max-width: 24px;
          max-height: 24px;
          width: auto;
          height: auto;
          object-fit: contain;
        }

        .disconnect-btn span {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
          font-family: 'system-ui', sans-serif;
          line-height: 1.5;
        }

        .transactions-view, .assets-view {
          margin-bottom: 24px;
        }

        .transactions-header, .assets-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 4px;
        }

        .transactions-header h4, .assets-header h4 {
          margin: 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
          flex: 1;
          text-align: center;
        }

        .back-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          margin-right: 8px;
        }

        .back-btn:hover {
          color: white;
          background: #333;
        }

        .transactions-list {
          background: #262626;
          border-radius: 12px;
          border: 1px solid #333;
          max-height: 500px;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .transactions-list::-webkit-scrollbar {
          display: none;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid #333;
        }

        .transaction-item:last-child {
          border-bottom: none;
        }

        .transaction-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .transaction-item.incoming .transaction-icon {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .transaction-item.outgoing .transaction-icon {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .transaction-info {
          flex: 1;
          min-width: 0;
        }

        .transaction-amount {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .transaction-item.incoming .transaction-amount {
          color: #22c55e;
        }

        .transaction-item.outgoing .transaction-amount {
          color: #ef4444;
        }

        .transaction-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .transaction-address {
          color: #888;
          font-size: 12px;
          font-family: monospace;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .transaction-fee {
          color: #999;
          font-size: 11px;
          font-weight: 500;
        }

        .transaction-id {
          color: #6bc36b;
          font-size: 11px;
          font-family: monospace;
          font-weight: 500;
          cursor: pointer;
        }

        .transaction-id:hover {
          color: #4a9f4a;
        }

        .coin-type-icon {
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .asset-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .asset-type {
          font-weight: 600;
          color: #60a5fa;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .asset-details {
          font-size: 12px;
          color: #888;
          font-family: monospace;
        }

        .transaction-item.cat {
          border-left: 3px solid #f59e0b;
        }

        .transaction-item.nft {
          border-left: 3px solid #8b5cf6;
        }

        .transaction-item.xch {
          border-left: 3px solid #10b981;
        }

        .transaction-status.cat {
          color: #f59e0b;
        }

        .transaction-status.nft {
          color: #8b5cf6;
        }

        .transaction-status.xch {
          color: #10b981;
        }

        .transaction-time {
          color: #666;
          font-size: 11px;
        }

        .transaction-status {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .transaction-status.pending {
          background: rgba(251, 146, 60, 0.2);
          color: #fb923c;
        }

        .transaction-status.confirmed {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .no-transactions, .no-assets {
          padding: 40px 20px;
          text-align: center;
          color: #888;
        }

        .no-transactions p, .no-assets p {
          margin: 0;
          font-size: 14px;
        }

        .assets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 16px;
          max-height: 500px;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .assets-grid::-webkit-scrollbar {
          display: none;
        }

        .asset-card {
          background: #262626;
          border-radius: 12px;
          border: 1px solid #333;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 180px;
          display: flex;
          flex-direction: column;
        }

        .asset-card:hover {
          background: #333;
          border-color: #6bc36b;
        }

        .asset-image {
          width: 100%;
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 8px;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .asset-placeholder {
          font-size: 48px;
          color: #666;
        }

        .asset-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .asset-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #333;
          border-top: 2px solid #6bc36b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .asset-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }

        .asset-info h5 {
          margin: 0 0 4px 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .asset-collection {
          margin: 0 0 4px 0;
          color: #888;
          font-size: 12px;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .asset-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          min-height: 0;
        }

        /* Send Modal Specific Styles */
        .token-section {
          margin-bottom: 20px;
        }

        .token-section label {
          display: block;
          color: #888;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .token-select {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #262626;
          border: 1px solid #6bc36b;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .token-select:hover {
          border-color: #4a9f4a;
        }

        .token-icon {
          font-size: 24px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #333;
          border-radius: 50%;
        }

        .token-info {
          flex: 1;
        }

        .token-name {
          display: block;
          color: white;
          font-weight: 600;
          font-size: 16px;
          line-height: 1.2;
        }

        .token-symbol {
          color: #888;
          font-size: 14px;
          font-weight: 500;
        }

        .send-to-section,
        .amount-section,
        .fee-section {
          margin-bottom: 20px;
        }

        .recipient-input,
        .amount-input,
        .fee-input {
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          color: white;
          outline: none;
          transition: all 0.2s;
          font-weight: 500;
        }

        .recipient-input:focus,
        .amount-input:focus,
        .fee-input:focus {
          border-color: #6bc36b;
        }

        .recipient-input::placeholder,
        .amount-input::placeholder,
        .fee-input::placeholder {
          color: #666;
        }

        .recipient-input {
          width: 90%;
          padding: 16px;
          font-size: 14px;
          font-family: "Courier New", monospace;
          line-height: 1.2;
          word-break: break-all;
          min-height: 48px;
          max-height: 64px;
          resize: none;
          overflow-wrap: break-word;
        }

        .amount-input-container,
        .fee-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .amount-input,
        .fee-input {
          width: 100%;
          padding: 16px;
          padding-right: 60px;
          font-size: 18px;
          font-weight: 700;
        }

        .fee-input {
          font-size: 16px;
        }

        .currency-label {
          position: absolute;
          right: 16px;
          color: #888;
          font-size: 16px;
          font-weight: 600;
        }

        .success-message {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 500;
          background: #22c55e;
          color: white;
        }



        /* Receive Modal Specific Styles */
        .qr-section {
          margin-bottom: 24px;
        }

        .qr-code {
          position: relative;
          display: inline-block;
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .qr-image {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }

        .qr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #666;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #6bc36b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        .qr-loading p {
          margin: 0;
          font-size: 14px;
        }

        .qr-center-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 8px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          font-size: 24px;
        }

        .address-section {
          text-align: center;
        }

        .address-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: #262626;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid #333;
        }

        .address-text {
          color: white;
          font-family: monospace;
          font-size: 16px;
          font-weight: 600;
        }

        .copy-btn {
          background: #6bc36b;
          color: white;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-btn:hover {
          background: #4a9f4a;
        }

        .copy-btn.copied {
          background: #22c55e;
        }

        .address-description {
          color: #888;
          font-size: 14px;
          margin: 0;
        }

        .error-state {
          padding: 40px 20px;
          color: #ef4444;
          text-align: center;
        }

        /* Make Offer Modal Specific Styles */
        .make-offer-content {
          max-width: 600px;
          max-height: 80vh;
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
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
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

        /* NFT Details Modal Specific Styles */
        .nft-details-modal {
          max-width: 600px;
          max-height: 80vh;
        }

        .nft-details {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .nft-image-large {
          width: 100%;
          height: 300px;
          border-radius: 12px;
          overflow: hidden;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nft-image-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nft-placeholder-large {
          font-size: 96px;
          color: #666;
        }

        .nft-metadata {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nft-basic-info h4 {
          margin: 0 0 8px 0;
          color: white;
          font-size: 20px;
          font-weight: 600;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .nft-description {
          margin: 0 0 16px 0;
          color: #ccc;
          font-size: 14px;
          line-height: 1.5;
        }

        .nft-collection, .nft-edition {
          margin-bottom: 16px;
        }

        .nft-collection h5, .nft-edition h5 {
          margin: 0 0 4px 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .nft-collection p, .nft-edition p {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .collection-description {
          margin: 4px 0 0 0 !important;
          color: #999 !important;
          font-size: 12px !important;
          line-height: 1.4;
        }

        .nft-attributes h5 {
          margin: 0 0 8px 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .attributes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }

        .attribute-item {
          background: #333;
          border-radius: 8px;
          padding: 8px;
          border: 1px solid #404040;
        }

        .attribute-name {
          color: #888;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .attribute-value {
          color: white;
          font-size: 13px;
          font-weight: 600;
          word-break: break-word;
          line-height: 1.3;
          overflow-wrap: break-word;
        }

        .nft-collection-links h5 {
          margin: 0 0 8px 0;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .collection-links {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .collection-link {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #333;
          border-radius: 6px;
          color: #6bc36b;
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .collection-link:hover {
          background: #404040;
          color: #4a9f4a;
        }

        /* Active Offers Modal Specific Styles */

        .active-offers-modal {
          max-width: 700px;
          max-height: 85vh;
        }

        .offer-details-modal {
          max-width: 600px;
          max-height: 80vh;
        }

        .no-offers {
          text-align: center;
          padding: 60px 20px;
          color: #888;
        }

        .no-offers-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .no-offers h4 {
          margin: 0 0 12px 0;
          color: white;
          font-size: 20px;
          font-weight: 600;
        }

        .no-offers p {
          margin: 0;
          font-size: 14px;
          color: #999;
        }

        .offers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 60vh;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .offers-list::-webkit-scrollbar {
          display: none;
        }

        .offer-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .offer-item:hover {
          background: #333;
          border-color: #6bc36b;
        }

        .offer-nft-preview {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .offer-nft-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .offer-nft-placeholder {
          font-size: 32px;
          color: #666;
        }

        .offer-info {
          flex: 1;
          min-width: 0;
        }

        .offer-nft-name {
          color: white;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .offer-nft-collection {
          color: #888;
          font-size: 14px;
          margin-bottom: 6px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .offer-payment {
          color: #6bc36b;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .offer-time {
          color: #666;
          font-size: 12px;
        }

        .offer-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-badge.status-active {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .status-badge.status-completed {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .status-badge.status-cancelled {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .status-badge.status-expired {
          background: rgba(251, 146, 60, 0.2);
          color: #fb923c;
        }

        .offer-type {
          color: #888;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .offer-actions-preview {
          color: #666;
          flex-shrink: 0;
          margin-left: 8px;
        }

        /* Offer Details Modal Styles */
        .offer-detail-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .offer-nft-section h4,
        .offer-payment-section h4,
        .offer-metadata-section h4 {
          margin: 0 0 12px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .offer-nft-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
        }

        .offer-nft-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .offer-nft-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .offer-nft-placeholder {
          font-size: 40px;
          color: #666;
        }

        .offer-nft-info h5 {
          margin: 0 0 4px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .offer-nft-info p {
          margin: 0 0 4px 0;
          color: #888;
          font-size: 14px;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .payment-details {
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
        }

        .payment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .payment-item:last-child {
          margin-bottom: 0;
        }

        .payment-label {
          color: #888;
          font-size: 14px;
          font-weight: 500;
        }

        .payment-value {
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-align: right;
        }

        .address-value {
          font-family: monospace;
          font-size: 12px;
          max-width: 200px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .offer-metadata {
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
        }

        .metadata-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .metadata-item:last-child {
          margin-bottom: 0;
        }

        .metadata-label {
          color: #888;
          font-size: 14px;
          font-weight: 500;
        }

        .metadata-value {
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .metadata-value.status-active {
          color: #22c55e;
        }

        .metadata-value.status-completed {
          color: #3b82f6;
        }

        .metadata-value.status-cancelled {
          color: #ef4444;
        }

        .metadata-value.status-expired {
          color: #fb923c;
        }

        .offer-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .copy-offer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          background: #6bc36b;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-offer-btn:hover {
          background: #4a9f4a;
        }

        .offer-status-actions {
          display: flex;
          gap: 12px;
        }

        .status-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .complete-btn {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }

        .complete-btn:hover {
          background: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.6);
        }

        .cancel-btn {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .cancel-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.6);
        }

        /* Info value styles for collection IDs and other long text */
        .info-value {
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          line-height: 1.4;
        }

        .info-value.monospace {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
          word-break: break-all;
        }

        .info-value.description {
          line-height: 1.5;
          color: #ccc;
        }
      `}</style>
    </>
  );
}; 