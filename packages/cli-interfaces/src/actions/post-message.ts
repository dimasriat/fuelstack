import {
  clientFromNetwork,
  STACKS_MAINNET,
} from '@stacks/network';
import {
  broadcastTransaction,
  makeContractCall,
  stringUtf8CV,
} from '@stacks/transactions';
import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import { ask } from '../utils';
import {
  WALLET_MNEMONIC_KEY,
  WALLET_PASSWORD,
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
} from '../config';

const client = clientFromNetwork(STACKS_MAINNET);

export const postMessage = async () => {
  // Generate wallet from mnemonic
  const wallet = await generateWallet({
    secretKey: WALLET_MNEMONIC_KEY!,
    password: WALLET_PASSWORD!,
  });
  const account = wallet.accounts[0];
  const pk = account.stxPrivateKey;
  const mainnetAddress = getStxAddress({ account, network: 'mainnet' });
  console.log('Using address:', mainnetAddress);

  const message = (await ask('Enter your message')) as string;
  const tx = await makeContractCall({
    client,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'add-message',
    functionArgs: [stringUtf8CV(message)],
    senderKey: pk,
  });
  const result = await broadcastTransaction({
    transaction: tx,
  });
  console.log('Transaction result:', result.txid);
};
