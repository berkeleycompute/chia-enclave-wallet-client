# Twin NFT Mint Hook Usage Guide

## Overview

The `useTwinNFTMint` hook provides functionality to mint Twin NFTs using the Silicon Network API endpoint at `https://edge.silicon-dev.net/chia/twin_nft_minter/api/v1/twin-nft/mint`.

## Hook Features

- **State Management**: Tracks minting status, errors, and history
- **Request/Response Handling**: Manages API calls and response processing
- **History Persistence**: Auto-saves mint history to localStorage
- **Event Callbacks**: Supports onMintStart, onMintSuccess, and onMintError callbacks
- **TypeScript Support**: Fully typed interfaces for all data structures

## Basic Usage

```typescript
import { useTwinNFTMint } from 'chia-enclave-wallet-client';

function MyComponent() {
  const {
    isMinting,
    mintError,
    lastResponse,
    mintHistory,
    mintTwinNFT,
    reset,
    clearMintHistory
  } = useTwinNFTMint({
    enableLogging: true,
    autoSave: true,
    onMintSuccess: (mintId, response) => {
      console.log('Mint successful:', response.data.nft_id);
    },
    onMintError: (mintId, error) => {
      console.error('Mint failed:', error);
    }
  });

  const handleMint = async () => {
    const result = await mintTwinNFT({
      recipientAddress: 'xch1...your-address',
      fee: 100000, // Fee in mojos
      metadata: {
        // Additional metadata as required by the API
      }
    });

    if (result.success) {
      console.log('NFT minted:', result.response?.data.nft_id);
    } else {
      console.error('Mint failed:', result.error);
    }
  };

  return (
    <div>
      <button onClick={handleMint} disabled={isMinting}>
        {isMinting ? 'Minting...' : 'Mint Twin NFT'}
      </button>
      {mintError && <div>Error: {mintError}</div>}
      {lastResponse && (
        <div>
          <h3>Last Mint Result:</h3>
          <p>NFT ID: {lastResponse.data.nft_id}</p>
          <p>Launcher ID: {lastResponse.data.launcher_id}</p>
        </div>
      )}
    </div>
  );
}
```

## Hook Configuration

```typescript
interface UseTwinNFTMintConfig {
  jwtToken?: string | null;           // JWT token for authentication
  client?: ChiaCloudWalletClient;     // External client instance
  sdk?: ChiaWalletSDK;               // External SDK instance
  address?: string | null;           // Wallet address
  baseUrl?: string;                  // Custom API endpoint URL
  enableLogging?: boolean;           // Enable console logging
  autoSave?: boolean;                // Auto-save history to localStorage
  onMintStart?: (mintId: string) => void;
  onMintSuccess?: (mintId: string, response: TwinNFTMintResponse) => void;
  onMintError?: (mintId: string, error: string) => void;
}
```

## Request Structure

```typescript
interface TwinNFTMintRequest {
  recipientAddress?: string;         // Target address for the NFT
  fee?: number;                      // Fee in mojos
  metadata?: Record<string, any>;    // Additional metadata
  [key: string]: any;                // Extensible for future parameters
}
```

## Response Structure

The hook returns detailed information about the minted NFT including:

- `launcher_id` - The NFT launcher ID
- `nft_id` - The generated NFT ID
- `chiaMetadata` - Chia-specific metadata
- `inchainMetadata` - On-chain metadata
- `signed_spend_bundle` - Transaction details
- `evm_nft` - EVM NFT information
- `is_new_twin` - Whether this is a new twin NFT
- `fee_paid` - Actual fee paid
- `recipient_address` - Final recipient address

## Hook Return Values

```typescript
interface UseTwinNFTMintResult {
  // State
  isMinting: boolean;
  mintError: string | null;
  lastMintId: string | null;
  lastResponse: TwinNFTMintResponse | null;
  mintHistory: TwinNFTMintRecord[];

  // Actions
  mintTwinNFT: (request: TwinNFTMintRequest) => Promise<MintResult>;
  reset: () => void;
  cancelMint: () => void;

  // History management
  getMintById: (mintId: string) => TwinNFTMintRecord | null;
  getPendingMints: () => TwinNFTMintRecord[];
  getSuccessfulMints: () => TwinNFTMintRecord[];
  clearMintHistory: () => void;
}
```

## Example Component

See `TwinNFTMintExample` component for a complete working example with UI forms, error handling, and mint history display.

## Error Handling

The hook provides comprehensive error handling:

- Network errors are caught and stored in `mintError`
- Failed mints are tracked in history with status `'failed'`
- All errors trigger the `onMintError` callback if provided

## History Management

The hook automatically tracks all mint attempts with:

- Unique mint IDs
- Timestamps
- Request parameters
- Response data (for successful mints)
- Error messages (for failed mints)
- Status tracking ('pending', 'success', 'failed')

History is automatically persisted to localStorage and can be managed with the provided utility functions.
