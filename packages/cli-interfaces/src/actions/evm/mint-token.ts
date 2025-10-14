import { parseArgs } from 'node:util';
import { createPublicClientForChain, createWalletClientForChain, formatTokenAmount, parseTokenAmount, getTxExplorerUrl, type ChainKey } from '../../utils/evm';
import { SENDER_PRIVATE_KEY, CHAIN_IDS } from '../../config';
import { ERC20_ABI } from '../../abis';
import { getAddress } from 'viem';

interface MintTokenArgs {
  chainId: string;
  tokenAddress: string;
  userAddress: string;
  amount?: string;
}

export async function mintToken() {
  console.log('🪙 Minting test tokens...\n');

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      'chain-id': { type: 'string' },
      'token-address': { type: 'string' },
      'user-address': { type: 'string' },
      amount: { type: 'string' }
    }
  });

  // Validate chain ID
  const chainIdStr = args.values['chain-id'];
  if (!chainIdStr || !['421614', '84532'].includes(chainIdStr)) {
    console.error('❌ Invalid chain ID. Use --chain-id 421614 (Arbitrum Sepolia) or --chain-id 84532 (Base Sepolia)');
    process.exit(1);
  }
  const chainId = parseInt(chainIdStr);

  // Validate token address
  const tokenAddressStr = args.values['token-address'];
  if (!tokenAddressStr) {
    console.error('❌ Token address required. Use --token-address <address>');
    process.exit(1);
  }
  const tokenAddress = getAddress(tokenAddressStr);

  // Validate user address
  const userAddressStr = args.values['user-address'];
  if (!userAddressStr) {
    console.error('❌ User address required. Use --user-address <address>');
    process.exit(1);
  }
  const userAddress = getAddress(userAddressStr);

  // Determine chain
  const chainKey: ChainKey = chainId === CHAIN_IDS.arbitrumSepolia ? 'arbitrumSepolia' : 'baseSepolia';
  const chainName = chainId === CHAIN_IDS.arbitrumSepolia ? 'Arbitrum Sepolia' : 'Base Sepolia';

  // Create clients
  const publicClient = createPublicClientForChain(chainKey);
  const walletClient = createWalletClientForChain(chainKey, SENDER_PRIVATE_KEY);

  try {
    // Get token info
    console.log('🔍 Fetching token information...');
    const [decimals, symbol] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals'
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol'
      })
    ]);

    // Determine default amount based on token
    let defaultAmount: string;
    if (symbol === 'USDC') {
      defaultAmount = '1000'; // 1000 USDC
    } else if (symbol === 'sBTC') {
      defaultAmount = '10'; // 10 sBTC
    } else {
      defaultAmount = '100'; // 100 of unknown token
    }

    const amount = args.values.amount || defaultAmount;
    const amountBigInt = parseTokenAmount(amount, decimals);

    console.log('📋 Mint Details:');
    console.log(`  Chain: ${chainName}`);
    console.log(`  Token: ${symbol} (${tokenAddress})`);
    console.log(`  Decimals: ${decimals}`);
    console.log(`  User: ${userAddress}`);
    console.log(`  Amount: ${amount} ${symbol}`);
    console.log(`  Minter: ${walletClient.account.address}`);
    console.log('');

    // Check current balance
    console.log('🔍 Checking current balance...');
    const currentBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    console.log(`  Current balance: ${formatTokenAmount(currentBalance, decimals, symbol)}`);

    // Mint tokens
    console.log('\n🚀 Minting tokens...');
    const mintTx = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [userAddress, amountBigInt]
    });

    console.log(`⏳ Transaction submitted: ${getTxExplorerUrl(chainKey, mintTx)}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
    
    if (receipt.status !== 'success') {
      console.error('❌ Transaction failed');
      process.exit(1);
    }

    // Check new balance
    console.log('\n🔍 Checking new balance...');
    const newBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    console.log('\n✅ Tokens minted successfully!');
    console.log(`💰 New balance: ${formatTokenAmount(newBalance, decimals, symbol)}`);
    console.log(`📈 Minted: ${formatTokenAmount(amountBigInt, decimals, symbol)}`);
    console.log(`🔗 Transaction: ${getTxExplorerUrl(chainKey, mintTx)}`);

  } catch (error) {
    console.error('❌ Error minting tokens:', error);
    process.exit(1);
  }
}