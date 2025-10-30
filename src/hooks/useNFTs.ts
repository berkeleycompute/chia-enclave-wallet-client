import { useState, useEffect, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin } from '../client/ChiaCloudWalletClient';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';
import { useChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';
import { convertIpfsUrl as convertIpfs } from '../utils/ipfs';

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
  sdk?: ChiaWalletSDK; // Add SDK option
  address?: string | null;
  autoRefresh?: boolean;
  autoLoadMetadata?: boolean;
  refreshInterval?: number;
  baseUrl?: string;
  enableLogging?: boolean;
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
    sdk: externalSDK, // Extract SDK
    address: externalAddress,
    autoRefresh = false,
    autoLoadMetadata = true,
    refreshInterval = 120000, // 2 minutes for NFTs
    baseUrl,
    enableLogging = true
  } = config;

  // Try to get SDK from context if not provided
  const contextSDK = useChiaWalletSDK();
  
  // Use provided SDK or fall back to context SDK
  const effectiveSDK = externalSDK || contextSDK;

  // Internal client if none provided
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const metadataLoadingRef = useRef<Set<string>>(new Set());
  const metadataLoadedRef = useRef<Set<string>>(new Set()); // Track which NFTs have metadata loaded/loading
  const isLoadingAllMetadataRef = useRef<boolean>(false); // Prevent concurrent loadAllMetadata calls

  const [nfts, setNfts] = useState<NFTWithMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [address, setAddress] = useState<string | null>(externalAddress || null);

  // Get or create client
  const getClient = useCallback((): ChiaCloudWalletClient | null => {
    // Prefer SDK client if available
    if (effectiveSDK) return effectiveSDK.client;
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
  }, [externalClient, effectiveSDK, jwtToken, baseUrl, enableLogging]);

  // Get wallet address (SDK-aware)
  const getAddress = useCallback(async (): Promise<string | null> => {
    if (externalAddress) return externalAddress;
    if (address) return address;

    // If SDK is available, use its cached method
    if (effectiveSDK) {
      try {
        const result = await effectiveSDK.getWalletInfo();
        if (result.success) {
          setAddress(result.data.address);
          return result.data.address;
        }
      } catch (error) {
        console.warn('Failed to get wallet address from SDK for NFTs:', error);
      }
      return null;
    }

    // Fallback to direct client call
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
  }, [externalAddress, address, effectiveSDK, getClient]);

  // Extract metadata URI from NFT data
  const extractMetadataUri = useCallback((nft: HydratedCoin): string | null => {
    try {
      const driverInfo = nft.parentSpendInfo?.driverInfo;
      if (driverInfo?.type === 'NFT') {
        // First try to get from info.metadata.metadataUris (current API format)
        const metadata = driverInfo.info?.metadata as any;
        if (metadata?.metadataUris && Array.isArray(metadata.metadataUris) && metadata.metadataUris.length > 0) {
          return metadata.metadataUris[0];
        }
        
        // Fallback: try dataUris if metadataUris not available
        if (metadata?.dataUris && Array.isArray(metadata.dataUris) && metadata.dataUris.length > 0) {
          return metadata.dataUris[0];
        }
        
        // Fallback: try legacy format (also)
        const nftData = (driverInfo as any).also;
        if (nftData?.metadata_uris?.[0]) return nftData.metadata_uris[0];
        if (nftData?.data_uris?.[0]) return nftData.data_uris[0];
      }
    } catch (error) {
      console.warn('Error extracting metadata URI:', error);
    }
    return null;
  }, []);

  // Load metadata for a single NFT
  const loadMetadata = useCallback(async (nft: HydratedCoin): Promise<NFTMetadata | null> => {
    const metadataUri = extractMetadataUri(nft);
    if (!metadataUri) {
      if (enableLogging) {
        console.log('⚠️ No metadata URI found for NFT:', nft.coinId);
      }
      return null;
    }

    // Convert IPFS URLs to HTTP gateway using centralized utility
    const fetchUrl = convertIpfs(metadataUri) || metadataUri;

    // Check cache first
    const cached = metadataCache.get(fetchUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      if (enableLogging) {
        console.log('✅ Using cached metadata for:', fetchUrl);
      }
      return cached.data;
    }

    // Prevent duplicate requests
    if (metadataLoadingRef.current.has(fetchUrl)) {
      if (enableLogging) {
        console.log('⏳ Metadata already loading for:', fetchUrl);
      }
      return null;
    }

    metadataLoadingRef.current.add(fetchUrl);

    try {
      if (enableLogging) {
        console.log('📥 Fetching NFT metadata from:', fetchUrl);
      }

      // Configure fetch to properly handle redirects and timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow', // Explicitly follow redirects
        mode: 'cors', // Handle CORS properly
        cache: 'default', // Use browser caching
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, */*',
          'Cache-Control': 'max-age=300', // 5 minutes
          'User-Agent': 'Chia-Wallet-Client/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch metadata (${response.status} ${response.statusText}): ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      let metadata: NFTMetadata;

      if (contentType && contentType.includes('application/json')) {
        metadata = await response.json();
      } else {
        // Try to parse as JSON anyway, some servers don't set proper content-type
        const text = await response.text();
        try {
          metadata = JSON.parse(text);
        } catch {
          console.warn('Metadata response is not valid JSON:', text.substring(0, 200));
          throw new Error('Invalid JSON response');
        }
      }

      // Cache the metadata
      metadataCache.set(fetchUrl, {
        data: metadata,
        timestamp: Date.now()
      });

      if (enableLogging) {
        console.log('✅ Successfully loaded metadata:', { fetchUrl, metadata });
      }

      return metadata;
    } catch (error) {
      if (enableLogging) {
        console.warn(`❌ Failed to load NFT metadata from ${fetchUrl}:`, error);
      }
      return null;
    } finally {
      metadataLoadingRef.current.delete(fetchUrl);
    }
  }, [extractMetadataUri, enableLogging]);

  // Load metadata for all NFTs
  const loadAllMetadata = useCallback(async (): Promise<void> => {
    // Prevent concurrent calls
    if (isLoadingAllMetadataRef.current) {
      if (enableLogging) {
        console.log('🚫 loadAllMetadata already running, skipping');
      }
      return;
    }

    isLoadingAllMetadataRef.current = true;
    setMetadataLoading(true);

    try {
      // Use function form to get current state without dependency
      await new Promise<void>((resolve) => {
        setNfts(prevNfts => {
          if (prevNfts.length === 0) {
            resolve();
            return prevNfts;
          }

          // Filter NFTs that need metadata loaded
          const nftsNeedingMetadata = prevNfts.filter(nft => {
            const key = nft.coinId || `${nft.coin.parentCoinInfo}_${nft.coin.puzzleHash}`;
            return !nft.metadata && !metadataLoadedRef.current.has(key);
          });

          if (nftsNeedingMetadata.length === 0) {
            resolve();
            return prevNfts;
          }

          if (enableLogging) {
            console.log(`📥 Loading metadata for ${nftsNeedingMetadata.length} NFTs`);
          }

          // Load metadata for NFTs that need it
          Promise.all(
            nftsNeedingMetadata.map(async (nft) => {
              const key = nft.coinId || `${nft.coin.parentCoinInfo}_${nft.coin.puzzleHash}`;
              metadataLoadedRef.current.add(key);
              
              const metadata = await loadMetadata(nft);
              return { key, metadata };
            })
          ).then(results => {
            // Update NFTs with loaded metadata
            setNfts(currentNfts =>
              currentNfts.map(nft => {
                const key = nft.coinId || `${nft.coin.parentCoinInfo}_${nft.coin.puzzleHash}`;
                const result = results.find(r => r.key === key);
                
                if (result?.metadata && !nft.metadata) {
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
            resolve();
          }).catch(error => {
            console.warn('Error loading metadata for NFTs:', error);
            resolve();
          });

          return prevNfts;
        });
      });
    } finally {
      setMetadataLoading(false);
      isLoadingAllMetadataRef.current = false;
    }
  }, [loadMetadata, enableLogging]);

  // Refresh NFT data
  const refresh = useCallback(async (): Promise<boolean> => {
    // Rate limiting: prevent calls more frequent than 1 second
    const now = Date.now();
    if (now - lastUpdate < 1000) {
      console.log('🚫 useNFTs: Refresh rate limited, skipping call');
      return false;
    }

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

      const result = await client.getUnspentHydratedCoins(currentAddress);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Filter only NFTs - result.data is directly the array of HydratedCoin[]
      const nftCoins = result.data.data.filter((coin: HydratedCoin) =>
        coin.parentSpendInfo?.driverInfo?.type === 'NFT'
      );

      // Transform to NFTWithMetadata format - use function form to avoid nfts dependency
      setNfts(prevNfts => {
        const nftsWithMetadata: NFTWithMetadata[] = nftCoins.map(coin => {
          // Check if we already have this NFT with metadata
          const existingNft = prevNfts.find(n =>
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

        // Auto-load metadata if enabled - only if we have new NFTs without metadata
        if (autoLoadMetadata && nftsWithMetadata.length > 0) {
          const hasUnloadedMetadata = nftsWithMetadata.some(nft => {
            const key = nft.coinId || `${nft.coin.parentCoinInfo}_${nft.coin.puzzleHash}`;
            return !nft.metadata && !metadataLoadedRef.current.has(key);
          });
          
          if (hasUnloadedMetadata && !isLoadingAllMetadataRef.current) {
            setTimeout(() => loadAllMetadata(), 100);
          }
        }

        return nftsWithMetadata;
      });

      setLastUpdate(Date.now());
      setLoading(false);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh NFTs';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [getClient, getAddress, extractMetadataUri, autoLoadMetadata, loadAllMetadata]);

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

    // Clear any pending metadata requests and tracking
    metadataLoadingRef.current.clear();
    metadataLoadedRef.current.clear();
    isLoadingAllMetadataRef.current = false;
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
  }, [autoRefresh, refreshInterval]);

  // Auto-refresh when dependencies change - only once on mount or when SDK/auth changes
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if ((effectiveSDK || jwtToken || externalClient || externalAddress) && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      refresh();
    }
  }, [effectiveSDK, jwtToken, externalClient, externalAddress]);

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
      console.log('🔄 Attempting to fetch metadata from:', uri);

      // Convert IPFS URLs to HTTP gateway URLs using centralized utility
      const fetchUrl = convertIpfs(uri) || uri;
      if (uri !== fetchUrl) {
        console.log('🔄 Converted IPFS URL to:', fetchUrl);
      }

      // Configure fetch similar to RTK Query's fetchBaseQuery
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'application/json, */*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch metadata (${response.status} ${response.statusText}): ${errorText}`);
      }

      console.log('✅ Successfully fetched metadata from:', fetchUrl);

      const contentType = response.headers.get('content-type');
      let metadataData: NFTMetadata;

      if (contentType && contentType.includes('application/json')) {
        metadataData = await response.json();
      } else {
        // Try to parse as JSON anyway, some servers don't set proper content-type
        const text = await response.text();
        try {
          metadataData = JSON.parse(text);
        } catch {
          console.warn('Metadata response is not valid JSON:', text.substring(0, 200));
          throw new Error('Invalid JSON response');
        }
      }

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