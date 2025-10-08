import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config/config';
import { getSourceChain } from '../config/chains';
import { db } from '../database/db';
import OpenGateABI from '../abis/OpenGate.json';

export class Settler {
  private publicClients: Map<number, any> = new Map();
  private walletClients: Map<number, any> = new Map();
  private account;

  constructor() {
    this.account = privateKeyToAccount(config.oracle.privateKey);
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize clients for all source chains where settlement can occur
    const sourceChains = [421614, 84532]; // Arbitrum & Base Sepolia chain IDs
    
    for (const chainId of sourceChains) {
      const chainConfig = getSourceChain(chainId);
      if (!chainConfig || !chainConfig.openGate || chainConfig.openGate === '0x...') {
        console.log(`⚠️  Skipping settler client for chain ${chainId} - OpenGate not configured`);
        continue;
      }

      const publicClient = createPublicClient({
        chain: chainConfig.viemChain,
        transport: http(chainConfig.rpcUrl)
      });

      const walletClient = createWalletClient({
        account: this.account,
        chain: chainConfig.viemChain,
        transport: http(chainConfig.rpcUrl)
      });

      this.publicClients.set(chainId, publicClient);
      this.walletClients.set(chainId, walletClient);
    }
  }

  async settleOrder(orderId: string, solverRecipient: Address): Promise<void> {
    console.log(`\n💰 Settling order ${orderId}...`);
    console.log(`   Solver recipient: ${solverRecipient}`);

    try {
      // Get order to determine source chain
      const order = await db.getOrder(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found in database`);
      }

      const sourceChainId = parseInt(order.sourceChainId);
      const chainConfig = getSourceChain(sourceChainId);
      
      if (!chainConfig) {
        throw new Error(`Unsupported source chain: ${sourceChainId}`);
      }

      const publicClient = this.publicClients.get(sourceChainId);
      const walletClient = this.walletClients.get(sourceChainId);

      if (!publicClient || !walletClient) {
        throw new Error(`No client configured for chain ${chainConfig.name} (${sourceChainId})`);
      }

      console.log(`   🔗 Settling on ${chainConfig.name} (${sourceChainId})`);

      const hash = await walletClient.writeContract({
        address: chainConfig.openGate as `0x${string}`,
        abi: OpenGateABI,
        functionName: 'settle',
        args: [BigInt(orderId), solverRecipient]
      });

      console.log(`   📤 Transaction sent: ${hash}`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber} on ${chainConfig.name}`);

      await db.updateOrderStatus(orderId, 'SETTLED');
      console.log(`   ✅ Order ${orderId} settled successfully\n`);

    } catch (error: any) {
      console.error(`   ❌ Settlement failed for order ${orderId}:`);
      console.error(`      ${error.message}`);
      throw error;
    }
  }
}
