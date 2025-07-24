// Chia Insight API Client for paginated hydrated coins

import { 
  Result, 
  ErrorResult, 
  SuccessResult, 
  Coin, 
  normalizeCoin, 
  HydratedCoin,
  ChiaCloudWalletClient
} from './ChiaCloudWalletClient';

// Configuration interface for Insight API
export interface ChiaInsightConfig {
  apiUrl?: string;
  apiToken?: string;
  enableLogging?: boolean;
}

// Request options for the API
export interface GetHydratedCoinsOptions {
  puzzleHash?: string;
  page?: number;
  pageSize?: number;
  includeNfts?: boolean;
  includeCats?: boolean;
  includeXch?: boolean;
}

// Use the unified response interface from ChiaCloudWalletClient
export interface InsightHydratedCoinsResponse {
  message: string;
  filters_applied: {
    puzzle_hash?: string;
    sources_queried: string[];
  };
  total_coin_ids_found: number;
  pagination: {
    page: number;
    page_size: number;
  };
  data: HydratedCoin[];
  success: boolean;
}

// Error class for Insight API errors
export class ChiaInsightApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ChiaInsightApiError';
  }
}

/**
 * Client for interacting with Chia Insight API to get paginated hydrated coins
 */
export class ChiaInsightClient {
  private apiUrl: string;
  private apiToken?: string;
  private enableLogging: boolean;

  constructor(config: ChiaInsightConfig = {}) {
    this.apiUrl = config.apiUrl || 'https://aedugkfqljpfirjylfvq.supabase.co/functions/v1/api';
    this.apiToken = config.apiToken;
    this.enableLogging = config.enableLogging ?? true;
  }

  /**
   * Set the API URL for requests
   */
  setApiUrl(url: string): void {
    this.apiUrl = url.replace(/\/$/, '');
    this.logInfo(`API URL updated to: ${this.apiUrl}`);
  }

  /**
   * Get the current API URL
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Set the API token
   */
  setApiToken(token: string): void {
    this.apiToken = token;
    this.logInfo('API token updated');
  }

  /**
   * Get the current API token
   */
  getApiToken(): string | undefined {
    return this.apiToken;
  }

  /**
   * Enable or disable logging
   */
  setLogging(enabled: boolean): void {
    this.enableLogging = enabled;
  }

  /**
   * Log info message if logging is enabled
   */
  private logInfo(message: string, data?: any): void {
    if (this.enableLogging) {
      console.log(`[ChiaInsightClient] ${message}`, data || '');
    }
  }

  /**
   * Log error message if logging is enabled
   */
  private logError(message: string, error?: any): void {
    if (this.enableLogging) {
      console.error(`[ChiaInsightClient] ${message}`, error || '');
    }
  }

  /**
   * Make an authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (requireAuth) {
        if (!this.apiToken) {
          throw new ChiaInsightApiError('API token is required for this request');
        }
        headers['Authorization'] = `Bearer ${this.apiToken}`;
      }

      this.logInfo(`Making request to ${endpoint}`, { method: options.method || 'GET' });

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new ChiaInsightApiError(
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
      if (error instanceof ChiaInsightApiError) {
        throw error;
      }
      const networkError = new ChiaInsightApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error
      );
      this.logError(`Network error for ${endpoint}`, networkError);
      throw networkError;
    }
  }

  /**
   * Get paginated hydrated coins from the Insight API
   */
  async getHydratedCoins(
    puzzleHash: string,
    options: GetHydratedCoinsOptions = {}
  ): Promise<Result<InsightHydratedCoinsResponse>> {
    try {
      const {
        page = 1,
        pageSize = 50
      } = options;

      // Build query parameters
      const queryParams = new URLSearchParams({
        puzzle_hash: puzzleHash,
        page: page.toString(),
        page_size: pageSize.toString()
      });

      const endpoint = `/wallet/hydrated-coins?${queryParams.toString()}`;
      
      const result = await this.makeRequest<InsightHydratedCoinsResponse>(endpoint, {
        method: 'GET',
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get hydrated coins',
        details: error
      };
    }
  }

  /**
   * Get all hydrated coins across multiple pages
   */
  async getAllHydratedCoins(
    puzzleHash: string,
    options: GetHydratedCoinsOptions = {}
  ): Promise<Result<HydratedCoin[]>> {
    try {
      const allCoins: HydratedCoin[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      const {
        pageSize = 50
      } = options;

      while (hasMorePages) {
        const pageResult = await this.getHydratedCoins(puzzleHash, {
          ...options,
          page: currentPage,
          pageSize
        });

        if (!pageResult.success) {
          return {
            success: false,
            error: `Failed to fetch page ${currentPage}: ${pageResult.error}`,
            details: pageResult.details
          };
        }

        allCoins.push(...pageResult.data.data);

        // Check if we have more pages
        const totalFound = pageResult.data.total_coin_ids_found;
        const currentCount = currentPage * pageSize;
        hasMorePages = currentCount < totalFound;
        
        currentPage++;

        this.logInfo(`Fetched page ${currentPage - 1}, total coins so far: ${allCoins.length}/${totalFound}`);
      }

      return { success: true, data: allCoins };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all hydrated coins',
        details: error
      };
    }
  }

  /**
   * Get hydrated coins in the standard format used by existing hooks and components
   */
  async getStandardFormatHydratedCoins(
    puzzleHash: string,
    options: GetHydratedCoinsOptions = {}
  ): Promise<Result<HydratedCoin[]>> {
    try {
      const result = await this.getAllHydratedCoins(puzzleHash, options);
      
      if (!result.success) {
        return result;
      }

      // Normalize coins using the unified client utilities
      const standardCoins = ChiaCloudWalletClient.normalizeHydratedCoins(result.data);

      return { success: true, data: standardCoins };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert to standard format',
        details: error
      };
    }
  }

  /**
   * Filter coins by type using the unified filtering utility
   */
  static filterCoinsByType(coins: HydratedCoin[], type: 'XCH' | 'CAT' | 'NFT'): HydratedCoin[] {
    return ChiaCloudWalletClient.filterHydratedCoinsByType(coins, type);
  }

  /**
   * Get categorized hydrated coins (similar to existing getWalletBalanceEnhanced)
   */
  async getCategorizedHydratedCoins(
    puzzleHash: string,
    options: GetHydratedCoinsOptions = {}
  ): Promise<Result<{
    totalBalance: number;
    coinCount: number;
    xchCoins: HydratedCoin[];
    catCoins: HydratedCoin[];
    nftCoins: HydratedCoin[];
    allCoins: HydratedCoin[];
  }>> {
    try {
      const result = await this.getStandardFormatHydratedCoins(puzzleHash, options);
      
      if (!result.success) {
        return result;
      }

      const allCoins = result.data;
      const xchCoins = ChiaInsightClient.filterCoinsByType(allCoins, 'XCH');
      const catCoins = ChiaInsightClient.filterCoinsByType(allCoins, 'CAT');
      const nftCoins = ChiaInsightClient.filterCoinsByType(allCoins, 'NFT');

      // Calculate total balance (only from XCH coins typically)
      const totalBalance = xchCoins.reduce((sum, coin) => {
        return sum + parseInt(coin.coin.amount);
      }, 0);

      return {
        success: true,
        data: {
          totalBalance,
          coinCount: allCoins.length,
          xchCoins,
          catCoins,
          nftCoins,
          allCoins
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get categorized hydrated coins',
        details: error
      };
    }
  }
}

// Export a default instance for convenience
export const chiaInsightClient = new ChiaInsightClient({
  apiUrl: 'https://aedugkfqljpfirjylfvq.supabase.co/functions/v1/api',
  apiToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZHVna2ZxbGpwZmlyanlsZnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NTAxNDYsImV4cCI6MjA2ODQyNjE0Nn0.g2SIV9TSxNh7NB-7ymWnVRYB-ALLk1jNWOvZksa2xmQ',
  enableLogging: true
}); 