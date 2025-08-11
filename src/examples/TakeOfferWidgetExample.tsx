import React, { useState } from 'react';
import { TakeOfferWidget } from '../components/TakeOfferWidget';
import { ChiaWalletSDKProvider } from '../providers/ChiaWalletSDKProvider';
import type { DexieOfferData } from '../components/types';

/**
 * Example component demonstrating how to use the TakeOfferWidget
 * This shows the complete integration with the wallet SDK and offer validity checking
 */
export const TakeOfferWidgetExample: React.FC = () => {
    const [dexieOfferId, setDexieOfferId] = useState('HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleOfferTaken = (result: {
        transactionId: string;
        status: string;
        offerData: DexieOfferData;
    }) => {
        console.log('Offer taken successfully:', result);
        setResult(result);
        setError(null);
    };

    const handleError = (errorMessage: string) => {
        console.error('TakeOfferWidget error:', errorMessage);
        setError(errorMessage);
        setResult(null);
    };

    return (
        <ChiaWalletSDKProvider
            config={{
                baseUrl: 'https://api.example.com',
                enableLogging: true
            }}
        >
            <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
                <h1>Take Offer Widget Example</h1>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="offer-id">Dexie Offer ID:</label>
                    <input
                        id="offer-id"
                        type="text"
                        value={dexieOfferId}
                        onChange={(e) => setDexieOfferId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            marginTop: '5px',
                            fontFamily: 'monospace',
                            fontSize: '12px'
                        }}
                        placeholder="Enter Dexie offer ID..."
                    />
                </div>

                <TakeOfferWidget
                    dexieOfferId={dexieOfferId}
                    onOfferTaken={handleOfferTaken}
                    onError={handleError}
                    style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9'
                    }}
                />

                {result && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#d4edda',
                        border: '1px solid #c3e6cb',
                        borderRadius: '5px',
                        color: '#155724'
                    }}>
                        <h3>✅ Offer Taken Successfully!</h3>
                        <p><strong>Transaction ID:</strong> {result.transactionId}</p>
                        <p><strong>Status:</strong> {result.status}</p>
                        <p><strong>Offer ID:</strong> {result.offerData.offer.id}</p>
                    </div>
                )}

                {error && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#f8d7da',
                        border: '1px solid #f5c6cb',
                        borderRadius: '5px',
                        color: '#721c24'
                    }}>
                        <h3>❌ Error</h3>
                        <p>{error}</p>
                    </div>
                )}

                <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
                    <h3>Features Demonstrated:</h3>
                    <ul>
                        <li>✅ Fetches offer data from Dexie API</li>
                        <li>✅ Validates offer is still active (status = 1)</li>
                        <li>✅ Checks offer hasn't been completed</li>
                        <li>✅ Validates offer age (24 hour limit)</li>
                        <li>✅ Verifies wUSDC requirement</li>
                        <li>✅ Checks wallet balance</li>
                        <li>✅ Selects optimal coins</li>
                        <li>✅ Re-validates before taking offer</li>
                        <li>✅ Shows offer status and creation time</li>
                        <li>✅ Handles race conditions</li>
                    </ul>
                </div>
            </div>
        </ChiaWalletSDKProvider>
    );
}; 