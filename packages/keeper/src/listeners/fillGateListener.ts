import { createPublicClient, http, Address, Abi } from 'viem';
import { sepolia } from 'viem/chains';
import { config } from '../config/config';
import { db } from '../database/db';
import { OrderValidator } from '../validators/orderValidator';
import { Settler } from '../settlers/settler';
import FillGateABI from '../abis/FillGate.json';

export class FillGateListener {
  private client;
  private unwatch?: () => void;
  private validator: OrderValidator;
  private settler: Settler;

  constructor() {
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(config.fillGate.rpcUrl)
    });
    this.validator = new OrderValidator();
    this.settler = new Settler();
  }

  async start(): Promise<void> {
    console.log('👂 Listening for OrderFilled events on FillGate...');

    this.unwatch = this.client.watchContractEvent({
      address: config.fillGate.contractAddress,
      abi: FillGateABI as Abi,
      eventName: 'OrderFilled',
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          // Extract from topics and data
          const orderId = log.args.orderId as bigint;
          const solver = log.args.solver as Address;
          const tokenOut = log.args.tokenOut as Address;
          const amountOut = log.args.amountOut as bigint;
          const recipient = log.args.recipient as Address;
          const solverOriginAddress = log.args.solverOriginAddress as Address;
          const fillDeadline = log.args.fillDeadline as bigint;
          const sourceChainId = log.args.sourceChainId as bigint;

          console.log(`\n🔔 OrderFilled Event Detected!`);
          console.log(`   OrderId: ${orderId}`);
          console.log(`   Solver: ${solver}`);
          console.log(`   TokenOut: ${tokenOut === '0x0000000000000000000000000000000000000000' ? 'NATIVE' : tokenOut}`);
          console.log(`   AmountOut: ${amountOut}`);
          console.log(`   Recipient: ${recipient}`);
          console.log(`   SolverOriginAddress: ${solverOriginAddress}`);
          console.log(`   SourceChainId: ${sourceChainId}`);

          try {
            // Validate fill
            const isValid = await this.validator.validateFill(
              orderId.toString(),
              tokenOut,
              amountOut.toString(),
              recipient
            );

            if (!isValid) {
              console.log(`❌ Order ${orderId} validation FAILED - will NOT settle`);
              return;
            }

            console.log(`✅ Order ${orderId} validation PASSED`);

            // Update status
            await db.updateOrderStatus(orderId.toString(), 'FILLED');

            // Settle on OpenGate
            await this.settler.settleOrder(orderId.toString(), solverOriginAddress);

          } catch (error) {
            console.error(`❌ Error processing fill for order ${orderId}:`, error);
          }
        }
      }
    });
  }

  async stop(): Promise<void> {
    if (this.unwatch) {
      this.unwatch();
    }
    console.log('🛑 FillGate listener stopped');
  }
}
