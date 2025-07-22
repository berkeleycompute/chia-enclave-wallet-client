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
  publicKey: string | null; // The address
  publicKeyData: PublicKeyResponse | null; // Full public key response
  syntheticPublicKey: string | null; // Easy access to synthetic public key
  
  // Balance and coins
  balance: number;
  coinCount: number;
  unspentCoins: Coin[];
  hydratedCoins: HydratedCoin[];
  
  // Loading states
  balanceLoading: boolean;
  
  // Errors
  error: string | null;
  balanceError: string | null;
  
  // Metadata
  lastSuccessfulRefresh: number;
}

export interface UseChiaWalletResult extends WalletState {
  // Client instance
  client: ChiaCloudWalletClient;
  
  // Actions
  setJwtToken: (token: string | null) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshWallet: () => Promise<void>;
  
  // Event system
  addEventListener: (listener: WalletEventListener) => () => void;
  removeEventListener: (listener: WalletEventListener) => void;
  
  // Utility functions
  formatBalance: (balance: number) => string;
  formatAddress: (address: string) => string;
}

const STORAGE_KEY = 'chia_wallet_state';
const BACKGROUND_UPDATE_INTERVAL = 60000; // 1 minute

export function useChiaWallet(config: UseChiaWalletConfig = {}): UseChiaWalletResult {
  const clientRef = useRef<ChiaCloudWalletClient | null>(null);
  const backgroundUpdateRef = useRef<number | null>(null);
  const eventListenersRef = useRef<Set<WalletEventListener>>(new Set());
  
  // Initialize client
  if (!clientRef.current) {
    clientRef.current = new ChiaCloudWalletClient({
      baseUrl: config.baseUrl,
      enableLogging: config.enableLogging,
    });
  }
  
  const client = clientRef.current;
  
  // Event emitter functions
  const emitEvent = useCallback((type: WalletEvent['type'], data?: any) => {
    const event: WalletEvent = {
      type,
      data,
      timestamp: Date.now()
    };
    
    console.log('🎯 Wallet Event Emitted:', event);
    
    eventListenersRef.current.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in wallet event listener:', error);
      }
    });
  }, []);
  
  // Wallet state
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    jwtToken: null,
    publicKey: null,
    publicKeyData: null,
    syntheticPublicKey: null,
    balance: 0,
    coinCount: 0,
    unspentCoins: [],
    hydratedCoins: [],
    balanceLoading: false,
    error: null,
    balanceError: null,
    lastSuccessfulRefresh: 0,
  });
  
  // Load persisted state on mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedState = JSON.parse(stored);
          
          // Validate that the stored state is not too old (24 hours)
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          if (Date.now() - parsedState.timestamp < maxAge) {
            setState(prevState => ({
              ...prevState,
              isConnected: parsedState.isConnected || false,
              jwtToken: parsedState.jwtToken || null,
              publicKey: parsedState.publicKey || null,
              publicKeyData: parsedState.publicKeyData || null,
              syntheticPublicKey: parsedState.syntheticPublicKey || null,
              balance: parsedState.balance ? parseInt(parsedState.balance) : 0,
              coinCount: parsedState.coinCount || 0,
              unspentCoins: parsedState.unspentCoins?.map((coin: any) => ({
                ...coin,
                amount: coin.amount.toString()
              })) || [],
              hydratedCoins: parsedState.hydratedCoins?.map((coin: any) => ({
                ...coin,
                coin: {
                  ...coin.coin,
                  amount: coin.coin.amount.toString()
                }
              })) || [],
              lastSuccessfulRefresh: parsedState.lastSuccessfulRefresh || 0,
            }));
            
            // Set JWT token on client if available
            if (parsedState.jwtToken && client) {
              client.setJwtToken(parsedState.jwtToken);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load persisted wallet state:', error);
      }
    };
    
    loadPersistedState();
  }, [client]);
  
  // Save state to localStorage whenever it changes
  const saveState = useCallback((currentState: WalletState) => {
    try {
      const stateToSave = {
        ...currentState,
        balance: currentState.balance.toString(), // Convert number to string
        unspentCoins: currentState.unspentCoins.map(coin => ({
          ...coin,
          amount: coin.amount.toString()
        })),
        hydratedCoins: currentState.hydratedCoins.map(coin => ({
          ...coin,
          coin: {
            ...coin.coin,
            amount: coin.coin.amount.toString()
          }
        })),
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save wallet state:', error);
    }
  }, []);
  
  // Setup background updates when connected
  useEffect(() => {
    if (state.isConnected && state.publicKey && !state.balanceLoading) {
      backgroundUpdateRef.current = window.setInterval(() => {
        refreshWallet();
      }, BACKGROUND_UPDATE_INTERVAL);
    } else {
      if (backgroundUpdateRef.current) {
        clearInterval(backgroundUpdateRef.current);
        backgroundUpdateRef.current = null;
      }
    }
    
    return () => {
      if (backgroundUpdateRef.current) {
        clearInterval(backgroundUpdateRef.current);
        backgroundUpdateRef.current = null;
      }
    };
  }, [state.isConnected, state.publicKey, state.balanceLoading]);
  
  // Set JWT token
  const setJwtToken = useCallback((token: string | null) => {
    setState(prevState => {
      const newState = { ...prevState, jwtToken: token };
      saveState(newState);
      return newState;
    });
    
    if (token && client) {
      client.setJwtToken(token);
      
      // Auto-connect if enabled
      if (config.autoConnect !== false) {
        connectWallet();
      }
    } else {
      disconnectWallet();
    }
  }, [client, config.autoConnect]);
  
  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!client || !state.jwtToken) {
      setState(prevState => ({
        ...prevState,
        error: 'JWT token is required for wallet connection'
      }));
      return;
    }
    
    setState(prevState => ({ ...prevState, isConnecting: true, error: null, balanceLoading: true }));
    
    try {
      // Get public key first
      const pkResponse = await client.getPublicKey();
      if (!pkResponse.success) {
        throw new Error(pkResponse.error);
      }
      
      const publicKey = pkResponse.data.address;
      
      // Immediately load hydrated coins on first connection
      let hydratedCoins: HydratedCoin[] = [];
      let unspentCoins: Coin[] = [];
      let balance = 0;
      let coinCount = 0;
      let balanceError: string | null = null;
      
      try {
        const hydratedResult = await client.getUnspentHydratedCoins(publicKey);
        if (hydratedResult.success) {
          hydratedCoins = hydratedResult.data.data;
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
      
      const newState: Partial<WalletState> = {
        isConnected: true,
        isConnecting: false,
        balanceLoading: false,
        publicKeyData: pkResponse.data,
        publicKey: publicKey,
        syntheticPublicKey: pkResponse.data.synthetic_public_key,
        hydratedCoins,
        unspentCoins,
        balance,
        coinCount,
        lastSuccessfulRefresh: hydratedCoins.length > 0 ? Date.now() : 0,
        error: null,
        balanceError,
      };
      
      setState(prevState => {
        const updatedState = { ...prevState, ...newState };
        saveState(updatedState);
        
        // Emit events for state changes
        emitEvent('connectionChanged', { 
          isConnected: true, 
          publicKey,
          balance,
          coinCount 
        });
        
        if (hydratedCoins.length > 0) {
          emitEvent('hydratedCoinsChanged', { 
            hydratedCoins, 
            coinCount: hydratedCoins.length,
            balance 
          });
        }
        
        if (balance > 0) {
          // Calculate formatted balance inline since formatBalance isn't defined yet
          const mojosToXchResult = ChiaCloudWalletClient.mojosToXCH(balance);
          const formattedBalance = mojosToXchResult.success ? mojosToXchResult.data.toFixed(6) : '0';
          
          emitEvent('balanceChanged', { 
            balance, 
            coinCount,
            formattedBalance
          });
        }
        
        return updatedState;
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setState(prevState => ({
        ...prevState,
        isConnecting: false,
        balanceLoading: false,
        error: errorMessage,
        isConnected: false,
        publicKey: null,
        publicKeyData: null,
        syntheticPublicKey: null,
      }));
      
      // Emit error event
      emitEvent('errorOccurred', { 
        error: errorMessage,
        context: 'wallet_connection',
        details: err
      });
    }
  }, [client, state.jwtToken]);
  
  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    // Clear background updates
    if (backgroundUpdateRef.current) {
      clearInterval(backgroundUpdateRef.current);
      backgroundUpdateRef.current = null;
    }
    
    const newState: WalletState = {
      isConnected: false,
      isConnecting: false,
      jwtToken: null,
      publicKey: null,
      publicKeyData: null,
      syntheticPublicKey: null,
      balance: 0,
      coinCount: 0,
      unspentCoins: [],
      hydratedCoins: [],
      balanceLoading: false,
      error: null,
      balanceError: null,
      lastSuccessfulRefresh: 0,
    };
    
    setState(newState);
    
    // Emit disconnection event
    emitEvent('connectionChanged', { 
      isConnected: false,
      publicKey: null,
      balance: 0,
      coinCount: 0
    });
    
    // Clear persisted state
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear wallet state:', error);
    }
    
    // Reset client
    if (client) {
      client.setJwtToken(undefined as any);
    }
  }, [client]);
  
  // Refresh wallet data
  const refreshWallet = useCallback(async () => {
    if (!client || !state.publicKey) {
      return;
    }
    
    setState(prevState => ({ ...prevState, balanceLoading: true, balanceError: null }));
    
    try {
      const hydratedResult = await client.getUnspentHydratedCoins(state.publicKey);
      if (!hydratedResult.success) {
        throw new Error(hydratedResult.error);
      }
      
      // Extract simple coins from hydrated coins for backward compatibility
      const coins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedResult.data.data);
      let totalBalance = 0;
      
      // Calculate balance from coins
      for (const coin of coins) {
        try {
          totalBalance += parseInt(coin.amount);
        } catch (coinError) {
          console.warn('Invalid coin amount:', coin.amount, coinError);
          // Continue with other coins
        }
      }
      
      const newState: Partial<WalletState> = {
        balance: totalBalance,
        coinCount: coins.length,
        hydratedCoins: hydratedResult.data.data,
        unspentCoins: coins,
        lastSuccessfulRefresh: Date.now(),
        balanceLoading: false,
        balanceError: null,
      };
      
      setState(prevState => {
        const updatedState = { ...prevState, ...newState };
        saveState(updatedState);
        
        // Emit events for state changes during refresh
        const coinsChanged = JSON.stringify(prevState.hydratedCoins) !== JSON.stringify(hydratedResult.data.data);
        const balanceChanged = prevState.balance !== totalBalance;
        
        if (coinsChanged) {
          emitEvent('hydratedCoinsChanged', { 
            hydratedCoins: hydratedResult.data.data, 
            coinCount: coins.length,
            balance: totalBalance,
            previousCoinCount: prevState.coinCount
          });
        }
        
        if (balanceChanged) {
          const mojosToXchResult = ChiaCloudWalletClient.mojosToXCH(totalBalance);
          const formattedBalance = mojosToXchResult.success ? mojosToXchResult.data.toFixed(6) : '0';
          
          emitEvent('balanceChanged', { 
            balance: totalBalance, 
            coinCount: coins.length,
            formattedBalance,
            previousBalance: prevState.balance
          });
        }
        
        return updatedState;
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet balance';
      setState(prevState => ({
        ...prevState,
        balanceLoading: false,
        balanceError: errorMessage,
      }));
      
      // Emit error event for refresh failures
      emitEvent('errorOccurred', { 
        error: errorMessage,
        context: 'wallet_refresh',
        details: err
      });
    }
  }, [client, state.publicKey]);
  
  // Event listener functions (after state is declared)
  const addEventListener = useCallback((listener: WalletEventListener): (() => void) => {
    console.log('🔧 useChiaWallet: Adding event listener, current listeners:', eventListenersRef.current.size);
    eventListenersRef.current.add(listener);
    console.log('✅ useChiaWallet: Event listener added, total listeners:', eventListenersRef.current.size);
    
    // Emit current state immediately for new listeners if wallet is connected
    if (state.isConnected) {
      console.log('🚀 useChiaWallet: Emitting current state for new listener');
      
      // Emit connection state
      const connectionEvent: WalletEvent = {
        type: 'connectionChanged',
        data: {
          isConnected: state.isConnected,
          publicKey: state.publicKey,
          balance: state.balance,
          coinCount: state.coinCount
        },
        timestamp: Date.now()
      };
      
      // Emit hydrated coins state if available
      if (state.hydratedCoins && state.hydratedCoins.length > 0) {
        const coinsEvent: WalletEvent = {
          type: 'hydratedCoinsChanged',
          data: {
            hydratedCoins: state.hydratedCoins,
            coinCount: state.hydratedCoins.length,
            balance: state.balance
          },
          timestamp: Date.now()
        };
        
        // Use setTimeout to ensure the listener is fully registered
        setTimeout(() => {
          console.log('📡 useChiaWallet: Sending immediate events to new listener');
          listener(connectionEvent);
          listener(coinsEvent);
        }, 10);
      } else {
        setTimeout(() => {
          console.log('📡 useChiaWallet: Sending immediate connection event to new listener');
          listener(connectionEvent);
        }, 10);
      }
    }
    
    // Return cleanup function
    return () => {
      console.log('🧹 useChiaWallet: Removing event listener');
      eventListenersRef.current.delete(listener);
      console.log('✅ useChiaWallet: Event listener removed, remaining listeners:', eventListenersRef.current.size);
    };
  }, [state.isConnected, state.publicKey, state.balance, state.coinCount, state.hydratedCoins]);

  const removeEventListener = useCallback((listener: WalletEventListener) => {
    eventListenersRef.current.delete(listener);
  }, []);

  // Utility functions
  const formatBalance = useCallback((balance: number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(balance);
    if (!result.success) return '0';
    
    // Format to remove trailing zeros
    let formatted = result.data.toFixed(13);
    formatted = formatted.replace(/\.?0+$/, '');
    
    return formatted;
  }, []);
  
  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  }, []);
  
  // Auto-connect on mount if JWT token is available
  useEffect(() => {
    if (state.jwtToken && !state.isConnected && !state.isConnecting && config.autoConnect !== false) {
      connectWallet();
    }
  }, [state.jwtToken, state.isConnected, state.isConnecting, config.autoConnect, connectWallet]);
  
  return {
    ...state,
    client,
    setJwtToken,
    connectWallet,
    disconnectWallet,
    refreshWallet,
    formatBalance,
    formatAddress,
    addEventListener,
    removeEventListener,
  };
} 