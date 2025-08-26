// Chia Cloud Wallet API Client for React

// Add bech32m import for address conversion
import { bech32m } from 'bech32';

// Add error result type for better error handling
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
  environment?: 'development' | 'production' | 'test';
  // Flag to disable environment-based URL detection and use explicit baseUrl
  disableEnvironmentDetection?: boolean;
}

export interface Coin {
  parentCoinInfo: string;
  puzzleHash: string;
  amount: string;
}

// Raw coin interface that matches API responses (snake_case)
interface RawCoin {
  parent_coin_info: string;
  puzzle_hash: string;
  amount: string;
}

// Snake case coin interface for consistent API communication
export interface CoinSnakeCase {
  parent_coin_info: string;
  puzzle_hash: string;
  amount: number;
}

// Snake case coin spend interface for consistent API communication
export interface CoinSpendSnakeCase {
  coin: CoinSnakeCase;
  puzzle_reveal: string;
  solution: string;
}

// Type that can be either format
type CoinInput = Coin | RawCoin | CoinSnakeCase | any;

/**
 * Utility function to normalize coin objects from snake_case to camelCase format
 * Handles both API response format (snake_case) and client format (camelCase)
 */
export function normalizeCoin(coin: CoinInput): Coin {
  return {
    parentCoinInfo: coin.parentCoinInfo || coin.parent_coin_info,
    puzzleHash: coin.puzzleHash || coin.puzzle_hash,
    amount: coin.amount
  };
}

/**
 * Utility function to normalize an array of coins
 */
export function normalizeCoins(coins: CoinInput[]): Coin[] {
  return coins.map(normalizeCoin);
}

/**
 * Utility function to ensure hex string has 0x prefix
 */
export function ensureHexPrefix(hexString: string): string {
  if (!hexString) return hexString;
  return hexString.startsWith('0x') ? hexString : `0x${hexString}`;
}

/**
 * Utility function to convert coin from camelCase to snake_case format
 */
export function convertCoinToSnakeCase(coin: CoinInput): CoinSnakeCase {
  const normalizedCoin = normalizeCoin(coin);
  const result = {
    parent_coin_info: ensureHexPrefix(normalizedCoin.parentCoinInfo),
    puzzle_hash: ensureHexPrefix(normalizedCoin.puzzleHash),
    amount: typeof normalizedCoin.amount === 'string' ? parseInt(normalizedCoin.amount) : normalizedCoin.amount
  };
  return result;
}

/**
 * Utility function to convert CoinSpend to snake_case format
 */
export function convertCoinSpendToSnakeCase(coinSpend: CoinSpend): CoinSpendSnakeCase {
  return {
    coin: convertCoinToSnakeCase(coinSpend.coin),
    puzzle_reveal: ensureHexPrefix(coinSpend.puzzle_reveal),
    solution: ensureHexPrefix(coinSpend.solution)
  };
}

/**
 * Utility function to convert array of CoinSpends to snake_case format
 */
export function convertCoinSpendsToSnakeCase(coinSpends: CoinSpend[]): CoinSpendSnakeCase[] {
  return coinSpends.map(convertCoinSpendToSnakeCase);
}

/**
 * Utility function to convert ApiCoinSpend to CoinSpendSnakeCase format
 */
export function convertApiCoinSpendToSnakeCase(apiCoinSpend: ApiCoinSpend): CoinSpendSnakeCase {
  return {
    coin: convertCoinToSnakeCase(apiCoinSpend.coin),
    puzzle_reveal: ensureHexPrefix(apiCoinSpend.puzzle_reveal),
    solution: ensureHexPrefix(apiCoinSpend.solution)
  };
}

/**
 * Utility function to convert array of ApiCoinSpends to snake_case format
 */
export function convertApiCoinSpendsToSnakeCase(apiCoinSpends: ApiCoinSpend[]): CoinSpendSnakeCase[] {
  return apiCoinSpends.map(convertApiCoinSpendToSnakeCase);
}

export interface CoinSpend {
  coin: Coin;
  puzzle_reveal: string;
  solution: string;
}

// Interface for CoinSpend as returned by decode-offer API (snake_case format)
export interface ApiCoinSpend {
  coin: Coin;
  puzzle_reveal: string;
  solution: string;
}

export interface Payment {
  address: string;
  amount: string | number;
}

// Updated interfaces to match API specification
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

// Legacy interfaces for backward compatibility
export interface TransactionPayload {
  coin_spends?: CoinSpend[];
  selected_coins?: Coin[];
  payments?: Payment[];
  fee?: string;
}

export interface BroadcastSpendBundleRequest {
  coin_spends: CoinSpendSnakeCase[];
  aggregated_signature: string;
}

export interface BroadcastOfferRequest {
  offer_string: string;
}

export interface BroadcastOfferResponse {
  message: string;
  success: boolean;
}

// New interfaces for decode offer functionality
export interface DecodeOfferRequest {
  offer_string: string;
}

export interface SpendBundle {
  coinSpends: CoinSpend[];
  aggregatedSignature: string;
}

// Interface for spend bundle as returned by decode-offer API (snake_case format)
export interface ApiSpendBundle {
  coin_spends: ApiCoinSpend[];
  aggregated_signature: string;
}

export interface DecodeOfferResponse {
  success: boolean;
  data: {
    spend_bundle: ApiSpendBundle;
    spend_bundle_hex: string;
  };
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

// New interfaces for hydrated coins
export interface DriverInfo {
  assetId?: string;
  type?: 'CAT' | 'NFT' | 'DID';
  coin?: Coin;
  info?: {
    // NFT-specific info
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
    } | string; // DID metadata is a string, NFT metadata is an object
    metadataUpdaterPuzzleHash?: string;
    p2PuzzleHash?: string;
    royaltyPuzzleHash?: string;
    royaltyTenThousandths?: number | null;
    // DID-specific info
    recoveryListHash?: string | null;
    numVerificationsRequired?: string;
  };
  proof?: {
    lineageProof?: any | null;
    // DID-specific proof
    parent_parent_coin_info?: string;
    parent_inner_puzzle_hash?: string;
    parent_amount?: string;
  };
}

export interface ParentSpendInfo {
  coin: Coin;
  driverInfo: DriverInfo | null;
  parentCoinId: string;
  spentBlockIndex: number;
  puzzleReveal?: string;
  solution?: string;
}

export interface HydratedCoin {
  coin: Coin;
  coinId: string;
  createdHeight: string;
  spentHeight: string | null;
  parentSpendInfo: ParentSpendInfo;
}

export interface UnspentHydratedCoinsResponse {
  success: boolean;
  // Always normalized to be directly the array after processing
  data: HydratedCoin[];
}

export interface BroadcastResponse {
  transaction_id: string;
  status: string;
}

// NFT Offer interfaces
export interface CatPayment {
  asset_id: string;
  puzzle_hash: string;
  amount: number;
}

export interface XchPayment {
  puzzle_hash: string;
  amount: number;
}

// New simplified interfaces for external use
export interface SimpleCatPayment {
  asset_id: string;
  deposit_address: string;
  amount: number;
}

export interface SimpleXchPayment {
  deposit_address: string;
  amount: number;
}

// New simplified interfaces for external use
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
  cat_payments: CatPayment[];
  nft_json: HydratedCoin;
}

// New simplified request interface
export interface SimpleMakeUnsignedNFTOfferRequest {
  requested_payments: SimpleRequestedPayments;
  nft_json: HydratedCoin;
}

export interface MakeUnsignedNFTOfferResponse {
  success: boolean;
  offer_string: string;
  message?: string;
}

// Add new interfaces for signing offers
export interface SignOfferRequest {
  offer: string;
}

export interface SignOfferResponse {
  success: boolean;
  email: string;
  signed_offer: string;
  user_id: string;
}

// Interface for storing signed offers in localStorage
export interface StoredOffer {
  id: string;
  unsigned_offer: string;
  signed_offer: string;
  email: string;
  user_id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'cancelled';
}

// Take offer interfaces
export interface TakeOfferRequest {
  offer_string: string;
  synthetic_public_key: string;
  xch_coins: string[]; // array of coin ids
  cat_coins: string[]; // array of CAT coin ids
  fee: number;
}

export interface TakeOfferResponse {
  success: boolean;
  transaction_id: string;
  status: string;
  unsigned_offer: string;
  message?: string;
}

// Interface for parsing offer data to extract CAT requirements
export interface ParsedOfferData {
  success: boolean;
  data?: {
    cat_coins?: {
      asset_id: string;
      amount: number;
    }[];
    xch_coins?: {
      amount: number;
    }[];
    nft_coins?: {
      launcher_id: string;
      amount: number;
    }[];
  };
  error?: string;
}

// DID interfaces
export interface DIDInfo {
  did_id: string;
  coin: Coin;
  coinId: string;
  createdHeight: string;
  spentHeight: string | null;
  parentSpendInfo: ParentSpendInfo;
  // DID-specific metadata
  recoveryListHash?: string | null;
  numVerificationsRequired?: string;
  metadata?: string;
  currentOwner?: string | null;
  launcherId?: string;
}

export interface GetDIDsResponse {
  success: boolean;
  data: DIDInfo[];
}

// File upload interfaces
export interface UploadFileRequest {
  file: File;
}

export interface UploadFileResponse {
  success: boolean;
  hash: string;
  url: string;
  error: string | null;
  details: string[];
}

// NFT minting interfaces
export interface NFTMintMetadata {
  edition_number: number;
  edition_total: number;
  data_uris: string[];
  data_hash: string;
  metadata_uris: string[];
  metadata_hash: string;
  license_uris: string[];
  license_hash: string;
}

export interface NFTMint {
  metadata: NFTMintMetadata;
  p2_puzzle_hash: string;
  royalty_puzzle_hash?: string | null;
  royalty_basis_points: number;
}

// MintCoinInput interface for minting (matches Rust struct)
export interface MintCoinInput {
  parent_coin_info: string;
  puzzle_hash: string;
  amount: string;
}

export interface MintNFTRequest {
  /// Mnemonic words for signing (alternative to synthetic_public_key)
  mnemonic_words?: string | null;
  /// Optional passphrase for mnemonic (defaults to empty string)  
  mnemonic_passphrase?: string;
  /// Synthetic public key (48 bytes hex) - optional when mnemonic is provided
  synthetic_public_key?: string | null;
  /// Coins to use for minting (user-provided, no automatic selection)
  selected_coins: MintCoinInput[];
  /// Optional: if provided, the service will fetch and use this coin id as the input coin,
  /// avoiding any external coin lineage scans. Should be a 32-byte hex (0x-prefixed) coin id.
  last_spendable_coin_id?: string | null;
  /// Optional DID coin ID for DID-owned NFTs
  did_id?: string | null;
  /// NFT mints (array to support bulk minting like Sage)
  mints: NFTMint[];
  /// Transaction fee in mojos
  fee?: number;
}

export interface MintNFTResponse {
  success: boolean;
  signed_spend_bundle?: {
    coin_spends: CoinSpend[];
    aggregated_signature: string;
  };
  transaction_id?: string;
  message?: string;
  error?: string;
}

export class ChiaCloudWalletApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ChiaCloudWalletApiError';
  }
}

export class ChiaCloudWalletClient {
  private baseUrl: string;
  private jwtToken?: string;
  private enableLogging: boolean;
  private environment: 'development' | 'production' | 'test';

  constructor(config: ChiaCloudWalletConfig = {}) {
    this.environment = config.environment || this.detectEnvironment();

    // Prioritize environment detection unless explicitly disabled
    if (config.disableEnvironmentDetection && config.baseUrl) {
      // Use explicit baseUrl when environment detection is disabled
      this.baseUrl = config.baseUrl;
    } else {
      // Always use environment-based URL detection by default
      this.baseUrl = this.getBaseUrlForEnvironment();
    }

    this.jwtToken = config.jwtToken;
    this.enableLogging = config.enableLogging ?? true;

    // Log the final configuration for debugging
    if (this.enableLogging) {
      console.log(`[ChiaCloudWalletClient] Initialized with environment: ${this.environment}, baseUrl: ${this.baseUrl}, disableEnvDetection: ${config.disableEnvironmentDetection}`);
    }
  }

  /**
   * Detect the current environment from Vite build variables or fallbacks
   */
  private detectEnvironment(): 'development' | 'production' | 'test' {
    // Check for Vite environment variable (available at build time)
    // Vite will replace import.meta.env.VITE_ENV with the actual value during build
    try {
      // @ts-ignore - import.meta.env is available in Vite environments
      const viteEnv = (import.meta.env.VITE_ENV as string);
      console.log('Vite Env:', viteEnv);
      if (typeof viteEnv === 'string') {
        if (viteEnv === 'prod') return 'production';
        if (viteEnv === 'dev') return 'development';
        if (viteEnv === 'test') return 'test';
      }
    } catch {
      // Ignore errors when import.meta.env is not available
    }

    // Fallback to hostname detection for development
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      }
    }

    // Default to test environment as requested
    return 'test';
  }

  /**
   * Get the base URL for the current environment
   */
  private getBaseUrlForEnvironment(): string {
    console.log('Environment:', this.environment);
    switch (this.environment) {
      case 'development':
        return 'https://qugucpyccrhmsusuvpvz.supabase.co/functions/v1';
      case 'production':
        return 'https://aedugkfqljpfirjylfvq.supabase.co/functions/v1';
      case 'test':
        return 'https://qugucpyccrhmsusuvpvz.supabase.co/functions/v1'; // Original endpoints for test
      default:
        return 'https://qugucpyccrhmsusuvpvz.supabase.co/functions/v1'; // Default to test
    }
  }

  /**
   * Log errors if logging is enabled
   */
  private logError(message: string, error?: unknown): void {
    if (this.enableLogging) {
      console.error(`[ChiaCloudWalletClient] ${message}`, error);
    }
  }

  /**
   * Log info messages if logging is enabled
   */
  private logInfo(message: string, data?: unknown): void {
    if (this.enableLogging) {
      console.info(`[ChiaCloudWalletClient] ${message}`, data);
    }
  }

  /**
   * Set the JWT token for authentication
   */
  setJwtToken(token: string): void {
    this.jwtToken = token;
  }

  /**
   * Get the current JWT token
   */
  getJwtToken(): string | undefined {
    return this.jwtToken;
  }

  /**
   * Set the base URL for API requests
   */
  setBaseUrl(url: string): void {
    // Remove trailing slash if present for consistency
    this.baseUrl = url.replace(/\/$/, '');
    this.logInfo(`Base URL updated to: ${this.baseUrl}`);
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the current environment
   */
  getEnvironment(): 'development' | 'production' | 'test' {
    return this.environment;
  }

  /**
   * Set the environment and update base URL accordingly
   */
  setEnvironment(environment: 'development' | 'production' | 'test'): void {
    this.environment = environment;
    this.baseUrl = this.getBaseUrlForEnvironment();
    this.logInfo(`Environment updated to: ${environment}, Base URL: ${this.baseUrl}`);
  }

  /**
   * Get the correct endpoint path based on environment
   */
  private getEndpoint(testPath: string, prodPath: string): string {
    return this.environment === 'test' ? testPath : prodPath;
  }

  /**
   * Convert API format CoinSpend to internal format
   */
  private convertApiCoinSpendToInternal(apiCoinSpend: ApiCoinSpend): CoinSpend {
    return {
      coin: apiCoinSpend.coin,
      puzzle_reveal: apiCoinSpend.puzzle_reveal,
      solution: apiCoinSpend.solution
    };
  }

  /**
   * Convert API format SpendBundle to internal format
   */
  private convertApiSpendBundleToInternal(apiSpendBundle: ApiSpendBundle): SpendBundle {
    return {
      coinSpends: apiSpendBundle.coin_spends.map(coinSpend => this.convertApiCoinSpendToInternal(coinSpend)),
      aggregatedSignature: apiSpendBundle.aggregated_signature
    };
  }

  /**
   * Normalize HydratedCoin for API calls - ensures correct data types and structure
   */
  private normalizeHydratedCoinForApi(coin: HydratedCoin): any {
    return {
      coin: {
        // Main coin amount should be a string
        amount: String(coin.coin.amount),
        // Remove 0x prefixes from hex strings
        parentCoinInfo: coin.coin.parentCoinInfo.replace(/^0x/, ''),
        puzzleHash: coin.coin.puzzleHash.replace(/^0x/, '')
      },
      // Ensure createdHeight is a string
      createdHeight: String(coin.createdHeight),
      // Include coinId (remove 0x prefix if present)
      coinId: coin.coinId ? coin.coinId.replace(/^0x/, '') : coin.coinId,
      parentSpendInfo: {
        coin: {
          // Parent spend info coin amount should be u64 (integer)
          amount: parseInt(coin.parentSpendInfo.coin.amount),
          // Remove 0x prefixes from hex strings
          parentCoinInfo: coin.parentSpendInfo.coin.parentCoinInfo.replace(/^0x/, ''),
          puzzleHash: coin.parentSpendInfo.coin.puzzleHash.replace(/^0x/, '')
        },
        driverInfo: coin.parentSpendInfo.driverInfo,
        // Remove 0x prefix from parentCoinId
        parentCoinId: coin.parentSpendInfo.parentCoinId.replace(/^0x/, ''),
        puzzleReveal: coin.parentSpendInfo.puzzleReveal,
        solution: coin.parentSpendInfo.solution,
        spentBlockIndex: coin.parentSpendInfo.spentBlockIndex
      }
    };
  }

  /**
   * Normalize UnspentHydratedCoinsResponse to handle different response formats between environments
   */
  private async normalizeHydratedCoinsResponse(response: UnspentHydratedCoinsResponse): Promise<HydratedCoin[]> {
    let rawCoins: any[] = [];

    // Check if data is directly an array (this is the actual format from the edge endpoint)
    if (Array.isArray(response.data)) {
      rawCoins = response.data;
    }
    // Check if data has nested data property (legacy format)
    else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      rawCoins = (response.data as { data: any[] }).data;
    }
    else {
      // Fallback to empty array if structure is unexpected
      console.warn('Unexpected hydrated coins response structure:', response);
      return [];
    }

    // Normalize each coin to ensure consistent types and calculate coinId
    const normalizedCoins = await Promise.all(rawCoins.map(async (coin: any) => {
      const normalizedCoin = {
        ...coin,
        coin: {
          ...coin.coin,
          amount: String(coin.coin.amount) // Ensure amount is always a string
        },
        parentSpendInfo: {
          ...coin.parentSpendInfo,
          coin: {
            ...coin.parentSpendInfo.coin,
            amount: String(coin.parentSpendInfo.coin.amount) // Ensure amount is always a string
          }
        }
      };

      // Calculate coinId if not already present
      if (!normalizedCoin.coinId) {
        try {
          const coinIdResult = await ChiaCloudWalletClient.calculateCoinId(normalizedCoin.coin);
          if (coinIdResult.success) {
            normalizedCoin.coinId = coinIdResult.data;
          } else {
            console.warn('Failed to calculate coinId for coin:', (coinIdResult as any).error);
            // Fallback to a deterministic but simple identifier
            normalizedCoin.coinId = `${normalizedCoin.coin.parentCoinInfo}_${normalizedCoin.coin.puzzleHash}`.replace(/^0x/g, '').substring(0, 64);
          }
        } catch (error) {
          console.warn('Error calculating coinId for coin:', error);
          // Fallback to a deterministic but simple identifier
          normalizedCoin.coinId = `${normalizedCoin.coin.parentCoinInfo}_${normalizedCoin.coin.puzzleHash}`.replace(/^0x/g, '').substring(0, 64);
        }
      }

      return normalizedCoin;
    }));

    return normalizedCoins;
  }

  /**
   * Make an authenticated API request with enhanced error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {

    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (requireAuth) {
        if (!this.jwtToken) {
          throw new ChiaCloudWalletApiError('JWT token is required for this request');
        }
        headers['Authorization'] = `Bearer ${this.jwtToken}`;
      }

      this.logInfo(`Making request to ${endpoint}`, { method: options.method || 'GET' });

      // Add timeout and explicit redirect handling for robustness
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for API calls

      const response = await fetch(url, {
        ...options,
        headers,
        redirect: 'follow', // Explicitly follow redirects
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error = new ChiaCloudWalletApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorText
        );
        this.logError(`Request failed for ${endpoint}`, error);
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        this.logInfo(`Request successful for ${endpoint}`);
        return result;
      } else {
        const result = await response.text() as T;
        this.logInfo(`Request successful for ${endpoint}`);
        return result;
      }
    } catch (error) {
      if (error instanceof ChiaCloudWalletApiError) {
        throw error;
      }

      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ChiaCloudWalletApiError(
          `Request timed out for ${endpoint}`,
          408, // Request Timeout
          error
        );
        this.logError(`Request timed out for ${endpoint}`, timeoutError);
        throw timeoutError;
      }

      const networkError = new ChiaCloudWalletApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error
      );
      this.logError(`Network error for ${endpoint}`, networkError);
      throw networkError;
    }
  }

  /**
   * Make a file upload request with enhanced error handling
   */
  private async makeFileUploadRequest<T>(
    endpoint: string,
    formData: FormData,
    requireAuth: boolean = false
  ): Promise<T> {
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    try {
      const headers: any = {
        // Don't set Content-Type for FormData - let the browser set it with boundary
        ...{}
      };

      if (requireAuth) {
        if (!this.jwtToken) {
          throw new ChiaCloudWalletApiError('JWT token is required for this request');
        }
        headers['Authorization'] = `Bearer ${this.jwtToken}`;
      }

      this.logInfo(`Making file upload request to ${endpoint}`);

      // Add timeout and explicit redirect handling for robustness
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for file uploads

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error = new ChiaCloudWalletApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorText
        );
        this.logError(`File upload request failed for ${endpoint}`, error);
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        this.logInfo(`File upload request successful for ${endpoint}`);
        return result;
      } else {
        const result = await response.text() as T;
        this.logInfo(`File upload request successful for ${endpoint}`);
        return result;
      }
    } catch (error) {
      if (error instanceof ChiaCloudWalletApiError) {
        throw error;
      }

      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ChiaCloudWalletApiError(
          `File upload request timed out for ${endpoint}`,
          408, // Request Timeout
          error
        );
        this.logError(`File upload request timed out for ${endpoint}`, timeoutError);
        throw timeoutError;
      }

      const networkError = new ChiaCloudWalletApiError(
        `Network error during file upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error
      );
      this.logError(`Network error for file upload to ${endpoint}`, networkError);
      throw networkError;
    }
  }

  /**
   * Health check endpoint with error handling
   */
  async healthCheck(): Promise<Result<HealthCheckResponse>> {
    try {
      const endpoint = this.getEndpoint('/health', '/api/health');
      const result = await this.makeRequest<HealthCheckResponse>(endpoint, {
        method: 'GET',
      }, false);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        details: error
      };
    }
  }

  /**
   * Get public key from JWT token with error handling
   */
  async getPublicKey(): Promise<Result<PublicKeyResponse>> {
    // Debug logging to track calls
    const timestamp = new Date().toISOString();
    const stack = new Error().stack?.split('\n')[2]?.trim() || 'unknown';

    try {
      const endpoint = 'https://qugucpyccrhmsusuvpvz.supabase.co/functions/v1/api/enclave/public-key';
      const result = await this.makeRequest<PublicKeyResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return { success: true, data: result };
    } catch (error) {
      console.error(`❌ [${timestamp}] getPublicKey() failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get public key',
        details: error
      };
    }
  }

  /**
   * Export mnemonic phrase with error handling
   */
  async exportMnemonic(): Promise<Result<MnemonicResponse>> {
    try {
      const endpoint = this.getEndpoint('/mnemonic', '/api/enclave/export-mnemonic');
      const result = await this.makeRequest<MnemonicResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export mnemonic',
        details: error
      };
    }
  }

  /**
   * Sign a spend bundle with error handling
   */
  async signSpendBundle(request: SignSpendBundleRequest): Promise<Result<SignedSpendBundleResponse>> {
    try {
      if (!request.spend_bundle_hex && (!request.coin_spends || request.coin_spends.length === 0)) {
        throw new ChiaCloudWalletApiError('Either spend_bundle_hex or coin_spends are required for signing');
      }

      // Normalize coin spends if provided
      let normalizedRequest = request;
      if (request.coin_spends && request.coin_spends.length > 0) {
        normalizedRequest = {
          ...request,
          coin_spends: request.coin_spends.map(coinSpend => ({
            ...coinSpend,
            coin: normalizeCoin(coinSpend.coin)
          }))
        };
      }

      const endpoint = this.getEndpoint('/wallet/transaction/sign', '/api/enclave/sign-spendbundle');
      const result = await this.makeRequest<SignedSpendBundleResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(normalizedRequest),
      });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign spend bundle',
        details: error
      };
    }
  }

  /**
   * Create and sign a send XCH transaction with error handling
   */
  async sendXCH(request: SendXCHRequest): Promise<Result<SendXCHResponse>> {
    try {
      if (!request.selected_coins || request.selected_coins.length === 0) {
        throw new ChiaCloudWalletApiError('Selected coins are required for sending XCH');
      }
      if (!request.payments || request.payments.length === 0) {
        throw new ChiaCloudWalletApiError('Payments are required for sending XCH');
      }

      // Normalize all selected coins to ensure consistent format
      const normalizedRequest = {
        ...request,
        selected_coins: normalizeCoins(request.selected_coins)
      };

      const endpoint = this.getEndpoint('/wallet/transaction/send-xch', '/api/wallet/send-xch');
      const result = await this.makeRequest<SendXCHResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(normalizedRequest),
      });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send XCH',
        details: error
      };
    }
  }

  /**
   * Get DIDs for a specific address
   * @param address - The wallet address (not public key)
   */
  async getDIDs(address: string): Promise<Result<GetDIDsResponse>> {
    try {
      const result = await this.getUnspentHydratedCoins(address);
      if (!result.success) {
        return {
          success: false,
          error: `Failed to get DIDs: ${(result as any).error}`,
          details: result
        };
      }

      // Filter for DID coins and transform to DIDInfo format
      const didCoins: DIDInfo[] = [];

      for (const hydratedCoin of result.data.data) {
        const driverInfo = hydratedCoin.parentSpendInfo?.driverInfo;

        // Check if this is a DID coin
        if (driverInfo?.type === 'DID') {
          const didInfo: DIDInfo = {
            did_id: hydratedCoin.coinId, // Use coinId as did_id for now
            coin: hydratedCoin.coin,
            coinId: hydratedCoin.coinId,
            createdHeight: hydratedCoin.createdHeight,
            spentHeight: hydratedCoin.spentHeight,
            parentSpendInfo: hydratedCoin.parentSpendInfo,
            // Extract DID-specific info from driverInfo
            recoveryListHash: driverInfo.info?.recoveryListHash || null,
            numVerificationsRequired: driverInfo.info?.numVerificationsRequired || '1',
            metadata: typeof driverInfo.info?.metadata === 'string' ? driverInfo.info.metadata : undefined,
            currentOwner: driverInfo.info?.currentOwner || null,
            launcherId: driverInfo.info?.launcherId || undefined
          };

          didCoins.push(didInfo);
        }
      }

      this.logInfo('DIDs retrieved', {
        address: address.substring(0, 16) + '...',
        count: didCoins.length
      });

      return {
        success: true,
        data: {
          success: true,
          data: didCoins
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get DIDs',
        details: error
      };
    }
  }

  /**
   * Get unspent hydrated coins for a specific address
   * @param address - The wallet address (not public key)
   */
  async getUnspentHydratedCoins(address: string): Promise<Result<UnspentHydratedCoinsResponse>> {
    try {
      // const endpoint = this.getEndpoint(`/wallet/unspent-hydrated-coins/${address}`, `/api/wallet/hydrated-coins/${address}`); 
      const result = await this.makeRequest<UnspentHydratedCoinsResponse>(`https://edge.silicon-dev.net/chia/hydrated_coins_fetcher/hydrated-unspent-coins?address=${address}`, {
        method: 'GET',
      }, false);

      // Normalize the response to handle different formats between environments
      const normalizedCoins = await this.normalizeHydratedCoinsResponse(result);

      // Return consistent format with normalized data
      const normalizedResponse: UnspentHydratedCoinsResponse = {
        success: result.success,
        data: normalizedCoins
      };

      return { success: true, data: normalizedResponse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get unspent hydrated coins',
        details: error
      };
    }
  }

  /**
   * Sign an offer with error handling
   */
  async signOffer(request: SignOfferRequest): Promise<Result<SignOfferResponse>> {
    try {
      if (!request.offer || request.offer.trim() === '') {
        throw new ChiaCloudWalletApiError('Offer string is required for signing');
      }

      // Validate offer format (should start with "offer1")
      if (!request.offer.startsWith('offer1')) {
        throw new ChiaCloudWalletApiError('Invalid offer format: offer must start with "offer1"');
      }

      this.logInfo('Signing offer', {
        offerLength: request.offer.length,
        offerPrefix: request.offer.substring(0, 20) + '...'
      });

      const endpoint = this.getEndpoint('/wallet/transaction/sign-offer', '/api/enclave/sign-offer');
      const result = await this.makeRequest<SignOfferResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign offer',
        details: error
      };
    }
  }

  /**
   * Create an unsigned NFT offer with error handling
   */
  async makeUnsignedNFTOffer(request: MakeUnsignedNFTOfferRequest): Promise<Result<MakeUnsignedNFTOfferResponse>> {
    try {
      // Validate required fields
      if (!request.synthetic_public_key || request.synthetic_public_key.trim() === '') {
        throw new ChiaCloudWalletApiError('Synthetic public key is required');
      }

      if (!request.cat_payments || request.cat_payments.length === 0) {
        throw new ChiaCloudWalletApiError('CAT payments are required');
      }

      if (!request.nft_json) {
        throw new ChiaCloudWalletApiError('NFT data is required');
      }

      // Normalize NFT data for API call (correct data types and format)
      const normalizedNFTData = this.normalizeHydratedCoinForApi(request.nft_json);

      // Prepare the request with normalized data and correct structure
      const normalizedRequest = {
        synthetic_public_key: request.synthetic_public_key,
        nft_json: normalizedNFTData,
        cat_payments: request.cat_payments
      };

      this.logInfo('Making unsigned NFT offer request', {
        publicKey: request.synthetic_public_key.substring(0, 10) + '...',
        catPaymentsCount: request.cat_payments?.length || 0,
        nftCoinId: normalizedNFTData.coinId?.substring(0, 10) + '...',
        hasNftCoinId: !!normalizedNFTData.coinId
      });
      //  const endpoint = this.getEndpoint('/wallet/offer/make-unsigned-nft', '/api/wallet/make-unsigned-nft-offer');
      const result = await this.makeRequest<MakeUnsignedNFTOfferResponse>('https://edge.silicon-dev.net/chia/make_any_offer/make-offer', {

        method: 'POST',
        body: JSON.stringify(normalizedRequest),
      });

      // The API now returns a signed offer directly, so we need to adapt the response
      // to match what the existing code expects
      const adaptedResponse = {
        success: result.success,
        offer_string: result.offer_string,
        message: result.message
      };

      return { success: true, data: adaptedResponse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to make unsigned NFT offer',
        details: error
      };
    }
  }

  /**
   * Create and sign an NFT offer directly with error handling
   */
  async makeSignedNFTOffer(request: MakeUnsignedNFTOfferRequest): Promise<Result<SignOfferResponse>> {
    try {
      // Validate required fields
      if (!request.synthetic_public_key || request.synthetic_public_key.trim() === '') {
        throw new ChiaCloudWalletApiError('Synthetic public key is required');
      }

      if (!request.cat_payments || request.cat_payments.length === 0) {
        throw new ChiaCloudWalletApiError('CAT payments are required');
      }

      if (!request.nft_json) {
        throw new ChiaCloudWalletApiError('NFT data is required');
      }

      // Validate synthetic public key format (should be 96 hex characters)
      const cleanPublicKey = request.synthetic_public_key.replace(/^0x/, '');
      if (!/^[0-9a-fA-F]{96}$/.test(cleanPublicKey)) {
        throw new ChiaCloudWalletApiError('Invalid synthetic public key format: must be a 96-character hex string');
      }

      // Validate CAT payments
      for (const catPayment of request.cat_payments) {
        if (!catPayment.asset_id || !catPayment.puzzle_hash) {
          throw new ChiaCloudWalletApiError('Each CAT payment must have asset_id and puzzle_hash');
        }

        if (typeof catPayment.amount !== 'number' || catPayment.amount <= 0) {
          throw new ChiaCloudWalletApiError('Each CAT payment must have a positive amount');
        }

        // Validate hex string formats
        const cleanAssetId = catPayment.asset_id.replace(/^0x/, '');
        const cleanPuzzleHash = catPayment.puzzle_hash.replace(/^0x/, '');

        if (!/^[0-9a-fA-F]{64}$/.test(cleanAssetId)) {
          throw new ChiaCloudWalletApiError('Invalid asset_id format: must be a 64-character hex string');
        }

        if (!/^[0-9a-fA-F]{64}$/.test(cleanPuzzleHash)) {
          throw new ChiaCloudWalletApiError('Invalid puzzle_hash format: must be a 64-character hex string');
        }
      }

      this.logInfo('Making signed NFT offer request', {
        publicKey: request.synthetic_public_key.substring(0, 10) + '...',
        catPaymentsCount: request.cat_payments?.length || 0
      });

      // First create the unsigned offer
      const offerResult = await this.makeUnsignedNFTOffer(request);
      if (!offerResult.success) {
        throw new Error(`Failed to create offer: ${(offerResult as any).error}`);
      }


      const unsignedOfferString = offerResult.data.offer_string;

      if (!unsignedOfferString) {
        throw new Error('No offer string returned from API');
      }

      this.logInfo('Unsigned NFT offer created, now signing...', {
        offerLength: unsignedOfferString.length,
        offerPrefix: unsignedOfferString.substring(0, 20) + '...'
      });

      // Now sign the offer
      const signResult = await this.signOffer({ offer: unsignedOfferString });
      if (!signResult.success) {
        throw new Error(`Failed to sign offer: ${(signResult as any).error}`);
      }

      this.logInfo('NFT offer signed successfully', {
        offerLength: signResult.data.signed_offer.length,
        offerPrefix: signResult.data.signed_offer.substring(0, 20) + '...'
      });

      return { success: true, data: signResult.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to make signed NFT offer',
        details: error
      };
    }
  }

  /**
   * Create and sign an NFT offer directly with simplified request interface
   * This method converts addresses to puzzle hashes automatically
   */
  async makeSignedNFTOfferSimple(
    syntheticPublicKey: string,
    request: SimpleMakeUnsignedNFTOfferRequest
  ): Promise<Result<SignOfferResponse>> {
    try {
      // Convert simple request to full request format
      const fullRequest: MakeUnsignedNFTOfferRequest = {
        synthetic_public_key: syntheticPublicKey,
        cat_payments: [],
        nft_json: request.nft_json
      };

      // Convert CAT payments from addresses to puzzle hashes
      if (request.requested_payments.cats) {
        for (const catPayment of request.requested_payments.cats) {
          let puzzleHash: string;

          // Check if it's already a puzzle hash (64 hex characters) or a Chia address
          const cleanAddress = catPayment.deposit_address.replace(/^0x/, '');
          if (/^[0-9a-fA-F]{64}$/.test(cleanAddress)) {
            // It's already a puzzle hash
            puzzleHash = cleanAddress;
          } else {
            // It's a Chia address, convert it
            const puzzleHashResult = ChiaCloudWalletClient.convertAddressToPuzzleHash(catPayment.deposit_address);
            if (!puzzleHashResult.success) {
              throw new ChiaCloudWalletApiError(`Failed to convert CAT deposit address to puzzle hash: ${(puzzleHashResult as any).error}`);
            }
            puzzleHash = puzzleHashResult.data;
          }

          fullRequest.cat_payments.push({
            asset_id: catPayment.asset_id,
            puzzle_hash: puzzleHash,
            amount: catPayment.amount * 1000
          });
        }
      }

      // Note: XCH payments are not supported in the new API structure

      // Use the full makeSignedNFTOffer method
      return await this.makeSignedNFTOffer(fullRequest);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to make signed NFT offer (simple)',
        details: error
      };
    }
  }

  /**
   * Take/accept an existing offer
   * @param request - The take offer request containing the offer string
   */
  async takeOffer(request: TakeOfferRequest): Promise<Result<TakeOfferResponse>> {
    try {
      // Validate required fields
      if (!request.offer_string || request.offer_string.trim() === '') {
        throw new ChiaCloudWalletApiError('Offer string is required');
      }

      this.logInfo('Taking offer', {
        offerLength: request.offer_string.length,
        offerPrefix: request.offer_string.substring(0, 20) + '...'
      });

      // Convert arrays to comma-separated strings for API compatibility
      const apiRequest = {
        ...request,
      };

      const result = await this.makeRequest<TakeOfferResponse>('https://edge.silicon-dev.net/chia/take_unsigned_offer/take-offer', {
        method: 'POST',
        body: JSON.stringify(apiRequest),
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to take offer',
        details: error
      };
    }
  }

  /**
   * Parse an offer string to extract required CAT coins and other payment requirements
   * This is a utility method to help determine if a wallet has sufficient funds to take an offer
   * @param offerString - The offer string to parse
   */
  async parseOffer(offerString: string): Promise<Result<ParsedOfferData>> {
    try {
      if (!offerString || offerString.trim() === '') {
        throw new ChiaCloudWalletApiError('Offer string is required');
      }

      this.logInfo('Parsing offer', {
        offerLength: offerString.length,
        offerPrefix: offerString.substring(0, 20) + '...'
      });

      const result = await this.makeRequest<ParsedOfferData>('/wallet/offer/parse', {
        method: 'POST',
        body: JSON.stringify({ offer_string: offerString }),
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse offer',
        details: error
      };
    }
  }

  /**
   * Upload a file to IPFS for NFT creation
   * @param file - The file to upload
   */
  async uploadFile(file: File): Promise<Result<UploadFileResponse>> {
    try {
      if (!file) {
        throw new ChiaCloudWalletApiError('File is required for upload');
      }

      // Validate file size (optional, adjust as needed)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        throw new ChiaCloudWalletApiError(`File size too large: ${file.size} bytes (max: ${maxFileSize} bytes)`);
      }

      this.logInfo('Uploading file to IPFS', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Create FormData and append the file
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = 'https://edge.silicon-dev.net/chia/make_unsigned_nft_mint/upload-file';
      const result = await this.makeFileUploadRequest<UploadFileResponse>(endpoint, formData, false);

      this.logInfo('File uploaded successfully', {
        hash: result.hash,
        url: result.url
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
        details: error
      };
    }
  }

  /**
   * Mint an NFT with error handling
   * @param request - The mint NFT request containing metadata and coin selection
   */
  async mintNFT(request: MintNFTRequest): Promise<Result<MintNFTResponse>> {
    try {
      // Validate that either mnemonic_words or synthetic_public_key is provided
      if (!request.mnemonic_words && !request.synthetic_public_key) {
        throw new ChiaCloudWalletApiError('Either mnemonic_words or synthetic_public_key is required');
      }

      if (!request.selected_coins || request.selected_coins.length === 0) {
        throw new ChiaCloudWalletApiError('Selected coins are required');
      }

      if (!request.mints || request.mints.length === 0) {
        throw new ChiaCloudWalletApiError('At least one mint is required');
      }

      // Validate synthetic public key format if provided (should be 96 hex characters)
      if (request.synthetic_public_key) {
        const cleanPublicKey = request.synthetic_public_key.replace(/^0x/, '');
        if (!/^[0-9a-fA-F]{96}$/.test(cleanPublicKey)) {
          throw new ChiaCloudWalletApiError('Invalid synthetic public key format: must be a 96-character hex string');
        }
      }

      // Validate mnemonic if provided
      if (request.mnemonic_words) {
        const wordCount = request.mnemonic_words.trim().split(/\s+/).length;
        if (wordCount !== 12 && wordCount !== 24) {
          throw new ChiaCloudWalletApiError('Mnemonic must be 12 or 24 words');
        }
      }

      // Validate last_spendable_coin_id if provided
      if (request.last_spendable_coin_id) {
        const cleanCoinId = request.last_spendable_coin_id.replace(/^0x/, '');
        if (!/^[0-9a-fA-F]{64}$/.test(cleanCoinId)) {
          throw new ChiaCloudWalletApiError('Invalid last_spendable_coin_id format: must be a 64-character hex string');
        }
      }

      // Validate each mint
      for (const mint of request.mints) {
        if (!mint.metadata) {
          throw new ChiaCloudWalletApiError('Each mint must have metadata');
        }

        if (!mint.p2_puzzle_hash) {
          throw new ChiaCloudWalletApiError('Each mint must have a p2_puzzle_hash');
        }

        // Validate metadata structure
        const metadata = mint.metadata;
        if (!metadata.data_uris || metadata.data_uris.length === 0) {
          throw new ChiaCloudWalletApiError('Each mint must have at least one data_uri');
        }

        if (!metadata.metadata_uris || metadata.metadata_uris.length === 0) {
          throw new ChiaCloudWalletApiError('Each mint must have at least one metadata_uri');
        }

        if (!metadata.data_hash || !metadata.metadata_hash) {
          throw new ChiaCloudWalletApiError('Each mint must have data_hash and metadata_hash');
        }

        // Validate hash formats (should be 64 hex characters)
        const cleanDataHash = metadata.data_hash.replace(/^0x/, '');
        const cleanMetadataHash = metadata.metadata_hash.replace(/^0x/, '');
        const cleanLicenseHash = metadata.license_hash.replace(/^0x/, '');

        if (!/^[0-9a-fA-F]{64}$/.test(cleanDataHash)) {
          throw new ChiaCloudWalletApiError('Invalid data_hash format: must be a 64-character hex string');
        }

        if (!/^[0-9a-fA-F]{64}$/.test(cleanMetadataHash)) {
          throw new ChiaCloudWalletApiError('Invalid metadata_hash format: must be a 64-character hex string');
        }

        if (!/^[0-9a-fA-F]{64}$/.test(cleanLicenseHash)) {
          throw new ChiaCloudWalletApiError('Invalid license_hash format: must be a 64-character hex string');
        }

        // Validate puzzle hash format
        const cleanPuzzleHash = mint.p2_puzzle_hash.replace(/^0x/, '');
        if (!/^[0-9a-fA-F]{64}$/.test(cleanPuzzleHash)) {
          throw new ChiaCloudWalletApiError('Invalid p2_puzzle_hash format: must be a 64-character hex string');
        }

        // Validate royalty puzzle hash if provided
        if (mint.royalty_puzzle_hash) {
          const cleanRoyaltyHash = mint.royalty_puzzle_hash.replace(/^0x/, '');
          if (!/^[0-9a-fA-F]{64}$/.test(cleanRoyaltyHash)) {
            throw new ChiaCloudWalletApiError('Invalid royalty_puzzle_hash format: must be a 64-character hex string');
          }
        }

        // Validate royalty basis points (should be 0-10000)
        if (mint.royalty_basis_points < 0 || mint.royalty_basis_points > 10000) {
          throw new ChiaCloudWalletApiError('Royalty basis points must be between 0 and 10000 (0-100%)');
        }
      }

      // Validate selected coins
      for (const coin of request.selected_coins) {
        if (!coin.parent_coin_info || !coin.puzzle_hash || !coin.amount) {
          throw new ChiaCloudWalletApiError('Each selected coin must have parent_coin_info, puzzle_hash, and amount');
        }

        // Validate hex formats
        const cleanParentInfo = coin.parent_coin_info.replace(/^0x/, '');
        const cleanPuzzleHash = coin.puzzle_hash.replace(/^0x/, '');

        if (!/^[0-9a-fA-F]{64}$/.test(cleanParentInfo)) {
          throw new ChiaCloudWalletApiError('Invalid parent_coin_info format: must be a 64-character hex string');
        }

        if (!/^[0-9a-fA-F]{64}$/.test(cleanPuzzleHash)) {
          throw new ChiaCloudWalletApiError('Invalid puzzle_hash format: must be a 64-character hex string');
        }

        // Validate amount is positive
        const amount = typeof coin.amount === 'string' ? parseInt(coin.amount) : coin.amount;
        if (amount <= 0) {
          throw new ChiaCloudWalletApiError('Each selected coin must have a positive amount');
        }
      }

      this.logInfo('Minting NFT', {
        publicKey: request.synthetic_public_key ? request.synthetic_public_key.substring(0, 10) + '...' : 'using mnemonic',
        hasMnemonic: !!request.mnemonic_words,
        mintsCount: request.mints.length,
        selectedCoinsCount: request.selected_coins.length,
        fee: request.fee || 'default',
        lastSpendableCoinId: request.last_spendable_coin_id ? request.last_spendable_coin_id.substring(0, 10) + '...' : 'not specified'
      });

      const endpoint = 'https://edge.silicon-dev.net/chia/offers_encoder_decoder/encode-offer';
      const result = await this.makeRequest<MintNFTResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(request),
      }, false);

      this.logInfo('NFT minted successfully', {
        success: result.success,
        transactionId: result.transaction_id,
        message: result.message
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mint NFT',
        details: error
      };
    }
  }

  /**
   * Broadcast a signed spend bundle with error handling
   */
  async broadcastSpendBundle(request: BroadcastSpendBundleRequest): Promise<Result<BroadcastResponse>> {
    try {

      if (!request.coin_spends || request.coin_spends.length === 0) {
        throw new ChiaCloudWalletApiError('Coin spends are required for broadcasting');
      }
      if (!request.aggregated_signature) {
        throw new ChiaCloudWalletApiError('Signature is required for broadcasting');
      }

      // The coin_spends are already in snake_case format, but we need to ensure coins are properly normalized
      const normalizedCoinSpends = request.coin_spends.map(coinSpend => {
        return {
          ...coinSpend,
          coin: convertCoinToSnakeCase(coinSpend.coin)
        };
      });

      const processedSignature = ensureHexPrefix(request.aggregated_signature);

      const endpoint = 'https://edge.silicon-dev.net/chia/chia_public_api/broadcast';
      const result = await this.makeRequest<BroadcastResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          coin_spends: normalizedCoinSpends,
          aggregated_signature: processedSignature
        }),
      });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast spend bundle',
        details: error
      };
    }
  }

  /**
   * Decode an offer string to extract the spend bundle
   */
  async decodeOffer(request: DecodeOfferRequest): Promise<Result<DecodeOfferResponse>> {
    try {
      if (!request.offer_string || request.offer_string.trim() === '') {
        throw new ChiaCloudWalletApiError('Offer string is required for decoding');
      }

      // Validate offer format (should start with "offer1")
      if (!request.offer_string.startsWith('offer1')) {
        throw new ChiaCloudWalletApiError('Invalid offer format: offer must start with "offer1"');
      }

      this.logInfo('Decoding offer', {
        offerLength: request.offer_string.length,
        offerPrefix: request.offer_string.substring(0, 20) + '...'
      });

      const result = await this.makeRequest<DecodeOfferResponse>('https://edge.silicon-dev.net/chia/offers_encoder_decoder/decode-offer', {
        method: 'POST',
        body: JSON.stringify(request),
      }, false);

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decode offer',
        details: error
      };
    }
  }

  /**
   * Broadcast an offer with error handling (refactored to decode first, then broadcast spend bundle)
   */
  async broadcastOffer(request: BroadcastOfferRequest): Promise<Result<BroadcastOfferResponse>> {
    try {
      if (!request.offer_string || request.offer_string.trim() === '') {
        throw new ChiaCloudWalletApiError('Offer string is required for broadcasting');
      }

      // Validate offer format (should start with "offer1")
      if (!request.offer_string.startsWith('offer1')) {
        throw new ChiaCloudWalletApiError('Invalid offer format: offer must start with "offer1"');
      }

      this.logInfo('Broadcasting offer - starting decode process', {
        offerLength: request.offer_string.length,
        offerPrefix: request.offer_string.substring(0, 20) + '...'
      });

      // Step 1: Decode the offer to get the spend bundle
      const decodeResult = await this.decodeOffer({ offer_string: request.offer_string });
      if (!decodeResult.success) {
        throw new ChiaCloudWalletApiError(`Failed to decode offer: ${decodeResult.error}`);
      }

      const apiSpendBundle = decodeResult.data.data.spend_bundle;

      this.logInfo('Offer decoded successfully, converting format and broadcasting spend bundle', {
        coinSpendsCount: apiSpendBundle.coin_spends.length,
        signatureLength: apiSpendBundle.aggregated_signature.length
      });

      // Convert API format to internal format
      const internalSpendBundle = this.convertApiSpendBundleToInternal(apiSpendBundle);

      // Step 2: Broadcast the spend bundle using the normal channel
      const broadcastResult = await this.broadcastSpendBundle({
        coin_spends: convertApiCoinSpendsToSnakeCase(apiSpendBundle.coin_spends),
        aggregated_signature: apiSpendBundle.aggregated_signature
      });

      if (!broadcastResult.success) {
        throw new ChiaCloudWalletApiError(`Failed to broadcast spend bundle: ${broadcastResult.error}`);
      }

      // Convert the broadcast response to match the expected BroadcastOfferResponse format
      const offerBroadcastResponse: BroadcastOfferResponse = {
        success: true,
        message: `Offer broadcast successful. Transaction ID: ${broadcastResult.data.transaction_id}`
      };

      return { success: true, data: offerBroadcastResponse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast offer',
        details: error
      };
    }
  }

  /**
   * Convenience method to broadcast a signed spend bundle from a SignedSpendBundleResponse or SendXCHResponse
   */
  async broadcastSignedSpendBundle(signedBundle: SignedSpendBundleResponse | SendXCHResponse): Promise<Result<BroadcastResponse>> {
    try {
      if (!signedBundle.success) {
        throw new ChiaCloudWalletApiError('Cannot broadcast failed transaction');
      }

      const { coin_spends, aggregated_signature } = signedBundle.signed_spend_bundle;

      return await this.broadcastSpendBundle({
        coin_spends: convertCoinSpendsToSnakeCase(coin_spends),
        aggregated_signature: aggregated_signature
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast signed spend bundle',
        details: error
      };
    }
  }

  /**
   * Complete transaction flow: create, sign, and broadcast XCH transaction
   */
  async sendAndBroadcastXCH(request: SendXCHRequest): Promise<Result<BroadcastResponse>> {
    try {
      // First, create and sign the transaction
      const signedResult = await this.sendXCH(request);
      if (!signedResult.success) {
        return {
          success: false,
          error: `Failed to sign transaction: ${(signedResult as any).error}`,
          details: (signedResult as any).details
        };
      }

      // Then broadcast the signed transaction
      const broadcastResult = await this.broadcastSignedSpendBundle(signedResult.data);
      if (!broadcastResult.success) {
        return {
          success: false,
          error: `Failed to broadcast transaction: ${(broadcastResult as any).error}`,
          details: (broadcastResult as any).details
        };
      }

      return broadcastResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send and broadcast XCH',
        details: error
      };
    }
  }

  /**
   * Utility method to convert a Chia address to puzzle hash using bech32m decoding
   */
  public static convertAddressToPuzzleHash(address: string): Result<string> {
    try {
      // Basic validation
      if (!address || typeof address !== 'string') {
        return {
          success: false,
          error: 'Address must be a non-empty string'
        };
      }

      // Decode bech32m address
      const decoded = bech32m.decode(address);

      // Validate prefix
      if (decoded.prefix !== 'xch') {
        return {
          success: false,
          error: 'Invalid address prefix: must be "xch"'
        };
      }

      // Validate word length (52 5-bit words for a 32-byte puzzle hash)
      if (decoded.words.length !== 52) {
        return {
          success: false,
          error: `Invalid address data length: expected 52 words, got ${decoded.words.length}`
        };
      }

      // Convert 5-bit words to 8-bit bytes
      const bytes = bech32m.fromWords(decoded.words);

      // Convert bytes to hex string
      const puzzleHash = Array.from(bytes)
        .map(b => {
          const hex = b.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('');

      return {
        success: true,
        data: puzzleHash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert address to puzzle hash',
        details: error
      };
    }
  }

  /**
   * Utility function to extract simple coins from hydrated coins
   * This helps with migration from getUnspentCoins to getUnspentHydratedCoins
   */
  static extractCoinsFromHydratedCoins(hydratedCoins: HydratedCoin[]): Coin[] {
    return hydratedCoins.map(hydratedCoin => hydratedCoin.coin);
  }

  /**
   * Get wallet balance using hydrated coins (enhanced version)
   * @param address - The wallet address
   */
  async getWalletBalanceEnhanced(address: string): Promise<Result<{
    totalBalance: number;
    coinCount: number;
    xchCoins: HydratedCoin[];
    catCoins: HydratedCoin[];
    nftCoins: HydratedCoin[];
  }>> {
    try {
      const hydratedResult = await this.getUnspentHydratedCoins(address);
      if (!hydratedResult.success) {
        return {
          success: false,
          error: `Failed to get enhanced balance: ${(hydratedResult as any).error}`
        };
      }

      let totalBalance = 0;
      const xchCoins: HydratedCoin[] = [];
      const catCoins: HydratedCoin[] = [];
      const nftCoins: HydratedCoin[] = [];

      for (const hydratedCoin of hydratedResult.data.data) {
        try {
          totalBalance += parseInt(hydratedCoin.coin.amount);

          // Categorize coins by type
          const driverInfo = hydratedCoin.parentSpendInfo.driverInfo;
          if (driverInfo?.type === 'CAT') {
            catCoins.push(hydratedCoin);
          } else if (driverInfo?.type === 'NFT') {
            nftCoins.push(hydratedCoin);
          } else {
            xchCoins.push(hydratedCoin);
          }
        } catch (error) {
          this.logError(`Invalid coin amount in enhanced balance calculation: ${hydratedCoin.coin.amount}`, error);
          // Continue with other coins instead of failing entirely
        }
      }

      return {
        success: true,
        data: {
          totalBalance,
          coinCount: hydratedResult.data.data.length,
          xchCoins,
          catCoins,
          nftCoins
        }
      };
    } catch (error) {
      this.logError('Error in getWalletBalanceEnhanced', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get enhanced wallet balance',
        details: error
      };
    }
  }

  /**
   * Utility method to convert XCH to mojos with error handling
   */
  static xchToMojos(xchAmount: number): Result<string> {
    try {
      if (typeof xchAmount !== 'number' || isNaN(xchAmount) || xchAmount < 0) {
        return {
          success: false,
          error: 'Invalid XCH amount'
        };
      }

      const MOJOS_PER_XCH = 1000000000000; // 1 XCH = 1 trillion mojos
      const mojos = Math.round(xchAmount * MOJOS_PER_XCH);
      return { success: true, data: mojos.toString() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert XCH to mojos',
        details: error
      };
    }
  }

  /**
   * Utility method to convert mojos to XCH with error handling
   */
  static mojosToXCH(mojos: string | number): Result<number> {
    try {
      const MOJOS_PER_XCH = 1000000000000;
      const mojosAmount = typeof mojos === 'string' ? parseInt(mojos) : mojos;
      const xchAmount = mojosAmount / MOJOS_PER_XCH;

      if (isNaN(xchAmount)) {
        return {
          success: false,
          error: 'Invalid mojos amount'
        };
      }

      return { success: true, data: xchAmount };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert mojos to XCH',
        details: error
      };
    }
  }

  /**
   * Safe version of the original utility methods for backward compatibility
   */
  static xchToMojosUnsafe(xchAmount: number): string {
    const MOJOS_PER_XCH = 1000000000000;
    const mojos = Math.round(xchAmount * MOJOS_PER_XCH);
    return mojos.toString();
  }

  static mojosToXCHUnsafe(mojos: string | number): number {
    const MOJOS_PER_XCH = 1000000000000;
    const mojosAmount = typeof mojos === 'string' ? parseInt(mojos) : mojos;
    return mojosAmount / MOJOS_PER_XCH;
  }

  /**
   * Statically calculate a coin's ID
   * Coin ID = SHA256(parent_coin_info + puzzle_hash + amount)
   * @param coin The coin to calculate the ID for
   * @returns Promise<Result<string>> The coin ID as a hex string
   */
  static async calculateCoinId(coin: CoinInput): Promise<Result<string>> {
    try {
      // Normalize the coin to ensure consistent format
      const normalizedCoin = normalizeCoin(coin);

      // Extract normalized fields
      const parentCoinInfo = normalizedCoin.parentCoinInfo;
      const puzzleHash = normalizedCoin.puzzleHash;
      const amount = normalizedCoin.amount;

      // Validate inputs
      if (!parentCoinInfo || !puzzleHash || !amount) {
        return {
          success: false,
          error: 'Invalid coin: missing required fields (parent_coin_info/parentCoinInfo, puzzle_hash/puzzleHash, amount) ' + JSON.stringify(coin)
        }
      }

      // Remove '0x' prefix if present
      const cleanParentCoinInfo = parentCoinInfo.replace(/^0x/, '');
      const cleanPuzzleHash = puzzleHash.replace(/^0x/, '');

      // Validate hex strings
      if (!/^[0-9a-fA-F]{64}$/.test(cleanParentCoinInfo)) {
        return {
          success: false,
          error: 'Invalid parent_coin_info: must be a 64-character hex string'
        };
      }

      if (!/^[0-9a-fA-F]{64}$/.test(cleanPuzzleHash)) {
        return {
          success: false,
          error: 'Invalid puzzle_hash: must be a 64-character hex string'
        };
      }

      // Convert amount to 8-byte big-endian format
      let amountNumber: number;
      try {
        amountNumber = parseInt(amount);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid amount: must be a valid number string'
        };
      }

      if (amountNumber < 0) {
        return {
          success: false,
          error: 'Invalid amount: must be non-negative'
        };
      }

      // Convert amount to 8-byte big-endian hex string
      const amountHex = ('0000000000000000' + amountNumber.toString(16)).slice(-16);

      // Concatenate all parts
      const concatenated = cleanParentCoinInfo + cleanPuzzleHash + amountHex;

      // Convert hex string to bytes
      const bytes = new Uint8Array(concatenated.length / 2);
      for (let i = 0; i < concatenated.length; i += 2) {
        bytes[i / 2] = parseInt(concatenated.substr(i, 2), 16);
      }

      // Calculate SHA256 hash using Web Crypto API
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
      const hashArray = new Uint8Array(hashBuffer);

      // Convert to hex string
      const coinId = Array.from(hashArray)
        .map(b => {
          const hex = b.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('');

      return {
        success: true,
        data: coinId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate coin ID',
        details: error
      };
    }
  }

  /**
   * Calculate coin IDs for multiple coins
   * @param coins Array of coins to calculate IDs for
   * @returns Promise<Result<{coin: Coin, coinId: string}[]>> Array of coins with their IDs
   */
  static async calculateCoinIds(coins: (CoinInput | any)[]): Promise<Result<{ coin: Coin, coinId: string }[]>> {
    try {
      // Normalize all coins to ensure consistent format
      const normalizedCoins = normalizeCoins(coins);
      const results: { coin: Coin, coinId: string }[] = [];

      for (const coin of normalizedCoins) {
        const result = await ChiaCloudWalletClient.calculateCoinId(coin);
        if (!result.success) {
          const parentInfo = coin.parentCoinInfo || 'unknown';
          return {
            success: false,
            error: `Failed to calculate coin ID for coin with parent ${parentInfo}: ${(result as any).error}`
          };
        }
        results.push({ coin, coinId: result.data });
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate coin IDs',
        details: error
      };
    }
  }

  /**
   * Utility method to validate a coin ID format
   * @param coinId The coin ID to validate
   * @returns boolean Whether the coin ID is valid
   */
  static isValidCoinId(coinId: string): boolean {
    // Remove '0x' prefix if present
    const id = coinId.replace(/^0x/, '');
    // Must be exactly 64 hex characters (32 bytes)
    return /^[0-9a-fA-F]{64}$/.test(id);
  }
}

// Export a default instance for convenience
export const chiaCloudWalletClient = new ChiaCloudWalletClient(); 