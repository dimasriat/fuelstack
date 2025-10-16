import { getAddress } from 'viem';
import {
  createPublicClientForChain,
  SOURCE_CHAIN,
  formatTokenAmount,
} from './utils';
import {
  SOLVER_STACKS_CONFIG,
  SOURCE_CONTRACTS,
  STACKS_CONTRACTS,
} from './config';
import { OPENGATE_ABI } from './abis';
import {
  generateWallet,
  generateNewAccount,
  getStxAddress,
  Wallet,
} from '@stacks/wallet-sdk';
import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  principalCV,
  stringAsciiCV,
} from '@stacks/transactions';
import type { StxPostCondition } from '@stacks/transactions';
import { clientFromNetwork, STACKS_TESTNET } from '@stacks/network';

const zeroAddress = '0x0000000000000000000000000000000000000000';
const client = clientFromNetwork(STACKS_TESTNET);

export class StacksOrderFiller {
  private sourceClient;
  private wallet: Wallet | null = null;

  constructor() {
    this.sourceClient = createPublicClientForChain(SOURCE_CHAIN);
  }

  async fillOrder(orderIdStr: string): Promise<boolean> {
    try {
      const orderId = BigInt(orderIdStr);

      // Step 1: Get order details from source chain (Arbitrum)
      console.log('  📖 Reading order details from Arbitrum Sepolia...');
      const openGateAddress = getAddress(SOURCE_CONTRACTS.openGate);

      const order = await this.sourceClient.readContract({
        address: openGateAddress,
        abi: OPENGATE_ABI,
        functionName: 'orders',
        args: [orderId],
      });

      const [sender, tokenIn, amountIn, tokenOut, amountOut, recipient, fillDeadline, sourceChainId] = order;

      // Step 2: Validate order exists
      if (sender === '0x0000000000000000000000000000000000000000') {
        console.log('  ❌ Order does not exist');
        return false;
      }

      // Step 3: Check deadline
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > Number(fillDeadline)) {
        console.log('  ❌ Order deadline has passed');
        return false;
      }

      // Step 4: Initialize wallet
      if (!this.wallet) {
        console.log('  🔐 Generating Stacks wallet...');
        let wallet = await generateWallet({
          secretKey: SOLVER_STACKS_CONFIG.mnemonicKey,
          password: SOLVER_STACKS_CONFIG.password,
        });
        // Generate account 1 (solver account)
        wallet = generateNewAccount(wallet);
        this.wallet = wallet;
      }

      const account = this.wallet.accounts[1];
      const senderKey = account.stxPrivateKey;
      const senderAddress = getStxAddress({ account, network: 'testnet' });

      console.log(`  👤 Solver address: ${senderAddress}`);

      // Step 5: Convert amounts and determine token type
      const isNativeToken = tokenOut.toLowerCase() === zeroAddress.toLowerCase();
      const tokenSymbol = isNativeToken ? 'STX' : 'sBTC';

      let stacksAmountOut: bigint;
      if (isNativeToken) {
        // Native: EVM 18 decimals → Stacks 6 decimals (÷ 10^12)
        stacksAmountOut = amountOut / BigInt(10 ** 12);
      } else {
        // sBTC: both use 8 decimals, no conversion
        stacksAmountOut = amountOut;
      }

      console.log(`  💰 Filling: ${formatTokenAmount(stacksAmountOut, isNativeToken ? 6 : 8, tokenSymbol)}`);

      // Step 6: Check balance
      const balanceResponse = await fetch(
        `https://api.testnet.hiro.so/v2/accounts/${senderAddress}?proof=0`
      );
      const balanceData = (await balanceResponse.json()) as { balance: string };
      const stxBalance = BigInt(balanceData.balance);

      const requiredStx = stacksAmountOut + BigInt(10000); // amount + 0.01 STX for fees

      console.log(`\n💰 Balance Check:`);
      console.log(`   Current balance: ${stxBalance} micro-STX (${Number(stxBalance) / 1e6} STX)`);
      console.log(`   Fill amount:     ${stacksAmountOut} micro-STX (${Number(stacksAmountOut) / 1e6} STX)`);
      console.log(`   Est. tx fee:     10000 micro-STX (0.01 STX)`);
      console.log(`   Total required:  ${requiredStx} micro-STX (${Number(requiredStx) / 1e6} STX)`);

      if (stxBalance < requiredStx) {
        console.log(`  ❌ Insufficient STX balance`);
        return false;
      }

      // Step 7: Get nonce
      const nonceResponse = await fetch(
        `https://api.testnet.hiro.so/v2/accounts/${senderAddress}?proof=0`
      );
      const nonceData = (await nonceResponse.json()) as { nonce: number };
      const nonce = nonceData.nonce;

      // Step 8: Build fill transaction
      console.log('  🚀 Executing fill transaction on Stacks...');

      // recipient is now a Stacks address from OpenGateV2 (string type)
      const stacksRecipient = recipient;
      const solverEvmAddress = SOLVER_STACKS_CONFIG.solverEvmAddress;

      console.log(`  👤 Recipient (Stacks): ${stacksRecipient}`);
      console.log(`  👤 Solver (EVM): ${solverEvmAddress}`);

      // Create post-condition for STX transfer (v7 API)
      const stxPostCondition: StxPostCondition = {
        type: 'stx-postcondition',
        address: senderAddress,
        condition: 'lte',
        amount: stacksAmountOut.toString(),
      };

      // Build transaction with v7 API
      const tx = await makeContractCall({
        client,
        network: 'testnet',
        contractAddress: STACKS_CONTRACTS.fillGate.address,
        contractName: STACKS_CONTRACTS.fillGate.name,
        functionName: 'fill-native',
        functionArgs: [
          uintCV(Number(orderId)),
          uintCV(Number(stacksAmountOut)),
          principalCV(stacksRecipient),
          stringAsciiCV(solverEvmAddress),
          uintCV(Number(fillDeadline)),
          uintCV(Number(sourceChainId)),
        ],
        postConditions: [stxPostCondition],
        postConditionMode: 'deny',
        senderKey: senderKey,
        nonce: BigInt(nonce),
      });

      console.log('  📡 Broadcasting transaction...');
      const result = await broadcastTransaction({
        transaction: tx,
      });

      // Check if broadcast failed
      if ('error' in result) {
        console.log(`  ❌ Fill transaction failed: ${result.error}`);
        return false;
      }

      console.log(`  ✅ Fill transaction broadcast successfully!`);
      console.log(`  🔗 Transaction ID: ${result.txid}`);
      console.log(`     Explorer: https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);

      return true;
    } catch (error) {
      console.error('  ❌ Error filling order on Stacks:', error);
      return false;
    }
  }
}
