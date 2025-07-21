import { ChiaCloudWalletClient, type PublicKeyResponse, type HydratedCoin, type Coin } from '../client/ChiaCloudWalletClient.ts';
export interface UseChiaWalletConfig {
    baseUrl?: string;
    enableLogging?: boolean;
    autoConnect?: boolean;
}
export interface WalletState {
    isConnected: boolean;
    isConnecting: boolean;
    jwtToken: string | null;
    publicKey: string | null;
    publicKeyData: PublicKeyResponse | null;
    syntheticPublicKey: string | null;
    balance: number;
    coinCount: number;
    unspentCoins: Coin[];
    hydratedCoins: HydratedCoin[];
    balanceLoading: boolean;
    error: string | null;
    balanceError: string | null;
    lastSuccessfulRefresh: number;
}
export interface UseChiaWalletResult extends WalletState {
    client: ChiaCloudWalletClient;
    setJwtToken: (token: string | null) => void;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    refreshWallet: () => Promise<void>;
    formatBalance: (balance: number) => string;
    formatAddress: (address: string) => string;
}
export declare function useChiaWallet(config?: UseChiaWalletConfig): UseChiaWalletResult;
