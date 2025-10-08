# FuelStack Solver

Automated solver for FuelStack Intent Bridge that listens for new orders and fills them automatically.

## Overview

This solver competes with other solvers by:
1. 👂 **Listening** for `OrderOpened` events on source chains (Arbitrum Sepolia)
2. 💫 **Filling** orders automatically on destination chains (Base Sepolia)  
3. 🚀 **Racing** other solvers to capture profitable opportunities

## Demo Mode

This is a hackathon demo version that auto-fills ALL orders without profitability analysis for smooth demonstration.

## Setup

1. **Install dependencies:**
```bash
cd packages/solver
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your SOLVER_PRIVATE_KEY
```

3. **Start the solver:**
```bash
npm run dev
```

## Usage

The solver automatically:
- Monitors Arbitrum Sepolia for new `OrderOpened` events
- Validates order details and checks balances
- Executes fill transactions on Base Sepolia
- Handles both native ETH and sBTC token fills

## Testing Flow

1. **Start the solver:** `npm run dev`
2. **Create an order:** Use cli-interfaces `pnpm dev open-order --amount-in 100 --amount-out 0.05 --token-out native`
3. **Watch it fill:** Solver will automatically detect and fill the order
4. **Settlement:** Oracle will settle with `pnpm dev settle-order`

## Configuration

See `src/config.ts` for:
- Contract addresses
- RPC endpoints  
- Solver behavior settings
- Auto-fill delay (for demo timing)

## Architecture

```
src/
├── index.ts        # Main entry point
├── config.ts       # Configuration and constants
├── listener.ts     # Event listener for OrderOpened
├── filler.ts       # Order filling logic
├── utils.ts        # Utilities (clients, formatting)
└── abis/           # Contract ABIs
```

## Demo Features

- 🎯 **Auto-fill enabled** - Fills every order automatically
- ⏱️ **Fill delay** - 5 second delay for demo visibility  
- 📊 **Verbose logging** - Detailed console output for demos
- 🏁 **Race conditions** - Competes with other solvers

## Next Steps

For production use, add:
- Profitability analysis
- Risk management
- Advanced strategies
- Database persistence
- Monitoring and alerts