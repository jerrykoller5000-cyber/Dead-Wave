// Run as one shared game-test lease after the preview and visual checks.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root = resolve(import.meta.dirname, '..', '..');
const rows = [];
for (const mode of ['off', 'on', 'on', 'off']) {
  const args = ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--fp', 'pistol',
    '--level', '--seconds', '30', '--headless', '--query', `quarterwalls=${mode === 'on' ? '1' : '0'}`,
    '--eval', 'review/GP-20008/nav-eval.js'];
  const run = spawnSync(process.execPath, args, { cwd:root, env:process.env,
    encoding:'utf8', maxBuffer:4*1024*1024, timeout:240000 });
  const line = (run.stdout || '').trim().split(/\r?\n/).findLast(s => s.startsWith('{') && s.includes('"fps"'));
  if (run.status !== 0 || !line || JSON.parse(line).fps <= 0) {
    console.error(run.stdout || '', run.stderr || '');
    throw new Error(`night-20 benchmark ${mode} failed: ${run.error || run.status}`);
  }
  const sample = JSON.parse(line);
  const row = { mode, fps:sample.fps, low:sample.low, worst:sample.worst,
    hitches:sample.hitches, draws:sample.draws, triangles:sample.triangles,
    windows:sample.windows, gfx:sample.gfx, nav:sample.eval };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const median = v => { const s=v.slice().sort((a,b)=>a-b); return (s[0]+s[1])/2; };
const report = { rows, median:Object.fromEntries(['off','on'].map(mode=>[mode,
  Object.fromEntries(['fps','low','draws','triangles'].map(key=>[key,
    median(rows.filter(r=>r.mode===mode).map(r=>r[key]))]))])) };
writeFileSync(resolve(import.meta.dirname,'bench-pair.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.median));
