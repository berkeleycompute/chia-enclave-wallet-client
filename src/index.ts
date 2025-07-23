// ===== NEW SIMPLIFIED API (RECOMMENDED) =====

// Unified SDK - The main client class with built-in state management
export { 
  ChiaWalletSDK,
  type ChiaWalletSDKConfig,
  type WalletState,
  type WalletEventType,
  type EventListener
} from './client/ChiaWalletSDK';

// Unified Wallet Client - High-level client combining SDK and state (RECOMMENDED)
export { UnifiedWalletClient } from './client/UnifiedWalletClient';

// Simple Provider - Easy React context setup
export { 
  ChiaWalletSDKProvider,
  useChiaWalletSDK,
  useOptionalChiaWalletSDK,
  type ChiaWalletSDKProviderProps
} from './providers/ChiaWalletSDKProvider';

// Simplified Hooks - Easy reactive wallet functionality
export {
  useWalletState,
  useWalletConnection,
  useWalletBalance,
  useWalletCoins,
  useSendTransaction,
  useNFTOffers,
  useWalletEvents,
  useRawSDK,
  useUnifiedWalletState,
  useUnifiedWalletClient
} from './hooks/useChiaWalletSDK';

// ===== LEGACY API (FOR BACKWARD COMPATIBILITY) =====

// Legacy Client
export { 
  ChiaCloudWalletClient,
  type HydratedCoin,
  type Coin
} from './client/ChiaCloudWalletClient';

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
} from './hooks/useChiaWalletProvider.tsx';

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

// Components - Individual Modal Components (Legacy - see new simplified components above)
export { ReceiveFundsModal } from './components/ReceiveFundsModal';
export { MakeOfferModal } from './components/MakeOfferModal';
export { ActiveOffersModal } from './components/ActiveOffersModal';
export { NFTDetailsModal } from './components/NFTDetailsModal';
 
 

// ===== NEW SIMPLIFIED COMPONENTS (RECOMMENDED) =====

// Main Components (use these for new projects)
export { ChiaWalletButton } from './components/ChiaWalletButton'; 

// Modal Components (refactored for new SDK)
export { SendFundsModal } from './components/SendFundsModal';

// ===== LEGACY COMPONENTS (FOR BACKWARD COMPATIBILITY) =====

// Legacy Components (still available but not recommended for new projects)
export { ChiaWalletModal } from './components/ChiaWalletModal';
export { ChiaWalletModalWithProvider } from './components/ChiaWalletModalWithProvider';



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

// Types and Utilities
export type { SentTransaction, SavedOffer, UnifiedWalletState } from './components/types';
export { createUnifiedWalletState } from './components/types';

// ===== EXAMPLES =====

// Examples showing different usage patterns
export { UnifiedWalletExample } from './examples/UnifiedWalletExample'; 