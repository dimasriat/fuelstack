import { getMessages, postMessage } from './actions';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

async function main() {
  const isGetMessages = args._.includes('get-messages');
  const isPostMessage = args._.includes('post-message');

  if (isGetMessages) await getMessages();
  if (isPostMessage) await postMessage();
}

main();
