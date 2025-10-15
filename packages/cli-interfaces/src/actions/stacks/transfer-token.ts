import { parseArgs } from 'node:util';
import { clientFromNetwork, STACKS_TESTNET } from '@stacks/network';
import {
  broadcastTransaction,
  makeContractCall,
  makeSTXTokenTransfer,
  uintCV,
  principalCV,
  someCV,
  noneCV,
  bufferCV,
} from '@stacks/transactions';
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import {
  WALLET_MNEMONIC_KEY,
  WALLET_PASSWORD,
} from '../../config';
import {
  MICRO_STX_PER_STX,
  fetchStacksBalances,
  formatMicroStx,
  waitForTransaction,
  fetchAccountNonce,
} from '../../utils/stacks';

const client = clientFromNetwork(STACKS_TESTNET);

interface TransferTokenArgs {
  tokenType: 'stx' | 'sip10';
  recipient: string;
  amount: string;
  contractAddress?: string;
  contractName?: string;
  memo?: string;
}

export async function transferStacksToken() {
  console.log('💸 Transferring tokens on Stacks Testnet...\n');

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      'token-type': { type: 'string' },
      'recipient': { type: 'string' },
      'amount': { type: 'string' },
      'contract-address': { type: 'string' },
      'contract-name': { type: 'string' },
      'memo': { type: 'string' }
    }
  });

  // Validate token type
  const tokenType = args.values['token-type'] as 'stx' | 'sip10';
  if (!tokenType || !['stx', 'sip10'].includes(tokenType)) {
    console.error('❌ Token type required. Use --token-type stx or --token-type sip10');
    console.log('\nExamples:');
    console.log('  # Transfer STX');
    console.log('  pnpm dev stacks:transfer --token-type stx --recipient ST2... --amount 1000000');
    console.log('');
    console.log('  # Transfer SIP-10 tokens');
    console.log('  pnpm dev stacks:transfer --token-type sip10 --contract-address ST1... --contract-name sbtc-token --recipient ST2... --amount 100');
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
  const amount = BigInt(amountStr);
  if (amount <= BigInt(0)) {
    console.error('❌ Invalid amount. Must be a positive number.');
    process.exit(1);
  }

  // Validate SIP-10 specific fields
  if (tokenType === 'sip10') {
    const contractAddress = args.values['contract-address'];
    const contractName = args.values['contract-name'];

    if (!contractAddress) {
      console.error('❌ Contract address required for SIP-10 transfers. Use --contract-address <address>');
      process.exit(1);
    }
    if (!contractName) {
      console.error('❌ Contract name required for SIP-10 transfers. Use --contract-name <name>');
      process.exit(1);
    }
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

    console.log('\n📋 Transfer Details:');
    console.log(`  Network: Stacks Testnet`);
    console.log(`  Token Type: ${tokenType.toUpperCase()}`);
    console.log(`  Sender: ${senderAddress}`);
    console.log(`  Recipient: ${recipient}`);

    if (tokenType === 'stx') {
      const stxAmount = Number(amount) / Number(MICRO_STX_PER_STX);
      console.log(`  Amount: ${amount} micro-STX (${stxAmount} STX)`);
    } else {
      console.log(`  Amount: ${amount}`);
      console.log(`  Contract: ${args.values['contract-address']}.${args.values['contract-name']}`);
    }

    if (args.values.memo) {
      console.log(`  Memo: ${args.values.memo}`);
    }
    console.log('');

    // Check STX balance for transaction fees
    console.log('💰 Checking STX balance for fees...');
    const balances = await fetchStacksBalances(senderAddress, 'testnet');
    const stxBalance = BigInt(balances.stx.balance);

    if (stxBalance < BigInt(100000)) { // 0.1 STX minimum for fees
      console.error('\n❌ Insufficient STX balance for transaction fees');
      console.error(`   Current balance: ${formatMicroStx(stxBalance)}`);
      console.error(`   Required: At least 0.1 STX for fees`);
      console.error('\n💡 Get testnet STX from: https://explorer.hiro.so/sandbox/faucet?chain=testnet');
      process.exit(1);
    }

    // Fetch current nonce for the account
    console.log('🔍 Fetching account nonce...');
    const nonce = await fetchAccountNonce(senderAddress, 'testnet');
    console.log(`✅ Current nonce: ${nonce}`);

    // Create and broadcast transaction
    console.log('\n🚀 Creating transaction...');
    let tx;

    if (tokenType === 'stx') {
      // Transfer STX using makeSTXTokenTransfer
      tx = await makeSTXTokenTransfer({
        client,
        network: 'testnet',
        recipient: recipient,
        amount: amount,
        senderKey: senderKey,
        memo: args.values.memo || '',
        nonce: BigInt(nonce),
      });
    } else {
      // Transfer SIP-10 token using contract call
      const contractAddress = args.values['contract-address']!;
      const contractName = args.values['contract-name']!;

      tx = await makeContractCall({
        client,
        network: 'testnet',
        contractAddress: contractAddress,
        contractName: contractName,
        functionName: 'transfer',
        functionArgs: [
          uintCV(amount),
          principalCV(senderAddress),
          principalCV(recipient),
          args.values.memo ? someCV(bufferCV(Buffer.from(args.values.memo))) : noneCV()
        ],
        senderKey: senderKey,
        nonce: BigInt(nonce),
      });
    }

    console.log('📡 Broadcasting transaction...');
    const result = await broadcastTransaction({
      transaction: tx,
    });

    // Check if broadcast failed
    if ('error' in result) {
      console.error('\n❌ Transaction broadcast failed!');
      console.error(`   Reason: ${result.error}`);
      console.error('\n💡 Common causes:');
      console.error('   - Insufficient STX balance for transaction fees');
      console.error('   - Insufficient token balance');
      console.error('   - Network connectivity issues');
      console.error('   - Invalid recipient address');
      console.log('\n📋 Full error details:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log(`\n📡 Transaction broadcast successful!`);
    console.log(`🔗 Transaction ID: ${result.txid}`);
    console.log(`🌐 Explorer: https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);

    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation (this may take 1-2 minutes)...');
    const confirmation = await waitForTransaction(result.txid, 'testnet');

    if (confirmation.success) {
      console.log('\n✅ Transfer successful!');
      console.log(`📊 Result: ${confirmation.result?.repr || '(ok true)'}`);
    } else {
      console.error('\n❌ Transaction failed on-chain!');
      console.error(`   Status: ${confirmation.status}`);
      if (confirmation.errorMessage) {
        console.error(`   Error: ${confirmation.errorMessage}`);
      }
      if (confirmation.result?.repr) {
        console.error(`   Contract response: ${confirmation.result.repr}`);
      }
      console.error('\n💡 Common causes:');
      console.error('   - Insufficient token balance');
      console.error('   - Invalid recipient address');
      console.error('   - Transfer amount exceeds balance');
      console.error('\n🔗 Check the explorer for more details');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error transferring tokens:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}
