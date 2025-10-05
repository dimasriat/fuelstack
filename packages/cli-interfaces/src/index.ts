import { getMessages } from './actions';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

async function main() {
  const isGetMessages = args._.includes('get-messages');

  if (isGetMessages) await getMessages();
}

main();
