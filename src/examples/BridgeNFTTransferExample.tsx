import React, { useState } from 'react';
import { useNFTs, type NFTWithMetadata } from '../hooks/useNFTs';
import { useChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';

/**
 * Example component for testing NFT bridge transfers
 * Allows selecting an NFT and transferring it to a bridge wallet via a gift offer
 */
export const BridgeNFTTransferExample: React.FC = () => {
  const sdk = useChiaWalletSDK();
  
  const [selectedNFT, setSelectedNFT] = useState<NFTWithMetadata | null>(null);
  const [bridgeAddress, setBridgeAddress] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<{
    signedOffer: string;
    nftName: string;
  } | null>(null);
  
  const { nfts, loading: nftsLoading, error: nftsError, refresh } = useNFTs({
    autoLoadMetadata: true,
    enableLogging: true
  });

  // Handle case where SDK might not be available
  if (!sdk) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2>NFT Bridge Transfer Test</h2>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> Wallet SDK not available. Make sure the component is wrapped in ChiaWalletSDKProvider.
        </div>
      </div>
    );
  }

  // Handle NFT selection
  const handleSelectNFT = (nft: NFTWithMetadata) => {
    setSelectedNFT(nft);
    setTransferError(null);
    setTransferSuccess(null);
  };

  // Handle bridge transfer
  const handleBridgeTransfer = async () => {
    if (!selectedNFT) {
      setTransferError('Please select an NFT first');
      return;
    }

    if (!bridgeAddress || !bridgeAddress.trim()) {
      setTransferError('Please enter a bridge wallet address');
      return;
    }

    // Validate bridge wallet address format
    if (!bridgeAddress.match(/^xch1[a-z0-9]+$/)) {
      setTransferError(
        `Invalid bridge wallet address format. Expected Chia address (xch1...), got: ${bridgeAddress.substring(0, 20)}...`
      );
      return;
    }

    setIsTransferring(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      // Step 1: Get synthetic public key from wallet
      const publicKeyResult = await sdk.client.getPublicKey();
      if (!publicKeyResult.success) {
        throw new Error(publicKeyResult.error || 'Failed to get Chia wallet public key');
      }
      const syntheticPublicKey = publicKeyResult.data.synthetic_public_key;

      // Step 2: Create signed NFT offer to transfer to bridge wallet
      // For bridge transfer, we create a gift offer (empty requested_payments)
      // This means the NFT is transferred without requiring any payment
      const offerResult = await sdk.client.makeSignedNFTOfferSimple(syntheticPublicKey, {
        requested_payments: {}, // Empty means gift offer (no payment required)
        nft_json: selectedNFT as HydratedCoin,
      });

      if (!offerResult.success) {
        throw new Error(offerResult.error || 'Failed to create signed NFT offer');
      }

      // Success!
      setTransferSuccess({
        signedOffer: offerResult.data.signed_offer,
        nftName: selectedNFT.metadata?.name || 'Unknown NFT'
      });

      console.log('✅ Successfully created bridge transfer offer:', {
        nft: selectedNFT.metadata?.name,
        bridgeAddress,
        signedOffer: offerResult.data.signed_offer.substring(0, 50) + '...'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create bridge transfer';
      setTransferError(message);
      console.error('❌ Bridge transfer error:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  // Copy offer to clipboard
  const handleCopyOffer = async () => {
    if (transferSuccess?.signedOffer) {
      try {
        await navigator.clipboard.writeText(transferSuccess.signedOffer);
        alert('Signed offer copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  // Get image URL from NFT metadata
  const getImageUrl = (nft: NFTWithMetadata): string | undefined => {
    const imageUri = nft.metadata?.image;
    if (!imageUri) return undefined;
    
    // Convert IPFS URLs to gateway URLs
    return sdk.client.getIpfsGatewayUrl(imageUri);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>NFT Bridge Transfer Test</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Select an NFT and transfer it to a bridge wallet address
      </p>

      {/* Bridge Address Input */}
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Bridge Configuration</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Bridge Wallet Address:
          </label>
          <input
            type="text"
            value={bridgeAddress}
            onChange={(e) => setBridgeAddress(e.target.value)}
            placeholder="Enter bridge wallet address (xch1...)"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
            disabled={isTransferring}
          />
        </div>
      </div>

      {/* Selected NFT Display */}
      {selectedNFT && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          border: '2px solid #007bff',
          borderRadius: '5px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>Selected NFT</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {selectedNFT.metadata?.image && (
              <img
                src={getImageUrl(selectedNFT)}
                alt={selectedNFT.metadata?.name || 'NFT'}
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '5px',
                  border: '1px solid #ddd'
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <p><strong>Name:</strong> {selectedNFT.metadata?.name || 'Unknown'}</p>
              <p><strong>Collection:</strong> {selectedNFT.metadata?.collection?.name || 'N/A'}</p>
              <p style={{ fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                <strong>Coin ID:</strong> {selectedNFT.coinId || selectedNFT.coin.parentCoinInfo}
              </p>
            </div>
            <button
              onClick={() => setSelectedNFT(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Transfer Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={handleBridgeTransfer}
          disabled={!selectedNFT || !bridgeAddress.trim() || isTransferring}
          style={{
            padding: '12px 24px',
            backgroundColor: (!selectedNFT || !bridgeAddress.trim() || isTransferring) ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (!selectedNFT || !bridgeAddress.trim() || isTransferring) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isTransferring ? 'Creating Transfer Offer...' : 'Create Bridge Transfer Offer'}
        </button>
      </div>

      {/* Error Display */}
      {transferError && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {transferError}
        </div>
      )}

      {/* Success Display */}
      {transferSuccess && (
        <div style={{
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          color: '#155724'
        }}>
          <h4>✅ Bridge Transfer Offer Created Successfully!</h4>
          <p><strong>NFT:</strong> {transferSuccess.nftName}</p>
          <p><strong>Bridge Address:</strong> {bridgeAddress}</p>
          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Signed Offer:
            </label>
            <textarea
              value={transferSuccess.signedOffer}
              readOnly
              style={{
                width: '100%',
                height: '100px',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: '1px solid #c3e6cb',
                borderRadius: '3px',
                backgroundColor: '#fff',
                resize: 'vertical'
              }}
            />
            <button
              onClick={handleCopyOffer}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Copy Offer to Clipboard
            </button>
          </div>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Note: This is a gift offer. The bridge can accept it to receive the NFT without payment.
          </p>
        </div>
      )}

      {/* NFT Gallery */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Your NFTs ({nfts.length})</h3>
          <button
            onClick={refresh}
            disabled={nftsLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: nftsLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {nftsLoading ? 'Refreshing...' : 'Refresh NFTs'}
          </button>
        </div>

        {/* Loading State */}
        {nftsLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Loading NFTs...</p>
          </div>
        )}

        {/* Error State */}
        {nftsError && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '5px',
            color: '#721c24'
          }}>
            <strong>Error loading NFTs:</strong> {nftsError}
          </div>
        )}

        {/* Empty State */}
        {!nftsLoading && !nftsError && nfts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px',
            color: '#666'
          }}>
            <p>No NFTs found in your wallet</p>
          </div>
        )}

        {/* NFT Grid */}
        {!nftsLoading && nfts.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {nfts.map((nft, index) => {
              const isSelected = selectedNFT?.coinId === nft.coinId ||
                (selectedNFT?.coin.parentCoinInfo === nft.coin.parentCoinInfo &&
                 selectedNFT?.coin.puzzleHash === nft.coin.puzzleHash);
              
              return (
                <div
                  key={nft.coinId || `${nft.coin.parentCoinInfo}_${index}`}
                  onClick={() => handleSelectNFT(nft)}
                  style={{
                    border: isSelected ? '3px solid #007bff' : '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '10px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e7f3ff' : 'white',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 8px rgba(0,123,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  {/* NFT Image */}
                  <div style={{
                    width: '100%',
                    paddingTop: '100%',
                    position: 'relative',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    marginBottom: '10px'
                  }}>
                    {nft.metadataLoading ? (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999'
                      }}>
                        Loading...
                      </div>
                    ) : nft.metadata?.image ? (
                      <img
                        src={getImageUrl(nft)}
                        alt={nft.metadata?.name || 'NFT'}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: '12px'
                      }}>
                        No Image
                      </div>
                    )}
                  </div>

                  {/* NFT Info */}
                  <div>
                    <p style={{
                      fontWeight: 'bold',
                      marginBottom: '5px',
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {nft.metadata?.name || 'Unknown NFT'}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {nft.metadata?.collection?.name || 'No Collection'}
                    </p>
                  </div>

                  {isSelected && (
                    <div style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textAlign: 'center',
                      borderRadius: '3px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BridgeNFTTransferExample;

