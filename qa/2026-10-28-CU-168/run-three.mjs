// CU-168: three fresh night-20 High profiler runs, one after another, on the
// game-test lease this process inherits. Stops after a run under 58 fps or a
// 1% low under 45, and writes each run's full bench output as UTF-8.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const summary = [];

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
    builds: prof.builds && prof.builds.made,
    pipelines: prof.pipelines && prof.pipelines.made,
    spikeCauses: prof.spikeCauses || null,
    spikes: prof.spikes || [],
    pipes: prof.pipelines || null,
  };
}

for (let n = 1; n <= 3; n++) {
  const logPath = path.join(dir, `run-${n}.log`);
  console.log(`\n=== CU-168 run ${n} ===`);
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(root, 'tools', 'bench.mjs'),
      '--night', '20', '--gfx', 'high', '--prof',
    ], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
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
  summary.push({ n, code, ...parsed });
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.error || parsed.fps == null) {
    console.error(`CU-168 run ${n} did not finish (exit ${code}). Stopping.`);
    process.exit(code || 1);
  }
  console.log(`CU-168 run ${n}: fps ${parsed.fps}  low ${parsed.low}  worst ${parsed.worst} ms  tick ${parsed.tick} ms  builds ${parsed.builds}  pipelines ${parsed.pipelines}`);
  if (parsed.fps < 58 || parsed.low < 45) {
    console.error(`CU-168 run ${n} under the bar (fps ${parsed.fps}, 1% low ${parsed.low}). Stopping before the next run.`);
    console.error('spikeCauses ' + JSON.stringify(parsed.spikeCauses));
    process.exit(2);
  }
}
console.log('CU-168: three runs finished above the bar.');
