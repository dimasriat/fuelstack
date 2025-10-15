import {
  // EVM actions
  mintToken as evmMintToken,
  checkBalances as evmCheckBalances,
  // Stacks actions
  getMessages,
  postMessage,
  checkStacksBalance,
  mintStacksToken,
  transferStacksToken,
  listStacksWallets,
  fillOrderStacks,
  // Bridge actions
  bridgeCheckBalances,
  openOrder,
  fillOrder,
  settleOrder
} from './actions';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

async function main() {
  const command = args._[0];

  // Support both namespaced (evm:mint-token) and legacy (mint-token) commands
  const [namespace, action] = command ? command.split(':') : ['', ''];

  // If no colon found, treat as legacy command
  if (!action) {
    await handleLegacyCommand(command);
    return;
  }

  // Handle namespaced commands
  switch (namespace) {
    case 'evm':
      await handleEvmCommand(action);
      break;
    case 'stacks':
      await handleStacksCommand(action);
      break;
    case 'bridge':
      await handleBridgeCommand(action);
      break;
    default:
      showHelp();
      break;
  }
}

async function handleEvmCommand(action: string) {
  switch (action) {
    case 'mint-token':
      await evmMintToken();
      break;
    case 'check-balances':
      await evmCheckBalances();
      break;
    default:
      console.error(`❌ Unknown EVM command: ${action}`);
      console.log('Run without arguments to see available commands.');
      process.exit(1);
  }
}

async function handleStacksCommand(action: string) {
  switch (action) {
    case 'mint-token':
      await mintStacksToken();
      break;
    case 'transfer':
      await transferStacksToken();
      break;
    case 'check-balance':
      await checkStacksBalance();
      break;
    case 'list-wallets':
      await listStacksWallets();
      break;
    case 'fill-order':
      await fillOrderStacks();
      break;
    case 'get-messages':
      await getMessages();
      break;
    case 'post-message':
      await postMessage();
      break;
    default:
      console.error(`❌ Unknown Stacks command: ${action}`);
      console.log('Run without arguments to see available commands.');
      process.exit(1);
  }
}

async function handleBridgeCommand(action: string) {
  switch (action) {
    case 'check-balances':
      await bridgeCheckBalances();
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
    default:
      console.error(`❌ Unknown bridge command: ${action}`);
      console.log('Run without arguments to see available commands.');
      process.exit(1);
  }
}

// Legacy command support for backwards compatibility
async function handleLegacyCommand(command: string) {
  switch (command) {
    // Legacy EVM commands
    case 'mint-token':
      console.warn('⚠️  Legacy command. Use "evm:mint-token" instead.');
      await evmMintToken();
      break;
    case 'check-balances':
      console.warn('⚠️  Legacy command. Use "evm:check-balances" instead.');
      await evmCheckBalances();
      break;

    // Legacy Stacks commands
    case 'get-messages':
      console.warn('⚠️  Legacy command. Use "stacks:get-messages" instead.');
      await getMessages();
      break;
    case 'post-message':
      console.warn('⚠️  Legacy command. Use "stacks:post-message" instead.');
      await postMessage();
      break;
    case 'check-stacks-balance':
      console.warn('⚠️  Legacy command. Use "stacks:check-balance" instead.');
      await checkStacksBalance();
      break;

    // Legacy Bridge commands
    case 'open-order':
      console.warn('⚠️  Legacy command. Use "bridge:open-order" instead.');
      await openOrder();
      break;
    case 'fill-order':
      console.warn('⚠️  Legacy command. Use "bridge:fill-order" instead.');
      await fillOrder();
      break;
    case 'settle-order':
      console.warn('⚠️  Legacy command. Use "bridge:settle-order" instead.');
      await settleOrder();
      break;

    default:
      showHelp();
      break;
  }
}

function showHelp() {
  console.log('🌉 FuelStack Intent Bridge CLI');
  console.log('═'.repeat(60));
  console.log('');

  console.log('📦 EVM COMMANDS (Arbitrum/Base Sepolia)');
  console.log('─'.repeat(60));
  console.log('  evm:mint-token       Mint ERC20 test tokens');
  console.log('  evm:check-balances   Check balances across all roles/chains');
  console.log('');

  console.log('🔷 STACKS COMMANDS (Mainnet/Testnet)');
  console.log('─'.repeat(60));
  console.log('  stacks:mint-token    Mint SIP-10 fungible tokens');
  console.log('  stacks:transfer      Transfer STX or SIP-10 tokens');
  console.log('  stacks:check-balance Check STX and token balances (--mainnet for mainnet)');
  console.log('  stacks:list-wallets  List wallet addresses and keys from mnemonic');
  console.log('  stacks:fill-order    Fill cross-chain order on Stacks (reads from Arbitrum)');
  console.log('  stacks:get-messages  Get messages from contract (legacy)');
  console.log('  stacks:post-message  Post message to contract (legacy)');
  console.log('');

  console.log('🌉 BRIDGE COMMANDS (Cross-chain Intent Bridge)');
  console.log('─'.repeat(60));
  console.log('  bridge:check-balances  Check balances across EVM and Stacks chains');
  console.log('  bridge:open-order      Open a new cross-chain intent order');
  console.log('  bridge:fill-order      Fill an existing order');
  console.log('  bridge:settle-order    Settle a filled order (oracle only)');
  console.log('');

  console.log('═'.repeat(60));
  console.log('');

  console.log('📖 EXAMPLES:');
  console.log('');
  console.log('  # EVM: Mint tokens on Arbitrum Sepolia');
  console.log('  pnpm dev evm:mint-token --chain-id 421614 --token-address 0x... --user-address 0x... --amount 1000');
  console.log('');
  console.log('  # Stacks: Mint SIP-10 tokens');
  console.log('  pnpm dev stacks:mint-token --contract-address ST1... --contract-name sbtc-token --recipient ST2... --amount 1000');
  console.log('');
  console.log('  # Stacks: Transfer STX');
  console.log('  pnpm dev stacks:transfer --token-type stx --recipient ST2... --amount 1000000');
  console.log('');
  console.log('  # Stacks: Transfer SIP-10 tokens');
  console.log('  pnpm dev stacks:transfer --token-type sip10 --contract-address ST1... --contract-name sbtc-token --recipient ST2... --amount 100');
  console.log('');
  console.log('  # Stacks: List wallet addresses');
  console.log('  pnpm dev stacks:list-wallets --count 3');
  console.log('  pnpm dev stacks:list-wallets --hide-private  # Hide private keys');
  console.log('');
  console.log('  # Stacks: Check balance');
  console.log('  pnpm dev stacks:check-balance  # Testnet (default)');
  console.log('  pnpm dev stacks:check-balance --mainnet  # Mainnet');
  console.log('  pnpm dev stacks:check-balance --address SP2... --mainnet  # Custom mainnet address');
  console.log('');
  console.log('  # Bridge: Check balances across all chains');
  console.log('  pnpm dev bridge:check-balances');
  console.log('  pnpm dev bridge:check-balances --stacks-solver ST1... --stacks-recipient ST2...  # Custom Stacks addresses');
  console.log('  pnpm dev bridge:check-balances --save balances.json  # Save to file');
  console.log('');
  console.log('  # Bridge: Open cross-chain order');
  console.log('  pnpm dev bridge:open-order --amount-in 100 --amount-out 0.001 --token-out sbtc');
  console.log('');
  console.log('  # Bridge: Fill order on EVM (Base Sepolia)');
  console.log('  pnpm dev bridge:fill-order --order-id 1');
  console.log('');
  console.log('  # Stacks: Fill order on Stacks (reads order from Arbitrum)');
  console.log('  pnpm dev stacks:fill-order --order-id 1 --solver-evm-address 0x...');
  console.log('');

  console.log('⚙️  SETUP:');
  console.log('  1. Copy .env.example to .env');
  console.log('  2. Add your private keys:');
  console.log('     - SENDER_PRIVATE_KEY (EVM)');
  console.log('     - SOLVER_PRIVATE_KEY (EVM)');
  console.log('     - ORACLE_PRIVATE_KEY (EVM)');
  console.log('     - WALLET_MNEMONIC_KEY (Stacks)');
  console.log('     - WALLET_PASSWORD (Stacks)');
  console.log('  3. Update contract addresses in src/config.ts');
  console.log('');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
