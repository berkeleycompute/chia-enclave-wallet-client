import React, { useState, useEffect } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin } from '../client/ChiaCloudWalletClient.ts';
import { DialogProvider } from '../hooks/useDialogs.ts';
import { SendFundsModal } from './SendFundsModal.tsx';
import { ReceiveFundsModal } from './ReceiveFundsModal.tsx';
import { MakeOfferModal } from './MakeOfferModal.tsx';
import { ActiveOffersModal } from './ActiveOffersModal.tsx';
import { NFTDetailsModal } from './NFTDetailsModal.tsx';
// import { ChiaWalletModal } from './ChiaWalletModal.tsx'; // Removed for now due to complex dependencies

// Simple configuration interface for the dialog manager
export interface ChiaWalletDialogConfig {
  client?: ChiaCloudWalletClient;
  publicKey?: string;
  jwtToken?: string;
  autoConnect?: boolean;
  baseUrl?: string;
}

// Simple dialog manager class
export class ChiaWalletDialogManager {
  private config: ChiaWalletDialogConfig;
  private wrapperRef: React.RefObject<ChiaWalletDialogsWrapper | null>;
  
  constructor(config: ChiaWalletDialogConfig = {}) {
    this.config = config;
    this.wrapperRef = React.createRef();
  }

  // Update configuration
  updateConfig(newConfig: Partial<ChiaWalletDialogConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.wrapperRef.current) {
      this.wrapperRef.current.updateConfig(this.config);
    }
  }

  // Set JWT token
  setJwtToken(token: string) {
    this.updateConfig({ jwtToken: token });
  }

  // Simple methods to show each dialog
  showSendDialog() {
    this.wrapperRef.current?.showSendDialog();
  }

  showReceiveDialog() {
    this.wrapperRef.current?.showReceiveDialog();
  }

  showOffersDialog() {
    this.wrapperRef.current?.showOffersDialog();
  }

  showMakeOfferDialog(nft?: HydratedCoin) {
    this.wrapperRef.current?.showMakeOfferDialog(nft);
  }

  showNFTDetailsDialog(nft: HydratedCoin) {
    this.wrapperRef.current?.showNFTDetailsDialog(nft);
  }

  showWalletDialog() {
    this.wrapperRef.current?.showWalletDialog();
  }

  // Close all dialogs
  closeAllDialogs() {
    this.wrapperRef.current?.closeAllDialogs();
  }

  // Get the React component to render
  getDialogsComponent(): React.ReactElement {
    return React.createElement(ChiaWalletDialogsWrapper, {
      initialConfig: this.config,
      onRef: (ref: ChiaWalletDialogsWrapper | null) => {
        // @ts-ignore - TypeScript can't infer this properly but it works
        this.wrapperRef.current = ref;
      }
    });
  }
}

// Internal wrapper component that manages all the dialogs
interface ChiaWalletDialogsWrapperProps {
  initialConfig: ChiaWalletDialogConfig;
  onRef?: (ref: ChiaWalletDialogsWrapper | null) => void;
}

export class ChiaWalletDialogsWrapper extends React.Component<ChiaWalletDialogsWrapperProps> {
  private client: ChiaCloudWalletClient | null = null;
  
  state = {
    // Dialog states
    sendDialogOpen: false,
    receiveDialogOpen: false,
    offersDialogOpen: false,
    makeOfferDialogOpen: false,
    nftDetailsDialogOpen: false,
    walletDialogOpen: false,
    
    // Data states
    config: this.props.initialConfig,
    publicKey: this.props.initialConfig.publicKey || null,
    syntheticPublicKey: null as string | null,
    hydratedCoins: [] as HydratedCoin[],
    unspentCoins: [] as any[],
    nftMetadata: new Map<string, any>(),
    loadingMetadata: new Set<string>(),
    
    // Dialog-specific state
    selectedNft: null as HydratedCoin | null,
    
    // Loading states
    loading: false,
    error: null as string | null,
  };

  componentDidMount() {
    this.initializeClient();
    if (this.props.onRef) {
      this.props.onRef(this);
    }
  }

  componentDidUpdate(prevProps: ChiaWalletDialogsWrapperProps) {
    if (prevProps.initialConfig !== this.props.initialConfig) {
      this.updateConfig(this.props.initialConfig);
    }
  }

  updateConfig = (newConfig: ChiaWalletDialogConfig) => {
    this.setState({ config: newConfig });
    this.initializeClient();
  }

  initializeClient = async () => {
    const { config } = this.state;
    
    // Initialize client
    this.client = config.client || new ChiaCloudWalletClient({
      baseUrl: config.baseUrl,
      jwtToken: config.jwtToken
    });

    if (config.jwtToken) {
      this.client.setJwtToken(config.jwtToken);
    }

    // Auto-connect if requested
    if (config.autoConnect !== false) {
      await this.loadWalletData();
    }
  }

  loadWalletData = async () => {
    if (!this.client) return;

    this.setState({ loading: true, error: null });

    try {
      // Get public key if not provided
      let publicKey = this.state.publicKey;
      let syntheticPublicKey = this.state.syntheticPublicKey;

      if (!publicKey) {
        const publicKeyResult = await this.client.getPublicKey();
        if (publicKeyResult.success) {
          publicKey = publicKeyResult.data.address;
          syntheticPublicKey = publicKeyResult.data.synthetic_public_key;
          this.setState({ publicKey, syntheticPublicKey });
        }
      }

      if (publicKey) {
        // Load hydrated coins
        const hydratedResult = await this.client.getUnspentHydratedCoins(publicKey);
        if (hydratedResult.success) {
          const hydratedCoins = hydratedResult.data.data;
          const unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
          this.setState({ hydratedCoins, unspentCoins });
        }
      }
    } catch (error) {
      this.setState({ error: error instanceof Error ? error.message : 'Failed to load wallet data' });
    } finally {
      this.setState({ loading: false });
    }
  }

  // Dialog control methods
  showSendDialog = () => this.setState({ sendDialogOpen: true });
  showReceiveDialog = () => this.setState({ receiveDialogOpen: true });
  showOffersDialog = () => this.setState({ offersDialogOpen: true });
  
  showMakeOfferDialog = (nft?: HydratedCoin) => {
    this.setState({ 
      makeOfferDialogOpen: true,
      selectedNft: nft || null 
    });
  }
  
  showNFTDetailsDialog = (nft: HydratedCoin) => {
    this.setState({ 
      nftDetailsDialogOpen: true,
      selectedNft: nft 
    });
  }
  
  showWalletDialog = () => this.setState({ walletDialogOpen: true });

  closeAllDialogs = () => {
    this.setState({
      sendDialogOpen: false,
      receiveDialogOpen: false,
      offersDialogOpen: false,
      makeOfferDialogOpen: false,
      nftDetailsDialogOpen: false,
      walletDialogOpen: false,
      selectedNft: null
    });
  }

  // Event handlers
  handleTransactionSent = (transaction: any) => {
    console.log('Transaction sent:', transaction);
    // Refresh wallet data
    this.loadWalletData();
  }

  handleOfferCreated = (offerData: any) => {
    console.log('Offer created:', offerData);
    // Refresh wallet data
    this.loadWalletData();
  }

  handleOfferUpdate = () => {
    console.log('Offer updated');
    // Refresh wallet data
    this.loadWalletData();
  }

  render() {
    const {
      sendDialogOpen,
      receiveDialogOpen,
      offersDialogOpen,
      makeOfferDialogOpen,
      nftDetailsDialogOpen,
      walletDialogOpen,
      publicKey,
      syntheticPublicKey,
      hydratedCoins,
      unspentCoins,
      nftMetadata,
      loadingMetadata,
      selectedNft
    } = this.state;

    return (
      <DialogProvider>
        {/* Send Funds Dialog */}
        <SendFundsModal
          isOpen={sendDialogOpen}
          onClose={() => this.setState({ sendDialogOpen: false })}
          client={this.client}
          publicKey={publicKey}
          unspentCoins={unspentCoins}
          onTransactionSent={this.handleTransactionSent}
        />

        {/* Receive Funds Dialog */}
        <ReceiveFundsModal
          isOpen={receiveDialogOpen}
          onClose={() => this.setState({ receiveDialogOpen: false })}
          publicKey={publicKey}
        />

        {/* Make Offer Dialog */}
        <MakeOfferModal
          isOpen={makeOfferDialogOpen}
          onClose={() => this.setState({ makeOfferDialogOpen: false, selectedNft: null })}
          client={this.client}
          publicKey={publicKey}
          syntheticPublicKey={syntheticPublicKey}
          hydratedCoins={hydratedCoins}
          nftMetadata={nftMetadata}
          loadingMetadata={loadingMetadata}
          selectedNft={selectedNft}
          onOfferCreated={this.handleOfferCreated}
          onRefreshWallet={this.loadWalletData}
        />

        {/* Active Offers Dialog */}
        <ActiveOffersModal
          isOpen={offersDialogOpen}
          onClose={() => this.setState({ offersDialogOpen: false })}
          publicKey={publicKey}
          nftMetadata={nftMetadata}
          loadingMetadata={loadingMetadata}
          onOfferUpdate={this.handleOfferUpdate}
        />

        {/* NFT Details Dialog */}
        <NFTDetailsModal
          isOpen={nftDetailsDialogOpen}
          onClose={() => this.setState({ nftDetailsDialogOpen: false, selectedNft: null })}
          selectedNft={selectedNft}
          nftMetadata={nftMetadata}
          loadingMetadata={loadingMetadata}
        />

        {/* Main Wallet Dialog - Commented out due to complex dependencies */}
        {/* <ChiaWalletModal
          isOpen={walletDialogOpen}
          onClose={() => this.setState({ walletDialogOpen: false })}
          wallet={mockWalletObject}
        /> */}
      </DialogProvider>
    );
  }
} 