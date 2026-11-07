import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const out = path.join(HERE, 'fit');
const child = spawn(process.execPath, [
  path.join(ROOT, 'handoffs', '2026-10-09-grokbot-GB-153', 'fit-probe.mjs'),
  out,
  'shotgun'
], { cwd: ROOT, stdio: 'inherit' });
child.on('exit', (c) => process.exit(c || 0));
