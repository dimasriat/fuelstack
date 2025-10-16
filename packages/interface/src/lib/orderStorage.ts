import type { Order } from './types';

const STORAGE_KEY = 'fuelstack_orders';

export const OrderStorage = {
  /**
   * Get all orders from localStorage
   */
  getOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading orders from localStorage:', error);
      return [];
    }
  },

  /**
   * Add a new order to localStorage
   */
  addOrder(order: Order): void {
    try {
      const orders = this.getOrders();
      // Add to beginning (newest first)
      orders.unshift(order);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error('Error saving order to localStorage:', error);
    }
  },

  /**
   * Update order status when filled
   */
  updateOrderStatus(orderId: string, status: 'FILLED', fillTxId?: string): void {
    try {
      const orders = this.getOrders();
      const order = orders.find(o => o.orderId === orderId);

      if (order) {
        order.status = status;
        order.filledAt = Date.now();
        if (fillTxId) {
          order.fillTxId = fillTxId;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  },

  /**
   * Get a specific order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.getOrders().find(o => o.orderId === orderId);
  },

  /**
   * Clear all orders (for testing)
   */
  clearOrders(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing orders:', error);
    }
  },

  /**
   * Get count of orders by status
   */
  getOrderStats(): { total: number; opened: number; filled: number } {
    const orders = this.getOrders();
    return {
      total: orders.length,
      opened: orders.filter(o => o.status === 'OPENED').length,
      filled: orders.filter(o => o.status === 'FILLED').length,
    };
  },
};
