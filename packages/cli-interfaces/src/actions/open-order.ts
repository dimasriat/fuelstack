import { parseArgs } from 'node:util';
import { createPublicClientForChain, createWalletClientForChain, formatTokenAmount, parseTokenAmount, getCurrentTimestamp, getTxExplorerUrl, SOURCE_CHAIN } from '../utils/evm';
import { SENDER_PRIVATE_KEY, SOURCE_CONTRACTS, DESTINATION_CONTRACTS, CHAIN_IDS, DEFAULT_RECIPIENT_ADDRESS } from '../config';
import { OPENGATE_ABI, ERC20_ABI } from '../abis';
import { Address, getAddress } from 'viem';

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
  console.log(`📍 Source: Arbitrum Sepolia → Destination: Base Sepolia\n`);

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

  // Get recipient (default to DEFAULT_RECIPIENT_ADDRESS)
  const recipient = args.values.recipient 
    ? getAddress(args.values.recipient)
    : getAddress(DEFAULT_RECIPIENT_ADDRESS);

  // Calculate deadline
  const deadlineHours = args.values.deadline ? parseInt(args.values.deadline) : DEFAULT_DEADLINE_HOURS;
  const fillDeadline = getCurrentTimestamp() + (deadlineHours * 3600);

  // Parse amounts
  const amountInBigInt = parseTokenAmount(amountIn, USDC_DECIMALS);
  const amountOutBigInt = tokenOut === 'native' 
    ? parseTokenAmount(amountOut, 18) // ETH has 18 decimals
    : parseTokenAmount(amountOut, 8);  // sBTC has 8 decimals

  console.log('📋 Order Details:');
  console.log(`  Token In: USDC (Arbitrum Sepolia)`);
  console.log(`  Amount In: ${amountIn} USDC`);
  console.log(`  Token Out: ${tokenOut === 'native' ? 'ETH (Base Sepolia)' : 'sBTC (Base Sepolia)'}`);
  console.log(`  Amount Out: ${amountOut} ${tokenOut === 'native' ? 'ETH' : 'sBTC'}`);
  console.log(`  Recipient: ${recipient}`);
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
        recipient,                      // recipient
        BigInt(fillDeadline),           // fillDeadline
        BigInt(CHAIN_IDS.arbitrumSepolia) // sourceChainId
      ]
    });

    console.log(`⏳ Transaction submitted: ${getTxExplorerUrl(SOURCE_CHAIN, openTx)}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: openTx });
    
    if (receipt.status !== 'success') {
      console.error('❌ Transaction failed');
      process.exit(1);
    }

    // Get order ID from logs
    const orderOpenedEvent = receipt.logs.find(log => 
      log.topics[0] === '0x7a14e7f16369ba3a8b5e0d114e8c82ed8a940ac37d199b2aabf8d0a4d9b8cfac' // OrderOpened event signature
    );

    if (orderOpenedEvent && orderOpenedEvent.topics[1]) {
      const orderId = parseInt(orderOpenedEvent.topics[1], 16);
      console.log('\n✅ Order opened successfully!');
      console.log(`📋 Order ID: ${orderId}`);
      console.log(`🔗 Transaction: ${getTxExplorerUrl(SOURCE_CHAIN, openTx)}`);
      console.log(`\n💡 Next: Use "pnpm dev fill-order --order-id ${orderId}" to fill this order`);
    } else {
      console.log('\n✅ Order opened successfully!');
      console.log(`🔗 Transaction: ${getTxExplorerUrl(SOURCE_CHAIN, openTx)}`);
    }

  } catch (error) {
    console.error('❌ Error opening order:', error);
    process.exit(1);
  }
}
