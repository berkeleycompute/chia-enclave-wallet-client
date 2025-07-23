import React, { createContext, useContext, useRef, useEffect } from 'react';
import { ChiaWalletSDK, type ChiaWalletSDKConfig } from '../client/ChiaWalletSDK';

// Context for the SDK instance
const ChiaWalletSDKContext = createContext<ChiaWalletSDK | null>(null);

// Provider props
export interface ChiaWalletSDKProviderProps {
  children: React.ReactNode;
  config?: ChiaWalletSDKConfig;
  sdk?: ChiaWalletSDK; // Allow passing an existing SDK instance
}

/**
 * Simple provider that provides the unified ChiaWalletSDK instance to all child components
 * This is the recommended way to use the Chia Wallet SDK in React applications
 */
export const ChiaWalletSDKProvider: React.FC<ChiaWalletSDKProviderProps> = ({
  children,
  config = {},
  sdk: existingSdk
}) => {
  // Create or use existing SDK instance
  const sdkRef = useRef<ChiaWalletSDK | null>(existingSdk || null);

  if (!sdkRef.current) {
    sdkRef.current = new ChiaWalletSDK(config);
  }

  // Clean up SDK on unmount
  useEffect(() => {
    const currentSdk = sdkRef.current;
    
    return () => {
      if (currentSdk && !existingSdk) {
        // Only destroy SDK if we created it (not if it was passed in)
        currentSdk.destroy();
      }
    };
  }, [existingSdk]);

  return (
    <ChiaWalletSDKContext.Provider value={sdkRef.current}>
      {children}
    </ChiaWalletSDKContext.Provider>
  );
};

/**
 * Hook to get the ChiaWalletSDK instance from context
 * This is the primary way to access the SDK in components and custom hooks
 */
export function useChiaWalletSDK(): ChiaWalletSDK {
  const sdk = useContext(ChiaWalletSDKContext);
  
  if (!sdk) {
    throw new Error(
      'useChiaWalletSDK must be used within a ChiaWalletSDKProvider. ' +
      'Wrap your component with <ChiaWalletSDKProvider> or pass an SDK instance.'
    );
  }
  
  return sdk;
}

/**
 * Hook to check if the SDK is available (returns null if not in provider)
 * Useful for optional SDK usage or conditional rendering
 */
export function useOptionalChiaWalletSDK(): ChiaWalletSDK | null {
  return useContext(ChiaWalletSDKContext);
} 