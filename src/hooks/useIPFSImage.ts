import { useState, useEffect } from 'react';
import { fetchIPFSImageWithFallback, DEFAULT_NFT_IMAGE } from '../utils/ipfs';

export interface UseIPFSImageOptions {
  /**
   * JWT token for authenticated gateways
   */
  authToken?: string;
  
  /**
   * Skip loading if uri is empty
   */
  enabled?: boolean;
}

export interface UseIPFSImageResult {
  /**
   * Image URL (direct URL for public gateways, blob URL for authenticated gateway, or default placeholder)
   * Can be used directly in <img src={imageUrl} />
   * Browser automatically caches images from public gateways (Cache-Control: max-age=29030400)
   */
  imageUrl: string;
  
  /**
   * Whether the image is currently loading
   */
  loading: boolean;
  
  /**
   * Error message if loading failed
   */
  error: string | null;
  
  /**
   * Whether the default placeholder is being shown
   */
  isDefault: boolean;
}

/**
 * Hook to load IPFS images with automatic fallback to multiple gateways
 * - Public gateways: returns direct URL (browser caches automatically)
 * - Authenticated gateway: returns blob URL
 * - All gateways failed: returns default placeholder
 * 
 * @param ipfsUri - The IPFS URI (ipfs://, https://gateway.../ipfs/, etc.)
 * @param options - Options for loading (authToken for authenticated gateway)
 * @returns Image state with URL ready for <img> tag
 * 
 * @example
 * ```tsx
 * const { imageUrl, loading, isDefault } = useIPFSImage('ipfs://bafybei...', { authToken });
 * 
 * return (
 *   <img 
 *     src={imageUrl} 
 *     alt="NFT"
 *     style={{ opacity: loading ? 0.5 : 1 }}
 *   />
 * );
 * ```
 */
export function useIPFSImage(
  ipfsUri?: string | null,
  options: UseIPFSImageOptions = {}
): UseIPFSImageResult {
  const { authToken, enabled = true } = options;
  
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_NFT_IMAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    // Skip if disabled or no URI
    if (!enabled || !ipfsUri) {
      setImageUrl(DEFAULT_NFT_IMAGE);
      setIsDefault(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = await fetchIPFSImageWithFallback(ipfsUri, authToken);
        
        if (!cancelled) {
          setImageUrl(url);
          setIsDefault(url === DEFAULT_NFT_IMAGE);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
          setError(errorMessage);
          setImageUrl(DEFAULT_NFT_IMAGE);
          setIsDefault(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [ipfsUri, authToken, enabled]);

  return {
    imageUrl,
    loading,
    error,
    isDefault
  };
}

