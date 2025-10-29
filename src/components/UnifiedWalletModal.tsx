import React, { useState, useEffect } from 'react';
import { RiLeafFill } from 'react-icons/ri';
import { ChiaWalletModal, ChiaWalletModalProps } from './ChiaWalletModal';
import { UnifiedWalletClient } from '../client/UnifiedWalletClient';

// Modal styles
import { sharedModalStyles } from './modal-styles';

// ThirdWeb fallback components for when package is not installed
const FallbackConnectButton: React.FC<any> = (props) => (
  <button
    style={{
      padding: '12px 24px',
      background: '#0052ff',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600'
    }}
    onClick={() => console.log('ThirdWeb ConnectButton clicked (fallback mode)')}
  >
    {props.connectButton?.label || props.detailsButton ? 'Base Wallet (Demo)' : 'Connect Base Wallet (Demo)'}
  </button>
);

const FallbackTransactionButton: React.FC<any> = ({ children, ...props }) => (
  <button
    style={{
      padding: '8px 16px',
      background: '#6366f1',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    }}
    onClick={() => console.log('TransactionButton clicked (fallback mode)')}
  >
    {children}
  </button>
);

const FallbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

// Mock account type
interface MockAccount {
  address: string;
}

// Mock balance type
interface MockBalance {
  displayValue: string;
  symbol: string;
}

// ThirdWeb components and hooks (using fallback implementations)
const ThirdwebProvider = FallbackProvider;
const ConnectButton = FallbackConnectButton;
const useActiveAccount = (): MockAccount | null => null;
const useActiveWallet = () => null;
const useWalletBalance = (config: any): { data: MockBalance | null } => ({ data: null });
const useSendTransaction = () => ({ mutate: (config: any) => { }, isPending: false });
const useDisconnect = () => ({ disconnect: async (wallet: any) => { } });
const TransactionButton = FallbackTransactionButton;

// Mock client and chain
const client = { clientId: 'fallback-client' };
const base = { id: 8453, name: 'Base' };
const supportedWallets: any[] = [];

export interface UnifiedWalletModalProps extends Omit<ChiaWalletModalProps, 'walletClient'> {
  walletClient?: UnifiedWalletClient;
  defaultTab?: 'chia' | 'base' | 'unified';
  enableBaseChain?: boolean;
}

type TabType = 'chia' | 'base' | 'unified';



export const UnifiedWalletModal: React.FC<UnifiedWalletModalProps> = ({
  isOpen,
  onClose,
  jwtToken,
  onWalletUpdate,
  walletClient,
  defaultTab = 'unified',
  enableBaseChain = true,
  ...chiaModalProps
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [showChiaModal, setShowChiaModal] = useState(false);

  // ThirdWeb hooks
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { data: balance } = useWalletBalance({
    client,
    account: activeAccount || undefined,
    chain: base,
  });
  const { mutate: sendTransaction, isPending: isSending } = useSendTransaction();

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const chiaConnected = walletClient?.isConnected || false;
  const baseConnected = !!activeAccount;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chia':
        return (
          <div className="tab-content">
            <div className="chia-section">
              <div className="section-header">
                <h3>
                  <RiLeafFill style={{ color: '#00ff88', fontSize: '20px' }} />
                  Chia Wallet
                </h3>
                <div className={`connection-status ${chiaConnected ? 'connected' : 'disconnected'}`}>
                  {chiaConnected ? '✅ Connected' : '❌ Disconnected'}
                </div>
              </div>

              {chiaConnected && walletClient ? (
                <div className="wallet-info">
                  <div className="info-row">
                    <span className="label">Address:</span>
                    <span className="value">{walletClient.formatAddress()}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Balance:</span>
                    <span className="value">{walletClient.formattedBalance} XCH</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Coins:</span>
                    <span className="value">{walletClient.coinCount}</span>
                  </div>

                  <div className="action-buttons">
                    <button
                      onClick={() => setShowChiaModal(true)}
                      className="primary-button"
                    >
                      Open Full Chia Wallet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="not-connected">
                  <p>Connect your Chia wallet to manage XCH, CAT tokens, and NFTs</p>
                  <div className="action-buttons">
                    <button
                      onClick={() => setShowChiaModal(true)}
                      className="primary-button"
                    >
                      Connect Chia Wallet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'base':
        return (
          <div className="tab-content">
            <div className="base-section">
              <div className="section-header">
                <h3>
                  🔷 Base Chain
                </h3>
                <div className={`connection-status ${baseConnected ? 'connected' : 'disconnected'}`}>
                  {baseConnected ? '✅ Connected' : '❌ Disconnected'}
                </div>
              </div>

              {baseConnected && activeAccount ? (
                <div className="wallet-info">
                  <div className="info-row">
                    <span className="label">Address:</span>
                    <span className="value">
                      {activeAccount?.address ?
                        `${activeAccount.address.slice(0, 10)}...${activeAccount.address.slice(-8)}` :
                        'Connected'
                      }
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Chain:</span>
                    <span className="value">Base ({base.id})</span>
                  </div>
                  {balance && (
                    <div className="info-row">
                      <span className="label">ETH Balance:</span>
                      <span className="value">{balance.displayValue} {balance.symbol}</span>
                    </div>
                  )}

                  <div className="base-actions">
                    <h4>💸 Transaction Actions</h4>
                    <div className="action-buttons">
                      <button
                        onClick={() => {
                          if (activeAccount?.address) {
                            sendTransaction({
                              account: activeAccount,
                              to: "0x0000000000000000000000000000000000000000",
                              value: BigInt("1000000000000000"), // 0.001 ETH
                              chain: base,
                              client,
                            });
                          }
                        }}
                        disabled={isSending || !balance}
                        className="primary-button"
                      >
                        {isSending ? 'Sending...' : 'Send 0.001 ETH (Demo)'}
                      </button>

                      <TransactionButton
                        transaction={{
                          to: "0x0000000000000000000000000000000000000000",
                          value: BigInt("1000000000000000"),
                          chain: base,
                          client,
                        }}
                        onTransactionSent={(result: any) => {
                          console.log("Transaction sent:", result);
                        }}
                        onTransactionConfirmed={(receipt: any) => {
                          console.log("Transaction confirmed:", receipt);
                        }}
                      >
                        Send with TransactionButton
                      </TransactionButton>
                    </div>
                  </div>

                  <div className="thirdweb-connect-container">
                    <ConnectButton
                      client={client}
                      chain={base}
                      wallets={supportedWallets}
                      detailsButton={{
                        displayBalanceToken: {
                          [base.id]: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base
                        },
                      }}
                      detailsModal={{
                        assetTabs: ['token', 'nft'],
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="not-connected">
                  <p>Connect your Base wallet to manage tokens and interact with Base chain</p>
                  <div className="thirdweb-connect-container">
                    <ConnectButton
                      client={client}
                      chain={base}
                      wallets={supportedWallets}
                      connectButton={{
                        label: 'Connect Base Wallet',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'unified':
        return (
          <div className="tab-content">
            <div className="unified-section">
              <div className="section-header">
                <h3>🔗 Unified Portfolio</h3>
                <div className="connection-summary">
                  <span className={`chain-status ${chiaConnected ? 'connected' : 'disconnected'}`}>
                    <RiLeafFill style={{ color: '#00ff88', fontSize: '16px' }} />
                    {chiaConnected ? '✅' : '❌'}
                  </span>
                  <span className={`chain-status ${baseConnected ? 'connected' : 'disconnected'}`}>
                    🔷 {baseConnected ? '✅' : '❌'}
                  </span>
                </div>
              </div>

              <div className="portfolio-grid">
                <div className="portfolio-card chia-card">
                  <div className="card-header">
                    <h4>
                      <RiLeafFill style={{ color: '#00ff88', fontSize: '18px' }} />
                      Chia Portfolio
                    </h4>
                    <div className={`status-badge ${chiaConnected ? 'connected' : 'disconnected'}`}>
                      {chiaConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>

                  {chiaConnected && walletClient ? (
                    <div className="portfolio-details">
                      <div className="balance-display">
                        <span className="balance-amount">{walletClient.formattedBalance}</span>
                        <span className="balance-unit">XCH</span>
                      </div>
                      <div className="portfolio-stats">
                        <div className="stat">
                          <span className="stat-label">Coins:</span>
                          <span className="stat-value">{walletClient.coinCount}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Address:</span>
                          <span className="stat-value">{walletClient.formatAddress()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowChiaModal(true)}
                        className="card-action-button"
                      >
                        Manage Chia
                      </button>
                    </div>
                  ) : (
                    <div className="not-connected-card">
                      <p>Connect to view your Chia portfolio</p>
                      <button
                        onClick={() => setShowChiaModal(true)}
                        className="card-action-button secondary"
                      >
                        Connect Chia
                      </button>
                    </div>
                  )}
                </div>

                <div className="portfolio-card base-card">
                  <div className="card-header">
                    <h4>🔷 Base Portfolio</h4>
                    <div className={`status-badge ${baseConnected ? 'connected' : 'disconnected'}`}>
                      {baseConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>

                  {baseConnected && activeAccount ? (
                    <div className="portfolio-details">
                      <div className="balance-display">
                        <span className="balance-amount">{balance?.displayValue || '0'}</span>
                        <span className="balance-unit">{balance?.symbol || 'ETH'}</span>
                      </div>
                      <div className="portfolio-stats">
                        <div className="stat">
                          <span className="stat-label">Address:</span>
                          <span className="stat-value">
                            {activeAccount?.address ?
                              `${activeAccount.address.slice(0, 8)}...${activeAccount.address.slice(-6)}` :
                              'Connected'
                            }
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Chain:</span>
                          <span className="stat-value">Base ({base.id})</span>
                        </div>
                      </div>
                      <div className="thirdweb-connect-container compact">
                        <ConnectButton
                          client={client}
                          chain={base}
                          wallets={supportedWallets}
                          detailsButton={{
                            displayBalanceToken: {
                              [base.id]: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                            },
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="not-connected-card">
                      <p>Connect to view your Base portfolio</p>
                      <div className="thirdweb-connect-container compact">
                        <ConnectButton
                          client={client}
                          chain={base}
                          wallets={supportedWallets}
                          connectButton={{
                            label: 'Connect Base',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {chiaConnected && baseConnected && (
                <div className="cross-chain-features">
                  <h4>🚀 Cross-Chain Features</h4>
                  <p>Both wallets connected! You can now manage your multi-chain portfolio.</p>
                  <div className="feature-buttons">
                    <button
                      onClick={() => setActiveTab('chia')}
                      className="feature-button"
                    >
                      <RiLeafFill style={{ color: '#00ff88' }} />
                      Chia Features
                    </button>
                    <button
                      onClick={() => setActiveTab('base')}
                      className="feature-button"
                    >
                      🔷 Base Features
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}
        onClick={handleOverlayClick}
        className="unified-wallet-modal-overlay"
      >
        <div
          style={{
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
          }}
          className="unified-wallet-modal-container rounded-2xl overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="modal-header">
            <h2>🔗 Unified Wallet</h2>
            <button
              onClick={onClose}
              className="header-btn"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              onClick={() => setActiveTab('unified')}
              className={`tab-button ${activeTab === 'unified' ? 'active' : ''}`}
            >
              🔗 Unified
            </button>
            <button
              onClick={() => setActiveTab('chia')}
              className={`tab-button ${activeTab === 'chia' ? 'active' : ''}`}
            >
              <RiLeafFill style={{ color: '#00ff88', fontSize: '16px' }} />
              Chia
            </button>
            {enableBaseChain && (
              <button
                onClick={() => setActiveTab('base')}
                className={`tab-button ${activeTab === 'base' ? 'active' : ''}`}
              >
                🔷 Base
              </button>
            )}
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </div>

      {/* Chia Wallet Modal */}
      {walletClient && (
        <ChiaWalletModal
          isOpen={showChiaModal}
          onClose={() => setShowChiaModal(false)}
          walletClient={walletClient}
          jwtToken={jwtToken}
          onWalletUpdate={onWalletUpdate}
          {...chiaModalProps}
        />
      )}

      {/* Custom Styles */}
      <style>{`
        .unified-wallet-modal-overlay {
          z-index: 10000;
        }

        .unified-wallet-modal-container {
          background: var(--color-bg, #1a1b23);
          border: 1px solid var(--color-border, #2a2b35);
          color: var(--color-text, #ffffff);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid var(--color-border, #2a2b35);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 24px;
          color: var(--color-text, #ffffff);
        }

        /* Using shared .header-btn styles injected globally */

        .tab-navigation {
          display: flex;
          border-bottom: 1px solid var(--color-border, #2a2b35);
        }

        .tab-button {
          flex: 1;
          padding: 16px 24px;
          background: none;
          border: none;
          color: var(--color-text-secondary, #9ca3af);
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-bottom: 2px solid transparent;
        }

        .tab-button:hover {
          background: var(--color-surface, #2a2b35);
          color: var(--color-text, #ffffff);
        }

        .tab-button.active {
          color: var(--color-primary, #10b981);
          border-bottom-color: var(--color-primary, #10b981);
          background: var(--color-surface, #2a2b35);
        }

        .tab-content {
          padding: 24px;
          min-height: 400px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .connection-status {
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .connection-status.connected {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .connection-status.disconnected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .connection-summary {
          display: flex;
          gap: 12px;
        }

        .chain-status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .chain-status.connected {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .chain-status.disconnected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .wallet-info {
          background: var(--color-surface, #2a2b35);
          border-radius: 12px;
          padding: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .label {
          color: var(--color-text-secondary, #9ca3af);
          font-weight: 500;
        }

        .value {
          color: var(--color-text, #ffffff);
          font-family: monospace;
        }

        .not-connected {
          text-align: center;
          padding: 40px 20px;
          color: var(--color-text-secondary, #9ca3af);
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        }

        .primary-button {
          background: var(--color-primary, #10b981);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .primary-button:hover {
          background: var(--color-primary-hover, #059669);
        }

        .thirdweb-connect-container {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }

        .thirdweb-connect-container.compact {
          margin-top: 12px;
        }

        .portfolio-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .portfolio-card {
          background: var(--color-surface, #2a2b35);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid var(--color-border, #374151);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header h4 {
          margin: 0;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.connected {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .status-badge.disconnected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .portfolio-details {
          text-align: center;
        }

        .balance-display {
          margin-bottom: 20px;
        }

        .balance-amount {
          display: block;
          font-size: 32px;
          font-weight: 700;
          color: var(--color-text, #ffffff);
        }

        .balance-unit {
          font-size: 16px;
          color: var(--color-text-secondary, #9ca3af);
        }

        .portfolio-stats {
          margin-bottom: 20px;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .stat-label {
          color: var(--color-text-secondary, #9ca3af);
        }

        .stat-value {
          color: var(--color-text, #ffffff);
          font-family: monospace;
        }

        .card-action-button {
          width: 100%;
          background: var(--color-primary, #10b981);
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .card-action-button:hover {
          background: var(--color-primary-hover, #059669);
        }

        .card-action-button.secondary {
          background: var(--color-surface-elevated, #374151);
          color: var(--color-text, #ffffff);
        }

        .card-action-button.secondary:hover {
          background: var(--color-surface-elevated-hover, #4b5563);
        }

        .not-connected-card {
          text-align: center;
          padding: 20px;
          color: var(--color-text-secondary, #9ca3af);
        }

        .cross-chain-features {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .cross-chain-features h4 {
          margin: 0 0 12px 0;
          color: var(--color-text, #ffffff);
        }

        .cross-chain-features p {
          margin: 0 0 20px 0;
          color: var(--color-text-secondary, #9ca3af);
        }

        .feature-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .feature-button {
          background: var(--color-surface, #2a2b35);
          color: var(--color-text, #ffffff);
          border: 1px solid var(--color-border, #374151);
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .feature-button:hover {
          background: var(--color-surface-elevated, #374151);
          border-color: var(--color-primary, #10b981);
        }

        @media (max-width: 768px) {
          .portfolio-grid {
            grid-template-columns: 1fr;
          }
          
          .tab-button {
            padding: 12px 16px;
            font-size: 14px;
          }
          
          .feature-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
};

// Wrapper component that provides ThirdWeb context
export const UnifiedWalletModalWithProvider: React.FC<UnifiedWalletModalProps> = (props) => {
  return (
    <ThirdwebProvider>
      <UnifiedWalletModal {...props} />
    </ThirdwebProvider>
  );
};

export default UnifiedWalletModalWithProvider;
