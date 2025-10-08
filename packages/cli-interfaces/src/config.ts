import dotenv from 'dotenv';

dotenv.config();

// ============================================
// STACKS CONFIGURATION (for future use)
// ============================================
export const WALLET_MNEMONIC_KEY = process.env.WALLET_MNEMONIC_KEY || '';
export const WALLET_PASSWORD = process.env.WALLET_PASSWORD || '';
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
export const CONTRACT_NAME = process.env.CONTRACT_NAME || '';

// ============================================
// EVM CONFIGURATION - Role-based Private Keys
// ============================================

// Private keys for different roles (only secrets in env)
export const SENDER_PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY || '';
if (!SENDER_PRIVATE_KEY) {
  throw new Error('SENDER_PRIVATE_KEY is required for opening orders and minting tokens');
}

export const SOLVER_PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY || '';
if (!SOLVER_PRIVATE_KEY) {
  throw new Error('SOLVER_PRIVATE_KEY is required for filling orders');
}

export const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '';
// Oracle key is optional unless running settle command

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
// CONTRACT ADDRESSES (hardcoded for testing)
// ============================================

// Source Chain: Arbitrum Sepolia
export const SOURCE_CONTRACTS = {
  openGate: '0xc2287A4DF839A6ca7B97202178914208BD1B18E2', // TODO: Update after deployment
  chainRegistry: '0xADe337b0196FE57Adc9Fc31FFA3D47e37cf24842', // TODO: Update after deployment
  usdc: '0x3Ea1d18c1e29F0b18E3cAD01CFd62456Dbb04fe9', // TODO: Update after deployment
};

// Destination Chain: Base Sepolia
export const DESTINATION_CONTRACTS = {
  fillGate: '0xe151FE7360B77973133E2d3D1A0B47A386Ba43Cf', // TODO: Update after deployment
  sbtc: '0x3449353C85500Ee971eE64b193D15eF39BF01f04', // TODO: Update after deployment
};
