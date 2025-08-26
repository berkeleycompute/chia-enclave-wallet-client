import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChiaCloudWalletClient,
  type MintNFTRequest,
  type MintNFTResponse,
  type NFTMintMetadata,
  type NFTMint,
  type MintCoinInput,
  type Coin,
  type BroadcastResponse
} from '../client/ChiaCloudWalletClient';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';

// Simplified mint configuration for easier usage
export interface SimpleMintConfig {
  // NFT metadata
  editionNumber?: number;
  editionTotal?: number;
  dataUris: string[];
  dataHash: string;
  metadataUris: string[];
  metadataHash: string;
  licenseUris?: string[];
  licenseHash: string;

  // Minting options  
  recipientAddress?: string; // Will convert to puzzle hash
  royaltyAddress?: string | null; // Will convert to puzzle hash if provided
  royaltyPercentage?: number; // 0-100, will convert to basis points

  // Transaction options
  selectedCoins?: MintCoinInput[];
  feeXCH?: number; // Fee in XCH, will convert to mojos
  didId?: string | null;

  // Advanced options
  mnemonicWords?: string; // Alternative to using synthetic_public_key
  mnemonicPassphrase?: string; // Optional passphrase for mnemonic
  lastSpendableCoinId?: string; // Optional coin ID for lineage optimization
}

// Mint transaction record for tracking
export interface MintTransactionRecord {
  id: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  transactionId?: string;
  mintConfig: SimpleMintConfig;
  error?: string;
  blockchainStatus?: string;
}

// Hook configuration
export interface UseMintNFTConfig {
  jwtToken?: string | null;
  client?: ChiaCloudWalletClient;
  sdk?: ChiaWalletSDK;
  address?: string | null;
  baseUrl?: string;
  enableLogging?: boolean;
  autoSave?: boolean; // Save mint records to localStorage
  onMintStart?: (mintId: string) => void;
  onMintSuccess?: (mintId: string, transactionId: string) => void;
  onMintError?: (mintId: string, error: string) => void;
}

// Hook result interface
export interface UseMintNFTResult {
  // State
  isMinting: boolean;
  mintError: string | null;
  lastMintId: string | null;
  lastTransactionId: string | null;
  mintHistory: MintTransactionRecord[];

  // Actions
  mintNFT: (config: SimpleMintConfig) => Promise<{ success: boolean; mintId?: string; transactionId?: string; nftId?: string; error?: string }>;
  mintAndBroadcast: (config: SimpleMintConfig) => Promise<{ success: boolean; mintId?: string; transactionId?: string; nftId?: string; error?: string }>;
  cancelMint: () => void;
  reset: () => void;

  // Validation
  validateMintConfig: (config: SimpleMintConfig) => { isValid: boolean; error?: string };
  estimateMintFee: () => number; // Returns fee in mojos

  // History management
  getMintById: (mintId: string) => MintTransactionRecord | null;
  getPendingMints: () => MintTransactionRecord[];
  clearMintHistory: () => void;

  // Utilities
  convertAddressToPuzzleHash: (address: string) => { success: boolean; puzzleHash?: string; error?: string };
  createMintMetadata: (config: SimpleMintConfig) => NFTMintMetadata;
}

// Storage key for mint history
const MINT_HISTORY_STORAGE_KEY = 'chia_mint_nft_history';

// Utility functions
function generateMintId(): string {
  return `mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatXCHToMojos(xchAmount: number): number {
  const result = ChiaCloudWalletClient.xchToMojos(xchAmount);
  return result.success ? parseInt(result.data) : 1000000; // Default 0.000001 XCH
}

// Main hook
export function useMintNFT(config: UseMintNFTConfig = {}): UseMintNFTResult {
  const {
    jwtToken,
    client: externalClient,
    sdk: externalSDK,
    address: externalAddress,
    baseUrl,
    enableLogging = true,
    autoSave = true,
    onMintStart,
    onMintSuccess,
    onMintError
  } = config;

  // Internal client reference
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);

  // State
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [lastMintId, setLastMintId] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [mintHistory, setMintHistory] = useState<MintTransactionRecord[]>([]);

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

  // Get wallet address (SDK-aware)
  const getAddress = useCallback(async (): Promise<string | null> => {
    if (externalAddress) return externalAddress;

    // If SDK is available, use its cached method
    if (externalSDK) {
      try {
        const result = await externalSDK.getWalletInfo();
        if (result.success) {
          return result.data.address;
        }
      } catch (error) {
        console.warn('Failed to get wallet address from SDK for minting:', error);
      }
      return null;
    }

    // Fallback to direct client call
    const client = getClient();
    if (!client) return null;

    try {
      const result = await client.getPublicKey();
      if (result.success) {
        return result.data.address;
      }
    } catch (error) {
      console.warn('Failed to get wallet address for minting:', error);
    }

    return null;
  }, [externalAddress, externalSDK, getClient]);

  // Get synthetic public key
  const getSyntheticPublicKey = useCallback(async (): Promise<string | null> => {
    // If SDK is available, use its cached method
    if (externalSDK) {
      try {
        const result = await externalSDK.getWalletInfo();
        if (result.success) {
          return result.data.synthetic_public_key;
        }
      } catch (error) {
        console.warn('Failed to get synthetic public key from SDK for minting:', error);
      }
      return null;
    }

    // Fallback to direct client call
    const client = getClient();
    if (!client) return null;

    try {
      const result = await client.getPublicKey();
      if (result.success) {
        return result.data.synthetic_public_key;
      }
    } catch (error) {
      console.warn('Failed to get synthetic public key for minting:', error);
    }

    return null;
  }, [externalSDK, getClient]);

  // Load mint history from storage
  const loadMintHistory = useCallback(() => {
    if (!autoSave) return;

    try {
      const stored = localStorage.getItem(MINT_HISTORY_STORAGE_KEY);
      if (stored) {
        const parsedHistory: MintTransactionRecord[] = JSON.parse(stored);

        // Filter out old mints (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentMints = parsedHistory
          .filter(mint => mint.timestamp > thirtyDaysAgo)
          .slice(0, 100); // Limit to 100 recent mints

        setMintHistory(recentMints);
      }
    } catch (err) {
      console.error('Failed to load mint history:', err);
    }
  }, [autoSave]);

  // Save mint history to storage
  const saveMintHistory = useCallback((history: MintTransactionRecord[]) => {
    if (!autoSave) return;

    try {
      localStorage.setItem(MINT_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save mint history:', err);
    }
  }, [autoSave]);

  // Convert address to puzzle hash
  const convertAddressToPuzzleHash = useCallback((address: string): { success: boolean; puzzleHash?: string; error?: string } => {
    const result = ChiaCloudWalletClient.convertAddressToPuzzleHash(address);
    return {
      success: result.success,
      puzzleHash: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error
    };
  }, []);

  // Create NFT metadata from config
  const createMintMetadata = useCallback((config: SimpleMintConfig): NFTMintMetadata => {
    return {
      edition_number: config.editionNumber || 1,
      edition_total: config.editionTotal || 1,
      data_uris: config.dataUris,
      data_hash: config.dataHash,
      metadata_uris: config.metadataUris,
      metadata_hash: config.metadataHash,
      license_uris: config.licenseUris || [],
      license_hash: config.licenseHash
    };
  }, []);

  // Validate mint configuration
  const validateMintConfig = useCallback((config: SimpleMintConfig): { isValid: boolean; error?: string } => {
    // Validate required fields
    if (!config.dataUris || config.dataUris.length === 0) {
      return { isValid: false, error: 'At least one data URI is required' };
    }

    if (!config.dataHash) {
      return { isValid: false, error: 'Data hash is required' };
    }

    if (!config.metadataUris || config.metadataUris.length === 0) {
      return { isValid: false, error: 'At least one metadata URI is required' };
    }

    if (!config.metadataHash) {
      return { isValid: false, error: 'Metadata hash is required' };
    }

    if (!config.licenseHash) {
      return { isValid: false, error: 'License hash is required' };
    }

    // Validate hash formats (should be 64 hex characters)
    const hexPattern = /^(0x)?[0-9a-fA-F]{64}$/;

    if (!hexPattern.test(config.dataHash)) {
      return { isValid: false, error: 'Invalid data hash format: must be a 64-character hex string' };
    }

    if (!hexPattern.test(config.metadataHash)) {
      return { isValid: false, error: 'Invalid metadata hash format: must be a 64-character hex string' };
    }

    if (!hexPattern.test(config.licenseHash)) {
      return { isValid: false, error: 'Invalid license hash format: must be a 64-character hex string' };
    }

    // Validate URIs
    for (const uri of config.dataUris) {
      try {
        new URL(uri);
      } catch {
        return { isValid: false, error: `Invalid data URI: ${uri}` };
      }
    }

    for (const uri of config.metadataUris) {
      try {
        new URL(uri);
      } catch {
        return { isValid: false, error: `Invalid metadata URI: ${uri}` };
      }
    }

    // Validate recipient address if provided
    if (config.recipientAddress) {
      const addressResult = convertAddressToPuzzleHash(config.recipientAddress);
      if (!addressResult.success) {
        return { isValid: false, error: `Invalid recipient address: ${addressResult.error}` };
      }
    }

    // Validate royalty address if provided
    if (config.royaltyAddress) {
      const royaltyResult = convertAddressToPuzzleHash(config.royaltyAddress);
      if (!royaltyResult.success) {
        return { isValid: false, error: `Invalid royalty address: ${royaltyResult.error}` };
      }
    }

    // Validate royalty percentage
    if (config.royaltyPercentage !== undefined) {
      if (config.royaltyPercentage < 0 || config.royaltyPercentage > 100) {
        return { isValid: false, error: 'Royalty percentage must be between 0 and 100' };
      }
    }

    // Validate edition numbers
    if (config.editionNumber !== undefined && config.editionTotal !== undefined) {
      if (config.editionNumber > config.editionTotal) {
        return { isValid: false, error: 'Edition number cannot be greater than edition total' };
      }
    }

    // Validate mnemonic if provided
    if (config.mnemonicWords) {
      const wordCount = config.mnemonicWords.trim().split(/\s+/).length;
      if (wordCount !== 12 && wordCount !== 24) {
        return { isValid: false, error: 'Mnemonic must be 12 or 24 words' };
      }
    }

    // Validate last spendable coin ID if provided
    if (config.lastSpendableCoinId) {
      const hexPattern = /^(0x)?[0-9a-fA-F]{64}$/;
      if (!hexPattern.test(config.lastSpendableCoinId)) {
        return { isValid: false, error: 'Invalid last spendable coin ID format: must be a 64-character hex string' };
      }
    }

    return { isValid: true };
  }, [convertAddressToPuzzleHash]);

  // Estimate mint fee (basic estimation)
  const estimateMintFee = useCallback((): number => {
    // Basic fee estimation for NFT minting - this could be more sophisticated
    return 1000000; // 0.000001 XCH in mojos
  }, []);

  // Add mint record to history
  const addMintRecord = useCallback((record: MintTransactionRecord) => {
    setMintHistory(prev => {
      const updated = [record, ...prev].slice(0, 100); // Keep last 100 mints
      saveMintHistory(updated);
      return updated;
    });
  }, [saveMintHistory]);

  // Update mint record
  const updateMintRecord = useCallback((mintId: string, updates: Partial<MintTransactionRecord>) => {
    setMintHistory(prev => {
      const updated = prev.map(record => {
        if (record.id === mintId) {
          const updatedRecord = { ...record, ...updates };
          // If we're updating the ID, we need to handle it specially
          if (updates.id && updates.id !== mintId) {
            // Create a new record with the new ID
            const newRecord = { ...updatedRecord, id: updates.id };
            return newRecord;
          }
          return updatedRecord;
        }
        return record;
      });
      saveMintHistory(updated);
      return updated;
    });
  }, [saveMintHistory]);

  // Main mint NFT function
  const mintNFT = useCallback(async (mintConfig: SimpleMintConfig): Promise<{ success: boolean; mintId?: string; transactionId?: string; nftId?: string; error?: string }> => {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'No client available' };
    }

    // Validate configuration
    const validation = validateMintConfig(mintConfig);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const mintId = generateMintId();
    setLastMintId(mintId);
    setIsMinting(true);
    setMintError(null);

    // Create mint record
    const mintRecord: MintTransactionRecord = {
      id: mintId,
      timestamp: Date.now(),
      status: 'pending',
      mintConfig
    };

    addMintRecord(mintRecord);

    if (onMintStart) {
      onMintStart(mintId);
    }

    try {
      // Get required data
      const syntheticPublicKey = await getSyntheticPublicKey();
      if (!syntheticPublicKey) {
        throw new Error('Failed to get synthetic public key');
      }

      const currentAddress = await getAddress();
      if (!currentAddress) {
        throw new Error('Failed to get wallet address');
      }

      // Convert recipient address to puzzle hash (default to current address)
      const recipientAddress = mintConfig.recipientAddress || currentAddress;
      const puzzleHashResult = convertAddressToPuzzleHash(recipientAddress);
      if (!puzzleHashResult.success) {
        throw new Error(`Invalid recipient address: ${puzzleHashResult.error}`);
      }

      // Convert royalty address to puzzle hash if provided
      let royaltyPuzzleHash: string | null = null;
      if (mintConfig.royaltyAddress) {
        const royaltyResult = convertAddressToPuzzleHash(mintConfig.royaltyAddress);
        if (!royaltyResult.success) {
          throw new Error(`Invalid royalty address: ${royaltyResult.error}`);
        }
        royaltyPuzzleHash = royaltyResult.puzzleHash!;
      }

      // Convert royalty percentage to basis points
      const royaltyBasisPoints = mintConfig.royaltyPercentage ? Math.round(mintConfig.royaltyPercentage * 100) : 0;

      // Use provided coins or get unspent coins
      let selectedCoins: MintCoinInput[];
      if (mintConfig.selectedCoins && mintConfig.selectedCoins.length > 0) {
        selectedCoins = mintConfig.selectedCoins;
      } else {
        // Get unspent coins from wallet
        const coinsResult = await client.getUnspentHydratedCoins(currentAddress);
        if (!coinsResult.success || !coinsResult.data.data || coinsResult.data.data.length === 0) {
          throw new Error('No unspent coins available for minting');
        }

        // Filter for XCH coins only (exclude CAT, NFT, DID coins)
        const xchCoins = coinsResult.data.data.filter(hydratedCoin => {
          const driverType = hydratedCoin.parentSpendInfo?.driverInfo?.type;
          return !driverType || (driverType !== 'CAT' && driverType !== 'NFT' && driverType !== 'DID');
        });

        if (xchCoins.length === 0) {
          throw new Error('No XCH coins available for minting. Cannot use CAT, NFT, or DID coins for minting.');
        }

        // Convert hydrated coins to CoinInput format
        const availableCoins = xchCoins.map(hydratedCoin => ({
          parent_coin_info: hydratedCoin.coin.parentCoinInfo,
          puzzle_hash: hydratedCoin.coin.puzzleHash,
          amount: typeof hydratedCoin.coin.amount === 'string' ? parseInt(hydratedCoin.coin.amount) : hydratedCoin.coin.amount
        }));

        // Select coins for minting (basic selection - just use the first few coins)
        const feeAmount = mintConfig.feeXCH ? formatXCHToMojos(mintConfig.feeXCH) : estimateMintFee();
        const mintCost = 1; // NFT minting typically costs 1 mojo
        const totalNeeded = mintCost + feeAmount;

        let totalSelected = 0;
        const coinsToUse: MintCoinInput[] = [];

        for (const coin of availableCoins) {
          coinsToUse.push(coin);
          totalSelected += coin.amount;
          if (totalSelected >= totalNeeded) break;
        }

        if (totalSelected < totalNeeded) {
          throw new Error(`Insufficient balance for minting. Need ${totalNeeded} mojos, have ${totalSelected} mojos`);
        }

        selectedCoins = coinsToUse;
      }

      // Create mint request - handle mnemonic vs synthetic_public_key
      const mintRequest: MintNFTRequest = {
        // Authentication - use mnemonic if provided, otherwise synthetic_public_key
        mnemonic_words: mintConfig.mnemonicWords || null,
        mnemonic_passphrase: mintConfig.mnemonicPassphrase || '',
        synthetic_public_key: mintConfig.mnemonicWords ? null : syntheticPublicKey,

        // Transaction data
        selected_coins: selectedCoins,
        last_spendable_coin_id: mintConfig.lastSpendableCoinId || null,
        did_id: mintConfig.didId || null,

        // Mints
        mints: [{
          metadata: createMintMetadata(mintConfig),
          p2_puzzle_hash: puzzleHashResult.puzzleHash!,
          royalty_puzzle_hash: royaltyPuzzleHash,
          royalty_basis_points: royaltyBasisPoints
        }],

        // Fee (optional, server will use default if not provided)
        fee: mintConfig.feeXCH ? formatXCHToMojos(mintConfig.feeXCH) : undefined
      };

      // Execute mint
      const result = await client.mintNFT(mintRequest);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Extract both launcher_id and transaction_id from the result
      const launcherId = result.data.launcher_id || 
                         (result.data as any).nft_ids?.[0] || 
                         (result.data as any).nft_id || 
                         'unknown';
      const transactionId = result.data.transaction_id || launcherId || mintId;
      setLastTransactionId(transactionId);
      
      console.log('✅ Extracted NFT data:', { 
        launcherId, 
        transactionId,
        fullResultData: result.data 
      });

      // Use launcher_id as the mint ID
      setLastMintId(launcherId); // Set the launcher_id as the mint ID

      // Update mint record with launcher_id as the primary ID
      updateMintRecord(mintId, {
        id: launcherId, // Update the record ID to use launcher_id
        status: 'confirmed',
        transactionId,
        blockchainStatus: result.data.message
      });

      setIsMinting(false);

      if (onMintSuccess) {
        onMintSuccess(launcherId, transactionId); // Use launcher_id as mint ID
      }

      return { success: true, mintId: launcherId, transactionId, nftId: launcherId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
      setMintError(errorMessage);
      setIsMinting(false);

      // Update mint record with error
      updateMintRecord(mintId, {
        status: 'failed',
        error: errorMessage
      });

      if (onMintError) {
        onMintError(mintId, errorMessage);
      }

      return { success: false, mintId, error: errorMessage };
    }
  }, [
    getClient,
    validateMintConfig,
    getSyntheticPublicKey,
    getAddress,
    convertAddressToPuzzleHash,
    createMintMetadata,
    estimateMintFee,
    addMintRecord,
    updateMintRecord,
    onMintStart,
    onMintSuccess,
    onMintError
  ]);

  // Mint and broadcast (convenience method)
  const mintAndBroadcast = useCallback(async (mintConfig: SimpleMintConfig): Promise<{ success: boolean; mintId?: string; transactionId?: string; nftId?: string; error?: string }> => {
    const mintResult = await mintNFT(mintConfig);

    if (!mintResult.success) {
      return mintResult;
    }

    // For now, we assume the mint method handles broadcasting
    // In the future, we could add separate broadcast logic here
    return mintResult;
  }, [mintNFT]);

  // Cancel mint (if in progress)
  const cancelMint = useCallback(() => {
    // Note: This doesn't actually cancel blockchain transactions,
    // just resets the local minting state
    setIsMinting(false);
    setMintError(null);
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setIsMinting(false);
    setMintError(null);
    setLastMintId(null);
    setLastTransactionId(null);
  }, []);

  // Get mint by ID
  const getMintById = useCallback((mintId: string): MintTransactionRecord | null => {
    return mintHistory.find(record => record.id === mintId) || null;
  }, [mintHistory]);

  // Get pending mints
  const getPendingMints = useCallback(() => {
    return mintHistory.filter(record => record.status === 'pending');
  }, [mintHistory]);

  // Clear mint history
  const clearMintHistory = useCallback(() => {
    setMintHistory([]);
    if (autoSave) {
      localStorage.removeItem(MINT_HISTORY_STORAGE_KEY);
    }
  }, [autoSave]);

  // Load history on mount
  useEffect(() => {
    loadMintHistory();
  }, [loadMintHistory]);

  return {
    // State
    isMinting,
    mintError,
    lastMintId,
    lastTransactionId,
    mintHistory,

    // Actions
    mintNFT,
    mintAndBroadcast,
    cancelMint,
    reset,

    // Validation
    validateMintConfig,
    estimateMintFee,

    // History management
    getMintById,
    getPendingMints,
    clearMintHistory,

    // Utilities
    convertAddressToPuzzleHash,
    createMintMetadata
  };
}

// Helper hook for NFT metadata creation
export function useNFTMintMetadata() {
  const [metadata, setMetadata] = useState<Partial<SimpleMintConfig>>({});

  const updateMetadata = useCallback((updates: Partial<SimpleMintConfig>) => {
    setMetadata(prev => ({ ...prev, ...updates }));
  }, []);

  const resetMetadata = useCallback(() => {
    setMetadata({});
  }, []);

  const validateMetadata = useCallback((meta: Partial<SimpleMintConfig>): { isValid: boolean; error?: string } => {
    if (!meta.dataUris || meta.dataUris.length === 0) {
      return { isValid: false, error: 'At least one data URI is required' };
    }

    if (!meta.dataHash) {
      return { isValid: false, error: 'Data hash is required' };
    }

    if (!meta.metadataUris || meta.metadataUris.length === 0) {
      return { isValid: false, error: 'At least one metadata URI is required' };
    }

    if (!meta.metadataHash) {
      return { isValid: false, error: 'Metadata hash is required' };
    }

    return { isValid: true };
  }, []);

  return {
    metadata,
    updateMetadata,
    resetMetadata,
    validateMetadata,
    isComplete: validateMetadata(metadata).isValid
  };
}
