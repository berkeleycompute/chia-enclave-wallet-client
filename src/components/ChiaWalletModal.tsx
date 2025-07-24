import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  useWalletConnection, 
  useWalletBalance, 
  useWalletCoins,
  useSendTransaction,
  useUnifiedWalletClient
} from '../hooks/useChiaWalletSDK';
import { SentTransaction, SavedOffer } from './types';
import { UnifiedWalletClient } from '../client/UnifiedWalletClient';
import { SendFundsModal } from './SendFundsModal';
import { ReceiveFundsModal } from './ReceiveFundsModal';
import { MakeOfferModal } from './MakeOfferModal';
import { ActiveOffersModal } from './ActiveOffersModal';
import { NFTDetailsModal } from './NFTDetailsModal';
import { sharedModalStyles } from './modal-styles';
// Import the new dialog hooks
import {
  useSendFundsDialog,
  useMakeOfferDialog,
  useReceiveFundsDialog,
  useActiveOffersDialog,
  useNFTDetailsDialog
} from '../hooks/useDialogs';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';

export interface ChiaWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  jwtToken?: string | null;
  onWalletUpdate?: (walletData: any) => void;
  // Unified client prop
  walletClient?: UnifiedWalletClient;
}

export const ChiaWalletModal: React.FC<ChiaWalletModalProps> = ({
  isOpen,
  onClose,
  jwtToken,
  onWalletUpdate,
  walletClient,
}) => {
  // Use provided client or fall back to hooks
  const hookWalletClient = useUnifiedWalletClient();
  const actualWalletClient = walletClient || hookWalletClient;
  
  // Extract values for easier access
  const { sdk, walletState } = actualWalletClient;
  
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
    totalBalance,
    coinCount,
    formattedBalance,
    error,
    isConnecting = false,
  } = walletState;

  const { 
    hydratedCoins, 
    nftCoins,
    isLoading: coinsLoading,
    error: coinsError 
  } = useWalletCoins();

  const { sendXCH, isSending } = useSendTransaction();

  // Replace manual modal states with dialog hooks
  const sendFundsDialog = useSendFundsDialog();
  const makeOfferDialog = useMakeOfferDialog();
  const receiveFundsDialog = useReceiveFundsDialog();
  const activeOffersDialog = useActiveOffersDialog();
  const nftDetailsDialog = useNFTDetailsDialog();

  // Local UI state
  const [currentView, setCurrentView] = useState<'main' | 'transactions' | 'assets' | 'nft-details'>('main');
  const [selectedNft, setSelectedNft] = useState<HydratedCoin | null>(null);
  const [sentTransactions, setSentTransactions] = useState<SentTransaction[]>([]);

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

  // Emit wallet updates
  useEffect(() => {
    if (onWalletUpdate) {
      onWalletUpdate({
        connected: isConnected,
        address: address,
        balance: totalBalance,
        coinCount: coinCount,
        formattedBalance: formattedBalance
      });
    }
  }, [isConnected, address, totalBalance, coinCount, formattedBalance, onWalletUpdate]);

  // Storage key generators for NFT metadata
  const getNftMetadataStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_nft_metadata';
    return `chia_nft_metadata_${pubKey.substring(0, 16)}`;
  }, []);

  const getOffersStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_active_offers';
    return `chia_active_offers_${pubKey.substring(0, 16)}`;
  }, []);

  // NFT metadata functions (keep as they're specific to this modal)
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
    const driverInfo = nftCoin.parentSpendInfo?.driverInfo;
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
      const driverInfo = coin.parentSpendInfo?.driverInfo;
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
    originalRequest?: any;
  }) => {
    if (!address) return;

    try {
      // Helper functions for NFT data
      const getNftMetadata = (nftCoin: HydratedCoin): any => {
        const driverInfo = nftCoin.parentSpendInfo?.driverInfo;
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

        const driverInfo = nftCoin.parentSpendInfo?.driverInfo;
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

        const driverInfo = nftCoin.parentSpendInfo?.driverInfo;
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

  // Utility functions
  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
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
    const driverInfo = hydratedCoin.parentSpendInfo?.driverInfo;
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
    const driverInfo = hydratedCoin.parentSpendInfo?.driverInfo;
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
      return `${(amount / 1000000000000).toFixed(6)} XCH`;
    } else if (coinType === 'CAT') {
      // For CAT tokens, we might need proper decimal handling
      return `${(amount / 1000000000000).toFixed(6)} units`;
    } else {
      return `${amount.toString()} NFT`;
    }
  }, [getCoinType]);

  // NFT metadata utility functions
  const getNftMetadata = useCallback((nftCoin: HydratedCoin): any => {
    const driverInfo = nftCoin.parentSpendInfo?.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return null;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return nftMetadata.get(cacheKey);
  }, [nftMetadata]);

  const isNftMetadataLoading = useCallback((nftCoin: HydratedCoin): boolean => {
    const driverInfo = nftCoin.parentSpendInfo?.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return false;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return loadingMetadata.has(cacheKey);
  }, [loadingMetadata]);

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
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

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
    setSelectedNft(null);
    // Close all dialogs using hooks
    sendFundsDialog.close();
    receiveFundsDialog.close();
    makeOfferDialog.close();
    activeOffersDialog.close();
    nftDetailsDialog.close();
  };

  const openNftDetails = (nftCoin: HydratedCoin) => {
    setSelectedNft(nftCoin);
    setCurrentView('nft-details');
  };

  const getConnectionStatus = (): string => {
    if (!isConnected) return 'Not connected';
    if (isConnecting) return 'Connecting...';
    if (error) return 'Connection error';
    return 'Connected';
  };

  // Show loading states
  const isLoading = isConnecting || balanceLoading || coinsLoading;
  const hasError = error || coinsError;

  return (
    <>
      {/* Send Modal */}
      <SendFundsModal
        isOpen={sendFundsDialog.isOpen}
        onClose={sendFundsDialog.close}
        onTransactionSent={handleTransactionSent}
      />

      {/* Receive Modal */}
      <ReceiveFundsModal
        isOpen={receiveFundsDialog.isOpen}
        onClose={receiveFundsDialog.close}
      />

      {/* Make Offer Modal */}
      <MakeOfferModal
        isOpen={makeOfferDialog.isOpen}
        onClose={makeOfferDialog.close}
        // onOfferCreated={(offerData) => {
        //   console.log('Offer created:', offerData);
        //   saveOffer(offerData);
        // }}
        onRefreshWallet={refreshBalance}
      />

      {/* Active Offers Modal */}
      <ActiveOffersModal
        isOpen={activeOffersDialog.isOpen}
        onClose={activeOffersDialog.close}
        onOfferUpdate={() => {
          // Refresh offers when status changes
          console.log('Offers updated');
        }}
      />

      {/* NFT Details Modal */}
      <NFTDetailsModal
        isOpen={nftDetailsDialog.isOpen}
        onClose={nftDetailsDialog.close}
        nft={nftDetailsDialog.selectedNft}
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
              <div className="wallet-info">
                <div className="wallet-icon">
                  <div className="chia-logo">🌱</div>
                </div>
                <div className="wallet-details">
                  <h3>
                    {address ? formatAddress(address) : 'Chia Wallet'}
                  </h3>
                  <p className="connection-status">
                    {getConnectionStatus()}
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
                        <button className="action-btn primary" onClick={() => sendFundsDialog.open()}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7,7 17,7 17,17"></polyline>
                          </svg>
                          Send
                        </button>
                        <button className="action-btn secondary" onClick={() => receiveFundsDialog.open()}>
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
                            ) : error ? (
                              <div className="balance-error">
                                <p className="balance-amount error">Failed to load</p>
                                <button className="balance-retry" onClick={() => refreshBalance()}>
                                  Retry
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="balance-amount">
                                  {formattedBalance}
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
                          {nftCoins.length > 0 && (
                            <div className="badge">{nftCoins.length}</div>
                          )}
                        </button>

                        <button
                          className={`menu-item ${!isConnected ? 'disabled' : ''}`}
                          onClick={() => {
                            console.log('Make Offer button clicked!', {
                              isConnected,
                              showOfferModal: makeOfferDialog.isOpen,
                              nftCount: nftCoins.length
                            });
                            makeOfferDialog.open();
                          }}
                          disabled={!isConnected}
                          title={!isConnected ? 'Please wait for wallet connection to complete' : ''}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 11H1l2-2m0 0l2-2m-2 2l2 2m2-2h8l2-2m0 0l2-2m-2 2l2 2"></path>
                          </svg>
                          <span>Make Offer</span>
                          {nftCoins.length > 0 && (
                            <div className="badge">{nftCoins.length}</div>
                          )}
                        </button>

                        <button
                          className="menu-item"
                          onClick={() => activeOffersDialog.open()}
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
                      <button className="disconnect-btn" onClick={disconnect}>
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
                      <div className="view-header">
                        <button className="back-btn" onClick={() => setCurrentView('main')}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5"></path>
                            <path d="M12 19l-7-7 7-7"></path>
                          </svg>
                        </button>
                        <h4>Transactions ({coinCount + sentTransactions.length})</h4>
                        <button className="refresh-btn" onClick={() => refreshBalance()}>
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
                              <div className="transaction-amount">-{(transaction.amount / 1000000000000).toFixed(6)} XCH</div>
                              <div className="transaction-details">
                                <div className="transaction-address">To: {formatAddress(transaction.recipient)}</div>
                                <div className="transaction-fee">Fee: {(transaction.fee / 1000000000000).toFixed(6)} XCH</div>
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
                      <div className="view-header">
                        <button className="back-btn" onClick={() => setCurrentView('main')}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5"></path>
                            <path d="M12 19l-7-7 7-7"></path>
                          </svg>
                        </button>
                        <h4>Assets ({nftCoins.length} NFTs)</h4>
                        <button className="refresh-btn" onClick={() => refreshBalance()}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 4v6h6"></path>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                          </svg>
                        </button>
                      </div>

                      <div className="assets-content">
                        <div className="grid grid-3">
                          {nftCoins.map((nftCoin, index) => {
                            const metadata = getNftMetadata(nftCoin);
                            const isLoading = isNftMetadataLoading(nftCoin);
                            const nftInfo = nftCoin.parentSpendInfo?.driverInfo?.info;
                            const onChainMetadata = nftInfo?.metadata;

                            return (
                              <div key={index} className="asset-card" onClick={() => openNftDetails(nftCoin)}>
                                <div className="asset-image">
                                  {isLoading ? (
                                    <div className="loading-state">
                                      <div className="spinner"></div>
                                    </div>
                                  ) : metadata?.data_uris && metadata.data_uris.length > 0 ? (
                                    <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                                  ) : metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                                    <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                                  ) : (
                                    <div className="asset-placeholder">🖼️</div>
                                  )}
                                </div>
                                <div className="asset-info">
                                  <h5 className="asset-name">{metadata?.name || `NFT #${index + 1}`}</h5>
                                  <p className="asset-collection">{metadata?.collection?.name || 'Unknown Collection'}</p>
                                  
                                  {/* Edition Info */}
                                  {(onChainMetadata?.editionNumber && onChainMetadata?.editionTotal) ? (
                                    <div className="asset-edition">#{onChainMetadata.editionNumber} of {onChainMetadata.editionTotal}</div>
                                  ) : (metadata?.series_number && metadata?.series_total) ? (
                                    <div className="asset-edition">#{metadata.series_number} of {metadata.series_total}</div>
                                  ) : null}

                                  {/* Key Attributes Preview */}
                                  {metadata?.attributes && metadata.attributes.length > 0 && (
                                    <div className="asset-attributes">
                                      {metadata.attributes.slice(0, 2).map((attr: any, attrIndex: number) => (
                                        <div key={attrIndex} className="attribute-preview">
                                          <span className="attr-name">{attr.trait_type || attr.name}</span>
                                          <span className="attr-value">{attr.value}</span>
                                        </div>
                                      ))}
                                      {metadata.attributes.length > 2 && (
                                        <div className="more-attributes">+{metadata.attributes.length - 2} more</div>
                                      )}
                                    </div>
                                  )}

                                  {/* Rarity/Special indicators */}
                                  <div className="asset-badges">
                                    {nftInfo?.royaltyTenThousandths && nftInfo.royaltyTenThousandths > 0 && (
                                      <span className="badge royalty">
                                        {(nftInfo.royaltyTenThousandths / 100).toFixed(1)}% Royalty
                                      </span>
                                    )}
                                    {metadata?.properties?.category && (
                                      <span className="badge category">{metadata.properties.category}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {nftCoins.length === 0 && (
                          <div className="no-assets">
                            <div className="no-assets-icon">🖼️</div>
                            <h4>No NFTs Found</h4>
                            <p>Your wallet doesn't contain any NFTs yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                                     ) : currentView === 'nft-details' && selectedNft ? (
                     <div className="nft-details-view">
                       <div className="view-header">
                         <button className="back-btn" onClick={() => setCurrentView('assets')}>
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                             <path d="M19 12H5"></path>
                             <path d="M12 19l-7-7 7-7"></path>
                           </svg>
                         </button>
                         <h4>NFT Details</h4>
                         <div></div>
                       </div>

                       <div className="nft-details-content">
                         {(() => {
                           const metadata = getNftMetadata(selectedNft);
                           const isLoading = isNftMetadataLoading(selectedNft);
                           const nftInfo = selectedNft.parentSpendInfo?.driverInfo?.info;
                           const onChainMetadata = nftInfo?.metadata;

                           return (
                             <>
                               {/* NFT Image */}
                               <div className="section-card">
                                 <div className="nft-image-large">
                                   {isLoading ? (
                                     <div className="loading-state">
                                       <div className="spinner"></div>
                                     </div>
                                   ) : metadata?.data_uris && metadata.data_uris.length > 0 ? (
                                     <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                                   ) : metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                                     <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                                   ) : (
                                     <div className="nft-placeholder-large">🖼️</div>
                                   )}
                                 </div>
                               </div>

                               {/* Basic Information */}
                               <div className="section-card">
                                 <h3>Basic Information</h3>
                                 <div className="grid grid-2">
                                   <div className="info-item">
                                     <label>Name</label>
                                     <span className="info-value">
                                       {metadata?.name || `NFT ${nftInfo?.launcherId?.substring(0, 8)}...${nftInfo?.launcherId?.substring(nftInfo.launcherId.length - 8)}` || 'Unknown'}
                                     </span>
                                   </div>
                                   <div className="info-item">
                                     <label>Collection</label>
                                     <span className="info-value">
                                       {metadata?.collection?.name || 'Unknown Collection'}
                                     </span>
                                   </div>
                                   {metadata?.description && (
                                     <div className="info-item">
                                       <label>Description</label>
                                       <span className="info-value description">{metadata.description}</span>
                                     </div>
                                   )}
                                   <div className="info-item">
                                     <label>Edition</label>
                                     <span className="info-value">
                                       {onChainMetadata?.editionNumber && onChainMetadata?.editionTotal 
                                         ? `${onChainMetadata.editionNumber} of ${onChainMetadata.editionTotal}`
                                         : metadata?.series_number && metadata?.series_total
                                         ? `#${metadata.series_number} of ${metadata.series_total}`
                                         : 'N/A'
                                       }
                                     </span>
                                   </div>
                                   <div className="info-item">
                                     <label>Launcher ID</label>
                                     <code className="info-value monospace">{nftInfo?.launcherId || 'N/A'}</code>
                                   </div>
                                   <div className="info-item">
                                     <label>Royalty</label>
                                     <span className="info-value">
                                       {nftInfo?.royaltyTenThousandths 
                                         ? `${(nftInfo.royaltyTenThousandths / 100).toFixed(2)}%`
                                         : '0%'
                                       }
                                     </span>
                                   </div>
                                 </div>
                               </div>

                               {/* Metadata Attributes */}
                               {metadata?.attributes && metadata.attributes.length > 0 && (
                                 <div className="section-card">
                                   <h3>Attributes</h3>
                                   <div className="grid grid-3">
                                     {metadata.attributes.map((attr: any, index: number) => (
                                       <div key={index} className="attribute-item">
                                         <div className="attribute-name">{attr.trait_type || attr.name || `Attribute ${index + 1}`}</div>
                                         <div className="attribute-value">{attr.value}</div>
                                         {attr.display_type && (
                                           <div className="attribute-type">{attr.display_type}</div>
                                         )}
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}

                               {/* Collection Information */}
                               {metadata?.collection && (
                                 <div className="section-card">
                                   <h3>Collection Details</h3>
                                   <div className="grid grid-2">
                                     <div className="info-item">
                                       <label>Collection Name</label>
                                       <span className="info-value">{metadata.collection.name || 'Unknown'}</span>
                                     </div>
                                     {metadata.collection.family && (
                                       <div className="info-item">
                                         <label>Family</label>
                                         <span className="info-value">{metadata.collection.family}</span>
                                       </div>
                                     )}
                                     {metadata.collection.description && (
                                       <div className="info-item">
                                         <label>Collection Description</label>
                                         <span className="info-value description">{metadata.collection.description}</span>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               )}

                               {/* Technical Details */}
                               <div className="section-card">
                                 <h3>Technical Information</h3>
                                 <div className="grid grid-2">
                                   <div className="info-item">
                                     <label>Parent Coin Info</label>
                                     <code className="info-value monospace">{selectedNft.coin.parentCoinInfo}</code>
                                   </div>
                                   <div className="info-item">
                                     <label>Puzzle Hash</label>
                                     <code className="info-value monospace">{selectedNft.coin.puzzleHash}</code>
                                   </div>
                                   <div className="info-item">
                                     <label>Amount</label>
                                     <span className="info-value">{selectedNft.coin.amount} mojos</span>
                                   </div>
                                   <div className="info-item">
                                     <label>Created Height</label>
                                     <span className="info-value">{selectedNft.createdHeight}</span>
                                   </div>
                                   {onChainMetadata?.dataHash && (
                                     <div className="info-item">
                                       <label>Data Hash</label>
                                       <code className="info-value monospace">{onChainMetadata.dataHash}</code>
                                     </div>
                                   )}
                                   {onChainMetadata?.metadataHash && (
                                     <div className="info-item">
                                       <label>Metadata Hash</label>
                                       <code className="info-value monospace">{onChainMetadata.metadataHash}</code>
                                     </div>
                                   )}
                                 </div>
                               </div>

                               {/* Data URIs */}
                               {metadata?.data_uris && metadata.data_uris.length > 0 && (
                                 <div className="section-card">
                                   <h3>Data URIs</h3>
                                   <div className="uri-list">
                                     {metadata.data_uris.map((uri: string, index: number) => (
                                       <div key={index} className="uri-item">
                                         <a href={convertIpfsUrl(uri)} target="_blank" rel="noopener noreferrer" className="uri-link">
                                           {uri.startsWith('ipfs://') ? `IPFS: ${uri.substring(7, 20)}...` : uri}
                                         </a>
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </>
                           );
                         })()}
                       </div>
                     </div>
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
            </div>
          </div>
        </div>
      )}

      {/* Modal Styles */}
      <style>{`
        ${sharedModalStyles}

        /* Wallet Modal Specific Styles */
        .modal-content {
          background: #1a1a1a;
          border-radius: 16px;
          width: 90%;
          max-width: 475px;
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