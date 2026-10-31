// CU-186: night 20 High from a quiet seat, 1.0 (82d75118, a detached worktree outside the repo) against 1.1 (this tree, as it stands),
// back to back in one slot hold: a throwaway (new), then old, new three times (--prof), then two alloc pairs (--prof --alloc, kB a frame).
// Both builds run the same tools/bench.mjs (copied into the old tree). The seat is written down before each run.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../..');
const old = 'C:/Users/Zero/Desktop/dw-cu186-old';
const plan = [['throwaway-new', repo, []], ['old-1', old, []], ['new-1', repo, []], ['old-2', old, []], ['new-2', repo, []], ['old-3', old, []], ['new-3', repo, []],
  ['alloc-old-1', old, ['--alloc']], ['alloc-new-1', repo, ['--alloc']], ['alloc-old-2', old, ['--alloc']], ['alloc-new-2', repo, ['--alloc']]];
const only = process.env.CU186_ONLY ? process.env.CU186_ONLY.split(',') : null;
const summaryFile = path.join(dir, 'summary.json');
const summary = fs.existsSync(summaryFile) && only ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : [];

function seat() {
  const ps = `
    $c = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 5).CounterSamples | Measure-Object CookedValue -Average
    $lp = (Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average
    $top = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 8 Name, PercentProcessorTime
    $count = @{}
    foreach ($n in 'chrome','msedge','vmmem','vmmemWSL','wsl','node','git','Cursor','ChatGPT','Antigravity','MsMpEng','SearchIndexer') { $count[$n] = @(Get-Process -Name $n -ErrorAction SilentlyContinue).Count }
    [pscustomobject]@{ cpuPct = [math]::Round($c.Average, 1); loadPct = $lp; top = $top; counts = $count } | ConvertTo-Json -Compress -Depth 4`;
  try { return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 90000 })); }
  catch (e) { return { error: String(e).slice(0, 200) }; }
}
function parse(text) {
  const jl = text.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"'));
  if (!jl) return null;
  const line = JSON.parse(jl), p = line.prof || {}, l10 = p.last10 || {};
  const m = {}; for (const t of p.top || []) m[t.k] = t.avg;
  const m10 = {}; for (const t of l10.top || []) m10[t.k] = t.avg;
  return { fps: line.fps, low: line.low, worst: line.worst, hitches: line.hitches,
    frameMs: p.frameMs, tickWhole: p.tickMs, tick10: l10.tickMs, outside10: l10.outsideMs, frame10: l10.frameMs, gpuMs: p.gpuMs,
    render10: m10['r:render'], zombies10: m10['zombies'], renderWhole: m['r:render'], zombiesWhole: m['zombies'],
    draws: line.draws, triangles: line.triangles, zombieCount: line.zombies, builds: p.builds && p.builds.made, pipelines: p.pipelines && p.pipelines.made,
    spikes: (p.spikes || []).length, spikeCauses: p.spikeCauses || null,
    kbPerFrame: line.alloc ? line.alloc.kbPerFrame : null, mbPerSecond: line.alloc ? line.alloc.mbPerSecond : null,
    top10: (l10.top || []).slice(0, 8) };
}
for (const [name, cwd, extra] of plan) {
  if (only && !only.includes(name)) continue;
  const before = seat();
  fs.writeFileSync(path.join(dir, `${name}.seat.json`), JSON.stringify(before, null, 2), 'utf8');
  console.log(`\n=== CU-186 ${name} (${cwd}) seat before: cpu ${before.cpuPct}% load ${before.loadPct}% top ${(before.top || []).slice(0, 4).map((t) => t.Name + ':' + t.PercentProcessorTime).join(' ')} ===`);
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(cwd, 'tools', 'bench.mjs'), '--night', '20', '--gfx', 'high', '--prof', ...extra], { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (b) => { chunks.push(b); process.stdout.write(b); };
    child.stdout.on('data', take); child.stderr.on('data', take);
    child.on('error', reject); child.on('exit', (c) => resolve(c ?? 1));
  });
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(path.join(dir, `${name}.log`), text, 'utf8');
  let parsed = null; try { parsed = parse(text); } catch (e) { parsed = { error: String(e) }; }
  const i = summary.findIndex((s) => s.name === name); const rec = { name, code, cpuBefore: before.cpuPct, loadBefore: before.loadPct, ...parsed };
  if (i >= 0) summary[i] = rec; else summary.push(rec);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.error || parsed.fps == null) { console.error(`CU-186 ${name} did not finish (exit ${code}). Stopping.`); process.exit(code || 1); }
  console.log(`CU-186 ${name}: fps ${parsed.fps}  low ${parsed.low}  worst ${parsed.worst} ms  tick ${parsed.tickWhole}/${parsed.tick10} ms (whole/last 10 s)  r:render ${parsed.render10}  zombies ${parsed.zombies10}  draws ${parsed.draws}  spikes ${parsed.spikes}  kB/frame ${parsed.kbPerFrame}`);
}
console.log('CU-186: runs finished.');
