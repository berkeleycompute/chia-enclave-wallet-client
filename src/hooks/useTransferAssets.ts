import { useState, useCallback, useRef } from 'react';
import { 
  ChiaCloudWalletClient,
  type TransferAssetsRequest,
  type TransferAssetsResponse,
  type XchTransfer,
  type CatTransfer,
  type NftTransfer
} from '../client/ChiaCloudWalletClient';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';

export interface TransferRecord {
  id: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  type: 'xch' | 'cat' | 'nft' | 'mixed';
  request: TransferAssetsRequest;
  response?: TransferAssetsResponse;
  error?: string;
  transactionId?: string;
}

// Hook configuration
export interface UseTransferAssetsConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  sdk?: ChiaWalletSDK;
  address?: string | null;
  baseUrl?: string;
  enableLogging?: boolean;
  autoSave?: boolean; // Save transfer records to localStorage
  onTransferStart?: (transferId: string) => void;
  onTransferSuccess?: (transferId: string, response: TransferAssetsResponse) => void;
  onTransferError?: (transferId: string, error: string) => void;
}

// Hook result interface
export interface UseTransferAssetsResult {
  // State
  isTransferring: boolean;
  transferError: string | null;
  lastTransferId: string | null;
  lastResponse: TransferAssetsResponse | null;
  transferHistory: TransferRecord[];

  // Actions - Main transfer function
  transferAssets: (request: TransferAssetsRequest) => Promise<{
    success: boolean;
    transferId?: string;
    response?: TransferAssetsResponse;
    error?: string;
  }>;

  // Convenience methods for specific asset types
  transferXCH: (
    coinIds: string[],
    recipientAddress: string,
    amount: number,
    fee?: number
  ) => Promise<{
    success: boolean;
    transferId?: string;
    response?: TransferAssetsResponse;
    error?: string;
  }>;

  transferCAT: (
    coinIds: string[],
    assetId: string,
    recipientAddress: string,
    amount: number,
    fee?: number
  ) => Promise<{
    success: boolean;
    transferId?: string;
    response?: TransferAssetsResponse;
    error?: string;
  }>;

  transferNFT: (
    coinId: string,
    launcherId: string,
    recipientAddress: string,
    fee?: number
  ) => Promise<{
    success: boolean;
    transferId?: string;
    response?: TransferAssetsResponse;
    error?: string;
  }>;

  // Utility actions
  reset: () => void;
  cancelTransfer: () => void;

  // History management
  getTransferById: (transferId: string) => TransferRecord | null;
  getPendingTransfers: () => TransferRecord[];
  getSuccessfulTransfers: () => TransferRecord[];
  clearTransferHistory: () => void;
}

// Storage key for transfer history
const TRANSFER_HISTORY_STORAGE_KEY = 'chia_transfer_history';

// Utility functions
function generateTransferId(): string {
  return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Determine transfer type from request
function determineTransferType(request: TransferAssetsRequest): 'xch' | 'cat' | 'nft' | 'mixed' {
  const hasXch = request.xch_transfers && request.xch_transfers.length > 0;
  const hasCat = request.cat_transfers && request.cat_transfers.length > 0;
  const hasNft = request.nft_transfers && request.nft_transfers.length > 0;
  
  const typeCount = [hasXch, hasCat, hasNft].filter(Boolean).length;
  
  if (typeCount > 1) return 'mixed';
  if (hasXch) return 'xch';
  if (hasCat) return 'cat';
  if (hasNft) return 'nft';
  
  return 'mixed'; // fallback
}

// Load transfer history from localStorage
function loadTransferHistory(): TransferRecord[] {
  try {
    const stored = localStorage.getItem(TRANSFER_HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load transfer history:', error);
    return [];
  }
}

// Save transfer history to localStorage
function saveTransferHistory(history: TransferRecord[]): void {
  try {
    localStorage.setItem(TRANSFER_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save transfer history:', error);
  }
}

// Main hook
export function useTransferAssets(config: UseTransferAssetsConfig = {}): UseTransferAssetsResult {
  const {
    jwtToken,
    client: externalClient,
    sdk: externalSDK,
    address: externalAddress,
    baseUrl,
    enableLogging = true,
    autoSave = true,
    onTransferStart,
    onTransferSuccess,
    onTransferError
  } = config;

  // Internal client reference
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);

  // State
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [lastTransferId, setLastTransferId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<TransferAssetsResponse | null>(null);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>(() => 
    autoSave ? loadTransferHistory() : []
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
      console.log(`[useTransferAssets] ${message}`, data || '');
    }
  }, [enableLogging]);

  // Update transfer record
  const updateTransferRecord = useCallback((transferId: string, updates: Partial<TransferRecord>) => {
    setTransferHistory(prev => {
      const updated = prev.map(record => 
        record.id === transferId ? { ...record, ...updates } : record
      );
      if (autoSave) {
        saveTransferHistory(updated);
      }
      return updated;
    });
  }, [autoSave]);

  // Main transfer function
  const transferAssets = useCallback(async (request: TransferAssetsRequest) => {
    const transferId = generateTransferId();
    setLastTransferId(transferId);
    setIsTransferring(true);
    setTransferError(null);

    const transferType = determineTransferType(request);

    log(`Starting ${transferType} transfer with ID: ${transferId}`, request);

    // Create transfer record
    const transferRecord: TransferRecord = {
      id: transferId,
      timestamp: Date.now(),
      status: 'pending',
      type: transferType,
      request
    };

    // Add to history
    setTransferHistory(prev => {
      const updated = [transferRecord, ...prev];
      if (autoSave) {
        saveTransferHistory(updated);
      }
      return updated;
    });

    // Trigger start callback
    onTransferStart?.(transferId);

    try {
      const client = getClient();
      if (!client) {
        throw new Error('No client available for asset transfer');
      }

      // Use the client method to transfer assets
      const result = await client.transferAssets(request);
      
      if (!result.success) {
        throw new Error((result as any).error || 'Asset transfer failed');
      }

      log(`Asset transfer successful for ${transferId}`, result.data);

      // Update state
      setLastResponse(result.data);
      updateTransferRecord(transferId, {
        status: 'success',
        response: result.data,
        transactionId: result.data.transaction_id
      });

      // Trigger success callback
      onTransferSuccess?.(transferId, result.data);

      return {
        success: true,
        transferId,
        response: result.data
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during asset transfer';
      
      log(`Asset transfer failed for ${transferId}: ${errorMessage}`, error);

      setTransferError(errorMessage);
      updateTransferRecord(transferId, {
        status: 'failed',
        error: errorMessage
      });

      // Trigger error callback
      onTransferError?.(transferId, errorMessage);

      return {
        success: false,
        transferId,
        error: errorMessage
      };

    } finally {
      setIsTransferring(false);
    }
  }, [getClient, baseUrl, jwtToken, log, updateTransferRecord, onTransferStart, onTransferSuccess, onTransferError]);

  // Convenience method: Transfer XCH
  const transferXCH = useCallback(async (
    coinIds: string[],
    recipientAddress: string,
    amount: number,
    fee?: number
  ) => {
    return transferAssets({
      coin_ids: coinIds,
      xch_transfers: [{
        target_address: recipientAddress,
        amount
      }],
      fee
    });
  }, [transferAssets]);

  // Convenience method: Transfer CAT
  const transferCAT = useCallback(async (
    coinIds: string[],
    assetId: string,
    recipientAddress: string,
    amount: number,
    fee?: number
  ) => {
    return transferAssets({
      coin_ids: coinIds,
      cat_transfers: [{
        asset_id: assetId,
        target_address: recipientAddress,
        amount
      }],
      fee
    });
  }, [transferAssets]);

  // Convenience method: Transfer NFT
  const transferNFT = useCallback(async (
    coinId: string,
    launcherId: string,
    recipientAddress: string,
    fee?: number
  ) => {
    return transferAssets({
      coin_ids: [coinId],
      nft_transfers: [{
        launcher_id: launcherId,
        target_address: recipientAddress,
        amount: 1 // NFTs always have amount 1
      }],
      fee
    });
  }, [transferAssets]);

  // Reset function
  const reset = useCallback(() => {
    setIsTransferring(false);
    setTransferError(null);
    setLastTransferId(null);
    setLastResponse(null);
  }, []);

  // Cancel transfer (basic implementation)
  const cancelTransfer = useCallback(() => {
    if (isTransferring) {
      setIsTransferring(false);
      setTransferError('Transfer cancelled by user');
      if (lastTransferId) {
        updateTransferRecord(lastTransferId, {
          status: 'failed',
          error: 'Cancelled by user'
        });
      }
    }
  }, [isTransferring, lastTransferId, updateTransferRecord]);

  // History management functions
  const getTransferById = useCallback((transferId: string) => {
    for (let i = 0; i < transferHistory.length; i++) {
      if (transferHistory[i].id === transferId) {
        return transferHistory[i];
      }
    }
    return null;
  }, [transferHistory]);

  const getPendingTransfers = useCallback(() => {
    const pendingTransfers: TransferRecord[] = [];
    for (let i = 0; i < transferHistory.length; i++) {
      if (transferHistory[i].status === 'pending') {
        pendingTransfers.push(transferHistory[i]);
      }
    }
    return pendingTransfers;
  }, [transferHistory]);

  const getSuccessfulTransfers = useCallback(() => {
    const successfulTransfers: TransferRecord[] = [];
    for (let i = 0; i < transferHistory.length; i++) {
      if (transferHistory[i].status === 'success') {
        successfulTransfers.push(transferHistory[i]);
      }
    }
    return successfulTransfers;
  }, [transferHistory]);

  const clearTransferHistory = useCallback(() => {
    setTransferHistory([]);
    if (autoSave) {
      localStorage.removeItem(TRANSFER_HISTORY_STORAGE_KEY);
    }
  }, [autoSave]);

  return {
    // State
    isTransferring,
    transferError,
    lastTransferId,
    lastResponse,
    transferHistory,

    // Actions
    transferAssets,
    transferXCH,
    transferCAT,
    transferNFT,
    reset,
    cancelTransfer,

    // History management
    getTransferById,
    getPendingTransfers,
    getSuccessfulTransfers,
    clearTransferHistory
  };
}

