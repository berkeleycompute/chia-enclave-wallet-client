import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { SavedOffer } from './types';
import { bech32 } from 'bech32';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import { useChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';
import { useTransferAssets } from '../hooks/useTransferAssets';
import { PiMagnifyingGlass, PiCopy, PiCheck, PiArrowSquareOut } from 'react-icons/pi';

interface ActiveOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferUpdate?: () => void;
  onCreateOffer?: () => void;
  onEditOffer?: (offer: SavedOffer) => void;
}

export interface ActiveOffersModalRef {
  handleBack: () => boolean; // Returns true if handled, false if parent should close
}

export const ActiveOffersModal = forwardRef<ActiveOffersModalRef, ActiveOffersModalProps>(({
  isOpen,
  onClose,
  onOfferUpdate,
  onCreateOffer,
  onEditOffer
}, ref) => {
  // Get wallet state from hook (using same pattern as other modals)
  const { address, isConnected } = useWalletConnection();
  const sdk = useChiaWalletSDK();
  const { transferNFT } = useTransferAssets({ sdk, enableLogging: true });

  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('[ActiveOffersModal] Modal opened with state:', {
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
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedOffer, setCopiedOffer] = useState(false);
  const [cancellingOfferIds, setCancellingOfferIds] = useState<Set<string>>(new Set());
  const [cancelError, setCancelError] = useState<string | null>(null);
  // Storage key for offers
  const getOffersStorageKey = useCallback((pubKey: string | null): string => {
    if (!pubKey) return 'chia_active_offers';
    return `chia_active_offers_${pubKey.substring(0, 16)}`;
  }, []);

  // Load saved offers
  const loadActiveOffers = useCallback(() => {
    if (!address) {
      console.log('[ActiveOffersModal] No address available, cannot load offers');
      return;
    }

    setLoading(true);
    try {
      console.log('[ActiveOffersModal] Loading offers for address:', address);
      const stored = localStorage.getItem(getOffersStorageKey(address));
      if (stored) {
        const offers = JSON.parse(stored);
        setActiveOffers(offers.filter((offer: SavedOffer) => offer.status === 'active'));
        console.log('[ActiveOffersModal] Loaded', offers.filter((offer: SavedOffer) => offer.status === 'active').length, 'active offers');
      } else {
        setActiveOffers([]);
        console.log('[ActiveOffersModal] No stored offers found');
      }
    } catch (error) {
      console.error('Error loading active offers:', error);
      setActiveOffers([]);
    } finally {
      setLoading(false);
    }
  }, [address, getOffersStorageKey]);

  // Update offer status (local only)
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

  // Cancel offer on blockchain (non-blocking - allows multiple simultaneous cancellations)
  const cancelOfferOnBlockchain = useCallback(async (offer: SavedOffer) => {
    if (!isConnected || !address) {
      return;
    }

    // Add to cancelling set immediately
    setCancellingOfferIds(prev => new Set(prev).add(offer.id));

    try {
      console.log('Cancelling offer on blockchain:', offer.id);

      // Get NFT info from the offer
      const nftHydratedCoin = offer.nft.coin;
      const nftCoinId = nftHydratedCoin.coinId;
      
      // Extract launcher ID from the NFT's driver info
      const driverInfo = nftHydratedCoin.parentSpendInfo?.driverInfo;
      const nftInfo = driverInfo?.info;
      const launcherId = nftInfo?.launcherId;
      
      if (!launcherId) {
        throw new Error('No launcher ID found for NFT in offer');
      }

      console.log('Transferring NFT back to owner to cancel offer:', {
        launcherId,
        nftCoinId,
        recipient: address,
        nftName: offer.nft.name
      });

      // Transfer the NFT back to ourselves using the NFT transfer flow
      // This properly handles the NFT ownership puzzle logic
      const feeInMojos = 0; // No fee needed for self-transfer
      
      const result = await transferNFT(
        nftCoinId,
        launcherId,
        address, // Send to ourselves
        feeInMojos
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to transfer NFT');
      }

      console.log('Offer cancelled on blockchain. NFT transferred back to owner.');

      // Update local status
      updateOfferStatus(offer.id, 'cancelled');
      
      // Remove from cancelling set
      setCancellingOfferIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(offer.id);
        return newSet;
      });
      
      // Close details view if this was the selected offer
      if (selectedOffer?.id === offer.id) {
        setShowOfferDetails(false);
        setSelectedOffer(null);
      }
      
      // Trigger offer update callback
      onOfferUpdate?.();
      
    } catch (error) {
      console.error('Error cancelling offer:', error);
      
      // Remove from cancelling set on error
      setCancellingOfferIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(offer.id);
        return newSet;
      });
      
      // Show error for this specific offer
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel offer on blockchain';
      setCancelError(`${offer.nft.name}: ${errorMessage}`);
      setTimeout(() => setCancelError(null), 5000);
    }
  }, [isConnected, address, updateOfferStatus, onOfferUpdate, transferNFT, selectedOffer]);


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
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 1500);
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

  // Load offers when modal opens OR when address becomes available
  useEffect(() => {
    if (isOpen) {
      if (address) {
        loadActiveOffers();
      } else {
        console.log('[ActiveOffersModal] Modal opened but no address yet, waiting...');
        setLoading(true);
      }
    }
  }, [isOpen, address, loadActiveOffers]);

  // Retry loading when address becomes available
  useEffect(() => {
    if (isOpen && address && activeOffers.length === 0 && !loading) {
      console.log('[ActiveOffersModal] Address became available, loading offers...');
      loadActiveOffers();
    }
  }, [isOpen, address, activeOffers.length, loading, loadActiveOffers]);

  // Reset details view when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setShowOfferDetails(false);
      setSelectedOffer(null);
      setCopiedAddress(false);
      setCancelError(null);
      setCancellingOfferIds(new Set());
    }
  }, [isOpen]);

  // Expose handleBack method to parent components via ref
  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (showOfferDetails) {
        closeOfferDetails();
        return true; // Handled internally - went back to list
      }
      return false; // Not handled - parent should close modal
    }
  }), [showOfferDetails]);

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
      if (showOfferDetails) {
        closeOfferDetails();
      } else {
        onClose();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showOfferDetails) {
        closeOfferDetails();
      } else {
        onClose();
      }
    }
  };

  const viewOfferDetails = (offer: SavedOffer) => {
    setSelectedOffer(offer);
    setShowOfferDetails(true);
  };

  const closeOfferDetails = useCallback(() => {
    setSelectedOffer(null);
    setShowOfferDetails(false);
    setCancelError(null);
  }, []);

  if (!isOpen) return null;

  if (showOfferDetails && selectedOffer) {
    return (
      <div className="flex flex-col gap-3" style={{ maxHeight: '600px', overflowY: 'auto', backgroundColor: '#1B1C22', borderRadius: '8px', padding: '14px', margin: '12px 12px' }}>

        {/* NFT Header Section */}
          <h2 className="text-white text-left text-lg mb-1 break-words">
            {selectedOffer.nft.name}
          </h2>

        {/* offer details Section */}
        <div className="rounded-lg flex flex-col gap-1 items-start">
          <span className="text-white text-lg tracking-wide">Token</span>
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <span className="text-gray-400 text-sm uppercase tracking-wide">Amount</span>
            <div className="text-white font-semibold text-sm">
              {selectedOffer.requestedPayment.amount} {selectedOffer.requestedPayment.assetName}
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <span className="text-gray-400 text-sm uppercase tracking-wide">Deposit Address</span>
            <div className="text-white font-semibold text-sm flex items-center gap-2">
              {compactAddress(selectedOffer.requestedPayment.depositAddress)}
              <div className="ml-auto cursor-pointer flex-shrink-0">
                {copiedAddress ? (
                  <PiCheck size={16} style={{ color: '#22C55E' }} />
                ) : (
                  <PiCopy
                    size={16}
                    style={{ color: '#7C7A85' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                    onClick={() => copyAddressToClipboard(selectedOffer.requestedPayment.depositAddress)}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <span className="text-gray-400 text-sm uppercase tracking-wide">Created</span>
            <div className="text-white font-semibold text-sm">{formatTime(selectedOffer.timestamp)}</div>
          </div>
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <span className="text-gray-400 text-sm uppercase tracking-wide">Status</span>
            <div className="text-white font-semibold text-sm">
              <span className="text-white font-semibold text-sm capitalize">
                {selectedOffer.status}
              </span>
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <span className="text-gray-400 text-sm uppercase tracking-wide">Type</span>
            <div className="text-white font-semibold text-sm">
              {selectedOffer.offerData.isSigned ? 'Signed' : 'Unsigned'}
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <span className="text-gray-400 text-sm uppercase tracking-wide">Offer String</span>
            <div className="text-white font-semibold text-sm flex items-center gap-2">
              {compactAddress(selectedOffer.offerData.offerString)}
              <div className="ml-auto cursor-pointer flex-shrink-0">
                {copiedOffer ? (
                  <PiCheck size={16} style={{ color: '#22C55E' }} />
                ) : (
                  <PiCopy
                    size={16}
                    style={{ color: '#7C7A85' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                    onClick={() => {
                      copyOfferToClipboard(selectedOffer.offerData.offerString);
                      setCopiedOffer(true);
                      setTimeout(() => setCopiedOffer(false), 1500);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <span className="text-gray-400 text-sm uppercase tracking-wide">Dexie Offer ID</span>
            <div className="text-white font-semibold text-sm flex items-center gap-2">
              {compactAddress(selectedOffer.dexieOfferId || '')}
              <div className="ml-auto cursor-pointer flex-shrink-0 ">
                {selectedOffer.dexieOfferId && (
                  <PiArrowSquareOut size={16} style={{ color: '#7C7A85' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}
                    onClick={() => openOfferOnDexie(selectedOffer)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t" style={{ borderColor: '#272830' }}/>
        {cancelError && (
          <div className="text-red-400 text-xs mb-2 px-2 py-1 rounded" style={{ backgroundColor: '#431d1d', border: '1px solid #7f1d1d' }}>
            {cancelError}
          </div>
        )}
        <button
          className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => cancelOfferOnBlockchain(selectedOffer)}
          disabled={cancellingOfferIds.has(selectedOffer.id) || !isConnected}
          style={{ backgroundColor: 'transparent', borderColor: '#EF4444', color: '#EF4444' }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = '#EF4444';
              e.currentTarget.style.color = '#EEEEF0';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#EF4444';
            }
          }}
        >
          {cancellingOfferIds.has(selectedOffer.id) ? 'Cancelling...' : 'Cancel Offer'}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 border-b border-t" style={{ borderColor: '#272830' }}>
      <div className="flex items-center gap-3 pt-3 pb-1">
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
        <div className="text-center py-12" style={{ color: '#888' }}>
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
          <h4 className="text-white text-sm">No Active Offers</h4>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto py-3" style={{ maxHeight: '400px' }}>
          {activeOffers.filter((offer) => {
            const term = search.trim().toLowerCase();
            if (!term) return true;
            return (
              offer.nft.name.toLowerCase().includes(term) ||
              (offer.nft.collection || '').toLowerCase().includes(term) ||
              (offer.requestedPayment.assetName || '').toLowerCase().includes(term)
            );
          }).map((offer) => (
            <div
              key={offer.id}
              className="rounded-lg transition-all"
              style={{ backgroundColor: '#1B1C22', padding: '16px' }}
            >
              <div className="flex items-start gap-4">
                {/* NFT Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col items-start gap-3 w-full">
                    <div className="flex flex-row items-center justify-between w-full">
                      <span className="text-gray-300 text-sm uppercase tracking-wide">NFT</span>
                      <h3 className="text-white font-medium text-md truncate">
                        {offer.nft.name}
                      </h3>
                    </div>
                    <div className="flex flex-row items-center justify-between w-full">
                      <span className="text-gray-300 text-sm">Asking:</span>
                      <span className="text-green-400 font-semibold text-md">
                        {offer.requestedPayment.amount} {offer.requestedPayment.assetName}
                      </span>
                    </div>
                    <div className="flex flex-row items-center justify-between w-full">
                      <span className="text-gray-300 text-sm">Listed at:</span>
                      <span className="text-gray-400 text-md">
                        {formatTime(offer.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 border-t pt-3 mt-3" style={{ borderColor: '#272830' }}>
                    <button
                      className="px-3 py-1.5 rounded text-xs font-medium border transition-all hover:bg-red-900 hover:border-red-700 w-1/3 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'transparent', borderColor: '#EF4444', color: '#EF4444' }}
                      disabled={cancellingOfferIds.has(offer.id) || !isConnected}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#EF4444';
                          e.currentTarget.style.color = '#EEEEF0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#EF4444';
                        }
                      }}
                      onClick={() => cancelOfferOnBlockchain(offer)}
                    >
                      {cancellingOfferIds.has(offer.id) ? 'Cancelling...' : 'Cancel offer'}
                    </button>
                    <button
                      className="px-3 py-1.5 rounded text-xs font-medium border transition-all hover:bg-blue-600 w-2/3 whitespace-nowrap"
                      style={{ backgroundColor: 'white', borderColor: 'white', color: 'black' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#C9C9C9';
                        e.currentTarget.style.color = 'black';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = 'black';
                      }}
                      onClick={() => viewOfferDetails(offer)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ActiveOffersModal.displayName = 'ActiveOffersModal';