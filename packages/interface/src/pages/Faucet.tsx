import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { TokenSelector } from '../components/TokenSelector';
import { ChainSelector, type Chain } from '../components/ChainSelector';
import { ERC20_ABI, DEFAULT_MINT_AMOUNTS, getTokenAddress, getTxExplorerUrl } from '../lib/contracts';

const TOKENS = [
  { symbol: 'USDC' as const, name: 'Mock USDC', address: '0xFe1EF6950833f6C148DB87e0131aB44B16F9C91F' as `0x${string}` },
  { symbol: 'WBTC' as const, name: 'Mock WBTC', address: '0xfe0bA1A1676Bf7ec0AB3e578db8252ff1524C380' as `0x${string}` },
];

const CHAINS: Chain[] = [
  { id: 421614, name: 'Arbitrum Sepolia', shortName: 'Arbitrum Testnet' },
  { id: 84532, name: 'Base Sepolia', shortName: 'Base Testnet' },
  { id: 11155420, name: 'Optimism Sepolia', shortName: 'Optimism Testnet' },
];

export const Faucet = () => {
  const { address, isConnected, chain: connectedChain } = useAccount();
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Get token address for selected chain
  const tokenAddress = getTokenAddress(selectedChain.id, selectedToken.symbol);

  // Read token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: selectedChain.id,
  });

  // Read token symbol
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId: selectedChain.id,
  });

  // Read user balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: selectedChain.id,
    query: {
      enabled: !!address,
    },
  });

  // Write contract hook for minting
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: selectedChain.id,
  });

  // Update message when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      const amount = DEFAULT_MINT_AMOUNTS[selectedToken.symbol];
      setMessage(`Successfully minted ${amount} ${selectedToken.symbol}!`);
      setTxHash(hash);
      refetchBalance();
    }
  }, [isSuccess, hash, selectedToken.symbol, refetchBalance]);

  // Update message on error
  useEffect(() => {
    if (error) {
      setMessage(`Error: ${error.message}`);
    }
  }, [error]);

  const handleMint = async () => {
    if (!address || !decimals) return;

    setMessage('');
    setTxHash(null);

    try {
      const amount = DEFAULT_MINT_AMOUNTS[selectedToken.symbol];
      const amountInWei = parseUnits(amount, decimals);

      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [address, amountInWei],
        chainId: selectedChain.id,
      });
    } catch (err) {
      console.error('Mint error:', err);
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const loading = isPending || isConfirming;
  const formattedBalance = balance && decimals
    ? formatUnits(balance, decimals)
    : '0.00';

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
          Test Token Faucet
        </h1>
        <p className="text-zinc-400 text-lg">
          Get test tokens for EVM testnets
        </p>
      </div>

      <Card className="space-y-6">
        {/* Chain Selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">
            Select Chain
          </label>
          <ChainSelector
            chains={CHAINS}
            selected={selectedChain}
            onSelect={setSelectedChain}
          />
        </div>

        {/* Token Selector */}
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

        {/* Current Balance */}
        {isConnected && (
          <div className="glass rounded-2xl p-5">
            <div className="text-sm text-zinc-400 mb-1">Your Balance</div>
            <div className="text-2xl font-bold text-white">
              {formattedBalance} {selectedToken.symbol}
            </div>
          </div>
        )}

        {/* Mint Amount Preview */}
        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-zinc-500 mb-2">You will receive</div>
          <div className="text-3xl font-bold text-white">
            {DEFAULT_MINT_AMOUNTS[selectedToken.symbol]} {selectedToken.symbol}
          </div>
        </div>

        {/* Mint Button */}
        <div className="pt-2">
          {isConnected ? (
            <Button
              variant="primary"
              className="w-full text-lg py-4"
              onClick={handleMint}
              disabled={loading || !decimals}
              loading={loading}
            >
              {isPending && 'Confirm in Wallet...'}
              {isConfirming && 'Minting...'}
              {!loading && 'Mint Tokens'}
            </Button>
          ) : (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Connect Wallet to Continue
            </Button>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-xl font-medium ${
              message.includes('Error')
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                : 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
            }`}>
              {message}
            </div>
          </div>
        )}

        {/* Transaction Link */}
        {txHash && (
          <div className="text-center">
            <a
              href={getTxExplorerUrl(selectedChain.id, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400 transition-colors text-sm"
            >
              View Transaction
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </Card>

      {/* Faucet Info */}
      <div className="mt-8 glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Faucet Info</h3>
        <ol className="space-y-3 text-zinc-400">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">1</span>
            <span>Mint 1000 USDC or 10 WBTC per transaction</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Available on Arbitrum, Base, and Optimism Sepolia</span>
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
