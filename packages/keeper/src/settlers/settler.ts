import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config } from '../config/config';
import { db } from '../database/db';
import OpenGateABI from '../abis/OpenGate.json';

export class Settler {
  private publicClient;
  private walletClient;

  constructor() {
    const account = privateKeyToAccount(config.oracle.privateKey);

    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(config.openGate.rpcUrl)
    });

    this.walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(config.openGate.rpcUrl)
    });
  }

  async settleOrder(orderId: string, solverRecipient: Address): Promise<void> {
    console.log(`\n💰 Settling order ${orderId}...`);
    console.log(`   Solver recipient: ${solverRecipient}`);

    try {
      const hash = await this.walletClient.writeContract({
        address: config.openGate.contractAddress,
        abi: OpenGateABI,
        functionName: 'settle',
        args: [BigInt(orderId), solverRecipient]
      });

      console.log(`   📤 Transaction sent: ${hash}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

      await db.updateOrderStatus(orderId, 'SETTLED');
      console.log(`   ✅ Order ${orderId} settled successfully\n`);

    } catch (error: any) {
      console.error(`   ❌ Settlement failed for order ${orderId}:`);
      console.error(`      ${error.message}`);
      throw error;
    }
  }
}
