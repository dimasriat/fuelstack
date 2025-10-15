import dotenv from 'dotenv';

dotenv.config();

export const config = {
  oracle: {
    privateKey: (process.env.ORACLE_PRIVATE_KEY || '') as `0x${string}`,
  },
  destination: {
    type: (process.env.DESTINATION_TYPE || 'evm') as 'evm' | 'stacks',
  },
  stacks: {
    fillGateAddress: process.env.STACKS_FILLGATE_ADDRESS || 'ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX',
    fillGateName: process.env.STACKS_FILLGATE_NAME || 'fill-gate',
  },
  database: {
    type: process.env.DATABASE_TYPE || 'memory'
  }
};

if (!config.oracle.privateKey) {
  throw new Error('Missing ORACLE_PRIVATE_KEY in .env file');
}

console.log('✅ Config loaded successfully');
console.log(`   Database: ${config.database.type}`);
console.log(`   Destination: ${config.destination.type}`);
