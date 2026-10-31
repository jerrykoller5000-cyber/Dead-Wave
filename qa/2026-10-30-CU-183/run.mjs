// CU-183: night 20 High, --prof, 1.0 (82d75118, a detached worktree outside the repo) against 1.1 (this tree, as it stands),
// back to back in one slot hold: a throwaway (new), then old, new, old, new. The seat is written down before each run.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../..');
const old = 'C:/Users/Zero/Desktop/dw-cu183/old';
const plan = [['throwaway-new', repo], ['old-1', old], ['new-1', repo], ['old-2', old], ['new-2', repo]];
const summaryFile = path.join(dir, 'summary.json');
const summary = [];

function seat() {
  const ps = `
    $c = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 5).CounterSamples | Measure-Object CookedValue -Average
    $lp = (Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average
    $top = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 8 Name, PercentProcessorTime
    $count = @{}
    foreach ($n in 'chrome','msedge','vmmem','vmmemWSL','wsl','node','git','Cursor','ChatGPT','Antigravity','MsMpEng') { $count[$n] = @(Get-Process -Name $n -ErrorAction SilentlyContinue).Count }
    [pscustomobject]@{ cpuPct = [math]::Round($c.Average, 1); loadPct = $lp; top = $top; counts = $count } | ConvertTo-Json -Compress -Depth 4`;
  try { return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 90000 })); }
  catch (e) { return { error: String(e).slice(0, 200) }; }
}
function parse(text) {
  const jl = text.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"'));
  if (!jl) return null;
  const line = JSON.parse(jl), p = line.prof || {};
  const m = {}; for (const t of p.top || []) m[t.k] = t.avg;
  return { fps: line.fps, low: line.low, worst: line.worst, hitches: line.hitches, tick: p.tickMs, frameMs: p.frameMs, outside: p.outsideMs, gpuMs: p.gpuMs,
    draws: line.draws, triangles: line.triangles, zombies: line.zombies, builds: p.builds && p.builds.made, pipelines: p.pipelines && p.pipelines.made,
    spikeCauses: p.spikeCauses || null, render: m['r:render'], zombieMark: m['zombies'], matrices: m['r:matrices'], cull: m['r:cull'], top: (p.top || []).slice(0, 8) };
}
for (const [name, cwd] of plan) {
  const before = seat();
  fs.writeFileSync(path.join(dir, `${name}.seat.json`), JSON.stringify(before, null, 2), 'utf8');
  console.log(`\n=== CU-183 ${name} (${cwd}) seat before: cpu ${before.cpuPct}% load ${before.loadPct}% top ${(before.top || []).slice(0, 4).map((t) => t.Name + ':' + t.PercentProcessorTime).join(' ')} ===`);
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(cwd, 'tools', 'bench.mjs'), '--night', '20', '--gfx', 'high', '--prof'], { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (b) => { chunks.push(b); process.stdout.write(b); };
    child.stdout.on('data', take); child.stderr.on('data', take);
    child.on('error', reject); child.on('exit', (c) => resolve(c ?? 1));
  });
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(path.join(dir, `${name}.log`), text, 'utf8');
  let parsed = null; try { parsed = parse(text); } catch (e) { parsed = { error: String(e) }; }
  summary.push({ name, code, cpuBefore: before.cpuPct, loadBefore: before.loadPct, ...parsed });
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.error || parsed.fps == null) { console.error(`CU-183 ${name} did not finish (exit ${code}). Stopping.`); process.exit(code || 1); }
  console.log(`CU-183 ${name}: fps ${parsed.fps}  low ${parsed.low}  worst ${parsed.worst} ms  tick ${parsed.tick} ms  r:render ${parsed.render}  zombies ${parsed.zombieMark}  draws ${parsed.draws}  hitches ${parsed.hitches}  builds ${parsed.builds}  pipelines ${parsed.pipelines}`);
}
console.log('CU-183: five runs finished.');
