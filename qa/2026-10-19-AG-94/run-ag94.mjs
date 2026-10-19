import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PROF_JSONL = path.resolve(ROOT, 'qa/2026-10-19-AG-86/prof-lines.jsonl');
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-94');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

console.log('=== [1/3] Running bench.mjs --scenario day5 --gfx high --prof --cpu ===');
const benchOut = execFileSync(
  process.execPath,
  ['tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high', '--prof', '--cpu'],
  { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
);
process.stdout.write(benchOut);

const jsonLines = benchOut
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.startsWith('{"scenario":'));
if (jsonLines.length === 0) {
  throw new Error('No JSON line produced by bench.mjs --scenario day5');
}
const day5Line = jsonLines[jsonLines.length - 1];
await fs.promises.appendFile(PROF_JSONL, day5Line + '\n', 'utf8');
await fs.promises.writeFile(path.join(OUT_DIR, 'day5-bench.json'), day5Line + '\n', 'utf8');
console.log('Appended day5 line to prof-lines.jsonl');

console.log('\n=== [2/3] Running t263 (CL-216 utility truck mission) ===');
const t263Out = execFileSync(
  process.execPath,
  ['tools/tests/run-all.mjs', 't263', '--agent', 'antigravity', '--task', 'AG-94'],
  { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
);
process.stdout.write(t263Out);
await fs.promises.writeFile(path.join(OUT_DIR, 't263-output.txt'), t263Out, 'utf8');

console.log('\n=== [3/3] Running verify-truck.mjs (live visual look & screenshots) ===');
const verifyOut = execFileSync(
  process.execPath,
  ['qa/2026-10-19-AG-94/verify-truck.mjs'],
  { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
);
process.stdout.write(verifyOut);
console.log('\n=== AG-94 batch complete ===');
