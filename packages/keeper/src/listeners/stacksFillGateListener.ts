import { StacksChainConfig } from '../config/chains';
import { config } from '../config/config';
import { db } from '../database/db';
import { OrderValidator } from '../validators/orderValidator';
import { Settler } from '../settlers/settler';

interface StacksEvent {
  event_index: number;
  event_type: string;
  tx_id: string;
  contract_log?: {
    contract_id: string;
    topic: string;
    value: {
      hex: string;
      repr: string;
    };
  };
}

export class StacksFillGateListener {
  private pollInterval: NodeJS.Timeout | null = null;
  private lastProcessedEventId: string | null = null;
  private isRunning: boolean = false;
  private validator: OrderValidator;
  private settler: Settler;
  private chainConfig: StacksChainConfig;
  private fillGateContractId: string;

  constructor(chainConfig: StacksChainConfig) {
    this.chainConfig = chainConfig;

    // Override with config values
    this.chainConfig.fillGateAddress = config.stacks.fillGateAddress;
    this.chainConfig.fillGateName = config.stacks.fillGateName;

    this.fillGateContractId = `${this.chainConfig.fillGateAddress}.${this.chainConfig.fillGateName}`;
    this.validator = new OrderValidator();
    this.settler = new Settler();
  }

  async start(): Promise<void> {
    console.log(`👂 Listening for OrderFilled events on ${this.chainConfig.name} FillGate...`);
    console.log(`   Contract: ${this.fillGateContractId}`);

    this.isRunning = true;

    // Poll immediately on start
    await this.poll();

    // Then poll every 10 seconds
    this.pollInterval = setInterval(() => this.poll(), 10000);
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const events = await this.fetchRecentEvents();

      for (const event of events) {
        // Skip if already processed
        const eventId = `${event.tx_id}-${event.event_index}`;
        if (this.lastProcessedEventId === eventId) {
          break; // Reached last processed, stop
        }

        // Only process smart contract log events
        if (event.event_type !== 'smart_contract_log') {
          continue;
        }

        // Check contract ID
        if (event.contract_log?.contract_id !== this.fillGateContractId) {
          continue;
        }

        // Parse event data
        const eventData = this.parseEventData(event.contract_log.value.repr);
        if (!eventData) {
          console.log(`   ⚠️  Failed to parse event data for tx: ${event.tx_id.substring(0, 8)}...`);
          continue;
        }

        // Determine token type
        const tokenSymbol = eventData.tokenOut === 'native' ? 'STX' : 'sBTC';

        console.log(`\n⚡ **PHASE 2: ORDER FILLED (Stacks)**`);
        console.log(`   Order #${eventData.orderId} filled (${eventData.amountOut} micro-${tokenSymbol})`);
        console.log(`   Transaction: ${event.tx_id}`);

        // Validate fill
        const isValid = await this.validator.validateStacksFill(
          eventData.orderId,
          tokenSymbol,
          eventData.amountOut,
          eventData.recipient
        );

        if (!isValid) {
          console.log(`   ❌ Validation failed - order will not be settled`);
          continue;
        }

        console.log(`   ✅ Validation passed - proceeding to settlement`);

        // Update status
        await db.updateOrderStatus(eventData.orderId, 'FILLED');

        // Settle on OpenGate (Arbitrum)
        await this.settler.settleOrder(eventData.orderId, eventData.solverEvm as `0x${string}`);
      }

      // Update last processed event
      if (events.length > 0) {
        this.lastProcessedEventId = `${events[0].tx_id}-${events[0].event_index}`;
      }

    } catch (error) {
      console.error('❌ Error polling Stacks events:', error);
    }
  }

  private async fetchRecentEvents(): Promise<StacksEvent[]> {
    // Query contract events directly - much more efficient!
    const contractId = `${this.chainConfig.fillGateAddress}.${this.chainConfig.fillGateName}`;
    const url = `${this.chainConfig.apiUrl}/extended/v1/contract/${contractId}/events?limit=20`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Hiro API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  private parseEventData(repr: string): { orderId: string; amountOut: string; solverEvm: string; recipient: string; tokenOut: string } | null {
    try {
      // Parse Clarity tuple string
      // Example: (tuple (amount-out u3000) (order-id u19) (solver-origin-address "0x...") ...)

      const orderIdMatch = repr.match(/\(order-id u(\d+)\)/);
      const amountOutMatch = repr.match(/\(amount-out u(\d+)\)/);
      const solverEvmMatch = repr.match(/\(solver-origin-address "([^"]+)"\)/);
      const recipientMatch = repr.match(/\(recipient '([^']+)/);
      const tokenOutMatch = repr.match(/\(token-out "([^"]+)"\)/);

      if (!orderIdMatch || !amountOutMatch || !solverEvmMatch || !recipientMatch || !tokenOutMatch) {
        return null;
      }

      return {
        orderId: orderIdMatch[1],
        amountOut: amountOutMatch[1],
        solverEvm: solverEvmMatch[1],
        recipient: recipientMatch[1],
        tokenOut: tokenOutMatch[1]
      };
    } catch (error) {
      console.error('Error parsing event data:', error);
      return null;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log(`🛑 ${this.chainConfig.name} FillGate listener stopped`);
  }
}
