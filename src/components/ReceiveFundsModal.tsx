import React, { useState, useEffect } from 'react';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import { PiCaretLeft, PiCheck, PiCopy, PiX } from 'react-icons/pi';

interface ReceiveFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseWallet?: () => void;
}

export const ReceiveFundsModal: React.FC<ReceiveFundsModalProps> = ({
  isOpen,
  onClose,
  onCloseWallet
}) => {
  const { isConnected, address } = useWalletConnection();
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Generate QR code when address changes
  useEffect(() => {
    const generateQrCode = async () => {
      if (!address) {
        setQrCodeUrl(null);
        return;
      }

      setQrLoading(true);
      try {
        // Use a QR code API service to generate the QR code
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
        setQrCodeUrl(null);
      } finally {
        setQrLoading(false);
      }
    };

    if (isConnected && address) {
      generateQrCode();
    }
  }, [address, isConnected]);

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="p-4 md:p-5 space-y-6">
      {!isConnected ? (
        <div className="p-4 mb-4 text-sm text-red-500 rounded-lg text-center">
          <p style={{ color: '#ef4444' }}>Wallet not connected. Please connect your wallet first.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* QR Code Section */}
          <div className="flex justify-center">
            <div className="flex justify-center items-center p-2 bg-white rounded-md">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center p-10 text-gray-500">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm">Generating QR Code...</p>
                </div>
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Wallet Address QR Code"
                  className="block rounded-md"
                  style={{ width: '200px', height: '200px' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-gray-500">
                  <div className="mb-3 text-gray-500">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <rect x="7" y="7" width="3" height="3"></rect>
                      <rect x="14" y="7" width="3" height="3"></rect>
                      <rect x="7" y="14" width="3" height="3"></rect>
                      <rect x="14" y="14" width="3" height="3"></rect>
                    </svg>
                  </div>
                  <p className="text-sm">QR Code unavailable</p>
                </div>
              )}
            </div>
          </div>

          {/* Address Section */}
          <div
            className="flex items-center justify-between rounded-lg border py-2.5"
            style={{
              backgroundColor: '#1B1C22',
              borderColor: '#272830',
              padding: '12px'
            }}
          >
            <span className="font-mono" style={{ color: '#EEEEF0' }}>{address?.slice(0, 7)}...{address?.slice(-4)}</span>
            <button
              onClick={handleCopyAddress}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${copied ? '' : 'hover:text-[#EEEEF0] hover:bg-[#23242b]'}`}
              style={copied ? { color: '#22c55e', backgroundColor: '#1f2a21' } : { color: '#7C7A85' }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.color = '#EEEEF0';
                  e.currentTarget.style.backgroundColor = '#23242b';
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.color = '#7C7A85';
                } else {
                  e.currentTarget.style.color = '#22c55e';
                }
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={copied ? 'Copied!' : 'Copy address'}
              aria-label="Copy address"
            >
              {copied ? (
                <PiCheck size={20} color="#22c55e" />
              ) : (
                <PiCopy size={20} />
              )}
            </button>
          </div>
          <p className="text-center text-sm" style={{ color: '#7C7A85' }}>Copy the address to send funds to this wallet</p>
        </div>
      )}
    </div>
  );
}; 
