/**
 * Spacescan API Client for Chia blockchain data
 * Documentation: https://docs.spacescan.io/api/address/xch_balance
 */

export interface SpacescanBalanceResponse {
  status: 'success' | 'error';
  xch?: number;
  mojo?: number;
  error?: string;
  message?: string;
}

export interface SpacescanNFT {
  nft_id: string;
  launcher_id: string;
  owner_did?: string;
  data_uris: string[];
  meta_uris: string[];
  license_uris: string[];
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
  collection_id?: string;
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

export interface SpacescanConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export class SpacescanClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: SpacescanConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.spacescan.io';
    this.timeout = config.timeout || 10000; // 10 seconds
  }

  /**
   * Get NFT balance for a specific address
   * @param address - The XCH address to query (xch...)
   * @returns Promise with NFT information
   */
  async getNftBalance(address: string): Promise<SpacescanNFTBalanceResponse> {
    try {
      if (!address || !address.startsWith('xch')) {
        return {
          status: 'error',
          error: 'Invalid address format. Address must start with "xch"'
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}/address/nft_balance/${address}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'Chia-Wallet-Client/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          status: 'error',
          error: `API error (${response.status}): ${errorText}`
        };
      }

      const data = await response.json();
      
      // Validate response structure
      if (data.status === 'success') {
        return {
          status: 'success',
          data: data.data || [],
          count: data.count || 0
        };
      } else {
        return {
          status: 'error',
          error: data.message || 'Invalid response format from API'
        };
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          error: 'Request timed out'
        };
      } else {
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  }

  /**
   * Get XCH balance for a specific address
   * @param address - The XCH address to query (xch...)
   * @returns Promise with balance information
   */
  async getXchBalance(address: string): Promise<SpacescanBalanceResponse> {
    try {
      if (!address || !address.startsWith('xch')) {
        return {
          status: 'error',
          error: 'Invalid address format. Address must start with "xch"'
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}/address/xch-balance/${address}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'Chia-Wallet-Client/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          status: 'error',
          error: `API error (${response.status}): ${errorText}`
        };
      }

      const data = await response.json();
      
      // Validate response structure
      if (data.status === 'success' && typeof data.xch === 'number' && typeof data.mojo === 'number') {
        return {
          status: 'success',
          xch: data.xch,
          mojo: data.mojo
        };
      } else {
        return {
          status: 'error',
          error: data.message || 'Invalid response format from API'
        };
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'error',
          error: 'Request timed out'
        };
      } else {
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
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
}

// Default instance with provided API key
export const defaultSpacescanClient = new SpacescanClient({
  apiKey: 'esL8oRqzao1qQ6f5kYbB16iQ2C9zdXOl8BNm72Us'
});

// Hook for using Spacescan XCH balance
export const useSpacescanBalance = (address: string | null) => {
  const [balance, setBalance] = React.useState<SpacescanBalanceResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchBalance = React.useCallback(async () => {
    if (!address) {
      setBalance(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await defaultSpacescanClient.getXchBalance(address);
      
      if (result.status === 'success') {
        setBalance(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch balance');
        setBalance(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Fetch balance when address changes
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
    formattedBalance: balance?.xch ? SpacescanClient.formatXch(balance.xch) : '0.000000'
  };
};

// Hook for using Spacescan NFT balance
export const useSpacescanNFTs = (address: string | null) => {
  const [nfts, setNfts] = React.useState<SpacescanNFT[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [count, setCount] = React.useState(0);

  const fetchNFTs = React.useCallback(async () => {
    if (!address) {
      setNfts([]);
      setCount(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await defaultSpacescanClient.getNftBalance(address);
      
      if (result.status === 'success') {
        setNfts(result.data || []);
        setCount(result.count || 0);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch NFTs');
        setNfts([]);
        setCount(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setNfts([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Fetch NFTs when address changes
  React.useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    loading,
    error,
    count,
    refetch: fetchNFTs,
    hasNFTs: nfts.length > 0
  };
};

// We need to import React for the hook
import React from 'react';
