# Chia Wallet Hooks Usage Examples

This library now provides a comprehensive set of hooks for external applications to easily integrate with Chia wallet functionality.

## Quick Start

```tsx
import {
  useBalance,
  useSendXCH,
  useNFTs,
  useWalletInfo,
  useChiaUtils
} from 'chia-enclave-wallet-client';

function MyWalletApp() {
  // Basic setup
  const jwtToken = 'your-jwt-token';
  
  // Get wallet info
  const { walletInfo, loading, error } = useWalletInfo({ jwtToken });
  
  // Get balance
  const { balance, refresh } = useBalance({ jwtToken });
  
  // Send XCH functionality
  const { sendXCH, isSending } = useSendXCH({ jwtToken });
  
  // Utility functions
  const { formatXCH } = useChiaUtils();

  if (loading) return <div>Loading wallet...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Wallet Address: {walletInfo?.address}</h2>
      <p>Balance: {formatXCH(balance?.total || 0)} XCH</p>
      <button onClick={() => refresh()}>Refresh Balance</button>
    </div>
  );
}
```

## Balance Hooks

### useBalance - Comprehensive Balance Management

```tsx
import { useBalance, useXCHBalance, useTotalBalance } from 'chia-enclave-wallet-client';

function BalanceComponent() {
  // Get complete balance breakdown
  const { 
    balance, 
    loading, 
    error, 
    refresh, 
    formatBalance, 
    isStale 
  } = useBalance({
    jwtToken: 'your-jwt-token',
    autoRefresh: true,
    refreshInterval: 60000 // 1 minute
  });

  // Get only XCH balance
  const { 
    balance: xchBalance, 
    formattedBalance: xchFormatted,
    coinCount: xchCoins 
  } = useXCHBalance({ jwtToken: 'your-jwt-token' });

  // Get total balance with breakdown
  const { 
    balance: totalBalance,
    breakdown,
    refresh: refreshTotal 
  } = useTotalBalance({ jwtToken: 'your-jwt-token' });

  return (
    <div>
      {balance && (
        <div>
          <h3>Balance Breakdown:</h3>
          <p>Total: {balance.formattedTotal} XCH</p>
          <p>XCH: {balance.formattedXCH} XCH ({balance.xchCoinCount} coins)</p>
          <p>CAT: {balance.formattedCAT} XCH ({balance.catCoinCount} coins)</p>
          <p>NFT: {balance.nftCoinCount} NFTs</p>
          {isStale() && <p>⚠️ Data is stale</p>}
        </div>
      )}
      
      <div>
        <h3>XCH Only:</h3>
        <p>{xchFormatted} ({xchCoins} coins)</p>
      </div>
    </div>
  );
}
```

### useNFTs - NFT Management

```tsx
import { useNFTs, useNFTCollections, useNFTMetadata } from 'chia-enclave-wallet-client';

function NFTGallery() {
  const {
    nfts,
    nftCount,
    loading,
    loadAllMetadata,
    searchNFTs,
    getNFTsByCollection
  } = useNFTs({
    jwtToken: 'your-jwt-token',
    autoLoadMetadata: true,
    autoRefresh: true,
    refreshInterval: 120000 // 2 minutes
  });

  const { collections } = useNFTCollections({ jwtToken: 'your-jwt-token' });

  const handleSearch = (query: string) => {
    const results = searchNFTs(query);
    console.log('Search results:', results);
  };

  return (
    <div>
      <h2>NFT Gallery ({nftCount} NFTs)</h2>
      
      <button onClick={() => loadAllMetadata()}>Load All Metadata</button>
      
      <div>
        <h3>Collections:</h3>
        {collections.map(collection => (
          <div key={collection.name}>
            <h4>{collection.name} ({collection.count})</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {collection.nfts.map(nft => (
                <NFTCard key={nft.coin.parentCoinInfo} nft={nft} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NFTCard({ nft }: { nft: NFTWithMetadata }) {
  const { metadata, loadMetadata } = useNFTMetadata(nft.metadataUri || undefined);

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem' }}>
      {metadata?.image && (
        <img 
          src={metadata.image} 
          alt={metadata.name || 'NFT'} 
          style={{ width: '100%', height: '150px', objectFit: 'cover' }}
        />
      )}
      <h5>{metadata?.name || 'Loading...'}</h5>
      <p>{metadata?.description}</p>
      {nft.metadataLoading && <p>Loading metadata...</p>}
    </div>
  );
}
```

### useTransactions - Transaction Management

```tsx
import { useTransactionHistory, useSendXCH, useBalance } from 'chia-enclave-wallet-client';

function TransactionManager() {
  const { balance } = useBalance({ jwtToken: 'your-jwt-token' });
  
  const {
    transactions,
    addTransaction,
    getPendingTransactions,
    clearHistory
  } = useTransactionHistory({
    autoSave: true,
    maxHistory: 1000
  });

  const {
    sendXCH,
    isSending,
    sendError,
    validateAddress,
    validateAmount,
    estimateFee
  } = useSendXCH({
    jwtToken: 'your-jwt-token',
    onTransactionSent: (transaction) => {
      addTransaction(transaction);
      console.log('Transaction sent:', transaction);
    },
    onTransactionError: (error) => {
      console.error('Transaction error:', error);
    }
  });

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSend = async () => {
    const addressValidation = validateAddress(recipient);
    if (!addressValidation.isValid) {
      alert(addressValidation.error);
      return;
    }

    const amountNum = parseFloat(amount);
    const balanceValidation = validateAmount(amountNum, balance?.total || 0);
    if (!balanceValidation.isValid) {
      alert(balanceValidation.error);
      return;
    }

    const result = await sendXCH({
      recipientAddress: recipient,
      amountXCH: amountNum,
      feeXCH: 0.00001 // or use estimateFee(amountNum)
    });

    if (result.success) {
      alert('Transaction sent successfully!');
      setRecipient('');
      setAmount('');
    } else {
      alert(`Transaction failed: ${result.error}`);
    }
  };

  const pendingTxs = getPendingTransactions();

  return (
    <div>
      <div>
        <h3>Send XCH</h3>
        <input
          type="text"
          placeholder="Recipient address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <input
          type="number"
          placeholder="Amount (XCH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button onClick={handleSend} disabled={isSending}>
          {isSending ? 'Sending...' : 'Send XCH'}
        </button>
        {sendError && <p style={{ color: 'red' }}>Error: {sendError}</p>}
      </div>

      <div>
        <h3>Transaction History ({transactions.length})</h3>
        <p>Pending: {pendingTxs.length}</p>
        <button onClick={clearHistory}>Clear History</button>
        
        {transactions.map(tx => (
          <div key={tx.id} style={{ border: '1px solid #ddd', margin: '0.5rem 0', padding: '0.5rem' }}>
            <div><strong>{tx.type.toUpperCase()}</strong> - {tx.status}</div>
            <div>Amount: {tx.formattedAmount} XCH</div>
            <div>Fee: {tx.formattedFee} XCH</div>
            {tx.recipient && <div>To: {tx.recipient}</div>}
            <div>Time: {new Date(tx.timestamp).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### useWalletInfo & useAddressValidation

```tsx
import { useWalletInfo, useAddressValidation, useMnemonic } from 'chia-enclave-wallet-client';

function WalletInfoComponent() {
  const {
    walletInfo,
    loading,
    error,
    fetchWalletInfo,
    formatAddress,
    isValidAddress
  } = useWalletInfo({
    jwtToken: 'your-jwt-token',
    autoFetch: true
  });

  const {
    validateAddress,
    addressToPuzzleHash,
    formatAddress: formatAddr,
    normalizeAddress
  } = useAddressValidation({
    enablePuzzleHashConversion: true,
    supportTestnet: false
  });

  const {
    mnemonic,
    exportMnemonic,
    clearMnemonic,
    validateMnemonic
  } = useMnemonic({ jwtToken: 'your-jwt-token' });

  const [testAddress, setTestAddress] = useState('');
  const validation = validateAddress(testAddress);

  return (
    <div>
      {walletInfo && (
        <div>
          <h3>Wallet Information</h3>
          <p><strong>Address:</strong> {formatAddress(walletInfo.address)}</p>
          <p><strong>Synthetic Public Key:</strong> {formatAddress(walletInfo.syntheticPublicKey)}</p>
          <p><strong>Puzzle Hash:</strong> {formatAddress(walletInfo.puzzleHash)}</p>
          <p><strong>Email:</strong> {walletInfo.email}</p>
        </div>
      )}

      <div>
        <h3>Address Validation</h3>
        <input
          type="text"
          placeholder="Test address validation"
          value={testAddress}
          onChange={(e) => setTestAddress(e.target.value)}
        />
        <div>
          <p>Valid: {validation.isValid ? '✅' : '❌'}</p>
          {validation.error && <p style={{ color: 'red' }}>{validation.error}</p>}
          {validation.puzzleHash && (
            <p>Puzzle Hash: {formatAddr(validation.puzzleHash)}</p>
          )}
        </div>
      </div>

      <div>
        <h3>Mnemonic Management</h3>
        <button onClick={() => exportMnemonic()}>Export Mnemonic</button>
        <button onClick={() => clearMnemonic()}>Clear from Memory</button>
        {mnemonic && (
          <div style={{ backgroundColor: '#ffe6e6', padding: '1rem', margin: '1rem 0' }}>
            <strong>⚠️ Keep this safe:</strong>
            <pre>{mnemonic}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

### useChiaUtils - Utility Functions

```tsx
import { useChiaUtils, useFormatting, useCalculations } from 'chia-enclave-wallet-client';

function UtilityExample() {
  const {
    mojosToXCH,
    xchToMojos,
    formatXCH,
    selectOptimalCoins,
    calculateCoinId,
    getRelativeTime,
    shortHash
  } = useChiaUtils();

  const {
    formatNumber,
    formatPercentage,
    formatXCHAmount,
    formatTimeAgo,
    formatBytes
  } = useFormatting();

  const {
    calculateOptimalFee,
    calculateTotalValue,
    calculateEfficiency
  } = useCalculations();

  // Example usage
  const mojos = 1000000000000; // 1 XCH in mojos
  const xch = mojosToXCH(mojos); // 1
  const formatted = formatXCH(mojos, { showUnit: true, decimals: 6 }); // "1 XCH"

  return (
    <div>
      <h3>Utility Functions Examples</h3>
      
      <div>
        <h4>Conversions:</h4>
        <p>{mojos} mojos = {xch} XCH</p>
        <p>Formatted: {formatted}</p>
        <p>Compact: {formatXCHAmount(mojos, true)}</p>
      </div>

      <div>
        <h4>Formatting:</h4>
        <p>Number: {formatNumber(1234.567, 2)}</p>
        <p>Percentage: {formatPercentage(0.1523)}</p>
        <p>Time ago: {formatTimeAgo(Date.now() - 3600000)}</p>
        <p>File size: {formatBytes(1024 * 1024)}</p>
      </div>

      <div>
        <h4>Calculations:</h4>
        <p>Optimal fee for 250 byte tx: {calculateOptimalFee(250)} mojos</p>
        <p>Efficiency: {formatPercentage(calculateEfficiency(1100000, 1000000))}</p>
      </div>
    </div>
  );
}
```

## Advanced Usage Patterns

### Shared State Approach

If you want to share wallet state across multiple components, you can create a context provider:

```tsx
import { createContext, useContext, ReactNode } from 'react';
import { useChiaWallet } from 'chia-enclave-wallet-client';

const WalletContext = createContext<ReturnType<typeof useChiaWallet> | null>(null);

export function WalletProvider({ children, jwtToken }: { children: ReactNode; jwtToken: string }) {
  const wallet = useChiaWallet({ 
    jwtToken, 
    autoConnect: true,
    baseUrl: 'https://your-api-endpoint.com'
  });

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
}

// Use in components
function SomeComponent() {
  const { balance, publicKey, refreshWallet } = useWalletContext();
  // ... use wallet state
}
```

### Integration with External Clients

All hooks accept an external client instance for maximum flexibility:

```tsx
import { ChiaCloudWalletClient } from 'chia-enclave-wallet-client';

// Create your own client instance
const client = new ChiaCloudWalletClient({
  baseUrl: 'https://your-custom-endpoint.com',
  enableLogging: true
});

client.setJwtToken('your-jwt-token');

// Pass it to hooks
function MyComponent() {
  const { balance } = useBalance({ client });
  const { nfts } = useNFTs({ client });
  const { sendXCH } = useSendXCH({ client });
  
  // All hooks will use the same client instance
}
```

## Key Features

✅ **Standalone or Shared State**: Hooks can work independently or share a common client/state
✅ **TypeScript Support**: Full TypeScript interfaces and types
✅ **Auto-refresh**: Configurable automatic data refreshing
✅ **Error Handling**: Comprehensive error states and messages
✅ **Caching**: Intelligent caching for NFT metadata and other data
✅ **Utilities**: Rich set of formatting and calculation utilities
✅ **Flexible Configuration**: Each hook accepts various configuration options
✅ **React Best Practices**: Uses proper dependencies, cleanup, and optimization
✅ **Address Validation**: Robust Chia address validation and conversion
✅ **Transaction Management**: Complete transaction lifecycle management

The library provides everything you need to build a full-featured Chia wallet application! 