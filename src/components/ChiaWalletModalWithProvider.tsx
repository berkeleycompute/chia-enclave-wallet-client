import React from 'react';
import { DialogProvider } from '../hooks/useDialogs';
import { ChiaWalletSDKProvider, useOptionalChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';
import { ChiaWalletModal, ChiaWalletModalProps } from './ChiaWalletModal';

/**
 * Inner component that conditionally wraps with SDK provider
 */
const ChiaWalletModalInner: React.FC<ChiaWalletModalProps> = (props) => {
  const existingSDK = useOptionalChiaWalletSDK();

  // If there's already an SDK in context, use it
  if (existingSDK) {
    return (
      <DialogProvider>
        <ChiaWalletModal {...props} />
      </DialogProvider>
    );
  }

  // Otherwise, create a new SDK provider for this modal
  return (
    <ChiaWalletSDKProvider config={{ jwtToken: props.jwtToken || undefined }}>
      <DialogProvider>
        <ChiaWalletModal {...props} />
      </DialogProvider>
    </ChiaWalletSDKProvider>
  );
};

/**
 * ChiaWalletModal wrapped with necessary providers
 * 
 * This component intelligently wraps ChiaWalletModal with the required contexts:
 * - If an SDK already exists in context (from a parent ChiaWalletSDKProvider),
 *   it reuses that SDK instance to maintain state consistency
 * - If no SDK exists, it creates a new ChiaWalletSDKProvider for the modal
 * - Always provides DialogProvider for dialog management
 * 
 * BEST PRACTICE: For optimal state sharing across your app, wrap your root
 * component with <ChiaWalletSDKProvider>, then use this component for modals.
 * This ensures all components share the same wallet state and avoid redundant connections.
 */
export const ChiaWalletModalWithProvider: React.FC<ChiaWalletModalProps> = (props) => {
  return <ChiaWalletModalInner {...props} />;
};

export default ChiaWalletModalWithProvider; 