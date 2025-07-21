import React, { useState, useEffect } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin, type SimpleMakeUnsignedNFTOfferRequest } from '../client/ChiaCloudWalletClient.ts';
import { bech32m } from 'bech32';

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ChiaCloudWalletClient | null;
  publicKey: string | null;
  syntheticPublicKey: string | null;
  hydratedCoins: HydratedCoin[];
  nftMetadata: Map<string, any>;
  loadingMetadata: Set<string>;
  selectedNft?: HydratedCoin | null;
  onOfferCreated?: (offerData: any) => void;
  onRefreshWallet?: () => void;
  // New props for initial values from global dialog system
  initialOfferAmount?: string;
  initialDepositAddress?: string;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({ 
  isOpen, 
  onClose, 
  client, 
  publicKey, 
  syntheticPublicKey, 
  hydratedCoins, 
  nftMetadata, 
  loadingMetadata, 
  selectedNft: initialSelectedNft,
  onOfferCreated,
  onRefreshWallet,
  initialOfferAmount,
  initialDepositAddress
}) => {
  // wUSDC.b asset ID
  const WUSDC_ASSET_ID = 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d';

  const [selectedNft, setSelectedNft] = useState<HydratedCoin | null>(null);
  const [offerAmount, setOfferAmount] = useState(initialOfferAmount || '');
  const [depositAddress, setDepositAddress] = useState(initialDepositAddress || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select-nft' | 'confirm'>('select-nft');
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);

  // Initialize selectedNft when modal opens with a pre-selected NFT and handle initial values
  useEffect(() => {
    if (isOpen && initialSelectedNft) {
      setSelectedNft(initialSelectedNft);
      setStep('confirm'); // Skip NFT selection step if NFT is pre-selected
    } else if (isOpen && !initialSelectedNft) {
      // Reset to selection step when opening without pre-selected NFT
      setStep('select-nft');
      setSelectedNft(null);
    }
    
    // Update initial values when modal opens
    if (isOpen) {
      setOfferAmount(initialOfferAmount || '');
      setDepositAddress(initialDepositAddress || (publicKey || ''));
      setError(null);
    }
  }, [isOpen, initialSelectedNft, initialOfferAmount, initialDepositAddress, publicKey]);

  // Filter NFTs only
  const nftCoins = hydratedCoins.filter(coin => {
    const driverInfo = coin.parentSpendInfo.driverInfo;
    return driverInfo?.type === 'NFT';
  });

  // Auto-populate deposit address with main wallet address
  useEffect(() => {
    if (publicKey && !depositAddress) {
      setDepositAddress(publicKey);
    }
  }, [publicKey, depositAddress]);

  // Utility functions
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };

  const convertIpfsUrl = (url: string): string => {
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

  const getNftMetadata = (nftCoin: HydratedCoin): any => {
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return null;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return nftMetadata.get(cacheKey);
  };

  const isNftMetadataLoading = (nftCoin: HydratedCoin): boolean => {
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return false;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0];
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return loadingMetadata.has(cacheKey);
  };

  const getNftDisplayName = (nftCoin: HydratedCoin): string => {
    const metadata = getNftMetadata(nftCoin);
    if (metadata?.name) {
      return metadata.name;
    }
    
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT') {
      const onChainMetadata = driverInfo.info?.metadata;
      if (onChainMetadata?.editionNumber && onChainMetadata?.editionTotal) {
        return `NFT Edition ${onChainMetadata.editionNumber}/${onChainMetadata.editionTotal}`;
      }
      const launcherId = driverInfo.info?.launcherId || 'Unknown';
      return `NFT ${launcherId.substring(0, 8)}...${launcherId.substring(launcherId.length - 8)}`;
    }
    return 'Unknown NFT';
  };

  const getNftCollectionName = (nftCoin: HydratedCoin): string => {
    const metadata = getNftMetadata(nftCoin);
    if (metadata?.collection?.name) {
      return metadata.collection.name;
    }
    
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type === 'NFT') {
      const launcherId = driverInfo.info?.launcherId || 'Unknown';
      return `Collection ${launcherId.substring(0, 8)}...${launcherId.substring(launcherId.length - 8)}`;
    }
    return 'Unknown Collection';
  };

  const getNftEditionInfo = (nftCoin: HydratedCoin): string | null => {
    const metadata = getNftMetadata(nftCoin);
    if (metadata?.series_number && metadata?.series_total) {
      return `#${metadata.series_number} of ${metadata.series_total}`;
    }
    return null;
  };

  // Event handlers
  const selectNft = (nft: HydratedCoin) => {
    setSelectedNft(nft);
    setStep('confirm');
  };

  const goBack = () => {
    if (step === 'confirm') {
      setStep('select-nft');
      setSelectedNft(null);
      setOfferAmount('');
      setDepositAddress(publicKey || '');
    }
  };

  // Validation function for Chia addresses
  const validateChiaAddress = (address: string): { isValid: boolean; error?: string } => {
    try {
      if (!address || typeof address !== 'string') {
        return { isValid: false, error: 'Address must be a non-empty string' };
      }
      
      const decoded = bech32m.decode(address);
      
      if (decoded.prefix !== 'xch') {
        return { isValid: false, error: 'Invalid address prefix: must be "xch"' };
      }
      
      if (decoded.words.length !== 52) {
        return { isValid: false, error: 'Invalid address data length' };
      }
      
      return { isValid: true };
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? `Invalid address encoding: ${err.message}` : 'Invalid address encoding',
      };
    }
  };

  const validateOfferAmount = (): boolean => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      setError('Please enter a valid offer amount');
      return false;
    }

    if (!depositAddress || depositAddress.trim() === '') {
      setError('Please enter a deposit address');
      return false;
    }

    // Validate Chia address format
    const addressValidation = validateChiaAddress(depositAddress);
    if (!addressValidation.isValid) {
      setError(`Invalid deposit address: ${addressValidation.error}`);
      return false;
    }

    if (!syntheticPublicKey) {
      setError('Synthetic public key not available. Please reconnect your wallet.');
      return false;
    }

    return true;
  };

  const submitOffer = async () => {
    if (!validateOfferAmount() || !selectedNft || !client || !syntheticPublicKey) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Use the new simplified signed offer method
      const simpleOfferRequest: SimpleMakeUnsignedNFTOfferRequest = {
        requested_payments: {
          cats: [{
            asset_id: WUSDC_ASSET_ID,
            deposit_address: depositAddress,  // The client will handle address conversion
            amount: parseFloat(offerAmount)
          }]
        },
        nft_data: selectedNft
      };

      // Create and sign the offer directly
      const result = await client.makeSignedNFTOfferSimple(syntheticPublicKey, simpleOfferRequest);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Emit success event with the signed offer
      const offerData = {
        nft: selectedNft,
        amount: parseFloat(offerAmount),
        depositAddress: depositAddress,
        wusdcAssetId: WUSDC_ASSET_ID,
        offerString: result.data.signed_offer,  // Use signed offer instead of unsigned
        timestamp: Date.now(),
        isSigned: true,  // Add flag to indicate this is a signed offer
        originalRequest: simpleOfferRequest
      };
      
      onOfferCreated?.(offerData);

      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
      console.error('Error creating offer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedNft(null);
    setOfferAmount('');
    setDepositAddress(publicKey || '');
    setStep('select-nft');
    setError(null);
    onClose();
  };

  const refreshWalletData = () => {
    setIsRefreshingWallet(true);
    onRefreshWallet?.();
    
    setTimeout(() => {
      setIsRefreshingWallet(false);
    }, 3000);
  };

  if (!isOpen) {
    console.log('MakeOfferModal not rendering - isOpen is false', { isOpen, syntheticPublicKey, nftCount: nftCoins.length });
    return null;
  }

  console.log('MakeOfferModal rendering!', { 
    isOpen, 
    hasClient: !!client, 
    syntheticPublicKey: syntheticPublicKey?.substring(0, 10) + '...', 
    nftCount: nftCoins.length, 
    step 
  });

  return (
    <div className="modal-overlay make-offer-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal-content make-offer-content">
        <div className="modal-header">
          <div className="header-content">
            {step !== 'select-nft' && (
              <button className="back-btn" onClick={goBack}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5"></path>
                  <path d="M12 19l-7-7 7-7"></path>
                </svg>
              </button>
            )}
            <h3>
              {step === 'select-nft' ? 'Make Offer - Select NFT' : 'Make Offer - Confirm'}
            </h3>
          </div>
          <button className="close-btn" onClick={closeModal}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!syntheticPublicKey && (
            <div className="info-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>
                {isRefreshingWallet ? 'Refreshing wallet connection...' : 'Wallet is still connecting... Please wait for the connection to complete.'}
              </span>
              <button 
                className="refresh-wallet-btn" 
                onClick={refreshWalletData} 
                disabled={isRefreshingWallet}
              >
                {isRefreshingWallet ? (
                  <>
                    <div className="refresh-spinner"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 4v6h6"></path>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'select-nft' ? (
            <div className="step-content">
              <p className="step-description">Select the NFT you want to make an offer for:</p>
              
              {nftCoins.length === 0 ? (
                <div className="no-items">
                  <p>No NFTs found in your wallet</p>
                </div>
              ) : (
                <div className="nft-grid">
                  {nftCoins.map((nft, index) => {
                    const metadata = getNftMetadata(nft);
                    const isLoading = isNftMetadataLoading(nft);
                    const editionInfo = getNftEditionInfo(nft);
                    
                    return (
                      <div key={index} className="nft-card" onClick={() => selectNft(nft)}>
                        <div className="nft-image">
                          {isLoading ? (
                            <div className="nft-loading">
                              <div className="nft-spinner"></div>
                            </div>
                          ) : metadata?.data_uris && metadata.data_uris.length > 0 ? (
                            <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                          ) : metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                            <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                          ) : (
                            <div className="nft-placeholder">🖼️</div>
                          )}
                        </div>
                        <div className="nft-info">
                          <h4>{getNftDisplayName(nft)}</h4>
                          <p className="nft-collection">{getNftCollectionName(nft)}</p>
                          {editionInfo && <p className="nft-edition">{editionInfo}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="step-content">
              <div className="offer-summary">
                <h4>Offer Summary</h4>
                
                <div className="summary-section">
                  <h5>NFT to Offer:</h5>
                  <div className="nft-summary-card">
                    <div className="nft-summary-image">
                      {selectedNft && isNftMetadataLoading(selectedNft) ? (
                        <div className="nft-loading">
                          <div className="nft-spinner"></div>
                        </div>
                      ) : selectedNft ? (
                        (() => {
                          const metadata = getNftMetadata(selectedNft);
                          return metadata?.data_uris && metadata.data_uris.length > 0 ? (
                            <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                          ) : metadata?.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                            <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                          ) : (
                            '🖼️'
                          );
                        })()
                      ) : null}
                    </div>
                    <div className="nft-summary-info">
                      <h6>{selectedNft ? getNftDisplayName(selectedNft) : ''}</h6>
                      <p>{selectedNft ? getNftCollectionName(selectedNft) : ''}</p>
                      {selectedNft && getNftEditionInfo(selectedNft) && (
                        <p className="nft-edition">{getNftEditionInfo(selectedNft)}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h5>Payment Token:</h5>
                  <div className="cat-summary-card">
                    <div className="cat-summary-icon">💰</div>
                    <div className="cat-summary-info">
                      <h6>wUSDC.b</h6>
                      <p>Asset ID: {formatAddress(WUSDC_ASSET_ID)}</p>
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h5>Offer Amount:</h5>
                  <div className="amount-input-group">
                    <input 
                      type="number" 
                      step="0.000001" 
                      min="0" 
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="Enter amount..."
                      className="amount-input"
                      disabled={isSubmitting}
                    />
                    <span className="amount-unit">wUSDC.b</span>
                  </div>
                </div>

                <div className="summary-section">
                  <h5>Deposit Address:</h5>
                  <input 
                    type="text" 
                    value={depositAddress}
                    onChange={(e) => setDepositAddress(e.target.value)}
                    placeholder="Enter Chia address (xch...) or puzzle hash..."
                    className="deposit-address-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="action-buttons">
                <button className="cancel-btn" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button 
                  className="submit-btn" 
                  onClick={submitOffer} 
                  disabled={isSubmitting || !offerAmount || !depositAddress || !syntheticPublicKey}
                >
                  {isSubmitting ? (
                    <>
                      <div className="button-spinner"></div>
                      Creating Offer...
                    </>
                  ) : !syntheticPublicKey ? (
                    'Wallet Not Ready'
                  ) : (
                    'Create Offer'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 