import { useState, useCallback, useEffect } from 'react';
import { 
  ChiaInsightClient, 
  type GetHydratedCoinsOptions, 
  type ChiaInsightConfig 
} from '../client/ChiaInsightClient';
import { type HydratedCoin } from '../client/ChiaCloudWalletClient';

export interface UseChiaInsightConfig extends ChiaInsightConfig {
  autoFetch?: boolean;
  refetchInterval?: number;
}

export interface ChiaInsightState {
  // Data
  coins: HydratedCoin[];
  categorizedCoins: {
    xchCoins: HydratedCoin[];
    catCoins: HydratedCoin[];
    nftCoins: HydratedCoin[];
    totalBalance: number;
    coinCount: number;
  } | null;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCoins: number;
  pageSize: number;
  
  // State
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Actions
  fetchCoins: (puzzleHash: string, options?: GetHydratedCoinsOptions) => Promise<boolean>;
  fetchAllCoins: (puzzleHash: string, options?: GetHydratedCoinsOptions) => Promise<boolean>;
  fetchCategorizedCoins: (puzzleHash: string, options?: GetHydratedCoinsOptions) => Promise<boolean>;
  fetchNextPage: () => Promise<boolean>;
  fetchPage: (page: number) => Promise<boolean>;
  reset: () => void;
  setPageSize: (size: number) => void;
  
  // Client access
  client: ChiaInsightClient;
}

export function useChiaInsight(config: UseChiaInsightConfig = {}): ChiaInsightState {
  const [client] = useState(() => new ChiaInsightClient(config));
  const [currentPuzzleHash, setCurrentPuzzleHash] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState<GetHydratedCoinsOptions>({});
  
  const [state, setState] = useState({
    coins: [] as HydratedCoin[],
    categorizedCoins: null as ChiaInsightState['categorizedCoins'],
    currentPage: 1,
    totalPages: 1,
    totalCoins: 0,
    pageSize: 50,
    isLoading: false,
    error: null as string | null,
    hasMore: false,
  });

  // Reset state
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      coins: [],
      categorizedCoins: null,
      currentPage: 1,
      totalPages: 1,
      totalCoins: 0,
      error: null,
      hasMore: false,
      isLoading: false,
    }));
    setCurrentPuzzleHash(null);
    setCurrentOptions({});
  }, []);

  // Set page size
  const setPageSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, pageSize: size }));
  }, []);

  // Fetch paginated coins
  const fetchCoins = useCallback(async (
    puzzleHash: string, 
    options: GetHydratedCoinsOptions = {}
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setCurrentPuzzleHash(puzzleHash);
    setCurrentOptions(options);

    try {
      const result = await client.getHydratedCoins(puzzleHash, {
        ...options,
        page: options.page || state.currentPage,
        pageSize: options.pageSize || state.pageSize
      });

      if (!result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error
        }));
        return false;
      }

      const { data, pagination, total_coin_ids_found } = result.data;
      const totalPages = Math.ceil(total_coin_ids_found / pagination.page_size);
      const hasMore = pagination.page < totalPages;

      setState(prev => ({
        ...prev,
        coins: data,
        currentPage: pagination.page,
        totalPages,
        totalCoins: total_coin_ids_found,
        pageSize: pagination.page_size,
        hasMore,
        isLoading: false,
        error: null
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch coins';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, [client, state.currentPage, state.pageSize]);

  // Fetch all coins (all pages)
  const fetchAllCoins = useCallback(async (
    puzzleHash: string, 
    options: GetHydratedCoinsOptions = {}
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setCurrentPuzzleHash(puzzleHash);
    setCurrentOptions(options);

    try {
      const result = await client.getAllHydratedCoins(puzzleHash, options);

      if (!result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error
        }));
        return false;
      }

      setState(prev => ({
        ...prev,
        coins: result.data,
        totalCoins: result.data.length,
        coinCount: result.data.length,
        currentPage: 1,
        totalPages: 1,
        hasMore: false,
        isLoading: false,
        error: null
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch all coins';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, [client]);

  // Fetch categorized coins (compatible with existing hooks)
  const fetchCategorizedCoins = useCallback(async (
    puzzleHash: string, 
    options: GetHydratedCoinsOptions = {}
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setCurrentPuzzleHash(puzzleHash);
    setCurrentOptions(options);

    try {
      const result = await client.getCategorizedHydratedCoins(puzzleHash, options);

      if (!result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error
        }));
        return false;
      }

      setState(prev => ({
        ...prev,
        categorizedCoins: result.data,
        coins: result.data.allCoins.map(coin => ({
          coin: coin.coin,
          createdHeight: coin.createdHeight,
          catInfo: coin.parentSpendInfo?.driverInfo?.type === 'CAT' ? {
            type: 'CAT' as const,
            assetId: coin.parentSpendInfo.driverInfo.assetId || '',
            symbol: null,
            name: null,
            cats: []
          } : undefined,
          nftInfo: coin.parentSpendInfo?.driverInfo?.type === 'NFT' ? {
            type: 'NFT' as const,
            launcherId: coin.parentSpendInfo.driverInfo.info?.launcherId,
            metadata: coin.parentSpendInfo.driverInfo.info?.metadata
          } : undefined
        } as HydratedCoin)),
        totalCoins: result.data.coinCount,
        isLoading: false,
        error: null
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categorized coins';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, [client]);

  // Fetch next page
  const fetchNextPage = useCallback(async (): Promise<boolean> => {
    if (!currentPuzzleHash || !state.hasMore || state.isLoading) {
      return false;
    }

    return fetchCoins(currentPuzzleHash, {
      ...currentOptions,
      page: state.currentPage + 1
    });
  }, [currentPuzzleHash, currentOptions, state.hasMore, state.isLoading, state.currentPage, fetchCoins]);

  // Fetch specific page
  const fetchPage = useCallback(async (page: number): Promise<boolean> => {
    if (!currentPuzzleHash || page < 1 || page > state.totalPages) {
      return false;
    }

    return fetchCoins(currentPuzzleHash, {
      ...currentOptions,
      page
    });
  }, [currentPuzzleHash, currentOptions, state.totalPages, fetchCoins]);

  // Auto-fetch with interval (if enabled)
  useEffect(() => {
    if (!config.autoFetch || !config.refetchInterval || !currentPuzzleHash) {
      return;
    }

    const interval = setInterval(() => {
      if (!state.isLoading) {
        fetchCoins(currentPuzzleHash, currentOptions);
      }
    }, config.refetchInterval);

    return () => clearInterval(interval);
  }, [config.autoFetch, config.refetchInterval, currentPuzzleHash, currentOptions, state.isLoading, fetchCoins]);

  return {
    // Data
    coins: state.coins,
    categorizedCoins: state.categorizedCoins,
    
    // Pagination
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    totalCoins: state.totalCoins,
    pageSize: state.pageSize,
    
    // State
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    
    // Actions
    fetchCoins,
    fetchAllCoins,
    fetchCategorizedCoins,
    fetchNextPage,
    fetchPage,
    reset,
    setPageSize,
    
    // Client access
    client
  };
} 