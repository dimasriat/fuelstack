import { OrderListener } from './listener';
import { SOLVER_CONFIG } from './config';

async function main() {
  console.log('🤖 FuelStack Automated Solver');
  console.log('🌉 Intent Bridge Demo Solver');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 Listening: Arbitrum Sepolia (OrderOpened events)');
  console.log('💫 Filling: Base Sepolia (FillGate contract)');
  console.log('🎯 Strategy: Auto-fill all orders (Demo mode)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const listener = new OrderListener();

  try {
    await listener.start();
    
    console.log('🎉 Solver is now running and ready to compete!');
    console.log('💡 To test: Use cli-interfaces to create an order with "pnpm dev open-order"');
    console.log('⚡ This solver will automatically detect and fill new orders\n');

  } catch (error) {
    console.error('💥 Failed to start solver:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down solver gracefully...');
    await listener.stop();
    console.log('👋 Solver stopped. Goodbye!');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Received SIGTERM, shutting down...');
    await listener.stop();
    process.exit(0);
  });

  // Keep the process alive
  process.stdin.resume();
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});