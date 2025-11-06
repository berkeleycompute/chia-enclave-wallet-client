import React from 'react';
import {
  ChiaWalletSDK,
  ChiaWalletSDKProvider,
  useWalletConnection,
  useWalletBalance,
  useWalletCoins,
  useSendTransaction,
  useNFTOffers,
  useWalletEvents
} from '../index';

/**
 * Simple wallet connection component
 * Shows how easy it is to handle authentication
 */
function WalletConnection() {
  const { 
    isConnected, 
    isConnecting, 
    address, 
    email, 
    error, 
    connect, 
    disconnect, 
    setJwtToken 
  } = useWalletConnection();

  const [jwtInput, setJwtInput] = React.useState('');

  const handleConnect = async () => {
    if (jwtInput.trim()) {
      await setJwtToken(jwtInput.trim());
    }
  };

  if (isConnected) {
    return (
      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
        <h3>✅ Wallet Connected</h3>
        <p><strong>Address:</strong> {address}</p>
        <p><strong>Email:</strong> {email}</p>
        <button onClick={disconnect} style={{ background: '#ff4444', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px' }}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
      <h3>Connect Wallet</h3>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter JWT Token"
          value={jwtInput}
          onChange={(e) => setJwtInput(e.target.value)}
          style={{ width: '300px', padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <button 
          onClick={handleConnect}
          disabled={isConnecting || !jwtInput.trim()}
          style={{ 
            background: isConnecting ? '#ccc' : '#4CAF50', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isConnecting ? 'not-allowed' : 'pointer'
          }}
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>
      {error && (
        <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>
      )}
    </div>
  );
}

/**
 * Simple balance display component
 * Shows how easy it is to display wallet balance
 */
function WalletBalance() {
  const { 
    totalBalance, 
    coinCount, 
    formattedBalance, 
    isLoading, 
    error, 
    refresh, 
    isStale 
  } = useWalletBalance();

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
      <h3>💰 Wallet Balance</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold' }}>{formattedBalance}</p>
          <p style={{ margin: 0, color: '#666' }}>
            {coinCount} coins{isStale() && ' (stale)'}
          </p>
        </div>
        <button 
          onClick={refresh}
          disabled={isLoading}
          style={{ 
            background: '#2196F3', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && (
        <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>
      )}
    </div>
  );
}

/**
 * Coin overview component
 * Shows how easy it is to categorize and display coins
 */
function CoinOverview() {
  const { 
    xchCoins, 
    catCoins, 
    nftCoins, 
    isLoading, 
    error 
  } = useWalletCoins();

  if (isLoading) {
    return (
      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
        <h3>🪙 Coins</h3>
        <p>Loading coins...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
      <h3>🪙 Coins</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
          <h4>XCH Coins</h4>
          <p style={{ fontSize: '1.5em', margin: 0 }}>{xchCoins.length}</p>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
          <h4>CAT Coins</h4>
          <p style={{ fontSize: '1.5em', margin: 0 }}>{catCoins.length}</p>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
          <h4>NFT Coins</h4>
          <p style={{ fontSize: '1.5em', margin: 0 }}>{nftCoins.length}</p>
        </div>
      </div>
      {error && (
        <p style={{ color: 'red', marginTop: '1rem' }}><strong>Error:</strong> {error}</p>
      )}
    </div>
  );
}

/**
 * Simple transaction component
 * Shows how easy it is to send transactions
 */
function SendTransaction() {
  const { isSending, lastTransaction, error, sendXCH } = useSendTransaction();
  const [recipientAddress, setRecipientAddress] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [fee, setFee] = React.useState('0.00001');

  const handleSend = async () => {
    if (!recipientAddress.trim() || !amount.trim()) {
      alert('Please fill in recipient address and amount');
      return;
    }

    const amountInMojos = Math.round(parseFloat(amount) * 1000000000000).toString();
    const feeInMojos = Math.round(parseFloat(fee) * 1000000000000).toString();

    await sendXCH({
      payments: [{
        address: recipientAddress.trim(),
        amount: amountInMojos
      }],
      selected_coins: [], // SDK will auto-select coins
      fee: feeInMojos
    });
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
      <h3>💸 Send XCH</h3>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>Recipient Address:</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="xch..."
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Amount (XCH):</label>
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.001"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Fee (XCH):</label>
            <input
              type="number"
              step="0.000001"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleSend}
        disabled={isSending || !recipientAddress.trim() || !amount.trim()}
        style={{ 
          background: isSending ? '#ccc' : '#FF9800', 
          color: 'white', 
          padding: '0.75rem 1.5rem', 
          border: 'none', 
          borderRadius: '4px',
          cursor: isSending ? 'not-allowed' : 'pointer',
          fontSize: '1rem'
        }}
      >
        {isSending ? 'Sending...' : 'Send XCH'}
      </button>

      {lastTransaction && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#e8f5e8', borderRadius: '4px' }}>
          <h4>✅ Last Transaction</h4>
          <p><strong>ID:</strong> {lastTransaction.transactionId}</p>
          <p><strong>Status:</strong> {lastTransaction.status}</p>
          <p><strong>Time:</strong> {new Date(lastTransaction.timestamp).toLocaleString()}</p>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#ffebee', borderRadius: '4px' }}>
          <p style={{ color: 'red', margin: 0 }}><strong>Error:</strong> {error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Event log component
 * Shows how easy it is to listen to wallet events
 */
function EventLog() {
  const { events, clearEvents } = useWalletEvents();

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>📋 Recent Events</h3>
        <button 
          onClick={clearEvents}
          style={{ 
            background: '#757575', 
            color: 'white', 
            padding: '0.25rem 0.75rem', 
            border: 'none', 
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}
        >
          Clear
        </button>
      </div>
      
      {events.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No events yet</p>
      ) : (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {events.slice().reverse().map((event, index) => (
            <div 
              key={index}
              style={{ 
                padding: '0.5rem', 
                marginBottom: '0.5rem', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{event.event}</strong>
                <span style={{ color: '#666' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {event.data && (
                <div style={{ marginTop: '0.25rem', color: '#666' }}>
                  {JSON.stringify(event.data, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main example component that demonstrates the complete simplified API
 */
function WalletApp() {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>
      <h1>🌱 Chia Wallet SDK - Simplified API Example</h1>
      <p>This example shows how easy it is to build wallet functionality with the new simplified API.</p>
      
      <WalletConnection />
      <WalletBalance />
      <CoinOverview />
      <SendTransaction />
      <EventLog />
    </div>
  );
}

/**
 * Root component that sets up the SDK provider
 * This is all you need to get started!
 */
export default function SimpleWalletExample() {
  return (
    <ChiaWalletSDKProvider
      config={{
        baseUrl: 'https://chia-enclave.silicon-dev.net/v1',
        enableLogging: true,
        autoRefresh: true,
        refreshInterval: 30000
      }}
    >
      <WalletApp />
    </ChiaWalletSDKProvider>
  );
}

/**
 * Alternative: Using the SDK directly without provider (for custom setups)
 */
export function DirectSDKExample() {
  const [sdk] = React.useState(() => new ChiaWalletSDK({
    baseUrl: 'https://chia-enclave.silicon-dev.net/v1',
    enableLogging: true
  }));

  return (
    <ChiaWalletSDKProvider sdk={sdk}>
      <WalletApp />
    </ChiaWalletSDKProvider>
  );
}

/**
 * Usage examples for different scenarios:
 * 
 * 1. Basic setup (recommended):
 * ```tsx
 * import { ChiaWalletSDKProvider } from 'chia-enclave-wallet-client';
 * 
 * function App() {
 *   return (
 *     <ChiaWalletSDKProvider>
 *       <YourWalletComponents />
 *     </ChiaWalletSDKProvider>
 *   );
 * }
 * ```
 * 
 * 2. Custom configuration:
 * ```tsx
 * <ChiaWalletSDKProvider
 *   config={{
 *     baseUrl: 'https://your-custom-endpoint.com',
 *     autoRefresh: true,
 *     refreshInterval: 10000
 *   }}
 * >
 *   <YourWalletComponents />
 * </ChiaWalletSDKProvider>
 * ```
 * 
 * 3. Using hooks in components:
 * ```tsx
 * import { useWalletConnection, useWalletBalance } from 'chia-enclave-wallet-client';
 * 
 * function WalletComponent() {
 *   const { isConnected, connect, setJwtToken } = useWalletConnection();
 *   const { formattedBalance, refresh } = useWalletBalance();
 * 
 *   // Your component logic
 * }
 * ```
 * 
 * 4. Advanced usage with raw SDK:
 * ```tsx
 * import { useRawSDK } from 'chia-enclave-wallet-client';
 * 
 * function AdvancedComponent() {
 *   const sdk = useRawSDK();
 *   
 *   // Direct access to all SDK methods
 *   const result = await sdk.apiClient.getPublicKey();
 * }
 * ```
 */ 