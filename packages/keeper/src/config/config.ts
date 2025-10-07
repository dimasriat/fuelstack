import dotenv from 'dotenv';

dotenv.config();

export const config = {
  openGate: {
    rpcUrl: process.env.OPENGATE_RPC_URL || '',
    contractAddress: (process.env.OPENGATE_ADDRESS || '') as `0x${string}`,
  },
  fillGate: {
    rpcUrl: process.env.FILLGATE_RPC_URL || '',
    contractAddress: (process.env.FILLGATE_ADDRESS || '') as `0x${string}`,
  },
  oracle: {
    privateKey: (process.env.ORACLE_PRIVATE_KEY || '') as `0x${string}`,
  },
};

if (!config.openGate.rpcUrl || !config.fillGate.rpcUrl) {
  throw new Error('Missing RPC URLs in .env file');
}

console.log('✅ Config loaded successfully');
