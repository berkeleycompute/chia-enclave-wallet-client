# Unified Wallet Client

This document explains how to use the unified wallet client approach for consistent state management across Chia wallet components.

## Quick Start (RECOMMENDED)

The **best way** to get complete wallet functionality is using the `useUnifiedWalletClient()` hook:

```tsx
import { useUnifiedWalletClient } from 'chia-enclave-wallet-client';
import { ChiaWalletButton, ChiaWalletModal } from 'chia-enclave-wallet-client';

function MyWalletApp() {
  const walletClient = useUnifiedWalletClient();
  
  return (
    <div>
      {/* Both components will use the same client instance */}
      <ChiaWalletButton walletClient={walletClient} />
      
      <ChiaWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        walletClient={walletClient}
      />
    </div>
  );
}
```

## What is UnifiedWalletClient?

`UnifiedWalletClient` is a high-level client that combines both the SDK and wallet state into a single, easy-to-use interface:

```typescript
class UnifiedWalletClient {
  constructor(
    public readonly sdk: ChiaWalletSDK,
    public readonly walletState: UnifiedWalletState
  ) {}

  // Convenience getters
  get isConnected(): boolean
  get address(): string | null
  get balance(): number
  get formattedBalance(): string
  get coinCount(): number
  get publicKey(): string | null
  get syntheticPublicKey(): string | null
  get error(): string | null
  get isConnecting(): boolean

  // Utility methods
  formatAddress(address?: string): string
  hasSufficientBalance(amountInMojos: number): boolean
  xchToMojos(xchAmount: number): number
  mojosToXch(mojos: number): number
  getSummary(): object
}
```

## Usage Approaches

### 1. Default Behavior (Simplest)

Components use hooks internally - no props needed:

```tsx
<ChiaWalletButton />
```

### 2. Unified Client (RECOMMENDED)

Pass a single client to ensure consistency across components:

```tsx
const walletClient = useUnifiedWalletClient();

<ChiaWalletButton walletClient={walletClient} />
<ChiaWalletModal walletClient={walletClient} />
```

### 3. External Data Sources

Create unified client from your own data:

```tsx
import { UnifiedWalletClient, createUnifiedWalletState } from 'chia-enclave-wallet-client';

const externalWalletState = createUnifiedWalletState({
  isConnected: true,
  address: 'xch1...',
  totalBalance: 1500000000000, // 1.5 XCH in mojos
  coinCount: 3,
  formattedBalance: '1.500000',
  // ... other properties
});

const externalClient = UnifiedWalletClient.create(sdk, externalWalletState);

<ChiaWalletButton walletClient={externalClient} />
```

## Benefits

1. **Consistency**: Same client instance across all components
2. **Simplicity**: Single hook provides complete wallet functionality
3. **Clean API**: One prop instead of multiple props
4. **Type Safety**: Full TypeScript support
5. **Convenience Methods**: Built-in utility methods like `formatAddress()`, `hasSufficientBalance()`, etc.

## Migration Guide

### From Individual Props:
```tsx
// OLD: Passing multiple props
const sdk = useRawSDK();
const walletState = useUnifiedWalletState();

<ChiaWalletButton sdk={sdk} walletState={walletState} />
<ChiaWalletModal sdk={sdk} walletState={walletState} />
```

```tsx
// NEW: Single client prop
const walletClient = useUnifiedWalletClient();

<ChiaWalletButton walletClient={walletClient} />
<ChiaWalletModal walletClient={walletClient} />
```

## Example

See the full example in `src/examples/UnifiedWalletExample.tsx` for complete usage patterns. 