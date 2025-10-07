import { config } from './config/config';
import { db } from './database/db';
import { OpenGateListener } from './listeners/openGateListener';
import { FillGateListener } from './listeners/fillGateListener';

async function main() {
  console.log('🚀 FuelStack Keeper Starting...\n');
  console.log('Vision: Onboarding Gateway to Bitcoin Economy on Stacks\n');

  // Validate config
  console.log('Config:');
  console.log(`  OpenGate RPC: ${config.openGate.rpcUrl ? '✅' : '❌'}`);
  console.log(`  FillGate RPC: ${config.fillGate.rpcUrl ? '✅' : '❌'}`);
  console.log(`  OpenGate Address: ${config.openGate.contractAddress || '⚠️  Not set'}`);
  console.log(`  FillGate Address: ${config.fillGate.contractAddress || '⚠️  Not set'}`);
  console.log(`  Oracle Wallet: ${config.oracle.privateKey ? '✅' : '❌'}\n`);

  // Start listeners
  const openGateListener = new OpenGateListener();
  const fillGateListener = new FillGateListener();

  await openGateListener.start();
  await fillGateListener.start();

  console.log('\n✅ Keeper initialized and listening for events\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    await openGateListener.stop();
    await fillGateListener.stop();
    await db.printAllOrders();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
