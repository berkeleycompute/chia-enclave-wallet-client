# Offer History Hook Usage Guide

This guide explains how to use the new `useOfferHistory` hook to retrieve and manage offer history for Chia wallet addresses.

## Overview

The offer history functionality provides three main hooks:

- `useOfferHistory` - Main hook for complete offer history management
- `useActiveOffers` - Specialized hook for active offers only
- `useCompletedOffers` - Specialized hook for completed offers only

## Basic Usage

### Simple Example

```typescript
import { useOfferHistory } from 'chia-enclave-wallet-client';

function MyComponent() {
  const { offers, loading, error, refresh } = useOfferHistory({
    address: 'xch16rwd5cg28cp795zfddj5tuazn3ncy88mvwzvl2vfl65afr3qrvqqkslpxv',
    autoRefresh: true,
    refreshInterval: 30000 // 30 seconds
  });

  if (loading) return <div>Loading offers...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Offer History ({offers.length} offers)</h2>
      <button onClick={refresh}>Refresh</button>
      
      {offers.map(offer => (
        <div key={offer.offer_id}>
          <strong>{offer.asset}</strong> - {offer.price} {offer.code}
          <br />
          Status: {offer.status} | Created: {offer.date_created}
        </div>
      ))}
    </div>
  );
}
```

### Advanced Example with Filtering

```typescript
import { useOfferHistory, OFFER_STATUS } from 'chia-enclave-wallet-client';

function AdvancedOfferHistory() {
  const {
    offers,
    loading,
    error,
    getOfferStats,
    getActiveOffers,
    getCompletedOffers,
    getOfferById,
    refresh
  } = useOfferHistory({
    address: 'xch16rwd5cg28cp795zfddj5tuazn3ncy88mvwzvl2vfl65afr3qrvqqkslpxv',
    autoRefresh: true,
    filterByStatus: [OFFER_STATUS.ACTIVE, OFFER_STATUS.PENDING],
    maxItems: 50
  });

  const stats = getOfferStats();
  const activeOffers = getActiveOffers();
  const completedOffers = getCompletedOffers();

  return (
    <div>
      <h2>Offer Statistics</h2>
      <div>
        <span>Total: {stats.total}</span>
        <span>Active: {stats.active}</span>
        <span>Completed: {stats.completed}</span>
        <span>Pending: {stats.pending}</span>
      </div>

      <h3>Active Offers ({activeOffers.length})</h3>
      {activeOffers.map(offer => (
        <OfferCard key={offer.offer_id} offer={offer} />
      ))}

      <h3>Recent Completed Offers ({completedOffers.length})</h3>
      {completedOffers.slice(0, 10).map(offer => (
        <OfferCard key={offer.offer_id} offer={offer} />
      ))}
    </div>
  );
}
```

### Using Specialized Hooks

```typescript
import { useActiveOffers, useCompletedOffers } from 'chia-enclave-wallet-client';

// Only active offers
function ActiveOffersComponent() {
  const { offers, count, loading, error, refresh } = useActiveOffers({
    address: 'xch16rwd5cg28cp795zfddj5tuazn3ncy88mvwzvl2vfl65afr3qrvqqkslpxv',
    autoRefresh: true,
    refreshInterval: 15000 // Check every 15 seconds
  });

  return (
    <div>
      <h3>Active Offers ({count})</h3>
      {offers.map(offer => (
        <div key={offer.offer_id}>{offer.asset} - {offer.price} {offer.code}</div>
      ))}
    </div>
  );
}

// Only completed offers
function CompletedOffersComponent() {
  const { offers, count, loading, error } = useCompletedOffers({
    address: 'xch16rwd5cg28cp795zfddj5tuazn3ncy88mvwzvl2vfl65afr3qrvqqkslpxv',
    maxItems: 20 // Limit to last 20 completed offers
  });

  return (
    <div>
      <h3>Recent Completed Offers ({count})</h3>
      {offers.map(offer => (
        <div key={offer.offer_id}>
          {offer.asset} - {offer.price} {offer.code}
          <br />
          Completed: {offer.date_completed}
        </div>
      ))}
    </div>
  );
}
```

## Configuration Options

### UseOfferHistoryConfig

```typescript
interface UseOfferHistoryConfig {
  jwtToken?: string | null;           // JWT token for authentication (optional for this endpoint)
  client?: ChiaCloudWalletClient;     // Custom client instance
  sdk?: ChiaWalletSDK;               // SDK instance (takes precedence over client)
  address?: string | null;           // Wallet address to query
  autoRefresh?: boolean;             // Enable automatic refresh (default: false)
  refreshInterval?: number;          // Refresh interval in ms (default: 300000 = 5 minutes)
  baseUrl?: string;                  // Custom base URL
  enableLogging?: boolean;           // Enable logging (default: true)
  filterByStatus?: OfferStatus[];    // Filter by specific statuses
  maxItems?: number;                 // Limit number of items returned
}
```

## Offer Status Constants

```typescript
export const OFFER_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  CANCELLED: 2,
  EXPIRED: 3,
  COMPLETED: 4
} as const;
```

## Data Types

### OfferHistoryItem

```typescript
interface OfferHistoryItem {
  asset: string;                    // Asset name
  block_expiry: number | null;      // Block expiry height
  code: string;                     // Currency code
  date_completed: string | null;    // Completion date
  date_created: string;             // Creation date
  date_expiry: string | null;       // Expiry date
  date_found: string;               // Discovery date
  date_pending: string | null;      // Pending date
  date_taken: string | null;        // Taken date
  fees: number;                     // Fees paid
  involved_coins: string[];         // Coin IDs involved
  known_taker: string | null;       // Known taker address
  mempool: OfferMempool | null;     // Mempool information
  mod_version: number;              // Module version
  nftid: string;                    // NFT ID
  offer_id: string;                 // Unique offer ID
  offer_maker: string;              // Maker address
  offer_taker: string;              // Taker address
  offered: OfferAsset[];            // Assets offered
  price: number;                    // Offer price
  related_offers: any[];            // Related offers
  requested: OfferRequestedAsset[]; // Assets requested
  spent_block_index: number | null; // Block index when spent
  status: number;                   // Offer status (see OFFER_STATUS)
  trade_id: string;                 // Trade ID
}
```

### OfferAsset (NFT Details)

```typescript
interface OfferAsset {
  collection: OfferCollection;      // Collection information
  id: string;                       // Asset ID
  is_nft: boolean;                  // Whether it's an NFT
  name: string;                     // Asset name
  nft_data: OfferNFTData;          // NFT metadata
  preview: OfferNFTPreview;        // Preview images
}
```

## Hook Return Values

### UseOfferHistoryResult

```typescript
interface UseOfferHistoryResult {
  // State
  offers: OfferHistoryItem[];       // All offers
  filteredOffers: OfferHistoryItem[]; // Filtered offers
  loading: boolean;                 // Loading state
  error: string | null;             // Error message
  lastUpdate: number;               // Last update timestamp
  totalOffers: number;              // Total offer count
  address: string | null;           // Current address

  // Actions
  refresh: () => Promise<boolean>;  // Refresh data
  reset: () => void;                // Reset state

  // Filtering utilities
  getOffersByStatus: (status: OfferStatus) => OfferHistoryItem[];
  getActiveOffers: () => OfferHistoryItem[];
  getCompletedOffers: () => OfferHistoryItem[];
  getPendingOffers: () => OfferHistoryItem[];
  getCancelledOffers: () => OfferHistoryItem[];
  getExpiredOffers: () => OfferHistoryItem[];
  getOfferById: (offerId: string) => OfferHistoryItem | undefined;
  isStale: () => boolean;

  // Statistics
  getOfferStats: () => {
    total: number;
    active: number;
    completed: number;
    pending: number;
    cancelled: number;
    expired: number;
  };
}
```

## Best Practices

1. **Use Auto-refresh Wisely**: Enable auto-refresh for active offers but consider longer intervals for historical data
2. **Filter Appropriately**: Use `filterByStatus` and `maxItems` to limit data and improve performance
3. **Handle Loading States**: Always handle loading and error states in your UI
4. **Cache Management**: The hook includes built-in rate limiting to prevent excessive API calls
5. **Address Validation**: Ensure the wallet address is valid before passing it to the hook

## Error Handling

```typescript
const { offers, loading, error, refresh } = useOfferHistory({
  address: walletAddress
});

if (error) {
  // Handle different types of errors
  if (error.includes('Address is required')) {
    // Invalid or missing address
  } else if (error.includes('Failed to refresh')) {
    // Network or API error
  }
  
  return <div>Error: {error} <button onClick={refresh}>Retry</button></div>;
}
```

## Performance Considerations

- The hook includes rate limiting (minimum 5 seconds between calls)
- Use `maxItems` to limit the number of offers returned
- Consider using specialized hooks (`useActiveOffers`, `useCompletedOffers`) for better performance
- Auto-refresh intervals should be balanced between data freshness and API load

## API Endpoint

The hook calls the following endpoint:
```
GET /chia/nft-offers/offers/{address}
```

This endpoint is publicly accessible and doesn't require authentication.

## Example Response Structure

```json
{
  "success": true,
  "address": "xch16rwd5cg28cp795zfddj5tuazn3ncy88mvwzvl2vfl65afr3qrvqqkslpxv",
  "offer_count": 36,
  "offers": [
    {
      "asset": "Pantheon Compute 4090 GPU #284 - 84f4",
      "offer_id": "9ZAuVdi7BdPPkNsiiLD3qP6hvD7KTwtM6Z2VHhDquuNr",
      "price": 2400,
      "code": "wUSDC.b",
      "status": 0,
      "date_created": "2025-08-31 23:07:24",
      "date_completed": null,
      "offered": [...],
      "requested": [...]
    }
  ]
}
```
