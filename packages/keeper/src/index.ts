import { config } from './config/config';
import { MultiChainManager } from './managers/multiChainManager';

async function main() {
  console.log('🚀 FuelStack Multi-Chain Keeper Starting...\n');
  console.log('Vision: Onboarding Gateway to Bitcoin Economy on Stacks\n');

  // Validate config
  console.log('⚙️  Configuration:');
  console.log(`  Oracle Wallet: ${config.oracle.privateKey ? '✅' : '❌'}`);
  console.log(`  Database Type: ${config.database.type}\n`);

  // Initialize multi-chain manager
  const multiChainManager = new MultiChainManager();
  
  await multiChainManager.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    await multiChainManager.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
