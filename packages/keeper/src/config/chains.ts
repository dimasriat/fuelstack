import { arbitrumSepolia, baseSepolia } from 'viem/chains';

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  openGate?: string;
  fillGate?: string;
  nativeCurrency: string;
  viemChain: any;
}

// Source chains with OpenGate contracts
export const SOURCE_CHAINS: Record<number, ChainConfig> = {
  // Arbitrum Sepolia
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
    openGate: '0x...', // TODO: Set actual OpenGate contract address after deployment
    nativeCurrency: 'ETH',
    viemChain: arbitrumSepolia
  },
  // Base Sepolia  
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    openGate: '0x...', // TODO: Set actual OpenGate contract address after deployment
    nativeCurrency: 'ETH',
    viemChain: baseSepolia
  }
};

// Destination chain with FillGate contract
export const DESTINATION_CHAIN: ChainConfig = {
  chainId: 421614, // Using Arbitrum Sepolia as destination
  name: 'Arbitrum Sepolia',
  rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
  fillGate: '0x...', // TODO: Set actual FillGate contract address after deployment
  nativeCurrency: 'ETH',
  viemChain: arbitrumSepolia
};

// Helper functions
export function getSourceChain(chainId: number): ChainConfig | undefined {
  return SOURCE_CHAINS[chainId];
}

export function getAllSourceChains(): ChainConfig[] {
  return Object.values(SOURCE_CHAINS);
}

export function getDestinationChain(): ChainConfig {
  return DESTINATION_CHAIN;
}