import { useState, useCallback, useRef } from 'react';
import { 
  ChiaCloudWalletClient,
  type TwinNFTMintRequest,
  type TwinNFTMintResponse
} from '../client/ChiaCloudWalletClient';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';

export interface TwinNFTMintRecord {
  id: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  request: TwinNFTMintRequest;
  response?: TwinNFTMintResponse;
  error?: string;
  launcherId?: string;
  nftId?: string;
}

// Hook configuration
export interface UseTwinNFTMintConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  sdk?: ChiaWalletSDK;
  address?: string | null;
  baseUrl?: string; // Optional custom base URL for the client
  enableLogging?: boolean;
  autoSave?: boolean; // Save mint records to localStorage
  onMintStart?: (mintId: string) => void;
  onMintSuccess?: (mintId: string, response: TwinNFTMintResponse) => void;
  onMintError?: (mintId: string, error: string) => void;
}

// Hook result interface
export interface UseTwinNFTMintResult {
  // State
  isMinting: boolean;
  mintError: string | null;
  lastMintId: string | null;
  lastResponse: TwinNFTMintResponse | null;
  mintHistory: TwinNFTMintRecord[];

  // Actions
  mintTwinNFT: (request: TwinNFTMintRequest) => Promise<{
    success: boolean;
    mintId?: string;
    response?: TwinNFTMintResponse;
    error?: string;
  }>;
  reset: () => void;
  cancelMint: () => void;

  // History management
  getMintById: (mintId: string) => TwinNFTMintRecord | null;
  getPendingMints: () => TwinNFTMintRecord[];
  getSuccessfulMints: () => TwinNFTMintRecord[];
  clearMintHistory: () => void;
}

// Storage key for mint history
const TWIN_NFT_MINT_HISTORY_STORAGE_KEY = 'chia_twin_nft_mint_history';

// Utility functions
function generateMintId(): string {
  return `twin_mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Load mint history from localStorage
function loadMintHistory(): TwinNFTMintRecord[] {
  try {
    const stored = localStorage.getItem(TWIN_NFT_MINT_HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load twin NFT mint history:', error);
    return [];
  }
}

// Save mint history to localStorage
function saveMintHistory(history: TwinNFTMintRecord[]): void {
  try {
    localStorage.setItem(TWIN_NFT_MINT_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save twin NFT mint history:', error);
  }
}

// Main hook
export function useTwinNFTMint(config: UseTwinNFTMintConfig = {}): UseTwinNFTMintResult {
  const {
    jwtToken,
    client: externalClient,
    sdk: externalSDK,
    address: externalAddress,
    baseUrl,
    enableLogging = true,
    autoSave = true,
    onMintStart,
    onMintSuccess,
    onMintError
  } = config;

  // Internal client reference
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);

  // State
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [lastMintId, setLastMintId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<TwinNFTMintResponse | null>(null);
  const [mintHistory, setMintHistory] = useState<TwinNFTMintRecord[]>(() => 
    autoSave ? loadMintHistory() : []
  );

  // Get or create client
  const getClient = useCallback((): ChiaCloudWalletClient | null => {
    // Prefer SDK client if available
    if (externalSDK) return externalSDK.client;
    if (externalClient) return externalClient;

    if (!internalClient.current && (jwtToken || baseUrl)) {
      internalClient.current = new ChiaCloudWalletClient({
        baseUrl,
        jwtToken: jwtToken || undefined,
        enableLogging
      });
    }

    return internalClient.current;
  }, [externalClient, externalSDK, jwtToken, baseUrl, enableLogging]);

  // Log helper
  const log = useCallback((message: string, data?: any) => {
    if (enableLogging) {
      console.log(`[useTwinNFTMint] ${message}`, data || '');
    }
  }, [enableLogging]);

  // Update mint record
  const updateMintRecord = useCallback((mintId: string, updates: Partial<TwinNFTMintRecord>) => {
    setMintHistory(prev => {
      const updated = prev.map(record => 
        record.id === mintId ? { ...record, ...updates } : record
      );
      if (autoSave) {
        saveMintHistory(updated);
      }
      return updated;
    });
  }, [autoSave]);

  // Main mint function
  const mintTwinNFT = useCallback(async (request: TwinNFTMintRequest) => {
    const mintId = generateMintId();
    setLastMintId(mintId);
    setIsMinting(true);
    setMintError(null);

    log(`Starting twin NFT mint with ID: ${mintId}`, request);

    // Create mint record
    const mintRecord: TwinNFTMintRecord = {
      id: mintId,
      timestamp: Date.now(),
      status: 'pending',
      request
    };

    // Add to history
    setMintHistory(prev => {
      const updated = [mintRecord, ...prev];
      if (autoSave) {
        saveMintHistory(updated);
      }
      return updated;
    });

    // Trigger start callback
    onMintStart?.(mintId);

    try {
      const client = getClient();
      if (!client) {
        throw new Error('No client available for twin NFT minting');
      }

      // Use the client method to mint Twin NFT
      const result = await client.mintTwinNFT(request);
      
      if (!result.success) {
        throw new Error((result as any).error || 'Twin NFT mint failed');
      }

      log(`Twin NFT mint successful for ${mintId}`, result.data);

      // Update state
      setLastResponse(result.data);
      updateMintRecord(mintId, {
        status: 'success',
        response: result.data,
        launcherId: result.data.data.launcher_id,
        nftId: result.data.data.nft_id
      });

      // Trigger success callback
      onMintSuccess?.(mintId, result.data);

      return {
        success: true,
        mintId,
        response: result.data
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during twin NFT mint';
      
      log(`Twin NFT mint failed for ${mintId}: ${errorMessage}`, error);

      setMintError(errorMessage);
      updateMintRecord(mintId, {
        status: 'failed',
        error: errorMessage
      });

      // Trigger error callback
      onMintError?.(mintId, errorMessage);

      return {
        success: false,
        mintId,
        error: errorMessage
      };

    } finally {
      setIsMinting(false);
    }
  }, [getClient, baseUrl, jwtToken, log, updateMintRecord, onMintStart, onMintSuccess, onMintError]);

  // Reset function
  const reset = useCallback(() => {
    setIsMinting(false);
    setMintError(null);
    setLastMintId(null);
    setLastResponse(null);
  }, []);

  // Cancel mint (basic implementation)
  const cancelMint = useCallback(() => {
    if (isMinting) {
      setIsMinting(false);
      setMintError('Mint cancelled by user');
      if (lastMintId) {
        updateMintRecord(lastMintId, {
          status: 'failed',
          error: 'Cancelled by user'
        });
      }
    }
  }, [isMinting, lastMintId, updateMintRecord]);

  // History management functions
  const getMintById = useCallback((mintId: string) => {
    for (let i = 0; i < mintHistory.length; i++) {
      if (mintHistory[i].id === mintId) {
        return mintHistory[i];
      }
    }
    return null;
  }, [mintHistory]);

  const getPendingMints = useCallback(() => {
    const pendingMints: TwinNFTMintRecord[] = [];
    for (let i = 0; i < mintHistory.length; i++) {
      if (mintHistory[i].status === 'pending') {
        pendingMints.push(mintHistory[i]);
      }
    }
    return pendingMints;
  }, [mintHistory]);

  const getSuccessfulMints = useCallback(() => {
    const successfulMints: TwinNFTMintRecord[] = [];
    for (let i = 0; i < mintHistory.length; i++) {
      if (mintHistory[i].status === 'success') {
        successfulMints.push(mintHistory[i]);
      }
    }
    return successfulMints;
  }, [mintHistory]);

  const clearMintHistory = useCallback(() => {
    setMintHistory([]);
    if (autoSave) {
      localStorage.removeItem(TWIN_NFT_MINT_HISTORY_STORAGE_KEY);
    }
  }, [autoSave]);

  return {
    // State
    isMinting,
    mintError,
    lastMintId,
    lastResponse,
    mintHistory,

    // Actions
    mintTwinNFT,
    reset,
    cancelMint,

    // History management
    getMintById,
    getPendingMints,
    getSuccessfulMints,
    clearMintHistory
  };
}
