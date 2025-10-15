import dotenv from 'dotenv';
import { Address } from 'viem';

dotenv.config();

// ============================================
// SOLVER CONFIGURATION
// ============================================

// Destination type: 'evm' or 'stacks'
export const DESTINATION_TYPE = (process.env.DESTINATION_TYPE || 'evm') as 'evm' | 'stacks';

// Solver private key for filling orders (EVM)
export const SOLVER_PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY || '';
if (DESTINATION_TYPE === 'evm' && !SOLVER_PRIVATE_KEY) {
  throw new Error('SOLVER_PRIVATE_KEY is required for EVM fills');
}

// Stacks wallet configuration (for Stacks fills)
export const SOLVER_STACKS_CONFIG = {
  mnemonicKey: process.env.WALLET_MNEMONIC_KEY || '',
  password: process.env.WALLET_PASSWORD || '',
  solverEvmAddress: process.env.SOLVER_EVM_ADDRESS || '',
  recipientAddress: process.env.STACKS_RECIPIENT_ADDRESS || '',
};

if (DESTINATION_TYPE === 'stacks') {
  if (!SOLVER_STACKS_CONFIG.mnemonicKey || !SOLVER_STACKS_CONFIG.password) {
    throw new Error('WALLET_MNEMONIC_KEY and WALLET_PASSWORD required for Stacks fills');
  }
  if (!SOLVER_STACKS_CONFIG.solverEvmAddress) {
    throw new Error('SOLVER_EVM_ADDRESS required for Stacks fills');
  }
  if (!SOLVER_STACKS_CONFIG.recipientAddress) {
    throw new Error('STACKS_RECIPIENT_ADDRESS required for Stacks fills');
  }
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
  arbitrumSepolia: 'https://sepolia-rollup.arbitrum.io/rpc',
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

// Destination Chain: Base Sepolia (EVM)
export const DESTINATION_CONTRACTS = {
  fillGate: '0xe151FE7360B77973133E2d3D1A0B47A386Ba43Cf' as Address,
  sbtc: '0x3449353C85500Ee971eE64b193D15eF39BF01f04' as Address,
};

// Destination Chain: Stacks Testnet
export const STACKS_CONTRACTS = {
  fillGate: {
    address: process.env.STACKS_FILLGATE_ADDRESS || 'ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX',
    name: process.env.STACKS_FILLGATE_NAME || 'fill-gate',
  },
  sbtc: {
    address: process.env.STACKS_SBTC_ADDRESS || 'ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX',
    name: process.env.STACKS_SBTC_NAME || 'mock-sbtc',
  },
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
