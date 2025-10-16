import { parseArgs } from 'node:util';
import { createPublicClientForChain, formatTokenAmount, SOURCE_CHAIN, DESTINATION_CHAIN } from '../../utils/evm';
import {
  fetchStacksBalances,
  formatMicroStx,
  parseFungibleTokens,
  getStacksAddress
} from '../../utils/stacks';
import {
  SENDER_PRIVATE_KEY,
  SOLVER_PRIVATE_KEY,
  SOURCE_CONTRACTS,
  DESTINATION_CONTRACTS,
  DEFAULT_RECIPIENT_ADDRESS,
  DEFAULT_STACKS_SOLVER,
  DEFAULT_STACKS_RECIPIENT,
  STACKS_CONTRACTS
} from '../../config';
import { ERC20_ABI } from '../../abis';
import { getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface EVMBalances {
  address: string;
  arbitrumSepolia: {
    ETH: string;
    USDC: string;
    WBTC: string;
  };
  baseSepolia: {
    ETH: string;
    sBTC: string;
  };
}

interface StacksBalances {
  address: string;
  testnet: {
    STX: string;
    sBTC: string;
  };
}

interface BridgeBalancesOutput {
  timestamp: string;
  sender: EVMBalances;
  solver: {
    evm: EVMBalances;
    stacks?: StacksBalances;
  };
  recipient: {
    evm: EVMBalances;
    stacks?: StacksBalances;
  };
  explorerLinks: {
    sender: {
      arbitrum: string;
      base: string;
    };
    solver: {
      evm: {
        arbitrum: string;
        base: string;
      };
      stacks?: string;
    };
    recipient: {
      evm: {
        arbitrum: string;
        base: string;
      };
      stacks?: string;
    };
  };
}

export async function checkBalances() {
  console.log('🌉 Bridge Balance Check');
  console.log('📊 Checking balances across EVM and Stacks chains\n');

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      recipient: { type: 'string' },
      'stacks-solver': { type: 'string' },
      'stacks-recipient': { type: 'string' },
      save: { type: 'string' }
    }
  });

  // Get EVM addresses from private keys
  const senderAccount = privateKeyToAccount(`0x${SENDER_PRIVATE_KEY.replace('0x', '')}`);
  const solverAccount = privateKeyToAccount(`0x${SOLVER_PRIVATE_KEY.replace('0x', '')}`);

  // Get EVM recipient address (default to DEFAULT_RECIPIENT_ADDRESS)
  const evmRecipientAddress = args.values.recipient
    ? getAddress(args.values.recipient)
    : getAddress(DEFAULT_RECIPIENT_ADDRESS);

  // Get Stacks addresses (use defaults or CLI overrides)
  const stacksSolverAddress = args.values['stacks-solver'] || DEFAULT_STACKS_SOLVER;
  const stacksRecipientAddress = args.values['stacks-recipient'] || DEFAULT_STACKS_RECIPIENT;

  console.log('📝 Stacks addresses:');
  console.log(`   Solver: ${stacksSolverAddress}`);
  console.log(`   Recipient: ${stacksRecipientAddress}\n`);

  // Create clients for EVM chains
  const arbitrumClient = createPublicClientForChain(SOURCE_CHAIN);
  const baseClient = createPublicClientForChain(DESTINATION_CHAIN);

  try {
    console.log('🔍 Fetching balances...\n');

    // Fetch all balances in parallel
    const [senderBalances, solverEvmBalances, solverStacksBalances, recipientEvmBalances, recipientStacksBalances] = await Promise.all([
      getEvmBalances(senderAccount.address, arbitrumClient, baseClient),
      getEvmBalances(solverAccount.address, arbitrumClient, baseClient),
      getStacksBalances(stacksSolverAddress),
      getEvmBalances(evmRecipientAddress, arbitrumClient, baseClient),
      getStacksBalances(stacksRecipientAddress)
    ]);

    // Build output structure
    const output: BridgeBalancesOutput = {
      timestamp: new Date().toISOString(),
      sender: senderBalances,
      solver: {
        evm: solverEvmBalances,
        stacks: solverStacksBalances
      },
      recipient: {
        evm: recipientEvmBalances,
        stacks: recipientStacksBalances
      },
      explorerLinks: {
        sender: {
          arbitrum: `https://sepolia.arbiscan.io/address/${senderAccount.address}`,
          base: `https://sepolia.basescan.org/address/${senderAccount.address}`
        },
        solver: {
          evm: {
            arbitrum: `https://sepolia.arbiscan.io/address/${solverAccount.address}`,
            base: `https://sepolia.basescan.org/address/${solverAccount.address}`
          },
          stacks: `https://explorer.hiro.so/address/${stacksSolverAddress}?chain=testnet`
        },
        recipient: {
          evm: {
            arbitrum: `https://sepolia.arbiscan.io/address/${evmRecipientAddress}`,
            base: `https://sepolia.basescan.org/address/${evmRecipientAddress}`
          },
          stacks: `https://explorer.hiro.so/address/${stacksRecipientAddress}?chain=testnet`
        }
      }
    };

    // Display compact JSON output
    console.log('📊 Balance Summary:\n');
    console.log(JSON.stringify(output, null, 2));

    // Display summary
    displaySummary(output);

    // Save to file if requested
    if (args.values.save) {
      const fs = await import('fs/promises');
      await fs.writeFile(args.values.save, JSON.stringify(output, null, 2));
      console.log(`\n💾 Balances saved to ${args.values.save}`);
    }

  } catch (error) {
    console.error('❌ Error checking balances:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

async function getEvmBalances(
  address: string,
  arbitrumClient: any,
  baseClient: any
): Promise<EVMBalances> {
  // Get native ETH balances
  const arbitrumETH = await arbitrumClient.getBalance({ address: getAddress(address) });
  // const baseETH = await baseClient.getBalance({ address: getAddress(address) });

  // Get USDC balance on Arbitrum Sepolia
  const usdcAddress = getAddress(SOURCE_CONTRACTS.usdc);
  const [usdcBalance, usdcDecimals] = await Promise.all([
    arbitrumClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [getAddress(address)]
    }),
    arbitrumClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })
  ]);

  // Get WBTC balance on Arbitrum Sepolia
  const wbtcAddress = getAddress(SOURCE_CONTRACTS.wbtc);
  const [wbtcBalance, wbtcDecimals] = await Promise.all([
    arbitrumClient.readContract({
      address: wbtcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [getAddress(address)]
    }),
    arbitrumClient.readContract({
      address: wbtcAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })
  ]);

  // Get sBTC balance on Base Sepolia
  // const sbtcAddress = getAddress(DESTINATION_CONTRACTS.sbtc);
  // const [sbtcBalance, sbtcDecimals] = await Promise.all([
  //   baseClient.readContract({
  //     address: sbtcAddress,
  //     abi: ERC20_ABI,
  //     functionName: 'balanceOf',
  //     args: [getAddress(address)]
  //   }),
  //   baseClient.readContract({
  //     address: sbtcAddress,
  //     abi: ERC20_ABI,
  //     functionName: 'decimals'
  //   })
  // ]);

  return {
    address,
    arbitrumSepolia: {
      ETH: formatTokenAmount(arbitrumETH, 18, ''),
      USDC: formatTokenAmount(usdcBalance, usdcDecimals, ''),
      WBTC: formatTokenAmount(wbtcBalance, wbtcDecimals, '')
    },
    baseSepolia: {
      ETH: '0 ',
      sBTC: '0 '
    }
  };
}

async function getStacksBalances(address: string): Promise<StacksBalances> {
  // Fetch balances from Hiro API
  const balances = await fetchStacksBalances(address);

  // Parse STX balance
  const stxBalance = formatMicroStx(balances.stx.balance);

  // Parse fungible tokens to find sBTC
  const tokens = parseFungibleTokens(balances.fungible_tokens || {});

  // Find sBTC token balance using full contract prefix
  // Contract ID format: ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX.mock-sbtc::sbtc
  const sbtcContractPrefix = `${STACKS_CONTRACTS.sbtc.address}.${STACKS_CONTRACTS.sbtc.name}`;
  const sbtcToken = tokens.find(token =>
    token.contractId.toLowerCase().startsWith(sbtcContractPrefix.toLowerCase())
  );

  return {
    address,
    testnet: {
      STX: stxBalance,
      sBTC: sbtcToken ? sbtcToken.formatted : '0 sBTC'
    }
  };
}

function displaySummary(output: BridgeBalancesOutput) {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📝 Summary');
  console.log('═'.repeat(60));

  console.log('\n👤 Sender:');
  console.log(`   EVM Address: ${output.sender.address}`);
  console.log(`   Arbitrum Sepolia: ${output.sender.arbitrumSepolia.ETH} ETH, ${output.sender.arbitrumSepolia.USDC} USDC, ${output.sender.arbitrumSepolia.WBTC} WBTC`);
  // console.log(`   Base Sepolia: ${output.sender.baseSepolia.ETH} ETH, ${output.sender.baseSepolia.sBTC} sBTC`);

  console.log('\n🔧 Solver:');
  console.log(`   EVM Address: ${output.solver.evm.address}`);
  console.log(`   Arbitrum Sepolia: ${output.solver.evm.arbitrumSepolia.ETH} ETH, ${output.solver.evm.arbitrumSepolia.USDC} USDC, ${output.solver.evm.arbitrumSepolia.WBTC} WBTC`);
  // console.log(`   Base Sepolia: ${output.solver.evm.baseSepolia.ETH} ETH, ${output.solver.evm.baseSepolia.sBTC} sBTC`);
  if (output.solver.stacks) {
    console.log(`   Stacks Address: ${output.solver.stacks.address}`);
    console.log(`   Stacks Testnet: ${output.solver.stacks.testnet.STX}, ${output.solver.stacks.testnet.sBTC}`);
  }

  console.log('\n📦 Recipient:');
  console.log(`   EVM Address: ${output.recipient.evm.address}`);
  console.log(`   Arbitrum Sepolia: ${output.recipient.evm.arbitrumSepolia.ETH} ETH, ${output.recipient.evm.arbitrumSepolia.USDC} USDC, ${output.recipient.evm.arbitrumSepolia.WBTC} WBTC`);
  // console.log(`   Base Sepolia: ${output.recipient.evm.baseSepolia.ETH} ETH, ${output.recipient.evm.baseSepolia.sBTC} sBTC`);
  if (output.recipient.stacks) {
    console.log(`   Stacks Address: ${output.recipient.stacks.address}`);
    console.log(`   Stacks Testnet: ${output.recipient.stacks.testnet.STX}, ${output.recipient.stacks.testnet.sBTC}`);
  }

  console.log('\n💡 Expected Bridge Flow:');
  console.log('   1. 👤 Sender: USDC/WBTC ↓ on Arbitrum (locked in OpenGate)');
  console.log('   2. 📦 Recipient: STX/sBTC ↑ on Stacks');
  console.log('   3. 🔧 Solver: USDC/WBTC ↑ on Arbitrum (after settlement)');
  console.log('                STX/sBTC ↓ on Stacks');
}
