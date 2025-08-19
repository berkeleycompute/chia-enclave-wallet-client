import React, { useState, useEffect } from 'react';
import { useNFTOffers, useWalletConnection } from '../hooks/useChiaWalletSDK';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';

interface NFTDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: HydratedCoin | null;
}

export const NFTDetailsModal: React.FC<NFTDetailsModalProps> = ({
  isOpen,
  onClose,
  nft,
}) => {
  const { isConnected } = useWalletConnection();
  const { createNFTOffer, isCreatingOffer: offerLoading } = useNFTOffers();
  const [activeTab, setActiveTab] = useState<'details' | 'offer'>('details');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState(false);

  const handleCreateOffer = async () => {
    if (!nft || !offerPrice.trim()) {
      setOfferError('Please enter an offer price');
      return;
    }

    try {
      const result = await createNFTOffer({
        requested_payments: {
          xch: [{
            deposit_address: 'xch1placeholder', // This would typically come from a buyer
            amount: Math.round(parseFloat(offerPrice) * 1000000000000) // Convert XCH to mojos
          }]
        },
        nft_json: nft
      });

      if (result.success) {
        setOfferSuccess(true);
        setOfferError(null);
        // Could store the offer or emit an event here
      } else {
        setOfferError(`Failed to create offer: ${(result as any).error}`);
      }
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
      setOfferPrice('');
      setOfferError(null);
      setOfferSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !nft) return null;

  const nftInfo = nft.parentSpendInfo.driverInfo?.info;
  const metadata = nftInfo?.metadata;

  return (
    <div className="nft-details-modal-overlay">
      <div className="nft-details-modal">
        <div className="modal-header">
          <h2>🖼️ NFT Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            📋 Details
          </button>
          <button
            className={`tab-button ${activeTab === 'offer' ? 'active' : ''}`}
            onClick={() => setActiveTab('offer')}
            disabled={!isConnected}
          >
            💰 Create Offer
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'details' && (
            <div className="details-content">
              {/* NFT Image */}
              {metadata?.dataUris?.[0] && (
                <div className="nft-image-section">
                  <img
                    src={metadata.dataUris[0]}
                    alt="NFT"
                    className="nft-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Basic Info */}
              <div className="info-section">
                <h3>Basic Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Launcher ID</label>
                    <code className="info-value">{nftInfo?.launcherId || 'N/A'}</code>
                  </div>
                  <div className="info-item">
                    <label>Current Owner</label>
                    <code className="info-value">{nftInfo?.currentOwner || 'N/A'}</code>
                  </div>
                  <div className="info-item">
                    <label>Edition</label>
                    <span className="info-value">
                      {metadata?.editionNumber && metadata?.editionTotal
                        ? `${metadata.editionNumber} of ${metadata.editionTotal}`
                        : 'N/A'
                      }
                    </span>
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

              {/* Metadata */}
              {metadata && (
                <div className="metadata-section">
                  <h3>Metadata</h3>
                  <div className="metadata-grid">
                    {metadata.dataHash && (
                      <div className="metadata-item">
                        <label>Data Hash</label>
                        <code className="metadata-value">{metadata.dataHash}</code>
                      </div>
                    )}
                    {metadata.metadataHash && (
                      <div className="metadata-item">
                        <label>Metadata Hash</label>
                        <code className="metadata-value">{metadata.metadataHash}</code>
                      </div>
                    )}
                    {metadata.licenseHash && (
                      <div className="metadata-item">
                        <label>License Hash</label>
                        <code className="metadata-value">{metadata.licenseHash}</code>
                      </div>
                    )}
                  </div>

                  {metadata.dataUris && metadata.dataUris.length > 0 && (
                    <div className="uris-section">
                      <label>Data URIs</label>
                      <div className="uris-list">
                        {metadata.dataUris.map((uri, index) => (
                          <a key={index} href={uri} target="_blank" rel="noopener noreferrer" className="uri-link">
                            {uri}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Coin Details */}
              <div className="coin-section">
                <h3>Coin Information</h3>
                <div className="coin-details">
                  <div className="coin-item">
                    <label>Parent Coin Info</label>
                    <code className="coin-value">{nft.coin.parentCoinInfo}</code>
                  </div>
                  <div className="coin-item">
                    <label>Puzzle Hash</label>
                    <code className="coin-value">{nft.coin.puzzleHash}</code>
                  </div>
                  <div className="coin-item">
                    <label>Amount</label>
                    <span className="coin-value">{nft.coin.amount} mojos</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offer' && (
            <div className="offer-content">
              {!isConnected ? (
                <div className="error-state">
                  <p>❌ Wallet not connected. Please connect your wallet to create offers.</p>
                </div>
              ) : (
                <>
                  <div className="offer-info">
                    <h3>Create NFT Offer</h3>
                    <p>Set a price for your NFT. This will create an offer that buyers can accept.</p>
                  </div>

                  <div className="offer-form">
                    <div className="form-group">
                      <label htmlFor="offerPrice">Price (XCH)</label>
                      <input
                        id="offerPrice"
                        type="number"
                        step="0.001"
                        min="0"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder="1.5"
                        className="form-input"
                      />
                    </div>

                    {offerError && (
                      <div className="error-message">
                        ❌ {offerError}
                      </div>
                    )}

                    {offerSuccess && (
                      <div className="success-message">
                        ✅ Offer created successfully! You can now share it with potential buyers.
                      </div>
                    )}

                    <button
                      onClick={handleCreateOffer}
                      disabled={offerLoading || !offerPrice.trim()}
                      className="create-offer-button"
                    >
                      {offerLoading ? '⏳ Creating Offer...' : '💰 Create Offer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <style>{`
          .nft-details-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .nft-details-modal {
            background: #1f2937;
            border-radius: 16px;
            width: 90%;
            max-width: 700px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid #374151;
          }

          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #374151;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
          }

          .close-button {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 1.5rem;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
          }

          .close-button:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .modal-tabs {
            display: flex;
            background: #111827;
            border-bottom: 1px solid #374151;
          }

          .tab-button {
            flex: 1;
            padding: 12px 16px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            border-bottom: 3px solid transparent;
            color: #9ca3af;
          }

          .tab-button:hover:not(:disabled) {
            background: #1f2937;
            color: #d1d5db;
          }

          .tab-button.active {
            background: #1f2937;
            border-bottom-color: #6366f1;
            color: #6366f1;
          }

          .tab-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-body {
            flex: 1;
            padding: 1.5rem;
            overflow-y: auto;
            background: #1f2937;
            color: #f3f4f6;
          }

          .nft-image-section {
            text-align: center;
            margin-bottom: 2rem;
          }

          .nft-image {
            max-width: 200px;
            max-height: 200px;
            border-radius: 12px;
            border: 2px solid #374151;
          }

          .info-section, .metadata-section, .coin-section, .offer-info {
            margin-bottom: 2rem;
          }

          .info-section h3, .metadata-section h3, .coin-section h3, .offer-info h3 {
            margin: 0 0 1rem 0;
            color: #f9fafb;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .info-grid, .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
          }

          .info-item, .metadata-item, .coin-item {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .info-item label, .metadata-item label, .coin-item label {
            font-weight: 500;
            color: #9ca3af;
            font-size: 14px;
          }

          .info-value, .metadata-value, .coin-value {
            font-family: monospace;
            font-size: 12px;
            background: #111827;
            padding: 8px;
            border-radius: 6px;
            word-break: break-all;
            color: #e5e7eb;
            border: 1px solid #374151;
          }

          .coin-details {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .uris-section {
            margin-top: 1rem;
          }

          .uris-section label {
            display: block;
            font-weight: 500;
            color: #9ca3af;
            margin-bottom: 0.5rem;
          }

          .uris-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .uri-link {
            color: #60a5fa;
            text-decoration: underline;
            font-size: 14px;
            word-break: break-all;
          }

          .uri-link:hover {
            color: #93c5fd;
          }

          .error-state {
            text-align: center;
            padding: 2rem;
            color: #f87171;
          }

          .offer-form {
            max-width: 400px;
          }

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #f3f4f6;
          }

          .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #374151;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
            box-sizing: border-box;
            background: #111827;
            color: #f3f4f6;
          }

          .form-input:focus {
            outline: none;
            border-color: #6366f1;
          }

          .form-input::placeholder {
            color: #6b7280;
          }

          .error-message {
            padding: 12px 16px;
            background: #431d1d;
            border: 1px solid #7f1d1d;
            border-radius: 8px;
            color: #f87171;
            font-size: 14px;
            margin: 1rem 0;
          }

          .success-message {
            padding: 12px 16px;
            background: #14532d;
            border: 1px solid #166534;
            border-radius: 8px;
            color: #4ade80;
            font-size: 14px;
            margin: 1rem 0;
          }

          .create-offer-button {
            width: 100%;
            padding: 12px 24px;
            background: linear-gradient(45deg, #6366f1, #4f46e5);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 1rem;
          }

          .create-offer-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          }

          .create-offer-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          /* Responsive */
          @media (max-width: 640px) {
            .nft-details-modal {
              width: 95%;
              margin: 1rem;
            }

            .info-grid, .metadata-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}; 