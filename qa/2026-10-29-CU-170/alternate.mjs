// CU-170: night 20 High, old checkpoint then the current tree, twice.
// The old tree is a detached worktree of 82d75118 outside the repo. This process
// inherits the game-test lease and runs one bench at a time.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const current = path.resolve(dir, '../..');
const old = 'C:/Users/Zero/Desktop/dw-cu170-82d75118';
const order = [
  ['old', 1, old],
  ['new', 1, current],
  ['old', 2, old],
  ['new', 2, current],
];
const summary = [];

function phase(line, name) {
  const row = ((line.prof && line.prof.top) || []).find((p) => p.k === name);
  return row ? row.avg : null;
}

function parseLine(text) {
  const jsonLine = text.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"'));
  if (!jsonLine) return null;
  const line = JSON.parse(jsonLine);
  const prof = line.prof || {};
  return {
    fps: line.fps,
    low: line.low,
    worst: line.worst,
    hitches: line.hitches,
    tick: prof.tickMs,
    render: phase(line, 'r:render'),
    zombies: phase(line, 'zombies'),
    draws: line.draws,
    triangles: line.triangles,
    zombieCount: line.zombies,
    builds: prof.builds && prof.builds.made,
    pipelines: prof.pipelines && prof.pipelines.made,
    spikeCauses: prof.spikeCauses || null,
  };
}

for (const [which, n, cwd] of order) {
  const logPath = path.join(dir, `${which}-${n}.log`);
  console.log(`\n=== CU-170 ${which} ${n} (${cwd}) ===`);
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(cwd, 'tools', 'bench.mjs'),
      '--night', '20', '--gfx', 'high', '--prof',
    ], { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (buf) => { chunks.push(buf); process.stdout.write(buf); };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', reject);
    child.on('exit', (c) => resolve(c ?? 1));
  });
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(logPath, text, 'utf8');
  let parsed = null;
  try { parsed = parseLine(text); } catch (e) { parsed = { error: String(e) }; }
  summary.push({ which, n, code, ...parsed });
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.error || parsed.fps == null) {
    console.error(`CU-170 ${which} ${n} did not finish (exit ${code}). Stopping.`);
    process.exit(code || 1);
  }
  console.log(`CU-170 ${which} ${n}: fps ${parsed.fps}  low ${parsed.low}  worst ${parsed.worst} ms  tick ${parsed.tick} ms  r:render ${parsed.render}  zombies ${parsed.zombies}  draws ${parsed.draws}  tris ${parsed.triangles}`);
}
console.log('CU-170: four runs finished.');
