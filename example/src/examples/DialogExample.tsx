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
  type WalletEvent
} from 'chia-enclave-wallet-client'
import '../components/styles.css'

interface DialogExampleProps {
  jwtToken: string
}

function DialogExample({ jwtToken }: DialogExampleProps) {
  const wallet = useChiaWallet({ autoConnect: true })
  const [lastDialogResult, setLastDialogResult] = useState<string>('')
  const [selectedTestNft, setSelectedTestNft] = useState<any>(null)
  const [showEmptyCoinsAlert, setShowEmptyCoinsAlert] = useState<boolean>(false)
  const [hasCheckedCoins, setHasCheckedCoins] = useState<boolean>(false)
  const [recentEvents, setRecentEvents] = useState<WalletEvent[]>([])

  // Modern global dialog hooks
  const globalDialogs = useGlobalDialogs()
  const sendDialog = useSendDialog()
  const makeOfferDialog = useMakeOfferDialog()
  const receiveDialog = useReceiveDialog()
  const offersDialog = useOffersDialog()
  const nftDetailsDialog = useNFTDetailsDialog()

  // Set JWT token when it changes
  React.useEffect(() => {
    if (jwtToken && jwtToken !== wallet.jwtToken) {
      wallet.setJwtToken(jwtToken)
    }
  }, [jwtToken, wallet])

  // Update GlobalDialogProvider with JWT token - but only once per token change
  React.useEffect(() => {
    if (jwtToken) {
      console.log('DialogExample: Updating GlobalDialogProvider with JWT token');
      globalDialogs.updateConfig({ 
        jwtToken, 
        autoConnect: true 
      });
    }
  }, [jwtToken]); // Only depend on jwtToken

  const handleDialogResult = (dialogName: string, result?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    setLastDialogResult(`[${timestamp}] ${dialogName}: ${JSON.stringify(result || 'closed')}`)
  }

  // Listen for wallet events using the new event system
  React.useEffect(() => {
    const handleWalletEvent = (event: WalletEvent) => {
      console.log('🎯 DialogExample: Received wallet event', event);
      
      // Store recent events (keep last 5)
      setRecentEvents(prevEvents => {
        const newEvents = [event, ...prevEvents].slice(0, 5);
        return newEvents;
      });
      
      switch (event.type) {
        case 'connectionChanged':
          if (event.data.isConnected && !hasCheckedCoins) {
            console.log('🔄 DialogExample: Connection established, marking coins as checked');
            setHasCheckedCoins(true);
          }
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
          
        case 'errorOccurred':
          console.log('❌ DialogExample: Wallet error occurred', event.data);
          handleDialogResult('walletError', event.data);
          break;
      }
    };

    // Register the event listener
    const removeListener = wallet.addEventListener(handleWalletEvent);

    // Cleanup on unmount
    return removeListener;
  }, [wallet, hasCheckedCoins]);

  // Initial state check for when wallet is already connected
  React.useEffect(() => {
    if (wallet.isConnected && wallet.hydratedCoins) {
      console.log('🔍 DialogExample: Initial state check', {
        isConnected: wallet.isConnected,
        coinsLength: wallet.hydratedCoins?.length
      });

      if (!hasCheckedCoins) {
        setHasCheckedCoins(true);
      }

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
  }, []); // Only run once on mount

  const hasRealCoins = wallet.hydratedCoins && wallet.hydratedCoins.length > 0;
  
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
            </div>
            
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div><strong>wallet.hydratedCoins.length:</strong> {wallet.hydratedCoins?.length || 0}</div>
              <div><strong>hasRealCoins:</strong> {String(hasRealCoins)}</div>
              <div><strong>showEmptyCoinsAlert:</strong> {String(showEmptyCoinsAlert)}</div>
              <div><strong>hasCheckedCoins:</strong> {String(hasCheckedCoins)}</div>
              <div><strong>selectedTestNft:</strong> {selectedTestNft ? `${selectedTestNft.coin_name} (${selectedTestNft.launcher_id ? 'real' : 'mock'})` : 'null'}</div>
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