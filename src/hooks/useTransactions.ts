import { useState, useEffect, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type SendXCHRequest, type Coin } from '../client/ChiaCloudWalletClient';
import { bech32m } from 'bech32';

// Transaction interfaces
export interface TransactionRecord {
  id: string;
  type: 'outgoing' | 'incoming';
  amount: number;
  recipient?: string;
  sender?: string;
  fee: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  transactionId?: string;
  blockchainStatus?: string;
  error?: string;
  formattedAmount?: string;
  formattedFee?: string;
}

// Send transaction configuration
export interface SendXCHConfig {
  recipientAddress: string;
  amountXCH: number;
  feeXCH?: number;
  selectedCoins?: Coin[];
  memo?: string;
}

// Hook configurations
export interface UseTransactionHistoryConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  autoSave?: boolean;
  maxHistory?: number;
  baseUrl?: string;
  enableLogging?: boolean;
}

export interface UseSendXCHConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  address?: string | null;
  unspentCoins?: Coin[];
  baseUrl?: string;
  enableLogging?: boolean;
  onTransactionSent?: (transaction: TransactionRecord) => void;
  onTransactionError?: (error: string) => void;
}

// Hook results
export interface UseTransactionHistoryResult {
  transactions: TransactionRecord[];
  loading: boolean;
  error: string | null;
  
  // Actions
  addTransaction: (transaction: Omit<TransactionRecord, 'id' | 'formattedAmount' | 'formattedFee'>) => void;
  updateTransaction: (id: string, updates: Partial<TransactionRecord>) => void;
  deleteTransaction: (id: string) => void;
  clearHistory: () => void;
  
  // Utilities
  getTransactionById: (id: string) => TransactionRecord | null;
  getPendingTransactions: () => TransactionRecord[];
  getRecentTransactions: (days?: number) => TransactionRecord[];
}

export interface UseSendXCHResult {
  // State
  isSending: boolean;
  sendError: string | null;
  lastTransactionId: string | null;
  
  // Actions
  sendXCH: (config: SendXCHConfig) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  cancelSend: () => void;
  reset: () => void;
  
  // Validation
  validateAddress: (address: string) => { isValid: boolean; error?: string };
  validateAmount: (amount: number, availableBalance: number) => { isValid: boolean; error?: string };
  estimateFee: (amount: number) => number;
  
  // Coin selection
  selectCoinsForAmount: (totalNeededMojos: number, availableCoins: Coin[]) => Coin[] | undefined;
}

// Transaction status tracking
export interface UseTransactionStatusConfig {
  transactionId?: string;
  client?: ChiaCloudWalletClient;
  checkInterval?: number;
  maxCheckDuration?: number;
}

export interface UseTransactionStatusResult {
  status: 'unknown' | 'pending' | 'confirmed' | 'failed';
  loading: boolean;
  error: string | null;
  confirmations: number;
  blockHeight?: number;
  
  // Actions
  startTracking: (txId: string) => void;
  stopTracking: () => void;
  checkStatus: () => Promise<void>;
}

// Storage key for transaction history
const TRANSACTIONS_STORAGE_KEY = 'chia_transaction_history';

// Utility functions
function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatAmount(amount: number): string {
  const result = ChiaCloudWalletClient.mojosToXCH(amount);
  if (!result.success) return '0';
  
  let formatted = result.data.toFixed(13);
  formatted = formatted.replace(/\.?0+$/, '');
  
  return formatted;
}

// Transaction history hook
export function useTransactionHistory(config: UseTransactionHistoryConfig = {}): UseTransactionHistoryResult {
  const {
    autoSave = true,
    maxHistory = 500
  } = config;

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transactions from storage
  const loadTransactions = useCallback(() => {
    if (!autoSave) return;
    
    try {
      setLoading(true);
      const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (stored) {
        const parsedTransactions: TransactionRecord[] = JSON.parse(stored);
        
        // Filter out old transactions (older than 90 days)
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        const recentTransactions = parsedTransactions
          .filter(tx => tx.timestamp > ninetyDaysAgo)
          .slice(0, maxHistory) // Limit to max history
          .map(tx => ({
            ...tx,
            // Ensure formatted amounts exist
            formattedAmount: tx.formattedAmount || formatAmount(tx.amount),
            formattedFee: tx.formattedFee || formatAmount(tx.fee)
          }));
        
        setTransactions(recentTransactions);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load transaction history');
      setLoading(false);
    }
  }, [autoSave, maxHistory]);

  // Save transactions to storage
  const saveTransactions = useCallback((txs: TransactionRecord[]) => {
    if (!autoSave) return;
    
    try {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs));
    } catch (err) {
      console.error('Failed to save transaction history:', err);
    }
  }, [autoSave]);

  // Add transaction
  const addTransaction = useCallback((transaction: Omit<TransactionRecord, 'id' | 'formattedAmount' | 'formattedFee'>) => {
    const newTransaction: TransactionRecord = {
      ...transaction,
      id: generateTransactionId(),
      formattedAmount: formatAmount(transaction.amount),
      formattedFee: formatAmount(transaction.fee)
    };

    setTransactions(prev => {
      const updated = [newTransaction, ...prev].slice(0, maxHistory);
      saveTransactions(updated);
      return updated;
    });
  }, [maxHistory, saveTransactions]);

  // Update transaction
  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRecord>) => {
    setTransactions(prev => {
      const updated = prev.map(tx => 
        tx.id === id 
          ? { 
              ...tx, 
              ...updates,
              formattedAmount: updates.amount ? formatAmount(updates.amount) : tx.formattedAmount,
              formattedFee: updates.fee ? formatAmount(updates.fee) : tx.formattedFee
            }
          : tx
      );
      saveTransactions(updated);
      return updated;
    });
  }, [saveTransactions]);

  // Delete transaction
  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => {
      const updated = prev.filter(tx => tx.id !== id);
      saveTransactions(updated);
      return updated;
    });
  }, [saveTransactions]);

  // Clear history
  const clearHistory = useCallback(() => {
    setTransactions([]);
    if (autoSave) {
      localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    }
  }, [autoSave]);

  // Get transaction by ID
  const getTransactionById = useCallback((id: string): TransactionRecord | null => {
    return transactions.find(tx => tx.id === id) || null;
  }, [transactions]);

  // Get pending transactions
  const getPendingTransactions = useCallback(() => {
    return transactions.filter(tx => tx.status === 'pending');
  }, [transactions]);

  // Get recent transactions
  const getRecentTransactions = useCallback((days = 7) => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return transactions.filter(tx => tx.timestamp >= cutoff);
  }, [transactions]);

  // Load on mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearHistory,
    getTransactionById,
    getPendingTransactions,
    getRecentTransactions
  };
}

// Send XCH hook
export function useSendXCH(config: UseSendXCHConfig = {}): UseSendXCHResult {
  const {
    jwtToken,
    client: externalClient,
    address: externalAddress,
    unspentCoins: externalCoins,
    baseUrl,
    enableLogging = true,
    onTransactionSent,
    onTransactionError
  } = config;

  const internalClient = useRef<ChiaCloudWalletClient | null>(null);
  
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

  // Get or create client
  const getClient = useCallback((): ChiaCloudWalletClient | null => {
    if (externalClient) return externalClient;
    
    if (!internalClient.current && (jwtToken || baseUrl)) {
      internalClient.current = new ChiaCloudWalletClient({
        baseUrl,
        enableLogging
      });
      if (jwtToken) {
        internalClient.current.setJwtToken(jwtToken);
      }
    }
    
    return internalClient.current;
  }, [externalClient, jwtToken, baseUrl, enableLogging]);

  // Validate Chia address
  const validateAddress = useCallback((address: string): { isValid: boolean; error?: string } => {
    try {
      if (!address || typeof address !== 'string') {
        return { isValid: false, error: 'Address must be a non-empty string' };
      }
      
      const decoded = bech32m.decode(address);
      
      if (decoded.prefix !== 'xch') {
        return { isValid: false, error: 'Invalid address prefix: must be "xch"' };
      }
      
      if (decoded.words.length !== 52) {
        return { isValid: false, error: 'Invalid address data length' };
      }
      
      return { isValid: true };
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? `Invalid address: ${err.message}` : 'Invalid address',
      };
    }
  }, []);

  // Validate amount
  const validateAmount = useCallback((amount: number, availableBalance: number): { isValid: boolean; error?: string } => {
    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than zero' };
    }

    if (amount > availableBalance) {
      return { 
        isValid: false, 
        error: `Insufficient balance. Available: ${formatAmount(availableBalance)} XCH` 
      };
    }

    return { isValid: true };
  }, []);

  // Estimate fee (basic estimation)
  const estimateFee = useCallback((amount: number): number => {
    // Basic fee estimation - in practice this could be more sophisticated
    const baseFeeMojos = 1000000; // 0.000001 XCH
    const amountMojos = ChiaCloudWalletClient.xchToMojos(amount);
    
    if (!amountMojos.success) return baseFeeMojos;
    
    // Add small percentage for larger transactions
    const amountValue = parseInt(amountMojos.data);
    const feePercentage = Math.max(0.0001, Math.min(0.001, amountValue / 1000000000000)); // 0.01% to 0.1%
    
    return Math.max(baseFeeMojos, Math.floor(amountValue * feePercentage));
  }, []);

  // Select coins for transaction
  const selectCoinsForAmount = useCallback((totalNeededMojos: number, availableCoins: Coin[]): Coin[] | undefined => {
    if (!availableCoins || availableCoins.length === 0) {
      return undefined;
    }
    
    // Sort coins by amount descending (largest first for efficiency)
    const sortedCoins = [...availableCoins].sort((a, b) => {
      const amountA = parseInt(a.amount);
      const amountB = parseInt(b.amount);
      return amountB - amountA;
    });
    
    const selectedCoins: Coin[] = [];
    let totalSelected = 0;
    
    // Greedy selection: pick coins until we have enough
    for (const coin of sortedCoins) {
      selectedCoins.push(coin);
      totalSelected += parseInt(coin.amount);
      
      if (totalSelected >= totalNeededMojos) {
        break;
      }
    }
    
    // Check if we have enough
    if (totalSelected < totalNeededMojos) {
      return undefined;
    }
    
    return selectedCoins;
  }, []);

  // Send XCH transaction
  const sendXCH = useCallback(async (sendConfig: SendXCHConfig): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'No client available' };
    }

    setIsSending(true);
    setSendError(null);

    try {
      const { recipientAddress, amountXCH, feeXCH = 0.00001, selectedCoins, memo } = sendConfig;

      // Validate address
      const addressValidation = validateAddress(recipientAddress);
      if (!addressValidation.isValid) {
        throw new Error(addressValidation.error || 'Invalid recipient address');
      }

      // Validate amount
      if (amountXCH <= 0) {
        throw new Error('Amount must be greater than zero');
      }

      if (feeXCH < 0) {
        throw new Error('Fee cannot be negative');
      }

      // Convert amounts to mojos
      const amountResult = ChiaCloudWalletClient.xchToMojos(amountXCH);
      const feeResult = ChiaCloudWalletClient.xchToMojos(feeXCH);
      
      if (!amountResult.success) {
        throw new Error(`Invalid amount: ${amountResult.error}`);
      }
      
      if (!feeResult.success) {
        throw new Error(`Invalid fee: ${feeResult.error}`);
      }

      const totalNeededMojos = parseInt(amountResult.data) + parseInt(feeResult.data);

      // Select coins if not provided
      let coinsToUse = selectedCoins;
      if (!coinsToUse && externalCoins) {
        coinsToUse = selectCoinsForAmount(totalNeededMojos, externalCoins);
        if (!coinsToUse) {
          const availableBalance = externalCoins.reduce((sum, coin) => sum + parseInt(coin.amount), 0);
          throw new Error(`Insufficient balance. Need ${formatAmount(totalNeededMojos)} XCH, have ${formatAmount(availableBalance)} XCH`);
        }
      }

      if (!coinsToUse || coinsToUse.length === 0) {
        throw new Error('No coins available for transaction');
      }

      // Create transaction request
      const request: SendXCHRequest = {
        payments: [{
          address: recipientAddress,
          amount: amountResult.data,
        }],
        selected_coins: coinsToUse,
        fee: feeResult.data,
      };

      // Send and broadcast transaction
      const result = await client.sendAndBroadcastXCH(request);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const transactionId = result.data.transaction_id || generateTransactionId();
      setLastTransactionId(transactionId);

      // Create transaction record
      const transactionRecord: TransactionRecord = {
        id: generateTransactionId(),
        type: 'outgoing',
        amount: parseInt(amountResult.data),
        recipient: recipientAddress,
        fee: parseInt(feeResult.data),
        timestamp: Date.now(),
        status: 'pending',
        transactionId: transactionId,
        blockchainStatus: result.data.status,
        formattedAmount: formatAmount(parseInt(amountResult.data)),
        formattedFee: formatAmount(parseInt(feeResult.data))
      };

      // Call callback if provided
      if (onTransactionSent) {
        onTransactionSent(transactionRecord);
      }

      setIsSending(false);
      return { success: true, transactionId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction';
      setSendError(errorMessage);
      setIsSending(false);

      if (onTransactionError) {
        onTransactionError(errorMessage);
      }

      return { success: false, error: errorMessage };
    }
  }, [getClient, validateAddress, selectCoinsForAmount, externalCoins, onTransactionSent, onTransactionError]);

  // Cancel send (if in progress)
  const cancelSend = useCallback(() => {
    // Note: This doesn't actually cancel blockchain transactions,
    // just resets the local sending state
    setIsSending(false);
    setSendError(null);
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setIsSending(false);
    setSendError(null);
    setLastTransactionId(null);
  }, []);

  return {
    isSending,
    sendError,
    lastTransactionId,
    sendXCH,
    cancelSend,
    reset,
    validateAddress,
    validateAmount,
    estimateFee,
    selectCoinsForAmount
  };
} 