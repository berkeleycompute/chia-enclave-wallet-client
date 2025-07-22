import React, { useState } from 'react';
import './App.css';

// Import the providers and components from your library
import { ChiaWalletSDKProvider } from '../../src/providers/ChiaWalletSDKProvider';
import { GlobalDialogProvider } from '../../src/components/GlobalDialogProvider';
import { ChiaWalletButton } from '../../src/components/ChiaWalletButton';

// Import hooks for wallet functionality
import {
  useWalletState,
  useWalletConnection,
  useWalletBalance,
} from '../../src/hooks/useChiaWalletSDK';

// Import dialog hooks
import {
  useSendDialog,
  useReceiveDialog,
  useMakeOfferDialog,
  useOffersDialog,
} from '../../src/components/GlobalDialogProvider';

// JWT Token Input Component
const JWTTokenInput: React.FC = () => {
  const [jwtTokenInput, setJwtTokenInput] = useState('');
  const { connect, disconnect, setJwtToken, isConnected, isConnecting, error } = useWalletConnection();

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

// ChiaWalletButton Examples
const ChiaWalletButtonExample: React.FC = () => {
  const [walletState, setWalletState] = useState<any>(null);

  const handleWalletUpdate = (state: any) => {
    console.log('Wallet state updated from ChiaWalletButton:', state);
    setWalletState(state);
  };

  return (
    <div className="button-example-section">
      <h2>🌱 ChiaWalletButton Component</h2>
      <p>This is the ready-to-use button component from your library:</p>
      
      <div className="button-showcase">
        <div className="button-group">
          <h3>Wallet Button</h3>
          <div className="single-button-demo">
            <ChiaWalletButton 
              variant="primary"
              size="large"
              onWalletUpdate={handleWalletUpdate}
            />
          </div>
        </div>
      </div>

      {walletState && (
        <div className="button-debug">
          <h3>Button Callback Data:</h3>
          <pre>{JSON.stringify(walletState, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Wallet Information Display
const WalletInfo: React.FC = () => {
  const { publicKey, address, totalBalance, coinCount } = useWalletState();
  const { formattedBalance } = useWalletBalance();
  const { isConnected } = useWalletConnection();

  if (!isConnected) {
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
          <span className="address">{address || 'Loading...'}</span>
        </div>
        <div className="info-item">
          <strong>Public Key:</strong>
          <span className="key">{publicKey || 'Loading...'}</span>
        </div>
        <div className="info-item">
          <strong>Balance:</strong>
          <span className="balance">{formattedBalance}</span>
        </div>
        <div className="info-item">
          <strong>Coin Count:</strong>
          <span>{coinCount}</span>
        </div>
      </div>
    </div>
  );
};

// Dialog Actions Component
const DialogActions: React.FC = () => {
  const sendDialog = useSendDialog();
  const receiveDialog = useReceiveDialog();
  const makeOfferDialog = useMakeOfferDialog();
  const offersDialog = useOffersDialog();
  const { isConnected } = useWalletConnection();

  if (!isConnected) {
    return (
      <div className="dialog-actions-section">
        <h2>🔧 Wallet Actions</h2>
        <p className="not-connected">Connect to enable wallet actions.</p>
      </div>
    );
  }

  return (
    <div className="dialog-actions-section">
      <h2>🔧 Wallet Actions</h2>
      <div className="action-buttons">
        <button
          onClick={() => sendDialog.open()}
          className="action-btn send-btn"
        >
          💸 Send XCH
        </button>
        
        <button
          onClick={() => receiveDialog.open()}
          className="action-btn receive-btn"
        >
          📨 Receive
        </button>
        
        <button
          onClick={() => makeOfferDialog.open()}
          className="action-btn offer-btn"
        >
          🤝 Make Offer
        </button>
        
        <button
          onClick={() => offersDialog.open()}
          className="action-btn offers-btn"
        >
          📋 Active Offers
        </button>
      </div>
    </div>
  );
};

// Main Example App
const ExampleApp: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🌱 Chia Wallet SDK Example</h1>
        <p>Demonstrate the Chia Wallet library with JWT authentication</p>
      </header>

      <main className="main-content">
        <JWTTokenInput />
        <ChiaWalletButtonExample />
        <WalletInfo />
        <DialogActions />
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
