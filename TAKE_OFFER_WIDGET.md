# TakeOfferModal Widget

The `TakeOfferModal` is a comprehensive, ready-to-use React component for taking/accepting Chia offers. It provides a complete user interface with offer parsing, balance checking, coin selection, and transaction execution.

## Features

✅ **Complete Offer Workflow** - Parse, analyze, and execute offers in one component  
✅ **Automatic Balance Checking** - Validates user has sufficient funds before taking offers  
✅ **Smart Coin Selection** - Automatically selects optimal coins for the transaction  
✅ **Error Handling & Retry Logic** - Handles common blockchain errors gracefully  
✅ **TypeScript Support** - Full type safety and IntelliSense support  
✅ **Customizable UI** - Flexible styling and configuration options  
✅ **Auto-Connect Wallet** - Automatically connects wallet when modal opens  
✅ **Advanced Options** - Custom fee selection and manual coin selection  

## Installation

```bash
npm install chia-enclave-wallet-client
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { 
  TakeOfferModal, 
  ChiaWalletSDKProvider,
  type TakeOfferResult 
} from 'chia-enclave-wallet-client';

function MyApp() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOfferTaken = (result: TakeOfferResult) => {
    console.log('Offer taken!', result);
    alert(`Success! Transaction ID: ${result.transactionId}`);
  };

  const handleError = (error: string) => {
    console.error('Error:', error);
    alert(`Error: ${error}`);
  };

  return (
    <ChiaWalletSDKProvider
      config={{
        baseUrl: 'https://your-chia-api-endpoint.com',
        enableLogging: true,
      }}
    >
      <div>
        <button onClick={() => setIsModalOpen(true)}>
          Take Offer
        </button>

        <TakeOfferModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onOfferTaken={handleOfferTaken}
          onError={handleError}
        />
      </div>
    </ChiaWalletSDKProvider>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ | - | Controls modal visibility |
| `onClose` | `() => void` | ✅ | - | Called when modal should close |
| `initialOfferString` | `string` | ❌ | `''` | Pre-fill the offer input field |
| `onOfferTaken` | `(result: TakeOfferResult) => void` | ❌ | - | Called when offer is successfully taken |
| `onError` | `(error: string) => void` | ❌ | - | Called when an error occurs |
| `autoConnect` | `boolean` | ❌ | `true` | Automatically connect wallet when modal opens |
| `showAdvancedOptions` | `boolean` | ❌ | `false` | Show advanced options like custom fees |

## Types

### TakeOfferResult

```tsx
interface TakeOfferResult {
  transactionId: string;    // Blockchain transaction ID
  status: string;           // Transaction status
  message?: string;         // Optional message from the API
  offerString: string;      // Original offer string
  timestamp: number;        // When the offer was taken
}
```

### OfferAnalysis

```tsx
interface OfferAnalysis {
  isValid: boolean;                    // Whether the offer is valid
  requiredXCH: number;                // XCH amount required (in mojos)
  requiredCATs: Array<{               // CAT tokens required
    assetId: string;
    amount: number;
    name?: string;
  }>;
  offeredNFTs: Array<{               // NFTs being offered
    launcherId: string;
    amount: number;
  }>;
  estimatedValue: number;            // Estimated total value
  error?: string;                    // Error message if invalid
}
```

## Advanced Usage

### Pre-filled Offer String

```tsx
<TakeOfferModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  initialOfferString="offer1qqr83wcuu2rykcmqvpsxygqqwc7hynr6hum6e0mnf72sn7uvvkpt68eyumkhelprk0adeg42nlelk2mpagr8facdwt3"
  onOfferTaken={handleOfferTaken}
  onError={handleError}
/>
```

### With Advanced Options

```tsx
<TakeOfferModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onOfferTaken={handleOfferTaken}
  onError={handleError}
  showAdvancedOptions={true}  // Shows fee customization and coin selection
  autoConnect={false}         // Don't auto-connect wallet
/>
```

### Custom Event Handling

```tsx
const handleOfferTaken = (result: TakeOfferResult) => {
  // Custom success logic
  console.log('Transaction completed:', result);
  
  // Update your app state
  updateTransactionHistory(result);
  refreshWalletBalance();
  
  // Send to analytics
  analytics.track('offer_taken', {
    transaction_id: result.transactionId,
    status: result.status
  });
  
  // Show custom notification
  showSuccessNotification(`Offer taken! TX: ${result.transactionId.slice(0, 8)}...`);
};

const handleError = (errorMessage: string) => {
  // Custom error handling
  console.error('Take offer failed:', errorMessage);
  
  // Send to error tracking
  errorTracker.captureException(new Error(errorMessage));
  
  // Show user-friendly error
  if (errorMessage.includes('insufficient balance')) {
    showErrorNotification('You don\'t have enough funds to take this offer.');
  } else if (errorMessage.includes('already been spent')) {
    showErrorNotification('This offer has already been taken by someone else.');
  } else {
    showErrorNotification('Failed to take offer. Please try again.');
  }
};
```

## Integration Patterns

### URL-Based Offers

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function OfferPage() {
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [offerString, setOfferString] = useState('');

  useEffect(() => {
    const offer = searchParams.get('offer');
    if (offer) {
      setOfferString(offer);
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <TakeOfferModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      initialOfferString={offerString}
      onOfferTaken={handleOfferTaken}
      onError={handleError}
    />
  );
}
```

### QR Code Integration

```tsx
import QrScanner from 'qr-scanner';

function QROfferScanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannedOffer, setScannedOffer] = useState('');

  const handleQRScan = async (result: string) => {
    try {
      // Extract offer from QR code result
      const url = new URL(result);
      const offer = url.searchParams.get('offer');
      
      if (offer && offer.startsWith('offer1')) {
        setScannedOffer(offer);
        setIsModalOpen(true);
      } else {
        alert('Invalid offer QR code');
      }
    } catch {
      // If not a URL, check if it's a direct offer string
      if (result.startsWith('offer1')) {
        setScannedOffer(result);
        setIsModalOpen(true);
      } else {
        alert('Invalid QR code format');
      }
    }
  };

  return (
    <div>
      <QrScanner onScan={handleQRScan} />
      
      <TakeOfferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialOfferString={scannedOffer}
        onOfferTaken={handleOfferTaken}
        onError={handleError}
      />
    </div>
  );
}
```

### Marketplace Integration

```tsx
interface MarketplaceOffer {
  id: string;
  title: string;
  description: string;
  price: number;
  offerString: string;
  seller: string;
  createdAt: Date;
}

function OfferCard({ offer }: { offer: MarketplaceOffer }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOfferTaken = (result: TakeOfferResult) => {
    // Mark offer as completed in your database
    markOfferAsCompleted(offer.id, result.transactionId);
    
    // Update UI
    showSuccessMessage(`You successfully purchased "${offer.title}"!`);
  };

  return (
    <div className="offer-card">
      <h3>{offer.title}</h3>
      <p>{offer.description}</p>
      <div className="price">{offer.price} wUSDC</div>
      
      <button onClick={() => setIsModalOpen(true)}>
        Buy Now
      </button>

      <TakeOfferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialOfferString={offer.offerString}
        onOfferTaken={handleOfferTaken}
        onError={(error) => alert(`Purchase failed: ${error}`)}
      />
    </div>
  );
}
```

## Styling

The component uses CSS-in-JS for styling and includes responsive design. You can customize the appearance by:

### Custom CSS Classes

```css
/* Override modal styles */
.take-offer-modal {
  max-width: 800px !important;
}

.take-offer-modal .modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.take-offer-modal .take-offer-btn {
  background: #28a745;
  transition: all 0.3s ease;
}

.take-offer-modal .take-offer-btn:hover {
  background: #218838;
  transform: translateY(-1px);
}
```

### Theme Integration

```tsx
import { ThemeProvider } from 'styled-components';

const theme = {
  colors: {
    primary: '#007bff',
    success: '#28a745',
    danger: '#dc3545',
    background: '#f8f9fa'
  }
};

function ThemedApp() {
  return (
    <ThemeProvider theme={theme}>
      <TakeOfferModal
        // ... props
      />
    </ThemeProvider>
  );
}
```

## Error Handling

The component handles various error scenarios:

| Error Type | Description | User Experience |
|------------|-------------|-----------------|
| **Invalid Offer** | Malformed offer string | Clear error message with suggestion to check format |
| **Insufficient Balance** | User doesn't have enough funds | Shows required vs available amounts |
| **Network Error** | API or blockchain connectivity issues | Retry button with exponential backoff |
| **Offer Already Taken** | Another user took the offer first | Clear message with suggestion to find other offers |
| **Wallet Not Connected** | User's wallet is disconnected | Auto-connect attempt or manual connect button |
| **Transaction Failed** | Blockchain rejected the transaction | Detailed error with troubleshooting steps |

## Performance Considerations

- **Lazy Loading**: The modal only renders when `isOpen` is true
- **Debounced Parsing**: Offer analysis is debounced to prevent excessive API calls
- **Coin Caching**: Selected coins are cached to improve performance
- **Auto-refresh**: Wallet state is automatically refreshed after successful transactions

## Security Features

- **Offer Validation**: All offers are parsed and validated before execution
- **Balance Verification**: Ensures user has sufficient funds before attempting transaction
- **Coin Selection**: Only selects coins that are actually available and unspent
- **Error Boundaries**: Graceful error handling prevents crashes
- **Input Sanitization**: All user inputs are properly sanitized

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Common Issues

**Modal doesn't open**
- Ensure `isOpen` prop is set to `true`
- Check that component is wrapped in `ChiaWalletSDKProvider`

**Wallet connection fails**
- Verify `baseUrl` in provider config
- Check JWT token is valid and not expired
- Ensure API endpoint is accessible

**Offer parsing fails**
- Verify offer string starts with "offer1"
- Check offer hasn't expired
- Ensure offer format is valid Chia offer

**Transaction fails**
- Check wallet has sufficient balance
- Verify coins haven't been spent by another transaction
- Ensure network connectivity

### Debug Mode

Enable debug mode for detailed logging:

```tsx
<ChiaWalletSDKProvider
  config={{
    baseUrl: 'https://your-api.com',
    enableLogging: true,  // Enables debug logging
  }}
>
  <TakeOfferModal
    // ... props
  />
</ChiaWalletSDKProvider>
```

## Examples

See the complete examples in:
- `src/examples/TakeOfferExample.tsx` - Basic and advanced usage patterns
- `example/src/App.tsx` - Integration with existing applications

## API Reference

For detailed API documentation of the underlying hooks and functions, see:
- `useTakeOffer` hook documentation
- `TakeOfferRequest` and `TakeOfferResponse` type definitions
- Chia Cloud Wallet Client API reference

## Support

For issues, questions, or feature requests:
1. Check the troubleshooting guide above
2. Review the example implementations
3. Create an issue in the repository with detailed reproduction steps
4. Include browser console logs when reporting bugs
