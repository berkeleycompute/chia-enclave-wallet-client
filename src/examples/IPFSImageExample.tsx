import React, { useState, useEffect } from 'react';
import { useIPFSImage } from '../hooks/useIPFSImage';
import { getPreferredGateway } from '../utils/ipfs';

/**
 * Example component showing how to use the useIPFSImage hook
 * with automatic fallback to multiple gateways and error handling
 */
export const IPFSImageExample: React.FC = () => {
  const [preferredGateway, setPreferredGatewayState] = useState<string | null>(null);
  
  // Example IPFS URIs
  const examples = [
    'ipfs://bafybeieg6kwaassmgcm3soy53cjve3dmkfb5ts3xvwo3pnqgtbizv4vpl4/0',
    'https://gateway.pinata.cloud/ipfs/bafybeigsfvcvatn4khhdttjrcrmqj3aif3hex6s5tuwxrrwmmtru6evwze',
    'https://ipfs.io/ipfs/QmUBdnXXPyoDFXj3Hj1WXK1YkQLTfNLdxPkdZN38mK3WFg'
  ];

  // Update preferred gateway info periodically
  useEffect(() => {
    const updatePreferred = () => {
      setPreferredGatewayState(getPreferredGateway());
    };
    
    updatePreferred();
    const interval = setInterval(updatePreferred, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>IPFS Image Loading Examples</h2>
      <p>Images are automatically cached by the browser and fall back through multiple gateways if one fails.</p>
      
      {preferredGateway && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#1a1a1a', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #4dabf7'
        }}>
          <div style={{ color: '#4dabf7', fontWeight: 'bold', marginBottom: '4px' }}>
            🎯 Preferred Gateway (cached):
          </div>
          <div style={{ color: '#888', fontSize: '14px' }}>
            {preferredGateway}
          </div>
          <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
            This gateway will be tried first for all future requests
          </div>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {examples.map((uri, idx) => (
          <IPFSImageCard key={idx} uri={uri} />
        ))}
      </div>
    </div>
  );
};

const IPFSImageCard: React.FC<{ uri: string }> = ({ uri }) => {
  const { imageUrl, loading, isDefault, error, gateway, usedAuth } = useIPFSImage(uri);

  // Extract gateway name for display
  const getGatewayName = (gatewayUrl?: string): string => {
    if (!gatewayUrl) return 'Unknown';
    if (gatewayUrl.includes('ipfs.io')) return 'ipfs.io';
    if (gatewayUrl.includes('pinata')) return 'Pinata';
    if (gatewayUrl.includes('cloudflare')) return 'Cloudflare';
    if (gatewayUrl.includes('dweb.link')) return 'dweb.link';
    if (gatewayUrl.includes('edgedev.silicon.net')) return 'Backend (Auth)';
    return 'Custom';
  };

  return (
    <div style={{
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#1a1a1a'
    }}>
      <div style={{
        width: '100%',
        height: '200px',
        backgroundColor: '#000',
        borderRadius: '4px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {loading && (
          <div style={{ position: 'absolute', color: '#fff' }}>
            Loading...
          </div>
        )}
        <img
          src={imageUrl}
          alt="IPFS Content"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.3s'
          }}
        />
      </div>
      
      <div style={{ fontSize: '12px', color: '#888', wordBreak: 'break-all' }}>
        {uri.substring(0, 50)}...
      </div>
      
      <div style={{ marginTop: '8px', fontSize: '11px' }}>
        {isDefault && !loading && (
          <span style={{ color: '#ff6b6b' }}>⚠️ Using placeholder (failed to load)</span>
        )}
        {!isDefault && !loading && (
          <div>
            <div style={{ color: '#51cf66', marginBottom: '4px' }}>
              ✅ Loaded successfully
            </div>
            <div style={{ color: '#4dabf7' }}>
              🌐 Gateway: {getGatewayName(gateway)}
              {usedAuth && ' 🔐'}
            </div>
          </div>
        )}
        {loading && (
          <span style={{ color: '#ffd43b' }}>🔄 Loading...</span>
        )}
        {error && (
          <div style={{ color: '#ff6b6b', marginTop: '4px' }}>
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default IPFSImageExample;

