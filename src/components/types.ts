import type {
  HydratedCoin,
  SimpleMakeUnsignedNFTOfferRequest
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

// Dexie API types
export interface DexieCoin {
  id: string;
  amount: number;
  puzzle_hash: string;
  parent_coin_info: string;
  inner_puzzle_hash?: string;
}

export interface DexieOfferAsset {
  id: string;
  code: string;
  name: string;
  amount: number;
}

export interface DexieOfferData {
  success: boolean;
  offer: {
    id: string;
    status: number;
    offer: string; // The offer string
    date_found: string;
    date_completed?: string;
    date_pending?: string;
    price: number;
    offered: DexieOfferAsset[];
    requested: DexieOfferAsset[];
    fees: number;
    input_coins: {
      [assetId: string]: DexieCoin[];
    };
    output_coins: {
      [assetId: string]: DexieCoin[];
    };
  };
}

// TakeOfferWidget props
export interface TakeOfferWidgetProps {
  dexieOfferId: string;
  onOfferTaken?: (result: {
    transactionId: string;
    status: string;
    offerData: DexieOfferData;
  }) => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Selected coins for spending
export interface SelectedCoinInfo {
  coin: HydratedCoin;
  amount: number;
  displayName: string;
} 