import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';

// Stacks Network Type
export type StacksNetwork = 'mainnet' | 'testnet';

// Stacks Testnet Configuration (default for backward compatibility)
export const STACKS_NETWORK = STACKS_TESTNET;
export const HIRO_API_BASE_URL = 'https://api.testnet.hiro.so';

// Stacks constants
export const MICRO_STX_PER_STX = BigInt(1_000_000);

/**
 * Get Hiro API URL based on network
 */
export function getHiroApiUrl(network: StacksNetwork = 'testnet'): string {
  return network === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

/**
 * Get Stacks address from mnemonic
 * Follows the same pattern as post-message.ts
 * @param network - 'mainnet' or 'testnet' (defaults to 'testnet' for backward compatibility)
 */
export async function getStacksAddress(
  mnemonic: string,
  password: string,
  network: StacksNetwork = 'testnet'
): Promise<string> {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: password,
  });
  const account = wallet.accounts[0];
  const address = getStxAddress({ account, network });
  return address;
}

/**
 * Fetch STX and token balances from Hiro API
 * @param network - 'mainnet' or 'testnet' (defaults to 'testnet' for backward compatibility)
 */
export async function fetchStacksBalances(
  address: string,
  network: StacksNetwork = 'testnet'
) {
  const apiUrl = getHiroApiUrl(network);
  const url = `${apiUrl}/extended/v1/address/${address}/balances`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hiro API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Stacks balances:', error);
    throw error;
  }
}

/**
 * Format micro-STX to STX
 */
export function formatMicroStx(microStx: string | bigint): string {
  const amount = typeof microStx === 'string' ? BigInt(microStx) : microStx;
  const stx = Number(amount) / Number(MICRO_STX_PER_STX);
  return `${stx.toFixed(6)} STX`;
}

/**
 * Format token amount based on decimals
 */
export function formatTokenAmount(amount: string, decimals: number, symbol: string): string {
  const amountNum = Number(amount);
  const divisor = Math.pow(10, decimals);
  const formatted = (amountNum / divisor).toFixed(decimals);
  return `${formatted} ${symbol}`;
}

/**
 * Parse fungible token balances from API response
 */
export interface TokenBalance {
  contractId: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  formatted: string;
}

export function parseFungibleTokens(fungibleTokens: Record<string, any>): TokenBalance[] {
  return Object.entries(fungibleTokens).map(([contractId, tokenData]) => {
    const balance = tokenData.balance || '0';
    const decimals = tokenData.decimals || 0;

    // Try to get symbol from API data first
    let symbol = tokenData.symbol;

    // If no symbol in API response, extract asset name from contract ID
    // Contract ID format: {contractAddress}.{contractName}::{assetName}
    if (!symbol) {
      const assetNameMatch = contractId.match(/::(.+)$/);
      symbol = assetNameMatch ? assetNameMatch[1] : 'UNKNOWN';
    }

    // Use symbol as name fallback if no name provided
    const name = tokenData.name || symbol;

    return {
      contractId,
      name,
      symbol,
      balance,
      decimals,
      formatted: formatTokenAmount(balance, decimals, symbol)
    };
  });
}
