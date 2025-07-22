import React, { useState, useMemo } from 'react'
import { GlobalDialogProvider, useGlobalDialogs } from 'chia-enclave-wallet-client'
import JwtTokenInput from './components/JwtTokenInput'
import WalletExample from './examples/WalletExample' 
import './App.css'
import TransactionExample from './examples/TransactionExample'
import ClientExample from './examples/ClientExample'
import DialogExample from './examples/DialogExample'

type ExampleTab = 'wallet' | 'transactions' | 'client' | 'dialogs'

function AppContent() {
  const [jwtToken, setJwtToken] = useState<string>('')
  const [activeTab, setActiveTab] = useState<ExampleTab>('wallet')

  const isTokenValid = jwtToken.trim().length > 0

  return (
    <div className="app">
        <header className="app-header">
          <h1>🌾 Chia Wallet Client Examples</h1>
          <p>Test and explore all hooks and functionality</p>
        </header>

        <main className="app-main">
          <div className="token-section">
            <JwtTokenInput 
              token={jwtToken} 
              onTokenChange={setJwtToken}
            />
          </div>

          {isTokenValid && (
            <div className="examples-section">
              <nav className="examples-nav">
                <button 
                  className={`nav-button ${activeTab === 'wallet' ? 'active' : ''}`}
                  onClick={() => setActiveTab('wallet')}
                >
                  👛 Wallet Hook
                </button>
                <button 
                  className={`nav-button ${activeTab === 'transactions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transactions')}
                >
                  💸 Transactions
                </button>
                <button 
                  className={`nav-button ${activeTab === 'client' ? 'active' : ''}`}
                  onClick={() => setActiveTab('client')}
                >
                  🔧 Direct Client
                </button>
                <button 
                  className={`nav-button ${activeTab === 'dialogs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dialogs')}
                >
                  📋 Dialog System
                </button>
              </nav>

              <div className="examples-content">
                {activeTab === 'wallet' && <WalletExample jwtToken={jwtToken} />}
                {activeTab === 'transactions' && <TransactionExample jwtToken={jwtToken} />}
                {activeTab === 'client' && <ClientExample jwtToken={jwtToken} />}
                {activeTab === 'dialogs' && <DialogExample jwtToken={jwtToken} />}
              </div>
            </div>
          )}

          {!isTokenValid && (
            <div className="welcome-section">
              <div className="welcome-card">
                <h2>🚀 Get Started</h2>
                <p>Enter your JWT token above to start exploring the Chia Wallet Client examples.</p>
                <div className="features-grid">
                  <div className="feature-card">
                    <h3>👛 Wallet Hook</h3>
                    <p>Connect, view balance, and manage wallet state with useChiaWallet</p>
                  </div>
                  <div className="feature-card">
                    <h3>💸 Transactions</h3>
                    <p>Send XCH, view history, and manage transactions with useChiaTransactions</p>
                  </div>
                  <div className="feature-card">
                    <h3>🔧 Direct Client</h3>
                    <p>Use ChiaCloudWalletClient directly for advanced operations</p>
                  </div>
                  <div className="feature-card">
                    <h3>📋 Dialog System</h3>
                    <p>Test all modal dialogs and the global dialog system</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <p>Made with ❤️ for Chia Blockchain development</p>
        </footer>
      </div>
  )
}

function App() {
  // Use useMemo to prevent recreating initialConfig on every render
  const initialConfig = useMemo(() => ({
    jwtToken: undefined, 
    autoConnect: false 
  }), []);

  return (
    <GlobalDialogProvider initialConfig={initialConfig}>
      <AppContent />
    </GlobalDialogProvider>
  )
}

export default App 