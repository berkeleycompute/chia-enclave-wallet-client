import React, { useState, useEffect } from 'react';
import { 
  useWalletConnection, 
  useWalletCoins, 
  useSendTransaction
} from '../hooks/useChiaWalletSDK';
import { ChiaCloudWalletClient } from '../client/ChiaCloudWalletClient';

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

      const request = {
        payments: [{
          address: recipientAddress.trim(),
          amount: amountInMojos
        }],
        selected_coins: [], // Let the SDK auto-select coins
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

  if (!isOpen) return null;

  return (
    <div className="send-funds-modal-overlay">
      <div className="send-funds-modal">
        <div className="modal-header">
          <h2>💸 Send XCH</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!isConnected ? (
            <div className="error-state">
              <p>❌ Wallet not connected. Please connect your wallet first.</p>
            </div>
          ) : coinsLoading ? (
            <div className="loading-state">
              <p>⏳ Loading wallet data...</p>
            </div>
          ) : (
            <>
              <div className="balance-info">
                <p><strong>Available Balance:</strong> {getFormattedAvailableBalance()} XCH</p>
                <p><strong>Available Coins:</strong> {xchCoins.length}</p>
              </div>

              <form onSubmit={handleSubmit} className="send-form">
                <div className="form-group">
                  <label htmlFor="recipient">Recipient Address</label>
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

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="amount">Amount (XCH)</label>
                    <input
                      id="amount"
                      type="number"
                      step="0.000001"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.001"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fee">Fee (XCH)</label>
                    <input
                      id="fee"
                      type="number"
                      step="0.000001"
                      min="0"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="error-message">
                    ❌ {error}
                  </div>
                )}

                {success && (
                  <div className="success-message">
                    ✅ {success}
                  </div>
                )}

                <div className="button-row">
                  <button type="button" onClick={onClose} className="cancel-button">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSending || !recipientAddress.trim() || !amount.trim()}
                    className="submit-button"
                  >
                    {isSending ? '⏳ Sending...' : '💸 Send Transaction'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <style>{`
          .send-funds-modal-overlay {
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

          .send-funds-modal {
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 500px;
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
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
          }

          .close-button {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 1.5rem;
            width: 32px;
            height: 32px;
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

          .modal-body {
            padding: 1.5rem;
            flex: 1;
            overflow-y: auto;
          }

          .error-state, .loading-state {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
          }

          .balance-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1.5rem;
          }

          .balance-info p {
            margin: 0.25rem 0;
            font-size: 14px;
            color: #475569;
          }

          .send-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .form-group {
            display: flex;
            flex-direction: column;
          }

          .form-row {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1rem;
          }

          .form-group label {
            margin-bottom: 8px;
            font-weight: 500;
            color: #374151;
            font-size: 14px;
          }

          .form-input {
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
            box-sizing: border-box;
          }

          .form-input:focus {
            outline: none;
            border-color: #ef4444;
          }

          .form-input:invalid {
            border-color: #f87171;
          }

          .error-message {
            padding: 12px 16px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #dc2626;
            font-size: 14px;
          }

          .success-message {
            padding: 12px 16px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            color: #16a34a;
            font-size: 14px;
          }

          .button-row {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
          }

          .cancel-button {
            flex: 1;
            padding: 12px 24px;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            color: #374151;
            transition: all 0.2s;
          }

          .cancel-button:hover {
            background: #e5e7eb;
          }

          .submit-button {
            flex: 2;
            padding: 12px 24px;
            background: linear-gradient(45deg, #ef4444, #dc2626);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .submit-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }

          .submit-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          /* Responsive */
          @media (max-width: 640px) {
            .send-funds-modal {
              width: 95%;
              margin: 1rem;
            }

            .form-row {
              grid-template-columns: 1fr;
            }

            .button-row {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </div>
  );
}; 