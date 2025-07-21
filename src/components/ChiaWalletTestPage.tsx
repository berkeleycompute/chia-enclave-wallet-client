import React, { useState } from 'react';
import { DialogProvider } from '../hooks/useDialogs';
import { ChiaWalletButton } from './ChiaWalletButton';
import DialogTestApp from './ExampleUsage';

interface ChiaWalletTestPageProps {
  jwtToken?: string;
}

export const ChiaWalletTestPage: React.FC<ChiaWalletTestPageProps> = ({ 
  jwtToken 
}) => {
  const [showFullTest, setShowFullTest] = useState(false);

  return (
    <div className="test-page-container">
      <header className="test-header">
        <h1>🧪 Chia Wallet Dialog Hooks Test Suite</h1>
        <p className="header-description">
          Complete testing interface for the new Chia wallet dialog hooks system
        </p>
      </header>

      {/* JWT Status */}
      <div className="jwt-status-section">
        <div className={`jwt-badge ${jwtToken ? 'success' : 'error'}`}>
          {jwtToken ? '✅ JWT Token Available' : '❌ No JWT Token'}
        </div>
        {jwtToken && (
          <div className="jwt-preview">
            Token: {jwtToken.substring(0, 30)}...
          </div>
        )}
      </div>

      {/* Quick Test Section - ChiaWalletButton */}
      <section className="quick-test-section">
        <h2>🚀 Quick Test - Chia Wallet Button</h2>
        <p className="section-description">
          This is the actual ChiaWalletButton with all dialog functionality:
        </p>
        
        <div className="wallet-button-container">
          <ChiaWalletButton
            jwtToken={jwtToken}
            variant="primary"
            size="large"
            onWalletUpdate={(walletData) => {
              console.log('Wallet updated:', walletData);
            }}
          />
        </div>
        
        <div className="instructions">
          <h3>Instructions:</h3>
          <ol>
            <li><strong>Click the Chia Wallet Button</strong> above</li>
            <li><strong>Main wallet modal will open</strong> with all functionality</li>
            <li><strong>Click "Send", "Receive", "Make Offer", etc.</strong> to test individual dialogs</li>
            <li><strong>All dialogs use the new hook system</strong> behind the scenes</li>
          </ol>
        </div>
      </section>

      {/* Advanced Test Section */}
      <section className="advanced-test-section">
        <h2>🔬 Advanced Testing - Individual Dialog Hooks</h2>
        <p className="section-description">
          Detailed testing interface for individual dialog hooks:
        </p>
        
        <button 
          className={`toggle-test-btn ${showFullTest ? 'active' : ''}`}
          onClick={() => setShowFullTest(!showFullTest)}
        >
          {showFullTest ? '🔼 Hide' : '🔽 Show'} Advanced Test Interface
        </button>
        
        {showFullTest && (
          <div className="full-test-container">
            <DialogTestApp />
          </div>
        )}
      </section>

      {/* Usage Examples */}
      <section className="usage-examples">
        <h2>📝 Usage Examples</h2>
        
        <div className="example-section">
          <h3>Basic ChiaWalletButton Integration:</h3>
          <pre className="code-block">
{`import { ChiaWalletButton } from 'chia-enclave-wallet-client';

function MyApp() {
  return (
    <ChiaWalletButton
      jwtToken="${jwtToken ? jwtToken.substring(0, 20) + '...' : 'YOUR_JWT_TOKEN'}"
      variant="primary"
      onWalletUpdate={handleWalletUpdate}
    />
  );
}`}
          </pre>
        </div>

        <div className="example-section">
          <h3>Individual Dialog Hooks:</h3>
          <pre className="code-block">
{`import { 
  DialogProvider, 
  useSendFundsDialog, 
  useMakeOfferDialog 
} from 'chia-enclave-wallet-client';

function MyComponent() {
  const sendFunds = useSendFundsDialog();
  const makeOffer = useMakeOfferDialog();
  
  return (
    <DialogProvider>
      <button onClick={sendFunds.open}>
        Send Funds
      </button>
      <button onClick={() => makeOffer.open(nftData)}>
        Make Offer
      </button>
      
      {/* Modals render automatically when hooks are used */}
    </DialogProvider>
  );
}`}
          </pre>
        </div>
      </section>

      <style>{`
        .test-page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }

        .test-header {
          text-align: center;
          margin-bottom: 2rem;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .test-header h1 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 2rem;
        }

        .header-description {
          color: #64748b;
          margin: 0;
          font-size: 1.1rem;
        }

        .jwt-status-section {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .jwt-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .jwt-badge.success {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .jwt-badge.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .jwt-preview {
          font-family: monospace;
          color: #64748b;
          font-size: 12px;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .quick-test-section, .advanced-test-section, .usage-examples {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .quick-test-section h2, .advanced-test-section h2, .usage-examples h2 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .section-description {
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        .wallet-button-container {
          display: flex;
          justify-content: center;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 2px dashed #cbd5e1;
          margin-bottom: 1.5rem;
        }

        .instructions {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 1rem;
        }

        .instructions h3 {
          margin: 0 0 0.5rem 0;
          color: #0369a1;
        }

        .instructions ol {
          margin: 0;
          color: #0c4a6e;
        }

        .instructions li {
          margin-bottom: 0.5rem;
        }

        .toggle-test-btn {
          background: #6366f1;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1rem;
        }

        .toggle-test-btn:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .toggle-test-btn.active {
          background: #10b981;
        }

        .full-test-container {
          margin-top: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .example-section {
          margin-bottom: 1.5rem;
        }

        .example-section h3 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
        }

        .code-block {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        @media (max-width: 768px) {
          .test-page-container {
            padding: 10px;
          }
          
          .test-header, .quick-test-section, .advanced-test-section, .usage-examples {
            padding: 1rem;
          }
          
          .wallet-button-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ChiaWalletTestPage; 