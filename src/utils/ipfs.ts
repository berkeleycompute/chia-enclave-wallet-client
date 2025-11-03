/**
 * IPFS utility functions for handling IPFS URLs and gateways
 * Uses Pinata gateway for better performance and reliability
 */

// Pinata gateway - más rápido y confiable que ipfs.io
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// Fallback gateway si Pinata falla
const FALLBACK_GATEWAY = 'https://edgedev.silicon.net/v1/ipfs';

/**
 * Convert any IPFS URL format to a HTTP gateway URL using Pinata
 * Supports:
 * - ipfs://[CID]
 * - ipfs://ipfs/[CID]
 * - /ipfs/[CID]
 * - https://ipfs.io/ipfs/[CID] (converts to Pinata)
 * - https://[any-gateway]/ipfs/[CID] (converts to Pinata)
 * - Raw CID (if > 40 chars)
 * 
 * @param url - The IPFS URL or CID to convert
 * @param useFallback - Use fallback gateway instead of Pinata (default: false)
 * @returns HTTP URL using Pinata gateway (or original URL if not IPFS)
 * 
 * @example
 * convertIpfsUrl('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
 * // Returns: 'https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
 * 
 * @example
 * convertIpfsUrl('https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
 * // Returns: 'https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
 */
export function convertIpfsUrl(url?: string | null, useFallback: boolean = false): string | undefined {
  if (!url) return undefined;
  
  const gateway = useFallback ? FALLBACK_GATEWAY : PINATA_GATEWAY;
  
  // Check if it's already an HTTP URL pointing to an IPFS gateway
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Extract CID from common IPFS gateway patterns and convert to our gateway
    const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+(?:\/[^?#]*)?)/);
    if (ipfsMatch) {
      // Convert from any IPFS gateway to our preferred gateway
      return `${gateway}/${ipfsMatch[1]}`;
    }
    // Not an IPFS gateway URL, return as is
    return url;
  }
  
  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    // Remove ipfs:// and potential /ipfs/ prefix
    let hash = url.replace('ipfs://', '');
    if (hash.startsWith('ipfs/')) {
      hash = hash.replace('ipfs/', '');
    }
    return `${gateway}/${hash}`;
  }
  
  // Handle /ipfs/[CID] format
  if (url.startsWith('/ipfs/')) {
    const hash = url.replace('/ipfs/', '');
    return `${gateway}/${hash}`;
  }
  
  // Handle raw CID (must be > 40 chars to be valid)
  if (url.length > 40 && !url.includes('/') && !url.includes(':')) {
    return `${gateway}/${url}`;
  }
  
  // Return original if we can't convert
  return url;
}

/**
 * Extract IPFS CID from any URL format
 * @param url - URL to extract CID from
 * @returns The IPFS CID or null if not found
 * 
 * @example
 * extractIpfsCid('ipfs://bafybei...')
 * // Returns: 'bafybei...'
 */
export function extractIpfsCid(url?: string | null): string | null {
  if (!url) return null;
  
  // From ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    let hash = url.replace('ipfs://', '');
    if (hash.startsWith('ipfs/')) {
      hash = hash.replace('ipfs/', '');
    }
    return hash.split('/')[0]; // Get first part before any path
  }
  
  // From HTTP gateway URL
  const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (ipfsMatch) {
    return ipfsMatch[1];
  }
  
  // Might already be a CID
  if (url.length > 40 && !url.includes('/') && !url.includes(':')) {
    return url;
  }
  
  return null;
}

/**
 * Check if a URL is an IPFS URL
 * @param url - URL to check
 * @returns True if it's an IPFS URL
 */
export function isIpfsUrl(url?: string | null): boolean {
  if (!url) return false;
  
  return (
    url.startsWith('ipfs://') ||
    url.includes('/ipfs/') ||
    (url.length > 40 && !url.includes('/') && !url.includes(':') && !url.startsWith('http'))
  );
}

/**
 * Convert array of IPFS URLs to HTTP URLs
 * @param urls - Array of URLs to convert
 * @param useFallback - Use fallback gateway
 * @returns Array of HTTP URLs
 */
export function convertIpfsUrls(urls?: (string | null)[], useFallback: boolean = false): string[] {
  if (!urls || urls.length === 0) return [];
  
  return urls
    .map(url => convertIpfsUrl(url, useFallback))
    .filter((url): url is string => url !== undefined);
}

/**
 * Get the best image URL from multiple sources
 * Prioritizes non-IPFS URLs for performance
 * @param urls - Array of possible image URLs
 * @returns The best URL to use
 */
export function getBestImageUrl(urls?: (string | null)[]): string | undefined {
  if (!urls || urls.length === 0) return undefined;
  
  // Filter out null/undefined
  const validUrls = urls.filter((url): url is string => !!url);
  
  // Prioritize HTTP URLs (faster than IPFS)
  const httpUrl = validUrls.find(url => 
    url.startsWith('http://') || url.startsWith('https://')
  );
  if (httpUrl && !httpUrl.includes('ipfs')) {
    return httpUrl;
  }
  
  // Use first IPFS URL if available
  const ipfsUrl = validUrls.find(url => isIpfsUrl(url));
  if (ipfsUrl) {
    return convertIpfsUrl(ipfsUrl);
  }
  
  // Return first valid URL
  return validUrls[0];
}

