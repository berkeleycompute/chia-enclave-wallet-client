import React, { useState, useCallback } from 'react'
import { 
  useNFTs, 
  useNFTCollections, 
  useNFTMetadata,
  useChiaUtils,
  type NFTWithMetadata,
  type NFTMetadata
} from '../../../src'

interface NFTExampleProps {
  jwtToken: string
}

const NFTCard: React.FC<{ nft: NFTWithMetadata }> = ({ nft }) => {
  const { shortHash } = useChiaUtils()

  return (
    <div className="nft-card">
      {nft.metadata?.image && (
        <img 
          src={nft.metadata.image} 
          alt={nft.metadata.name || 'NFT'}
          className="nft-image"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )}
      <div className="nft-info">
        <h5>{nft.metadata?.name || 'Loading...'}</h5>
        <p className="nft-description">{nft.metadata?.description || 'No description'}</p>
        <div className="nft-details">
          <span>Coin ID: {shortHash(nft.coin.parentCoinInfo)}</span>
          <span>Amount: {nft.coin.amount}</span>
        </div>
        {nft.metadata?.collection && (
          <div className="nft-collection">
            Collection: {nft.metadata.collection.name}
          </div>
        )}
        {nft.metadataLoading && <div className="loading">Loading metadata...</div>}
        {nft.metadataError && <div className="error">Metadata error: {nft.metadataError}</div>}
      </div>
    </div>
  )
}

const NFTExample: React.FC<NFTExampleProps> = ({ jwtToken }) => {
  const [autoLoadMetadata, setAutoLoadMetadata] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string>('')

  // Main NFT hook
  const {
    nfts,
    nftCount,
    loading,
    metadataLoading,
    error,
    lastUpdate,
    refresh,
    loadAllMetadata,
    reset,
    searchNFTs,
    getNFTsByCollection
  } = useNFTs({
    jwtToken,
    autoLoadMetadata,
    autoRefresh,
    refreshInterval: autoRefresh ? 120000 : undefined // 2 minutes
  })

  // Collections hook
  const {
    collections,
    collectionsMap,
    totalCollections,
    loading: collectionsLoading
  } = useNFTCollections({ jwtToken })

  // Search and filter functions
  const filteredNFTs = useCallback(() => {
    let filtered = nfts

    if (searchQuery.trim()) {
      filtered = searchNFTs(searchQuery)
    }

    if (selectedCollection && selectedCollection !== 'all') {
      filtered = getNFTsByCollection(selectedCollection)
    }

    return filtered
  }, [nfts, searchQuery, selectedCollection, searchNFTs, getNFTsByCollection])

  const displayNFTs = filteredNFTs()

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="example-container">
      <div className="example-header">
        <h2>🖼️ NFT Management Hooks</h2>
        <p>Complete NFT management with automatic metadata loading and collection grouping</p>
      </div>

      {/* Configuration Section */}
      <div className="example-section">
        <h3>⚙️ Configuration</h3>
        <div className="config-controls">
          <label>
            <input
              type="checkbox"
              checked={autoLoadMetadata}
              onChange={(e) => setAutoLoadMetadata(e.target.checked)}
            />
            Auto-load metadata
          </label>
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh NFTs
          </label>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="example-section">
        <h3>📊 Status & Actions</h3>
        <div className="status-grid">
          <div className="status-item">
            <span>NFTs Found: {nftCount}</span>
          </div>
          <div className="status-item">
            <span>Collections: {totalCollections}</span>
          </div>
          <div className="status-item">
            <span>Status: {loading ? '⏳ Loading' : error ? '❌ Error' : '✅ Ready'}</span>
          </div>
          <div className="status-item">
            <span>Metadata: {metadataLoading ? '⏳ Loading' : '✅ Ready'}</span>
          </div>
          <div className="status-item">
            <span>Last Update: {lastUpdate ? formatTimestamp(lastUpdate) : 'Never'}</span>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => refresh()} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh NFTs'}
          </button>
          <button onClick={() => loadAllMetadata()} disabled={metadataLoading}>
            {metadataLoading ? 'Loading...' : '🖼️ Load All Metadata'}
          </button>
          <button onClick={() => reset()} disabled={loading}>
            🗑️ Reset
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="example-section">
        <h3>🔍 Search & Filter</h3>
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search NFTs by name, description, or attributes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          <select 
            value={selectedCollection} 
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="collection-select"
          >
            <option value="">All Collections</option>
            <option value="all">All Collections (filter)</option>
            {collections.map(collection => (
              <option key={collection.name} value={collection.name}>
                {collection.name} ({collection.count})
              </option>
            ))}
          </select>
        </div>
        <p>Showing {displayNFTs.length} of {nftCount} NFTs</p>
      </div>

      {/* Collections Overview */}
      <div className="example-section">
        <h3>📚 Collections Overview</h3>
        {collectionsLoading ? (
          <div>Loading collections...</div>
        ) : collections.length > 0 ? (
          <div className="collections-grid">
            {collections.map(collection => (
              <div key={collection.name} className="collection-card">
                <h4>{collection.name}</h4>
                <p>{collection.count} NFTs</p>
                {collection.family && <p>Family: {collection.family}</p>}
                <button onClick={() => setSelectedCollection(collection.name)}>
                  View Collection
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder">No collections found</div>
        )}
      </div>

      {/* NFT Gallery */}
      <div className="example-section">
        <h3>🎨 NFT Gallery</h3>
        {loading ? (
          <div className="loading">Loading NFTs...</div>
        ) : displayNFTs.length > 0 ? (
          <div className="nfts-grid">
            {displayNFTs.map(nft => (
              <NFTCard 
                key={`${nft.coin.parentCoinInfo}-${nft.coin.puzzleHash}`} 
                nft={nft} 
              />
            ))}
          </div>
        ) : (
          <div className="placeholder">
            {nftCount === 0 ? 'No NFTs found in wallet' : 'No NFTs match current filters'}
          </div>
        )}
      </div>

      {/* Hook Usage Examples */}
      <div className="example-section">
        <h3>💻 Hook Usage Examples</h3>
        <div className="code-examples">
          <h4>Basic NFT Hook:</h4>
          <pre className="code-block">{`// Get all NFTs with auto-metadata loading
const {
  nfts,
  nftCount,
  loading,
  loadAllMetadata,
  searchNFTs
} = useNFTs({
  jwtToken: 'your-jwt-token',
  autoLoadMetadata: true,
  autoRefresh: true,
  refreshInterval: 120000 // 2 minutes
});

// Search NFTs
const searchResults = searchNFTs('dragon');

// Get NFTs by collection
const collectionNFTs = getNFTsByCollection('Cool Dragons');`}</pre>

          <h4>Collections Hook:</h4>
          <pre className="code-block">{`// Get collections overview
const {
  collections,
  totalCollections,
  loading
} = useNFTCollections({
  jwtToken: 'your-jwt-token'
});

// Access collections data
collections.forEach(collection => {
  console.log(collection.name, collection.count);
});`}</pre>

          <h4>Individual Metadata Hook:</h4>
          <pre className="code-block">{`// Load specific NFT metadata
const {
  metadata,
  loading,
  error,
  loadMetadata
} = useNFTMetadata(nftUri);

// Manually load metadata
loadMetadata('https://metadata-uri.com/nft.json');`}</pre>
        </div>
      </div>

      {/* Raw Data */}
      <div className="example-section">
        <h3>🔍 Raw Data</h3>
        <details>
          <summary>Click to view raw NFTs data</summary>
          <pre className="code-block">
            {JSON.stringify(nfts.slice(0, 3), null, 2)} {/* Show first 3 NFTs */}
          </pre>
        </details>
      </div>
    </div>
  )
}

export default NFTExample 