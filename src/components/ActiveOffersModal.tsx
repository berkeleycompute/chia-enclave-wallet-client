import React, { useState, useEffect, useCallback } from 'react';
import { SavedOffer } from './types';
import { bech32 } from 'bech32';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import { PiMagnifyingGlass } from 'react-icons/pi';

interface ActiveOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferUpdate?: () => void;
  onCreateOffer?: () => void;
  onEditOffer?: (offer: SavedOffer) => void;
}

export const ActiveOffersModal: React.FC<ActiveOffersModalProps> = ({
  isOpen,
  onClose,
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
      <>
        <div className="px-6 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#333' }}>
                {selectedOffer.nft.imageUrl ? (
                  <img src={convertIpfsUrl(selectedOffer.nft.imageUrl)} alt={selectedOffer.nft.name} className="w-full h-full object-cover" />
                ) : (
                  <span>🖼️</span>
                )}
              </div>
              <div className="flex flex-col">
                <strong>{selectedOffer.nft.name}</strong>
                <span className="text-gray-400">{selectedOffer.nft.collection}</span>
                {selectedOffer.nft.edition && <span className="text-green-500">{selectedOffer.nft.edition}</span>}
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
                    <button
                      className="px-2 py-1 rounded border hover:text-white text-xs" onClick={() => copyAddressToClipboard(selectedOffer.requestedPayment.depositAddress)}
                      style={{ borderColor: '#333', color: '#888', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#888'; }}
                    >Copy</button>
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
      </>
    );
  }

  return (
    <div className="px-4 border-b border-t" style={{ borderColor: '#272830' }}>
      <div className="flex items-center gap-3 py-3">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 border rounded"
          style={{ backgroundColor: '#1B1C22', borderColor: '#272830', color: '#EEEEF0', height: '36px' }}
        >
          <PiMagnifyingGlass size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="bg-transparent outline-none border-none text-sm placeholder-gray-300"
            style={{ color: '#EEEEF0' }}
          />
        </div>
        <button
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#2C64F8', color: '#EEEEF0' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E56E8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C64F8'}
          onClick={handleCreateOffer}
          disabled={!isConnected}
          title={!isConnected ? 'Wallet not connected' : 'Create a new offer'}
        >
          Create offer
        </button>
      </div>
      {loading ? (
        <div className="text-center py-12" style={{ color: '#888'}}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#272830', borderTopColor: '#2C64F8' }} />
          <p className=" text-sm">Loading offers...</p>
        </div>
      ) : !address ? (
        <div className="text-center py-12" style={{ color: '#888', maxWidth: '360px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
          <h4 className="mb-2 text-white text-lg font-semibold">Wallet Not Connected</h4>
          <p className="text-sm">Please connect your wallet to view active offers.</p>
        </div>
      ) : activeOffers.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#888', maxWidth: '360px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
          <h4 className="mb-2 text-white text-lg font-semibold">No Active Offers</h4>
          <p className="text-sm text-wrap">You haven't created any offers yet. Create an offer to see it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-scroll" style={{ maxHeight: '300px' }}>
          {activeOffers.filter((offer) => {
            const term = search.trim().toLowerCase();
            if (!term) return true;
            return (
              offer.nft.name.toLowerCase().includes(term) ||
              (offer.nft.collection || '').toLowerCase().includes(term) ||
              (offer.requestedPayment.assetName || '').toLowerCase().includes(term)
            );
          }).map((offer) => (
            <div key={offer.id} className="border-none rounded" style={{ backgroundColor: '#1B1C22', padding: '14px' }}>
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-row items-center justify-between min-w-0">
                  <div className="text-gray-300 text-sm">NFT</div>
                  <div className="text-white">{offer.nft.name}</div>
                </div>
                <div className="flex flex-row items-center justify-between min-w-0">
                  <div className="text-gray-300 text-sm">Amount</div>
                  <div className="text-white">{offer.requestedPayment.amount} {offer.requestedPayment.assetName}</div>
                </div>
                <div className="h-0 border-b" style={{ borderColor: '#272830' }} />
                <div className="flex flex-row items-center gap-3">
                  <button style={{ backgroundColor: '#272830', color: '#EEEEF0' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#272830'} className="px-3 py-2 rounded border text-xs" onClick={() => updateOfferStatus(offer.id, 'cancelled')}>Delete</button>
                  <button style={{ backgroundColor: '#272830', color: '#EEEEF0' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#272830'} className="px-3 py-2 rounded border text-xs" onClick={() => handleEditOffer(offer)}>Edit</button>
                  <button style={{ backgroundColor: '#272830', color: '#EEEEF0' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B1C22'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#272830'} className="px-3 py-2 rounded border text-xs" onClick={() => viewOfferDetails(offer)}>View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 