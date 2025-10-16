import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { TokenSelector } from '../components/TokenSelector';

const TOKENS = [
  { symbol: 'USDC', name: 'Mock USDC', address: '0xFe1EF6950833f6C148DB87e0131aB44B16F9C91F' },
  { symbol: 'WBTC', name: 'Mock WBTC', address: '0xfe0bA1A1676Bf7ec0AB3e578db8252ff1524C380' },
];

export const Faucet = () => {
  const { isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleMint = async () => {
    setLoading(true);
    setMessage('');
    // Mint logic here
    setTimeout(() => {
      setMessage(`Successfully minted 100 ${selectedToken.symbol}!`);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
          Test Token Faucet
        </h1>
        <p className="text-zinc-400 text-lg">
          Get test tokens for Arbitrum Sepolia
        </p>
      </div>

      <Card className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">
            Select Token
          </label>
          <TokenSelector
            tokens={TOKENS}
            selected={selectedToken}
            onSelect={setSelectedToken}
          />
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-zinc-500 mb-2">You will receive</div>
          <div className="text-3xl font-bold text-white">100 {selectedToken.symbol}</div>
        </div>

        <div className="pt-2">
          {isConnected ? (
            <Button
              variant="primary"
              className="w-full text-lg py-4"
              onClick={handleMint}
              loading={loading}
            >
              Mint Tokens
            </Button>
          ) : (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Connect Wallet to Continue
            </Button>
          )}
        </div>

        {message && (
          <div className="text-center">
            <div className="inline-block px-6 py-3 rounded-xl font-medium bg-green-500/20 text-green-400 ring-1 ring-green-500/30">
              {message}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-8 glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Faucet Info</h3>
        <ol className="space-y-3 text-zinc-400">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">1</span>
            <span>Mint limit: 100 tokens per transaction</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Available on Arbitrum Sepolia testnet</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">3</span>
            <span>Free testnet tokens for development</span>
          </li>
        </ol>
      </div>
    </div>
  );
};
