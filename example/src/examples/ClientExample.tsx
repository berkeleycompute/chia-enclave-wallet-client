import React, { useState } from 'react'
import { ChiaCloudWalletClient } from 'chia-enclave-wallet-client'
import '../components/styles.css'

interface ClientExampleProps {
  jwtToken: string
}

function ClientExample({ jwtToken }: ClientExampleProps) {
  const [client] = useState(() => new ChiaCloudWalletClient({ enableLogging: true }))
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Set JWT token when it changes
  React.useEffect(() => {
    if (jwtToken) {
      client.setJwtToken(jwtToken)
    }
  }, [jwtToken, client])

  const executeMethod = async (methodName: string, method: () => Promise<any>) => {
    setIsLoading(true)
    setErrors(prev => ({ ...prev, [methodName]: '' }))
    
    try {
      const result = await method()
      setResults(prev => ({ ...prev, [methodName]: result }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrors(prev => ({ ...prev, [methodName]: errorMessage }))
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setResults({})
    setErrors({})
  }

  const formatResult = (result: any): string => {
    if (typeof result === 'string') return result
    return JSON.stringify(result, null, 2)
  }

  const renderMethodCard = (
    title: string,
    description: string,
    methodName: string,
    method: () => Promise<any>,
    disabled = false
  ) => (
    <div className="card">
      <h3>{title}</h3>
      <p>{description}</p>
      
      <button
        className="btn btn-primary"
        onClick={() => executeMethod(methodName, method)}
        disabled={disabled || isLoading || !jwtToken}
        style={{ marginBottom: '1rem' }}
      >
        {isLoading ? (
          <>
            <span className="loading-spinner"></span>
            Executing...
          </>
        ) : (
          `Test ${title}`
        )}
      </button>

      {results[methodName] && (
        <div className="result-section">
          <h4>Result:</h4>
          <pre className="result-code">
            {formatResult(results[methodName])}
          </pre>
        </div>
      )}

      {errors[methodName] && (
        <div className="error-message">
          <strong>Error:</strong> {errors[methodName]}
        </div>
      )}
    </div>
  )

  return (
    <div className="example-container">
      <h2 className="example-title">🔧 ChiaCloudWalletClient Direct Usage</h2>
      
      {!jwtToken ? (
        <div className="card">
          <h3>JWT Token Required</h3>
          <p>Please enter a valid JWT token in the token input above to test the client methods.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={clearResults}
              disabled={Object.keys(results).length === 0 && Object.keys(errors).length === 0}
            >
              🗑️ Clear All Results
            </button>
          </div>

          <div className="example-grid">
            {renderMethodCard(
              'Health Check',
              'Test API connectivity without authentication',
              'healthCheck',
              () => client.healthCheck()
            )}

            {renderMethodCard(
              'Get Public Key',
              'Retrieve wallet public key and address from JWT',
              'getPublicKey', 
              () => client.getPublicKey()
            )}

            {renderMethodCard(
              'Export Mnemonic',
              'Get the mnemonic phrase for the wallet (sensitive operation)',
              'exportMnemonic',
              () => client.exportMnemonic()
            )}

            {renderMethodCard(
              'Get Unspent Coins',
              'Retrieve all unspent hydrated coins for the wallet',
              'getUnspentCoins',
              async () => {
                const pkResult = await client.getPublicKey()
                if (!pkResult.success) throw new Error(pkResult.error)
                return client.getUnspentHydratedCoins(pkResult.data.address)
              }
            )}

            {renderMethodCard(
              'Get Enhanced Balance',
              'Get comprehensive balance information with coin categorization',
              'getEnhancedBalance',
              async () => {
                const pkResult = await client.getPublicKey()
                if (!pkResult.success) throw new Error(pkResult.error)
                return client.getWalletBalanceEnhanced(pkResult.data.address)
              }
            )}

            <div className="card">
              <h3>Address Conversion Utility</h3>
              <p>Convert Chia address to puzzle hash (static utility method)</p>
              
              <div className="form-group">
                <label htmlFor="address-input">Chia Address (xch1...)</label>
                <input
                  id="address-input"
                  type="text"
                  className="form-control"
                  placeholder="xch1..."
                  onBlur={(e) => {
                    const address = e.target.value.trim()
                    if (address) {
                      executeMethod('convertAddress', () => 
                        Promise.resolve(ChiaCloudWalletClient.convertAddressToPuzzleHash(address))
                      )
                    }
                  }}
                />
              </div>

              {results.convertAddress && (
                <div className="result-section">
                  <h4>Puzzle Hash:</h4>
                  <pre className="result-code">
                    {formatResult(results.convertAddress)}
                  </pre>
                </div>
              )}

              {errors.convertAddress && (
                <div className="error-message">
                  <strong>Error:</strong> {errors.convertAddress}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Utility Methods</h3>
              <p>Test XCH/mojos conversion utilities</p>
              
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => executeMethod('xchToMojos', () => 
                    Promise.resolve(ChiaCloudWalletClient.xchToMojos(1.5))
                  )}
                >
                  1.5 XCH → Mojos
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => executeMethod('mojosToXCH', () => 
                    Promise.resolve(ChiaCloudWalletClient.mojosToXCH(1500000000000))
                  )}
                >
                  1.5T Mojos → XCH
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => executeMethod('calculateCoinId', () => {
                    const sampleCoin = {
                      parentCoinInfo: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                      puzzleHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
                      amount: '1000000000000'
                    }
                    return ChiaCloudWalletClient.calculateCoinId(sampleCoin)
                  })}
                >
                  Calculate Sample Coin ID
                </button>
              </div>

              {(results.xchToMojos || results.mojosToXCH || results.calculateCoinId) && (
                <div className="result-section">
                  <h4>Utility Results:</h4>
                  {results.xchToMojos && (
                    <div>
                      <strong>XCH to Mojos:</strong>
                      <pre className="result-code">{formatResult(results.xchToMojos)}</pre>
                    </div>
                  )}
                  {results.mojosToXCH && (
                    <div>
                      <strong>Mojos to XCH:</strong>
                      <pre className="result-code">{formatResult(results.mojosToXCH)}</pre>
                    </div>
                  )}
                  {results.calculateCoinId && (
                    <div>
                      <strong>Sample Coin ID:</strong>
                      <pre className="result-code">{formatResult(results.calculateCoinId)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3>📚 Advanced Methods</h3>
              <p>These methods require specific parameters and are more complex to test:</p>
              
              <div className="advanced-methods">
                <div className="method-info">
                  <h4>signSpendBundle(request)</h4>
                  <p>Sign a spend bundle with coin spends and puzzle solutions</p>
                </div>
                
                <div className="method-info">
                  <h4>sendXCH(request)</h4>
                  <p>Create and sign an XCH transaction with payments and selected coins</p>
                </div>
                
                <div className="method-info">
                  <h4>sendAndBroadcastXCH(request)</h4>
                  <p>Complete flow: create, sign, and broadcast XCH transaction</p>
                </div>
                
                <div className="method-info">
                  <h4>makeUnsignedNFTOffer(request)</h4>
                  <p>Create unsigned NFT offer with requested payments</p>
                </div>
                
                <div className="method-info">
                  <h4>signOffer(request)</h4>
                  <p>Sign an offer string</p>
                </div>
                
                <div className="method-info">
                  <h4>makeSignedNFTOffer(request)</h4>
                  <p>Complete flow: create and sign NFT offer</p>
                </div>
                
                <div className="method-info">
                  <h4>broadcastSpendBundle(request)</h4>
                  <p>Broadcast signed spend bundle to blockchain</p>
                </div>
              </div>
              
              <p style={{ marginTop: '1rem', color: '#666', fontStyle: 'italic' }}>
                These advanced methods are used internally by the transaction hooks and require 
                specific wallet state and parameters. Use the Transaction tab to test high-level 
                transaction functionality.
              </p>
            </div>
          </div>
        </>
      )}


    </div>
  )
}

export default ClientExample 