import React, { useState, useEffect, useCallback } from 'react';
import { SavedOffer } from './types.ts';
import { bech32 } from 'bech32';

interface ActiveOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string | null;
  nftMetadata: Map<string, any>;
  loadingMetadata: Set<string>;
  onOfferUpdate?: () => void;
}

export const ActiveOffersModal: React.FC<ActiveOffersModalProps> = ({ 
  isOpen, 
  onClose, 
  publicKey, 
  nftMetadata, 
  loadingMetadata, 
  onOfferUpdate 
}) => {
  
  // Styles for address components
  const addressStyles = `
    .nft-address-container {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .address-label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    
    .address-copy-btn {
      background: none;
      border: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: monospace;
    }
    
    .address-copy-btn:hover {
      background-color: #f8f9fa;
      border-color: #c0c0c0;
    }
    
    .address-text {
      color: #333;
      font-size: 12px;
      font-family: monospace;
    }
    
    .address-copy-btn svg {
      opacity: 0.7;
      transition: opacity 0.2s;
      color: #666;
    }
    
    .address-copy-btn:hover svg {
      opacity: 1;
      color: #333;
    }
    
    .payment-address-btn {
      margin-left: auto;
    }
  `;

  // Add styles to document head
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = addressStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [addressStyles]);
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
    if (!publicKey) return;
    
    try {
      const stored = localStorage.getItem(getOffersStorageKey(publicKey));
      if (stored) {
        const offers = JSON.parse(stored);
        setActiveOffers(offers.filter((offer: SavedOffer) => offer.status === 'active'));
      }
    } catch (error) {
      console.error('Error loading active offers:', error);
    }
  }, [publicKey, getOffersStorageKey]);

  // Update offer status
  const updateOfferStatus = useCallback((offerId: string, newStatus: SavedOffer['status']) => {
    if (!publicKey) return;

    try {
      const stored = localStorage.getItem(getOffersStorageKey(publicKey));
      if (stored) {
        const allOffers = JSON.parse(stored);
        const updatedOffers = allOffers.map((offer: SavedOffer) => 
          offer.id === offerId ? { ...offer, status: newStatus } : offer
        );
        localStorage.setItem(getOffersStorageKey(publicKey), JSON.stringify(updatedOffers));
        setActiveOffers(updatedOffers.filter((offer: SavedOffer) => offer.status === 'active'));
        onOfferUpdate?.();
      }
    } catch (error) {
      console.error('Error updating offer status:', error);
    }
  }, [publicKey, getOffersStorageKey, onOfferUpdate]);

  // Copy offer to clipboard
  const copyOfferToClipboard = useCallback(async (offerString: string) => {
    try {
      await navigator.clipboard.writeText(offerString);
      console.log('Offer copied to clipboard');
    } catch (err) {
      console.error('Failed to copy offer:', err);
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

  // Load offers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadActiveOffers();
    }
  }, [isOpen, loadActiveOffers]);

  const closeModal = () => {
    onClose();
    setSelectedOffer(null);
    setShowOfferDetails(false);
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
      <div className="modal-overlay active-offers-overlay" onClick={(e) => e.target === e.currentTarget && closeOfferDetails()}>
        <div className="modal-content offer-details-modal">
          <div className="modal-header">
            <button className="back-btn" onClick={closeOfferDetails}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
            </button>
            <h3>Offer Details</h3>
            <button className="close-btn" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="modal-body">
            <div className="offer-detail-content">
              <div className="offer-nft-section">
                <h4>NFT Being Offered</h4>
                <div className="offer-nft-card">
                  <div className="offer-nft-image">
                    {selectedOffer.nft.imageUrl ? (
                      <img src={convertIpfsUrl(selectedOffer.nft.imageUrl)} alt={selectedOffer.nft.name} />
                    ) : (
                      <div className="offer-nft-placeholder">🖼️</div>
                    )}
                  </div>
                  <div className="offer-nft-info">
                    <h5>{selectedOffer.nft.name}</h5>
                    <p>{selectedOffer.nft.collection}</p>
                    {selectedOffer.nft.edition && <p className="nft-edition">{selectedOffer.nft.edition}</p>}
                    {selectedOffer.nft.coin?.coin?.puzzleHash && (
                      <div className="nft-address-container">
                        <span className="address-label">NFT Address:</span>
                        <button 
                          className="address-copy-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddressToClipboard(selectedOffer.nft.coin.coin.puzzleHash);
                          }}
                          title="Click to copy full address"
                        >
                          <span className="address-text">{compactAddress(selectedOffer.nft.coin.parentSpendInfo.driverInfo?.info?.launcherId ? encodeNftAddress(selectedOffer.nft.coin.parentSpendInfo.driverInfo?.info?.launcherId) : '')}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="offer-payment-section">
                <h4>Requested Payment</h4>
                <div className="payment-details">
                  <div className="payment-item">
                    <span className="payment-label">Amount:</span>
                    <span className="payment-value">{selectedOffer.requestedPayment.amount} {selectedOffer.requestedPayment.assetName}</span>
                  </div>
                  <div className="payment-item">
                    <span className="payment-label">Asset:</span>
                    <span className="payment-value">{selectedOffer.requestedPayment.assetName}</span>
                  </div>
                  <div className="payment-item">
                    <span className="payment-label">Deposit Address:</span>
                    <button 
                      className="address-copy-btn payment-address-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAddressToClipboard(selectedOffer.requestedPayment.depositAddress);
                      }}
                      title="Click to copy full address"
                    >
                      <span className="address-text">{compactAddress(selectedOffer.requestedPayment.depositAddress)}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="offer-metadata-section">
                <h4>Offer Information</h4>
                <div className="offer-metadata">
                  <div className="metadata-item">
                    <span className="metadata-label">Created:</span>
                    <span className="metadata-value">{formatTime(selectedOffer.timestamp)}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Status:</span>
                    <span className={`metadata-value status-${selectedOffer.status}`}>{selectedOffer.status}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Type:</span>
                    <span className="metadata-value">{selectedOffer.offerData.isSigned ? 'Signed' : 'Unsigned'}</span>
                  </div>
                </div>
              </div>

              <div className="offer-actions">
                <button 
                  className="copy-offer-btn" 
                  onClick={() => copyOfferToClipboard(selectedOffer.offerData.offerString)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy Offer String
                </button>
                
                <div className="offer-status-actions">
                  <button 
                    className="status-btn complete-btn" 
                    onClick={() => updateOfferStatus(selectedOffer.id, 'completed')}
                  >
                    Mark as Completed
                  </button>
                  <button 
                    className="status-btn cancel-btn" 
                    onClick={() => updateOfferStatus(selectedOffer.id, 'cancelled')}
                  >
                    Cancel Offer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay active-offers-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal-content active-offers-modal">
        <div className="modal-header">
          <button className="back-btn" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h3>Active Offers ({activeOffers.length})</h3>
          <button className="refresh-btn" onClick={loadActiveOffers}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6"></path>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {activeOffers.length === 0 ? (
            <div className="no-offers">
              <div className="no-offers-icon">📝</div>
              <h4>No Active Offers</h4>
              <p>You haven't created any offers yet. Create an offer to see it here.</p>
            </div>
          ) : (
            <div className="offers-list">
              {activeOffers.map((offer) => (
                <div key={offer.id} className="offer-item" onClick={() => viewOfferDetails(offer)}>
                  <div className="offer-nft-preview">
                    {offer.nft.imageUrl ? (
                      <img src={convertIpfsUrl(offer.nft.imageUrl)} alt={offer.nft.name} />
                    ) : (
                      <div className="offer-nft-placeholder">🖼️</div>
                    )}
                  </div>
                  
                  <div className="offer-info">
                    <div className="offer-nft-name">{offer.nft.name}</div>
                    <div className="offer-nft-collection">{offer.nft.collection}</div>
                    <div className="offer-payment">
                      Requesting: {offer.requestedPayment.amount} {offer.requestedPayment.assetName} 
                    </div>
                    <div className="offer-time">{formatTime(offer.timestamp)}</div>
                  </div>
                  
                  <div className="offer-status">
                    <div className={`status-badge status-${offer.status}`}>
                      {offer.status}
                    </div>
                    <div className="offer-type">
                      {offer.offerData.isSigned ? 'Signed' : 'Unsigned'}
                    </div>
                  </div>
                  
                  <div className="offer-actions-preview">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"></path>
                    </svg>
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