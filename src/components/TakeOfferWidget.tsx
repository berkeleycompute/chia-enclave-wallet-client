import React, { useState, useEffect, useCallback } from 'react';
import { useTakeOffer, useWalletCoins, useWalletConnection, useWalletState } from '../hooks/useChiaWalletSDK';
import type {
    TakeOfferWidgetProps,
    DexieOfferData,
    SelectedCoinInfo
} from './types';

// wUSDC asset ID constant (Base warp.green USDC)
const WUSDC_ASSET_ID = 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d';

export const TakeOfferWidget: React.FC<TakeOfferWidgetProps> = ({
    dexieOfferId,
    onOfferTaken,
    onError,
    className = '',
    style
}) => {
    // Hooks
    const { hydratedCoins, isLoading: coinsLoading, refresh: refreshCoins } = useWalletCoins();
    const { isConnected } = useWalletConnection();
    const walletState = useWalletState();
    const { takeOffer, isTakingOffer, error: takeOfferError } = useTakeOffer();

    // State
    const [dexieData, setDexieData] = useState<DexieOfferData | null>(null);
    const [loadingOffer, setLoadingOffer] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCoins, setSelectedCoins] = useState<SelectedCoinInfo[]>([]);
    const [requiredWUSDC, setRequiredWUSDC] = useState<number>(0);
    const [availableWUSDC, setAvailableWUSDC] = useState<number>(0);
    const [hasSufficientBalance, setHasSufficientBalance] = useState(false);
    const [lastCoinIds, setLastCoinIds] = useState<string[]>([]);

    console.log(hydratedCoins);

    // Fetch offer data from Dexie API
    const fetchOfferData = useCallback(async () => {
        if (!dexieOfferId) return;

        setLoadingOffer(true);
        setError(null);

        try {
            const response = await fetch(`https://api.dexie.space/v1/offers/${dexieOfferId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch offer: ${response.status} ${response.statusText}`);
            }

            const data: DexieOfferData = await response.json();

            if (!data.success) {
                throw new Error('Invalid offer data received from Dexie API');
            }

            setDexieData(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offer data';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setLoadingOffer(false);
        }
    }, [dexieOfferId, onError]);

    // Check if offer requires wUSDC and calculate requirements
    const analyzeOffer = useCallback(() => {
        if (!dexieData) return;

        // Check offer validity first
        const offer = dexieData.offer;

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
        const wusdcOutputs = dexieData.offer.output_coins[WUSDC_ASSET_ID];
        if (wusdcOutputs && wusdcOutputs.length > 0) {
            const totalRequiredMojos = wusdcOutputs.reduce((sum, c) => sum + c.amount, 0);
            setRequiredWUSDC(totalRequiredMojos);
            return;
        }

        // Fallback: if only requested array is present (assumed whole units), convert to mojos (1e3)
        const wusdcRequested = dexieData.offer.requested.find(asset => asset.id === WUSDC_ASSET_ID);
        if (wusdcRequested) {
            setRequiredWUSDC(Math.round(wusdcRequested.amount * 1000));
            return;
        }

        setError('This offer does not require wUSDC tokens. Only wUSDC offers are supported.');
    }, [dexieData]);

    // Calculate available wUSDC balance and select coins
    const calculateBalance = useCallback(() => {
        if (!hydratedCoins || requiredWUSDC === 0) return;

        // Filter for wUSDC coins
        const wusdcCoins = hydratedCoins.filter(coin => {
            const driverInfo = coin.parentSpendInfo.driverInfo;
            return driverInfo?.type === 'CAT' && driverInfo.assetId === WUSDC_ASSET_ID;
        });

        // Calculate total available balance
        const totalAvailable = wusdcCoins.reduce((sum, coin) =>
            sum + parseInt(coin.coin.amount), 0
        );
        setAvailableWUSDC(totalAvailable);

        try {
            console.log('[TakeOfferWidget] wUSDC coins (unspent)', wusdcCoins.map(c => ({
                coinId: c.coinId,
                amount_mojos: c.coin.amount
            })));
        } catch { }

        // Check if we have sufficient balance
        const sufficient = totalAvailable >= requiredWUSDC;
        setHasSufficientBalance(sufficient);

        if (sufficient) {
            // Select coins to cover the required amount
            const selected: SelectedCoinInfo[] = [];
            let remainingAmount = requiredWUSDC;

            for (const coin of wusdcCoins) {
                if (remainingAmount <= 0) break;

                const coinAmount = parseInt(coin.coin.amount);
                const amountToUse = Math.min(coinAmount, remainingAmount);

                selected.push({
                    coin,
                    amount: amountToUse,
                    displayName: `${formatAmount(amountToUse)} wUSDC from ${formatCoinId(coin.coin.parentCoinInfo)}`
                });

                remainingAmount -= amountToUse;
            }

            setSelectedCoins(selected);

            try {
                console.log('[TakeOfferWidget] Selected wUSDC coins', selected.map(sc => ({
                    coinId: (sc.coin as any).coinId,
                    amount_mojos: sc.coin.coin.amount,
                    using_mojos: sc.amount
                })));
            } catch { }
        } else {
            setSelectedCoins([]);
            try {
                console.log('[TakeOfferWidget] Insufficient wUSDC. totalAvailable_mojos=', totalAvailable, 'required_mojos=', requiredWUSDC);
            } catch { }
        }
    }, [hydratedCoins, requiredWUSDC]);

    // Format amount for display (CATs typically use 3 decimal places on-chain)
    const formatAmount = (mojos: number): string => {
        return (mojos / 1000).toFixed(6);
    };

    // Format coin ID for display (hyphenated)
    const formatCoinId = (id: string): string => {
        if (!id || id.length < 16) return id;
        return `${id.substring(0, 8)}-${id.substring(8, 16)}-${id.substring(id.length - 8)}`;
    };

    // Format offer price for display
    const formatPrice = (price: number): string => {
        return price.toFixed(6);
    };

    // Handle taking the offer
    const handleTakeOffer = useCallback(async () => {
        if (!dexieData || !walletState.syntheticPublicKey || !selectedCoins.length) {
            setError('Missing required data to take offer');
            return;
        }

        try {
         

            // Recalculate selection from fresh coins of this asset
            // (Reuse already selected ordering; fallback to current selection if still valid)
            const freshCoins = (hydratedCoins || []).filter(coin => {
                const driverInfo = coin.parentSpendInfo.driverInfo;
                return driverInfo?.type === 'CAT' && driverInfo.assetId === WUSDC_ASSET_ID;
            });
            let coinsToUse = selectedCoins.map(sc => sc.coin);
            try { console.log('[TakeOfferWidget] Fresh wUSDC coins before submit', freshCoins.map(c => ({ coinId: (c as any).coinId, amount_mojos: c.coin.amount }))); } catch { }
            if (freshCoins.length) {
                // Map by parentCoinInfo for quick lookup
                const freshMap = new Set(freshCoins.map(c => c.coin.parentCoinInfo));
                const stillUnspent = selectedCoins.filter(sc => freshMap.has(sc.coin.coin.parentCoinInfo));
                if (stillUnspent.length !== selectedCoins.length) {
                    // Fallback: re-run greedy selection on fresh coins
                    const newlySelected: typeof selectedCoins = [];
                    let remaining = requiredWUSDC;
                    for (const c of freshCoins) {
                        if (remaining <= 0) break;
                        const amt = parseInt(c.coin.amount);
                        const use = Math.min(amt, remaining);
                        newlySelected.push({ coin: c, amount: use, displayName: '' });
                        remaining -= use;
                    }
                    coinsToUse = newlySelected.map(ns => ns.coin);
                    try { console.log('[TakeOfferWidget] Re-selected coins due to staleness', coinsToUse.map(c => ({ coinId: (c as any).coinId, amount_mojos: c.coin.amount }))); } catch { }
                }
            }

            const coinIds = (coinsToUse as any[])
                .map((c: any) => c.coinId)
                .filter((id: any) => typeof id === 'string' && id.length > 0);

            if (!coinIds.length) {
                setError('No coinIds found for selected coins');
                return;
            }
            try { console.log('[TakeOfferWidget] Using coinIds for take', coinIds); } catch { }

            // Re-validate offer before taking it (in case status changed)
            console.log('Re-validating offer before taking...');
            const revalidationResponse = await fetch(`https://api.dexie.space/v1/offers/${dexieOfferId}`);

            if (!revalidationResponse.ok) {
                throw new Error('Failed to re-validate offer status');
            }

            const currentOfferData: DexieOfferData = await revalidationResponse.json();

            if (!currentOfferData.success) {
                throw new Error('Offer is no longer available');
            }

            // Check if offer status has changed
            if (currentOfferData.offer.status !== 0 && currentOfferData.offer.status !== 1) {
                let statusMessage = 'This offer is no longer valid.';
                if (currentOfferData.offer.status === 2) {
                    statusMessage = 'This offer was just completed by another user.';
                } else if (currentOfferData.offer.status === 3) {
                    statusMessage = 'This offer was just cancelled.';
                }
                throw new Error(statusMessage);
            }

            // Check if offer was completed while we were preparing
            if (currentOfferData.offer.date_completed) {
                throw new Error('This offer was just completed by another user.');
            }

            console.log('Offer re-validation passed. Proceeding with take offer...');

            // Build the request body as specified
            const requestBody = {
                offer_string: dexieData.offer.offer,
                synthetic_public_key: walletState.syntheticPublicKey!,
                xch_coins: [] as string[], // Empty array for CAT-only offers
                // Use coinIds exclusively as requested
                cat_coins: coinIds,
                fee: 0
            };

            console.log('requestBody', requestBody);

            setLastCoinIds(coinIds);

            console.log('Taking offer with request:', requestBody);

            // Use the existing takeOffer hook
            let result = await takeOffer(requestBody);
            if (!result.success && (result.error?.toLowerCase().includes('already been spent') || result.error?.toLowerCase().includes('record not found'))) {
                // Retry once with a fresh coin refresh and recomputed refs
                await refreshCoins();
                const latestFresh = (hydratedCoins || []).filter(c => {
                    const di = c.parentSpendInfo.driverInfo;
                    return di?.type === 'CAT' && di.assetId === WUSDC_ASSET_ID;
                });
                const latestRefs = latestFresh.map(c => c.coinId);
                const retryBody = { ...requestBody, cat_coins: latestRefs };
                console.warn('Retrying takeOffer with refreshed coins', retryBody);
                result = await takeOffer(retryBody);
            }

            if (result.success) {
                onOfferTaken?.({
                    transactionId: result.data.transaction_id,
                    status: result.data.status,
                    offerData: dexieData
                });
            } else {
                setError(result.error || 'Failed to take offer');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to take offer';
            setError(errorMessage);
        }
    }, [dexieData, walletState.syntheticPublicKey, selectedCoins, takeOffer, onOfferTaken, dexieOfferId, refreshCoins, hydratedCoins]);

    // Effects
    useEffect(() => {
        fetchOfferData();
    }, [fetchOfferData]);

    useEffect(() => {
        analyzeOffer();
    }, [analyzeOffer]);

    useEffect(() => {
        calculateBalance();
    }, [calculateBalance]);

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
                opacity: 0.6
            }}
        />
    );

    const isOfferLoading = loadingOffer;
    const isBalanceLoading = coinsLoading || !isConnected;
    const hasError = error || takeOfferError;

    return (
        <>
            <div
                className={`take-offer-widget ${className}`}
                style={style}
            >
                <div className="widget-header">
                    <h3>Take Offer</h3>
                    <div className="offer-id">
                        {isOfferLoading ? (
                            <LoadingSkeleton width="200px" />
                        ) : (
                            `Offer ID: ${formatCoinId(dexieOfferId)}`
                        )}
                    </div>
                </div>

                {hasError && (
                    <div className="error-message">
                        <span>⚠️</span>
                        <span>{hasError}</span>
                    </div>
                )}

                <div className="offer-details">
                    <div className="detail-row">
                        <label>Offering:</label>
                        <div className="detail-value">
                            {isOfferLoading ? (
                                <LoadingSkeleton width="150px" />
                            ) : dexieData ? (
                                dexieData.offer.offered.map((asset, index) => (
                                    <span key={index}>
                                        {asset.amount} {asset.code} ({asset.name})
                                    </span>
                                ))
                            ) : (
                                'N/A'
                            )}
                        </div>
                    </div>

                    <div className="detail-row">
                        <label>Requesting:</label>
                        <div className="detail-value">
                            {isOfferLoading ? (
                                <LoadingSkeleton width="150px" />
                            ) : dexieData ? (
                                dexieData.offer.requested.map((asset, index) => (
                                    <span key={index}>
                                        {asset.amount} {asset.code} ({asset.name})
                                    </span>
                                ))
                            ) : (
                                'N/A'
                            )}
                        </div>
                    </div>

                    <div className="detail-row">
                        <label>Price:</label>
                        <div className="detail-value">
                            {isOfferLoading ? (
                                <LoadingSkeleton width="100px" />
                            ) : dexieData ? (
                                `${formatPrice(dexieData.offer.price)} wUSDC`
                            ) : (
                                'N/A'
                            )}
                        </div>
                    </div>

                    <div className="detail-row">
                        <label>Status:</label>
                        <div className="detail-value">
                            {isOfferLoading ? (
                                <LoadingSkeleton width="120px" />
                            ) : dexieData ? (
                                <div className="offer-status">
                                    <span className={`status-indicator ${(dexieData.offer.status === 0 || dexieData.offer.status === 1) ? 'active' : 'inactive'}`}>
                                        {dexieData.offer.status === 0 ? '🟡 Pending' :
                                            dexieData.offer.status === 1 ? '🟢 Active' :
                                                dexieData.offer.status === 2 ? '🔴 Completed' :
                                                    dexieData.offer.status === 3 ? '🟡 Cancelled' : '❓ Unknown'}
                                    </span>
                                    <div className="offer-age">
                                        Created: {new Date(dexieData.offer.date_found).toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                'N/A'
                            )}
                        </div>
                    </div>
                </div>

                <div className="balance-section">
                    <h4>Your wUSDC Balance</h4>

                    <div className="balance-info">
                        <div className="balance-row">
                            <span>Required:</span>
                            <span>
                                {isBalanceLoading ? (
                                    <LoadingSkeleton width="80px" />
                                ) : (
                                    `${formatAmount(requiredWUSDC)} wUSDC`
                                )}
                            </span>
                        </div>

                        <div className="balance-row">
                            <span>Available:</span>
                            <span className={hasSufficientBalance ? 'sufficient' : 'insufficient'}>
                                {isBalanceLoading ? (
                                    <LoadingSkeleton width="80px" />
                                ) : (
                                    `${formatAmount(availableWUSDC)} wUSDC`
                                )}
                            </span>
                        </div>
                    </div>

                    {!isBalanceLoading && !hasSufficientBalance && availableWUSDC > 0 && (
                        <div className="insufficient-notice">
                            You need {formatAmount(requiredWUSDC - availableWUSDC)} more wUSDC to take this offer.
                        </div>
                    )}

                    {!isBalanceLoading && availableWUSDC === 0 && (
                        <div className="no-balance-notice">
                            You don't have any wUSDC tokens in your wallet.
                        </div>
                    )}
                </div>

                {!isOfferLoading && hasSufficientBalance && selectedCoins.length > 0 && (
                    <div className="selected-coins">
                        <h4>Coins to Spend</h4>
                        <div className="coins-list">
                            {selectedCoins.map((coinInfo, index) => (
                                <div key={index} className="coin-item">
                                    <span className="coin-amount">{formatAmount(coinInfo.amount)} wUSDC</span>
                                    <span className="coin-id">from {formatCoinId(coinInfo.coin.coin.parentCoinInfo)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="action-section">
                    <button
                        className="take-offer-btn"
                        disabled={isOfferLoading || !hasSufficientBalance || isTakingOffer || !isConnected}
                        onClick={handleTakeOffer}
                    >
                        {isTakingOffer ? (
                            <>
                                <LoadingSkeleton width="20px" height="20px" />
                                <span>Taking Offer...</span>
                            </>
                        ) : isOfferLoading ? (
                            'Loading...'
                        ) : !isConnected ? (
                            'Connect Wallet'
                        ) : !hasSufficientBalance ? (
                            'Insufficient Balance'
                        ) : (
                            'Take Offer'
                        )}
                    </button>
                </div>

                {/* Debug section */}
                <div className="debug-section">
                    <h4>Debug</h4>
                    <pre className="debug-pre">{JSON.stringify({
                        request_body: {
                            offer_string: dexieData?.offer.offer,
                            synthetic_public_key: walletState?.syntheticPublicKey || null,
                            xch_coins: '',
                            cat_coins: (selectedCoins && selectedCoins.length ? '(coinIds) ' + ((selectedCoins.map(sc => (sc.coin as any).coinId)).filter(Boolean).join(',')) : ''),
                            fee: 0
                        },
                        derived: {
                            required_wusdc_mojos: requiredWUSDC,
                            required_wusdc_display: formatAmount(requiredWUSDC),
                            available_wusdc_mojos: availableWUSDC,
                            available_wusdc_display: formatAmount(availableWUSDC),
                            has_sufficient_balance: hasSufficientBalance
                        }
                    }, null, 2)}</pre>
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        .take-offer-widget {
          background: #1a1a1a;
          border-radius: 16px;
          border: 1px solid #333;
          padding: 20px;
          color: white;
          max-width: 500px;
          margin: 0 auto;
        }

        .widget-header {
          margin-bottom: 20px;
          text-align: center;
        }

        .widget-header h3 {
          margin: 0 0 8px 0;
          color: white;
          font-size: 20px;
          font-weight: 600;
        }

        .offer-id {
          color: #888;
          font-size: 14px;
          font-family: monospace;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .offer-details {
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-row label {
          color: #888;
          font-size: 14px;
          font-weight: 500;
        }

        .detail-value {
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-align: right;
        }

        .balance-section {
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .balance-section h4 {
          margin: 0 0 12px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .balance-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .balance-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .balance-row span:first-child {
          color: #888;
          font-size: 14px;
        }

        .balance-row span:last-child {
          font-size: 14px;
          font-weight: 600;
        }

        .sufficient {
          color: #22c55e;
        }

        .insufficient {
          color: #ef4444;
        }

        .insufficient-notice,
        .no-balance-notice {
          margin-top: 12px;
          padding: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #ef4444;
          font-size: 13px;
        }

        .selected-coins {
          background: #262626;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .selected-coins h4 {
          margin: 0 0 12px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .coins-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .coin-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #333;
          border-radius: 6px;
        }

        .coin-amount {
          color: #22c55e;
          font-weight: 600;
          font-size: 14px;
        }

        .coin-id {
          color: #888;
          font-size: 12px;
          font-family: monospace;
        }

        .action-section {
          text-align: center;
        }

        .take-offer-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: #6bc36b;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .take-offer-btn:hover:not(:disabled) {
          background: #4a9f4a;
          transform: translateY(-1px);
        }

        .take-offer-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          background: #666;
        }

        .offer-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #888;
        }

        .status-indicator {
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 13px;
        }

        .active {
            background-color: #22c55e;
            color: white;
        }

        .inactive {
            background-color: #ef4444;
            color: white;
        }

        .offer-age {
            font-size: 12px;
            color: #888;
        }

        .debug-section {
          margin-top: 16px;
          background: #111;
          border: 1px dashed #444;
          border-radius: 8px;
          padding: 12px;
        }

        .debug-section h4 {
          margin: 0 0 8px 0;
          color: #bbb;
          font-size: 14px;
        }

        .debug-pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          color: #bbb;
        }

        @media (max-width: 480px) {
          .take-offer-widget {
            padding: 16px;
            margin: 0 16px;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .detail-value {
            text-align: left;
          }

          .coin-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
        </>
    );
}; 