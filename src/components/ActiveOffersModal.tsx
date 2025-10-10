import React, { useState, useEffect, useCallback } from 'react';
import { SavedOffer } from './types';
import { bech32 } from 'bech32';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import { PiCaretLeft, PiX } from 'react-icons/pi';

interface ActiveOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  // New: closes the entire wallet modal (parent)
  onCloseWallet?: () => void;
  onOfferUpdate?: () => void;
}

export const ActiveOffersModal: React.FC<ActiveOffersModalProps> = ({ 
  isOpen, 
  onClose, 
  onCloseWallet,
  onOfferUpdate 
}) => {
  // Get wallet state from hook (using same pattern as other modals)
  const { address, isConnected } = useWalletConnection();
  
  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('ActiveOffersModal: Modal opened with state:', {
        isOpen,
        hasAddress: !!address,
        address: address ? `${address.substring(0, 10)}...` : 'null',
        isConnected
      });
    }
  }, [isOpen, address, isConnected]);
  
  // Utility to render a status badge
  const getStatusBadgeClasses = (status: SavedOffer['status']): string => {
    switch (status) {
      case 'active':
        return 'px-2 py-1 rounded text-xs font-semibold bg-green-200 text-green-700';
      case 'completed':
        return 'px-2 py-1 rounded text-xs font-semibold bg-blue-200 text-blue-700';
      case 'cancelled':
        return 'px-2 py-1 rounded text-xs font-semibold bg-red-200 text-red-700';
      case 'expired':
        return 'px-2 py-1 rounded text-xs font-semibold bg-amber-200 text-amber-700';
      default:
        return 'px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700';
    }
  };
  const [activeOffers, setActiveOffers] = useState<SavedOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<SavedOffer | null>(null);
  const [showOfferDetails, setShowOfferDetails] = useState(false);

  // Storage key for offers
  const getOffersStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_active_offers';
    return `chia_active_offers_${pubKey.substring(0, 16)}`;
  }, []);

  // Load saved offers
  const loadActiveOffers = useCallback(() => {
    if (!address) {
      console.log('ActiveOffersModal: No address available, cannot load offers');
      return;
    }
    
    setLoading(true);
    try {
      console.log('ActiveOffersModal: Loading offers for address:', address);
      const stored = localStorage.getItem(getOffersStorageKey(address));
      if (stored) {
        const offers = JSON.parse(stored);
        setActiveOffers(offers.filter((offer: SavedOffer) => offer.status === 'active'));
        console.log('ActiveOffersModal: Loaded', offers.filter((offer: SavedOffer) => offer.status === 'active').length, 'active offers');
      } else {
        setActiveOffers([]);
        console.log('ActiveOffersModal: No stored offers found');
      }
    } catch (error) {
      console.error('Error loading active offers:', error);
      setActiveOffers([]);
    } finally {
      setLoading(false);
    }
  }, [address, getOffersStorageKey]);

  // Update offer status
  const updateOfferStatus = useCallback((offerId: string, newStatus: SavedOffer['status']) => {
    if (!address) return;

    try {
      const stored = localStorage.getItem(getOffersStorageKey(address));
      if (stored) {
        const allOffers = JSON.parse(stored);
        const updatedOffers = allOffers.map((offer: SavedOffer) => 
          offer.id === offerId ? { ...offer, status: newStatus } : offer
        );
        localStorage.setItem(getOffersStorageKey(address), JSON.stringify(updatedOffers));
        setActiveOffers(updatedOffers.filter((offer: SavedOffer) => offer.status === 'active'));
        onOfferUpdate?.();
      }
    } catch (error) {
      console.error('Error updating offer status:', error);
    }
  }, [address, getOffersStorageKey, onOfferUpdate]);

  // Copy offer to clipboard
  const copyOfferToClipboard = useCallback(async (offerString: string) => {
    try {
      await navigator.clipboard.writeText(offerString);
      console.log('Offer copied to clipboard');
    } catch (err) {
      console.error('Failed to copy offer:', err);
    }
  }, []);

  // Open offer details on Dexie
  const openOfferOnDexie = useCallback((offer: SavedOffer) => {
    if (offer.dexieOfferUrl) {
      window.open(offer.dexieOfferUrl, '_blank', 'noopener,noreferrer');
    } else if (offer.dexieOfferId) {
      // Construct Dexie URL from offer ID if direct URL not available
      const dexieUrl = `https://dexie.space/offers/${offer.dexieOfferId}`;
      window.open(dexieUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('No Dexie offer ID or URL available for this offer');
    }
  }, []);

  // Copy address to clipboard
  const copyAddressToClipboard = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      console.log('Address copied to clipboard');
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  }, []);

  // Compact address for display
  const compactAddress = useCallback((address: string): string => {
    if (!address || address.length <= 20) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }, []);

  const encodeNftAddress = useCallback((puzzlehashStr: string): string => {
    // Convert hex string to Uint8Array without using Buffer
    const puzzleHash = new Uint8Array(puzzlehashStr.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const encoded = bech32.encode('nft', bech32.toWords(puzzleHash));
    return encoded;
  }, []);

  // Format time
  const formatTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }, []);

  // Convert IPFS URL
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

  // Load offers when modal opens OR when address becomes available
  useEffect(() => {
    if (isOpen) {
      if (address) {
        loadActiveOffers();
      } else {
        console.log('ActiveOffersModal: Modal opened but no address yet, waiting...');
        setLoading(true);
      }
    }
  }, [isOpen, address, loadActiveOffers]);

  // Retry loading when address becomes available
  useEffect(() => {
    if (isOpen && address && activeOffers.length === 0 && !loading) {
      console.log('ActiveOffersModal: Address became available, loading offers...');
      loadActiveOffers();
    }
  }, [isOpen, address, activeOffers.length, loading, loadActiveOffers]);

  const closeModal = () => {
    (onCloseWallet || onClose)();
    setSelectedOffer(null);
    setShowOfferDetails(false);
  };

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

  const viewOfferDetails = (offer: SavedOffer) => {
    setSelectedOffer(offer);
    setShowOfferDetails(true);
  };

  const closeOfferDetails = () => {
    setSelectedOffer(null);
    setShowOfferDetails(false);
  };

  if (!isOpen) return null;

  if (showOfferDetails && selectedOffer) {
    return (
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm"
        style={{ zIndex: 1001 }}
        onClick={(e) => e.target === e.currentTarget && closeOfferDetails()}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <div
          className="w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto"
          role="document"
          tabIndex={0}
          style={{ backgroundColor: '#131418', borderRadius: '16px', border: '1px solid #272830', color: '#EEEEF0' }}
        >
          <div className="flex justify-between items-center px-4 py-5">
            <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={closeOfferDetails} aria-label="Back">
              <PiCaretLeft size={24} />
            </button>
            <h3 className="m-0 text-[#EEEEF0] text-xl font-medium leading-[1.5] text-left">Offer Details</h3>
            <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={closeModal} aria-label="Close modal">
              <PiX size={24} />
            </button>
          </div>
          <div className="px-6 pb-4">
            <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#333] flex items-center justify-center">
                {selectedOffer.nft.imageUrl ? (
                  <img src={convertIpfsUrl(selectedOffer.nft.imageUrl)} alt={selectedOffer.nft.name} className="w-full h-full object-cover" />
                ) : (
                  <span>🖼️</span>
                )}
              </div>
              <div className="flex flex-col">
                <strong>{selectedOffer.nft.name}</strong>
                <span className="text-gray-400">{selectedOffer.nft.collection}</span>
                {selectedOffer.nft.edition && <span className="text-[#6bc36b]">{selectedOffer.nft.edition}</span>}
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">Requested Payment</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-400">Amount</span><div><strong>{selectedOffer.requestedPayment.amount} {selectedOffer.requestedPayment.assetName}</strong></div></div>
                <div><span className="text-gray-400">Asset</span><div><strong>{selectedOffer.requestedPayment.assetName}</strong></div></div>
                <div className="col-span-full">
                  <span className="text-gray-400">Deposit Address</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs break-all">{compactAddress(selectedOffer.requestedPayment.depositAddress)}</code>
                    <button className="px-2 py-1 rounded border border-[#333] text-[#888] hover:text-white hover:bg-[#333] text-xs" onClick={() => copyAddressToClipboard(selectedOffer.requestedPayment.depositAddress)}>Copy</button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">Offer Information</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-400">Created</span><div><strong>{formatTime(selectedOffer.timestamp)}</strong></div></div>
                <div><span className="text-gray-400">Status</span><div><span className={getStatusBadgeClasses(selectedOffer.status)}>{selectedOffer.status}</span></div></div>
                <div><span className="text-gray-400">Type</span><div><strong>{selectedOffer.offerData.isSigned ? 'Signed' : 'Unsigned'}</strong></div></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="copy-offer-btn" onClick={() => copyOfferToClipboard(selectedOffer.offerData.offerString)}>Copy Offer String</button>
              {(selectedOffer.dexieOfferId || selectedOffer.dexieOfferUrl) && (
                <button className="dexie-view-btn" onClick={() => openOfferOnDexie(selectedOffer)}>View on Dexie</button>
              )}
            </div>
            <div className="flex gap-2">
              <button className="status-btn complete-btn" onClick={() => updateOfferStatus(selectedOffer.id, 'completed')}>Mark as Completed</button>
              <button className="status-btn cancel-btn" onClick={() => updateOfferStatus(selectedOffer.id, 'cancelled')}>Cancel Offer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm"
      style={{ zIndex: 1001 }}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={0}
    >
      <div
        className="w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto"
        role="document"
        tabIndex={0}
        style={{ backgroundColor: '#131418', borderRadius: '16px', border: '1px solid #272830', color: '#EEEEF0' }}
      >
          <div className="flex justify-between items-center px-4 py-5">
            <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={onClose} aria-label="Back">
            <PiCaretLeft size={24} />
          </button>
          <h3 className="m-0 text-[#EEEEF0] text-xl font-medium leading-[1.5] text-left">Active Offers ({activeOffers.length})</h3>
          <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={closeModal} aria-label="Close modal">
            <PiX size={24} />
          </button>
        </div>
        <div className="px-6 border-b border-t border-[#272830]">
          {loading ? (
            <div className="text-center py-12 text-[#888]">
              <div className="w-8 h-8 border-2 border-[#272830] border-t-[#2C64F8] rounded-full animate-spin mx-auto mb-4" />
              <p className="m-0 text-sm">Loading offers...</p>
            </div>
          ) : !address ? (
            <div className="text-center py-12 text-[#888]">
              <h4 className="m-0 mb-2 text-white text-lg font-semibold">Wallet Not Connected</h4>
              <p className="m-0 text-sm">Please connect your wallet to view active offers.</p>
            </div>
          ) : activeOffers.length === 0 ? (
            <div className="text-center py-12 text-[#888]">
              <h4 className="m-0 mb-2 text-white text-lg font-semibold">No Active Offers</h4>
              <p className="m-0 text-sm">You haven't created any offers yet. Create an offer to see it here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeOffers.map((offer) => (
                <div key={offer.id} className="flex items-center gap-4 p-4 bg-[#1B1C22] border border-[#272830] rounded hover:bg-[#20212a] transition-colors cursor-pointer" onClick={() => viewOfferDetails(offer)}>
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center bg-[#272830] shrink-0">
                    {offer.nft.imageUrl ? (
                      <img src={convertIpfsUrl(offer.nft.imageUrl)} alt={offer.nft.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[#666]">NFT</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="font-semibold text-white text-[16px] break-words">{offer.nft.name}</div>
                    <div className="text-[#888] text-sm break-words">{offer.nft.collection}</div>
                    <div className="text-[#6bc36b] font-semibold text-sm">
                      Requesting: {offer.requestedPayment.amount} {offer.requestedPayment.assetName}
                    </div>
                    <div className="text-[#666] text-xs">{formatTime(offer.timestamp)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={getStatusBadgeClasses(offer.status)}>{offer.status}</span>
                    <div className="text-[#888] text-[10px]">{offer.offerData.isSigned ? 'Signed' : 'Unsigned'}</div>
                  </div>
                  <div className="text-[#666] ml-2 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"></path>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3.5">
          <div className="flex justify-center">
            <button 
              className="text-[#EEEEF0] rounded-lg py-2.5 px-5 items-center justify-center gap-2 hover:bg-[#333] border border-[#272830] w-full max-w-[150px]"
              onClick={loadActiveOffers}
              disabled={!address || loading}
              title={!address ? 'Wallet not connected' : loading ? 'Loading...' : 'Refresh offers'}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 