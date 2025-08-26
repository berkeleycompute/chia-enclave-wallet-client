// Chia NFT Minting Service - Public API for minting Chia NFTs
// This service provides a simplified interface for minting Chia NFTs from EVM data

import { ChiaCloudWalletClient, type Result } from './ChiaCloudWalletClient';

// Mint request interface for public API
export interface ChiaNFTMintRequest {
  // Basic NFT information
  name: string;
  description: string;
  imageUrl: string;
  imageHash: string;
  metadataUrl: string;
  metadataHash: string;

  // Optional fields
  collectionName?: string;
  collectionId?: string;
  editionNumber?: number;
  editionTotal?: number;

  // NFT attributes (converted from EVM NFT)
  attributes?: Array<{
    trait_type: string;
    value: string | null;
  }>;

  // Chia-specific options
  targetAddress?: string; // Address to receive the NFT
  royaltyAddress?: string;
  royaltyPercentage?: number; // 0-100
  didId?: string | null;
  feeXCH?: number;

  // License information
  licenseUris?: string[];
  licenseHash?: string;
}

// Mint response interface
export interface ChiaNFTMintResponse {
  success: boolean;
  nftId?: string; // Chia NFT launcher ID
  coinId?: string; // NFT coin ID
  transactionId?: string;
  ownerAddress?: string;
  error?: string;
  details?: any;
}

// Mint status interface
export interface ChiaNFTMintStatus {
  nftId: string;
  exists: boolean;
  confirmed: boolean;
  confirmations?: number;
  blockHeight?: number;
  currentHeight?: number;
  requiredConfirmations?: number;
  ownerAddress?: string;
  error?: string;
}

// Service configuration
export interface ChiaNFTMintServiceConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  enableLogging?: boolean;
}

/**
 * Chia NFT Minting Service
 * Provides a simple API for minting Chia NFTs
 */
export class ChiaNFTMintService {
  private config: ChiaNFTMintServiceConfig;
  private baseUrl: string;

  constructor(config: ChiaNFTMintServiceConfig = {}) {
    this.config = {
      timeout: 60000, // 60 seconds
      enableLogging: true,
      ...config
    };

    // Default to local API endpoint
    this.baseUrl = this.config.baseUrl || 'http://localhost:3001/api';
  }

  /**
   * Set the API base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Set the API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * Mint a new Chia NFT
   * @param request The mint request configuration
   * @returns Promise with mint response
   */
  async mintNFT(request: ChiaNFTMintRequest): Promise<ChiaNFTMintResponse> {
    try {
      const response = await this.makeRequest('/nft/mint', 'POST', request);

      if (this.config.enableLogging) {
        console.log('Mint NFT response:', response);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';

      if (this.config.enableLogging) {
        console.error('Mint NFT error:', error);
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Mint a Chia NFT from an existing EVM NFT
   * @param collectionAddress EVM collection contract address
   * @param tokenId EVM token ID
   * @param targetAddress Optional target address (defaults to current user)
   * @returns Promise with mint response
   */
  async mintFromEVM(
    collectionAddress: string,
    tokenId: string,
    targetAddress?: string
  ): Promise<ChiaNFTMintResponse> {
    try {
      const response = await this.makeRequest('/nft/mint-from-evm', 'POST', {
        collectionAddress,
        tokenId,
        targetAddress
      });

      if (this.config.enableLogging) {
        console.log('Mint from EVM response:', response);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT from EVM';

      if (this.config.enableLogging) {
        console.error('Mint from EVM error:', error);
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check the status of a minted NFT
   * @param nftId The Chia NFT launcher ID
   * @returns Promise with status information
   */
  async getMintStatus(nftId: string): Promise<ChiaNFTMintStatus> {
    try {
      const response = await this.makeRequest(`/nft/status/${nftId}`, 'GET');

      if (this.config.enableLogging) {
        console.log('NFT status response:', response);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get NFT status';

      if (this.config.enableLogging) {
        console.error('Get NFT status error:', error);
      }

      return {
        nftId,
        exists: false,
        confirmed: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get minting statistics
   * @returns Promise with minting stats
   */
  async getMintingStats(): Promise<{
    totalMinted: number;
    pendingMints: number;
    failedMints: number;
    collections: string[];
    lastMintTimestamp?: number;
  }> {
    try {
      const response = await this.makeRequest('/nft/stats', 'GET');

      if (this.config.enableLogging) {
        console.log('Minting stats response:', response);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get minting stats';

      if (this.config.enableLogging) {
        console.error('Get minting stats error:', error);
      }

      return {
        totalMinted: 0,
        pendingMints: 0,
        failedMints: 0,
        collections: []
      };
    }
  }

  /**
   * Validate mint configuration
   * @param request The mint request to validate
   * @returns Validation result
   */
  validateMintRequest(request: ChiaNFTMintRequest): { isValid: boolean; error?: string } {
    // Validate required fields
    if (!request.name || request.name.trim().length === 0) {
      return { isValid: false, error: 'NFT name is required' };
    }

    if (!request.description || request.description.trim().length === 0) {
      return { isValid: false, error: 'NFT description is required' };
    }

    if (!request.imageUrl || request.imageUrl.trim().length === 0) {
      return { isValid: false, error: 'Image URL is required' };
    }

    if (!request.imageHash || request.imageHash.trim().length === 0) {
      return { isValid: false, error: 'Image hash is required' };
    }

    if (!request.metadataUrl || request.metadataUrl.trim().length === 0) {
      return { isValid: false, error: 'Metadata URL is required' };
    }

    if (!request.metadataHash || request.metadataHash.trim().length === 0) {
      return { isValid: false, error: 'Metadata hash is required' };
    }

    // Validate hash formats
    const hexPattern = /^(0x)?[0-9a-fA-F]{64}$/;

    if (!hexPattern.test(request.imageHash)) {
      return { isValid: false, error: 'Invalid image hash format: must be a 64-character hex string' };
    }

    if (!hexPattern.test(request.metadataHash)) {
      return { isValid: false, error: 'Invalid metadata hash format: must be a 64-character hex string' };
    }

    if (request.licenseHash && !hexPattern.test(request.licenseHash)) {
      return { isValid: false, error: 'Invalid license hash format: must be a 64-character hex string' };
    }

    // Validate URLs
    try {
      new URL(request.imageUrl);
      new URL(request.metadataUrl);
    } catch {
      return { isValid: false, error: 'Invalid URL format for image or metadata' };
    }

    if (request.licenseUris) {
      for (const uri of request.licenseUris) {
        try {
          new URL(uri);
        } catch {
          return { isValid: false, error: `Invalid license URI: ${uri}` };
        }
      }
    }

    // Validate royalty percentage
    if (request.royaltyPercentage !== undefined) {
      if (request.royaltyPercentage < 0 || request.royaltyPercentage > 100) {
        return { isValid: false, error: 'Royalty percentage must be between 0 and 100' };
      }
    }

    // Validate edition numbers
    if (request.editionNumber !== undefined && request.editionTotal !== undefined) {
      if (request.editionNumber > request.editionTotal) {
        return { isValid: false, error: 'Edition number cannot be greater than edition total' };
      }
    }

    return { isValid: true };
  }

  /**
   * Create a mint request from simplified parameters
   * @param params Simplified parameters
   * @returns Complete mint request
   */
  createMintRequest(params: {
    name: string;
    description: string;
    imageUrl: string;
    imageHash: string;
    metadataUrl: string;
    metadataHash: string;
    attributes?: Record<string, string | null>;
    targetAddress?: string;
  }): ChiaNFTMintRequest {
    return {
      name: params.name,
      description: params.description,
      imageUrl: params.imageUrl,
      imageHash: params.imageHash,
      metadataUrl: params.metadataUrl,
      metadataHash: params.metadataHash,
      attributes: params.attributes ? Object.entries(params.attributes).map(([trait_type, value]) => ({
        trait_type,
        value
      })) : undefined,
      targetAddress: params.targetAddress,
      editionNumber: 1,
      editionTotal: 1
    };
  }

  /**
   * Make HTTP request to API
   * @private
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const requestInit: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (body && method !== 'GET') {
        requestInit.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestInit);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }
}

// Default service instance
let defaultService: ChiaNFTMintService | null = null;

/**
 * Get the default service instance
 * @param config Optional configuration for the service
 * @returns ChiaNFTMintService instance
 */
export function getChiaNFTMintService(config?: ChiaNFTMintServiceConfig): ChiaNFTMintService {
  if (!defaultService) {
    defaultService = new ChiaNFTMintService(config);
  }
  return defaultService;
}

/**
 * Configure the default service instance
 * @param config Service configuration
 */
export function configureChiaNFTMintService(config: ChiaNFTMintServiceConfig): void {
  defaultService = new ChiaNFTMintService(config);
}

// Convenience functions that use the default service instance

/**
 * Mint a Chia NFT using the default service
 * @param request Mint request configuration
 * @returns Promise with mint response
 */
export async function mintChiaNFT(request: ChiaNFTMintRequest): Promise<ChiaNFTMintResponse> {
  const service = getChiaNFTMintService();
  return service.mintNFT(request);
}

/**
 * Mint a Chia NFT from EVM using the default service
 * @param collectionAddress EVM collection address
 * @param tokenId EVM token ID
 * @param targetAddress Optional target address
 * @returns Promise with mint response
 */
export async function mintChiaNFTFromEVM(
  collectionAddress: string,
  tokenId: string,
  targetAddress?: string
): Promise<ChiaNFTMintResponse> {
  const service = getChiaNFTMintService();
  return service.mintFromEVM(collectionAddress, tokenId, targetAddress);
}

/**
 * Get mint status using the default service
 * @param nftId Chia NFT launcher ID
 * @returns Promise with status information
 */
export async function getChiaNFTMintStatus(nftId: string): Promise<ChiaNFTMintStatus> {
  const service = getChiaNFTMintService();
  return service.getMintStatus(nftId);
}

/**
 * Get minting statistics using the default service
 * @returns Promise with minting stats
 */
export async function getChiaNFTMintingStats() {
  const service = getChiaNFTMintService();
  return service.getMintingStats();
}
