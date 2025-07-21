import React from 'react';
import { HydratedCoin } from '../client/ChiaCloudWalletClient';

interface NFTDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNft: HydratedCoin | null;
  nftMetadata: Map<string, any>;
  loadingMetadata: Set<string>;
}

export const NFTDetailsModal: React.FC<NFTDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedNft, 
  nftMetadata, 
  loadingMetadata 
}) => {
  
  // Utility function to convert IPFS URLs to HTTP gateway URLs
  const convertIpfsUrl = (url: string): string => {
    if (!url) return url;
    
    // Convert IPFS URLs to HTTP gateway URLs
    if (url.startsWith('ipfs://')) {
      // Remove ipfs:// and use a public gateway
      const hash = url.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }
    
    // If it's just a hash without protocol
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

    const metadataUri = driverInfo.info.metadata.metadataUris[0]; // Use first URI
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return nftMetadata.get(cacheKey);
  };

  const isNftMetadataLoading = (nftCoin: HydratedCoin): boolean => {
    const driverInfo = nftCoin.parentSpendInfo.driverInfo;
    if (driverInfo?.type !== 'NFT' || !driverInfo.info?.metadata?.metadataUris || driverInfo.info.metadata.metadataUris.length === 0) {
      return false;
    }

    const metadataUri = driverInfo.info.metadata.metadataUris[0]; // Use first URI
    const cacheKey = `${nftCoin.coin.parentCoinInfo}_${nftCoin.coin.puzzleHash}_${metadataUri}`;
    return loadingMetadata.has(cacheKey);
  };

  if (!isOpen || !selectedNft) return null;

  const metadata = getNftMetadata(selectedNft);
  const isLoading = isNftMetadataLoading(selectedNft);

  return (
    <div className="modal-overlay nft-details-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content nft-details-modal">
        <div className="modal-header">
          <h3>NFT Details</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading NFT metadata...</p>
            </div>
          ) : metadata ? (
            <div className="nft-details">
              <div className="nft-image-large">
                {metadata.data_uris && metadata.data_uris.length > 0 ? (
                  <img src={convertIpfsUrl(metadata.data_uris[0])} alt={metadata.name || 'NFT'} />
                ) : metadata.collection?.attributes?.find((attr: any) => attr.type === 'icon')?.value ? (
                  <img src={convertIpfsUrl(metadata.collection.attributes.find((attr: any) => attr.type === 'icon').value)} alt={metadata.name || 'NFT'} />
                ) : (
                  <div className="nft-placeholder-large">
                    🖼️
                  </div>
                )}
              </div>
              
              <div className="nft-metadata">
                <div className="nft-basic-info">
                  <h4>{metadata.name || 'Unknown NFT'}</h4>
                  <p className="nft-description">{metadata.description || 'No description available'}</p>
                  
                  {metadata.collection && (
                    <div className="nft-collection">
                      <h5>Collection</h5>
                      <p>{metadata.collection.name}</p>
                      {metadata.collection.attributes?.find((attr: any) => attr.type === 'description')?.value && (
                        <p className="collection-description">
                          {metadata.collection.attributes.find((attr: any) => attr.type === 'description').value}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {metadata.series_number && metadata.series_total && (
                    <div className="nft-edition">
                      <h5>Edition</h5>
                      <p>#{metadata.series_number} of {metadata.series_total}</p>
                    </div>
                  )}
                </div>
                
                {metadata.attributes && metadata.attributes.length > 0 && (
                  <div className="nft-attributes">
                    <h5>Attributes</h5>
                    <div className="attributes-grid">
                      {metadata.attributes.map((attribute: any, index: number) => (
                        <div key={index} className="attribute-item">
                          <div className="attribute-name">{attribute.trait_type}</div>
                          <div className="attribute-value">{attribute.value || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {metadata.collection?.attributes && metadata.collection.attributes.length > 0 && (
                  <div className="nft-collection-links">
                    <h5>Collection Links</h5>
                    <div className="collection-links">
                      {metadata.collection.attributes.map((attribute: any, index: number) => {
                        if (attribute.type === 'website' && attribute.value) {
                          return (
                            <a 
                              key={index}
                              href={attribute.value.startsWith('http') ? attribute.value : `https://${attribute.value}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="collection-link"
                            >
                              🌐 Website
                            </a>
                          );
                        } else if (attribute.type === 'twitter' && attribute.value) {
                          return (
                            <a 
                              key={index}
                              href={attribute.value.startsWith('http') ? attribute.value : `https://${attribute.value}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="collection-link"
                            >
                              🐦 X
                            </a>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="error-state">
              <p>Failed to load NFT metadata</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 