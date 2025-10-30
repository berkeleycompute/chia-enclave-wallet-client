// Ambient BigInt type for environments where lib may not include bigint at type-check time
declare const BigInt: (value: string | number | bigint) => bigint;
// Export client classes
export { 
  ChiaCloudWalletClient,
  // Export buffer conversion utilities (for signSpendBundle - no 0x prefix)
  bufferToHexWithoutPrefix,
  bufferToHexWithPrefix,
  convertCoinBufferToSnakeCase,
  convertCoinSpendBufferToSnakeCase,
  convertCoinSpendBuffersToSnakeCase,
  // Export string to buffer conversion utilities
  hexStringToBuffer,
  convertCoinSpendToBuffer,
  convertCoinSpendsToBuffer,
  // Export string conversion utilities without 0x prefix (for signSpendBundle specifically)
  convertCoinToSnakeCaseWithoutPrefix,
  convertCoinSpendToSnakeCaseWithoutPrefix,
  convertCoinSpendsToSnakeCaseWithoutPrefix
} from './client/ChiaCloudWalletClient';
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

// Export utility functions
export { 
  convertIpfsUrl, 
  extractIpfsCid, 
  isIpfsUrl, 
  convertIpfsUrls,
  getBestImageUrl
} from './utils/ipfs';

// Export hooks
export { useChiaWallet } from './hooks/useChiaWallet';
export { useBalance } from './hooks/useBalance';
export { useWalletInfo } from './hooks/useWalletInfo';
export { useNFTs } from './hooks/useNFTs';
export { useChiaUtils } from './hooks/useChiaUtils';
export { useChiaTransactions } from './hooks/useChiaTransactions';
export { useHydratedCoins } from './hooks/useHydratedCoins';
export { useMintNFT, useNFTMintMetadata } from './hooks/useMintNFT';
export { useChiaNFTMint, useChiaNFTMetadata, encodeLauncherIdAsNftAddress } from './hooks/useChiaNFTMint';
export { useTwinNFTMint } from './hooks/useTwinNFTMint';
export { useTransferAssets } from './hooks/useTransferAssets';
export { useUploadFile } from './hooks/useUploadFile';
export { useOfferHistory, useActiveOffers, useCompletedOffers, OFFER_STATUS } from './hooks/useOfferHistory';
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
export { ViewAssetsModal } from './components/ViewAssetsModal';
export { TransactionsModal } from './components/TransactionsModal';
export { TakeOfferWidget } from './components/TakeOfferWidget';

// Export example components
export {
  ChiaNFTMintExample,
  SimpleChiaNFTMintExample,
  StreamlinedChiaNFTMintForm
} from './examples/ChiaNFTMintExample';
export { TwinNFTMintExample } from './examples/TwinNFTMintExample';
export { TransferAssetsExample } from './examples/TransferAssetsExample';
export { OfferHistoryExample, SimpleOfferHistoryExample } from './examples/OfferHistoryExample';

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
  UploadFileResponse,
  
  // Buffer-based spend bundle types
  CoinSpendBuffer,
  CoinBuffer,
  
  // Signing response types
  SignSpendBundleApiResponse,

  // Twin NFT types
  TwinNFTMintRequest,
  TwinNFTMintResponse,
  TwinNFTChiaMetadata,
  TwinNFTInchainMetadata,
  TwinNFTSignedSpendBundle,
  TwinNFTEVMNFT,

  // Transfer Asset types
  XchTransfer,
  CatTransfer,
  NftTransfer,
  MakeUnsignedTransferRequest,
  MakeUnsignedTransferResponse,
  TransferAssetsRequest,
  TransferAssetsResponse,

  // Offer History types
  GetOfferHistoryResponse,
  OfferHistoryItem,
  OfferCollection,
  OfferNFTData,
  OfferNFTPreview,
  OfferAsset,
  OfferRequestedAsset,
  OfferMempool
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

// Export Twin NFT mint hook types
export type {
  TwinNFTMintRecord,
  UseTwinNFTMintConfig,
  UseTwinNFTMintResult
} from './hooks/useTwinNFTMint';

// Export Transfer Assets hook types
export type {
  TransferRecord,
  UseTransferAssetsConfig,
  UseTransferAssetsResult
} from './hooks/useTransferAssets';

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

// Export DID hooks and types
export { useDIDs, useFirstDID } from './hooks/useDIDs';
export type {
  UseDIDsConfig,
  UseDIDsResult
} from './hooks/useDIDs';
export type { DIDInfo } from './client/ChiaCloudWalletClient';

// Export Offer History hook types
export type {
  UseOfferHistoryConfig,
  UseOfferHistoryResult,
  OfferStatus
} from './hooks/useOfferHistory';


export { NFTMintDebugger } from './examples/NFTMintDebugger';
export { NFTMintWithSigningExample } from './examples/NFTMintWithSigningExample'; 

