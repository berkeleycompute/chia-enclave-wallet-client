import React, { useEffect } from 'react';
import { DialogProvider, useAllDialogs } from '../hooks/useDialogs';
import { useChiaWallet } from '../hooks/useChiaWallet';
import { SendFundsModal } from './SendFundsModal';
import { ReceiveFundsModal } from './ReceiveFundsModal';
import { MakeOfferModal } from './MakeOfferModal';
import { ActiveOffersModal } from './ActiveOffersModal';
import { NFTDetailsModal } from './NFTDetailsModal';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';

export interface ChiaWalletBridgeProps {
  jwtToken?: string | null;
  baseUrl?: string;
  enableLogging?: boolean;
  onWalletUpdate?: (walletState: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Internal component that uses the hooks
const ChiaWalletBridgeContent: React.FC<ChiaWalletBridgeProps> = ({
  jwtToken,
  baseUrl,
  enableLogging = true,
  onWalletUpdate,
  className = '',
  style = {},
}) => {
  // Use the existing hooks
  const wallet = useChiaWallet({ baseUrl, enableLogging });
  const dialogs = useAllDialogs();

  // Set JWT token when it changes
  useEffect(() => {
    if (jwtToken !== wallet.jwtToken) {
      wallet.setJwtToken(jwtToken || null);
    }
  }, [jwtToken, wallet]);

  // Auto-connect when JWT is available
  useEffect(() => {
    if (jwtToken && !wallet.isConnected && !wallet.isConnecting) {
      wallet.connectWallet();
    }
  }, [jwtToken, wallet.isConnected, wallet.isConnecting, wallet]);

  // Call onWalletUpdate when wallet state changes
  useEffect(() => {
    if (onWalletUpdate) {
      onWalletUpdate({
        isConnected: wallet.isConnected,
        isConnecting: wallet.isConnecting,
        publicKey: wallet.publicKey,
        balance: wallet.balance,
        coinCount: wallet.coinCount,
        error: wallet.error,
        balanceError: wallet.balanceError,
        hydratedCoins: wallet.hydratedCoins,
        unspentCoins: wallet.unspentCoins,
        // Include dialog states for Svelte
        dialogs: {
          sendFunds: { isOpen: dialogs.sendFunds.isOpen },
          receiveFunds: { isOpen: dialogs.receiveFunds.isOpen },
          makeOffer: { isOpen: dialogs.makeOffer.isOpen, selectedNft: dialogs.makeOffer.selectedNft },
          activeOffers: { isOpen: dialogs.activeOffers.isOpen },
          nftDetails: { isOpen: dialogs.nftDetails.isOpen, selectedNft: dialogs.nftDetails.selectedNft },
          walletMain: { isOpen: dialogs.walletMain.isOpen },
          isAnyDialogOpen: dialogs.isAnyDialogOpen,
        },
        // Expose dialog functions for Svelte to call
        actions: {
          // Wallet actions
          connectWallet: wallet.connectWallet,
          disconnectWallet: wallet.disconnectWallet,
          refreshWallet: wallet.refreshWallet,
          
          // Dialog actions
          openSendFunds: dialogs.sendFunds.open,
          closeSendFunds: dialogs.sendFunds.close,
          openReceiveFunds: dialogs.receiveFunds.open,
          closeReceiveFunds: dialogs.receiveFunds.close,
          openMakeOffer: dialogs.makeOffer.open,
          closeMakeOffer: dialogs.makeOffer.close,
          openActiveOffers: dialogs.activeOffers.open,
          closeActiveOffers: dialogs.activeOffers.close,
          openNftDetails: dialogs.nftDetails.open,
          closeNftDetails: dialogs.nftDetails.close,
          openWalletMain: dialogs.walletMain.open,
          closeWalletMain: dialogs.walletMain.close,
          closeAllDialogs: dialogs.closeAllDialogs,
        },
      });
    }
  }, [
    wallet.isConnected,
    wallet.isConnecting,
    wallet.publicKey,
    wallet.balance,
    wallet.coinCount,
    wallet.error,
    wallet.balanceError,
    wallet.hydratedCoins,
    wallet.unspentCoins,
    dialogs.sendFunds.isOpen,
    dialogs.receiveFunds.isOpen,
    dialogs.makeOffer.isOpen,
    dialogs.makeOffer.selectedNft,
    dialogs.activeOffers.isOpen,
    dialogs.nftDetails.isOpen,
    dialogs.nftDetails.selectedNft,
    dialogs.walletMain.isOpen,
    dialogs.isAnyDialogOpen,
    wallet.connectWallet,
    wallet.disconnectWallet,
    wallet.refreshWallet,
    dialogs.sendFunds.open,
    dialogs.sendFunds.close,
    dialogs.receiveFunds.open,
    dialogs.receiveFunds.close,
    dialogs.makeOffer.open,
    dialogs.makeOffer.close,
    dialogs.activeOffers.open,
    dialogs.activeOffers.close,
    dialogs.nftDetails.open,
    dialogs.nftDetails.close,
    dialogs.walletMain.open,
    dialogs.walletMain.close,
    dialogs.closeAllDialogs,
    onWalletUpdate,
  ]);

  const formatAddress = (address: string): string => {
    if (!address) return '';
    if (address.length > 20) {
      return `${address.slice(0, 10)}...${address.slice(-10)}`;
    }
    return address;
  };

  const formatBalance = (balance: number): string => {
    return (balance / 1e12).toFixed(6);
  };

  const handleTransactionSent = (transaction: any) => {
    console.log('Transaction sent from React bridge:', transaction);
    // Refresh wallet after successful transaction
    setTimeout(() => {
      wallet.refreshWallet();
    }, 1000);
  };

  return (
    <div className={`chia-wallet-bridge ${className}`} style={style}>
      {/* Connection Status */}
      <div className="bridge-status">
        <h3>🌱 Chia Wallet (React Bridge)</h3>
        
        {wallet.error && (
          <div className="alert alert-error">
            ❌ {wallet.error}
            <button 
              className="btn btn-sm"
              onClick={() => wallet.connectWallet()}
            >
              Retry
            </button>
          </div>
        )}

        {wallet.isConnected ? (
          <div className="wallet-connected">
            <div className="status-badge success">✅ Connected</div>
            <div className="wallet-info">
              <div className="info-row">
                <span className="label">Address:</span>
                <code className="value">{formatAddress(wallet.publicKey || '')}</code>
              </div>
              <div className="info-row">
                <span className="label">Balance:</span>
                <span className="value balance">
                  {wallet.balanceLoading ? (
                    '⟳ Loading...'
                  ) : wallet.balanceError ? (
                    <span className="error">Error loading</span>
                  ) : (
                    `${formatBalance(wallet.balance)} XCH`
                  )}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Coins:</span>
                <span className="value">{wallet.coinCount}</span>
              </div>
            </div>
            
            <div className="bridge-actions">
              <button
                className="btn btn-primary"
                onClick={dialogs.sendFunds.open}
                disabled={wallet.balance <= 0}
              >
                💸 Send Funds
              </button>
              
              <button
                className="btn btn-primary"
                onClick={dialogs.receiveFunds.open}
              >
                💰 Receive Funds
              </button>
              
              <button
                className="btn btn-secondary"
                onClick={wallet.refreshWallet}
                disabled={wallet.balanceLoading}
              >
                {wallet.balanceLoading ? '⟳' : '🔄'} Refresh
              </button>
              
              <button
                className="btn btn-secondary"
                onClick={() => dialogs.makeOffer.open()}
              >
                🤝 Make Offer
              </button>
              
              <button
                className="btn btn-secondary"
                onClick={dialogs.activeOffers.open}
              >
                📋 Active Offers
              </button>
            </div>
            
            {dialogs.isAnyDialogOpen && (
              <div className="dialog-indicator">
                <span>🔴 Dialog Open</span>
                <button 
                  className="btn btn-sm"
                  onClick={dialogs.closeAllDialogs}
                >
                  Close All
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="wallet-disconnected">
            <div className="status-badge error">❌ Disconnected</div>
            {!jwtToken && (
              <small className="error-text">JWT token required for connection</small>
            )}
            <button
              className="btn btn-primary"
              onClick={wallet.connectWallet}
              disabled={wallet.isConnecting || !jwtToken}
            >
              {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>

      {/* All the React Modal Components - using existing hooks */}
      <SendFundsModal
        isOpen={dialogs.sendFunds.isOpen}
        onClose={dialogs.sendFunds.close}
        client={wallet.client}
        publicKey={wallet.publicKey}
        unspentCoins={wallet.unspentCoins}
        onTransactionSent={handleTransactionSent}
      />

      <ReceiveFundsModal
        isOpen={dialogs.receiveFunds.isOpen}
        onClose={dialogs.receiveFunds.close}
        publicKey={wallet.publicKey}
      />

      <MakeOfferModal
        isOpen={dialogs.makeOffer.isOpen}
        onClose={dialogs.makeOffer.close}
        client={wallet.client}
        publicKey={wallet.publicKey}
        syntheticPublicKey={wallet.syntheticPublicKey}
        hydratedCoins={wallet.hydratedCoins}
        nftMetadata={new Map()}
        loadingMetadata={new Set()}
      />

      {/* Note: ActiveOffersModal and NFTDetailsModal require additional props */}
      {/* They can be added when needed with proper prop interfaces */}

      <style>{`
        .chia-wallet-bridge {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          margin: 1rem 0;
        }

        .bridge-status h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
          font-size: 1.25rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .status-badge.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-badge.error {
          background: #fef2f2;
          color: #dc2626;
        }

        .wallet-info {
          margin-bottom: 1rem;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .label {
          font-weight: 600;
          color: #64748b;
          min-width: 80px;
        }

        .value {
          color: #1e293b;
          font-family: monospace;
        }

        .value.balance {
          font-weight: 600;
          color: #16a34a;
        }

        .bridge-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .dialog-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4f46e5;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .alert {
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .error {
          color: #dc2626;
        }

        .error-text {
          color: #dc2626;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .bridge-actions {
            flex-direction: column;
          }
          
          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

// Main bridge component wrapped with DialogProvider
export const ChiaWalletBridge: React.FC<ChiaWalletBridgeProps> = (props) => {
  return (
    <DialogProvider>
      <ChiaWalletBridgeContent {...props} />
    </DialogProvider>
  );
};

export default ChiaWalletBridge; 