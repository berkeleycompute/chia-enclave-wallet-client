/**
 * IPFS utility functions for handling IPFS URLs and gateways
 * Uses backend authenticated gateway for IPFS content
 */

// IPFS Gateways in order of preference (will try each one until success)
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs',                              // Public, reliable
  'https://gateway.pinata.cloud/ipfs',                 // Pinata CDN
  'https://cloudflare-ipfs.com/ipfs',                  // Cloudflare
  'https://dweb.link/ipfs',                            // Protocol Labs
  'https://edgedev.silicon.net/v1/ipfs',               // Backend (requires auth)
];

// Default placeholder image (1x1 transparent PNG)
export const DEFAULT_NFT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Try to fetch image from multiple IPFS gateways with fallback
 * Returns a URL that can be used directly in <img> tags
 * - For public gateways: returns direct URL (browser caches automatically)
 * - For authenticated gateway: fetches with auth and returns blob URL
 * 
 * @param ipfsUri - The IPFS URI (ipfs://, https://gateway.../ipfs/, etc.)
 * @param authToken - Optional JWT token for authenticated gateways
 * @returns Image URL (direct or blob URL) or default placeholder if all fail
 * 
 * @example
 * const imageUrl = await fetchIPFSImageWithFallback('ipfs://bafybei...');
 * // Returns: 'https://ipfs.io/ipfs/bafybei...' or 'blob:http://...' for auth gateway
 */
export async function fetchIPFSImageWithFallback(
  ipfsUri: string,
  authToken?: string
): Promise<string> {
  console.log('🖼️ [fetchIPFSImage] Starting fetch for:', ipfsUri);
  
  // Extract CID
  const cid = extractIpfsCid(ipfsUri);
  if (!cid) {
    console.error('❌ [fetchIPFSImage] Could not extract CID from:', ipfsUri);
    return DEFAULT_NFT_IMAGE;
  }
  
  // Try each gateway in order
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const gateway = IPFS_GATEWAYS[i];
    const url = `${gateway}/${cid}`;
    
    console.log(`🔄 [fetchIPFSImage] Trying gateway ${i + 1}/${IPFS_GATEWAYS.length}:`, gateway);
    
    try {
      const isBackendGateway = gateway.includes('edgedev.silicon.net');
      
      // For backend gateway with auth: fetch with headers and create blob URL
      if (isBackendGateway && authToken) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn(`⚠️ [fetchIPFSImage] Backend gateway failed (${response.status})`);
          continue; // Try next gateway
        }
        
        const blob = await response.blob();
        
        // Check if it's an image
        if (!blob.type.startsWith('image/')) {
          console.warn(`⚠️ [fetchIPFSImage] Not an image (${blob.type})`);
          continue;
        }
        
        // Create blob URL
        const blobUrl = URL.createObjectURL(blob);
        console.log(`✅ [fetchIPFSImage] Success with backend gateway (blob URL)`);
        return blobUrl;
      }
      
      // For public gateways: just verify it's accessible and return the URL
      // The browser will cache it automatically (Cache-Control: max-age=29030400)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        method: 'HEAD', // Just check if it exists
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`⚠️ [fetchIPFSImage] Gateway failed (${response.status}):`, gateway);
        continue; // Try next gateway
      }
      
      // Check Content-Type if available
      const contentType = response.headers.get('Content-Type');
      if (contentType && !contentType.startsWith('image/')) {
        console.warn(`⚠️ [fetchIPFSImage] Not an image (${contentType}):`, gateway);
        continue;
      }
      
      console.log(`✅ [fetchIPFSImage] Success with gateway:`, gateway);
      return url; // Return direct URL - browser will cache it
      
    } catch (error) {
      console.warn(`⚠️ [fetchIPFSImage] Error with gateway:`, gateway, error);
      // Continue to next gateway
    }
  }
  
  // All gateways failed
  console.error('❌ [fetchIPFSImage] All gateways failed for:', cid);
  return DEFAULT_NFT_IMAGE;
}

/**
* Convert any IPFS URL format to a HTTP gateway URL
* Uses the backend authenticated gateway by default
* Supports:
* - ipfs://[CID]
* - ipfs://ipfs/[CID]
* - /ipfs/[CID]
* - https://ipfs.io/ipfs/[CID]
* - https://gateway.pinata.cloud/ipfs/[CID]
* - https://[any-gateway]/ipfs/[CID]
* - Raw CID (if > 40 chars)
* 
* @param url - The IPFS URL or CID to convert
* @param customGateway - Custom gateway URL to use (optional). If not provided, uses FALLBACK_GATEWAY
* @returns Full HTTP URL to the gateway
* 
* @example
* convertIpfsUrl('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
* // Returns: 'https://edgedev.silicon.net/v1/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
* 
* @example
* convertIpfsUrl('https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
* // Returns: 'https://edgedev.silicon.net/v1/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
*/
export function convertIpfsUrl(url?: string | null, customGateway?: string): string | undefined {
  if (!url) return undefined;
  
  // Extract CID first
  const cid = extractIpfsCid(url);
  
  // If we have a CID, build the gateway URL
  if (cid) {
    // Use first gateway from list as default
    const gateway = customGateway || IPFS_GATEWAYS[0];
    return `${gateway}/${cid}`;
  }
  
  // If it's already an HTTP URL and not IPFS, return as is
  if ((url.startsWith('http://') || url.startsWith('https://')) && !url.includes('/ipfs/')) {
    return url;
  }
  
  // Return original if we can't convert
  return url;
}

/**
 * Extract IPFS CID and full path from any URL format
 * Preserves subdirectories and file paths
 * @param url - URL to extract CID from
 * @returns The IPFS CID with path or null if not found
 * 
 * @example
 * extractIpfsCid('ipfs://bafybei.../folder/image.png')
 * // Returns: 'bafybei.../folder/image.png'
 * 
 * @example
 * extractIpfsCid('https://gateway.pinata.cloud/ipfs/bafybei.../metadata.json')
 * // Returns: 'bafybei.../metadata.json'
 */
export function extractIpfsCid(url?: string | null): string | null {
  if (!url) return null;
  
  // From ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    let hash = url.replace('ipfs://', '');
    if (hash.startsWith('ipfs/')) {
      hash = hash.replace('ipfs/', '');
    }
    // Return full path including subdirectories
    return hash;
  }
  
  // From HTTP gateway URL - extract everything after /ipfs/
  const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+(?:\/[^?#]*)?)/);
  if (ipfsMatch) {
    return ipfsMatch[1];
  }
  
  // Might already be a CID (without path)
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
 * @param customGateway - Optional custom gateway URL to use
 * @returns Array of HTTP URLs
 */
export function convertIpfsUrls(urls?: (string | null)[], customGateway?: string): string[] {
  if (!urls || urls.length === 0) return [];
  
  return urls
    .map(url => convertIpfsUrl(url, customGateway))
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

