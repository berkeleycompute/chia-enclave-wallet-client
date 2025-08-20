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
      nft_data?: {
        data_uris?: string[];
        metadata_uris?: string[];
        license_uris?: string[];
        [key: string]: any;
      };
    }>;
    requested: Array<{
      id: string;
      amount: number;
      code: string;
      name: string;
      is_nft?: boolean;
      collection?: { name: string };
      nft_data?: {
        data_uris?: string[];
        metadata_uris?: string[];
        license_uris?: string[];
        [key: string]: any;
      };
    }>;
    output_coins: Record<string, Array<{ amount: number }>>;
  };
}

export interface DexieOfferResult {
  transactionId: string;
  status: string;
  offerData: DexieOfferData;
}

export interface NFTMetadata {
  format?: string;
  minting_tool?: string;
  name?: string;
  description?: string;
  sensitive_content?: boolean;
  series_number?: number;
  series_total?: number;
  custom_metadata_version?: string;
  collection?: {
    name?: string;
    id?: string;
    attributes?: Array<{
      type: string;
      value: string;
    }>;
  };
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  data_uris?: string[];
  metadata_uris?: string[];
  license_uris?: string[];
}

export interface TakeOfferWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  dexieOfferData: DexieOfferData;
  onOfferTaken?: (result: DexieOfferResult) => void;
  onError?: (error: string) => void;
  jwtToken?: string;
  nftMetadata?: NFTMetadata; // Optional metadata override
  imageUrl?: string; // Optional image URL override
}

export interface DexieSelectedCoin {
  coin: HydratedCoin;
  amount: number;
  displayName: string;
}