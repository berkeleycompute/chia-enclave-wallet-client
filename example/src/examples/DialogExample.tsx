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
  useNFTDetailsDialog
} from 'chia-enclave-wallet-client'
import '../components/styles.css'

interface DialogExampleProps {
  jwtToken: string
}

function DialogExample({ jwtToken }: DialogExampleProps) {
  const wallet = useChiaWallet({ autoConnect: true })
  const [lastDialogResult, setLastDialogResult] = useState<string>('')
  const [selectedTestNft, setSelectedTestNft] = useState<any>(null)

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

  // Create a mock NFT for testing
  React.useEffect(() => {
    if (wallet.hydratedCoins && wallet.hydratedCoins.length > 0) {
      // Use the first hydrated coin as a test "NFT" 
      setSelectedTestNft(wallet.hydratedCoins[0]);
    } else {
      // Create a mock NFT for testing if no coins are available
      setSelectedTestNft({
        coin_name: 'mock_nft_1',
        launcher_id: 'launcher_test_123',
        metadata: {
          name: 'Test NFT',
          description: 'A test NFT for dialog demonstration',
        }
      });
    }
  }, [wallet.hydratedCoins]);

  const dialogButtons = [
    {
      title: 'Send Funds',
      description: 'Open the send XCH dialog',
      icon: '💸',
      action: () => {
        sendDialog.open({ amount: '0.001' })
        handleDialogResult('sendDialog.open', { amount: '0.001' })
      },
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
      description: 'Create an offer dialog - FIXED! 🎉',
      icon: '🤝',
      action: () => {
        makeOfferDialog.open({ selectedNft: selectedTestNft })
        handleDialogResult('makeOfferDialog.open', { nft: selectedTestNft?.coin_name })
      },
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
      description: 'Show NFT information dialog',
      icon: '🖼️',
      action: () => {
        if (selectedTestNft) {
          nftDetailsDialog.open({ nft: selectedTestNft })
          handleDialogResult('nftDetailsDialog.open', { nft: selectedTestNft.coin_name })
        }
      },
      disabled: !selectedTestNft,
    },
  ]

  return (
    <div className="example-container">
      <h2 className="example-title">🌾 Chia Wallet Button & Dialogs</h2>
      
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
            <strong>✅ FIXED:</strong> The "Make Offer" dialog now opens correctly when clicked from individual buttons! 
            The infinite API call loop has been resolved by improving the GlobalDialogProvider initialization.
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