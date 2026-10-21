import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const outDir = path.resolve('qa/2026-10-19-AG-91');
const profLinesPath = path.resolve('qa/2026-10-19-AG-86/prof-lines.jsonl');

console.log('=== Step 1: Running verify-rocks-and-hud.mjs ===');
execFileSync('node', ['qa/2026-10-19-AG-91/verify-rocks-and-hud.mjs'], { stdio: 'inherit' });

const benchRuns = [];
for (let i = 1; i <= 3; i++) {
  console.log(`=== Step 2.${i}: Running bench.mjs --night 20 --gfx high --prof --cpu (run ${i}/3) ===`);
  const stdout = execFileSync(
    'node',
    ['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof', '--cpu'],
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  const lines = stdout.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('{') && l.endsWith('}'));
  const jsonLine = lines[lines.length - 1];
  if (!jsonLine) {
    throw new Error(`No JSON line found in bench run ${i}: ${stdout}`);
  }
  console.log(`Run ${i} JSON line:`, jsonLine.slice(0, 320) + '...');
  fs.appendFileSync(profLinesPath, jsonLine + '\n', 'utf8');
  benchRuns.push(JSON.parse(jsonLine));
}

// Compute median by fps (or frameMs)
const sorted = [...benchRuns].sort((a, b) => a.fps - b.fps);
const medianRun = sorted[1];

const resPath = path.join(outDir, 'results.json');
const prev = JSON.parse(fs.readFileSync(resPath, 'utf8'));
prev.benchRunsSummary = benchRuns.map((r, idx) => ({
  run: idx + 1,
  fps: r.fps,
  low: r.low,
  worst: r.worst,
  hitches: r.hitches,
  draws: r.draws,
  triangles: r.triangles,
  zombies: r.zombies,
  frameMs: r.prof?.frameMs,
  tickMs: r.prof?.tickMs,
  outsideMs: r.prof?.outsideMs,
  gpuMs: r.prof?.gpuMs,
  sections: r.prof?.sections,
  censusSummary: r.census ? {
    nodes: r.census.nodes,
    autoNodes: r.census.autoNodes,
    meshes: r.census.meshes,
    shownMeshes: r.census.shownMeshes,
    casters: r.census.casters,
    top: r.census.top,
    culledTops: r.census.culledTops,
    culledNodes: r.census.culledNodes,
    zombieNodes: r.census.zombieNodes,
    draws: r.census.draws
  } : null
}));
prev.benchMedian = {
  fps: medianRun.fps,
  low: medianRun.low,
  worst: medianRun.worst,
  hitches: medianRun.hitches,
  draws: medianRun.draws,
  triangles: medianRun.triangles,
  zombies: medianRun.zombies,
  prof: medianRun.prof,
  census: medianRun.census,
  cpuTopSelf: medianRun.cpu?.self?.slice(0, 12),
  cpuTopTotal: medianRun.cpu?.total?.slice(0, 12)
};
fs.writeFileSync(resPath, JSON.stringify(prev, null, 2), 'utf8');
console.log('=== Done! Median FPS:', medianRun.fps, 'frameMs:', medianRun.prof?.frameMs, 'draws:', medianRun.draws);
