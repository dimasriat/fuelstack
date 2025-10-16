import { parseArgs } from 'node:util';
import { createPublicClientForChain, createWalletClientForChain, formatTokenAmount, parseTokenAmount, getCurrentTimestamp, getTxExplorerUrl, SOURCE_CHAIN } from '../../utils/evm';
import { SENDER_PRIVATE_KEY, SOURCE_CONTRACTS, DESTINATION_CONTRACTS, CHAIN_IDS, DEFAULT_RECIPIENT_ADDRESS } from '../../config';
import { OPENGATE_ABI, ERC20_ABI } from '../../abis';
import { Address, getAddress, decodeEventLog } from 'viem';

interface OpenOrderArgs {
  amountIn: string;
  amountOut: string;
  tokenOut: 'native' | 'sbtc';
  recipient?: string;
  deadline?: number; // hours from now
}

const DEFAULT_DEADLINE_HOURS = 24;
const USDC_DECIMALS = 6;

export async function openOrder() {
  console.log('🌉 Opening new cross-chain intent order...');
  console.log(`📍 Source: Arbitrum Sepolia → Destination: Stacks Testnet\n`);

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      'amount-in': { type: 'string' },
      'amount-out': { type: 'string' },
      'token-out': { type: 'string' },
      recipient: { type: 'string' },
      deadline: { type: 'string' }
    }
  });

  // Validate amount-in
  const amountIn = args.values['amount-in'];
  if (!amountIn || isNaN(parseFloat(amountIn))) {
    console.error('❌ Invalid amount-in. Use --amount-in <number>');
    process.exit(1);
  }

  // Validate amount-out
  const amountOut = args.values['amount-out'];
  if (!amountOut || isNaN(parseFloat(amountOut))) {
    console.error('❌ Invalid amount-out. Use --amount-out <number>');
    process.exit(1);
  }

  // Validate token out
  const tokenOut = args.values['token-out'];
  if (!tokenOut || !['native', 'sbtc'].includes(tokenOut)) {
    console.error('❌ Invalid token-out. Use --token-out native or --token-out sbtc');
    process.exit(1);
  }

  // Create clients for source chain (Arbitrum Sepolia)
  const publicClient = createPublicClientForChain(SOURCE_CHAIN);
  const walletClient = createWalletClientForChain(SOURCE_CHAIN, SENDER_PRIVATE_KEY);

  // Get contract addresses
  const openGateAddress = getAddress(SOURCE_CONTRACTS.openGate);
  const usdcAddress = getAddress(SOURCE_CONTRACTS.usdc);

  // Get recipient (must be a Stacks address)
  const recipient = args.values.recipient;
  if (!recipient) {
    console.error('❌ Recipient Stacks address required. Use --recipient <stacks-address>');
    console.error('   Example: --recipient ST1E5EJ7WPTJA1PBP81FMZK4J43NBWC7E80F8W9P5');
    process.exit(1);
  }

  // Validate Stacks address format
  if (!recipient.startsWith('S')) {
    console.error('❌ Invalid Stacks address. Must start with "S" for testnet/mainnet');
    console.error('   Example: ST1E5EJ7WPTJA1PBP81FMZK4J43NBWC7E80F8W9P5');
    process.exit(1);
  }

  // Calculate deadline
  const deadlineHours = args.values.deadline ? parseInt(args.values.deadline) : DEFAULT_DEADLINE_HOURS;
  const fillDeadline = getCurrentTimestamp() + (deadlineHours * 3600);

  // Parse amounts
  // Note: We store amounts in EVM format (18 decimals for native)
  // The solver will convert to Stacks format (6 decimals for STX) when filling
  const amountInBigInt = parseTokenAmount(amountIn, USDC_DECIMALS);
  const amountOutBigInt = tokenOut === 'native'
    ? parseTokenAmount(amountOut, 18) // Store as 18 decimals (EVM format), solver converts to 6 for Stacks
    : parseTokenAmount(amountOut, 8);  // sBTC has 8 decimals on both chains

  console.log('📋 Order Details:');
  console.log(`  Token In: USDC (Arbitrum Sepolia)`);
  console.log(`  Amount In: ${amountIn} USDC`);
  console.log(`  Token Out: ${tokenOut === 'native' ? 'STX (Stacks Testnet)' : 'sBTC (Stacks Testnet)'}`);
  console.log(`  Amount Out: ${amountOut} ${tokenOut === 'native' ? 'STX' : 'sBTC'}`);
  console.log(`  Recipient (Stacks): ${recipient}`);
  console.log(`  Deadline: ${new Date(fillDeadline * 1000).toLocaleString()}`);
  console.log('');

  try {
    // Check USDC balance
    console.log('🔍 Checking USDC balance...');
    const balance = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletClient.account.address]
    });

    if (balance < amountInBigInt) {
      console.error(`❌ Insufficient USDC balance. Have: ${formatTokenAmount(balance, USDC_DECIMALS, 'USDC')}, Need: ${amountIn} USDC`);
      process.exit(1);
    }
    console.log(`✅ USDC balance: ${formatTokenAmount(balance, USDC_DECIMALS, 'USDC')}`);

    // Check and set allowance
    console.log('\n🔍 Checking USDC allowance...');
    const allowance = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [walletClient.account.address, openGateAddress]
    });

    if (allowance < amountInBigInt) {
      console.log('📝 Approving USDC...');
      const approveTx = await walletClient.writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [openGateAddress, amountInBigInt]
      });
      
      console.log(`⏳ Approval tx: ${getTxExplorerUrl(SOURCE_CHAIN, approveTx)}`);
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
      
      if (approvalReceipt.status !== 'success') {
        console.error('❌ Approval failed');
        process.exit(1);
      }
      console.log('✅ USDC approved');
    } else {
      console.log('✅ USDC already approved');
    }

    // Open order
    console.log('\n🚀 Opening order...');
    const openTx = await walletClient.writeContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'open',
      args: [
        usdcAddress,                    // tokenIn
        amountInBigInt,                 // amountIn
        tokenOut === 'native' ? '0x0000000000000000000000000000000000000000' : DESTINATION_CONTRACTS.sbtc as Address, // tokenOut
        amountOutBigInt,                // amountOut
        recipient,                      // recipient (Stacks address)
        BigInt(fillDeadline)            // fillDeadline
        // sourceChainId is auto-set to block.chainid in OpenGateV2
      ]
    });

    console.log(`⏳ Transaction submitted: ${getTxExplorerUrl(SOURCE_CHAIN, openTx)}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: openTx });
    
    if (receipt.status !== 'success') {
      console.error('❌ Transaction failed');
      process.exit(1);
    }

    // Get order ID from logs using proper event decoding
    const logs = receipt.logs;
    let orderId: bigint | undefined;

    // Parse logs to find OrderOpened event
    for (const log of logs) {
      try {
        const decoded = decodeEventLog({
          abi: OPENGATE_ABI,
          data: log.data,
          topics: log.topics
        });

        if (decoded.eventName === 'OrderOpened') {
          orderId = decoded.args.orderId as bigint;
          break;
        }
      } catch {
        // Not an OrderOpened event or decode failed, continue
      }
    }

    if (orderId !== undefined) {
      console.log('\n🎯 **ORDER CREATED SUCCESSFULLY**');
      console.log(`📋 Order ID: #${orderId}`);
      console.log(`🔗 Transaction: ${getTxExplorerUrl(SOURCE_CHAIN, openTx)}`);
      console.log(`\n💡 Next: Use "pnpm dev bridge:fill-stacks-order --order-id ${orderId} --solver-evm-address 0x..." to fill this order`);
      console.log(`📊 Or watch the keeper/solver automatically fill Order #${orderId}`);
    } else {
      console.log('\n✅ Order opened successfully!');
      console.log(`🔗 Transaction: ${getTxExplorerUrl(SOURCE_CHAIN, openTx)}`);
      console.log('⚠️  Could not extract Order ID from transaction logs');
    }

  } catch (error) {
    console.error('❌ Error opening order:', error);
    process.exit(1);
  }
}
