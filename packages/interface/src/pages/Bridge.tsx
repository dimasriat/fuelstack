import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ArrowDown } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TokenSelector } from '../components/TokenSelector';
import { ChainSelector, type Chain } from '../components/ChainSelector';

const TOKENS = [
  { symbol: 'USDC', name: 'USD Coin', address: '0xFe1EF6950833f6C148DB87e0131aB44B16F9C91F' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0xfe0bA1A1676Bf7ec0AB3e578db8252ff1524C380' },
];

const CHAINS: Chain[] = [
  { id: 421614, name: 'Arbitrum Sepolia', shortName: 'Arbitrum Testnet' },
  { id: 84532, name: 'Base Sepolia', shortName: 'Base Testnet' },
  { id: 11155420, name: 'Optimism Sepolia', shortName: 'Optimism Testnet' },
];

const OUTPUT_TYPES = [
  { id: 'stx', label: 'STX', description: 'Native Stacks token', rate: 0.0005 },
  { id: 'sbtc', label: 'sBTC', description: 'Stacks Bitcoin', rate: 0.000025 },
];

export const Bridge = () => {
  const { isConnected } = useAccount();
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [stacksAddress, setStacksAddress] = useState('');
  const [outputType, setOutputType] = useState('stx');
  const [txStatus, setTxStatus] = useState('');

  // Calculate estimated output amount
  const estimatedOutput = useMemo(() => {
    if (!amount || isNaN(Number(amount))) return '0.0';
    const outputToken = OUTPUT_TYPES.find(t => t.id === outputType);
    if (!outputToken) return '0.0';
    const output = Number(amount) * outputToken.rate;
    return output.toFixed(6);
  }, [amount, outputType]);

  const handleBridge = async () => {
    setTxStatus('Processing...');
    // Bridge logic here
    setTimeout(() => setTxStatus('Success!'), 2000);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
          Bridge to Stacks
        </h1>
        <p className="text-zinc-400 text-lg">
          Transfer your tokens from EVM chains to Stacks
        </p>
      </div>

      <Card className="space-y-4">
        {/* From Section */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">
            From
          </label>
          <div className="space-y-3">
            <ChainSelector
              chains={CHAINS}
              selected={selectedChain}
              onSelect={setSelectedChain}
            />
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <TokenSelector
                  tokens={TOKENS}
                  selected={selectedToken}
                  onSelect={setSelectedToken}
                />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-3xl font-semibold focus:outline-none text-white placeholder:text-zinc-700"
                />
              </div>
              <div className="text-sm text-zinc-500 pt-2 border-t border-white/5">
                Balance: <span className="text-white">0.00 {selectedToken.symbol}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow Separator */}
        <div className="flex justify-center -my-2">
          <div className="w-12 h-12 rounded-full glass flex items-center justify-center shadow-lg">
            <ArrowDown className="w-6 h-6 text-primary-500" />
          </div>
        </div>

        {/* Output Preview */}
        {amount && Number(amount) > 0 && (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-400">You will receive</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-500">
                  ≈ {estimatedOutput} {OUTPUT_TYPES.find(t => t.id === outputType)?.label}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  1 {selectedToken.symbol} ≈ {OUTPUT_TYPES.find(t => t.id === outputType)?.rate} {OUTPUT_TYPES.find(t => t.id === outputType)?.label}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* To Section */}
        <div>
          <Input
            label="To (Stacks Address)"
            placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
            value={stacksAddress}
            onChange={(e) => setStacksAddress(e.target.value)}
          />
        </div>

        {/* Receive Section */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">
            Receive
          </label>
          <div className="grid grid-cols-2 gap-4">
            {OUTPUT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setOutputType(type.id)}
                className={`p-5 rounded-xl transition-all duration-300 ${
                  outputType === type.id
                    ? 'glass ring-2 ring-primary-500 shadow-glow'
                    : 'glass glass-hover'
                }`}
              >
                <div className="text-lg font-semibold">{type.label}</div>
                <div className="text-xs text-zinc-500 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Bridge Button */}
        <div className="pt-2">
          {isConnected ? (
            <Button
              variant="primary"
              className="w-full text-lg py-4"
              onClick={handleBridge}
              disabled={!amount || !stacksAddress}
            >
              Bridge Tokens
            </Button>
          ) : (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Connect Wallet to Continue
            </Button>
          )}
        </div>

        {/* Status Message */}
        {txStatus && (
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-xl font-medium ${
              txStatus.includes('Success')
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                : 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
            }`}>
              {txStatus}
            </div>
          </div>
        )}
      </Card>

      {/* How It Works */}
      <div className="mt-8 glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">How it works</h3>
        <ol className="space-y-3 text-zinc-400">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">1</span>
            <span>Lock tokens on your selected EVM chain</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Keeper fills order on Stacks</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">3</span>
            <span>Receive STX or sBTC on Stacks</span>
          </li>
        </ol>
      </div>
    </div>
  );
};
