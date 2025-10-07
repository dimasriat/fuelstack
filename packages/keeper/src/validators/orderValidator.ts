import { db } from '../database/db';
import { Address, zeroAddress } from 'viem';

export class OrderValidator {
  async validateFill(
    orderId: string,
    tokenOut: Address,
    amountOut: string,
    recipient: Address
  ): Promise<boolean> {
    console.log(`\n🔍 Validating fill for order ${orderId}...`);

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

    // Validate tokenOut (normalize addresses for comparison)
    const normalizedStoredTokenOut = storedOrder.tokenOut.toLowerCase() as Address;
    const normalizedFillTokenOut = tokenOut.toLowerCase() as Address;
    
    if (normalizedStoredTokenOut !== normalizedFillTokenOut) {
      console.error(`   ❌ TokenOut mismatch:`);
      console.error(`      Expected: ${storedOrder.tokenOut}`);
      console.error(`      Got: ${tokenOut}`);
      return false;
    }

    // Validate amountOut
    if (storedOrder.amountOut !== amountOut) {
      console.error(`   ❌ AmountOut mismatch:`);
      console.error(`      Expected: ${storedOrder.amountOut}`);
      console.error(`      Got: ${amountOut}`);
      return false;
    }

    // Validate recipient
    const normalizedStoredRecipient = storedOrder.recipient.toLowerCase() as Address;
    const normalizedFillRecipient = recipient.toLowerCase() as Address;
    
    if (normalizedStoredRecipient !== normalizedFillRecipient) {
      console.error(`   ❌ Recipient mismatch:`);
      console.error(`      Expected: ${storedOrder.recipient}`);
      console.error(`      Got: ${recipient}`);
      return false;
    }

    // Validate deadline
    const now = Math.floor(Date.now() / 1000);
    const deadline = parseInt(storedOrder.fillDeadline);
    
    if (now > deadline) {
      console.error(`   ❌ Fill deadline exceeded`);
      console.error(`      Deadline: ${new Date(deadline * 1000).toISOString()}`);
      console.error(`      Now: ${new Date(now * 1000).toISOString()}`);
      return false;
    }

    console.log(`   ✅ All validations passed`);
    console.log(`      TokenOut: ${tokenOut === zeroAddress ? 'NATIVE' : 'ERC20'}`);
    console.log(`      AmountOut: ${amountOut}`);
    console.log(`      Recipient: ${recipient}`);

    return true;
  }
}
