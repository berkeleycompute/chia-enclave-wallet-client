import React, { useState, useEffect, useMemo } from 'react';
import {
  useWalletConnection,
  useWalletCoins,
  useSendTransaction
} from '../hooks/useChiaWalletSDK';
import { ChiaCloudWalletClient, type Coin, type HydratedCoin } from '../client/ChiaCloudWalletClient';
import { useTransferAssets } from '../hooks/useTransferAssets';
import { useRawSDK } from '../hooks/useChiaWalletSDK';
import { useCATMetadata, getAssetColorFromId, getCATInitials } from '../hooks/useCATMetadata';

interface SendFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // New: closes the entire wallet modal (parent)
  onTransactionSent?: (transaction: any) => void;
  // New props for initial values from global dialog system
  initialRecipientAddress?: string;
  initialAmount?: string;
  initialFee?: string;
}

interface TokenOption {
  type: 'XCH' | 'CAT';
  name: string;
  assetId?: string;
  balance: number; // in mojos
  coins: HydratedCoin[];
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
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  // Use the new SDK hooks
  const { isConnected } = useWalletConnection();
  const { xchCoins, catCoins, isLoading: coinsLoading } = useWalletCoins();
  const { sendXCH, isSending } = useSendTransaction();
  const sdk = useRawSDK();
  const { transferCAT, isTransferring } = useTransferAssets({ sdk, enableLogging: true });
  const { getCATInfo } = useCATMetadata();

  // Group CAT coins by asset ID
  const groupedCATs = useMemo(() => {
    const groups = new Map<string, { coins: HydratedCoin[], assetId: string, totalAmount: bigint }>();
    
    for (const coin of catCoins) {
      const driverInfo = coin.parentSpendInfo?.driverInfo;
      if (driverInfo?.type === 'CAT') {
        const assetId = driverInfo.assetId || 'unknown';
        const existing = groups.get(assetId);
        const amount = BigInt(coin.coin.amount);
        
        if (existing) {
          existing.coins.push(coin);
          existing.totalAmount += amount;
        } else {
          groups.set(assetId, {
            coins: [coin],
            assetId,
            totalAmount: amount
          });
        }
      }
    }
    
    return Array.from(groups.values());
  }, [catCoins]);

  // Create token options for selector
  const tokenOptions = useMemo<TokenOption[]>(() => {
    const options: TokenOption[] = [
      {
        type: 'XCH',
        name: 'Chia',
        balance: xchCoins.reduce((total, coin) => total + parseInt(coin.coin.amount), 0),
        coins: xchCoins
      }
    ];

    // Add CAT tokens
    for (const cat of groupedCATs) {
      const catInfo = getCATInfo(cat.assetId);
      options.push({
        type: 'CAT',
        name: catInfo ? `${catInfo.name} (${catInfo.code})` : `CAT ${cat.assetId.substring(0, 8)}...`,
        assetId: cat.assetId,
        balance: Number(cat.totalAmount),
        coins: cat.coins
      });
    }

    return options;
  }, [xchCoins, groupedCATs, getCATInfo]);

  const selectedToken = tokenOptions[selectedTokenIndex] || tokenOptions[0];

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
      setShowTokenSelector(false);
      // Only clear if not using initial values
      if (!initialRecipientAddress && !initialAmount) {
        setRecipientAddress('');
        setAmount('');
      }
    }
  }, [isOpen, initialRecipientAddress, initialAmount]);

  // Close token selector when clicking outside
  useEffect(() => {
    if (!showTokenSelector) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.token-selector-container')) {
        setShowTokenSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTokenSelector]);

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
      if (selectedToken.type === 'XCH') {
        // Handle XCH transfer
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
      } else if (selectedToken.type === 'CAT') {
        // Handle CAT transfer
        const amountInMojos = Math.floor(parseFloat(amount) * 1000);
        const feeInMojos = Math.floor(parseFloat(fee) * 1000000000000);

        // Check if we have enough CAT balance
        if (amountInMojos > selectedToken.balance) {
          setError(`Insufficient CAT balance. Need ${(amountInMojos / 1000).toFixed(3)} CAT, have ${(selectedToken.balance / 1000).toFixed(3)} CAT`);
          return;
        }

        // Check if we have enough XCH for fee
        const availableXCH = getAvailableBalance();
        if (feeInMojos > availableXCH) {
          setError(`Insufficient XCH for fee. Need ${formatXCH(feeInMojos)} XCH, have ${formatXCH(availableXCH)} XCH`);
          return;
        }

        // Select XCH coin IDs for the fee
        const xchCoinIdsForFee = selectCoinIdsForAmount(feeInMojos);
        if (!xchCoinIdsForFee || xchCoinIdsForFee.length === 0) {
          setError('Unable to select XCH coins for fee. Please try again.');
          return;
        }

        // Combine CAT coin IDs and XCH coin IDs
        const catCoinIds = selectedToken.coins.map(c => c.coinId);
        const allCoinIds = [...catCoinIds, ...xchCoinIdsForFee];

        const result = await transferCAT(
          allCoinIds,
          selectedToken.assetId!,
          recipientAddress.trim(),
          amountInMojos,
          feeInMojos
        );

        if (result.success) {
          setSuccess(`CAT transfer sent successfully! Transaction ID: ${result.response?.transaction_id || 'N/A'}`);

          // Call callback if provided
          if (onTransactionSent) {
            onTransactionSent({
              id: result.response?.transaction_id,
              type: 'outgoing',
              amount: parseFloat(amount),
              recipient: recipientAddress.trim(),
              fee: parseFloat(fee),
              timestamp: Date.now(),
              status: 'pending',
              transactionId: result.response?.transaction_id,
              tokenType: 'CAT',
              assetId: selectedToken.assetId
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
          setError(result.error || 'CAT transfer failed');
        }
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
    if (selectedToken.type === 'XCH') {
      return formatXCH(selectedToken.balance);
    } else {
      // CAT tokens typically use 1000 mojos = 1 token
      return (selectedToken.balance / 1000).toFixed(3);
    }
  };

  const getTokenSymbol = (): string => {
    if (selectedToken.type === 'XCH') {
      return 'XCH';
    } else {
      // Get the CAT code from metadata, fallback to 'CAT'
      const catInfo = selectedToken.assetId ? getCATInfo(selectedToken.assetId) : null;
      return catInfo?.code || 'CAT';
    }
  };

  // Validate decimal places for token amounts
  const validateAndSetAmount = (value: string) => {
    if (!value) {
      setAmount(value);
      return;
    }

    const maxDecimals = selectedToken.type === 'XCH' ? 12 : 3;
    const parts = value.split('.');
    
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      // Truncate to max decimals
      setAmount(`${parts[0]}.${parts[1].substring(0, maxDecimals)}`);
    } else {
      setAmount(value);
    }
  };

  // Validate decimal places for fee (always XCH)
  const validateAndSetFee = (value: string) => {
    if (!value) {
      setFee(value);
      return;
    }

    const parts = value.split('.');
    
    if (parts.length === 2 && parts[1].length > 12) {
      // Truncate to 12 decimals for XCH
      setFee(`${parts[0]}.${parts[1].substring(0, 12)}`);
    } else {
      setFee(value);
    }
  };

  // Select coins for transaction using greedy algorithm
  // Returns Coin[] for XCH transfers (legacy compatibility)
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

  // Select coins and return their IDs for CAT transfers
  const selectCoinIdsForAmount = (totalNeededMojos: number): string[] | null => {
    if (!xchCoins || xchCoins.length === 0) {
      return null;
    }

    // Sort HydratedCoins by amount descending
    const sortedCoins = [...xchCoins].sort((a, b) => 
      parseInt(b.coin.amount) - parseInt(a.coin.amount)
    );

    const selectedCoinIds: string[] = [];
    let totalSelected = 0;

    // Greedy selection: pick coins until we have enough
    for (const hydratedCoin of sortedCoins) {
      selectedCoinIds.push(hydratedCoin.coinId);
      totalSelected += parseInt(hydratedCoin.coin.amount);

      if (totalSelected >= totalNeededMojos) {
        break;
      }
    }

    // Check if we have enough
    if (totalSelected < totalNeededMojos) {
      return null;
    }

    return selectedCoinIds;
  };

  if (!isOpen) return null;

  return (
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
          {/* Token Selector */}
          <div className="flex items-center relative token-selector-container">
            <div 
              className="flex items-center gap-3 flex-1 rounded-lg py-2.5 self-stretch border cursor-pointer hover:border-opacity-70" 
              style={{ borderColor: '#272830', padding: '12px' }}
              onClick={() => setShowTokenSelector(!showTokenSelector)}
            >
              {selectedToken.type === 'XCH' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.2019 6.10456C12.8363 6.12729 12.0596 6.21872 11.7577 6.27461C10.8985 6.43363 10.1713 6.68895 9.59736 7.03318C8.89069 7.45698 8.47902 7.78375 7.93465 8.353L7.58269 8.72104L7.32782 9.07199C7.01028 9.50926 6.89933 9.6915 6.68376 10.1297C6.44521 10.6147 6.24284 11.1842 6.1606 11.6021C6.14587 11.6769 6.11801 11.8104 6.09866 11.8988L6.06349 12.0596L6.03837 13.2961L6.15313 13.9884L6.19481 13.9966C6.21772 14.0011 6.28814 13.9611 6.35129 13.9078C6.90817 13.4378 8.17309 12.7935 9.47599 12.3162C9.62284 12.2624 9.81399 12.1913 9.90077 12.1582C10.1277 12.0717 10.9892 11.7816 11.2601 11.7006C11.3869 11.6626 11.6818 11.5743 11.9154 11.5043C12.1491 11.4342 12.5368 11.3226 12.7771 11.2561C13.0174 11.1896 13.3536 11.0956 13.5242 11.0471C13.971 10.9203 14.0169 10.9287 13.6366 11.0677C13.2292 11.2165 12.2937 11.6074 11.8548 11.8122C11.788 11.8434 11.6296 11.9156 11.5028 11.9728C10.8382 12.2724 9.46424 12.9692 8.86916 13.3084C7.38025 14.1572 6.08485 14.9936 4.90052 15.8708C4.50089 16.1668 4.14444 16.4339 4.05096 16.5074C3.99088 16.5546 3.76696 16.7297 3.55336 16.8966C3.33976 17.0634 3.03244 17.3065 2.87041 17.4367C2.70839 17.5669 2.53637 17.7045 2.48811 17.7425C2.43986 17.7805 2.40039 17.8222 2.40039 17.8352C2.40039 17.8746 2.49792 17.8619 2.56656 17.8136C2.6657 17.7439 2.99387 17.5673 3.55336 17.2827C5.19942 16.4454 6.32192 15.997 6.91186 15.9413L7.09058 15.9243L7.37305 16.2184C7.92215 16.79 8.54068 17.2028 9.28996 17.4978C10.5043 17.9759 11.9229 18.0379 13.2869 17.6726C14.0207 17.4761 14.7341 17.1723 15.2992 16.8157C16.7651 15.8907 18.4099 13.7797 20.2126 10.5096C20.3751 10.2148 20.5081 9.969 20.5081 9.96336C20.5081 9.9577 20.6073 9.76487 20.7286 9.53485C21.0386 8.94693 21.6004 7.77861 21.6004 7.7219V7.67454L20.9754 7.46505C20.4264 7.28105 20.148 7.19088 19.7314 7.06209C18.9531 6.82151 17.4213 6.44182 16.6001 6.28594C16.2209 6.21395 15.6567 6.14915 15.0831 6.11169C14.7481 6.0898 13.5148 6.08513 13.2019 6.10456Z" fill="#0E9F6E" />
                </svg>
              ) : (() => {
                const catInfo = selectedToken.assetId ? getCATInfo(selectedToken.assetId) : null;
                const iconBgColor = selectedToken.assetId ? getAssetColorFromId(selectedToken.assetId) : '#2C64F8';
                const initials = catInfo ? getCATInitials(catInfo.code) : 'C';
                return (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden" style={{ backgroundColor: catInfo?.icon ? 'transparent' : iconBgColor, color: '#EEEEF0' }}>
                    {catInfo?.icon ? (
                      <img 
                        src={catInfo.icon} 
                        alt={catInfo.code}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : initials}
                  </div>
                );
              })()}
              <div className="flex flex-col items-start flex-1">
                <h4 className="text-white font-medium">{selectedToken.name}</h4>
                <p className="text-xs font-medium" style={{ color: '#7C7A85' }}>
                  {getFormattedAvailableBalance()} {getTokenSymbol()}
                </p>
              </div>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ transform: showTokenSelector ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="#7C7A85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Token Selector Dropdown */}
            {showTokenSelector && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 rounded-lg border overflow-hidden z-50"
                style={{ backgroundColor: '#1B1C22', borderColor: '#272830', maxHeight: '200px', overflowY: 'auto' }}
              >
                {tokenOptions.map((token, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-opacity-50"
                    style={{ 
                      backgroundColor: index === selectedTokenIndex ? '#272830' : 'transparent',
                      borderBottom: index < tokenOptions.length - 1 ? '1px solid #272830' : 'none'
                    }}
                    onClick={() => {
                      setSelectedTokenIndex(index);
                      setShowTokenSelector(false);
                      setAmount(''); // Clear amount when switching tokens
                    }}
                    onMouseEnter={(e) => {
                      if (index !== selectedTokenIndex) {
                        e.currentTarget.style.backgroundColor = '#1a1b20';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== selectedTokenIndex) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {token.type === 'XCH' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M13.2019 6.10456C12.8363 6.12729 12.0596 6.21872 11.7577 6.27461C10.8985 6.43363 10.1713 6.68895 9.59736 7.03318C8.89069 7.45698 8.47902 7.78375 7.93465 8.353L7.58269 8.72104L7.32782 9.07199C7.01028 9.50926 6.89933 9.6915 6.68376 10.1297C6.44521 10.6147 6.24284 11.1842 6.1606 11.6021C6.14587 11.6769 6.11801 11.8104 6.09866 11.8988L6.06349 12.0596L6.03837 13.2961L6.15313 13.9884L6.19481 13.9966C6.21772 14.0011 6.28814 13.9611 6.35129 13.9078C6.90817 13.4378 8.17309 12.7935 9.47599 12.3162C9.62284 12.2624 9.81399 12.1913 9.90077 12.1582C10.1277 12.0717 10.9892 11.7816 11.2601 11.7006C11.3869 11.6626 11.6818 11.5743 11.9154 11.5043C12.1491 11.4342 12.5368 11.3226 12.7771 11.2561C13.0174 11.1896 13.3536 11.0956 13.5242 11.0471C13.971 10.9203 14.0169 10.9287 13.6366 11.0677C13.2292 11.2165 12.2937 11.6074 11.8548 11.8122C11.788 11.8434 11.6296 11.9156 11.5028 11.9728C10.8382 12.2724 9.46424 12.9692 8.86916 13.3084C7.38025 14.1572 6.08485 14.9936 4.90052 15.8708C4.50089 16.1668 4.14444 16.4339 4.05096 16.5074C3.99088 16.5546 3.76696 16.7297 3.55336 16.8966C3.33976 17.0634 3.03244 17.3065 2.87041 17.4367C2.70839 17.5669 2.53637 17.7045 2.48811 17.7425C2.43986 17.7805 2.40039 17.8222 2.40039 17.8352C2.40039 17.8746 2.49792 17.8619 2.56656 17.8136C2.6657 17.7439 2.99387 17.5673 3.55336 17.2827C5.19942 16.4454 6.32192 15.997 6.91186 15.9413L7.09058 15.9243L7.37305 16.2184C7.92215 16.79 8.54068 17.2028 9.28996 17.4978C10.5043 17.9759 11.9229 18.0379 13.2869 17.6726C14.0207 17.4761 14.7341 17.1723 15.2992 16.8157C16.7651 15.8907 18.4099 13.7797 20.2126 10.5096C20.3751 10.2148 20.5081 9.969 20.5081 9.96336C20.5081 9.9577 20.6073 9.76487 20.7286 9.53485C21.0386 8.94693 21.6004 7.77861 21.6004 7.7219V7.67454L20.9754 7.46505C20.4264 7.28105 20.148 7.19088 19.7314 7.06209C18.9531 6.82151 17.4213 6.44182 16.6001 6.28594C16.2209 6.21395 15.6567 6.14915 15.0831 6.11169C14.7481 6.0898 13.5148 6.08513 13.2019 6.10456Z" fill="#0E9F6E" />
                      </svg>
                    ) : (() => {
                      const catInfo = token.assetId ? getCATInfo(token.assetId) : null;
                      const iconBgColor = token.assetId ? getAssetColorFromId(token.assetId) : '#2C64F8';
                      const initials = catInfo ? getCATInitials(catInfo.code) : 'C';
                      return (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden" style={{ backgroundColor: catInfo?.icon ? 'transparent' : iconBgColor, color: '#EEEEF0' }}>
                          {catInfo?.icon ? (
                            <img 
                              src={catInfo.icon} 
                              alt={catInfo.code}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : initials}
                        </div>
                      );
                    })()}
                    <div className="flex flex-col items-start flex-1">
                      <p className="text-white text-sm font-medium">{token.name}</p>
                      <p className="text-xs" style={{ color: '#7C7A85' }}>
                        {token.type === 'XCH' 
                          ? `${formatXCH(token.balance)} XCH`
                          : `${(token.balance / 1000).toFixed(3)} CAT`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    step={selectedToken.type === 'XCH' ? '0.000000000001' : '0.001'}
                    min="0"
                    value={amount}
                    onChange={(e) => validateAndSetAmount(e.target.value)}
                    placeholder={`0.0 ${getTokenSymbol()}`}
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
                    step="0.000000000001"
                    min="0"
                    value={fee}
                    onChange={(e) => validateAndSetFee(e.target.value)}
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
                  <span className="text-white font-medium">{amount || '0'} {getTokenSymbol()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Network fee</span>
                  <span className="text-white font-medium">{fee || '0'} XCH</span>
                </div>
                <div className="h-px" style={{ backgroundColor: '#272830' }}></div>
                <div className="flex justify-between items-center">
                  <span>Total</span>
                  <span className="text-white font-medium">
                    {selectedToken.type === 'XCH' 
                      ? `${(parseFloat(amount || '0') + parseFloat(fee || '0')).toFixed(4)} XCH`
                      : `${amount || '0'} ${getTokenSymbol()} + ${fee || '0'} XCH`
                    }
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
                disabled={isSending || isTransferring || !recipientAddress.trim() || !amount.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed w-3/4"
                style={{ backgroundColor: '#2C64F8', color: '#EEEEF0' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e56e8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2C64F8'}
              >
                {(isSending || isTransferring) ? (
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
  );
};