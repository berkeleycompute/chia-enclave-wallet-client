import React from 'react'
import { useChiaWallet, type Coin } from 'chia-enclave-wallet-client'
import '../components/styles.css'

interface WalletExampleProps {
  jwtToken: string
}

function WalletExample({ jwtToken }: WalletExampleProps) {
  const wallet = useChiaWallet({
    autoConnect: true,
    enableLogging: true
  })

  // Set the JWT token when it changes
  React.useEffect(() => {
    if (jwtToken && jwtToken !== wallet.jwtToken) {
      wallet.setJwtToken(jwtToken)
    }
  }, [jwtToken, wallet])

  const getStatusIndicator = () => {
    if (wallet.isConnecting) {
      return <span className="status-indicator loading">⏳ Connecting...</span>
    }
    if (wallet.isConnected) {
      return <span className="status-indicator connected">✅ Connected</span>
    }
    return <span className="status-indicator disconnected">❌ Disconnected</span>
  }

  return (
    <div className="example-container">
      <h2 className="example-title">👛 useChiaWallet Hook Example</h2>
      
      <div className="example-grid">
        <div className="card">
          <h3>Connection Status</h3>
          <div style={{ marginBottom: '1rem' }}>
            {getStatusIndicator()}
          </div>
          
          <div className="connection-actions">
            <button 
              className="btn btn-primary"
              onClick={() => wallet.connectWallet()}
              disabled={wallet.isConnecting || wallet.isConnected}
            >
              {wallet.isConnecting ? (
                <>
                  <span className="loading-spinner"></span>
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => wallet.disconnectWallet()}
              disabled={!wallet.isConnected}
              style={{ marginLeft: '0.5rem' }}
            >
              Disconnect
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => wallet.refreshWallet()}
              disabled={!wallet.isConnected || wallet.balanceLoading}
              style={{ marginLeft: '0.5rem' }}
            >
              {wallet.balanceLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Refreshing...
                </>
              ) : (
                '🔄 Refresh'
              )}
            </button>
          </div>
          
          {wallet.error && (
            <div className="error-message" style={{ marginTop: '1rem' }}>
              <strong>Connection Error:</strong> {wallet.error}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Wallet Information</h3>
          {wallet.isConnected ? (
            <div className="wallet-info">
              <div className="info-row">
                <strong>Address:</strong>
                <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {wallet.publicKey || 'Loading...'}
                </div>
              </div>
              
              <div className="info-row">
                <strong>Short Address:</strong>
                <span style={{ fontFamily: 'monospace' }}>
                  {wallet.publicKey ? wallet.formatAddress(wallet.publicKey) : 'Loading...'}
                </span>
              </div>
              
              {wallet.syntheticPublicKey && (
                <div className="info-row">
                  <strong>Synthetic Key:</strong>
                  <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {wallet.syntheticPublicKey}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Connect your wallet to view information</p>
          )}
        </div>

        <div className="card">
          <h3>Balance & Coins</h3>
          {wallet.isConnected ? (
            <div className="balance-info">
              <div className="balance-display">
                {wallet.formatBalance(wallet.balance)}
                <span className="currency">XCH</span>
              </div>
              
              <div className="balance-details">
                <div className="detail-item">
                  <span>Total Coins:</span>
                  <strong>{wallet.coinCount}</strong>
                </div>
                
                <div className="detail-item">
                  <span>Raw Balance:</span>
                  <strong>{wallet.balance.toLocaleString()} mojos</strong>
                </div>
                
                {wallet.lastSuccessfulRefresh > 0 && (
                  <div className="detail-item">
                    <span>Last Updated:</span>
                    <strong>
                      {new Date(wallet.lastSuccessfulRefresh).toLocaleTimeString()}
                    </strong>
                  </div>
                )}
              </div>
              
              {wallet.balanceError && (
                <div className="error-message">
                  <strong>Balance Error:</strong> {wallet.balanceError}
                </div>
              )}
            </div>
          ) : (
            <p>Connect your wallet to view balance</p>
          )}
        </div>

        {wallet.unspentCoins.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Unspent Coins ({wallet.unspentCoins.length})</h3>
            <div className="coins-list">
              {wallet.unspentCoins.slice(0, 10).map((coin: Coin, index: number) => (
                <div key={`${coin.parentCoinInfo}-${index}`} className="coin-item">
                  <div className="coin-header">
                    <strong>Coin #{index + 1}</strong>
                    <span className="coin-amount">
                      {wallet.formatBalance(parseInt(coin.amount))} XCH
                    </span>
                  </div>
                  <div className="coin-details">
                    <div className="coin-detail">
                      <span>Parent:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {coin.parentCoinInfo}
                      </span>
                    </div>
                    <div className="coin-detail">
                      <span>Puzzle Hash:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {coin.puzzleHash}
                      </span>
                    </div>
                    <div className="coin-detail">
                      <span>Amount (mojos):</span>
                      <span>{parseInt(coin.amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {wallet.unspentCoins.length > 10 && (
                <div className="coins-truncated">
                  <p>Showing first 10 coins of {wallet.unspentCoins.length} total.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WalletExample 