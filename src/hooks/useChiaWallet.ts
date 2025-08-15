import { useState, useEffect, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type PublicKeyResponse, type HydratedCoin, type Coin } from '../client/ChiaCloudWalletClient';

// Event system for wallet state changes
export interface WalletEvent {
  type: 'hydratedCoinsChanged' | 'balanceChanged' | 'connectionChanged' | 'errorOccurred';
  data?: any;
  timestamp: number;
}

export type WalletEventListener = (event: WalletEvent) => void;

export interface UseChiaWalletConfig {
  baseUrl?: string;
  enableLogging?: boolean;
  autoConnect?: boolean;
}

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;

  // Authentication
  jwtToken: string | null;

  // Wallet data
  address: string | null; // The wallet address
  publicKeyData: PublicKeyResponse | null; // Full public key response
  syntheticPublicKey: string | null; // Only used for offers

  // Balance and coins
  balance: number;
  coinCount: number;
  unspentCoins: Coin[];
  hydratedCoins: HydratedCoin[];

  // Loading states
  balanceLoading: boolean;

  // Error states
  connectionError: string | null;
  balanceError: string | null;

  // Timestamps
  lastBalanceUpdate: number;
  lastConnectionUpdate: number;
}

export interface UseChiaWalletResult extends WalletState {
  // Client instance (for backward compatibility)
  client: ChiaCloudWalletClient;

  // Connection actions
  connect: (jwtToken: string) => Promise<boolean>;
  disconnect: () => void;

  // Data refresh actions
  refreshBalance: () => Promise<boolean>;
  refreshHydratedCoins: () => Promise<boolean>;

  // Utilities
  formatBalance: (balance: number) => string;

  // Event system
  addEventListener: (listener: WalletEventListener) => void;
  removeEventListener: (listener: WalletEventListener) => void;
  emitEvent: (event: WalletEvent) => void;
}

// Event listeners storage
const eventListeners = new Set<WalletEventListener>();

export function useChiaWallet(config: UseChiaWalletConfig = {}): UseChiaWalletResult {
  const clientRef = useRef<ChiaCloudWalletClient | null>(null);
  const eventsRef = useRef<WalletEventListener[]>([]);
  const autoRefreshIntervalRef = useRef<number | null>(null);

  // Initialize client
  if (!clientRef.current) {
    clientRef.current = new ChiaCloudWalletClient({
      baseUrl: config.baseUrl,
      enableLogging: config.enableLogging
    });
  }

  // Load persisted state from localStorage
  const getInitialState = (): WalletState => {
    try {
      const saved = localStorage.getItem('chiaWallet');
      if (saved) {
        const parsedState = JSON.parse(saved);
        if (parsedState.jwtToken) {
          // Restore some basic state but don't assume connection
          return {
            isConnected: false, // Always start disconnected, let connect() handle it
            isConnecting: false,
            jwtToken: parsedState.jwtToken,

            // Restore data if present
            address: parsedState.address || null,
            publicKeyData: parsedState.publicKeyData || null,
            syntheticPublicKey: parsedState.syntheticPublicKey || null,

            balance: parsedState.balance || 0,
            coinCount: parsedState.coinCount || 0,
            unspentCoins: parsedState.unspentCoins || [],
            hydratedCoins: parsedState.hydratedCoins || [],

            balanceLoading: false,
            connectionError: null,
            balanceError: null,
            lastBalanceUpdate: parsedState.lastBalanceUpdate || 0,
            lastConnectionUpdate: parsedState.lastConnectionUpdate || 0
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load wallet state from localStorage:', error);
      localStorage.removeItem('chiaWallet'); // Clean up corrupted state
    }

    return {
      isConnected: false,
      isConnecting: false,
      jwtToken: null,
      address: null,
      publicKeyData: null,
      syntheticPublicKey: null,
      balance: 0,
      coinCount: 0,
      unspentCoins: [],
      hydratedCoins: [],
      balanceLoading: false,
      connectionError: null,
      balanceError: null,
      lastBalanceUpdate: 0,
      lastConnectionUpdate: 0
    };
  };

  const [state, setState] = useState<WalletState>(getInitialState);

  // Persist state to localStorage
  useEffect(() => {
    try {
      const stateToPersist = {
        jwtToken: state.jwtToken,
        address: state.address || null,
        publicKeyData: state.publicKeyData || null,
        syntheticPublicKey: state.syntheticPublicKey || null,
        balance: state.balance,
        coinCount: state.coinCount,
        unspentCoins: state.unspentCoins,
        hydratedCoins: state.hydratedCoins,
        lastBalanceUpdate: state.lastBalanceUpdate,
        lastConnectionUpdate: state.lastConnectionUpdate
      };
      localStorage.setItem('chiaWallet', JSON.stringify(stateToPersist));
    } catch (error) {
      console.warn('Failed to save wallet state to localStorage:', error);
    }
  }, [state]);

  // Auto-connect if we have a JWT token and autoConnect is enabled
  useEffect(() => {
    if (config.autoConnect !== false && state.jwtToken && !state.isConnected && !state.isConnecting) {
      console.log('🔄 useChiaWallet: Auto-connecting with saved JWT token');
      connectWallet(state.jwtToken);
    }
  }, [config.autoConnect, state.jwtToken, state.isConnected, state.isConnecting]);

  // Setup auto-refresh interval when connected
  useEffect(() => {
    if (state.isConnected && state.address) {
      // Clear any existing interval
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      
      // Setup new interval for auto-refresh
      autoRefreshIntervalRef.current = window.setInterval(() => {
        if (!state.balanceLoading) {
          console.log('🔄 useChiaWallet: Auto-refreshing balance');
          refreshBalance();
        }
      }, 30000); // 30 seconds
    } else {
      // Clear interval when disconnected
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [state.isConnected, state.address]); // Removed state.balanceLoading from dependencies

  // Emit events when relevant state changes
  useEffect(() => {
    const event: WalletEvent = {
      type: 'connectionChanged',
      data: {
        isConnected: state.isConnected,
        address: state.address,
        error: state.connectionError
      },
      timestamp: Date.now()
    };
    emitEvent(event);
  }, [state.isConnected, state.address, state.connectionError]);

  useEffect(() => {
    const event: WalletEvent = {
      type: 'balanceChanged',
      data: {
        balance: state.balance,
        coinCount: state.coinCount,
        error: state.balanceError
      },
      timestamp: Date.now()
    };
    emitEvent(event);
  }, [state.balance, state.coinCount, state.balanceError]);

  useEffect(() => {
    const event: WalletEvent = {
      type: 'hydratedCoinsChanged',
      data: { hydratedCoins: state.hydratedCoins },
      timestamp: Date.now()
    };
    emitEvent(event);
  }, [state.hydratedCoins]);

  // Connection function
  const connectWallet = useCallback(async (jwtToken: string): Promise<boolean> => {
    const client = clientRef.current;
    if (!client) {
      setState(prev => ({ ...prev, connectionError: 'Client not initialized' }));
      return false;
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectionError: null,
      jwtToken
    }));

    try {
      // Set JWT token
      client.setJwtToken(jwtToken);

      // Get public key first
      const pkResponse = await client.getPublicKey();
      if (!pkResponse.success) {
        throw new Error(pkResponse.error);
      }

      const address = pkResponse.data.address;

      // Immediately load hydrated coins on first connection
      let hydratedCoins: HydratedCoin[] = [];
      let unspentCoins: Coin[] = [];
      let balance = 0;
      let coinCount = 0;
      let balanceError: string | null = null;

      try {
        const hydratedResult = await client.getUnspentHydratedCoins(address);
        if (hydratedResult.success) {
          hydratedCoins = hydratedResult.data;
          unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
          coinCount = unspentCoins.length;

          // Calculate balance from coins
          for (const coin of unspentCoins) {
            try {
              balance += parseInt(coin.amount);
            } catch (coinError) {
              console.warn('Invalid coin amount:', coin.amount, coinError);
            }
          }
        } else {
          console.warn('Failed to load hydrated coins on first connection:', hydratedResult.error);
          balanceError = hydratedResult.error;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet balance on first connection';
        console.warn('Error loading hydrated coins on first connection:', errorMessage);
        balanceError = errorMessage;
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        publicKeyData: pkResponse.data,
        address: address,
        syntheticPublicKey: pkResponse.data.synthetic_public_key,
        balance,
        coinCount,
        unspentCoins,
        hydratedCoins,
        balanceError,
        connectionError: null,
        lastConnectionUpdate: Date.now(),
        lastBalanceUpdate: Date.now()
      }));

      console.log('✅ useChiaWallet: Connected successfully', {
        address,
        balance,
        coinCount
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        connectionError: errorMessage,
        lastConnectionUpdate: Date.now()
      }));
      console.error('❌ useChiaWallet: Connection failed:', errorMessage);
      return false;
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      jwtToken: null,
      address: null,
      publicKeyData: null,
      syntheticPublicKey: null,
      balance: 0,
      coinCount: 0,
      unspentCoins: [],
      hydratedCoins: [],
      balanceLoading: false,
      connectionError: null,
      balanceError: null,
      lastConnectionUpdate: Date.now()
    }));

    // Clear client token
    if (clientRef.current) {
      clientRef.current.setJwtToken('');
    }

    // Clear localStorage
    try {
      localStorage.removeItem('chiaWallet');
    } catch (error) {
      console.warn('Failed to clear wallet state from localStorage:', error);
    }

    console.log('🔌 useChiaWallet: Disconnected');
  }, []);

  // Reset just the wallet data without disconnecting
  const resetWalletData = useCallback(() => {
    setState(prev => ({
      ...prev,
      address: null,
      publicKeyData: null,
      syntheticPublicKey: null,
      balance: 0,
      coinCount: 0,
      unspentCoins: [],
      hydratedCoins: [],
      balanceLoading: false,
      balanceError: null
    }));
  }, []);

  // Refresh hydrated coins
  const refreshHydratedCoins = useCallback(async (): Promise<boolean> => {
    const client = clientRef.current;
    if (!client || !state.address) {
      console.warn('Cannot refresh coins: client or address not available');
      return false;
    }

    try {
      console.log('🔄 useChiaWallet: Refreshing hydrated coins');
      const hydratedResult = await client.getUnspentHydratedCoins(state.address);

      if (hydratedResult.success) {
        const hydratedCoins = hydratedResult.data;
        const unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
        let balance = 0;

        // Calculate balance
        for (const coin of unspentCoins) {
          try {
            balance += parseInt(coin.amount);
          } catch (error) {
            console.warn('Invalid coin amount during refresh:', coin.amount, error);
          }
        }

        setState(prev => ({
          ...prev,
          hydratedCoins,
          unspentCoins,
          balance,
          coinCount: unspentCoins.length,
          balanceError: null,
          lastBalanceUpdate: Date.now()
        }));

        console.log('✅ useChiaWallet: Hydrated coins refreshed', {
          coinsCount: hydratedCoins.length,
          balance
        });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          balanceError: hydratedResult.error
        }));
        console.error('❌ useChiaWallet: Failed to refresh hydrated coins:', hydratedResult.error);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during refresh';
      setState(prev => ({
        ...prev,
        balanceError: errorMessage
      }));
      console.error('❌ useChiaWallet: Error refreshing hydrated coins:', errorMessage);
      return false;
    }
  }, [state.address]);

  // Refresh balance (alias for refreshHydratedCoins for backward compatibility)
  const refreshBalance = useCallback(async (): Promise<boolean> => {
    return refreshHydratedCoins();
  }, [refreshHydratedCoins]);

  // Format balance utility
  const formatBalance = useCallback((balance: number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(balance);
    if (!result.success) return '0';

    let formatted = result.data.toFixed(13);
    // Remove trailing zeros
    formatted = formatted.replace(/\.?0+$/, '');

    return formatted || '0';
  }, []);

  // Event system functions
  const addEventListener = useCallback((listener: WalletEventListener) => {
    eventListeners.add(listener);
  }, []);

  const removeEventListener = useCallback((listener: WalletEventListener) => {
    eventListeners.delete(listener);
  }, []);

  const emitEvent = useCallback((event: WalletEvent) => {
    eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in wallet event listener:', error);
      }
    });
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (config.autoConnect !== false && state.jwtToken && !state.isConnected && !state.isConnecting) {
      connectWallet(state.jwtToken);
    }
  }, [config.autoConnect, state.jwtToken, state.isConnected, state.isConnecting, connectWallet]);

  return {
    // State
    ...state,

    // Client instance
    client: clientRef.current!,

    // Actions
    connect: connectWallet,
    disconnect,
    refreshBalance,
    refreshHydratedCoins,

    // Utilities
    formatBalance,

    // Event system
    addEventListener,
    removeEventListener,
    emitEvent
  };
}

// Export for debugging
export const getWalletEventListeners = () => Array.from(eventListeners);

// Create a wallet state summary for debugging
export const createWalletStateSummary = (state: WalletState) => {
  return {
    isConnected: state.isConnected,
    hasAddress: !!state.address,
    address: state.address ? `${state.address.substring(0, 10)}...` : null,
    balance: state.balance,
    coinCount: state.coinCount,
    errors: {
      connection: state.connectionError,
      balance: state.balanceError
    },
    lastUpdate: {
      connection: new Date(state.lastConnectionUpdate).toISOString(),
      balance: new Date(state.lastBalanceUpdate).toISOString()
    }
  };
};

// Helper hook for wallet state summary
export const useWalletStateSummary = () => {
  const walletState = useChiaWallet();
  return {
    summary: createWalletStateSummary(walletState),
    isReady: walletState.isConnected && walletState.address && walletState.balance !== undefined
  };
}; 