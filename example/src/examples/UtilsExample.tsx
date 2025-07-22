import React, { useState, useCallback } from 'react'
import { 
  useChiaUtils,
  useFormatting,
  useCalculations,
  useBalance,
  type CoinSelection,
  type FormatOptions
} from '../../../src'

interface UtilsExampleProps {
  jwtToken: string
}

const UtilsExample: React.FC<UtilsExampleProps> = ({ jwtToken }) => {
  const [testAmount, setTestAmount] = useState('1000000000000') // 1 XCH in mojos
  const [testXCH, setTestXCH] = useState('1.5')
  const [testAddress, setTestAddress] = useState('')
  const [testHash, setTestHash] = useState('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
  const [testTimestamp, setTestTimestamp] = useState(Date.now() - 3600000) // 1 hour ago
  const [testBytes, setTestBytes] = useState(1048576) // 1 MB

  // Get balance data for display purposes only
  const { balance } = useBalance({ jwtToken })

  // Create sample coins for demonstration
  const sampleCoins = [
    { parentCoinInfo: 'sample1', puzzleHash: 'puzzle1', amount: '1000000000000' }, // 1 XCH
    { parentCoinInfo: 'sample2', puzzleHash: 'puzzle2', amount: '500000000000' },  // 0.5 XCH
    { parentCoinInfo: 'sample3', puzzleHash: 'puzzle3', amount: '250000000000' },  // 0.25 XCH
  ]

  // Utility hooks
  const {
    mojosToXCH,
    xchToMojos,
    formatXCH,
    formatMojos,
    formatAddress,
    isValidAddress,
    selectOptimalCoins,
    estimateTransactionSize,
    formatTimestamp,
    getRelativeTime,
    shortHash
  } = useChiaUtils()

  const {
    formatNumber,
    formatPercentage,
    formatCurrency,
    formatXCHBalance,
    formatXCHAmount,
    formatBytes,
    formatDuration,
    formatDateTime,
    formatTimeAgo,
    formatTransactionStatus,
    formatBlockHeight
  } = useFormatting()

  const {
    calculateOptimalFee,
    calculateFeeRate,
    calculateTotalValue,
    calculateAverageValue,
    calculateTransactionCost,
    calculateNetAmount,
    calculateEfficiency,
    calculateWasteRatio
  } = useCalculations()

  // Example coin selection using sample coins
  const testCoinSelection = useCallback(() => {
    const targetAmount = parseInt(testAmount)
    const selection = selectOptimalCoins(sampleCoins, targetAmount)
    
    if (selection) {
      alert(`Selected ${selection.selectedCoins.length} coins (${formatXCH(selection.totalAmount)} XCH) with ${formatXCH(selection.changeAmount)} XCH change. Efficiency: ${formatPercentage(selection.efficiency)}`)
    } else {
      alert('Insufficient coins for target amount (sample coins total: 1.75 XCH)')
    }
  }, [testAmount, selectOptimalCoins, formatXCH, formatPercentage])

  // Format options for demonstration
  const formatOptions: FormatOptions[] = [
    { decimals: 2, removeTrailingZeros: true, showUnit: false },
    { decimals: 6, removeTrailingZeros: true, showUnit: true },
    { decimals: 4, removeTrailingZeros: false, showUnit: true, shortFormat: true }
  ]

  return (
    <div className="example-container">
      <div className="example-header">
        <h2>🔧 Utils & Formatting Hooks</h2>
        <p>Comprehensive utility functions for formatting, calculations, and coin management</p>
      </div>

      {/* Conversion Utilities */}
      <div className="example-section">
        <h3>🔄 Conversion Utilities</h3>
        
        <div className="input-group">
          <label>Test Amount (mojos):</label>
          <input
            type="text"
            value={testAmount}
            onChange={(e) => setTestAmount(e.target.value)}
            placeholder="Enter amount in mojos"
          />
        </div>
        
        <div className="input-group">
          <label>Test XCH Amount:</label>
          <input
            type="number"
            value={testXCH}
            onChange={(e) => setTestXCH(e.target.value)}
            placeholder="Enter XCH amount"
            step="0.000001"
          />
        </div>

        <div className="results-grid">
          <div className="result-card">
            <h4>Mojos to XCH</h4>
            <p><strong>Input:</strong> {testAmount} mojos</p>
            <p><strong>Output:</strong> {mojosToXCH(testAmount)} XCH</p>
          </div>

          <div className="result-card">
            <h4>XCH to Mojos</h4>
            <p><strong>Input:</strong> {testXCH} XCH</p>
            <p><strong>Output:</strong> {xchToMojos(parseFloat(testXCH))} mojos</p>
          </div>

          <div className="result-card">
            <h4>Format Mojos</h4>
            <p><strong>Raw:</strong> {testAmount}</p>
            <p><strong>Formatted:</strong> {formatMojos(testAmount)}</p>
          </div>
        </div>

        <div className="format-options">
          <h4>XCH Formatting Options:</h4>
          {formatOptions.map((options, index) => (
            <div key={index} className="format-example">
              <strong>Options {index + 1}:</strong> {formatXCH(testAmount, options)}
              <small> (decimals: {options.decimals}, showUnit: {options.showUnit ? 'true' : 'false'}, shortFormat: {options.shortFormat ? 'true' : 'false'})</small>
            </div>
          ))}
        </div>
      </div>

      {/* Address & Hash Utilities */}
      <div className="example-section">
        <h3>📍 Address & Hash Utilities</h3>
        
        <div className="input-group">
          <label>Test Address:</label>
          <input
            type="text"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            placeholder="Enter Chia address"
          />
        </div>
        
        <div className="input-group">
          <label>Test Hash:</label>
          <input
            type="text"
            value={testHash}
            onChange={(e) => setTestHash(e.target.value)}
            placeholder="Enter hash to shorten"
          />
        </div>

        <div className="results-grid">
          <div className="result-card">
            <h4>Address Formatting</h4>
            <p><strong>Full:</strong> {testAddress}</p>
            <p><strong>Short (10):</strong> {formatAddress(testAddress, 10)}</p>
            <p><strong>Short (6):</strong> {formatAddress(testAddress, 6)}</p>
            <p><strong>Valid:</strong> {isValidAddress(testAddress) ? '✅' : '❌'}</p>
          </div>

          <div className="result-card">
            <h4>Hash Shortening</h4>
            <p><strong>Full:</strong> <code>{testHash}</code></p>
            <p><strong>Short (8):</strong> <code>{shortHash(testHash, 8)}</code></p>
            <p><strong>Short (4):</strong> <code>{shortHash(testHash, 4)}</code></p>
          </div>
        </div>
      </div>

      {/* Formatting Utilities */}
      <div className="example-section">
        <h3>🎨 Formatting Utilities</h3>
        
        <div className="input-group">
          <label>Test Timestamp:</label>
          <input
            type="number"
            value={testTimestamp}
            onChange={(e) => setTestTimestamp(parseInt(e.target.value))}
            placeholder="Enter timestamp"
          />
          <button onClick={() => setTestTimestamp(Date.now())}>Use Now</button>
        </div>
        
        <div className="input-group">
          <label>Test Bytes:</label>
          <input
            type="number"
            value={testBytes}
            onChange={(e) => setTestBytes(parseInt(e.target.value))}
            placeholder="Enter bytes"
          />
        </div>

        <div className="results-grid">
          <div className="result-card">
            <h4>Number Formatting</h4>
            <p><strong>Number:</strong> {formatNumber(1234567.89, 2)}</p>
            <p><strong>Percentage:</strong> {formatPercentage(0.1234)}</p>
            <p><strong>Currency:</strong> {formatCurrency(1234.56)}</p>
            <p><strong>Block Height:</strong> {formatBlockHeight(3847292)}</p>
          </div>

          <div className="result-card">
            <h4>XCH Formatting</h4>
            <p><strong>Balance:</strong> {formatXCHBalance(testAmount)}</p>
            <p><strong>Amount (normal):</strong> {formatXCHAmount(testAmount, false)}</p>
            <p><strong>Amount (compact):</strong> {formatXCHAmount(testAmount, true)}</p>
          </div>

          <div className="result-card">
            <h4>Time Formatting</h4>
            <p><strong>Timestamp:</strong> {formatTimestamp(testTimestamp)}</p>
            <p><strong>Relative:</strong> {getRelativeTime(testTimestamp)}</p>
            <p><strong>DateTime:</strong> {formatDateTime(testTimestamp)}</p>
            <p><strong>Time Ago:</strong> {formatTimeAgo(testTimestamp)}</p>
            <p><strong>Duration:</strong> {formatDuration(testTimestamp - Date.now())}</p>
          </div>

          <div className="result-card">
            <h4>Size & Status</h4>
            <p><strong>Bytes:</strong> {formatBytes(testBytes)}</p>
            <p><strong>Status:</strong> {formatTransactionStatus('pending')}</p>
            <p><strong>Status:</strong> {formatTransactionStatus('confirmed')}</p>
            <p><strong>Status:</strong> {formatTransactionStatus('in_mempool')}</p>
          </div>
        </div>
      </div>

      {/* Calculation Utilities */}
      <div className="example-section">
        <h3>🧮 Calculation Utilities</h3>

        <div className="results-grid">
          <div className="result-card">
            <h4>Fee Calculations</h4>
            <p><strong>Optimal Fee (250 bytes):</strong> {calculateOptimalFee(250)} mojos</p>
            <p><strong>Fee Rate:</strong> {calculateFeeRate(1000000, 250)} mojos/byte</p>
            <p><strong>Transaction Cost:</strong> {calculateTransactionCost(parseInt(testAmount), 1000000)} mojos</p>
            <p><strong>Net Amount:</strong> {calculateNetAmount(parseInt(testAmount), 1000000)} mojos</p>
          </div>

          <div className="result-card">
            <h4>Efficiency Calculations</h4>
            <p><strong>Efficiency (90%):</strong> {formatPercentage(calculateEfficiency(1100000, 1000000))}</p>
            <p><strong>Waste Ratio (10%):</strong> {formatPercentage(calculateWasteRatio(100000, 1000000))}</p>
          </div>

          <div className="result-card">
            <h4>Transaction Utilities</h4>
            <p><strong>Est. Size (2 in, 2 out):</strong> {estimateTransactionSize(2, 2)} bytes</p>
            <p><strong>Est. Size (5 in, 1 out):</strong> {estimateTransactionSize(5, 1)} bytes</p>
          </div>
        </div>

                 <div className="coin-calculations">
           <h4>Coin Calculations (sample data):</h4>
           <div className="results-grid">
             <div className="result-card">
               <h4>Coin Statistics</h4>
               <p><strong>Total Value:</strong> {formatXCH(calculateTotalValue(sampleCoins))} XCH</p>
               <p><strong>Average Value:</strong> {formatXCH(calculateAverageValue(sampleCoins))} XCH</p>
               <p><strong>Coin Count:</strong> {sampleCoins.length}</p>
             </div>
           </div>

           <button onClick={testCoinSelection}>
             🎯 Test Optimal Coin Selection (for {formatXCH(testAmount)} XCH)
           </button>
         </div>
      </div>

      {/* Hook Usage Examples */}
      <div className="example-section">
        <h3>💻 Hook Usage Examples</h3>
        <div className="code-examples">
          <h4>Basic Utils Hook:</h4>
          <pre className="code-block">{`// Conversion utilities
const { mojosToXCH, xchToMojos, formatXCH } = useChiaUtils();

// Convert amounts
const xch = mojosToXCH(1000000000000); // 1 XCH
const mojos = xchToMojos(1.5); // "1500000000000"

// Format with options
const formatted = formatXCH(1000000000000, {
  decimals: 6,
  showUnit: true,
  shortFormat: false
}); // "1 XCH"

// Address and hash utilities
const short = shortHash(longHash, 8);
const isValid = isValidAddress(address);`}</pre>

          <h4>Formatting Hook:</h4>
          <pre className="code-block">{`// Rich formatting functions
const {
  formatNumber,
  formatPercentage,
  formatBytes,
  formatTimeAgo
} = useFormatting();

// Format various data types
const number = formatNumber(1234.567, 2); // "1,234.57"
const percent = formatPercentage(0.1523); // "15.23%"
const size = formatBytes(1048576); // "1.00 MB"
const time = formatTimeAgo(timestamp); // "2h ago"`}</pre>

          <h4>Calculations Hook:</h4>
          <pre className="code-block">{`// Fee and efficiency calculations
const {
  calculateOptimalFee,
  calculateEfficiency,
  calculateTotalValue
} = useCalculations();

// Calculate optimal fee for transaction size
const fee = calculateOptimalFee(250); // bytes

// Calculate efficiency ratio
const efficiency = calculateEfficiency(selected, required);

// Calculate total value of coins
const total = calculateTotalValue(coins);`}</pre>
        </div>
      </div>

      {/* Interactive Playground */}
      <div className="example-section">
        <h3>🎮 Interactive Playground</h3>
        <p>Use the inputs above to test different values and see how the formatting and calculations change in real-time!</p>
        
        <div className="playground-tips">
          <h4>💡 Tips:</h4>
          <ul>
            <li>Try different mojo amounts to see XCH conversion</li>
            <li>Test address formatting with real Chia addresses</li>
            <li>Experiment with timestamps (use Unix timestamps)</li>
            <li>Test byte formatting with different file sizes</li>
            <li>See how fee calculations change with transaction size</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UtilsExample 