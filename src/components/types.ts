import type {
  HydratedCoin,
  SimpleMakeUnsignedNFTOfferRequest,
  TakeOfferResponse
} from '../client/ChiaCloudWalletClient';

export interface SentTransaction {
  id: string;
  type: 'outgoing';
  amount: number;
  recipient: string;
  fee: number;
  timestamp: number;
  status: 'pending' | 'confirmed';
  transactionId?: string;
  blockchainStatus?: string;
}

export interface SavedOffer {
  id: string;
  timestamp: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  nft: {
    coin: HydratedCoin;
    metadata?: any;
    name: string;
    collection: string;
    edition?: string;
    imageUrl?: string;
  };
  requestedPayment: {
    amount: number;
    assetId: string;
    assetName: string;
    depositAddress: string;
  };
  offerData: {
    offerString: string;
    isSigned: boolean;
  };
  originalRequest: SimpleMakeUnsignedNFTOfferRequest;
}

// Shared wallet state type for passing between components
export interface UnifiedWalletState {
  isConnected: boolean;
  publicKey: string | null;
  syntheticPublicKey: string | null;
  address: string | null;
  totalBalance: number;
  coinCount: number;
  formattedBalance: string;
  error: string | null;
  isConnecting?: boolean;
}

// Utility function to create UnifiedWalletState from external data
export const createUnifiedWalletState = (options: {
  isConnected?: boolean;
  publicKey?: string | null;
  syntheticPublicKey?: string | null;
  address?: string | null;
  totalBalance?: number;
  coinCount?: number;
  formattedBalance?: string;
  error?: string | null;
  isConnecting?: boolean;
}): UnifiedWalletState => {
  return {
    isConnected: options.isConnected ?? false,
    publicKey: options.publicKey ?? null,
    syntheticPublicKey: options.syntheticPublicKey ?? null,
    address: options.address ?? null,
    totalBalance: options.totalBalance ?? 0,
    coinCount: options.coinCount ?? 0,
    formattedBalance: options.formattedBalance ?? '0.000000',
    error: options.error ?? null,
    isConnecting: options.isConnecting ?? false,
  };
};

// Take Offer Widget Types
export interface TakeOfferResult {
  transactionId: string;
  status: string;
  message?: string;
  offerString: string;
  timestamp: number;
}

export interface SelectedCoin {
  coin: HydratedCoin;
  amount: number;
  displayName: string;
  type: 'XCH' | 'CAT' | 'NFT';
  assetId?: string;
}

export interface OfferAnalysis {
  isValid: boolean;
  requiredXCH: number;
  requiredCATs: Array<{
    assetId: string;
    amount: number;
    name?: string;
  }>;
  offeredNFTs: Array<{
    launcherId: string;
    amount: number;
  }>;
  estimatedValue: number;
  error?: string;
}

export interface TakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOfferString?: string;
  onOfferTaken?: (result: TakeOfferResult) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
  showAdvancedOptions?: boolean;
}

// Dexie-specific Take Offer Widget Types
export interface DexieOfferData {
  offer: {
    id: string;
    offer: string; // offer string
    status: number;
    date_completed?: string;
    date_found: string;
    price: number;
    offered: Array<{
      id: string;
      amount: number;
      code: string;
      name: string;
      is_nft?: boolean;
      collection?: { name: string };
    }>;
    requested: Array<{
      id: string;
      amount: number;
      code: string;
      name: string;
      is_nft?: boolean;
      collection?: { name: string };
    }>;
    output_coins: Record<string, Array<{ amount: number }>>;
  };
}

export interface DexieOfferResult {
  transactionId: string;
  status: string;
  offerData: DexieOfferData;
}

export interface TakeOfferWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  dexieOfferData: DexieOfferData;
  onOfferTaken?: (result: DexieOfferResult) => void;
  onError?: (error: string) => void;
  jwtToken?: string;
}

export interface DexieSelectedCoin {
  coin: HydratedCoin;
  amount: number;
  displayName: string;
}