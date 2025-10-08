import dotenv from 'dotenv';
import { Address } from 'viem';

dotenv.config();

// ============================================
// SOLVER CONFIGURATION
// ============================================

// Solver private key for filling orders
export const SOLVER_PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY || '';
if (!SOLVER_PRIVATE_KEY) {
  throw new Error('SOLVER_PRIVATE_KEY is required for filling orders');
}

// ============================================
// HARDCODED NETWORK CONFIGURATION  
// ============================================

// Testing Flow: Arbitrum Sepolia (source) → Base Sepolia (destination)

// Chain IDs
export const CHAIN_IDS = {
  arbitrumSepolia: 421614, // Source chain
  baseSepolia: 84532,      // Destination chain
} as const;

// RPC URLs (public endpoints)
export const RPC_URLS = {
  arbitrumSepolia: 'https://arbitrum-sepolia-rpc.publicnode.com',
  baseSepolia: 'https://base-sepolia-rpc.publicnode.com',
};

// Explorer URLs for transaction links
export const EXPLORER_URLS = {
  arbitrumSepolia: 'https://sepolia.arbiscan.io',
  baseSepolia: 'https://sepolia.basescan.org',
};

// ============================================
// CONTRACT ADDRESSES (hardcoded for demo)
// ============================================

// Source Chain: Arbitrum Sepolia
export const SOURCE_CONTRACTS = {
  openGate: '0xc2287A4DF839A6ca7B97202178914208BD1B18E2' as Address,
  usdc: '0x3Ea1d18c1e29F0b18E3cAD01CFd62456Dbb04fe9' as Address,
};

// Destination Chain: Base Sepolia  
export const DESTINATION_CONTRACTS = {
  fillGate: '0xe151FE7360B77973133E2d3D1A0B47A386Ba43Cf' as Address,
  sbtc: '0x3449353C85500Ee971eE64b193D15eF39BF01f04' as Address,
};

// ============================================
// SOLVER SETTINGS
// ============================================

export const SOLVER_CONFIG = {
  // Auto-fill all orders without profitability analysis
  autoFillEnabled: true,
  
  // Maximum gas price willing to pay (in gwei)
  maxGasPrice: 50,
  
  // Delay before filling (milliseconds) - for demo timing
  fillDelay: 5000, // 5 seconds
  
  // Log level for demo visibility
  logLevel: 'verbose'
};
