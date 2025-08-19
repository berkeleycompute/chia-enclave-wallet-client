import React, { useState, useCallback } from 'react';
import {
    TakeOfferModal,
    ChiaWalletSDKProvider,
    type TakeOfferResult,
    type TakeOfferModalProps
} from '../index';

/**
 * Basic TakeOfferModal Example
 * 
 * This example shows the simplest way to use the TakeOfferModal component.
 * The modal handles all the complexity of parsing offers, checking balances,
 * selecting coins, and executing the transaction.
 */
export const BasicTakeOfferExample: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lastResult, setLastResult] = useState<TakeOfferResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleOfferTaken = useCallback((result: TakeOfferResult) => {
        console.log('Offer taken successfully:', result);
        setLastResult(result);
        setError(null);
    }, []);

    const handleError = useCallback((errorMessage: string) => {
        console.error('Take offer error:', errorMessage);
        setError(errorMessage);
        setLastResult(null);
    }, []);

    return (
        <ChiaWalletSDKProvider
            config={{
                baseUrl: 'https://your-chia-api-endpoint.com',
                enableLogging: true,
            }}
        >
            <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
                <h2>Basic Take Offer Example</h2>

                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Open Take Offer Modal
                    </button>
                </div>

                {/* Success Display */}
                {lastResult && (
                    <div style={{
                        background: '#d4edda',
                        color: '#155724',
                        padding: '16px',
                        borderRadius: '4px',
                        marginBottom: '20px'
                    }}>
                        <h3>✅ Offer Taken Successfully!</h3>
                        <p><strong>Transaction ID:</strong> {lastResult.transactionId}</p>
                        <p><strong>Status:</strong> {lastResult.status}</p>
                        {lastResult.message && <p><strong>Message:</strong> {lastResult.message}</p>}
                        <p><strong>Time:</strong> {new Date(lastResult.timestamp).toLocaleString()}</p>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div style={{
                        background: '#f8d7da',
                        color: '#721c24',
                        padding: '16px',
                        borderRadius: '4px',
                        marginBottom: '20px'
                    }}>
                        <h3>❌ Error Taking Offer</h3>
                        <p>{error}</p>
                    </div>
                )}

                <TakeOfferModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onOfferTaken={handleOfferTaken}
                    onError={handleError}
                    autoConnect={true}
                />
            </div>
        </ChiaWalletSDKProvider>
    );
};

/**
 * Advanced TakeOfferModal Example
 * 
 * This example shows advanced usage with custom configuration,
 * pre-filled offer strings, and additional options.
 */
export const AdvancedTakeOfferExample: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prefilledOffer, setPrefilledOffer] = useState('');
    const [results, setResults] = useState<TakeOfferResult[]>([]);

    // Example offer string (this would come from your application)
    const exampleOfferString = 'offer1qqr83wcuu2rykcmqvpsxygqqwc7hynr6hum6e0mnf72sn7uvvkpt68eyumkhelprk0adeg42nlelk2mpagr8facdwt3';

    const handleOfferTaken = useCallback((result: TakeOfferResult) => {
        setResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
    }, []);

    const handleError = useCallback((errorMessage: string) => {
        alert(`Error: ${errorMessage}`);
    }, []);

    const openWithPrefilledOffer = useCallback((offerString: string) => {
        setPrefilledOffer(offerString);
        setIsModalOpen(true);
    }, []);

    return (
        <ChiaWalletSDKProvider
            config={{
                baseUrl: 'https://your-chia-api-endpoint.com',
                enableLogging: true,
            }}
        >
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                <h2>Advanced Take Offer Example</h2>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Take Offer (Empty)
                    </button>

                    <button
                        onClick={() => openWithPrefilledOffer(exampleOfferString)}
                        style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Take Offer (Pre-filled)
                    </button>

                    <button
                        onClick={() => openWithPrefilledOffer('')}
                        style={{
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Advanced Options
                    </button>
                </div>

                {/* Custom Offer Input */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Custom Offer String:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={prefilledOffer}
                            onChange={(e) => setPrefilledOffer(e.target.value)}
                            placeholder="Paste offer string here..."
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '14px'
                            }}
                        />
                        <button
                            onClick={() => setIsModalOpen(true)}
                            disabled={!prefilledOffer.trim()}
                            style={{
                                background: prefilledOffer.trim() ? '#007bff' : '#6c757d',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: prefilledOffer.trim() ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Take This Offer
                        </button>
                    </div>
                </div>

                {/* Results History */}
                {results.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3>Recent Transactions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {results.map((result, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: '#f8f9fa',
                                        padding: '12px',
                                        borderRadius: '4px',
                                        border: '1px solid #dee2e6'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '500' }}>
                                            Transaction {result.transactionId.substring(0, 8)}...
                                        </span>
                                        <span style={{
                                            background: result.status === 'success' ? '#28a745' : '#ffc107',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '12px'
                                        }}>
                                            {result.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        {new Date(result.timestamp).toLocaleString()}
                                    </div>
                                    {result.message && (
                                        <div style={{ fontSize: '14px', marginTop: '4px' }}>
                                            {result.message}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <TakeOfferModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialOfferString={prefilledOffer}
                    onOfferTaken={handleOfferTaken}
                    onError={handleError}
                    autoConnect={true}
                    showAdvancedOptions={true}
                />
            </div>
        </ChiaWalletSDKProvider>
    );
};

/**
 * Integration Example
 * 
 * This example shows how to integrate the TakeOfferModal into 
 * an existing application with custom styling and behavior.
 */
export const IntegrationExample: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [offerUrl, setOfferUrl] = useState('');

    // Example of extracting offer from URL or QR code
    const extractOfferFromUrl = useCallback((url: string): string => {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.get('offer') || '';
        } catch {
            // If not a URL, assume it's already an offer string
            return url.startsWith('offer1') ? url : '';
        }
    }, []);

    const handleOfferTaken = useCallback((result: TakeOfferResult) => {
        // Custom success handling - could integrate with your app's notification system
        console.log('Integrating transaction result:', result);

        // Example: Send to analytics
        // analytics.track('offer_taken', {
        //   transaction_id: result.transactionId,
        //   status: result.status
        // });

        // Example: Update local state or refresh data
        // refreshUserBalance();
        // addToTransactionHistory(result);
    }, []);

    const handleError = useCallback((errorMessage: string) => {
        // Custom error handling
        console.error('Offer taking failed:', errorMessage);

        // Example: Send to error tracking
        // errorTracking.captureException(new Error(errorMessage));
    }, []);

    const handleUrlSubmit = useCallback(() => {
        const offer = extractOfferFromUrl(offerUrl);
        if (offer) {
            setIsModalOpen(true);
        } else {
            alert('Invalid offer URL or string');
        }
    }, [offerUrl, extractOfferFromUrl]);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Integration Example</h2>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>
                    Offer URL or String:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={offerUrl}
                        onChange={(e) => setOfferUrl(e.target.value)}
                        placeholder="https://example.com/offer?offer=offer1... or offer1..."
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                    <button
                        onClick={handleUrlSubmit}
                        style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Process Offer
                    </button>
                </div>
            </div>

            <TakeOfferModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialOfferString={extractOfferFromUrl(offerUrl)}
                onOfferTaken={handleOfferTaken}
                onError={handleError}
                autoConnect={true}
                showAdvancedOptions={false}
            />
        </div>
    );
};

/**
 * Complete Application Example
 * 
 * This shows a complete mini-application that demonstrates
 * all the features of the TakeOfferModal in a real-world context.
 */
export const CompleteTakeOfferApp: React.FC = () => {
    return (
        <ChiaWalletSDKProvider
            config={{
                baseUrl: 'https://your-api.com',
                enableLogging: true,
            }}
        >
            <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
                <div style={{ padding: '20px' }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        marginBottom: '20px'
                    }}>
                        <h1 style={{ margin: '0 0 16px 0' }}>Chia Offer Marketplace</h1>
                        <p style={{ margin: '0', color: '#666' }}>
                            Take offers from other users safely and securely.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            padding: '24px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <BasicTakeOfferExample />
                        </div>

                        <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            padding: '24px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <IntegrationExample />
                        </div>
                    </div>

                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        marginTop: '20px'
                    }}>
                        <AdvancedTakeOfferExample />
                    </div>
                </div>
            </div>
        </ChiaWalletSDKProvider>
    );
};
