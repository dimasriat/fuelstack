import dotenv from 'dotenv';

dotenv.config();

export const WALLET_MNEMONIC_KEY = process.env.WALLET_MNEMONIC_KEY || '';
if (!WALLET_MNEMONIC_KEY) {
  throw new Error('WALLET_MNEMONIC_KEY is required');
}

export const WALLET_PASSWORD = process.env.WALLET_PASSWORD || '';
if (!WALLET_PASSWORD) {
  throw new Error('WALLET_PASSWORD is required');
}

export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
if (!CONTRACT_ADDRESS) {
  throw new Error('CONTRACT_ADDRESS is required');
}

export const CONTRACT_NAME = process.env.CONTRACT_NAME || '';
if (!CONTRACT_NAME) {
  throw new Error('CONTRACT_NAME is required');
}
