import { useState, useEffect, useCallback, useRef } from 'react';
import { ChiaCloudWalletClient, type PublicKeyResponse } from '../client/ChiaCloudWalletClient';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';
import { bech32m } from 'bech32';

// Wallet information interface
export interface WalletInfo {
  address: string;
  syntheticPublicKey: string; // Only used for offers
  masterPublicKey: string;
  puzzleHash: string;
  email?: string;
  userId?: string;
}

// Address validation result
export interface AddressValidation {
  isValid: boolean;
  error?: string;
  type?: 'xch' | 'testnet' | 'unknown';
  puzzleHash?: string;
}

// Hook configurations
export interface UseWalletInfoConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  sdk?: ChiaWalletSDK; // Add SDK option
  baseUrl?: string;
  enableLogging?: boolean;
  autoFetch?: boolean;
}

export interface UseAddressValidationConfig {
  enablePuzzleHashConversion?: boolean;
  supportTestnet?: boolean;
}

// Hook results
export interface UseWalletInfoResult {
  walletInfo: WalletInfo | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchWalletInfo: () => Promise<WalletInfo | null>;
  reset: () => void;

  // Utilities
  formatAddress: (address?: string) => string;
  getAddressPrefix: () => string;
  isValidAddress: (address: string) => boolean;
}

export interface UseAddressValidationResult {
  // Validation functions
  validateAddress: (address: string) => AddressValidation;
  validateMultipleAddresses: (addresses: string[]) => AddressValidation[];

  // Conversion utilities
  addressToPuzzleHash: (address: string) => string | null;
  puzzleHashToAddress: (puzzleHash: string) => string | null;

  // Address utilities
  formatAddress: (address: string, length?: number) => string;
  normalizeAddress: (address: string) => string;
  getAddressType: (address: string) => 'xch' | 'testnet' | 'unknown';
}

// Main wallet info hook
export function useWalletInfo(config: UseWalletInfoConfig = {}): UseWalletInfoResult {
  const {
    jwtToken,
    client: externalClient,
    sdk: externalSDK, // Extract SDK
    baseUrl,
    enableLogging = true,
    autoFetch = true
  } = config;

  const internalClient = useRef<ChiaCloudWalletClient | null>(null);

  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get or create client
  const getClient = useCallback((): ChiaCloudWalletClient | null => {
    // Prefer SDK client if available
    if (externalSDK) return externalSDK.client;
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
  }, [externalClient, externalSDK, jwtToken, baseUrl, enableLogging]);

  // Fetch wallet information (SDK-aware)
  const fetchWalletInfo = useCallback(async (): Promise<WalletInfo | null> => {
    setLoading(true);
    setError(null);

    try {
      let result;

      // If SDK is available, use its cached method
      if (externalSDK) {
        result = await externalSDK.getWalletInfo();
      } else {
        // Fallback to direct client call
        const client = getClient();
        if (!client) {
          setError('No client available');
          return null;
        }
        result = await client.getPublicKey();
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      const info: WalletInfo = {
        address: result.data.address,
        syntheticPublicKey: result.data.synthetic_public_key,
        masterPublicKey: result.data.master_public_key,
        puzzleHash: result.data.puzzle_hash,
        email: result.data.email,
        userId: result.data.user_id
      };

      setWalletInfo(info);
      setLoading(false);
      return info;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch wallet info';
      setError(message);
      setLoading(false);
      return null;
    }
  }, [externalSDK, getClient]);

  // Reset hook state
  const reset = useCallback(() => {
    setWalletInfo(null);
    setError(null);
    setLoading(false);
  }, []);

  // Format address utility
  const formatAddress = useCallback((address?: string): string => {
    const addr = address || walletInfo?.address || '';
    if (!addr) return '';

    if (addr.length <= 20) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-10)}`;
  }, [walletInfo?.address]);

  // Get address prefix
  const getAddressPrefix = useCallback((): string => {
    if (!walletInfo?.address) return '';

    try {
      const decoded = bech32m.decode(walletInfo.address);
      return decoded.prefix;
    } catch {
      return '';
    }
  }, [walletInfo?.address]);

  // Simple address validation
  const isValidAddress = useCallback((address: string): boolean => {
    try {
      const decoded = bech32m.decode(address);
      return decoded.prefix === 'xch' && decoded.words.length === 52;
    } catch {
      return false;
    }
  }, []);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (autoFetch && (jwtToken || externalClient)) {
      fetchWalletInfo();
    }
  }, [autoFetch, jwtToken, externalClient, fetchWalletInfo]);

  return {
    walletInfo,
    loading,
    error,
    fetchWalletInfo,
    reset,
    formatAddress,
    getAddressPrefix,
    isValidAddress
  };
}

// Address validation hook
export function useAddressValidation(config: UseAddressValidationConfig = {}): UseAddressValidationResult {
  const {
    enablePuzzleHashConversion = true,
    supportTestnet = false
  } = config;

  // Main address validation function
  const validateAddress = useCallback((address: string): AddressValidation => {
    try {
      if (!address || typeof address !== 'string') {
        return {
          isValid: false,
          error: 'Address must be a non-empty string'
        };
      }

      // Trim whitespace
      const cleanAddress = address.trim();

      if (!cleanAddress) {
        return {
          isValid: false,
          error: 'Address cannot be empty'
        };
      }

      const decoded = bech32m.decode(cleanAddress);

      // Check prefix
      let type: 'xch' | 'testnet' | 'unknown' = 'unknown';
      if (decoded.prefix === 'xch') {
        type = 'xch';
      } else if (decoded.prefix === 'txch' && supportTestnet) {
        type = 'testnet';
      } else if (decoded.prefix === 'txch' && !supportTestnet) {
        return {
          isValid: false,
          error: 'Testnet addresses are not supported'
        };
      } else {
        return {
          isValid: false,
          error: `Invalid address prefix: "${decoded.prefix}". Expected "xch"${supportTestnet ? ' or "txch"' : ''}`
        };
      }

      // Check data length
      if (decoded.words.length !== 52) {
        return {
          isValid: false,
          error: `Invalid address data length: expected 52 words, got ${decoded.words.length}`
        };
      }

      // Convert to puzzle hash if enabled
      let puzzleHash: string | undefined;
      if (enablePuzzleHashConversion) {
        try {
          const bytes = bech32m.fromWords(decoded.words);
          puzzleHash = Array.from(bytes)
            .map(b => {
              const hex = b.toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            })
            .join('');
        } catch (err) {
          return {
            isValid: false,
            error: 'Failed to convert address to puzzle hash'
          };
        }
      }

      return {
        isValid: true,
        type,
        puzzleHash
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? `Invalid address format: ${error.message}` : 'Invalid address format'
      };
    }
  }, [enablePuzzleHashConversion, supportTestnet]);

  // Validate multiple addresses
  const validateMultipleAddresses = useCallback((addresses: string[]): AddressValidation[] => {
    return addresses.map(validateAddress);
  }, [validateAddress]);

  // Convert address to puzzle hash
  const addressToPuzzleHash = useCallback((address: string): string | null => {
    const validation = validateAddress(address);
    return validation.isValid ? validation.puzzleHash || null : null;
  }, [validateAddress]);

  // Convert puzzle hash to address
  const puzzleHashToAddress = useCallback((puzzleHash: string): string | null => {
    try {
      if (!puzzleHash || puzzleHash.length !== 64) {
        return null;
      }

      // Convert hex string to bytes
      const bytes: number[] = [];
      for (let i = 0; i < puzzleHash.length; i += 2) {
        bytes.push(parseInt(puzzleHash.substr(i, 2), 16));
      }

      // Convert to 5-bit words
      const words = bech32m.toWords(bytes);

      // Encode as bech32m address
      const address = bech32m.encode('xch', words);

      return address;
    } catch (error) {
      console.warn('Failed to convert puzzle hash to address:', error);
      return null;
    }
  }, []);

  // Format address for display
  const formatAddress = useCallback((address: string, length = 10): string => {
    if (!address || address.length <= length * 2) {
      return address;
    }

    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }, []);

  // Normalize address (trim and validate format)
  const normalizeAddress = useCallback((address: string): string => {
    try {
      const trimmed = address.trim();
      const validation = validateAddress(trimmed);

      if (validation.isValid) {
        // Re-encode to ensure consistent formatting
        const decoded = bech32m.decode(trimmed);
        return bech32m.encode(decoded.prefix, decoded.words);
      }

      return trimmed; // Return as-is if invalid
    } catch {
      return address.trim();
    }
  }, [validateAddress]);

  // Get address type
  const getAddressType = useCallback((address: string): 'xch' | 'testnet' | 'unknown' => {
    const validation = validateAddress(address);
    return validation.type || 'unknown';
  }, [validateAddress]);

  return {
    validateAddress,
    validateMultipleAddresses,
    addressToPuzzleHash,
    puzzleHashToAddress,
    formatAddress,
    normalizeAddress,
    getAddressType
  };
}

// Hook for mnemonic management
export function useMnemonic(config: UseWalletInfoConfig = {}) {
  const {
    jwtToken,
    client: externalClient,
    baseUrl,
    enableLogging = true
  } = config;

  const internalClient = useRef<ChiaCloudWalletClient | null>(null);

  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Export mnemonic
  const exportMnemonic = useCallback(async (): Promise<string | null> => {
    const client = getClient();
    if (!client) {
      setError('No client available');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await client.exportMnemonic();
      if (!result.success) {
        throw new Error(result.error);
      }

      const mnemonicPhrase = result.data.mnemonic;
      setMnemonic(mnemonicPhrase);
      setLoading(false);
      return mnemonicPhrase;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export mnemonic';
      setError(message);
      setLoading(false);
      return null;
    }
  }, [getClient]);

  // Clear mnemonic from memory
  const clearMnemonic = useCallback(() => {
    setMnemonic(null);
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setMnemonic(null);
    setError(null);
    setLoading(false);
  }, []);

  // Validate mnemonic format (basic validation)
  const validateMnemonic = useCallback((phrase: string): { isValid: boolean; error?: string } => {
    if (!phrase || typeof phrase !== 'string') {
      return { isValid: false, error: 'Mnemonic must be a non-empty string' };
    }

    const words = phrase.trim().split(/\s+/);

    if (words.length !== 12 && words.length !== 24) {
      return {
        isValid: false,
        error: `Invalid mnemonic length: expected 12 or 24 words, got ${words.length}`
      };
    }

    // Basic word validation (should contain only alphabetic characters)
    const invalidWords = words.filter(word => !/^[a-z]+$/i.test(word));
    if (invalidWords.length > 0) {
      return {
        isValid: false,
        error: `Invalid words in mnemonic: ${invalidWords.join(', ')}`
      };
    }

    return { isValid: true };
  }, []);

  return {
    mnemonic,
    loading,
    error,
    exportMnemonic,
    clearMnemonic,
    reset,
    validateMnemonic
  };
} 