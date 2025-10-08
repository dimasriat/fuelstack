import { createPublicClient, createWalletClient, http, formatUnits, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { RPC_URLS, EXPLORER_URLS } from '../config';

// Chain configurations
export const CHAINS = {
  arbitrumSepolia: {
    ...arbitrumSepolia,
    rpcUrls: {
      default: { http: [RPC_URLS.arbitrumSepolia] },
      public: { http: [RPC_URLS.arbitrumSepolia] }
    }
  },
  baseSepolia: {
    ...baseSepolia, 
    rpcUrls: {
      default: { http: [RPC_URLS.baseSepolia] },
      public: { http: [RPC_URLS.baseSepolia] }
    }
  }
} as const;

export type ChainKey = keyof typeof CHAINS;

// Constants for the testing flow
export const SOURCE_CHAIN: ChainKey = 'arbitrumSepolia';
export const DESTINATION_CHAIN: ChainKey = 'baseSepolia';

// Get viem chain config by chain key
export function getChain(chainKey: ChainKey) {
  return CHAINS[chainKey];
}

// Create public client for reading chain data
export function createPublicClientForChain(chainKey: ChainKey) {
  const chain = getChain(chainKey);
  return createPublicClient({
    chain,
    transport: http(RPC_URLS[chainKey])
  });
}

// Create wallet client for sending transactions
export function createWalletClientForChain(chainKey: ChainKey, privateKey: string) {
  const chain = getChain(chainKey);
  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
  
  return createWalletClient({
    account,
    chain,
    transport: http(RPC_URLS[chainKey])
  });
}

// Get explorer URL for a transaction
export function getTxExplorerUrl(chainKey: ChainKey, txHash: string): string {
  return `${EXPLORER_URLS[chainKey]}/tx/${txHash}`;
}

// Format token amount for display
export function formatTokenAmount(amount: bigint, decimals: number, symbol: string): string {
  return `${formatUnits(amount, decimals)} ${symbol}`;
}

// Parse token amount from user input
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

// Get current timestamp
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}