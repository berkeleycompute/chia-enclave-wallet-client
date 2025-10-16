import React, { useState, useEffect } from 'react';
import {
  useWalletConnection,
  useWalletCoins,
  useSendTransaction
} from '../hooks/useChiaWalletSDK';
import { ChiaCloudWalletClient, type Coin } from '../client/ChiaCloudWalletClient';
import { PiCaretLeft, PiX } from 'react-icons/pi';

interface SendFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // New: closes the entire wallet modal (parent)
  onCloseWallet?: () => void;
  onTransactionSent?: (transaction: any) => void;
  // New props for initial values from global dialog system
  initialRecipientAddress?: string;
  initialAmount?: string;
  initialFee?: string;
}

export const SendFundsModal: React.FC<SendFundsModalProps> = ({
  isOpen,
  onClose,
  onCloseWallet,
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
        setError((result as any).error);
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
      <div
        className="fixed inset-0 flex items-center justify-center backdrop-blur-sm"
        style={{ zIndex: 1001, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <div
          className="overflow-y-auto rounded-2xl"
          role="document"
          tabIndex={0}
          style={{ 
            backgroundColor: '#131418', 
            border: '1px solid #272830', 
            color: '#EEEEF0', 
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            maxWidth: '400px',
            maxHeight: '90vh'
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-5">
            <button className="p-1 rounded transition-colors flex items-center justify-center w-6 h-6" style={{ color: '#7C7A85' }} onClick={onClose} aria-label="Back" onMouseEnter={(e) => e.currentTarget.style.color = '#EEEEF0'} onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'}>
              <PiCaretLeft size={24} />
            </button>
            <h3 className="text-xl font-medium text-left" style={{ color: '#EEEEF0' }}>Send XCH</h3>
            <button className="p-1 rounded transition-colors flex items-center justify-center w-6 h-6" style={{ color: '#7C7A85' }} onMouseEnter={(e) => e.currentTarget.style.color = '#EEEEF0'} onMouseLeave={(e) => e.currentTarget.style.color = '#7C7A85'} onClick={onCloseWallet || onClose} aria-label="Close modal">
              <PiX size={24} />
            </button>
          </div>

          <div className="px-6 pb-4">
            {!isConnected ? (
              <div className="text-center text-sm" style={{ padding: '40px' }}>
                <p style={{ color: '#ef4444' }}>Wallet not connected. Please connect your wallet first.</p>
              </div>
            ) : coinsLoading ? (
              <div className="text-center text-sm" style={{ padding: '40px' }}>
                <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#272830', borderTopColor: '#2C64F8' }}></div>
                <p>Loading wallet data...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Balance Info */}
                <div className="flex items-center">
                  <div className="flex items-center gap-3 flex-1 rounded-lg py-2.5 self-stretch border" style={{ borderColor: '#272830', padding: '12px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M13.2019 6.10456C12.8363 6.12729 12.0596 6.21872 11.7577 6.27461C10.8985 6.43363 10.1713 6.68895 9.59736 7.03318C8.89069 7.45698 8.47902 7.78375 7.93465 8.353L7.58269 8.72104L7.32782 9.07199C7.01028 9.50926 6.89933 9.6915 6.68376 10.1297C6.44521 10.6147 6.24284 11.1842 6.1606 11.6021C6.14587 11.6769 6.11801 11.8104 6.09866 11.8988L6.06349 12.0596L6.03837 13.2961L6.15313 13.9884L6.19481 13.9966C6.21772 14.0011 6.28814 13.9611 6.35129 13.9078C6.90817 13.4378 8.17309 12.7935 9.47599 12.3162C9.62284 12.2624 9.81399 12.1913 9.90077 12.1582C10.1277 12.0717 10.9892 11.7816 11.2601 11.7006C11.3869 11.6626 11.6818 11.5743 11.9154 11.5043C12.1491 11.4342 12.5368 11.3226 12.7771 11.2561C13.0174 11.1896 13.3536 11.0956 13.5242 11.0471C13.971 10.9203 14.0169 10.9287 13.6366 11.0677C13.2292 11.2165 12.2937 11.6074 11.8548 11.8122C11.788 11.8434 11.6296 11.9156 11.5028 11.9728C10.8382 12.2724 9.46424 12.9692 8.86916 13.3084C7.38025 14.1572 6.08485 14.9936 4.90052 15.8708C4.50089 16.1668 4.14444 16.4339 4.05096 16.5074C3.99088 16.5546 3.76696 16.7297 3.55336 16.8966C3.33976 17.0634 3.03244 17.3065 2.87041 17.4367C2.70839 17.5669 2.53637 17.7045 2.48811 17.7425C2.43986 17.7805 2.40039 17.8222 2.40039 17.8352C2.40039 17.8746 2.49792 17.8619 2.56656 17.8136C2.6657 17.7439 2.99387 17.5673 3.55336 17.2827C5.19942 16.4454 6.32192 15.997 6.91186 15.9413L7.09058 15.9243L7.37305 16.2184C7.92215 16.79 8.54068 17.2028 9.28996 17.4978C10.5043 17.9759 11.9229 18.0379 13.2869 17.6726C14.0207 17.4761 14.7341 17.1723 15.2992 16.8157C16.7651 15.8907 18.4099 13.7797 20.2126 10.5096C20.3751 10.2148 20.5081 9.969 20.5081 9.96336C20.5081 9.9577 20.6073 9.76487 20.7286 9.53485C21.0386 8.94693 21.6004 7.77861 21.6004 7.7219V7.67454L20.9754 7.46505C20.4264 7.28105 20.148 7.19088 19.7314 7.06209C18.9531 6.82151 17.4213 6.44182 16.6001 6.28594C16.2209 6.21395 15.6567 6.14915 15.0831 6.11169C14.7481 6.0898 13.5148 6.08513 13.2019 6.10456Z" fill="#0E9F6E" />
                    </svg>
                    <div className="flex flex-col items-start">
                      <h4 className="text-white font-medium">Chia</h4>
                      <p className="text-xs font-medium" style={{ color: '#7C7A85' }}>{getFormattedAvailableBalance()} XCH</p>
                    </div>
                  </div>
                </div>

                {/* Send Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Recipient Address */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="recipient" className="text-white text-sm font-medium text-left">Recipient address</label>
                    <div className="relative flex items-center">
                      <input
                        id="recipient"
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="xch1..."
                        className="w-full px-4 py-2 rounded text-sm focus:outline-none placeholder-gray-300"
                        style={{ backgroundColor: '#1B1C22', border: '1px solid #272830', color: '#EEEEF0' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                        required
                      />
                    </div>
                  </div>

                  {/* Amount and Fee Row */}
                  <div className="grid grid-cols-2 gap-2 mb-0">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="amount" className="text-white text-sm font-medium text-left">Amount</label>
                      <div className="relative flex items-center">
                        <input
                          id="amount"
                          type="number"
                          step="0.000001"
                          min="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.0 XCH"
                          className="w-full px-4 py-2 rounded text-sm focus:outline-none placeholder-gray-300"
                          style={{ backgroundColor: '#1B1C22', border: '1px solid #272830', color: '#EEEEF0' }}
                          onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="fee" className="text-white text-sm font-medium text-left">Network fee</label>
                      <div className="relative flex items-center">
                        <input
                          id="fee"
                          type="number"
                          step="0.000001"
                          min="0"
                          value={fee}
                          onChange={(e) => setFee(e.target.value)}
                          placeholder="0.0 XCH"
                          className="w-full px-4 py-2 rounded text-sm focus:outline-none placeholder-gray-300"
                          style={{ backgroundColor: '#1B1C22', border: '1px solid #272830', color: '#EEEEF0' }}
                          onFocus={(e) => e.currentTarget.style.borderColor = '#2C64F8'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#272830'}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transaction Summary */}
                  <div className="flex flex-col gap-1">
                    <label className="text-white text-sm font-medium text-left">Transaction summary</label>
                    <div className="rounded-lg border-l-0 p-3 flex flex-col gap-3" style={{ backgroundColor: '#1B1C22' }}>
                      <div className="flex justify-between items-center text-sm">
                        <span>Amount</span>
                        <span className="text-white font-medium">{amount || '0'} XCH</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Network fee</span>
                        <span className="text-white font-medium">{fee || '0'} XCH</span>
                      </div>
                      <div className="h-px" style={{ backgroundColor: '#272830' }}></div>
                      <div className="flex justify-between items-center">
                        <span>Total</span>
                        <span className="text-white font-medium">
                          {(parseFloat(amount || '0') + parseFloat(fee || '0')).toFixed(4)} XCH
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  {error && (
                    <div className="p-3 rounded border border-red-300 text-red-500 bg-red-500/10 text-sm my-2">
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded border border-green-300 text-green-500 bg-green-500/10 text-sm my-2">
                      <p>{success}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-2">
                    <button 
                      type="button" 
                      onClick={onClose} 
                      className="px-5 py-2 bg-transparent border rounded font-medium w-1/4"
                      style={{ borderColor: '#272830', color: '#EEEEF0' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1b1c22'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSending || !recipientAddress.trim() || !amount.trim()}
                      className="flex items-center justify-center gap-2 px-5 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed w-3/4"
                      style={{ backgroundColor: '#2C64F8', color: '#EEEEF0' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e56e8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C64F8'}
                    >
                      {isSending ? (
                        <>
                          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(238, 238, 240, 0.3)', borderTopColor: '#EEEEF0' }}></div>
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
  );
};