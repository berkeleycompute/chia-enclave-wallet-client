import React, { useState } from 'react'
import { useChiaWallet } from 'chia-enclave-wallet-client'
import '../components/styles.css'

interface DialogExampleProps {
  jwtToken: string
}

function DialogExample({ jwtToken }: DialogExampleProps) {
  const wallet = useChiaWallet({ autoConnect: true })
  const [lastDialogResult, setLastDialogResult] = useState<string>('')

  // Set JWT token when it changes
  React.useEffect(() => {
    if (jwtToken && jwtToken !== wallet.jwtToken) {
      wallet.setJwtToken(jwtToken)
    }
  }, [jwtToken, wallet])

  const handleDialogResult = (dialogName: string, result?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    setLastDialogResult(`[${timestamp}] ${dialogName}: ${JSON.stringify(result || 'closed')}`)
  }

  return (
    <div className="example-container">
      <h2 className="example-title">📋 Dialog System Examples</h2>
      
      <div className="example-grid">
        <div className="card">
          <h3>🌐 Global Dialog System</h3>
          <p>The library includes a comprehensive dialog system for wallet interactions:</p>
          
          <div className="dialog-info">
            <h4>Available Dialog Hooks:</h4>
            <ul>
              <li><code>useSendDialog()</code> - Send XCH transactions</li>
              <li><code>useReceiveDialog()</code> - Display receive address</li>
              <li><code>useMakeOfferDialog()</code> - Create offers</li>
              <li><code>useOffersDialog()</code> - View active offers</li>
              <li><code>useNFTDetailsDialog()</code> - NFT information</li>
              <li><code>useGlobalDialogs()</code> - Manage all dialogs</li>
            </ul>
          </div>

          <div className="dialog-code-example">
            <h4>Example Usage:</h4>
            <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
              {`import { useSendDialog } from 'chia-enclave-wallet-client'

function MyComponent() {
  const sendDialog = useSendDialog()
  
  const handleSend = () => {
    sendDialog.open({
      initialAmount: 0.001,
      onSuccess: (result) => {
        console.log('Transaction sent:', result)
      }
    })
  }
  
  return <button onClick={handleSend}>Send XCH</button>
}`}
            </pre>
          </div>
        </div>

        <div className="card">
          <h3>📱 Dialog Manager Component</h3>
          <p>High-level component that manages multiple dialog types:</p>
          
          <div className="dialog-code-example">
            <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
              {`import { ChiaWalletDialogManager } from 'chia-enclave-wallet-client'

function App() {
  return (
    <ChiaWalletDialogManager
      config={{
        enableSendDialog: true,
        enableReceiveDialog: true,
        enableOfferDialogs: true,
        enableNFTDialog: true,
        theme: 'light'
      }}
      onDialogResult={(type, result) => {
        console.log('Dialog result:', result)
      }}
    />
  )
}`}
            </pre>
          </div>
        </div>

        <div className="card">
          <h3>🎯 Dialog Features</h3>
          <ul>
            <li>✅ Global state management</li>
            <li>✅ Type-safe interfaces</li>
            <li>✅ Event callbacks</li>
            <li>✅ Customizable themes</li>
            <li>✅ Responsive design</li>
            <li>✅ Error handling</li>
            <li>✅ Loading states</li>
            <li>✅ Accessibility features</li>
          </ul>
        </div>

        <div className="card">
          <h3>🔧 Integration Steps</h3>
          <ol>
            <li><strong>Wrap your app</strong> with <code>GlobalDialogProvider</code></li>
            <li><strong>Import dialog hooks</strong> in your components</li>
            <li><strong>Call</strong> <code>dialogHook.open()</code> to show dialogs</li>
            <li><strong>Handle events</strong> via callback props</li>
            <li><strong>Style dialogs</strong> with CSS or themes</li>
          </ol>
        </div>

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
                style={{ marginTop: '0.75rem' }}
              >
                Clear Log
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '2rem' }}>
              <p>Dialog events will be logged here when dialogs are used</p>
              <p><small>Note: Full dialog functionality requires integration with your app's UI framework</small></p>
            </div>
          )}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>🔗 Provider Setup</h3>
          <p>To use the global dialog system, wrap your app with the provider:</p>
          
          <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
            {`import { GlobalDialogProvider } from 'chia-enclave-wallet-client'

function App() {
  return (
    <GlobalDialogProvider>
      <YourApp />
    </GlobalDialogProvider>
  )
}`}
          </pre>

          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff3cd', borderLeft: '4px solid #ffc107', borderRadius: '4px' }}>
            <strong>Note:</strong> This example shows the dialog system structure and usage patterns. 
            Full dialog rendering requires UI components that are included with the library.
          </div>
        </div>
      </div>
    </div>
  )
}

export default DialogExample 