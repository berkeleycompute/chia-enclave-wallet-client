# Dialog Hooks System

This refactored code provides a clean, React-friendly way to manage different types of dialogs in your Chia Wallet application using individual hooks for each dialog type.

## Overview

The new system consists of:
- **DialogProvider**: React context provider that manages all dialog states
- **Individual dialog hooks**: Each dialog type has its own hook
- **Compound hook**: `useAllDialogs()` provides access to all dialogs at once

## Installation & Setup

### 1. Wrap your app with DialogProvider

```tsx
import { DialogProvider } from 'chia-enclave-wallet-client';

function App() {
  return (
    <DialogProvider>
      {/* Your app components */}
      <YourWalletComponent />
    </DialogProvider>
  );
}
```

### 2. Use individual dialog hooks in your components

```tsx
import { 
  useSendFundsDialog, 
  useMakeOfferDialog, 
  useReceiveFundsDialog 
} from 'chia-enclave-wallet-client';

function WalletActions() {
  const sendFunds = useSendFundsDialog();
  const makeOffer = useMakeOfferDialog();
  const receiveFunds = useReceiveFundsDialog();

  return (
    <div>
      <button onClick={sendFunds.open}>
        Send Funds
      </button>
      
      <button onClick={receiveFunds.open}>
        Receive Funds  
      </button>
      
      <button onClick={() => makeOffer.open(selectedNft)}>
        Make Offer
      </button>
    </div>
  );
}
```

## Available Dialog Hooks

### 1. useSendFundsDialog()
Manages the Send Funds dialog state.

```tsx
const sendFunds = useSendFundsDialog();
// Returns: { isOpen: boolean, open: () => void, close: () => void }

<SendFundsModal 
  isOpen={sendFunds.isOpen}
  onClose={sendFunds.close}
  // ... other props
/>
```

### 2. useMakeOfferDialog() 
Manages the Make Offer dialog state with NFT selection support.

```tsx
const makeOffer = useMakeOfferDialog();
// Returns: { 
//   isOpen: boolean, 
//   selectedNft: HydratedCoin | null,
//   open: (nft?: HydratedCoin) => void, 
//   close: () => void 
// }

// Open with specific NFT
makeOffer.open(myNftCoin);

// Access selected NFT
if (makeOffer.selectedNft) {
  console.log('Selected NFT:', makeOffer.selectedNft);
}

<MakeOfferModal 
  isOpen={makeOffer.isOpen}
  onClose={makeOffer.close}
  selectedNft={makeOffer.selectedNft}
  // ... other props
/>
```

### 3. useReceiveFundsDialog()
Manages the Receive Funds dialog state.

```tsx
const receiveFunds = useReceiveFundsDialog();
// Returns: { isOpen: boolean, open: () => void, close: () => void }

<ReceiveFundsModal 
  isOpen={receiveFunds.isOpen}
  onClose={receiveFunds.close}
  // ... other props  
/>
```

### 4. useActiveOffersDialog()
Manages the Active Offers dialog state.

```tsx
const activeOffers = useActiveOffersDialog();
// Returns: { isOpen: boolean, open: () => void, close: () => void }

<ActiveOffersModal 
  isOpen={activeOffers.isOpen}
  onClose={activeOffers.close}
  // ... other props
/>
```

### 5. useNFTDetailsDialog()
Manages the NFT Details dialog state with NFT selection support.

```tsx
const nftDetails = useNFTDetailsDialog();
// Returns: { 
//   isOpen: boolean, 
//   selectedNft: HydratedCoin | null,
//   open: (nft: HydratedCoin) => void, 
//   close: () => void 
// }

// Open with specific NFT (required)
nftDetails.open(myNftCoin);

<NFTDetailsModal 
  isOpen={nftDetails.isOpen}
  onClose={nftDetails.close}
  nft={nftDetails.selectedNft}
  // ... other props
/>
```

### 6. useWalletMainDialog()
Manages the main wallet dialog state.

```tsx
const walletMain = useWalletMainDialog();
// Returns: { isOpen: boolean, open: () => void, close: () => void }

<ChiaWalletModal 
  isOpen={walletMain.isOpen}
  onClose={walletMain.close}
  // ... other props
/>
```

## Compound Hook: useAllDialogs()

For convenience, you can access all dialogs through a single hook:

```tsx
import { useAllDialogs } from 'chia-enclave-wallet-client';

function WalletComponent() {
  const dialogs = useAllDialogs();

  return (
    <div>
      <button onClick={dialogs.sendFunds.open}>Send Funds</button>
      <button onClick={dialogs.receiveFunds.open}>Receive Funds</button>
      <button onClick={dialogs.activeOffers.open}>Active Offers</button>
      
      {/* Close all dialogs at once */}
      <button onClick={dialogs.closeAllDialogs}>Close All</button>
      
      {/* Check if any dialog is open */}
      {dialogs.isAnyDialogOpen && (
        <div>Some dialog is currently open</div>
      )}
    </div>
  );
}
```

## Migration from Old System

If you were previously managing dialog states manually, here's how to migrate:

### Before (Manual State Management)
```tsx
function WalletComponent() {
  const [sendFundsOpen, setSendFundsOpen] = useState(false);
  const [makeOfferOpen, setMakeOfferOpen] = useState(false);
  const [selectedNft, setSelectedNft] = useState<HydratedCoin | null>(null);

  const openMakeOffer = (nft: HydratedCoin) => {
    setSelectedNft(nft);
    setMakeOfferOpen(true);
  };

  return (
    <div>
      <button onClick={() => setSendFundsOpen(true)}>Send Funds</button>
      <button onClick={() => openMakeOffer(nft)}>Make Offer</button>
      
      <SendFundsModal 
        isOpen={sendFundsOpen} 
        onClose={() => setSendFundsOpen(false)} 
      />
      
      <MakeOfferModal 
        isOpen={makeOfferOpen} 
        onClose={() => setMakeOfferOpen(false)}
        selectedNft={selectedNft}
      />
    </div>
  );
}
```

### After (Using Dialog Hooks)
```tsx
import { DialogProvider, useSendFundsDialog, useMakeOfferDialog } from 'chia-enclave-wallet-client';

function App() {
  return (
    <DialogProvider>
      <WalletComponent />
    </DialogProvider>
  );
}

function WalletComponent() {
  const sendFunds = useSendFundsDialog();
  const makeOffer = useMakeOfferDialog();

  return (
    <div>
      <button onClick={sendFunds.open}>Send Funds</button>
      <button onClick={() => makeOffer.open(nft)}>Make Offer</button>
      
      <SendFundsModal 
        isOpen={sendFunds.isOpen} 
        onClose={sendFunds.close} 
      />
      
      <MakeOfferModal 
        isOpen={makeOffer.isOpen} 
        onClose={makeOffer.close}
        selectedNft={makeOffer.selectedNft}
      />
    </div>
  );
}
```

## Benefits

1. **Cleaner Code**: No more manual state management for dialog visibility
2. **Type Safety**: Full TypeScript support with proper typing  
3. **Centralized State**: All dialog states managed in one place
4. **Easy to Use**: Simple, intuitive API for each dialog type
5. **Flexible**: Use individual hooks or the compound hook as needed
6. **Maintainable**: Easy to add new dialog types or modify existing ones

## TypeScript Support

All hooks are fully typed with TypeScript interfaces:

```tsx
import type { 
  SendFundsDialogState,
  MakeOfferDialogState,
  NFTDetailsDialogState 
} from 'chia-enclave-wallet-client';

const sendFunds: SendFundsDialogState = useSendFundsDialog();
const makeOffer: MakeOfferDialogState = useMakeOfferDialog();
const nftDetails: NFTDetailsDialogState = useNFTDetailsDialog();
```

This refactored system makes your dialog management much cleaner and more maintainable!

## Integration with ChiaWalletModal

Your existing `ChiaWalletModal.refactored.tsx` has been updated to use the new dialog hooks system. Here's how it works:

### Option 1: Use the Wrapped Component (Recommended)
```tsx
// Import the pre-wrapped version
import { ChiaWalletModalWithProvider } from 'chia-enclave-wallet-client';

// Use it directly - no need to wrap with DialogProvider yourself
<ChiaWalletModalWithProvider 
  isOpen={walletModalOpen}
  onClose={() => setWalletModalOpen(false)}
  wallet={walletState}
/>
```

### Option 2: Manual Provider Wrapping
```tsx
import { DialogProvider, ChiaWalletModal } from 'chia-enclave-wallet-client';

function App() {
  return (
    <DialogProvider>
      <ChiaWalletModal 
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        wallet={walletState}
      />
    </DialogProvider>
  );
}
```

### What Changed in ChiaWalletModal?

**Before (Manual State):**
```tsx
// Old manual state management
const [showSendModal, setShowSendModal] = useState(false);
const [showReceiveModal, setShowReceiveModal] = useState(false);
const [selectedNft, setSelectedNft] = useState(null);

// Old button handlers
<button onClick={() => setShowSendModal(true)}>Send</button>
<button onClick={() => setShowReceiveModal(true)}>Receive</button>

// Old modal props
<SendFundsModal 
  isOpen={showSendModal}
  onClose={() => setShowSendModal(false)}
/>
```

**After (Dialog Hooks):**
```tsx
// New dialog hooks (automatic state management)
const sendFundsDialog = useSendFundsDialog();
const receiveFundsDialog = useReceiveFundsDialog();
const nftDetailsDialog = useNFTDetailsDialog();

// New button handlers (much cleaner!)
<button onClick={sendFundsDialog.open}>Send</button>
<button onClick={receiveFundsDialog.open}>Receive</button>
<button onClick={() => nftDetailsDialog.open(nftCoin)}>View NFT</button>

// New modal props (automatic state sync)
<SendFundsModal 
  isOpen={sendFundsDialog.isOpen}
  onClose={sendFundsDialog.close}
/>
```

### Key Benefits in ChiaWalletModal:

1. **Reduced Code**: Removed 6 useState calls and their setters
2. **Cleaner Handlers**: Button clicks are now one-liners
3. **Automatic State**: No more manual state synchronization
4. **NFT Selection**: Built-in selectedNft state in hooks
5. **Type Safety**: All dialog states are properly typed

### Migration Path:

1. **Immediate**: Use `ChiaWalletModalWithProvider` instead of `ChiaWalletModal`
2. **No Breaking Changes**: All existing props and functionality remain the same
3. **Enhanced Features**: Dialog state is now managed more reliably

Your ChiaWalletModal now benefits from the new dialog system while maintaining full backward compatibility! 