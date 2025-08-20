import { useEffect, useState, useCallback } from 'react';
import './App.css';

// Import the providers and components from your library
import { ChiaWalletSDKProvider } from '../../src/providers/ChiaWalletSDKProvider';
import { ChiaWalletButton } from '../../src/components/ChiaWalletButton';
import { TakeOfferWidget } from '../../src/components/TakeOfferWidget';
import type { DexieOfferData, DexieOfferResult } from '../../src/components/types';

// Hardcoded JWT token
const HARDCODED_JWT = "eyJhbGciOiJIUzI1NiIsImtpZCI6ImxObjhvUFBNeklOWGY2TFMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3JiZHp6b3Vld2Nvb3Z2aHh0YWJiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhZWU2MGM1MS03OTU4LTRhZGMtYTY0Zi0wMjRmZTI5MDY0YTMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1NjQxMjMwLCJpYXQiOjE3NTU2Mzc2MzAsImVtYWlsIjoiemFuKzZAc2lsaWNvbi5uZXQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiemFuKzZAc2lsaWNvbi5uZXQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJyZWNvdmVyeV9zZW50X2F0IjoxNzU1NjM3NTY5LCJzdWIiOiJhZWU2MGM1MS03OTU4LTRhZGMtYTY0Zi0wMjRmZTI5MDY0YTMifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJ0aW1lc3RhbXAiOjE3NTU2Mzc2MzB9XSwic2Vzc2lvbl9pZCI6ImYwZWEyMmMyLWE4NjEtNDdiMS05NGNkLWRkMTAxODExNGJmZiIsImlzX2Fub255bW91cyI6ZmFsc2V9._k5TEIb4sWsHAiudVGJT9cRsOfcwTydgEOg_7P8Zupw";

// Root App with Providers
function App() {
  const [showTakeOfferWidget, setShowTakeOfferWidget] = useState(false);
  const [offerResult, setOfferResult] = useState<DexieOfferResult | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [dexieOfferData, setDexieOfferData] = useState<DexieOfferData | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);

  // Offer ID controlled by URL hash
  const [offerId, setOfferId] = useState<string>(() => (window.location.hash ? window.location.hash.slice(1) : ''));

  // Keep state in sync with hash changes (e.g., user edits URL directly)
  useEffect(() => {
    const onHashChange = () => {
      setOfferId(window.location.hash ? window.location.hash.slice(1) : '');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Update hash when the input changes (without adding history entries)
  const handleOfferIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.trim();
    setOfferId(next);
    const newHash = next ? `#${next}` : '';
    try {
      window.history.replaceState(null, '', newHash);
    } catch {
      // Fallback if replaceState fails (shouldn't in dev)
      window.location.hash = next;
    }
  };

  // Fetch offer data from Dexie API (simulating what the app would do)
  const fetchOfferData = useCallback(async () => {
    if (!offerId) {
      setDexieOfferData(null);
      return;
    }

    setLoadingOffer(true);
    setOfferError(null);

    try {
      const response = await fetch(`https://api.dexie.space/v1/offers/${offerId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch offer: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Invalid offer data received from Dexie API');
      }

      setDexieOfferData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offer data';
      setOfferError(errorMessage);
      setDexieOfferData(null);
    } finally {
      setLoadingOffer(false);
    }
  }, [offerId]);

  // Fetch offer data when offerId changes
  useEffect(() => {
    fetchOfferData();
  }, [fetchOfferData]);

  const handleOfferTaken = (result: DexieOfferResult) => {
    console.log('✅ Offer taken successfully:', result);
    setOfferResult(result);
    setOfferError(null);
  };

  const handleOfferError = (error: string) => {
    console.error('❌ Offer error:', error);
    setOfferError(error);
    setOfferResult(null);
  };

  return (
    <ChiaWalletSDKProvider
      config={{
        autoConnect: true,
        jwtToken: HARDCODED_JWT
      }}
    >
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Chia Wallet Test</h1>

        <div className="flex" style={{ marginBottom: '20px' }}>
          <ChiaWalletButton />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="offer-id" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            Dexie Offer ID
          </label>
          <input
            id="offer-id"
            type="text"
            value={offerId}
            onChange={handleOfferIdChange}
            placeholder="Paste Dexie offer ID..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontFamily: 'monospace',
              fontSize: 12
            }}
          />
          <div style={{ marginTop: 6, color: '#666', fontSize: 12 }}>
            URL hash is kept in sync. Share the link to load this offer ID automatically.
          </div>

          {loadingOffer && (
            <div style={{ marginTop: 8, color: '#007bff', fontSize: 14 }}>
              Loading offer data from Dexie...
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowTakeOfferWidget(!showTakeOfferWidget)}
              disabled={!dexieOfferData || loadingOffer}
              style={{
                padding: '12px 24px',
                backgroundColor: (!dexieOfferData || loadingOffer) ? '#999' : (showTakeOfferWidget ? '#ef4444' : '#22c55e'),
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (!dexieOfferData || loadingOffer) ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {showTakeOfferWidget ? 'Close Take Offer Widget' : 'Open Take Offer Widget'}
            </button>


            <button
              onClick={() => {
                setOfferId('');
                setDexieOfferData(null);
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Show offer data preview if loaded */}
        {dexieOfferData && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', border: '1px solid #cce7ff', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>Loaded Offer Data</h3>
            <p><strong>ID:</strong> {dexieOfferData.offer.id}</p>
            <p><strong>Status:</strong> {dexieOfferData.offer.status} ({
              dexieOfferData.offer.status === 0 ? 'Pending' :
                dexieOfferData.offer.status === 1 ? 'Active' :
                  dexieOfferData.offer.status === 2 ? 'Completed' :
                    dexieOfferData.offer.status === 3 ? 'Cancelled' : 'Unknown'
            })</p>
            <p><strong>Price:</strong> {dexieOfferData.offer.price.toFixed(3)} wUSDC</p>
            <p><strong>Created:</strong> {new Date(dexieOfferData.offer.date_found).toLocaleString()}</p>
          </div>
        )}

        {dexieOfferData && (
          <TakeOfferWidget
            isOpen={showTakeOfferWidget}
            onClose={() => setShowTakeOfferWidget(false)}
            dexieOfferData={dexieOfferData}
            onOfferTaken={handleOfferTaken}
            onError={handleOfferError}
            jwtToken={HARDCODED_JWT}
          />
        )}

        {offerResult && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            color: '#155724'
          }}>
            <h3>✅ Offer Taken Successfully!</h3>
            <p><strong>Transaction ID:</strong> {offerResult.transactionId}</p>
            <p><strong>Status:</strong> {offerResult.status}</p>
            <p><strong>Offer ID:</strong> {offerResult.offerData.offer.id}</p>
          </div>
        )}

        {offerError && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            color: '#721c24'
          }}>
            <h3>❌ Error</h3>
            <p>{offerError}</p>
          </div>
        )}
      </div>
    </ChiaWalletSDKProvider>
  );
}

export default App;
