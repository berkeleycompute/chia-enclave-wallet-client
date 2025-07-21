import React from 'react';
import { UseChiaWalletResult } from '../hooks/useChiaWallet.ts';

export interface ChiaWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UseChiaWalletResult;
}

export const ChiaWalletModal: React.FC<ChiaWalletModalProps> = ({
  isOpen,
  onClose,
  wallet,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      <div 
        className="modal-overlay" 
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog" 
        aria-modal="true" 
        tabIndex={0}
      >
        <div className="modal-content" role="document" tabIndex={0}>
          <div className="modal-header">
            <div className="wallet-info">
              <div className="wallet-icon">
                <div className="chia-logo">🌱</div>
              </div>
              <div className="wallet-details">
                <h3>
                  {wallet.publicKey ? wallet.formatAddress(wallet.publicKey) : 'Chia Wallet'}
                </h3>
                <p className="connection-status">
                  {wallet.isConnecting ? 'Connecting...' : 
                   wallet.isConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="modal-body">
            {wallet.isConnecting ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Connecting to wallet...</p>
              </div>
            ) : wallet.error ? (
              <div className="error-state">
                <p className="error-message">{wallet.error}</p>
                <button className="retry-btn" onClick={wallet.connectWallet}>
                  Retry
                </button>
              </div>
            ) : wallet.isConnected ? (
              <div className="wallet-info-section">
                {/* Balance Section */}
                <div className="balance-section">
                  <div className="balance-item">
                    <div className="balance-icon">🌱</div>
                    <div className="balance-details">
                      <h4>Chia (XCH)</h4>
                      {wallet.balanceLoading ? (
                        <div className="balance-loading">
                          <div className="balance-spinner"></div>
                          <p className="balance-amount syncing">Syncing...</p>
                        </div>
                      ) : wallet.balanceError ? (
                        <div className="balance-error">
                          <p className="balance-amount error">Failed to load</p>
                          <button className="balance-retry" onClick={wallet.refreshWallet}>
                            Retry
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="balance-amount">
                            {wallet.formatBalance(wallet.balance)} XCH
                          </p>
                          <p className="balance-subtitle">{wallet.coinCount} coins</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button className="action-btn primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7,7 17,7 17,17"></polyline>
                    </svg>
                    Send
                  </button>
                  <button className="action-btn secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="17" y1="7" x2="7" y2="17"></line>
                      <polyline points="17,17 7,17 7,7"></polyline>
                    </svg>
                    Receive
                  </button>
                </div>

                {/* Disconnect Button */}
                <button className="disconnect-btn" onClick={wallet.disconnectWallet}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16,17 21,12 16,7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Disconnect Wallet</span>
                </button>
              </div>
            ) : (
              <div className="connect-state">
                <p>Connect your Chia wallet to get started</p>
                <button className="connect-btn" onClick={wallet.connectWallet}>
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #1a1a1a;
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #333;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          color: white;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wallet-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chia-logo {
          font-size: 24px;
        }

        .wallet-details h3 {
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .connection-status {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          color: white;
          background: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .loading-state, .error-state, .connect-state {
          text-align: center;
          padding: 40px 20px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top: 3px solid #6bc36b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: #ef4444;
          margin-bottom: 16px;
        }

        .retry-btn, .connect-btn {
          background: #6bc36b;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .retry-btn:hover, .connect-btn:hover {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .balance-section {
          margin-bottom: 24px;
        }

        .balance-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #262626;
          border-radius: 12px;
          border: 1px solid #333;
        }

        .balance-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #333;
          border-radius: 50%;
        }

        .balance-details h4 {
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .balance-amount {
          margin: 4px 0;
          color: #22c55e;
          font-size: 18px;
          font-weight: 700;
        }

        .balance-amount.syncing {
          color: #fb923c;
        }

        .balance-amount.error {
          color: #ef4444;
        }

        .balance-subtitle {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .balance-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .balance-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #333;
          border-top: 2px solid #fb923c;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .balance-error {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .balance-retry {
          background: #ef4444;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .balance-retry:hover {
          background: #dc2626;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: #6bc36b;
          color: white;
        }

        .action-btn.primary:hover {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .action-btn.secondary {
          background: #333;
          color: white;
        }

        .action-btn.secondary:hover {
          background: #404040;
          transform: translateY(-1px);
        }

        .disconnect-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: none;
          border: 1px solid #333;
          color: #888;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .disconnect-btn:hover {
          background: #333;
          color: white;
        }
      `}</style>
    </>
  );
}; 