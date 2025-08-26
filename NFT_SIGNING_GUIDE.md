# NFT Minting with Signing & Broadcasting

This guide explains how to mint NFTs using the Chia Enclave Wallet Client when not using mnemonic words. The client now supports a 3-step process: **create unsigned spend bundle → sign → broadcast**.

## Overview

When minting NFTs without mnemonic words, the system automatically:

1. **Creates an unsigned spend bundle** containing the NFT minting transaction
2. **Signs the spend bundle** using your wallet's private key (via synthetic public key)
3. **Broadcasts the signed spend bundle** to the Chia network

## Automatic Flow (Recommended)

The simplest way is to use the `useChiaNFTMint` hook, which handles everything automatically:

```typescript
import { useChiaNFTMint } from './hooks/useChiaNFTMint';

const { mintNFT } = useChiaNFTMint({
  sdk: yourSDK,
  enableLogging: true
});

const config = {
  name: 'My NFT',
  description: 'A sample NFT',
  imageUrl: 'https://example.com/image.png',
  metadataUrl: 'https://example.com/metadata.json',
  dataHash: '1234...abcd', // 64-char hex string
  metadataHash: 'abcd...1234', // 64-char hex string
  editionNumber: 1,
  editionTotal: 1
};

// This automatically handles: create → sign → broadcast
const result = await mintNFT(config);
```

## Manual Flow (Advanced Control)

For advanced users who want control over each step:

### Step 1: Create Unsigned Spend Bundle

```typescript
import { ChiaCloudWalletClient } from './client/ChiaCloudWalletClient';

const client = new ChiaCloudWalletClient();

const mintRequest = {
  synthetic_public_key: 'your_96_char_hex_public_key',
  selected_coins: selectedCoins, // Array of coins to spend
  mints: [{
    metadata: {
      edition_number: 1,
      edition_total: 1,
      data_uris: ['https://example.com/image.png'],
      data_hash: '1234...abcd',
      metadata_uris: ['https://example.com/metadata.json'],
      metadata_hash: 'abcd...1234',
      license_uris: [],
      license_hash: 'abcd...1234'
    },
    p2_puzzle_hash: 'target_address_puzzle_hash',
    royalty_puzzle_hash: null,
    royalty_basis_points: 0
  }],
  fee: 1000000 // 0.000001 XCH in mojos
};

const unsignedResult = await client.createUnsignedNFTMint(mintRequest);
if (unsignedResult.success) {
  const { spend_bundle_hex, coin_spends } = unsignedResult.data;
  // Store these for signing
}
```

### Step 2: Sign and Broadcast

```typescript
// Option A: Sign and broadcast in one call (recommended)
const broadcastResult = await client.signAndBroadcastNFTMint(
  spend_bundle_hex,
  coin_spends
);

if (broadcastResult.success) {
  console.log('NFT minted!', broadcastResult.data.transaction_id);
}

// Option B: Sign and broadcast separately (maximum control)
const signResult = await client.signSpendBundle({
  spend_bundle_hex: spend_bundle_hex,
  coin_spends: coin_spends
});

if (signResult.success) {
  const broadcastResult = await client.broadcastSignedSpendBundle(
    signResult.data
  );
  
  if (broadcastResult.success) {
    console.log('NFT minted!', broadcastResult.data.transaction_id);
  }
}
```

## Flow Decision Logic

The `mintNFT` method automatically chooses the flow based on your request:

```typescript
// With mnemonic words: Direct minting via backend service
const mintRequest = {
  mnemonic_words: 'your twelve word mnemonic phrase here...',
  // ... other fields
};

// Without mnemonic words: 3-step signing process
const mintRequest = {
  synthetic_public_key: 'your_96_char_hex_public_key',
  // ... other fields
};

// Both work with the same mintNFT call
const result = await client.mintNFT(mintRequest);
```

## Error Handling

All methods return a `Result<T>` type for consistent error handling:

```typescript
const result = await client.mintNFT(request);

if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error);
  console.error('Details:', result.details);
}
```

## Key Benefits

1. **Automatic Flow**: Works seamlessly with existing `useChiaNFTMint` hook
2. **Manual Control**: Advanced users can control each step
3. **Security**: Private keys never leave your wallet
4. **Flexibility**: Supports both mnemonic and synthetic key authentication
5. **Error Handling**: Comprehensive error reporting at each step

## API Reference

### ChiaCloudWalletClient Methods

- `createUnsignedNFTMint(request)` - Creates unsigned spend bundle
- `signAndBroadcastNFTMint(hex, coinSpends)` - Signs and broadcasts in one call
- `mintNFT(request)` - High-level method that chooses the appropriate flow
- `signSpendBundle(request)` - Signs a spend bundle
- `broadcastSignedSpendBundle(signedBundle)` - Broadcasts a signed spend bundle

### Hook Methods

- `useChiaNFTMint()` - React hook with automatic flow handling
- `mintNFT(config)` - High-level minting with ChiaNFTMintConfig

## Example Component

See `src/examples/NFTMintWithSigningExample.tsx` for a complete React component demonstrating both automatic and manual flows.

## Network Endpoints

The client automatically uses the appropriate endpoints:

- **Unsigned Mint**: `https://edge.silicon-dev.net/chia/make_unsigned_nft_mint/mint-nft`
- **Signing**: `https://qugucpyccrhmsusuvpvz.supabase.co/functions/v1/api/enclave/sign-spendbundle`
- **Broadcasting**: `https://edge.silicon-dev.net/chia/chia_public_api/broadcast`

## Troubleshooting

### Common Issues

1. **"Invalid synthetic public key format"**
   - Ensure your public key is exactly 96 hex characters
   - Remove any '0x' prefix if present

2. **"No unspent coins available"**
   - Your wallet needs XCH for minting fees
   - Check your wallet balance

3. **"Failed to sign spend bundle"**
   - Ensure your wallet is connected
   - Check JWT token is valid

4. **"Failed to broadcast"**
   - Network connectivity issue
   - Invalid spend bundle format
   - Insufficient fees

### Debug Logging

Enable detailed logging:

```typescript
const client = new ChiaCloudWalletClient({
  enableLogging: true
});

const { mintNFT } = useChiaNFTMint({
  enableLogging: true
});
```

This will log each step of the process for troubleshooting.
