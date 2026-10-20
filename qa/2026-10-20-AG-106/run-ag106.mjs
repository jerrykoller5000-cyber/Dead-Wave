import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
fs.mkdirSync(__dirname, { recursive: true });

const env = { ...process.env, DW_ALLOW_RAW_CDP: '1' };

const runs = [
  { id: 'run-1', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] },
  { id: 'run-2', args: ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof'] }
];

const summary = [];

for (const run of runs) {
  console.log(`\n=== [AG-106] Starting ${run.id}: node ${run.args.join(' ')} ===`);
  const res = spawnSync('node', run.args, {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  const rawPath = path.join(__dirname, `${run.id}.log`);
  fs.writeFileSync(rawPath, res.stdout || '', 'utf8');
  if (res.stderr) {
    fs.writeFileSync(path.join(__dirname, `${run.id}.stderr.log`), res.stderr, 'utf8');
  }
  if (res.status !== 0) {
    throw new Error(`${run.id} exited with code ${res.status}: ${res.stderr}`);
  }

  // Extract JSON line at the end of stdout
  const lines = (res.stdout || '').trim().split(/\r?\n/);
  const jsonLine = lines[lines.length - 1];
  const parsed = JSON.parse(jsonLine);
  summary.push({
    id: run.id,
    fps: parsed.fps,
    low: parsed.low,
    worst: parsed.worst,
    hitches: parsed.hitches,
    draws: parsed.draws,
    triangles: parsed.triangles,
    frameMs: parsed.prof?.frameMs,
    tickMs: parsed.prof?.tickMs,
    outsideMs: parsed.prof?.outsideMs,
    gpuMs: parsed.prof?.gpuMs,
    spikeCauses: parsed.prof?.spikeCauses,
    spikes: parsed.prof?.spikes,
    pipelines: parsed.prof?.pipelines
  });
  console.log(`[AG-106] ${run.id}: fps=${parsed.fps}, low=${parsed.low}, tick=${parsed.prof?.tickMs}ms`);
  console.log(`[AG-106] ${run.id} spikeCauses:`, JSON.stringify(parsed.prof?.spikeCauses));
  console.log(`[AG-106] ${run.id} pipelines:`, JSON.stringify(parsed.prof?.pipelines, null, 2));
}

const outPath = path.join(__dirname, 'ag106-summary.json');
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`\n[AG-106] Wrote summary to ${outPath}`);
