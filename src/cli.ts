import { readFileSync } from 'node:fs';
import { run } from './interpreter.js';
const filename = process.argv[2];
if (!filename) { console.error('Usage: flux <file.flux>'); process.exit(1); }
try {
  const source = readFileSync(filename, 'utf8');
  for (const line of run(source)) console.log(line);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
