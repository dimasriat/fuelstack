import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { OrderStorage } from '../lib/orderStorage';
import { OrderTracker } from '../lib/orderTracker';
import type { Order } from '../lib/types';
import { getTxExplorerUrl, getStacksTxExplorerUrl } from '../lib/contracts';

export const Explorer = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load orders and check status
  const loadOrders = async () => {
    setRefreshing(true);
    try {
      const storedOrders = OrderStorage.getOrders();

      // Get all OPENED order IDs
      const openedOrderIds = storedOrders
        .filter(o => o.status === 'OPENED')
        .map(o => o.orderId);

      if (openedOrderIds.length > 0) {
        // Check status for all opened orders in batch
        const statusResults = await OrderTracker.checkMultipleOrders(openedOrderIds);

        // Update status for filled orders
        statusResults.forEach((result, orderId) => {
          if (result.status === 'FILLED') {
            OrderStorage.updateOrderStatus(orderId, 'FILLED', result.fillTxId);
          }
        });
      }

      // Reload from storage after updates
      setOrders(OrderStorage.getOrders());
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // Poll every 10 seconds
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const truncateAddress = (address: string): string => {
    if (address.length <= 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
          Order Explorer
        </h1>
        <p className="text-zinc-400 text-lg">
          Track your cross-chain bridge orders
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4 text-sm">
            <span className="text-zinc-400">
              Total: <span className="text-white font-semibold">{orders.length}</span>
            </span>
            <span className="text-zinc-400">
              Opened: <span className="text-yellow-400 font-semibold">{orders.filter(o => o.status === 'OPENED').length}</span>
            </span>
            <span className="text-zinc-400">
              Filled: <span className="text-green-400 font-semibold">{orders.filter(o => o.status === 'FILLED').length}</span>
            </span>
          </div>
          <button
            onClick={loadOrders}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass glass-hover text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Order ID</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Chain</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">To (Stacks)</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Amount</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Time</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Links</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex items-center justify-center gap-3 text-zinc-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Loading orders...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="text-zinc-500 text-lg">No orders found</p>
                    <p className="text-zinc-600 text-sm mt-2">Open your first order on the Bridge page!</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-5 px-5">
                      <span className="font-mono text-sm text-white font-semibold">#{order.orderId}</span>
                    </td>
                    <td className="py-5 px-5">
                      <span className="text-sm text-zinc-400">{order.chainName}</span>
                    </td>
                    <td className="py-5 px-5">
                      <span className="font-mono text-sm text-zinc-400">{truncateAddress(order.recipient)}</span>
                    </td>
                    <td className="py-5 px-5">
                      <span className="text-sm text-white font-medium">
                        {order.amountIn} {order.tokenIn} → {order.amountOut} {order.tokenOut}
                      </span>
                    </td>
                    <td className="py-5 px-5">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${
                          order.status === 'FILLED'
                            ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-5 px-5">
                      <span className="text-sm text-zinc-500">{formatTimestamp(order.createdAt)}</span>
                    </td>
                    <td className="py-5 px-5">
                      <div className="flex gap-2">
                        <a
                          href={getTxExplorerUrl(order.chainId, order.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-primary-500 transition-colors"
                          title="View EVM transaction"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {order.fillTxId && (
                          <a
                            href={getStacksTxExplorerUrl(order.fillTxId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-green-500 transition-colors"
                            title="View Stacks fill transaction"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-8 glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Order Status Guide</h3>
        <div className="space-y-3 text-zinc-400">
          <div className="flex items-start gap-3">
            <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30">
              OPENED
            </span>
            <span>Order created on EVM chain, waiting for keeper to fill on Stacks</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 ring-1 ring-green-500/30">
              FILLED
            </span>
            <span>Order filled on Stacks, tokens delivered to recipient!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
