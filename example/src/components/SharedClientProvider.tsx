import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ChiaCloudWalletClient, type HydratedCoin, type Coin } from '../../../src/client/ChiaCloudWalletClient'

interface SharedData {
  hydratedCoins: HydratedCoin[]
  unspentCoins: Coin[]
  publicKeyData: any | null
  balance: {
    total: number
    xch: number
    cat: number
    nft: number
    coinCount: number
    xchCoinCount: number
    catCoinCount: number
    nftCoinCount: number
    formattedTotal: string
    formattedXCH: string
    formattedCAT: string
  } | null
}

interface SharedClientContextType {
  // Client instance
  client: ChiaCloudWalletClient | null
  
  // JWT Token
  jwtToken: string
  setJwtToken: (token: string) => void
  
  // Public key (cached)
  publicKey: string | null
  
  // Shared cached data
  sharedData: SharedData
  
  // Loading states
  loading: boolean
  
  // Error state
  error: string | null
  
  // Refresh functions
  refreshData: () => Promise<void>
  
  // Last refresh timestamp
  lastRefresh: number
  
  // Connection status
  isConnected: boolean
  
  // Data freshness check
  isDataFresh: () => boolean
  
  // Utility to get coins directly from cache
  getCoinsFromCache: () => HydratedCoin[]
}

const SharedClientContext = createContext<SharedClientContextType | null>(null)

interface SharedClientProviderProps {
  children: React.ReactNode
}

const CACHE_DURATION = 60000 // 1 minute cache duration

export const SharedClientProvider: React.FC<SharedClientProviderProps> = ({ children }) => {
  const [jwtToken, setJwtToken] = useState<string>('')
  const [client, setClient] = useState<ChiaCloudWalletClient | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  // Cached data
  const [sharedData, setSharedData] = useState<SharedData>({
    hydratedCoins: [],
    unspentCoins: [],
    publicKeyData: null,
    balance: null
  })
  
  // Prevent concurrent requests
  const refreshInProgress = useRef<boolean>(false)
  const autoRefreshInterval = useRef<number | null>(null)

  // Create client instance when JWT token changes
  useEffect(() => {
    if (jwtToken && jwtToken.trim().length > 0) {
      const newClient = new ChiaCloudWalletClient()
      newClient.setJwtToken(jwtToken)
      setClient(newClient)
      setIsConnected(true)
      
      // Clear previous data when token changes
      setSharedData({
        hydratedCoins: [],
        unspentCoins: [],
        publicKeyData: null,
        balance: null
      })
      setPublicKey(null)
      setError(null)
    } else {
      setClient(null)
      setPublicKey(null)
      setIsConnected(false)
      setSharedData({
        hydratedCoins: [],
        unspentCoins: [],
        publicKeyData: null,
        balance: null
      })
    }
  }, [jwtToken])

  // Calculate balance breakdown from hydrated coins
  const calculateBalance = useCallback((hydratedCoins: HydratedCoin[]) => {
    let totalBalance = 0
    let xchBalance = 0
    let catBalance = 0
    let nftBalance = 0
    let xchCount = 0
    let catCount = 0
    let nftCount = 0

    hydratedCoins.forEach((coin) => {
      const amount = parseInt(coin.coin.amount)
      totalBalance += amount

      const driverType = coin.parentSpendInfo?.driverInfo?.type
      
      if (driverType === 'CAT') {
        catBalance += amount
        catCount++
      } else if (driverType === 'NFT') {
        nftBalance += amount
        nftCount++
      } else {
        xchBalance += amount
        xchCount++
      }
    })

    return {
      total: totalBalance,
      xch: xchBalance,
      cat: catBalance,
      nft: nftBalance,
      coinCount: hydratedCoins.length,
      xchCoinCount: xchCount,
      catCoinCount: catCount,
      nftCoinCount: nftCount,
      formattedTotal: (totalBalance / 1e12).toFixed(6),
      formattedXCH: (xchBalance / 1e12).toFixed(6),
      formattedCAT: (catBalance / 1e12).toFixed(6)
    }
  }, [])

  const refreshData = useCallback(async () => {
    if (!client || refreshInProgress.current) {
      console.log('🚫 SharedClientProvider: Skipping refresh - no client or refresh in progress')
      return
    }

    refreshInProgress.current = true
    setLoading(true)
    setError(null)

    try {
      console.log('🔄 SharedClientProvider: Starting data refresh...')
      
      // Get public key if we don't have it cached
      let address = publicKey
      if (!address) {
        console.log('📝 SharedClientProvider: Fetching public key...')
        const publicKeyResult = await client.getPublicKey()
        if (!publicKeyResult.success) {
          throw new Error(publicKeyResult.error || 'Failed to get public key')
        }
        address = publicKeyResult.data.address
        setPublicKey(address)
        setSharedData(prev => ({ ...prev, publicKeyData: publicKeyResult.data }))
        console.log('✅ SharedClientProvider: Public key cached')
      }

      // Get hydrated coins - this is the main expensive call
      console.log('💰 SharedClientProvider: Fetching hydrated coins...')
      const coinsResult = await client.getUnspentHydratedCoins(address)
      if (!coinsResult.success) {
        throw new Error(coinsResult.error || 'Failed to get hydrated coins')
      }

      const hydratedCoins = coinsResult.data.data
      const unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins)
      const balance = calculateBalance(hydratedCoins)

      // Update all cached data at once
      setSharedData({
        hydratedCoins,
        unspentCoins,
        publicKeyData: sharedData.publicKeyData,
        balance
      })

      setLastRefresh(Date.now())
      console.log(`✅ SharedClientProvider: Data refreshed successfully - ${hydratedCoins.length} coins, ${balance.formattedTotal} XCH`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ SharedClientProvider: Refresh failed:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      refreshInProgress.current = false
    }
  }, [client, publicKey, calculateBalance, sharedData.publicKeyData])

  // Check if data is fresh
  const isDataFresh = useCallback((): boolean => {
    return lastRefresh > 0 && (Date.now() - lastRefresh) < CACHE_DURATION
  }, [lastRefresh])

  // Get coins from cache (for hooks to use)
  const getCoinsFromCache = useCallback((): HydratedCoin[] => {
    return sharedData.hydratedCoins
  }, [sharedData.hydratedCoins])

  // Auto-refresh when client becomes available
  useEffect(() => {
    if (client && jwtToken) {
      // Initial load
      refreshData()
      
      // Set up auto-refresh
      autoRefreshInterval.current = window.setInterval(() => {
        if (!loading && isConnected) {
          refreshData()
        }
      }, CACHE_DURATION)
      
      return () => {
        if (autoRefreshInterval.current) {
          clearInterval(autoRefreshInterval.current)
          autoRefreshInterval.current = null
        }
      }
    }
  }, [client, jwtToken, refreshData, loading, isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [])

  const contextValue = useMemo(() => ({
    client,
    jwtToken,
    setJwtToken,
    publicKey,
    sharedData,
    loading,
    error,
    refreshData,
    lastRefresh,
    isConnected,
    isDataFresh,
    getCoinsFromCache
  }), [
    client,
    jwtToken,
    publicKey,
    sharedData,
    loading,
    error,
    refreshData,
    lastRefresh,
    isConnected,
    isDataFresh,
    getCoinsFromCache
  ])

  return (
    <SharedClientContext.Provider value={contextValue}>
      {children}
    </SharedClientContext.Provider>
  )
}

export const useSharedClient = (): SharedClientContextType => {
  const context = useContext(SharedClientContext)
  if (!context) {
    throw new Error('useSharedClient must be used within a SharedClientProvider')
  }
  return context
} 