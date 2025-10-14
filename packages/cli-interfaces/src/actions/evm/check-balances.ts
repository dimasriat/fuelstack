import { parseArgs } from 'node:util';
import { createPublicClientForChain, formatTokenAmount, SOURCE_CHAIN, DESTINATION_CHAIN } from '../utils/evm';
import { SENDER_PRIVATE_KEY, SOLVER_PRIVATE_KEY, SOURCE_CONTRACTS, DESTINATION_CONTRACTS, DEFAULT_RECIPIENT_ADDRESS } from '../config';
import { ERC20_ABI } from '../abis';
import { getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface CheckBalancesArgs {
  recipient?: string;
  save?: string;
}

interface TokenBalance {
  symbol: string;
  balance: bigint;
  decimals: number;
  formatted: string;
}

interface ChainBalances {
  chainName: string;
  nativeBalance: string;
  tokens: TokenBalance[];
}

interface RoleBalances {
  role: string;
  address: string;
  arbitrumSepolia: ChainBalances;
  baseSepolia: ChainBalances;
}

export async function checkBalances() {
  console.log('🌉 Intent Bridge Balance Check');
  console.log('📍 Arbitrum Sepolia (Source) → Base Sepolia (Destination)\n');

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      recipient: { type: 'string' },
      save: { type: 'string' }
    }
  });

  // Get addresses from private keys
  const senderAccount = privateKeyToAccount(`0x${SENDER_PRIVATE_KEY.replace('0x', '')}`);
  const solverAccount = privateKeyToAccount(`0x${SOLVER_PRIVATE_KEY.replace('0x', '')}`);
  
  // Get recipient address (default to DEFAULT_RECIPIENT_ADDRESS)
  const recipientAddress = args.values.recipient 
    ? getAddress(args.values.recipient)
    : getAddress(DEFAULT_RECIPIENT_ADDRESS);

  // Create clients for both chains
  const arbitrumClient = createPublicClientForChain(SOURCE_CHAIN);
  const baseClient = createPublicClientForChain(DESTINATION_CHAIN);

  try {
    console.log('🔍 Fetching balances across both chains...\n');

    // Get all balances in parallel
    const [senderBalances, solverBalances, recipientBalances] = await Promise.all([
      getRoleBalances('👤 Sender', senderAccount.address, arbitrumClient, baseClient),
      getRoleBalances('🔧 Solver', solverAccount.address, arbitrumClient, baseClient),
      getRoleBalances('📦 Recipient', recipientAddress, arbitrumClient, baseClient)
    ]);

    // Display results
    displayBalancesTable([senderBalances, solverBalances, recipientBalances]);

    // Save to file if requested
    if (args.values.save) {
      const balanceData = {
        timestamp: new Date().toISOString(),
        sender: senderBalances,
        solver: solverBalances,
        recipient: recipientBalances
      };
      
      const fs = await import('fs/promises');
      await fs.writeFile(args.values.save, JSON.stringify(balanceData, null, 2));
      console.log(`\n💾 Balances saved to ${args.values.save}`);
    }

  } catch (error) {
    console.error('❌ Error checking balances:', error);
    process.exit(1);
  }
}

async function getRoleBalances(
  role: string,
  address: string,
  arbitrumClient: any,
  baseClient: any
): Promise<RoleBalances> {
  // Get native ETH balances
  const [arbitrumETH, baseETH] = await Promise.all([
    arbitrumClient.getBalance({ address }),
    baseClient.getBalance({ address })
  ]);

  // Get token balances on Arbitrum Sepolia (USDC)
  const usdcAddress = getAddress(SOURCE_CONTRACTS.usdc);
  const [usdcBalance, usdcDecimals] = await Promise.all([
    arbitrumClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address]
    }),
    arbitrumClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })
  ]);

  // Get token balances on Base Sepolia (sBTC)
  const sbtcAddress = getAddress(DESTINATION_CONTRACTS.sbtc);
  const [sbtcBalance, sbtcDecimals] = await Promise.all([
    baseClient.readContract({
      address: sbtcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address]
    }),
    baseClient.readContract({
      address: sbtcAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })
  ]);

  return {
    role,
    address,
    arbitrumSepolia: {
      chainName: 'Arbitrum Sepolia',
      nativeBalance: formatTokenAmount(arbitrumETH, 18, 'ETH'),
      tokens: [
        {
          symbol: 'USDC',
          balance: usdcBalance,
          decimals: usdcDecimals,
          formatted: formatTokenAmount(usdcBalance, usdcDecimals, 'USDC')
        }
      ]
    },
    baseSepolia: {
      chainName: 'Base Sepolia',
      nativeBalance: formatTokenAmount(baseETH, 18, 'ETH'),
      tokens: [
        {
          symbol: 'sBTC',
          balance: sbtcBalance,
          decimals: sbtcDecimals,
          formatted: formatTokenAmount(sbtcBalance, sbtcDecimals, 'sBTC')
        }
      ]
    }
  };
}

function displayBalancesTable(balances: RoleBalances[]) {
  // Create table data
  const tableData = balances.map(balance => ({
    'Role': balance.role,
    'Arbitrum ETH': balance.arbitrumSepolia.nativeBalance,
    'Arbitrum USDC': balance.arbitrumSepolia.tokens[0].formatted,
    'Base ETH': balance.baseSepolia.nativeBalance,
    'Base sBTC': balance.baseSepolia.tokens[0].formatted
  }));

  console.table(tableData);

  // Display addresses
  console.log('📍 Addresses:');
  balances.forEach(balance => {
    console.log(`  ${balance.role}: ${balance.address}`);
  });

  // Display expected flow
  console.log('\n💡 Expected Intent Bridge Flow:');
  console.log('  1. 👤 Sender: USDC ↓ on Arbitrum (locked in OpenGate)');
  console.log('  2. 📦 Recipient: ETH/sBTC ↑ on Base (received from solver)');
  console.log('  3. 🔧 Solver: USDC ↑ on Arbitrum (received after settlement)');
  console.log('             ETH/sBTC ↓ on Base (sent to recipient)');
}