/**
 * Spacescan API Client for Chia blockchain data
 * Documentation: https://docs.spacescan.io/api/address/xch-balance
 */

import React from 'react';
import type { ChiaCloudWalletClient, HydratedCoin } from './ChiaCloudWalletClient';

export interface SpacescanBalanceResponse {
  status: 'success' | 'error';
  xch?: number;
  mojo?: number;
  error?: string;
  message?: string;
}

export interface SpacescanNFT {
  nft_id: string;
  name: string;
  collection_id: string;
  preview_url?: string | null;
  // Legacy fields for backward compatibility
  launcher_id?: string;
  owner_did?: string;
  data_uris?: string[];
  meta_uris?: string[];
  license_uris?: string[];
  metadata?: {
    name?: string;
    description?: string;
    collection?: {
      name?: string;
      id?: string;
    };
    attributes?: Array<{
      trait_type: string;
      value: any;
    }>;
    image?: string;
    animation_url?: string;
    data_uris?: string[];
    series_number?: number;
    series_total?: number;
  };
  collection_name?: string;
  edition_number?: number;
  edition_total?: number;
}

export interface SpacescanNFTBalanceResponse {
  status: 'success' | 'error';
  data?: SpacescanNFT[];
  count?: number;
  error?: string;
  message?: string;
}

export interface SpacescanTransaction {
  amount_mojo: number;
  amount_xch: number;
  coin_id: string;
  from: string;
  height: number;
  memo?: string | null;
  time: string; // ISO string format
  to?: string | null;
}

export interface SpacescanNFTTransaction {
  coin_id: string;
  from: string;
  height: number;
  memo?: string | null;
  nft_id: string;
  time: string; // ISO string format
}

export interface SpacescanTokenTransaction {
  asset_id: string;
  coin_id: string;
  from: string;
  height: number;
  memo?: string[] | null;
  time: string; // ISO string format
  token_amount: number;
  token_id: string;
}

export interface SpacescanTransactionResponse<T> {
  status: 'success' | 'error';
  data?: T[];
  count?: number;
  error?: string;
  message?: string;
}

export interface SpacescanNFTTransactionResponse {
  status: 'success' | 'error';
  received_transactions?: {
    next_cursor?: string | null;
    total_count: number;
    transactions: SpacescanNFTTransaction[];
  };
  send_transactions?: {
    next_cursor?: string | null;
    total_count: number;
    transactions: SpacescanNFTTransaction[];
  };
  _proxy?: {
    api_type: string;
    method: string;
    original_path: string;
    timestamp: string;
  };
  error?: string;
  message?: string;
}

export interface SpacescanTokenTransactionResponse {
  status: 'success' | 'error';
  received_transactions?: {
    next_cursor?: string | null;
    total_count: number;
    transactions: SpacescanTokenTransaction[];
  };
  send_transactions?: {
    next_cursor?: string | null;
    total_count: number;
    transactions: SpacescanTokenTransaction[];
  };
  _proxy?: {
    api_type: string;
    method: string;
    original_path: string;
    timestamp: string;
  };
  error?: string;
  message?: string;
}

export interface SpacescanXCHTransactionResponse {
  status: 'success' | 'error';
  received_transactions?: {
    next_cursor?: string | null;
    total_count: number;
    transactions: SpacescanTransaction[];
  };
  send_transactions?: {
    next_cursor?: string | null;
    total_count: number;
    transactions: SpacescanTransaction[];
  };
  _proxy?: {
    api_type: string;
    method: string;
    original_path: string;
    timestamp: string;
  };
  error?: string;
  message?: string;
}

export interface SpacescanConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  walletClient?: ChiaCloudWalletClient; // Optional wallet client for local coin data
}

// Cache interface for storing API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Debounced request manager with throttling
class DebouncedRequestManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private cache = new Map<string, CacheEntry<any>>();
  private readonly cacheTimeout = 30000; // 30 seconds cache
  private readonly debounceDelay = 300; // 300ms debounce
  private readonly throttleDelay = 200; // 200ms minimum delay between requests
  private lastRequestTime = 0;

  /**
   * Get cached data if it exists and is not expired
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  /**
   * Set data in cache
   */
  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.cacheTimeout
    });
  }

  /**
   * Execute a debounced and throttled request with caching
   */
  async executeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check cache first
    const cachedData = this.getCachedData<T>(key);
    if (cachedData) {
      return cachedData;
    }

    // Check if there's already a pending request for this key
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    // Create new debounced and throttled request
    const debouncedRequest = new Promise<T>((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Apply throttling - ensure minimum delay between requests
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          const additionalDelay = Math.max(0, this.throttleDelay - timeSinceLastRequest);
          
          if (additionalDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, additionalDelay));
          }
          
          // Update last request time
          this.lastRequestTime = Date.now();
          
          const result = await requestFn();
          this.setCachedData(key, result);
          this.pendingRequests.delete(key);
          resolve(result);
        } catch (error) {
          this.pendingRequests.delete(key);
          reject(error);
        }
      }, this.debounceDelay);
    });

    this.pendingRequests.set(key, debouncedRequest);
    return debouncedRequest;
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      lastRequestTime: this.lastRequestTime,
      throttleDelay: this.throttleDelay,
      timeSinceLastRequest: Date.now() - this.lastRequestTime,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        isExpired: Date.now() >= entry.expiresAt
      }))
    };
  }
}

export class SpacescanClient {
  // private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private requestManager: DebouncedRequestManager;
  private walletClient?: ChiaCloudWalletClient;

  constructor(config: SpacescanConfig) {
    // this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://edgedev.silicon.net/v1/spacescan';
    this.timeout = config.timeout || 10000; // 10 seconds
    this.requestManager = new DebouncedRequestManager();
    this.walletClient = config.walletClient;
  }

  /**
   * Get NFT balance for a specific address
   * @param address - The XCH address to query (xch...)
   * @returns Promise with NFT information
   */
  async getNftBalance(address: string): Promise<SpacescanNFTBalanceResponse> {
      if (!address || !address.startsWith('xch')) {
        return {
          status: 'error',
          error: 'Invalid address format. Address must start with "xch"'
        };0
      }

    const cacheKey = `nft-balance:${address}`;
    
    return this.requestManager.executeRequest(cacheKey, async () => {
      try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}/address/nft-balance/${address}`;
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: 'success',
          data: [],
          count: 0
        };
      }

      const data = await response.json().catch(() => ({}));
      
      // Validate response structure
      if (data.status === 'success') {
        return {
          status: 'success',
            data: data.balance || data.data || [],
            count: data.balance?.length || data.count || 0
        };
      } else {
        return {
          status: 'success',
          data: [],
          count: 0
        };
      }

    } catch (error) {
      return {
        status: 'success',
        data: [],
        count: 0
      };
    }
    });
  }

  /**
   * Get XCH balance for a specific address
   * Uses local coin data from wallet client if available, otherwise falls back to Spacescan API
   * @param address - The XCH address to query (xch...)
   * @returns Promise with balance information
   */
  async getXchBalance(address: string): Promise<SpacescanBalanceResponse> {
    if (!address || !address.startsWith('xch')) {
      return {
        status: 'error',
        error: 'Invalid address format. Address must start with "xch"'
      };
    }

    // If wallet client is available, use local coin data instead of API
    if (this.walletClient) {
      try {
        const balanceResult = await this.walletClient.getWalletBalanceEnhanced(address);
        
        if (balanceResult.success && balanceResult.data) {
          // Calculate XCH balance from XCH coins only
          const xchCoins = balanceResult.data.xchCoins;
          const totalMojos = xchCoins.reduce((sum, coin) => {
            return sum + parseInt(coin.coin.amount);
          }, 0);
          
          const xch = totalMojos / 1000000000000; // Convert mojos to XCH
          
          return {
            status: 'success',
            xch: xch,
            mojo: totalMojos
          };
        } else {
          // If wallet balance fetch fails, return zero balance
          return {
            status: 'success',
            xch: 0,
            mojo: 0
          };
        }
      } catch (error) {
        console.warn('Failed to get XCH balance from wallet client, returning zero:', error);
        return {
          status: 'success',
          xch: 0,
          mojo: 0
        };
      }
    }

    // Fallback to Spacescan API if no wallet client is available
    const cacheKey = `xch-balance:${address}`;
    
    return this.requestManager.executeRequest(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const url = `${this.baseUrl}/address/xch-balance/${address}`;
        
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            status: 'success',
            xch: 0,
            mojo: 0
          };
        }

        const data = await response.json().catch(() => ({}));
        
        // Validate response structure
        if (data.status === 'success' && typeof data.xch === 'number' && typeof data.mojo === 'number') {
          return {
            status: 'success',
            xch: data.xch,
            mojo: data.mojo
          };
        } else {
          return {
            status: 'success',
            xch: 0,
            mojo: 0
          };
        }

      } catch (error) {
        return {
          status: 'success',
          xch: 0,
          mojo: 0
        };
      }
    });
  }

  /**
   * Format XCH amount for display
   * @param xch - XCH amount as number
   * @param decimals - Number of decimal places (default: 6)
   * @returns Formatted string
   */
  static formatXch(xch: number, decimals: number = 6): string {
    return xch.toFixed(decimals);
  }

  /**
   * Convert mojo to XCH
   * @param mojo - Amount in mojo
   * @returns XCH amount
   */
  static mojoToXch(mojo: number): number {
    return mojo / 1e12;
  }

  /**
   * Convert XCH to mojo
   * @param xch - Amount in XCH
   * @returns Mojo amount
   */
  static xchToMojo(xch: number): number {
    return Math.round(xch * 1e12);
  }

  /**
   * Get NFT transaction history for a specific address
   * @param address - The XCH address to query (xch...)
   * @param limit - Maximum number of transactions to return (default: 100)
   * @param offset - Number of transactions to skip (default: 0)
   * @returns Promise with NFT transaction information
   */
  async getNftTransactions(address: string, limit: number = 100, offset: number = 0): Promise<SpacescanNFTTransactionResponse> {
    if (!address || !address.startsWith('xch')) {
      return {
        status: 'success',
        received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
        send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
      };
    }

    const cacheKey = `nft-transactions:${address}:${limit}:${offset}`;
    
    return this.requestManager.executeRequest(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const url = `${this.baseUrl}/address/nft-transaction/${address}?limit=${limit}&offset=${offset}`;
        
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            status: 'success',
            received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
          };
        }

        const data = await response.json().catch(() => ({}));
        
        // Validate response structure
        if (data.status === 'success') {
          return {
            status: 'success',
            received_transactions: data.received_transactions || { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: data.send_transactions || { next_cursor: null, total_count: 0, transactions: [] },
            _proxy: data._proxy
          };
        } else {
          return {
            status: 'success',
            received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
          };
        }

      } catch (error) {
        return {
          status: 'success',
          received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
          send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
        };
      }
    });
  }

  /**
   * Get token transaction history for a specific address
   * @param address - The XCH address to query (xch...)
   * @param limit - Maximum number of transactions to return (default: 100)
   * @param offset - Number of transactions to skip (default: 0)
   * @returns Promise with token transaction information
   */
  async getTokenTransactions(address: string, limit: number = 100, offset: number = 0): Promise<SpacescanTokenTransactionResponse> {
    if (!address || !address.startsWith('xch')) {
      return {
        status: 'error',
        error: 'Invalid address format. Address must start with "xch"'
      };
    }

    const cacheKey = `token-transactions:${address}:${limit}:${offset}`;
    
    return this.requestManager.executeRequest(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const url = `${this.baseUrl}/address/token-transaction/${address}?limit=${limit}&offset=${offset}`;
        
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            status: 'success',
            received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
          };
        }

        const data = await response.json().catch(() => ({}));
        
        // Validate response structure
        if (data.status === 'success') {
          return {
            status: 'success',
            received_transactions: data.received_transactions || { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: data.send_transactions || { next_cursor: null, total_count: 0, transactions: [] },
            _proxy: data._proxy
          };
        } else {
          return {
            status: 'success',
            received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
          };
        }

      } catch (error) {
        return {
          status: 'success',
          received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
          send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
        };
      }
    });
  }

  /**
   * Get XCH transaction history for a specific address
   * @param address - The XCH address to query (xch...)
   * @param limit - Maximum number of transactions to return (default: 100)
   * @param offset - Number of transactions to skip (default: 0)
   * @returns Promise with XCH transaction information
   */
  async getXchTransactions(address: string, limit: number = 100, offset: number = 0): Promise<SpacescanXCHTransactionResponse> {
    if (!address || !address.startsWith('xch')) {
      return {
        status: 'error',
        error: 'Invalid address format. Address must start with "xch"'
      };
    }

    const cacheKey = `xch-transactions:${address}:${limit}:${offset}`;
    
    return this.requestManager.executeRequest(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const url = `${this.baseUrl}/address/xch-transaction/${address}?limit=${limit}&offset=${offset}`;
        
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            status: 'success',
            received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
          };
        }

        const data = await response.json().catch(() => ({}));
        
        // Validate response structure
        if (data.status === 'success') {
          return {
            status: 'success',
            received_transactions: data.received_transactions || { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: data.send_transactions || { next_cursor: null, total_count: 0, transactions: [] },
            _proxy: data._proxy
          };
        } else {
          return {
            status: 'success',
            received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
            send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
          };
        }

      } catch (error) {
        return {
          status: 'success',
          received_transactions: { next_cursor: null, total_count: 0, transactions: [] },
          send_transactions: { next_cursor: null, total_count: 0, transactions: [] }
        };
      }
    });
  }

  /**
   * Clear cache for a specific address or all cache
   * @param address - Optional address to clear cache for
   */
  clearCache(address?: string): void {
    if (address) {
      this.requestManager.clearCache(`xch-balance:${address}`);
      this.requestManager.clearCache(`nft-balance:${address}`);
      this.requestManager.clearCache(`nft-transactions:${address}`);
      this.requestManager.clearCache(`token-transactions:${address}`);
      this.requestManager.clearCache(`xch-transactions:${address}`);
    } else {
      this.requestManager.clearCache();
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return this.requestManager.getCacheStats();
  }
}

// Known token asset ID to name mapping
export const KNOWN_TOKENS: Record<string, string> = {
  'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d': 'USDC.b',
  // Add more known tokens here as needed
};

/**
 * Get the display name for a token based on its asset_id
 * @param assetId - The asset_id of the token
 * @param tokenId - The token_id as fallback
 * @returns The display name for the token
 */
export const getTokenDisplayName = (assetId: string, tokenId?: string): string => {
  // Check if we have a known mapping for this asset_id
  if (KNOWN_TOKENS[assetId]) {
    return KNOWN_TOKENS[assetId];
  }
  
  // Fallback to truncated token_id if available
  if (tokenId) {
    return `${tokenId.slice(0, 8)}...`;
  }
  
  // Final fallback to truncated asset_id
  return `${assetId.slice(0, 8)}...`;
};

// Default instance with provided API key
export const defaultSpacescanClient = new SpacescanClient({
  apiKey: 'esL8oRqzao1qQ6f5kYbB16iQ2C9zdXOl8BNm72Us'
});

// Hook for using Spacescan XCH balance with debouncing
export const useSpacescanBalance = (address: string | null, debounceMs: number = 500) => {
  const [balance, setBalance] = React.useState<SpacescanBalanceResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [debouncedAddress, setDebouncedAddress] = React.useState<string | null>(address);

  // Debounce address changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(address);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [address, debounceMs]);

  const fetchBalance = React.useCallback(async () => {
    if (!debouncedAddress) {
      setBalance(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await defaultSpacescanClient.getXchBalance(debouncedAddress);
      setBalance(result);
      setError(null);
    } catch (err) {
      // This should never happen now, but keep as fallback
      setError(null);
      setBalance({ status: 'success', xch: 0, mojo: 0 });
    } finally {
      setLoading(false);
    }
  }, [debouncedAddress]);

  // Fetch balance when debounced address changes
  React.useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
    xch: balance?.xch || 0,
    mojo: balance?.mojo || 0,
    formattedBalance: balance?.xch !== undefined ? SpacescanClient.formatXch(balance.xch) : '0.000000',
    clearCache: () => defaultSpacescanClient.clearCache(debouncedAddress || undefined)
  };
};

// Hook for using Spacescan NFT balance with debouncing
export const useSpacescanNFTs = (address: string | null, debounceMs: number = 500) => {
  const [nfts, setNfts] = React.useState<SpacescanNFT[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [count, setCount] = React.useState(0);
  const [debouncedAddress, setDebouncedAddress] = React.useState<string | null>(address);

  // Debounce address changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(address);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [address, debounceMs]);

  const fetchNFTs = React.useCallback(async () => {
    if (!debouncedAddress) {
      setNfts([]);
      setCount(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await defaultSpacescanClient.getNftBalance(debouncedAddress);
      setNfts(result.data || []);
      setCount(result.count || 0);
      setError(null);
    } catch (err) {
      // This should never happen now, but keep as fallback
      setError(null);
      setNfts([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedAddress]);

  // Fetch NFTs when debounced address changes
  React.useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    loading,
    error,
    count,
    refetch: fetchNFTs,
    hasNFTs: nfts.length > 0,
    clearCache: () => defaultSpacescanClient.clearCache(debouncedAddress || undefined)
  };
};

// Hook for using Spacescan NFT transactions with debouncing
export const useSpacescanNFTTransactions = (address: string | null, limit: number = 100, offset: number = 0, debounceMs: number = 500) => {
  const [receivedTransactions, setReceivedTransactions] = React.useState<SpacescanNFTTransaction[]>([]);
  const [sentTransactions, setSentTransactions] = React.useState<SpacescanNFTTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receivedCount, setReceivedCount] = React.useState(0);
  const [sentCount, setSentCount] = React.useState(0);
  const [debouncedAddress, setDebouncedAddress] = React.useState<string | null>(address);

  // Debounce address changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(address);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [address, debounceMs]);

  const fetchTransactions = React.useCallback(async () => {
    if (!debouncedAddress) {
      setReceivedTransactions([]);
      setSentTransactions([]);
      setReceivedCount(0);
      setSentCount(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await defaultSpacescanClient.getNftTransactions(debouncedAddress, limit, offset);
      setReceivedTransactions(result.received_transactions?.transactions || []);
      setSentTransactions(result.send_transactions?.transactions || []);
      setReceivedCount(result.received_transactions?.total_count || 0);
      setSentCount(result.send_transactions?.total_count || 0);
      setError(null);
    } catch (err) {
      // This should never happen now, but keep as fallback
      setError(null);
      setReceivedTransactions([]);
      setSentTransactions([]);
      setReceivedCount(0);
      setSentCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedAddress, limit, offset]);

  // Fetch transactions when parameters change
  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Combined transactions for backward compatibility
  const allTransactions = React.useMemo(() => {
    return [...receivedTransactions, ...sentTransactions];
  }, [receivedTransactions, sentTransactions]);

  return {
    transactions: allTransactions, // For backward compatibility
    receivedTransactions,
    sentTransactions,
    loading,
    error,
    count: receivedCount + sentCount, // Total count for backward compatibility
    receivedCount,
    sentCount,
    refetch: fetchTransactions,
    hasTransactions: allTransactions.length > 0,
    clearCache: () => defaultSpacescanClient.clearCache(debouncedAddress || undefined)
  };
};

// Hook for using Spacescan token transactions with debouncing
export const useSpacescanTokenTransactions = (address: string | null, limit: number = 100, offset: number = 0, debounceMs: number = 500) => {
  const [receivedTransactions, setReceivedTransactions] = React.useState<SpacescanTokenTransaction[]>([]);
  const [sentTransactions, setSentTransactions] = React.useState<SpacescanTokenTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receivedCount, setReceivedCount] = React.useState(0);
  const [sentCount, setSentCount] = React.useState(0);
  const [debouncedAddress, setDebouncedAddress] = React.useState<string | null>(address);

  // Debounce address changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(address);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [address, debounceMs]);

  const fetchTransactions = React.useCallback(async () => {
    if (!debouncedAddress) {
      setReceivedTransactions([]);
      setSentTransactions([]);
      setReceivedCount(0);
      setSentCount(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await defaultSpacescanClient.getTokenTransactions(debouncedAddress, limit, offset);
      setReceivedTransactions(result.received_transactions?.transactions || []);
      setSentTransactions(result.send_transactions?.transactions || []);
      setReceivedCount(result.received_transactions?.total_count || 0);
      setSentCount(result.send_transactions?.total_count || 0);
      setError(null);
    } catch (err) {
      // This should never happen now, but keep as fallback
      setError(null);
      setReceivedTransactions([]);
      setSentTransactions([]);
      setReceivedCount(0);
      setSentCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedAddress, limit, offset]);

  // Fetch transactions when parameters change
  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Combined transactions for backward compatibility
  const allTransactions = React.useMemo(() => {
    return [...receivedTransactions, ...sentTransactions];
  }, [receivedTransactions, sentTransactions]);

  return {
    transactions: allTransactions, // For backward compatibility
    receivedTransactions,
    sentTransactions,
    loading,
    error,
    count: receivedCount + sentCount, // Total count for backward compatibility
    receivedCount,
    sentCount,
    refetch: fetchTransactions,
    hasTransactions: allTransactions.length > 0,
    clearCache: () => defaultSpacescanClient.clearCache(debouncedAddress || undefined)
  };
};

// Hook for using Spacescan XCH transactions with debouncing
export const useSpacescanXCHTransactions = (address: string | null, limit: number = 100, offset: number = 0, debounceMs: number = 500) => {
  const [receivedTransactions, setReceivedTransactions] = React.useState<SpacescanTransaction[]>([]);
  const [sentTransactions, setSentTransactions] = React.useState<SpacescanTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receivedCount, setReceivedCount] = React.useState(0);
  const [sentCount, setSentCount] = React.useState(0);
  const [debouncedAddress, setDebouncedAddress] = React.useState<string | null>(address);

  // Debounce address changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(address);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [address, debounceMs]);

  const fetchTransactions = React.useCallback(async () => {
    if (!debouncedAddress) {
      setReceivedTransactions([]);
      setSentTransactions([]);
      setReceivedCount(0);
      setSentCount(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await defaultSpacescanClient.getXchTransactions(debouncedAddress, limit, offset);
      setReceivedTransactions(result.received_transactions?.transactions || []);
      setSentTransactions(result.send_transactions?.transactions || []);
      setReceivedCount(result.received_transactions?.total_count || 0);
      setSentCount(result.send_transactions?.total_count || 0);
      setError(null);
    } catch (err) {
      // This should never happen now, but keep as fallback
      setError(null);
      setReceivedTransactions([]);
      setSentTransactions([]);
      setReceivedCount(0);
      setSentCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedAddress, limit, offset]);

  // Fetch transactions when parameters change
  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Combined transactions for backward compatibility
  const allTransactions = React.useMemo(() => {
    return [...receivedTransactions, ...sentTransactions];
  }, [receivedTransactions, sentTransactions]);

  return {
    transactions: allTransactions, // For backward compatibility
    receivedTransactions,
    sentTransactions,
    loading,
    error,
    count: receivedCount + sentCount, // Total count for backward compatibility
    receivedCount,
    sentCount,
    refetch: fetchTransactions,
    hasTransactions: allTransactions.length > 0,
    clearCache: () => defaultSpacescanClient.clearCache(debouncedAddress || undefined)
  };
};

// Hook for managing Spacescan cache
export const useSpacescanCache = () => {
  const [cacheStats, setCacheStats] = React.useState(defaultSpacescanClient.getCacheStats());

  const refreshStats = React.useCallback(() => {
    setCacheStats(defaultSpacescanClient.getCacheStats());
  }, []);

  const clearAllCache = React.useCallback(() => {
    defaultSpacescanClient.clearCache();
    refreshStats();
  }, [refreshStats]);

  const clearAddressCache = React.useCallback((address: string) => {
    defaultSpacescanClient.clearCache(address);
    refreshStats();
  }, [refreshStats]);

  // Auto-refresh stats every 5 seconds when component is mounted
  React.useEffect(() => {
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    cacheStats,
    refreshStats,
    clearAllCache,
    clearAddressCache
  };
};
