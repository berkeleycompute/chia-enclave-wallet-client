import React, { useEffect, useMemo, useState } from 'react';
import { injectModalStyles } from './modal-styles';
import {
  useWalletConnection,
  useWalletCoins
} from '../hooks/useChiaWalletSDK';
import { useNFTs, type NFTWithMetadata } from '../hooks/useNFTs';
import { ChiaCloudWalletClient, type HydratedCoin } from '../client/ChiaCloudWalletClient';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { useTransferAssets } from '../hooks/useTransferAssets';
import { convertIpfsUrl } from '../utils/ipfs';

interface ViewAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNFTSelected?: (nft: NFTWithMetadata) => void;
}

export const ViewAssetsModal: React.FC<ViewAssetsModalProps> = ({
  isOpen,
  onClose,
  onNFTSelected
}) => {
  const { isConnected } = useWalletConnection();
  const { xchCoins, catCoins, nftCoins, isLoading: coinsLoading } = useWalletCoins();
  const { nfts, loading: nftsLoading, metadataLoading, refresh: refreshNFTs, loadAllMetadata } = useNFTs({ 
    autoLoadMetadata: true, 
    autoRefresh: false,
    enableLogging: true  // Enable logging to debug metadata loading
  });
  const { transferNFT, transferCAT, isTransferring, transferError, lastResponse } = useTransferAssets({ enableLogging: true });

  const [search, setSearch] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferType, setTransferType] = useState<'nft' | 'cat'>('nft');
  const [selectedNFT, setSelectedNFT] = useState<HydratedCoin | null>(null);
  const [selectedCAT, setSelectedCAT] = useState<{ coins: HydratedCoin[], assetId: string, name: string } | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFee, setTransferFee] = useState('0.0001'); // Store as XCH

  // Ensure shared modal styles are available
  useEffect(() => {
    injectModalStyles();
  }, []);

  // Force metadata loading when nftCoins change
  useEffect(() => {
    if (isConnected && nftCoins.length > 0 && !nftsLoading && !metadataLoading) {
      console.info('🔄 Triggering metadata load for', nftCoins.length, 'NFTs');
      loadAllMetadata();
    }
  }, [isConnected, nftCoins.length, loadAllMetadata]);

  // Close when clicking outside content
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

  const xchAvailableMojos = useMemo(() => {
    return xchCoins.reduce((total, coin) => total + parseInt(coin.coin.amount), 0);
  }, [xchCoins]);

  const formatXCH = (mojos: string | number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(mojos);
    return result.success ? result.data.toFixed(6) : '0';
  };

  // Helper to extract NFT info from HydratedCoin
  const extractNFTInfo = (coin: HydratedCoin) => {
    const driverInfo = coin.parentSpendInfo?.driverInfo;
    if (driverInfo?.type === 'NFT') {
      const onChainMetadata = driverInfo.info?.metadata;
      console.info('🔍 Extracting NFT info:', { coin, driverInfo, onChainMetadata });
      return {
        coin,
        coinId: coin.coinId,
        launcherId: driverInfo.info?.launcherId || coin.coinId,
        onChainMetadata: typeof onChainMetadata === 'object' && onChainMetadata !== null ? onChainMetadata : undefined
      };
    }
    return null;
  };

  // Group CAT coins by asset ID
  const groupedCATs = useMemo(() => {
    const groups = new Map<string, { coins: HydratedCoin[], assetId: string, totalAmount: bigint }>();
    
    for (const coin of catCoins) {
      const driverInfo = coin.parentSpendInfo?.driverInfo;
      if (driverInfo?.type === 'CAT') {
        const assetId = driverInfo.assetId || 'unknown';
        const existing = groups.get(assetId);
        const amount = BigInt(coin.coin.amount);
        
        if (existing) {
          existing.coins.push(coin);
          existing.totalAmount += amount;
        } else {
          groups.set(assetId, {
            coins: [coin],
            assetId,
            totalAmount: amount
          });
        }
      }
    }
    
    return Array.from(groups.values());
  }, [catCoins]);

  // Create a combined list of NFTs from nftCoins (primary source) enriched with metadata from nfts
  const allDisplayNFTs = useMemo(() => {
    const displayList: Array<{
      coin: HydratedCoin;
      coinId: string;
      launcherId: string;
      name: string;
      collection: string;
      description?: string;
      imageUrl?: string;
      hasDownloadedMetadata: boolean;
    }> = [];

    console.info('📦 Building NFT display list:', {
      nftCoinsCount: nftCoins.length,
      nftsWithMetadataCount: nfts.length,
      nftsWithMetadata: nfts.filter(n => n.metadata).length
    });

    // Add all NFTs from nftCoins (direct from blockchain)
    for (const nftCoin of nftCoins) {
      const info = extractNFTInfo(nftCoin);
      if (info) {
        // Try to find downloaded metadata from nfts hook
        const matchingNft = nfts.find(n => 
          n.coinId === info.coinId || 
          n.coin.parentCoinInfo === nftCoin.coin.parentCoinInfo
        );
        
        const downloadedMetadata = matchingNft?.metadata;
        const onChainMeta = info.onChainMetadata as any;

        console.info('🎨 NFT details:', {
          coinId: info.coinId.substring(0, 16) + '...',
          launcherId: info.launcherId.substring(0, 16) + '...',
          hasDownloadedMetadata: !!downloadedMetadata,
          downloadedMetadata,
          onChainMetadata: onChainMeta
        });
        
        displayList.push({
          coin: nftCoin,
          coinId: info.coinId,
          launcherId: info.launcherId,
          // Prefer downloaded metadata over on-chain metadata
          name: downloadedMetadata?.name || onChainMeta?.name || `NFT #${info.coinId.substring(0, 8)}`,
          collection: downloadedMetadata?.collection?.name || onChainMeta?.collection?.name || 'Unknown Collection',
          description: downloadedMetadata?.description || onChainMeta?.description,
          imageUrl: downloadedMetadata?.image || onChainMeta?.image,
          hasDownloadedMetadata: !!downloadedMetadata
        });
      }
    }

    console.info('✅ Built display list:', {
      total: displayList.length,
      withMetadata: displayList.filter(n => n.hasDownloadedMetadata).length
    });

    return displayList;
  }, [nftCoins, nfts]);

  const filteredNFTs = useMemo(() => {
    if (!search.trim()) return allDisplayNFTs;
    const q = search.toLowerCase();
    return allDisplayNFTs.filter((n) =>
      n.name.toLowerCase().includes(q) ||
      n.collection.toLowerCase().includes(q) ||
      n.description?.toLowerCase().includes(q)
    );
  }, [allDisplayNFTs, search]);

  const handleNFTClick = (nft: typeof allDisplayNFTs[0]) => {
    // If parent provided a callback, use that
    if (onNFTSelected) {
      // Convert to NFTWithMetadata format for backward compatibility
      const nftWithMetadata: NFTWithMetadata = nft.coin as NFTWithMetadata;
      onNFTSelected(nftWithMetadata);
      // Close this modal to avoid stacking
      onClose();
    } else {
      // Otherwise, open our built-in transfer modal
      setTransferType('nft');
      setSelectedNFT(nft.coin);
      setSelectedCAT(null);
      setShowTransferModal(true);
    }
  };

  const handleCATClick = (cat: typeof groupedCATs[0]) => {
    setTransferType('cat');
    setSelectedCAT({
      coins: cat.coins,
      assetId: cat.assetId,
      name: `CAT ${cat.assetId.substring(0, 8)}...`
    });
    setSelectedNFT(null);
    setShowTransferModal(true);
  };

  const handleTransferNFT = async () => {
    if (!selectedNFT || !recipientAddress.trim()) return;

    const info = extractNFTInfo(selectedNFT);
    if (!info) {
      alert('Failed to extract NFT information');
      return;
    }

    // Convert XCH to mojos (1 XCH = 1,000,000,000,000 mojos)
    const feeInMojos = Math.floor(parseFloat(transferFee || '0.0001') * 1000000000000);

    const result = await transferNFT(
      info.coinId,
      info.launcherId,
      recipientAddress,
      feeInMojos
    );

    if (result.success) {
      alert(`NFT transferred successfully!\nTransaction ID: ${result.response?.transaction_id || 'N/A'}`);
      setShowTransferModal(false);
      setSelectedNFT(null);
      setRecipientAddress('');
      setTransferAmount('');
      // Refresh the NFT list
      refreshNFTs();
    } else {
      alert(`Transfer failed: ${result.error}`);
    }
  };

  const handleTransferCAT = async () => {
    if (!selectedCAT || !recipientAddress.trim() || !transferAmount.trim()) return;

    // Parse amount in mojos (CATs use 1000 mojos = 1 CAT typically)
    const amountMojos = Math.floor(parseFloat(transferAmount) * 1000);
    if (isNaN(amountMojos) || amountMojos <= 0) {
      alert('Invalid amount');
      return;
    }

    // Convert XCH to mojos (1 XCH = 1,000,000,000,000 mojos)
    const feeInMojos = Math.floor(parseFloat(transferFee || '0.0001') * 1000000000000);

    // Get coin IDs for the transfer
    const coinIds = selectedCAT.coins.map(c => c.coinId);

    const result = await transferCAT(
      coinIds,
      selectedCAT.assetId,
      recipientAddress,
      amountMojos,
      feeInMojos
    );

    if (result.success) {
      alert(`CAT transferred successfully!\nTransaction ID: ${result.response?.transaction_id || 'N/A'}`);
      setShowTransferModal(false);
      setSelectedCAT(null);
      setRecipientAddress('');
      setTransferAmount('');
      // Refresh the coin list
      window.location.reload(); // Simple refresh for now
    } else {
      alert(`Transfer failed: ${result.error}`);
    }
  };

  const handleTransfer = () => {
    if (transferType === 'nft') {
      handleTransferNFT();
    } else {
      handleTransferCAT();
    }
  };

  if (!isOpen) return null;

  // Show loading spinner only on initial load (no data yet)
  const isInitialLoading = coinsLoading && nftCoins.length === 0;

  return (
    <div className="px-6 pb-4">
      {!isConnected ? (
        <div className="text-center text-sm" style={{ padding: '40px' }}>
          <p className="text-red-500">Wallet not connected. Please connect your wallet first.</p>
        </div>
      ) : isInitialLoading ? (
        <div className="text-center text-sm" style={{ padding: '40px' }}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#272830', borderTopColor: '#2C64F8' }}></div>
          <p>Loading assets...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Balance Info */}
          <div className="flex items-center">
            <div className="flex items-center gap-3 flex-1 rounded-lg py-2.5 self-stretch border" style={{ borderColor: '#272830', padding: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.2019 6.10456C12.8363 6.12729 12.0596 6.21872 11.7577 6.27461C10.8985 6.43363 10.1713 6.68895 9.59736 7.03318C8.89069 7.45698 8.47902 7.78375 7.93465 8.353L7.58269 8.72104L7.32782 9.07199C7.01028 9.50926 6.89933 9.6915 6.68376 10.1297C6.44521 10.6147 6.24284 11.1842 6.1606 11.6021C6.14587 11.6769 6.11801 11.8104 6.09866 11.8988L6.06349 12.0596L6.03837 13.2961L6.15313 13.9884L6.19481 13.9966C6.21772 14.0011 6.28814 13.9611 6.35129 13.9078C6.90817 13.4378 8.17309 12.7935 9.47599 12.3162C9.62284 12.2624 9.81399 12.1913 9.90077 12.1582C10.1277 12.0717 10.9892 11.7816 11.2601 11.7006C11.3869 11.6626 11.6818 11.5743 11.9154 11.5043C12.1491 11.4342 12.5368 11.3226 12.7771 11.2561C13.0174 11.1896 13.3536 11.0956 13.5242 11.0471C13.971 10.9203 14.0169 10.9287 13.6366 11.0677C13.2292 11.2165 12.2937 11.6074 11.8548 11.8122C11.788 11.8434 11.6296 11.9156 11.5028 11.9728C10.8382 12.2724 9.46424 12.9692 8.86916 13.3084C7.38025 14.1572 6.08485 14.9936 4.90052 15.8708C4.50089 16.1668 4.14444 16.4339 4.05096 16.5074C3.99088 16.5546 3.76696 16.7297 3.55336 16.8966C3.33976 17.0634 3.03244 17.3065 2.87041 17.4367C2.70839 17.5669 2.53637 17.7045 2.48811 17.7425C2.43986 17.7805 2.40039 17.8222 2.40039 17.8352C2.40039 17.8746 2.49792 17.8619 2.56656 17.8136C2.6657 17.7439 2.99387 17.5673 3.55336 17.2827C5.19942 16.4454 6.32192 15.997 6.91186 15.9413L7.09058 15.9243L7.37305 16.2184C7.92215 16.79 8.54068 17.2028 9.28996 17.4978C10.5043 17.9759 11.9229 18.0379 13.2869 17.6726C14.0207 17.4761 14.7341 17.1723 15.2992 16.8157C16.7651 15.8907 18.4099 13.7797 20.2126 10.5096C20.3751 10.2148 20.5081 9.969 20.5081 9.96336C20.5081 9.9577 20.6073 9.76487 20.7286 9.53485C21.0386 8.94693 21.6004 7.77861 21.6004 7.7219V7.67454L20.9754 7.46505C20.4264 7.28105 20.148 7.19088 19.7314 7.06209C18.9531 6.82151 17.4213 6.44182 16.6001 6.28594C16.2209 6.21395 15.6567 6.14915 15.0831 6.11169C14.7481 6.0898 13.5148 6.08513 13.2019 6.10456Z" fill="#0E9F6E" />
              </svg>
              <div className="flex flex-col items-start">
                <h4>Chia</h4>
                <p className="text-xs font-medium" style={{ color: '#7c7a85' }}>{formatXCH(xchAvailableMojos)} XCH</p>
              </div>
            </div>
          </div>

          {/* Asset Sections */}
          <div className="flex flex-col gap-3">
            {/* Coins Summary */}
            <div className="rounded-lg border p-3" style={{ backgroundColor: '#1B1C22', borderColor: '#272830' }}>
              <div className="flex justify-between items-center text-sm ">
                <span>Total XCH</span>
                <span className="text-white font-medium ">{formatXCH(xchAvailableMojos)} XCH</span>
              </div>
              <div className="flex justify-between items-center text-sm  mt-2">
                <span>XCH coins</span>
                <span className="text-white font-medium ">{xchCoins.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm  mt-2">
                <span>CAT coins</span>
                <span className="text-white font-medium ">{catCoins.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm  mt-2">
                <span>NFTs</span>
                <span className="text-white font-medium ">{nftCoins.length}</span>
              </div>
            </div>

            {/* CAT List */}
            {groupedCATs.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-medium text-left">CAT Tokens</label>
                <div className="flex flex-col gap-2">
                  {groupedCATs.map((cat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors"
                      style={{ backgroundColor: '#1B1C22', borderColor: '#272830' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#272830'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'}
                      onClick={() => handleCATClick(cat)}
                    >
                      <div className="w-12 h-12 rounded overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: '#272830' }}>
                        <span className="text-2xl">💰</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          CAT Token
                        </div>
                        <div style={{ color: '#7C7A85' }} className="text-xs truncate">
                          {cat.assetId.substring(0, 16)}...
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-white text-sm font-medium">
                          {(Number(cat.totalAmount) / 1000).toLocaleString()}
                        </div>
                        <div style={{ color: '#7C7A85' }} className="text-xs">
                          {cat.coins.length} coins
                        </div>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 4L13 10L7 16" stroke="#7C7A85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NFT List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-white text-sm font-medium text-left">NFTs</label>
                  {metadataLoading && (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: '#272830', borderTopColor: '#2C64F8' }}></div>
                      <span className="text-xs" style={{ color: '#7C7A85' }}>Loading metadata...</span>
                    </div>
                  )}
                </div>
                <button
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'transparent', borderColor: '#272830', color: '#EEEEF0' }}
                  onMouseEnter={(e) => !metadataLoading && (e.currentTarget.style.backgroundColor = '#1B1C22')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={refreshNFTs}
                  disabled={metadataLoading}
                >
                  {metadataLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="relative flex items-center">
                <PiMagnifyingGlass className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-silicongray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, collection, or description"
                  className="w-full px-4 py-2 border rounded text-sm focus:outline-none placeholder-gray-300"
                  style={{ paddingLeft: '40px', backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                />
              </div>

              {filteredNFTs.length === 0 && !coinsLoading ? (
                <div style={{ color: '#7C7A85' }} className="text-center py-6 text-sm">
                  {nftCoins.length === 0 ? 'No NFTs in your wallet' : 'No NFTs match your search'}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredNFTs.map((nft, idx) => {
                    const imageUrl = convertIpfsUrl(nft.imageUrl);
                    const isLoadingMetadata = metadataLoading && !nft.hasDownloadedMetadata;
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 border rounded transition-colors cursor-pointer"
                        style={{ 
                          backgroundColor: '#1B1C22', 
                          borderColor: '#272830',
                          opacity: isLoadingMetadata ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#20212a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'}
                        onClick={() => handleNFTClick(nft)}
                      >
                        <div className="w-12 h-12 rounded overflow-hidden flex items-center justify-center shrink-0 relative" style={{ backgroundColor: '#272830' }}>
                          {imageUrl ? (
                            <img src={imageUrl} alt={nft.name} className="w-full h-full object-cover" />
                          ) : (
                            <div style={{ color: '#666' }}>🖼️</div>
                          )}
                          {isLoadingMetadata && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'transparent', borderTopColor: '#2C64F8' }}></div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {nft.name}
                            {isLoadingMetadata && (
                              <span className="ml-2 text-xs" style={{ color: '#7C7A85' }}>(loading...)</span>
                            )}
                          </div>
                          <div style={{ color: '#7C7A85' }} className="text-xs truncate">{nft.collection}</div>
                        </div>
                        <div style={{ color: '#666' }} className="ml-2 shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6"></path>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal - Unified for NFTs and CATs */}
      {showTransferModal && (selectedNFT || selectedCAT) && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransferModal(false);
              setSelectedNFT(null);
              setSelectedCAT(null);
            }
          }}
        >
          <div 
            className="rounded-lg shadow-xl max-w-md w-full mx-4"
            style={{ backgroundColor: '#14151A', border: '1px solid #272830' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#272830' }}>
              <h3 className="text-lg font-semibold text-white">
                {transferType === 'nft' ? 'Transfer NFT' : 'Transfer CAT'}
              </h3>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedNFT(null);
                  setSelectedCAT(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Asset Info */}
              <div className="flex items-center gap-3 p-3 border rounded" style={{ backgroundColor: '#1B1C22', borderColor: '#272830' }}>
                <div className="w-12 h-12 rounded overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: '#272830' }}>
                  {transferType === 'nft' && selectedNFT ? (() => {
                    const info = extractNFTInfo(selectedNFT);
                    const metadata = info?.onChainMetadata as any;
                    const imageUrl = convertIpfsUrl(metadata?.image);
                    return imageUrl ? (
                      <img src={imageUrl} alt="NFT" className="w-full h-full object-cover" />
                    ) : (
                      <div style={{ color: '#666' }}>🖼️</div>
                    );
                  })() : (
                    <span className="text-2xl">💰</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {transferType === 'nft' && selectedNFT ? (() => {
                      const info = extractNFTInfo(selectedNFT);
                      const metadata = info?.onChainMetadata as any;
                      return metadata?.name || 'Unnamed NFT';
                    })() : selectedCAT?.name || 'CAT Token'}
                  </div>
                  <div style={{ color: '#7C7A85' }} className="text-xs truncate">
                    {transferType === 'nft' && selectedNFT 
                      ? `ID: ${selectedNFT.coinId.substring(0, 16)}...`
                      : `Asset: ${selectedCAT?.assetId.substring(0, 16)}...`
                    }
                  </div>
                  {transferType === 'cat' && selectedCAT && (
                    <div style={{ color: '#7C7A85' }} className="text-xs">
                      Available: {(Number(selectedCAT.coins.reduce((sum, c) => sum + BigInt(c.coin.amount), BigInt(0))) / 1000).toLocaleString()} CAT
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Field (only for CATs) */}
              {transferType === 'cat' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Amount (CAT)
                  </label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.000"
                    step="0.001"
                    className="w-full px-4 py-2 border rounded text-sm focus:outline-none"
                    style={{ backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                  />
                </div>
              )}

              {/* Recipient Address */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="xch1..."
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none"
                  style={{ backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                />
              </div>

              {/* Fee */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Transaction Fee (XCH)
                </label>
                <input
                  type="number"
                  step="0.00001"
                  min="0"
                  value={transferFee}
                  onChange={(e) => setTransferFee(e.target.value)}
                  placeholder="0.0001"
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none"
                  style={{ backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                />
                <p className="text-xs mt-1" style={{ color: '#7C7A85' }}>
                  {Math.floor(parseFloat(transferFee || '0.0001') * 1000000000000).toLocaleString()} mojos
                </p>
              </div>

              {/* Error Display */}
              {transferError && (
                <div className="p-3 rounded border" style={{ backgroundColor: '#2a1a1a', borderColor: '#6b2828' }}>
                  <p className="text-sm text-red-400">{transferError}</p>
                </div>
              )}

              {/* Success Display */}
              {lastResponse && (
                <div className="p-3 rounded border" style={{ backgroundColor: '#1a2a1a', borderColor: '#286b28' }}>
                  <p className="text-sm text-green-400">Transfer successful!</p>
                  <p className="text-xs mt-1" style={{ color: '#7C7A85' }}>TX: {lastResponse.transaction_id?.substring(0, 16)}...</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedNFT(null);
                  }}
                  className="flex-1 px-4 py-2 rounded border text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'transparent', borderColor: '#272830', color: '#EEEEF0' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  disabled={isTransferring}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  className="flex-1 px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2C64F8', color: 'white' }}
                  onMouseEnter={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#1E4FD9')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C64F8'}
                  disabled={isTransferring || !recipientAddress.trim() || (transferType === 'cat' && !transferAmount.trim())}
                >
                  {isTransferring ? 'Transferring...' : `Transfer ${transferType === 'nft' ? 'NFT' : 'CAT'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


