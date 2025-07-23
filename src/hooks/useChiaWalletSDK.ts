import { useState, useEffect, useCallback, useRef } from 'react';
import { useChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';
import { 
  type WalletState, 
  type WalletEventType,
  type ChiaWalletSDK
} from '../client/ChiaWalletSDK';
import { 
  type SendXCHRequest, 
  type SimpleMakeUnsignedNFTOfferRequest,
  type HydratedCoin 
} from '../client/ChiaCloudWalletClient';
import { UnifiedWalletState } from '../components/types';
import { UnifiedWalletClient } from '../client/UnifiedWalletClient';

/**
 * Hook that provides reactive access to the complete wallet state
 * This is the main hook for accessing wallet information
 */
export function useWalletState(): WalletState & {
  // Helper methods
  formattedBalance: string;
  isLoading: boolean;
  hasError: boolean;
  refresh: () => Promise<boolean>;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  setJwtToken: (token: string | null) => Promise<boolean>;
} {
  const sdk = useChiaWalletSDK();
  const [state, setState] = useState<WalletState>(sdk.walletState);
  
  // Set up reactive state updates
  useEffect(() => {
    const updateState = () => setState(sdk.walletState);
    
    // Subscribe to all relevant events
    const unsubscribers = [
      sdk.on('connectionChanged', updateState),
      sdk.on('balanceChanged', updateState),
      sdk.on('coinsChanged', updateState),
      sdk.on('walletInfoChanged', updateState),
      sdk.on('error', updateState)
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [sdk]);

  // Helper methods
  const formattedBalance = sdk.getFormattedBalance();
  const isLoading = Object.values(state.loading).some(loading => loading);
  const hasError = Object.values(state.errors).some(error => error !== null);

  return {
    ...state,
    formattedBalance,
    isLoading,
    hasError,
    refresh: sdk.refreshBalance.bind(sdk),
    connect: sdk.connect.bind(sdk),
    disconnect: sdk.disconnect.bind(sdk),
    setJwtToken: sdk.setJwtToken.bind(sdk)
  };
}

/**
 * Simplified hook for just connection state and basic actions
 * Perfect for login/logout components
 */
export function useWalletConnection() {
  const sdk = useChiaWalletSDK();
  const [connectionState, setConnectionState] = useState({
    isConnected: sdk.walletState.isConnected,
    isConnecting: sdk.walletState.isConnecting,
    jwtToken: sdk.walletState.jwtToken,
    error: sdk.walletState.errors.connection,
    address: sdk.walletState.address,
    email: sdk.walletState.email
  });

  useEffect(() => {
    const updateConnectionState = () => {
      const state = sdk.walletState;
      setConnectionState({
        isConnected: state.isConnected,
        isConnecting: state.isConnecting,
        jwtToken: state.jwtToken,
        error: state.errors.connection,
        address: state.address,
        email: state.email
      });
    };

    const unsubscribers = [
      sdk.on('connectionChanged', updateConnectionState),
      sdk.on('error', updateConnectionState)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [sdk]);

  return {
    ...connectionState,
    connect: sdk.connect.bind(sdk),
    disconnect: sdk.disconnect.bind(sdk),
    setJwtToken: sdk.setJwtToken.bind(sdk)
  };
}

/**
 * Simplified hook for balance information
 * Perfect for balance display components
 */
export function useWalletBalance() {
  const sdk = useChiaWalletSDK();
  const [balanceState, setBalanceState] = useState({
    totalBalance: sdk.walletState.totalBalance,
    coinCount: sdk.walletState.coinCount,
    formattedBalance: sdk.getFormattedBalance(),
    isLoading: sdk.walletState.loading.balance,
    error: sdk.walletState.errors.balance,
    lastUpdate: sdk.walletState.lastUpdate.balance
  });

  useEffect(() => {
    const updateBalanceState = () => {
      const state = sdk.walletState;
      setBalanceState({
        totalBalance: state.totalBalance,
        coinCount: state.coinCount,
        formattedBalance: sdk.getFormattedBalance(),
        isLoading: state.loading.balance,
        error: state.errors.balance,
        lastUpdate: state.lastUpdate.balance
      });
    };

    const unsubscribers = [
      sdk.on('balanceChanged', updateBalanceState),
      sdk.on('error', updateBalanceState)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [sdk]);

  return {
    ...balanceState,
    refresh: sdk.refreshBalance.bind(sdk),
    isStale: (maxAgeMs?: number) => sdk.isDataStale('balance', maxAgeMs)
  };
}

/**
 * Hook for accessing and categorizing coins
 * Perfect for coin selection and NFT display components
 */
export function useWalletCoins() {
  const sdk = useChiaWalletSDK();
  const [coinsState, setCoinsState] = useState({
    hydratedCoins: sdk.walletState.hydratedCoins,
    xchCoins: sdk.walletState.xchCoins,
    catCoins: sdk.walletState.catCoins,
    nftCoins: sdk.walletState.nftCoins,
    isLoading: sdk.walletState.loading.coins,
    error: sdk.walletState.errors.coins,
    lastUpdate: sdk.walletState.lastUpdate.coins
  });

  useEffect(() => {
    const updateCoinsState = () => {
      const state = sdk.walletState;
      setCoinsState({
        hydratedCoins: state.hydratedCoins,
        xchCoins: state.xchCoins,
        catCoins: state.catCoins,
        nftCoins: state.nftCoins,
        isLoading: state.loading.coins,
        error: state.errors.coins,
        lastUpdate: state.lastUpdate.coins
      });
    };

    const unsubscribers = [
      sdk.on('coinsChanged', updateCoinsState),
      sdk.on('error', updateCoinsState)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [sdk]);

  return {
    ...coinsState,
    refresh: sdk.refreshBalance.bind(sdk), // Refreshing balance also refreshes coins
    isStale: (maxAgeMs?: number) => sdk.isDataStale('coins', maxAgeMs)
  };
}

/**
 * Hook for sending XCH transactions
 * Provides easy transaction sending with state management
 */
export function useSendTransaction() {
  const sdk = useChiaWalletSDK();
  const [transactionState, setTransactionState] = useState({
    isSending: false,
    lastTransaction: null as any,
    error: null as string | null
  });

  const sendXCH = useCallback(async (request: SendXCHRequest) => {
    setTransactionState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      const result = await sdk.sendXCH(request);
      
      if (result.success) {
        setTransactionState({
          isSending: false,
          lastTransaction: {
            transactionId: result.data.transaction_id,
            status: result.data.status,
            timestamp: Date.now(),
            request
          },
          error: null
        });
        return result;
      } else {
        setTransactionState({
          isSending: false,
          lastTransaction: null,
          error: result.error
        });
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      setTransactionState({
        isSending: false,
        lastTransaction: null,
        error: errorMessage
      });
      return {
        success: false as const,
        error: errorMessage
      };
    }
  }, [sdk]);

  return {
    ...transactionState,
    sendXCH
  };
}

/**
 * Hook for creating NFT offers
 * Provides easy NFT offer creation with state management
 */
export function useNFTOffers() {
  const sdk = useChiaWalletSDK();
  const [offerState, setOfferState] = useState({
    isCreatingOffer: false,
    lastOffer: null as any,
    error: null as string | null
  });

  const createNFTOffer = useCallback(async (request: SimpleMakeUnsignedNFTOfferRequest) => {
    setOfferState(prev => ({ ...prev, isCreatingOffer: true, error: null }));

    try {
      const result = await sdk.createNFTOffer(request);
      
      if (result.success) {
        setOfferState({
          isCreatingOffer: false,
          lastOffer: {
            signedOffer: result.data.signed_offer,
            email: result.data.email,
            userId: result.data.user_id,
            timestamp: Date.now(),
            request
          },
          error: null
        });
        return result;
      } else {
        setOfferState({
          isCreatingOffer: false,
          lastOffer: null,
          error: result.error
        });
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Offer creation failed';
      setOfferState({
        isCreatingOffer: false,
        lastOffer: null,
        error: errorMessage
      });
      return {
        success: false as const,
        error: errorMessage
      };
    }
  }, [sdk]);

  return {
    ...offerState,
    createNFTOffer
  };
}

/**
 * Hook for listening to wallet events
 * Useful for notifications, logging, or custom event handling
 */
export function useWalletEvents() {
  const sdk = useChiaWalletSDK();
  const [events, setEvents] = useState<Array<{ event: WalletEventType; data: any; timestamp: number }>>([]);

  const addEventListener = useCallback((event: WalletEventType, callback?: (data: any) => void) => {
    const unsubscribe = sdk.on(event, (data) => {
      const eventRecord = { event, data, timestamp: Date.now() };
      setEvents(prev => [...prev.slice(-9), eventRecord]); // Keep last 10 events
      callback?.(data);
    });

    return unsubscribe;
  }, [sdk]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    addEventListener,
    clearEvents,
    // Direct event subscription methods
    onConnectionChanged: (callback: (data: any) => void) => addEventListener('connectionChanged', callback),
    onBalanceChanged: (callback: (data: any) => void) => addEventListener('balanceChanged', callback),
    onTransactionCompleted: (callback: (data: any) => void) => addEventListener('transactionCompleted', callback),
    onError: (callback: (data: any) => void) => addEventListener('error', callback)
  };
}

/**
 * Hook that provides the raw SDK instance for advanced usage
 * Use this when you need direct access to SDK methods not covered by other hooks
 */
export function useRawSDK(): ChiaWalletSDK {
  return useChiaWalletSDK();
} 

/**
 * Unified wallet state hook - combines all wallet state into a single object
 * This is the recommended way to get complete wallet state for passing between components
 */
export const useUnifiedWalletState = (): UnifiedWalletState => {
  const walletState = useWalletState();
  const connectionState = useWalletConnection();
  const balanceState = useWalletBalance();

  return {
    isConnected: connectionState.isConnected,
    publicKey: walletState.publicKey,
    syntheticPublicKey: walletState.syntheticPublicKey,
    address: connectionState.address,
    totalBalance: balanceState.totalBalance,
    coinCount: balanceState.coinCount,
    formattedBalance: balanceState.formattedBalance,
    error: connectionState.error || balanceState.error,
    isConnecting: connectionState.isConnecting,
  };
};

/**
 * Unified wallet client hook - combines SDK and wallet state into a single client
 * This is the BEST way to get a complete wallet client for passing to components
 */
export const useUnifiedWalletClient = (): UnifiedWalletClient => {
  const sdk = useRawSDK();
  const walletState = useUnifiedWalletState();
  
  return UnifiedWalletClient.create(sdk, walletState);
}; 