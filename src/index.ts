// Chia Enclave Wallet Client - React Library
// Export client
export {
  ChiaCloudWalletClient,
  ChiaCloudWalletApiError,
  chiaCloudWalletClient,
  normalizeCoin,
  normalizeCoins,
} from './client/ChiaCloudWalletClient.ts';

// Export hooks
export { useChiaWallet } from './hooks/useChiaWallet.ts';
export { useChiaTransactions } from './hooks/useChiaTransactions.ts';

// Export components
export { ChiaWalletButton } from './components/ChiaWalletButton.tsx';
export { ChiaWalletModal } from './components/ChiaWalletModal.tsx';

// Export types and interfaces
export type {
  // Client types
  ChiaCloudWalletConfig,
  Coin,
  CoinSpend,
  Payment,
  HydratedCoin,
  DriverInfo,
  ParentSpendInfo,
  PublicKeyResponse,
  MnemonicResponse,
  SignedSpendBundleResponse,
  SendXCHResponse,
  UnspentHydratedCoinsResponse,
  BroadcastResponse,
  Result,
  ErrorResult,
  SuccessResult,
} from './client/ChiaCloudWalletClient.ts';

// Export hook types
export type {
  UseChiaWalletConfig,
  UseChiaWalletResult,
  WalletState,
} from './hooks/useChiaWallet.ts';

export type {
  UseChiaTransactionsResult,
  TransactionRecord,
} from './hooks/useChiaTransactions.ts';

// Export component types  
export type {
  ChiaWalletButtonProps,
} from './components/ChiaWalletButton.tsx';

export type {
  ChiaWalletModalProps,
} from './components/ChiaWalletModal.tsx'; 