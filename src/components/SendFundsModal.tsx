import React, { useState } from 'react';
import { ChiaCloudWalletClient, type Coin, type SendXCHRequest } from '../client/ChiaCloudWalletClient';

interface SendFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ChiaCloudWalletClient | null;
  publicKey: string | null;
  unspentCoins: Coin[];
  onTransactionSent: (transaction: any) => void;
  // New props for initial values from global dialog system
  initialRecipientAddress?: string;
  initialAmount?: string;
  initialFee?: string;
}

export const SendFundsModal: React.FC<SendFundsModalProps> = ({ 
  isOpen, 
  onClose, 
  client, 
  publicKey, 
  unspentCoins, 
  onTransactionSent,
  initialRecipientAddress,
  initialAmount,
  initialFee
}) => {
  const [recipientAddress, setRecipientAddress] = useState(initialRecipientAddress || '');
  const [amount, setAmount] = useState(initialAmount || '');
  const [fee, setFee] = useState(initialFee || '0.00001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update state when initial values change (when modal is opened with new arguments)
  React.useEffect(() => {
    if (isOpen) {
      setRecipientAddress(initialRecipientAddress || '');
      setAmount(initialAmount || '');
      setFee(initialFee || '0.00001');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, initialRecipientAddress, initialAmount, initialFee]);

  const validateChiaAddress = (address: string): { isValid: boolean; error?: string } => {
    try {
      if (!address || typeof address !== 'string') {
        return { isValid: false, error: 'Address must be a non-empty string' };
      }

      // Basic bech32m validation
      if (!address.startsWith('xch1') || address.length < 62) {
        return { isValid: false, error: 'Invalid Chia address format' };
      }

      return { isValid: true };
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? `Invalid address encoding: ${err.message}` : 'Invalid address encoding',
      };
    }
  };

  // Simple coin selection logic
  const selectCoinsForAmount = (totalNeededMojos: number): Coin[] | null => {
    if (!unspentCoins || unspentCoins.length === 0) {
      return null;
    }
    
    // Sort coins by amount descending (largest first)
    const sortedCoins = [...unspentCoins].sort((a, b) => {
      const amountA = parseInt(a.amount);
      const amountB = parseInt(b.amount);
      return amountB - amountA;
    });
    
    const selectedCoins: Coin[] = [];
    let totalSelected = 0;
    
    // Greedy selection: pick coins until we have enough
    for (const coin of sortedCoins) {
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

  const handleSend = async () => {
    if (!client || !publicKey) {
      setError('Wallet not connected');
      return;
    }

    if (!recipientAddress.trim()) {
      setError('Please enter a recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const feeFloat = !fee ? 0.0 : parseFloat(fee);
    if (feeFloat < 0.0) {
      setError(`Please enter a valid fee (minimum 0.0)`);
      return;
    }

    const addressValidation = validateChiaAddress(recipientAddress);
    if (!addressValidation.isValid) {
      setError(addressValidation.error || 'Invalid Chia address format');
      return;
    }

    if (!unspentCoins || unspentCoins.length === 0) {
      setError('No unspent coins available. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amountInMojosResult = ChiaCloudWalletClient.xchToMojos(parseFloat(amount));
      if (!amountInMojosResult.success) {
        setError(`Invalid amount: ${amountInMojosResult.error}`);
        return;
      }

      const feeInMojosResult = ChiaCloudWalletClient.xchToMojos(parseFloat(fee));
      if (!feeInMojosResult.success) {
        setError(`Invalid fee: ${feeInMojosResult.error}`);
        return;
      }

      const amountInMojos = amountInMojosResult.data;
      const feeInMojos = feeInMojosResult.data;

      // Calculate total amount needed (amount + fee)
      const totalNeeded = Number(amountInMojos) + Number(feeInMojos);
      
      // Select coins to cover the amount
      const selectedCoins = selectCoinsForAmount(totalNeeded);
      if (!selectedCoins) {
        setError('Insufficient balance to cover amount and fees');
        return;
      }

      // Create send request
      const sendRequest: SendXCHRequest = {
        selected_coins: selectedCoins,
        payments: [{
          address: recipientAddress,
          amount: amountInMojos.toString(),
        }],
        fee: feeInMojos.toString(),
      };

      const result = await client.sendXCH(sendRequest);

      if (!result.success) {
        setError(`Transaction failed: ${result.error}`);
        return;
      }

      // SendXCHResponse doesn't have transaction_id, just success confirmation
      setSuccess(`Transaction signed successfully! The transaction has been prepared.`);

      onTransactionSent({
        amount: Number(amountInMojos),
        recipient: recipientAddress,
        fee: Number(feeInMojos),
        transactionId: undefined, // SendXCH doesn't provide transaction_id directly
        blockchainStatus: 'signed',
      });

      setRecipientAddress('');
      setAmount('');
      setFee('0.00001');

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Transaction failed:', err);
      if (err instanceof Error) {
        let errorMessage = err.message;
        if (errorMessage.includes('Insufficient balance')) {
          setError(errorMessage);
        } else if (errorMessage.includes('selected_coins')) {
          setError('Unable to select coins for transaction. Please try again or refresh your balance.');
        } else if (errorMessage.includes('504')) {
          setError('Network timeout. Please check your connection and try again.');
        } else if (errorMessage.includes('500')) {
          setError('Server error. Please try again later.');
        } else {
          setError(`Transaction failed: ${errorMessage}`);
        }
      } else {
        setError('Failed to send transaction. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    onClose();
    setRecipientAddress('');
    setAmount('');
    setFee('0.00001');
    setError(null);
    setSuccess(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay send-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal-content send-modal-content">
        <div className="modal-header">
          <button className="back-btn" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h2>Send Funds</h2>
          <button className="close-btn" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="token-section">
            <label htmlFor="token">Token</label>
            <div className="token-select">
              <div className="token-icon">🌱</div>
              <div className="token-info">
                <span className="token-name">Chia</span>
                <span className="token-symbol">XCH</span>
              </div>
            </div>
          </div>

          <div className="send-to-section">
            <label htmlFor="recipient">Send to</label>
            <textarea
              id="recipient"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="xch1..."
              className="recipient-input"
              rows={1}
            />
          </div>

          <div className="amount-section">
            <label htmlFor="amount">Amount</label>
            <div className="amount-input-container">
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                step="0.000001"
                min="0"
                className="amount-input"
              />
              <span className="currency-label">XCH</span>
            </div>
          </div>

          <div className="fee-section">
            <label htmlFor="fee">Fee</label>
            <div className="fee-input-container">
              <input
                id="fee"
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0.00001"
                step="0.000001"
                min="0"
                className="fee-input"
              />
              <span className="currency-label">XCH</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <button
            className="send-btn"
            onClick={handleSend}
            disabled={loading || !recipientAddress || !amount}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Sending...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 