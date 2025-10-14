import { parseArgs } from 'node:util';
import { createPublicClientForChain, createWalletClientForChain, formatTokenAmount, getTxExplorerUrl, SOURCE_CHAIN, DESTINATION_CHAIN } from '../utils/evm';
import { SOLVER_PRIVATE_KEY, SOURCE_CONTRACTS, DESTINATION_CONTRACTS, CHAIN_IDS } from '../config';
import { FILLGATE_ABI, OPENGATE_ABI, ERC20_ABI } from '../abis';
import { getAddress, toHex } from 'viem';

interface FillOrderArgs {
  orderId: string;
  solverAddress?: string;
}

const SBTC_DECIMALS = 8;

export async function fillOrder() {
  console.log('💫 Filling cross-chain intent order...');
  console.log(`📍 Source: Arbitrum Sepolia → Destination: Base Sepolia\n`);

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

  // Create clients
  const sourcePublicClient = createPublicClientForChain(SOURCE_CHAIN);
  const destWalletClient = createWalletClientForChain(DESTINATION_CHAIN, SOLVER_PRIVATE_KEY);
  const destPublicClient = createPublicClientForChain(DESTINATION_CHAIN);

  // Get solver address (default to current wallet)
  const solverAddress = args.values['solver-address'] 
    ? getAddress(args.values['solver-address'])
    : destWalletClient.account.address;

  try {
    // First, read order details from source chain
    console.log('🔍 Fetching order details from Arbitrum Sepolia...');
    const openGateAddress = getAddress(SOURCE_CONTRACTS.openGate);
    
    const order = await sourcePublicClient.readContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'orders',
      args: [orderId]
    });

    const [sender, tokenIn, amountIn, tokenOut, amountOut, recipient, fillDeadline, sourceChainId] = order;

    // Debug: Check if order exists
    console.log('🔍 Order data:', {
      sender,
      tokenIn,
      amountIn: amountIn.toString(),
      tokenOut,
      amountOut: amountOut.toString(),
      recipient,
      fillDeadline: fillDeadline.toString(),
      sourceChainId: sourceChainId.toString()
    });

    // Check if order exists (sender should not be zero address)
    if (sender === '0x0000000000000000000000000000000000000000') {
      console.error('❌ Order does not exist');
      process.exit(1);
    }

    // Check order status
    const orderStatus = await sourcePublicClient.readContract({
      address: openGateAddress,
      abi: OPENGATE_ABI,
      functionName: 'orderStatus',
      args: [orderId]
    });

    const OPENED = toHex('OPENED', { size: 32 });
    const SETTLED = toHex('SETTLED', { size: 32 });
    const REFUNDED = toHex('REFUNDED', { size: 32 });
    const UNKNOWN = toHex('', { size: 32 });

    // Debug: Log status values
    console.log('🔍 Status Debug:', {
      currentStatus: orderStatus,
      expectedOPENED: OPENED,
      expectedSETTLED: SETTLED,
      expectedREFUNDED: REFUNDED,
      expectedUNKNOWN: UNKNOWN
    });

    // Determine status name for user
    let statusName = 'UNKNOWN';
    if (orderStatus === OPENED) statusName = 'OPENED';
    else if (orderStatus === SETTLED) statusName = 'SETTLED';
    else if (orderStatus === REFUNDED) statusName = 'REFUNDED';
    else if (orderStatus === UNKNOWN) statusName = 'UNKNOWN';

    console.log(`📊 Current order status: ${statusName}`);

    if (orderStatus !== OPENED) {
      console.error(`❌ Order is not in OPENED status. Current status: ${statusName}`);
      process.exit(1);
    }

    // Validate deadline
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > Number(fillDeadline)) {
      console.error('❌ Order deadline has passed');
      process.exit(1);
    }

    const isNativeToken = tokenOut === '0x0000000000000000000000000000000000000000';
    
    console.log('📋 Order Details:');
    console.log(`  Order ID: ${orderId}`);
    console.log(`  Sender: ${sender}`);
    console.log(`  Token In: USDC (Arbitrum Sepolia)`);
    console.log(`  Amount In: ${formatTokenAmount(amountIn, 6, 'USDC')}`);
    console.log(`  Token Out: ${isNativeToken ? 'ETH (Base Sepolia)' : 'sBTC (Base Sepolia)'}`);
    console.log(`  Amount Out: ${formatTokenAmount(amountOut, isNativeToken ? 18 : SBTC_DECIMALS, isNativeToken ? 'ETH' : 'sBTC')}`);
    console.log(`  Recipient: ${recipient}`);
    console.log(`  Fill Deadline: ${new Date(Number(fillDeadline) * 1000).toLocaleString()}`);
    console.log(`  Source Chain ID: ${sourceChainId}`);
    console.log('');

    // Get FillGate address
    const fillGateAddress = getAddress(DESTINATION_CONTRACTS.fillGate);

    // Check if order is already filled
    console.log('🔍 Checking if order already filled on Base Sepolia...');
    const fillStatus = await destPublicClient.readContract({
      address: fillGateAddress,
      abi: FILLGATE_ABI,
      functionName: 'orderStatus',
      args: [orderId]
    });

    const FILLED = toHex('FILLED', { size: 32 });
    if (fillStatus === FILLED) {
      console.error('❌ Order already filled');
      process.exit(1);
    }

    // If ERC20, check balance and approve
    if (!isNativeToken) {
      const sbtcAddress = getAddress(DESTINATION_CONTRACTS.sbtc);
      
      console.log('🔍 Checking sBTC balance...');
      const balance = await destPublicClient.readContract({
        address: sbtcAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [destWalletClient.account.address]
      });

      if (balance < amountOut) {
        console.error(`❌ Insufficient sBTC balance. Have: ${formatTokenAmount(balance, SBTC_DECIMALS, 'sBTC')}, Need: ${formatTokenAmount(amountOut, SBTC_DECIMALS, 'sBTC')}`);
        process.exit(1);
      }
      console.log(`✅ sBTC balance: ${formatTokenAmount(balance, SBTC_DECIMALS, 'sBTC')}`);

      // Check and set allowance
      console.log('\n🔍 Checking sBTC allowance...');
      const allowance = await destPublicClient.readContract({
        address: sbtcAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [destWalletClient.account.address, fillGateAddress]
      });

      if (allowance < amountOut) {
        console.log('📝 Approving sBTC...');
        const approveTx = await destWalletClient.writeContract({
          address: sbtcAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [fillGateAddress, amountOut]
        });
        
        console.log(`⏳ Approval tx: ${getTxExplorerUrl(DESTINATION_CHAIN, approveTx)}`);
        const approvalReceipt = await destPublicClient.waitForTransactionReceipt({ hash: approveTx });
        
        if (approvalReceipt.status !== 'success') {
          console.error('❌ Approval failed');
          process.exit(1);
        }
        console.log('✅ sBTC approved');
      } else {
        console.log('✅ sBTC already approved');
      }
    }

    // Fill the order
    console.log('\n🚀 Filling order on Base Sepolia...');
    const fillTx = await destWalletClient.writeContract({
      address: fillGateAddress,
      abi: FILLGATE_ABI,
      functionName: 'fill',
      args: [
        orderId,                        // orderId
        tokenOut,                       // tokenOut
        amountOut,                      // amountOut
        recipient,                      // recipient
        solverAddress,                  // solverOriginAddress
        fillDeadline,                   // fillDeadline
        sourceChainId                   // sourceChainId
      ],
      value: isNativeToken ? amountOut : BigInt(0)
    });

    console.log(`⏳ Transaction submitted: ${getTxExplorerUrl(DESTINATION_CHAIN, fillTx)}`);
    
    const receipt = await destPublicClient.waitForTransactionReceipt({ hash: fillTx });
    
    if (receipt.status !== 'success') {
      console.error('❌ Transaction failed');
      process.exit(1);
    }

    console.log('\n✅ Order filled successfully!');
    console.log(`🔗 Transaction: ${getTxExplorerUrl(DESTINATION_CHAIN, fillTx)}`);
    console.log(`\n💡 Next: Oracle will settle the order with "pnpm dev settle-order --order-id ${orderId} --solver-address ${solverAddress}"`);

  } catch (error) {
    console.error('❌ Error filling order:', error);
    process.exit(1);
  }
}