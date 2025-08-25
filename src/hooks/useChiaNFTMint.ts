import { useState, useCallback, useRef, useEffect } from 'react';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';
import { ChiaCloudWalletClient } from '../client/ChiaCloudWalletClient';
import { bech32m } from 'bech32';

// Mint request configuration
export interface ChiaNFTMintConfig {
  // Required fields
  name: string;
  description: string;
  imageUrl: string;
  metadataUrl: string;
  
  // Optional fields
  collectionName?: string;
  collectionId?: string;
  editionNumber?: number;
  editionTotal?: number;
  
  // NFT attributes
  attributes?: Record<string, string | null>;
  
  // Chia-specific fields
  dataHash: string;
  metadataHash: string;
  licenseHash?: string;
  licenseUris?: string[];
  
  // Transaction options
  targetAddress?: string; // Address to receive the minted NFT
  royaltyAddress?: string;
  royaltyPercentage?: number; // 0-100, will convert to basis points
  didId?: string | null;
  feeXCH?: number;
  
  // Advanced options
  mnemonicWords?: string;
  mnemonicPassphrase?: string;
  lastSpendableCoinId?: string; // Optional coin ID for lineage optimization
}

// Mint transaction record for tracking
export interface ChiaNFTMintRecord {
  id: string;
  timestamp: number;
  status: 'pending' | 'minting' | 'confirming' | 'completed' | 'failed' | 'cancelled';
  nftId?: string; // Chia NFT ID (launcher_id)
  coinId?: string; // NFT coin ID
  transactionId?: string;
  blockHeight?: number;
  mintConfig: ChiaNFTMintConfig;
  error?: string;
  confirmations?: number;
}

// Hook configuration
export interface UseChiaNFTMintConfig {
  sdk?: ChiaWalletSDK;
  client?: ChiaCloudWalletClient;
  jwtToken?: string;
  baseUrl?: string;
  enableLogging?: boolean;
  autoSave?: boolean; // Save mint records to localStorage
  onMintStart?: (mintId: string) => void;
  onMintSuccess?: (mintId: string, nftId: string) => void;
  onMintError?: (mintId: string, error: string) => void;
  onMintConfirmed?: (mintId: string, nftId: string, blockHeight: number) => void;
}

// Hook result interface
export interface UseChiaNFTMintResult {
  // State
  isMinting: boolean;
  isConfirming: boolean;
  mintError: string | null;
  lastMintId: string | null;
  lastNFTId: string | null;
  lastTransactionId: string | null;
  mintHistory: ChiaNFTMintRecord[];
  
  // Actions
  mintNFT: (config: ChiaNFTMintConfig) => Promise<{ success: boolean; mintId?: string; nftId?: string; transactionId?: string; error?: string }>;
  cancelMint: (mintId?: string) => void;
  reset: () => void;
  
  // Validation
  validateMintConfig: (config: ChiaNFTMintConfig) => { isValid: boolean; error?: string };
  estimateMintFee: () => number;
  
  // History management
  getMintById: (mintId: string) => ChiaNFTMintRecord | null;
  getPendingMints: () => ChiaNFTMintRecord[];
  getConfirmingMints: () => ChiaNFTMintRecord[];
  clearMintHistory: () => void;
  
  // Status checking
  checkMintStatus: (mintId: string) => Promise<ChiaNFTMintRecord | null>;
  refreshMintStatus: (mintId: string) => Promise<boolean>;
  
  // Utilities
  createMetadataFromConfig: (config: ChiaNFTMintConfig) => any;
  convertAddressToPuzzleHash: (address: string) => { success: boolean; puzzleHash?: string; error?: string };
  encodeLauncherIdAsNftAddress: (launcherId: string) => string;
}

// Storage key for mint history
const CHIA_MINT_HISTORY_STORAGE_KEY = 'chia_nft_mint_history';

// Utility functions
function generateMintId(): string {
  return `chia_mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatXCHToMojos(xchAmount: number): number {
  const result = ChiaCloudWalletClient.xchToMojos(xchAmount);
  return result.success ? parseInt(result.data) : 1000; // Default 1000 mojos = 0.000000001 XCH
}

/**
 * Utility function to encode launcher ID as NFT address
 * @param launcherId - The launcher ID from the blockchain (64-character hex string)
 * @returns The bech32m encoded NFT address with 'nft' prefix, or empty string if invalid
 */
export function encodeLauncherIdAsNftAddress(launcherId: string): string {
  try {
    if (!launcherId || launcherId === 'unknown') {
      console.warn('Invalid launcher ID provided for NFT address encoding:', launcherId);
      return '';
    }
    
    // Remove '0x' prefix if present and ensure lowercase
    const cleanLauncherId = launcherId.replace(/^0x/, '').toLowerCase();
    
    // Validate hex string format (should be 64 characters)
    if (!/^[0-9a-f]{64}$/.test(cleanLauncherId)) {
      console.error('Invalid launcher ID format - expected 64 hex characters, got:', cleanLauncherId);
      return '';
    }
    
    // Convert hex string to Uint8Array
    const bytes = new Uint8Array(cleanLauncherId.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    
    if (bytes.length !== 32) {
      console.error('Invalid launcher ID length - expected 32 bytes, got:', bytes.length);
      return '';
    }
    
    // Use bech32m.toWords to convert to 5-bit words, then encode with 'nft' prefix
    const words = bech32m.toWords(bytes);
    const nftAddress = bech32m.encode("nft", words);
    
    console.log('✅ Successfully encoded NFT address:', { launcherId: cleanLauncherId, nftAddress });
    return nftAddress;
  } catch (error) {
    console.error('❌ Error encoding launcher ID as NFT address:', error, 'launcher ID:', launcherId);
    return '';
  }
}

// Main hook
export function useChiaNFTMint(config: UseChiaNFTMintConfig = {}): UseChiaNFTMintResult {
  const {
    sdk,
    client: externalClient,
    jwtToken,
    baseUrl,
    enableLogging = true,
    autoSave = true,
    onMintStart,
    onMintSuccess,
    onMintError,
    onMintConfirmed
  } = config;

  // Internal client reference
  const internalClient = useRef<ChiaCloudWalletClient | null>(null);
  
  // State
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [lastMintId, setLastMintId] = useState<string | null>(null);
  const [lastNFTId, setLastNFTId] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [mintHistory, setMintHistory] = useState<ChiaNFTMintRecord[]>([]);

  // Get or create client
  const getClient = useCallback((): ChiaCloudWalletClient | null => {
    // Prefer SDK client if available (handle both raw SDK and UnifiedWalletClient)
    if (sdk?.client) return sdk.client; // Raw ChiaWalletSDK
    if ((sdk as any)?.sdk?.client) return (sdk as any).sdk.client; // UnifiedWalletClient.sdk.client
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
  }, [sdk, externalClient, jwtToken, baseUrl, enableLogging]);

  // Get wallet address
  const getAddress = useCallback(async (): Promise<string | null> => {
    if (sdk) {
      try {
        // Handle UnifiedWalletClient
        if ((sdk as any).address) {
          return (sdk as any).address;
        }
        // Handle raw ChiaWalletSDK
        if ((sdk as any).getWalletInfo) {
          const result = await (sdk as any).getWalletInfo();
          return result.success ? result.data.address : null;
        }
      } catch (error) {
        console.warn('Failed to get wallet address from SDK:', error);
      }
    }

    const client = getClient();
    if (!client) return null;

    try {
      const result = await client.getPublicKey();
      return result.success ? result.data.address : null;
    } catch (error) {
      console.warn('Failed to get wallet address:', error);
    }

    return null;
  }, [sdk, getClient]);

  // Get synthetic public key
  const getSyntheticPublicKey = useCallback(async (): Promise<string | null> => {
    if (sdk) {
      try {
        // Handle UnifiedWalletClient
        if ((sdk as any).syntheticPublicKey) {
          return (sdk as any).syntheticPublicKey;
        }
        // Handle raw ChiaWalletSDK
        if ((sdk as any).getWalletInfo) {
          const result = await (sdk as any).getWalletInfo();
          return result.success ? result.data.synthetic_public_key : null;
        }
      } catch (error) {
        console.warn('Failed to get synthetic public key from SDK:', error);
      }
    }

    const client = getClient();
    if (!client) return null;

    try {
      const result = await client.getPublicKey();
      return result.success ? result.data.synthetic_public_key : null;
    } catch (error) {
      console.warn('Failed to get synthetic public key:', error);
    }

    return null;
  }, [sdk, getClient]);

  // Load mint history from storage
  const loadMintHistory = useCallback(() => {
    if (!autoSave) return;
    
    try {
      const stored = localStorage.getItem(CHIA_MINT_HISTORY_STORAGE_KEY);
      if (stored) {
        const parsedHistory: ChiaNFTMintRecord[] = JSON.parse(stored);
        
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
  const saveMintHistory = useCallback((history: ChiaNFTMintRecord[]) => {
    if (!autoSave) return;
    
    try {
      localStorage.setItem(CHIA_MINT_HISTORY_STORAGE_KEY, JSON.stringify(history));
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

  // Create metadata from config
  const createMetadataFromConfig = useCallback((config: ChiaNFTMintConfig): any => {
    return {
      format: "CHIP-0007",
      name: config.name,
      description: config.description,
      minting_tool: "Chia Enclave Wallet",
      sensitive_content: false,
      series_number: config.editionNumber || 1,
      series_total: config.editionTotal || 1,
      attributes: Object.entries(config.attributes || {}).map(([trait_type, value]) => ({
        trait_type,
        value: value || ""
      })),
      collection: config.collectionName ? {
        name: config.collectionName,
        id: config.collectionId || config.collectionName.toLowerCase().replace(/\s+/g, '-'),
        attributes: []
      } : undefined
    };
  }, []);

  // Validate mint configuration
  const validateMintConfig = useCallback((config: ChiaNFTMintConfig): { isValid: boolean; error?: string } => {
    // Validate required fields
    if (!config.name || config.name.trim().length === 0) {
      return { isValid: false, error: 'NFT name is required' };
    }

    if (!config.description || config.description.trim().length === 0) {
      return { isValid: false, error: 'NFT description is required' };
    }

    if (!config.imageUrl || config.imageUrl.trim().length === 0) {
      return { isValid: false, error: 'Image URL is required' };
    }

    if (!config.metadataUrl || config.metadataUrl.trim().length === 0) {
      return { isValid: false, error: 'Metadata URL is required' };
    }

    if (!config.dataHash || config.dataHash.trim().length === 0) {
      return { isValid: false, error: 'Data hash is required' };
    }

    if (!config.metadataHash || config.metadataHash.trim().length === 0) {
      return { isValid: false, error: 'Metadata hash is required' };
    }

    // Validate hash formats (should be 64 hex characters)
    const hexPattern = /^(0x)?[0-9a-fA-F]{64}$/;
    
    if (!hexPattern.test(config.dataHash)) {
      return { isValid: false, error: 'Invalid data hash format: must be a 64-character hex string' };
    }

    if (!hexPattern.test(config.metadataHash)) {
      return { isValid: false, error: 'Invalid metadata hash format: must be a 64-character hex string' };
    }

    if (config.licenseHash && !hexPattern.test(config.licenseHash)) {
      return { isValid: false, error: 'Invalid license hash format: must be a 64-character hex string' };
    }

    // Validate URLs
    try {
      new URL(config.imageUrl);
      new URL(config.metadataUrl);
    } catch {
      return { isValid: false, error: 'Invalid URL format for image or metadata' };
    }

    if (config.licenseUris) {
      for (const uri of config.licenseUris) {
        try {
          new URL(uri);
        } catch {
          return { isValid: false, error: `Invalid license URI: ${uri}` };
        }
      }
    }

    // Validate target address if provided
    if (config.targetAddress) {
      const addressResult = convertAddressToPuzzleHash(config.targetAddress);
      if (!addressResult.success) {
        return { isValid: false, error: `Invalid target address: ${addressResult.error}` };
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

    return { isValid: true };
  }, [convertAddressToPuzzleHash]);

  // Estimate mint fee
  const estimateMintFee = useCallback((): number => {
    return 1000; // 1000 mojos = 0.000000001 XCH (reasonable default)
  }, []);

  // Add mint record to history
  const addMintRecord = useCallback((record: ChiaNFTMintRecord) => {
    setMintHistory(prev => {
      const updated = [record, ...prev].slice(0, 100);
      saveMintHistory(updated);
      return updated;
    });
  }, [saveMintHistory]);

  // Update mint record
  const updateMintRecord = useCallback((mintId: string, updates: Partial<ChiaNFTMintRecord>) => {
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
  const mintNFT = useCallback(async (mintConfig: ChiaNFTMintConfig): Promise<{ success: boolean; mintId?: string; nftId?: string; transactionId?: string; error?: string }> => {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'No client available' };
    }

    // Validate configuration
    console.log('✅ Validating mint config:', mintConfig);
    const validation = validateMintConfig(mintConfig);
    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.error);
      return { success: false, error: validation.error };
    }
    console.log('✅ Config validation passed');

    const mintId = generateMintId();
    setLastMintId(mintId);
    setIsMinting(true);
    setMintError(null);

    // Create mint record
    const mintRecord: ChiaNFTMintRecord = {
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
      console.log('🔑 Getting synthetic public key...');
      const syntheticPublicKey = await getSyntheticPublicKey();
      if (!syntheticPublicKey) {
        throw new Error('Failed to get synthetic public key');
      }
      console.log('✅ Got synthetic public key:', syntheticPublicKey.substring(0, 10) + '...');

      console.log('📍 Getting wallet address...');
      const currentAddress = await getAddress();
      if (!currentAddress) {
        throw new Error('Failed to get wallet address');
      }
      console.log('✅ Got wallet address:', currentAddress);

      // Auto-populate lastSpendableCoinId from DID coin if DID is selected but lastSpendableCoinId not provided
      if (mintConfig.didId && !mintConfig.lastSpendableCoinId) {
        try {
          console.log('🔍 Looking up DID coin for lastSpendableCoinId:', mintConfig.didId);
          const didsResult = await client.getDIDs(currentAddress);
          if (didsResult.success && didsResult.data && didsResult.data.data) {
            const selectedDid = didsResult.data.data.find(did => did.did_id === mintConfig.didId);
            if (selectedDid && selectedDid.coinId) {
              mintConfig.lastSpendableCoinId = selectedDid.coinId;
              console.log('✅ Auto-populated lastSpendableCoinId from DID coin:', selectedDid.coinId);
            } else {
              console.log('⚠️ Could not find DID or DID coinId for:', mintConfig.didId);
            }
          }
        } catch (error) {
          console.log('⚠️ Failed to auto-populate lastSpendableCoinId from DID:', error);
          // Continue without it - not critical for minting
        }
      }

      // Update status to minting
      updateMintRecord(mintId, { status: 'minting' });

      // Convert target address to puzzle hash (default to current address)
      const targetAddress = mintConfig.targetAddress || currentAddress;
      const puzzleHashResult = convertAddressToPuzzleHash(targetAddress);
      if (!puzzleHashResult.success) {
        throw new Error(`Invalid target address: ${puzzleHashResult.error}`);
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

      // Get unspent coins for minting
      console.log('🪙 Getting unspent coins...');
      const coinsResult = await client.getUnspentHydratedCoins(currentAddress);
      if (!coinsResult.success || !coinsResult.data.data || coinsResult.data.data.length === 0) {
        console.error('❌ No unspent coins available:', coinsResult);
        throw new Error('No unspent coins available for minting');
      }

      // Filter for XCH coins only (exclude CAT, NFT, DID coins)
      const xchCoins = coinsResult.data.data.filter(hydratedCoin => {
        const driverType = hydratedCoin.parentSpendInfo?.driverInfo?.type;
        return !driverType || (driverType !== 'CAT' && driverType !== 'NFT' && driverType !== 'DID');
      });

      console.log('✅ Got coins:', coinsResult.data.data.length, 'total,', xchCoins.length, 'XCH coins available');

      if (xchCoins.length === 0) {
        throw new Error('No XCH coins available for minting. Cannot use CAT, NFT, or DID coins for minting.');
      }

      // Select coins for minting
      const availableCoins = xchCoins.map(hydratedCoin => ({
        parent_coin_info: hydratedCoin.coin.parentCoinInfo,
        puzzle_hash: hydratedCoin.coin.puzzleHash,
        amount: typeof hydratedCoin.coin.amount === 'string' ? parseInt(hydratedCoin.coin.amount) : hydratedCoin.coin.amount
      }));

      const feeAmount = mintConfig.feeXCH ? formatXCHToMojos(mintConfig.feeXCH) : estimateMintFee();
      const mintCost = 1; // NFT minting typically costs 1 mojo
      const totalNeeded = mintCost + feeAmount;
      console.log('💰 Fee calculation:', { feeAmount, mintCost, totalNeeded });

      let totalSelected = 0;
      const selectedCoins = [];

      for (const coin of availableCoins) {
        selectedCoins.push(coin);
        totalSelected += coin.amount;
        if (totalSelected >= totalNeeded) break;
      }

      if (totalSelected < totalNeeded) {
        console.error('❌ Insufficient balance:', { totalSelected, totalNeeded });
        throw new Error(`Insufficient balance for minting. Need ${totalNeeded} mojos, have ${totalSelected} mojos`);
      }
      console.log('✅ Selected coins:', selectedCoins.length, 'total value:', totalSelected);

      // Create mint request
      const mintRequest = {
        // Authentication
        mnemonic_words: mintConfig.mnemonicWords || null,
        mnemonic_passphrase: mintConfig.mnemonicPassphrase || '',
        synthetic_public_key: mintConfig.mnemonicWords ? null : syntheticPublicKey,
        
        // Transaction data
        selected_coins: selectedCoins,
        last_spendable_coin_id: mintConfig.lastSpendableCoinId || null,
        did_id: mintConfig.didId || null,
        
        // Mints
        mints: [{
          metadata: {
            edition_number: mintConfig.editionNumber || 1,
            edition_total: mintConfig.editionTotal || 1,
            data_uris: [mintConfig.imageUrl],
            data_hash: mintConfig.dataHash,
            metadata_uris: [mintConfig.metadataUrl],
            metadata_hash: mintConfig.metadataHash,
            license_uris: mintConfig.licenseUris || [],
            license_hash: mintConfig.licenseHash || mintConfig.metadataHash // Use metadata hash as fallback
          },
          p2_puzzle_hash: puzzleHashResult.puzzleHash!,
          royalty_puzzle_hash: royaltyPuzzleHash,
          royalty_basis_points: royaltyBasisPoints
        }],
        
        // Fee
        fee: feeAmount
      };

      // Execute mint
      console.log('🚀 Executing mint with request:', {
        ...mintRequest,
        synthetic_public_key: mintRequest.synthetic_public_key ? mintRequest.synthetic_public_key.substring(0, 10) + '...' : null
      });
      
      const result = await client.mintNFT(mintRequest);
      console.log('📋 Mint API result:', result);
      
      if (!result.success) {
        console.error('❌ Mint API failed:', result.error);
        throw new Error(result.error);
      }
      console.log('✅ Mint API succeeded:', result.data);

      // Extract both launcher_id and transaction_id from the result
      const launcherId = result.data.launcher_id || 
                         (result.data as any).nft_ids?.[0] || 
                         (result.data as any).nft_id || 
                         'unknown';
      const transactionId = result.data.transaction_id || launcherId;
      
      console.log('✅ Extracted NFT data:', { 
        launcherId, 
        transactionId,
        fullResultData: result.data 
      });
      
      // Use launcher_id as the mint ID
      setLastMintId(launcherId); // Set the launcher_id as the mint ID
      setLastNFTId(launcherId);
      setLastTransactionId(transactionId);

      // Update mint record with launcher_id as the primary ID
      updateMintRecord(mintId, {
        id: launcherId, // Update the record ID to use launcher_id
        status: 'confirming',
        nftId: launcherId,
        transactionId: transactionId
      });

      setIsMinting(false);
      setIsConfirming(true);

      if (onMintSuccess) {
        onMintSuccess(launcherId, launcherId); // Use launcher_id for both mintId and nftId
      }

      // Start confirmation monitoring (simplified for this example)
      setTimeout(async () => {
        try {
          // In a real implementation, you would check the blockchain for confirmation
          updateMintRecord(launcherId, { // Use launcher_id as the mint ID
            status: 'completed',
            confirmations: 1
          });
          setIsConfirming(false);

          if (onMintConfirmed) {
            onMintConfirmed(launcherId, launcherId, 0); // Use launcher_id for both
          }
        } catch (error) {
          console.warn('Failed to confirm mint:', error);
        }
      }, 30000); // Wait 30 seconds for confirmation

      return { success: true, mintId: launcherId, nftId: launcherId, transactionId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
      setMintError(errorMessage);
      setIsMinting(false);
      setIsConfirming(false);

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
    estimateMintFee,
    addMintRecord,
    updateMintRecord,
    onMintStart,
    onMintSuccess,
    onMintError,
    onMintConfirmed
  ]);

  // Cancel mint function
  const cancelMint = useCallback((mintId?: string) => {
    const targetId = mintId || lastMintId;
    if (targetId) {
      updateMintRecord(targetId, {
        status: 'cancelled'
      });
    }
    setIsMinting(false);
    setIsConfirming(false);
    setMintError(null);
  }, [lastMintId, updateMintRecord]);

  // Reset hook state
  const reset = useCallback(() => {
    setIsMinting(false);
    setIsConfirming(false);
    setMintError(null);
    setLastMintId(null);
    setLastNFTId(null);
    setLastTransactionId(null);
  }, []);

  // Get mint by ID
  const getMintById = useCallback((mintId: string): ChiaNFTMintRecord | null => {
    return mintHistory.find(record => record.id === mintId) || null;
  }, [mintHistory]);

  // Get pending mints
  const getPendingMints = useCallback(() => {
    return mintHistory.filter(record => ['pending', 'minting'].includes(record.status));
  }, [mintHistory]);

  // Get confirming mints
  const getConfirmingMints = useCallback(() => {
    return mintHistory.filter(record => record.status === 'confirming');
  }, [mintHistory]);

  // Clear mint history
  const clearMintHistory = useCallback(() => {
    setMintHistory([]);
    if (autoSave) {
      localStorage.removeItem(CHIA_MINT_HISTORY_STORAGE_KEY);
    }
  }, [autoSave]);

  // Check mint status
  const checkMintStatus = useCallback(async (mintId: string): Promise<ChiaNFTMintRecord | null> => {
    const record = getMintById(mintId);
    if (!record || !record.nftId) {
      return record;
    }

    // In a real implementation, you would query the blockchain
    // For now, just return the existing record
    return record;
  }, [getMintById]);

  // Refresh mint status
  const refreshMintStatus = useCallback(async (mintId: string): Promise<boolean> => {
    const record = getMintById(mintId);
    if (!record) {
      return false;
    }

    try {
      const updatedRecord = await checkMintStatus(mintId);
      if (updatedRecord) {
        updateMintRecord(mintId, updatedRecord);
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh mint status:', error);
    }

    return false;
  }, [getMintById, checkMintStatus, updateMintRecord]);

  // Load history on mount
  useEffect(() => {
    loadMintHistory();
  }, [loadMintHistory]);

  return {
    // State
    isMinting,
    isConfirming,
    mintError,
    lastMintId,
    lastNFTId,
    lastTransactionId,
    mintHistory,
    
    // Actions
    mintNFT,
    cancelMint,
    reset,
    
    // Validation
    validateMintConfig,
    estimateMintFee,
    
    // History management
    getMintById,
    getPendingMints,
    getConfirmingMints,
    clearMintHistory,
    
    // Status checking
    checkMintStatus,
    refreshMintStatus,
      
    // Utilities
    createMetadataFromConfig,
    convertAddressToPuzzleHash,
    encodeLauncherIdAsNftAddress: (launcherId: string) => encodeLauncherIdAsNftAddress(launcherId)
  };
}

// Helper hook for metadata creation
export function useChiaNFTMetadata() {
  const [metadata, setMetadata] = useState<Partial<ChiaNFTMintConfig>>({});
  
  const updateMetadata = useCallback((updates: Partial<ChiaNFTMintConfig>) => {
    setMetadata(prev => ({ ...prev, ...updates }));
  }, []);
  
  const resetMetadata = useCallback(() => {
    setMetadata({});
  }, []);
  
  const validateMetadata = useCallback((meta: Partial<ChiaNFTMintConfig>): { isValid: boolean; error?: string } => {
    if (!meta.name || meta.name.trim().length === 0) {
      return { isValid: false, error: 'NFT name is required' };
    }
    
    if (!meta.imageUrl || meta.imageUrl.trim().length === 0) {
      return { isValid: false, error: 'Image URL is required' };
    }
    
    if (!meta.dataHash || meta.dataHash.trim().length === 0) {
      return { isValid: false, error: 'Data hash is required' };
    }
    
    if (!meta.metadataHash || meta.metadataHash.trim().length === 0) {
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
