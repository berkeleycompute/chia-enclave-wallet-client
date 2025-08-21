import React, { useState, useEffect, useCallback } from 'react';
import { SavedOffer } from './types';
import { bech32 } from 'bech32';
import { injectModalStyles } from './modal-styles';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';

interface ActiveOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferUpdate?: () => void;
}

export const ActiveOffersModal: React.FC<ActiveOffersModalProps> = ({ 
  isOpen, 
  onClose, 
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
  
  // Inject shared modal styles
  React.useEffect(() => {
    injectModalStyles();
  }, []);

  // Styles for address components and offers-specific styles
  const offersSpecificStyles = `
    /* Active Offers Modal Specific Styles */
    .modal-overlay.active-offers-overlay {
      z-index: 1100;
    }

    .modal-content.active-offers-modal,
    .modal-content.offer-details-modal {
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
    }

    .offers-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
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
      overflow: hidden;
      flex-shrink: 0;
      background: #333;
      display: flex;
      align-items: center;
      justify-content: center;
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
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .offer-nft-name {
      font-weight: 600;
      color: white;
      font-size: 16px;
      margin: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .offer-nft-collection {
      color: #888;
      font-size: 14px;
      margin: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .offer-payment {
      color: #6bc36b;
      font-weight: 600;
      font-size: 14px;
      margin: 0;
    }

    .offer-time {
      color: #666;
      font-size: 12px;
      margin: 0;
    }

    .offer-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }

    .offer-type {
      color: #888;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .dexie-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 4px;
      color: #3b82f6;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .dexie-badge svg {
      opacity: 0.8;
    }

    .offer-arrow {
      color: #666;
      margin-left: 8px;
      flex-shrink: 0;
    }

    /* Offer Details Styles */
    .offer-detail-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .offer-nft-section h4,
    .offer-payment-section h4,
    .offer-raw-section h4 {
      margin: 0 0 12px 0;
      color: white;
      font-size: 16px;
      font-weight: 600;
    }

    .offer-nft-card {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: #262626;
      border-radius: 12px;
      border: 1px solid #333;
    }

    .offer-nft-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      background: #333;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .offer-nft-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .offer-nft-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .offer-nft-info h5 {
      margin: 0;
      color: white;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.3;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .offer-nft-info p {
      margin: 0;
      color: #888;
      font-size: 14px;
      line-height: 1.3;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .nft-edition {
      color: #6bc36b !important;
      font-weight: 600 !important;
    }

    .payment-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .payment-info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: #262626;
      border-radius: 12px;
      border: 1px solid #333;
    }

    .payment-info-item label {
      font-weight: 500;
      color: #888;
      font-size: 14px;
    }

    .payment-info-item .value {
      color: white;
      font-weight: 600;
      font-size: 14px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .offer-raw-data {
      background: #262626;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 16px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      word-break: break-all;
      max-height: 200px;
      overflow-y: auto;
      color: #ccc;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .offer-raw-data::-webkit-scrollbar {
      display: none;
    }

    .offer-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #333;
    }

    .primary-actions {
      display: flex;
      gap: 12px;
    }

    .copy-offer-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: #6bc36b;
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }

    .copy-offer-btn:hover {
      background: #4a9f4a;
      transform: translateY(-1px);
    }

    .dexie-view-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 8px;
      color: #3b82f6;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }

    .dexie-view-btn:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.6);
      transform: translateY(-1px);
    }

    .offer-status-actions {
      display: flex;
      gap: 12px;
    }

    .status-btn {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }

    .complete-btn {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.4);
    }

    .complete-btn:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.6);
      transform: translateY(-1px);
    }

    .cancel-btn {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .cancel-btn:hover {
      background: rgba(239, 68, 68, 0.3);
      border-color: rgba(239, 68, 68, 0.6);
      transform: translateY(-1px);
    }

    /* Address components */
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
      border: 1px solid #333;
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
      background-color: #333;
      border-color: #404040;
    }
    
    .address-text {
      color: #ccc;
      font-size: 12px;
      font-family: monospace;
    }
    
    .address-copy-btn svg {
      opacity: 0.7;
      transition: opacity 0.2s;
      color: #888;
    }
    
    .address-copy-btn:hover svg {
      opacity: 1;
      color: #ccc;
    }
    
    .payment-address-btn {
      margin-left: auto;
    }

    /* Loading state styles */
    .loading-offers {
      text-align: center;
      padding: 60px 20px;
      color: #888;
    }

    .loading-spinner {
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

    .loading-offers p {
      margin: 0;
      color: #888;
      font-size: 14px;
    }

    /* No address state styles */
    .no-address {
      text-align: center;
      padding: 60px 20px;
      color: #888;
    }

    .no-address-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .no-address h4 {
      margin: 0 0 12px 0;
      color: #fb923c;
      font-size: 20px;
      font-weight: 600;
    }

    .no-address p {
      margin: 0;
      color: #888;
      font-size: 14px;
    }

    /* Responsive styles for offers modal */
    @media (max-width: 768px) {
      .modal-content.active-offers-modal,
      .modal-content.offer-details-modal {
        width: 95%;
        margin: 1rem;
        max-height: 95vh;
      }

      .offer-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .offer-nft-card {
        flex-direction: column;
      }

      .payment-info-grid {
        grid-template-columns: 1fr;
      }

      .offer-status-actions {
        flex-direction: column;
      }

      .primary-actions {
        flex-direction: column;
      }

      .dexie-badge {
        font-size: 8px;
        padding: 1px 4px;
      }
    }

    @media (max-width: 480px) {
      .offer-item {
        padding: 12px;
      }

      .offer-nft-preview {
        width: 48px;
        height: 48px;
      }

      .offer-nft-name {
        font-size: 14px;
      }

      .offer-nft-collection {
        font-size: 12px;
      }
    }

    .refresh-btn:hover {
      color: white;
      background: #333;
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .refresh-btn:disabled:hover {
      color: #888;
      background: none;
    }
  `;

  // Add offers-specific styles to document head
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = offersSpecificStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [offersSpecificStyles]);
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
                <div className="primary-actions">
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
                  
                  {(selectedOffer.dexieOfferId || selectedOffer.dexieOfferUrl) && (
                    <button 
                      className="dexie-view-btn" 
                      onClick={() => openOfferOnDexie(selectedOffer)}
                      title="View this offer on Dexie marketplace"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      View on Dexie
                    </button>
                  )}
                </div>
                
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
          <button 
            className="refresh-btn" 
            onClick={loadActiveOffers}
            disabled={!address || loading}
            title={!address ? 'Wallet not connected' : loading ? 'Loading...' : 'Refresh offers'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6"></path>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-offers">
              <div className="loading-spinner"></div>
              <p>Loading offers...</p>
            </div>
          ) : !address ? (
            <div className="no-address">
              <div className="no-address-icon">🔒</div>
              <h4>Wallet Not Connected</h4>
              <p>Please connect your wallet to view active offers.</p>
            </div>
          ) : activeOffers.length === 0 ? (
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
                    {(offer.dexieOfferId || offer.dexieOfferUrl) && (
                      <div className="dexie-badge" title="Available on Dexie marketplace">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15,3 21,3 21,9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Dexie
                      </div>
                    )}
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