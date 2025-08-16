import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUnifiedWalletClient } from '../hooks/useChiaWalletSDK';
import { ChiaWalletModalWithProvider } from './ChiaWalletModalWithProvider';
import { UnifiedWalletClient } from '../client/UnifiedWalletClient';
// import { useSpacescanBalance } from '../client/SpacescanClient';

export interface ChiaWalletButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onWalletUpdate?: (walletState: {
    isConnected: boolean;
    publicKey: string | null;
    address: string | null;
    totalBalance: number;
    coinCount: number;
    error: string | null;
  }) => void;
  className?: string;
  style?: React.CSSProperties;
  // Unified client prop
  walletClient?: UnifiedWalletClient;
  // Optional footer content above disconnect button
  footer?: React.ReactNode;
}

export const ChiaWalletButton: React.FC<ChiaWalletButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onWalletUpdate,
  className = '',
  style,
  walletClient,
  footer,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use provided client or fall back to hook
  const hookWalletClient = useUnifiedWalletClient();
  const actualWalletClient = walletClient || hookWalletClient;
  
  // Extract values for easier access
  const { walletState } = actualWalletClient;
  
  // Extract values for easier access
  const {
    isConnected,
    publicKey,
    address,
    totalBalance,
    coinCount,
    formattedBalance,
    error,
    isConnecting = false,
  } = walletState;
  
  // Memoize wallet data to prevent unnecessary re-renders
  const walletData = useMemo(() => ({
    isConnected,
    publicKey,
    address,
    totalBalance,
    coinCount,
    error,
  }), [isConnected, publicKey, address, totalBalance, coinCount, error]);

  // Use ref to track previous wallet data
  const prevWalletDataRef = useRef<any>(null);

  // Call onWalletUpdate only when wallet state actually changes
  useEffect(() => {
    if (onWalletUpdate) {
      const prevData = prevWalletDataRef.current;
      const currentData = walletData;
      
      // Only call onWalletUpdate if the data has actually changed
      if (!prevData || 
          prevData.isConnected !== currentData.isConnected ||
          prevData.publicKey !== currentData.publicKey ||
          prevData.address !== currentData.address ||
          prevData.totalBalance !== currentData.totalBalance ||
          prevData.coinCount !== currentData.coinCount ||
          prevData.error !== currentData.error) {
        
        prevWalletDataRef.current = currentData;
        onWalletUpdate(currentData);
      }
    }
  }, [onWalletUpdate, walletData]);
  
  const openModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const getButtonClasses = (): string => {
    const baseClasses = 'chia-wallet-btn';
    const variantClass = variant;
    const sizeClass = size;
    const stateClasses = [
      isConnected ? 'connected' : '',
      isConnecting ? 'connecting' : '',
      disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');
    
    return [baseClasses, variantClass, sizeClass, stateClasses, className]
      .filter(Boolean)
      .join(' ');
  };
  
  return (
    <>
      <button
        className={getButtonClasses()}
        onClick={openModal}
        disabled={disabled}
        aria-label="Open Chia wallet"
        style={style}
      >
        <div className="btn-content">
          <div className="chia-icon">🌱</div>
          <div className="btn-text-content">
            {isConnecting ? (
              <span className="btn-text">Connecting...</span>
            ) : isConnected && address ? (
              <>
                <span className="btn-text connected-text">
                  {formatAddress(address)}
                </span>
                {totalBalance > 0 ? (
                  <span className="btn-balance">
                    {formattedBalance}
                  </span>
                ) : (
                  <span className="btn-balance">Click to view balance</span>
                )}
              </>
            ) : (
              <span className="btn-text">Connect Chia</span>
            )}
          </div>
        </div>
      </button>

      <ChiaWalletModalWithProvider
        isOpen={isModalOpen}
        onClose={closeModal}
        onWalletUpdate={onWalletUpdate}
        walletClient={actualWalletClient}
        footer={footer}
      />
      
      <style>{`
        .chia-wallet-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          font-family: inherit;
          min-width: 120px;
        }

        .chia-wallet-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .chia-wallet-btn:hover::before {
          opacity: 0.1;
        }

        .chia-wallet-btn.primary {
          background: linear-gradient(45deg, #6bc36b, #4a9f4a);
          color: white;
        }

        .chia-wallet-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(107, 195, 107, 0.3);
        }

        .chia-wallet-btn.secondary {
          background: transparent;
          color: #6bc36b;
          border: 2px solid #6bc36b;
        }

        .chia-wallet-btn.secondary:hover {
          background: #6bc36b;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(107, 195, 107, 0.3);
        }

        /* Connected state styling */
        .chia-wallet-btn.connected {
          background: linear-gradient(45deg, #22c55e, #16a34a) !important;
          color: white !important;
          border-color: #22c55e !important;
        }

        .chia-wallet-btn.connected:hover {
          background: linear-gradient(45deg, #16a34a, #15803d) !important;
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3) !important;
        }

        /* Connecting state styling */
        .chia-wallet-btn.connecting {
          background: linear-gradient(45deg, #f59e0b, #d97706) !important;
          color: white !important;
          cursor: not-allowed !important;
        }

        .chia-wallet-btn.small {
          padding: 8px 16px;
          font-size: 14px;
          border-radius: 8px;
          min-width: 100px;
        }

        .chia-wallet-btn.medium {
          padding: 12px 24px;
          font-size: 16px;
          min-width: 140px;
        }

        .chia-wallet-btn.large {
          padding: 16px 32px;
          font-size: 18px;
          border-radius: 16px;
          min-width: 160px;
        }

        .chia-wallet-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .btn-content {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .btn-text-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .chia-icon {
          font-size: 1.2em;
          flex-shrink: 0;
        }

        .btn-text {
          white-space: nowrap;
          line-height: 1;
        }

        .connected-text {
          font-weight: 600;
          font-family: monospace;
        }

        .btn-balance {
          font-size: 0.8em;
          opacity: 0.9;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .chia-wallet-btn.medium {
            padding: 10px 20px;
            font-size: 14px;
            min-width: 120px;
          }
          
          .chia-wallet-btn.large {
            padding: 14px 28px;
            font-size: 16px;
            min-width: 140px;
          }

          .btn-content {
            gap: 6px;
          }

          .btn-balance {
            font-size: 0.75em;
          }
        }
      `}</style>
    </>
  );
}; 