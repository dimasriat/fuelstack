import { db } from '../database/db';
import { zeroAddress } from 'viem';

export class OrderValidator {
  async validateStacksFill(
    orderId: string,
    tokenSymbol: string,
    amountOut: string,
    recipient: string
  ): Promise<boolean> {

    // Get stored order
    const storedOrder = await db.getOrder(orderId);

    if (!storedOrder) {
      console.error(`   ❌ Order ${orderId} not found in database`);
      return false;
    }

    // Check status
    if (storedOrder.status !== 'OPENED') {
      console.error(`   ❌ Order ${orderId} status is ${storedOrder.status}, expected OPENED`);
      return false;
    }

    // Validate tokenOut - convert token symbol to check
    // Native token on EVM (0x000...) should match STX on Stacks
    const isNativeToken = storedOrder.tokenOut.toLowerCase() === zeroAddress.toLowerCase();
    const expectedTokenSymbol = isNativeToken ? 'STX' : 'sBTC';

    if (tokenSymbol !== expectedTokenSymbol) {
      console.error(`   ❌ TokenOut mismatch:`);
      console.error(`      Expected: ${expectedTokenSymbol}`);
      console.error(`      Got: ${tokenSymbol}`);
      return false;
    }

    // Validate amountOut - Stacks uses 6 decimals for STX, 8 for sBTC
    // EVM uses 18 decimals for native, 8 for sBTC
    // Need to convert EVM amount to Stacks amount for comparison
    let expectedStacksAmount: string;

    if (isNativeToken) {
      // Native token: EVM 18 decimals → Stacks 6 decimals
      // Divide by 10^12
      const evmAmount = BigInt(storedOrder.amountOut);
      const stacksAmount = evmAmount / BigInt(10 ** 12);
      expectedStacksAmount = stacksAmount.toString();
    } else {
      // sBTC: both use 8 decimals, no conversion needed
      expectedStacksAmount = storedOrder.amountOut;
    }

    if (amountOut !== expectedStacksAmount) {
      console.error(`   ❌ AmountOut mismatch:`);
      console.error(`      Expected: ${expectedStacksAmount} micro-${tokenSymbol}`);
      console.error(`      Got: ${amountOut} micro-${tokenSymbol}`);
      return false;
    }

    // Note: Recipient validation is skipped for Stacks because the recipient
    // on the original order is an EVM address, but the fill uses a Stacks principal.
    // The actual recipient mapping is handled by the solver off-chain.

    // Validate deadline
    const now = Math.floor(Date.now() / 1000);
    const deadline = parseInt(storedOrder.fillDeadline);

    if (now > deadline) {
      console.error(`   ❌ Fill deadline exceeded`);
      console.error(`      Deadline: ${new Date(deadline * 1000).toISOString()}`);
      console.error(`      Now: ${new Date(now * 1000).toISOString()}`);
      return false;
    }

    return true;
  }
}
