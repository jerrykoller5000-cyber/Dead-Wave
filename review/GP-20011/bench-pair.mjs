// GP-20011: paired short game benchmark under one crew game-test lease.
// Run via: node crew/crew.mjs slot run chatgpt GP-20011 --checks "GP-20011 event A/B" -- node review/GP-20011/bench-pair.mjs
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root = resolve(import.meta.dirname, '..', '..');
const rows = [];
for (const mode of ['off', 'on', 'on', 'off']) {
  const args = ['tools/bench.mjs', '--scenario', 'training', '--seconds', '30',
    '--gfx', 'high', '--headless', '--query', mode === 'off' ? 'events=0' : 'events=1'];
  const result = spawnSync(process.execPath, args, { cwd: root, env: process.env,
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 240000 });
  const lines = (result.stdout || '').trim().split(/\r?\n/);
  const json = lines.findLast(line => line.startsWith('{') && line.includes('"fps"'));
  if (result.status !== 0 || !json || JSON.parse(json).fps <= 0) {
    console.error(result.stdout || '');
    console.error(result.stderr || '');
    throw new Error(`benchmark ${mode} failed: ${result.error || result.status}`);
  }
  const sample = JSON.parse(json);
  const row = { mode, fps: sample.fps, low: sample.low, worst: sample.worst,
    hitches: sample.hitches, draws: sample.draws, triangles: sample.triangles,
    windows: sample.windows, gfx: sample.gfx };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const median = values => { const v = values.slice().sort((a, b) => a - b); return (v[0] + v[1]) / 2; };
const result = { rows, median: Object.fromEntries(['off', 'on'].map(mode => [mode,
  Object.fromEntries(['fps', 'low', 'draws', 'triangles'].map(key =>
    [key, median(rows.filter(row => row.mode === mode).map(row => row[key]))]))])) };
writeFileSync(resolve(import.meta.dirname, 'bench-pair.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.median));
