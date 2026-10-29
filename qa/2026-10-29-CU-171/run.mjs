// CU-171: night 20 High, every PROF section, runs of scratch trees in a given order.
//   node qa/2026-10-29-CU-171/run.mjs A   old new old new
//   node qa/2026-10-29-CU-171/run.mjs C   s new c new p new
// Trees live outside the repo in C:/Users/Zero/Desktop/dw-cu171: old (82d75118 worktree), new (a snapshot of the
// current tree), s / c / p (new with one suspect taken out). Each has the same z:update / z:abilities / z:feral marks.
// This process inherits the game-test lease from `crew.mjs slot run` and runs one bench at a time.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = 'C:/Users/Zero/Desktop/dw-cu171';
const phase = process.argv[2];
const trees = process.argv.slice(3);
if (!phase || !trees.length) throw new Error('usage: run.mjs <phase letter> <tree>...');
const label = { old: 'old', new: 'new', s: 'noShamblerRecovery', c: 'oldScreamerPose', p: 'oldSpiderBlock' };
const seen = {};
const summaryFile = path.join(dir, 'summary.json');
const summary = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : [];

function seat() {
  const ps = `
    $c = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 3).CounterSamples | Measure-Object CookedValue -Average
    $top = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 6 Name, PercentProcessorTime
    $count = @{}
    foreach ($n in 'chrome','msedge','vmmem','vmmemWSL','wsl','wslhost','node','Cursor','ChatGPT','Antigravity') { $count[$n] = @(Get-Process -Name $n -ErrorAction SilentlyContinue).Count }
    [pscustomobject]@{ cpuPct = [math]::Round($c.Average, 1); top = $top; counts = $count } | ConvertTo-Json -Compress -Depth 4`;
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 60000 });
    return JSON.parse(out);
  } catch (e) { return { error: String(e).slice(0, 200) }; }
}

function parse(text) {
  const jsonLine = text.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"'));
  if (!jsonLine) return null;
  const line = JSON.parse(jsonLine);
  const prof = line.prof || {};
  const marks = {};
  for (const m of prof.top || []) marks[m.k] = m.avg;
  return {
    fps: line.fps, low: line.low, worst: line.worst, hitches: line.hitches,
    tick: prof.tickMs, frameMs: prof.frameMs, outside: prof.outsideMs, gpuMs: prof.gpuMs,
    draws: line.draws, triangles: line.triangles, zombieCount: line.zombies,
    builds: prof.builds && prof.builds.made, pipelines: prof.pipelines && prof.pipelines.made,
    spikeCauses: prof.spikeCauses || null,
    marks,
  };
}

for (const tree of trees) {
  seen[tree] = (seen[tree] || 0) + 1;
  const name = `${phase}-${label[tree]}-${seen[tree]}`;
  const root = `${base}/${tree}`;
  const before = seat();
  fs.writeFileSync(path.join(dir, `${name}.seat.json`), JSON.stringify(before, null, 2), 'utf8');
  console.log(`\n=== CU-171 ${name} (${root}) seat before: cpu ${before.cpuPct}% ${JSON.stringify(before.counts)} ===`);
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'tools', 'bench.mjs'), '--night', '20', '--gfx', 'high', '--prof-all'],
      { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (b) => { chunks.push(b); process.stdout.write(b); };
    child.stdout.on('data', take); child.stderr.on('data', take);
    child.on('error', reject); child.on('exit', (c) => resolve(c ?? 1));
  });
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(path.join(dir, `${name}.log`), text, 'utf8');
  let parsed = null;
  try { parsed = parse(text); } catch (e) { parsed = { error: String(e) }; }
  summary.push({ name, phase, tree, code, cpuBefore: before.cpuPct, ...parsed });
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.error || parsed.fps == null) {
    console.error(`CU-171 ${name} did not finish (exit ${code}). Stopping.`);
    process.exit(code || 1);
  }
  const m = parsed.marks;
  console.log(`CU-171 ${name}: fps ${parsed.fps}  low ${parsed.low}  worst ${parsed.worst} ms  tick ${parsed.tick} ms  z:update ${m['z:update']}  z:abilities ${m['z:abilities']}  z:feral ${m['z:feral']}  r:render ${m['r:render']}  draws ${parsed.draws}  tris ${parsed.triangles}`);
}
console.log(`CU-171 phase ${phase}: ${trees.length} runs finished.`);
