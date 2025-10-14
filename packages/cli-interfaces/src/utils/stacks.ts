import { STACKS_TESTNET } from '@stacks/network';
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';

// Stacks Testnet Configuration
export const STACKS_NETWORK = STACKS_TESTNET;
export const HIRO_API_BASE_URL = 'https://api.testnet.hiro.so';

// Stacks constants
export const MICRO_STX_PER_STX = BigInt(1_000_000);

/**
 * Get Stacks address from mnemonic
 * Follows the same pattern as post-message.ts
 */
export async function getStacksAddress(mnemonic: string, password: string): Promise<string> {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: password,
  });
  const account = wallet.accounts[0];
  const testnetAddress = getStxAddress({ account, network: 'testnet' });
  return testnetAddress;
}

/**
 * Fetch STX and token balances from Hiro API
 */
export async function fetchStacksBalances(address: string) {
  const url = `${HIRO_API_BASE_URL}/extended/v1/address/${address}/balances`;

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
    const symbol = tokenData.symbol || 'UNKNOWN';

    return {
      contractId,
      name: tokenData.name || contractId,
      symbol,
      balance,
      decimals,
      formatted: formatTokenAmount(balance, decimals, symbol)
    };
  });
}
