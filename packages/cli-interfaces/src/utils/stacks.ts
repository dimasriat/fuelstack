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

/**
 * Transaction confirmation result
 */
export interface TransactionConfirmation {
  success: boolean;
  status: string;
  result?: any;
  errorMessage?: string;
}

/**
 * Fetch the current nonce for a Stacks address
 * @param address - Stacks address
 * @param network - 'mainnet' or 'testnet'
 * @returns Current nonce value
 */
export async function fetchAccountNonce(
  address: string,
  network: StacksNetwork = 'testnet'
): Promise<number> {
  const apiUrl = getHiroApiUrl(network);
  const url = `${apiUrl}/v2/accounts/${address}?proof=0`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Hiro API error: ${response.status} ${response.statusText}`);
    }

    const accountInfo = await response.json();
    return accountInfo.nonce;
  } catch (error) {
    console.error('Error fetching account nonce:', error);
    throw error;
  }
}

/**
 * Wait for a transaction to be confirmed on-chain
 * Polls the Hiro API until the transaction is confirmed or times out
 *
 * @param txid - Transaction ID (without 0x prefix)
 * @param network - 'mainnet' or 'testnet'
 * @param maxAttempts - Maximum number of polling attempts (default: 30)
 * @param delayMs - Delay between polling attempts in milliseconds (default: 2000)
 * @returns Transaction confirmation result
 */
export async function waitForTransaction(
  txid: string,
  network: StacksNetwork = 'testnet',
  maxAttempts: number = 30,
  delayMs: number = 2000
): Promise<TransactionConfirmation> {
  const apiUrl = getHiroApiUrl(network);
  // Remove 0x prefix if present
  const cleanTxid = txid.startsWith('0x') ? txid.slice(2) : txid;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${apiUrl}/extended/v1/tx/0x${cleanTxid}`);

      if (response.ok) {
        const txData = await response.json();

        // Transaction confirmed successfully
        if (txData.tx_status === 'success') {
          return {
            success: true,
            status: 'success',
            result: txData.tx_result
          };
        }

        // Transaction failed on-chain
        if (txData.tx_status === 'abort_by_response') {
          return {
            success: false,
            status: 'abort_by_response',
            result: txData.tx_result,
            errorMessage: 'Transaction aborted: contract returned an error'
          };
        }

        if (txData.tx_status === 'abort_by_post_condition') {
          return {
            success: false,
            status: 'abort_by_post_condition',
            errorMessage: 'Transaction aborted: post-condition failed'
          };
        }

        // Still pending, continue waiting
        if (i % 5 === 0 && i > 0) {
          // Show progress every 10 seconds
          process.stdout.write('.');
        }
      }
    } catch (error) {
      // Transaction not found yet or network error, keep waiting
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return {
    success: false,
    status: 'timeout',
    errorMessage: `Transaction not confirmed after ${(maxAttempts * delayMs) / 1000} seconds`
  };
}
