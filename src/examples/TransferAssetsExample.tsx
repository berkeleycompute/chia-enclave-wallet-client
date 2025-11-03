import React, { useState } from 'react';
import { useTransferAssets } from '../hooks/useTransferAssets';
import { useChiaWalletSDK } from '../providers/ChiaWalletSDKProvider';

/**
 * TransferAssetsExample Component
 * 
 * Demonstrates how to use the useTransferAssets hook to transfer:
 * - XCH (standard Chia coins)
 * - CAT tokens (Chia Asset Tokens)
 * - NFTs
 * - Mixed transfers (multiple asset types in one transaction)
 */
export const TransferAssetsExample: React.FC = () => {
  const sdk = useChiaWalletSDK();
  const {
    transferXCH,
    transferCAT,
    transferNFT,
    transferAssets,
    isTransferring,
    transferError,
    lastResponse,
    transferHistory
  } = useTransferAssets({
    sdk,
    enableLogging: true,
    autoSave: true
  });

  // Form state for XCH transfer
  const [xchCoinIds, setXchCoinIds] = useState('');
  const [xchRecipient, setXchRecipient] = useState('');
  const [xchAmount, setXchAmount] = useState('1000000000000'); // 1 XCH in mojos
  const [xchFee, setXchFee] = useState('100000000'); // 0.0001 XCH fee

  // Form state for CAT transfer
  const [catCoinIds, setCatCoinIds] = useState('');
  const [catAssetId, setCatAssetId] = useState('');
  const [catRecipient, setCatRecipient] = useState('');
  const [catAmount, setCatAmount] = useState('1000');
  const [catFee, setCatFee] = useState('100000000');

  // Form state for NFT transfer
  const [nftCoinId, setNftCoinId] = useState('');
  const [nftLauncherId, setNftLauncherId] = useState('');
  const [nftRecipient, setNftRecipient] = useState('');
  const [nftFee, setNftFee] = useState('100000000');

  const handleTransferXCH = async () => {
    const coinIdsArray = xchCoinIds.split(',').map(id => id.trim()).filter(Boolean);
    
    if (coinIdsArray.length === 0) {
      alert('Please enter at least one coin ID');
      return;
    }

    const result = await transferXCH(
      coinIdsArray,
      xchRecipient,
      parseInt(xchAmount),
      parseInt(xchFee)
    );

    if (result.success) {
      alert(`XCH transfer successful! Transaction ID: ${result.response?.transaction_id}`);
    } else {
      alert(`XCH transfer failed: ${result.error}`);
    }
  };

  const handleTransferCAT = async () => {
    const coinIdsArray = catCoinIds.split(',').map(id => id.trim()).filter(Boolean);
    
    if (coinIdsArray.length === 0) {
      alert('Please enter at least one coin ID');
      return;
    }

    const result = await transferCAT(
      coinIdsArray,
      catAssetId,
      catRecipient,
      parseInt(catAmount),
      parseInt(catFee)
    );

    if (result.success) {
      alert(`CAT transfer successful! Transaction ID: ${result.response?.transaction_id}`);
    } else {
      alert(`CAT transfer failed: ${result.error}`);
    }
  };

  const handleTransferNFT = async () => {
    if (!nftCoinId.trim() || !nftLauncherId.trim()) {
      alert('Please enter both NFT coin ID and launcher ID');
      return;
    }

    const result = await transferNFT(
      nftCoinId.trim(),
      nftLauncherId.trim(),
      nftRecipient,
      parseInt(nftFee)
    );

    if (result.success) {
      alert(`NFT transfer successful! Transaction ID: ${result.response?.transaction_id}`);
    } else {
      alert(`NFT transfer failed: ${result.error}`);
    }
  };

  const handleMixedTransfer = async () => {
    const xchCoins = xchCoinIds.split(',').map(id => id.trim()).filter(Boolean);
    const catCoins = catCoinIds.split(',').map(id => id.trim()).filter(Boolean);
    
    const allCoinIds = [...xchCoins, ...catCoins];
    if (nftCoinId.trim()) {
      allCoinIds.push(nftCoinId.trim());
    }

    if (allCoinIds.length === 0) {
      alert('Please enter at least one coin ID');
      return;
    }

    const result = await transferAssets({
      coin_ids: allCoinIds,
      xch_transfers: xchCoins.length > 0 ? [{
        target_address: xchRecipient,
        amount: parseInt(xchAmount)
      }] : undefined,
      cat_transfers: catCoins.length > 0 ? [{
        asset_id: catAssetId,
        target_address: catRecipient,
        amount: parseInt(catAmount)
      }] : undefined,
      nft_transfers: nftCoinId.trim() ? [{
        launcher_id: nftLauncherId.trim(),
        target_address: nftRecipient,
        amount: 1
      }] : undefined,
      fee: parseInt(xchFee)
    });

    if (result.success) {
      alert(`Mixed transfer successful! Transaction ID: ${result.response?.transaction_id}`);
    } else {
      alert(`Mixed transfer failed: ${result.error}`);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Transfer Assets Example</h1>

      {/* Status Section */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Status</h3>
        <p><strong>Transferring:</strong> {isTransferring ? 'Yes' : 'No'}</p>
        {transferError && (
          <p style={{ color: 'red' }}><strong>Error:</strong> {transferError}</p>
        )}
        {lastResponse && (
          <div>
            <p><strong>Last Transaction ID:</strong> {lastResponse.transaction_id}</p>
            <p><strong>Status:</strong> {lastResponse.status}</p>
          </div>
        )}
      </div>

      {/* XCH Transfer Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Transfer XCH</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Coin IDs (comma-separated):
            <input
              type="text"
              value={xchCoinIds}
              onChange={(e) => setXchCoinIds(e.target.value)}
              placeholder="0xabc...,0xdef..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Recipient Address:
            <input
              type="text"
              value={xchRecipient}
              onChange={(e) => setXchRecipient(e.target.value)}
              placeholder="xch1..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Amount (mojos):
            <input
              type="text"
              value={xchAmount}
              onChange={(e) => setXchAmount(e.target.value)}
              placeholder="1000000000000"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
          <small>1 XCH = 1,000,000,000,000 mojos</small>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Fee (mojos):
            <input
              type="text"
              value={xchFee}
              onChange={(e) => setXchFee(e.target.value)}
              placeholder="100000000"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <button
          onClick={handleTransferXCH}
          disabled={isTransferring}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isTransferring ? 'not-allowed' : 'pointer'
          }}
        >
          {isTransferring ? 'Transferring...' : 'Transfer XCH'}
        </button>
      </div>

      {/* CAT Transfer Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Transfer CAT Token</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            CAT Coin IDs (comma-separated):
            <input
              type="text"
              value={catCoinIds}
              onChange={(e) => setCatCoinIds(e.target.value)}
              placeholder="0xabc...,0xdef..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Asset ID:
            <input
              type="text"
              value={catAssetId}
              onChange={(e) => setCatAssetId(e.target.value)}
              placeholder="0x..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Recipient Address:
            <input
              type="text"
              value={catRecipient}
              onChange={(e) => setCatRecipient(e.target.value)}
              placeholder="xch1..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Amount (CAT units):
            <input
              type="text"
              value={catAmount}
              onChange={(e) => setCatAmount(e.target.value)}
              placeholder="1000"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Fee (mojos):
            <input
              type="text"
              value={catFee}
              onChange={(e) => setCatFee(e.target.value)}
              placeholder="100000000"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <button
          onClick={handleTransferCAT}
          disabled={isTransferring}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isTransferring ? 'not-allowed' : 'pointer'
          }}
        >
          {isTransferring ? 'Transferring...' : 'Transfer CAT'}
        </button>
      </div>

      {/* NFT Transfer Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Transfer NFT</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            NFT Coin ID:
            <input
              type="text"
              value={nftCoinId}
              onChange={(e) => setNftCoinId(e.target.value)}
              placeholder="0x..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            NFT Launcher ID:
            <input
              type="text"
              value={nftLauncherId}
              onChange={(e) => setNftLauncherId(e.target.value)}
              placeholder="0x..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Recipient Address:
            <input
              type="text"
              value={nftRecipient}
              onChange={(e) => setNftRecipient(e.target.value)}
              placeholder="xch1..."
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Fee (mojos):
            <input
              type="text"
              value={nftFee}
              onChange={(e) => setNftFee(e.target.value)}
              placeholder="100000000"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <button
          onClick={handleTransferNFT}
          disabled={isTransferring}
          style={{
            padding: '10px 20px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isTransferring ? 'not-allowed' : 'pointer'
          }}
        >
          {isTransferring ? 'Transferring...' : 'Transfer NFT'}
        </button>
      </div>

      {/* Mixed Transfer Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Mixed Transfer (All Types)</h2>
        <p style={{ marginBottom: '10px', color: '#666' }}>
          Use the forms above to fill in the details, then click this button to transfer all assets in a single transaction.
        </p>
        <button
          onClick={handleMixedTransfer}
          disabled={isTransferring}
          style={{
            padding: '10px 20px',
            backgroundColor: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isTransferring ? 'not-allowed' : 'pointer'
          }}
        >
          {isTransferring ? 'Transferring...' : 'Transfer All (Mixed)'}
        </button>
      </div>

      {/* Transfer History */}
      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Transfer History</h2>
        {transferHistory.length === 0 ? (
          <p>No transfers yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Type</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Transaction ID</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {transferHistory.slice(0, 10).map((record) => (
                <tr key={record.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{record.type.toUpperCase()}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    <span style={{
                      color: record.status === 'success' ? 'green' : record.status === 'failed' ? 'red' : 'orange'
                    }}>
                      {record.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontSize: '12px' }}>
                    {record.transactionId ? record.transactionId.substring(0, 16) + '...' : '-'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {new Date(record.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransferAssetsExample;

