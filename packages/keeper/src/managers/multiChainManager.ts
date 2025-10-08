import { OpenGateListener } from '../listeners/openGateListener';
import { FillGateListener } from '../listeners/fillGateListener';
import { getAllSourceChains, getDestinationChain, ChainConfig } from '../config/chains';
import { db } from '../database/db';

export class MultiChainManager {
  private openGateListeners: Map<number, OpenGateListener> = new Map();
  private fillGateListener?: FillGateListener;

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners(): void {
    // Initialize OpenGate listeners for all source chains
    const sourceChains = getAllSourceChains();
    
    for (const chain of sourceChains) {
      if (!chain.openGate || chain.openGate === '0x...') {
        console.log(`⚠️  Skipping ${chain.name} - OpenGate address not configured`);
        continue;
      }

      const listener = new OpenGateListener(chain.chainId, chain);
      this.openGateListeners.set(chain.chainId, listener);
    }

    // Initialize FillGate listener for destination chain
    const destinationChain = getDestinationChain();
    if (destinationChain.fillGate && destinationChain.fillGate !== '0x...') {
      this.fillGateListener = new FillGateListener(destinationChain);
    } else {
      console.log(`⚠️  FillGate listener not initialized - address not configured`);
    }
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Multi-Chain Keeper...\n');
    
    // Start all OpenGate listeners
    console.log('📡 Starting Source Chain Listeners:');
    for (const [chainId, listener] of this.openGateListeners) {
      try {
        await listener.start();
        console.log(`   ✅ ${this.getChainName(chainId)} OpenGate listener started`);
      } catch (error) {
        console.error(`   ❌ Failed to start ${this.getChainName(chainId)} listener:`, error);
      }
    }

    // Start FillGate listener
    if (this.fillGateListener) {
      try {
        console.log('\n📡 Starting Destination Chain Listener:');
        await this.fillGateListener.start();
        console.log(`   ✅ ${getDestinationChain().name} FillGate listener started`);
      } catch (error) {
        console.error(`   ❌ Failed to start FillGate listener:`, error);
      }
    }

    console.log('\n✅ Multi-Chain Keeper initialized and listening for events\n');
    this.printConfiguration();
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Shutting down Multi-Chain Keeper...');

    // Stop all OpenGate listeners
    for (const [chainId, listener] of this.openGateListeners) {
      try {
        await listener.stop();
        console.log(`   ✅ ${this.getChainName(chainId)} listener stopped`);
      } catch (error) {
        console.error(`   ❌ Error stopping ${this.getChainName(chainId)} listener:`, error);
      }
    }

    // Stop FillGate listener
    if (this.fillGateListener) {
      try {
        await this.fillGateListener.stop();
        console.log(`   ✅ ${getDestinationChain().name} FillGate listener stopped`);
      } catch (error) {
        console.error(`   ❌ Error stopping FillGate listener:`, error);
      }
    }

    // Print final database state
    await db.printAllOrders();
  }

  private getChainName(chainId: number): string {
    const chain = getAllSourceChains().find(c => c.chainId === chainId);
    return chain?.name || `Chain ${chainId}`;
  }

  private printConfiguration(): void {
    console.log('🔗 Multi-Chain Configuration:');
    
    console.log('   Source Chains (OpenGate):');
    for (const [chainId, listener] of this.openGateListeners) {
      const chain = getAllSourceChains().find(c => c.chainId === chainId);
      console.log(`     • ${chain?.name} (${chainId}): ${chain?.openGate}`);
    }

    const destChain = getDestinationChain();
    console.log('   Destination Chain (FillGate):');
    console.log(`     • ${destChain.name} (${destChain.chainId}): ${destChain.fillGate}`);
    
    console.log('');
  }

  // Getter methods for monitoring
  getActiveSourceChains(): number[] {
    return Array.from(this.openGateListeners.keys());
  }

  getDestinationChainId(): number {
    return getDestinationChain().chainId;
  }

  isListenerActive(chainId: number): boolean {
    return this.openGateListeners.has(chainId);
  }
}