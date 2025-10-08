export interface Order {
  orderId: string;
  sender: string;
  tokenIn: string;
  amountIn: string;
  tokenOut: string;
  amountOut: string;
  recipient: string;
  fillDeadline: string;
  sourceChainId: string;
  status: 'OPENED' | 'FILLED' | 'SETTLED' | 'REFUNDED';
  createdAt: number;
  filledAt?: number;
  settledAt?: number;
}

class Database {
  private orders: Map<string, Order> = new Map();

  async insertOrder(order: Order): Promise<void> {
    this.orders.set(order.orderId, order);
    const tokenType = order.tokenOut === '0x0000000000000000000000000000000000000000' 
      ? 'NATIVE' 
      : 'ERC20';
    console.log(`📝 Order ${order.orderId} stored (${tokenType}, Chain ${order.sourceChainId}): ${order.amountIn} ${order.tokenIn} → ${order.amountOut} ${order.tokenOut}`);
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    return this.orders.get(orderId);
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = status;
      if (status === 'FILLED') {
        order.filledAt = Date.now();
      } else if (status === 'SETTLED') {
        order.settledAt = Date.now();
      }
      this.orders.set(orderId, order);
      console.log(`📝 Order ${orderId} status updated to ${status}`);
    }
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async printAllOrders(): Promise<void> {
    console.log('\n📊 Current Orders in Database:');
    const orders = Array.from(this.orders.values()).map(o => ({
      id: o.orderId,
      status: o.status,
      sourceChainId: o.sourceChainId,
      tokenIn: o.tokenIn.slice(0, 8) + '...',
      amountIn: o.amountIn,
      tokenOut: o.tokenOut === '0x0000000000000000000000000000000000000000' ? 'NATIVE' : o.tokenOut.slice(0, 8) + '...',
      amountOut: o.amountOut,
    }));
    console.table(orders);
  }
}

export const db = new Database();
