import { getAddress, toHex } from 'viem';
import { 
  createPublicClientForChain, 
  createWalletClientForChain,
  SOURCE_CHAIN,
  DESTINATION_CHAIN,
  formatTokenAmount,
  getTxExplorerUrl
} from './utils';
import { 
  SOLVER_PRIVATE_KEY, 
  SOURCE_CONTRACTS, 
  DESTINATION_CONTRACTS 
} from './config';
import { OPENGATE_ABI, FILLGATE_ABI, ERC20_ABI } from './abis';

export class OrderFiller {
  private sourceClient;
  private destWalletClient;
  private destPublicClient;

  constructor() {
    this.sourceClient = createPublicClientForChain(SOURCE_CHAIN);
    this.destWalletClient = createWalletClientForChain(DESTINATION_CHAIN, SOLVER_PRIVATE_KEY);
    this.destPublicClient = createPublicClientForChain(DESTINATION_CHAIN);
  }

  async fillOrder(orderIdStr: string): Promise<boolean> {
    try {
      const orderId = BigInt(orderIdStr);
      
      // Step 1: Get order details from source chain
      console.log('  📖 Reading order details from Arbitrum Sepolia...');
      const openGateAddress = getAddress(SOURCE_CONTRACTS.openGate);
      
      const order = await this.sourceClient.readContract({
        address: openGateAddress,
        abi: OPENGATE_ABI,
        functionName: 'orders',
        args: [orderId]
      });

      const [sender, tokenIn, amountIn, tokenOut, amountOut, recipient, fillDeadline, sourceChainId] = order;

      // Step 2: Validate order exists
      if (sender === '0x0000000000000000000000000000000000000000') {
        console.log('  ❌ Order does not exist');
        return false;
      }

      // Step 3: Check order status on source chain
      const orderStatus = await this.sourceClient.readContract({
        address: openGateAddress,
        abi: OPENGATE_ABI,
        functionName: 'orderStatus',
        args: [orderId]
      });

      const OPENED = toHex('OPENED', { size: 32 });
      if (orderStatus !== OPENED) {
        console.log('  ❌ Order is not in OPENED status');
        return false;
      }

      // Step 4: Check deadline
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > Number(fillDeadline)) {
        console.log('  ❌ Order deadline has passed');
        return false;
      }

      // Step 5: Check if already filled on destination
      const fillGateAddress = getAddress(DESTINATION_CONTRACTS.fillGate);
      const fillStatus = await this.destPublicClient.readContract({
        address: fillGateAddress,
        abi: FILLGATE_ABI,
        functionName: 'orderStatus',
        args: [orderId]
      });

      const FILLED = toHex('FILLED', { size: 32 });
      if (fillStatus === FILLED) {
        console.log('  ❌ Order already filled');
        return false;
      }

      const isNativeToken = tokenOut === '0x0000000000000000000000000000000000000000';
      console.log(`  💰 Filling: ${formatTokenAmount(amountOut, isNativeToken ? 18 : 8, isNativeToken ? 'ETH' : 'sBTC')}`);

      // Step 6: Handle ERC20 approval if needed
      if (!isNativeToken) {
        const success = await this.handleERC20Approval(amountOut, fillGateAddress);
        if (!success) return false;
      }

      // Step 7: Execute fill transaction
      console.log('  🚀 Executing fill transaction...');
      const fillTx = await this.destWalletClient.writeContract({
        address: fillGateAddress,
        abi: FILLGATE_ABI,
        functionName: 'fill',
        args: [
          orderId,                                    // orderId
          tokenOut,                                   // tokenOut
          amountOut,                                  // amountOut
          recipient,                                  // recipient
          this.destWalletClient.account.address,      // solverOriginAddress
          fillDeadline,                               // fillDeadline
          sourceChainId                               // sourceChainId
        ],
        value: isNativeToken ? amountOut : BigInt(0)
      });

      console.log(`  ⏳ Transaction: ${getTxExplorerUrl(DESTINATION_CHAIN, fillTx)}`);
      
      const receipt = await this.destPublicClient.waitForTransactionReceipt({ hash: fillTx });
      
      if (receipt.status === 'success') {
        console.log('  ✅ Fill transaction successful!');
        return true;
      } else {
        console.log('  ❌ Fill transaction failed');
        return false;
      }

    } catch (error) {
      console.error('  ❌ Error filling order:', error);
      return false;
    }
  }

  private async handleERC20Approval(amountOut: bigint, fillGateAddress: string): Promise<boolean> {
    try {
      const sbtcAddress = getAddress(DESTINATION_CONTRACTS.sbtc);
      
      // Check balance
      console.log('  🔍 Checking sBTC balance...');
      const balance = await this.destPublicClient.readContract({
        address: sbtcAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.destWalletClient.account.address]
      });

      if (balance < amountOut) {
        console.log(`  ❌ Insufficient sBTC balance. Have: ${formatTokenAmount(balance, 8, 'sBTC')}, Need: ${formatTokenAmount(amountOut, 8, 'sBTC')}`);
        return false;
      }

      // Check allowance
      console.log('  🔍 Checking sBTC allowance...');
      const allowance = await this.destPublicClient.readContract({
        address: sbtcAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [this.destWalletClient.account.address, fillGateAddress]
      });

      if (allowance < amountOut) {
        console.log('  📝 Approving sBTC...');
        const approveTx = await this.destWalletClient.writeContract({
          address: sbtcAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [fillGateAddress, amountOut]
        });
        
        const approvalReceipt = await this.destPublicClient.waitForTransactionReceipt({ hash: approveTx });
        
        if (approvalReceipt.status !== 'success') {
          console.log('  ❌ sBTC approval failed');
          return false;
        }
        console.log('  ✅ sBTC approved');
      } else {
        console.log('  ✅ sBTC already approved');
      }

      return true;
    } catch (error) {
      console.error('  ❌ Error handling ERC20 approval:', error);
      return false;
    }
  }
}