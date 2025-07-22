# Chia Wallet Client Examples

This is a comprehensive example and testing application for the Chia Enclave Wallet Client library. It demonstrates all hooks, components, and functionality available in the library.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A valid JWT token from your Chia Enclave Wallet service

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

4. **Enter your JWT token:**
   Paste your JWT token in the input field to begin testing

## 📚 What's Included

### 🌾 Main Features

This example application includes four comprehensive sections:

#### 👛 Wallet Hook Example
- **useChiaWallet** hook demonstration
- Connection management
- Balance and coin display
- Public key information
- Real-time wallet state updates

#### 💸 Transaction Example  
- **useChiaTransactions** hook demonstration
- Send XCH transactions
- Transaction history management
- Address validation
- Fee calculation

#### 🔧 Direct Client Example
- **ChiaCloudWalletClient** direct usage
- All API method testing
- Utility function demonstrations
- Error handling examples
- Health checks and authentication

#### 📋 Dialog System Example
- **Global dialog system** demonstration
- All dialog hooks (send, receive, offers, NFT)
- **ChiaWalletDialogManager** component
- Event logging and state management
- Modal interaction examples

## 🎯 Testing Your JWT Token

The application requires a JWT token to authenticate with the Chia Cloud Wallet API. Here's how to use it:

1. **Get your JWT token** from your Chia Enclave Wallet service
2. **Paste it** in the JWT Token input field
3. **The token is validated** and stored locally in your browser
4. **All examples** automatically use your token for API calls

### JWT Token Features:
- ✅ Format validation
- 🔒 Secure local storage
- 👁️ Show/hide functionality
- 🗑️ Easy clearing
- 💾 Automatic persistence

## 🔧 Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

## 📁 Project Structure

```
examples/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── JwtTokenInput.tsx
│   │   └── styles.css
│   ├── examples/           # Feature examples
│   │   ├── WalletExample.tsx
│   │   ├── TransactionExample.tsx
│   │   ├── ClientExample.tsx
│   │   └── DialogExample.tsx
│   ├── App.tsx            # Main application
│   └── main.tsx           # Entry point
├── package.json
├── vite.config.ts
└── README.md
```

## 🎨 Features Demonstrated

### Core Hooks
- `useChiaWallet` - Main wallet connection and state management
- `useChiaTransactions` - Transaction handling and history  
- All dialog hooks (`useSendDialog`, `useReceiveDialog`, etc.)

### Client Methods
- Health checking
- Public key retrieval  
- Mnemonic export
- Balance and coin queries
- Transaction signing and broadcasting
- Offer creation and management
- Address validation and conversion

### UI Components
- JWT token input with validation
- Responsive design
- Real-time status indicators
- Transaction history display
- Error handling and messaging
- Loading states

## 🔗 Integration Examples

### Basic Wallet Connection
```tsx
import { useChiaWallet } from 'chia-enclave-wallet-client'

function MyComponent() {
  const wallet = useChiaWallet({ autoConnect: true })
  
  React.useEffect(() => {
    wallet.setJwtToken('your-jwt-token')
  }, [])
  
  return (
    <div>
      Balance: {wallet.formatBalance(wallet.balance)} XCH
    </div>
  )
}
```

### Sending Transactions
```tsx
import { useChiaTransactions } from 'chia-enclave-wallet-client'

function SendExample() {
  const transactions = useChiaTransactions(client, coins)
  
  const handleSend = async () => {
    await transactions.sendXCH('xch1...', 0.001, 0.00001)
  }
  
  return <button onClick={handleSend}>Send XCH</button>
}
```

### Dialog System
```tsx
import { useSendDialog } from 'chia-enclave-wallet-client'

function DialogExample() {
  const sendDialog = useSendDialog()
  
  const openSend = () => {
    sendDialog.open({
      initialAmount: 0.001,
      onSuccess: (result) => console.log('Sent!', result)
    })
  }
  
  return <button onClick={openSend}>Send Funds</button>
}
```

## 🐛 Troubleshooting

### Common Issues

**JWT Token Invalid:**
- Ensure token format is correct (3 parts separated by dots)
- Check token hasn't expired
- Verify token is from the correct Chia service

**Connection Errors:**
- Check internet connection
- Verify API endpoint is accessible
- Ensure JWT token has proper permissions

**Transaction Failures:**
- Confirm wallet has sufficient balance
- Check recipient address format
- Verify fee amount is reasonable

## 📖 Documentation

For detailed API documentation, see the main library README and TypeScript definitions.

## 🤝 Contributing

This example project demonstrates the library capabilities. For library contributions, please see the main project repository.

## 📄 License

Same as the main Chia Wallet Client library. 