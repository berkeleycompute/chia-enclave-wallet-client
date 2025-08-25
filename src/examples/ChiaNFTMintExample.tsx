import React, { useState, useRef } from 'react';
import { useChiaNFTMint, type ChiaNFTMintConfig } from '../hooks/useChiaNFTMint';
import { useUploadFile } from '../hooks/useUploadFile';
import { useUnifiedWalletClient } from '../hooks/useChiaWalletSDK';
import { useDIDs } from '../hooks/useDIDs';
import { bech32m } from 'bech32';

// Utility function to compute SHA256 hash of file content
const computeFileSHA256 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

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
 * Example component demonstrating how to use the Chia NFT minting hook
 * This component shows a complete NFT minting form with validation and status tracking
 */
export function ChiaNFTMintExample() {
  // Use the Chia wallet SDK for authentication and connection
  const sdk = useUnifiedWalletClient();
  const isConnected = sdk.isConnected;
  const address = sdk.address;
  
  // Use the Chia NFT minting hook
  const {
    isMinting,
    isConfirming,
    mintError,
    lastMintId,
    lastNFTId,
    lastTransactionId,
    mintHistory,
    mintNFT,
    validateMintConfig,
    cancelMint,
    reset,
    getPendingMints,
    getConfirmingMints
  } = useChiaNFTMint({
    sdk: sdk as any,
    enableLogging: true,
    autoSave: true,
    onMintStart: (mintId) => {
      console.log('Mint started:', mintId);
      setStatusMessage('Minting NFT...');
    },
    onMintSuccess: (mintId, nftId) => {
      console.log('Mint successful:', { mintId, nftId });
      setStatusMessage(`NFT minted successfully! ID: ${nftId}`);
    },
    onMintError: (mintId, error) => {
      console.error('Mint failed:', { mintId, error });
      setStatusMessage(`Mint failed: ${error}`);
    },
    onMintConfirmed: (mintId, nftId, blockHeight) => {
      console.log('Mint confirmed:', { mintId, nftId, blockHeight });
      setStatusMessage(`NFT confirmed on blockchain! ID: ${nftId}`);
    }
  });

  // Form state
  const [formData, setFormData] = useState<Partial<ChiaNFTMintConfig>>({
    name: '',
    description: '',
    imageUrl: '',
    metadataUrl: '',
    dataHash: '',
    metadataHash: '',
    editionNumber: 1,
    editionTotal: 1,
    royaltyPercentage: 0,
    feeXCH: 0.000001 // Default fee: 0.000001 XCH
  });
  
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle form field changes
  const handleInputChange = (field: keyof ChiaNFTMintConfig, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle mint submission
  const handleMint = async () => {
    if (!isConnected) {
      setStatusMessage('Please connect your wallet first');
      return;
    }

    // Validate the configuration
    const validation = validateMintConfig(formData as ChiaNFTMintConfig);
    if (!validation.isValid) {
      setStatusMessage(`Validation error: ${validation.error}`);
      return;
    }

    try {
      const result = await mintNFT(formData as ChiaNFTMintConfig);
      if (!result.success) {
        setStatusMessage(`Mint failed: ${result.error}`);
      }
    } catch (error) {
      setStatusMessage(`Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle cancel mint
  const handleCancel = () => {
    cancelMint();
    setStatusMessage('Mint cancelled');
  };

  // Handle reset form
  const handleReset = () => {
    reset();
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      metadataUrl: '',
      dataHash: '',
      metadataHash: '',
      editionNumber: 1,
      editionTotal: 1,
      royaltyPercentage: 0,
      feeXCH: 0.000001
    });
    setStatusMessage('');
  };

  const pendingMints = getPendingMints();
  const confirmingMints = getConfirmingMints();

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Mint Chia NFT</h2>
      
      {/* Connection Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Wallet Status</h3>
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
        {isConnected && (
          <>
            <p>Address: {address}</p>
            <p>Balance: {sdk.balance} XCH</p>
          </>
        )}
      </div>

      {/* Mint Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleMint(); }}>
        {/* Basic Information */}
        <div style={{ marginBottom: '15px' }}>
          <label>
            Name *:
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Description *:
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
              rows={3}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Image URL *:
            <input
              type="url"
              value={formData.imageUrl || ''}
              onChange={(e) => handleInputChange('imageUrl', e.target.value)}
              required
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Metadata URL *:
            <input
              type="url"
              value={formData.metadataUrl || ''}
              onChange={(e) => handleInputChange('metadataUrl', e.target.value)}
              required
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Data Hash (64 hex chars) *:
            <input
              type="text"
              value={formData.dataHash || ''}
              onChange={(e) => handleInputChange('dataHash', e.target.value)}
              required
              pattern="^(0x)?[0-9a-fA-F]{64}$"
              style={{ width: '100%', padding: '5px', marginTop: '5px', fontFamily: 'monospace' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Metadata Hash (64 hex chars) *:
            <input
              type="text"
              value={formData.metadataHash || ''}
              onChange={(e) => handleInputChange('metadataHash', e.target.value)}
              required
              pattern="^(0x)?[0-9a-fA-F]{64}$"
              style={{ width: '100%', padding: '5px', marginTop: '5px', fontFamily: 'monospace' }}
            />
          </label>
        </div>

        {/* Advanced Options */}
        <div style={{ marginBottom: '15px' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>

        {showAdvanced && (
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginBottom: '15px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label>
                Collection Name:
                <input
                  type="text"
                  value={formData.collectionName || ''}
                  onChange={(e) => handleInputChange('collectionName', e.target.value)}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <label style={{ flex: 1 }}>
                Edition Number:
                <input
                  type="number"
                  min="1"
                  value={formData.editionNumber || 1}
                  onChange={(e) => handleInputChange('editionNumber', parseInt(e.target.value))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
              <label style={{ flex: 1 }}>
                Edition Total:
                <input
                  type="number"
                  min="1"
                  value={formData.editionTotal || 1}
                  onChange={(e) => handleInputChange('editionTotal', parseInt(e.target.value))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                Target Address (optional):
                <input
                  type="text"
                  value={formData.targetAddress || ''}
                  onChange={(e) => handleInputChange('targetAddress', e.target.value)}
                  placeholder="Leave empty to mint to your wallet"
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                Royalty Percentage (0-100):
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.royaltyPercentage || 0}
                  onChange={(e) => handleInputChange('royaltyPercentage', parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                Royalty Address (if royalty {'>'}  0):
                <input
                  type="text"
                  value={formData.royaltyAddress || ''}
                  onChange={(e) => handleInputChange('royaltyAddress', e.target.value)}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>
                Transaction Fee (XCH):
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={formData.feeXCH || 0.000001}
                  onChange={(e) => handleInputChange('feeXCH', parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                  title="Default fee is 0.000001 XCH (1000000 mojos). Higher fees may result in faster confirmation."
                />
              </label>
              <small style={{ color: '#666', fontSize: '12px' }}>
                Recommended: 0.000001 XCH. Higher fees may result in faster confirmation.
              </small>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            type="submit"
            disabled={!isConnected || isMinting || isConfirming}
            style={{
              padding: '10px 20px',
              backgroundColor: isMinting || isConfirming ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isMinting || isConfirming ? 'not-allowed' : 'pointer'
            }}
          >
            {isMinting ? 'Minting...' : isConfirming ? 'Confirming...' : 'Mint NFT'}
          </button>

          {(isMinting || isConfirming) && (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {/* Status Display */}
      {(statusMessage || mintError) && (
        <div style={{
          padding: '10px',
          backgroundColor: mintError ? '#f8d7da' : '#d4edda',
          color: mintError ? '#721c24' : '#155724',
          border: `1px solid ${mintError ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {mintError || statusMessage}
        </div>
      )}

      {/* Last Mint Result */}
      {lastNFTId && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '5px' }}>
          <h4>Last Minted NFT</h4>
          <p><strong>Launcher ID:</strong> {lastNFTId}</p>
          <p><strong>NFT Address:</strong> {encodeLauncherIdAsNftAddress(lastNFTId)}</p>
          <p><strong>Transaction ID:</strong> {lastTransactionId || 'N/A'}</p>
          <p><strong>Mint ID:</strong> {lastMintId}</p>
          <div style={{ marginTop: '8px' }}>
            {encodeLauncherIdAsNftAddress(lastNFTId) && (
              <button
                onClick={() => navigator.clipboard.writeText(encodeLauncherIdAsNftAddress(lastNFTId))}
                style={{
                  marginRight: '8px',
                  padding: '6px 12px',
                  fontSize: '14px',
                  backgroundColor: '#007bff',
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
                  fontSize: '14px',
                  backgroundColor: '#28a745',
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

      {/* Pending and Confirming Mints */}
      {(pendingMints.length > 0 || confirmingMints.length > 0) && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Active Mints</h4>
          {pendingMints.map(mint => (
            <div key={mint.id} style={{ padding: '5px', backgroundColor: '#fff3cd', margin: '5px 0', borderRadius: '3px' }}>
              <strong>{mint.mintConfig.name}</strong> - Pending ({new Date(mint.timestamp).toLocaleTimeString()})
            </div>
          ))}
          {confirmingMints.map(mint => (
            <div key={mint.id} style={{ padding: '5px', backgroundColor: '#cce5ff', margin: '5px 0', borderRadius: '3px' }}>
              <strong>{mint.mintConfig.name}</strong> - Confirming ({mint.nftId})
            </div>
          ))}
        </div>
      )}

      {/* Recent Mint History */}
      {mintHistory.length > 0 && (
        <div>
          <h4>Recent Mints ({mintHistory.length})</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px' }}>
            {mintHistory.slice(0, 5).map(mint => (
              <div key={mint.id} style={{ 
                padding: '10px', 
                borderBottom: '1px solid #eee',
                backgroundColor: mint.status === 'completed' ? '#d4edda' : 
                              mint.status === 'failed' ? '#f8d7da' : '#fff3cd'
              }}>
                <div><strong>{mint.mintConfig.name}</strong></div>
                <div>Status: {mint.status}</div>
                {mint.nftId && <div>NFT ID: {mint.nftId}</div>}
                {mint.error && <div>Error: {mint.error}</div>}
                <div>Time: {new Date(mint.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple example component showing programmatic minting
 */
export function SimpleChiaNFTMintExample() {
  const sdk = useUnifiedWalletClient();
  const isConnected = sdk.isConnected;
  const { mintNFT, isMinting, mintError, lastNFTId, lastTransactionId } = useChiaNFTMint({
    sdk: sdk as any,
    enableLogging: true
  });

  const handleQuickMint = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    const sampleConfig: ChiaNFTMintConfig = {
      name: 'Sample Chia NFT',
      description: 'A sample NFT created programmatically',
      imageUrl: 'https://example.com/image.jpg',
      metadataUrl: 'https://example.com/metadata.json',
      dataHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      metadataHash: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      editionNumber: 1,
      editionTotal: 1000,
      feeXCH: 0.000001 // Default fee
    };

    try {
      const result = await mintNFT(sampleConfig);
      if (result.success) {
        console.log('Mint successful:', result);
      } else {
        console.error('Mint failed:', result.error);
      }
    } catch (error) {
      console.error('Mint error:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h3>Simple Chia NFT Mint</h3>
      <button
        onClick={handleQuickMint}
        disabled={!isConnected || isMinting}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: isMinting ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isMinting ? 'not-allowed' : 'pointer'
        }}
      >
        {isMinting ? 'Minting...' : 'Mint Sample NFT'}
      </button>

      {mintError && (
        <div style={{ marginTop: '10px', color: 'red' }}>
          Error: {mintError}
        </div>
      )}

      {lastNFTId && (
        <div style={{ marginTop: '10px', color: 'green' }}>
          <div>Success! Launcher ID: {lastNFTId}</div>
          <div style={{ fontSize: '14px', marginTop: '4px' }}>
            NFT Address: {encodeLauncherIdAsNftAddress(lastNFTId)}
            {encodeLauncherIdAsNftAddress(lastNFTId) && (
              <button
                onClick={() => navigator.clipboard.writeText(encodeLauncherIdAsNftAddress(lastNFTId))}
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Copy NFT address to clipboard"
              >
                📋
              </button>
            )}
          </div>
          <div style={{ fontSize: '14px', marginTop: '4px' }}>
            Transaction ID: {lastTransactionId || 'N/A'}
            {lastTransactionId && (
              <button
                onClick={() => navigator.clipboard.writeText(lastTransactionId)}
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                title="Copy transaction ID to clipboard"
              >
                📋
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Streamlined NFT minting form - focused on essential fields only
 * Perfect for quick NFT creation with minimal configuration
 */
export function StreamlinedChiaNFTMintForm() {
  const sdk = useUnifiedWalletClient();
  const isConnected = sdk.isConnected;
  const address = sdk.address;
  
  // DID management hook
  const { 
    dids, 
    isLoading: didsLoading, 
    error: didsError,
    refresh: refreshDIDs 
  } = useDIDs({ 
    autoLoad: true,
    enableLogging: true 
  });
  
  // NFT Minting hook
  const {
    isMinting,
    isConfirming,
    mintError,
    lastNFTId,
    lastTransactionId,
    mintNFT,
    reset: resetMint
  } = useChiaNFTMint({
    sdk: sdk as any,
    enableLogging: true,
    onMintSuccess: (mintId, nftId) => {
      console.log('🎉 NFT minted successfully!', { mintId, nftId });
    }
  });

  // File Upload hook
  const {
    isUploading,
    uploadError,
    uploadFile,
    reset: resetUpload,
    validateFile
  } = useUploadFile({
    enableLogging: true,
    onUploadStart: (file) => {
      console.log('📤 Starting upload:', file.name);
      setUploadStatus(`Uploading ${file.name}...`);
    },
    onUploadSuccess: (result) => {
      console.log('✅ Upload successful:', result);
      setUploadStatus('Upload completed successfully!');
    },
    onUploadError: (error) => {
      console.error('❌ Upload failed:', error);
      setUploadStatus(`Upload failed: ${error}`);
    }
  });

  const [formState, setFormState] = useState({
    name: '',
    description: '',
    imageFile: null as File | null,
    imageUrl: '',
    imageHash: '',
    metadataUrl: '',
    metadataHash: '',
    useFile: true, // Toggle between file upload and URL
    attributes: {} as Record<string, string>,
    selectedDidId: '' as string, // Selected DID ID for minting
    feeXCH: 0.000001 as number // Default fee amount in XCH
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle form field changes
  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // Handle file selection and upload
  const handleFileSelect = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setUploadStatus('Please select a valid image file');
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadStatus(`Invalid file: ${validation.error}`);
      return;
    }

    setFormState(prev => ({ ...prev, imageFile: file }));
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploadStatus('Computing SHA256 hash...');
      
      // Compute SHA256 hash of the file content
      const sha256Hash = await computeFileSHA256(file);
      
      setUploadStatus('Uploading image...');
      
      // Upload the image file
      const uploadResult = await uploadFile(file);
      
      if (uploadResult.success) {
        setFormState(prev => ({
          ...prev,
          imageUrl: uploadResult.url || '',
          imageHash: sha256Hash // Use computed SHA256 hash instead of IPFS hash
        }));
        setUploadStatus(`Image uploaded successfully! SHA256: ${sha256Hash.substring(0, 8)}...`);
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Create and upload metadata JSON
  const createAndUploadMetadata = async (): Promise<{ url: string; hash: string }> => {
    const metadata = {
      format: "CHIP-0007",
      name: formState.name,
      description: formState.description,
      minting_tool: "Chia Enclave Wallet",
      sensitive_content: false,
      series_number: 1,
      series_total: 1,
      attributes: [
        ...Object.entries(formState.attributes).map(([trait_type, value]) => ({
          trait_type,
          value
        })),
        {
          trait_type: "created_with",
          value: "StreamlinedChiaNFTMintForm"
        },
        {
          trait_type: "created_at",
          value: new Date().toISOString()
        }
      ],
      collection: {
        name: "My NFT Collection",
        id: "my-nft-collection",
        attributes: []
      }
    };

    // Convert metadata to file
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json'
    });
    const metadataFile = new File([metadataBlob], `${formState.name.replace(/\s+/g, '-').toLowerCase()}-metadata.json`, {
      type: 'application/json'
    });

    // Compute SHA256 hash of metadata file content
    const metadataHash = await computeFileSHA256(metadataFile);
    
    // Upload metadata file
    const uploadResult = await uploadFile(metadataFile);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload metadata');
    }

    return {
      url: uploadResult.url || '',
      hash: metadataHash // Use computed SHA256 hash instead of IPFS hash
    };
  };

  // Handle mint submission
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formState.name.trim() || !formState.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (formState.useFile) {
      if (!formState.imageFile) {
        alert('Please select an image file');
        return;
      }
      if (!formState.imageHash) {
        alert('Please wait for image upload to complete');
        return;
      }
    } else {
      if (!formState.imageUrl.trim()) {
        alert('Please provide an image URL');
        return;
      }
      // Generate a simple hash for URL-based images
      if (!formState.imageHash) {
        const simpleHash = formState.imageUrl + formState.name + Date.now();
        let hash = 0;
        for (let i = 0; i < simpleHash.length; i++) {
          const char = simpleHash.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        setFormState(prev => ({
          ...prev,
          imageHash: Math.abs(hash).toString(16).padStart(64, '0')
        }));
      }
    }

    try {
      setIsProcessing(true);
      setUploadStatus('Creating and uploading metadata...');

      // Create and upload metadata
      const metadataResult = await createAndUploadMetadata();
      
      setUploadStatus('Preparing NFT mint...');

      const mintConfig: ChiaNFTMintConfig = {
        name: formState.name,
        description: formState.description,
        imageUrl: formState.imageUrl, // Already set correctly based on useFile flag
        metadataUrl: metadataResult.url,
        dataHash: formState.imageHash, // Hash from upload or generated
        metadataHash: metadataResult.hash,
        editionNumber: 1,
        editionTotal: 1,
        attributes: formState.attributes,
        didId: formState.selectedDidId || null, // Include selected DID if available
        feeXCH: formState.feeXCH // Include fee amount
      };

      setUploadStatus('Minting NFT...');
      console.log('🚀 Starting NFT mint with config:', mintConfig);
      
      const result = await mintNFT(mintConfig);
      console.log('📝 Mint result:', result);
      
      if (result.success) {
        console.log('✅ NFT minted successfully!', result);
        // Reset form on success
        setFormState({
          name: '',
          description: '',
          imageFile: null,
          imageUrl: '',
          imageHash: '',
          metadataUrl: '',
          metadataHash: '',
          useFile: true,
          attributes: {},
          selectedDidId: '',
          feeXCH: 0.000001
        });
        setPreviewUrl('');
        setUploadStatus('NFT minted successfully!');
      } else {
        console.error('❌ NFT minting failed:', result.error);
        throw new Error(result.error || 'NFT minting failed');
      }
    } catch (error) {
      console.error('Mint error:', error);
      setUploadStatus(`Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormState({
      name: '',
      description: '',
      imageFile: null,
      imageUrl: '',
      imageHash: '',
      metadataUrl: '',
      metadataHash: '',
      useFile: true,
      attributes: {},
      selectedDidId: '',
      feeXCH: 0.000001
    });
    setPreviewUrl('');
    setUploadStatus('');
    setIsProcessing(false);
    resetMint();
    resetUpload();
  };

  const isFormValid = formState.name.trim() && 
                     formState.description.trim() && 
                     (formState.useFile ? (formState.imageFile && formState.imageHash) : formState.imageUrl.trim());

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '500px', 
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0'
    }}>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        color: '#333',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        🎨 Mint Your NFT
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

      <form onSubmit={handleMint}>
        {/* NFT Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            NFT Name *
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your NFT name"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              transition: 'border-color 0.3s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2196f3'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {/* NFT Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            Description *
          </label>
          <textarea
            value={formState.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe your NFT..."
            required
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2196f3'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {/* DID Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            DID Selection (Optional)
          </label>
          
          {didsLoading ? (
            <div style={{
              padding: '12px',
              backgroundColor: '#f0f8ff',
              border: '1px solid #bee5eb',
              borderRadius: '8px',
              color: '#0c5460'
            }}>
              <span>🔄 Loading DIDs...</span>
            </div>
          ) : didsError ? (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '8px',
              color: '#721c24'
            }}>
              <span>❌ Error loading DIDs: {didsError}</span>
              <button
                type="button"
                onClick={refreshDIDs}
                style={{
                  marginLeft: '10px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : dids.length === 0 ? (
            <div style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              color: '#856404'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>💡 No DIDs found</strong>
              </div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                You don't have any DIDs in your wallet. DIDs allow you to have verified ownership of your NFTs.
              </div>
              <button
                type="button"
                onClick={refreshDIDs}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh DIDs
              </button>
            </div>
          ) : (
            <>
              <select
                value={formState.selectedDidId}
                onChange={(e) => handleInputChange('selectedDidId', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'border-color 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              >
                <option value="">🔓 No DID (Regular NFT)</option>
                {dids.map((did, index) => (
                  <option key={did.did_id} value={did.did_id}>
                    🆔 DID #{index + 1} ({did.did_id.substring(0, 16)}...{did.did_id.substring(did.did_id.length - 4)})
                    {did.metadata && ` - ${did.metadata.substring(0, 30)}${did.metadata.length > 30 ? '...' : ''}`}
                  </option>
                ))}
              </select>
              
              {formState.selectedDidId && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#e8f5e8',
                  border: '1px solid #c3e6c3',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  <strong>✅ DID-Owned NFT:</strong> This NFT will be owned by your selected DID, providing verified ownership on the blockchain.
                </div>
              )}
              
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.4'
              }}>
                <strong>💡 About DIDs:</strong> Decentralized Identifiers provide cryptographic proof of ownership. 
                NFTs minted with a DID are permanently associated with that identity on the blockchain.
              </div>
            </>
          )}
        </div>

        {/* Transaction Fee */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            Transaction Fee (XCH)
          </label>
          <input
            type="number"
            min="0"
            step="0.000001"
            value={formState.feeXCH}
            onChange={(e) => handleInputChange('feeXCH', parseFloat(e.target.value) || 0.000001)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              transition: 'border-color 0.3s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2196f3'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            title="Fee amount in XCH. Higher fees may result in faster confirmation."
          />
          <div style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            💰 <strong>Fee:</strong> {(formState.feeXCH * 1_000_000_000_000).toLocaleString()} mojos
            <br />
            💡 <strong>Recommended:</strong> 0.000001 XCH (default). Higher fees may result in faster confirmation.
          </div>
        </div>

        {/* Image Upload/URL Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={formState.useFile}
                onChange={() => handleInputChange('useFile', true)}
                style={{ marginRight: '6px' }}
              />
              📁 Upload File
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={!formState.useFile}
                onChange={() => handleInputChange('useFile', false)}
                style={{ marginRight: '6px' }}
              />
              🔗 Use URL
            </label>
          </div>

          {formState.useFile ? (
            // File Upload
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                style={{ display: 'none' }}
              />
              
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragOver ? '#2196f3' : formState.imageFile ? '#4caf50' : '#ccc'}`,
                  borderRadius: '8px',
                  padding: '30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  backgroundColor: isDragOver ? '#f0f8ff' : formState.imageFile ? '#f0fff0' : '#fafafa'
                }}
              >
                {formState.imageFile ? (
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontWeight: '500', color: '#4caf50' }}>
                      {formState.imageFile.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {(formState.imageFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📸</div>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      Click to upload or drag & drop
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Supports: JPG, PNG, GIF, WebP
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // URL Input
            <input
              type="url"
              value={formState.imageUrl}
              onChange={(e) => handleInputChange('imageUrl', e.target.value)}
              placeholder="https://example.com/your-image.jpg"
              required={!formState.useFile}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2196f3'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          )}
        </div>

        {/* Custom Attributes Section */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#333'
          }}>
            Custom Attributes (Optional)
          </label>
          <div style={{
            padding: '12px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <button
              type="button"
              onClick={() => {
                const key = prompt('Enter attribute name:');
                const value = prompt('Enter attribute value:');
                if (key && value) {
                  setFormState(prev => ({
                    ...prev,
                    attributes: { ...prev.attributes, [key]: value }
                  }));
                }
              }}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '8px'
              }}
            >
              + Add Attribute
            </button>
            
            {Object.entries(formState.attributes).length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {Object.entries(formState.attributes).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 8px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    fontSize: '14px'
                  }}>
                    <strong>{key}:</strong> {value}
                    <button
                      type="button"
                      onClick={() => {
                        setFormState(prev => {
                          const newAttributes = { ...prev.attributes };
                          delete newAttributes[key];
                          return { ...prev, attributes: newAttributes };
                        });
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: '2px 6px',
                        fontSize: '12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#333'
            }}>
              Preview
            </label>
            <img
              src={previewUrl}
              alt="NFT Preview"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                objectFit: 'cover'
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            type="submit"
            disabled={!isConnected || !isFormValid || isMinting || isConfirming || isUploading || isProcessing}
            style={{
              flex: 1,
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: !isConnected || !isFormValid || isMinting || isConfirming || isUploading || isProcessing
                ? '#cccccc' 
                : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !isConnected || !isFormValid || isMinting || isConfirming || isUploading || isProcessing
                ? 'not-allowed' 
                : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {isUploading ? (
              <>📤 Uploading...</>
            ) : isProcessing ? (
              <>⚙️ Processing...</>
            ) : isMinting ? (
              <>🔄 Minting...</>
            ) : isConfirming ? (
              <>⏳ Confirming...</>
            ) : (
              <>🚀 Mint NFT</>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '14px 20px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: '#f5f5f5',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          >
            🔄 Reset
          </button>
        </div>
      </form>

      {/* Upload Status */}
      {uploadStatus && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: uploadError ? '#ffebee' : isUploading || isProcessing ? '#fff3e0' : '#e8f5e8',
          border: `1px solid ${uploadError ? '#ffcdd2' : isUploading || isProcessing ? '#ffcc02' : '#c8e6c9'}`,
          borderRadius: '8px',
          color: uploadError ? '#c62828' : isUploading || isProcessing ? '#e65100' : '#2e7d32'
        }}>
          {isUploading && <span>📤 </span>}
          {isProcessing && <span>⚙️ </span>}
          {!isUploading && !isProcessing && !uploadError && <span>✅ </span>}
          {uploadError && <span>❌ </span>}
          <strong>{uploadStatus}</strong>
        </div>
      )}

      {/* Upload/Mint Errors */}
      {(uploadError || mintError) && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '8px',
          color: '#c62828'
        }}>
          <strong>❌ Error:</strong> {uploadError || mintError}
        </div>
      )}

      {lastNFTId && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#e8f5e8',
          border: '1px solid #c8e6c9',
          borderRadius: '8px',
          color: '#2e7d32'
        }}>
          <strong>🎉 Success!</strong>
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
          <span style={{ fontSize: '12px', color: '#666' }}>
            Your NFT has been minted successfully!
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
                  backgroundColor: '#2e7d32',
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
                  backgroundColor: '#1976d2',
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

      {/* Tips */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        backgroundColor: '#fff3e0',
        border: '1px solid #ffcc02',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <strong>💡 Tips:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Use high-quality images (JPG, PNG, WebP) for better NFT value</li>
          <li>Wait for image upload to complete before minting</li>
          <li>Metadata is automatically created and uploaded to IPFS</li>
          <li>Add custom attributes to make your NFT unique</li>
          <li>Write detailed descriptions to attract collectors</li>
          <li>Select a DID for verified ownership (optional but recommended)</li>
          <li>Set an appropriate transaction fee (higher fees = faster confirmation)</li>
          <li>Make sure your wallet has enough XCH for minting fees</li>
        </ul>
      </div>
    </div>
  );
}
