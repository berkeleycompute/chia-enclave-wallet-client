import React, { useState } from 'react';
import { useTwinNFTMint } from '../hooks/useTwinNFTMint';
import type { TwinNFTMintRequest } from '../client/ChiaCloudWalletClient';

/**
 * Example component showing how to use the useTwinNFTMint hook
 * This demonstrates twin NFT minting functionality
 */
export const TwinNFTMintExample: React.FC = () => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [fee, setFee] = useState(100000); // Default fee in mojos
  
  const {
    isMinting,
    mintError,
    lastResponse,
    mintHistory,
    mintTwinNFT,
    reset,
    getPendingMints,
    getSuccessfulMints,
    clearMintHistory
  } = useTwinNFTMint({
    enableLogging: true,
    autoSave: true,
    onMintStart: (mintId) => {
      console.log(`Twin NFT mint started: ${mintId}`);
    },
    onMintSuccess: (mintId, response) => {
      console.log(`Twin NFT mint succeeded: ${mintId}`, response);
    },
    onMintError: (mintId, error) => {
      console.log(`Twin NFT mint failed: ${mintId}`, error);
    }
  });

  const handleMint = async () => {
    if (!recipientAddress.trim()) {
      alert('Please enter a recipient address');
      return;
    }

    const request: TwinNFTMintRequest = {
      recipientAddress: recipientAddress.trim(),
      fee: fee,
      // Add other parameters as needed based on the actual API requirements
      metadata: {
        // Example metadata - adjust based on API requirements
        source: 'example',
        timestamp: new Date().toISOString()
      }
    };

    const result = await mintTwinNFT(request);
    
    if (result.success) {
      alert(`Twin NFT minted successfully! NFT ID: ${result.response?.data.nft_id}`);
    } else {
      alert(`Failed to mint twin NFT: ${result.error}`);
    }
  };

  const pendingMints = getPendingMints();
  const successfulMints = getSuccessfulMints();

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Twin NFT Mint Example</h2>
      
      {/* Mint Form */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Mint Twin NFT</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Recipient Address:
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter recipient address (xch...)"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '14px'
            }}
            disabled={isMinting}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Fee (mojos):
          </label>
          <input
            type="number"
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
            min="0"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '14px'
            }}
            disabled={isMinting}
          />
        </div>

        <button
          onClick={handleMint}
          disabled={isMinting || !recipientAddress.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: isMinting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: isMinting ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isMinting ? 'Minting...' : 'Mint Twin NFT'}
        </button>

        <button
          onClick={reset}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Reset
        </button>
      </div>

      {/* Error Display */}
      {mintError && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {mintError}
        </div>
      )}

      {/* Last Response */}
      {lastResponse && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          color: '#155724'
        }}>
          <h4>Last Mint Result:</h4>
          <p><strong>NFT ID:</strong> {lastResponse.data.nft_id}</p>
          <p><strong>Launcher ID:</strong> {lastResponse.data.launcher_id}</p>
          <p><strong>Recipient:</strong> {lastResponse.data.recipient_address}</p>
          <p><strong>Fee Paid:</strong> {lastResponse.data.fee_paid} mojos</p>
          <p><strong>Is New Twin:</strong> {lastResponse.data.is_new_twin ? 'Yes' : 'No'}</p>
        </div>
      )}

      {/* Statistics */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h3>Statistics</h3>
        <p><strong>Total Mints:</strong> {mintHistory.length}</p>
        <p><strong>Pending Mints:</strong> {pendingMints.length}</p>
        <p><strong>Successful Mints:</strong> {successfulMints.length}</p>
        <p><strong>Failed Mints:</strong> {mintHistory.filter(m => m.status === 'failed').length}</p>
      </div>

      {/* History Management */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={clearMintHistory}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Clear History
        </button>
      </div>

      {/* Mint History */}
      {mintHistory.length > 0 && (
        <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h3>Mint History</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {mintHistory.map((record) => (
              <div
                key={record.id}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  border: '1px solid #eee',
                  borderRadius: '3px',
                  backgroundColor: record.status === 'success' ? '#f8f9fa' : 
                                 record.status === 'failed' ? '#fff3cd' : '#e2e3e5'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>
                    {record.status === 'success' ? '✓' : 
                     record.status === 'failed' ? '✗' : '⏳'} 
                    {record.id}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(record.timestamp).toLocaleString()}
                  </span>
                </div>
                
                {record.status === 'success' && record.nftId && (
                  <div style={{ marginTop: '5px', fontSize: '14px' }}>
                    <strong>NFT ID:</strong> {record.nftId}
                  </div>
                )}
                
                {record.status === 'failed' && record.error && (
                  <div style={{ marginTop: '5px', fontSize: '14px', color: '#dc3545' }}>
                    <strong>Error:</strong> {record.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TwinNFTMintExample;
