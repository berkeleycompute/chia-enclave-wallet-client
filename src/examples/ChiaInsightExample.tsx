import React, { useState } from 'react';
import { useChiaInsight } from '../hooks/useChiaInsight';
import { ChiaCloudWalletClient } from '../client/ChiaCloudWalletClient';

interface ChiaInsightExampleProps {
  defaultPuzzleHash?: string;
  apiUrl?: string;
  apiToken?: string;
}

export const ChiaInsightExample: React.FC<ChiaInsightExampleProps> = ({
  defaultPuzzleHash = 'ef051040eae04691772fd7b320a1d25a1a83f3e09db91bd2aada7f9baaf5c08b',
  apiUrl,
  apiToken
}) => {
  const [puzzleHash, setPuzzleHash] = useState(defaultPuzzleHash);
  const [customApiUrl, setCustomApiUrl] = useState(apiUrl || '');
  const [customApiToken, setCustomApiToken] = useState(apiToken || '');
  const [viewMode, setViewMode] = useState<'paginated' | 'all' | 'categorized'>('paginated');

  // Initialize the insight hook with custom configuration
  const insight = useChiaInsight({
    apiUrl: customApiUrl || undefined,
    apiToken: customApiToken || undefined,
    enableLogging: true
  });

  // Update client configuration when inputs change
  const updateClientConfig = () => {
    if (customApiUrl) {
      insight.client.setApiUrl(customApiUrl);
    }
    if (customApiToken) {
      insight.client.setApiToken(customApiToken);
    }
  };

  const handleFetch = async () => {
    updateClientConfig();
    
    switch (viewMode) {
      case 'paginated':
        await insight.fetchCoins(puzzleHash);
        break;
      case 'all':
        await insight.fetchAllCoins(puzzleHash);
        break;
      case 'categorized':
        await insight.fetchCategorizedCoins(puzzleHash);
        break;
    }
  };

  const handleNextPage = async () => {
    await insight.fetchNextPage();
  };

  const handlePrevPage = async () => {
    if (insight.currentPage > 1) {
      await insight.fetchPage(insight.currentPage - 1);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    insight.setPageSize(newSize);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Chia Insight API Example</h1>
      
      {/* Configuration Section */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Configuration</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Puzzle Hash:
            <input
              type="text"
              value={puzzleHash}
              onChange={(e) => setPuzzleHash(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Enter puzzle hash"
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            API URL (optional):
            <input
              type="text"
              value={customApiUrl}
              onChange={(e) => setCustomApiUrl(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="https://your-api-url.com/functions/v1/api"
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            API Token (optional):
            <input
              type="text"
              value={customApiToken}
              onChange={(e) => setCustomApiToken(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Your JWT token"
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            View Mode:
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              style={{ width: '200px', padding: '8px', marginTop: '5px' }}
            >
              <option value="paginated">Paginated</option>
              <option value="all">All Coins</option>
              <option value="categorized">Categorized</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Page Size:
            <select
              value={insight.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              style={{ width: '100px', padding: '8px', marginTop: '5px' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        <button
          onClick={handleFetch}
          disabled={insight.isLoading || !puzzleHash}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: insight.isLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {insight.isLoading ? 'Loading...' : 'Fetch Coins'}
        </button>

        <button
          onClick={insight.reset}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Status Section */}
      <div style={{ marginBottom: '20px' }}>
        {insight.error && (
          <div style={{ color: 'red', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            Error: {insight.error}
          </div>
        )}

        {insight.isLoading && (
          <div style={{ color: '#007bff', backgroundColor: '#e7f3ff', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            Loading coins...
          </div>
        )}

        {!insight.isLoading && !insight.error && insight.coins.length > 0 && (
          <div style={{ backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            Found {insight.totalCoins} total coins ({insight.coins.length} displayed)
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {viewMode === 'paginated' && insight.totalPages > 1 && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrevPage}
            disabled={insight.currentPage <= 1 || insight.isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: insight.currentPage <= 1 ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: insight.currentPage <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>

          <span>
            Page {insight.currentPage} of {insight.totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={!insight.hasMore || insight.isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: !insight.hasMore ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !insight.hasMore ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Results Section */}
      {viewMode === 'categorized' && insight.categorizedCoins && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Categorized Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4>XCH Coins ({insight.categorizedCoins.xchCoins.length})</h4>
              <p>Total Balance: {insight.categorizedCoins.totalBalance / 1000000000000} XCH</p>
            </div>
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4>CAT Coins ({insight.categorizedCoins.catCoins.length})</h4>
            </div>
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4>NFT Coins ({insight.categorizedCoins.nftCoins.length})</h4>
            </div>
          </div>
        </div>
      )}

      {/* Coins List */}
      {insight.coins.length > 0 && (
        <div>
          <h3>Coins ({insight.coins.length})</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {insight.coins.map((coin, index) => {
              const coinType = ChiaCloudWalletClient.getHydratedCoinType(coin);
              const backgroundColor = coinType === 'CAT' ? '#fff5e6' : coinType === 'NFT' ? '#f0e6ff' : '#f8f9fa';
              
              return (
              <div
                key={`${coin.coin.parentCoinInfo}-${coin.coin.puzzleHash}-${index}`}
                style={{
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <strong>Type:</strong> {ChiaCloudWalletClient.getHydratedCoinType(coin)}
                  </div>
                  <div>
                    <strong>Amount:</strong> {parseInt(coin.coin.amount).toLocaleString()}
                  </div>
                  <div>
                    <strong>Created Height:</strong> {coin.createdHeight}
                  </div>
                  {(coin.catInfo || ChiaCloudWalletClient.getHydratedCoinType(coin) === 'CAT') && (
                    <div>
                      <strong>Asset ID:</strong> {(coin.catInfo?.assetId || coin.parentSpendInfo?.driverInfo?.assetId || 'N/A').substring(0, 16)}...
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                  <div><strong>Puzzle Hash:</strong> {coin.coin.puzzleHash}</div>
                  <div><strong>Parent Coin:</strong> {coin.coin.parentCoinInfo}</div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {!insight.isLoading && !insight.error && insight.coins.length === 0 && puzzleHash && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No coins found for this puzzle hash.
        </div>
      )}
    </div>
  );
};

export default ChiaInsightExample; 