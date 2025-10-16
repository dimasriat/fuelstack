// ERC20 ABI - standard functions including mint
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Token addresses per chain
export const TOKEN_ADDRESSES = {
  arbitrumSepolia: {
    USDC: '0xFe1EF6950833f6C148DB87e0131aB44B16F9C91F' as `0x${string}`,
    WBTC: '0xfe0bA1A1676Bf7ec0AB3e578db8252ff1524C380' as `0x${string}`,
  },
  baseSepolia: {
    USDC: '0xFe1EF6950833f6C148DB87e0131aB44B16F9C91F' as `0x${string}`, // Update if different
    WBTC: '0xfe0bA1A1676Bf7ec0AB3e578db8252ff1524C380' as `0x${string}`, // Update if different
  },
  optimismSepolia: {
    USDC: '0xFe1EF6950833f6C148DB87e0131aB44B16F9C91F' as `0x${string}`, // Update if different
    WBTC: '0xfe0bA1A1676Bf7ec0AB3e578db8252ff1524C380' as `0x${string}`, // Update if different
  },
} as const;

// Default mint amounts per token
export const DEFAULT_MINT_AMOUNTS = {
  USDC: '1000', // 1000 USDC
  WBTC: '10',   // 10 WBTC
} as const;

// Block explorer URLs
export const EXPLORER_URLS = {
  421614: 'https://sepolia.arbiscan.io', // Arbitrum Sepolia
  84532: 'https://sepolia.basescan.org', // Base Sepolia
  11155420: 'https://sepolia-optimism.etherscan.io', // Optimism Sepolia
} as const;

// Helper function to get explorer URL
export function getTxExplorerUrl(chainId: number, txHash: string): string {
  const baseUrl = EXPLORER_URLS[chainId as keyof typeof EXPLORER_URLS];
  return baseUrl ? `${baseUrl}/tx/${txHash}` : '#';
}

// Helper function to get token address for chain
export function getTokenAddress(chainId: number, symbol: 'USDC' | 'WBTC'): `0x${string}` {
  switch (chainId) {
    case 421614: // Arbitrum Sepolia
      return TOKEN_ADDRESSES.arbitrumSepolia[symbol];
    case 84532: // Base Sepolia
      return TOKEN_ADDRESSES.baseSepolia[symbol];
    case 11155420: // Optimism Sepolia
      return TOKEN_ADDRESSES.optimismSepolia[symbol];
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}
