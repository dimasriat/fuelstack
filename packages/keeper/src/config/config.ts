import dotenv from 'dotenv';

dotenv.config();

export const config = {
  oracle: {
    privateKey: (process.env.ORACLE_PRIVATE_KEY || '') as `0x${string}`,
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
