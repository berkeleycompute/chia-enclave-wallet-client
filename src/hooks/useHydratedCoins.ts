import { useState, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin, type Coin } from '../client/ChiaCloudWalletClient';
import { ChiaInsightClient } from '../client/ChiaInsightClient';

export interface UseHydratedCoinsConfig {
  jwtToken?: string | null;
  baseUrl?: string;
  enableLogging?: boolean;
  autoFetch?: boolean;
  // ChiaInsight configuration
  insightUrl?: string;
  insightJwtToken?: string;
  useInsightClient?: boolean;
}

export interface HydratedCoinsState {
  // Data
  hydratedCoins: HydratedCoin[];
  unspentCoins: Coin[];
  balance: number;
  coinCount: number;
  
  // Metadata
  address: string | null;
  syntheticPublicKey: string | null; // Only used for offers
  
  // Status
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastFetch: number;
  
  // Actions
  fetchCoins: () => Promise<boolean>;
  reset: () => void;
  
  // Utilities
  formatBalance: (balance: number) => string;
  getNFTCoins: () => HydratedCoin[];
  getXCHCoins: () => HydratedCoin[];
  getCATCoins: () => HydratedCoin[];
}

export function useHydratedCoins(config: UseHydratedCoinsConfig = {}): HydratedCoinsState {
  const clientRef = useRef<ChiaCloudWalletClient | null>(null);
  const insightClientRef = useRef<ChiaInsightClient | null>(null);
  
  // Initialize clients
  if (!clientRef.current || config.baseUrl) {
    clientRef.current = new ChiaCloudWalletClient({
      baseUrl: config.baseUrl,
      enableLogging: config.enableLogging
    });
  }

  // Initialize ChiaInsight client if configured
  if (config.useInsightClient && (!insightClientRef.current || config.insightUrl)) {
    insightClientRef.current = new ChiaInsightClient({
      apiUrl: config.insightUrl || 'https://aedugkfqljpfirjylfvq.supabase.co/functions/v1/api',
      apiToken: config.insightJwtToken,
      enableLogging: config.enableLogging
    });
  }

  const [state, setState] = useState({
    hydratedCoins: [] as HydratedCoin[],
    unspentCoins: [] as Coin[],
    balance: 0,
    coinCount: 0,
    address: null as string | null,
    syntheticPublicKey: null as string | null,
    isLoading: false,
    isConnected: false,
    error: null as string | null,
    lastFetch: 0
  });

  const fetchCoins = useCallback(async (): Promise<boolean> => {
    const client = clientRef.current;
    if (!client || !config.jwtToken) {
      setState(prev => ({
        ...prev,
        error: 'JWT token and client are required',
        isLoading: false
      }));
      return false;
    }

    console.log('🚀 useHydratedCoins: Starting fetchCoins', {
      hasToken: !!config.jwtToken,
      hasClient: !!client
    });

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // Set JWT token on client
      client.setJwtToken(config.jwtToken);

      // Get wallet address first
      console.log('📝 useHydratedCoins: Fetching wallet address...');
      const pkResponse = await client.getPublicKey();
      if (!pkResponse.success) {
        throw new Error(pkResponse.error);
      }

      const address = pkResponse.data.address;
      const syntheticPublicKey = pkResponse.data.synthetic_public_key;
      
      console.log('✅ useHydratedCoins: Wallet address fetched', {
        address: address.substring(0, 16) + '...',
        syntheticKey: syntheticPublicKey ? syntheticPublicKey.substring(0, 16) + '...' : null
      });

      // Get hydrated coins using ChiaInsight client if available, otherwise use legacy client
      console.log('💰 useHydratedCoins: Fetching hydrated coins...');
      let hydratedCoins: HydratedCoin[];

      if (insightClientRef.current && config.useInsightClient) {
        // Convert address to puzzle hash for ChiaInsight client
        const puzzleHashResult = ChiaCloudWalletClient.convertAddressToPuzzleHash(address);
        if (!puzzleHashResult.success) {
          throw new Error(`Failed to convert address to puzzle hash: ${puzzleHashResult.error}`);
        }

        const hydratedResult = await insightClientRef.current.getStandardFormatHydratedCoins(puzzleHashResult.data);
        if (!hydratedResult.success) {
          throw new Error(hydratedResult.error);
        }

        hydratedCoins = hydratedResult.data;
        console.log('✅ useHydratedCoins: Hydrated coins fetched via ChiaInsight');
      } else {
        // Use legacy client
        const hydratedResult = await client.getUnspentHydratedCoins(address);
        if (!hydratedResult.success) {
          throw new Error(hydratedResult.error);
        }

        hydratedCoins = hydratedResult.data.data;
        console.log('✅ useHydratedCoins: Hydrated coins fetched via legacy client');
      }
      const unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
      
      // Calculate balance
      let totalBalance = 0;
      for (const coin of unspentCoins) {
        try {
          totalBalance += parseInt(coin.amount);
        } catch (error) {
          console.warn('Invalid coin amount:', coin.amount);
        }
      }

      const newState = {
        hydratedCoins,
        unspentCoins,
        balance: totalBalance,
        coinCount: unspentCoins.length,
        address,
        syntheticPublicKey,
        isLoading: false,
        isConnected: true,
        error: null,
        lastFetch: Date.now()
      };

      console.log('✅ useHydratedCoins: Data fetched successfully', {
        coinsCount: hydratedCoins.length,
        balance: totalBalance,
        formattedBalance: formatBalance(totalBalance)
      });

      setState(newState);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hydrated coins';
      console.error('❌ useHydratedCoins: Fetch failed', errorMessage);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isConnected: false,
        error: errorMessage
      }));
      return false;
    }
  }, [config.jwtToken, config.baseUrl, config.enableLogging]);

  const reset = useCallback(() => {
    console.log('🔄 useHydratedCoins: Resetting state');
    setState({
      hydratedCoins: [],
      unspentCoins: [],
      balance: 0,
      coinCount: 0,
      address: null,
      syntheticPublicKey: null,
      isLoading: false,
      isConnected: false,
      error: null,
      lastFetch: 0
    });
  }, []);

  const formatBalance = useCallback((balance: number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(balance);
    if (!result.success) return '0';
    
    let formatted = result.data.toFixed(13);
    formatted = formatted.replace(/\.?0+$/, '');
    
    return formatted;
  }, []);

  const getNFTCoins = useCallback((): HydratedCoin[] => {
    return state.hydratedCoins.filter(coin => 
      coin.parentSpendInfo?.driverInfo?.type === 'NFT'
    );
  }, [state.hydratedCoins]);

  const getXCHCoins = useCallback((): HydratedCoin[] => {
    return state.hydratedCoins.filter(coin => 
      !coin.parentSpendInfo?.driverInfo?.type || 
      coin.parentSpendInfo?.driverInfo?.type === undefined
    );
  }, [state.hydratedCoins]);

  const getCATCoins = useCallback((): HydratedCoin[] => {
    return state.hydratedCoins.filter(coin => 
      coin.parentSpendInfo?.driverInfo?.type === 'CAT'
    );
  }, [state.hydratedCoins]);

  return {
    ...state,
    fetchCoins,
    reset,
    formatBalance,
    getNFTCoins,
    getXCHCoins,
    getCATCoins
  };
} 