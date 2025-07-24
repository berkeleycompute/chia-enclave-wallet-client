import { useState, useEffect, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin } from '../client/ChiaCloudWalletClient';
import { ChiaInsightClient } from '../client/ChiaInsightClient';

// NFT metadata interface
export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collection?: {
    name: string;
    family?: string;
  };
  [key: string]: any;
}

// NFT with metadata interface
export interface NFTWithMetadata extends HydratedCoin {
  metadata?: NFTMetadata;
  metadataUri?: string | null;
  metadataLoading: boolean;
  metadataError?: string;
}

// Hook configuration
export interface UseNFTsConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  address?: string | null;
  autoRefresh?: boolean;
  autoLoadMetadata?: boolean;
  refreshInterval?: number;
  baseUrl?: string;
  enableLogging?: boolean;
  // ChiaInsight configuration
  insightUrl?: string;
  insightJwtToken?: string;
  useInsightClient?: boolean;
}

// Hook result interface
export interface UseNFTsResult {
  nfts: NFTWithMetadata[];
  nftCount: number;
  loading: boolean;
  metadataLoading: boolean;
  error: string | null;
  lastUpdate: number;
  
  // Actions
  refresh: () => Promise<boolean>;
  loadMetadata: (nft: HydratedCoin) => Promise<NFTMetadata | null>;
  loadAllMetadata: () => Promise<void>;
  reset: () => void;
  
  // Utilities
  getNFTById: (coinId: string) => NFTWithMetadata | null;
  getNFTsByCollection: (collectionName: string) => NFTWithMetadata[];
  searchNFTs: (query: string) => NFTWithMetadata[];
}

// NFT metadata cache
const metadataCache = new Map<string, { data: NFTMetadata; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Main NFT hook
export function useNFTs(config: UseNFTsConfig = {}): UseNFTsResult {
  const {
    jwtToken,
    client: externalClient,
    address: externalAddress,
    autoRefresh = false,
    autoLoadMetadata = true,
    refreshInterval = 120000, // 2 minutes for NFTs
    baseUrl,
    enableLogging = true,
    // ChiaInsight configuration
    insightUrl,
    insightJwtToken,
    useInsightClient = false
  } = config;

  // Internal clients if none provided
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);
  const insightClient = useRef<ChiaInsightClient | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const metadataLoadingRef = useRef<Set<string>>(new Set());
  
  const [nfts, setNfts] = useState<NFTWithMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [address, setAddress] = useState<string | null>(externalAddress || null);

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

  // Get or create ChiaInsight client
  const getInsightClient = useCallback((): ChiaInsightClient | null => {
    if (!useInsightClient) return null;
    
    if (!insightClient.current && (insightJwtToken || insightUrl)) {
      insightClient.current = new ChiaInsightClient({
        apiUrl: insightUrl || 'https://aedugkfqljpfirjylfvq.supabase.co/functions/v1/api',
        apiToken: insightJwtToken,
        enableLogging
      });
    }
    
    return insightClient.current;
  }, [useInsightClient, insightJwtToken, insightUrl, enableLogging]);

  // Get wallet address if not provided
  const getAddress = useCallback(async (): Promise<string | null> => {
    if (externalAddress) return externalAddress;
    if (address) return address;

    const client = getClient();
    if (!client) return null;

    try {
      const result = await client.getPublicKey();
      if (result.success) {
        setAddress(result.data.address);
        return result.data.address;
      }
    } catch (error) {
      console.warn('Failed to get wallet address for NFTs:', error);
    }
    
    return null;
  }, [externalAddress, address, getClient]);

  // Extract metadata URI from NFT data
  const extractMetadataUri = useCallback((nft: HydratedCoin): string | null => {
    try {
      const driverInfo = nft.parentSpendInfo?.driverInfo;
      if (driverInfo?.type === 'NFT' && (driverInfo as any).also) {
        // Look for metadata URI in the NFT data structure
        const nftData = (driverInfo as any).also;
        return nftData.metadata_uris?.[0] || nftData.data_uris?.[0] || null;
      }
    } catch (error) {
      console.warn('Error extracting metadata URI:', error);
    }
    return null;
  }, []);

  // Load metadata for a single NFT
  const loadMetadata = useCallback(async (nft: HydratedCoin): Promise<NFTMetadata | null> => {
    const metadataUri = extractMetadataUri(nft);
    if (!metadataUri) return null;

    // Check cache first
    const cached = metadataCache.get(metadataUri);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Prevent duplicate requests
    if (metadataLoadingRef.current.has(metadataUri)) {
      return null;
    }

    metadataLoadingRef.current.add(metadataUri);

    try {
      const response = await fetch(metadataUri, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=300' // 5 minutes
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata: NFTMetadata = await response.json();
      
      // Cache the metadata
      metadataCache.set(metadataUri, {
        data: metadata,
        timestamp: Date.now()
      });

      return metadata;
    } catch (error) {
      console.warn(`Failed to load NFT metadata from ${metadataUri}:`, error);
      return null;
    } finally {
      metadataLoadingRef.current.delete(metadataUri);
    }
  }, [extractMetadataUri]);

  // Load metadata for all NFTs
  const loadAllMetadata = useCallback(async (): Promise<void> => {
    if (nfts.length === 0) return;

    setMetadataLoading(true);

    const promises = nfts.map(async (nft) => {
      if (!nft.metadata && !nft.metadataLoading) {
        const metadata = await loadMetadata(nft);
        return { nft, metadata };
      }
      return { nft, metadata: nft.metadata };
    });

    try {
      const results = await Promise.all(promises);
      
      setNfts(prevNfts => 
        prevNfts.map(nft => {
          const result = results.find(r => r.nft === nft);
          if (result && result.metadata && !nft.metadata) {
            return {
              ...nft,
              metadata: result.metadata,
              metadataLoading: false,
              metadataError: undefined
            };
          }
          return nft;
        })
      );
    } catch (error) {
      console.warn('Error loading metadata for NFTs:', error);
    } finally {
      setMetadataLoading(false);
    }
  }, [nfts, loadMetadata]);

  // Refresh NFT data
  const refresh = useCallback(async (): Promise<boolean> => {
    const client = getClient();
    if (!client) {
      setError('No client available');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const currentAddress = await getAddress();
      if (!currentAddress) {
        throw new Error('Wallet address not available');
      }

      let nftCoins: HydratedCoin[];

      // Use ChiaInsight client if available, otherwise use legacy client
      const insightClientInstance = getInsightClient();
      if (insightClientInstance && useInsightClient) {
        // Convert address to puzzle hash for ChiaInsight client
        const puzzleHashResult = ChiaCloudWalletClient.convertAddressToPuzzleHash(currentAddress);
        if (!puzzleHashResult.success) {
          throw new Error(`Failed to convert address to puzzle hash: ${puzzleHashResult.error}`);
        }

        const result = await insightClientInstance.getStandardFormatHydratedCoins(puzzleHashResult.data);
        if (!result.success) {
          throw new Error(result.error);
        }

        // Filter only NFTs
        nftCoins = result.data.filter(coin => 
          coin.parentSpendInfo?.driverInfo?.type === 'NFT'
        );
      } else {
        // Use legacy client
        const result = await client.getUnspentHydratedCoins(currentAddress);
        if (!result.success) {
          throw new Error(result.error);
        }

        // Filter only NFTs
        nftCoins = result.data.data.filter(coin => 
          coin.parentSpendInfo?.driverInfo?.type === 'NFT'
        );
      }

      // Transform to NFTWithMetadata format
      const nftsWithMetadata: NFTWithMetadata[] = nftCoins.map(coin => {
        // Check if we already have this NFT with metadata
        const existingNft = nfts.find(n => 
          n.coin.parentCoinInfo === coin.coin.parentCoinInfo &&
          n.coin.puzzleHash === coin.coin.puzzleHash
        );

        return {
          ...coin,
          metadata: existingNft?.metadata,
          metadataUri: extractMetadataUri(coin) || undefined,
          metadataLoading: existingNft?.metadataLoading || false,
          metadataError: existingNft?.metadataError
        };
      });

      setNfts(nftsWithMetadata);
      setLastUpdate(Date.now());
      setLoading(false);

      // Auto-load metadata if enabled
      if (autoLoadMetadata && nftsWithMetadata.length > 0) {
        setTimeout(() => loadAllMetadata(), 100);
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh NFTs';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [getClient, getAddress, nfts, extractMetadataUri, autoLoadMetadata, loadAllMetadata]);

  // Reset hook state
  const reset = useCallback(() => {
    setNfts([]);
    setError(null);
    setLastUpdate(0);
    setLoading(false);
    setMetadataLoading(false);
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    // Clear any pending metadata requests
    metadataLoadingRef.current.clear();
  }, []);

  // Get NFT by coin ID
  const getNFTById = useCallback((coinId: string): NFTWithMetadata | null => {
    return nfts.find(nft => {
      try {
        // Calculate coin ID if needed - simplified approach
        const parentInfo = nft.coin.parentCoinInfo;
        const puzzleHash = nft.coin.puzzleHash;
        const amount = nft.coin.amount;
        // This is a simplified check - in reality you'd need to calculate the actual coin ID
        return parentInfo.includes(coinId) || puzzleHash.includes(coinId);
      } catch {
        return false;
      }
    }) || null;
  }, [nfts]);

  // Get NFTs by collection
  const getNFTsByCollection = useCallback((collectionName: string): NFTWithMetadata[] => {
    return nfts.filter(nft => 
      nft.metadata?.collection?.name?.toLowerCase().includes(collectionName.toLowerCase()) ||
      nft.metadata?.collection?.family?.toLowerCase().includes(collectionName.toLowerCase())
    );
  }, [nfts]);

  // Search NFTs
  const searchNFTs = useCallback((query: string): NFTWithMetadata[] => {
    const searchTerm = query.toLowerCase();
    return nfts.filter(nft => 
      nft.metadata?.name?.toLowerCase().includes(searchTerm) ||
      nft.metadata?.description?.toLowerCase().includes(searchTerm) ||
      nft.metadata?.collection?.name?.toLowerCase().includes(searchTerm) ||
      nft.metadata?.attributes?.some(attr => 
        attr.trait_type.toLowerCase().includes(searchTerm) ||
        String(attr.value).toLowerCase().includes(searchTerm)
      )
    );
  }, [nfts]);

  // Setup auto refresh
  useEffect(() => {
    if (autoRefresh && !refreshIntervalRef.current) {
      refreshIntervalRef.current = window.setInterval(() => {
        refresh();
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Auto-refresh when dependencies change
  useEffect(() => {
    if (jwtToken || externalClient || externalAddress) {
      refresh();
    }
  }, [jwtToken, externalClient, externalAddress, refresh]);

  return {
    nfts,
    nftCount: nfts.length,
    loading,
    metadataLoading,
    error,
    lastUpdate,
    refresh,
    loadMetadata,
    loadAllMetadata,
    reset,
    getNFTById,
    getNFTsByCollection,
    searchNFTs
  };
}

// Hook specifically for NFT metadata management
export function useNFTMetadata(nftUri?: string) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetadata = useCallback(async (uri: string): Promise<NFTMetadata | null> => {
    if (!uri) return null;

    // Check cache first
    const cached = metadataCache.get(uri);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setMetadata(cached.data);
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(uri, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=300'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadataData: NFTMetadata = await response.json();
      
      // Cache the metadata
      metadataCache.set(uri, {
        data: metadataData,
        timestamp: Date.now()
      });

      setMetadata(metadataData);
      setLoading(false);
      return metadataData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load metadata';
      setError(message);
      setLoading(false);
      return null;
    }
  }, []);

  // Auto-load when URI is provided
  useEffect(() => {
    if (nftUri) {
      loadMetadata(nftUri);
    }
  }, [nftUri, loadMetadata]);

  return {
    metadata,
    loading,
    error,
    loadMetadata
  };
}

// Hook for NFT collections
export function useNFTCollections(config: UseNFTsConfig = {}) {
  const nftsResult = useNFTs(config);
  
  const collections = nftsResult.nfts.reduce((acc, nft) => {
    const collectionName = nft.metadata?.collection?.name || 'Unknown Collection';
    if (!acc[collectionName]) {
      acc[collectionName] = {
        name: collectionName,
        family: nft.metadata?.collection?.family,
        nfts: [],
        count: 0
      };
    }
    acc[collectionName].nfts.push(nft);
    acc[collectionName].count++;
    return acc;
  }, {} as Record<string, {
    name: string;
    family?: string;
    nfts: NFTWithMetadata[];
    count: number;
  }>);

  return {
    collections: Object.values(collections),
    collectionsMap: collections,
    totalCollections: Object.keys(collections).length,
    loading: nftsResult.loading,
    error: nftsResult.error,
    refresh: nftsResult.refresh,
    reset: nftsResult.reset
  };
} 