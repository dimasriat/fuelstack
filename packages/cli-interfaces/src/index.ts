import { getMessages, postMessage, openOrder, fillOrder, settleOrder, mintToken, checkBalances } from './actions';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

async function main() {
  const command = args._[0];

  switch (command) {
    case 'get-messages':
      await getMessages();
      break;
    case 'post-message':
      await postMessage();
      break;
    case 'open-order':
      await openOrder();
      break;
    case 'fill-order':
      await fillOrder();
      break;
    case 'settle-order':
      await settleOrder();
      break;
    case 'mint-token':
      await mintToken();
      break;
    case 'check-balances':
      await checkBalances();
      break;
    default:
      console.log('🌉 Intent Bridge CLI');
      console.log('📍 Testing Flow: Arbitrum Sepolia (source) → Base Sepolia (destination)\n');
      console.log('Available commands:');
      console.log('  open-order    - Open a new cross-chain intent order');
      console.log('  fill-order    - Fill an existing order on destination chain');
      console.log('  settle-order  - Settle a filled order (oracle only)');
      console.log('  mint-token    - Mint test tokens to user address');
      console.log('  check-balances- Check balances across all roles and chains');
      console.log('');
      console.log('Legacy commands (Stacks):');
      console.log('  get-messages  - Get messages from Stacks contract');
      console.log('  post-message  - Post message to Stacks contract');
      console.log('');
      console.log('Examples:');
      console.log('  pnpm dev open-order --amount-in 100 --amount-out 0.05 --token-out native');
      console.log('  pnpm dev open-order --amount-in 100 --amount-out 0.001 --token-out sbtc');
      console.log('  pnpm dev fill-order --order-id 0');
      console.log('  pnpm dev settle-order --order-id 0 --solver-address 0x...');
      console.log('  pnpm dev mint-token --chain-id 421614 --token-address 0x... --user-address 0x... --amount 1000');
      console.log('  pnpm dev check-balances');
      console.log('');
      console.log('Note: Default recipient is 0x297B9793aCe172ff947f1131382de92B57F9C7e6');
      console.log('      Override with --recipient <address> if needed');
      console.log('');
      console.log('Setup:');
      console.log('  1. Copy .env.example to .env');
      console.log('  2. Add your role-based private keys:');
      console.log('     - SENDER_PRIVATE_KEY (for opening orders)');
      console.log('     - SOLVER_PRIVATE_KEY (for filling orders)');
      console.log('     - ORACLE_PRIVATE_KEY (for settling orders)');
      console.log('  3. Update contract addresses in src/config.ts after deployment');
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
