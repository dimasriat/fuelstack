import { createPublicClient, getAddress, Log } from 'viem';
import { SOURCE_CHAIN, createPublicClientForChain, sleep } from './utils';
import { SOURCE_CONTRACTS, SOLVER_CONFIG } from './config';
import { OPENGATE_ABI } from './abis';
import { StacksOrderFiller } from './stacksFiller';

export class OrderListener {
  private client;
  private filler: StacksOrderFiller;
  private unwatch?: () => void;
  private isListening = false;

  constructor() {
    this.client = createPublicClientForChain(SOURCE_CHAIN);
    // Destination is always Stacks
    this.filler = new StacksOrderFiller();
  }

  async start(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️  Listener already running');
      return;
    }

    console.log('🤖 FuelStack Automated Solver Starting...');
    console.log('👂 Listening for OrderOpened events on Arbitrum Sepolia...\n');

    try {
      this.unwatch = this.client.watchContractEvent({
        address: getAddress(SOURCE_CONTRACTS.openGate),
        abi: OPENGATE_ABI,
        eventName: 'OrderOpened',
        onLogs: this.handleOrderOpened.bind(this)
      });

      this.isListening = true;
      console.log('✅ Solver listener started successfully');
      console.log(`🎯 Destination: Stacks Testnet (only)`);
      console.log(`📊 Auto-fill: ${SOLVER_CONFIG.autoFillEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`⏱️  Fill delay: ${SOLVER_CONFIG.fillDelay}ms`);
      console.log(`⛽ Max gas price: ${SOLVER_CONFIG.maxGasPrice} gwei\n`);

    } catch (error) {
      console.error('❌ Failed to start listener:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = undefined;
    }
    this.isListening = false;
    console.log('🛑 Solver listener stopped');
  }

  private async handleOrderOpened(logs: any[]): Promise<void> {
    for (const log of logs) {
      try {
        const orderId = log.args.orderId as bigint;
        const sender = log.args.sender as string;
        const tokenIn = log.args.tokenIn as string;
        const amountIn = log.args.amountIn as bigint;
        const tokenOut = log.args.tokenOut as string;
        const amountOut = log.args.amountOut as bigint;
        const recipient = log.args.recipient as string;
        const fillDeadline = log.args.fillDeadline as bigint;
        const sourceChainId = log.args.sourceChainId as bigint;

        const isNativeToken = tokenOut === '0x0000000000000000000000000000000000000000';
        const tokenSymbol = isNativeToken ? 'STX' : 'sBTC';

        console.log('🔔 NEW ORDER DETECTED!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📋 Order ID: ${orderId}`);
        console.log(`👤 Sender: ${sender}`);
        console.log(`💰 Amount In: ${amountIn} USDC`);
        console.log(`🎯 Token Out: ${tokenSymbol}`);
        console.log(`💰 Amount Out: ${amountOut}`);
        console.log(`📦 Recipient: ${recipient}`);
        console.log(`⏰ Deadline: ${new Date(Number(fillDeadline) * 1000).toLocaleString()}`);
        console.log(`🔗 Source Chain: ${sourceChainId}`);

        if (!SOLVER_CONFIG.autoFillEnabled) {
          console.log('⏸️  Auto-fill disabled - skipping order');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          continue;
        }

        // Demo delay for visibility
        if (SOLVER_CONFIG.fillDelay > 0) {
          console.log(`⏳ Waiting ${SOLVER_CONFIG.fillDelay}ms before filling...`);
          await sleep(SOLVER_CONFIG.fillDelay);
        }

        // Attempt to fill the order
        console.log('🚀 ATTEMPTING TO FILL ORDER...');
        const success = await this.filler.fillOrder(orderId.toString());
        
        if (success) {
          console.log('✅ ORDER FILLED SUCCESSFULLY!');
        } else {
          console.log('❌ ORDER FILL FAILED');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      } catch (error) {
        console.error('❌ Error processing OrderOpened event:', error);
      }
    }
  }

  isRunning(): boolean {
    return this.isListening;
  }
}