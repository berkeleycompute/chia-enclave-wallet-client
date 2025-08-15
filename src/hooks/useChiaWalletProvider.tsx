import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin, type Coin } from '../client/ChiaCloudWalletClient';

// Central wallet state interface
export interface ChiaWalletState {
  // Connection & Auth
  isConnected: boolean;
  isConnecting: boolean;
  jwtToken: string | null;
  address: string | null;
  syntheticPublicKey: string | null;
  
  // Balance & Coins
  balance: number;
  coinCount: number;
  hydratedCoins: HydratedCoin[];
  unspentCoins: Coin[];
  
  // Loading states
  loading: boolean;
  balanceLoading: boolean;
  
  // Errors
  error: string | null;
  balanceError: string | null;
  
  // Metadata
  lastRefresh: number;
  
  // Client
  client: ChiaCloudWalletClient;
}

// Provider configuration
export interface ChiaWalletProviderConfig {
  baseUrl?: string;
  enableLogging?: boolean;
  autoConnect?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Context actions interface
export interface ChiaWalletActions {
  // Authentication
  setJwtToken: (token: string | null) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  
  // Data refresh
  refresh: () => Promise<boolean>;
  refreshBalance: () => Promise<boolean>;
  refreshCoins: () => Promise<boolean>;
  
  // State management
  reset: () => void;
  updateState: (updates: Partial<ChiaWalletState>) => void;
}

// Full context value
export interface ChiaWalletContextValue {
  state: ChiaWalletState;
  actions: ChiaWalletActions;
  config: ChiaWalletProviderConfig;
}

// Create context
const ChiaWalletContext = createContext<ChiaWalletContextValue | null>(null);

// Provider props
export interface ChiaWalletProviderProps {
  children: React.ReactNode;
  config?: ChiaWalletProviderConfig;
  jwtToken?: string | null;
}

// Provider component
export const ChiaWalletProvider: React.FC<ChiaWalletProviderProps> = ({
  children,
  config = {},
  jwtToken: initialJwtToken
}) => {
  const refreshIntervalRef = useRef<number | null>(null);
  
  // Initialize client
  const client = useRef(new ChiaCloudWalletClient({
    baseUrl: config.baseUrl,
    enableLogging: config.enableLogging
  })).current;

  // Central state
  const [state, setState] = useState<ChiaWalletState>({
    isConnected: false,
    isConnecting: false,
    jwtToken: initialJwtToken || null,
    address: null,
    syntheticPublicKey: null,
    balance: 0,
    coinCount: 0,
    hydratedCoins: [],
    unspentCoins: [],
    loading: false,
    balanceLoading: false,
    error: null,
    balanceError: null,
    lastRefresh: 0,
    client
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<ChiaWalletState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Refresh all data
  const refresh = useCallback(async (): Promise<boolean> => {
    if (!state.isConnected || !state.address) return false;

    updateState({ loading: true, error: null, balanceError: null });

    try {
      const coinsResult = await client.getUnspentHydratedCoins(state.address);
      if (!coinsResult.success) {
        throw new Error(coinsResult.error);
      }

      const hydratedCoins = coinsResult.data;
      const unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
      const balance = unspentCoins.reduce((sum, coin) => sum + parseInt(coin.amount), 0);

      updateState({
        hydratedCoins,
        unspentCoins,
        balance,
        coinCount: unspentCoins.length,
        lastRefresh: Date.now(),
        loading: false
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refresh failed';
      updateState({
        loading: false,
        error: message
      });
      return false;
    }
  }, [state.isConnected, state.address, client, updateState]);

  // Refresh just balance/coins
  const refreshBalance = useCallback(async (): Promise<boolean> => {
    if (!state.isConnected || !state.address) return false;

    updateState({ balanceLoading: true, balanceError: null });

    try {
      const coinsResult = await client.getUnspentHydratedCoins(state.address);
      if (!coinsResult.success) {
        throw new Error(coinsResult.error);
      }

      const hydratedCoins = coinsResult.data;
      const unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
      const balance = unspentCoins.reduce((sum, coin) => sum + parseInt(coin.amount), 0);

      updateState({
        hydratedCoins,
        unspentCoins,
        balance,
        coinCount: unspentCoins.length,
        lastRefresh: Date.now(),
        balanceLoading: false
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Balance refresh failed';
      updateState({
        balanceLoading: false,
        balanceError: message
      });
      return false;
    }
  }, [state.isConnected, state.address, client, updateState]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    // Clear auto refresh
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    updateState({
      isConnected: false,
      isConnecting: false,
      address: null,
      syntheticPublicKey: null,
      balance: 0,
      coinCount: 0,
      hydratedCoins: [],
      unspentCoins: [],
      error: null,
      balanceError: null,
      lastRefresh: 0
    });

    client.setJwtToken(undefined as any);
  }, [client, updateState]);

  // Connect wallet
  const connect = useCallback(async (): Promise<boolean> => {
    if (!state.jwtToken) {
      updateState({ error: 'JWT token is required' });
      return false;
    }

    updateState({ isConnecting: true, error: null });

    try {
      // Get wallet address
      const pkResult = await client.getPublicKey();
      if (!pkResult.success) {
        throw new Error(pkResult.error);
      }

      const address = pkResult.data.address;
      const syntheticPublicKey = pkResult.data.synthetic_public_key;

      // Get initial coin data
      const coinsResult = await client.getUnspentHydratedCoins(address);
      let hydratedCoins: HydratedCoin[] = [];
      let unspentCoins: Coin[] = [];
      let balance = 0;
      
      if (coinsResult.success) {
        hydratedCoins = coinsResult.data.data;
        unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
        balance = unspentCoins.reduce((sum, coin) => sum + parseInt(coin.amount), 0);
      }

      updateState({
        isConnected: true,
        isConnecting: false,
        address: address,
        syntheticPublicKey,
        hydratedCoins,
        unspentCoins,
        balance,
        coinCount: unspentCoins.length,
        lastRefresh: Date.now(),
        error: null,
        balanceError: coinsResult.success ? null : coinsResult.error
      });

      // Setup auto refresh
      if (config.autoRefresh !== false && config.refreshInterval) {
        refreshIntervalRef.current = window.setInterval(() => {
          refresh();
        }, config.refreshInterval);
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      updateState({
        isConnecting: false,
        isConnected: false,
        error: message
      });
      return false;
    }
  }, [state.jwtToken, config.autoRefresh, config.refreshInterval, client, updateState]);

  // Set JWT token
  const setJwtToken = useCallback((token: string | null) => {
    updateState({ jwtToken: token });
    if (token) {
      client.setJwtToken(token);
      if (config.autoConnect !== false) {
        connect();
      }
    } else {
      disconnect();
    }
  }, [config.autoConnect, client, updateState]);

  // Refresh coins (alias for refreshBalance)
  const refreshCoins = refreshBalance;

  // Reset state
  const reset = useCallback(() => {
    disconnect();
    updateState({
      jwtToken: null,
      error: null,
      balanceError: null
    });
  }, [updateState]);

  // Actions object
  const actions: ChiaWalletActions = {
    setJwtToken,
    connect,
    disconnect,
    refresh,
    refreshBalance,
    refreshCoins,
    reset,
    updateState
  };

  // Context value
  const contextValue: ChiaWalletContextValue = {
    state,
    actions,
    config
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Set initial JWT token
  useEffect(() => {
    if (initialJwtToken && initialJwtToken !== state.jwtToken) {
      setJwtToken(initialJwtToken);
    }
  }, [initialJwtToken, state.jwtToken, setJwtToken]);

  return (
    <ChiaWalletContext.Provider value={contextValue}>
      {children}
    </ChiaWalletContext.Provider>
  );
};

// Hook to use the context
export const useChiaWalletContext = (): ChiaWalletContextValue => {
  const context = useContext(ChiaWalletContext);
  if (!context) {
    throw new Error('useChiaWalletContext must be used within a ChiaWalletProvider');
  }
  return context;
};

// Hook to get just the state
export const useChiaWalletState = (): ChiaWalletState => {
  const { state } = useChiaWalletContext();
  return state;
};

// Hook to get just the actions
export const useChiaWalletActions = (): ChiaWalletActions => {
  const { actions } = useChiaWalletContext();
  return actions;
};

// Ensure this file is treated as a module
export {}; 