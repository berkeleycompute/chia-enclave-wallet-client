import { useState, useEffect, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type PublicKeyResponse, type HydratedCoin, type Coin } from '../client/ChiaCloudWalletClient.ts';

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
  
  // Utility functions
  formatBalance: (balance: number) => string;
  formatAddress: (address: string) => string;
}

const STORAGE_KEY = 'chia_wallet_state';
const BACKGROUND_UPDATE_INTERVAL = 60000; // 1 minute

export function useChiaWallet(config: UseChiaWalletConfig = {}): UseChiaWalletResult {
  const clientRef = useRef<ChiaCloudWalletClient | null>(null);
  const backgroundUpdateRef = useRef<number | null>(null);
  
  // Initialize client
  if (!clientRef.current) {
    clientRef.current = new ChiaCloudWalletClient({
      baseUrl: config.baseUrl,
      enableLogging: config.enableLogging,
    });
  }
  
  const client = clientRef.current;
  
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
        balance: currentState.balance.toString(), // Convert BigInt to string
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
    
    setState(prevState => ({ ...prevState, isConnecting: true, error: null }));
    
    try {
      // Get public key first
      const pkResponse = await client.getPublicKey();
      if (!pkResponse.success) {
        throw new Error(pkResponse.error);
      }
      
      const newState: Partial<WalletState> = {
        isConnected: true,
        isConnecting: false,
        publicKeyData: pkResponse.data,
        publicKey: pkResponse.data.address,
        syntheticPublicKey: pkResponse.data.synthetic_public_key,
        error: null,
      };
      
      setState(prevState => {
        const updatedState = { ...prevState, ...newState };
        saveState(updatedState);
        return updatedState;
      });
      
      // Load wallet balance
      await refreshWallet();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setState(prevState => ({
        ...prevState,
        isConnecting: false,
        error: errorMessage,
        isConnected: false,
        publicKey: null,
        publicKeyData: null,
        syntheticPublicKey: null,
      }));
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
        return updatedState;
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet balance';
      setState(prevState => ({
        ...prevState,
        balanceLoading: false,
        balanceError: errorMessage,
      }));
    }
  }, [client, state.publicKey]);
  
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
  };
} 