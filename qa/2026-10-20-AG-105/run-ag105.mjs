import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
fs.mkdirSync(__dirname, { recursive: true });

const env = { ...process.env, DW_ALLOW_RAW_CDP: '1' };

const runs = [
  { id: 'prof-1', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] },
  { id: 'prof-2', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] },
  { id: 'prof-3', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] },
  { id: 'prof-cpu-alloc-4', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu', '--alloc'] }
];

const summary = [];

for (const run of runs) {
  console.log(`\n=== [AG-105] Starting ${run.id}: node ${run.args.join(' ')} ===`);
  const res = spawnSync('node', run.args, {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  const rawPath = path.join(__dirname, `${run.id}.json`);
  fs.writeFileSync(rawPath, res.stdout || '', 'utf8');
  if (res.stderr) {
    fs.writeFileSync(path.join(__dirname, `${run.id}.stderr.log`), res.stderr, 'utf8');
  }
  if (res.status !== 0) {
    throw new Error(`${run.id} exited with code ${res.status}: ${res.stderr}`);
  }

  // Parse JSON from stdout
  const lines = (res.stdout || '').trim().split(/\r?\n/);
  let jsonStr = res.stdout.trim();
  const braceIdx = jsonStr.indexOf('{');
  if (braceIdx > 0) jsonStr = jsonStr.slice(braceIdx);
  const parsed = JSON.parse(jsonStr);
  const s = parsed.scenarios && parsed.scenarios[0] ? parsed.scenarios[0] : parsed;
  const item = {
    id: run.id,
    fps: s.fps,
    fps1Low: s.fps1Low,
    frameMs: s.frameMs,
    frameP99Ms: s.frameP99Ms,
    hitches50ms: s.hitches50ms,
    draws: s.draws,
    tris: s.tris,
    zombies: s.zombies,
    tickMs: s.prof ? s.prof.tickMs : null,
    marks: s.prof ? s.prof.marks : null,
    spikeCauses: s.prof ? s.prof.spikeCauses : null,
    spikes: s.prof ? s.prof.spikes : null,
    alloc: s.alloc ? {
      kbPerSec: s.alloc.kbPerSec,
      kbPerFrame: s.alloc.kbPerFrame,
      topSelf: (s.alloc.self || []).slice(0, 10)
    } : null,
    cpuTop: s.cpu ? (s.cpu.self || []).slice(0, 10) : null
  };
  summary.push(item);
  console.log(`[AG-105] ${run.id}: fps=${item.fps}, 1%low=${item.fps1Low}, tick=${item.tickMs}ms, spikeCauses=${JSON.stringify(item.spikeCauses)}`);
}

const outPath = path.join(__dirname, 'ag105-summary.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`\n[AG-105] Wrote summary to ${outPath}`);
