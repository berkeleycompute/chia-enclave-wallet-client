import React, { useState } from 'react'
import { 
  useWalletInfo,
  useAddressValidation,
  useMnemonic,
  useChiaUtils,
  type WalletInfo,
  type AddressValidation
} from '../../../src'

interface WalletInfoExampleProps {
  jwtToken: string
}

const WalletInfoExample: React.FC<WalletInfoExampleProps> = ({ jwtToken }) => {
  const [testAddress, setTestAddress] = useState('')
  const [showMnemonic, setShowMnemonic] = useState(false)

  // Wallet info hook
  const {
    walletInfo,
    loading: walletLoading,
    error: walletError,
    fetchWalletInfo,
    reset: resetWalletInfo,
    formatAddress
  } = useWalletInfo({
    jwtToken,
    autoFetch: true
  })

  // Address validation hook
  const {
    validateAddress,
    addressToPuzzleHash,
    formatAddress: formatAddr
  } = useAddressValidation({
    enablePuzzleHashConversion: true,
    supportTestnet: true
  })

  // Mnemonic hook
  const {
    mnemonic,
    loading: mnemonicLoading,
    error: mnemonicError,
    exportMnemonic,
    clearMnemonic
  } = useMnemonic({ jwtToken })

  // Utility functions
  const { shortHash } = useChiaUtils()

  // Validate the test address
  const addressValidation = validateAddress(testAddress)

  const handleExportMnemonic = async () => {
    const result = await exportMnemonic()
    if (result) {
      setShowMnemonic(true)
    }
  }

  return (
    <div className="example-container">
      <div className="example-header">
        <h2>📋 Wallet Info & Address Management</h2>
        <p>Wallet information, address validation, and mnemonic management hooks</p>
      </div>

      {/* Wallet Information Section */}
      <div className="example-section">
        <h3>👛 Wallet Information</h3>
        
        <div className="action-buttons">
          <button onClick={() => fetchWalletInfo()} disabled={walletLoading}>
            {walletLoading ? 'Loading...' : '🔄 Refresh Wallet Info'}
          </button>
          <button onClick={() => resetWalletInfo()} disabled={walletLoading}>
            🗑️ Reset
          </button>
        </div>

        {walletError && (
          <div className="error-message">
            <strong>Error:</strong> {walletError}
          </div>
        )}

        {walletInfo ? (
          <div className="wallet-info-grid">
            <div className="info-card">
              <h4>📍 Address</h4>
              <div className="info-value">{formatAddress(walletInfo.address)}</div>
              <div className="info-details">
                Full: <code>{walletInfo.address}</code>
              </div>
            </div>

            <div className="info-card">
              <h4>🔑 Synthetic Public Key</h4>
              <div className="info-value">{formatAddress(walletInfo.syntheticPublicKey)}</div>
              <div className="info-details">
                Full: <code>{walletInfo.syntheticPublicKey}</code>
              </div>
            </div>

            <div className="info-card">
              <h4>🧩 Puzzle Hash</h4>
              <div className="info-value">{shortHash(walletInfo.puzzleHash)}</div>
              <div className="info-details">
                Full: <code>{walletInfo.puzzleHash}</code>
              </div>
            </div>

            <div className="info-card">
              <h4>🔐 Master Public Key</h4>
              <div className="info-value">{shortHash(walletInfo.masterPublicKey)}</div>
              <div className="info-details">
                Full: <code>{walletInfo.masterPublicKey}</code>
              </div>
            </div>

            {walletInfo.email && (
              <div className="info-card">
                <h4>📧 Email</h4>
                <div className="info-value">{walletInfo.email}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="placeholder">
            {walletLoading ? 'Loading wallet information...' : 'No wallet information available'}
          </div>
        )}
      </div>

      {/* Address Validation Section */}
      <div className="example-section">
        <h3>🔍 Address Validation</h3>
        
        <div className="input-group">
          <label htmlFor="test-address">Test Address:</label>
          <input
            id="test-address"
            type="text"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            placeholder="Enter Chia address to validate"
            className="address-input"
          />
        </div>

        <div className="action-buttons">
          <button onClick={() => setTestAddress(walletInfo?.address || '')}>
            📋 Use My Address
          </button>
          <button onClick={() => setTestAddress('')}>
            🗑️ Clear
          </button>
        </div>

        {testAddress && (
          <div className="validation-result">
            <h4>Validation Result:</h4>
            <div className="result-grid">
              <div className="result-item">
                <strong>Valid:</strong> {addressValidation.isValid ? '✅ Yes' : '❌ No'}
              </div>
              {addressValidation.error && (
                <div className="result-item error">
                  <strong>Error:</strong> {addressValidation.error}
                </div>
              )}
              {addressValidation.type && (
                <div className="result-item">
                  <strong>Type:</strong> {addressValidation.type}
                </div>
              )}
              {addressValidation.puzzleHash && (
                <div className="result-item">
                  <strong>Puzzle Hash:</strong> 
                  <code>{shortHash(addressValidation.puzzleHash)}</code>
                </div>
              )}
            </div>

            <div className="utility-functions">
              <h4>Utility Functions:</h4>
              <p><strong>Formatted:</strong> {formatAddr(testAddress)}</p>
              {addressValidation.isValid && (
                <p><strong>Puzzle Hash:</strong> {addressToPuzzleHash(testAddress) || 'N/A'}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mnemonic Management Section */}
      <div className="example-section">
        <h3>🔐 Mnemonic Management</h3>
        
        <div className="action-buttons">
          <button onClick={handleExportMnemonic} disabled={mnemonicLoading}>
            {mnemonicLoading ? 'Exporting...' : '📤 Export Mnemonic'}
          </button>
          <button onClick={() => clearMnemonic()} disabled={!mnemonic}>
            🧹 Clear from Memory
          </button>
        </div>

        {mnemonicError && (
          <div className="error-message">
            <strong>Error:</strong> {mnemonicError}
          </div>
        )}

        {mnemonic && showMnemonic && (
          <div className="mnemonic-display">
            <div className="warning-box">
              <strong>⚠️ SECURITY WARNING:</strong> Keep this mnemonic phrase safe and private!
            </div>
            <div className="mnemonic-phrase">
              <pre>{mnemonic}</pre>
            </div>
            <button onClick={() => setShowMnemonic(false)}>
              👁️ Hide Mnemonic
            </button>
          </div>
        )}
      </div>

      {/* Hook Usage Examples */}
      <div className="example-section">
        <h3>💻 Hook Usage Examples</h3>
        <div className="code-examples">
          <h4>Wallet Info Hook:</h4>
          <pre className="code-block">{`// Get wallet information
const {
  walletInfo,
  loading,
  error,
  fetchWalletInfo,
  formatAddress
} = useWalletInfo({
  jwtToken: 'your-jwt-token',
  autoFetch: true
});

// Use wallet info
console.log('Address:', walletInfo?.address);`}</pre>

          <h4>Address Validation Hook:</h4>
          <pre className="code-block">{`// Advanced address validation
const {
  validateAddress,
  addressToPuzzleHash
} = useAddressValidation({
  enablePuzzleHashConversion: true
});

// Validate address
const result = validateAddress('xch1abc...');
console.log('Valid:', result.isValid);`}</pre>
        </div>
      </div>
    </div>
  )
}

export default WalletInfoExample 