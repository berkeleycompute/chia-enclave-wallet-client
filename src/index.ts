// Export client classes
export { ChiaCloudWalletClient } from './client/ChiaCloudWalletClient';
export { ChiaWalletSDK } from './client/ChiaWalletSDK';
export { UnifiedWalletClient } from './client/UnifiedWalletClient';

// Export providers
export { ChiaWalletSDKProvider } from './providers/ChiaWalletSDKProvider';

// Export hooks
export { useChiaWallet } from './hooks/useChiaWallet';
export { useBalance } from './hooks/useBalance';
export { useWalletInfo } from './hooks/useWalletInfo';
export { useNFTs } from './hooks/useNFTs';
export { useChiaUtils } from './hooks/useChiaUtils';
export { useChiaTransactions } from './hooks/useChiaTransactions';
export { useHydratedCoins } from './hooks/useHydratedCoins';
export { ChiaWalletProvider } from './hooks/useChiaWalletProvider';
export {
  useWalletConnection,
  useWalletBalance,
  useWalletCoins,
  useSendTransaction,
  useUnifiedWalletClient,
  useTakeOffer
} from './hooks/useChiaWalletSDK';
export { useAllDialogs } from './hooks/useDialogs';

// Export components
export { ChiaWalletButton } from './components/ChiaWalletButton';
export { ChiaWalletModal } from './components/ChiaWalletModal';
export { ChiaWalletModalWithProvider } from './components/ChiaWalletModalWithProvider';
export { ChiaWalletDashboard } from './components/ChiaWalletDashboard';
export { ChiaWalletDialogsWrapper, ChiaWalletDialogManager } from './components/ChiaWalletDialogManager';
export { GlobalDialogProvider } from './components/GlobalDialogProvider';
export { HydratedCoinsProvider } from './components/HydratedCoinsProvider';

// Export individual dialog components
export { SendFundsModal } from './components/SendFundsModal';
export { ReceiveFundsModal } from './components/ReceiveFundsModal';
export { MakeOfferModal } from './components/MakeOfferModal';
export { ActiveOffersModal } from './components/ActiveOffersModal';
export { NFTDetailsModal } from './components/NFTDetailsModal';
export { TakeOfferWidget } from './components/TakeOfferWidget';

// Export dialog hooks from GlobalDialogProvider
export {
  useSendDialog,
  useReceiveDialog,
  useMakeOfferDialog,
  useOffersDialog,
  useNFTDetailsDialog,
  useGlobalDialogs,
} from './components/GlobalDialogProvider';

// Export shared modal styles for consistent theming
export { sharedModalStyles, injectModalStyles } from './components/modal-styles';

// Export types
export type { 
  HydratedCoin, 
  TakeOfferResponse, 
  ParsedOfferData,
  BroadcastOfferRequest,
  BroadcastOfferResponse
} from './client/ChiaCloudWalletClient';
export type {
  SentTransaction,
  SavedOffer,
  DexieOfferData,
  TakeOfferWidgetProps,
  SelectedCoinInfo
} from './components/types'; 