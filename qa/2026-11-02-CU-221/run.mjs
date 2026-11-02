// CU-221: night 20 High, 1.1.0 (d395dc54, detached worktree) against this tree.
// One throwaway, then three third-person pairs, then three first-person pairs (bench --fp pistol).
// Both builds run this tree's tools/bench.mjs and tools/cdp.mjs, copied into the old tree at the start.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../..');
const old = 'C:/Users/Zero/Desktop/dw-cu221-old';
for (const file of ['tools/bench.mjs', 'tools/cdp.mjs']) {
  fs.copyFileSync(path.join(repo, file), path.join(old, file));
}
const plan = [
  ['throwaway-new', repo, []],
  ['old-tp-1', old, []], ['new-tp-1', repo, []],
  ['old-tp-2', old, []], ['new-tp-2', repo, []],
  ['old-tp-3', old, []], ['new-tp-3', repo, []],
  ['old-fp-1', old, ['--fp', 'pistol']], ['new-fp-1', repo, ['--fp', 'pistol']],
  ['old-fp-2', old, ['--fp', 'pistol']], ['new-fp-2', repo, ['--fp', 'pistol']],
  ['old-fp-3', old, ['--fp', 'pistol']], ['new-fp-3', repo, ['--fp', 'pistol']],
];
const only = process.env.CU221_ONLY ? process.env.CU221_ONLY.split(',') : null;
const summaryFile = path.join(dir, 'summary.json');
const summary = fs.existsSync(summaryFile) && only ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : [];

function seat() {
  const ps = `
    $c = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 3).CounterSamples | Measure-Object CookedValue -Average
    $lp = (Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average
    $top = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 6 Name, PercentProcessorTime
    $count = @{}
    foreach ($n in 'chrome','msedge','node','git','Cursor','ChatGPT') { $count[$n] = @(Get-Process -Name $n -ErrorAction SilentlyContinue).Count }
    [pscustomobject]@{ cpuPct = [math]::Round($c.Average, 1); loadPct = $lp; top = $top; counts = $count } | ConvertTo-Json -Compress -Depth 4`;
  try { return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 60000 })); }
  catch (e) { return { error: String(e).slice(0, 200) }; }
}
function parse(text) {
  const jl = text.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"'));
  if (!jl) return null;
  const line = JSON.parse(jl), p = line.prof || {}, l10 = p.last10 || {};
  const m10 = {}; for (const t of l10.top || []) m10[t.k] = t.avg;
  return { fps: line.fps, low: line.low, worst: line.worst,
    frameMs: l10.frameMs || p.frameMs, tickMs: l10.tickMs || p.tickMs, render: m10['r:render'],
    draws: line.draws, zombies: line.zombies, spikes: (p.spikes || []).length };
}
for (const [name, cwd, extra] of plan) {
  if (only && !only.includes(name)) continue;
  const before = seat();
  fs.writeFileSync(path.join(dir, `${name}.seat.json`), JSON.stringify(before), 'utf8');
  console.log(`\n=== CU-221 ${name} seat cpu ${before.cpuPct}% ===`);
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
  const rec = { name, code, cpuBefore: before.cpuPct, ...parsed };
  const i = summary.findIndex((s) => s.name === name);
  if (i >= 0) summary[i] = rec; else summary.push(rec);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.fps == null) { console.error(`CU-221 ${name} did not finish (exit ${code}). Stopping.`); process.exit(code || 1); }
  console.log(`CU-221 ${name}: fps ${parsed.fps} low ${parsed.low} worst ${parsed.worst} frame ${parsed.frameMs} tick ${parsed.tickMs} r:render ${parsed.render} draws ${parsed.draws}`);
}
console.log('CU-221: runs finished.');
