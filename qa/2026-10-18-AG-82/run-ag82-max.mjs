import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const AG_OUT = path.join(ROOT, 'qa/2026-10-18-AG-82');

function runBenchOne(args) {
  console.log('\n[AG-82] Running: node tools/bench.mjs', args.join(' '));
  const out = execFileSync(process.execPath, ['tools/bench.mjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  process.stdout.write(out);
  const lines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{') && l.endsWith('}'));
  if (!lines.length) throw new Error('No JSON line found in bench output');
  return JSON.parse(lines.at(-1));
}

const existing = JSON.parse(fs.readFileSync(path.join(AG_OUT, 'bench-results.json'), 'utf8'));
const nights = [5, 10, 14, 18, 20];
for (const n of nights) {
  existing.push(runBenchOne(['--night', String(n), '--gfx', 'max', '--seconds', '10']));
}
existing.push(runBenchOne(['--scenario', 'megaswarm', '--count', '48', '--gfx', 'max', '--seconds', '10']));

fs.writeFileSync(path.join(AG_OUT, 'bench-results.json'), JSON.stringify(existing, null, 2));
fs.writeFileSync(
  path.join(AG_OUT, 'bench-lines.jsonl'),
  existing.map((r) => JSON.stringify(r)).join('\n') + '\n'
);
console.log('[AG-82] Appended 6 --gfx max runs; total runs:', existing.length);
