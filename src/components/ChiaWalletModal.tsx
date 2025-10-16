import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PiArrowLineDown, PiHandCoins, PiKey, PiPaperPlaneTilt, PiX } from "react-icons/pi";
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
  useSpacescanBalance
} from '../client/SpacescanClient';
import { SendFundsModal } from './SendFundsModal';
import { ReceiveFundsModal } from './ReceiveFundsModal';
import { MakeOfferModal } from './MakeOfferModal';
import { ActiveOffersModal } from './ActiveOffersModal';
import { NFTDetailsModal } from './NFTDetailsModal';
import { TransactionsModal } from './TransactionsModal';
import { ViewAssetsModal } from './ViewAssetsModal';
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
import { ChiaCloudWalletClient, type HydratedCoin } from '../client/ChiaCloudWalletClient';
import { useMnemonic } from '../hooks/useWalletInfo';
import { useGlobalDialogs } from './GlobalDialogProvider';
import { SiChianetwork } from 'react-icons/si';

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
    xchCoins,
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


  // Calculate balance directly from coins (more accurate)
  const xchAvailableMojos = useMemo(() => {
    return xchCoins.reduce((total, coin) => total + parseInt(coin.coin.amount), 0);
  }, [xchCoins]);

  const formatXCH = useCallback((mojos: string | number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(mojos);
    return result.success ? result.data.toFixed(6) : '0';
  }, []);

  // Use Spacescan NFTs as the primary NFT source
  const nftCoins = spacescanNfts;
  const [sentTransactions, setSentTransactions] = useState<SentTransaction[]>([]);

  // Asset/offer counts
  const assetsCount = useMemo(() => (Array.isArray(nftCoins) ? nftCoins.length : 0), [nftCoins]);
  const [offersCount, setOffersCount] = useState<number>(0);
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
  const walletData = useMemo(() => {
    const xchBalance = ChiaCloudWalletClient.mojosToXCH(xchAvailableMojos);
    const balance = xchBalance.success ? xchBalance.data : 0;
    const formattedBalance = formatXCH(xchAvailableMojos);
    
    return {
      connected: isConnected,
      address: address,
      balance: balance,
      coinCount: coinCount,
      formattedBalance: formattedBalance
    };
  }, [isConnected, address, xchAvailableMojos, coinCount, formatXCH]);

  // Use ref to track previous wallet data
  const prevWalletDataRef = useRef<any>(null);

  // Emit wallet updates only when data actually changes
  useEffect(() => {
    if (onWalletUpdate && isConnected && !coinsLoading) {
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
  }, [onWalletUpdate, isConnected, coinsLoading, walletData]);

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

  // Utility functions
  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 7)}...${address.substring(address.length - 4)}`;
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
    } catch {/* Ignore */}
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
    // Close all dialogs using hooks
    sendFundsDialog.close();
    receiveFundsDialog.close();
    makeOfferDialog.close();
    activeOffersDialog.close();
    nftDetailsDialog.close();
    transactionsDialog.close();
    viewAssetsDialog.close();
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
          className="fixed inset-0 flex items-center justify-center backdrop-blur-sm"
          style={{ zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          tabIndex={0}
        >
          <div
            className="overflow-y-auto rounded-2xl"
            role="document"
            tabIndex={0}
            style={{ 
              backgroundColor: '#131418', 
              border: '1px solid #272830', 
              color: '#EEEEF0', 
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              maxWidth: '397px',
              maxHeight: '90vh',
              width: '90%'
            }}
          >
            <div className="relative p-6">
              <div className="w-full flex items-center gap-2" style={{ padding: '14px' }}>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(to bottom, #0e9f6e, #014737)' }}></div>
                  <div className="absolute rounded-full flex items-center justify-center" style={{ width: '18px', height: '18px', backgroundColor: '#131418', border: '1px solid #272830', bottom: '-2px', right: '-2px' }}>
                    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.5149 2.74281V1.02852C10.5149 0.876967 10.4547 0.731624 10.3476 0.624458C10.2404 0.517298 10.095 0.457092 9.9435 0.457092H2.51493C2.21182 0.457092 1.92113 0.577498 1.70681 0.791829C1.49248 1.00616 1.37207 1.29685 1.37207 1.59995M1.37207 1.59995C1.37207 1.90305 1.49248 2.19374 1.70681 2.40807C1.92113 2.6224 2.21182 2.74281 2.51493 2.74281H11.0864C11.2379 2.74281 11.3833 2.80301 11.4904 2.91017C11.5976 3.01734 11.6578 3.16268 11.6578 3.31424V5.59995M1.37207 1.59995V9.59995C1.37207 9.90304 1.49248 10.1937 1.70681 10.4081C1.92113 10.6224 2.21182 10.7428 2.51493 10.7428H11.0864C11.2379 10.7428 11.3833 10.6826 11.4904 10.5754C11.5976 10.4683 11.6578 10.3229 11.6578 10.1714V7.88566M11.6578 5.59995H9.9435C9.64041 5.59995 9.34973 5.72035 9.13538 5.93469C8.92104 6.14903 8.80064 6.43972 8.80064 6.74281C8.80064 7.04589 8.92104 7.33658 9.13538 7.55092C9.34973 7.76526 9.64041 7.88566 9.9435 7.88566H11.6578M11.6578 5.59995C11.8093 5.59995 11.9547 5.66018 12.0618 5.76732C12.169 5.87446 12.2292 6.01984 12.2292 6.17138V7.31424C12.2292 7.46578 12.169 7.61115 12.0618 7.71829C11.9547 7.82544 11.8093 7.88566 11.6578 7.88566" stroke="#3E67C1" strokeWidth="0.857143" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-start text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium ">{address ? formatAddress(address) : 'xch1g9u...y4ua'}</h3>
                    <div className="flex items-center justify-center cursor-pointer transition" style={{ width: '18px', height: '18px', color: '#7c7a85' }} onClick={() => copyToClipboard(address || 'xch1g9u...y4ua')}>
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
                  <p className="text-xs" style={{ color: '#7c7a85' }}>Connected</p>
                </div>
              </div>
              <button className="absolute w-6 h-6 rounded transition-colors flex items-center justify-center" style={{ color: '#7C7A85', top: '28px', right: '20px' }} onClick={closeModal} aria-label="Close modal" onMouseEnter={(e) => e.currentTarget.style.color = '#EEEEF0'} onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}>
                <PiX size={16} />
              </button>
            </div>

            <div className="px-4 mb-4">
              {isLoading && !isConnected ? (
                <div className="text-center px-10 py-5">
                  <div className="m-auto w-8 h-8 rounded-full animate-spin mb-4"
                    style={{ borderColor: '#333333', borderTopColor: '#6bc36b', borderWidth: '3px' }}
                  />
                  <p>Connecting to wallet...</p>
                </div>
              ) : hasError && !isConnected ? (
                <div className="text-center px-10 py-5">
                  <p className="flex items-center gap-2 p-3 border rounded-lg font-sm mb-4 justify-center"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>{error || coinsError}</p>
                  <button className="rounded-lg px-5 py-2.5 font-medium text-sm text-white transition-all" style={{ backgroundColor: '#6bc36b', border: '1px solid #6bc36b'}} onClick={connect} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a9f4a'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6bc36b'}>
                    Retry
                  </button>
                </div>
              ) : isConnected ? (
                <>
                  {/* Action Buttons */}
                  <div className="flex gap-2 px-4 mb-6 w-full">
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded border cursor-pointer font-medium transition-colors text-sm" 
                      style={{ borderColor: '#272830', color: '#EEEEF0' }} 
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#272830'}
                      onClick={() => sendFundsDialog.open()}
                    >
                      <PiPaperPlaneTilt size={16} color="#7C7A85" />
                      <span>Send</span>
                    </button>
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded border cursor-pointer font-medium transition-colors text-sm" 
                      style={{ borderColor: '#272830', color: '#EEEEF0' }} 
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#272830'}
                      onClick={() => receiveFundsDialog.open()}
                    >
                      <PiArrowLineDown size={16} color="#7C7A85" />
                      <span>Receive</span>
                    </button>
                  </div>

                  {/* Balance Section */}
                  <div className="w-full flex rounded-lg flex items-center gap-3" style={{ padding: '12px' }}>
                    <SiChianetwork size={24} color="#0E9F6E" />
                    <div className="flex flex-col items-start">
                      <h4 className="text-white font-medium">Chia</h4>
                      <p className="text-xs font-medium" style={{ color: '#7c7a85' }}>{coinsLoading ? 'Loading...' : formatXCH(xchAvailableMojos) + ' XCH'}</p>
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-4">
                      <button
                        className="flex items-center gap-3 text-white cursor-pointer transition-all rounded-lg flex-1"
                        style={{backgroundColor: 'transparent', padding: '12px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1b1c22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => {
                          activeOffersDialog.open();
                        }}
                        title={''}
                      >
                        <PiHandCoins size={24} color="#7C7A85" />
                        <span className="font-medium text-white ">Offers ({offersCount})</span>
                      </button>
                      <div className="h-6" style={{ backgroundColor: '#272830', width: '1px' }}></div>
                      <button
                        className="flex items-center gap-3 text-white cursor-pointer transition-all rounded-lg flex-1"
                        style={{ backgroundColor: 'transparent', padding: '12px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1b1c22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => viewAssetsDialog.open()}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M18.0898 10.37C19.0351 10.7224 19.8763 11.3075 20.5355 12.0712C21.1948 12.8349 21.6509 13.7524 21.8615 14.7391C22.0722 15.7257 22.0307 16.7495 21.7408 17.7158C21.451 18.6822 20.9221 19.5598 20.2032 20.2676C19.4843 20.9754 18.5985 21.4905 17.6278 21.7652C16.657 22.04 15.6327 22.0655 14.6495 21.8395C13.6663 21.6134 12.7559 21.1431 12.0026 20.472C11.2493 19.8009 10.6774 18.9507 10.3398 18" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M7 6H8V10" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16.7098 13.88L17.4098 14.59L14.5898 17.41" stroke="#7C7A85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-medium text-white">Assets ({assetsCount})</span>
                      </button>
                    </div>

                    <button className="flex items-center gap-3 text-white cursor-pointer transition-all rounded-lg" style={{ backgroundColor: 'transparent', padding: '12px' }} onClick={() => transactionsDialog.open()} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1b1c22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.0002 6.39999C3.55837 6.39999 3.2002 6.75817 3.2002 7.19999C3.2002 7.64182 3.55837 7.99999 4.0002 7.99999H20.0002C20.442 7.99999 20.8002 7.64182 20.8002 7.19999C20.8002 6.75817 20.442 6.39999 20.0002 6.39999H4.0002ZM3.2002 12C3.2002 11.5582 3.55837 11.2 4.0002 11.2H20.0002C20.442 11.2 20.8002 11.5582 20.8002 12C20.8002 12.4418 20.442 12.8 20.0002 12.8H4.0002C3.55837 12.8 3.2002 12.4418 3.2002 12ZM3.2002 16.8C3.2002 16.3582 3.55837 16 4.0002 16H20.0002C20.442 16 20.8002 16.3582 20.8002 16.8C20.8002 17.2418 20.442 17.6 20.0002 17.6H4.0002C3.55837 17.6 3.2002 17.2418 3.2002 16.8Z" fill="#7C7A85" />
                      </svg>
                      <span className="font-medium text-white">Transactions</span>
                    </button>

                    <button className="flex items-center gap-3 text-white cursor-pointer transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'transparent', padding: '12px' }} onClick={handleExportPrivateKey} disabled={isExportingMnemonic} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1b1c22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div className="flex items-center justify-center w-6 h-6">
                        <PiKey size={16} color="#7C7A85" />
                      </div>
                      <span className="font-medium text-white ">{isExportingMnemonic ? 'Exporting...' : 'Export private key'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center px-10 py-5">
                  <p className="flex items-center font-sm mb-4 justify-center">Connect your Chia wallet to get started</p>
                  <button className="rounded-lg px-5 py-2.5 font-medium text-sm text-white transition-all" style={{ backgroundColor: '#6bc36b', border: '1px solid #6bc36b' }} onClick={connect} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a9f4a'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6bc36b'}>
                    Connect Wallet
                  </button>
                </div>
              )}

              {/* Footer Section - Inside Modal Body */}
              {isConnected && footer && footer}
            </div>

            {/* Disconnect Section - Bottom */}
            {isConnected && (
              <div className="px-4 py-3 border-t" style={{ borderColor: '#272830' }}>
                <button className="w-full flex items-center gap-3 text-white cursor-pointer transition-all rounded-lg" style={{ backgroundColor: 'transparent', padding: '10px 12px' }} onClick={disconnect} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1b1c22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
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
                  <span className="font-medium text-white">Disconnect Wallet</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}; 