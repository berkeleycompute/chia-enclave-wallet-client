import React, { useState } from 'react';
import { ChiaWalletSDKProvider } from '../providers/ChiaWalletSDKProvider';
import { ChiaWalletButton } from '../components/ChiaWalletButton';
import { ChiaWalletModal } from '../components/ChiaWalletModal';
import { useRawSDK, useUnifiedWalletState, useUnifiedWalletClient } from '../hooks/useChiaWalletSDK';
import { UnifiedWalletState, createUnifiedWalletState } from '../components/types';
import { ChiaWalletSDK } from '../client/ChiaWalletSDK';
import { UnifiedWalletClient } from '../client/UnifiedWalletClient';

/**
 * Example showing how to use the unified wallet client
 * This demonstrates different approaches for managing wallet functionality:
 * 
 * 1. Default behavior: Components use hooks internally (simplest)
 * 2. Unified Client: Pass a single client with SDK and state (RECOMMENDED)
 * 3. Manual control: Full control over modal and state
 * 4. External data: Create client from your own data sources
 * 
 * BEST APPROACH: Use `useUnifiedWalletClient()` hook to get a complete
 * client that contains both SDK and wallet state in a single object.
 */

const UnifiedWalletContent: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Get SDK and unified wallet state using hooks
  const sdk = useRawSDK();
  const unifiedWalletState = useUnifiedWalletState();
  
  // Get the unified wallet client (BEST approach)
  const walletClient = useUnifiedWalletClient();

  const handleWalletUpdate = (walletData: any) => {
    console.log('Wallet state updated:', walletData);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Unified Wallet Example</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Approach 1: Using hooks (default behavior)</h2>
        <p>Components use hooks internally - no props needed:</p>
        <ChiaWalletButton onWalletUpdate={handleWalletUpdate} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Approach 2: Unified Client (RECOMMENDED)</h2>
        <p>Pass a single unified client that contains both SDK and state:</p>
        <ChiaWalletButton 
          walletClient={walletClient}
          onWalletUpdate={handleWalletUpdate}
        />
      </div>



      <div style={{ marginBottom: '20px' }}>
        <h2>Approach 3: Manual modal control</h2>
        <p>Control the modal manually with unified client:</p>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6bc36b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Open Wallet Modal
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Approach 4: Creating client from external data</h2>
        <p>Create unified client from your own data sources:</p>
        <button 
          onClick={() => {
            // Example: Create wallet client from external API data
            const externalWalletState = createUnifiedWalletState({
              isConnected: true,
              address: 'xch1test...example',
              totalBalance: 1500000000000, // 1.5 XCH in mojos
              coinCount: 3,
              formattedBalance: '1.500000',
              publicKey: 'test_public_key',
              syntheticPublicKey: 'test_synthetic_public_key',
              error: null,
              isConnecting: false,
            });
            
            const externalClient = UnifiedWalletClient.create(sdk, externalWalletState);
            
            console.log('Created external wallet client:', externalClient.getSummary());
            alert('Check console for created wallet client example');
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Demo External Client Creation
        </button>
      </div>

      <ChiaWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        walletClient={walletClient}
        onWalletUpdate={handleWalletUpdate}
      />

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Current Wallet State:</h3>
        <h4>Unified Client Summary:</h4>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(walletClient.getSummary(), null, 2)}
        </pre>
        <h4>Full Wallet State:</h4>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(unifiedWalletState, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export const UnifiedWalletExample: React.FC = () => {
  return (
    <ChiaWalletSDKProvider>
      <UnifiedWalletContent />
    </ChiaWalletSDKProvider>
  );
};

export default UnifiedWalletExample; 