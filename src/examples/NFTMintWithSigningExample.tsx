import React, { useState } from 'react';
import { useUnifiedWalletClient } from '../hooks/useChiaWalletSDK';
import { 
  ChiaCloudWalletClient, 
  type MintNFTRequest, 
  type NFTMint,
  type CoinSpendBuffer,
  convertCoinSpendsToBuffer
} from '../client/ChiaCloudWalletClient';
import { useChiaNFTMint, type ChiaNFTMintConfig } from '../hooks/useChiaNFTMint';
import { bech32m } from 'bech32';

// Utility function to encode launcher ID as NFT address
const encodeLauncherIdAsNftAddress = (launcherId: string): string => {
  try {
    if (!launcherId || launcherId === 'unknown') {
      console.warn('Invalid launcher ID provided for NFT address encoding:', launcherId);
      return '';
    }
    
    // Remove '0x' prefix if present and ensure lowercase
    const cleanLauncherId = launcherId.replace(/^0x/, '').toLowerCase();
    
    // Validate hex string format (should be 64 characters)
    if (!/^[0-9a-f]{64}$/.test(cleanLauncherId)) {
      console.error('Invalid launcher ID format - expected 64 hex characters, got:', cleanLauncherId);
      return '';
    }
    
    // Convert hex string to Uint8Array
    const bytes = new Uint8Array(cleanLauncherId.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    
    if (bytes.length !== 32) {
      console.error('Invalid launcher ID length - expected 32 bytes, got:', bytes.length);
      return '';
    }
    
    // Use bech32m.toWords to convert to 5-bit words, then encode with 'nft' prefix
    const words = bech32m.toWords(bytes);
    const nftAddress = bech32m.encode("nft", words);
    
    console.log('✅ Successfully encoded NFT address:', { launcherId: cleanLauncherId, nftAddress });
    return nftAddress;
  } catch (error) {
    console.error('❌ Error encoding launcher ID as NFT address:', error, 'launcher ID:', launcherId);
    return '';
  }
};

/**
 * Advanced NFT Minting Example demonstrating:
 * 1. Automatic flow (mnemonic or synthetic key) - Simplified
 * 2. Manual flow (create unsigned -> sign -> broadcast) - Advanced control
 */
export function NFTMintWithSigningExample() {
  const sdk = useUnifiedWalletClient();
  const isConnected = sdk.isConnected;
  const address = sdk.address;
  
  // Use the high-level NFT minting hook (recommended for most users)
  const {
    isMinting,
    mintError,
    lastNFTId,
    lastTransactionId,
    mintNFT: mintNFTSimple
  } = useChiaNFTMint({
    sdk: sdk as any,
    enableLogging: true,
    onMintSuccess: (mintId, nftId) => {
      console.log('🎉 NFT minted successfully!', { mintId, nftId });
      setStatus('success', `NFT minted successfully! ID: ${nftId}`);
    },
    onMintError: (mintId, error) => {
      console.error('❌ Mint failed:', { mintId, error });
      setStatus('error', `Mint failed: ${error}`);
    }
  });

  const [status, setStatusState] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const [isManualFlow, setIsManualFlow] = useState(false);
  const [unsignedSpendBundle, setUnsignedSpendBundle] = useState<{
    coin_spends: CoinSpendBuffer[];
  } | null>(null);

  const setStatus = (type: typeof status.type, message: string) => {
    setStatusState({ type, message });
  };

  // Sample NFT configuration with fee
  const [sampleNFTConfig, setSampleNFTConfig] = useState<ChiaNFTMintConfig>({
    name: 'Test NFT with Signing',
    description: 'An NFT demonstrating the signing and broadcasting flow',
    imageUrl: 'https://via.placeholder.com/512x512.png?text=NFT',
    metadataUrl: 'https://example.com/metadata.json',
    dataHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    metadataHash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    editionNumber: 1,
    editionTotal: 1,
    royaltyPercentage: 0,
    feeXCH: 0.000001 // Default fee
  });

  // Get the actual client
  const getClient = () => (sdk as any).sdk?.client || null;

  // Convert ChiaNFTMintConfig to MintNFTRequest format
  const convertToMintRequest = async (config: ChiaNFTMintConfig): Promise<MintNFTRequest> => {
    const client = getClient();
    if (!client || !isConnected) {
      throw new Error('Wallet not connected');
    }

    // Get synthetic public key
    const publicKeyResult = await client.getPublicKey();
    if (!publicKeyResult.success) {
      throw new Error('Failed to get public key');
    }

    // Get current address for puzzle hash conversion
    const currentAddress = address || publicKeyResult.data.address;
    const puzzleHashResult = ChiaCloudWalletClient.convertAddressToPuzzleHash(currentAddress);
    if (!puzzleHashResult.success) {
      throw new Error(`Invalid address: ${puzzleHashResult.error}`);
    }

    // Get unspent coins
    const coinsResult = await client.getUnspentHydratedCoins(currentAddress);
    if (!coinsResult.success || !coinsResult.data.data || coinsResult.data.data.length === 0) {
      throw new Error('No unspent coins available for minting');
    }

    // Filter for XCH coins only (exclude CAT, NFT, DID coins)
    const xchCoins = coinsResult.data.data.filter((hydratedCoin: any) => {
      const driverType = hydratedCoin.parentSpendInfo?.driverInfo?.type;
      return !driverType || (driverType !== 'CAT' && driverType !== 'NFT' && driverType !== 'DID');
    });

    if (xchCoins.length === 0) {
      throw new Error('No XCH coins available for minting. Cannot use CAT, NFT, or DID coins for minting.');
    }

    // Select coins for minting
    const availableCoins = xchCoins.map((hydratedCoin: any) => ({
      parent_coin_info: hydratedCoin.coin.parentCoinInfo,
      puzzle_hash: hydratedCoin.coin.puzzleHash,
      amount: typeof hydratedCoin.coin.amount === 'string' ? parseInt(hydratedCoin.coin.amount) : hydratedCoin.coin.amount
    }));

          const feeAmount = config.feeXCH ? Math.floor(config.feeXCH * 1_000_000_000_000) : 1000000; // Convert XCH to mojos or use default
      const mintCost = 1;
      const totalNeeded = mintCost + feeAmount;

    let totalSelected = 0;
    const selectedCoins = [];

    for (const coin of availableCoins) {
      selectedCoins.push(coin);
      totalSelected += coin.amount;
      if (totalSelected >= totalNeeded) break;
    }

    if (totalSelected < totalNeeded) {
      throw new Error(`Insufficient balance. Need ${totalNeeded} mojos, have ${totalSelected} mojos`);
    }

    const mint: NFTMint = {
      metadata: {
        edition_number: config.editionNumber || 1,
        edition_total: config.editionTotal || 1,
        data_uris: [config.imageUrl],
        data_hash: config.dataHash,
        metadata_uris: [config.metadataUrl],
        metadata_hash: config.metadataHash,
        license_uris: config.licenseUris || [],
        license_hash: config.licenseHash || config.metadataHash
      },
      p2_puzzle_hash: puzzleHashResult.data,
      royalty_puzzle_hash: null,
      royalty_basis_points: Math.round((config.royaltyPercentage || 0) * 100)
    };

    return {
      synthetic_public_key: publicKeyResult.data.synthetic_public_key,
      selected_coins: selectedCoins,
      mints: [mint],
      fee: feeAmount
    };
  };

  // Simple automatic flow (recommended)
  const handleSimpleMint = async () => {
    if (!isConnected) {
      setStatus('error', 'Please connect your wallet first');
      return;
    }

    try {
      setStatus('loading', 'Minting NFT using automatic flow...');
      const result = await mintNFTSimple(sampleNFTConfig);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      setStatus('error', `Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Step 1: Create unsigned spend bundle (manual flow)
  const handleCreateUnsigned = async () => {
    const client = getClient();
    if (!client || !isConnected) {
      setStatus('error', 'Please connect your wallet first');
      return;
    }

    try {
      setStatus('loading', 'Creating unsigned spend bundle...');
      
      const mintRequest = await convertToMintRequest(sampleNFTConfig);
      const result = await client.createUnsignedNFTMint(mintRequest);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Extract coin_spends from the response and convert to Buffer format
      setUnsignedSpendBundle({
        coin_spends: convertCoinSpendsToBuffer(result.data.coin_spends)
      });

      setStatus('success', 'Unsigned spend bundle created successfully! You can now sign and broadcast it.');
    } catch (error) {
      setStatus('error', `Failed to create unsigned spend bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Step 2: Sign and broadcast the unsigned spend bundle
  const handleSignAndBroadcast = async () => {
    const client = getClient();
    if (!client || !unsignedSpendBundle) {
      setStatus('error', 'No unsigned spend bundle to sign');
      return;
    }

    try {
      setStatus('loading', 'Signing and broadcasting spend bundle...');
      
      // Since we don't have spend_bundle_hex, use signSpendBundle directly with coin_spends
      const signResult = await client.signSpendBundle({
        coin_spends: unsignedSpendBundle.coin_spends
      });
      
      if (!signResult.success) {
        throw new Error(`Failed to sign spend bundle: ${signResult.error}`);
      }

      // Now broadcast the signed spend bundle
      const broadcastResult = await client.broadcastSpendBundle({
        coin_spends: signResult.data.signed_spend_bundle.coin_spends as any,
        aggregated_signature: signResult.data.signed_spend_bundle.aggregated_signature
      });
      
      const result = broadcastResult;
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setStatus('success', `NFT minted successfully! Transaction ID: ${result.data.transaction_id}`);
      setUnsignedSpendBundle(null); // Clear the unsigned bundle
    } catch (error) {
      setStatus('error', `Failed to sign and broadcast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Reset everything
  const handleReset = () => {
    setStatus('idle', '');
    setUnsignedSpendBundle(null);
  };

  const isLoading = status.type === 'loading' || isMinting;

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        🔐 NFT Minting with Signing & Broadcasting
      </h2>

      {/* Connection Status */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '12px', 
        backgroundColor: isConnected ? '#e8f5e8' : '#ffe8e8',
        borderRadius: '8px',
        border: `1px solid ${isConnected ? '#4caf50' : '#f44336'}`
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>{isConnected ? '🟢' : '🔴'}</span>
          {isConnected ? (
            <>
              <span style={{ color: '#2e7d32' }}>Wallet Connected</span>
              <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </>
          ) : (
            <span style={{ color: '#c62828' }}>Wallet Not Connected</span>
          )}
        </div>
      </div>

      {/* Flow Selection */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Choose Minting Flow:</h3>
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={!isManualFlow}
              onChange={() => setIsManualFlow(false)}
              style={{ marginRight: '6px' }}
            />
            🚀 Automatic (Recommended)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={isManualFlow}
              onChange={() => setIsManualFlow(true)}
              style={{ marginRight: '6px' }}
            />
            🔧 Manual (Advanced)
          </label>
        </div>
      </div>

      {/* NFT Preview */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fafafa'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Sample NFT to Mint:</h4>
        <div style={{ fontSize: '14px' }}>
          <p><strong>Name:</strong> {sampleNFTConfig.name}</p>
          <p><strong>Description:</strong> {sampleNFTConfig.description}</p>
          <p><strong>Data Hash:</strong> {sampleNFTConfig.dataHash.substring(0, 16)}...</p>
          <p><strong>Metadata Hash:</strong> {sampleNFTConfig.metadataHash.substring(0, 16)}...</p>
        </div>
      </div>

      {/* Fee Configuration */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Transaction Settings:</h4>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Transaction Fee (XCH):
          </label>
          <input
            type="number"
            min="0"
            step="0.000001"
            value={sampleNFTConfig.feeXCH || 0.000001}
            onChange={(e) => setSampleNFTConfig(prev => ({
              ...prev, 
              feeXCH: parseFloat(e.target.value) || 0.000001
            }))}
            style={{
              width: '150px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            title="Fee amount in XCH. Higher fees may result in faster confirmation."
          />
          <div style={{
            marginTop: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            💰 {((sampleNFTConfig.feeXCH || 0.000001) * 1_000_000_000_000).toLocaleString()} mojos
            <br />
            💡 Recommended: 0.000001 XCH (default)
          </div>
        </div>
      </div>

      {!isManualFlow ? (
        /* Automatic Flow */
        <div>
          <h3>🚀 Automatic Flow</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            This uses the high-level <code>useChiaNFTMint</code> hook. It automatically handles:
            <br />• Creating unsigned spend bundle
            <br />• Signing with your wallet's private key
            <br />• Broadcasting to the network
          </p>
          
          <button
            onClick={handleSimpleMint}
            disabled={!isConnected || isLoading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: !isConnected || isLoading ? '#cccccc' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !isConnected || isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '10px'
            }}
          >
            {isLoading ? '🔄 Minting...' : '🚀 Mint NFT (Automatic)'}
          </button>
        </div>
      ) : (
        /* Manual Flow */
        <div>
          <h3>🔧 Manual Flow (Advanced)</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            This gives you full control over each step of the minting process:
          </p>
          
          {/* Step 1 */}
          <div style={{ marginBottom: '15px' }}>
            <h4>Step 1: Create Unsigned Spend Bundle</h4>
            <button
              onClick={handleCreateUnsigned}
              disabled={!isConnected || isLoading}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: !isConnected || isLoading ? '#cccccc' : '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !isConnected || isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '⏳ Creating...' : '📝 Create Unsigned Spend Bundle'}
            </button>
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: '15px' }}>
            <h4>Step 2: Sign & Broadcast</h4>
            <button
              onClick={handleSignAndBroadcast}
              disabled={!unsignedSpendBundle || isLoading}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: !unsignedSpendBundle || isLoading ? '#cccccc' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !unsignedSpendBundle || isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '📡 Broadcasting...' : '🔐 Sign & Broadcast'}
            </button>
            {!unsignedSpendBundle && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                ⚠️ You need to create an unsigned spend bundle first
              </p>
            )}
          </div>

          {/* Unsigned Bundle Info */}
          {unsignedSpendBundle && (
            <div style={{
              padding: '10px',
              backgroundColor: '#fff3e0',
              border: '1px solid #ffcc02',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '15px'
            }}>
              <strong>✅ Unsigned Spend Bundle Ready</strong>
              <br />
              Ready for Signing: Yes
              <br />
              Coin Spends: {unsignedSpendBundle.coin_spends.length}
            </div>
          )}
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={handleReset}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '14px',
          fontWeight: '500',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        🔄 Reset
      </button>

      {/* Status Display */}
      {status.message && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: 
            status.type === 'success' ? '#d4edda' :
            status.type === 'error' ? '#f8d7da' :
            status.type === 'loading' ? '#fff3cd' : '#e2e3e5',
          color: 
            status.type === 'success' ? '#155724' :
            status.type === 'error' ? '#721c24' :
            status.type === 'loading' ? '#856404' : '#6c757d',
          border: `1px solid ${
            status.type === 'success' ? '#c3e6cb' :
            status.type === 'error' ? '#f5c6cb' :
            status.type === 'loading' ? '#ffeaa7' : '#d1ecf1'
          }`,
          borderRadius: '8px'
        }}>
          {status.type === 'loading' && <span>⏳ </span>}
          {status.type === 'success' && <span>✅ </span>}
          {status.type === 'error' && <span>❌ </span>}
          <strong>{status.message}</strong>
        </div>
      )}

      {/* Last Minted NFT */}
      {lastNFTId && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          color: '#155724'
        }}>
          <strong>🎉 Last Minted NFT</strong>
          <br />
          <span style={{ fontSize: '14px' }}>
            <strong>Launcher ID:</strong> {lastNFTId}
          </span>
          <br />
          <span style={{ fontSize: '14px' }}>
            <strong>NFT Address:</strong> {encodeLauncherIdAsNftAddress(lastNFTId)}
          </span>
          <br />
          <span style={{ fontSize: '14px' }}>
            <strong>Transaction ID:</strong> {lastTransactionId || 'N/A'}
          </span>
          <br />
          <div style={{ marginTop: '8px' }}>
            {encodeLauncherIdAsNftAddress(lastNFTId) && (
              <button
                onClick={() => navigator.clipboard.writeText(encodeLauncherIdAsNftAddress(lastNFTId))}
                style={{
                  marginRight: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#155724',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Copy NFT address to clipboard"
              >
                📋 Copy Address
              </button>
            )}
            {lastTransactionId && (
              <button
                onClick={() => navigator.clipboard.writeText(lastTransactionId)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Copy transaction ID to clipboard"
              >
                📋 Copy TX ID
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {mintError && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24'
        }}>
          <strong>❌ Error:</strong> {mintError}
        </div>
      )}

      {/* Technical Info */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b6d7ff',
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        <strong>🔧 Technical Details:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li><strong>Automatic Flow:</strong> Uses <code>useChiaNFTMint</code> hook → <code>client.mintNFT()</code></li>
          <li><strong>Manual Flow:</strong> Uses <code>client.createUnsignedNFTMint()</code> → <code>client.signAndBroadcastNFTMint()</code></li>
          <li><strong>With Mnemonic:</strong> Direct minting through backend service</li>
          <li><strong>Without Mnemonic:</strong> 3-step process (create → sign → broadcast)</li>
          <li><strong>Signing:</strong> Uses wallet's private key via synthetic public key</li>
          <li><strong>Broadcasting:</strong> Sends signed spend bundle to Chia network</li>
        </ul>
      </div>
    </div>
  );
}
