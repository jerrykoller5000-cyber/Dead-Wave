import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
fs.mkdirSync(OUT_DIR, { recursive: true });

function runBench(name, extraArgs) {
  console.log(`\n=== [${name}] Starting: node tools/bench.mjs --night 20 --gfx high --prof ${extraArgs.join(' ')} ===`);
  const res = spawnSync(
    process.execPath,
    ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', ...extraArgs],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  fs.writeFileSync(path.join(OUT_DIR, `${name}.log`), (res.stdout || '') + (res.stderr || ''), 'utf8');
  if (res.status !== 0) {
    console.error(`[${name}] exited with code ${res.status}`);
    console.error(res.stderr || res.stdout);
    throw new Error(`${name} failed with status ${res.status}`);
  }
  const lines = (res.stdout || '').trim().split(/\r?\n/);
  const jsonLine = [...lines].reverse().find((l) => l.startsWith('{') && l.endsWith('}'));
  if (!jsonLine) {
    throw new Error(`${name}: could not find JSON line in stdout`);
  }
  const parsed = JSON.parse(jsonLine);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(parsed, null, 2), 'utf8');
  console.log(`[${name}] fps=${parsed.fps}, low=${parsed.low}, worst=${parsed.worst}, hitches=${parsed.hitches}, tickMs=${parsed.prof?.tickMs}`);
  if (parsed.prof?.gc) {
    console.log(`[${name}] gc: synced=${parsed.prof.gc.synced}, totalMs=${parsed.prof.gc.totalMs}, perFrameMs=${parsed.prof.gc.perFrameMs}, spikesWithGc=${parsed.prof.gc.spikesWithGc}`);
  }
  if (parsed.alloc) {
    console.log(`[${name}] alloc: kbPerFrame=${parsed.alloc.kbPerFrame} kB (${parsed.alloc.mbPerSecond} MB/s)`);
  }
  return parsed;
}

const gc1 = runBench('gc-1', ['--gc']);
const gc2 = runBench('gc-2', ['--gc']);
const alloc1 = runBench('alloc-1', ['--alloc']);

const summary = {
  gc1: {
    fps: gc1.fps,
    low: gc1.low,
    worst: gc1.worst,
    hitches: gc1.hitches,
    tickMs: gc1.prof?.tickMs,
    frameMs: gc1.prof?.frameMs,
    outsideMs: gc1.prof?.outsideMs,
    spikeCauses: gc1.prof?.spikeCauses,
    spikes: gc1.prof?.spikes,
    gc: gc1.prof?.gc
  },
  gc2: {
    fps: gc2.fps,
    low: gc2.low,
    worst: gc2.worst,
    hitches: gc2.hitches,
    tickMs: gc2.prof?.tickMs,
    frameMs: gc2.prof?.frameMs,
    outsideMs: gc2.prof?.outsideMs,
    spikeCauses: gc2.prof?.spikeCauses,
    spikes: gc2.prof?.spikes,
    gc: gc2.prof?.gc
  },
  alloc1: {
    fps: alloc1.fps,
    low: alloc1.low,
    worst: alloc1.worst,
    hitches: alloc1.hitches,
    tickMs: alloc1.prof?.tickMs,
    frameMs: alloc1.prof?.frameMs,
    outsideMs: alloc1.prof?.outsideMs,
    spikeCauses: alloc1.prof?.spikeCauses,
    spikes: alloc1.prof?.spikes,
    alloc: {
      frames: alloc1.alloc?.frames,
      kbPerFrame: alloc1.alloc?.kbPerFrame,
      mbPerSecond: alloc1.alloc?.mbPerSecond,
      selfTop15: (alloc1.alloc?.self || []).slice(0, 15),
      stacksTop15: (alloc1.alloc?.stacks || []).slice(0, 15)
    }
  }
};

fs.writeFileSync(path.join(OUT_DIR, 'ag114-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log('\n=== AG-114 ALL 3 RUNS COMPLETE ===');
