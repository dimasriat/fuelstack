# FuelStack

**Seamless Cross-Chain Bridge: EVM to Stacks**

> Bridge USDC and WBTC from Arbitrum, Base, and Optimism to acquire STX and sBTC on Stacks — with real-time pricing, instant settlement, and embeddable widgets for any Stacks dApp.

---

## 🌟 Overview

### The Problem

Stacks users face significant friction when trying to access liquidity from EVM chains. Traditional bridges are complex, require multiple steps across different platforms, and offer poor UX. Developers building on Stacks lack simple integration options to onboard users with assets from popular EVM chains like Arbitrum, Base, and Optimism.

### Our Solution

**FuelStack** is an intent-based cross-chain bridge that enables seamless transfers from EVM chains to Stacks. Users lock tokens on EVM chains (Arbitrum, Base, Optimism), and keepers automatically fulfill orders by delivering STX or sBTC on Stacks — all through an intuitive interface with real-time pricing and embedded widget support.

### Key Value Propositions

- **Multi-Chain Support**: Bridge from Arbitrum, Base, and Optimism Sepolia to Stacks
- **Real-Time Pricing**: Dynamic output calculations using live CoinGecko market data
- **Intent-Based Settlement**: Users express intent, keepers compete to fill orders efficiently
- **Embeddable Widgets**: Drop-in components for React and Vanilla JS applications
- **Complete Order Tracking**: Real-time status monitoring from order creation to fulfillment
- **Developer-Friendly**: Simple integration with comprehensive documentation

---

## 🏗️ Architecture

### System Overview

FuelStack uses a **two-contract architecture** with an **oracle-based settlement layer**:

```
┌─────────────────┐
│   EVM Chains    │
│  (Arb, Base,    │
│   Optimism)     │
│                 │
│  OpenGateV2.sol │ ← User locks tokens (USDC/WBTC)
└────────┬────────┘
         │
         │ Order Created (Event)
         │
    ┌────▼─────┐
    │  Keeper  │ ← Listens for orders, fills on Stacks
    │  Service │
    └────┬─────┘
         │
         │ Fills order on Stacks
         │
┌────────▼────────┐
│  Stacks Chain   │
│                 │
│  fill-gate.clar │ ← Keeper delivers STX/sBTC to user
└─────────────────┘
         │
         │ Proof of fill
         │
    ┌────▼─────┐
    │  Oracle  │ ← Verifies fill, triggers settlement
    └────┬─────┘
         │
┌────────▼────────┐
│  OpenGateV2.sol │ ← Releases locked tokens to keeper
└─────────────────┘
```

### Cross-Chain Bridge Flow

1. **Order Creation** (EVM Chain)
   - User approves tokens (USDC or WBTC) on source chain
   - User calls `open()` on OpenGateV2 contract
   - Tokens locked in escrow, order event emitted

2. **Order Fulfillment** (Stacks Chain)
   - Keeper monitors order events via blockchain listeners
   - Keeper calls `fill-native` or `fill-token` on FillGate contract
   - STX or sBTC delivered to recipient's Stacks address

3. **Settlement** (EVM Chain)
   - Oracle verifies fill transaction on Stacks
   - Oracle calls `settle()` on OpenGateV2
   - Locked tokens released to keeper's EVM address

### Smart Contract Architecture

#### **OpenGateV2.sol** (EVM - Solidity)

Deployed on: Arbitrum Sepolia, Base Sepolia, Optimism Sepolia

**Core Functions:**
- `open()` - Create new cross-chain order, lock tokens
- `settle()` - Release tokens to keeper (oracle-only)
- `refund()` - Return tokens if unfilled past deadline

**Key Features:**
- Intent-based order model with unique order IDs
- Support for any ERC20 token input
- Stacks recipient address validation
- Grace period for order fulfillment (5 minutes)
- Oracle-based settlement mechanism

#### **fill-gate.clar** (Stacks - Clarity)

Deployed on: Stacks Testnet

**Core Functions:**
- `fill-native` - Fill order with native STX
- `fill-token` - Fill order with SIP-010 tokens (sBTC)

**Key Features:**
- Duplicate fill prevention via order ID tracking
- Deadline validation with grace period
- Support for both native STX and sBTC
- Event emission for oracle verification

---

## ✨ Core Features

### 1. Multi-Chain Bridge Interface

**Bridge Page** - Complete user flow for cross-chain transfers

- **Chain Selection**: Arbitrum Sepolia, Base Sepolia, Optimism Sepolia
- **Token Selection**: USDC, WBTC (EVM) → STX, sBTC (Stacks)
- **Amount Input**: User-specified amounts with balance checking
- **Real-Time Pricing**: Live calculations via CoinGecko API
- **Two-Step Process**: Token approval → Bridge transaction
- **Order Tracking**: Automatic status monitoring and updates

**Features:**
- Wallet integration via RainbowKit (MetaMask, WalletConnect, etc.)
- Responsive design optimized for mobile and desktop
- Transaction links to block explorers (EVM + Stacks)
- Real-time order status polling (OPENED → FILLED)
- Error handling and user feedback

### 2. Real-Time Dynamic Pricing

**Price Service** - CoinGecko API integration for accurate conversions

```typescript
// Conversion Examples (at current market prices):
USDC → STX:  $100 USDC → 230.41 STX
USDC → sBTC: $100 USDC → 0.000926 sBTC
WBTC → STX:  1 WBTC → $107,996 → 248,612 STX
WBTC → sBTC: 1 WBTC → 1 sBTC (1:1 ratio)
```

**Features:**
- API: `api.coingecko.com/api/v3/simple/price`
- Price caching with 60-second TTL
- Automatic fallback to cached prices on API errors
- Display of current BTC and STX prices
- Contract-compatible amount formatting (18 decimals STX, 8 decimals sBTC)

### 3. Test Token Faucet

**Faucet Page** - Mint testnet tokens for development and testing

- **Supported Chains**: Arbitrum, Base, Optimism Sepolia
- **Available Tokens**: USDC (1000 per mint), WBTC (10 per mint)
- **One-Click Minting**: Single transaction to receive tokens
- **Balance Display**: Real-time balance updates after minting

### 4. Order Explorer

**Explorer Page** - Comprehensive order tracking and history

- **Order List**: All user orders with detailed information
- **Status Tracking**: OPENED (pending) vs FILLED (complete)
- **Transaction Links**: Direct links to both EVM and Stacks explorers
- **Auto-Refresh**: 10-second polling for status updates
- **Statistics**: Total orders, opened count, filled count

**Displayed Information:**
- Order ID
- Source chain
- Token amounts (input → output)
- Stacks recipient address
- Order status with visual indicators
- Creation timestamp
- Transaction hashes (EVM + Stacks)

### 5. Widget Integration

**Widget Page** - Documentation and examples for developers

Three integration options for Stacks dApp developers:

#### **Embedded Widget (React)**
```typescript
import { FuelStackWidget } from '@fuelstack/widget';

<FuelStackWidget
  chains={['arbitrum', 'base', 'optimism']}
  defaultToken="USDC"
  theme="dark"
  onSuccess={(order) => console.log('Bridge order created:', order)}
/>
```

#### **Embedded Widget (Vanilla JS)**
```html
<script src="https://unpkg.com/@fuelstack/widget@latest/dist/widget.js"></script>
<div id="fuelstack-widget"></div>

<script>
  FuelStack.init({
    container: '#fuelstack-widget',
    chains: ['arbitrum', 'base', 'optimism'],
    theme: 'dark'
  });
</script>
```

#### **Modal Widget**
```typescript
import { FuelStackButton } from '@fuelstack/widget';

<FuelStackButton variant="primary" theme="dark">
  Bridge Assets
</FuelStackButton>
```

**Widget Features:**
- Syntax-highlighted code examples
- Live interactive previews
- Copy-to-clipboard functionality
- Configuration reference table
- Use case examples

---

## 🛠️ Technology Stack

### **Frontend**

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS with custom design system
- **Web3 Integration**:
  - Wagmi v2 (React hooks for Ethereum)
  - Viem (TypeScript library for Ethereum)
  - RainbowKit (wallet connection UI)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **State Management**: React hooks (useState, useEffect)

### **Smart Contracts**

**EVM Contracts (Solidity ^0.8.13)**
- OpenGateV2.sol - Order creation and settlement
- MockERC20.sol - Test token contracts
- Development: Foundry (Forge, Cast)

**Stacks Contracts (Clarity)**
- fill-gate.clar - Order fulfillment
- mock-sbtc.clar - Test sBTC token
- Development: Clarinet

### **Backend Services**

- **Keeper Service**: TypeScript-based order fulfillment engine
- **Oracle Service**: Cross-chain transaction verification
- **Database**: Order state tracking and history
- **Event Listeners**: Real-time blockchain monitoring

### **External APIs**

- **CoinGecko API**: Cryptocurrency price data
- **Hiro API**: Stacks blockchain data and transaction verification
- **Block Explorers**:
  - Arbiscan (Arbitrum)
  - Basescan (Base)
  - Optimism Etherscan (Optimism)
  - Hiro Explorer (Stacks)

---

## 📦 Project Structure

FuelStack is organized as a **pnpm monorepo** with the following packages:

```
fuelstack/
├── packages/
│   ├── interface/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/ # Reusable UI components
│   │   │   ├── pages/      # Bridge, Faucet, Explorer, Widget
│   │   │   ├── lib/        # Contracts, price service, order tracking
│   │   │   └── App.tsx     # Main application with routing
│   │   └── package.json
│   │
│   ├── solidity/           # EVM smart contracts
│   │   ├── src/
│   │   │   ├── OpenGateV2.sol
│   │   │   ├── OpenGate.sol
│   │   │   ├── MockERC20.sol
│   │   │   └── ChainRegistry.sol
│   │   ├── test/
│   │   └── foundry.toml
│   │
│   ├── clarity/            # Stacks smart contracts
│   │   ├── contracts/
│   │   │   ├── fill-gate.clar
│   │   │   └── mock-sbtc.clar
│   │   └── Clarinet.toml
│   │
│   ├── keeper/             # Order fulfillment service
│   │   ├── src/
│   │   │   ├── listeners/  # Blockchain event monitoring
│   │   │   ├── managers/   # Order state management
│   │   │   ├── settlers/   # Settlement logic
│   │   │   └── validators/ # Order validation
│   │   └── package.json
│   │
│   ├── solver/             # Oracle service for verification
│   │   └── src/
│   │
│   └── cli-interfaces/     # Command-line tools
│       └── src/
│
├── package.json            # Monorepo root configuration
├── pnpm-workspace.yaml     # Workspace configuration
└── README.md               # This file
```

### Package Overview

| Package | Description | Tech Stack |
|---------|-------------|------------|
| **interface** | User-facing web application | React, TypeScript, Wagmi, Tailwind |
| **solidity** | EVM smart contracts | Solidity, Foundry, OpenZeppelin |
| **clarity** | Stacks smart contracts | Clarity, Clarinet |
| **keeper** | Order fulfillment engine | TypeScript, Node.js |
| **solver** | Oracle verification service | TypeScript, Node.js |
| **cli-interfaces** | Development utilities | TypeScript, Node.js |

---

## 🎯 User Journey

### **Scenario**: User wants to bridge 100 USDC from Arbitrum to STX on Stacks

1. **Visit FuelStack Bridge**
   - Connect EVM wallet (MetaMask, WalletConnect, etc.)
   - Select source chain: Arbitrum Sepolia

2. **Get Test Tokens** (if needed)
   - Navigate to Faucet page
   - Mint 1000 USDC on Arbitrum Sepolia
   - Return to Bridge page

3. **Configure Bridge Transfer**
   - Select input token: USDC
   - Enter amount: 100 USDC
   - Select output token: STX
   - See real-time calculation: ~230.41 STX (based on current prices)
   - Enter Stacks recipient address (e.g., ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)

4. **Execute Bridge**
   - Step 1: Approve USDC spending (one-time per token)
     - Confirm transaction in wallet
     - Wait for confirmation (~few seconds on testnet)
   - Step 2: Bridge tokens
     - Confirm bridge transaction in wallet
     - Order created on Arbitrum with unique order ID
     - View transaction on Arbiscan

5. **Track Order Status**
   - Automatic status monitoring (polling every 10 seconds)
   - Order status: OPENED → waiting for keeper
   - Navigate to Explorer to see order history

6. **Order Fulfillment**
   - Keeper detects order via event listener
   - Keeper fills order on Stacks (delivers 230.41 STX)
   - Order status updates to: FILLED
   - View fill transaction on Hiro Explorer

7. **Completion**
   - Receive 230.41 STX in Stacks wallet
   - Keeper receives 100 USDC on Arbitrum (via oracle settlement)
   - Order complete!

**Total Time**: ~1-2 minutes (testnet)

---

## 📋 Smart Contract Details

### **OpenGateV2.sol** (EVM)

**Contract Address (Arbitrum Sepolia)**: `0x842876202cd586d8e0ae44fb45a22479af17d1a5`

**Key State Variables:**
```solidity
uint256 public orderCounter;              // Sequential order IDs
mapping(uint256 => Order) public orders;  // Order details
mapping(uint256 => bytes32) public orderStatus; // OPENED/SETTLED/REFUNDED
address public trustedOracle;             // Oracle for settlement
```

**Order Struct:**
```solidity
struct Order {
    address sender;           // User who created order
    address tokenIn;          // ERC20 token locked (USDC/WBTC)
    uint256 amountIn;         // Amount locked
    address tokenOut;         // Destination token (0x0 for STX)
    uint256 amountOut;        // Expected output amount
    string recipient;         // Stacks principal address
    uint256 fillDeadline;     // Deadline for fulfillment
    uint256 sourceChainId;    // Chain ID where order was created
}
```

**Events:**
```solidity
event OrderOpened(
    uint256 indexed orderId,
    address indexed sender,
    address indexed tokenIn,
    uint256 amountIn,
    address tokenOut,
    uint256 amountOut,
    string recipient,
    uint256 fillDeadline,
    uint256 sourceChainId
);

event OrderSettled(
    uint256 indexed orderId,
    address indexed solverRecipient,
    uint256 sourceChainId
);

event OrderRefunded(
    uint256 indexed orderId,
    address indexed sender
);
```

### **fill-gate.clar** (Stacks)

**Contract Principal (Stacks Testnet)**: `ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX.fill-gate`

**Key Functions:**

```clarity
;; Fill order with native STX
(define-public (fill-native
    (order-id uint)
    (amount-out uint)
    (recipient principal)
    (solver-origin-address (string-ascii 42))
    (fill-deadline uint)
    (source-chain-id uint))
  ;; Implementation...
)

;; Fill order with SIP-010 token (sBTC)
(define-public (fill-token
    (order-id uint)
    (token-out <sip-010-trait>)
    (amount-out uint)
    (recipient principal)
    (solver-origin-address (string-ascii 42))
    (fill-deadline uint)
    (source-chain-id uint))
  ;; Implementation...
)
```

**State Maps:**
```clarity
;; Track filled orders to prevent duplicates
(define-map order-status uint uint)

;; Track source chain for each order
(define-map order-source-chain uint uint)
```

**Validations:**
- Order not already filled (prevent double-spend)
- Deadline not exceeded (with 5-minute grace period)
- Sufficient token balance/allowance for keeper

---

## 🎨 Widget Integration Guide

### **Installation**

```bash
npm install @fuelstack/widget
# or
yarn add @fuelstack/widget
```

### **React Integration**

```tsx
import { FuelStackWidget } from '@fuelstack/widget';
import '@fuelstack/widget/styles.css';

function App() {
  return (
    <FuelStackWidget
      chains={['arbitrum', 'base', 'optimism']}
      defaultToken="USDC"
      defaultOutput="stx"
      theme="dark"
      onSuccess={(order) => {
        console.log('Bridge order created:', order);
      }}
      onError={(error) => {
        console.error('Bridge error:', error);
      }}
    />
  );
}
```

### **Vanilla JavaScript Integration**

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/@fuelstack/widget@latest/dist/styles.css">
</head>
<body>
  <div id="fuelstack-widget"></div>

  <script src="https://unpkg.com/@fuelstack/widget@latest/dist/widget.js"></script>
  <script>
    FuelStack.init({
      container: '#fuelstack-widget',
      chains: ['arbitrum', 'base', 'optimism'],
      defaultToken: 'USDC',
      theme: 'dark',
      onSuccess: (order) => {
        console.log('Bridge order created:', order);
      }
    });
  </script>
</body>
</html>
```

### **Modal Integration**

```tsx
import { FuelStackButton } from '@fuelstack/widget';
import '@fuelstack/widget/styles.css';

function App() {
  return (
    <FuelStackButton
      variant="primary"
      chains={['arbitrum', 'base', 'optimism']}
      theme="dark"
      onSuccess={(order) => {
        console.log('Order created:', order);
      }}
    >
      Bridge Assets
    </FuelStackButton>
  );
}
```

### **Widget Configuration**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chains` | `string[]` | `all` | Supported EVM chains to show |
| `defaultToken` | `string` | `'USDC'` | Default token selection |
| `defaultOutput` | `string` | `'stx'` | Output type: 'stx' or 'sbtc' |
| `theme` | `string` | `'dark'` | Theme: 'dark' or 'light' |
| `recipient` | `string` | - | Pre-fill Stacks address |
| `onSuccess` | `function` | - | Callback when order is created |
| `onError` | `function` | - | Callback on error |
| `compact` | `boolean` | `false` | Show compact widget version |

---

## 🚀 Demo Highlights

### **Key Features to Showcase**

1. **Seamless Multi-Chain Experience**
   - Switch between Arbitrum, Base, Optimism with single click
   - Consistent UX across all chains
   - Real-time balance and allowance checking

2. **Dynamic Pricing Excellence**
   - Live price feeds from CoinGecko
   - Accurate conversion calculations
   - Display of current market rates
   - 60-second cache for performance

3. **Complete Order Lifecycle**
   - Order creation with unique ID
   - Real-time status monitoring
   - Automatic fulfillment detection
   - Transaction links to both chains

4. **Developer-Friendly Integration**
   - Three widget types (embedded React, embedded Vanilla, modal)
   - Comprehensive documentation with live previews
   - Syntax-highlighted code examples
   - Copy-to-clipboard for quick integration

5. **Professional UI/UX**
   - Modern glassmorphism design
   - Responsive mobile-first layout
   - Smooth animations and transitions
   - Clear status indicators and feedback

### **Technical Innovation Highlights**

1. **Intent-Based Architecture**
   - Users express intent, keepers compete to fulfill
   - No need for liquidity pools or AMMs
   - Efficient cross-chain settlement

2. **Two-Contract Design**
   - Isolated source chain contracts (OpenGateV2)
   - Single destination contract (FillGate)
   - Oracle-based settlement verification

3. **Stacks Address Validation**
   - On-chain validation of Stacks principal format
   - Prevents invalid recipient addresses
   - Ensures successful token delivery

4. **Grace Period Mechanism**
   - 5-minute buffer for order fulfillment
   - Prevents premature refunds
   - Accounts for blockchain finality times

5. **Event-Driven Keeper System**
   - Real-time order detection via event listeners
   - Automated fulfillment workflow
   - Proof-of-fill verification for settlement

---

## 💡 Use Cases

### **1. DeFi Applications**

**Scenario**: Stacks DeFi protocol needs liquidity from EVM users

**Implementation**:
```tsx
<FuelStackWidget
  defaultOutput="sbtc"
  recipient={userStacksAddress}
  onSuccess={(order) => {
    // Redirect to staking interface
    router.push('/stake');
  }}
/>
```

**Benefits**:
- Users acquire sBTC for DeFi protocols without leaving dApp
- Seamless onboarding from EVM chains
- Increased liquidity and user base

### **2. NFT Marketplaces**

**Scenario**: Stacks NFT marketplace wants to accept payments from EVM users

**Implementation**:
```tsx
<FuelStackButton variant="primary" defaultOutput="stx">
  Get STX to Buy NFT
</FuelStackButton>
```

**Benefits**:
- Users can bridge STX directly from marketplace
- Reduces friction in NFT purchases
- Expands buyer base to EVM users

### **3. Gaming Platforms**

**Scenario**: Stacks-based game needs players to acquire in-game currency (STX)

**Implementation**:
```tsx
<FuelStackWidget
  chains={['arbitrum', 'base']}
  defaultToken="USDC"
  defaultOutput="stx"
  theme="dark"
  compact={true}
/>
```

**Benefits**:
- Gamers bridge assets from preferred EVM chains
- Simplified onboarding for new players
- Support for multiple source chains

### **4. General Stacks Ecosystem Integration**

**Scenario**: Any Stacks dApp wants to enable EVM → Stacks bridging

**Implementation**:
- Add `@fuelstack/widget` package
- Drop in widget with 5 lines of code
- Customize for brand theme and use case

**Benefits**:
- Instant cross-chain functionality
- No need to build custom bridge
- Focus on core product development

---

**Built with ❤️ for the Stacks ecosystem**
