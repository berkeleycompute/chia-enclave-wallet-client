import React from 'react';
import { DialogProvider } from '../hooks/useDialogs';
import { ChiaWalletModal, ChiaWalletModalProps } from './ChiaWalletModal';

/**
 * ChiaWalletModal wrapped with DialogProvider context
 * Use this component instead of ChiaWalletModal directly to get access to dialog hooks
 */
export const ChiaWalletModalWithProvider: React.FC<ChiaWalletModalProps> = (props) => {
  console.log('!!!!!!!!!!!! ChiaWalletModalWithProvider');
  return (
    <DialogProvider>
      <ChiaWalletModal {...props} />
    </DialogProvider>
  );
};

export default ChiaWalletModalWithProvider; 