import { ChiaWalletSDK } from './ChiaWalletSDK';
import { UnifiedWalletState } from '../components/types';

/**
 * UnifiedWalletClient - A high-level client that combines SDK and wallet state
 * This is the recommended way to pass wallet functionality to components
 */
export class UnifiedWalletClient {
  constructor(
    public readonly sdk: ChiaWalletSDK,
    public readonly walletState: UnifiedWalletState
  ) {}

  /**
   * Create a UnifiedWalletClient from existing SDK and state
   */
  static create(sdk: ChiaWalletSDK, walletState: UnifiedWalletState): UnifiedWalletClient {
    return new UnifiedWalletClient(sdk, walletState);
  }

  /**
   * Convenience getters for common wallet properties
   */
  get isConnected(): boolean {
    return this.walletState.isConnected;
  }

  get address(): string | null {
    return this.walletState.address;
  }

  get balance(): number {
    return this.walletState.totalBalance;
  }

  get formattedBalance(): string {
    return this.walletState.formattedBalance;
  }

  get coinCount(): number {
    return this.walletState.coinCount;
  }

  get publicKey(): string | null {
    return this.walletState.publicKey;
  }

  get syntheticPublicKey(): string | null {
    return this.walletState.syntheticPublicKey;
  }

  get error(): string | null {
    return this.walletState.error;
  }

  get isConnecting(): boolean {
    return this.walletState.isConnecting ?? false;
  }

  /**
   * Convenience methods for common operations
   */
  
  /**
   * Format an address for display (shortened version)
   */
  formatAddress(address?: string): string {
    const addr = address || this.address;
    if (!addr) return '';
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 10)}`;
  }

  /**
   * Check if the wallet has sufficient balance for a transaction
   */
  hasSufficientBalance(amountInMojos: number): boolean {
    return this.balance >= amountInMojos;
  }

  /**
   * Convert XCH to mojos
   */
  xchToMojos(xchAmount: number): number {
    return Math.floor(xchAmount * 1000000000000);
  }

  /**
   * Convert mojos to XCH
   */
  mojosToXch(mojos: number): number {
    return mojos / 1000000000000;
  }

  /**
   * Get a summary object for easy serialization or debugging
   */
  getSummary() {
    return {
      isConnected: this.isConnected,
      address: this.address,
      formattedAddress: this.formatAddress(),
      balance: this.balance,
      formattedBalance: this.formattedBalance,
      coinCount: this.coinCount,
      error: this.error,
      isConnecting: this.isConnecting,
    };
  }

  /**
   * Create a copy with updated wallet state
   */
  withUpdatedState(newWalletState: UnifiedWalletState): UnifiedWalletClient {
    return new UnifiedWalletClient(this.sdk, newWalletState);
  }
} 