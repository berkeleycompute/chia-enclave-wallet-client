import { useState, useCallback, useEffect } from 'react';
import { ChiaCloudWalletClient, type Coin } from '../client/ChiaCloudWalletClient';

// Utility interfaces
export interface CoinIdCalculation {
  coin: Coin;
  coinId: string;
  success: boolean;
  error?: string;
}

export interface FormatOptions {
  decimals?: number;
  removeTrailingZeros?: boolean;
  showUnit?: boolean;
  shortFormat?: boolean;
}

export interface CoinSelection {
  selectedCoins: Coin[];
  totalAmount: number;
  changeAmount: number;
  efficiency: number; // Ratio of selected amount to required amount
}

// Hook results
export interface UseChiaUtilsResult {
  // Conversion utilities
  mojosToXCH: (mojos: number | string) => number;
  xchToMojos: (xch: number) => string;
  formatXCH: (mojos: number | string, options?: FormatOptions) => string;
  formatMojos: (mojos: number | string) => string;
  
  // Address utilities
  formatAddress: (address: string, length?: number) => string;
  isValidAddress: (address: string) => boolean;
  
  // Coin utilities
  calculateCoinId: (coin: Coin) => Promise<CoinIdCalculation>;
  calculateCoinIds: (coins: Coin[]) => Promise<CoinIdCalculation[]>;
  sortCoinsByAmount: (coins: Coin[], descending?: boolean) => Coin[];
  
  // Selection utilities
  selectOptimalCoins: (coins: Coin[], targetAmount: number) => CoinSelection | null;
  estimateTransactionSize: (inputCount: number, outputCount: number) => number;
  
  // Time utilities
  formatTimestamp: (timestamp: number) => string;
  getRelativeTime: (timestamp: number) => string;
  
  // Hash utilities
  shortHash: (hash: string, length?: number) => string;
}

export interface UseFormattingResult {
  // Number formatting
  formatNumber: (value: number, decimals?: number) => string;
  formatPercentage: (value: number, decimals?: number) => string;
  formatCurrency: (value: number, currency?: string) => string;
  
  // XCH specific formatting
  formatXCHBalance: (mojos: number | string, options?: FormatOptions) => string;
  formatXCHAmount: (mojos: number | string, compact?: boolean) => string;
  
  // Size formatting
  formatBytes: (bytes: number) => string;
  formatFileSize: (bytes: number) => string;
  
  // Time formatting
  formatDuration: (milliseconds: number) => string;
  formatDateTime: (timestamp: number) => string;
  formatTimeAgo: (timestamp: number) => string;
  
  // Status formatting
  formatTransactionStatus: (status: string) => string;
  formatBlockHeight: (height: number) => string;
}

export interface UseCalculationsResult {
  // Fee calculations
  calculateOptimalFee: (transactionSize: number) => number;
  calculateFeeRate: (fee: number, size: number) => number;
  
  // Coin calculations
  calculateTotalValue: (coins: Coin[]) => number;
  calculateAverageValue: (coins: Coin[]) => number;
  
  // Transaction calculations
  calculateTransactionCost: (amount: number, fee: number) => number;
  calculateNetAmount: (grossAmount: number, fee: number) => number;
  
  // Utility calculations
  calculateEfficiency: (selected: number, required: number) => number;
  calculateWasteRatio: (change: number, amount: number) => number;
}

// Constants
const MOJOS_PER_XCH = 1000000000000; // 10^12
const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const BYTES_IN_KB = 1024;

// Main utility hook
export function useChiaUtils(): UseChiaUtilsResult {
  // Conversion utilities
  const mojosToXCH = useCallback((mojos: number | string): number => {
    const result = ChiaCloudWalletClient.mojosToXCH(typeof mojos === 'string' ? parseInt(mojos) : mojos);
    return result.success ? result.data : 0;
  }, []);

  const xchToMojos = useCallback((xch: number): string => {
    const result = ChiaCloudWalletClient.xchToMojos(xch);
    return result.success ? result.data : '0';
  }, []);

  const formatXCH = useCallback((mojos: number | string, options: FormatOptions = {}): string => {
    const {
      decimals = 6,
      removeTrailingZeros = true,
      showUnit = false,
      shortFormat = false
    } = options;

    const xchAmount = mojosToXCH(mojos);
    
    if (shortFormat && xchAmount >= 1000) {
      const units = ['', 'K', 'M', 'B', 'T'];
      let unitIndex = 0;
      let value = xchAmount;
      
      while (value >= 1000 && unitIndex < units.length - 1) {
        value /= 1000;
        unitIndex++;
      }
      
      const formatted = value.toFixed(unitIndex === 0 ? decimals : 2);
      const final = removeTrailingZeros ? formatted.replace(/\.?0+$/, '') : formatted;
      return `${final}${units[unitIndex]}${showUnit ? ' XCH' : ''}`;
    }

    let formatted = xchAmount.toFixed(decimals);
    if (removeTrailingZeros) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    
    return showUnit ? `${formatted} XCH` : formatted;
  }, [mojosToXCH]);

  const formatMojos = useCallback((mojos: number | string): string => {
    const value = typeof mojos === 'string' ? parseInt(mojos) : mojos;
    return value.toLocaleString() + ' mojos';
  }, []);

  // Address utilities
  const formatAddress = useCallback((address: string, length = 10): string => {
    if (!address || address.length <= length * 2) {
      return address;
    }
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }, []);

  const isValidAddress = useCallback((address: string): boolean => {
    try {
      // Basic validation - in a real implementation you'd use bech32m
      return address.startsWith('xch') && address.length > 50;
    } catch {
      return false;
    }
  }, []);

  // Coin utilities
  const calculateCoinId = useCallback(async (coin: Coin): Promise<CoinIdCalculation> => {
    try {
      const result = await ChiaCloudWalletClient.calculateCoinId(coin);
      return {
        coin,
        coinId: result.success ? result.data : '',
        success: result.success,
        error: result.success ? undefined : result.error
      };
    } catch (error) {
      return {
        coin,
        coinId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate coin ID'
      };
    }
  }, []);

  const calculateCoinIds = useCallback(async (coins: Coin[]): Promise<CoinIdCalculation[]> => {
    const promises = coins.map(coin => calculateCoinId(coin));
    return Promise.all(promises);
  }, [calculateCoinId]);

  const sortCoinsByAmount = useCallback((coins: Coin[], descending = true): Coin[] => {
    return [...coins].sort((a, b) => {
      const amountA = parseInt(a.amount);
      const amountB = parseInt(b.amount);
      return descending ? amountB - amountA : amountA - amountB;
    });
  }, []);

  // Selection utilities
  const selectOptimalCoins = useCallback((coins: Coin[], targetAmount: number): CoinSelection | null => {
    if (!coins.length || targetAmount <= 0) return null;

    // Sort coins by amount descending for efficiency
    const sortedCoins = sortCoinsByAmount(coins, true);
    
    let selectedCoins: Coin[] = [];
    let totalAmount = 0;
    
    // First try single coin selection
    for (const coin of sortedCoins) {
      const coinAmount = parseInt(coin.amount);
      if (coinAmount >= targetAmount) {
        return {
          selectedCoins: [coin],
          totalAmount: coinAmount,
          changeAmount: coinAmount - targetAmount,
          efficiency: targetAmount / coinAmount
        };
      }
    }
    
    // Multi-coin selection using greedy algorithm
    for (const coin of sortedCoins) {
      const coinAmount = parseInt(coin.amount);
      selectedCoins.push(coin);
      totalAmount += coinAmount;
      
      if (totalAmount >= targetAmount) {
        break;
      }
    }
    
    if (totalAmount < targetAmount) {
      return null; // Insufficient funds
    }
    
    return {
      selectedCoins,
      totalAmount,
      changeAmount: totalAmount - targetAmount,
      efficiency: targetAmount / totalAmount
    };
  }, [sortCoinsByAmount]);

  const estimateTransactionSize = useCallback((inputCount: number, outputCount: number): number => {
    // Rough estimation - actual size depends on various factors
    const baseSize = 100; // Base transaction overhead
    const inputSize = 150; // Estimated size per input
    const outputSize = 50;  // Estimated size per output
    
    return baseSize + (inputCount * inputSize) + (outputCount * outputSize);
  }, []);

  // Time utilities
  const formatTimestamp = useCallback((timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  }, []);

  const getRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = Math.abs(now - timestamp) / 1000;
    
    if (diff < SECONDS_IN_MINUTE) {
      return 'just now';
    } else if (diff < SECONDS_IN_HOUR) {
      const minutes = Math.floor(diff / SECONDS_IN_MINUTE);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < SECONDS_IN_DAY) {
      const hours = Math.floor(diff / SECONDS_IN_HOUR);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / SECONDS_IN_DAY);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }, []);

  // Hash utilities
  const shortHash = useCallback((hash: string, length = 8): string => {
    if (!hash || hash.length <= length * 2) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  }, []);

  return {
    mojosToXCH,
    xchToMojos,
    formatXCH,
    formatMojos,
    formatAddress,
    isValidAddress,
    calculateCoinId,
    calculateCoinIds,
    sortCoinsByAmount,
    selectOptimalCoins,
    estimateTransactionSize,
    formatTimestamp,
    getRelativeTime,
    shortHash
  };
}

// Formatting hook
export function useFormatting(): UseFormattingResult {
  // Number formatting
  const formatNumber = useCallback((value: number, decimals = 2): string => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }, []);

  const formatPercentage = useCallback((value: number, decimals = 2): string => {
    return `${formatNumber(value * 100, decimals)}%`;
  }, [formatNumber]);

  const formatCurrency = useCallback((value: number, currency = 'USD'): string => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency
    }).format(value);
  }, []);

  // XCH specific formatting
  const formatXCHBalance = useCallback((mojos: number | string, options: FormatOptions = {}): string => {
    const chiaUtils = useChiaUtils();
    return chiaUtils.formatXCH(mojos, options);
  }, []);

  const formatXCHAmount = useCallback((mojos: number | string, compact = false): string => {
    const chiaUtils = useChiaUtils();
    return chiaUtils.formatXCH(mojos, {
      decimals: compact ? 3 : 6,
      shortFormat: compact,
      showUnit: true
    });
  }, []);

  // Size formatting
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= BYTES_IN_KB && unitIndex < units.length - 1) {
      size /= BYTES_IN_KB;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  }, []);

  const formatFileSize = formatBytes; // Alias

  // Time formatting
  const formatDuration = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  const formatDateTime = useCallback((timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  }, []);

  const formatTimeAgo = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return 'just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
  }, []);

  // Status formatting
  const formatTransactionStatus = useCallback((status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'failed': 'Failed',
      'cancelled': 'Cancelled',
      'in_mempool': 'In Mempool'
    };
    
    return statusMap[status.toLowerCase()] || status;
  }, []);

  const formatBlockHeight = useCallback((height: number): string => {
    return height.toLocaleString();
  }, []);

  return {
    formatNumber,
    formatPercentage,
    formatCurrency,
    formatXCHBalance,
    formatXCHAmount,
    formatBytes,
    formatFileSize,
    formatDuration,
    formatDateTime,
    formatTimeAgo,
    formatTransactionStatus,
    formatBlockHeight
  };
}

// Calculations hook
export function useCalculations(): UseCalculationsResult {
  // Fee calculations
  const calculateOptimalFee = useCallback((transactionSize: number): number => {
    // Basic fee calculation - 1 mojo per byte minimum
    const baseFeeRate = 1; // 1 mojo per byte
    const minimumFee = 1000000; // 0.000001 XCH minimum
    
    const calculatedFee = transactionSize * baseFeeRate;
    return Math.max(calculatedFee, minimumFee);
  }, []);

  const calculateFeeRate = useCallback((fee: number, size: number): number => {
    return size > 0 ? fee / size : 0;
  }, []);

  // Coin calculations
  const calculateTotalValue = useCallback((coins: Coin[]): number => {
    return coins.reduce((total, coin) => total + parseInt(coin.amount), 0);
  }, []);

  const calculateAverageValue = useCallback((coins: Coin[]): number => {
    if (coins.length === 0) return 0;
    return calculateTotalValue(coins) / coins.length;
  }, [calculateTotalValue]);

  // Transaction calculations
  const calculateTransactionCost = useCallback((amount: number, fee: number): number => {
    return amount + fee;
  }, []);

  const calculateNetAmount = useCallback((grossAmount: number, fee: number): number => {
    return grossAmount - fee;
  }, []);

  // Utility calculations
  const calculateEfficiency = useCallback((selected: number, required: number): number => {
    return required > 0 ? required / selected : 0;
  }, []);

  const calculateWasteRatio = useCallback((change: number, amount: number): number => {
    return amount > 0 ? change / amount : 0;
  }, []);

  return {
    calculateOptimalFee,
    calculateFeeRate,
    calculateTotalValue,
    calculateAverageValue,
    calculateTransactionCost,
    calculateNetAmount,
    calculateEfficiency,
    calculateWasteRatio
  };
} 