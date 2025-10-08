import { createPublicClient, createWalletClient, http, Chain } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAIN_IDS, RPC_URLS, EXPLORER_URLS } from './config';

// Chain configurations
export const CHAINS = {
  [CHAIN_IDS.arbitrumSepolia]: arbitrumSepolia,
  [CHAIN_IDS.baseSepolia]: baseSepolia,
} as const;

export const SOURCE_CHAIN = CHAINS[CHAIN_IDS.arbitrumSepolia];
export const DESTINATION_CHAIN = CHAINS[CHAIN_IDS.baseSepolia];

// Create public client for reading contract data
export function createPublicClientForChain(chain: Chain) {
  const rpcUrl = getRpcUrlForChain(chain.id);
  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
}

// Create wallet client for transactions
export function createWalletClientForChain(chain: Chain, privateKey: string) {
  const rpcUrl = getRpcUrlForChain(chain.id);
  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
  
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });
}

// Get RPC URL for chain
function getRpcUrlForChain(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.arbitrumSepolia:
      return RPC_URLS.arbitrumSepolia;
    case CHAIN_IDS.baseSepolia:
      return RPC_URLS.baseSepolia;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

// Get transaction explorer URL
export function getTxExplorerUrl(chain: Chain, txHash: string): string {
  const baseUrl = getExplorerUrlForChain(chain.id);
  return `${baseUrl}/tx/${txHash}`;
}

function getExplorerUrlForChain(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.arbitrumSepolia:
      return EXPLORER_URLS.arbitrumSepolia;
    case CHAIN_IDS.baseSepolia:
      return EXPLORER_URLS.baseSepolia;
    default:
      throw new Error(`No explorer URL for chain ID: ${chainId}`);
  }
}

// Format token amounts for display
export function formatTokenAmount(amount: bigint, decimals: number, symbol: string): string {
  const divisor = BigInt(10 ** decimals);
  const quotient = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === BigInt(0)) {
    return `${quotient} ${symbol}`;
  }
  
  const formatted = (Number(amount) / Number(divisor)).toFixed(Math.min(decimals, 6));
  return `${formatted} ${symbol}`;
}

// Sleep utility for demo timing
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}