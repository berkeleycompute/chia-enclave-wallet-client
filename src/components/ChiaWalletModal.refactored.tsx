import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UseChiaWalletResult } from '../hooks/useChiaWallet.ts';
import { 
  ChiaCloudWalletClient,
  type Coin, 
  type HydratedCoin, 
  type PublicKeyResponse,
  type SimpleMakeUnsignedNFTOfferRequest
} from '../client/ChiaCloudWalletClient.ts';
import { SentTransaction, SavedOffer } from './types.ts';
import { SendFundsModal } from './SendFundsModal.tsx';
import { ReceiveFundsModal } from './ReceiveFundsModal.tsx';
import { MakeOfferModal } from './MakeOfferModal.tsx';
import { ActiveOffersModal } from './ActiveOffersModal.tsx';
import { NFTDetailsModal } from './NFTDetailsModal.tsx';

export interface ChiaWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UseChiaWalletResult;
  onWalletUpdate?: (walletData: any) => void;
}

export const ChiaWalletModal: React.FC<ChiaWalletModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onWalletUpdate,
}) => {
  // Extract what we need from the wallet object
  const { client, jwtToken } = wallet;
  
  // State management
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [publicKeyData, setPublicKeyData] = useState<PublicKeyResponse | null>(null);
  const [syntheticPublicKey, setSyntheticPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [coinCount, setCoinCount] = useState(0);
  const [unspentCoins, setUnspentCoins] = useState<Coin[]>([]);
  const [hydratedCoins, setHydratedCoins] = useState<HydratedCoin[]>([]);
  const [coinIds, setCoinIds] = useState<Map<string, string>>(new Map());
  const [calculatingCoinIds, setCalculatingCoinIds] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'transactions' | 'assets'>('main');
  const [isConnected, setIsConnected] = useState(false);
  
  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showActiveOffersModal, setShowActiveOffersModal] = useState(false);
  const [showNftDetails, setShowNftDetails] = useState(false);
  const [selectedNft, setSelectedNft] = useState<HydratedCoin | null>(null);
  
  // Transaction and NFT data
  const [sentTransactions, setSentTransactions] = useState<SentTransaction[]>([]);
  const [nftMetadata, setNftMetadata] = useState<Map<string, any>>(new Map());
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());
  
  // Background update management
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState(0);
  const [lastSyncAttempt, setLastSyncAttempt] = useState(0);
  const [syncRetryCount, setSyncRetryCount] = useState(0);
  const [cachedData, setCachedData] = useState<{ hydratedCoins: HydratedCoin[]; balance: number; timestamp: number } | null>(null);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);
  const backgroundUpdateInterval = useRef<number | null>(null);
  
  // Constants
  const CACHE_DURATION = 30000; // 30 seconds
  const SYNC_TIMEOUT = 60000; // 1 minute
  const BACKGROUND_UPDATE_INTERVAL = 60000; // 1 minute
  const MAX_RETRY_ATTEMPTS = 3;

  // Debug logging function
  const debugLog = useCallback((message: string, data?: any) => {
    console.log(`🐛 ChiaWalletModal: ${message}`, data || '');
  }, []);

  // Storage key generators
  const getStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_wallet_state';
    return `chia_wallet_state_${pubKey.substring(0, 16)}`;
  }, []);

  const getTransactionsStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_sent_transactions';
    return `chia_sent_transactions_${pubKey.substring(0, 16)}`;
  }, []);

  const getNftMetadataStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_nft_metadata';
    return `chia_nft_metadata_${pubKey.substring(0, 16)}`;
  }, []);

  const getPublicDataStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_public_data';
    return `chia_public_data_${pubKey.substring(0, 16)}`;
  }, []);

  const getOffersStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_active_offers';
    return `chia_active_offers_${pubKey.substring(0, 16)}`;
  }, []);

  // NFT metadata functions
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
    if (!publicKey) return null;
    
    try {
      const stored = localStorage.getItem(getNftMetadataStorageKey(publicKey));
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
  }, [publicKey, getNftMetadataStorageKey]);

  const setCachedNftMetadata = useCallback((cacheKey: string, metadata: any): void => {
    if (!publicKey) return;
    
    try {
      const storageKey = getNftMetadataStorageKey(publicKey);
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
  }, [publicKey, getNftMetadataStorageKey]);

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
        
        // Cache in localStorage
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

  // Load metadata for all NFT coins when hydratedCoins changes
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
  const saveOffer = useCallback((offerData: {
    nft: HydratedCoin;
    amount: number;
    depositAddress: string;
    wusdcAssetId: string;
    offerString: string;
    timestamp: number;
    isSigned: boolean;
    originalRequest?: SimpleMakeUnsignedNFTOfferRequest;
  }) => {
    if (!publicKey) return;

    try {
      // Helper functions for NFT data
      const getNftMetadata = (nftCoin: HydratedCoin): any => {
        const driverInfo = nftCoin.parentSpendInfo.driverInfo;
        if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
          return null;
        }

        const metadataUri = driverInfo.info.metadata.metadataUris[0];
        const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
        return nftMetadata.get(cacheKey);
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

      const getNftImageUrl = (nftCoin: HydratedCoin): string | undefined => {
        const metadata = getNftMetadata(nftCoin);
        if (metadata?.data_uris && metadata.data_uris.length > 0) {
          return metadata.data_uris[0];
        }
        if (metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value) {
          return metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value;
        }
        return undefined;
      };

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
        originalRequest: offerData.originalRequest || {} as SimpleMakeUnsignedNFTOfferRequest
      };

      // Get existing offers
      const storageKey = getOffersStorageKey(publicKey);
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
  }, [publicKey, getOffersStorageKey, nftMetadata]);

  // Utility functions
  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  }, []);

  const formatBalance = useCallback((bal: number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(bal);
    if (!result.success) return '         0';
    
    let formatted = result.data.toFixed(13);
    formatted = formatted.replace(/\.?0+$/, '');
    return formatted.padStart(15, ' ');
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
  const getCoinType = useCallback((hydratedCoin: HydratedCoin): string => {
    const driverInfo = hydratedCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'CAT') return 'CAT';
    if (driverInfo?.type === 'NFT') return 'NFT';
    return 'XCH';
  }, []);

  const getCoinTypeIcon = useCallback((coinType: string): string => {
    switch (coinType) {
      case 'CAT': return '🎭';
      case 'NFT': return '🖼️';
      default: return '💰';
    }
  }, []);

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

  const formatCoinAmount = useCallback((hydratedCoin: HydratedCoin): string => {
    const coinType = getCoinType(hydratedCoin);
    const amount = Number(hydratedCoin.coin.amount);
    
    if (coinType === 'XCH') {
      return `${formatBalance(amount)} XCH`;
    } else if (coinType === 'CAT') {
      const result = ChiaCloudWalletClient.mojosToXCH(amount);
      if (result.success) {
        return `${result.data.toFixed(6)} units`;
      }
      return `${amount.toString()} units`;
    } else {
      return `${amount.toString()} NFT`;
    }
  }, [getCoinType, formatBalance]);

  // Core wallet functions
  const isDataStale = useCallback((): boolean => {
    return !cachedData || Date.now() - cachedData.timestamp > CACHE_DURATION;
  }, [cachedData]);

  // Fixed connectWallet function following Svelte pattern
  const connectWallet = useCallback(async () => {
    debugLog('connectWallet called', { 
      jwtToken: jwtToken ? `${jwtToken.substring(0, 10)}...` : null, 
      client: !!client 
    });

    if (!jwtToken || !client) {
      debugLog('Missing JWT token or client', { jwtToken: !!jwtToken, client: !!client });
      setError('JWT token and client are required for wallet connection');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Set JWT token on client first
      debugLog('Setting JWT token on client');
      client.setJwtToken(jwtToken);
      
      // Verify token was set
      const clientToken = client.getJwtToken();
      debugLog('Client JWT token set', { hasToken: !!clientToken, tokenMatch: clientToken === jwtToken });
      
      // Get public key first
      debugLog('Calling getPublicKey');
      const pkResponse = await client.getPublicKey();
      debugLog('getPublicKey response', { 
        success: pkResponse.success, 
        error: pkResponse.success ? null : pkResponse.error,
        hasData: pkResponse.success && !!pkResponse.data
      });

      if (!pkResponse.success) {
        throw new Error(pkResponse.error);
      }
      
      debugLog('Setting public key data', { 
        address: pkResponse.data.address ? `${pkResponse.data.address.substring(0, 10)}...` : null,
        syntheticKey: pkResponse.data.synthetic_public_key ? `${pkResponse.data.synthetic_public_key.substring(0, 10)}...` : null
      });

      setPublicKeyData(pkResponse.data);
      setPublicKey(pkResponse.data.address);
      setSyntheticPublicKey(pkResponse.data.synthetic_public_key);
      setCurrentSessionToken(jwtToken);
      
      // Mark as connected after successful public key fetch
      setIsConnected(true);
      
      debugLog('Wallet connected successfully');
      
      // Emit wallet update event with connected state
      onWalletUpdate?.({
        connected: true,
        publicKey: pkResponse.data.address,
        publicKeyData: pkResponse.data,
        syntheticPublicKey: pkResponse.data.synthetic_public_key,
        balance,
        coinCount
      });
      
      // Now try to get balance and coins separately
      await loadWalletBalance();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      debugLog('Connection failed', { error: errorMessage, err });
      setError(errorMessage);
      
      // Don't clear existing state if we had a connection before for the same session
      if (!isConnected || currentSessionToken !== jwtToken) {
        setPublicKey(null);
        setSyntheticPublicKey(null);
        setBalance(0);
        setCoinCount(0);
        setIsConnected(false);
        setPublicKeyData(null);
        setCurrentSessionToken(null);
        
        onWalletUpdate?.({
          connected: false,
          publicKey: null,
          syntheticPublicKey: null,
          balance: 0,
          coinCount: 0
        });
      }
    } finally {
      setLoading(false);
    }
  }, [jwtToken, client, isConnected, currentSessionToken, balance, coinCount, onWalletUpdate, debugLog]);

  const loadWalletBalance = useCallback(async (silent: boolean = false) => {
    debugLog('loadWalletBalance called', { 
      publicKey: publicKey ? `${publicKey.substring(0, 16)}...` : null, 
      client: !!client, 
      silent, 
      jwtToken: jwtToken ? `${jwtToken.substring(0, 10)}...` : null 
    });

    if (!publicKey || !client) {
      debugLog('Early return: missing publicKey or client', { publicKey: !!publicKey, client: !!client });
      return;
    }
    
    const now = Date.now();
    
    // Prevent too frequent sync attempts
    if (now - lastSyncAttempt < 5000) {
      debugLog('Sync attempt too soon, skipping', { 
        timeSinceLastAttempt: now - lastSyncAttempt,
        threshold: 5000 
      });
      return;
    }
    
    setLastSyncAttempt(now);
    
    // Use cached data if available and not stale
    if (!silent && cachedData && !isDataStale()) {
      debugLog('Using cached data', { 
        cacheAge: now - cachedData.timestamp,
        maxAge: CACHE_DURATION,
        hydratedCoinsCount: cachedData.hydratedCoins.length 
      });
      setBalance(cachedData.balance);
      setHydratedCoins(cachedData.hydratedCoins);
      setUnspentCoins(ChiaCloudWalletClient.extractCoinsFromHydratedCoins(cachedData.hydratedCoins));
      setCoinCount(cachedData.hydratedCoins.length);
      
      onWalletUpdate?.({
        connected: isConnected,
        publicKey,
        syntheticPublicKey,
        balance: cachedData.balance,
        coinCount: cachedData.hydratedCoins.length
      });
      return;
    }
    
    debugLog('Proceeding with fresh API call', { 
      silent, 
      hasCachedData: !!cachedData,
      cacheStale: cachedData ? isDataStale() : 'no cache'
    });
    
    if (!silent) {
      setBalanceLoading(true);
      setBalanceError(null);
    }
    
    try {
      debugLog('Making API call to getUnspentHydratedCoins', { 
        publicKey: publicKey.substring(0, 16) + '...',
        hasJwtToken: !!client.getJwtToken()
      });

      const hydratedData = await Promise.race([
        client.getUnspentHydratedCoins(publicKey),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), SYNC_TIMEOUT);
        })
      ]);
      
      debugLog('API response received', { 
        success: hydratedData.success,
        hasData: hydratedData.success && !!hydratedData.data,
        dataLength: hydratedData.success && hydratedData.data ? hydratedData.data.data?.length : 'N/A',
        error: hydratedData.success ? null : hydratedData.error
      });
      
      if (!hydratedData.success) {
        debugLog('API call failed', { 
          error: hydratedData.error 
        });
        throw new Error(hydratedData.error);
      }
      
      const coins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedData.data.data);
      let totalBalance = 0;
      
      for (const coin of coins) {
        try {
          totalBalance += Number(coin.amount);
        } catch (coinError) {
          console.warn('Invalid coin amount:', coin.amount, coinError);
        }
      }
      
      debugLog('Balance calculation complete', {
        totalBalance,
        coinCount: coins.length,
        hydratedCoinsCount: hydratedData.data.data.length
      });
      
      setBalance(totalBalance);
      setCoinCount(coins.length);
      setHydratedCoins(hydratedData.data.data);
      setUnspentCoins(coins);
      setLastSuccessfulRefresh(now);
      setSyncRetryCount(0);
      
      setCachedData({
        hydratedCoins: hydratedData.data.data,
        balance: totalBalance,
        timestamp: now
      });
      
      onWalletUpdate?.({
        connected: isConnected,
        publicKey,
        syntheticPublicKey,
        balance: totalBalance,
        coinCount: coins.length
      });
      
    } catch (err) {
      console.error('Failed to load wallet balance', err);
      debugLog('Balance loading failed', { error: err instanceof Error ? err.message : 'Unknown error' });
      
      if (!silent) {
        setBalanceError(err instanceof Error ? err.message : 'Failed to load balance');
        
        if (syncRetryCount < MAX_RETRY_ATTEMPTS) {
          const newRetryCount = syncRetryCount + 1;
          setSyncRetryCount(newRetryCount);
          debugLog('Scheduling retry', { attempt: newRetryCount, maxAttempts: MAX_RETRY_ATTEMPTS });
          
          setTimeout(() => {
            loadWalletBalance(silent);
          }, 2000 * newRetryCount);
        }
      }
    } finally {
      if (!silent) {
        setBalanceLoading(false);
      }
    }
  }, [publicKey, client, lastSyncAttempt, cachedData, isDataStale, syncRetryCount, isConnected, syntheticPublicKey, onWalletUpdate, debugLog]);

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
      loadWalletBalance();
    }, 1000);
  }, [addSentTransaction, loadWalletBalance]);

  const disconnectWallet = useCallback(() => {
    debugLog('disconnectWallet called');

    if (backgroundUpdateInterval.current) {
      clearInterval(backgroundUpdateInterval.current);
      backgroundUpdateInterval.current = null;
    }
    
    setIsConnected(false);
    setPublicKey(null);
    setSyntheticPublicKey(null);
    setPublicKeyData(null);
    setBalance(0);
    setCoinCount(0);
    setUnspentCoins([]);
    setHydratedCoins([]);
    setError(null);
    setLastSuccessfulRefresh(0);
    setCurrentSessionToken(null);
    setBalanceLoading(false);
    setBalanceError(null);
    setCachedData(null);
    setSyncRetryCount(0);
    setSentTransactions([]);
    setNftMetadata(new Map());
    setLoadingMetadata(new Set());
    setSelectedNft(null);
    setShowNftDetails(false);
    
    onWalletUpdate?.({
      connected: false,
      publicKey: null,
      balance: 0,
      coinCount: 0
    });
    
    debugLog('Wallet disconnected');
  }, [onWalletUpdate, debugLog]);

  const getConnectionStatus = useCallback((): string => {
    if (lastSuccessfulRefresh === 0) return 'Not connected';
    
    const now = Date.now();
    const timeSinceRefresh = now - lastSuccessfulRefresh;
    
    if (timeSinceRefresh < 60000) {
      return 'Connected';
    } else if (timeSinceRefresh < 300000) {
      return 'Connected (data may be stale)';
    } else {
      return 'Connected (offline)';
    }
  }, [lastSuccessfulRefresh]);

  const getDataFreshness = useCallback((): string => {
    if (!cachedData) return '';
    
    const age = Date.now() - cachedData.timestamp;
    if (age < 10000) return 'Just now';
    if (age < 60000) return `${Math.floor(age / 1000)}s ago`;
    if (age < 3600000) return `${Math.floor(age / 60000)}m ago`;
    return `${Math.floor(age / 3600000)}h ago`;
  }, [cachedData]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Initialize wallet connection when JWT token is available
  useEffect(() => {
    debugLog('useEffect triggered', { 
      jwtToken: !!jwtToken, 
      client: !!client, 
      isConnected,
      currentSessionToken: !!currentSessionToken
    });

    if (jwtToken && client && !isConnected && jwtToken !== currentSessionToken) {
      debugLog('Initiating wallet connection');
      connectWallet();
    }
  }, [jwtToken, client, isConnected, currentSessionToken, connectWallet, debugLog]);

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
    setShowSendModal(false);
    setShowReceiveModal(false);
    setShowOfferModal(false);
    setShowActiveOffersModal(false);
  };

  const openNftDetails = (nftCoin: HydratedCoin) => {
    setSelectedNft(nftCoin);
    setShowNftDetails(true);
  };

  const closeNftDetails = () => {
    setSelectedNft(null);
    setShowNftDetails(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Send Modal */}
      <SendFundsModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        client={client}
        publicKey={publicKey}
        unspentCoins={unspentCoins}
        onTransactionSent={handleTransactionSent}
      />
      
      {/* Receive Modal */}
      <ReceiveFundsModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        publicKey={publicKey}
      />

      {/* Make Offer Modal */}
      <MakeOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        client={client}
        publicKey={publicKey}
        syntheticPublicKey={syntheticPublicKey}
        hydratedCoins={hydratedCoins}
        nftMetadata={nftMetadata}
        loadingMetadata={loadingMetadata}
        onOfferCreated={(offerData) => {
          console.log('Offer created:', offerData);
          saveOffer(offerData);
        }}
        onRefreshWallet={loadWalletBalance}
      />

      {/* Active Offers Modal */}
      <ActiveOffersModal
        isOpen={showActiveOffersModal}
        onClose={() => setShowActiveOffersModal(false)}
        publicKey={publicKey}
        nftMetadata={nftMetadata}
        loadingMetadata={loadingMetadata}
        onOfferUpdate={() => {
          // Refresh offers when status changes
          console.log('Offers updated');
        }}
      />

      {/* NFT Details Modal */}
      <NFTDetailsModal
        isOpen={showNftDetails}
        onClose={closeNftDetails}
        selectedNft={selectedNft}
        nftMetadata={nftMetadata}
        loadingMetadata={loadingMetadata}
      />

      {/* Main Modal */}
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
            <div className="wallet-info">
              <div className="wallet-icon">
                <div className="chia-logo">🌱</div>
              </div>
              <div className="wallet-details">
                <h3>
                  {publicKey ? formatAddress(publicKey) : 'Chia Wallet'}
                </h3>
                <p className="connection-status">
                  {getConnectionStatus()}
                  {cachedData && getDataFreshness() && (
                    <span className="data-freshness">• {getDataFreshness()}</span>
                  )}
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={closeModal} aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Connecting to wallet...</p>
              </div>
            ) : error && !isConnected ? (
              <div className="error-state">
                <p className="error-message">{error}</p>
                <button className="retry-btn" onClick={connectWallet}>
                  Retry
                </button>
              </div>
            ) : isConnected ? (
              <>
                {/* Warning banner for stale data */}
                {!balanceError && lastSuccessfulRefresh > 0 && Date.now() - lastSuccessfulRefresh > 60000 && (
                  <div className="warning-banner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>Data may be outdated due to network issues</span>
                    <button className="refresh-btn" onClick={() => loadWalletBalance()}>
                      Refresh
                    </button>
                  </div>
                )}

                {currentView === 'main' ? (
                  <>
                    {/* Action Buttons */}
                    <div className="action-buttons">
                      <button className="action-btn primary" onClick={() => setShowSendModal(true)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="7" y1="17" x2="17" y2="7"></line>
                          <polyline points="7,7 17,7 17,17"></polyline>
                        </svg>
                        Send
                      </button>
                      <button className="action-btn secondary" onClick={() => setShowReceiveModal(true)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="17" y1="7" x2="7" y2="17"></line>
                          <polyline points="17,17 7,17 7,7"></polyline>
                        </svg>
                        Receive
                      </button>
                    </div>

                    {/* Balance Section */}
                    <div className="balance-section">
                      <div className="balance-item">
                        <div className="balance-icon">🌱</div>
                        <div className="balance-details">
                          <h4>Chia (XCH)</h4>
                          {balanceLoading ? (
                            <div className="balance-loading">
                              <div className="balance-spinner"></div>
                              <p className="balance-amount syncing">Syncing...</p>
                            </div>
                          ) : balanceError ? (
                            <div className="balance-error">
                              <p className="balance-amount error">Failed to load</p>
                              <button className="balance-retry" onClick={() => loadWalletBalance()}>
                                Retry
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="balance-amount">
                                {formatBalance(balance)} XCH
                              </p>
                              <p className="balance-subtitle">{coinCount} coins</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="menu-options">
                      <button className="menu-item" onClick={() => setCurrentView('transactions')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 3h18v18H3zM9 9h6v6H9z"></path>
                        </svg>
                        <span>Transactions</span>
                        <div className="badge">{coinCount + sentTransactions.length}</div>
                      </button>
                      
                      <button className="menu-item" onClick={() => setCurrentView('assets')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span>View Assets</span>
                        {hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').length > 0 && (
                          <div className="badge">{hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').length}</div>
                        )}
                      </button>
                      
                      <button 
                        className={`menu-item ${!isConnected || !client ? 'disabled' : ''}`}
                        onClick={() => {
                          console.log('Make Offer button clicked!', { 
                            isConnected, 
                            hasClient: !!client, 
                            showOfferModal, 
                            nftCount: hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').length 
                          });
                          setShowOfferModal(true);
                        }}
                        disabled={!isConnected || !client}
                        title={!isConnected || !client ? 'Please wait for wallet connection to complete' : ''}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11H1l2-2m0 0l2-2m-2 2l2 2m2-2h8l2-2m0 0l2-2m-2 2l2 2"></path>
                        </svg>
                        <span>Make Offer</span>
                        {hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').length > 0 && (
                          <div className="badge">{hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').length}</div>
                        )}
                        {!syntheticPublicKey && (
                          <div className="status-indicator" title="Wallet connection not complete">⚠️</div>
                        )}
                      </button>

                      <button 
                        className="menu-item" 
                        onClick={() => setShowActiveOffersModal(true)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14,2 14,8 20,8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                        <span>Active Offers</span>
                      </button>
                    </div>

                    {/* Disconnect Button */}
                    <button className="disconnect-btn" onClick={disconnectWallet}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16,17 21,12 16,7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <span>Disconnect Wallet</span>
                    </button>
                  </>
                ) : currentView === 'transactions' ? (
                  <div className="transactions-view">
                    <div className="transactions-header">
                      <button className="back-btn" onClick={() => setCurrentView('main')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 12H5"></path>
                          <path d="M12 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      <h4>Transactions ({coinCount + sentTransactions.length})</h4>
                      <button className="refresh-btn" onClick={() => loadWalletBalance()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6"></path>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="transactions-list">
                      {/* Outgoing Transactions */}
                      {sentTransactions.map(transaction => (
                        <div key={transaction.id} className="transaction-item outgoing">
                          <div className="transaction-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="7" y1="17" x2="17" y2="7"></line>
                              <polyline points="7,7 17,7 17,17"></polyline>
                            </svg>
                          </div>
                          <div className="transaction-info">
                            <div className="transaction-amount">-{formatBalance(transaction.amount)} XCH</div>
                            <div className="transaction-details">
                              <div className="transaction-address">To: {formatAddress(transaction.recipient)}</div>
                              <div className="transaction-fee">Fee: {formatBalance(transaction.fee)} XCH</div>
                              {transaction.transactionId && (
                                <div 
                                  className="transaction-id" 
                                  onClick={() => copyToClipboard(transaction.transactionId!)} 
                                  title="Click to copy transaction ID"
                                >
                                  ID: {transaction.transactionId.substring(0, 8)}...{transaction.transactionId.substring(transaction.transactionId.length - 8)}
                                </div>
                              )}
                              <div className="transaction-time">{formatTime(transaction.timestamp)}</div>
                            </div>
                          </div>
                          <div className={`transaction-status ${transaction.status}`}>
                            {transaction.status === 'pending' ? 'Pending' : 'Confirmed'}
                          </div>
                        </div>
                      ))}
                      
                      {/* Incoming Transactions (Hydrated Coins) */}
                      {hydratedCoins.map((hydratedCoin, index) => {
                        const coinType = getCoinType(hydratedCoin);
                        const coinTypeIcon = getCoinTypeIcon(coinType);
                        const assetInfo = getAssetInfo(hydratedCoin);
                        
                        return (
                          <div key={index} className={`transaction-item incoming ${coinType.toLowerCase()}`}>
                            <div className="transaction-icon">
                              <span className="coin-type-icon">{coinTypeIcon}</span>
                            </div>
                            <div className="transaction-info">
                              <div className="transaction-amount">+{formatCoinAmount(hydratedCoin)}</div>
                              <div className="transaction-details">
                                <div className="transaction-address">
                                  {coinType === 'XCH' ? (
                                    `Coin #${index + 1}`
                                  ) : (
                                    <div className="asset-info">
                                      <span className="asset-type">{coinType}</span>
                                      <span className="asset-details">{assetInfo}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="transaction-time">
                                  {coinType === 'NFT' ? `NFT • Height: ${hydratedCoin.createdHeight}` : `Available • Height: ${hydratedCoin.createdHeight}`}
                                </div>
                              </div>
                            </div>
                            <div className={`transaction-status confirmed ${coinType.toLowerCase()}`}>
                              {coinType === 'NFT' ? 'Owned' : 'Confirmed'}
                            </div>
                          </div>
                        );
                      })}
                      
                      {hydratedCoins.length === 0 && sentTransactions.length === 0 && (
                        <div className="no-transactions">
                          <p>No transactions yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : currentView === 'assets' ? (
                  <div className="assets-view">
                    <div className="assets-header">
                      <button className="back-btn" onClick={() => setCurrentView('main')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 12H5"></path>
                          <path d="M12 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      <h4>Assets ({hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').length} NFTs)</h4>
                      <button className="refresh-btn" onClick={() => loadWalletBalance()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6"></path>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="assets-grid">
                      {hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').map((nftCoin, index) => {
                        // Get NFT metadata for this coin
                        const getNftMetadata = (nftCoin: HydratedCoin): any => {
                          const driverInfo = nftCoin.parentSpendInfo.driverInfo;
                          if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
                            return null;
                          }

                          const metadataUri = driverInfo.info.metadata.metadataUris[0]; // Use first URI
                          const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
                          return nftMetadata.get(cacheKey);
                        };

                        const isNftMetadataLoading = (nftCoin: HydratedCoin): boolean => {
                          const driverInfo = nftCoin.parentSpendInfo.driverInfo;
                          if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
                            return false;
                          }

                          const metadataUri = driverInfo.info.metadata.metadataUris[0]; // Use first URI
                          const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
                          return loadingMetadata.has(cacheKey);
                        };

                        // Utility function to convert IPFS URLs to HTTP gateway URLs
                        const convertIpfsUrl = (url: string): string => {
                          if (!url) return url;
                          
                          // Convert IPFS URLs to HTTP gateway URLs
                          if (url.startsWith('ipfs://')) {
                            // Remove ipfs:// and use a public gateway
                            const hash = url.replace('ipfs://', '');
                            return `https://ipfs.io/ipfs/${hash}`;
                          }
                          
                          // If it's just a hash without protocol
                          if (!url.startsWith('http') && url.length > 40) {
                            return `https://ipfs.io/ipfs/${url}`;
                          }
                          
                          return url;
                        };

                        const metadata = getNftMetadata(nftCoin);
                        const isLoading = isNftMetadataLoading(nftCoin);
                        
                        return (
                          <div key={index} className="asset-card" onClick={() => openNftDetails(nftCoin)}>
                            <div className="asset-image">
                              {isLoading ? (
                                <div className="asset-loading">
                                  <div className="asset-spinner"></div>
                                </div>
                              ) : metadata ? (
                                metadata.data_uris && metadata.data_uris.length > 0 ? (
                                  <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                                ) : metadata.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                                  <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                                ) : (
                                  <div className="asset-placeholder">🖼️</div>
                                )
                              ) : (
                                <div className="asset-placeholder">🖼️</div>
                              )}
                            </div>
                            <div className="asset-info">
                              <h5>{metadata?.name || `NFT #${index + 1}`}</h5>
                              <p className="asset-collection">{metadata?.collection?.name || 'Unknown Collection'}</p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {hydratedCoins.filter(coin => getCoinType(coin) === 'NFT').length === 0 && (
                        <div className="no-assets">
                          <p>No NFTs found in your wallet</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="connect-state">
                <p>Connect your Chia wallet to get started</p>
                <button className="connect-btn" onClick={connectWallet}>
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-overlay.send-modal-overlay,
        .modal-overlay.receive-modal-overlay,
        .modal-overlay.nft-details-overlay,
        .modal-overlay.make-offer-overlay {
          z-index: 1001;
        }

        .modal-content {
          background: #1a1a1a;
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #333;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          color: white;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .modal-content::-webkit-scrollbar {
          display: none;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
        }

        .modal-header h2 {
          margin: 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wallet-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chia-logo {
          font-size: 24px;
        }

        .wallet-details h3 {
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 200px;
        }

        .connection-status {
          margin: 0;
          color: #888;
          font-size: 14px;
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

        .modal-body {
          padding: 20px;
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
          transform: translateY(-1px);
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: #6bc36b;
          color: white;
        }

        .action-btn.primary:hover {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .action-btn.secondary {
          background: #333;
          color: white;
        }

        .action-btn.secondary:hover {
          background: #404040;
          transform: translateY(-1px);
        }

        .balance-section {
          margin-bottom: 24px;
        }

        .balance-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #262626;
          border-radius: 12px;
          border: 1px solid #333;
        }

        .balance-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #333;
          border-radius: 50%;
        }

        .balance-details h4 {
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .balance-amount {
          margin: 4px 0;
          color: #22c55e;
          font-size: 18px;
          font-weight: 700;
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
          margin-bottom: 24px;
        }

        .menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          margin-bottom: 8px;
        }

        .menu-item:hover:not(.disabled) {
          background: #333;
        }

        .menu-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .menu-item span {
          flex: 1;
          text-align: left;
          font-weight: 500;
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

        .disconnect-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: none;
          border: 1px solid #333;
          color: #888;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .disconnect-btn:hover {
          background: #333;
          color: white;
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
          transform: translateY(-2px);
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

        .send-btn {
          width: 100%;
          padding: 16px;
          background: #6bc36b;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .send-btn:hover:not(:disabled) {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
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
          transform: scale(1.05);
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
        .modal-overlay.active-offers-overlay {
          z-index: 1001;
        }

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
          transform: translateY(-1px);
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
          transform: translateY(-1px);
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
      `}</style>
    </>
  );
}; 