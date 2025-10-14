import { parseArgs } from 'node:util';
import {
  fetchStacksBalances,
  formatMicroStx,
  parseFungibleTokens,
  getStacksAddress,
  TokenBalance
} from '../../utils/stacks';
import { WALLET_MNEMONIC_KEY, WALLET_PASSWORD } from '../../config';

interface CheckStacksBalanceArgs {
  address?: string;
  save?: string;
}

interface StacksBalanceData {
  address: string;
  stxBalance: string;
  tokens: TokenBalance[];
}

export async function checkStacksBalance() {
  console.log('🔷 Stacks Balance Check');
  console.log('🌐 Network: Stacks Testnet\n');

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      address: { type: 'string' },
      save: { type: 'string' }
    }
  });

  // Get Stacks address from args or derive from mnemonic
  let address = args.values.address;

  if (!address) {
    // Try to derive from mnemonic if configured
    if (WALLET_MNEMONIC_KEY && WALLET_PASSWORD) {
      console.log('📝 No address provided, deriving from configured mnemonic...\n');
      try {
        address = await getStacksAddress(WALLET_MNEMONIC_KEY, WALLET_PASSWORD);
      } catch (error) {
        console.error('❌ Error deriving address from mnemonic:', error);
        process.exit(1);
      }
    } else {
      console.error('❌ Error: --address parameter is required or configure WALLET_MNEMONIC_KEY in .env');
      console.log('\nUsage:');
      console.log('  pnpm dev check-stacks-balance --address <stacks-address>');
      console.log('  OR configure WALLET_MNEMONIC_KEY and WALLET_PASSWORD in .env');
      console.log('\nExample:');
      console.log('  pnpm dev check-stacks-balance --address ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
      process.exit(1);
    }
  }

  try {
    console.log('🔍 Fetching Stacks balances...\n');

    // Fetch balances from Hiro API
    const balances = await fetchStacksBalances(address);

    // Parse STX balance
    const stxBalance = formatMicroStx(balances.stx.balance);
    const stxLocked = formatMicroStx(balances.stx.locked);

    // Parse fungible token balances
    const tokens = parseFungibleTokens(balances.fungible_tokens || {});

    // Display STX balance
    console.log('💰 STX Balance:');
    console.table([
      {
        'Type': 'Available',
        'Balance': stxBalance
      },
      {
        'Type': 'Locked',
        'Balance': stxLocked
      }
    ]);

    // Display token balances if any
    if (tokens.length > 0) {
      console.log('\n🪙 Fungible Token Balances:');
      const tokenTableData = tokens.map(token => ({
        'Token': token.symbol,
        'Contract': token.contractId,
        'Balance': token.formatted
      }));
      console.table(tokenTableData);
    } else {
      console.log('\n🪙 Fungible Token Balances: None');
    }

    // Display address
    console.log('\n📍 Address:', address);

    // Display network info
    console.log('🌐 Network: Stacks Testnet');
    console.log('🔗 Explorer: https://explorer.hiro.so/address/' + address + '?chain=testnet');

    // Save to file if requested
    if (args.values.save) {
      const balanceData: StacksBalanceData = {
        address,
        stxBalance,
        tokens
      };

      const fs = await import('fs/promises');
      await fs.writeFile(args.values.save, JSON.stringify(balanceData, null, 2));
      console.log(`\n💾 Balances saved to ${args.values.save}`);
    }

  } catch (error) {
    console.error('❌ Error checking Stacks balance:', error);
    process.exit(1);
  }
}
