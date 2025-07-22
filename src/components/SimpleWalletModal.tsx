import React, { useState } from 'react';
import { 
  useWalletConnection, 
  useWalletBalance, 
  useWalletCoins,
  useSendTransaction
} from '../hooks/useChiaWalletSDK';
import { ChiaCloudWalletClient } from '../client/ChiaCloudWalletClient';

export interface SimpleWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimpleWalletModal: React.FC<SimpleWalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'receive' | 'coins'>('overview');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [fee, setFee] = useState('0.00001');

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
    nftCoins 
  } = useWalletCoins();

  const { sendXCH, isSending } = useSendTransaction();

  const [jwtInput, setJwtInput] = useState('');

  const handleConnect = async () => {
    if (jwtInput.trim()) {
      await setJwtToken(jwtInput.trim());
    }
  };

  const handleSendTransaction = async () => {
    if (!recipientAddress.trim() || !sendAmount.trim()) {
      alert('Please fill in recipient address and amount');
      return;
    }

    try {
      const amountInMojos = Math.round(parseFloat(sendAmount) * 1000000000000).toString();
      const feeInMojos = Math.round(parseFloat(fee) * 1000000000000).toString();

      const result = await sendXCH({
        payments: [{
          address: recipientAddress.trim(),
          amount: amountInMojos
        }],
        selected_coins: [], // SDK will auto-select coins
        fee: feeInMojos
      });

      if (result.success) {
        alert('Transaction sent successfully!');
        setRecipientAddress('');
        setSendAmount('');
        refreshBalance();
      } else {
        alert(`Transaction failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Transaction error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 6)}`;
  };

  const formatBalance = (balance: number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(balance);
    return result.success ? result.data.toFixed(6) + ' XCH' : '0.000000 XCH';
  };

  if (!isOpen) return null;

  return (
    <div className="simple-wallet-modal-overlay">
      <div className="simple-wallet-modal">
        <div className="modal-header">
          <h2>🌱 Chia Wallet</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {!isConnected ? (
          // Connection Screen
          <div className="connection-screen">
            <div className="connection-status">
              <div className="status-icon">🔒</div>
              <h3>Connect Your Wallet</h3>
              <p>Enter your JWT token to connect to your Chia wallet</p>
            </div>
            
            <div className="jwt-input-section">
              <input
                type="password"
                placeholder="Enter JWT Token"
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                className="jwt-input"
              />
              <button 
                onClick={handleConnect}
                disabled={isConnecting || !jwtInput.trim()}
                className="connect-button"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        ) : (
          // Connected Screen
          <>
            {/* Tab Navigation */}
            <div className="tab-navigation">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'send', label: 'Send', icon: '💸' },
                { id: 'receive', label: 'Receive', icon: '📥' },
                { id: 'coins', label: 'Coins', icon: '🪙' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="wallet-info">
                    <div className="info-card">
                      <h4>Wallet Address</h4>
                      <p className="monospace">{formatAddress(address || '')}</p>
                      {email && <p className="email">Email: {email}</p>}
                    </div>
                    
                    <div className="balance-card">
                      <h4>Balance</h4>
                      <div className="balance-amount">
                        {balanceLoading ? (
                          <span>Loading...</span>
                        ) : (
                          <span className="balance-value">{formattedBalance}</span>
                        )}
                      </div>
                      <p className="coin-count">{coinCount} coins</p>
                      <button onClick={refreshBalance} disabled={balanceLoading} className="refresh-button">
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  <div className="quick-actions">
                    <button onClick={() => setActiveTab('send')} className="action-button send">
                      💸 Send XCH
                    </button>
                    <button onClick={() => setActiveTab('receive')} className="action-button receive">
                      📥 Receive
                    </button>
                    <button onClick={() => setActiveTab('coins')} className="action-button coins">
                      🪙 View Coins
                    </button>
                  </div>

                  <div className="disconnect-section">
                    <button onClick={disconnect} className="disconnect-button">
                      🔓 Disconnect Wallet
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'send' && (
                <div className="send-tab">
                  <h3>Send XCH</h3>
                  <div className="send-form">
                    <div className="form-group">
                      <label>Recipient Address</label>
                      <input
                        type="text"
                        placeholder="xch..."
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Amount (XCH)</label>
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="0.001"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Fee (XCH)</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={fee}
                          onChange={(e) => setFee(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleSendTransaction}
                      disabled={isSending || !recipientAddress.trim() || !sendAmount.trim()}
                      className="send-button"
                    >
                      {isSending ? '⏳ Sending...' : '💸 Send Transaction'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'receive' && (
                <div className="receive-tab">
                  <h3>Receive XCH</h3>
                  <div className="receive-info">
                    <p>Share your wallet address to receive XCH:</p>
                    <div className="address-display">
                      <code>{address}</code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(address || '')}
                        className="copy-button"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'coins' && (
                <div className="coins-tab">
                  <h3>Your Coins</h3>
                  <div className="coins-overview">
                    <div className="coin-type-card">
                      <h4>XCH Coins</h4>
                      <div className="coin-count">{xchCoins.length}</div>
                      <p>Standard XCH coins</p>
                    </div>
                    
                    <div className="coin-type-card">
                      <h4>CAT Coins</h4>
                      <div className="coin-count">{catCoins.length}</div>
                      <p>Custom Asset Tokens</p>
                    </div>
                    
                    <div className="coin-type-card">
                      <h4>NFT Coins</h4>
                      <div className="coin-count">{nftCoins.length}</div>
                      <p>Non-Fungible Tokens</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Styles */}
        <style>{`
          .simple-wallet-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .simple-wallet-modal {
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }

          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
            background: linear-gradient(135deg, #6bc36b, #4a9f4a);
            color: white;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
          }

          .close-button {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 1.5rem;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
          }

          .close-button:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .connection-screen {
            padding: 2rem;
            text-align: center;
          }

          .connection-status {
            margin-bottom: 2rem;
          }

          .status-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .connection-status h3 {
            margin: 0 0 0.5rem 0;
            color: #374151;
          }

          .connection-status p {
            margin: 0;
            color: #6b7280;
          }

          .jwt-input-section {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-width: 400px;
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

          .tab-navigation {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
            background: #f9fafb;
          }

          .tab-button {
            flex: 1;
            padding: 12px 16px;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-weight: 500;
            transition: all 0.2s;
            border-bottom: 3px solid transparent;
          }

          .tab-button:hover {
            background: #f3f4f6;
          }

          .tab-button.active {
            background: white;
            border-bottom-color: #6bc36b;
            color: #6bc36b;
          }

          .tab-icon {
            font-size: 1.2em;
          }

          .tab-content {
            flex: 1;
            padding: 1.5rem;
            overflow-y: auto;
          }

          .wallet-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .info-card, .balance-card {
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #f9fafb;
          }

          .info-card h4, .balance-card h4 {
            margin: 0 0 1rem 0;
            color: #374151;
            font-size: 1rem;
          }

          .monospace {
            font-family: monospace;
            font-size: 14px;
            color: #6b7280;
            word-break: break-all;
          }

          .email {
            margin-top: 0.5rem;
            font-size: 14px;
            color: #6b7280;
          }

          .balance-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #6bc36b;
          }

          .coin-count {
            margin: 0.5rem 0;
            color: #6b7280;
            font-size: 14px;
          }

          .refresh-button {
            padding: 8px 12px;
            background: #e5e7eb;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
          }

          .refresh-button:hover {
            background: #d1d5db;
          }

          .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .action-button {
            padding: 16px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .action-button.send {
            background: linear-gradient(45deg, #ef4444, #dc2626);
            color: white;
          }

          .action-button.receive {
            background: linear-gradient(45deg, #22c55e, #16a34a);
            color: white;
          }

          .action-button.coins {
            background: linear-gradient(45deg, #3b82f6, #2563eb);
            color: white;
          }

          .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }

          .disconnect-section {
            text-align: center;
          }

          .disconnect-button {
            padding: 12px 24px;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
            color: #6b7280;
            transition: all 0.2s;
          }

          .disconnect-button:hover {
            background: #e5e7eb;
            color: #374151;
          }

          .send-form {
            max-width: 400px;
          }

          .form-group {
            margin-bottom: 1rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1rem;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #374151;
          }

          .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
            box-sizing: border-box;
          }

          .form-input:focus {
            outline: none;
            border-color: #6bc36b;
          }

          .send-button {
            width: 100%;
            padding: 16px;
            background: linear-gradient(45deg, #ef4444, #dc2626);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 1rem;
          }

          .send-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
          }

          .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .address-display {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-top: 1rem;
          }

          .address-display code {
            flex: 1;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
          }

          .copy-button {
            padding: 8px 12px;
            background: #6bc36b;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
          }

          .coins-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
          }

          .coin-type-card {
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            text-align: center;
            background: #f9fafb;
          }

          .coin-type-card h4 {
            margin: 0 0 1rem 0;
            color: #374151;
          }

          .coin-count {
            font-size: 2rem;
            font-weight: 700;
            color: #6bc36b;
            margin-bottom: 0.5rem;
          }

          .coin-type-card p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .simple-wallet-modal {
              width: 95%;
              margin: 1rem;
            }

            .wallet-info {
              grid-template-columns: 1fr;
            }

            .form-row {
              grid-template-columns: 1fr;
            }

            .tab-button {
              font-size: 12px;
              padding: 10px 8px;
            }

            .tab-content {
              padding: 1rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
}; 