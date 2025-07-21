export interface ErrorResult {
    success: false;
    error: string;
    details?: unknown;
}
export interface SuccessResult<T> {
    success: true;
    data: T;
}
export type Result<T> = SuccessResult<T> | ErrorResult;
export interface ChiaCloudWalletConfig {
    baseUrl?: string;
    jwtToken?: string;
    enableLogging?: boolean;
}
export interface Coin {
    parentCoinInfo: string;
    puzzleHash: string;
    amount: string;
}
interface RawCoin {
    parent_coin_info: string;
    puzzle_hash: string;
    amount: string;
}
type CoinInput = Coin | RawCoin | any;
/**
 * Utility function to normalize coin objects from snake_case to camelCase format
 * Handles both API response format (snake_case) and client format (camelCase)
 */
export declare function normalizeCoin(coin: CoinInput): Coin;
/**
 * Utility function to normalize an array of coins
 */
export declare function normalizeCoins(coins: CoinInput[]): Coin[];
export interface CoinSpend {
    coin: Coin;
    puzzle_reveal: string;
    solution: string;
}
export interface Payment {
    address: string;
    amount: string | number;
}
export interface SignSpendBundleRequest {
    spend_bundle_hex?: string;
    coin_spends?: CoinSpend[];
}
export interface SendXCHRequest {
    payments: Payment[];
    selected_coins: Coin[];
    fee: string | number;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface HealthCheckResponse {
    status: string;
    timestamp: string;
}
export interface PublicKeyResponse {
    success: boolean;
    address: string;
    email: string;
    master_public_key: string;
    puzzle_hash: string;
    synthetic_public_key: string;
    user_id: string;
}
export interface MnemonicResponse {
    success: boolean;
    mnemonic: string;
    warning: string;
}
export interface SignedSpendBundleResponse {
    success: boolean;
    signed_spend_bundle: {
        coin_spends: CoinSpend[];
        aggregated_signature: string;
    };
}
export interface SendXCHResponse {
    success: boolean;
    signed_spend_bundle: {
        coin_spends: CoinSpend[];
        aggregated_signature: string;
    };
}
export interface TransactionPayload {
    coin_spends?: CoinSpend[];
    selected_coins?: Coin[];
    payments?: Payment[];
    fee?: string;
}
export interface BroadcastSpendBundleRequest {
    coinSpends: CoinSpend[];
    signature: string;
}
export interface GetPublicKeyRequest {
    transaction_payload: Record<string, unknown>;
}
export interface UnspentCoinsResponse {
    success: boolean;
    data: {
        coins: Coin[];
    };
}
export interface DriverInfo {
    assetId?: string;
    type?: 'CAT' | 'NFT';
    coin?: Coin;
    info?: {
        currentOwner?: string | null;
        launcherId?: string;
        metadata?: {
            dataHash?: string;
            dataUris?: string[];
            editionNumber?: string;
            editionTotal?: string;
            licenseHash?: string;
            licenseUris?: string[];
            metadataHash?: string;
            metadataUris?: string[];
        };
        metadataUpdaterPuzzleHash?: string;
        p2PuzzleHash?: string;
        royaltyPuzzleHash?: string;
        royaltyTenThousandths?: number | null;
    };
    proof?: {
        lineageProof?: any | null;
    };
}
export interface ParentSpendInfo {
    coin: Coin;
    driverInfo: DriverInfo | null;
    parentCoinId: string;
    spentBlockIndex: number;
}
export interface HydratedCoin {
    coin: Coin;
    createdHeight: string;
    parentSpendInfo: ParentSpendInfo;
}
export interface UnspentHydratedCoinsResponse {
    success: boolean;
    data: HydratedCoin[];
}
export interface BroadcastResponse {
    transaction_id: string;
    status: string;
}
export interface CatPayment {
    asset_id: string;
    puzzle_hash: string;
    amount: number;
}
export interface XchPayment {
    puzzle_hash: string;
    amount: number;
}
export interface SimpleCatPayment {
    asset_id: string;
    deposit_address: string;
    amount: number;
}
export interface SimpleXchPayment {
    deposit_address: string;
    amount: number;
}
export interface SimpleRequestedPayments {
    cats?: SimpleCatPayment[];
    xch?: SimpleXchPayment[];
}
export interface RequestedPayments {
    cats?: CatPayment[];
    xch?: XchPayment[];
}
export interface MakeUnsignedNFTOfferRequest {
    synthetic_public_key: string;
    requested_payments: RequestedPayments;
    nft_data: HydratedCoin;
}
export interface SimpleMakeUnsignedNFTOfferRequest {
    requested_payments: SimpleRequestedPayments;
    nft_data: HydratedCoin;
}
export interface MakeUnsignedNFTOfferResponse {
    success: boolean;
    data: {
        unsigned_offer_string: string;
    };
}
export interface SignOfferRequest {
    offer: string;
}
export interface SignOfferResponse {
    success: boolean;
    email: string;
    signed_offer: string;
    user_id: string;
}
export interface StoredOffer {
    id: string;
    unsigned_offer: string;
    signed_offer: string;
    email: string;
    user_id: string;
    created_at: string;
    status: 'pending' | 'accepted' | 'cancelled';
}
export declare class ChiaCloudWalletApiError extends Error {
    statusCode?: number | undefined;
    response?: unknown | undefined;
    constructor(message: string, statusCode?: number | undefined, response?: unknown | undefined);
}
export declare class ChiaCloudWalletClient {
    private baseUrl;
    private jwtToken?;
    private enableLogging;
    constructor(config?: ChiaCloudWalletConfig);
    /**
     * Log errors if logging is enabled
     */
    private logError;
    /**
     * Log info messages if logging is enabled
     */
    private logInfo;
    /**
     * Set the JWT token for authentication
     */
    setJwtToken(token: string): void;
    /**
     * Get the current JWT token
     */
    getJwtToken(): string | undefined;
    /**
     * Make an authenticated API request with enhanced error handling
     */
    private makeRequest;
    /**
     * Health check endpoint with error handling
     */
    healthCheck(): Promise<Result<HealthCheckResponse>>;
    /**
     * Get public key from JWT token with error handling
     */
    getPublicKey(): Promise<Result<PublicKeyResponse>>;
    /**
     * Export mnemonic phrase with error handling
     */
    exportMnemonic(): Promise<Result<MnemonicResponse>>;
    /**
     * Sign a spend bundle with error handling
     */
    signSpendBundle(request: SignSpendBundleRequest): Promise<Result<SignedSpendBundleResponse>>;
    /**
     * Create and sign a send XCH transaction with error handling
     */
    sendXCH(request: SendXCHRequest): Promise<Result<SendXCHResponse>>;
    /**
     * Get unspent hydrated coins for a given public key (includes additional metadata)
     */
    getUnspentHydratedCoins(publicKey: string): Promise<Result<UnspentHydratedCoinsResponse>>;
    /**
     * Sign an offer with error handling
     */
    signOffer(request: SignOfferRequest): Promise<Result<SignOfferResponse>>;
    /**
     * Create an unsigned NFT offer with error handling
     */
    makeUnsignedNFTOffer(request: MakeUnsignedNFTOfferRequest): Promise<Result<MakeUnsignedNFTOfferResponse>>;
    /**
     * Broadcast a signed spend bundle with error handling
     */
    broadcastSpendBundle(request: BroadcastSpendBundleRequest): Promise<Result<BroadcastResponse>>;
    /**
     * Convenience method to broadcast a signed spend bundle from a SignedSpendBundleResponse or SendXCHResponse
     */
    broadcastSignedSpendBundle(signedBundle: SignedSpendBundleResponse | SendXCHResponse): Promise<Result<BroadcastResponse>>;
    /**
     * Complete transaction flow: create, sign, and broadcast XCH transaction
     */
    sendAndBroadcastXCH(request: SendXCHRequest): Promise<Result<BroadcastResponse>>;
    /**
     * Utility method to convert a Chia address to puzzle hash using bech32m decoding
     */
    static convertAddressToPuzzleHash(address: string): Result<string>;
    /**
     * Utility function to extract simple coins from hydrated coins
     * This helps with migration from getUnspentCoins to getUnspentHydratedCoins
     */
    static extractCoinsFromHydratedCoins(hydratedCoins: HydratedCoin[]): Coin[];
    /**
     * Get wallet balance using hydrated coins (enhanced version)
     */
    getWalletBalanceEnhanced(publicKey: string): Promise<Result<{
        totalBalance: number;
        coinCount: number;
        xchCoins: HydratedCoin[];
        catCoins: HydratedCoin[];
        nftCoins: HydratedCoin[];
    }>>;
    /**
     * Utility method to convert XCH to mojos with error handling
     */
    static xchToMojos(xchAmount: number): Result<string>;
    /**
     * Utility method to convert mojos to XCH with error handling
     */
    static mojosToXCH(mojos: string | number): Result<number>;
    /**
     * Safe version of the original utility methods for backward compatibility
     */
    static xchToMojosUnsafe(xchAmount: number): string;
    static mojosToXCHUnsafe(mojos: string | number): number;
    /**
     * Statically calculate a coin's ID
     * Coin ID = SHA256(parent_coin_info + puzzle_hash + amount)
     * @param coin The coin to calculate the ID for
     * @returns Promise<Result<string>> The coin ID as a hex string
     */
    static calculateCoinId(coin: CoinInput): Promise<Result<string>>;
    /**
     * Calculate coin IDs for multiple coins
     * @param coins Array of coins to calculate IDs for
     * @returns Promise<Result<{coin: Coin, coinId: string}[]>> Array of coins with their IDs
     */
    static calculateCoinIds(coins: (CoinInput | any)[]): Promise<Result<{
        coin: Coin;
        coinId: string;
    }[]>>;
    /**
     * Utility method to validate a coin ID format
     * @param coinId The coin ID to validate
     * @returns boolean Whether the coin ID is valid
     */
    static isValidCoinId(coinId: string): boolean;
}
export declare const chiaCloudWalletClient: ChiaCloudWalletClient;
export {};
