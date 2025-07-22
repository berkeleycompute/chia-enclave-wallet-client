import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ChiaCloudWalletClient } from '../../../src/client/ChiaCloudWalletClient'

interface SharedClientContextType {
  // Client instance
  client: ChiaCloudWalletClient | null
  
  // JWT Token
  jwtToken: string
  setJwtToken: (token: string) => void
  
  // Public key (cached)
  publicKey: string | null
  
  // Simple refresh function that child components can use
  refreshData: () => void
  
  // Last refresh timestamp
  lastRefresh: number
  
  // Connection status
  isConnected: boolean
}

const SharedClientContext = createContext<SharedClientContextType | null>(null)

interface SharedClientProviderProps {
  children: React.ReactNode
}

export const SharedClientProvider: React.FC<SharedClientProviderProps> = ({ children }) => {
  const [jwtToken, setJwtToken] = useState<string>('')
  const [client, setClient] = useState<ChiaCloudWalletClient | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)

  // Create client instance when JWT token changes
  useEffect(() => {
    if (jwtToken && jwtToken.trim().length > 0) {
      const newClient = new ChiaCloudWalletClient()
      newClient.setJwtToken(jwtToken)
      setClient(newClient)
      setIsConnected(true)
      
      // Get and cache public key
      newClient.getPublicKey().then((result) => {
        if (result.success) {
          setPublicKey(result.data.master_public_key)
        }
      }).catch(console.error)
    } else {
      setClient(null)
      setPublicKey(null)
      setIsConnected(false)
    }
  }, [jwtToken])

  const refreshData = useCallback(() => {
    setLastRefresh(Date.now())
  }, [])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (client && jwtToken) {
      const interval = setInterval(() => {
        refreshData()
      }, 2 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [client, jwtToken, refreshData])

  const contextValue = useMemo(() => ({
    client,
    jwtToken,
    setJwtToken,
    publicKey,
    refreshData,
    lastRefresh,
    isConnected
  }), [client, jwtToken, publicKey, refreshData, lastRefresh, isConnected])

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