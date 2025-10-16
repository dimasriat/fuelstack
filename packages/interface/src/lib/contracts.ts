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

// OpenGate ABI - cross-chain bridge contract
export const OPENGATE_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'recipient', type: 'string' },  // Stacks principal address
      { name: 'fillDeadline', type: 'uint256' }
    ],
    name: 'open',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'orders',
    outputs: [
      { name: 'sender', type: 'address' },
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'recipient', type: 'string' },
      { name: 'fillDeadline', type: 'uint256' },
      { name: 'sourceChainId', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'tokenIn', type: 'address' },
      { indexed: false, name: 'amountIn', type: 'uint256' },
      { indexed: false, name: 'tokenOut', type: 'address' },
      { indexed: false, name: 'amountOut', type: 'uint256' },
      { indexed: false, name: 'recipient', type: 'string' },
      { indexed: false, name: 'fillDeadline', type: 'uint256' },
      { indexed: false, name: 'sourceChainId', type: 'uint256' }
    ],
    name: 'OrderOpened',
    type: 'event'
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

// OpenGate contract addresses per chain
export const OPENGATE_ADDRESSES = {
  421614: '0x842876202cd586d8e0ae44fb45a22479af17d1a5' as `0x${string}`, // Arbitrum Sepolia
  // 84532: '0x...' as `0x${string}`, // Base Sepolia - TODO: Add when deployed
  // 11155420: '0x...' as `0x${string}`, // Optimism Sepolia - TODO: Add when deployed
} as const;

// sBTC contract address on Stacks (for tokenOut parameter)
export const SBTC_CONTRACT_ADDRESS = '0x3449353C85500Ee971eE64b193D15eF39BF01f04' as `0x${string}`;

// Hardcoded output amounts (1 STX or 1 sBTC)
export const BRIDGE_OUTPUT_AMOUNTS = {
  STX: 1000000000000000000n,  // 1 STX with 18 decimals (EVM format, solver converts to 6)
  sBTC: 100000000n,            // 1 sBTC with 8 decimals
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

// Helper function to get OpenGate address for chain
export function getOpenGateAddress(chainId: number): `0x${string}` | undefined {
  return OPENGATE_ADDRESSES[chainId as keyof typeof OPENGATE_ADDRESSES];
}
