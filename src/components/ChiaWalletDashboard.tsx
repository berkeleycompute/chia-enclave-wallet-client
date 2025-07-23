import React, { useState, useEffect } from 'react';
import { ChiaWalletModalWithProvider } from './ChiaWalletModalWithProvider';
import { DialogProvider, useAllDialogs } from '../hooks/useDialogs';
import { useChiaWallet } from '../hooks/useChiaWallet';
import { SendFundsModal } from './SendFundsModal';
import { ReceiveFundsModal } from './ReceiveFundsModal';
import { MakeOfferModal } from './MakeOfferModal';
import { ActiveOffersModal } from './ActiveOffersModal';
import { NFTDetailsModal } from './NFTDetailsModal';
import type { HydratedCoin } from '../client/ChiaCloudWalletClient';

export interface ChiaWalletDashboardProps {
  jwtToken?: string | null;
  baseUrl?: string;
  enableLogging?: boolean;
  onWalletUpdate?: (walletState: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Internal dashboard component that uses the hooks
const ChiaWalletDashboardContent: React.FC<ChiaWalletDashboardProps> = ({
  jwtToken,
  baseUrl,
  enableLogging = true,
  onWalletUpdate,
  className = '',
  style = {},
}) => {
  const wallet = useChiaWallet({ 
    baseUrl, 
    enableLogging,
    autoConnect: false // We'll manually control connection
  });
  const dialogs = useAllDialogs();
  
  const [selectedNft, setSelectedNft] = useState<HydratedCoin | null>(null);
  // Add missing state management for NFT metadata
  const [nftMetadata, setNftMetadata] = useState<Map<string, any>>(new Map());
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());

  // Handle JWT token changes and connection
  useEffect(() => {
    if (jwtToken && jwtToken !== wallet.jwtToken) {
      // Connect with the new JWT token
      wallet.connect(jwtToken);
    } else if (!jwtToken && wallet.isConnected) {
      // Disconnect if JWT token is removed
      wallet.disconnect();
    }
  }, [jwtToken, wallet]);

  // Call onWalletUpdate when wallet state changes
  useEffect(() => {
    if (onWalletUpdate) {
      onWalletUpdate({
        isConnected: wallet.isConnected,
        isConnecting: wallet.isConnecting,
        publicKey: wallet.address, // Map address to publicKey for backward compatibility
        address: wallet.address,
        balance: wallet.balance,
        coinCount: wallet.coinCount,
        error: wallet.connectionError, // Use connectionError
        balanceError: wallet.balanceError,
        hydratedCoins: wallet.hydratedCoins,
        unspentCoins: wallet.unspentCoins,
      });
    }
  }, [
    wallet.isConnected,
    wallet.isConnecting,
    wallet.address,
    wallet.balance,
    wallet.coinCount,
    wallet.connectionError, // Updated from wallet.error
    wallet.balanceError,
    wallet.hydratedCoins,
    wallet.unspentCoins,
    onWalletUpdate,
  ]);

  const formatAddress = (address: string): string => {
    if (address.length > 20) {
      return `${address.slice(0, 10)}...${address.slice(-10)}`;
    }
    return address;
  };

  const formatBalance = (balance: number): string => {
    return (balance / 1e12).toFixed(6);
  };

  const handleNftClick = (nft: HydratedCoin) => {
    setSelectedNft(nft);
    dialogs.nftDetails.open(nft);
  };

  const handleMakeOffer = (nft?: HydratedCoin) => {
    if (nft) {
      setSelectedNft(nft);
    }
    dialogs.makeOffer.open(nft);
  };

  const handleTransactionSent = (transaction: any) => {
    console.log('Transaction sent:', transaction);
    // Refresh wallet after successful transaction
    setTimeout(() => {
      wallet.refreshBalance(); // Updated from wallet.refreshWallet()
    }, 1000);
  };

  const handleRefreshWallet = () => {
    wallet.refreshBalance(); // Updated from wallet.refreshWallet()
  };

  const handleOfferCreated = (offerData: any) => {
    console.log('Offer created:', offerData);
    // Handle offer creation if needed
  };

  const handleOfferUpdate = () => {
    console.log('Offer updated');
    // Handle offer update if needed
  };

  const handleConnect = () => {
    if (jwtToken) {
      wallet.connect(jwtToken);
    }
  };

  return (
    <div className={`chia-wallet-dashboard ${className}`} style={style}>
      {/* Header */}
      <div className="dashboard-header">
        <h2>🌱 Chia Wallet Dashboard</h2>
        <div className="header-actions">
          {wallet.isConnected ? (
            <button
              className="btn btn-secondary"
              onClick={handleRefreshWallet} // Updated to use handleRefreshWallet
              disabled={wallet.balanceLoading}
            >
              {wallet.balanceLoading ? '⟳' : '🔄'} Refresh
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleConnect} // Updated to use handleConnect
              disabled={wallet.isConnecting}
            >
              {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-status">
        {wallet.connectionError && ( // Updated from wallet.error
          <div className="alert alert-error">
            ❌ {wallet.connectionError}
            <button className="btn btn-sm" onClick={handleConnect}>
              Retry
            </button>
          </div>
        )}

        {wallet.isConnected ? (
          <div className="wallet-info">
            <div className="status-badge success">✅ Connected</div>
            <div className="wallet-details">
              <div className="detail-row">
                <span className="label">Address:</span>
                <code className="value">{formatAddress(wallet.address || '')}</code>
              </div>
              <div className="detail-row">
                <span className="label">Balance:</span>
                <span className="value balance">
                  {wallet.balanceLoading ? (
                    <span className="spinner">⟳</span>
                  ) : wallet.balanceError ? (
                    <span className="error">Error</span>
                  ) : (
                    `${formatBalance(wallet.balance)} XCH`
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Coins:</span>
                <span className="value">{wallet.coinCount}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="wallet-info">
            <div className="status-badge error">❌ Disconnected</div>
            {!jwtToken && (
              <small className="error-text">JWT token required for connection</small>
            )}
          </div>
        )}
      </div>

      {/* Main Actions */}
      {wallet.isConnected && (
        <div className="main-actions">
          <h3>💫 Actions</h3>
          <div className="action-grid">
            <button
              className="action-btn"
              onClick={dialogs.sendFunds.open}
              disabled={wallet.balance <= 0}
            >
              <span className="btn-icon">💸</span>
              <span className="btn-text">Send Funds</span>
            </button>

            <button
              className="action-btn"
              onClick={dialogs.receiveFunds.open}
            >
              <span className="btn-icon">💰</span>
              <span className="btn-text">Receive Funds</span>
            </button>

            <button
              className="action-btn"
              onClick={() => handleMakeOffer()}
            >
              <span className="btn-icon">🤝</span>
              <span className="btn-text">Make Offer</span>
            </button>

            <button
              className="action-btn"
              onClick={dialogs.activeOffers.open}
            >
              <span className="btn-icon">📋</span>
              <span className="btn-text">Active Offers</span>
            </button>
          </div>
        </div>
      )}

      {/* Assets Section */}
      {wallet.isConnected && wallet.hydratedCoins.length > 0 && (
        <div className="nft-section">
          <h3>🖼️ Wallet Assets</h3>
          <div className="assets-summary">
            <div className="asset-count">
              <strong>{wallet.hydratedCoins.length}</strong> assets found
            </div>
            <small>Including XCH coins and other assets</small>
          </div>
        </div>
      )}

      {/* Dialog Status */}
      {dialogs.isAnyDialogOpen && (
        <div className="dialog-status">
          <span className="status-dot">🔴</span>
          Dialog open
          <button className="btn btn-sm" onClick={dialogs.closeAllDialogs}>
            Close All
          </button>
        </div>
      )}

      {/* Modal Components */}
      <SendFundsModal
        isOpen={dialogs.sendFunds.isOpen}
        onClose={dialogs.sendFunds.close}
        onTransactionSent={handleTransactionSent}
      />

      <ReceiveFundsModal
        isOpen={dialogs.receiveFunds.isOpen}
        onClose={dialogs.receiveFunds.close}
      />

      <MakeOfferModal
        isOpen={dialogs.makeOffer.isOpen}
        onClose={dialogs.makeOffer.close}
        selectedNft={dialogs.makeOffer.selectedNft}
        onOfferCreated={handleOfferCreated}
        onRefreshWallet={handleRefreshWallet}
      />

      <ActiveOffersModal
        isOpen={dialogs.activeOffers.isOpen}
        onClose={dialogs.activeOffers.close}
        onOfferUpdate={handleOfferUpdate}
      />

      <NFTDetailsModal
        isOpen={dialogs.nftDetails.isOpen}
        onClose={dialogs.nftDetails.close}
        nft={dialogs.nftDetails.selectedNft}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .chia-wallet-dashboard {
          max-width: 800px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .dashboard-header h2 {
          margin: 0;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .connection-status {
          margin-bottom: 2rem;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .status-badge.success {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-badge.error {
          background: #fef2f2;
          color: #dc2626;
        }

        .wallet-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .main-actions {
          margin-bottom: 2rem;
        }

        .main-actions h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .action-btn:hover:not(:disabled) {
          border-color: #6366f1;
          background: #fafbff;
          transform: translateY(-2px);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 1.5rem;
        }

        .btn-text {
          font-weight: 600;
          color: #1e293b;
        }

        .nft-section {
          margin-bottom: 2rem;
        }

        .nft-section h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .nft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .nft-card {
          position: relative;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .nft-card:hover {
          border-color: #6366f1;
          transform: translateY(-2px);
        }

        .nft-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .nft-info {
          margin-bottom: 0.5rem;
        }

        .nft-type {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }

        .nft-amount {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 600;
        }

        .nft-offer-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 2rem;
          height: 2rem;
          border: none;
          border-radius: 50%;
          background: #6366f1;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: background-color 0.2s;
        }

        .nft-offer-btn:hover {
          background: #4f46e5;
        }

        .more-assets {
          text-align: center;
          color: #64748b;
          font-size: 0.875rem;
          padding: 0.5rem;
        }

        .dialog-status {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #1e293b;
          color: white;
          border-radius: 20px;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .status-dot {
          font-size: 0.75rem;
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
          text-decoration: none;
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

        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        .error {
          color: #dc2626;
        }

        .error-text {
          color: #dc2626;
          font-size: 0.875rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .chia-wallet-dashboard {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .action-grid {
            grid-template-columns: 1fr;
          }

          .nft-grid {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          }

          .dialog-status {
            left: 1rem;
            right: 1rem;
            justify-content: center;
          }
        }
      `}} />
    </div>
  );
};

// Main dashboard component wrapped with DialogProvider
export const ChiaWalletDashboard: React.FC<ChiaWalletDashboardProps> = (props) => {
  return (
    <DialogProvider>
      <ChiaWalletDashboardContent {...props} />
    </DialogProvider>
  );
};

export default ChiaWalletDashboard; 