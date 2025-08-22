// Export client classes
export { ChiaCloudWalletClient } from './client/ChiaCloudWalletClient';
export { UnifiedWalletClient } from './client/UnifiedWalletClient';
export { 
  ChiaNFTMintService, 
  getChiaNFTMintService, 
  configureChiaNFTMintService,
  mintChiaNFT,
  mintChiaNFTFromEVM,
  getChiaNFTMintStatus,
  getChiaNFTMintingStats
} from './client/ChiaNFTMintService';

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
export { useMintNFT, useNFTMintMetadata } from './hooks/useMintNFT';
export { useChiaNFTMint, useChiaNFTMetadata } from './hooks/useChiaNFTMint';
export { useUploadFile } from './hooks/useUploadFile';
export { ChiaWalletProvider } from './hooks/useChiaWalletProvider';
export {
  // Core wallet hooks
  useWalletState,
  useWalletConnection,
  useWalletBalance,
  useWalletCoins,
  useWalletEvents,
  useRawSDK,

  // Transaction hooks
  useSendTransaction,
  useTakeOffer,
  useNFTOffers,

  // Unified client hooks
  useUnifiedWalletClient,
  useUnifiedWalletState
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

// Export example components
export { 
  ChiaNFTMintExample, 
  SimpleChiaNFTMintExample,
  StreamlinedChiaNFTMintForm
} from './examples/ChiaNFTMintExample';

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
  // Core wallet types
  HydratedCoin,
  SendXCHRequest,
  SimpleMakeUnsignedNFTOfferRequest,

  // Offer types
  TakeOfferRequest,
  TakeOfferResponse,
  ParsedOfferData,
  BroadcastOfferRequest,
  BroadcastOfferResponse,
  
  // Decode offer types
  DecodeOfferRequest,
  DecodeOfferResponse,
  ApiSpendBundle,
  ApiCoinSpend,
  
  // NFT minting types
  MintNFTRequest,
  MintNFTResponse,
  NFTMintMetadata,
  NFTMint,
  MintCoinInput,
  
  // File upload types
  UploadFileResponse
} from './client/ChiaCloudWalletClient';
// Export SDK class and types
export { ChiaWalletSDK } from './client/ChiaWalletSDK';
export type {
  WalletState,
  WalletEventType
} from './client/ChiaWalletSDK';

// Export component types
export type {
  SentTransaction,
  SavedOffer,
  DexieOfferData,
  DexieOfferResult,
  TakeOfferWidgetProps,
  DexieSelectedCoin,
  NFTMetadata,
} from './components/types';

// Export mint hook types
export type {
  SimpleMintConfig,
  MintTransactionRecord,
  UseMintNFTConfig,
  UseMintNFTResult
} from './hooks/useMintNFT';

// Export Chia NFT mint hook types
export type {
  ChiaNFTMintConfig,
  ChiaNFTMintRecord,
  UseChiaNFTMintConfig,
  UseChiaNFTMintResult
} from './hooks/useChiaNFTMint';

// Export Chia NFT mint service types
export type {
  ChiaNFTMintRequest,
  ChiaNFTMintResponse,
  ChiaNFTMintStatus,
  ChiaNFTMintServiceConfig
} from './client/ChiaNFTMintService';

// Export upload hook types
export type {
  UseUploadFileConfig,
  UseUploadFileResult,
  UploadResult
} from './hooks/useUploadFile'; 

