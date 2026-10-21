import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('qa', '2026-10-20-AG-103');
fs.mkdirSync(OUT_DIR, { recursive: true });

const runs = [];
for (let i = 1; i <= 3; i++) {
  console.log(`\n=== AG-103 Night 20 High --prof --cpu --alloc Run ${i}/3 ===`);
  const res = spawnSync(
    process.execPath,
    ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu', '--alloc'],
    { cwd: process.cwd(), encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 }
  );
  const fullOut = (res.stdout || '') + (res.stderr ? '\n--- STDERR ---\n' + res.stderr : '');
  const logPath = path.join(OUT_DIR, `bench-run${i}.log`);
  fs.writeFileSync(logPath, fullOut, 'utf8');
  process.stdout.write(res.stdout || '');
  if (res.stderr) process.stderr.write(res.stderr);

  const lines = (res.stdout || '').trim().split('\n');
  let parsed = null;
  for (let j = lines.length - 1; j >= 0; j--) {
    const l = lines[j].trim();
    if (l.startsWith('{') && l.endsWith('}')) {
      try {
        parsed = JSON.parse(l);
        break;
      } catch { /* ignore */ }
    }
  }
  runs.push({
    run: i,
    exitCode: res.status,
    fps: parsed?.fps,
    low: parsed?.low,
    worst: parsed?.worst,
    hitches: parsed?.hitches,
    draws: parsed?.draws,
    triangles: parsed?.triangles,
    frameMs: parsed?.prof?.frameMs,
    tickMs: parsed?.prof?.tickMs,
    outsideMs: parsed?.prof?.outsideMs,
    gpuMs: parsed?.prof?.gpuMs,
    kbPerFrame: parsed?.alloc?.kbPerFrame,
    mbPerSecond: parsed?.alloc?.mbPerSecond,
    spikes: parsed?.prof?.spikes || [],
    topProf: parsed?.prof?.top || [],
    topAllocSelf: (parsed?.alloc?.self || []).slice(0, 15),
    raw: parsed,
  });
}

fs.writeFileSync(path.join(OUT_DIR, 'bench-3x-summary.json'), JSON.stringify({ runs }, null, 2) + '\n', 'utf8');
console.log('\n=== AG-103 3x Summary Saved to qa/2026-10-20-AG-103/bench-3x-summary.json ===');
for (const r of runs) {
  console.log(
    `Run ${r.run}: fps=${r.fps} | 1%low=${r.low} | frameMs=${r.frameMs} | tickMs=${r.tickMs} | outsideMs=${r.outsideMs} | gpuMs=${r.gpuMs} | kb/frame=${r.kbPerFrame} (${r.mbPerSecond} MB/s) |draws=${r.draws} | spikes=${JSON.stringify(r.spikes)}`
  );
}
