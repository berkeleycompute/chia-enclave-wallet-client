import React, { useState } from 'react';
import { 
  DialogProvider,
  useSendFundsDialog,
  useMakeOfferDialog,
  useReceiveFundsDialog,
  useActiveOffersDialog,
  useNFTDetailsDialog,
  useWalletMainDialog,
  useAllDialogs
} from '../hooks/useDialogs';
import { HydratedCoin } from '../client/ChiaCloudWalletClient';
import { SendFundsModal } from './SendFundsModal';
import { ReceiveFundsModal } from './ReceiveFundsModal';
import { MakeOfferModal } from './MakeOfferModal';
import { ActiveOffersModal } from './ActiveOffersModal';
import { NFTDetailsModal } from './NFTDetailsModal';

// Create mock NFT data for testing
const createMockNft = (): HydratedCoin => ({
  coin: {
    parentCoinInfo: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    puzzleHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    amount: "1"
  },
  createdHeight: "2500000",
  parentSpendInfo: {
    coin: {
      parentCoinInfo: "0x0000000000000000000000000000000000000000000000000000000000000000",
      puzzleHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      amount: "0"
    },
    driverInfo: {
      type: 'NFT',
      info: {
        launcherId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        currentOwner: "xch1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
        metadata: {
          dataHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
          dataUris: ["https://example.com/nft-image.png"],
          metadataHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
          metadataUris: ["https://example.com/nft-metadata.json"],
          editionNumber: "1",
          editionTotal: "100"
        }
      }
    },
    parentCoinId: "0x4444444444444444444444444444444444444444444444444444444444444444",
    spentBlockIndex: 2499999
  }
});

// Test component for individual dialog hooks
const DialogHooksTester: React.FC = () => {
  const sendFundsDialog = useSendFundsDialog();
  const makeOfferDialog = useMakeOfferDialog();
  const receiveFundsDialog = useReceiveFundsDialog();
  const activeOffersDialog = useActiveOffersDialog();
  const nftDetailsDialog = useNFTDetailsDialog();
  const walletMainDialog = useWalletMainDialog();

  const [mockNft] = useState<HydratedCoin>(createMockNft());

  return (
    <div className="dialog-hooks-tester">
      <h3>🧪 Dialog Hooks Test Panel</h3>
      <p className="test-description">
        Click these buttons to test each dialog hook independently:
      </p>
      
      <div className="test-buttons-grid">
        <button 
          onClick={sendFundsDialog.open}
          className={`test-btn ${sendFundsDialog.isOpen ? 'active' : ''}`}
        >
          <span className="btn-icon">💸</span>
          <span className="btn-text">Send Funds</span>
          <span className="btn-status">{sendFundsDialog.isOpen ? '🟢' : '⚪'}</span>
        </button>

        <button 
          onClick={receiveFundsDialog.open}
          className={`test-btn ${receiveFundsDialog.isOpen ? 'active' : ''}`}
        >
          <span className="btn-icon">💰</span>
          <span className="btn-text">Receive Funds</span>
          <span className="btn-status">{receiveFundsDialog.isOpen ? '🟢' : '⚪'}</span>
        </button>

        <button 
          onClick={() => makeOfferDialog.open(mockNft)}
          className={`test-btn ${makeOfferDialog.isOpen ? 'active' : ''}`}
        >
          <span className="btn-icon">🤝</span>
          <span className="btn-text">Make Offer</span>
          <span className="btn-status">{makeOfferDialog.isOpen ? '🟢' : '⚪'}</span>
        </button>

        <button 
          onClick={activeOffersDialog.open}
          className={`test-btn ${activeOffersDialog.isOpen ? 'active' : ''}`}
        >
          <span className="btn-icon">📋</span>
          <span className="btn-text">Active Offers</span>
          <span className="btn-status">{activeOffersDialog.isOpen ? '🟢' : '⚪'}</span>
        </button>

        <button 
          onClick={() => nftDetailsDialog.open(mockNft)}
          className={`test-btn ${nftDetailsDialog.isOpen ? 'active' : ''}`}
        >
          <span className="btn-icon">🖼️</span>
          <span className="btn-text">NFT Details</span>
          <span className="btn-status">{nftDetailsDialog.isOpen ? '🟢' : '⚪'}</span>
        </button>

        <button 
          onClick={walletMainDialog.open}
          className={`test-btn ${walletMainDialog.isOpen ? 'active' : ''}`}
        >
          <span className="btn-icon">🌱</span>
          <span className="btn-text">Wallet Main</span>
          <span className="btn-status">{walletMainDialog.isOpen ? '🟢' : '⚪'}</span>
        </button>
      </div>

      {/* Real-time dialog status */}
      <div className="dialog-status-panel">
        <h4>📊 Live Dialog Status</h4>
        <div className="status-grid">
          <div className={`status-item ${sendFundsDialog.isOpen ? 'active' : ''}`}>
            <span className="status-label">Send Funds:</span>
            <span className="status-value">{sendFundsDialog.isOpen ? '✅ Open' : '❌ Closed'}</span>
          </div>
          <div className={`status-item ${receiveFundsDialog.isOpen ? 'active' : ''}`}>
            <span className="status-label">Receive Funds:</span>
            <span className="status-value">{receiveFundsDialog.isOpen ? '✅ Open' : '❌ Closed'}</span>
          </div>
          <div className={`status-item ${makeOfferDialog.isOpen ? 'active' : ''}`}>
            <span className="status-label">Make Offer:</span>
            <span className="status-value">{makeOfferDialog.isOpen ? '✅ Open' : '❌ Closed'}</span>
            {makeOfferDialog.selectedNft && (
              <div className="selected-nft-info">
                📦 Selected NFT: {makeOfferDialog.selectedNft.coin.parentCoinInfo.slice(0, 10)}...
              </div>
            )}
          </div>
          <div className={`status-item ${activeOffersDialog.isOpen ? 'active' : ''}`}>
            <span className="status-label">Active Offers:</span>
            <span className="status-value">{activeOffersDialog.isOpen ? '✅ Open' : '❌ Closed'}</span>
          </div>
          <div className={`status-item ${nftDetailsDialog.isOpen ? 'active' : ''}`}>
            <span className="status-label">NFT Details:</span>
            <span className="status-value">{nftDetailsDialog.isOpen ? '✅ Open' : '❌ Closed'}</span>
            {nftDetailsDialog.selectedNft && (
              <div className="selected-nft-info">
                🖼️ Selected NFT: {nftDetailsDialog.selectedNft.coin.parentCoinInfo.slice(0, 10)}...
              </div>
            )}
          </div>
          <div className={`status-item ${walletMainDialog.isOpen ? 'active' : ''}`}>
            <span className="status-label">Wallet Main:</span>
            <span className="status-value">{walletMainDialog.isOpen ? '✅ Open' : '❌ Closed'}</span>
          </div>
        </div>
      </div>

      {/* Mock modals for testing */}
      <SendFundsModal
        isOpen={sendFundsDialog.isOpen}
        onClose={sendFundsDialog.close}
        client={null}
        publicKey="xch1test..."
        unspentCoins={[]}
        onTransactionSent={() => console.log('Transaction sent!')}
      />
      
      <ReceiveFundsModal
        isOpen={receiveFundsDialog.isOpen}
        onClose={receiveFundsDialog.close}
        publicKey="xch1test..."
      />

      <MakeOfferModal
        isOpen={makeOfferDialog.isOpen}
        onClose={makeOfferDialog.close}
        client={null}
        publicKey="xch1test..."
        syntheticPublicKey="test_synthetic_key"
        hydratedCoins={[mockNft]}
        nftMetadata={new Map()}
        loadingMetadata={new Set()}
        onOfferCreated={(offer) => console.log('Offer created:', offer)}
        onRefreshWallet={() => console.log('Refresh wallet')}
      />

      <ActiveOffersModal
        isOpen={activeOffersDialog.isOpen}
        onClose={activeOffersDialog.close}
        publicKey="xch1test..."
        nftMetadata={new Map()}
        loadingMetadata={new Set()}
        onOfferUpdate={() => console.log('Offer updated')}
      />

      <NFTDetailsModal
        isOpen={nftDetailsDialog.isOpen}
        onClose={nftDetailsDialog.close}
        selectedNft={nftDetailsDialog.selectedNft}
        nftMetadata={new Map()}
        loadingMetadata={new Set()}
      />
    </div>
  );
};

// Compound hook tester
const CompoundHookTester: React.FC = () => {
  const dialogs = useAllDialogs();

  return (
    <div className="compound-hook-tester">
      <h3>🎛️ Compound Hook Test Panel</h3>
      <p className="test-description">
        Test the useAllDialogs() compound hook:
      </p>
      
      <div className="compound-actions">
        <button onClick={dialogs.sendFunds.open} className="compound-btn">
          📤 Send Funds
        </button>

        <button onClick={dialogs.receiveFunds.open} className="compound-btn">
          📥 Receive Funds
        </button>

        <button onClick={dialogs.activeOffers.open} className="compound-btn">
          📋 Active Offers
        </button>

        <button 
          onClick={dialogs.closeAllDialogs}
          className="compound-btn danger"
        >
          🚫 Close All Dialogs
        </button>
      </div>

      <div className="compound-status">
        <p className="global-status">
          <span className="status-indicator">
            {dialogs.isAnyDialogOpen ? '🔴' : '🟢'}
          </span>
          Global Status: {dialogs.isAnyDialogOpen ? 'Some Dialog Open' : 'All Dialogs Closed'}
        </p>
      </div>
    </div>
  );
};

// Main test app component
const DialogTestApp: React.FC = () => {
  return (
    <DialogProvider>
      <div className="dialog-test-app">
        <h1>🧪 Chia Wallet Dialog Hooks Test Suite</h1>
        <p className="app-description">
          This is a comprehensive test interface for the new dialog hooks system. 
          Test each dialog independently or use the compound hook to manage multiple dialogs.
        </p>
        
        <div className="test-sections">
          <DialogHooksTester />
          <CompoundHookTester />
        </div>
      </div>
    </DialogProvider>
  );
};

// Add comprehensive styling
const TestStyles: React.FC = () => (
  <style>{`
    .dialog-test-app {
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
    }

    .dialog-test-app h1 {
      color: #1e293b;
      text-align: center;
      margin-bottom: 10px;
    }

    .app-description {
      text-align: center;
      color: #64748b;
      margin-bottom: 30px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .test-sections {
      display: flex;
      flex-direction: column;
      gap: 30px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dialog-hooks-tester, .compound-hook-tester {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }

    .dialog-hooks-tester h3, .compound-hook-tester h3 {
      margin: 0 0 8px 0;
      color: #1e293b;
    }

    .test-description {
      color: #64748b;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .test-buttons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .test-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .test-btn:hover {
      border-color: #6366f1;
      background: #fafbff;
      transform: translateY(-1px);
    }

    .test-btn.active {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .btn-icon {
      font-size: 18px;
    }

    .btn-text {
      flex: 1;
      color: #1e293b;
    }

    .btn-status {
      font-size: 16px;
    }

    .dialog-status-panel {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }

    .dialog-status-panel h4 {
      margin: 0 0 16px 0;
      color: #1e293b;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 4px solid #e2e8f0;
      transition: all 0.2s;
    }

    .status-item.active {
      background: #f0fdf4;
      border-left-color: #10b981;
    }

    .status-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
    }

    .status-value {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .selected-nft-info {
      font-size: 11px;
      color: #6366f1;
      background: #fafbff;
      padding: 4px 8px;
      border-radius: 4px;
      margin-top: 4px;
      font-family: monospace;
    }

    .compound-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }

    .compound-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      background: #6366f1;
      color: white;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .compound-btn:hover {
      background: #4f46e5;
      transform: translateY(-1px);
    }

    .compound-btn.danger {
      background: #dc2626;
    }

    .compound-btn.danger:hover {
      background: #b91c1c;
    }

    .compound-status {
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .global-status {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #1e293b;
    }

    .status-indicator {
      font-size: 12px;
    }

    @media (max-width: 768px) {
      .test-buttons-grid {
        grid-template-columns: 1fr;
      }
      
      .status-grid {
        grid-template-columns: 1fr;
      }
      
      .compound-actions {
        flex-direction: column;
      }
      
      .compound-btn {
        width: 100%;
      }
    }
  `}</style>
);

export default DialogTestApp;
export { DialogHooksTester, CompoundHookTester, TestStyles }; 