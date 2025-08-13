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
          {/* Header */}
          <div className="modal-header">
            <button className="back-btn" onClick={onClose} aria-label="Back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.45043 5.14946C6.09113 4.79018 5.50862 4.79018 5.14934 5.14946C4.79006 5.50874 4.79006 6.09126 5.14934 6.45054L7.69888 9L5.14934 11.5495C4.79006 11.9088 4.79006 12.4912 5.14934 12.8506C5.50862 13.2098 6.09113 13.2098 6.45043 12.8506L9.00009 10.301L11.5494 12.8506C11.9086 13.2098 12.4912 13.2098 12.8504 12.8506C13.2097 12.4912 13.2097 11.9088 12.8504 11.5495L10.301 9L12.8504 6.45054C13.2097 6.09126 13.2097 5.50874 12.8504 5.14946C12.4912 4.79018 11.9086 4.79018 11.5494 5.14946L9.00009 7.69888L6.45043 5.14946Z" fill="#EEEEF0" transform="rotate(180 8 8)"/>
              </svg>
            </button>
            <h3 className="modal-title">Send XCH</h3>
            <button className="close-btn" onClick={onClose} aria-label="Close modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M18.8504 6.45054C19.2097 6.09126 19.2097 5.50874 18.8504 5.14946C18.4912 4.79018 17.9086 4.79018 17.5494 5.14946L11.9999 10.6989L6.45043 5.14946C6.09113 4.79018 5.50862 4.79018 5.14934 5.14946C4.79006 5.50874 4.79006 6.09126 5.14934 6.45054L10.6988 12L5.14934 17.5495C4.79006 17.9088 4.79006 18.4912 5.14934 18.8506C5.50862 19.2098 6.09113 19.2098 6.45043 18.8506L11.9999 13.3011L17.5494 18.8506C17.9086 19.2098 18.4912 19.2098 18.8504 18.8506C19.2097 18.4912 19.2097 17.9088 18.8504 17.5495L13.301 12L18.8504 6.45054Z" fill="#7C7A85"/>
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
                    <div className="balance-left">
                      <div className="token-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M13.2019 6.10456C12.8363 6.12729 12.0596 6.21872 11.7577 6.27461C10.8985 6.43363 10.1713 6.68895 9.59736 7.03318C8.89069 7.45698 8.47902 7.78375 7.93465 8.353L7.58269 8.72104L7.32782 9.07199C7.01028 9.50926 6.89933 9.6915 6.68376 10.1297C6.44521 10.6147 6.24284 11.1842 6.1606 11.6021C6.14587 11.6769 6.11801 11.8104 6.09866 11.8988L6.06349 12.0596L6.03837 13.2961L6.15313 13.9884L6.19481 13.9966C6.21772 14.0011 6.28814 13.9611 6.35129 13.9078C6.90817 13.4378 8.17309 12.7935 9.47599 12.3162C9.62284 12.2624 9.81399 12.1913 9.90077 12.1582C10.1277 12.0717 10.9892 11.7816 11.2601 11.7006C11.3869 11.6626 11.6818 11.5743 11.9154 11.5043C12.1491 11.4342 12.5368 11.3226 12.7771 11.2561C13.0174 11.1896 13.3536 11.0956 13.5242 11.0471C13.971 10.9203 14.0169 10.9287 13.6366 11.0677C13.2292 11.2165 12.2937 11.6074 11.8548 11.8122C11.788 11.8434 11.6296 11.9156 11.5028 11.9728C10.8382 12.2724 9.46424 12.9692 8.86916 13.3084C7.38025 14.1572 6.08485 14.9936 4.90052 15.8708C4.50089 16.1668 4.14444 16.4339 4.05096 16.5074C3.99088 16.5546 3.76696 16.7297 3.55336 16.8966C3.33976 17.0634 3.03244 17.3065 2.87041 17.4367C2.70839 17.5669 2.53637 17.7045 2.48811 17.7425C2.43986 17.7805 2.40039 17.8222 2.40039 17.8352C2.40039 17.8746 2.49792 17.8619 2.56656 17.8136C2.6657 17.7439 2.99387 17.5673 3.55336 17.2827C5.19942 16.4454 6.32192 15.997 6.91186 15.9413L7.09058 15.9243L7.37305 16.2184C7.92215 16.79 8.54068 17.2028 9.28996 17.4978C10.5043 17.9759 11.9229 18.0379 13.2869 17.6726C14.0207 17.4761 14.7341 17.1723 15.2992 16.8157C16.7651 15.8907 18.4099 13.7797 20.2126 10.5096C20.3751 10.2148 20.5081 9.969 20.5081 9.96336C20.5081 9.9577 20.6073 9.76487 20.7286 9.53485C21.0386 8.94693 21.6004 7.77861 21.6004 7.7219V7.67454L20.9754 7.46505C20.4264 7.28105 20.148 7.19088 19.7314 7.06209C18.9531 6.82151 17.4213 6.44182 16.6001 6.28594C16.2209 6.21395 15.6567 6.14915 15.0831 6.11169C14.7481 6.0898 13.5148 6.08513 13.2019 6.10456Z" fill="#0E9F6E"/>
                        </svg>
                      </div>
                      <div className="balance-details">
                        <h4 className="token-name">Chia</h4>
                        <p className="token-balance">{getFormattedAvailableBalance()} XCH</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Send Form */}
                <form onSubmit={handleSubmit} className="send-form">
                  {/* Recipient Address */}
                  <div className="form-section">
                    <label htmlFor="recipient">Recipient address</label>
                    <div className="input-container">
                      <input
                        id="recipient"
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="xch1..."
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  {/* Amount and Fee Row */}
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
                          placeholder="0.0 XCH"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <label htmlFor="fee">Network fee</label>
                      <div className="input-container">
                        <input
                          id="fee"
                          type="number"
                          step="0.000001"
                          min="0"
                          value={fee}
                          onChange={(e) => setFee(e.target.value)}
                          placeholder="0.0 XCH"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transaction Summary */}
                  <div className="summary-section">
                    <label>Transaction summary</label>
                    <div className="summary-card">
                      <div className="summary-row">
                        <span>Amount</span>
                        <span className="amount-value">{amount || '0'} XCH</span>
                      </div>
                      <div className="summary-row">
                        <span>Network fee</span>
                        <span className="fee-value">{fee || '0'} XCH</span>
                      </div>
                      <div className="summary-divider"></div>
                      <div className="summary-row total-row">
                        <span>Total</span>
                        <span className="total-value">
                          {(parseFloat(amount || '0') + parseFloat(fee || '0')).toFixed(4)} XCH
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  {error && (
                    <div className="message error-message">
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="message success-message">
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
                        'Send'
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
          background: #131418;
          border-radius: 16px;
          width: 90%;
          max-width: 397px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #272830;
          color: #EEEEF0;
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
          padding: 20px 16px;
        }

        .back-btn {
          background: none;
          border: none;
          color: #EEEEF0;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
        }

        .back-btn:hover {
          opacity: 0.7;
        }

        .modal-title {
          margin: 0;
          color: #EEEEF0;
          font-size: 20px;
          font-weight: 500;
          line-height: 1.5;
          text-align: left;
        }

        .close-btn {
          background: none;
          border: none;
          color: #7C7A85;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .close-btn:hover {
          color: #EEEEF0;
        }

        .modal-body {
          padding: 0 24px 16px 24px !important;
        }

        .error-state,
        .loading-state {
          text-align: center;
          padding: 40px 20px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #272830;
          border-top: 3px solid #2C64F8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .send-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .balance-section {
          margin-bottom: 0;
        }

        .balance-item {
          display: flex;
          align-items: center;
          padding: 10px 0px !important;
          background: #1B1C22;
          border: 1px solid #272830;
          border-radius: 8px;
        }

        .balance-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .token-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .balance-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .token-name {
          margin: 0;
          color: #FFFFFF;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
        }

        .token-balance {
          margin: 0;
          color: #7C7A85;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.5;
        }

        .send-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-section label {
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          text-align: left;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 8px 16px;
          background: #1B1C22 !important;
          border: 1px solid #272830 !important;
          border-radius: 4px;
          color: #EEEEF0;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #2C64F8;
        }

        .form-input::placeholder {
          color: #A7A7A7;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 0px;
        }

        .summary-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-section > label {
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          text-align: left;
        }

        .summary-card {
          background: #1B1C22;
          border-radius: 8px;
          border-left: 0px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          line-height: 1.5;
        }

        .summary-row span:first-child {
          color: #A7A7A7;
          font-weight: 400;
        }

        .amount-value,
        .fee-value {
          color: #FFFFFF;
          font-weight: 500;
          font-size: 16px;
        }

        .summary-divider {
          height: 1px;
          background: #272830;
          margin: 0;
        }

        .total-row span {
          color: #FFFFFF;
          font-weight: 500;
          font-size: 16px;
        }

        .total-value {
          color: #FFFFFF;
          font-weight: 500;
          font-size: 16px;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.4;
          margin: 8px 0;
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

        .message p {
          margin: 0;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          margin: 0 0 8px 0 !important;
          padding: 0 0 0 0 !important;
        }

        .cancel-btn {
          padding: 10px 20px;
          background: transparent !important;
          border: 1px solid #272830 !important;
          border-radius: 4px;
          color: #EEEEF0 !important;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: #1B1C22;
        }

        .send-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          background: #2C64F8;
          border: none;
          border-radius: 8px;
          color: #EEEEF0;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          transition: all 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background: #1E56E8;
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(238, 238, 240, 0.3);
          border-top: 2px solid #EEEEF0;
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
        }
      `}</style>
    </>
  );
};