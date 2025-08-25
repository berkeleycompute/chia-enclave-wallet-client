import React, { useState } from 'react';
import { useUnifiedWalletClient } from '../hooks/useChiaWalletSDK';
import { useChiaNFTMint, type ChiaNFTMintConfig } from '../hooks/useChiaNFTMint';

/**
 * Debug component to test NFT minting step by step
 */
export function NFTMintDebugger() {
  const sdk = useUnifiedWalletClient();
  const isConnected = sdk.isConnected;
  
  const {
    isMinting,
    mintError,
    lastNFTId,
    mintNFT,
    validateMintConfig
  } = useChiaNFTMint({
    sdk: sdk as any,
    enableLogging: true,
    onMintStart: (mintId) => {
      console.log('🚀 Debug: Mint started:', mintId);
      setDebugLog(prev => prev + `\n🚀 Mint started: ${mintId}`);
    },
    onMintSuccess: (mintId, nftId) => {
      console.log('✅ Debug: Mint successful:', { mintId, nftId });
      setDebugLog(prev => prev + `\n✅ Mint successful: ${nftId}`);
    },
    onMintError: (mintId, error) => {
      console.error('❌ Debug: Mint failed:', { mintId, error });
      setDebugLog(prev => prev + `\n❌ Mint failed: ${error}`);
    }
  });

  const [debugLog, setDebugLog] = useState<string>('Debug Log:\n==========\n');

  // Sample minimal valid configuration
  const testConfig: ChiaNFTMintConfig = {
    name: 'Test NFT Debug',
    description: 'A test NFT for debugging minting issues',
    imageUrl: 'https://via.placeholder.com/512x512.png?text=TEST+NFT',
    metadataUrl: 'https://example.com/test-metadata.json',
    dataHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    metadataHash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    editionNumber: 1,
    editionTotal: 1,
    royaltyPercentage: 0
  };

  const handleValidateConfig = () => {
    console.log('🔍 Testing config validation...');
    setDebugLog(prev => prev + `\n🔍 Testing config validation...`);
    
    const validation = validateMintConfig(testConfig);
    console.log('📋 Validation result:', validation);
    setDebugLog(prev => prev + `\n📋 Validation result: ${validation.isValid ? 'VALID' : 'INVALID - ' + validation.error}`);
  };

  const handleTestMint = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    console.log('🧪 Starting test mint...');
    setDebugLog(prev => prev + `\n🧪 Starting test mint...`);

    try {
      const result = await mintNFT(testConfig);
      console.log('🧪 Test mint result:', result);
      setDebugLog(prev => prev + `\n🧪 Test mint result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('🧪 Test mint error:', error);
      setDebugLog(prev => prev + `\n🧪 Test mint error: ${error}`);
    }
  };

  const handleClearLog = () => {
    setDebugLog('Debug Log:\n==========\n');
  };

  const handleCheckWalletData = async () => {
    if (!sdk.client) {
      setDebugLog(prev => prev + `\n❌ No client available`);
      return;
    }

    try {
      console.log('🔍 Checking wallet data...');
      setDebugLog(prev => prev + `\n🔍 Checking wallet data...`);

      // Test public key
      const publicKeyResult = await sdk.client.getPublicKey();
      console.log('🔑 Public key result:', publicKeyResult);
      setDebugLog(prev => prev + `\n🔑 Public key: ${publicKeyResult.success ? 'SUCCESS' : 'FAILED - ' + publicKeyResult.error}`);

      if (publicKeyResult.success) {
        const address = publicKeyResult.data.address;
        setDebugLog(prev => prev + `\n📍 Address: ${address}`);

        // Test coins
        const coinsResult = await sdk.client.getUnspentHydratedCoins(address);
        console.log('🪙 Coins result:', coinsResult);
        setDebugLog(prev => prev + `\n🪙 Coins: ${coinsResult.success ? coinsResult.data.data.length + ' available' : 'FAILED - ' + coinsResult.error}`);
      }
    } catch (error) {
      console.error('🔍 Wallet check error:', error);
      setDebugLog(prev => prev + `\n🔍 Wallet check error: ${error}`);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'monospace'
    }}>
      <h2>🔧 NFT Mint Debugger</h2>

      {/* Connection Status */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: isConnected ? '#e8f5e8' : '#ffe8e8',
        borderRadius: '8px'
      }}>
        <h3>Wallet Status</h3>
        <p>Connected: {isConnected ? '✅ YES' : '❌ NO'}</p>
        {isConnected && (
          <p>Address: {sdk.address}</p>
        )}
      </div>

      {/* Test Configuration */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: '#f0f8ff',
        borderRadius: '8px'
      }}>
        <h3>Test Configuration</h3>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(testConfig, null, 2)}
        </pre>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleValidateConfig}
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔍 Validate Config
        </button>

        <button
          onClick={handleCheckWalletData}
          disabled={!isConnected}
          style={{
            padding: '10px 15px',
            backgroundColor: !isConnected ? '#cccccc' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: !isConnected ? 'not-allowed' : 'pointer'
          }}
        >
          🔍 Check Wallet Data
        </button>

        <button
          onClick={handleTestMint}
          disabled={!isConnected || isMinting}
          style={{
            padding: '10px 15px',
            backgroundColor: !isConnected || isMinting ? '#cccccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: !isConnected || isMinting ? 'not-allowed' : 'pointer'
          }}
        >
          {isMinting ? '⏳ Minting...' : '🧪 Test Mint'}
        </button>

        <button
          onClick={handleClearLog}
          style={{
            padding: '10px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Log
        </button>
      </div>

      {/* Status */}
      {mintError && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '5px'
        }}>
          <strong>❌ Error:</strong> {mintError}
        </div>
      )}

      {lastNFTId && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '5px'
        }}>
          <strong>✅ Success!</strong> NFT ID: {lastNFTId}
        </div>
      )}

      {/* Debug Log */}
      <div style={{ 
        marginBottom: '20px'
      }}>
        <h3>Debug Console</h3>
        <textarea
          value={debugLog}
          readOnly
          rows={20}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#1e1e1e',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '12px',
            border: 'none',
            borderRadius: '5px',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{
        padding: '10px',
        backgroundColor: '#fff3cd',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <strong>💡 Instructions:</strong>
        <ol>
          <li>Make sure your wallet is connected</li>
          <li>Click "Check Wallet Data" to verify wallet state</li>
          <li>Click "Validate Config" to test configuration validation</li>
          <li>Click "Test Mint" to attempt minting</li>
          <li>Watch the debug console for detailed logging</li>
          <li>Check browser console for additional technical details</li>
        </ol>
      </div>
    </div>
  );
}
