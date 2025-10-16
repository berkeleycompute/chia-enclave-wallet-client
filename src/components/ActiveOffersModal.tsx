import React, { useState, useEffect, useCallback } from 'react';
import { SavedOffer } from './types';
import { bech32 } from 'bech32';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import { PiCaretLeft, PiMagnifyingGlass, PiX } from 'react-icons/pi';

interface ActiveOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  // New: closes the entire wallet modal (parent)
  onCloseWallet?: () => void;
  onOfferUpdate?: () => void;
  onCreateOffer?: () => void;
  onEditOffer?: (offer: SavedOffer) => void;
}

export const ActiveOffersModal: React.FC<ActiveOffersModalProps> = ({ 
  isOpen, 
  onClose, 
  onCloseWallet,
  onOfferUpdate,
  onCreateOffer,
  onEditOffer
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
  const [search, setSearch] = useState('');

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

  const handleCreateOffer = () => {
    onClose();
    onCreateOffer?.();
  };

  const handleEditOffer = (offer: SavedOffer) => {
    if (onEditOffer) {
      onEditOffer(offer);
    } else {
      onClose();
      onCreateOffer?.();
    }
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
          className="w-[90%] max-w-[397px] max-h-[90vh] overflow-y-auto"
          role="document"
          tabIndex={0}
          style={{ backgroundColor: '#131418', borderRadius: '16px', border: '1px solid #272830', color: '#EEEEF0' }}
        >
          <div className="flex justify-between items-center px-4 py-5">
            <button className="text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={closeOfferDetails} aria-label="Back">
              <PiCaretLeft size={24} />
            </button>
            <h3 className=" text-[#EEEEF0] text-xl font-medium  text-left">Offer Details</h3>
            <button className="text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={closeModal} aria-label="Close modal">
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
        className="w-[90%] max-w-[397px] max-h-[90vh] overflow-y-auto"
        role="document"
        tabIndex={0}
        style={{ backgroundColor: '#131418', borderRadius: '16px', border: '1px solid #272830', color: '#EEEEF0' }}
      >
          <div className="flex justify-between items-center px-4 py-5">
            <button className="text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={onClose} aria-label="Back">
            <PiCaretLeft size={24} />
          </button>
          <h3 className=" text-[#EEEEF0] text-xl font-medium  text-left">Offers ({activeOffers.length})</h3>
          <div className="flex items-center gap-2">
            <button className="text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={closeModal} aria-label="Close modal">
              <PiX size={24} />
            </button>
          </div>
        </div>
        <div className="px-4 border-b border-t border-[#272830]">
          <div className="flex items-center gap-3 py-3">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-[#1B1C22] border border-[#272830] rounded">
              <PiMagnifyingGlass size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="bg-transparent outline-none border-none text-sm text-[#EEEEF0] placeholder-[#A7A7A7] p-0"
              />
            </div>
            <button
              className="px-4 py-2 bg-[#2C64F8] rounded text-[#EEEEF0] text-sm font-medium hover:bg-[#1E56E8] disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateOffer}
              disabled={!isConnected}
              title={!isConnected ? 'Wallet not connected' : 'Create a new offer'}
            >
              Create offer
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-[#888]">
              <div className="w-8 h-8 border-2 border-[#272830] border-t-[#2C64F8] rounded-full animate-spin mx-auto mb-4" />
              <p className=" text-sm">Loading offers...</p>
            </div>
          ) : !address ? (
            <div className="text-center py-12 text-[#888]">
              <h4 className=" mb-2 text-white text-lg font-semibold">Wallet Not Connected</h4>
              <p className=" text-sm">Please connect your wallet to view active offers.</p>
            </div>
          ) : activeOffers.length === 0 ? (
            <div className="text-center py-12 text-[#888]">
              <h4 className=" mb-2 text-white text-lg font-semibold">No Active Offers</h4>
              <p className=" text-sm">You haven't created any offers yet. Create an offer to see it here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-scroll">
              {activeOffers.filter((offer) => {
                const term = search.trim().toLowerCase();
                if (!term) return true;
                return (
                  offer.nft.name.toLowerCase().includes(term) ||
                  (offer.nft.collection || '').toLowerCase().includes(term) ||
                  (offer.requestedPayment.assetName || '').toLowerCase().includes(term)
                );
              }).map((offer) => (
                <div key={offer.id} className="p-[14px] bg-[#1B1C22] border-none rounded">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-row items-center justify-between min-w-0">
                      <div className="text-[#A7A7A7] text-sm">NFT</div>
                      <div className="text-white">{offer.nft.name}</div>
                    </div>
                    <div className="flex flex-row items-center justify-between min-w-0">
                      <div className="text-[#A7A7A7] text-sm">Amount</div>
                      <div className="text-white">{offer.requestedPayment.amount} {offer.requestedPayment.assetName}</div>
                    </div>
                    <div className="h-0 border-b border-[#272830]" />
                    <div className="flex flex-row items-center gap-3">
                      <button className="px-3 py-2 rounded border border-[#272830] hover:bg-[#1B1C22] text-[#EEEEF0] text-xx" onClick={() => updateOfferStatus(offer.id, 'cancelled')}>Delete</button>
                      <button className="px-3 py-2 rounded border border-[#272830] hover:bg-[#1B1C22] text-[#EEEEF0] text-xs" onClick={() => handleEditOffer(offer)}>Edit</button>
                      <button className="px-3 py-2 rounded border border-[#272830] hover:bg-[#1B1C22] text-[#EEEEF0] text-xs" onClick={() => viewOfferDetails(offer)}>View</button>
                    </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 