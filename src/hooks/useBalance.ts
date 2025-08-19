import { useState, useEffect, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin, type Coin } from '../client/ChiaCloudWalletClient';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';

// Balance breakdown interface
export interface BalanceBreakdown {
  total: number;
  xch: number;
  cat: number;
  nft: number;
  formattedTotal: string;
  formattedXCH: string;
  formattedCAT: string;
  coinCount: number;
  xchCoinCount: number;
  catCoinCount: number;
  nftCoinCount: number;
}

// Hook configuration
export interface UseBalanceConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  sdk?: ChiaWalletSDK; // Add SDK option
  address?: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
  baseUrl?: string;
  enableLogging?: boolean;
}

// Hook result interface
export interface UseBalanceResult {
  balance: BalanceBreakdown | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number;

  // Actions
  refresh: () => Promise<boolean>;
  reset: () => void;

  // Utilities
  formatBalance: (amount: number) => string;
  isStale: () => boolean;
}

// Main balance hook
export function useBalance(config: UseBalanceConfig = {}): UseBalanceResult {
  const {
    jwtToken,
    client: externalClient,
    sdk: externalSDK, // Extract SDK
    address: externalAddress,
    autoRefresh = false,
    refreshInterval = 60000,
    baseUrl,
    enableLogging = true
  } = config;

  // Internal client if none provided
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);

  const [balance, setBalance] = useState<BalanceBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [address, setAddress] = useState<string | null>(externalAddress || null);

  // Get or create client
  const getClient = useCallback((): ChiaCloudWalletClient | null => {
    // Prefer SDK client if available
    if (externalSDK) return externalSDK.client;
    if (externalClient) return externalClient;

    if (!internalClient.current && (jwtToken || baseUrl)) {
      internalClient.current = new ChiaCloudWalletClient({
        baseUrl,
        enableLogging
      });

      if (jwtToken) {
        internalClient.current.setJwtToken(jwtToken);
      }
    }

    return internalClient.current;
  }, [externalClient, externalSDK, jwtToken, baseUrl, enableLogging]);

  // Format balance utility
  const formatBalance = useCallback((amount: number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(amount);
    if (!result.success) return '0';

    let formatted = result.data.toFixed(13);
    formatted = formatted.replace(/\.?0+$/, '');

    return formatted;
  }, []);

  // Calculate balance breakdown from hydrated coins
  const calculateBalanceBreakdown = useCallback((hydratedCoins: HydratedCoin[]): BalanceBreakdown => {
    let totalBalance = 0;
    let xchBalance = 0;
    let catBalance = 0;
    let nftBalance = 0;
    let xchCount = 0;
    let catCount = 0;
    let nftCount = 0;

    for (const hydratedCoin of hydratedCoins) {
      const amount = parseInt(hydratedCoin.coin.amount);
      totalBalance += amount;

      const driverType = hydratedCoin.parentSpendInfo?.driverInfo?.type;

      if (driverType === 'CAT') {
        catBalance += amount;
        catCount++;
      } else if (driverType === 'NFT') {
        nftBalance += amount;
        nftCount++;
      } else {
        xchBalance += amount;
        xchCount++;
      }
    }

    return {
      total: totalBalance,
      xch: xchBalance,
      cat: catBalance,
      nft: nftBalance,
      formattedTotal: formatBalance(totalBalance),
      formattedXCH: formatBalance(xchBalance),
      formattedCAT: formatBalance(catBalance),
      coinCount: hydratedCoins.length,
      xchCoinCount: xchCount,
      catCoinCount: catCount,
      nftCoinCount: nftCount
    };
  }, [formatBalance]);

  // Get wallet address (SDK-aware)
  const getAddress = useCallback(async (): Promise<string | null> => {
    if (externalAddress) return externalAddress;
    if (address) return address;

    // If SDK is available, use its cached method
    if (externalSDK) {
      try {
        const result = await externalSDK.getWalletInfo();
        if (result.success) {
          setAddress(result.data.address);
          return result.data.address;
        }
      } catch (error) {
        console.warn('Failed to get wallet address from SDK:', error);
      }
      return null;
    }

    // Fallback to direct client call
    const client = getClient();
    if (!client) return null;

    try {
      const result = await client.getPublicKey();
      if (result.success) {
        setAddress(result.data.address);
        return result.data.address;
      }
    } catch (error) {
      console.warn('Failed to get wallet address for balance:', error);
    }

    return null;
  }, [externalAddress, address, externalSDK, getClient]);

  // Refresh balance data
  const refresh = useCallback(async (): Promise<boolean> => {
    // Rate limiting: prevent calls more frequent than 1 second
    const now = Date.now();
    if (now - lastUpdate < 1000) {
      console.log('🚫 useBalance: Refresh rate limited, skipping call');
      return false;
    }

    const client = getClient();
    if (!client) {
      setError('No client available');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const currentAddress = await getAddress();
      if (!currentAddress) {
        throw new Error('Wallet address not available');
      }

      const result = await client.getUnspentHydratedCoins(currentAddress);
      if (!result.success) {
        throw new Error(result.error);
      }

      const balanceBreakdown = calculateBalanceBreakdown(result.data.data);
      setBalance(balanceBreakdown);
      setLastUpdate(Date.now());
      setLoading(false);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh balance';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [getClient, getAddress, calculateBalanceBreakdown]);

  // Reset hook state
  const reset = useCallback(() => {
    setBalance(null);
    setError(null);
    setLastUpdate(0);
    setLoading(false);

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Check if data is stale
  const isStale = useCallback((): boolean => {
    if (!lastUpdate) return true;
    const maxAge = refreshInterval * 2; // Consider stale after 2x refresh interval
    return Date.now() - lastUpdate > maxAge;
  }, [lastUpdate, refreshInterval]);

  // Setup auto refresh
  useEffect(() => {
    if (autoRefresh && !refreshIntervalRef.current) {
      refreshIntervalRef.current = window.setInterval(() => {
        refresh();
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Auto-refresh when dependencies change
  useEffect(() => {
    if (jwtToken || externalClient || externalAddress) {
      refresh();
    }
  }, [jwtToken, externalClient, externalAddress]);

  return {
    balance,
    loading,
    error,
    lastUpdate,
    refresh,
    reset,
    formatBalance,
    isStale
  };
}

// Hook specifically for XCH balance
export function useXCHBalance(config: UseBalanceConfig = {}) {
  const balanceResult = useBalance(config);

  return {
    balance: balanceResult.balance?.xch || 0,
    formattedBalance: balanceResult.balance?.formattedXCH || '0',
    coinCount: balanceResult.balance?.xchCoinCount || 0,
    loading: balanceResult.loading,
    error: balanceResult.error,
    lastUpdate: balanceResult.lastUpdate,
    refresh: balanceResult.refresh,
    reset: balanceResult.reset,
    isStale: balanceResult.isStale
  };
}

// Hook specifically for CAT balance
export function useCATBalance(config: UseBalanceConfig = {}) {
  const balanceResult = useBalance(config);

  return {
    balance: balanceResult.balance?.cat || 0,
    formattedBalance: balanceResult.balance?.formattedCAT || '0',
    coinCount: balanceResult.balance?.catCoinCount || 0,
    loading: balanceResult.loading,
    error: balanceResult.error,
    lastUpdate: balanceResult.lastUpdate,
    refresh: balanceResult.refresh,
    reset: balanceResult.reset,
    isStale: balanceResult.isStale
  };
}

// Hook for total balance (all assets)
export function useTotalBalance(config: UseBalanceConfig = {}) {
  const balanceResult = useBalance(config);

  return {
    balance: balanceResult.balance?.total || 0,
    formattedBalance: balanceResult.balance?.formattedTotal || '0',
    coinCount: balanceResult.balance?.coinCount || 0,
    breakdown: balanceResult.balance,
    loading: balanceResult.loading,
    error: balanceResult.error,
    lastUpdate: balanceResult.lastUpdate,
    refresh: balanceResult.refresh,
    reset: balanceResult.reset,
    isStale: balanceResult.isStale
  };
} 