import { parseArgs } from 'node:util';
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import { privateKeyToPublic, publicKeyToHex } from '@stacks/transactions';
import {
  WALLET_MNEMONIC_KEY,
  WALLET_PASSWORD,
} from '../../config';

interface WalletInfo {
  index: number;
  mainnet: {
    address: string;
  };
  testnet: {
    address: string;
  };
  keys: {
    privateKey: string;
    publicKey: string;
  };
}

export async function listStacksWallets() {
  console.log('🔷 Stacks Wallets (Derived from Mnemonic)');
  console.log('═'.repeat(60));
  console.log('');

  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(3),
    options: {
      'count': { type: 'string' },
      'save': { type: 'string' },
      'hide-private': { type: 'boolean' }
    }
  });

  // Validate wallet configuration
  if (!WALLET_MNEMONIC_KEY || !WALLET_PASSWORD) {
    console.error('❌ Wallet not configured. Set WALLET_MNEMONIC_KEY and WALLET_PASSWORD in .env');
    process.exit(1);
  }

  // Parse account count
  const countStr = args.values['count'] || '1';
  const count = parseInt(countStr);
  if (isNaN(count) || count < 1 || count > 10) {
    console.error('❌ Invalid count. Must be between 1 and 10.');
    process.exit(1);
  }

  const hidePrivate = args.values['hide-private'] || false;
  const savePath = args.values['save'];

  try {
    // Generate wallet from mnemonic
    console.log('🔐 Generating wallets from mnemonic...\n');
    const wallet = await generateWallet({
      secretKey: WALLET_MNEMONIC_KEY,
      password: WALLET_PASSWORD,
    });

    if (wallet.accounts.length === 0) {
      console.error('❌ No accounts found in wallet');
      process.exit(1);
    }

    // Security warning
    if (!hidePrivate) {
      console.log('⚠️  WARNING: Private keys are sensitive! Keep them secure.');
      console.log('⚠️  Never share private keys or commit them to version control.\n');
    }

    // Collect wallet information
    const wallets: WalletInfo[] = [];
    const maxAccounts = Math.min(count, wallet.accounts.length);

    for (let i = 0; i < maxAccounts; i++) {
      const account = wallet.accounts[i];
      const privateKey = account.stxPrivateKey;

      // Get addresses for both networks
      const mainnetAddress = getStxAddress({ account, network: 'mainnet' });
      const testnetAddress = getStxAddress({ account, network: 'testnet' });

      // Derive public key from private key
      const publicKeyBytes = privateKeyToPublic(privateKey);
      const publicKey = publicKeyToHex(publicKeyBytes);

      wallets.push({
        index: i,
        mainnet: {
          address: mainnetAddress
        },
        testnet: {
          address: testnetAddress
        },
        keys: {
          privateKey: privateKey,
          publicKey: publicKey
        }
      });
    }

    // Display wallet information
    for (const walletInfo of wallets) {
      console.log(`\n📍 Account #${walletInfo.index}`);
      console.log('─'.repeat(60));

      // Display addresses in table
      const addressTable = [
        {
          'Network': 'Mainnet',
          'Address': walletInfo.mainnet.address
        },
        {
          'Network': 'Testnet',
          'Address': walletInfo.testnet.address
        }
      ];
      console.table(addressTable);

      // Display keys
      console.log('🔑 Keys:');
      if (hidePrivate) {
        console.log(`  Private Key: ${'*'.repeat(20)} (hidden for security)`);
      } else {
        console.log(`  Private Key: ${walletInfo.keys.privateKey}`);
      }
      console.log(`  Public Key:  ${walletInfo.keys.publicKey}`);
    }

    // Explorer links
    console.log('\n\n🔗 Mainnet Explorer:');
    wallets.forEach(w => {
      console.log(`  Account #${w.index}: https://explorer.hiro.so/address/${w.mainnet.address}?chain=mainnet`);
    });

    console.log('\n🔗 Testnet Explorer:');
    wallets.forEach(w => {
      console.log(`  Account #${w.index}: https://explorer.hiro.so/address/${w.testnet.address}?chain=testnet`);
    });

    // Save to file if requested
    if (savePath) {
      const exportData = {
        timestamp: new Date().toISOString(),
        mnemonic_fingerprint: WALLET_MNEMONIC_KEY.substring(0, 10) + '...',
        accounts: wallets.map(w => ({
          index: w.index,
          mainnet: w.mainnet,
          testnet: w.testnet,
          keys: hidePrivate ? {
            privateKey: '*** HIDDEN ***',
            publicKey: w.keys.publicKey
          } : w.keys
        })),
        warning: 'Private keys are sensitive. Keep this file secure and never commit to version control.'
      };

      const fs = await import('fs/promises');
      await fs.writeFile(savePath, JSON.stringify(exportData, null, 2));
      console.log(`\n💾 Wallet information saved to ${savePath}`);

      if (!hidePrivate) {
        console.log('⚠️  File contains private keys! Set restrictive permissions:');
        console.log(`   chmod 600 ${savePath}`);
      }
    }

    console.log('\n✅ Wallet listing complete!');

  } catch (error) {
    console.error('\n❌ Error generating wallets:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}
