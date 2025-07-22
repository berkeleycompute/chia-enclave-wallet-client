import { useCallback } from 'react'
import { useSharedClient } from './SharedClientProvider'
import type { BalanceBreakdown } from '../../../src'

// Optimized balance hooks that use shared cached data instead of making API calls

export function useOptimizedBalance() {
  const { sharedData, loading, error, lastRefresh, refreshData, isDataFresh } = useSharedClient()

  const formatBalance = useCallback((amount: number): string => {
    let formatted = (amount / 1e12).toFixed(13)
    formatted = formatted.replace(/\.?0+$/, '')
    return formatted
  }, [])

  const isStale = useCallback((): boolean => {
    return !isDataFresh()
  }, [isDataFresh])

  const balance: BalanceBreakdown | null = sharedData.balance ? {
    total: sharedData.balance.total,
    xch: sharedData.balance.xch,
    cat: sharedData.balance.cat,
    nft: sharedData.balance.nft,
    formattedTotal: sharedData.balance.formattedTotal,
    formattedXCH: sharedData.balance.formattedXCH,
    formattedCAT: sharedData.balance.formattedCAT,
    coinCount: sharedData.balance.coinCount,
    xchCoinCount: sharedData.balance.xchCoinCount,
    catCoinCount: sharedData.balance.catCoinCount,
    nftCoinCount: sharedData.balance.nftCoinCount
  } : null

  return {
    balance,
    loading,
    error,
    lastUpdate: lastRefresh,
    refresh: refreshData,
    reset: () => { /* No-op for optimized version */ },
    formatBalance,
    isStale
  }
}

export function useOptimizedXCHBalance() {
  const { sharedData, loading, error, lastRefresh, refreshData, isDataFresh } = useSharedClient()
  
  const isStale = useCallback((): boolean => {
    return !isDataFresh()
  }, [isDataFresh])

  return {
    balance: sharedData.balance?.xch || 0,
    formattedBalance: sharedData.balance?.formattedXCH || '0',
    coinCount: sharedData.balance?.xchCoinCount || 0,
    loading,
    error,
    lastUpdate: lastRefresh,
    refresh: refreshData,
    reset: () => { /* No-op for optimized version */ },
    isStale
  }
}

export function useOptimizedCATBalance() {
  const { sharedData, loading, error, lastRefresh, refreshData, isDataFresh } = useSharedClient()
  
  const isStale = useCallback((): boolean => {
    return !isDataFresh()
  }, [isDataFresh])

  return {
    balance: sharedData.balance?.cat || 0,
    formattedBalance: sharedData.balance?.formattedCAT || '0',
    coinCount: sharedData.balance?.catCoinCount || 0,
    loading,
    error,
    lastUpdate: lastRefresh,
    refresh: refreshData,
    reset: () => { /* No-op for optimized version */ },
    isStale
  }
}

export function useOptimizedTotalBalance() {
  const { sharedData, loading, error, lastRefresh, refreshData, isDataFresh } = useSharedClient()
  
  const isStale = useCallback((): boolean => {
    return !isDataFresh()
  }, [isDataFresh])

  return {
    balance: sharedData.balance?.total || 0,
    formattedBalance: sharedData.balance?.formattedTotal || '0',
    coinCount: sharedData.balance?.coinCount || 0,
    breakdown: sharedData.balance,
    loading,
    error,
    lastUpdate: lastRefresh,
    refresh: refreshData,
    reset: () => { /* No-op for optimized version */ },
    isStale
  }
} 