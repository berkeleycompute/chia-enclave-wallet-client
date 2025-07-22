import React, { useState } from 'react'
import { 
  useChiaWallet,
  ChiaWalletButton,
  ChiaWalletBridge,
  useGlobalDialogs,
  useSendDialog,
  useMakeOfferDialog,
  useReceiveDialog,
  useOffersDialog,
  useNFTDetailsDialog,
  // useHydratedCoins, // Temporarily commented - need to check exports
  type WalletEvent
} from 'chia-enclave-wallet-client'
import '../components/styles.css'

interface DialogExampleProps {
  jwtToken: string
}

function DialogExample({ jwtToken }: DialogExampleProps) {
  // Use the original wallet hook for button functionality
  const wallet = useChiaWallet({ 
    autoConnect: true,
    enableLogging: true
  })

  // TODO: Use the new direct hydrated coins hook - this is our primary data source
  // const hydratedCoins = useHydratedCoins({
  //   jwtToken,
  //   enableLogging: true,
  //   autoFetch: false // We'll control fetching manually
  // })

  const [lastDialogResult, setLastDialogResult] = useState<string>('')
  const [selectedTestNft, setSelectedTestNft] = useState<any>(null)
  const [showEmptyCoinsAlert, setShowEmptyCoinsAlert] = useState<boolean>(false)
  const [recentEvents, setRecentEvents] = useState<WalletEvent[]>([])
  
  // Direct hydrated coins state
  const [directCoins, setDirectCoins] = useState<any[]>([])
  const [directBalance, setDirectBalance] = useState<number>(0)
  const [directLoading, setDirectLoading] = useState<boolean>(false)
  const [directError, setDirectError] = useState<string | null>(null)
  const [directLastFetch, setDirectLastFetch] = useState<number>(0)

  // Modern global dialog hooks
  const globalDialogs = useGlobalDialogs()
  const sendDialog = useSendDialog()
  const makeOfferDialog = useMakeOfferDialog()
  const receiveDialog = useReceiveDialog()
  const offersDialog = useOffersDialog()
  const nftDetailsDialog = useNFTDetailsDialog()

  // Set JWT token when it changes - CRITICAL: This must happen first
  React.useEffect(() => {
    console.log('📝 DialogExample: JWT token effect triggered', { 
      jwtToken: jwtToken ? `${jwtToken.substring(0, 10)}...` : null,
      currentWalletToken: wallet.jwtToken ? `${wallet.jwtToken.substring(0, 10)}...` : null,
      tokensMatch: jwtToken === wallet.jwtToken,
      walletConnected: wallet.isConnected,
      walletConnecting: wallet.isConnecting
    });

    if (jwtToken && jwtToken !== wallet.jwtToken) {
      console.log('🔄 DialogExample: Setting JWT token on wallet and forcing refresh');
      wallet.setJwtToken(jwtToken);
      
      // Force a refresh after a short delay to ensure connection happens
      setTimeout(() => {
        console.log('🔄 DialogExample: Force refreshing wallet after token set');
        wallet.refreshWallet();
      }, 1000);
    }
  }, [jwtToken, wallet]);

  // Monitor wallet connection state changes
  React.useEffect(() => {
    console.log('🔍 DialogExample: Wallet state changed', {
      isConnected: wallet.isConnected,
      isConnecting: wallet.isConnecting,
      hasPublicKey: !!wallet.publicKey,
      hydratedCoinsLength: wallet.hydratedCoins?.length || 0,
      balance: wallet.balance,
      lastRefresh: wallet.lastSuccessfulRefresh,
      error: wallet.error
    });
  }, [
    wallet.isConnected, 
    wallet.isConnecting, 
    wallet.publicKey, 
    wallet.hydratedCoins, 
    wallet.balance,
    wallet.lastSuccessfulRefresh,
    wallet.error
  ]);

  // Update GlobalDialogProvider with JWT token - but only once per token change
  React.useEffect(() => {
    if (jwtToken) {
      console.log('🔄 DialogExample: Updating GlobalDialogProvider with JWT token');
      globalDialogs.updateConfig({ 
        jwtToken, 
        autoConnect: true 
      });
    }
  }, [jwtToken, globalDialogs]); // Add globalDialogs to dependencies

  const handleDialogResult = (dialogName: string, result?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    setLastDialogResult(`[${timestamp}] ${dialogName}: ${JSON.stringify(result || 'closed')}`)
  }

  // Manual fetch function - direct API call bypassing events
  const fetchHydratedCoinsDirect = React.useCallback(async () => {
    if (!jwtToken || !wallet.client) {
      console.error('❌ Direct Fetch: No JWT token or client available');
      setDirectError('JWT token and client are required');
      return false;
    }

    console.log('🚀 Direct Fetch: Starting manual hydrated coins fetch');
    setDirectLoading(true);
    setDirectError(null);

    try {
      // Set JWT token on client
      wallet.client.setJwtToken(jwtToken);

      // Get public key first
      console.log('📝 Direct Fetch: Getting public key...');
      const pkResponse = await wallet.client.getPublicKey();
      if (!pkResponse.success) {
        throw new Error(pkResponse.error);
      }

      const publicKey = pkResponse.data.address;
      console.log('✅ Direct Fetch: Public key obtained:', publicKey.substring(0, 16) + '...');

      // Get hydrated coins
      console.log('💰 Direct Fetch: Getting hydrated coins...');
      const hydratedResult = await wallet.client.getUnspentHydratedCoins(publicKey);
      if (!hydratedResult.success) {
        throw new Error(hydratedResult.error);
      }

      const hydratedCoins = hydratedResult.data.data;
      console.log('✅ Direct Fetch: Hydrated coins fetched successfully:', {
        count: hydratedCoins.length,
        coins: hydratedCoins.map(coin => ({
          amount: coin.coin.amount,
          type: coin.parentSpendInfo?.driverInfo?.type || 'XCH'
        }))
      });

      // Calculate balance
      let totalBalance = 0;
      for (const hydratedCoin of hydratedCoins) {
        try {
          totalBalance += parseInt(hydratedCoin.coin.amount);
        } catch (error) {
          console.warn('Invalid coin amount:', hydratedCoin.coin.amount);
        }
      }

      // Update direct state
      setDirectCoins(hydratedCoins);
      setDirectBalance(totalBalance);
      setDirectLastFetch(Date.now());

      // Update the selected NFT with real data
      if (hydratedCoins.length > 0) {
        setSelectedTestNft(hydratedCoins[0]);
        setShowEmptyCoinsAlert(false);
      } else {
        setShowEmptyCoinsAlert(true);
        setSelectedTestNft({
          coin_name: 'mock_nft_1',
          launcher_id: 'launcher_test_123',
          metadata: {
            name: 'Test NFT',
            description: 'A test NFT for dialog demonstration',
          }
        });
      }

      handleDialogResult('directFetch', {
        success: true,
        coinCount: hydratedCoins.length,
        balance: totalBalance,
        timestamp: Date.now()
      });

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hydrated coins';
      console.error('❌ Direct Fetch: Error:', errorMessage);
      setDirectError(errorMessage);
      
      handleDialogResult('directFetchError', {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      });

      return false;
    } finally {
      setDirectLoading(false);
    }
  }, [jwtToken, wallet.client]);

  // Listen for wallet events using the new event system
  React.useEffect(() => {
    console.log('🔧 DialogExample: Setting up event listener', { 
      walletExists: !!wallet, 
      hasAddEventListener: !!wallet.addEventListener 
    });

    if (!wallet || typeof wallet.addEventListener !== 'function') {
      console.error('❌ DialogExample: Wallet does not have addEventListener method!', {
        hasWallet: !!wallet,
        hasAddEventListener: wallet ? typeof wallet.addEventListener : 'no wallet'
      });
      return;
    }

    const handleWalletEvent = (event: WalletEvent) => {
      console.log('🎯 DialogExample: Received wallet event', event);
      
      // Store recent events (keep last 5)
      setRecentEvents(prevEvents => {
        const newEvents = [event, ...prevEvents].slice(0, 5);
        return newEvents;
      });
      
      switch (event.type) {
        case 'connectionChanged':
          console.log('🔄 DialogExample: Connection event received', event.data);
          break;
          
        case 'hydratedCoinsChanged':
          console.log('✅ DialogExample: Hydrated coins changed - updating UI', event.data);
          const { hydratedCoins, coinCount } = event.data;
          
          if (hydratedCoins && hydratedCoins.length > 0) {
            console.log('✅ DialogExample: Real coins available, hiding alert');
            setSelectedTestNft(hydratedCoins[0]);
            setShowEmptyCoinsAlert(false);
          } else {
            console.log('⚠️ DialogExample: No real coins, showing alert');
            setShowEmptyCoinsAlert(true);
            setSelectedTestNft({
              coin_name: 'mock_nft_1',
              launcher_id: 'launcher_test_123',
              metadata: {
                name: 'Test NFT',
                description: 'A test NFT for dialog demonstration',
              }
            });
          }
          break;
          
        case 'balanceChanged':
          console.log('💰 DialogExample: Balance changed', event.data);
          break;
          
        case 'errorOccurred':
          console.log('❌ DialogExample: Wallet error occurred', event.data);
          handleDialogResult('walletError', event.data);
          break;
          
        default:
          console.log('❓ DialogExample: Unknown event type', event.type);
      }
    };

    try {
      // Register the event listener
      console.log('📝 DialogExample: Registering event listener...');
      const removeListener = wallet.addEventListener(handleWalletEvent);
      console.log('✅ DialogExample: Event listener registered successfully', { removeListener: !!removeListener });

      // Test event emission
      console.log('🧪 DialogExample: Testing event system...');
      
      // Cleanup on unmount
      return () => {
        console.log('🧹 DialogExample: Cleaning up event listener');
        if (removeListener) {
          removeListener();
        }
      };
    } catch (error) {
      console.error('❌ DialogExample: Error setting up event listener:', error);
    }
  }, [wallet]); // Remove hasCheckedCoins from dependencies to avoid recreation

  // Initial state check for when wallet is already connected
  React.useEffect(() => {
    if (wallet.isConnected && wallet.hydratedCoins) {
      console.log('🔍 DialogExample: Initial state check', {
        isConnected: wallet.isConnected,
        coinsLength: wallet.hydratedCoins?.length
      });

      if (wallet.hydratedCoins.length > 0) {
        setSelectedTestNft(wallet.hydratedCoins[0]);
        setShowEmptyCoinsAlert(false);
      } else {
        setShowEmptyCoinsAlert(true);
        setSelectedTestNft({
          coin_name: 'mock_nft_1',
          launcher_id: 'launcher_test_123',
          metadata: {
            name: 'Test NFT',
            description: 'A test NFT for dialog demonstration',
          }
        });
      }
    }
  }, [wallet.isConnected, wallet.hydratedCoins]); // Update when wallet state changes

  // Use direct coins as the primary source, fallback to wallet coins
  const primaryCoins = directCoins.length > 0 ? directCoins : (wallet.hydratedCoins || []);
  const hasRealCoins = primaryCoins.length > 0;
  const primaryBalance = directCoins.length > 0 ? directBalance : wallet.balance;
  
  // Debug log the button state
  console.log('🎯 DialogExample: Button states', {
    hasRealCoins,
    hydratedCoinsLength: wallet.hydratedCoins?.length,
    hydratedCoinsExists: !!wallet.hydratedCoins,
    walletConnected: wallet.isConnected
  });

  const dialogButtons = [
    {
      title: 'Send Funds',
      description: hasRealCoins ? 'Open the send XCH dialog' : 'Requires hydrated coins to send funds',
      icon: '💸',
      action: () => {
        sendDialog.open({ amount: '0.001' })
        handleDialogResult('sendDialog.open', { amount: '0.001' })
      },
      disabled: !hasRealCoins,
    },
    {
      title: 'Receive Funds', 
      description: 'Show wallet receive address',
      icon: '📥',
      action: () => {
        receiveDialog.open()
        handleDialogResult('receiveDialog.open')
      },
    },
    {
      title: 'Make Offer',
      description: hasRealCoins ? 'Create an offer dialog - FIXED! 🎉' : 'Requires hydrated coins to make offers',
      icon: '🤝',
      action: () => {
        makeOfferDialog.open({ selectedNft: selectedTestNft })
        handleDialogResult('makeOfferDialog.open', { nft: selectedTestNft?.coin_name })
      },
      disabled: !hasRealCoins,
    },
    {
      title: 'Active Offers',
      description: 'View and manage active offers',
      icon: '📋',
      action: () => {
        offersDialog.open()
        handleDialogResult('offersDialog.open')
      },
    },
    {
      title: 'NFT Details',
      description: hasRealCoins ? 'Show NFT information dialog' : 'Requires hydrated coins to show NFT details',
      icon: '🖼️',
      action: () => {
        if (selectedTestNft) {
          nftDetailsDialog.open({ nft: selectedTestNft })
          handleDialogResult('nftDetailsDialog.open', { nft: selectedTestNft.coin_name })
        }
      },
      disabled: !hasRealCoins,
    },
  ]

  return (
    <div className="example-container">
      <h2 className="example-title">🌾 Chia Wallet Button & Dialogs</h2>
      
      {/* Empty Coins Alert */}
      {showEmptyCoinsAlert && (
        <div style={{ 
          margin: '1rem 0', 
          padding: '1rem', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <strong style={{ color: '#dc2626' }}>No Hydrated Coins Available</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#7f1d1d', fontSize: '0.9rem' }}>
              Some wallet functions (Send Funds, Make Offer, NFT Details) are disabled until coins are loaded. 
              The wallet uses real-time events to update automatically when coins become available.
            </p>
          </div>
        </div>
      )}
      
      <div className="example-grid">
        {/* Main Chia Wallet Button */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>🌾 Main Chia Wallet Button</h3>
          <p>The main entry point to your Chia wallet - click to open the full wallet interface:</p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
            <ChiaWalletButton
              jwtToken={jwtToken}
              variant="primary"
              size="large"
              autoConnect={true}
              onWalletUpdate={(state) => {
                handleDialogResult('ChiaWalletButton.onWalletUpdate', {
                  isConnected: state.isConnected,
                  balance: state.balance,
                  nftCount: state.nftCount
                })
              }}
              style={{ minWidth: '200px' }}
            />
            
                         <div style={{ marginLeft: '1rem', color: '#666' }}>
               <div><strong>Status:</strong> {wallet.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
               <div><strong>Balance:</strong> {wallet.balance} XCH</div>
               <div><strong>Coins:</strong> {wallet.hydratedCoins?.length || 0}</div>
             </div>
          </div>

          {/* Debug Information */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem' }}>🐛 Debug Information & Events</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => wallet.refreshWallet()}
                  disabled={!wallet.isConnected}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  🔄 Refresh Wallet
                </button>
                <button 
                  onClick={() => {
                    console.log('🔌 Manual Connect: Attempting to connect wallet');
                    wallet.connectWallet().then(() => {
                      console.log('✅ Manual Connect: Connection attempt completed');
                    }).catch(error => {
                      console.error('❌ Manual Connect: Connection failed:', error);
                    });
                  }}
                  disabled={wallet.isConnecting}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: wallet.isConnected ? '#16a34a' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  {wallet.isConnecting ? '⏳' : wallet.isConnected ? '🟢' : '🔴'} Connect
                </button>
                <button 
                  onClick={() => {
                    console.log('🪙 Direct Fetch: User triggered manual fetch');
                    fetchHydratedCoinsDirect().then(success => {
                      if (success) {
                        console.log('✅ Direct Fetch: Manual fetch completed successfully');
                      } else {
                        console.error('❌ Direct Fetch: Manual fetch failed');
                      }
                    });
                  }}
                  disabled={directLoading}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: directLoading ? '#9ca3af' : '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  {directLoading ? '⏳' : '🪙'} {directLoading ? 'Fetching...' : 'Fetch Coins Direct'}
                </button>
                <button 
                  onClick={() => {
                    console.log('🧪 Manual test: Triggering test event');
                    // Test if event system works by manually triggering an event
                    if (wallet && typeof wallet.addEventListener === 'function') {
                      console.log('📡 Manual test: Event system available, simulating event');
                      handleDialogResult('manualTest', { 
                        message: 'Manual event test', 
                        timestamp: Date.now() 
                      });
                      
                      // Try to trigger a real refresh to see events
                      wallet.refreshWallet().then(() => {
                        console.log('✅ Manual refresh completed');
                      }).catch(error => {
                        console.error('❌ Manual refresh failed:', error);
                      });
                    } else {
                      console.error('❌ Manual test: No event system available', { 
                        hasWallet: !!wallet,
                        hasAddEventListener: wallet ? typeof wallet.addEventListener : 'no wallet'
                      });
                    }
                  }}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  🧪 Test Events
                </button>
              </div>
            </div>
            
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                gap: '1rem',
                padding: '0.5rem',
                background: 'white',
                borderRadius: '4px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <strong style={{ color: '#059669' }}>📊 Wallet Hook State:</strong>
                  <div style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                    <div>isConnected: {String(wallet.isConnected)}</div>
                    <div>isConnecting: {String(wallet.isConnecting)}</div>
                    <div>hasJwtToken: {String(!!wallet.jwtToken)}</div>
                    <div>publicKey: {wallet.publicKey ? `${wallet.publicKey.substring(0, 16)}...` : 'null'}</div>
                    <div>balance: {wallet.balance}</div>
                    <div>coinCount: {wallet.coinCount}</div>
                    <div>hydratedCoins.length: {wallet.hydratedCoins?.length || 0}</div>
                    <div>lastRefresh: {wallet.lastSuccessfulRefresh ? new Date(wallet.lastSuccessfulRefresh).toLocaleTimeString() : 'never'}</div>
                    <div>error: {wallet.error || 'none'}</div>
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#2563eb' }}>🪙 Direct Fetch State:</strong>
                  <div style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                    <div>isLoading: {String(directLoading)}</div>
                    <div>directCoins.length: {directCoins.length}</div>
                    <div>directBalance: {directBalance}</div>
                    <div>lastFetch: {directLastFetch ? new Date(directLastFetch).toLocaleTimeString() : 'never'}</div>
                    <div>error: {directError || 'none'}</div>
                    <div style={{ marginTop: '0.25rem', padding: '0.25rem', background: directCoins.length > 0 ? '#dcfce7' : '#f3f4f6', borderRadius: '3px', fontSize: '0.7rem' }}>
                      Status: {directCoins.length > 0 ? '✅ Has Coins' : directLoading ? '⏳ Loading' : directError ? '❌ Error' : '⚪ Not Fetched'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <strong style={{ color: '#dc2626' }}>🎯 Final Logic:</strong>
                  <div style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                    <div>primaryCoins: {primaryCoins.length} coins</div>
                    <div>hasRealCoins: {String(hasRealCoins)}</div>
                    <div>showEmptyCoinsAlert: {String(showEmptyCoinsAlert)}</div>
                    <div>selectedTestNft: {selectedTestNft ? `${selectedTestNft.coin_name} (${selectedTestNft.launcher_id ? 'real' : 'mock'})` : 'null'}</div>
                    <div style={{ marginTop: '0.5rem', padding: '0.25rem', background: hasRealCoins ? '#dcfce7' : '#fef2f2', borderRadius: '3px' }}>
                      Buttons: <strong>{hasRealCoins ? 'ENABLED' : 'DISABLED'}</strong>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                💡 <strong>If ChiaWalletButton shows coins but DialogExample shows 0 coins, they're using different wallet instances.</strong>
              </div>
            </div>
            
            {/* Recent Events */}
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.9rem' }}>📡 Recent Wallet Events:</strong>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: 'white',
                borderRadius: '4px',
                border: '1px solid #e2e8f0'
              }}>
                {recentEvents.length > 0 ? (
                  recentEvents.map((event, index) => (
                    <div key={index} style={{ 
                      fontSize: '0.75rem', 
                      fontFamily: 'monospace',
                      padding: '0.25rem 0',
                      borderBottom: index < recentEvents.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}>
                      <div style={{ color: '#059669', fontWeight: 'bold' }}>
                        {new Date(event.timestamp).toLocaleTimeString()} - {event.type}
                      </div>
                      <div style={{ color: '#64748b', marginLeft: '1rem' }}>
                        {JSON.stringify(event.data, null, 1).substring(0, 200)}
                        {JSON.stringify(event.data, null, 1).length > 200 ? '...' : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
                    No events yet. Try refreshing the wallet or connecting to see events.
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                style={{ 
                  padding: '0.5rem 1rem',
                  background: hasRealCoins ? '#16a34a' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
                disabled={!hasRealCoins}
              >
                Test Button: {hasRealCoins ? 'ENABLED' : 'DISABLED'}
              </button>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                This test button should mirror the state of coin-dependent dialogs
              </span>
              <button 
                onClick={() => setRecentEvents([])}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}
              >
                Clear Events
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f8ff', borderRadius: '6px', border: '1px solid #0ea5e9' }}>
            <strong>💡 Tip:</strong> The ChiaWalletButton provides a complete wallet interface when clicked. 
            Use the individual dialog buttons below to test specific modals.
          </div>
        </div>

        {/* Individual Dialog Test Buttons */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>🔧 Individual Dialog Testing</h3>
          <p>Test each dialog type independently:</p>
          
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#dcfce7', borderRadius: '6px', border: '1px solid #16a34a' }}>
            <strong>✅ LATEST IMPROVEMENTS:</strong> Now featuring real-time event-driven updates! 
            The wallet emits events when coins are loaded/changed, eliminating polling and providing instant UI updates.
            Dialogs are automatically enabled/disabled based on real-time wallet events. Check the debug panel below to see events in action!
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {dialogButtons.map((dialog, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '1rem', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: 'white',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>{dialog.icon}</span>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{dialog.title}</h4>
                </div>
                
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                  {dialog.description}
                </p>
                
                <button
                  onClick={dialog.action}
                  disabled={dialog.disabled}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    background: dialog.disabled ? '#f1f5f9' : '#3b82f6',
                    color: dialog.disabled ? '#94a3b8' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: dialog.disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Open {dialog.title}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                globalDialogs.closeAllDialogs()
                handleDialogResult('globalDialogs.closeAllDialogs')
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🚫 Close All Dialogs
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
              <strong>Dialog Status:</strong> 
              <span style={{ marginLeft: '0.5rem' }}>
                Click buttons above to test dialogs
              </span>
            </div>
          </div>
        </div>

        {/* Dialog Event Log */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>📊 Dialog Event Log</h3>
          {lastDialogResult ? (
            <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '6px', fontFamily: 'monospace' }}>
              <div style={{ padding: '0.5rem', background: 'white', borderRadius: '4px', wordBreak: 'break-word' }}>
                <strong>Last Event:</strong> {lastDialogResult}
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => setLastDialogResult('')}
                style={{ 
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Log
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '2rem' }}>
              <p>🎯 Click any dialog button above to see events logged here</p>
              <p><small>Events will show when dialogs are opened, closed, or trigger callbacks</small></p>
            </div>
          )}
        </div>

        {/* Bridge Component Demo */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>🌉 Chia Wallet Bridge Component</h3>
          <p>The ChiaWalletBridge renders all dialog modals. It's included automatically with the button:</p>
          
          <ChiaWalletBridge
            jwtToken={jwtToken}
            onWalletUpdate={(state) => {
              handleDialogResult('ChiaWalletBridge.onWalletUpdate', {
                isConnected: state.isConnected,
                publicKey: state.publicKey ? `${state.publicKey.slice(0, 8)}...` : null
              })
            }}
          />
          
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
            <strong>ℹ️ Note:</strong> The bridge component handles all the modal rendering and state management. 
            It's automatically included when you use ChiaWalletButton or can be used standalone for headless integration.
          </div>
        </div>

        {/* Integration Code Examples */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>💻 Quick Integration Examples</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <h4>Simple Button Usage:</h4>
              <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
{`import { ChiaWalletButton } from 'chia-enclave-wallet-client'

<ChiaWalletButton 
  jwtToken={yourJwtToken}
  variant="primary"
  size="large"
  autoConnect={true}
/>`}
              </pre>
            </div>
            
            <div>
              <h4>Individual Dialog Hook:</h4>
              <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
{`import { useSendDialog } from 'chia-enclave-wallet-client'

const sendDialog = useSendDialog()

<button onClick={sendDialog.open}>
  Send XCH
</button>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DialogExample 