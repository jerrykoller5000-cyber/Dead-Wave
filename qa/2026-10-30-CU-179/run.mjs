// CU-179: night 20 High, --prof, on the tree as it stands: one throwaway, then three runs. Before each run the seat is
// written down (CPU %, the busiest processes, counts), so the report can say what was up. Inherits the game-test lease.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const summaryFile = path.join(dir, 'summary.json');
const summary = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : [];
const runs = process.argv.slice(2);   // names: throwaway run-1 run-2 run-3

function seat() {
  const ps = `
    $c = (Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 5).CounterSamples | Measure-Object CookedValue -Average
    $top = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 8 Name, PercentProcessorTime
    $count = @{}
    foreach ($n in 'chrome','msedge','vmmem','vmmemWSL','wsl','wslhost','node','git','Cursor','ChatGPT','Antigravity','MsMpEng','powershell') { $count[$n] = @(Get-Process -Name $n -ErrorAction SilentlyContinue).Count }
    [pscustomobject]@{ cpuPct = [math]::Round($c.Average, 1); top = $top; counts = $count } | ConvertTo-Json -Compress -Depth 4`;
  try { return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 90000 })); }
  catch (e) { return { error: String(e).slice(0, 200) }; }
}
function parse(text) {
  const jl = text.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"'));
  if (!jl) return null;
  const line = JSON.parse(jl), p = line.prof || {};
  return { fps: line.fps, low: line.low, worst: line.worst, hitches: line.hitches, tick: p.tickMs, frameMs: p.frameMs, outside: p.outsideMs, gpuMs: p.gpuMs,
    draws: line.draws, triangles: line.triangles, zombies: line.zombies, builds: p.builds && p.builds.made, pipelines: p.pipelines && p.pipelines.made,
    spikeCauses: p.spikeCauses || null, spikes: (p.spikes || []).length, top: (p.top || []).slice(0, 12) };
}
for (const name of runs) {
  const before = seat();
  fs.writeFileSync(path.join(dir, `${name}.seat.json`), JSON.stringify(before, null, 2), 'utf8');
  console.log(`\n=== CU-179 ${name}: seat before: cpu ${before.cpuPct}% top ${(before.top || []).slice(0, 4).map((t) => t.Name + ':' + t.PercentProcessorTime).join(' ')} ===`);
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'tools', 'bench.mjs'), '--night', '20', '--gfx', 'high', '--prof'], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (b) => { chunks.push(b); process.stdout.write(b); };
    child.stdout.on('data', take); child.stderr.on('data', take);
    child.on('error', reject); child.on('exit', (c) => resolve(c ?? 1));
  });
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(path.join(dir, `${name}.log`), text, 'utf8');
  let parsed = null; try { parsed = parse(text); } catch (e) { parsed = { error: String(e) }; }
  summary.push({ name, code, cpuBefore: before.cpuPct, ...parsed });
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.error || parsed.fps == null) { console.error(`CU-179 ${name} did not finish (exit ${code}). Stopping.`); process.exit(code || 1); }
  console.log(`CU-179 ${name}: fps ${parsed.fps}  low ${parsed.low}  worst ${parsed.worst} ms  tick ${parsed.tick} ms  hitches ${parsed.hitches}  builds ${parsed.builds}  pipelines ${parsed.pipelines}  spikes ${parsed.spikes}`);
}
console.log(`CU-179: ${runs.length} runs finished.`);
