// The final A of the paired ABBA profile. Restore the optimized file even if
// the browser or slot runner fails, and never overwrite a concurrent edit.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const file = 'game/wall-bands.js';
const baseline = fs.readFileSync('review/GP-20013/wall-bands-baseline.js');
const optimized = fs.readFileSync('review/GP-20013/wall-bands-optimized.js');
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const baseHash = hash(baseline), optHash = hash(optimized);
if (hash(fs.readFileSync(file)) !== optHash) throw new Error('Wall band source changed; refusing baseline swap');
let status = 1;
try {
  fs.writeFileSync(file, baseline);
  const result = spawnSync(process.execPath, [
    'crew/crew.mjs', 'slot', 'run', 'chatgpt', 'GP-20013',
    '--checks', 'night20 baseline A2 prof alloc', '--',
    'node', 'tools/bench.mjs', '--night', '20', '--gfx', 'high',
    '--prof', '--alloc', '--seconds', '20',
  ], { encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync('review/GP-20013/a2.log', `${result.stdout || ''}\n${result.stderr || ''}`, 'utf8');
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) process.stderr.write(`${result.error}\n`);
  status = result.status ?? 1;
} finally {
  if (hash(fs.readFileSync(file)) !== baseHash) {
    throw new Error('Wall band source changed during A2; optimized copy preserved in review/GP-20013');
  }
  fs.writeFileSync(file, optimized);
}
process.exitCode = status;
