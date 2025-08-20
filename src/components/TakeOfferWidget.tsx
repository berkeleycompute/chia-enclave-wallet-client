import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
    useWalletCoins,
    useWalletConnection,
    useWalletState,
    useTakeOffer,
    useUnifiedWalletClient,
} from '../hooks/useChiaWalletSDK';
import { useNFTMetadata } from '../hooks/useNFTs';
import { type HydratedCoin } from '../client/ChiaCloudWalletClient';
import { type NFTMetadata, type DexieOfferData, type DexieOfferResult, type TakeOfferWidgetProps } from './types';
import { injectModalStyles } from './modal-styles';

// wUSDC asset ID constant
const WUSDC_ASSET_ID = 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d';

// Widget state types
type WidgetState = 'initial' | 'loading' | 'connection-error' | 'transaction-details';

interface SelectedCoin {
    coin: HydratedCoin;
    amount: number;
    displayName: string;
}

export const TakeOfferWidget: React.FC<TakeOfferWidgetProps> = ({
    isOpen,
    onClose,
    dexieOfferData,
    onOfferTaken,
    onError,
    jwtToken,
    nftMetadata: providedMetadata,
    imageUrl: providedImageUrl
}) => {
    // Wallet hooks
    const { hydratedCoins, isLoading: coinsLoading, refresh: refreshCoins } = useWalletCoins();
    const { isConnected: hookIsConnected, connect: connectWallet } = useWalletConnection();
    const walletState = useWalletState();
    const { takeOffer, error: takeOfferError } = useTakeOffer();
    const walletClient = useUnifiedWalletClient();

    // Extract metadata URI from Dexie offer data
    const metadataUri = useMemo(() => {
        if (providedMetadata) return null; // Don't fetch if metadata is provided

        // Extract metadata URI from Dexie offer data (nft_data.metadata_uris)
        const nftOffered = dexieOfferData.offer.offered.find(item => item.is_nft);
        const metadataUri = nftOffered?.nft_data?.metadata_uris?.[0];

        console.log('🔗 Metadata URI Debug:', {
            nftOffered,
            hasNftData: !!nftOffered?.nft_data,
            metadataUris: nftOffered?.nft_data?.metadata_uris,
            extractedUri: metadataUri
        });

        if (metadataUri) {
            console.log('🌐 Metadata fetch will be attempted with CORS fallback mechanisms');
        }

        return metadataUri || null;
    }, [providedMetadata, dexieOfferData]);

    // Use the existing metadata hook
    const { metadata: fetchedMetadata, loading: metadataLoading, error: metadataError } = useNFTMetadata(metadataUri || undefined);

    // Use provided metadata or fetched metadata
    const nftMetadata = providedMetadata || fetchedMetadata;

    // Use the actual wallet client connection state (more reliable)
    const isConnected = walletClient?.sdk?.walletState?.isConnected || false;

    // Widget state management
    const [widgetState, setWidgetState] = useState<WidgetState>('initial');
    const [error, setError] = useState<string | null>(null);
    const [selectedCoins, setSelectedCoins] = useState<SelectedCoin[]>([]);
    const [requiredWUSDC, setRequiredWUSDC] = useState(0);
    const [availableWUSDC, setAvailableWUSDC] = useState(0);
    const [hasSufficientBalance, setHasSufficientBalance] = useState(false);
    const [balanceExpanded, setBalanceExpanded] = useState(false);
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

    // IPFS URL conversion utility (from existing components)
    const convertIpfsUrl = useCallback((url: string): string => {
        if (!url) return url;

        if (url.startsWith('ipfs://')) {
            const hash = url.replace('ipfs://', '');
            return `https://ipfs.io/ipfs/${hash}`;
        }

        if (!url.startsWith('http') && url.length > 40) {
            return `https://ipfs.io/ipfs/${url}`;
        }

        return url;
    }, []);

    // Get NFT image URL
    const getNftImageUrl = useCallback((): string | null => {
        console.log('🖼️ NFT Image Debug:', {
            providedImageUrl,
            nftOffered: dexieOfferData.offer.offered.find(item => item.is_nft),
            hasNftData: !!dexieOfferData.offer.offered.find(item => item.is_nft)?.nft_data,
            dataUris: dexieOfferData.offer.offered.find(item => item.is_nft)?.nft_data?.data_uris,
            metadataUris: dexieOfferData.offer.offered.find(item => item.is_nft)?.nft_data?.metadata_uris,
            nftMetadata,
            providedMetadata,
            metadataLoading,
            metadataError
        });

        // First priority: Use provided imageUrl prop if available
        if (providedImageUrl) {
            const convertedUrl = convertIpfsUrl(providedImageUrl);
            console.log('✅ Using provided imageUrl prop:', convertedUrl);
            return convertedUrl;
        }

        // Second priority: Get image from Dexie offer data (nft_data.data_uris)
        const nftOffered = dexieOfferData.offer.offered.find(item => item.is_nft);
        if (nftOffered?.nft_data?.data_uris?.[0]) {
            const imageUrl = convertIpfsUrl(nftOffered.nft_data.data_uris[0]);
            console.log('✅ Using Dexie NFT data image:', imageUrl);
            return imageUrl;
        }

        // Third priority: Fallback to provided metadata if available
        if (nftMetadata) {
            const imageUrl = (nftMetadata as any).image ||
                nftMetadata.data_uris?.[0] ||
                (nftMetadata as any).dataUris?.[0];

            if (imageUrl) {
                const convertedUrl = convertIpfsUrl(imageUrl);
                console.log('✅ Using provided metadata image:', convertedUrl);
                return convertedUrl;
            }
        }

        console.log('❌ No image URL found');
        return null;
    }, [providedImageUrl, dexieOfferData, nftMetadata, convertIpfsUrl, providedMetadata, metadataLoading, metadataError]);

    // Get NFT display name
    const getNftDisplayName = useCallback((): string => {
        return nftMetadata?.name ||
            dexieOfferData.offer.offered.find(item => item.is_nft)?.name ||
            'Unknown NFT';
    }, [nftMetadata, dexieOfferData]);

    // Get GPU title from metadata (Provider Manufacturer Model)
    const getGpuTitle = useCallback((): string => {
        if (!nftMetadata?.attributes) {
            console.log('🏷️ No metadata attributes available, using fallback name');
            return getNftDisplayName();
        }

        console.log('🏷️ NFT Metadata:', nftMetadata);

        const providerName = nftMetadata.attributes.find(attr => attr.trait_type === 'provider_name')?.value || '';
        const manufacturer = nftMetadata.attributes.find(attr => attr.trait_type === 'manufacturer')?.value || '';
        const model = nftMetadata.attributes.find(attr => attr.trait_type === 'gpu_type')?.value || '';
        const seriesNumber = nftMetadata.series_number || '';

        console.log('🏷️ GPU Title Debug:', {
            providerName,
            manufacturer,
            model,
            attributes: nftMetadata.attributes
        });

        if (providerName && manufacturer && model && seriesNumber) {
            const title = `#${seriesNumber} | ${providerName} ${manufacturer} ${model}`;
            console.log('✅ Using GPU title:', title);
            return title;
        }

        console.log('❌ Missing GPU metadata, using fallback name');
        return getNftDisplayName();
    }, [nftMetadata, getNftDisplayName]);

    // Get GPU location description
    const getGpuLocationDescription = useCallback((): string => {
        if (!nftMetadata?.attributes) {
            return '';
        }

        const providerName = nftMetadata.attributes.find(attr => attr.trait_type === 'provider_name')?.value || '';
        const location = nftMetadata.attributes.find(attr => attr.trait_type === 'location')?.value || '';
        const locationCountry = nftMetadata.attributes.find(attr => attr.trait_type === 'location_country')?.value || '';

        if (providerName && location && locationCountry) {
            return `A GPU in the ${providerName} ${location}, ${locationCountry} datacenter`;
        }

        return '';
    }, [nftMetadata]);

    // Format price using Intl.NumberFormat for USD
    const formatPriceUSD = useCallback((price: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
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

    // Handle buy now button click
    const handleBuyNow = useCallback(async () => {
        setWidgetState('loading');
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

                try {
                    await connectWallet();
                } catch (hookError) {
                    console.warn('Hook connect failed, trying wallet client connect...', hookError);

                    // Fallback: try connecting using wallet client directly
                    if (walletClient?.sdk) {
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
                    throw new Error('Wallet connection failed');
                }

                console.log('✅ Wallet connected successfully');
            }

            // Refresh coins to ensure we have the latest data
            console.log('🔄 Refreshing coins...');
            await refreshCoins();
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Move to transaction details state
            setWidgetState('transaction-details');

        } catch (err) {
            console.error('❌ Connection error:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect wallet');
            setWidgetState('connection-error');
        }
    }, [isConnected, jwtToken, walletClient, connectWallet, refreshCoins]);

    // Handle taking the offer (from transaction details view)
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

    // Handle retry connection
    const handleRetryConnection = useCallback(() => {
        setError(null);
        handleBuyNow();
    }, [handleBuyNow]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setWidgetState('initial');
            setError(null);
            setBalanceExpanded(false);
            hasInitialized.current = false;
            currentOfferId.current = null;
        } else if (dexieOfferData && currentOfferId.current !== dexieOfferData.offer.id) {
            setWidgetState('initial');
            setError(null);
            setBalanceExpanded(false);
            hasInitialized.current = false;
            currentOfferId.current = dexieOfferData.offer.id;
        }
    }, [isOpen, dexieOfferData?.offer?.id]);

    // Analyze offer when in transaction details state
    useEffect(() => {
        if (widgetState === 'transaction-details') {
            analyzeOffer();
        }
    }, [widgetState, analyzeOffer]);

    // Calculate balance when in transaction details state
    useEffect(() => {
        if (widgetState === 'transaction-details') {
            calculateBalance();
        }
    }, [widgetState, calculateBalance]);

    // Auto-refresh coins every 60 seconds while in transaction details
    useEffect(() => {
        if (widgetState !== 'transaction-details' || !isConnected) return;

        const intervalId = setInterval(() => {
            console.log('🔄 Auto-refreshing coins (60s interval)...');
            refreshCoins();
        }, 60000); // 60 seconds

        return () => {
            clearInterval(intervalId);
        };
    }, [widgetState, isConnected, refreshCoins]);

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

    const isBalanceLoading = coinsLoading || !isConnected;
    const hasError = error || takeOfferError;
    const isProcessingOffer = progressState !== 'idle';
    const imageUrl = getNftImageUrl();
    const gpuTitle = getGpuTitle();
    const locationDescription = getGpuLocationDescription();
    const priceUSD = formatPriceUSD(dexieOfferData.offer.price);

    if (!isOpen) return null;

    // Initial card state
    if (widgetState === 'initial') {
        return (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-content" style={{ maxWidth: '400px', width: '90%', padding: 0 }}>
                    {/* NFT Image - dynamic aspect ratio */}
                    <div style={{
                        position: 'relative',
                        borderRadius: '16px 16px 0 0',
                        overflow: 'hidden',
                        background: '#333',
                        minHeight: '200px', // Minimum height for loading/error states
                        maxHeight: '500px'  // Maximum height to prevent overly tall images
                    }}>
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={gpuTitle}
                                style={{
                                    width: '100%',
                                    height: 'auto', // Let height adjust to maintain aspect ratio
                                    display: 'block',
                                    maxHeight: '500px', // Consistent with container max-height
                                    objectFit: 'contain' // Changed from 'cover' to 'contain' to show full image
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                        parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 200px; font-size: 64px; color: #666;">🖼️</div>';
                                    }
                                }}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '200px', // Fixed height for placeholder
                                fontSize: '64px',
                                color: '#666'
                            }}>
                                🖼️
                            </div>
                        )}

                        {/* Close button overlay */}
                        <button
                            className="close-btn"
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(0, 0, 0, 0.5)',
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* GPU Info and Buy Button */}
                    <div style={{ padding: '24px' }}>
                        {/* GPU Title: Provider Manufacturer Model */}
                        <h3 style={{
                            margin: '0 0 8px 0',
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: '600',
                            lineHeight: '1.3'
                        }}>
                            {gpuTitle}
                        </h3>

                        {/* Location Description */}
                        {locationDescription && (
                            <div style={{
                                color: '#888',
                                fontSize: '14px',
                                marginBottom: '16px',
                                lineHeight: '1.4'
                            }}>
                                {locationDescription}
                            </div>
                        )}

                        {/* Price Section */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                            padding: '12px 0',
                            borderTop: '1px solid #333',
                            borderBottom: '1px solid #333'
                        }}>
                            <span style={{
                                color: '#888',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                Price
                            </span>
                            <span style={{
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600'
                            }}>
                                {priceUSD} wUSDC
                            </span>
                        </div>

                        {/* Buy Button */}
                        <button
                            onClick={handleBuyNow}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: '#000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                (e.target as HTMLButtonElement).style.background = '#222';
                            }}
                            onMouseLeave={(e) => {
                                (e.target as HTMLButtonElement).style.background = '#000';
                            }}
                        >
                            Buy now
                            <span style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                background: 'white'
                            }}></span>
                            {priceUSD}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (widgetState === 'loading') {
        return (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p style={{ color: '#888', margin: '0' }}>Connecting to wallet...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Connection error state
    if (widgetState === 'connection-error') {
        return (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
                    <div className="modal-header">
                        <h3>Connection Error</h3>
                        <button className="close-btn" onClick={onClose}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="error-state">
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                            <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>Unable to connect to Chia wallet</h4>
                            <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '14px' }}>
                                {error || 'Please make sure your wallet is running and try again.'}
                            </p>
                            <button
                                onClick={handleRetryConnection}
                                className="btn btn-primary"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Transaction details state
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                {/* Header */}
                <div className="modal-header">
                    <button className="back-btn" onClick={() => setWidgetState('initial')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                    <h3>Transaction Details</h3>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    {/* GPU/NFT Info */}
                    <div className="card">
                        <h4 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                            GPU Details
                        </h4>

                        <div className="grid grid-2">
                            <div className="info-item">
                                <label>Name:</label>
                                <div className="info-value description">
                                    {gpuTitle}
                                </div>
                            </div>

                            <div className="info-item">
                                <label>Price:</label>
                                <div className="info-value">
                                    {} wUSDC
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Addresses */}
                    <div className="card">
                        <h4 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                            Wallet Information
                        </h4>

                        <div className="grid grid-2">
                            <div className="info-item">
                                <label>Your Wallet:</label>
                                <div className="info-value monospace">
                                    {walletState.address ? formatCoinId(walletState.address) : 'Loading...'}
                                </div>
                            </div>

                            <div className="info-item">
                                <label>Seller Address:</label>
                                <div className="info-value monospace">
                                    {/* Extract seller address from offer data if available */}
                                    {'Unknown'}
                                </div>
                            </div>
                        </div>
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

                    {/* NFT Metadata Section */}
                    {nftMetadata && (
                        <div className="card">
                            <h4 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                                NFT Details
                            </h4>

                            <div className="grid grid-2">
                                <div className="info-item">
                                    <label>Name:</label>
                                    <div className="info-value description">
                                        {nftMetadata.name || 'Unnamed NFT'}
                                    </div>
                                </div>

                                <div className="info-item">
                                    <label>Collection:</label>
                                    <div className="info-value description">
                                        {nftMetadata.collection?.name || 'Unknown Collection'}
                                    </div>
                                </div>

                                {nftMetadata.description && (
                                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                        <label>Description:</label>
                                        <div className="info-value description">
                                            {nftMetadata.description}
                                        </div>
                                    </div>
                                )}

                                {nftMetadata.series_number && (
                                    <div className="info-item">
                                        <label>Edition:</label>
                                        <div className="info-value">
                                            #{nftMetadata.series_number}
                                            {nftMetadata.series_total && ` of ${nftMetadata.series_total}`}
                                        </div>
                                    </div>
                                )}
                                {/* Provider Name */}
                                {nftMetadata.attributes?.find(attr => attr.trait_type === 'provider_name') && (
                                    <div className="info-item">
                                        <label>Provider:</label>
                                        <div className="info-value">
                                            {nftMetadata.attributes.find(attr => attr.trait_type === 'provider_name')?.value}
                                        </div>
                                    </div>
                                )}

                                {/* GPU UUID */}
                                {nftMetadata.attributes?.find(attr => attr.trait_type === 'gpu_uuid') && (
                                    <div className="info-item">
                                        <label>GPU UUID:</label>
                                        <div className="info-value monospace">
                                            {nftMetadata.attributes.find(attr => attr.trait_type === 'gpu_uuid')?.value}
                                        </div>
                                    </div>
                                )}

                                {nftMetadata.attributes && nftMetadata.attributes.length > 0 && (
                                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                        <label>Key Attributes:</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '8px' }}>
                                            {nftMetadata.attributes.slice(0, 6).map((attr, index) => (
                                                <div key={index} className="attribute-item">
                                                    <div className="attribute-name">{attr.trait_type}</div>
                                                    <div className="attribute-value">{attr.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {metadataLoading && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                    <div className="spinner" style={{ margin: '0 auto 8px' }}></div>
                                    Loading NFT metadata...
                                </div>
                            )}

                            {metadataError && (
                                <div className="error-message">
                                    <span>⚠️</span>
                                    <span>Failed to load NFT metadata: {metadataError}</span>
                                </div>
                            )}
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
                                            {asset.is_nft && nftMetadata && (
                                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                                    {nftMetadata.name}
                                                </div>
                                            )}
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
                                    {priceUSD} wUSDC
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

                    {/* Balance Section with Expandable Details */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: '0', color: 'white', fontSize: '16px', fontWeight: '600' }}>
                                Your Wallet Balance
                            </h4>

                            {!isBalanceLoading && hasSufficientBalance && selectedCoins.length > 0 && (
                                <button
                                    onClick={() => setBalanceExpanded(!balanceExpanded)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#888',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '12px'
                                    }}
                                >
                                    <span>{balanceExpanded ? 'Hide' : 'Show'} coins</span>
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        style={{
                                            transform: balanceExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s'
                                        }}
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </button>
                            )}
                        </div>

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

                        {/* Expandable coin details */}
                        {balanceExpanded && !isBalanceLoading && hasSufficientBalance && selectedCoins.length > 0 && (
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #333' }}>
                                <h5 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '14px', fontWeight: '500' }}>
                                    Selected Coins ({selectedCoins.length})
                                </h5>

                                <div className="list">
                                    {selectedCoins.map((coinInfo, index) => (
                                        <div key={index} className="list-item" style={{ cursor: 'default', padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <span style={{ fontWeight: '500', color: 'white', fontSize: '14px' }}>
                                                    {formatAmount(coinInfo.amount)} wUSDC
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                                                    {/* Use actual coin ID instead of parent coin info */}
                                                    {formatCoinId(coinInfo.coin.coinId || coinInfo.coin.coin.parentCoinInfo)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '16px',
                    borderTop: '1px solid #333'
                }}>
                    <button
                        type="button"
                        onClick={() => setWidgetState('initial')}
                        disabled={isProcessingOffer}
                        className="btn btn-secondary"
                    >
                        Back
                    </button>

                    <button
                        type="button"
                        onClick={handleTakeOffer}
                        disabled={!hasSufficientBalance || isProcessingOffer || !isConnected}
                        className="btn btn-primary"
                    >
                        {progressState === 'getting-fresh-coins'
                            ? 'Getting Fresh Coins...'
                            : progressState === 'taking'
                                ? 'Taking Offer...'
                                : progressState === 'retrying'
                                    ? 'Retrying...'
                                    : !isConnected
                                        ? 'Wallet Not Connected'
                                        : !hasSufficientBalance
                                            ? 'Insufficient Balance'
                                            : 'Complete Purchase'}
                    </button>
                </div>
            </div>
        </div>
    );
};
