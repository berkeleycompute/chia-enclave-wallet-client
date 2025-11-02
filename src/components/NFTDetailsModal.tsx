import React, { useState, useEffect, useCallback } from 'react';
import { injectModalStyles } from './modal-styles';
import { useNFTOffers, useWalletConnection } from '../hooks/useChiaWalletSDK';
import { useChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';
import { useTransferAssets } from '../hooks/useTransferAssets';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';
import { convertIpfsUrl } from '../utils/ipfs';

interface NFTDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // New: closes the entire wallet modal (parent)
  onCloseWallet?: () => void;
  nft: HydratedCoin | null;
}

export const NFTDetailsModal: React.FC<NFTDetailsModalProps> = ({
  isOpen,
  onClose,
  onCloseWallet,
  nft,
}) => {
  // Ensure shared modal styles are available
  useEffect(() => {
    injectModalStyles();
  }, []);
  const sdk = useChiaWalletSDK();
  const { isConnected } = useWalletConnection();
  const { createNFTOffer, isCreatingOffer: offerLoading } = useNFTOffers();
  const { transferNFT, isTransferring, transferError } = useTransferAssets({ 
    sdk,
    enableLogging: true 
  });
  const [activeTab, setActiveTab] = useState<'details' | 'offer' | 'transfer'>('details');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferFee, setTransferFee] = useState('0.0001'); // Store as XCH
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [nftMetadata, setNftMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  // Fetch NFT metadata from metadataUris
  const fetchNftMetadata = useCallback(async (metadataUri: string): Promise<any> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(metadataUri, {
        method: 'GET',
        redirect: 'follow',
        mode: 'cors',
        cache: 'default',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, */*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata (${response.status})`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          console.warn('Metadata response is not valid JSON');
          return null;
        }
      }
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      return null;
    }
  }, []);

  // Load NFT metadata when modal opens or NFT changes
  useEffect(() => {
    if (!isOpen || !nft) {
      setNftMetadata(null);
      return;
    }

    const driverInfo = nft.parentSpendInfo?.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    
    const loadMetadata = async () => {
      setMetadataLoading(true);
      const metadata = await fetchNftMetadata(metadataUri);
      setNftMetadata(metadata);
      setMetadataLoading(false);
    };

    loadMetadata();
  }, [isOpen, nft, fetchNftMetadata]);

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

  const handleTransferNFT = async () => {
    if (!nft || !recipientAddress.trim()) return;

    const nftInfo = nft.parentSpendInfo?.driverInfo?.info;
    const launcherId = nftInfo?.launcherId || nft.coinId;

    // Convert XCH to mojos (1 XCH = 1,000,000,000,000 mojos)
    const feeInMojos = Math.floor(parseFloat(transferFee || '0.0001') * 1000000000000);

    console.log('🔄 Transferring NFT:', {
      coinId: nft.coinId,
      launcherId,
      recipient: recipientAddress,
      feeXCH: transferFee,
      feeMojos: feeInMojos
    });

    const result = await transferNFT(
      nft.coinId,
      launcherId,
      recipientAddress,
      feeInMojos
    );

    if (result.success) {
      setTransferSuccess(true);
      setRecipientAddress('');
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
      setOfferPrice('');
      setOfferError(null);
      setOfferSuccess(false);
      setRecipientAddress('');
      setTransferFee('0.0001');
      setTransferSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !nft) return null;

  const driverInfo = nft.parentSpendInfo?.driverInfo;
  const nftInfo = driverInfo?.info;
  const onChainMetadata = nftInfo?.metadata as any; // Cast to any for flexible metadata access
  
  // Get image URL from downloaded metadata or fallback to on-chain data
  const getImageUrl = () => {
    // Try downloaded metadata first
    if (nftMetadata?.image) {
      return convertIpfsUrl(nftMetadata.image);
    }
    if (nftMetadata?.data_uris && nftMetadata.data_uris.length > 0) {
      return convertIpfsUrl(nftMetadata.data_uris[0]);
    }
    
    // Fallback to on-chain metadata
    if (onChainMetadata?.dataUris && onChainMetadata.dataUris.length > 0) {
      return convertIpfsUrl(onChainMetadata.dataUris[0]);
    }
    
    return undefined;
  };
  
  const imageUrl = getImageUrl();
  
  // Get NFT display name from metadata
  const getNftName = () => {
    if (nftMetadata?.name) {
      return nftMetadata.name;
    }
    if (onChainMetadata?.name) {
      return onChainMetadata.name;
    }
    if (onChainMetadata?.editionNumber && onChainMetadata?.editionTotal) {
      return `NFT Edition ${onChainMetadata.editionNumber}/${onChainMetadata.editionTotal}`;
    }
    return nftInfo?.launcherId?.substring(0, 16) + '...' || 'NFT';
  };
  
  // Get NFT description from metadata
  const getNftDescription = () => {
    return nftMetadata?.description || onChainMetadata?.description || null;
  };

  // Get collection name
  const getCollectionName = () => {
    return nftMetadata?.collection?.name || onChainMetadata?.collection?.name || null;
  };

  // Get collection family
  const getCollectionFamily = () => {
    return nftMetadata?.collection?.family || onChainMetadata?.collection?.family || null;
  };

  return (
    <>
      <div 
        className="nft-details-modal-overlay" 
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="nft-details-modal" onClick={(e) => e.stopPropagation()}>
          {/* Close button in top right */}
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            ✕
          </button>

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
            <button
              className={`tab-button ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
              disabled={!isConnected}
            >
              📤 Transfer
            </button>
          </div>

          <div className="modal-body">
            {activeTab === 'details' && (
              <div className="details-content">
                {metadataLoading && (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <p>Loading metadata...</p>
                  </div>
                )}
                
                {/* NFT Image - Larger and more prominent */}
                {imageUrl && (
                  <div className="nft-hero-image-section">
                    <img
                      src={imageUrl}
                      alt={getNftName()}
                      className="nft-hero-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* NFT Title Section - Name and Collection */}
                <div className="nft-title-section">
                  <h2 className="nft-name">{getNftName()}</h2>
                  {getCollectionName() && (
                    <div className="nft-collection">
                      <span className="collection-label">Collection:</span>
                      <span className="collection-name">{getCollectionName()}</span>
                    </div>
                  )}
                  {getCollectionFamily() && (
                    <div className="nft-collection-family">
                      <span className="collection-label">Family:</span>
                      <span className="collection-family">{getCollectionFamily()}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {getNftDescription() && (
                  <div className="nft-description-section">
                    <p className="nft-description">{getNftDescription()}</p>
                  </div>
                )}

                {/* Key Stats - Edition, Royalty, Owner */}
                <div className="nft-stats-section">
                  <div className="stat-card">
                    <label>Edition</label>
                    <span className="stat-value">
                      {onChainMetadata?.editionNumber && onChainMetadata?.editionTotal
                        ? `${onChainMetadata.editionNumber} / ${onChainMetadata.editionTotal}`
                        : (nftMetadata?.edition_number && nftMetadata?.edition_total)
                        ? `${nftMetadata.edition_number} / ${nftMetadata.edition_total}`
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="stat-card">
                    <label>Royalty</label>
                    <span className="stat-value">
                      {nftInfo?.royaltyTenThousandths
                        ? `${(nftInfo.royaltyTenThousandths / 100).toFixed(2)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>

                {/* Attributes - More prominent */}
                {nftMetadata?.attributes && nftMetadata.attributes.length > 0 && (
                  <div className="attributes-section">
                    <h3>Attributes</h3>
                    <div className="attributes-grid">
                      {nftMetadata.attributes.map((attr: any, index: number) => (
                        <div key={index} className="attribute-card">
                          <label className="attribute-type">{attr.trait_type || attr.type}</label>
                          <span className="attribute-value">{String(attr.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Details - Collapsible */}
                <details className="technical-details" open>
                  <summary>Technical Information</summary>
                  <div className="technical-content">
                    <div className="info-item">
                      <label>Launcher ID</label>
                      <code className="info-value">{nftInfo?.launcherId || 'N/A'}</code>
                    </div>
                    <div className="info-item">
                      <label>Current Owner</label>
                      <code className="info-value">{nftInfo?.currentOwner || 'N/A'}</code>
                    </div>
                    <div className="info-item">
                      <label>Coin ID</label>
                      <code className="info-value">{nft.coinId}</code>
                    </div>
                    <div className="info-item">
                      <label>Parent Coin Info</label>
                      <code className="info-value">{nft.coin.parentCoinInfo}</code>
                    </div>
                    <div className="info-item">
                      <label>Puzzle Hash</label>
                      <code className="info-value">{nft.coin.puzzleHash}</code>
                    </div>
                    <div className="info-item">
                      <label>Amount</label>
                      <span className="info-value">{nft.coin.amount} mojos</span>
                    </div>
                    {onChainMetadata?.dataHash && (
                      <div className="info-item">
                        <label>Data Hash</label>
                        <code className="info-value">{onChainMetadata.dataHash}</code>
                      </div>
                    )}
                    {onChainMetadata?.metadataHash && (
                      <div className="info-item">
                        <label>Metadata Hash</label>
                        <code className="info-value">{onChainMetadata.metadataHash}</code>
                      </div>
                    )}
                    {onChainMetadata?.licenseHash && (
                      <div className="info-item">
                        <label>License Hash</label>
                        <code className="info-value">{onChainMetadata.licenseHash}</code>
                      </div>
                    )}
                  </div>
                </details>

                {/* URIs Section - Collapsible */}
                {((onChainMetadata?.dataUris && onChainMetadata.dataUris.length > 0) || 
                  (onChainMetadata?.metadataUris && onChainMetadata.metadataUris.length > 0)) && (
                  <details className="uris-details">
                    <summary>Data URIs</summary>
                    <div className="uris-content">
                      {onChainMetadata.dataUris && onChainMetadata.dataUris.length > 0 && (
                        <div className="uri-group">
                          <label>Data URIs</label>
                          <div className="uris-list">
                            {onChainMetadata.dataUris.map((uri: string, index: number) => (
                              <a key={index} href={convertIpfsUrl(uri)} target="_blank" rel="noopener noreferrer" className="uri-link">
                                {uri}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {onChainMetadata.metadataUris && onChainMetadata.metadataUris.length > 0 && (
                        <div className="uri-group">
                          <label>Metadata URIs</label>
                          <div className="uris-list">
                            {onChainMetadata.metadataUris.map((uri: string, index: number) => (
                              <a key={index} href={convertIpfsUrl(uri)} target="_blank" rel="noopener noreferrer" className="uri-link">
                                {uri}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )}
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

            {activeTab === 'transfer' && (
              <div className="transfer-content">
                {!isConnected ? (
                  <div className="error-state">
                    <p>❌ Wallet not connected. Please connect your wallet to transfer NFTs.</p>
                  </div>
                ) : (
                  <>
                    <div className="transfer-info">
                      <h3>Transfer NFT</h3>
                      <p>Send this NFT to another Chia address.</p>
                    </div>

                    <div className="transfer-form">
                      <div className="form-group">
                        <label htmlFor="recipientAddress">Recipient Address</label>
                        <input
                          id="recipientAddress"
                          type="text"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                          placeholder="xch1..."
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="transferFee">Fee (XCH)</label>
                        <input
                          id="transferFee"
                          type="number"
                          step="0.00001"
                          min="0"
                          value={transferFee}
                          onChange={(e) => setTransferFee(e.target.value)}
                          placeholder="0.0001"
                          className="form-input"
                        />
                        <small className="form-hint">
                          Recommended: 0.0001 XCH ({Math.floor(parseFloat(transferFee || '0.0001') * 1000000000000).toLocaleString()} mojos)
                        </small>
                      </div>

                      {transferError && (
                        <div className="error-message">
                          ❌ {transferError}
                        </div>
                      )}

                      {transferSuccess && (
                        <div className="success-message">
                          ✅ NFT transferred successfully!
                        </div>
                      )}

                      <button
                        onClick={handleTransferNFT}
                        disabled={isTransferring || !recipientAddress.trim()}
                        className="transfer-button"
                      >
                        {isTransferring ? '⏳ Transferring...' : '📤 Transfer NFT'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
          .nft-details-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
            backdrop-filter: blur(4px);
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .nft-details-modal {
            position: relative;
            background: #1a1a1a;
            border-radius: 16px;
            width: 95%;
            max-width: 900px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: none;
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
            border-bottom: 1px solid #272830;
            background: #14151A;
            color: white;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
          }

          .close-button {
            background: rgba(255, 255, 255, 0.1);
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
            background: rgba(255, 255, 255, 0.2);
          }

          /* Modal Close Button - Top Right */
          .modal-close-btn {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #333;
            color: white;
            cursor: pointer;
            font-size: 1.75rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
            z-index: 100;
            line-height: 1;
            font-weight: 300;
          }

          .modal-close-btn:hover {
            background: #ef4444;
            border-color: #ef4444;
            color: white;
            transform: scale(1.05);
          }

          .modal-close-btn:active {
            transform: scale(0.95);
          }

          .modal-tabs {
            display: flex;
            background: #1a1a1a;
            border-bottom: 1px solid #333;
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
            color: #888;
          }

          .tab-button:hover:not(:disabled) {
            background: #262626;
            color: white;
          }

          .tab-button.active {
            background: #262626;
            border-bottom-color: #6bc36b;
            color: #6bc36b;
          }

          .tab-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-body {
            flex: 1;
            min-height: 0;
            padding: 2rem;
            overflow-y: auto;
            overflow-x: hidden;
            background: #1a1a1a;
            color: white;
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: #333 #1a1a1a;
          }

          /* Scrollbar styling for modal body */
          .modal-body::-webkit-scrollbar {
            width: 8px;
          }

          .modal-body::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 4px;
          }

          .modal-body::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
          }

          .modal-body::-webkit-scrollbar-thumb:hover {
            background: #6bc36b;
          }

          /* Loading Indicator */
          .loading-indicator {
            text-align: center;
            padding: 2rem;
            color: #888;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top-color: #6bc36b;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Hero Image */
          .nft-hero-image-section {
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .nft-hero-image {
            max-width: 100%;
            max-height: 500px;
            border-radius: 12px;
            border: 2px solid #333;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          }

          /* Title Section */
          .nft-title-section {
            margin-bottom: 1.5rem;
            text-align: center;
          }

          .nft-name {
            font-size: 2rem;
            font-weight: 700;
            color: white;
            margin: 0 0 0.75rem 0;
            line-height: 1.3;
          }

          .nft-collection,
          .nft-collection-family {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }

          .collection-label {
            color: #888;
            font-size: 0.875rem;
            font-weight: 500;
          }

          .collection-name,
          .collection-family {
            color: #6bc36b;
            font-size: 0.875rem;
            font-weight: 600;
          }

          /* Description */
          .nft-description-section {
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: #262626;
            border: 1px solid #333;
            border-radius: 8px;
          }

          .nft-description {
            color: white;
            font-size: 0.9375rem;
            line-height: 1.6;
            margin: 0;
          }

          /* Stats Section */
          .nft-stats-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .stat-card {
            background: #262626;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.2s;
          }

          .stat-card:hover {
            border-color: #6bc36b;
            transform: translateY(-2px);
          }

          .stat-card label {
            display: block;
            color: #888;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
          }

          .stat-value {
            display: block;
            color: white;
            font-size: 1.125rem;
            font-weight: 700;
          }

          /* Attributes Section */
          .attributes-section {
            margin-bottom: 1.5rem;
          }

          .attributes-section h3 {
            margin: 0 0 1rem 0;
            color: white;
            font-size: 1.125rem;
            font-weight: 600;
          }

          .attributes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 1rem;
          }

          .attribute-card {
            background: #262626;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 0.875rem;
            text-align: center;
            transition: all 0.2s;
          }

          .attribute-card:hover {
            border-color: #6bc36b;
            background: #333;
          }

          .attribute-type {
            display: block;
            color: #888;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
          }

          .attribute-value {
            display: block;
            color: white;
            font-size: 0.9375rem;
            font-weight: 600;
          }

          /* Collapsible Details Sections */
          .technical-details,
          .uris-details {
            background: #262626;
            border: 1px solid #333;
            border-radius: 8px;
            margin-bottom: 1rem;
            overflow: hidden;
          }

          .technical-details summary,
          .uris-details summary {
            padding: 1rem;
            cursor: pointer;
            font-weight: 600;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
            transition: background 0.2s;
          }

          .technical-details summary:hover,
          .uris-details summary:hover {
            background: #333;
          }

          .technical-details summary::after,
          .uris-details summary::after {
            content: '▼';
            font-size: 0.75rem;
            transition: transform 0.2s;
            color: #888;
          }

          .technical-details[open] summary::after,
          .uris-details[open] summary::after {
            transform: rotate(180deg);
          }

          .technical-content,
          .uris-content {
            padding: 1rem;
            border-top: 1px solid #333;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .info-item label {
            font-weight: 600;
            color: #888;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .info-value {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            font-size: 0.8125rem;
            background: #333;
            padding: 0.75rem;
            border-radius: 6px;
            word-break: break-all;
            color: #ccc;
            border: 1px solid #404040;
            line-height: 1.4;
          }

          .uri-group {
            margin-bottom: 1rem;
          }

          .uri-group:last-child {
            margin-bottom: 0;
          }

          .uri-group label {
            display: block;
            font-weight: 600;
            color: #888;
            margin-bottom: 0.75rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .uris-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .uri-link {
            color: #6bc36b;
            text-decoration: none;
            font-size: 0.8125rem;
            word-break: break-all;
            padding: 0.5rem 0.75rem;
            background: #333;
            border: 1px solid #404040;
            border-radius: 6px;
            transition: all 0.2s;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
          }

          .uri-link:hover {
            color: white;
            background: #404040;
            border-color: #6bc36b;
          }

          .info-section, .metadata-section, .coin-section, .offer-info, .transfer-info {
            margin-bottom: 2rem;
          }

          .offer-info h3, .transfer-info h3 {
            margin: 0 0 1rem 0;
            color: white;
            font-size: 1.125rem;
            font-weight: 600;
          }

          .transfer-info p,
          .offer-info p {
            color: #888;
            margin: 0.5rem 0 0 0;
            line-height: 1.6;
          }

          .error-state {
            text-align: center;
            padding: 2rem;
            color: #f87171;
          }

          .offer-form, .transfer-form {
            max-width: 400px;
          }

          .form-group {
            margin-bottom: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: white;
          }

          .form-hint {
            display: block;
            margin-top: 4px;
            font-size: 12px;
            color: #888;
          }

          .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #333;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
            box-sizing: border-box;
            background: #262626;
            color: white;
          }

          .form-input:focus {
            outline: none;
            border-color: #6bc36b;
          }

          .form-input::placeholder {
            color: #666;
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

          .create-offer-button, .transfer-button {
            width: 100%;
            padding: 12px 24px;
            background: #6bc36b;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 1rem;
          }

          .create-offer-button:hover:not(:disabled), .transfer-button:hover:not(:disabled) {
            background: #4a9f4a;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(107, 195, 107, 0.4);
          }

          .create-offer-button:disabled, .transfer-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          /* Responsive */
          @media (max-width: 640px) {
            .nft-details-modal {
              width: 98%;
              max-width: 100%;
              margin: 0.5rem;
            }

            .modal-body {
              padding: 1rem;
            }

            .nft-hero-image {
              max-height: 300px;
            }

            .nft-name {
              font-size: 1.5rem;
            }

            .nft-stats-section {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .attributes-grid {
              grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
              gap: 0.75rem;
            }

            .modal-close-btn {
              width: 36px;
              height: 36px;
              font-size: 1.5rem;
            }
          }

          @media (min-width: 641px) and (max-width: 1024px) {
            .nft-details-modal {
              max-width: 750px;
            }
          }
        `}</style>
    </>
  );
}; 