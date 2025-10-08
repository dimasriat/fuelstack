import { createPublicClient, http, Address, Log, Abi } from 'viem';
import { ChainConfig } from '../config/chains';
import { db } from '../database/db';
import OpenGateABI from '../abis/OpenGate.json';

export class OpenGateListener {
  private client;
  private unwatch?: () => void;
  private chainId: number;
  private chainConfig: ChainConfig;

  constructor(chainId: number, chainConfig: ChainConfig) {
    this.chainId = chainId;
    this.chainConfig = chainConfig;
    
    this.client = createPublicClient({
      chain: chainConfig.viemChain,
      transport: http(chainConfig.rpcUrl)
    });
  }

  async start(): Promise<void> {
    console.log(`👂 Listening for OrderOpened events on ${this.chainConfig.name}...`);

    this.unwatch = this.client.watchContractEvent({
      address: this.chainConfig.openGate as `0x${string}`,
      abi: OpenGateABI as Abi,
      eventName: 'OrderOpened',
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          // Extract from topics and data
          const orderId = log.args.orderId as bigint;
          const sender = log.args.sender as Address;
          const tokenIn = log.args.tokenIn as Address;
          const amountIn = log.args.amountIn as bigint;
          const tokenOut = log.args.tokenOut as Address;
          const amountOut = log.args.amountOut as bigint;
          const recipient = log.args.recipient as Address;
          const fillDeadline = log.args.fillDeadline as bigint;
          const sourceChainId = log.args.sourceChainId as bigint;

          console.log(`\n🔔 OrderOpened Event Detected on ${this.chainConfig.name}!`);
          console.log(`   OrderId: ${orderId}`);
          console.log(`   Sender: ${sender}`);
          console.log(`   TokenIn: ${tokenIn}`);
          console.log(`   AmountIn: ${amountIn}`);
          console.log(`   TokenOut: ${tokenOut === '0x0000000000000000000000000000000000000000' ? 'NATIVE' : tokenOut}`);
          console.log(`   AmountOut: ${amountOut}`);
          console.log(`   Recipient: ${recipient}`);
          console.log(`   Deadline: ${new Date(Number(fillDeadline) * 1000).toISOString()}`);
          console.log(`   SourceChainId: ${sourceChainId}`);

          try {
            await db.insertOrder({
              orderId: orderId.toString(),
              sender: sender,
              tokenIn: tokenIn,
              amountIn: amountIn.toString(),
              tokenOut: tokenOut,
              amountOut: amountOut.toString(),
              recipient: recipient,
              fillDeadline: fillDeadline.toString(),
              sourceChainId: sourceChainId.toString(),
              status: 'OPENED',
              createdAt: Date.now(),
            });

            console.log(`✅ Order ${orderId} stored successfully on ${this.chainConfig.name}\n`);
          } catch (error) {
            console.error(`❌ Error storing order ${orderId} from ${this.chainConfig.name}:`, error);
          }
        }
      }
    });
  }

  async stop(): Promise<void> {
    if (this.unwatch) {
      this.unwatch();
    }
    console.log(`🛑 ${this.chainConfig.name} OpenGate listener stopped`);
  }
}
