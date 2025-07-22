import React, { useState } from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="receive-funds-modal-overlay">
      <div className="receive-funds-modal">
        <div className="modal-header">
          <h2>📥 Receive XCH</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!isConnected ? (
            <div className="error-state">
              <p>❌ Wallet not connected. Please connect your wallet first.</p>
            </div>
          ) : (
            <div className="receive-content">
              <div className="info-section">
                <h3>Your Wallet Address</h3>
                <p>Share this address to receive XCH payments:</p>
              </div>

              <div className="address-section">
                <div className="address-display">
                  <code className="address-text">{address}</code>
                  <button 
                    onClick={handleCopyAddress}
                    className="copy-button"
                    title="Copy address"
                  >
                    {copied ? '✅' : '📋'}
                  </button>
                </div>
                {copied && (
                  <div className="copy-success">
                    ✅ Address copied to clipboard!
                  </div>
                )}
              </div>

              <div className="instructions">
                <h4>How to receive XCH:</h4>
                <ol>
                  <li>Copy your wallet address above</li>
                  <li>Share it with the sender</li>
                  <li>Wait for the transaction to be confirmed</li>
                  <li>The XCH will appear in your balance</li>
                </ol>
              </div>

              <div className="warning">
                <h4>⚠️ Important:</h4>
                <ul>
                  <li>Only share this address for Chia (XCH) transactions</li>
                  <li>Double-check the address before sharing</li>
                  <li>Transactions are irreversible once confirmed</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="close-modal-button">
            Close
          </button>
        </div>

        <style>{`
          .receive-funds-modal-overlay {
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

          .receive-funds-modal {
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
            background: linear-gradient(135deg, #22c55e, #16a34a);
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

          .error-state {
            text-align: center;
            padding: 2rem;
            color: #dc2626;
          }

          .receive-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .info-section h3 {
            margin: 0 0 0.5rem 0;
            color: #374151;
          }

          .info-section p {
            margin: 0;
            color: #6b7280;
          }

          .address-section {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .address-display {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
          }

          .address-text {
            flex: 1;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
            color: #374151;
            background: none;
            border: none;
            padding: 0;
          }

          .copy-button {
            padding: 8px 12px;
            background: #22c55e;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            white-space: nowrap;
            transition: background 0.2s;
          }

          .copy-button:hover {
            background: #16a34a;
          }

          .copy-success {
            color: #16a34a;
            font-size: 14px;
            font-weight: 500;
          }

          .instructions {
            background: #f0f9ff;
            border: 1px solid #e0f2fe;
            border-radius: 8px;
            padding: 1rem;
          }

          .instructions h4 {
            margin: 0 0 0.75rem 0;
            color: #0369a1;
          }

          .instructions ol {
            margin: 0;
            padding-left: 1.25rem;
            color: #1e40af;
          }

          .instructions li {
            margin-bottom: 0.25rem;
          }

          .warning {
            background: #fffbeb;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 1rem;
          }

          .warning h4 {
            margin: 0 0 0.75rem 0;
            color: #d97706;
          }

          .warning ul {
            margin: 0;
            padding-left: 1.25rem;
            color: #92400e;
          }

          .warning li {
            margin-bottom: 0.25rem;
          }

          .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
          }

          .close-modal-button {
            width: 100%;
            padding: 12px 24px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
          }

          .close-modal-button:hover {
            background: #4b5563;
          }

          /* Responsive */
          @media (max-width: 640px) {
            .receive-funds-modal {
              width: 95%;
              margin: 1rem;
            }

            .address-display {
              flex-direction: column;
              align-items: stretch;
            }

            .copy-button {
              align-self: flex-end;
            }
          }
        `}</style>
      </div>
    </div>
  );
}; 