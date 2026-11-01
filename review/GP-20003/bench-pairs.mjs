import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const summaries = [];
for (const [tag, flag] of [['off-1', 'skyline=0'], ['on-1', 'skyline=1'], ['on-2', 'skyline=1'], ['off-2', 'skyline=0']]) {
  const args = ['tools/bench.mjs', '--scenario', 'day5', '--gfx', 'high', '--fp', 'pistol', '--level', '--seconds', '8', '--prof', '--query', flag];
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync(path.join(here, `pair-${tag}.txt`), (run.stdout || '') + (run.stderr || ''), 'utf8');
  if (run.status !== 0) throw new Error(`${tag} failed: ${run.status} ${String(run.stderr).slice(0, 400)}`);
  const line = (run.stdout || '').split(/\r?\n/).find(s => s.startsWith('{"scenario":'));
  if (!line) throw new Error(`${tag} produced no JSON result`);
  const data = JSON.parse(line);
  const summary = { tag, fps: data.fps, low: data.low, draws: data.draws, render: data.prof?.top?.find(x => x.k === 'r:render')?.avg, zombies: data.zombies };
  summaries.push(summary);
  console.log(JSON.stringify(summary));
}
fs.writeFileSync(path.join(here, 'pairs-summary.json'), JSON.stringify(summaries, null, 2) + '\n', 'utf8');
