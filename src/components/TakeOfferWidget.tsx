import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    useWalletCoins,
    useWalletConnection,
    useWalletState,
    useTakeOffer,
    useUnifiedWalletClient,
} from '../hooks/useChiaWalletSDK';
import { type HydratedCoin } from '../client/ChiaCloudWalletClient';
import { injectModalStyles } from './modal-styles';

// wUSDC asset ID constant
const WUSDC_ASSET_ID = 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d';

// Interfaces matching the original component exactly
interface OfferResult {
    transactionId: string;
    status: string;
    offerData: DexieOfferData;
}

interface TakeOfferWidgetProps {
    isOpen: boolean;
    onClose: () => void;
    dexieOfferData: DexieOfferData;
    onOfferTaken?: (result: OfferResult) => void;
    onError?: (error: string) => void;
    jwtToken?: string; // Optional JWT token override
}

interface SelectedCoin {
    coin: HydratedCoin;
    amount: number;
    displayName: string;
}

interface DexieOfferData {
    offer: {
        id: string;
        offer: string; // offer string
        status: number;
        date_completed?: string;
        date_found: string;
        price: number;
        offered: Array<{
            id: string;
            amount: number;
            code: string;
            name: string;
            is_nft?: boolean;
            collection?: { name: string };
        }>;
        requested: Array<{
            id: string;
            amount: number;
            code: string;
            name: string;
            is_nft?: boolean;
            collection?: { name: string };
        }>;
        output_coins: Record<string, Array<{ amount: number }>>;
    };
}

export const TakeOfferWidget: React.FC<TakeOfferWidgetProps> = ({
    isOpen,
    onClose,
    dexieOfferData,
    onOfferTaken,
    onError,
    jwtToken
}) => {
    // Wallet hooks
    const { hydratedCoins, isLoading: coinsLoading, refresh: refreshCoins } = useWalletCoins();
    const { isConnected: hookIsConnected, connect: connectWallet } = useWalletConnection();
    const walletState = useWalletState();
    const { takeOffer, error: takeOfferError } = useTakeOffer();
    const walletClient = useUnifiedWalletClient();

    // Use the actual wallet client connection state (more reliable)
    const isConnected = walletClient?.sdk?.walletState?.isConnected || false;

    // State
    const [error, setError] = useState<string | null>(null);
    const [selectedCoins, setSelectedCoins] = useState<SelectedCoin[]>([]);
    const [requiredWUSDC, setRequiredWUSDC] = useState(0);
    const [availableWUSDC, setAvailableWUSDC] = useState(0);
    const [hasSufficientBalance, setHasSufficientBalance] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    // Progress states for take offer process
    type TakeOfferProgressState = 'idle' | 'getting-fresh-coins' | 'taking' | 'retrying';
    const [progressState, setProgressState] = useState<TakeOfferProgressState>('idle');

    // Refs to track initialization state
    const hasInitialized = useRef(false);
    const currentOfferId = useRef<string | null>(null);

    // Inject shared modal styles
    useEffect(() => {
        injectModalStyles();
    }, []);

    // Check if offer requires wUSDC and calculate requirements
    const analyzeOffer = useCallback(() => {
        if (!dexieOfferData) return;

        const offer = dexieOfferData.offer;

        // Status check - status 0 = pending/valid, status 1 = active, status 2 = completed, status 3 = cancelled
        if (offer.status !== 0 && offer.status !== 1) {
            let statusMessage = 'This offer is no longer valid.';
            if (offer.status === 2) {
                statusMessage = 'This offer has already been completed.';
            } else if (offer.status === 3) {
                statusMessage = 'This offer has been cancelled.';
            }
            setError(statusMessage);
            return;
        }

        // Check if offer has been completed (additional safety check)
        if (offer.date_completed) {
            setError('This offer has already been completed.');
            return;
        }

        // Determine required wUSDC in mojos from output_coins first (matches wallet coin units)
        const wusdcOutputs = dexieOfferData.offer.output_coins[WUSDC_ASSET_ID];
        if (wusdcOutputs && wusdcOutputs.length > 0) {
            const totalRequiredMojos = wusdcOutputs.reduce((sum, c) => sum + c.amount, 0);
            setRequiredWUSDC(totalRequiredMojos);
            return;
        }

        console.log(dexieOfferData.offer);
        // Fallback: if only requested array is present (assumed whole units), convert to mojos (1e3)
        const wusdcRequested = dexieOfferData.offer.requested.find((asset) => asset.id === WUSDC_ASSET_ID);
        if (wusdcRequested) {
            setRequiredWUSDC(Math.round(wusdcRequested.amount * 1000));
            return;
        }

        setError('This offer does not require wUSDC tokens. Only wUSDC offers are supported.');
    }, [dexieOfferData]);

    // Calculate available wUSDC balance and select coins
    const calculateBalance = useCallback(() => {
        if (!hydratedCoins || requiredWUSDC === 0) return;

        // Filter for wUSDC coins
        const wusdcCoins = hydratedCoins.filter((coin) => {
            const driverInfo = coin.parentSpendInfo.driverInfo;
            return driverInfo?.type === 'CAT' && driverInfo.assetId === WUSDC_ASSET_ID;
        });

        // Calculate total available balance
        const totalAvailable = wusdcCoins.reduce((sum, coin) => sum + parseInt(coin.coin.amount), 0);
        setAvailableWUSDC(totalAvailable);

        // Check if we have sufficient balance
        const sufficient = totalAvailable >= requiredWUSDC;
        setHasSufficientBalance(sufficient);

        if (sufficient) {
            // Select coins to cover the required amount
            const selected: SelectedCoin[] = [];
            let remainingAmount = requiredWUSDC;

            for (const coin of wusdcCoins) {
                if (remainingAmount <= 0) break;

                const coinAmount = parseInt(coin.coin.amount);
                const amountToUse = Math.min(coinAmount, remainingAmount);

                selected.push({
                    coin,
                    amount: amountToUse,
                    displayName: `${formatAmount(amountToUse)} wUSDC from ${formatCoinId(coin.coin.parentCoinInfo)}`,
                });

                remainingAmount -= amountToUse;
            }

            setSelectedCoins(selected);
        } else {
            setSelectedCoins([]);
        }
    }, [hydratedCoins, requiredWUSDC]);

    // Format amount for display (CATs typically use 3 decimal places on-chain)
    const formatAmount = (mojos: number) => {
        return (mojos / 1000).toFixed(3);
    };

    // Format coin ID for display (hyphenated)
    const formatCoinId = (id: string) => {
        if (!id || id.length < 16) return id;
        return `${id.substring(0, 8)}-${id.substring(8, 16)}-${id.substring(id.length - 8)}`;
    };

    // Format offer price for display
    const formatPrice = (price: number) => {
        return price.toFixed(3);
    };

    // Handle taking the offer
    const handleTakeOffer = useCallback(async () => {
        if (!dexieOfferData || !walletState.syntheticPublicKey || !selectedCoins.length) {
            setError('Missing required data to take offer');
            return;
        }

        try {
            // Set progress state to getting fresh coins
            setProgressState('getting-fresh-coins');
            setError(null);

            // Recalculate selection from fresh coins
            const freshCoins = (hydratedCoins || []).filter((coin) => {
                const driverInfo = coin.parentSpendInfo.driverInfo;
                return driverInfo?.type === 'CAT' && driverInfo.assetId === WUSDC_ASSET_ID;
            });

            let coinsToUse = selectedCoins.map((sc) => sc.coin);

            if (freshCoins.length) {
                // Map by parentCoinInfo for quick lookup
                const freshMap = new Set(freshCoins.map((c) => c.coin.parentCoinInfo));
                const stillUnspent = selectedCoins.filter((sc) => freshMap.has(sc.coin.coin.parentCoinInfo));

                if (stillUnspent.length !== selectedCoins.length) {
                    // Fallback: re-run greedy selection on fresh coins
                    const newlySelected: SelectedCoin[] = [];
                    let remaining = requiredWUSDC;

                    for (const c of freshCoins) {
                        if (remaining <= 0) break;
                        const amt = parseInt(c.coin.amount);
                        const use = Math.min(amt, remaining);
                        newlySelected.push({ coin: c, amount: use, displayName: '' });
                        remaining -= use;
                    }

                    coinsToUse = newlySelected.map((ns) => ns.coin);
                }
            }

            const coinIds = coinsToUse.map((c) => c.coinId).filter((id) => typeof id === 'string' && id.length > 0);

            if (!coinIds.length) {
                setError('No coinIds found for selected coins');
                return;
            }

            // Build the request body
            const requestBody = {
                offer_string: dexieOfferData.offer.offer,
                synthetic_public_key: walletState.syntheticPublicKey,
                xch_coins: [], // Empty for CAT-only offers
                cat_coins: coinIds,
                fee: 0,
            };

            // Set progress state to taking offer
            setProgressState('taking');

            // Use the existing takeOffer hook
            let result = await takeOffer(requestBody);

            if (
                !result.success &&
                ((result as any).error?.toLowerCase().includes('already been spent') ||
                    (result as any).error?.toLowerCase().includes('record not found'))
            ) {
                // Set progress state to retrying
                setProgressState('retrying');

                // Retry once with a fresh coin refresh and recomputed refs
                await refreshCoins();
                const latestFresh = (hydratedCoins || []).filter((c) => {
                    const di = c.parentSpendInfo.driverInfo;
                    return di?.type === 'CAT' && di.assetId === WUSDC_ASSET_ID;
                });
                const latestRefs = latestFresh.map((c) => c.coin.parentCoinInfo);
                const retryBody = { ...requestBody, cat_coins: latestRefs };

                result = await takeOffer(retryBody);
            }

            if (result.success) {
                setProgressState('idle');
                onOfferTaken?.({
                    transactionId: result.data.transaction_id,
                    status: result.data.status,
                    offerData: dexieOfferData,
                });
                onClose(); // Close the dialog on success
            } else {
                setProgressState('idle');
                setError((result as any).error || 'Failed to take offer');
            }
        } catch (err) {
            setProgressState('idle');
            const errorMessage = err instanceof Error ? err.message : 'Failed to take offer';
            setError(errorMessage);
        }
    }, [
        dexieOfferData,
        walletState.syntheticPublicKey,
        selectedCoins,
        takeOffer,
        onOfferTaken,
        refreshCoins,
        hydratedCoins,
        requiredWUSDC,
        onClose,
    ]);

    // Effects
    useEffect(() => {
        const runInitialization = async () => {
            if (!isOpen || !dexieOfferData) {
                // Reset initialization flag when dialog closes
                hasInitialized.current = false;
                currentOfferId.current = null;
                return;
            }

            // Reset initialization flag when opening with a new offer ID
            if (currentOfferId.current !== dexieOfferData.offer.id) {
                hasInitialized.current = false;
            }

            // Check if we've already initialized for this offer
            if (hasInitialized.current && currentOfferId.current === dexieOfferData.offer.id) {
                return;
            }

            if (isInitializing) return; // Prevent multiple simultaneous initializations

            setIsInitializing(true);
            setError(null);

            try {
                // Set JWT token first if available
                if (walletClient?.sdk && jwtToken) {
                    console.log('🔑 Setting JWT token on wallet client...');
                    await walletClient.sdk.setJwtToken(jwtToken);
                }

                // Connect wallet if not already connected
                if (!isConnected) {
                    console.log('🔄 Connecting wallet...');

                    // First try using the hook's connect method
                    try {
                        await connectWallet();
                    } catch (hookError) {
                        console.warn('Hook connect failed, trying wallet client connect...', hookError);

                        // Fallback: try connecting using wallet client directly
                        if (walletClient?.sdk) {
                            // Ensure JWT token is set before connecting
                            if (jwtToken) {
                                await walletClient.sdk.setJwtToken(jwtToken);
                            }
                            await walletClient.sdk.connect();
                        }
                    }

                    // Wait a bit for connection to establish
                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    // Verify connection was successful
                    const finalConnectionState = walletClient?.sdk?.walletState?.isConnected || false;
                    if (!finalConnectionState) {
                        throw new Error('Wallet connection failed - please try again');
                    }

                    console.log('✅ Wallet connected successfully');
                }

                // Refresh coins to ensure we have the latest data
                console.log('🔄 Refreshing coins...');
                await refreshCoins();

                // Wait a bit for coins to load
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Mark as initialized for this offer
                hasInitialized.current = true;
                currentOfferId.current = dexieOfferData.offer.id;

                console.log('✅ Wallet initialization completed');
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
                console.error('❌ Initialization error:', errorMessage);
                setError(errorMessage);
            } finally {
                setIsInitializing(false);
            }
        };

        runInitialization();
    }, [isOpen, dexieOfferData?.offer?.id, isConnected, jwtToken, walletClient, connectWallet, refreshCoins]);

    useEffect(() => {
        analyzeOffer();
    }, [analyzeOffer]);

    useEffect(() => {
        calculateBalance();
    }, [calculateBalance]);

    // Auto-refresh coins every 60 seconds while dialog is open
    useEffect(() => {
        if (!isOpen || !isConnected) return;

        const intervalId = setInterval(() => {
            console.log('🔄 Auto-refreshing coins (60s interval)...');
            refreshCoins();
        }, 60000); // 60 seconds

        return () => {
            clearInterval(intervalId);
        };
    }, [isOpen, isConnected, refreshCoins]);

    // Loading skeleton component
    const LoadingSkeleton: React.FC<{ width?: string; height?: string }> = ({
        width = '100%',
        height = '1rem'
    }) => (
        <div
            style={{
                width,
                height,
                backgroundColor: '#333',
                borderRadius: '4px',
                animation: 'pulse 2s infinite',
                opacity: 0.6,
            }}
        />
    );

    // Progress component with state indicators
    const ProgressIndicator: React.FC<{ state: TakeOfferProgressState }> = ({ state }) => {
        const getStateText = () => {
            switch (state) {
                case 'getting-fresh-coins':
                    return 'Getting fresh coins...';
                case 'taking':
                    return 'Taking offer...';
                case 'retrying':
                    return 'Retrying...';
                default:
                    return '';
            }
        };

        if (state === 'idle') return null;

        return (
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <div className="spinner"></div>
                    <span style={{ color: '#6bc36b', fontWeight: '500' }}>{getStateText()}</span>
                </div>
            </div>
        );
    };

    const isBalanceLoading = coinsLoading || !isConnected || isInitializing;
    const hasError = error || takeOfferError;
    const isProcessingOffer = progressState !== 'idle';

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                {/* Header */}
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
                    {/* Offer ID */}
                    <div className="card">
                        <div className="info-item">
                            <label>Offer ID</label>
                            <div className="info-value monospace">
                                {formatCoinId(dexieOfferData.offer.id)}
                            </div>
                        </div>
                    </div>

                    {/* Wallet Connection Status */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontWeight: '500', color: '#888' }}>Wallet Status:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: isConnected ? '#22c55e' : '#ef4444'
                                    }}
                                ></span>
                                <span style={{ color: 'white', fontSize: '14px' }}>
                                    {isInitializing ? 'Connecting...' : isConnected ? 'Connected' : 'Not Connected'}
                                </span>
                            </div>
                        </div>

                        {/* Debug info */}
                        <div style={{ fontSize: '12px', color: '#666', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>Hook Connected: {hookIsConnected ? 'Yes' : 'No'}</div>
                            <div>Client Connected: {walletClient?.sdk?.walletState?.isConnected ? 'Yes' : 'No'}</div>
                            <div>JWT Token: {jwtToken ? 'Available' : 'Missing'}</div>
                            <div>Has Coins: {hydratedCoins?.length || 0} coins</div>
                            <div>Coins Loading: {coinsLoading ? 'Yes' : 'No'}</div>
                        </div>

                        {/* Manual connect button if not connected */}
                        {!isConnected && !isInitializing && (
                            <div style={{ marginTop: '12px' }}>
                                <button
                                    className="btn btn-info"
                                    onClick={async () => {
                                        setIsInitializing(true);
                                        try {
                                            // Set JWT token first
                                            if (walletClient?.sdk && jwtToken) {
                                                console.log('🔑 Manual connect: Setting JWT token...');
                                                await walletClient.sdk.setJwtToken(jwtToken);
                                            }
                                            await connectWallet();
                                            await refreshCoins();
                                        } catch (err) {
                                            console.error('Manual connect failed:', err);
                                            setError('Failed to connect wallet manually');
                                        } finally {
                                            setIsInitializing(false);
                                        }
                                    }}
                                    disabled={isInitializing}
                                >
                                    Connect Wallet Manually
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Progress Display */}
                    <ProgressIndicator state={progressState} />

                    {/* Error Display */}
                    {hasError && (
                        <div className="error-message">
                            <span>⚠️</span>
                            <span>{hasError}</span>
                        </div>
                    )}

                    {/* Offer Details */}
                    <div className="card">
                        <h4 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                            Offer Details
                        </h4>

                        <div className="grid grid-2">
                            <div className="info-item">
                                <label>Offering:</label>
                                <div className="info-value">
                                    {dexieOfferData.offer.offered.map((asset, index) => (
                                        <div key={index}>
                                            {asset.amount} {asset.code} ({asset.name})
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="info-item">
                                <label>Requesting:</label>
                                <div className="info-value">
                                    {dexieOfferData.offer.requested.map((asset, index) => (
                                        <div key={index}>
                                            {asset.amount} {asset.code} ({asset.name})
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="info-item">
                                <label>Price:</label>
                                <div className="info-value">
                                    {formatPrice(dexieOfferData.offer.price)} wUSDC
                                </div>
                            </div>

                            <div className="info-item">
                                <label>Status:</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span
                                            className={`status-badge ${dexieOfferData.offer.status === 0 || dexieOfferData.offer.status === 1
                                                ? 'status-active'
                                                : dexieOfferData.offer.status === 2
                                                    ? 'status-completed'
                                                    : 'status-cancelled'
                                                }`}
                                        >
                                            {dexieOfferData.offer.status === 0
                                                ? 'Pending'
                                                : dexieOfferData.offer.status === 1
                                                    ? 'Active'
                                                    : dexieOfferData.offer.status === 2
                                                        ? 'Completed'
                                                        : dexieOfferData.offer.status === 3
                                                            ? 'Cancelled'
                                                            : 'Unknown'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        Created: {new Date(dexieOfferData.offer.date_found).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Balance Section */}
                    <div className="card">
                        <h4 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                            Your wUSDC Balance
                        </h4>

                        <div className="grid grid-2">
                            <div className="info-item">
                                <label>Required:</label>
                                <div className="info-value">
                                    {isBalanceLoading ? <LoadingSkeleton width="80px" /> : `${formatAmount(requiredWUSDC)} wUSDC`}
                                </div>
                            </div>

                            <div className="info-item">
                                <label>Available:</label>
                                <div className="info-value" style={{
                                    color: hasSufficientBalance ? '#22c55e' : '#ef4444'
                                }}>
                                    {isBalanceLoading ? <LoadingSkeleton width="80px" /> : `${formatAmount(availableWUSDC)} wUSDC`}
                                </div>
                            </div>
                        </div>

                        {!isBalanceLoading && !hasSufficientBalance && availableWUSDC > 0 && (
                            <div className="error-message">
                                <span>⚠️</span>
                                <span>You need {formatAmount(requiredWUSDC - availableWUSDC)} more wUSDC to take this offer.</span>
                            </div>
                        )}

                        {!isBalanceLoading && availableWUSDC === 0 && (
                            <div className="error-message">
                                <span>❌</span>
                                <span>You don't have any wUSDC tokens in your wallet.</span>
                            </div>
                        )}
                    </div>

                    {/* Selected Coins */}
                    {hasSufficientBalance && selectedCoins.length > 0 && (
                        <div className="card">
                            <h4 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                                Coins to Spend
                            </h4>

                            <div className="list">
                                {selectedCoins.map((coinInfo, index) => (
                                    <div key={index} className="list-item" style={{ cursor: 'default' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <span style={{ fontWeight: '500', color: 'white' }}>
                                                {formatAmount(coinInfo.amount)} wUSDC
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                                                from {formatCoinId(coinInfo.coin.coin.parentCoinInfo)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
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
                        disabled={isProcessingOffer}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleTakeOffer}
                        disabled={!hasSufficientBalance || isProcessingOffer || !isConnected || isInitializing}
                        className="btn btn-primary"
                    >
                        {progressState === 'getting-fresh-coins'
                            ? 'Getting Fresh Coins...'
                            : progressState === 'taking'
                                ? 'Taking Offer...'
                                : progressState === 'retrying'
                                    ? 'Retrying...'
                                    : isInitializing
                                        ? 'Connecting Wallet...'
                                        : !isConnected
                                            ? 'Wallet Not Connected'
                                            : !hasSufficientBalance
                                                ? 'Insufficient Balance'
                                                : 'Take Offer'}
                    </button>
                </div>
            </div>
        </div>
    );
};
