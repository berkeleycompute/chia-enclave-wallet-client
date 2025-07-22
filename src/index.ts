// Client
export { ChiaCloudWalletClient } from './client/ChiaCloudWalletClient';

// Core Hooks
export { useChiaWallet, type WalletEvent, type WalletEventListener } from './hooks/useChiaWallet';
export { useChiaTransactions } from './hooks/useChiaTransactions';
export { useHydratedCoins, type UseHydratedCoinsConfig, type HydratedCoinsState } from './hooks/useHydratedCoins';

// Balance Hooks
export { 
  useBalance, 
  useXCHBalance, 
  useCATBalance, 
  useTotalBalance,
  type BalanceBreakdown,
  type UseBalanceConfig,
  type UseBalanceResult
} from './hooks/useBalance';

// NFT Hooks
export {
  useNFTs,
  useNFTMetadata,
  useNFTCollections,
  type NFTMetadata,
  type NFTWithMetadata,
  type UseNFTsConfig,
  type UseNFTsResult
} from './hooks/useNFTs';

// Transaction Hooks
export {
  useTransactionHistory,
  useSendXCH,
  type TransactionRecord,
  type SendXCHConfig,
  type UseTransactionHistoryConfig,
  type UseSendXCHConfig,
  type UseTransactionHistoryResult,
  type UseSendXCHResult
} from './hooks/useTransactions';

// Wallet Info & Address Hooks
export {
  useWalletInfo,
  useAddressValidation,
  useMnemonic,
  type WalletInfo,
  type AddressValidation,
  type UseWalletInfoConfig,
  type UseAddressValidationConfig,
  type UseWalletInfoResult,
  type UseAddressValidationResult
} from './hooks/useWalletInfo';

// Utility Hooks
export {
  useChiaUtils,
  useFormatting,
  useCalculations,
  type CoinIdCalculation,
  type FormatOptions,
  type CoinSelection,
  type UseChiaUtilsResult,
  type UseFormattingResult,
  type UseCalculationsResult
} from './hooks/useChiaUtils';

// Central Provider (Optional - for shared state)
export {
  ChiaWalletProvider,
  useChiaWalletContext,
  useChiaWalletState,
  useChiaWalletActions,
  type ChiaWalletState,
  type ChiaWalletActions,
  type ChiaWalletProviderConfig,
  type ChiaWalletContextValue
} from './hooks/useChiaWalletProvider';

// Hydrated Coins Provider
export { 
  HydratedCoinsProvider, 
  useHydratedCoinsContext, 
  useCoinsAvailable, 
  useCoinsByType,
  type HydratedCoinsProviderProps,
  type HydratedCoinsContextValue
} from './components/HydratedCoinsProvider';

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
} from './hooks/useDialogs';

// Components - Individual Modal Components
export { SendFundsModal } from './components/SendFundsModal';
export { ReceiveFundsModal } from './components/ReceiveFundsModal';
export { MakeOfferModal } from './components/MakeOfferModal';
export { ActiveOffersModal } from './components/ActiveOffersModal';
export { NFTDetailsModal } from './components/NFTDetailsModal';
 
 

// Components - Main Wallet Components
export { ChiaWalletButton } from './components/ChiaWalletButton';
export { ChiaWalletModal } from './components/ChiaWalletModal';
export { ChiaWalletModalWithProvider } from './components/ChiaWalletModalWithProvider';

// Bridge Components
export { ChiaWalletBridge } from './components/ChiaWalletBridge';

// Simplified Dialog Manager (New Easy API)
export {
  ChiaWalletDialogManager,
  ChiaWalletDialogsWrapper,
  type ChiaWalletDialogConfig
} from './components/ChiaWalletDialogManager';

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
} from './components/GlobalDialogProvider';

// Types
export type { SentTransaction, SavedOffer } from './components/types'; 