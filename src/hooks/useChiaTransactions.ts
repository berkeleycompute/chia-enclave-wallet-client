import React, { useState, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type Coin, type SendXCHRequest } from '../client/ChiaCloudWalletClient';
import { bech32m } from 'bech32';

export interface TransactionRecord {
  id: string;
  type: 'outgoing' | 'incoming';
  amount: number;
  recipient?: string;
  sender?: string;
  fee: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  transactionId?: string;
  blockchainStatus?: string;
}

export interface UseChiaTransactionsResult {
  // State
  transactions: TransactionRecord[];
  isSending: boolean;
  sendError: string | null;
  
  // Actions
  sendXCH: (recipientAddress: string, amountXCH: number, feeXCH?: number) => Promise<boolean>;
  addTransaction: (transaction: TransactionRecord) => void;
  clearTransactions: () => void;
  
  // Validation
  validateChiaAddress: (address: string) => { isValid: boolean; error?: string };
}

const TRANSACTIONS_STORAGE_KEY = 'chia_transactions';

export function useChiaTransactions(client: ChiaCloudWalletClient, unspentCoins: Coin[]): UseChiaTransactionsResult {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  
  // Load transactions from localStorage on initialization
  const loadTransactions = useCallback(() => {
    try {
      const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (stored) {
        const parsedTransactions = JSON.parse(stored);
        // Convert amount and fee strings back to numbers
        const convertedTransactions = parsedTransactions.map((tx: any) => ({
          ...tx,
          amount: parseInt(tx.amount),
          fee: parseInt(tx.fee || '0'),
        }));
        
        // Filter out transactions older than 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentTransactions = convertedTransactions.filter((tx: TransactionRecord) => 
          tx.timestamp > thirtyDaysAgo
        );
        
        setTransactions(recentTransactions);
        
        // Save cleaned transactions back if we filtered any
        if (recentTransactions.length !== convertedTransactions.length) {
          saveTransactions(recentTransactions);
        }
      }
    } catch (error) {
      console.error('Failed to load transactions from localStorage:', error);
    }
  }, []);
  
  // Save transactions to localStorage
  const saveTransactions = useCallback((txs: TransactionRecord[]) => {
    try {
      // Convert numbers to string for consistent JSON serialization
      const serializableTransactions = txs.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
        fee: tx.fee.toString(),
      }));
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(serializableTransactions));
    } catch (error) {
      console.error('Failed to save transactions to localStorage:', error);
    }
  }, []);
  
  // Validate Chia address using bech32m
  const validateChiaAddress = useCallback((address: string): { isValid: boolean; error?: string } => {
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
        error: err instanceof Error ? `Invalid address encoding: ${err.message}` : 'Invalid address encoding',
      };
    }
  }, []);
  
  // Select coins for a transaction amount
  const selectCoinsForAmount = useCallback((totalNeededMojos: number): Coin[] | null => {
    if (!unspentCoins || unspentCoins.length === 0) {
      return null;
    }
    
    // Sort coins by amount descending (largest first)
    const sortedCoins = [...unspentCoins].sort((a, b) => {
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
      return null;
    }
    
    return selectedCoins;
  }, [unspentCoins]);
  
  // Send XCH transaction
  const sendXCH = useCallback(async (recipientAddress: string, amountXCH: number, feeXCH: number = 0.00001): Promise<boolean> => {
    if (!client) {
      setSendError('Wallet client not available');
      return false;
    }
    
    setIsSending(true);
    setSendError(null);
    
    try {
      // Validate recipient address
      const addressValidation = validateChiaAddress(recipientAddress);
      if (!addressValidation.isValid) {
        throw new Error(addressValidation.error || 'Invalid Chia address format');
      }
      
      // Validate amounts
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
      
      // Select coins
      const selectedCoins = selectCoinsForAmount(totalNeededMojos);
      if (!selectedCoins) {
        const availableBalance = unspentCoins.reduce((sum, coin) => sum + parseInt(coin.amount), 0);
        const availableXCH = ChiaCloudWalletClient.mojosToXCHUnsafe(availableBalance);
        const neededXCH = ChiaCloudWalletClient.mojosToXCHUnsafe(totalNeededMojos);
        throw new Error(`Insufficient balance. Need ${neededXCH.toFixed(6)} XCH, have ${availableXCH.toFixed(6)} XCH`);
      }
      
      // Create transaction request
      const request: SendXCHRequest = {
        payments: [{
          address: recipientAddress,
          amount: amountResult.data,
        }],
        selected_coins: selectedCoins,
        fee: feeResult.data,
      };
      
      // Send and broadcast transaction
      const result = await client.sendAndBroadcastXCH(request);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Create transaction record
      const transactionRecord: TransactionRecord = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'outgoing',
        amount: parseInt(amountResult.data),
        recipient: recipientAddress,
        fee: parseInt(feeResult.data),
        timestamp: Date.now(),
        status: 'pending',
        transactionId: result.data.transaction_id,
        blockchainStatus: result.data.status,
      };
      
      // Add transaction to list
      const updatedTransactions = [...transactions, transactionRecord];
      setTransactions(updatedTransactions);
      saveTransactions(updatedTransactions);
      
      // Start confirmation checking (simplified - in a real app you'd want more sophisticated checking)
      setTimeout(() => {
        setTransactions(prevTransactions => 
          prevTransactions.map(tx => 
            tx.id === transactionRecord.id ? { ...tx, status: 'confirmed' } : tx
          )
        );
      }, 30000); // Mark as confirmed after 30 seconds (placeholder)
      
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction';
      setSendError(errorMessage);
      return false;
    } finally {
      setIsSending(false);
    }
  }, [client, unspentCoins, transactions, validateChiaAddress, selectCoinsForAmount, saveTransactions]);
  
  // Add a transaction record (for external transactions)
  const addTransaction = useCallback((transaction: TransactionRecord) => {
    const updatedTransactions = [...transactions, transaction];
    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);
  }, [transactions, saveTransactions]);
  
  // Clear all transactions
  const clearTransactions = useCallback(() => {
    setTransactions([]);
    try {
      localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear transactions from localStorage:', error);
    }
  }, []);
  
  // Load transactions on mount
  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);
  
  return {
    transactions,
    isSending,
    sendError,
    sendXCH,
    addTransaction,
    clearTransactions,
    validateChiaAddress,
  };
} 