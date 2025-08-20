# Project Context: Chia Enclave Wallet Client

## Current State
Working on redesigning the TakeOfferWidget component to implement proper UI/UX design patterns.

## Key Components Architecture
- **TakeOfferWidget**: Currently in MVP state, needs complete redesign with multiple states
- **Modal System**: Uses shared modal styles from `modal-styles.ts` with consistent dark theme
- **Design Patterns**: Dark theme (#1a1a1a background), consistent spacing, card-based layouts

## Current Design System
- **Colors**: Dark theme with #1a1a1a background, #262626 cards, #333 borders
- **Buttons**: Primary (#6bc36b), Secondary (#333), Danger (red variants)
- **Layout**: Card-based design with 16px padding, 12px border radius
- **Typography**: White text, #888 labels, monospace for technical data

## NFT Image Display Patterns
- Uses `nft-image` class for main display
- Supports IPFS URL conversion via `convertIpfsUrl` utility
- Placeholder emoji 🖼️ for missing images
- Loading states with spinner
- Error handling with fallback display

## TakeOfferWidget States Required
1. **Initial Card**: NFT image (2/3 height), name, price, "Buy now" button
2. **Loading**: Centered spinner during wallet connection
3. **Connection Error**: Error message with "Try again" button  
4. **Transaction Details**: Name, price, wallet addresses, balance with expandable coin details

## Key Data Structures
- `DexieOfferData`: Contains offer details, status, pricing
- `NFTMetadata`: Contains NFT information and attributes
- `HydratedCoin`: Wallet coin data with amounts and IDs
