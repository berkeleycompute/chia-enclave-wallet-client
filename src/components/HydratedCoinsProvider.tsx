import React, { createContext, useContext, useEffect } from 'react';
import { useHydratedCoins, type UseHydratedCoinsConfig, type HydratedCoinsState } from '../hooks/useHydratedCoins';

export interface HydratedCoinsContextValue extends HydratedCoinsState {
  // Additional context-specific methods can be added here
}

const HydratedCoinsContext = createContext<HydratedCoinsContextValue | null>(null);

export interface HydratedCoinsProviderProps {
  children: React.ReactNode;
  config?: UseHydratedCoinsConfig;
}

export const HydratedCoinsProvider: React.FC<HydratedCoinsProviderProps> = ({
  children,
  config = {}
}) => {
  const hydratedCoinsState = useHydratedCoins(config);

  // Auto-fetch when JWT token is available (if autoFetch is enabled)
  useEffect(() => {
    if (config.autoFetch !== false && config.jwtToken && !hydratedCoinsState.isLoading && !hydratedCoinsState.isConnected) {
      console.log('🚀 HydratedCoinsProvider: Auto-fetching coins on token availability');
      hydratedCoinsState.fetchCoins();
    }
  }, [config.jwtToken, config.autoFetch, hydratedCoinsState.isLoading, hydratedCoinsState.isConnected]);

  const contextValue: HydratedCoinsContextValue = {
    ...hydratedCoinsState
  };

  return (
    <HydratedCoinsContext.Provider value={contextValue}>
      {children}
    </HydratedCoinsContext.Provider>
  );
};

export const useHydratedCoinsContext = (): HydratedCoinsContextValue => {
  const context = useContext(HydratedCoinsContext);
  if (!context) {
    throw new Error('useHydratedCoinsContext must be used within a HydratedCoinsProvider');
  }
  return context;
};

// Convenience hook for components that need to check if coins are available
export const useCoinsAvailable = () => {
  const { hydratedCoins, isConnected, isLoading } = useHydratedCoinsContext();
  return {
    hasCoins: hydratedCoins.length > 0,
    isReady: isConnected && !isLoading,
    coinCount: hydratedCoins.length,
    isEmpty: isConnected && !isLoading && hydratedCoins.length === 0
  };
};

// Hook for getting specific coin types
export const useCoinsByType = () => {
  const { getNFTCoins, getXCHCoins, getCATCoins } = useHydratedCoinsContext();
  return {
    nftCoins: getNFTCoins(),
    xchCoins: getXCHCoins(), 
    catCoins: getCATCoins()
  };
}; 