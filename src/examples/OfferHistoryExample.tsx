import React, { useState } from 'react';
import { 
  useOfferHistory, 
  useActiveOffers, 
  useCompletedOffers, 
  OFFER_STATUS
} from '../hooks/useOfferHistory';
import { type OfferHistoryItem, type OfferAsset, type OfferRequestedAsset } from '../client/ChiaCloudWalletClient';

// Simple offer card component
const OfferCard: React.FC<{ offer: OfferHistoryItem }> = ({ offer }) => {
  const getStatusLabel = (status: number) => {
    switch (status) {
      case OFFER_STATUS.PENDING: return 'Pending';
      case OFFER_STATUS.ACTIVE: return 'Active';
      case OFFER_STATUS.CANCELLED: return 'Cancelled';
      case OFFER_STATUS.EXPIRED: return 'Expired';
      case OFFER_STATUS.COMPLETED: return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case OFFER_STATUS.PENDING: return '#FFA500';
      case OFFER_STATUS.ACTIVE: return '#00FF00';
      case OFFER_STATUS.CANCELLED: return '#FF4444';
      case OFFER_STATUS.EXPIRED: return '#888888';
      case OFFER_STATUS.COMPLETED: return '#0066FF';
      default: return '#000000';
    }
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      margin: '8px 0',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{offer.asset}</h3>
        <span style={{ 
          color: getStatusColor(offer.status),
          fontWeight: 'bold',
          fontSize: '12px',
          textTransform: 'uppercase'
        }}>
          {getStatusLabel(offer.status)}
        </span>
      </div>
      
      <div style={{ fontSize: '14px', color: '#666' }}>
        <p><strong>Price:</strong> {offer.price} {offer.code}</p>
        <p><strong>Created:</strong> {new Date(offer.date_created).toLocaleDateString()}</p>
        {offer.date_completed && (
          <p><strong>Completed:</strong> {new Date(offer.date_completed).toLocaleDateString()}</p>
        )}
        <p><strong>Offer ID:</strong> <code style={{ fontSize: '12px' }}>{offer.offer_id}</code></p>
      </div>

      {offer.offered.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <strong>Offered NFTs:</strong>
          {offer.offered.map((asset: OfferAsset, index: number) => (
            <div key={index} style={{ marginLeft: '16px', fontSize: '12px' }}>
              • {asset.name} ({asset.collection.name})
            </div>
          ))}
        </div>
      )}

      {offer.requested.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <strong>Requested:</strong>
          {offer.requested.map((asset: OfferRequestedAsset, index: number) => (
            <div key={index} style={{ marginLeft: '16px', fontSize: '12px' }}>
              • {asset.amount} {asset.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Statistics component
const OfferStats: React.FC<{ stats: any }> = ({ stats }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{stats.total}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00FF00' }}>{stats.active}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>Active</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066FF' }}>{stats.completed}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>Completed</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFA500' }}>{stats.pending}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>Pending</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF4444' }}>{stats.cancelled}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>Cancelled</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#888888' }}>{stats.expired}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>Expired</div>
    </div>
  </div>
);

// Main example component
export const OfferHistoryExample: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('xch16rwd5cg28cp795zfddj5tuazn3ncy88mvwzvl2vfl65afr3qrvqqkslpxv');
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed'>('all');

  // Use different hooks for different views
  const allOffers = useOfferHistory({
    address: walletAddress,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    enableLogging: true
  });

  const activeOffers = useActiveOffers({
    address: walletAddress,
    autoRefresh: true,
    refreshInterval: 15000 // 15 seconds for active offers
  });

  const completedOffers = useCompletedOffers({
    address: walletAddress,
    maxItems: 20 // Limit to last 20 completed offers
  });

  const getCurrentData = () => {
    switch (selectedTab) {
      case 'active':
        return {
          offers: activeOffers.offers,
          loading: activeOffers.loading,
          error: activeOffers.error,
          refresh: activeOffers.refresh
        };
      case 'completed':
        return {
          offers: completedOffers.offers,
          loading: completedOffers.loading,
          error: completedOffers.error,
          refresh: completedOffers.refresh
        };
      default:
        return {
          offers: allOffers.offers,
          loading: allOffers.loading,
          error: allOffers.error,
          refresh: allOffers.refresh
        };
    }
  };

  const currentData = getCurrentData();
  const stats = allOffers.getOfferStats();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Offer History Example</h1>
      
      {/* Address input */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Wallet Address:
        </label>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter wallet address (xch...)"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Statistics */}
      {stats.total > 0 && <OfferStats stats={stats} />}

      {/* Tab navigation */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '24px',
        borderBottom: '1px solid #ddd'
      }}>
        {(['all', 'active', 'completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: selectedTab === tab ? '#0066FF' : 'transparent',
              color: selectedTab === tab ? 'white' : '#666',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: selectedTab === tab ? 'bold' : 'normal'
            }}
          >
            {tab} ({
              tab === 'all' ? stats.total :
              tab === 'active' ? stats.active :
              stats.completed
            })
          </button>
        ))}
      </div>

      {/* Refresh button and status */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px' 
      }}>
        <button
          onClick={() => currentData.refresh()}
          disabled={currentData.loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0066FF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentData.loading ? 'not-allowed' : 'pointer',
            opacity: currentData.loading ? 0.6 : 1
          }}
        >
          {currentData.loading ? 'Loading...' : 'Refresh'}
        </button>
        
        {allOffers.lastUpdate > 0 && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            Last updated: {new Date(allOffers.lastUpdate).toLocaleTimeString()}
            {allOffers.isStale() && <span style={{ color: '#FFA500' }}> (Stale)</span>}
          </div>
        )}
      </div>

      {/* Error state */}
      {currentData.error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#FFE6E6',
          border: '1px solid #FF4444',
          borderRadius: '4px',
          color: '#CC0000',
          marginBottom: '16px'
        }}>
          <strong>Error:</strong> {currentData.error}
        </div>
      )}

      {/* Loading state */}
      {currentData.loading && currentData.offers.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666'
        }}>
          Loading offer history...
        </div>
      )}

      {/* Empty state */}
      {!currentData.loading && currentData.offers.length === 0 && !currentData.error && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666'
        }}>
          No {selectedTab === 'all' ? '' : selectedTab + ' '}offers found for this address.
        </div>
      )}

      {/* Offer list */}
      {currentData.offers.map((offer) => (
        <OfferCard key={offer.offer_id} offer={offer} />
      ))}

      {/* Debug info */}
      <details style={{ marginTop: '32px', fontSize: '12px', color: '#666' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Information</summary>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '16px', 
          borderRadius: '4px',
          overflow: 'auto',
          marginTop: '8px'
        }}>
          {JSON.stringify({
            address: allOffers.address,
            totalOffers: allOffers.totalOffers,
            currentTab: selectedTab,
            currentOfferCount: currentData.offers.length,
            stats,
            lastUpdate: allOffers.lastUpdate,
            isStale: allOffers.isStale()
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
};

// Simple usage example
export const SimpleOfferHistoryExample: React.FC = () => {
  const { offers, loading, error, refresh } = useOfferHistory({
    address: 'xch16rwd5cg28cp795zfddj5tuazn3ncy88mvwzvl2vfl65afr3qrvqqkslpxv',
    autoRefresh: true
  });

  if (loading) return <div>Loading offers...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Simple Offer History ({offers.length} offers)</h2>
      <button onClick={refresh}>Refresh</button>
      
      {offers.slice(0, 5).map(offer => (
        <div key={offer.offer_id} style={{ margin: '8px 0', padding: '8px', border: '1px solid #ddd' }}>
          <strong>{offer.asset}</strong> - {offer.price} {offer.code}
          <br />
          <small>Status: {offer.status} | Created: {offer.date_created}</small>
        </div>
      ))}
    </div>
  );
};

export default OfferHistoryExample;
