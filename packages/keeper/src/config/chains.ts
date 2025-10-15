import { arbitrumSepolia } from 'viem/chains';

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  openGate?: string;
  fillGate?: string;
  nativeCurrency: string;
  viemChain: any;
}

export interface StacksChainConfig {
  network: 'testnet' | 'mainnet';
  name: string;
  apiUrl: string;
  fillGateAddress: string;
  fillGateName: string;
  nativeCurrency: string;
}

// Source chains with OpenGate contracts
export const SOURCE_CHAINS: Record<number, ChainConfig> = {
  // Arbitrum Sepolia
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    openGate: '0xc2287A4DF839A6ca7B97202178914208BD1B18E2', // TODO: Set actual OpenGate contract address after deployment
    nativeCurrency: 'ETH',
    viemChain: arbitrumSepolia
  },
};

// Destination chain with FillGate contract (Stacks only)
export const STACKS_DESTINATION: StacksChainConfig = {
  network: 'testnet',
  name: 'Stacks Testnet',
  apiUrl: 'https://api.testnet.hiro.so',
  fillGateAddress: 'ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX', // Will be overridden by config
  fillGateName: 'fill-gate', // Will be overridden by config
  nativeCurrency: 'STX',
};

// Helper functions
export function getSourceChain(chainId: number): ChainConfig | undefined {
  return SOURCE_CHAINS[chainId];
}

export function getAllSourceChains(): ChainConfig[] {
  return Object.values(SOURCE_CHAINS);
}

export function getStacksDestination(): StacksChainConfig {
  return STACKS_DESTINATION;
}
