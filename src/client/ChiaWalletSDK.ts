import { 
  ChiaCloudWalletClient, 
  type ChiaCloudWalletConfig,
  type HydratedCoin,
  type Coin,
  type Result,
  type PublicKeyResponse,
  type SendXCHRequest,
  type SendXCHResponse,
  type BroadcastResponse,
  type SignOfferResponse,
  type SimpleMakeUnsignedNFTOfferRequest
} from './ChiaCloudWalletClient';

// Event types for reactivity
export type WalletEventType = 
  | 'connectionChanged'
  | 'balanceChanged' 
  | 'coinsChanged'
  | 'walletInfoChanged'
  | 'transactionCompleted'
  | 'error';

export type EventListener<T = any> = (data: T) => void;

// Simplified state interface
export interface WalletState {
  // Connection
  isConnected: boolean;
  isConnecting: boolean;
  
  // Authentication
  jwtToken: string | null;
  
  // Wallet info
  publicKey: string | null;
  syntheticPublicKey: string | null;
  address: string | null;
  email: string | null;
  userId: string | null;
  
  // Balance & coins
  totalBalance: number;
  coinCount: number;
  hydratedCoins: HydratedCoin[];
  xchCoins: HydratedCoin[];
  catCoins: HydratedCoin[];
  nftCoins: HydratedCoin[];
  
  // Loading states
  loading: {
    connection: boolean;
    balance: boolean;
    coins: boolean;
    walletInfo: boolean;
  };
  
  // Errors
  errors: {
    connection: string | null;
    balance: string | null;
    coins: string | null;
    walletInfo: string | null;
  };
  
  // Timestamps
  lastUpdate: {
    balance: number;
    coins: number;
    walletInfo: number;
  };
}

// Configuration for the SDK
export interface ChiaWalletSDKConfig extends ChiaCloudWalletConfig {
  autoConnect?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Unified Chia Wallet SDK that combines API client functionality with reactive state management
 * This is the main client that should be passed around to components and hooks
 */
export class ChiaWalletSDK {
  public client: ChiaCloudWalletClient;
  private config: ChiaWalletSDKConfig;
  private eventListeners: Map<WalletEventType, Set<EventListener>> = new Map();
  private refreshInterval: number | null = null;
  private state: WalletState;

  constructor(config: ChiaWalletSDKConfig = {}) {
    this.config = {
      autoConnect: true,
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds
      ...config
    };

    this.client = new ChiaCloudWalletClient({
      baseUrl: this.config.baseUrl,
      jwtToken: this.config.jwtToken,
      enableLogging: this.config.enableLogging
    });

    // Initialize state
    this.state = this.createInitialState();

    // Set up auto-refresh if enabled
    if (this.config.autoRefresh && this.config.refreshInterval) {
      this.startAutoRefresh();
    }
  }

  /**
   * Create the initial state
   */
  private createInitialState(): WalletState {
    return {
      isConnected: false,
      isConnecting: false,
      jwtToken: this.config.jwtToken || null,
      publicKey: null,
      syntheticPublicKey: null,
      address: null,
      email: null,
      userId: null,
      totalBalance: 0,
      coinCount: 0,
      hydratedCoins: [],
      xchCoins: [],
      catCoins: [],
      nftCoins: [],
      loading: {
        connection: false,
        balance: false,
        coins: false,
        walletInfo: false
      },
      errors: {
        connection: null,
        balance: null,
        coins: null,
        walletInfo: null
      },
      lastUpdate: {
        balance: 0,
        coins: 0,
        walletInfo: 0
      }
    };
  }

  /**
   * Get the current state (read-only)
   */
  get walletState(): Readonly<WalletState> {
    return { ...this.state };
  }

  /**
   * Get the underlying API client for advanced usage
   */
  get apiClient(): ChiaCloudWalletClient {
    return this.client;
  }

  /**
   * Event system - Subscribe to wallet events
   */
  on<T = any>(event: WalletEventType, listener: EventListener<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    };
  }

  /**
   * Emit an event to all listeners
   */
  private emit<T = any>(event: WalletEventType, data?: T): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Update state and emit relevant events
   */
  private updateState(updates: Partial<WalletState>, changedFields?: (keyof WalletState)[]): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Emit specific events based on what changed
    if (changedFields) {
      if (changedFields.includes('isConnected')) {
        this.emit('connectionChanged', { 
          isConnected: this.state.isConnected,
          address: this.state.address 
        });
      }
      
      if (changedFields.includes('totalBalance') || changedFields.includes('hydratedCoins')) {
        this.emit('balanceChanged', {
          totalBalance: this.state.totalBalance,
          coinCount: this.state.coinCount
        });
      }
      
      if (changedFields.includes('hydratedCoins')) {
        this.emit('coinsChanged', {
          hydratedCoins: this.state.hydratedCoins,
          xchCoins: this.state.xchCoins,
          catCoins: this.state.catCoins,
          nftCoins: this.state.nftCoins
        });
      }
      
      if (changedFields.includes('address')) {
        this.emit('walletInfoChanged', {
          address: this.state.address,
          email: this.state.email
        });
      }
    }
  }

  /**
   * Set JWT token and update client
   */
  async setJwtToken(token: string | null): Promise<boolean> {
    if (token) {
      this.client.setJwtToken(token);
    }
    this.updateState({ jwtToken: token }, ['jwtToken']);
    
    if (token && this.config.autoConnect) {
      return await this.connect();
    }
    
    if (!token) {
      this.disconnect();
    }
    
    return true;
  }

  /**
   * Connect to the wallet and fetch initial data
   */
  async connect(): Promise<boolean> {
    if (!this.state.jwtToken) {
      this.updateState({
        errors: { ...this.state.errors, connection: 'JWT token is required' }
      });
      this.emit('error', { type: 'connection', message: 'JWT token is required' });
      return false;
    }

    this.updateState({
      isConnecting: true,
      loading: { ...this.state.loading, connection: true },
      errors: { ...this.state.errors, connection: null }
    });

    try {
      // Get wallet info
      const walletInfoResult = await this.client.getPublicKey();
      if (!walletInfoResult.success) {
        throw new Error(walletInfoResult.error);
      }

      // Update wallet info in state
      this.updateState({
        isConnected: true,
        isConnecting: false,
        publicKey: walletInfoResult.data.master_public_key,
        syntheticPublicKey: walletInfoResult.data.synthetic_public_key,
        address: walletInfoResult.data.address,
        email: walletInfoResult.data.email,
        userId: walletInfoResult.data.user_id,
        loading: { ...this.state.loading, connection: false },
        lastUpdate: { ...this.state.lastUpdate, walletInfo: Date.now() }
      }, ['isConnected', 'address']);

      // Load initial balance and coins
      await this.refreshBalance();
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.updateState({
        isConnecting: false,
        isConnected: false,
        loading: { ...this.state.loading, connection: false },
        errors: { ...this.state.errors, connection: errorMessage }
      });
      
      this.emit('error', { type: 'connection', message: errorMessage });
      return false;
    }
  }

  /**
   * Disconnect from the wallet
   */
  disconnect(): void {
    this.stopAutoRefresh();
    this.updateState({
      isConnected: false,
      publicKey: null,
      syntheticPublicKey: null,
      address: null,
      email: null,
      userId: null,
      totalBalance: 0,
      coinCount: 0,
      hydratedCoins: [],
      xchCoins: [],
      catCoins: [],
      nftCoins: [],
      errors: {
        connection: null,
        balance: null,
        coins: null,
        walletInfo: null
      }
    }, ['isConnected']);
  }

  /**
   * Refresh balance and coins
   */
  async refreshBalance(): Promise<boolean> {
    if (!this.state.address) {
      return false;
    }

    this.updateState({
      loading: { ...this.state.loading, balance: true, coins: true },
      errors: { ...this.state.errors, balance: null, coins: null }
    });

    try {
      const result = await this.client.getWalletBalanceEnhanced(this.state.address);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.updateState({
        totalBalance: result.data.totalBalance,
        coinCount: result.data.coinCount,
        hydratedCoins: [...result.data.xchCoins, ...result.data.catCoins, ...result.data.nftCoins],
        xchCoins: result.data.xchCoins,
        catCoins: result.data.catCoins,
        nftCoins: result.data.nftCoins,
        loading: { ...this.state.loading, balance: false, coins: false },
        lastUpdate: { 
          ...this.state.lastUpdate, 
          balance: Date.now(), 
          coins: Date.now() 
        }
      }, ['totalBalance', 'hydratedCoins']);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh balance';
      this.updateState({
        loading: { ...this.state.loading, balance: false, coins: false },
        errors: { ...this.state.errors, balance: errorMessage, coins: errorMessage }
      });
      
      this.emit('error', { type: 'balance', message: errorMessage });
      return false;
    }
  }

  /**
   * Send XCH transaction
   */
  async sendXCH(request: SendXCHRequest): Promise<Result<BroadcastResponse>> {
    try {
      // First create and sign the transaction
      const signResult = await this.client.sendXCH(request);
      if (!signResult.success) {
        return signResult as any;
      }

      // Then broadcast it
      const broadcastResult = await this.client.broadcastSignedSpendBundle(signResult.data);
      
      if (broadcastResult.success) {
        // Emit transaction completed event
        this.emit('transactionCompleted', {
          type: 'send_xch',
          transactionId: broadcastResult.data.transaction_id,
          request
        });
        
        // Refresh balance after successful transaction
        setTimeout(() => this.refreshBalance(), 2000);
      }
      
      return broadcastResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
        details: error
      };
    }
  }

  /**
   * Create and sign an NFT offer
   */
  async createNFTOffer(request: SimpleMakeUnsignedNFTOfferRequest): Promise<Result<SignOfferResponse>> {
    if (!this.state.syntheticPublicKey) {
      return {
        success: false,
        error: 'Wallet not connected or synthetic public key not available'
      };
    }

    const result = await this.client.makeSignedNFTOfferSimple(
      this.state.syntheticPublicKey,
      request
    );

    if (result.success) {
      this.emit('transactionCompleted', {
        type: 'nft_offer',
        offerId: result.data.signed_offer,
        request
      });
    }

    return result;
  }

  /**
   * Get formatted balance in XCH
   */
  getFormattedBalance(): string {
    const result = ChiaCloudWalletClient.mojosToXCH(this.state.totalBalance);
    return result.success ? result.data.toFixed(6) + ' XCH' : '0.000000 XCH';
  }

  /**
   * Check if data is stale and needs refresh
   */
  isDataStale(type: 'balance' | 'coins' | 'walletInfo' = 'balance', maxAgeMs: number = 60000): boolean {
    const lastUpdate = this.state.lastUpdate[type];
    return Date.now() - lastUpdate > maxAgeMs;
  }

  /**
   * Start auto-refresh
   */
  private startAutoRefresh(): void {
    if (this.refreshInterval) {
      this.stopAutoRefresh();
    }

    this.refreshInterval = window.setInterval(() => {
      if (this.state.isConnected && !this.state.loading.balance) {
        this.refreshBalance();
      }
    }, this.config.refreshInterval!);
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.eventListeners.clear();
  }
} 