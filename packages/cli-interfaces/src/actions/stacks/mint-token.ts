import { parseArgs } from 'node:util';
import { clientFromNetwork, STACKS_TESTNET } from '@stacks/network';
import {
  broadcastTransaction,
  makeContractCall,
  uintCV,
  principalCV,
} from '@stacks/transactions';
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import {
  WALLET_MNEMONIC_KEY,
  WALLET_PASSWORD,
} from '../../config';

const client = clientFromNetwork(STACKS_TESTNET);

interface MintTokenArgs {
  contractAddress: string;
  contractName: string;
  recipient: string;
  amount: string;
}

export async function mintStacksToken() {
  console.log('🪙 Minting SIP-10 tokens on Stacks Testnet...\n');

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      'contract-address': { type: 'string' },
      'contract-name': { type: 'string' },
      'recipient': { type: 'string' },
      'amount': { type: 'string' }
    }
  });

  // Validate contract address
  const contractAddress = args.values['contract-address'];
  if (!contractAddress) {
    console.error('❌ Contract address required. Use --contract-address <stacks-address>');
    console.log('\nExample:');
    console.log('  pnpm dev stacks:mint-token --contract-address ST1... --contract-name sbtc-token --recipient ST2... --amount 1000');
    process.exit(1);
  }

  // Validate contract name
  const contractName = args.values['contract-name'];
  if (!contractName) {
    console.error('❌ Contract name required. Use --contract-name <name>');
    process.exit(1);
  }

  // Validate recipient
  const recipient = args.values['recipient'];
  if (!recipient) {
    console.error('❌ Recipient address required. Use --recipient <stacks-address>');
    process.exit(1);
  }

  // Validate amount
  const amountStr = args.values['amount'];
  if (!amountStr) {
    console.error('❌ Amount required. Use --amount <number>');
    process.exit(1);
  }
  const amount = parseInt(amountStr);
  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Invalid amount. Must be a positive number.');
    process.exit(1);
  }

  // Validate wallet configuration
  if (!WALLET_MNEMONIC_KEY || !WALLET_PASSWORD) {
    console.error('❌ Wallet not configured. Set WALLET_MNEMONIC_KEY and WALLET_PASSWORD in .env');
    process.exit(1);
  }

  try {
    // Generate wallet from mnemonic
    console.log('🔐 Generating wallet...');
    const wallet = await generateWallet({
      secretKey: WALLET_MNEMONIC_KEY,
      password: WALLET_PASSWORD,
    });
    const account = wallet.accounts[0];
    const senderKey = account.stxPrivateKey;
    const senderAddress = getStxAddress({ account, network: 'testnet' });

    console.log('\n📋 Mint Details:');
    console.log(`  Network: Stacks Testnet`);
    console.log(`  Contract: ${contractAddress}.${contractName}`);
    console.log(`  Sender: ${senderAddress}`);
    console.log(`  Recipient: ${recipient}`);
    console.log(`  Amount: ${amount}`);
    console.log('');

    // Create contract call transaction
    console.log('🚀 Creating mint transaction...');
    const tx = await makeContractCall({
      client,
      contractAddress: contractAddress,
      contractName: contractName,
      functionName: 'mint',
      functionArgs: [
        uintCV(amount),
        principalCV(recipient)
      ],
      senderKey: senderKey,
    });

    // Broadcast transaction
    console.log('📡 Broadcasting transaction...');
    const result = await broadcastTransaction({
      transaction: tx,
    });

    console.log('\n✅ Tokens minted successfully!');
    console.log(`🔗 Transaction ID: ${result.txid}`);
    console.log(`🌐 Explorer: https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);

  } catch (error) {
    console.error('\n❌ Error minting tokens:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}
