import React, { useState, useEffect } from 'react';
import { 
  useWalletConnection, 
  useWalletCoins, 
  useSendTransaction
} from '../hooks/useChiaWalletSDK';
import { ChiaCloudWalletClient, type Coin } from '../client/ChiaCloudWalletClient';

interface SendFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionSent?: (transaction: any) => void;
  // New props for initial values from global dialog system
  initialRecipientAddress?: string;
  initialAmount?: string;
  initialFee?: string;
}

export const SendFundsModal: React.FC<SendFundsModalProps> = ({ 
  isOpen, 
  onClose, 
  onTransactionSent,
  initialRecipientAddress,
  initialAmount,
  initialFee
}) => {
  const [recipientAddress, setRecipientAddress] = useState(initialRecipientAddress || '');
  const [amount, setAmount] = useState(initialAmount || '');
  const [fee, setFee] = useState(initialFee || '0.00001');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use the new SDK hooks
  const { isConnected } = useWalletConnection();
  const { xchCoins, isLoading: coinsLoading } = useWalletCoins();
  const { sendXCH, isSending } = useSendTransaction();

  // Update initial values when props change
  useEffect(() => {
    if (initialRecipientAddress) setRecipientAddress(initialRecipientAddress);
    if (initialAmount) setAmount(initialAmount);
    if (initialFee) setFee(initialFee);
  }, [initialRecipientAddress, initialAmount, initialFee]);

  // Clear form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      // Only clear if not using initial values
      if (!initialRecipientAddress && !initialAmount) {
        setRecipientAddress('');
        setAmount('');
      }
    }
  }, [isOpen, initialRecipientAddress, initialAmount]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('Wallet not connected');
      return;
    }

    if (!recipientAddress.trim() || !amount.trim()) {
      setError('Please fill in recipient address and amount');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Convert XCH amounts to mojos
      const amountInMojos = Math.round(parseFloat(amount) * 1000000000000).toString();
      const feeInMojos = Math.round(parseFloat(fee) * 1000000000000).toString();
      const totalNeededMojos = parseInt(amountInMojos) + parseInt(feeInMojos);

      // Check if we have enough balance
      const availableBalance = getAvailableBalance();
      if (totalNeededMojos > availableBalance) {
        setError(`Insufficient balance. Need ${formatXCH(totalNeededMojos)} XCH, have ${formatXCH(availableBalance)} XCH`);
        return;
      }

      // Select coins for the transaction
      const selectedCoins = selectCoinsForAmount(totalNeededMojos);
      if (!selectedCoins || selectedCoins.length === 0) {
        setError('Unable to select coins for transaction. Please try again.');
        return;
      }

      const request = {
        payments: [{
          address: recipientAddress.trim(),
          amount: amountInMojos
        }],
        selected_coins: selectedCoins,
        fee: feeInMojos
      };

      const result = await sendXCH(request);

      if (result.success) {
        setSuccess(`Transaction sent successfully! Transaction ID: ${result.data.transaction_id}`);
        
        // Call callback if provided
        if (onTransactionSent) {
          onTransactionSent({
            id: result.data.transaction_id,
            type: 'outgoing',
            amount: parseFloat(amount),
            recipient: recipientAddress.trim(),
            fee: parseFloat(fee),
            timestamp: Date.now(),
            status: 'pending',
            transactionId: result.data.transaction_id
          });
        }

        // Clear form on success
        setRecipientAddress('');
        setAmount('');
        setFee('0.00001');

        // Auto-close after delay
        setTimeout(() => {
          onClose();
        }, 2000);

      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  const formatXCH = (mojos: string | number): string => {
    const result = ChiaCloudWalletClient.mojosToXCH(mojos);
    return result.success ? result.data.toFixed(6) : '0';
  };

  const getAvailableBalance = (): number => {
    return xchCoins.reduce((total, coin) => total + parseInt(coin.coin.amount), 0);
  };

  const getFormattedAvailableBalance = (): string => {
    const totalMojos = getAvailableBalance();
    return formatXCH(totalMojos);
  };

  // Select coins for transaction using greedy algorithm
  const selectCoinsForAmount = (totalNeededMojos: number): Coin[] | null => {
    if (!xchCoins || xchCoins.length === 0) {
      return null;
    }

    // Convert HydratedCoins to Coins format and sort by amount descending
    const availableCoins = xchCoins
      .map(hydratedCoin => hydratedCoin.coin)
      .sort((a, b) => parseInt(b.amount) - parseInt(a.amount));

    const selectedCoins = [];
    let totalSelected = 0;

    // Greedy selection: pick coins until we have enough
    for (const coin of availableCoins) {
      selectedCoins.push(coin);
      totalSelected += parseInt(coin.amount);

      if (totalSelected >= totalNeededMojos) {
        break;
      }
    }

    // Check if we have enough
    if (totalSelected < totalNeededMojos) {
      return null;
    }

    return selectedCoins;
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-overlay send-modal-overlay"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <div className="modal-content send-modal-content" role="document" tabIndex={0}>
          <div className="modal-header">
            <div className="header-content">
              <div className="wallet-icon">
                <div className="chia-logo">🌱</div>
              </div>
              <h3>Send XCH</h3>
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="modal-body">
            {!isConnected ? (
              <div className="error-state">
                <p className="error-message">Wallet not connected. Please connect your wallet first.</p>
              </div>
            ) : coinsLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading wallet data...</p>
              </div>
            ) : (
              <div className="send-content">
                {/* Balance Info */}
                <div className="balance-section">
                  <div className="balance-item">
                    <div className="balance-icon">🌱</div>
                    <div className="balance-details">
                      <h4>Available Balance</h4>
                      <p className="balance-amount">{getFormattedAvailableBalance()} XCH</p>
                      <p className="balance-subtitle">{xchCoins.length} coins available</p>
                    </div>
                  </div>
                </div>

                {/* Send Form */}
                <form onSubmit={handleSubmit} className="send-form">
                  {/* Recipient Address */}
                  <div className="form-section">
                    <label htmlFor="recipient">Recipient Address</label>
                    <div className="input-container">
                      <input
                        id="recipient"
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="xch1..."
                        className="form-input address-input"
                        required
                      />
                      <div className="input-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Amount and Fee */}
                  <div className="form-row">
                    <div className="form-section">
                      <label htmlFor="amount">Amount</label>
                      <div className="input-container">
                        <input
                          id="amount"
                          type="number"
                          step="0.000001"
                          min="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.001"
                          className="form-input amount-input"
                          required
                        />
                        <div className="currency-label">XCH</div>
                      </div>
                    </div>

                    <div className="form-section">
                      <label htmlFor="fee">Network Fee</label>
                      <div className="input-container">
                        <input
                          id="fee"
                          type="number"
                          step="0.000001"
                          min="0"
                          value={fee}
                          onChange={(e) => setFee(e.target.value)}
                          className="form-input fee-input"
                          required
                        />
                        <div className="currency-label">XCH</div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Summary */}
                  <div className="transaction-summary">
                    <div className="summary-header">
                      <h4>Transaction Summary</h4>
                    </div>
                    <div className="summary-details">
                      <div className="summary-row">
                        <span>Send Amount:</span>
                        <span className="amount-value">{amount || '0'} XCH</span>
                      </div>
                      <div className="summary-row">
                        <span>Network Fee:</span>
                        <span className="fee-value">{fee || '0'} XCH</span>
                      </div>
                      <div className="summary-row total-row">
                        <span>Total:</span>
                        <span className="total-value">
                          {(parseFloat(amount || '0') + parseFloat(fee || '0')).toFixed(6)} XCH
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  {error && (
                    <div className="message error-message">
                      <div className="message-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      </div>
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="message success-message">
                      <div className="message-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3l8-8"></path>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      </div>
                      <p>{success}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="action-buttons">
                    <button type="button" onClick={onClose} className="cancel-btn">
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSending || !recipientAddress.trim() || !amount.trim()}
                      className="send-btn"
                    >
                      {isSending ? (
                        <>
                          <div className="button-spinner"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7,7 17,7 17,17"></polyline>
                          </svg>
                          Send Transaction
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay.send-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          backdrop-filter: blur(4px);
        }

        .send-modal-content {
          background: #1a1a1a;
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #333;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          color: white;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .send-modal-content::-webkit-scrollbar {
          display: none;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wallet-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chia-logo {
          font-size: 20px;
        }

        .header-content h3 {
          margin: 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
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

        .error-state,
        .loading-state {
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
          margin: 0;
          font-size: 16px;
        }

        .send-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .balance-section {
          margin-bottom: 4px;
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

        .balance-subtitle {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .send-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-section label {
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: #262626;
          border: 1px solid #333;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #6bc36b;
          box-shadow: 0 0 0 2px rgba(107, 195, 107, 0.1);
        }

        .form-input::placeholder {
          color: #666;
        }

        .address-input {
          padding-right: 48px;
          font-family: monospace;
          font-size: 13px;
        }

        .amount-input,
        .fee-input {
          padding-right: 60px;
          font-weight: 600;
          text-align: right;
        }

        .input-icon {
          position: absolute;
          right: 12px;
          color: #666;
          pointer-events: none;
        }

        .currency-label {
          position: absolute;
          right: 16px;
          color: #888;
          font-size: 14px;
          font-weight: 600;
          pointer-events: none;
        }

        .form-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }

        .transaction-summary {
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
        }

        .summary-header h4 {
          margin: 0 0 12px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .summary-row span:first-child {
          color: #888;
        }

        .amount-value {
          color: #22c55e;
          font-weight: 600;
        }

        .fee-value {
          color: #fb923c;
          font-weight: 600;
        }

        .total-row {
          padding-top: 8px;
          border-top: 1px solid #333;
          font-weight: 600;
        }

        .total-value {
          color: white;
          font-size: 16px;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .message.error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .message.success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .message-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .message p {
          margin: 0;
          line-height: 1.4;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }

        .cancel-btn {
          flex: 1;
          padding: 12px 16px;
          background: none;
          border: 1px solid #333;
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #333;
          color: white;
          border-color: #404040;
        }

        .send-btn {
          flex: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          background: #6bc36b;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .send-modal-content {
            width: 95%;
            margin: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .send-btn {
            flex: 1;
          }
        }
      `}</style>
    </>
  );
}; 