import React, { useState } from 'react'
import { 
  useChiaUtils,
  type BalanceBreakdown 
} from '../../../src'
import { useSharedClient } from '../components/SharedClientProvider'
import { 
  useOptimizedBalance, 
  useOptimizedXCHBalance, 
  useOptimizedCATBalance, 
  useOptimizedTotalBalance 
} from '../components/OptimizedBalanceHooks'

interface BalanceExampleProps {
  jwtToken: string
}

const BalanceExample: React.FC<BalanceExampleProps> = ({ jwtToken }) => {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(60000) // 1 minute
  
  // Use the shared client for optimized performance
  const sharedClient = useSharedClient()
  const { sharedData } = sharedClient

  // Optimized balance hooks using shared cached data (no redundant API calls!)
  const {
    balance,
    loading,
    error,
    lastUpdate,
    refresh,
    reset,
    formatBalance,
    isStale
  } = useOptimizedBalance()

  // Specialized optimized balance hooks (all using shared data)
  const xchBalance = useOptimizedXCHBalance()
  const catBalance = useOptimizedCATBalance()
  const totalBalance = useOptimizedTotalBalance()

  // Utility functions
  const { formatXCH } = useChiaUtils()

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusIcon = () => {
    if (loading) return '⏳'
    if (error) return '❌'
    if (isStale()) return '⚠️'
    return '✅'
  }

  return (
    <div className="example-container">
      <div className="example-header">
        <h2>💰 Balance Management Hooks</h2>
        <p>Comprehensive balance management with specialized hooks for different asset types</p>
      </div>

      {/* Shared Client Status */}
      <div className="example-section">
        <h3>🔗 Shared Client Optimization</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-icon">{sharedClient.isConnected ? '✅' : '❌'}</span>
            <span>Client Status: {sharedClient.isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">🔑</span>
            <span>Public Key Cached: {sharedClient.publicKey ? 'Yes ✅' : 'No ❌'}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">🔄</span>
            <span>Last Shared Refresh: {sharedClient.lastRefresh > 0 ? formatTimestamp(sharedClient.lastRefresh) : 'Never'}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">🎯</span>
            <span>API Calls Saved: {sharedData.hydratedCoins.length > 0 ? '3+ calls per refresh' : 'Ready to optimize'}</span>
          </div>
        </div>
        
        <div className="optimization-info">
          <p>🚀 <strong>Performance Optimization:</strong> This example uses cached data from the SharedClientProvider. All balance hooks share the same data without making redundant API calls!</p>
          <div className="optimization-details">
            <p>✅ <strong>Zero Redundant API Calls:</strong> All balance hooks use cached data</p>
            <p>⚡ <strong>Instant Updates:</strong> Data shared across all tabs</p>
            <p>🎯 <strong>Single Source of Truth:</strong> One API call serves all balance hooks</p>
          </div>
          <button onClick={sharedClient.refreshData} className="refresh-shared-btn">
            🔄 Trigger Shared Refresh
          </button>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="example-section">
        <h3>⚙️ Configuration</h3>
        <div className="config-controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh enabled
          </label>
          <label>
            Refresh interval (ms):
            <input
              type="number"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              min="10000"
              step="10000"
            />
          </label>
        </div>
      </div>

      {/* Status Section */}
      <div className="example-section">
        <h3>📊 Hook Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-icon">{getStatusIcon()}</span>
            <span>Status: {loading ? 'Loading' : error ? 'Error' : 'Ready'}</span>
          </div>
          <div className="status-item">
            <span>Last Update: {lastUpdate ? formatTimestamp(lastUpdate) : 'Never'}</span>
          </div>
          <div className="status-item">
            <span>Data Stale: {isStale() ? 'Yes ⚠️' : 'No ✅'}</span>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={() => refresh()} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh Now'}
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

      {/* Main Balance Breakdown */}
      <div className="example-section">
        <h3>💎 Complete Balance Breakdown</h3>
        {balance ? (
          <div className="balance-breakdown">
            <div className="balance-card main-balance">
              <h4>Total Balance</h4>
              <div className="balance-amount">{balance.formattedTotal} XCH</div>
              <div className="balance-details">
                {balance.coinCount} total coins
              </div>
            </div>

            <div className="balance-grid">
              <div className="balance-card">
                <h4>🪙 XCH Balance</h4>
                <div className="balance-amount">{balance.formattedXCH} XCH</div>
                <div className="balance-details">
                  {balance.xchCoinCount} coins
                </div>
              </div>

              <div className="balance-card">
                <h4>🎨 CAT Balance</h4>
                <div className="balance-amount">{balance.formattedCAT} XCH</div>
                <div className="balance-details">
                  {balance.catCoinCount} coins
                </div>
              </div>

              <div className="balance-card">
                <h4>🖼️ NFTs</h4>
                <div className="balance-amount">{balance.nftCoinCount}</div>
                <div className="balance-details">
                  NFT assets
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="placeholder">
            {loading ? 'Loading balance data...' : 'No balance data available'}
          </div>
        )}
      </div>

      {/* Specialized Hook Results */}
      <div className="example-section">
        <h3>🎯 Specialized Balance Hooks</h3>
        <div className="hooks-grid">
          <div className="hook-card">
            <h4>useXCHBalance</h4>
            <div className="hook-results">
              <p><strong>Balance:</strong> {formatXCH(xchBalance.balance)} XCH</p>
              <p><strong>Formatted:</strong> {xchBalance.formattedBalance} XCH</p>
              <p><strong>Coin Count:</strong> {xchBalance.coinCount}</p>
              <p><strong>Loading:</strong> {xchBalance.loading ? '⏳' : '✅'}</p>
              <p><strong>Stale:</strong> {xchBalance.isStale() ? '⚠️' : '✅'}</p>
            </div>
          </div>

          <div className="hook-card">
            <h4>useCATBalance</h4>
            <div className="hook-results">
              <p><strong>Balance:</strong> {formatXCH(catBalance.balance)} XCH</p>
              <p><strong>Formatted:</strong> {catBalance.formattedBalance} XCH</p>
              <p><strong>Coin Count:</strong> {catBalance.coinCount}</p>
              <p><strong>Loading:</strong> {catBalance.loading ? '⏳' : '✅'}</p>
              <p><strong>Stale:</strong> {catBalance.isStale() ? '⚠️' : '✅'}</p>
            </div>
          </div>

          <div className="hook-card">
            <h4>useTotalBalance</h4>
            <div className="hook-results">
              <p><strong>Balance:</strong> {formatXCH(totalBalance.balance)} XCH</p>
              <p><strong>Formatted:</strong> {totalBalance.formattedBalance} XCH</p>
              <p><strong>Coin Count:</strong> {totalBalance.coinCount}</p>
              <p><strong>Loading:</strong> {totalBalance.loading ? '⏳' : '✅'}</p>
              <p><strong>Stale:</strong> {totalBalance.isStale() ? '⚠️' : '✅'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Section */}
      <div className="example-section">
        <h3>🔍 Raw Balance Data</h3>
        <details>
          <summary>Click to view raw balance object</summary>
          <pre className="code-block">
            {JSON.stringify(balance, null, 2)}
          </pre>
        </details>
      </div>

      {/* Hook Usage Examples */}
      <div className="example-section">
        <h3>💻 Hook Usage Examples</h3>
        <div className="code-examples">
          <h4>Optimized Usage with Cached Data (ZERO API Calls):</h4>
          <pre className="code-block">{`// Import optimized hooks that use cached data
import { 
  useOptimizedBalance, 
  useOptimizedXCHBalance,
  useOptimizedCATBalance 
} from './OptimizedBalanceHooks'

// These hooks use cached data - no API calls!
const { balance, loading, refresh } = useOptimizedBalance()
const { balance: xchBalance } = useOptimizedXCHBalance() 
const { balance: catBalance } = useOptimizedCATBalance()

// All data comes from SharedClientProvider cache
// Only ONE API call is made, shared across ALL hooks!`}</pre>

          <h4>Traditional Usage (MULTIPLE API CALLS - Not Recommended):</h4>
          <pre className="code-block">{`// ❌ BAD: Each hook makes its own API calls
const balanceHook = useBalance({ jwtToken: token });
const xchHook = useXCHBalance({ jwtToken: token }); 
const catHook = useCATBalance({ jwtToken: token });

// This creates 3+ separate API calls to getUnspentHydratedCoins!
// Network tab will show redundant requests

// ✅ GOOD: Use optimized hooks instead
const balanceHook = useOptimizedBalance();
const xchHook = useOptimizedXCHBalance(); 
const catHook = useOptimizedCATBalance();

// This makes only 1 API call, shared across all hooks!`}</pre>
        </div>
      </div>
    </div>
  )
}

export default BalanceExample 