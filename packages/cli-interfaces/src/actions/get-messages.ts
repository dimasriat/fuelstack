import { clientFromNetwork, STACKS_MAINNET } from '@stacks/network';
import {
  fetchCallReadOnlyFunction,
  uintCV,
  UIntCV,
} from '@stacks/transactions';

const client = clientFromNetwork(STACKS_MAINNET);

const CONTRACT_ADDRESS = 'SP3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3NC2XKB8';
const CONTRACT_NAME = 'message_board';

export const getMessages = async () => {
  const countResult = (await fetchCallReadOnlyFunction({
    client,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-message-count',
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
  })) as UIntCV;
  const count = Number(countResult.value);
  console.log(`Total messages: ${count}`);

  const messages = [];
  for (let i = 1; i <= count; i++) {
    const messageResult = await fetchCallReadOnlyFunction({
      client,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-message',
      functionArgs: [uintCV(i)],
      senderAddress: CONTRACT_ADDRESS,
    });
    messages.push(messageResult);
  }
  console.log('Messages:', messages);
};
