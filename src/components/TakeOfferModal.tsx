import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    useTakeOffer,
    useWalletConnection,
    useWalletCoins,
    useWalletState,
    useWalletBalance
} from '../hooks/useChiaWalletSDK';
import {
    type TakeOfferRequest,
    type TakeOfferResponse,
    type ParsedOfferData,
    type HydratedCoin
} from '../client/ChiaCloudWalletClient';
import { injectModalStyles } from './modal-styles';

interface TakeOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialOfferString?: string;
    onOfferTaken?: (result: TakeOfferResult) => void;
    onError?: (error: string) => void;
    autoConnect?: boolean;
    showAdvancedOptions?: boolean;
}

interface TakeOfferResult {
    transactionId: string;
    status: string;
    message?: string;
    offerString: string;
    timestamp: number;
}

interface SelectedCoin {
    coin: HydratedCoin;
    amount: number;
    displayName: string;
    type: 'XCH' | 'CAT' | 'NFT';
    assetId?: string;
}

interface OfferAnalysis {
    isValid: boolean;
    requiredXCH: number;
    requiredCATs: Array<{
        assetId: string;
        amount: number;
        name?: string;
    }>;
    offeredNFTs: Array<{
        launcherId: string;
        amount: number;
    }>;
    estimatedValue: number;
    error?: string;
}

export const TakeOfferModal: React.FC<TakeOfferModalProps> = ({
    isOpen,
    onClose,
    initialOfferString = '',
    onOfferTaken,
    onError,
    autoConnect = true,
    showAdvancedOptions = false
}) => {
    // Wallet hooks
    const {
        takeOffer,
        parseOffer,
        isTakingOffer,
        isParsingOffer,
        error: takeOfferError,
        lastTakenOffer,
        parsedOffer
    } = useTakeOffer();

    const { isConnected, connect, address } = useWalletConnection();
    const { hydratedCoins, refresh: refreshCoins, isLoading: coinsLoading } = useWalletCoins();
    const { syntheticPublicKey } = useWalletState();
    const { totalBalance, formattedBalance } = useWalletBalance();

    // Component state
    const [offerString, setOfferString] = useState(initialOfferString);
    const [offerAnalysis, setOfferAnalysis] = useState<OfferAnalysis | null>(null);
    const [selectedCoins, setSelectedCoins] = useState<SelectedCoin[]>([]);
    const [customFee, setCustomFee] = useState(0.00001); // Default 0.00001 XCH
    const [showCoinSelection, setShowCoinSelection] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    // Refs
    const hasInitialized = useRef(false);

    // Inject modal styles
    useEffect(() => {
        injectModalStyles();
    }, []);

    // Auto-connect wallet when modal opens
    useEffect(() => {
        const initializeWallet = async () => {
            if (!isOpen || hasInitialized.current) return;

            if (autoConnect && !isConnected) {
                try {
                    await connect();
                    await refreshCoins();
                } catch (error) {
                    console.error('Failed to auto-connect wallet:', error);
                }
            }

            hasInitialized.current = true;
        };

        initializeWallet();
    }, [isOpen, autoConnect, isConnected, connect, refreshCoins]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setOfferAnalysis(null);
            setSelectedCoins([]);
            setShowCoinSelection(false);
            setIsAnalyzing(false);
            setHasAnalyzed(false);
            hasInitialized.current = false;
            if (!initialOfferString) {
                setOfferString('');
            }
        }
    }, [isOpen, initialOfferString]);

    // Format amount for display
    const formatAmount = (mojos: number, decimals: number = 3): string => {
        const divisor = Math.pow(10, decimals === 12 ? 12 : 3); // XCH uses 12 decimals, CATs typically 3
        return (mojos / divisor).toFixed(decimals === 12 ? 6 : 3);
    };

    // Format coin ID for display
    const formatCoinId = (id: string): string => {
        if (!id || id.length < 16) return id;
        return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
    };

    // Analyze offer string
    const analyzeOffer = useCallback(async () => {
        if (!offerString.trim()) {
            setOfferAnalysis(null);
            setHasAnalyzed(false);
            return;
        }

        setIsAnalyzing(true);
        setOfferAnalysis(null);

        try {
            const result = await parseOffer(offerString);

            if (result.success && result.data) {
                const analysis: OfferAnalysis = {
                    isValid: true,
                    requiredXCH: result.data.data?.xch_coins?.reduce((sum, coin) => sum + coin.amount, 0) || 0,
                    requiredCATs: result.data.data?.cat_coins?.map(cat => ({
                        assetId: cat.asset_id,
                        amount: cat.amount,
                        name: 'Unknown CAT' // CAT name not available in parsed data
                    })) || [],
                    offeredNFTs: result.data.data?.nft_coins?.map(nft => ({
                        launcherId: nft.launcher_id,
                        amount: nft.amount
                    })) || [],
                    estimatedValue: 0 // Could be calculated based on current market rates
                };

                setOfferAnalysis(analysis);
                setHasAnalyzed(true);

                // Auto-select appropriate coins if analysis is successful
                if (hydratedCoins && hydratedCoins.length > 0) {
                    selectOptimalCoins(analysis);
                }
            } else {
                setOfferAnalysis({
                    isValid: false,
                    requiredXCH: 0,
                    requiredCATs: [],
                    offeredNFTs: [],
                    estimatedValue: 0,
                    error: (result as any).error || 'Invalid offer format'
                });
                setHasAnalyzed(true);
            }
        } catch (error) {
            setOfferAnalysis({
                isValid: false,
                requiredXCH: 0,
                requiredCATs: [],
                offeredNFTs: [],
                estimatedValue: 0,
                error: error instanceof Error ? error.message : 'Failed to analyze offer'
            });
            setHasAnalyzed(true);
        } finally {
            setIsAnalyzing(false);
        }
    }, [offerString, parseOffer, hydratedCoins]);

    // Select optimal coins for the offer
    const selectOptimalCoins = useCallback((analysis: OfferAnalysis) => {
        if (!hydratedCoins || !analysis.isValid) return;

        const selected: SelectedCoin[] = [];

        // Select XCH coins if needed
        if (analysis.requiredXCH > 0) {
            const xchCoins = hydratedCoins.filter(coin =>
                coin.parentSpendInfo.driverInfo?.type !== 'CAT' &&
                coin.parentSpendInfo.driverInfo?.type !== 'NFT'
            );

            let remainingXCH = analysis.requiredXCH;
            for (const coin of xchCoins) {
                if (remainingXCH <= 0) break;

                const coinAmount = parseInt(coin.coin.amount);
                const amountToUse = Math.min(coinAmount, remainingXCH);

                selected.push({
                    coin,
                    amount: amountToUse,
                    displayName: `${formatAmount(amountToUse, 12)} XCH from ${formatCoinId(coin.coin.parentCoinInfo)}`,
                    type: 'XCH'
                });

                remainingXCH -= amountToUse;
            }
        }

        // Select CAT coins if needed
        for (const requiredCAT of analysis.requiredCATs) {
            const catCoins = hydratedCoins.filter(coin =>
                coin.parentSpendInfo.driverInfo?.type === 'CAT' &&
                coin.parentSpendInfo.driverInfo.assetId === requiredCAT.assetId
            );

            let remainingCAT = requiredCAT.amount;
            for (const coin of catCoins) {
                if (remainingCAT <= 0) break;

                const coinAmount = parseInt(coin.coin.amount);
                const amountToUse = Math.min(coinAmount, remainingCAT);

                selected.push({
                    coin,
                    amount: amountToUse,
                    displayName: `${formatAmount(amountToUse)} ${requiredCAT.name} from ${formatCoinId(coin.coin.parentCoinInfo)}`,
                    type: 'CAT',
                    assetId: requiredCAT.assetId
                });

                remainingCAT -= amountToUse;
            }
        }

        setSelectedCoins(selected);
    }, [hydratedCoins]);

    // Check if we have sufficient balance
    const hasSufficientBalance = useCallback((): boolean => {
        if (!offerAnalysis || !offerAnalysis.isValid || !hydratedCoins) return false;

        // Check XCH balance
        if (offerAnalysis.requiredXCH > 0) {
            const xchCoins = hydratedCoins.filter(coin =>
                coin.parentSpendInfo.driverInfo?.type !== 'CAT' &&
                coin.parentSpendInfo.driverInfo?.type !== 'NFT'
            );
            const totalXCH = xchCoins.reduce((sum, coin) => sum + parseInt(coin.coin.amount), 0);

            if (totalXCH < offerAnalysis.requiredXCH) return false;
        }

        // Check CAT balances
        for (const requiredCAT of offerAnalysis.requiredCATs) {
            const catCoins = hydratedCoins.filter(coin =>
                coin.parentSpendInfo.driverInfo?.type === 'CAT' &&
                coin.parentSpendInfo.driverInfo.assetId === requiredCAT.assetId
            );
            const totalCAT = catCoins.reduce((sum, coin) => sum + parseInt(coin.coin.amount), 0);

            if (totalCAT < requiredCAT.amount) return false;
        }

        return true;
    }, [offerAnalysis, hydratedCoins]);

    // Handle taking the offer
    const handleTakeOffer = useCallback(async () => {
        if (!offerString.trim() || !syntheticPublicKey || !offerAnalysis?.isValid) {
            onError?.('Missing required data to take offer');
            return;
        }

        try {
            // Prepare the request
            const xchCoinIds = selectedCoins
                .filter(sc => sc.type === 'XCH')
                .map(sc => sc.coin.coin.parentCoinInfo);

            const catCoinIds = selectedCoins
                .filter(sc => sc.type === 'CAT')
                .map(sc => sc.coin.coin.parentCoinInfo);

            const request: TakeOfferRequest = {
                offer_string: offerString,
                synthetic_public_key: syntheticPublicKey,
                xch_coins: xchCoinIds,
                cat_coins: catCoinIds,
                fee: Math.round(customFee * 1000000000000) // Convert XCH to mojos
            };

            const result = await takeOffer(request);

            if (result.success) {
                const takeOfferResult: TakeOfferResult = {
                    transactionId: result.data.transaction_id,
                    status: result.data.status,
                    message: result.data.message,
                    offerString: offerString,
                    timestamp: Date.now()
                };

                onOfferTaken?.(takeOfferResult);

                // Refresh coins after successful transaction
                setTimeout(() => refreshCoins(), 2000);

                // Close modal on success
                onClose();
            } else {
                onError?.((result as any).error || 'Failed to take offer');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to take offer';
            onError?.(errorMessage);
        }
    }, [offerString, syntheticPublicKey, offerAnalysis, selectedCoins, customFee, takeOffer, onOfferTaken, onError, onClose, refreshCoins]);

    if (!isOpen) return null;

    const isLoading = isAnalyzing || isTakingOffer || coinsLoading;
    const canTakeOffer = offerAnalysis?.isValid && hasSufficientBalance() && selectedCoins.length > 0 && isConnected;
    const hasError = takeOfferError || offerAnalysis?.error;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content take-offer-modal">
                <div className="modal-header">
                    <h3>Take Offer</h3>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    {/* Wallet Connection Status */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isConnected ? '#22c55e' : '#ef4444'
                            }}></span>
                            <span>Wallet {isConnected ? 'Connected' : 'Not Connected'}</span>
                            {isConnected && address && (
                                <span style={{ fontFamily: 'monospace', fontSize: '0.9em', color: '#888' }}>
                                    ({formatCoinId(address)})
                                </span>
                            )}
                        </div>
                        {isConnected && (
                            <div style={{ fontSize: '0.9em', color: '#888' }}>
                                <span>Balance: {formattedBalance}</span>
                            </div>
                        )}
                    </div>

                    {/* Offer Input */}
                    <div className="form-group">
                        <label htmlFor="offer-string">Offer String</label>
                        <textarea
                            id="offer-string"
                            className="form-textarea"
                            value={offerString}
                            onChange={(e) => setOfferString(e.target.value)}
                            placeholder="Paste your Chia offer string here (starts with 'offer1...')"
                            rows={4}
                            disabled={isLoading}
                            style={{ fontFamily: 'monospace' }}
                        />
                        <div style={{ marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={analyzeOffer}
                                disabled={!offerString.trim() || isAnalyzing}
                                className="btn btn-info"
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Offer'}
                            </button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {hasError && (
                        <div className="error-message">
                            <span>⚠️</span>
                            <span>{hasError}</span>
                        </div>
                    )}

                    {/* Offer Analysis Results */}
                    {hasAnalyzed && offerAnalysis && (
                        <div className="card">
                            <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Offer Analysis</h4>

                            {offerAnalysis.isValid ? (
                                <div className="analysis-results">
                                    <div className="analysis-section">
                                        <h5>What You'll Receive:</h5>
                                        <div className="offer-items">
                                            {offerAnalysis.offeredNFTs.length > 0 && (
                                                <div className="offer-item">
                                                    <span className="item-type">NFTs:</span>
                                                    <span className="item-count">{offerAnalysis.offeredNFTs.length} NFT(s)</span>
                                                </div>
                                            )}
                                            {offerAnalysis.requiredXCH === 0 && offerAnalysis.requiredCATs.length === 0 && (
                                                <div className="offer-item">
                                                    <span className="item-info">This appears to be a free offer</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="analysis-section">
                                        <h5>What You'll Pay:</h5>
                                        <div className="payment-requirements">
                                            {offerAnalysis.requiredXCH > 0 && (
                                                <div className="payment-item">
                                                    <span className="payment-amount">{formatAmount(offerAnalysis.requiredXCH, 12)} XCH</span>
                                                </div>
                                            )}
                                            {offerAnalysis.requiredCATs.map((cat, index) => (
                                                <div key={index} className="payment-item">
                                                    <span className="payment-amount">{formatAmount(cat.amount)} {cat.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Balance Check */}
                                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333' }}>
                                        <div className={hasSufficientBalance() ? 'success-message' : 'error-message'}>
                                            <span>{hasSufficientBalance() ? '✅' : '❌'}</span>
                                            <span>
                                                {hasSufficientBalance()
                                                    ? 'Sufficient balance available'
                                                    : 'Insufficient balance'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="error-message">
                                    <span>❌</span>
                                    <span>Invalid offer: {offerAnalysis.error}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Selected Coins */}
                    {selectedCoins.length > 0 && (
                        <div className="card">
                            <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Coins to Spend</h4>
                            <div className="list">
                                {selectedCoins.map((coinInfo, index) => (
                                    <div key={index} className="list-item" style={{ cursor: 'default' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                            {coinInfo.displayName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advanced Options */}
                    {showAdvancedOptions && (
                        <div className="card">
                            <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Advanced Options</h4>

                            <div className="form-group">
                                <label htmlFor="custom-fee">Transaction Fee (XCH)</label>
                                <input
                                    id="custom-fee"
                                    className="form-input"
                                    type="number"
                                    value={customFee}
                                    onChange={(e) => setCustomFee(parseFloat(e.target.value) || 0)}
                                    step="0.00001"
                                    min="0"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="form-group">
                                <button
                                    type="button"
                                    onClick={() => setShowCoinSelection(!showCoinSelection)}
                                    className="btn btn-secondary"
                                >
                                    {showCoinSelection ? 'Hide' : 'Show'} Coin Selection
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '16px',
                    borderTop: '1px solid #333'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isTakingOffer}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleTakeOffer}
                        disabled={!canTakeOffer || isTakingOffer}
                        className="btn btn-primary"
                    >
                        {isTakingOffer
                            ? 'Taking Offer...'
                            : !isConnected
                                ? 'Connect Wallet'
                                : !offerAnalysis?.isValid
                                    ? 'Analyze Offer First'
                                    : !hasSufficientBalance()
                                        ? 'Insufficient Balance'
                                        : 'Take Offer'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};
