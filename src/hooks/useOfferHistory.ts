import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  ChiaCloudWalletClient,
  type GetOfferHistoryResponse,
  type OfferHistoryItem
} from '../client/ChiaCloudWalletClient';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';

// Offer status constants
export const OFFER_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  CANCELLED: 2,
  EXPIRED: 3,
  COMPLETED: 4
} as const;

export type OfferStatus = typeof OFFER_STATUS[keyof typeof OFFER_STATUS];

// Hook configuration
export interface UseOfferHistoryConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  sdk?: ChiaWalletSDK;
  address?: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
  baseUrl?: string;
  enableLogging?: boolean;
  filterByStatus?: OfferStatus[];
  maxItems?: number;
}

// Hook result interface
export interface UseOfferHistoryResult {
  // State
  offers: OfferHistoryItem[];
  filteredOffers: OfferHistoryItem[];
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  totalOffers: number;
  address: string | null;

  // Actions
  refresh: () => Promise<boolean>;
  reset: () => void;

  // Filtering and utilities
  getOffersByStatus: (status: OfferStatus) => OfferHistoryItem[];
  getActiveOffers: () => OfferHistoryItem[];
  getCompletedOffers: () => OfferHistoryItem[];
  getPendingOffers: () => OfferHistoryItem[];
  getCancelledOffers: () => OfferHistoryItem[];
  getExpiredOffers: () => OfferHistoryItem[];
  getOfferById: (offerId: string) => OfferHistoryItem | undefined;
  isStale: () => boolean;

  // Statistics
  getOfferStats: () => {
    total: number;
    active: number;
    completed: number;
    pending: number;
    cancelled: number;
    expired: number;
  };
}

// Main offer history hook
export function useOfferHistory(config: UseOfferHistoryConfig = {}): UseOfferHistoryResult {
  const {
    jwtToken,
    client: externalClient,
    sdk: externalSDK,
    address: externalAddress,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes default
    baseUrl,
    enableLogging = true,
    filterByStatus,
    maxItems
  } = config;

  // Internal client if none provided
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);

  const [offers, setOffers] = useState<OfferHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [totalOffers, setTotalOffers] = useState(0);
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
      console.warn('Failed to get wallet address for offer history:', error);
    }

    return null;
  }, [externalAddress, address, externalSDK, getClient]);

  // Filter offers based on configuration
  const filteredOffers = useMemo(() => {
    let filtered = [...offers];

    // Filter by status if specified
    if (filterByStatus && filterByStatus.length > 0) {
      filtered = filtered.filter(offer => filterByStatus.includes(offer.status as OfferStatus));
    }

    // Limit number of items if specified
    if (maxItems && maxItems > 0) {
      filtered = filtered.slice(0, maxItems);
    }

    return filtered;
  }, [offers, filterByStatus, maxItems]);

  // Refresh offer history data
  const refresh = useCallback(async (): Promise<boolean> => {
    // Rate limiting: prevent calls more frequent than 5 seconds
    const now = Date.now();
    if (now - lastUpdate < 5000) {
      console.log('🚫 useOfferHistory: Refresh rate limited, skipping call');
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

      const result = await client.getOfferHistory(currentAddress);
      if (!result.success) {
        throw new Error((result as any).error);
      }

      setOffers(result.data.offers || []);
      setTotalOffers(result.data.offer_count || 0);
      setLastUpdate(Date.now());
      setLoading(false);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh offer history';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [getClient, getAddress, lastUpdate]);

  // Reset hook state
  const reset = useCallback(() => {
    setOffers([]);
    setError(null);
    setLastUpdate(0);
    setTotalOffers(0);
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

  // Filter utilities
  const getOffersByStatus = useCallback((status: OfferStatus): OfferHistoryItem[] => {
    return offers.filter(offer => offer.status === status);
  }, [offers]);

  const getActiveOffers = useCallback(() => getOffersByStatus(OFFER_STATUS.ACTIVE), [getOffersByStatus]);
  const getCompletedOffers = useCallback(() => getOffersByStatus(OFFER_STATUS.COMPLETED), [getOffersByStatus]);
  const getPendingOffers = useCallback(() => getOffersByStatus(OFFER_STATUS.PENDING), [getOffersByStatus]);
  const getCancelledOffers = useCallback(() => getOffersByStatus(OFFER_STATUS.CANCELLED), [getOffersByStatus]);
  const getExpiredOffers = useCallback(() => getOffersByStatus(OFFER_STATUS.EXPIRED), [getOffersByStatus]);

  const getOfferById = useCallback((offerId: string): OfferHistoryItem | undefined => {
    return offers.find(offer => offer.offer_id === offerId);
  }, [offers]);

  // Get offer statistics
  const getOfferStats = useCallback(() => {
    const stats = {
      total: offers.length,
      active: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
      expired: 0
    };

    offers.forEach(offer => {
      switch (offer.status) {
        case OFFER_STATUS.ACTIVE:
          stats.active++;
          break;
        case OFFER_STATUS.COMPLETED:
          stats.completed++;
          break;
        case OFFER_STATUS.PENDING:
          stats.pending++;
          break;
        case OFFER_STATUS.CANCELLED:
          stats.cancelled++;
          break;
        case OFFER_STATUS.EXPIRED:
          stats.expired++;
          break;
      }
    });

    return stats;
  }, [offers]);

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
  }, [autoRefresh, refreshInterval, refresh]);

  // Auto-refresh when dependencies change
  useEffect(() => {
    if (jwtToken || externalClient || externalAddress) {
      refresh();
    }
  }, [jwtToken, externalClient, externalAddress, refresh]);

  return {
    offers,
    filteredOffers,
    loading,
    error,
    lastUpdate,
    totalOffers,
    address,
    refresh,
    reset,
    getOffersByStatus,
    getActiveOffers,
    getCompletedOffers,
    getPendingOffers,
    getCancelledOffers,
    getExpiredOffers,
    getOfferById,
    isStale,
    getOfferStats
  };
}

// Hook specifically for active offers
export function useActiveOffers(config: UseOfferHistoryConfig = {}) {
  const offerResult = useOfferHistory({
    ...config,
    filterByStatus: [OFFER_STATUS.ACTIVE]
  });

  return {
    offers: offerResult.getActiveOffers(),
    count: offerResult.getActiveOffers().length,
    loading: offerResult.loading,
    error: offerResult.error,
    lastUpdate: offerResult.lastUpdate,
    refresh: offerResult.refresh,
    reset: offerResult.reset,
    isStale: offerResult.isStale
  };
}

// Hook specifically for completed offers
export function useCompletedOffers(config: UseOfferHistoryConfig = {}) {
  const offerResult = useOfferHistory({
    ...config,
    filterByStatus: [OFFER_STATUS.COMPLETED]
  });

  return {
    offers: offerResult.getCompletedOffers(),
    count: offerResult.getCompletedOffers().length,
    loading: offerResult.loading,
    error: offerResult.error,
    lastUpdate: offerResult.lastUpdate,
    refresh: offerResult.refresh,
    reset: offerResult.reset,
    isStale: offerResult.isStale
  };
}
