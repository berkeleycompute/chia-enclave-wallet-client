import React, { useState, useEffect } from 'react';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';
import { PiCaretLeft, PiCopy, PiX } from 'react-icons/pi';

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

  /*
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };
  */

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay receive-modal-overlay fixed top-0 right-0 left-0 z-50 flex items-center justify-center w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={0}
      style={{ zIndex: 1001 }}
    >
      <div className="relative p-4 w-full max-w-md max-h-full">
        <div className="relative bg-[#131418] rounded-2xl border border-[#272830] text-[#EEEEF0]" role="document" tabIndex={0}>
          <div className="flex items-center justify-between px-4 py-5 border-b border-[#272830] rounded-t">
            <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={onClose} aria-label="Back">
              <PiCaretLeft size={20} />
            </button>
            <h3 className=" text-[#EEEEF0] text-xl font-medium leading-[1.5] text-left">Receive XCH</h3>
              <button className="bg-transparent border-0 text-[#7C7A85] p-1 rounded transition-colors flex items-center justify-center w-6 h-6 hover:text-[#EEEEF0]" onClick={onCloseWallet || onClose} aria-label="Close modal">
              <PiX size={20} />
            </button>
          </div>

          <div className="p-4 md:p-5 space-y-6">
            {!isConnected ? (
              <div className="p-4 mb-4 text-sm text-red-800 rounded-lg text-center dark:bg-gray-800 dark:text-red-400">
                <p className="text-[#ef4444]">Wallet not connected. Please connect your wallet first.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* QR Code Section */}
                <div className="flex justify-center">
                  <div className="flex justify-center items-center p-2 bg-white rounded-md">
                    {qrLoading ? (
                      <div className="flex flex-col items-center justify-center p-10 text-gray-500">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                        <p className=" text-sm">Generating QR Code...</p>
                      </div>
                    ) : qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="Wallet Address QR Code" className="block w-[200px] h-[200px] rounded-md" />
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
                        <p className=" text-sm">QR Code unavailable</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div className="flex items-center justify-between py-2.5 px-3.5 bg-[#1B1C22] border border-[#272830] rounded-lg">
                  <span className="text-[#EEEEF0] font-mono">{address?.slice(0, 7)}...{address?.slice(-4)}</span>
                  <button
                    onClick={handleCopyAddress}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${copied ? 'text-[#22c55e] bg-[#1f2a21]' : 'text-[#7C7A85] hover:text-[#EEEEF0] hover:bg-[#23242b]'}`}
                    title={copied ? 'Copied!' : 'Copy address'}
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                    ) : (
                      <PiCopy size={20} />
                    )}
                  </button>
                </div>
                <p className="text-center text-sm text-[#7C7A85]">Copy the address to send funds to this wallet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 