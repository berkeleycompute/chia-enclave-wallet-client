import React, { useState, useMemo } from 'react'
import { GlobalDialogProvider, useGlobalDialogs } from 'chia-enclave-wallet-client'
import { SharedClientProvider, useSharedClient } from './components/SharedClientProvider'
import JwtTokenInput from './components/JwtTokenInput'
import WalletExample from './examples/WalletExample' 
import TransactionExample from './examples/TransactionExample'
import ClientExample from './examples/ClientExample'
import DialogExample from './examples/DialogExample' 
import NFTExample from './examples/NFTExample'
import WalletInfoExample from './examples/WalletInfoExample' 
import './App.css'
import BalanceExample from './examples/BalanceExample'
import UtilsExample from './examples/UtilsExample'

type ExampleTab = 'wallet' | 'dialogs' | 'balance' | 'nfts' | 'transactions' | 'walletInfo' | 'utils' | 'client'

const tabConfig = [
  {
    id: 'wallet' as const,
    icon: '👛',
    title: 'Wallet Hook',
    description: 'Connect, view balance, and manage wallet state',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'dialogs' as const,
    icon: '📱',
    title: 'Dialog System',
    description: 'Test all modal dialogs and the global dialog system',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'balance' as const,
    icon: '💰',
    title: 'Balance Hooks',
    description: 'Detailed balance management with specialized hooks',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    id: 'nfts' as const,
    icon: '🖼️',
    title: 'NFT Hooks',
    description: 'Complete NFT management with metadata and collections',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    id: 'transactions' as const,
    icon: '💸',
    title: 'Transactions',
    description: 'Enhanced transaction management and history',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'walletInfo' as const,
    icon: '📋',
    title: 'Wallet Info',
    description: 'Wallet information and address management',
    gradient: 'from-teal-500 to-blue-500'
  },
  {
    id: 'utils' as const,
    icon: '🔧',
    title: 'Utils & Formatting',
    description: 'Utility functions for formatting and calculations',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'client' as const,
    icon: '🏭',
    title: 'Direct Client',
    description: 'Use ChiaCloudWalletClient directly for advanced operations',
    gradient: 'from-slate-500 to-gray-600'
  }
]

function AppContent() {
  const [activeTab, setActiveTab] = useState<ExampleTab>('wallet')
  const sharedClient = useSharedClient()

  const isTokenValid = sharedClient.jwtToken.trim().length > 0
  const activeTabConfig = tabConfig.find(tab => tab.id === activeTab)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'wallet': return <WalletExample jwtToken={sharedClient.jwtToken} />
      case 'dialogs': return <DialogExample jwtToken={sharedClient.jwtToken} />
      case 'balance': return <BalanceExample jwtToken={sharedClient.jwtToken} />
      case 'nfts': return <NFTExample jwtToken={sharedClient.jwtToken} />
      case 'transactions': return <TransactionExample jwtToken={sharedClient.jwtToken} />
      case 'walletInfo': return <WalletInfoExample jwtToken={sharedClient.jwtToken} />
      case 'utils': return <UtilsExample jwtToken={sharedClient.jwtToken} />
      case 'client': return <ClientExample jwtToken={sharedClient.jwtToken} />
      default: return null
    }
  }

  return (
    <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>🌾 Chia Wallet Client</h1>
            <p>Comprehensive Hook Testing Suite</p>
            <div className="header-decoration"></div>
          </div>
        </header>

        <main className="app-main">
          <div className="token-section">
            <JwtTokenInput 
              token={sharedClient.jwtToken} 
              onTokenChange={sharedClient.setJwtToken}
            />
          </div>

          {isTokenValid && (
            <div className="examples-section">
              <div className="section-header">
                <h2>🧪 Interactive Hook Examples</h2>
                <p>Explore all hooks and functionality with real-time testing</p>
              </div>

              <nav className="examples-nav">
                {tabConfig.map((tab) => (
                  <button 
                    key={tab.id}
                    className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    data-gradient={tab.gradient}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-title">{tab.title}</span>
                    <div className="tab-glow"></div>
                  </button>
                ))}
              </nav>

              <div className="examples-content">
                {activeTabConfig && (
                  <div className="content-header">
                    <div className="content-title">
                      <span className="title-icon">{activeTabConfig.icon}</span>
                      <h3>{activeTabConfig.title}</h3>
                    </div>
                    <p className="content-description">{activeTabConfig.description}</p>
                  </div>
                )}
                
                <div className="content-body">
                  {renderTabContent()}
                </div>
              </div>
            </div>
          )}

          {!isTokenValid && (
            <div className="welcome-section">
              <div className="welcome-card">
                <div className="welcome-icon">🚀</div>
                <h2>Welcome to Chia Wallet Client</h2>
                <p>Enter your JWT token above to start exploring our comprehensive collection of React hooks for Chia blockchain development.</p>
                
                <div className="features-showcase">
                  <div className="features-grid">
                    {tabConfig.map((tab, index) => (
                      <div key={tab.id} className="feature-card" style={{ '--delay': `${index * 0.1}s` } as any}>
                        <div className="feature-icon">{tab.icon}</div>
                        <h3>{tab.title}</h3>
                        <p>{tab.description}</p>
                        <div className="feature-shine"></div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="welcome-stats">
                  <div className="stat-item">
                    <span className="stat-number">{tabConfig.length}</span>
                    <span className="stat-label">Hook Categories</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">15+</span>
                    <span className="stat-label">Individual Hooks</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">∞</span>
                    <span className="stat-label">Possibilities</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <p>Built with ❤️ for the Chia Blockchain ecosystem</p>
            <div className="footer-links">
              <span>🌾 Powered by Chia</span>
              <span>⚡ Lightning Fast</span>
              <span>🔒 Secure by Design</span>
            </div>
          </div>
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
      <SharedClientProvider>
        <AppContent />
      </SharedClientProvider>
    </GlobalDialogProvider>
  )
}

export default App 