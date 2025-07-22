import React, { useState } from 'react';
import { 
  useWalletConnection, 
  useWalletBalance, 
  useWalletCoins,
  useWalletEvents
} from '../hooks/useChiaWalletSDK';
import { ChiaCloudWalletClient } from '../client/ChiaCloudWalletClient';
import { SendFundsModal } from './SendFundsModal';
import { SimpleWalletModal } from './SimpleWalletModal';

export interface SimpleDashboardProps {
  className?: string;
  style?: React.CSSProperties;
  onWalletUpdate?: (walletState: any) => void;
  showFullModal?: boolean; // Whether to show full modal or just basic info
}

export const SimpleDashboard: React.FC<SimpleDashboardProps> = ({
  className = '',
  style = {},
  onWalletUpdate,
  showFullModal = false
}) => {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Use the new simplified hooks
  const { 
    isConnected, 
    isConnecting, 
    address, 
    email, 
    jwtToken,
    connect, 
    disconnect, 
    setJwtToken 
  } = useWalletConnection();
  
  const { 
    totalBalance, 
    coinCount, 
    formattedBalance, 
    isLoading: balanceLoading,
    refresh: refreshBalance 
  } = useWalletBalance();

  const { 
    xchCoins, 
    catCoins, 
    nftCoins,
    isLoading: coinsLoading 
  } = useWalletCoins();

  const { events } = useWalletEvents();

  // Call onWalletUpdate when state changes
  React.useEffect(() => {
    if (onWalletUpdate) {
      onWalletUpdate({
        isConnected,
        address,
        totalBalance,
        coinCount,
        formattedBalance
      });
    }
  }, [isConnected, address, totalBalance, coinCount, formattedBalance, onWalletUpdate]);

  const [jwtInput, setJwtInput] = useState('');

  const handleConnect = async () => {
    if (jwtInput.trim()) {
      await setJwtToken(jwtInput.trim());
    }
  };

  const formatAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };

  const getRecentEvent = () => {
    return events[events.length - 1];
  };

  if (!isConnected) {
    return (
      <div className={`simple-dashboard not-connected ${className}`} style={style}>
        <div className="connect-section">
          <div className="connect-header">
            <div className="status-indicator disconnected">🔒</div>
            <h3>Connect Chia Wallet</h3>
          </div>
          
          <div className="connect-form">
            <input
              type="password"
              placeholder="Enter JWT Token"
              value={jwtInput}
              onChange={(e) => setJwtInput(e.target.value)}
              className="jwt-input"
              onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button 
              onClick={handleConnect}
              disabled={isConnecting || !jwtInput.trim()}
              className="connect-button"
            >
              {isConnecting ? '🔄 Connecting...' : '🌱 Connect'}
            </button>
          </div>
        </div>

        <style>{`
          .simple-dashboard {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: white;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }

          .simple-dashboard.not-connected {
            padding: 2rem;
            text-align: center;
          }

          .connect-header {
            margin-bottom: 1.5rem;
          }

          .status-indicator {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }

          .connect-header h3 {
            margin: 0;
            color: #374151;
          }

          .connect-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-width: 300px;
            margin: 0 auto;
          }

          .jwt-input {
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
          }

          .jwt-input:focus {
            outline: none;
            border-color: #6bc36b;
          }

          .connect-button {
            padding: 12px 24px;
            background: linear-gradient(45deg, #6bc36b, #4a9f4a);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .connect-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(107, 195, 107, 0.3);
          }

          .connect-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`simple-dashboard connected ${className}`} style={style}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="wallet-status">
          <div className="status-indicator connected">✅</div>
          <div className="wallet-info">
            <span className="wallet-address">{formatAddress(address || '')}</span>
            {email && <span className="wallet-email">{email}</span>}
          </div>
        </div>
        <button onClick={disconnect} className="disconnect-button" title="Disconnect">
          🔓
        </button>
      </div>

      {/* Balance Section */}
      <div className="balance-section">
        <div className="balance-card">
          <h4>Total Balance</h4>
          {balanceLoading ? (
            <div className="balance-loading">⏳ Loading...</div>
          ) : (
            <div className="balance-amount">{formattedBalance}</div>
          )}
          <div className="coin-count">{coinCount} coins</div>
        </div>
        <button 
          onClick={refreshBalance} 
          disabled={balanceLoading}
          className="refresh-button"
          title="Refresh Balance"
        >
          🔄
        </button>
      </div>

      {/* Coins Overview */}
      <div className="coins-overview">
        <div className="coin-type">
          <span className="coin-icon">💰</span>
          <span className="coin-label">XCH</span>
          <span className="coin-count">{coinsLoading ? '...' : xchCoins.length}</span>
        </div>
        <div className="coin-type">
          <span className="coin-icon">🏷️</span>
          <span className="coin-label">CAT</span>
          <span className="coin-count">{coinsLoading ? '...' : catCoins.length}</span>
        </div>
        <div className="coin-type">
          <span className="coin-icon">🖼️</span>
          <span className="coin-label">NFT</span>
          <span className="coin-count">{coinsLoading ? '...' : nftCoins.length}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          onClick={() => setShowSendModal(true)}
          className="action-button send"
          disabled={totalBalance === 0}
        >
          💸 Send
        </button>
        <button 
          onClick={() => setShowWalletModal(true)}
          className="action-button receive"
        >
          📥 Receive
        </button>
        {showFullModal && (
          <button 
            onClick={() => setShowWalletModal(true)}
            className="action-button details"
          >
            📊 Details
          </button>
        )}
      </div>

      {/* Recent Activity */}
      {events.length > 0 && (
        <div className="recent-activity">
          <h5>Recent Activity</h5>
          <div className="activity-item">
            <span className="activity-icon">
              {getRecentEvent()?.event === 'balanceChanged' ? '💰' : 
               getRecentEvent()?.event === 'connectionChanged' ? '🔗' : 
               getRecentEvent()?.event === 'transactionCompleted' ? '✅' : '📝'}
            </span>
            <span className="activity-text">
              {getRecentEvent()?.event.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </span>
            <span className="activity-time">
              {new Date(getRecentEvent()?.timestamp || 0).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      <SendFundsModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onTransactionSent={() => {
          console.log('Transaction sent');
          // Could emit an event or update parent state here
        }}
      />

      <SimpleWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <style>{`
        .simple-dashboard.connected {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #6bc36b, #4a9f4a);
          color: white;
        }

        .wallet-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-indicator.connected {
          font-size: 1.2rem;
        }

        .wallet-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .wallet-address {
          font-family: monospace;
          font-weight: 600;
          font-size: 14px;
        }

        .wallet-email {
          font-size: 12px;
          opacity: 0.9;
        }

        .disconnect-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .disconnect-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .balance-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .balance-card h4 {
          margin: 0 0 0.5rem 0;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }

        .balance-amount {
          font-size: 1.5rem;
          font-weight: 700;
          color: #6bc36b;
          margin-bottom: 0.25rem;
        }

        .balance-loading {
          font-size: 1rem;
          color: #6b7280;
        }

        .coin-count {
          font-size: 12px;
          color: #6b7280;
        }

        .refresh-button {
          padding: 8px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-button:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .coins-overview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .coin-type {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .coin-icon {
          font-size: 1.5rem;
        }

        .coin-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .coin-type .coin-count {
          font-weight: 600;
          color: #374151;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .action-button {
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .action-button.send {
          background: linear-gradient(45deg, #ef4444, #dc2626);
          color: white;
        }

        .action-button.receive {
          background: linear-gradient(45deg, #22c55e, #16a34a);
          color: white;
        }

        .action-button.details {
          background: linear-gradient(45deg, #3b82f6, #2563eb);
          color: white;
        }

        .action-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .recent-activity {
          padding: 1rem 1.5rem;
        }

        .recent-activity h5 {
          margin: 0 0 0.75rem 0;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 6px;
        }

        .activity-icon {
          font-size: 1rem;
        }

        .activity-text {
          flex: 1;
          font-size: 14px;
          color: #374151;
          text-transform: capitalize;
        }

        .activity-time {
          font-size: 12px;
          color: #6b7280;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .dashboard-header {
            padding: 1rem;
          }

          .balance-section {
            padding: 1rem;
          }

          .action-buttons {
            grid-template-columns: 1fr 1fr;
            padding: 1rem;
          }

          .coins-overview {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}; 