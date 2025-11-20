import { useState, useEffect, useCallback } from 'react';
import { useDexieTokens } from './useChiaWalletSDK';

export interface CATMetadata {
  id: string; // Asset ID
  code: string; // Ticker symbol (e.g., "wUSDC", "DBX")
  name: string; // Full name
  icon?: string; // Icon URL
  denom?: number; // Denomination
}

export interface CATMetadataMap {
  [assetId: string]: CATMetadata;
}

interface UseCATMetadataResult {
  metadata: CATMetadataMap;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getCATInfo: (assetId: string) => CATMetadata | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fallback database with most common tokens
const FALLBACK_TOKENS: CATMetadata[] = [
  {"id":"a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913","name":"Spacebucks","code":"SBX","denom":1000,"icon":"https://icons.dexie.space/a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913.webp"},
  {"id":"db1a9020d48d9d4ad22631b66ab4b9ebd3637ef7758ad38881348c5d24c38f20","name":"dexie bucks","code":"DBX","denom":1000,"icon":"https://icons.dexie.space/db1a9020d48d9d4ad22631b66ab4b9ebd3637ef7758ad38881348c5d24c38f20.webp"},
  {"id":"fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d","name":"Base warp.green USDC","code":"wUSDC.b","denom":1000,"icon":"https://icons.dexie.space/fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d.webp"},
  {"id":"bbb51b246fbec1da1305be31dcf17151ccd0b8231a1ec306d7ce9f5b8c742b9e","name":"Ethereum warp.green USDC","code":"wUSDC","denom":1000,"icon":"https://icons.dexie.space/bbb51b246fbec1da1305be31dcf17151ccd0b8231a1ec306d7ce9f5b8c742b9e.webp"},
  {"id":"8ebf855de6eb146db5602f0456d2f0cbe750d57f821b6f91a8592ee9f1d4cf31","name":"Marmot Coin","code":"MRMT","denom":1000,"icon":"https://icons.dexie.space/8ebf855de6eb146db5602f0456d2f0cbe750d57f821b6f91a8592ee9f1d4cf31.webp"},
  {"id":"ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d","name":"BEPE","code":"BEPE","denom":1000,"icon":"https://icons.dexie.space/ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d.webp"},
  {"id":"e0005928763a7253a9c443d76837bdfab312382fc47cab85dad00be23ae4e82f","name":"Moonbucks","code":"MBX","denom":1000,"icon":"https://icons.dexie.space/e0005928763a7253a9c443d76837bdfab312382fc47cab85dad00be23ae4e82f.webp"},
  {"id":"509deafe3cd8bbfbb9ccce1d930e3d7b57b40c964fa33379b18d628175eb7a8f","name":"Chia Holiday 2021","code":"CH21","denom":1000,"icon":"https://icons.dexie.space/509deafe3cd8bbfbb9ccce1d930e3d7b57b40c964fa33379b18d628175eb7a8f.webp"},
  {"id":"634f9f0de1a6c39a2189948b8e61b6852fbf774f73b0e36e143e841c49a0798c","name":"Ethereum warp.green USDT","code":"wUSDT","denom":1000,"icon":"https://icons.dexie.space/634f9f0de1a6c39a2189948b8e61b6852fbf774f73b0e36e143e841c49a0798c.webp"}
];

// Build fallback metadata map
const FALLBACK_METADATA: CATMetadataMap = {};
for (const token of FALLBACK_TOKENS) {
  FALLBACK_METADATA[token.id] = token;
}

// Global cache to share across hook instances
let globalMetadataCache: { data: CATMetadataMap; timestamp: number } | null = null;

export function useCATMetadata(): UseCATMetadataResult {
  const [metadata, setMetadata] = useState<CATMetadataMap>(globalMetadataCache?.data || FALLBACK_METADATA);
  const { tokens, loading, error, refresh } = useDexieTokens();

  const buildMetadataMap = useCallback((list: any[]): CATMetadataMap => {
    const metadataMap: CATMetadataMap = {};
    for (const token of list || []) {
      if (token?.id) {
        metadataMap[token.id] = {
          id: token.id,
          code: token.code || 'CAT',
          name: token.name || 'Unknown CAT',
          icon: token.icon,
          denom: token.denom || 1000
        };
      }
    }
    return metadataMap;
  }, []);

  // Get CAT info by asset ID
  const getCATInfo = useCallback((assetId: string): CATMetadata | null => {
    return metadata[assetId] || null;
  }, [metadata]);

  // Update metadata when tokens arrive or cache is stale
  useEffect(() => {
    const now = Date.now();
    const cacheStale = !globalMetadataCache || (now - globalMetadataCache.timestamp) > CACHE_DURATION;
    if (Array.isArray(tokens) && tokens.length > 0 && (cacheStale || metadata === FALLBACK_METADATA)) {
      const mapped = buildMetadataMap(tokens);
      globalMetadataCache = { data: mapped, timestamp: now };
      setMetadata(mapped);
      console.log(`✅ Loaded ${Object.keys(mapped).length} CATs from backend tokens`);
    }
  }, [tokens, buildMetadataMap, metadata]);

  return {
    metadata,
    loading,
    error,
    refresh: async () => { await refresh(); },
    getCATInfo
  };
}

// Utility function to generate a color-coded icon background based on asset ID
export function getAssetColorFromId(assetId: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];
  
  // Use first few characters of asset ID to generate consistent color
  const hash = assetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Utility to get initials from CAT code for icon display
export function getCATInitials(code: string): string {
  if (!code) return 'C';
  // Take first 2-3 characters for display
  return code.substring(0, Math.min(3, code.length)).toUpperCase();
}

