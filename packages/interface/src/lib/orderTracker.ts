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

export class OrderTracker {
  private static STACKS_API = 'https://api.testnet.hiro.so';
  private static FILLGATE_CONTRACT = 'ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX.fill-gate';

  /**
   * Check if an order has been filled on Stacks
   */
  static async checkOrderStatus(orderId: string): Promise<{ status: 'OPENED' | 'FILLED'; fillTxId?: string }> {
    try {
      const events = await this.fetchFillGateEvents();

      for (const event of events) {
        const parsedOrderId = this.parseOrderId(event);
        if (parsedOrderId === orderId) {
          return {
            status: 'FILLED',
            fillTxId: event.tx_id,
          };
        }
      }

      return { status: 'OPENED' };
    } catch (error) {
      console.error('Error checking order status:', error);
      return { status: 'OPENED' }; // Default to OPENED on error
    }
  }

  /**
   * Fetch recent FillGate contract events from Stacks API
   */
  private static async fetchFillGateEvents(): Promise<StacksEvent[]> {
    const url = `${this.STACKS_API}/extended/v1/contract/${this.FILLGATE_CONTRACT}/events?limit=50`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Stacks API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Parse orderId from Clarity tuple event data
   * Example: (tuple (order-id u123) ...)
   */
  private static parseOrderId(event: StacksEvent): string | null {
    if (event.event_type !== 'smart_contract_log') {
      return null;
    }

    if (event.contract_log?.contract_id !== this.FILLGATE_CONTRACT) {
      return null;
    }

    try {
      const repr = event.contract_log.value.repr;
      const match = repr.match(/\(order-id u(\d+)\)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Check multiple orders at once (more efficient)
   */
  static async checkMultipleOrders(orderIds: string[]): Promise<Map<string, { status: 'OPENED' | 'FILLED'; fillTxId?: string }>> {
    const results = new Map<string, { status: 'OPENED' | 'FILLED'; fillTxId?: string }>();

    // Initialize all as OPENED
    orderIds.forEach(id => results.set(id, { status: 'OPENED' }));

    try {
      const events = await this.fetchFillGateEvents();

      for (const event of events) {
        const parsedOrderId = this.parseOrderId(event);
        if (parsedOrderId && orderIds.includes(parsedOrderId)) {
          results.set(parsedOrderId, {
            status: 'FILLED',
            fillTxId: event.tx_id,
          });
        }
      }
    } catch (error) {
      console.error('Error checking multiple orders:', error);
    }

    return results;
  }
}
