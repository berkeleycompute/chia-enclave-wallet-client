import { 
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