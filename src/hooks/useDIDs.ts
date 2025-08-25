import { useState, useEffect, useCallback } from 'react';
import { ChiaCloudWalletClient, DIDInfo } from '../client/ChiaCloudWalletClient';
import { useUnifiedWalletClient } from './useChiaWalletSDK';

export interface UseDIDsConfig {
  /** Custom client to use instead of the default */
  client?: ChiaCloudWalletClient;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Whether to auto-load DIDs on mount */
  autoLoad?: boolean;
  /** Enable debug logging */
  enableLogging?: boolean;
}

export interface UseDIDsResult {
  /** Array of DIDs */
  dids: DIDInfo[];
  /** Whether DIDs are currently loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Whether the wallet is connected */
  isConnected: boolean;
  /** Current wallet address */
  address: string | null;
  /** Last update timestamp */
  lastUpdate: number;
  /** Refresh DIDs manually */
  refresh: () => Promise<boolean>;
  /** Get a DID by ID */
  getDIDById: (didId: string) => DIDInfo | undefined;
  /** Get the first available DID */
  getFirstDID: () => DIDInfo | undefined;
}

/**
 * Hook for managing DIDs (Decentralized Identifiers) from the Chia wallet
 * 
 * @param config Configuration options
 * @returns DID management state and functions
 */
export function useDIDs(config: UseDIDsConfig = {}): UseDIDsResult {
  const { 
    client: customClient, 
    refreshInterval = 30000, 
    autoLoad = true,
    enableLogging = false
  } = config;
  
  const walletClient = useUnifiedWalletClient();
  
  // State
  const [dids, setDids] = useState<DIDInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);

  // Get client and wallet info
  const client = customClient || walletClient?.sdk?.client;
  const isConnected = walletClient?.isConnected || false;
  const address = walletClient?.address || null;

  // Logging helper
  const log = useCallback((message: string, data?: any) => {
    if (enableLogging) {
      console.log(`[useDIDs] ${message}`, data || '');
    }
  }, [enableLogging]);

  // Refresh DIDs
  const refresh = useCallback(async (): Promise<boolean> => {
    if (!client) {
      setError('No client available');
      log('Refresh failed: No client available');
      return false;
    }

    if (!address) {
      setError('No wallet address available');
      log('Refresh failed: No wallet address available');
      return false;
    }

    // Prevent multiple simultaneous refreshes
    const now = Date.now();
    if (isLoading || (lastUpdate > 0 && now - lastUpdate < 1000)) {
      log('Refresh skipped: Already loading or too recent');
      return false;
    }

    setIsLoading(true);
    setError(null);
    log('Starting DIDs refresh', { address: address.substring(0, 16) + '...' });

    try {
      const result = await client.getDIDs(address);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch DIDs');
      }

      const fetchedDids = result.data.data || [];
      setDids(fetchedDids);
      setLastUpdate(now);
      setIsLoading(false);
      
      log('DIDs refreshed successfully', { 
        count: fetchedDids.length,
        dids: fetchedDids.map(did => ({
          did_id: did.did_id.substring(0, 16) + '...',
          metadata: did.metadata
        }))
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load DIDs';
      setError(message);
      setIsLoading(false);
      log('DIDs refresh failed', { error: message });
      return false;
    }
  }, [client, address, isLoading, lastUpdate, log]);

  // Get DID by ID
  const getDIDById = useCallback((didId: string): DIDInfo | undefined => {
    return dids.find(did => did.did_id === didId);
  }, [dids]);

  // Get first available DID
  const getFirstDID = useCallback((): DIDInfo | undefined => {
    return dids.length > 0 ? dids[0] : undefined;
  }, [dids]);

  // Auto-load DIDs when wallet connects
  useEffect(() => {
    if (autoLoad && isConnected && address && client && dids.length === 0 && !isLoading) {
      log('Auto-loading DIDs on wallet connection');
      refresh();
    }
  }, [autoLoad, isConnected, address, client, dids.length, isLoading, refresh, log]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || !isConnected || !client) {
      return;
    }

    const interval = setInterval(() => {
      if (isConnected && address && !isLoading) {
        log('Auto-refresh triggered');
        refresh();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isConnected, client, address, isLoading, refresh, log]);

  // Clear DIDs when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setDids([]);
      setError(null);
      setLastUpdate(0);
      log('Wallet disconnected - clearing DIDs');
    }
  }, [isConnected, log]);

  return {
    dids,
    isLoading,
    error,
    isConnected,
    address,
    lastUpdate,
    refresh,
    getDIDById,
    getFirstDID
  };
}

/**
 * Simple hook to get the first available DID
 * Useful for components that just need any DID
 */
export function useFirstDID(config: UseDIDsConfig = {}) {
  const { dids, isLoading, error, refresh } = useDIDs(config);
  
  return {
    did: dids.length > 0 ? dids[0] : null,
    isLoading,
    error,
    refresh,
    hasDIDs: dids.length > 0
  };
}
