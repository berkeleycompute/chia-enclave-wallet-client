import React, { useState } from 'react';
import './App.css';

// Import the providers and components from your library
import { ChiaWalletSDKProvider } from '../../src/providers/ChiaWalletSDKProvider';
import { GlobalDialogProvider } from '../../src/components/GlobalDialogProvider';
import { ChiaWalletButton } from '../../src/components/ChiaWalletButton';

// Import the new unified client hook
import {
  useUnifiedWalletClient,
  useWalletConnection,
} from '../../src/hooks/useChiaWalletSDK';

// Import dialog hooks
import {
  useSendDialog,
  useReceiveDialog,
  useMakeOfferDialog,
  useOffersDialog,
  useGlobalDialogs,
} from '../../src/components/GlobalDialogProvider';

// Import types
import { UnifiedWalletClient } from '../../src/client/UnifiedWalletClient';

// Navigation component
const Navigation: React.FC<{
  currentView: string;
  onViewChange: (view: string) => void;
}> = ({ currentView, onViewChange }) => {
  const views = [
    { id: 'main', label: '🏠 Main', description: 'Wallet connection and info' },
    { id: 'components', label: '🧩 Components', description: 'Test wallet components' },
    { id: 'dialogs', label: '💬 Dialogs', description: 'Test individual dialogs' },
  ];

  return (
    <nav className="navigation">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`nav-btn ${currentView === view.id ? 'active' : ''}`}
          title={view.description}
        >
          {view.label}
        </button>
      ))}
    </nav>
  );
};

// JWT Token Input Component - Updated to use client
const JWTTokenInput: React.FC<{ 
  walletClient: UnifiedWalletClient 
}> = ({ walletClient }) => {
  const [jwtTokenInput, setJwtTokenInput] = useState('');
  const { connect, disconnect, setJwtToken } = useWalletConnection();

  // Extract state from unified client
  const { isConnected, isConnecting, error } = walletClient.walletState;

  // Load saved JWT token on component mount
  React.useEffect(() => {
    const savedToken = localStorage.getItem('chia-wallet-jwt-token');
    if (savedToken) {
      setJwtTokenInput(savedToken);
    }
  }, []);

  const handleConnect = async () => {
    if (jwtTokenInput.trim()) {
      const token = jwtTokenInput.trim();
      // Save token to localStorage
      localStorage.setItem('chia-wallet-jwt-token', token);
      await setJwtToken(token);
      await connect();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setJwtTokenInput('');
    // Clear token from localStorage
    localStorage.removeItem('chia-wallet-jwt-token');
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setJwtTokenInput(newToken);
    // Save to localStorage as user types
    if (newToken.trim()) {
      localStorage.setItem('chia-wallet-jwt-token', newToken.trim());
    }
  };

  return (
    <div className="jwt-section">
      <h2>🔐 JWT Authentication</h2>
      <div className="jwt-input-group">
        <input
          type="text"
          value={jwtTokenInput}
          onChange={handleTokenChange}
          placeholder="Enter your JWT token..."
          className="jwt-input"
          disabled={isConnected || isConnecting}
        />
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={!jwtTokenInput.trim() || isConnecting}
            className="connect-btn"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="disconnect-btn"
          >
            Disconnect
          </button>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="connection-status">
        <strong>Status:</strong>
        <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnecting ? 'Connecting...' : isConnected ? '✅ Connected' : '❌ Disconnected'}
        </span>
      </div>
    </div>
  );
};

// Wallet Information Display - Updated to use client
const WalletInfo: React.FC<{ 
  walletClient: UnifiedWalletClient 
}> = ({ walletClient }) => {
  if (!walletClient.isConnected) {
    return (
      <div className="wallet-info-section">
        <h2>💰 Wallet Information</h2>
        <p className="not-connected">Please connect with a JWT token to see wallet information.</p>
      </div>
    );
  }

  return (
    <div className="wallet-info-section">
      <h2>💰 Wallet Information</h2>
      <div className="info-grid">
        <div className="info-item">
          <strong>Address:</strong>
          <span className="address">{walletClient.formatAddress()}</span>
        </div>
        <div className="info-item">
          <strong>Full Address:</strong>
          <span className="address-full">{walletClient.address || 'Loading...'}</span>
        </div>
        <div className="info-item">
          <strong>Public Key:</strong>
          <span className="key">{walletClient.publicKey || 'Loading...'}</span>
        </div>
        <div className="info-item">
          <strong>Balance:</strong>
          <span className="balance">{walletClient.formattedBalance} XCH</span>
        </div>
        <div className="info-item">
          <strong>Coin Count:</strong>
          <span>{walletClient.coinCount}</span>
        </div>
      </div>

      <div className="client-summary">
        <h3>🔧 Client Summary</h3>
        <pre>{JSON.stringify(walletClient.getSummary(), null, 2)}</pre>
      </div>
    </div>
  );
};

// Main View - Connection and wallet info
const MainView: React.FC<{ 
  walletClient: UnifiedWalletClient 
}> = ({ walletClient }) => {
  return (
    <div className="view main-view">
      <JWTTokenInput walletClient={walletClient} />
      <WalletInfo walletClient={walletClient} />
    </div>
  );
};

// Components View - Test wallet components
const ComponentsView: React.FC<{ 
  walletClient: UnifiedWalletClient 
}> = ({ walletClient }) => {
  const [walletState, setWalletState] = useState<any>(null);

  const handleWalletUpdate = (state: any) => {
    console.log('Wallet state updated from ChiaWalletButton:', state);
    setWalletState(state);
  };

  return (
    <div className="view components-view">
      <h2>🧩 Component Testing</h2>
      
      <div className="component-section">
        <h3>ChiaWalletButton with UnifiedWalletClient</h3>
        <p>This button uses the shared wallet client instance:</p>
        
      

        <div className="hook-vs-prop-demo">
          <h4>Hook vs Prop Comparison</h4>
          <div className="comparison-grid">
            <div className="demo-item">
              <h5>Using Hook Internally</h5>
              <ChiaWalletButton 
                variant="primary"
                size="medium"
                onWalletUpdate={handleWalletUpdate}
              />
              <small>Component uses useUnifiedWalletClient() internally</small>
            </div>
            <div className="demo-item">
              <h5>Using Passed Client</h5>
              <ChiaWalletButton 
                walletClient={walletClient}
                variant="primary"
                size="medium"
                onWalletUpdate={handleWalletUpdate}
              />
              <small>Component uses the shared walletClient prop</small>
            </div>
          </div>
        </div>

        {walletState && (
          <div className="button-debug">
            <h4>Latest Button Callback Data:</h4>
            <pre>{JSON.stringify(walletState, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

// Dialogs View - Test individual dialog actions
const DialogsView: React.FC<{ 
  walletClient: UnifiedWalletClient 
}> = ({ walletClient }) => {
  const sendDialog = useSendDialog();
  const receiveDialog = useReceiveDialog();
  const makeOfferDialog = useMakeOfferDialog();
  const offersDialog = useOffersDialog();
  
  // Get access to dialog states from the main context
  const globalDialogs = useGlobalDialogs();

  const [lastAction, setLastAction] = useState<string>('');

  const handleDialogAction = (actionName: string, action: () => void) => {
    setLastAction(`Opened ${actionName} at ${new Date().toLocaleTimeString()}`);
    action();
  };

  if (!walletClient.isConnected) {
    return (
      <div className="view dialogs-view">
        <h2>💬 Dialog Testing</h2>
        <div className="not-connected-message">
          <p>🔒 Please connect your wallet to test dialogs</p>
          <p>Switch to the "Main" tab to connect with your JWT token.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view dialogs-view">
      <h2>💬 Dialog Testing</h2>
      <p>Test individual wallet dialogs with your connected wallet:</p>
      
      <div className="wallet-summary">
        <h3>Connected Wallet Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <strong>Address:</strong> {walletClient.formatAddress()}
          </div>
          <div className="summary-item">
            <strong>Balance:</strong> {walletClient.formattedBalance} XCH
          </div>
          <div className="summary-item">
            <strong>Coins:</strong> {walletClient.coinCount}
          </div>
        </div>
      </div>

      <div className="dialog-sections">
        <div className="dialog-section">
          <h3>💸 Transaction Dialogs</h3>
          <div className="dialog-buttons">
            <button
              onClick={() => handleDialogAction('Send Funds Dialog', sendDialog.open)}
              className="dialog-btn send-btn"
            >
              💸 Open Send Dialog
            </button>
            
            <button
              onClick={() => handleDialogAction('Receive Dialog', receiveDialog.open)}
              className="dialog-btn receive-btn"
            >
              📨 Open Receive Dialog
            </button>
          </div>
          <div className="dialog-info">
            <small>Test sending and receiving XCH transactions</small>
          </div>
        </div>

        <div className="dialog-section">
          <h3>🤝 Trading Dialogs</h3>
          <div className="dialog-buttons">
            <button
              onClick={() => handleDialogAction('Make Offer Dialog', makeOfferDialog.open)}
              className="dialog-btn offer-btn"
            >
              🤝 Open Make Offer Dialog
            </button>
            
            <button
              onClick={() => handleDialogAction('Active Offers Dialog', offersDialog.open)}
              className="dialog-btn offers-btn"
            >
              📋 Open Active Offers Dialog
            </button>
          </div>
          <div className="dialog-info">
            <small>Test NFT offers and view active offers</small>
          </div>
        </div>

        <div className="dialog-section">
          <h3>🧪 Utility Tests</h3>
          <div className="utility-buttons">
            <button
              onClick={() => {
                const testAmount = walletClient.xchToMojos(1.5);
                const canAfford = walletClient.hasSufficientBalance(testAmount);
                setLastAction(`Balance check: Can afford 1.5 XCH? ${canAfford ? 'Yes' : 'No'} (${testAmount} mojos)`);
              }}
              className="utility-btn"
            >
              🔍 Test Balance Check (1.5 XCH)
            </button>
            
            <button
              onClick={() => {
                const mojos = 1500000000000; // 1.5 XCH in mojos
                const xch = walletClient.mojosToXch(mojos);
                setLastAction(`Conversion test: ${mojos} mojos = ${xch} XCH`);
              }}
              className="utility-btn"
            >
              🔄 Test Mojos Conversion
            </button>
            
            <button
              onClick={() => {
                const summary = walletClient.getSummary();
                console.log('Wallet Client Summary:', summary);
                setLastAction(`Wallet summary logged to console - Balance: ${summary.formattedBalance}`);
              }}
              className="utility-btn"
            >
              📊 Log Client Summary
            </button>
          </div>
        </div>
      </div>

      {lastAction && (
        <div className="last-action">
          <h4>🎯 Last Action:</h4>
          <p>{lastAction}</p>
        </div>
      )}

      <div className="dialog-info-section">
        <h3>📊 Dialog Information</h3>
        <div className="dialog-info-grid">
          <div className="info-card">
            <h4>🔄 Global Dialog System</h4>
            <p>All dialogs are managed globally and can be opened from anywhere in the app.</p>
          </div>
          <div className="info-card">
            <h4>🎯 Dialog Actions</h4>
            <p>Use the buttons above to test opening different wallet dialogs.</p>
          </div>
          <div className="info-card">
            <h4>🧪 Utility Testing</h4>
            <p>Test wallet client utility methods like balance checks and conversions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Example App - Updated to use unified client
const ExampleApp: React.FC = () => {
  const [currentView, setCurrentView] = useState('main');
  
  // Get the unified wallet client
  const walletClient = useUnifiedWalletClient();

  const renderCurrentView = () => {
    switch (currentView) {
      case 'main':
        return <MainView walletClient={walletClient} />;
      case 'components':
        return <ComponentsView walletClient={walletClient} />;
      case 'dialogs':
        return <DialogsView walletClient={walletClient} />;
      default:
        return <MainView walletClient={walletClient} />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌱 Chia Wallet SDK Example</h1>
        <p>Demonstrate the Chia Wallet library with the new UnifiedWalletClient</p>
        <div className="client-status">
          <strong>Client Status:</strong> 
          <span className={`status ${walletClient.isConnected ? 'connected' : 'disconnected'}`}>
            {walletClient.isConnected ? '✅ Connected' : '❌ Disconnected'}
          </span>
          {walletClient.isConnected && (
            <span className="client-balance">
              • Balance: {walletClient.formattedBalance} XCH
            </span>
          )}
        </div>
      </header>

      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      <main className="main-content">
        {renderCurrentView()}
      </main>
    </div>
  );
};

// Root App with Providers
function App() {
  return (
    <ChiaWalletSDKProvider config={{
      autoConnect: false
    }}>
      <GlobalDialogProvider>
        <ExampleApp />
      </GlobalDialogProvider>
    </ChiaWalletSDKProvider>
  );
}

export default App;
