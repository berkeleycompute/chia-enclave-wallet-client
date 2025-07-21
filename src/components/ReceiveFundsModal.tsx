import React, { useState, useEffect } from 'react';

interface ReceiveFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string | null;
}

export const ReceiveFundsModal: React.FC<ReceiveFundsModalProps> = ({ 
  isOpen, 
  onClose, 
  publicKey 
}) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };

  const generateQRCode = async (text: string): Promise<void> => {
    try {
      // Simple QR code generation using a service (you might want to use a proper QR library)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(text)}`;
      setQrCodeDataUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrCodeDataUrl('');
    }
  };

  useEffect(() => {
    if (publicKey) {
      generateQRCode(publicKey);
    }
  }, [publicKey]);

  const copyToClipboard = async () => {
    if (!publicKey) return;
    
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const closeModal = () => {
    onClose();
    setCopied(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay receive-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal-content receive-modal-content">
        <div className="modal-header">
          <button className="back-btn" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h2>Receive Funds</h2>
          <button className="close-btn" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {publicKey ? (
            <>
              <div className="qr-section">
                <div className="qr-code">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR Code for wallet address" className="qr-image" />
                  ) : (
                    <div className="qr-loading">
                      <div className="loading-spinner"></div>
                      <p>Generating QR code...</p>
                    </div>
                  )}
                  <div className="qr-center-icon">
                    🌱
                  </div>
                </div>
              </div>

              <div className="address-section">
                <div className="address-display">
                  <span className="address-text">{formatAddress(publicKey)}</span>
                  <button 
                    className={`copy-btn ${copied ? 'copied' : ''}`}
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="address-description">
                  Copy the address to send funds to this wallet
                </p>
              </div>
            </>
          ) : (
            <div className="error-state">
              <p>No wallet address available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 