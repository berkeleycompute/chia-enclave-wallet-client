import { useEffect, useState } from 'react';
import './App.css';

// Import the providers and components from your library
import { ChiaWalletSDKProvider } from '../../src/providers/ChiaWalletSDKProvider';
import { ChiaWalletButton } from '../../src/components/ChiaWalletButton';
import { TakeOfferWidget } from '../../src/components/TakeOfferWidget';

// Hardcoded JWT token
const HARDCODED_JWT = "eyJhbGciOiJIUzI1NiIsImtpZCI6ImxObjhvUFBNeklOWGY2TFMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3JiZHp6b3Vld2Nvb3Z2aHh0YWJiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhZWU2MGM1MS03OTU4LTRhZGMtYTY0Zi0wMjRmZTI5MDY0YTMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0Njc1Mjk0LCJpYXQiOjE3NTQ2NzE2OTQsImVtYWlsIjoiemFuKzZAc2lsaWNvbi5uZXQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiemFuKzZAc2lsaWNvbi5uZXQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJyZWNvdmVyeV9zZW50X2F0IjoxNzU0NTE3NzUwLCJzdWIiOiJhZWU2MGM1MS03OTU4LTRhZGMtYTY0Zi0wMjRmZTI5MDY0YTMifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJ0aW1lc3RhbXAiOjE3NTQ1MTc3Njl9XSwic2Vzc2lvbl9pZCI6IjdhZmI1M2NmLTg2ZTEtNDI3Mi1hMWRhLWYzMTg1Y2M2YzkzYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.cnmrDyp5zlnN4de9reCzsaihR_Yma0vTYqmpzUurc9c";

// Root App with Providers
function App() {
  const [showTakeOfferWidget, setShowTakeOfferWidget] = useState(false);
  const [offerResult, setOfferResult] = useState<any>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

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
    const newHash = next ? `#${next}` : ' ';
    try {
      window.history.replaceState(null, '', newHash);
    } catch {
      // Fallback if replaceState fails (shouldn't in dev)
      window.location.hash = next;
    }
  };

  const handleOfferTaken = (result: any) => {
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
          <label htmlFor="offer-id" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Dexie Offer ID</label>
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
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowTakeOfferWidget(!showTakeOfferWidget)}
            disabled={!offerId}
            style={{
              padding: '12px 24px',
              backgroundColor: !offerId ? '#999' : (showTakeOfferWidget ? '#ef4444' : '#22c55e'),
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !offerId ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {showTakeOfferWidget ? 'Hide Take Offer Widget' : 'Show Take Offer Widget'}
          </button>
        </div>

        {showTakeOfferWidget && offerId && (
          <div style={{ marginBottom: '20px' }}>
            <h2>Take Offer Widget</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              Current Offer ID: <code>{offerId}</code>
            </p>

            <TakeOfferWidget
              dexieOfferId={offerId}
              onOfferTaken={handleOfferTaken}
              onError={handleOfferError}
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                backgroundColor: '#f9f9f9',
                padding: '20px'
              }}
            />
          </div>
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
            <p><strong>Offer ID:</strong> {offerResult.offerData?.offer?.id}</p>
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
