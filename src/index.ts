// Client
export { ChiaCloudWalletClient } from './client/ChiaCloudWalletClient.ts';

// Hooks
export { useChiaWallet, type WalletEvent, type WalletEventListener } from './hooks/useChiaWallet.ts';
export { useChiaTransactions } from './hooks/useChiaTransactions.ts';

// Legacy Dialog Hooks (deprecated - use Global Dialog System instead)
export {
  DialogProvider,
  useSendFundsDialog,
  useMakeOfferDialog as useMakeOfferDialogLegacy,
  useReceiveFundsDialog,
  useActiveOffersDialog,
  useNFTDetailsDialog as useNFTDetailsDialogLegacy,
  useWalletMainDialog,
  useAllDialogs,
  type DialogType,
  type SendFundsDialogState,
  type MakeOfferDialogState,
  type ReceiveFundsDialogState,
  type ActiveOffersDialogState,
  type NFTDetailsDialogState,
  type WalletMainDialogState
} from './hooks/useDialogs.ts';

// Components - Individual Modal Components
export { SendFundsModal } from './components/SendFundsModal.tsx';
export { ReceiveFundsModal } from './components/ReceiveFundsModal.tsx';
export { MakeOfferModal } from './components/MakeOfferModal.tsx';
export { ActiveOffersModal } from './components/ActiveOffersModal.tsx';
export { NFTDetailsModal } from './components/NFTDetailsModal.tsx';
 
 

// Components - Main Wallet Components
export { ChiaWalletButton } from './components/ChiaWalletButton.tsx';
export { ChiaWalletModal } from './components/ChiaWalletModal.tsx';
export { ChiaWalletModalWithProvider } from './components/ChiaWalletModalWithProvider.tsx';

// Bridge Components
export { ChiaWalletBridge } from './components/ChiaWalletBridge.tsx';

// Simplified Dialog Manager (New Easy API)
export {
  ChiaWalletDialogManager,
  ChiaWalletDialogsWrapper,
  type ChiaWalletDialogConfig
} from './components/ChiaWalletDialogManager.tsx';

// Global Dialog System (Latest - Can be opened from anywhere!)
export {
  GlobalDialogProvider,
  useGlobalDialogs,
  useSendDialog,
  useReceiveDialog,
  useMakeOfferDialog,
  useOffersDialog,
  useNFTDetailsDialog,
  type GlobalDialogConfig,
  type SendDialogArgs,
  type MakeOfferDialogArgs,
  type NFTDetailsDialogArgs,
  type ReceiveDialogArgs,
  type OffersDialogArgs
} from './components/GlobalDialogProvider.tsx';

// Types
export type { SentTransaction, SavedOffer } from './components/types.ts'; 