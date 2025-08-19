# Third-Party Usage Guide: useTakeOffer Hook

This guide shows how external applications can use the `useTakeOffer` hook from the `chia-enclave-wallet-client` library.

## Installation

```bash
npm install chia-enclave-wallet-client
```

## Basic Setup

### 1. Provider Setup (Required)

All components using wallet hooks must be wrapped with `ChiaWalletSDKProvider`:

```typescript
// App.tsx
import React from 'react';
import { ChiaWalletSDKProvider } from 'chia-enclave-wallet-client';
import { TakeOfferComponent } from './TakeOfferComponent';

function App() {
  return (
    <ChiaWalletSDKProvider
      config={{
        baseUrl: 'https://your-chia-api-endpoint.com',
        enableLogging: process.env.NODE_ENV === 'development',
      }}
    >
      <TakeOfferComponent />
    </ChiaWalletSDKProvider>
  );
}

export default App;
```

### 2. Basic Usage

```typescript
// TakeOfferComponent.tsx
import React, { useState } from 'react';
import { 
  useTakeOffer, 
  useWalletConnection,
  type TakeOfferResponse 
} from 'chia-enclave-wallet-client';

export const TakeOfferComponent: React.FC = () => {
  const [offerString, setOfferString] = useState('');
  
  const { 
    takeOffer, 
    parseOffer,
    isTakingOffer, 
    isParsingOffer,
    error, 
    lastTakenOffer,
    parsedOffer 
  } = useTakeOffer();
  
  const { isConnected, connect } = useWalletConnection();

  const handleParseOffer = async () => {
    if (!offerString.trim()) return;
    
    const result = await parseOffer(offerString);
    if (result.success) {
      console.log('Offer parsed successfully:', result.data);
    } else {
      console.error('Failed to parse offer:', result.error);
    }
  };

  const handleTakeOffer = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!offerString.trim()) {
      alert('Please enter an offer string');
      return;
    }

    try {
      // Option 1: Simple string-based take offer
      const result = await takeOffer(offerString);
      
      if (result.success) {
        console.log('Offer taken successfully!', result.data);
        alert(`Success! Transaction ID: ${result.data.transaction_id}`);
      } else {
        alert(`Failed to take offer: ${result.error}`);
      }
    } catch (err) {
      console.error('Error taking offer:', err);
      alert('An unexpected error occurred');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Take Chia Offer</h2>
      
      {!isConnected ? (
        <div>
          <p>Please connect your wallet to continue</p>
          <button onClick={connect}>Connect Wallet</button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="offer-input">Offer String:</label>
            <textarea
              id="offer-input"
              value={offerString}
              onChange={(e) => setOfferString(e.target.value)}
              placeholder="Paste your Chia offer string here..."
              rows={4}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              onClick={handleParseOffer}
              disabled={isParsingOffer || !offerString.trim()}
            >
              {isParsingOffer ? 'Parsing...' : 'Parse Offer'}
            </button>
            
            <button 
              onClick={handleTakeOffer}
              disabled={isTakingOffer || !offerString.trim()}
            >
              {isTakingOffer ? 'Taking Offer...' : 'Take Offer'}
            </button>
          </div>

          {error && (
            <div style={{ color: 'red', marginBottom: '20px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {parsedOffer && (
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
              <h3>Parsed Offer Details:</h3>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(parsedOffer.data, null, 2)}
              </pre>
            </div>
          )}

          {lastTakenOffer && (
            <div style={{ color: 'green', padding: '10px', backgroundColor: '#f0fff0' }}>
              <h3>✅ Offer Taken Successfully!</h3>
              <p><strong>Transaction ID:</strong> {lastTakenOffer.transactionId}</p>
              <p><strong>Status:</strong> {lastTakenOffer.status}</p>
              <p><strong>Message:</strong> {lastTakenOffer.message}</p>
              <p><strong>Timestamp:</strong> {new Date(lastTakenOffer.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## Advanced Usage

### Custom Coin Selection

```typescript
import { 
  useTakeOffer, 
  useWalletCoins, 
  useWalletState,
  type HydratedCoin 
} from 'chia-enclave-wallet-client';

export const AdvancedTakeOfferComponent: React.FC = () => {
  const { takeOffer, isTakingOffer, error } = useTakeOffer();
  const { hydratedCoins } = useWalletCoins();
  const { syntheticPublicKey } = useWalletState();

  const handleAdvancedTakeOffer = async (offerString: string) => {
    // Filter coins based on your requirements
    const xchCoins = hydratedCoins?.filter(coin => 
      coin.parentSpendInfo.driverInfo?.type === 'XCH'
    ) || [];
    
    const catCoins = hydratedCoins?.filter(coin => 
      coin.parentSpendInfo.driverInfo?.type === 'CAT' &&
      coin.parentSpendInfo.driverInfo.assetId === 'your_asset_id'
    ) || [];

    // Create detailed request with custom coin selection
    const detailedRequest = {
      offer_string: offerString,
      synthetic_public_key: syntheticPublicKey || '',
      xch_coins: xchCoins.map(c => c.coin.parentCoinInfo).join(','),
      cat_coins: catCoins.map(c => c.coin.parentCoinInfo).join(','),
      fee: 1000000 // 0.001 XCH fee in mojos
    };

    const result = await takeOffer(detailedRequest);
    
    if (result.success) {
      console.log('Advanced offer taken:', result.data);
    } else {
      console.error('Failed:', result.error);
    }
  };

  // Component implementation...
};
```

### With Event Listening

```typescript
import { 
  useTakeOffer, 
  useWalletEvents,
  type WalletEventType 
} from 'chia-enclave-wallet-client';

export const EventAwareTakeOfferComponent: React.FC = () => {
  const { takeOffer } = useTakeOffer();
  const { addEventListener, events } = useWalletEvents();

  useEffect(() => {
    // Listen for transaction completion
    const unsubscribe = addEventListener('transactionCompleted', (data) => {
      console.log('Transaction completed:', data);
      // Handle transaction completion
    });

    return unsubscribe;
  }, [addEventListener]);

  // Component implementation...
};
```

## TypeScript Support

The library provides full TypeScript support with exported types:

```typescript
import type {
  TakeOfferResponse,
  ParsedOfferData,
  HydratedCoin,
  WalletState,
  SendXCHRequest
} from 'chia-enclave-wallet-client';

// Use types in your components
interface MyComponentProps {
  onOfferTaken?: (response: TakeOfferResponse) => void;
  onOfferParsed?: (data: ParsedOfferData) => void;
}
```

## Error Handling Best Practices

```typescript
const handleTakeOfferWithRetry = async (offerString: string, maxRetries = 2) => {
  let lastError: string | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await takeOffer(offerString);
      
      if (result.success) {
        return result;
      } else {
        lastError = result.error;
        
        // Check if it's a retryable error
        if (result.error?.includes('already been spent') && attempt < maxRetries) {
          // Refresh coins and retry
          await refreshCoins();
          continue;
        }
        
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      if (attempt === maxRetries) break;
    }
  }
  
  throw new Error(lastError || 'Failed to take offer after retries');
};
```

## Package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "chia-enclave-wallet-client": "^1.0.0"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  }
}
```

## Available Hooks

Your library exports these hooks for comprehensive wallet functionality:

- `useTakeOffer()` - Take and parse offers
- `useWalletConnection()` - Wallet connection state
- `useWalletBalance()` - Balance information
- `useWalletCoins()` - Available coins
- `useSendTransaction()` - Send XCH transactions
- `useNFTOffers()` - Create NFT offers
- `useWalletEvents()` - Listen to wallet events
- `useWalletState()` - Complete wallet state
- `useUnifiedWalletClient()` - Unified wallet client

## Support

For issues or questions, please refer to the library documentation or create an issue in the repository.
