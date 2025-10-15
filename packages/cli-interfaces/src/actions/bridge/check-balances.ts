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
  STACKS_CONTRACTS,
  WALLET_MNEMONIC_KEY,
  WALLET_PASSWORD
} from '../../config';
import { ERC20_ABI } from '../../abis';
import { getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface EVMBalances {
  address: string;
  arbitrumSepolia: {
    ETH: string;
    USDC: string;
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
  solver: EVMBalances;
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
      arbitrum: string;
      base: string;
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

  // Get Stacks recipient address
  let stacksRecipientAddress = args.values['stacks-recipient'];

  // If not provided, try to derive from mnemonic
  if (!stacksRecipientAddress && WALLET_MNEMONIC_KEY && WALLET_PASSWORD) {
    try {
      console.log('📝 Deriving Stacks recipient from configured mnemonic...');
      stacksRecipientAddress = await getStacksAddress(WALLET_MNEMONIC_KEY, WALLET_PASSWORD);
      console.log(`✅ Stacks recipient: ${stacksRecipientAddress}\n`);
    } catch (error) {
      console.log('⚠️  Could not derive Stacks address from mnemonic. Skipping Stacks balances.\n');
    }
  }

  // Create clients for EVM chains
  const arbitrumClient = createPublicClientForChain(SOURCE_CHAIN);
  const baseClient = createPublicClientForChain(DESTINATION_CHAIN);

  try {
    console.log('🔍 Fetching balances...\n');

    // Fetch all balances in parallel
    const [senderBalances, solverBalances, recipientEvmBalances, recipientStacksBalances] = await Promise.all([
      getEvmBalances(senderAccount.address, arbitrumClient, baseClient),
      getEvmBalances(solverAccount.address, arbitrumClient, baseClient),
      getEvmBalances(evmRecipientAddress, arbitrumClient, baseClient),
      stacksRecipientAddress ? getStacksBalances(stacksRecipientAddress) : null
    ]);

    // Build output structure
    const output: BridgeBalancesOutput = {
      timestamp: new Date().toISOString(),
      sender: senderBalances,
      solver: solverBalances,
      recipient: {
        evm: recipientEvmBalances,
        ...(recipientStacksBalances && { stacks: recipientStacksBalances })
      },
      explorerLinks: {
        sender: {
          arbitrum: `https://sepolia.arbiscan.io/address/${senderAccount.address}`,
          base: `https://sepolia.basescan.org/address/${senderAccount.address}`
        },
        solver: {
          arbitrum: `https://sepolia.arbiscan.io/address/${solverAccount.address}`,
          base: `https://sepolia.basescan.org/address/${solverAccount.address}`
        },
        recipient: {
          evm: {
            arbitrum: `https://sepolia.arbiscan.io/address/${evmRecipientAddress}`,
            base: `https://sepolia.basescan.org/address/${evmRecipientAddress}`
          },
          ...(stacksRecipientAddress && {
            stacks: `https://explorer.hiro.so/address/${stacksRecipientAddress}?chain=testnet`
          })
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
  const [arbitrumETH, baseETH] = await Promise.all([
    arbitrumClient.getBalance({ address: getAddress(address) }),
    baseClient.getBalance({ address: getAddress(address) })
  ]);

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

  // Get sBTC balance on Base Sepolia
  const sbtcAddress = getAddress(DESTINATION_CONTRACTS.sbtc);
  const [sbtcBalance, sbtcDecimals] = await Promise.all([
    baseClient.readContract({
      address: sbtcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [getAddress(address)]
    }),
    baseClient.readContract({
      address: sbtcAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })
  ]);

  return {
    address,
    arbitrumSepolia: {
      ETH: formatTokenAmount(arbitrumETH, 18, ''),
      USDC: formatTokenAmount(usdcBalance, usdcDecimals, '')
    },
    baseSepolia: {
      ETH: formatTokenAmount(baseETH, 18, ''),
      sBTC: formatTokenAmount(sbtcBalance, sbtcDecimals, '')
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

  // Find sBTC token balance
  const sbtcContractId = `${STACKS_CONTRACTS.sbtc.address}.${STACKS_CONTRACTS.sbtc.name}`;
  const sbtcToken = tokens.find(token =>
    token.contractId.toLowerCase().includes(STACKS_CONTRACTS.sbtc.name.toLowerCase())
  );

  return {
    address,
    testnet: {
      STX: stxBalance,
      sBTC: sbtcToken ? sbtcToken.formatted : '0'
    }
  };
}

function displaySummary(output: BridgeBalancesOutput) {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📝 Summary');
  console.log('═'.repeat(60));

  console.log('\n👤 Sender:');
  console.log(`   Address: ${output.sender.address}`);
  console.log(`   Arbitrum Sepolia: ${output.sender.arbitrumSepolia.ETH} ETH, ${output.sender.arbitrumSepolia.USDC} USDC`);
  console.log(`   Base Sepolia: ${output.sender.baseSepolia.ETH} ETH, ${output.sender.baseSepolia.sBTC} sBTC`);

  console.log('\n🔧 Solver:');
  console.log(`   Address: ${output.solver.address}`);
  console.log(`   Arbitrum Sepolia: ${output.solver.arbitrumSepolia.ETH} ETH, ${output.solver.arbitrumSepolia.USDC} USDC`);
  console.log(`   Base Sepolia: ${output.solver.baseSepolia.ETH} ETH, ${output.solver.baseSepolia.sBTC} sBTC`);

  console.log('\n📦 Recipient:');
  console.log(`   EVM Address: ${output.recipient.evm.address}`);
  console.log(`   Arbitrum Sepolia: ${output.recipient.evm.arbitrumSepolia.ETH} ETH, ${output.recipient.evm.arbitrumSepolia.USDC} USDC`);
  console.log(`   Base Sepolia: ${output.recipient.evm.baseSepolia.ETH} ETH, ${output.recipient.evm.baseSepolia.sBTC} sBTC`);

  if (output.recipient.stacks) {
    console.log(`   Stacks Address: ${output.recipient.stacks.address}`);
    console.log(`   Stacks Testnet: ${output.recipient.stacks.testnet.STX} STX, ${output.recipient.stacks.testnet.sBTC} sBTC`);
  }

  console.log('\n💡 Expected Bridge Flow:');
  console.log('   1. 👤 Sender: USDC ↓ on Arbitrum (locked in OpenGate)');
  console.log('   2. 📦 Recipient: ETH/sBTC ↑ on Base or STX/sBTC ↑ on Stacks');
  console.log('   3. 🔧 Solver: USDC ↑ on Arbitrum (after settlement)');
  console.log('                ETH/sBTC ↓ on Base or STX/sBTC ↓ on Stacks');

  console.log('\n🔗 Explorer Links:');
  console.log('   Sender (Arbitrum):', output.explorerLinks.sender.arbitrum);
  console.log('   Sender (Base):', output.explorerLinks.sender.base);
  console.log('   Solver (Arbitrum):', output.explorerLinks.solver.arbitrum);
  console.log('   Solver (Base):', output.explorerLinks.solver.base);
  console.log('   Recipient (Arbitrum):', output.explorerLinks.recipient.evm.arbitrum);
  console.log('   Recipient (Base):', output.explorerLinks.recipient.evm.base);
  if (output.explorerLinks.recipient.stacks) {
    console.log('   Recipient (Stacks):', output.explorerLinks.recipient.stacks);
  }
}
