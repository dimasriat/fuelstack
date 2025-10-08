import { parseArgs } from 'node:util';
import { createPublicClientForChain, createWalletClientForChain, formatTokenAmount, getTxExplorerUrl, SOURCE_CHAIN } from '../utils/evm';
import { ORACLE_PRIVATE_KEY, SOURCE_CONTRACTS } from '../config';
import { OPENGATE_ABI } from '../abis';
import { getAddress, toHex } from 'viem';

interface SettleOrderArgs {
  orderId: string;
  solverAddress: string;
}

export async function settleOrder() {
  console.log('⚖️  Settling cross-chain intent order...');
  console.log(`📍 Settling on Arbitrum Sepolia (source chain)\n`);

  // Check oracle key
  if (!ORACLE_PRIVATE_KEY) {
    console.error('❌ ORACLE_PRIVATE_KEY is required for settle command');
    process.exit(1);
  }

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      'order-id': { type: 'string' },
      'solver-address': { type: 'string' }
    }
  });

  // Validate order ID
  const orderIdStr = args.values['order-id'];
  if (!orderIdStr || isNaN(parseInt(orderIdStr))) {
    console.error('❌ Invalid order ID. Use --order-id <number>');
    process.exit(1);
  }
  const orderId = BigInt(orderIdStr);

  // Validate solver address
  const solverAddressStr = args.values['solver-address'];
  if (!solverAddressStr) {
    console.error('❌ Solver address required. Use --solver-address <address>');
    process.exit(1);
  }
  const solverAddress = getAddress(solverAddressStr);

  // Create clients with oracle key for source chain (Arbitrum Sepolia)
  const publicClient = createPublicClientForChain(SOURCE_CHAIN);
  const walletClient = createWalletClientForChain(SOURCE_CHAIN, ORACLE_PRIVATE_KEY);

  try {
    // Get order details
    console.log('🔍 Fetching order details from Arbitrum Sepolia...');
    const openGateAddress = getAddress(SOURCE_CONTRACTS.openGate);
    
    const order = await publicClient.readContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'orders',
      args: [orderId]
    });

    const [sender, tokenIn, amountIn, tokenOut, amountOut, recipient, fillDeadline, sourceChainId] = order;

    // Check order status
    const orderStatus = await publicClient.readContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'orderStatus',
      args: [orderId]
    });

    const OPENED = toHex('OPENED', { size: 32 });
    const SETTLED = toHex('SETTLED', { size: 32 });
    const REFUNDED = toHex('REFUNDED', { size: 32 });

    if (orderStatus === SETTLED) {
      console.error('❌ Order already settled');
      process.exit(1);
    }

    if (orderStatus === REFUNDED) {
      console.error('❌ Order was refunded');
      process.exit(1);
    }

    if (orderStatus !== OPENED) {
      console.error('❌ Order is not in OPENED status');
      process.exit(1);
    }

    console.log('📋 Order Details:');
    console.log(`  Order ID: ${orderId}`);
    console.log(`  Sender: ${sender}`);
    console.log(`  Token In: USDC (Arbitrum Sepolia)`);
    console.log(`  Amount In: ${formatTokenAmount(amountIn, 6, 'USDC')}`);
    console.log(`  Fill Deadline: ${new Date(Number(fillDeadline) * 1000).toLocaleString()}`);
    console.log(`  Solver Address: ${solverAddress}`);
    console.log(`  Oracle Address: ${walletClient.account.address}`);
    console.log('');

    // TODO: In production, oracle should verify that the order was actually filled on destination chain
    // For now, we'll assume the oracle has verified the fill off-chain
    console.log('⚠️  Note: In production, oracle should verify fill on Base Sepolia before settling');
    console.log('');

    // Settle the order
    console.log('🚀 Settling order on Arbitrum Sepolia...');
    const settleTx = await walletClient.writeContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'settle',
      args: [orderId, solverAddress]
    });

    console.log(`⏳ Transaction submitted: ${getTxExplorerUrl(SOURCE_CHAIN, settleTx)}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: settleTx });
    
    if (receipt.status !== 'success') {
      console.error('❌ Transaction failed');
      process.exit(1);
    }

    console.log('\n✅ Order settled successfully!');
    console.log(`💰 ${formatTokenAmount(amountIn, 6, 'USDC')} transferred to solver: ${solverAddress}`);
    console.log(`🔗 Transaction: ${getTxExplorerUrl(SOURCE_CHAIN, settleTx)}`);
    console.log('\n🎉 Cross-chain intent bridge flow completed!');

  } catch (error) {
    console.error('❌ Error settling order:', error);
    process.exit(1);
  }
}