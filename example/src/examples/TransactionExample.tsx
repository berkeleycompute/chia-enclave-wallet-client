import React, { useState } from 'react'
import { useChiaWallet, useChiaTransactions } from 'chia-enclave-wallet-client'
import '../components/styles.css'

interface TransactionExampleProps {
  jwtToken: string
}

function TransactionExample({ jwtToken }: TransactionExampleProps) {
  const wallet = useChiaWallet({ autoConnect: true })
  const transactions = useChiaTransactions(wallet.client, wallet.unspentCoins)
  
  const [sendAddress, setSendAddress] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendFee, setSendFee] = useState('0.00001')
  const [addressValidation, setAddressValidation] = useState<{ isValid: boolean; error?: string } | null>(null)

  // Set JWT token when it changes
  React.useEffect(() => {
    if (jwtToken && jwtToken !== wallet.jwtToken) {
      wallet.setJwtToken(jwtToken)
    }
  }, [jwtToken, wallet])

  // Validate address when it changes
  React.useEffect(() => {
    if (sendAddress.trim()) {
      const validation = transactions.validateChiaAddress(sendAddress.trim())
      setAddressValidation(validation)
    } else {
      setAddressValidation(null)
    }
  }, [sendAddress, transactions])

  const handleSendTransaction = async () => {
    const amountFloat = parseFloat(sendAmount)
    const feeFloat = parseFloat(sendFee)
    
    if (!sendAddress.trim() || !amountFloat || amountFloat <= 0) {
      return
    }

    const success = await transactions.sendXCH(sendAddress.trim(), amountFloat, feeFloat)
    if (success) {
      setSendAddress('')
      setSendAmount('')
      // Refresh wallet balance after successful transaction
      wallet.refreshWallet()
    }
  }

  const formatTransactionStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-indicator loading">⏳ Pending</span>
      case 'confirmed':
        return <span className="status-indicator connected">✅ Confirmed</span>
      case 'failed':
        return <span className="status-indicator disconnected">❌ Failed</span>
      default:
        return <span className="status-indicator loading">❓ Unknown</span>
    }
  }

  return (
    <div className="example-container">
      <h2 className="example-title">💸 useChiaTransactions Hook Example</h2>
      
      {!wallet.isConnected ? (
        <div className="card">
          <h3>Connect Wallet First</h3>
          <p>Please connect your wallet in the Wallet tab to use transaction features.</p>
          <button 
            className="btn btn-primary"
            onClick={() => wallet.connectWallet()}
            disabled={wallet.isConnecting}
          >
            {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="example-grid">
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>💸 Send XCH Transaction</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="recipient-address">
                  Recipient Address
                  {addressValidation?.isValid === true && (
                    <span className="validation-indicator valid">✓ Valid</span>
                  )}
                  {addressValidation?.isValid === false && (
                    <span className="validation-indicator invalid">✗ Invalid</span>
                  )}
                </label>
                <input
                  id="recipient-address"
                  type="text"
                  className={`form-control ${addressValidation?.isValid === false ? 'error' : ''}`}
                  placeholder="xch1..."
                  value={sendAddress}
                  onChange={(e) => setSendAddress(e.target.value)}
                />
                {addressValidation?.error && (
                  <div className="error-message">{addressValidation.error}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="send-amount">Amount (XCH)</label>
                <input
                  id="send-amount"
                  type="number"
                  step="0.000000000001"
                  min="0"
                  className="form-control"
                  placeholder="0.001"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="send-fee">Transaction Fee (XCH)</label>
                <input
                  id="send-fee"
                  type="number"
                  step="0.000000000001"
                  min="0"
                  className="form-control"
                  value={sendFee}
                  onChange={(e) => setSendFee(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleSendTransaction}
                disabled={
                  transactions.isSending ||
                  !sendAddress.trim() ||
                  !sendAmount ||
                  parseFloat(sendAmount) <= 0 ||
                  addressValidation?.isValid !== true ||
                  wallet.balance <= 0
                }
              >
                {transactions.isSending ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending...
                  </>
                ) : (
                  'Send XCH'
                )}
              </button>

              <div className="balance-display" style={{ fontSize: '1rem', margin: 0 }}>
                Available: {wallet.formatBalance(wallet.balance)}
                <span className="currency">XCH</span>
              </div>
            </div>

            {transactions.sendError && (
              <div className="error-message" style={{ marginTop: '1rem' }}>
                <strong>Send Error:</strong> {transactions.sendError}
              </div>
            )}
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>📋 Transaction History ({transactions.transactions.length})</h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={transactions.clearTransactions}
                disabled={transactions.transactions.length === 0}
              >
                🗑️ Clear History
              </button>
              
              <div style={{ color: '#666', fontSize: '0.9rem', alignSelf: 'center' }}>
                Transactions are stored locally and automatically cleared after 30 days
              </div>
            </div>

            {transactions.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>No transactions yet. Send your first XCH transaction above!</p>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.transactions
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((tx) => (
                  <div key={tx.id} className="transaction-item">
                    <div className="transaction-header">
                      <div className="transaction-type">
                        <span className={`transaction-direction ${tx.type}`}>
                          {tx.type === 'outgoing' ? '📤' : '📥'} {tx.type.toUpperCase()}
                        </span>
                        {formatTransactionStatus(tx.status)}
                      </div>
                      <div className="transaction-amount">
                        <span className={`amount ${tx.type}`}>
                          {tx.type === 'outgoing' ? '-' : '+'}{wallet.formatBalance(tx.amount)} XCH
                        </span>
                        {tx.fee > 0 && (
                          <span className="fee">
                            Fee: {wallet.formatBalance(tx.fee)} XCH
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="transaction-details">
                      <div className="detail-row">
                        <span>Time:</span>
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                      
                      {tx.recipient && (
                        <div className="detail-row">
                          <span>Recipient:</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {tx.recipient}
                          </span>
                        </div>
                      )}
                      
                      {tx.sender && (
                        <div className="detail-row">
                          <span>Sender:</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {tx.sender}
                          </span>
                        </div>
                      )}
                      
                      {tx.transactionId && (
                        <div className="detail-row">
                          <span>Transaction ID:</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            {tx.transactionId}
                          </span>
                        </div>
                      )}
                      
                      {tx.blockchainStatus && (
                        <div className="detail-row">
                          <span>Blockchain Status:</span>
                          <span>{tx.blockchainStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  )
}

export default TransactionExample 