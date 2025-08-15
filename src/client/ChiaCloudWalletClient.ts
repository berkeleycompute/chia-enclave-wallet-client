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

// Type that can be either format
type CoinInput = Coin | RawCoin | any;

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

export interface CoinSpend {
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

// New interfaces for hydrated coins
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
  requested_payments: RequestedPayments;
  nft_data: HydratedCoin;
}

// New simplified request interface
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
      console.log('!!!!!!!!!!!! Vite Env:', viteEnv);
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
    console.log('!!!!!!!!!!!! Environment:', this.environment);
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
   * Normalize UnspentHydratedCoinsResponse to handle different response formats between environments
   */
  private normalizeHydratedCoinsResponse(response: UnspentHydratedCoinsResponse): HydratedCoin[] {
    // Check if data is directly an array (production/development format)
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Check if data has nested data property (test format)
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as { data: HydratedCoin[] }).data;
    }
    
    // Fallback to empty array if structure is unexpected
    console.warn('Unexpected hydrated coins response structure:', response);
    return [];
  }

  /**
   * Make an authenticated API request with enhanced error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

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
    console.log(`🔑 [${timestamp}] getPublicKey() called from: ${stack}`);

    try {
      const endpoint = this.getEndpoint('/public-key', '/api/enclave/public-key');
      const result = await this.makeRequest<PublicKeyResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      console.log(`✅ [${timestamp}] getPublicKey() successful`);
      return { success: true, data: result };
    } catch (error) {
      console.log(`❌ [${timestamp}] getPublicKey() failed:`, error);
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
   * Get unspent hydrated coins for a specific address
   * @param address - The wallet address (not public key)
   */
  async getUnspentHydratedCoins(address: string): Promise<Result<UnspentHydratedCoinsResponse>> {
    try {
     // const endpoint = this.getEndpoint(`/wallet/unspent-hydrated-coins/${address}`, `/api/wallet/hydrated-coins/${address}`);
      const result = await this.makeRequest<UnspentHydratedCoinsResponse>(`https://edge.silicon-dev.net/chia/hydrated_coins_fetcher/hydrated-unspent-coins?address=${address}`, {
        method: 'GET',
      });
      
      // Normalize the response to handle different formats between environments
      const normalizedCoins = this.normalizeHydratedCoinsResponse(result);
      
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

      if (!request.requested_payments ||
        (!request.requested_payments.cats?.length) &&
        (!request.requested_payments.xch?.length)) {
        throw new ChiaCloudWalletApiError('Requested payments with CAT tokens or XCH are required');
      }

      if (!request.nft_data) {
        throw new ChiaCloudWalletApiError('NFT data is required');
      }

      // Ensure NFT data coin format is normalized
      const normalizedNFTData = {
        ...request.nft_data,
        coin: normalizeCoin(request.nft_data.coin)
      };

      // Prepare the request with normalized data
      const normalizedRequest = {
        ...request,
        nft_data: normalizedNFTData
      };

      this.logInfo('Making unsigned NFT offer request', {
        publicKey: request.synthetic_public_key.substring(0, 10) + '...',
        catPaymentsCount: request.requested_payments.cats?.length || 0,
        xchPaymentsCount: request.requested_payments.xch?.length || 0
      });

    //  const endpoint = this.getEndpoint('/wallet/offer/make-unsigned-nft', '/api/wallet/make-unsigned-nft-offer');
      const result = await this.makeRequest<MakeUnsignedNFTOfferResponse>('https://edge.silicon-dev.net/chia/make_unsigned_offer/create-offer', {
        method: 'POST',
        body: JSON.stringify(normalizedRequest),
      });

      // Return the unsigned offer - signing should be done separately
      return { success: true, data: result };
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

      if (!request.requested_payments ||
        (!request.requested_payments.cats?.length) &&
        (!request.requested_payments.xch?.length)) {
        throw new ChiaCloudWalletApiError('Requested payments with CAT tokens or XCH are required');
      }

      if (!request.nft_data) {
        throw new ChiaCloudWalletApiError('NFT data is required');
      }

      // Validate synthetic public key format (should be 96 hex characters)
      const cleanPublicKey = request.synthetic_public_key.replace(/^0x/, '');
      if (!/^[0-9a-fA-F]{96}$/.test(cleanPublicKey)) {
        throw new ChiaCloudWalletApiError('Invalid synthetic public key format: must be a 96-character hex string');
      }

      // Validate CAT payments if provided
      if (request.requested_payments.cats) {
        for (const catPayment of request.requested_payments.cats) {
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
      }

      // Validate XCH payments if provided
      if (request.requested_payments.xch) {
        for (const xchPayment of request.requested_payments.xch) {
          if (!xchPayment.puzzle_hash) {
            throw new ChiaCloudWalletApiError('Each XCH payment must have puzzle_hash');
          }

          if (typeof xchPayment.amount !== 'number' || xchPayment.amount <= 0) {
            throw new ChiaCloudWalletApiError('Each XCH payment must have a positive amount');
          }

          // Validate hex string format
          const cleanPuzzleHash = xchPayment.puzzle_hash.replace(/^0x/, '');

          if (!/^[0-9a-fA-F]{64}$/.test(cleanPuzzleHash)) {
            throw new ChiaCloudWalletApiError('Invalid puzzle_hash format: must be a 64-character hex string');
          }
        }
      }

      this.logInfo('Making signed NFT offer request', {
        publicKey: request.synthetic_public_key.substring(0, 10) + '...',
        catPaymentsCount: request.requested_payments.cats?.length || 0,
        xchPaymentsCount: request.requested_payments.xch?.length || 0
      });

      // Step 1: Create unsigned offer
      const unsignedResult = await this.makeUnsignedNFTOffer(request);
      if (!unsignedResult.success) {
        throw new Error(`Failed to create unsigned offer: ${unsignedResult.error}`);
      }

      const unsignedOfferString = unsignedResult.data.data?.unsigned_offer_string;
      if (!unsignedOfferString) {
        throw new Error('No unsigned offer string returned from API');
      }

      this.logInfo('Unsigned offer created successfully, proceeding to sign', {
        offerLength: unsignedOfferString.length,
        offerPrefix: unsignedOfferString.substring(0, 20) + '...'
      });

      // Step 2: Sign the offer
      const signedResult = await this.signOffer({ offer: unsignedOfferString });
      if (!signedResult.success) {
        throw new Error(`Failed to sign offer: ${signedResult.error}`);
      }

      this.logInfo('NFT offer created and signed successfully');

      return { success: true, data: signedResult.data };
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
        requested_payments: {
          cats: [],
          xch: []
        },
        nft_data: request.nft_data
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
              throw new ChiaCloudWalletApiError(`Failed to convert CAT deposit address to puzzle hash: ${puzzleHashResult.error}`);
            }
            puzzleHash = puzzleHashResult.data;
          }

          fullRequest.requested_payments.cats!.push({
            asset_id: catPayment.asset_id,
            puzzle_hash: puzzleHash,
            amount: catPayment.amount
          });
        }
      }

      // Convert XCH payments from addresses to puzzle hashes
      if (request.requested_payments.xch) {
        for (const xchPayment of request.requested_payments.xch) {
          let puzzleHash: string;

          // Check if it's already a puzzle hash (64 hex characters) or a Chia address
          const cleanAddress = xchPayment.deposit_address.replace(/^0x/, '');
          if (/^[0-9a-fA-F]{64}$/.test(cleanAddress)) {
            // It's already a puzzle hash
            puzzleHash = cleanAddress;
          } else {
            // It's a Chia address, convert it
            const puzzleHashResult = ChiaCloudWalletClient.convertAddressToPuzzleHash(xchPayment.deposit_address);
            if (!puzzleHashResult.success) {
              throw new ChiaCloudWalletApiError(`Failed to convert XCH deposit address to puzzle hash: ${puzzleHashResult.error}`);
            }
            puzzleHash = puzzleHashResult.data;
          }

          fullRequest.requested_payments.xch!.push({
            puzzle_hash: puzzleHash,
            amount: xchPayment.amount
          });
        }
      }

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
   * Broadcast a signed spend bundle with error handling
   */
  async broadcastSpendBundle(request: BroadcastSpendBundleRequest): Promise<Result<BroadcastResponse>> {
    try {
      if (!request.coinSpends || request.coinSpends.length === 0) {
        throw new ChiaCloudWalletApiError('Coin spends are required for broadcasting');
      }
      if (!request.signature) {
        throw new ChiaCloudWalletApiError('Signature is required for broadcasting');
      }

      // Normalize all coins in the coin spends
      const normalizedCoinSpends = request.coinSpends.map(coinSpend => ({
        ...coinSpend,
        coin: normalizeCoin(coinSpend.coin)
      }));

      const endpoint = this.getEndpoint('/wallet/transaction/broadcast', '/api/broadcast');
      const result = await this.makeRequest<BroadcastResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          coinSpends: normalizedCoinSpends,
          signature: request.signature
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
   * Convenience method to broadcast a signed spend bundle from a SignedSpendBundleResponse or SendXCHResponse
   */
  async broadcastSignedSpendBundle(signedBundle: SignedSpendBundleResponse | SendXCHResponse): Promise<Result<BroadcastResponse>> {
    try {
      if (!signedBundle.success) {
        throw new ChiaCloudWalletApiError('Cannot broadcast failed transaction');
      }

      const { coin_spends, aggregated_signature } = signedBundle.signed_spend_bundle;

      return await this.broadcastSpendBundle({
        coinSpends: coin_spends,
        signature: aggregated_signature
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
          error: `Failed to sign transaction: ${signedResult.error}`,
          details: signedResult.details
        };
      }

      // Then broadcast the signed transaction
      const broadcastResult = await this.broadcastSignedSpendBundle(signedResult.data);
      if (!broadcastResult.success) {
        return {
          success: false,
          error: `Failed to broadcast transaction: ${broadcastResult.error}`,
          details: broadcastResult.details
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
          error: `Failed to get enhanced balance: ${hydratedResult.error}`
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
            error: `Failed to calculate coin ID for coin with parent ${parentInfo}: ${result.error}`
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