# Chia Wallet SDK - Simplified API

This document explains the new simplified API for the Chia Wallet SDK, designed to make it incredibly easy to integrate wallet functionality into your React applications.

## 🚀 Quick Start

### 1. Basic Setup (3 lines of code!)

```tsx
import { ChiaWalletSDKProvider } from 'chia-enclave-wallet-client';

function App() {
  return (
    <ChiaWalletSDKProvider>
      <YourWalletComponents />
    </ChiaWalletSDKProvider>
  );
}
```

### 2. Connect to Wallet

```tsx
import { useWalletConnection } from 'chia-enclave-wallet-client';

function LoginComponent() {
  const { isConnected, connect, setJwtToken } = useWalletConnection();
  
  if (isConnected) {
    return <div>✅ Wallet connected!</div>;
  }
  
  return (
    <button onClick={() => setJwtToken('your-jwt-token')}>
      Connect Wallet
    </button>
  );
}
```

### 3. Display Balance

```tsx
import { useWalletBalance } from 'chia-enclave-wallet-client';

function BalanceDisplay() {
  const { formattedBalance, refresh } = useWalletBalance();
  
  return (
    <div>
      <h2>{formattedBalance}</h2>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### 4. Send Transaction

```tsx
import { useSendTransaction } from 'chia-enclave-wallet-client';

function SendForm() {
  const { sendXCH, isSending } = useSendTransaction();
  
  const handleSend = async () => {
    const result = await sendXCH({
      payments: [{ address: 'xch...', amount: '1000000000000' }], // 1 XCH in mojos
      selected_coins: [], // Auto-select coins
      fee: '1000000' // 0.000001 XCH in mojos
    });
    
    if (result.success) {
      alert('Transaction sent!');
    }
  };
  
  return (
    <button onClick={handleSend} disabled={isSending}>
      {isSending ? 'Sending...' : 'Send XCH'}
    </button>
  );
}
```

That's it! You now have a fully functional wallet in just a few lines of code.

## 🏗️ Architecture Overview

The new simplified API consists of three main parts:

1. **ChiaWalletSDK** - The unified client with built-in state management
2. **ChiaWalletSDKProvider** - Simple React provider for the SDK
3. **Simplified Hooks** - Easy-to-use hooks for common operations

```
┌─────────────────────────────────────────────────┐
│                Your React App                   │
├─────────────────────────────────────────────────┤
│          Simplified Hooks Layer                 │
│  useWalletConnection, useWalletBalance, etc.    │
├─────────────────────────────────────────────────┤
│              ChiaWalletSDK                      │
│        (Unified Client + State Management)      │
├─────────────────────────────────────────────────┤
│            ChiaCloudWalletClient                │
│              (API Communication)                │
└─────────────────────────────────────────────────┘
```

## 🎯 Key Benefits

### ✅ Easy to Implement
- One provider setup for your entire app
- Intuitive hooks that "just work"
- Automatic state synchronization across components

### ✅ Single Source of Truth
- All components share the same wallet state
- No prop drilling or complex state management
- Reactive updates everywhere automatically

### ✅ Developer Friendly
- TypeScript support with full type safety
- Clear error handling and loading states
- Built-in event system for advanced use cases

### ✅ Production Ready
- Automatic retry logic and error recovery
- Built-in refresh intervals and stale data detection
- Memory leak protection and cleanup

## 📚 Complete API Reference

### Provider Setup

#### ChiaWalletSDKProvider

```tsx
<ChiaWalletSDKProvider
  config={{
    baseUrl?: string;                // Default: 'https://chia-enclave.silicon-dev.net'
    enableLogging?: boolean;         // Default: true
    autoConnect?: boolean;           // Default: true
    autoRefresh?: boolean;           // Default: true
    refreshInterval?: number;        // Default: 30000 (30 seconds)
  }}
>
  <YourApp />
</ChiaWalletSDKProvider>
```

### Core Hooks

#### useWalletConnection

Perfect for login/logout components.

```tsx
const {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  jwtToken: string | null;
  address: string | null;
  email: string | null;
  error: string | null;
  
  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => void;
  setJwtToken: (token: string | null) => Promise<boolean>;
} = useWalletConnection();
```

#### useWalletBalance

Perfect for balance display components.

```tsx
const {
  // State
  totalBalance: number;             // Balance in mojos
  coinCount: number;
  formattedBalance: string;         // e.g., "1.234567 XCH"
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;               // Timestamp
  
  // Actions
  refresh: () => Promise<boolean>;
  isStale: (maxAgeMs?: number) => boolean;
} = useWalletBalance();
```

#### useWalletCoins

Perfect for coin selection and NFT display.

```tsx
const {
  // State
  hydratedCoins: HydratedCoin[];    // All coins
  xchCoins: HydratedCoin[];         // XCH coins only
  catCoins: HydratedCoin[];         // CAT coins only  
  nftCoins: HydratedCoin[];         // NFT coins only
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
  
  // Actions  
  refresh: () => Promise<boolean>;
  isStale: (maxAgeMs?: number) => boolean;
} = useWalletCoins();
```

#### useSendTransaction

Perfect for transaction forms.

```tsx
const {
  // State
  isSending: boolean;
  lastTransaction: any | null;
  error: string | null;
  
  // Actions
  sendXCH: (request: SendXCHRequest) => Promise<Result<BroadcastResponse>>;
} = useSendTransaction();
```

#### useNFTOffers

Perfect for NFT marketplace functionality.

```tsx
const {
  // State
  isCreatingOffer: boolean;
  lastOffer: any | null;
  error: string | null;
  
  // Actions
  createNFTOffer: (request: SimpleMakeUnsignedNFTOfferRequest) => Promise<Result<SignOfferResponse>>;
} = useNFTOffers();
```

#### useWalletEvents

Perfect for notifications and debugging.

```tsx
const {
  // State
  events: Array<{ event: WalletEventType; data: any; timestamp: number }>;
  
  // Actions
  addEventListener: (event: WalletEventType, callback?: (data: any) => void) => () => void;
  clearEvents: () => void;
  
  // Convenience methods
  onConnectionChanged: (callback: (data: any) => void) => () => void;
  onBalanceChanged: (callback: (data: any) => void) => () => void;
  onTransactionCompleted: (callback: (data: any) => void) => () => void;
  onError: (callback: (data: any) => void) => () => void;
} = useWalletEvents();
```

#### useWalletState

The "everything hook" - provides access to the complete wallet state.

```tsx
const {
  // All wallet state
  ...walletState,
  
  // Computed values
  formattedBalance: string;
  isLoading: boolean;
  hasError: boolean;
  
  // Actions
  refresh: () => Promise<boolean>;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  setJwtToken: (token: string | null) => Promise<boolean>;
} = useWalletState();
```

#### useRawSDK

For advanced use cases where you need direct SDK access.

```tsx
const sdk: ChiaWalletSDK = useRawSDK();

// Direct access to all SDK methods
const result = await sdk.apiClient.getPublicKey();
sdk.on('balanceChanged', (data) => console.log('Balance updated:', data));
```

## 🎨 Usage Patterns

### Pattern 1: Simple Wallet App

```tsx
import { 
  ChiaWalletSDKProvider, 
  useWalletConnection, 
  useWalletBalance 
} from 'chia-enclave-wallet-client';

function WalletApp() {
  const { isConnected, setJwtToken } = useWalletConnection();
  const { formattedBalance } = useWalletBalance();
  
  if (!isConnected) {
    return <button onClick={() => setJwtToken(prompt('JWT Token'))}>Connect</button>;
  }
  
  return <div>Balance: {formattedBalance}</div>;
}

function App() {
  return (
    <ChiaWalletSDKProvider>
      <WalletApp />
    </ChiaWalletSDKProvider>
  );
}
```

### Pattern 2: Dashboard with Multiple Components

```tsx
function Dashboard() {
  return (
    <div>
      <Header />           {/* Uses useWalletConnection */}
      <BalanceCard />      {/* Uses useWalletBalance */}
      <CoinsList />        {/* Uses useWalletCoins */}
      <SendForm />         {/* Uses useSendTransaction */}
      <EventLog />         {/* Uses useWalletEvents */}
    </div>
  );
}

// All components automatically share the same wallet state!
```

### Pattern 3: Custom Hook

```tsx
function useCustomWalletLogic() {
  const { isConnected } = useWalletConnection();
  const { totalBalance } = useWalletBalance();
  const { xchCoins } = useWalletCoins();
  
  const canAfford = (amount: number) => totalBalance >= amount;
  const selectCoins = (amount: number) => {
    // Custom coin selection logic
    return xchCoins.slice(0, 2); // Simple example
  };
  
  return { canAfford, selectCoins };
}
```

### Pattern 4: Event-Driven Updates

```tsx
function NotificationComponent() {
  const [notifications, setNotifications] = useState([]);
  
  useWalletEvents().onTransactionCompleted((data) => {
    setNotifications(prev => [...prev, {
      type: 'success',
      message: `Transaction ${data.transactionId} completed!`
    }]);
  });
  
  return (
    <div>
      {notifications.map(n => <div key={n.message}>{n.message}</div>)}
    </div>
  );
}
```

## 🔄 Migration from Legacy API

If you're using the old API, here's how to migrate:

### Before (Legacy)
```tsx
// Multiple providers and complex setup
<ChiaWalletProvider>
  <HydratedCoinsProvider>
    <GlobalDialogProvider>
      // Complex hook usage
      const wallet = useChiaWallet();
      const balance = useBalance({ client: wallet.client });
      const coins = useHydratedCoins({ client: wallet.client });
      // ...
    </GlobalDialogProvider>
  </HydratedCoinsProvider>
</ChiaWalletProvider>
```

### After (Simplified)
```tsx
// Single provider, simple setup
<ChiaWalletSDKProvider>
  // Simple hook usage
  const { isConnected } = useWalletConnection();
  const { formattedBalance } = useWalletBalance();
  const { xchCoins } = useWalletCoins();
  // ...
</ChiaWalletSDKProvider>
```

## 🛠️ Advanced Usage

### Custom SDK Instance

```tsx
// Create SDK instance with custom config
const sdk = new ChiaWalletSDK({
  baseUrl: 'https://your-custom-endpoint.com',
  enableLogging: false,
  autoRefresh: false
});

// Pass to provider
<ChiaWalletSDKProvider sdk={sdk}>
  <YourApp />
</ChiaWalletSDKProvider>
```

### Multiple SDK Instances

```tsx
// For multi-wallet apps
const mainWallet = new ChiaWalletSDK({ baseUrl: 'https://main-wallet.com' });
const testWallet = new ChiaWalletSDK({ baseUrl: 'https://test-wallet.com' });

function App() {
  return (
    <div>
      <ChiaWalletSDKProvider sdk={mainWallet}>
        <MainWallet />
      </ChiaWalletSDKProvider>
      
      <ChiaWalletSDKProvider sdk={testWallet}>
        <TestWallet />
      </ChiaWalletSDKProvider>
    </div>
  );
}
```

### Direct SDK Usage (No Provider)

```tsx
// For non-React usage or advanced control
const sdk = new ChiaWalletSDK();

await sdk.setJwtToken('your-token');
await sdk.connect();

console.log('Balance:', sdk.getFormattedBalance());

sdk.on('balanceChanged', (data) => {
  console.log('New balance:', data.totalBalance);
});

// Clean up when done
sdk.destroy();
```

## 🤝 Backward Compatibility

The new simplified API is fully backward compatible. All existing APIs continue to work:

```tsx
// ✅ Old API still works
export { ChiaCloudWalletClient, useChiaWallet, useBalance } from 'chia-enclave-wallet-client';

// ✅ New simplified API
export { ChiaWalletSDK, useWalletConnection, useWalletBalance } from 'chia-enclave-wallet-client';
```

You can migrate gradually, component by component.

## 🎯 Best Practices

### ✅ Do
- Use one `ChiaWalletSDKProvider` at the root of your app
- Use specific hooks (`useWalletBalance`) instead of the general one (`useWalletState`)
- Handle loading states and errors in your UI
- Use the event system for notifications and side effects

### ❌ Avoid
- Multiple providers at different levels
- Passing the SDK instance as props
- Ignoring error states
- Forgetting to handle loading states

## 📝 TypeScript Support

The SDK is fully typed with TypeScript:

```tsx
import type { 
  WalletState, 
  WalletEventType, 
  ChiaWalletSDKConfig 
} from 'chia-enclave-wallet-client';

// Full type safety
const config: ChiaWalletSDKConfig = {
  baseUrl: 'https://api.example.com',
  autoRefresh: true
};

const handleEvent = (event: WalletEventType, data: any) => {
  // Type-safe event handling
};
```

## 🎉 Summary

The new simplified API makes Chia wallet integration incredibly easy:

1. **One line setup** - Just wrap your app with `ChiaWalletSDKProvider`
2. **Intuitive hooks** - Use hooks like `useWalletBalance()` that "just work"  
3. **Automatic state sync** - All components automatically share wallet state
4. **Production ready** - Built-in error handling, loading states, and cleanup

Start with the basic setup and add hooks as needed. The SDK handles all the complexity for you!

---

For the complete example, see `src/examples/SimpleWalletExample.tsx`. 