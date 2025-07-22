import React, { useState } from 'react';
import { ChiaWalletSDKProvider, useWalletConnection, SimpleDashboard } from 'chia-enclave-wallet-client';
import './App.css';

type ExampleTab = 'dashboard' | 'widget' | 'button';

const tabConfig = [
  {
    id: 'dashboard' as const,
    icon: '📊',
    title: 'Dashboard',
    description: 'Complete wallet dashboard with balance, coins, and actions',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'widget' as const,
    icon: '🧩',
    title: 'Widget',
    description: 'Compact wallet widget for embedding',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'button' as const,
    icon: '🔘',
    title: 'Button',
    description: 'Simple wallet connection button',
    gradient: 'from-green-500 to-emerald-500'
  }
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<ExampleTab>('dashboard');
  const { jwtToken, setJwtToken } = useWalletConnection();

  const isTokenValid = jwtToken && jwtToken.trim().length > 0;
  const activeTabConfig = tabConfig.find(tab => tab.id === activeTab);

  const [jwtInput, setJwtInput] = useState('');

  const handleSetToken = async () => {
    if (jwtInput.trim()) {
      await setJwtToken(jwtInput.trim());
      setJwtInput(''); // Clear input after setting
    }
  };

  const handleClearToken = () => {
    setJwtToken(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="example-content">
            <h3>🌱 Chia Wallet Dashboard</h3>
            <p>A complete wallet dashboard with balance display, transaction capabilities, and coin management.</p>
            <div className="component-demo">
              <SimpleDashboard showFullModal={true} />
            </div>
          </div>
        );
      case 'widget':
        return (
          <div className="example-content">
            <h3>🧩 Wallet Widget</h3>
            <p>A compact wallet widget perfect for embedding in other applications.</p>
            <div className="component-demo">
              <SimpleDashboard />
            </div>
          </div>
        );
      case 'button':
        return (
          <div className="example-content">
            <h3>🔘 Wallet Connection Button</h3>
            <p>A simple button component for wallet connection and basic info display.</p>
            <div className="component-demo">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h4>Primary Button (Medium)</h4>
                  <div>Button component would go here - check SimpleDashboard for the connection pattern</div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🌾 Chia Wallet SDK - Simplified API</h1>
          <p>Easy-to-use React components for Chia wallet integration</p>
          <div className="header-decoration"></div>
        </div>
      </header>

      <main className="app-main">
        {/* JWT Token Section */}
        <div className="token-section">
          <div className="token-input-group">
            <input
              type="password"
              placeholder="Enter JWT Token to connect wallet"
              value={jwtInput}
              onChange={(e) => setJwtInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSetToken()}
              className="jwt-input"
            />
            <button onClick={handleSetToken} disabled={!jwtInput.trim()} className="set-token-btn">
              Set Token
            </button>
            {isTokenValid && (
              <button onClick={handleClearToken} className="clear-token-btn">
                Clear
              </button>
            )}
          </div>
          <div className="token-status">
            Status: {isTokenValid ? '✅ Token Set' : '⚪ No Token'}
          </div>
        </div>

        {/* Examples Section */}
        <div className="examples-section">
          <div className="section-header">
            <h2>🧪 Component Examples</h2>
            <p>Explore the new simplified SDK components with real-time testing</p>
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

        {/* Features Showcase */}
        <div className="features-section">
          <h2>✨ Why Use the Simplified SDK?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Easy to Use</h3>
              <p>Just wrap your app with ChiaWalletSDKProvider and use simple hooks</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Auto State Sync</h3>
              <p>All components automatically share the same wallet state</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Built-in Optimization</h3>
              <p>Automatic caching, refresh intervals, and memory management</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Modern UI</h3>
              <p>Beautiful, responsive components with built-in styling</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>Built with ❤️ for the Chia Blockchain ecosystem using the new Simplified SDK</p>
          <div className="footer-links">
            <span>🌾 Powered by Chia</span>
            <span>⚡ Lightning Fast</span>
            <span>🔒 Secure by Design</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ChiaWalletSDKProvider
      config={{
        baseUrl: 'https://chia-enclave.silicon-dev.net',
        enableLogging: true,
        autoConnect: false, // Don't auto-connect, let user enter JWT token first
        autoRefresh: true,
        refreshInterval: 30000
      }}
    >
      <AppContent />
    </ChiaWalletSDKProvider>
  );
}

export default App; 