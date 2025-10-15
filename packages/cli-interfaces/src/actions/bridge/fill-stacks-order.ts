import { parseArgs } from 'node:util';
import { clientFromNetwork, STACKS_TESTNET } from '@stacks/network';
import {
  broadcastTransaction,
  makeContractCall,
  uintCV,
  principalCV,
  contractPrincipalCV,
  stringAsciiCV,
} from '@stacks/transactions';
import type { StxPostCondition, FungiblePostCondition } from '@stacks/transactions';
import { generateWallet, generateNewAccount, getStxAddress } from '@stacks/wallet-sdk';
import {
  WALLET_MNEMONIC_KEY,
  WALLET_PASSWORD,
  STACKS_CONTRACTS,
  STACKS_BRIDGE_CONTRACTS,
  SOURCE_CONTRACTS,
} from '../../config';
import {
  fetchStacksBalances,
  formatMicroStx,
  waitForTransaction,
  fetchAccountNonce,
  MICRO_STX_PER_STX,
} from '../../utils/stacks';
import { createPublicClientForChain, SOURCE_CHAIN } from '../../utils/evm';
import { OPENGATE_ABI } from '../../abis';
import { getAddress, toHex } from 'viem';

const client = clientFromNetwork(STACKS_TESTNET);

interface FillStacksOrderArgs {
  orderId: string;
  solverEvmAddress?: string;
}

// Decimal constants for cross-chain conversion
const EVM_NATIVE_DECIMALS = 18;     // ETH uses 18 decimals
const STACKS_NATIVE_DECIMALS = 6;   // STX uses 6 decimals (micro-STX)
const SBTC_DECIMALS = 8;            // sBTC uses 8 decimals on both chains

export async function fillStacksOrder() {
  console.log('💫 Filling cross-chain intent order on Stacks...');
  console.log(`📍 Source: Arbitrum Sepolia → Destination: Stacks Testnet\n`);

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      'order-id': { type: 'string' },
      'solver-evm-address': { type: 'string' },
      'recipient': { type: 'string' }
    }
  });

  // Validate order ID
  const orderIdStr = args.values['order-id'];
  if (!orderIdStr || isNaN(parseInt(orderIdStr))) {
    console.error('❌ Invalid order ID. Use --order-id <number>');
    console.log('\nExample:');
    console.log('  pnpm dev bridge:fill-stacks-order --order-id 1 --solver-evm-address 0x... --recipient ST2...');
    process.exit(1);
  }
  const orderId = BigInt(orderIdStr);

  // Validate wallet configuration
  if (!WALLET_MNEMONIC_KEY || !WALLET_PASSWORD) {
    console.error('❌ Wallet not configured. Set WALLET_MNEMONIC_KEY and WALLET_PASSWORD in .env');
    process.exit(1);
  }

  try {
    // Generate Stacks wallet
    console.log('🔐 Generating Stacks wallet...');
    let wallet = await generateWallet({
      secretKey: WALLET_MNEMONIC_KEY,
      password: WALLET_PASSWORD,
    });
    // Generate account 1 (solver account)
    wallet = generateNewAccount(wallet);
    const account = wallet.accounts[1];
    const senderKey = account.stxPrivateKey;
    const senderAddress = getStxAddress({ account, network: 'testnet' });

    // Get solver EVM address (for event logging)
    const solverEvmAddress = args.values['solver-evm-address'] || '0x0000000000000000000000000000000000000000';
    if (solverEvmAddress.length !== 42 || !solverEvmAddress.startsWith('0x')) {
      console.error('❌ Invalid solver EVM address. Must be 42 characters starting with 0x');
      process.exit(1);
    }

    // Get Stacks recipient address (required - cannot use EVM address from order)
    const stacksRecipient = args.values['recipient'];
    if (!stacksRecipient) {
      console.error('❌ Stacks recipient address required. Use --recipient <stacks-address>');
      console.error('   Note: The EVM recipient from the order cannot be used on Stacks');
      console.log('\nExample:');
      console.log('  pnpm dev bridge:fill-stacks-order --order-id 1 --solver-evm-address 0x... --recipient ST2...');
      process.exit(1);
    }

    // Validate it's a Stacks testnet address
    if (!stacksRecipient.startsWith('S')) {
      console.error('❌ Invalid Stacks address. Must start with "S" for testnet');
      process.exit(1);
    }

    // Read order from Arbitrum Sepolia OpenGate
    console.log('🔍 Fetching order details from Arbitrum Sepolia...');
    const sourcePublicClient = createPublicClientForChain(SOURCE_CHAIN);
    const openGateAddress = getAddress(SOURCE_CONTRACTS.openGate);

    const order = await sourcePublicClient.readContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'orders',
      args: [orderId]
    });

    const [sender, tokenIn, amountIn, tokenOut, amountOut, recipient, fillDeadline, sourceChainId] = order;

    // Check if order exists
    if (sender === '0x0000000000000000000000000000000000000000') {
      console.error('❌ Order does not exist');
      process.exit(1);
    }

    // Debug: Show raw order data from Arbitrum
    console.log('\n🔍 DEBUG: Raw order data from Arbitrum:');
    console.log(`  amountOut (raw): ${amountOut} wei`);
    console.log(`  amountOut (ETH): ${Number(amountOut) / 1e18} ETH`);
    console.log(`  tokenOut: ${tokenOut}`);

    // Convert amountOut from EVM decimals to Stacks decimals
    const isNativeToken = tokenOut === '0x0000000000000000000000000000000000000000';
    let stacksAmountOut = amountOut;

    if (isNativeToken) {
      // Native token: Convert from 18 decimals (ETH) to 6 decimals (STX)
      // Divide by 10^12 to convert from wei to micro-STX
      const decimalDifference = EVM_NATIVE_DECIMALS - STACKS_NATIVE_DECIMALS; // 18 - 6 = 12
      stacksAmountOut = amountOut / BigInt(10 ** decimalDifference);

      console.log(`\n🔄 Decimal Conversion:`);
      console.log(`  EVM: ${amountOut} wei (18 decimals)`);
      console.log(`  ÷ 10^${decimalDifference} (convert 18→6 decimals)`);
      console.log(`  Stacks: ${stacksAmountOut} micro-STX (6 decimals)`);
      console.log(`  Stacks: ${Number(stacksAmountOut) / 1e6} STX`);
    }
    // For sBTC: No conversion needed (both chains use 8 decimals)

    // Check order status on source chain
    const orderStatus = await sourcePublicClient.readContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'orderStatus',
      args: [orderId]
    });

    const OPENED = toHex('OPENED', { size: 32 });
    const SETTLED = toHex('SETTLED', { size: 32 });
    const REFUNDED = toHex('REFUNDED', { size: 32 });

    let statusName = 'UNKNOWN';
    if (orderStatus === OPENED) statusName = 'OPENED';
    else if (orderStatus === SETTLED) statusName = 'SETTLED';
    else if (orderStatus === REFUNDED) statusName = 'REFUNDED';

    console.log(`📊 Order status on source: ${statusName}`);

    if (orderStatus !== OPENED) {
      console.error(`❌ Order is not in OPENED status. Current status: ${statusName}`);
      process.exit(1);
    }

    // Validate deadline (convert EVM timestamp to Stacks block height estimate)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > Number(fillDeadline)) {
      console.error('❌ Order deadline has passed');
      process.exit(1);
    }

    // Estimate Stacks block height deadline (6 second blocks)
    const currentBlock = await fetch('https://api.testnet.hiro.so/v2/info')
      .then(res => res.json())
      .then(data => data.stacks_tip_height);

    const timeUntilDeadline = Number(fillDeadline) - currentTime;
    const blocksUntilDeadline = Math.floor(timeUntilDeadline / 6);
    const fillDeadlineBlocks = currentBlock + blocksUntilDeadline;

    const tokenSymbol = isNativeToken ? 'STX' : 'sBTC';
    const tokenDecimals = isNativeToken ? STACKS_NATIVE_DECIMALS : SBTC_DECIMALS;

    console.log('\n📋 Order Details:');
    console.log(`  Order ID: ${orderId}`);
    console.log(`  Sender: ${sender}`);
    console.log(`  Token Out: ${tokenSymbol} (Stacks)`);
    console.log(`  Amount Out: ${Number(stacksAmountOut) / Math.pow(10, tokenDecimals)} ${tokenSymbol}`);
    console.log(`  Recipient (EVM): ${recipient}`);
    console.log(`  Recipient (Stacks): ${stacksRecipient}`);
    console.log(`  Fill Deadline (EVM): ${new Date(Number(fillDeadline) * 1000).toLocaleString()}`);
    console.log(`  Fill Deadline (Stacks): ~${fillDeadlineBlocks} blocks`);
    console.log(`  Source Chain ID: ${sourceChainId}`);
    console.log(`  Solver Stacks: ${senderAddress}`);
    console.log(`  Solver EVM: ${solverEvmAddress}`);
    console.log('');

    // Check if order already filled on Stacks
    console.log('🔍 Checking if order already filled on Stacks...');
    // Note: We can't easily query Stacks contract state without a read-only function
    // For now, we'll proceed and let the contract reject if already filled
    console.log('⚠️  Note: Cannot check fill status before transaction. Contract will reject if already filled.');

    // Check Stacks balance
    console.log('💰 Checking Stacks balance...');
    const balances = await fetchStacksBalances(senderAddress, 'testnet');
    const stxBalance = BigInt(balances.stx.balance);

    if (isNativeToken) {
      // Need STX for payment + fees
      const requiredStx = stacksAmountOut + BigInt(10000); // amount + 0.01 STX for fees

      console.log(`\n💰 Balance Check:`);
      console.log(`   Current balance: ${stxBalance} micro-STX (${Number(stxBalance) / 1e6} STX)`);
      console.log(`   Fill amount:     ${stacksAmountOut} micro-STX (${Number(stacksAmountOut) / 1e6} STX)`);
      console.log(`   Est. tx fee:     10000 micro-STX (0.01 STX)`);
      console.log(`   Total required:  ${requiredStx} micro-STX (${Number(requiredStx) / 1e6} STX)`);

      if (stxBalance < requiredStx) {
        console.error('\\n❌ Insufficient STX balance');
        console.error(`   Current: ${formatMicroStx(stxBalance)}`);
        console.error(`   Required: ${formatMicroStx(requiredStx.toString())} (${formatMicroStx(stacksAmountOut.toString())} + fees)`);
        console.error('\\n💡 Get testnet STX from: https://explorer.hiro.so/sandbox/faucet?chain=testnet');
        process.exit(1);
      }
      console.log(`✅ Sufficient balance`);
    } else {
      // Need sBTC for payment + STX for fees
      if (stxBalance < BigInt(10000)) {
        console.error('\\n❌ Insufficient STX balance for transaction fees');
        console.error(`   Current: ${formatMicroStx(stxBalance)}`);
        console.error(`   Required: At least 0.01 STX for fees`);
        console.error('\\n💡 Get testnet STX from: https://explorer.hiro.so/sandbox/faucet?chain=testnet');
        process.exit(1);
      }

      // Check sBTC balance
      const sbtcToken = balances.fungible_tokens?.[`${STACKS_CONTRACTS.sbtc.address}.${STACKS_CONTRACTS.sbtc.name}::${STACKS_CONTRACTS.sbtc.name}`];
      const sbtcBalance = sbtcToken ? BigInt(sbtcToken.balance) : BigInt(0);

      if (sbtcBalance < stacksAmountOut) {
        console.error('\\n❌ Insufficient sBTC balance');
        console.error(`   Current: ${Number(sbtcBalance) / Math.pow(10, SBTC_DECIMALS)} sBTC`);
        console.error(`   Required: ${Number(stacksAmountOut) / Math.pow(10, SBTC_DECIMALS)} sBTC`);
        process.exit(1);
      }
      console.log(`✅ sBTC balance: ${Number(sbtcBalance) / Math.pow(10, SBTC_DECIMALS)} sBTC`);
    }

    // Note: For SIP-10 tokens on Stacks, the transfer happens atomically in the fill-token function
    // No separate approve is needed like on EVM - the sender must have the tokens and the contract
    // will call transfer directly

    // Fetch current nonce for the account
    console.log('🔍 Fetching account nonce...');
    const nonce = await fetchAccountNonce(senderAddress, 'testnet');
    console.log(`✅ Current nonce: ${nonce}`);

    // Create and broadcast fill transaction
    console.log('\\n🚀 Creating fill transaction on Stacks...');
    let tx;

    if (isNativeToken) {
      // Create post-condition for STX transfer (v7 API)
      // The solver authorizes sending up to stacksAmountOut STX
      const stxPostCondition: StxPostCondition = {
        type: 'stx-postcondition',
        address: senderAddress,
        condition: 'lte',  // less than or equal
        amount: stacksAmountOut.toString(),
      };

      console.log('📋 Post-condition: Authorize STX transfer of up to', formatMicroStx(stacksAmountOut));

      // Fill with native STX
      tx = await makeContractCall({
        client,
        network: 'testnet',
        contractAddress: STACKS_BRIDGE_CONTRACTS.fillGate.address,
        contractName: STACKS_BRIDGE_CONTRACTS.fillGate.name,
        functionName: 'fill-native',
        functionArgs: [
          uintCV(Number(orderId)),
          uintCV(Number(stacksAmountOut)),
          principalCV(stacksRecipient),
          stringAsciiCV(solverEvmAddress),
          uintCV(fillDeadlineBlocks),
          uintCV(Number(sourceChainId))
        ],
        postConditions: [stxPostCondition],
        postConditionMode: 'deny',
        senderKey: senderKey,
        nonce: BigInt(nonce),
      });
    } else {
      // Create post-condition for sBTC transfer (v7 API)
      // The solver authorizes sending up to stacksAmountOut sBTC
      // Asset format: address.contractName::assetName
      const assetIdentifier = `${STACKS_CONTRACTS.sbtc.address}.${STACKS_CONTRACTS.sbtc.name}::${STACKS_CONTRACTS.sbtc.name}` as `${string}.${string}::${string}`;

      const fungiblePostCondition: FungiblePostCondition = {
        type: 'ft-postcondition',
        address: senderAddress,
        condition: 'lte',  // less than or equal
        amount: stacksAmountOut.toString(),
        asset: assetIdentifier,
      };

      console.log(`📋 Post-condition: Authorize sBTC transfer of up to ${Number(stacksAmountOut) / Math.pow(10, SBTC_DECIMALS)} sBTC`);

      // Fill with SIP-10 token (sBTC)
      tx = await makeContractCall({
        client,
        network: 'testnet',
        contractAddress: STACKS_BRIDGE_CONTRACTS.fillGate.address,
        contractName: STACKS_BRIDGE_CONTRACTS.fillGate.name,
        functionName: 'fill-token',
        functionArgs: [
          uintCV(Number(orderId)),
          contractPrincipalCV(STACKS_CONTRACTS.sbtc.address, STACKS_CONTRACTS.sbtc.name),
          uintCV(Number(stacksAmountOut)),
          principalCV(stacksRecipient),
          stringAsciiCV(solverEvmAddress),
          uintCV(fillDeadlineBlocks),
          uintCV(Number(sourceChainId))
        ],
        postConditions: [fungiblePostCondition],
        postConditionMode: 'deny',
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
      console.error('\\n❌ Transaction broadcast failed!');
      console.error(`   Reason: ${result.error}`);
      console.error('\\n💡 Common causes:');
      console.error('   - Order already filled on Stacks');
      console.error('   - Deadline exceeded');
      console.error('   - Insufficient balance');
      console.error('   - Network connectivity issues');
      console.error('   - Invalid contract address or name');
      console.log('\\n📋 Full error details:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log(`\\n📡 Transaction broadcast successful!`);
    console.log(`🔗 Transaction ID: ${result.txid}`);
    console.log(`🌐 Explorer: https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);

    // Wait for confirmation
    console.log('\\n⏳ Waiting for confirmation (this may take 1-2 minutes)...');
    const confirmation = await waitForTransaction(result.txid, 'testnet');

    if (confirmation.success) {
      console.log('\\n✅ Order filled successfully on Stacks!');
      console.log(`📊 Result: ${confirmation.result?.repr || '(ok true)'}`);
      console.log(`\\n💡 Next: Oracle will settle the order on Arbitrum with "pnpm dev bridge:settle-order --order-id ${orderId} --solver-address ${solverEvmAddress}"`);
    } else {
      console.error('\\n❌ Transaction failed on-chain!');
      console.error(`   Status: ${confirmation.status}`);
      if (confirmation.errorMessage) {
        console.error(`   Error: ${confirmation.errorMessage}`);
      }
      if (confirmation.result?.repr) {
        console.error(`   Contract response: ${confirmation.result.repr}`);
      }
      console.error('\\n💡 Common causes:');
      console.error('   - Order already filled (u100)');
      console.error('   - Deadline exceeded (u101)');
      console.error('   - Insufficient balance');
      console.error('\\n🔗 Check the explorer for more details');
      console.log(JSON.stringify(confirmation, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error('\\n❌ Error filling order:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}
