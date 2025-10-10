import React, { useState, useCallback, createContext, useContext } from 'react';
import { HydratedCoin } from '../client/ChiaCloudWalletClient';
// import { SavedOffer } from '../components/types';

// Central dialog state type
export type DialogType = 
  | 'sendFunds'
  | 'makeOffer' 
  | 'receiveFunds'
  | 'activeOffers'
  | 'nftDetails'
  | 'walletMain'
  | 'transactions'
  | 'viewAssets';

export interface DialogState {
  [key: string]: {
    isOpen: boolean;
    data?: any;
  };
}

export interface DialogContextValue {
  dialogStates: DialogState;
  openDialog: (dialog: DialogType, data?: any) => void;
  closeDialog: (dialog: DialogType) => void;
  closeAllDialogs: () => void;
  isAnyDialogOpen: boolean;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogStates, setDialogStates] = useState<DialogState>({
    sendFunds: { isOpen: false },
    makeOffer: { isOpen: false, data: null },
    receiveFunds: { isOpen: false },
    activeOffers: { isOpen: false },
    nftDetails: { isOpen: false, data: null },
    walletMain: { isOpen: false },
    transactions: { isOpen: false },
    viewAssets: { isOpen: false },
  });

  const openDialog = useCallback((dialog: DialogType, data?: any) => {
    setDialogStates(prev => ({
      ...prev,
      [dialog]: { isOpen: true, data }
    }));
  }, []);

  const closeDialog = useCallback((dialog: DialogType) => {
    setDialogStates(prev => ({
      ...prev,
      [dialog]: { isOpen: false, data: prev[dialog]?.data }
    }));
  }, []);

  const closeAllDialogs = useCallback(() => {
    setDialogStates(prev => {
      const newState: DialogState = {};
      Object.keys(prev).forEach(key => {
        newState[key] = { isOpen: false, data: null };
      });
      return newState;
    });
  }, []);

  const isAnyDialogOpen = Object.values(dialogStates).some(state => state.isOpen);

  const value: DialogContextValue = {
    dialogStates,
    openDialog,
    closeDialog,
    closeAllDialogs,
    isAnyDialogOpen,
  };

  return React.createElement(DialogContext.Provider, { value }, children);
};

function useDialogContext(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog hooks must be used within a DialogProvider');
  }
  return context;
}

// Individual dialog hook interfaces
export interface SendFundsDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface MakeOfferDialogState {
  isOpen: boolean;
  selectedNft: HydratedCoin | null;
  open: (nft?: HydratedCoin) => void;
  close: () => void;
}

export interface ReceiveFundsDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface ActiveOffersDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface NFTDetailsDialogState {
  isOpen: boolean;
  selectedNft: HydratedCoin | null;
  open: (nft: HydratedCoin) => void;
  close: () => void;
}

export interface WalletMainDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface TransactionsDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface ViewAssetsDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// Individual dialog hooks
export function useSendFundsDialog(): SendFundsDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.sendFunds?.isOpen || false,
    open: () => openDialog('sendFunds'),
    close: () => closeDialog('sendFunds'),
  };
}

export function useMakeOfferDialog(): MakeOfferDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.makeOffer?.isOpen || false,
    selectedNft: dialogStates.makeOffer?.data || null,
    open: (nft?: HydratedCoin) => openDialog('makeOffer', nft),
    close: () => closeDialog('makeOffer'),
  };
}

export function useReceiveFundsDialog(): ReceiveFundsDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.receiveFunds?.isOpen || false,
    open: () => openDialog('receiveFunds'),
    close: () => closeDialog('receiveFunds'),
  };
}

export function useActiveOffersDialog(): ActiveOffersDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.activeOffers?.isOpen || false,
    open: () => openDialog('activeOffers'),
    close: () => closeDialog('activeOffers'),
  };
}

export function useNFTDetailsDialog(): NFTDetailsDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.nftDetails?.isOpen || false,
    selectedNft: dialogStates.nftDetails?.data || null,
    open: (nft: HydratedCoin) => openDialog('nftDetails', nft),
    close: () => closeDialog('nftDetails'),
  };
}

export function useWalletMainDialog(): WalletMainDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.walletMain?.isOpen || false,
    open: () => openDialog('walletMain'),
    close: () => closeDialog('walletMain'),
  };
}

export function useTransactionsDialog(): TransactionsDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.transactions?.isOpen || false,
    open: () => openDialog('transactions'),
    close: () => closeDialog('transactions'),
  };
}

export function useViewAssetsDialog(): ViewAssetsDialogState {
  const { dialogStates, openDialog, closeDialog } = useDialogContext();
  
  return {
    isOpen: dialogStates.viewAssets?.isOpen || false,
    open: () => openDialog('viewAssets'),
    close: () => closeDialog('viewAssets'),
  };
}

// Compound hook that provides all dialog managers
export function useAllDialogs() {
  const sendFundsDialog = useSendFundsDialog();
  const makeOfferDialog = useMakeOfferDialog();
  const receiveFundsDialog = useReceiveFundsDialog();
  const activeOffersDialog = useActiveOffersDialog();
  const nftDetailsDialog = useNFTDetailsDialog();
  const walletMainDialog = useWalletMainDialog();
  const transactionsDialog = useTransactionsDialog();
  const viewAssetsDialog = useViewAssetsDialog();
  const { closeAllDialogs, isAnyDialogOpen } = useDialogContext();

  return {
    sendFunds: sendFundsDialog,
    makeOffer: makeOfferDialog,
    receiveFunds: receiveFundsDialog,
    activeOffers: activeOffersDialog,
    nftDetails: nftDetailsDialog,
    walletMain: walletMainDialog,
    transactions: transactionsDialog,
    viewAssets: viewAssetsDialog,
    closeAllDialogs,
    isAnyDialogOpen,
  };
} 