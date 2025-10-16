import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, decodeEventLog } from 'viem';
import { ArrowDown } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TokenSelector } from '../components/TokenSelector';
import { ChainSelector, type Chain } from '../components/ChainSelector';
import {
  ERC20_ABI,
  OPENGATE_ABI,
  BRIDGE_OUTPUT_AMOUNTS,
  SBTC_CONTRACT_ADDRESS,
  getTokenAddress,
  getOpenGateAddress,
  getTxExplorerUrl,
} from '../lib/contracts';

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
  { id: 'stx' as const, label: 'STX', description: 'Native Stacks token' },
  { id: 'sbtc' as const, label: 'sBTC', description: 'Stacks Bitcoin' },
];

export const Bridge = () => {
  const { address, isConnected } = useAccount();
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [stacksAddress, setStacksAddress] = useState('');
  const [outputType, setOutputType] = useState<'stx' | 'sbtc'>('stx');
  const [message, setMessage] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<`0x${string}` | null>(null);
  const [orderId, setOrderId] = useState<bigint | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Get addresses
  const tokenAddress = getTokenAddress(selectedChain.id, selectedToken.symbol as 'USDC' | 'WBTC');
  const openGateAddress = getOpenGateAddress(selectedChain.id);

  // Read token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
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

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && openGateAddress ? [address, openGateAddress] : undefined,
    chainId: selectedChain.id,
    query: {
      enabled: !!address && !!openGateAddress,
    },
  });

  // Write contracts
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeBridge, data: bridgeHash, isPending: isBridgePending } = useWriteContract();

  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
    chainId: selectedChain.id,
  });

  // Wait for bridge transaction
  const { isLoading: isBridgeConfirming, isSuccess: isBridgeSuccess, data: bridgeReceipt } = useWaitForTransactionReceipt({
    hash: bridgeHash,
    chainId: selectedChain.id,
  });

  // Parse order ID from bridge transaction logs
  useEffect(() => {
    if (isBridgeSuccess && bridgeReceipt) {
      setMessage('Order opened successfully!');
      setBridgeTxHash(bridgeHash!);

      // Parse logs to find OrderOpened event
      for (const log of bridgeReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: OPENGATE_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'OrderOpened') {
            setOrderId(decoded.args.orderId as bigint);
            break;
          }
        } catch {
          // Not an OrderOpened event
        }
      }
    }
  }, [isBridgeSuccess, bridgeReceipt, bridgeHash]);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      setMessage('Approval successful! Click Bridge Tokens to continue');
      setApproveTxHash(approveHash!);
      setIsApproved(true);
      refetchAllowance();
    }
  }, [isApproveSuccess, approveHash, refetchAllowance]);

  // Reset approval state when amount or token changes
  useEffect(() => {
    setIsApproved(false);
  }, [amount, selectedToken.symbol]);

  const handleApprove = async () => {
    if (!address || !decimals || !openGateAddress) return;

    setMessage('');
    const amountInWei = parseUnits(amount, decimals);

    try {
      writeApprove({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [openGateAddress, amountInWei],
        chainId: selectedChain.id,
      });
    } catch (err) {
      console.error('Approve error:', err);
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleBridge = async () => {
    if (!address || !decimals || !openGateAddress) return;

    setMessage('');
    setIsApproved(false);
    setBridgeTxHash(null);
    setOrderId(null);

    try {
      const amountIn = parseUnits(amount, decimals);
      const amountOut = BRIDGE_OUTPUT_AMOUNTS[outputType === 'stx' ? 'STX' : 'sBTC'];
      const tokenOut = outputType === 'stx'
        ? '0x0000000000000000000000000000000000000000' as `0x${string}`
        : SBTC_CONTRACT_ADDRESS;

      const fillDeadline = Math.floor(Date.now() / 1000) + (24 * 3600); // 24 hours from now

      writeBridge({
        address: openGateAddress,
        abi: OPENGATE_ABI,
        functionName: 'open',
        args: [
          tokenAddress,
          amountIn,
          tokenOut,
          amountOut,
          stacksAddress,
          BigInt(fillDeadline),
        ],
        chainId: selectedChain.id,
      });
    } catch (err) {
      console.error('Bridge error:', err);
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
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
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-3xl font-semibold focus:outline-none text-white placeholder:text-zinc-700"
                />
              </div>
              <div className="text-sm text-zinc-500 pt-2 border-t border-white/5">
                Balance: <span className="text-white">
                  {balance && decimals ? formatUnits(balance, decimals) : '0.00'} {selectedToken.symbol}
                </span>
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
        <div className="glass rounded-2xl p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-400">You will receive</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-500">
                1.0 {OUTPUT_TYPES.find(t => t.id === outputType)?.label}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Fixed output amount
              </div>
            </div>
          </div>
        </div>

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
          {!isConnected ? (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Connect Wallet to Continue
            </Button>
          ) : !openGateAddress ? (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Bridge not available on {selectedChain.name}
            </Button>
          ) : !amount || !stacksAddress ? (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Enter amount and Stacks address
            </Button>
          ) : !decimals ? (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Loading token data...
            </Button>
          ) : balance && BigInt(parseUnits(amount, decimals)) > balance ? (
            <Button variant="secondary" className="w-full text-lg py-4" disabled>
              Insufficient Balance
            </Button>
          ) : (!isApproved && (!allowance || allowance < BigInt(parseUnits(amount, decimals)))) ? (
            <Button
              variant="primary"
              className="w-full text-lg py-4"
              onClick={handleApprove}
              disabled={isApprovePending || isApproveConfirming}
              loading={isApprovePending || isApproveConfirming}
            >
              {isApprovePending && 'Confirm Approval in Wallet...'}
              {isApproveConfirming && 'Approving...'}
              {!isApprovePending && !isApproveConfirming && `Approve ${selectedToken.symbol}`}
            </Button>
          ) : (
            <Button
              variant="primary"
              className="w-full text-lg py-4"
              onClick={handleBridge}
              disabled={isBridgePending || isBridgeConfirming}
              loading={isBridgePending || isBridgeConfirming}
            >
              {isBridgePending && 'Confirm in Wallet...'}
              {isBridgeConfirming && 'Opening Order...'}
              {!isBridgePending && !isBridgeConfirming && 'Bridge Tokens'}
            </Button>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-xl font-medium ${
              message.includes('successfully') || message.includes('approved')
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                : message.includes('Error')
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                : 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
            }`}>
              {message}
            </div>
          </div>
        )}

        {/* Transaction Links */}
        {(approveTxHash || bridgeTxHash) && (
          <div className="space-y-2">
            {approveTxHash && (
              <div className="text-center text-sm">
                <a
                  href={getTxExplorerUrl(selectedChain.id, approveTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-primary-500 transition-colors"
                >
                  View Approval Transaction
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
            {bridgeTxHash && (
              <div className="text-center text-sm">
                <a
                  href={getTxExplorerUrl(selectedChain.id, bridgeTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400 transition-colors"
                >
                  View Bridge Transaction
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
            {orderId !== null && (
              <div className="text-center">
                <div className="inline-block px-6 py-3 rounded-xl font-medium bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30">
                  Order ID: #{orderId.toString()}
                </div>
              </div>
            )}
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
