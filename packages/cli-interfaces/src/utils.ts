import readline from 'readline';
import fs from 'fs/promises';

export function ask(question: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + ': ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function writeJson(path: string, data: any) {
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

export function jsonStringifyBigInt(json: any) {
  return JSON.stringify(
    json,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
