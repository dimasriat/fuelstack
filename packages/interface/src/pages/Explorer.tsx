import { Card } from '../components/Card';
import { ExternalLink } from 'lucide-react';

const MOCK_TRANSACTIONS = [
  {
    hash: '0x1234...5678',
    from: '0xabcd...ef01',
    to: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    amount: '100 USDC → 0.05 STX',
    status: 'Completed',
    timestamp: '2 mins ago',
  },
  {
    hash: '0x8765...4321',
    from: '0x1234...5678',
    to: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    amount: '50 WBTC → 0.001 sBTC',
    status: 'Pending',
    timestamp: '5 mins ago',
  },
  {
    hash: '0xabcd...ef01',
    from: '0x9876...5432',
    to: 'ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX',
    amount: '200 USDC → 0.1 STX',
    status: 'Completed',
    timestamp: '15 mins ago',
  },
];

export const Explorer = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
          Transaction Explorer
        </h1>
        <p className="text-zinc-400 text-lg">
          Track your cross-chain bridge transactions
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Tx Hash</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">From</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">To</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Amount</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide">Time</th>
                <th className="text-left py-4 px-5 text-sm font-medium text-zinc-400 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.map((tx, i) => (
                <tr
                  key={tx.hash}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <td className="py-5 px-5">
                    <span className="font-mono text-sm text-white">{tx.hash}</span>
                  </td>
                  <td className="py-5 px-5">
                    <span className="font-mono text-sm text-zinc-400">{tx.from}</span>
                  </td>
                  <td className="py-5 px-5">
                    <span className="font-mono text-sm text-zinc-400">{tx.to}</span>
                  </td>
                  <td className="py-5 px-5">
                    <span className="text-sm text-white font-medium">{tx.amount}</span>
                  </td>
                  <td className="py-5 px-5">
                    <span
                      className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${
                        tx.status === 'Completed'
                          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-5 px-5">
                    <span className="text-sm text-zinc-500">{tx.timestamp}</span>
                  </td>
                  <td className="py-5 px-5">
                    <button className="text-zinc-500 hover:text-primary-500 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {MOCK_TRANSACTIONS.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg">No transactions found</p>
          </div>
        )}
      </Card>
    </div>
  );
};
