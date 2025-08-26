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
type WidgetState = 'initial' | 'loading' | 'connection-error' | 'transaction-details' | 'transaction-success' | 'transaction-error' | 'offer-invalid';

interface SelectedCoin {
    coin: HydratedCoin;
    amount: number;
    displayName: string;
}

export const TakeOfferWidget: React.FC<TakeOfferWidgetProps> = ({
    onClose,
    dexieOfferData,
    onTakeOfferSuccess,
    onTakeOfferError,
    nftMetadata: providedMetadata,
    imageUrl: providedImageUrl
}) => {
    // Wallet hooks
    const { hydratedCoins, isLoading: coinsLoading, refresh: refreshCoins } = useWalletCoins();
    const { isConnected: hookIsConnected, connect: connectWallet, jwtToken } = useWalletConnection();
    const walletState = useWalletState();
    const { takeOffer, error: takeOfferError } = useTakeOffer();
    const walletClient = useUnifiedWalletClient();

    console.log('🔍 Dexie Offer Data:', dexieOfferData);

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
    type TakeOfferProgressState = 'idle' | 'taking';
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

    const providerName = nftMetadata?.attributes?.find(attr => attr.trait_type === 'provider_name')?.value || '';
    const manufacturer = nftMetadata?.attributes?.find(attr => attr.trait_type === 'manufacturer')?.value || '';
    const model = nftMetadata?.attributes?.find(attr => attr.trait_type === 'gpu_type')?.value || '';
    const seriesNumber = typeof nftMetadata?.series_number === 'number' ? nftMetadata.series_number - 1 : '';

    // Get GPU title from metadata (Provider Manufacturer Model)
    const getGpuTitle = useCallback((): string => {
        if (!nftMetadata?.attributes) {
            console.log('🏷️ No metadata attributes available, using fallback name');
            return getNftDisplayName();
        }

        console.log('🏷️ NFT Metadata:', nftMetadata);

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

    // Format price using Intl.NumberFormat for wUSDC
    const formatPriceWUSDC = useCallback((price: number): string => {
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
                    displayName: `${formatPriceWUSDC(amountToUse / 1000)} from ${formatCoinId(coin.coin.parentCoinInfo)}`,
                });

                remainingAmount -= amountToUse;
            }

            setSelectedCoins(selected);
        } else {
            setSelectedCoins([]);
        }
    }, [hydratedCoins, requiredWUSDC]);



    // Format coin ID for display (hyphenated)
    const formatCoinId = (id: string) => {
        if (!id || id.length < 16) return id;
        return `${id.substring(0, 8)}-${id.substring(8, 16)}-${id.substring(id.length - 8)}`;
    };

    // Format coin ID for middle hyphenation (8-4 pattern with ellipsis)
    const formatCoinIdMiddle = (id: string) => {
        if (!id || id.length < 12) return id;
        return `${id.substring(0, 7)}...${id.substring(8, 12)}`;
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
        if (!dexieOfferData || !walletState?.syntheticPublicKey || !selectedCoins?.length) {
            setError('Missing required data to take offer');
            return;
        }

        try {
            setProgressState('taking');
            setError(null);

            // Use the exact coins that were shown to the user
            const coinIds = selectedCoins.map((sc) => sc.coin.coinId).filter((id) => typeof id === 'string' && id?.length > 0);

            if (!coinIds?.length) {
                throw new Error('No coin IDs found for selected coins');
            }

            // Build the request body with the exact coins shown to user
            const requestBody = {
                offer_string: dexieOfferData.offer.offer,
                synthetic_public_key: walletState.syntheticPublicKey,
                xch_coins: [], // Empty for CAT-only offers
                cat_coins: coinIds,
                fee: 0,
            };

            console.log('💰 Taking offer with selected coins:', {
                coinIds,
                selectedCoins: selectedCoins.map(sc => ({
                    coinId: sc.coin.coinId,
                    amount: sc.amount
                }))
            });

            // Execute the transaction with no retries
            const result = await takeOffer(requestBody);

            if (result.success) {
                setProgressState('idle');
                setWidgetState('transaction-success');
                onTakeOfferSuccess?.({
                    transactionId: result.data.transaction_id,
                    status: result.data.status,
                    offerData: dexieOfferData,
                });
            } else {
                setProgressState('idle');
                const errorMessage = (result as any).error || 'Failed to take offer';
                setError(errorMessage);
                setWidgetState('transaction-error');
                onTakeOfferError?.(errorMessage);
            }
        } catch (err) {
            setProgressState('idle');
            const errorMessage = err instanceof Error ? err.message : 'Failed to take offer';
            setError(errorMessage);
            setWidgetState('transaction-error');
            onTakeOfferError?.(errorMessage);
        }
    }, [
        dexieOfferData,
        walletState.syntheticPublicKey,
        selectedCoins,
        takeOffer,
        onTakeOfferSuccess,
        onTakeOfferError,
        refreshCoins,
        hydratedCoins,
        requiredWUSDC,
    ]);

    // Handle retry connection
    const handleRetryConnection = useCallback(() => {
        setError(null);
        handleBuyNow();
    }, [handleBuyNow]);

    // Validate offer status and reset state when offer data changes
    useEffect(() => {
        if (dexieOfferData && currentOfferId.current !== dexieOfferData.offer.id) {
            // Check offer status - only 0 (pending) and 1 (active) are valid
            if (dexieOfferData.offer.status !== 0 && dexieOfferData.offer.status !== 1) {
                let statusMessage = 'This offer is no longer valid.';
                if (dexieOfferData.offer.status === 2) {
                    statusMessage = 'This offer has already been completed.';
                } else if (dexieOfferData.offer.status === 3) {
                    statusMessage = 'This offer has been cancelled.';
                } else if (dexieOfferData.offer.date_completed) {
                    statusMessage = 'This offer has already been completed.';
                }

                setError(statusMessage);
                setWidgetState('offer-invalid');
                onTakeOfferError?.(statusMessage);
                currentOfferId.current = dexieOfferData.offer.id;
                return;
            }

            // Offer is valid, reset to initial state
            setWidgetState('initial');
            setError(null);
            setBalanceExpanded(false);
            hasInitialized.current = false;
            currentOfferId.current = dexieOfferData.offer.id;
        }
    }, [dexieOfferData?.offer?.id, dexieOfferData?.offer?.status, dexieOfferData?.offer?.date_completed, onTakeOfferError]);

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
                case 'taking':
                    return 'Processing transaction...';
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
    const isProcessingOffer = progressState !== 'idle';
    const imageUrl = getNftImageUrl();
    const gpuTitle = getGpuTitle();
    const locationDescription = getGpuLocationDescription();
    const priceWUSDC = formatPriceWUSDC(dexieOfferData.offer.price);

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
                                {priceWUSDC} wUSDC
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
                            {priceWUSDC}
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

    // Offer invalid state
    if (widgetState === 'offer-invalid') {
        return (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
                    <div className="modal-header">
                        <h3>Offer Not Available</h3>
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
                            <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>Offer no longer valid</h4>
                            <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '14px' }}>
                                {error || 'This offer is no longer available for purchase.'}
                            </p>
                            <button
                                onClick={onClose}
                                className="btn btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Transaction success state
    if (widgetState === 'transaction-success') {
        return (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-content" style={{ maxWidth: '400px', width: '90%', padding: 0 }}>
                    {/* NFT Image - same as initial state */}
                    <div style={{
                        position: 'relative',
                        borderRadius: '16px 16px 0 0',
                        overflow: 'hidden',
                        background: '#333',
                        minHeight: '200px',
                        maxHeight: '500px'
                    }}>
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={gpuTitle}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block',
                                    maxHeight: '500px',
                                    objectFit: 'contain'
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
                                height: '200px',
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

                    {/* Success Content */}
                    <div style={{ padding: '24px' }}>
                        {/* Success Status */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                <path d="M9 12l2 2 4-4"></path>
                                <circle cx="12" cy="12" r="9"></circle>
                            </svg>
                            <span style={{
                                color: '#22c55e',
                                fontSize: '16px',
                                fontWeight: '600'
                            }}>
                                Transaction complete
                            </span>
                        </div>

                        {/* Success Message */}
                        <div style={{
                            color: 'white',
                            fontSize: '14px',
                            marginBottom: '24px',
                            lineHeight: '1.4'
                        }}>
                            You've successfully purchased this NFT.
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
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
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                (e.target as HTMLButtonElement).style.background = '#222';
                            }}
                            onMouseLeave={(e) => {
                                (e.target as HTMLButtonElement).style.background = '#000';
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Transaction error state
    if (widgetState === 'transaction-error') {
        return (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
                    <div className="modal-header">
                        <h3>Transaction Failed</h3>
                        <button className="close-btn" onClick={onClose}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="error-state">
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                            <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>Transaction unsuccessful</h4>
                            <p style={{ color: '#888', margin: '0 0 24px 0', fontSize: '14px' }}>
                                {error || 'The transaction could not be completed. Please try again.'}
                            </p>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setWidgetState('initial');
                                }}
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
                    <button className="close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <h3 style={{ textAlign: 'left', paddingBottom: '16px', paddingTop: '16px' }}>Transaction Details</h3>

                    {/* Wallet Balance Section - Flexbox Table Layout */}
                    <div className="card">

                        {/* GPU Name */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px solid #333'
                        }}>
                            <span style={{
                                color: '#888',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                NFT name
                            </span>
                            <span style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '400',
                                textAlign: 'right',
                                maxWidth: '60%'
                            }}>
                                {dexieOfferData.offer.offered[0].name || ''}
                            </span>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px solid #333'
                        }}>
                            <span style={{
                                color: '#888',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                GPU model
                            </span>
                            <span style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '400'
                            }}>
                                {`${manufacturer} ${model}`}
                            </span>
                        </div>

                        {/* Your Wallet */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px solid #333'
                        }}>
                            <span style={{
                                color: '#888',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                Paying with wallet
                            </span>
                            <span
                                title={walletState.address || ''}
                                style={{
                                    color: 'white',
                                    fontSize: '14px',
                                    fontFamily: 'monospace',
                                    fontWeight: '400',
                                }}>
                                {walletState.address ? formatCoinIdMiddle(walletState.address) : 'Loading...'}
                            </span>
                        </div>

                        {/* Required Balance */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
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
                                fontSize: '14px',
                                fontWeight: '400'
                            }}>
                                {isBalanceLoading ? <LoadingSkeleton width="80px" /> : formatPriceWUSDC(requiredWUSDC / 1000)} wUSDC
                            </span>
                        </div>

                        {/* Available Balance with Expandable Caret */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: selectedCoins.length > 0 && !isBalanceLoading ? 'none' : '1px solid #333'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    color: '#888',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    Available Balance
                                </span>
                                {!isBalanceLoading && hasSufficientBalance && selectedCoins.length > 0 && (
                                    <button
                                        onClick={() => setBalanceExpanded(!balanceExpanded)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#888',
                                            cursor: 'pointer',
                                            padding: '2px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            style={{
                                                transform: balanceExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        >
                                            <path d="m9 18 6-6-6-6" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <span style={{
                                color: hasSufficientBalance ? '#22c55e' : '#ef4444',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>
                                {isBalanceLoading ? <LoadingSkeleton width="80px" /> : formatPriceWUSDC(availableWUSDC / 1000)} wUSDC
                            </span>
                        </div>

                        {/* Error Messages */}
                        {!isBalanceLoading && !hasSufficientBalance && availableWUSDC > 0 && (
                            <div className="error-message" style={{ marginTop: '16px' }}>
                                <span>⚠️</span>
                                <span>You need {formatPriceWUSDC((requiredWUSDC - availableWUSDC) / 1000)} more wUSDC to take this offer.</span>
                            </div>
                        )}

                        {!isBalanceLoading && availableWUSDC === 0 && (
                            <div className="error-message" style={{ marginTop: '16px' }}>
                                <span>You don't have any wUSDC tokens in your wallet.</span>
                            </div>
                        )}

                        {/* Expandable Selected Coins */}
                        {balanceExpanded && !isBalanceLoading && hasSufficientBalance && selectedCoins.length > 0 && (
                            <div style={{
                                paddingTop: '16px',
                                borderTop: '1px solid #333',
                                marginTop: '0'
                            }}>
                                <div style={{
                                    color: '#888',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    marginBottom: '12px'
                                }}>
                                    Selected Coins ({selectedCoins.length})
                                </div>

                                {selectedCoins.map((coinInfo, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 0',
                                        borderBottom: index < selectedCoins.length - 1 ? '1px solid #333' : 'none'
                                    }}>
                                        <span style={{
                                            color: 'white',
                                            fontSize: '11px',
                                            fontFamily: 'monospace',
                                            fontWeight: '400'
                                        }}>
                                            {coinInfo.coin.coinId || 'Unknown coin ID'}
                                        </span>
                                        <span style={{
                                            color: 'white',
                                            fontSize: '13px',
                                            fontWeight: '400'
                                        }}>
                                            {formatPriceWUSDC(coinInfo.amount / 1000)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
                        onClick={handleTakeOffer}
                        disabled={!hasSufficientBalance || isProcessingOffer || !isConnected}
                        className="btn btn-primary"
                    >
                        {progressState === 'taking'
                            ? 'Processing...'
                            : 'Complete purchase'}
                    </button>
                </div>
            </div>
        </div>
    );
};
