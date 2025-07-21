import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ChiaCloudWalletClient, type HydratedCoin } from '../client/ChiaCloudWalletClient.ts';
import { SendFundsModal } from './SendFundsModal.tsx';
import { ReceiveFundsModal } from './ReceiveFundsModal.tsx';
import { MakeOfferModal } from './MakeOfferModal.tsx';
import { ActiveOffersModal } from './ActiveOffersModal.tsx';
import { NFTDetailsModal } from './NFTDetailsModal.tsx';

// Global dialog configuration
export interface GlobalDialogConfig {
  client?: ChiaCloudWalletClient;
  jwtToken?: string;
  baseUrl?: string;
  publicKey?: string;
  autoConnect?: boolean;
}

// Arguments for different dialog types
export interface SendDialogArgs {
  recipientAddress?: string;
  amount?: string;
  fee?: string;
}

export interface MakeOfferDialogArgs {
  selectedNft?: HydratedCoin;
  offerAmount?: string;
  depositAddress?: string;
}

export interface NFTDetailsDialogArgs {
  nft: HydratedCoin;
}

export interface ReceiveDialogArgs {
  // No specific args for receive dialog currently
}

export interface OffersDialogArgs {
  // No specific args for offers dialog currently
}

// Global dialog context interface
export interface GlobalDialogContextValue {
  // Configuration
  config: GlobalDialogConfig;
  updateConfig: (newConfig: Partial<GlobalDialogConfig>) => void;
  setJwtToken: (token: string) => void;
  
  // Wallet state
  isConnected: boolean;
  publicKey: string | null;
  syntheticPublicKey: string | null;
  hydratedCoins: HydratedCoin[];
  unspentCoins: any[];
  loading: boolean;
  error: string | null;
  
  // Dialog functions - can be called from anywhere!
  openSendDialog: (args?: SendDialogArgs) => void;
  openReceiveDialog: (args?: ReceiveDialogArgs) => void;
  openMakeOfferDialog: (args?: MakeOfferDialogArgs) => void;
  openOffersDialog: (args?: OffersDialogArgs) => void;
  openNFTDetailsDialog: (args: NFTDetailsDialogArgs) => void;
  
  // Dialog state management
  closeDialog: (dialogType: string) => void;
  closeAllDialogs: () => void;
  
  // Utility functions
  refreshWalletData: () => Promise<void>;
}

// Create the context
const GlobalDialogContext = createContext<GlobalDialogContextValue | null>(null);

// Dialog state interface
interface DialogState {
  isOpen: boolean;
  args?: any;
}

interface DialogStates {
  send: DialogState;
  receive: DialogState;
  makeOffer: DialogState;
  offers: DialogState;
  nftDetails: DialogState;
}

// Provider props
interface GlobalDialogProviderProps {
  children: React.ReactNode;
  initialConfig?: GlobalDialogConfig;
}

// Main provider component
export const GlobalDialogProvider: React.FC<GlobalDialogProviderProps> = ({
  children,
  initialConfig = {}
}) => {
  // Configuration state
  const [config, setConfig] = useState<GlobalDialogConfig>(initialConfig);
  const clientRef = useRef<ChiaCloudWalletClient | null>(null);

  // Dialog states
  const [dialogStates, setDialogStates] = useState<DialogStates>({
    send: { isOpen: false },
    receive: { isOpen: false },
    makeOffer: { isOpen: false },
    offers: { isOpen: false },
    nftDetails: { isOpen: false }
  });

  // Wallet state
  const [walletState, setWalletState] = useState({
    isConnected: false,
    publicKey: null as string | null,
    syntheticPublicKey: null as string | null,
    hydratedCoins: [] as HydratedCoin[],
    unspentCoins: [] as any[],
    nftMetadata: new Map<string, any>(),
    loadingMetadata: new Set<string>(),
    loading: false,
    error: null as string | null
  });

  // Initialize client when config changes
  useEffect(() => {
    const initializeClient = () => {
      if (!clientRef.current || config.jwtToken !== clientRef.current.getJwtToken()) {
        clientRef.current = config.client || new ChiaCloudWalletClient({
          baseUrl: config.baseUrl,
          jwtToken: config.jwtToken
        });

        if (config.jwtToken) {
          clientRef.current.setJwtToken(config.jwtToken);
        }
      }
    };

    initializeClient();

    // Auto-connect if enabled
    if (config.autoConnect !== false && config.jwtToken) {
      refreshWalletData();
    }
  }, [config]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<GlobalDialogConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Set JWT token
  const setJwtToken = useCallback((token: string) => {
    updateConfig({ jwtToken: token });
  }, [updateConfig]);

  // Refresh wallet data
  const refreshWalletData = useCallback(async () => {
    if (!clientRef.current) return;

    setWalletState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get public key if not provided
      let publicKey = config.publicKey || walletState.publicKey;
      let syntheticPublicKey = walletState.syntheticPublicKey;

      if (!publicKey) {
        const publicKeyResult = await clientRef.current.getPublicKey();
        if (publicKeyResult.success) {
          publicKey = publicKeyResult.data.address;
          syntheticPublicKey = publicKeyResult.data.synthetic_public_key;
        }
      }

      if (publicKey) {
        // Load hydrated coins
        const hydratedResult = await clientRef.current.getUnspentHydratedCoins(publicKey);
        if (hydratedResult.success) {
          const hydratedCoins = hydratedResult.data.data;
          const unspentCoins = ChiaCloudWalletClient.extractCoinsFromHydratedCoins(hydratedCoins);
          
          setWalletState(prev => ({
            ...prev,
            isConnected: true,
            publicKey,
            syntheticPublicKey,
            hydratedCoins,
            unspentCoins,
            loading: false,
            error: null
          }));
        }
      }
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load wallet data'
      }));
    }
  }, [config.publicKey, walletState.publicKey, walletState.syntheticPublicKey]);

  // Dialog functions - these can be called from anywhere!
  const openSendDialog = useCallback((args?: SendDialogArgs) => {
    setDialogStates(prev => ({
      ...prev,
      send: { isOpen: true, args }
    }));
  }, []);

  const openReceiveDialog = useCallback((args?: ReceiveDialogArgs) => {
    setDialogStates(prev => ({
      ...prev,
      receive: { isOpen: true, args }
    }));
  }, []);

  const openMakeOfferDialog = useCallback((args?: MakeOfferDialogArgs) => {
    setDialogStates(prev => ({
      ...prev,
      makeOffer: { isOpen: true, args }
    }));
  }, []);

  const openOffersDialog = useCallback((args?: OffersDialogArgs) => {
    setDialogStates(prev => ({
      ...prev,
      offers: { isOpen: true, args }
    }));
  }, []);

  const openNFTDetailsDialog = useCallback((args: NFTDetailsDialogArgs) => {
    setDialogStates(prev => ({
      ...prev,
      nftDetails: { isOpen: true, args }
    }));
  }, []);

  // Close specific dialog
  const closeDialog = useCallback((dialogType: string) => {
    setDialogStates(prev => ({
      ...prev,
      [dialogType]: { isOpen: false, args: undefined }
    }));
  }, []);

  // Close all dialogs
  const closeAllDialogs = useCallback(() => {
    setDialogStates({
      send: { isOpen: false },
      receive: { isOpen: false },
      makeOffer: { isOpen: false },
      offers: { isOpen: false },
      nftDetails: { isOpen: false }
    });
  }, []);

  // Event handlers for modal callbacks
  const handleTransactionSent = useCallback((transaction: any) => {
    console.log('Transaction sent:', transaction);
    refreshWalletData();
  }, [refreshWalletData]);

  const handleOfferCreated = useCallback((offerData: any) => {
    console.log('Offer created:', offerData);
    refreshWalletData();
  }, [refreshWalletData]);

  const handleOfferUpdate = useCallback(() => {
    console.log('Offer updated');
    refreshWalletData();
  }, [refreshWalletData]);

  // Context value
  const contextValue: GlobalDialogContextValue = {
    // Configuration
    config,
    updateConfig,
    setJwtToken,
    
    // Wallet state
    isConnected: walletState.isConnected,
    publicKey: walletState.publicKey,
    syntheticPublicKey: walletState.syntheticPublicKey,
    hydratedCoins: walletState.hydratedCoins,
    unspentCoins: walletState.unspentCoins,
    loading: walletState.loading,
    error: walletState.error,
    
    // Dialog functions
    openSendDialog,
    openReceiveDialog,
    openMakeOfferDialog,
    openOffersDialog,
    openNFTDetailsDialog,
    
    // Dialog management
    closeDialog,
    closeAllDialogs,
    
    // Utilities
    refreshWalletData
  };

  return (
    <GlobalDialogContext.Provider value={contextValue}>
      {children}
      
      {/* Render all modals here - they're controlled by global state */}
      
      {/* Send Funds Modal */}
      <SendFundsModal
        isOpen={dialogStates.send.isOpen}
        onClose={() => closeDialog('send')}
        client={clientRef.current}
        publicKey={walletState.publicKey}
        unspentCoins={walletState.unspentCoins}
        onTransactionSent={handleTransactionSent}
        // Pass arguments as initial values
        initialRecipientAddress={dialogStates.send.args?.recipientAddress}
        initialAmount={dialogStates.send.args?.amount}
        initialFee={dialogStates.send.args?.fee}
      />

      {/* Receive Funds Modal */}
      <ReceiveFundsModal
        isOpen={dialogStates.receive.isOpen}
        onClose={() => closeDialog('receive')}
        publicKey={walletState.publicKey}
      />

      {/* Make Offer Modal */}
      <MakeOfferModal
        isOpen={dialogStates.makeOffer.isOpen}
        onClose={() => closeDialog('makeOffer')}
        client={clientRef.current}
        publicKey={walletState.publicKey}
        syntheticPublicKey={walletState.syntheticPublicKey}
        hydratedCoins={walletState.hydratedCoins}
        nftMetadata={walletState.nftMetadata}
        loadingMetadata={walletState.loadingMetadata}
        selectedNft={dialogStates.makeOffer.args?.selectedNft}
        onOfferCreated={handleOfferCreated}
        onRefreshWallet={refreshWalletData}
        // Pass arguments as initial values
        initialOfferAmount={dialogStates.makeOffer.args?.offerAmount}
        initialDepositAddress={dialogStates.makeOffer.args?.depositAddress}
      />

      {/* Active Offers Modal */}
      <ActiveOffersModal
        isOpen={dialogStates.offers.isOpen}
        onClose={() => closeDialog('offers')}
        publicKey={walletState.publicKey}
        nftMetadata={walletState.nftMetadata}
        loadingMetadata={walletState.loadingMetadata}
        onOfferUpdate={handleOfferUpdate}
      />

      {/* NFT Details Modal */}
      <NFTDetailsModal
        isOpen={dialogStates.nftDetails.isOpen}
        onClose={() => closeDialog('nftDetails')}
        selectedNft={dialogStates.nftDetails.args?.nft}
        nftMetadata={walletState.nftMetadata}
        loadingMetadata={walletState.loadingMetadata}
      />
    </GlobalDialogContext.Provider>
  );
};

// Hook to use the global dialog context
export const useGlobalDialogs = (): GlobalDialogContextValue => {
  const context = useContext(GlobalDialogContext);
  if (!context) {
    throw new Error('useGlobalDialogs must be used within a GlobalDialogProvider');
  }
  return context;
};

// Convenience hooks for specific dialog types
export const useSendDialog = () => {
  const { openSendDialog, closeDialog } = useGlobalDialogs();
  return {
    open: openSendDialog,
    close: () => closeDialog('send')
  };
};

export const useReceiveDialog = () => {
  const { openReceiveDialog, closeDialog } = useGlobalDialogs();
  return {
    open: openReceiveDialog,
    close: () => closeDialog('receive')
  };
};

export const useMakeOfferDialog = () => {
  const { openMakeOfferDialog, closeDialog } = useGlobalDialogs();
  return {
    open: openMakeOfferDialog,
    close: () => closeDialog('makeOffer')
  };
};

export const useOffersDialog = () => {
  const { openOffersDialog, closeDialog } = useGlobalDialogs();
  return {
    open: openOffersDialog,
    close: () => closeDialog('offers')
  };
};

export const useNFTDetailsDialog = () => {
  const { openNFTDetailsDialog, closeDialog } = useGlobalDialogs();
  return {
    open: openNFTDetailsDialog,
    close: () => closeDialog('nftDetails')
  };
}; 