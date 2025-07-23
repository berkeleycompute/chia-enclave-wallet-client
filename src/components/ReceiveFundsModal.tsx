import React, { useState, useEffect } from 'react';
import { useWalletConnection } from '../hooks/useChiaWalletSDK';

interface ReceiveFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveFundsModal: React.FC<ReceiveFundsModalProps> = ({ 
  isOpen, 
  onClose 
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

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-overlay receive-modal-overlay"
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <div className="modal-content receive-modal-content" role="document" tabIndex={0}>
          <div className="modal-header">
            <div className="header-content">
              <div className="wallet-icon">
                <div className="chia-logo">🌱</div>
              </div>
              <h3>Receive XCH</h3>
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
            ) : (
              <div className="receive-content">
                {/* QR Code Section */}
                <div className="qr-section">
                  <div className="qr-container">
                    {qrLoading ? (
                      <div className="qr-loading">
                        <div className="loading-spinner"></div>
                        <p>Generating QR Code...</p>
                      </div>
                    ) : qrCodeUrl ? (
                      <div className="qr-code">
                        <img src={qrCodeUrl} alt="Wallet Address QR Code" className="qr-image" />
                        <div className="qr-center-icon">🌱</div>
                      </div>
                    ) : (
                      <div className="qr-error">
                        <div className="qr-placeholder">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <rect x="7" y="7" width="3" height="3"></rect>
                            <rect x="14" y="7" width="3" height="3"></rect>
                            <rect x="7" y="14" width="3" height="3"></rect>
                            <rect x="14" y="14" width="3" height="3"></rect>
                          </svg>
                        </div>
                        <p>QR Code unavailable</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div className="address-section">
                  <h4>Your Wallet Address</h4>
                  <p className="address-description">Share this address to receive XCH payments</p>
                  
                  <div className="address-display">
                    <div className="address-text-container">
                      <span className="address-text">{address}</span>
                    </div>
                    <button 
                      onClick={handleCopyAddress}
                      className={`copy-btn ${copied ? 'copied' : ''}`}
                      title={copied ? 'Copied!' : 'Copy address'}
                    >
                      {copied ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="instructions-section">
                  <h4>How to Receive XCH</h4>
                  <div className="instruction-steps">
                    <div className="instruction-step">
                      <div className="step-number">1</div>
                      <p>Share your wallet address or QR code with the sender</p>
                    </div>
                    <div className="instruction-step">
                      <div className="step-number">2</div>
                      <p>Wait for the transaction to be confirmed on the blockchain</p>
                    </div>
                    <div className="instruction-step">
                      <div className="step-number">3</div>
                      <p>The XCH will appear in your wallet balance</p>
                    </div>
                  </div>
                </div>

              
              </div>
            )}
          </div>
 
        </div>
      </div>

      <style>{`
        .modal-overlay.receive-modal-overlay {
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

        .receive-modal-content {
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

        .receive-modal-content::-webkit-scrollbar {
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

        .error-state {
          text-align: center;
          padding: 40px 20px;
        }

        .error-message {
          color: #ef4444;
          margin: 0;
          font-size: 16px;
        }

        .receive-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .qr-section {
          display: flex;
          justify-content: center;
          margin-bottom: 4px;
        }

        .qr-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .qr-code {
          position: relative;
          display: inline-block;
          background: white;
          padding: 16px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          min-width: 200px;
          min-height: 200px;
        }

        .qr-image {
          display: block;
          width: 200px;
          height: 200px;
          border-radius: 8px;
        }

        .qr-center-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 8px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          font-size: 20px;
        }

        .qr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          color: #666;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top: 3px solid #6bc36b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .qr-loading p {
          margin: 0;
          font-size: 14px;
        }

        .qr-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #666;
        }

        .qr-placeholder {
          margin-bottom: 12px;
          color: #666;
        }

        .qr-error p {
          margin: 0;
          font-size: 14px;
        }

        .address-section {
          text-align: center;
        }

        .address-section h4 {
          margin: 0 0 8px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .address-description {
          margin: 0 0 16px 0;
          color: #888;
          font-size: 14px;
        }

        .address-display {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .address-display:hover {
          border-color: #6bc36b;
        }

        .address-text-container {
          flex: 1;
          min-width: 0;
        }

        .address-text {
          color: white;
          font-family: monospace;
          font-size: 13px;
          font-weight: 500;
          word-break: break-all;
          line-height: 1.4;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #6bc36b;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .copy-btn:hover {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .copy-btn.copied {
          background: #22c55e;
        }

        .instructions-section h4 {
          margin: 0 0 16px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .instruction-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .instruction-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #262626;
          border: 1px solid #333;
          border-radius: 8px;
        }

        .step-number {
          width: 24px;
          height: 24px;
          background: #6bc36b;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .instruction-step p {
          margin: 0;
          color: #ccc;
          font-size: 14px;
          line-height: 1.4;
        }

        .warning-section {
          background: #262626;
          border: 1px solid #fb923c;
          border-radius: 12px;
          padding: 16px;
        }

        .warning-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .warning-header svg {
          color: #fb923c;
          flex-shrink: 0;
        }

        .warning-header h4 {
          margin: 0;
          color: #fb923c;
          font-size: 14px;
          font-weight: 600;
        }

        .warning-list {
          margin: 0;
          padding-left: 20px;
          color: #fb923c;
        }

        .warning-list li {
          margin-bottom: 6px;
          font-size: 13px;
          line-height: 1.4;
        }

        .warning-list li:last-child {
          margin-bottom: 0;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #333;
          display: flex;
          justify-content: center;
        }

        .close-modal-btn {
          padding: 12px 32px;
          background: none;
          border: 1px solid #333;
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .close-modal-btn:hover {
          background: #333;
          color: white;
          border-color: #404040;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .receive-modal-content {
            width: 95%;
            margin: 1rem;
          }

          .qr-code {
            padding: 12px;
          }

          .qr-image {
            width: 160px;
            height: 160px;
          }

          .address-display {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }

          .copy-btn {
            align-self: center;
          }
        }
      `}</style>
    </>
  );
}; 