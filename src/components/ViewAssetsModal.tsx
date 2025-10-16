import React, { useEffect, useMemo, useState } from 'react';
import { injectModalStyles } from './modal-styles';
import { 
  useWalletConnection,
  useWalletCoins
} from '../hooks/useChiaWalletSDK';
import { useNFTs, type NFTWithMetadata } from '../hooks/useNFTs';
import { ChiaCloudWalletClient } from '../client/ChiaCloudWalletClient';
import { PiCaretLeft, PiMagnifyingGlass, PiX } from 'react-icons/pi';

interface ViewAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseWallet?: () => void;
  onNFTSelected?: (nft: NFTWithMetadata) => void;
}

export const ViewAssetsModal: React.FC<ViewAssetsModalProps> = ({
  isOpen,
  onClose,
  onCloseWallet,
  onNFTSelected
}) => {
  const { isConnected } = useWalletConnection();
  const { xchCoins, catCoins, nftCoins, isLoading: coinsLoading } = useWalletCoins();
  const { nfts, loading: nftsLoading, metadataLoading, refresh: refreshNFTs } = useNFTs({ autoLoadMetadata: true, autoRefresh: false });

  const [search, setSearch] = useState('');

  // Ensure shared modal styles are available
  useEffect(() => {
    injectModalStyles();
  }, []);

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

  const filteredNFTs = useMemo(() => {
    if (!search.trim()) return nfts;
    const q = search.toLowerCase();
    return nfts.filter((n) =>
      (n.metadata?.name?.toLowerCase().includes(q)) ||
      (n.metadata?.collection?.name?.toLowerCase().includes(q)) ||
      (n.metadata?.description?.toLowerCase().includes(q))
    );
  }, [nfts, search]);

  const convertIpfsUrl = (url?: string): string | undefined => {
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

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center backdrop-blur-sm"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
        style={{ zIndex: 1001, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div className="rounded-2xl overflow-y-auto" 
          role="document" tabIndex={0}
          style={{ backgroundColor: '#131418', border: '1px solid #272830', color: '#EEEEF0', maxHeight: '90vh', width: '90%', maxWidth: '400px' }}
        >
        {/* Header */}
          <div className="flex justify-between items-center px-4 py-5">
            <button className="p-1 rounded transition-colors flex items-center justify-center w-6 h-6" style={{ color: '#7C7A85' }} onMouseEnter={(e) => e.currentTarget.style.color = '#EEEEF0'} onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'} onClick={onClose} aria-label="Back">
              <PiCaretLeft size={24} />
            </button>
            <h3 className="text-xl font-medium" style={{ color: '#EEEEF0' }}>View Assets</h3>
            <button className="p-1 rounded transition-colors flex items-center justify-center w-6 h-6" style={{ color: '#7C7A85' }} onMouseEnter={(e) => e.currentTarget.style.color = '#EEEEF0'} onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'} onClick={onCloseWallet || onClose} aria-label="Close modal">
              <PiX size={24} />
            </button>
          </div>

          <div className="px-6 pb-4">
            {!isConnected ? (
              <div className="text-center text-sm" style={{ padding: '40px' }}>
                <p className="text-red-500">Wallet not connected. Please connect your wallet first.</p>
              </div>
            ) : (coinsLoading || nftsLoading) ? (
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

                  {/* NFT List */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white text-sm font-medium  text-left">NFTs</label>
                      <button
                        className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{backgroundColor: 'transparent', borderColor: '#272830', color: '#EEEEF0'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={refreshNFTs}
                        disabled={nftsLoading || metadataLoading}
                      >
                        {nftsLoading || metadataLoading ? 'Refreshing...' : 'Refresh'}
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
                        style={{paddingLeft: '40px', backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                      />
                    </div>

                    {filteredNFTs.length === 0 ? (
                      <div style={{ color: '#7C7A85' }} className="text-center py-6 text-sm">No NFTs found</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredNFTs.map((nft, idx) => {
                          const name = nft.metadata?.name || 'Unnamed NFT';
                          const collection = nft.metadata?.collection?.name || 'Unknown Collection';
                          const imageUrl = convertIpfsUrl(nft.metadata?.image);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-3 border rounded transition-colors cursor-pointer"
                              style={{ backgroundColor: '#1B1C22', borderColor: '#272830' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#20212a'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'}
                              onClick={() => onNFTSelected?.(nft)}
                            >
                              <div className="w-12 h-12 rounded overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: '#272830' }}>
                                {imageUrl ? (
                                  <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                  <div style={{ color: '#666' }}>🖼️</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate">{name}</div>
                                <div style={{ color: '#7C7A85' }} className="text-xs truncate">{collection}</div>
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
          </div>
        </div>
      </div>
    </>
  );
};


