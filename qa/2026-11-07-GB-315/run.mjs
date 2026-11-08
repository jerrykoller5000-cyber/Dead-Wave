// GB-315: night 20 High, this tree vs 2d5fb605 vs 28137581 (CU-221 / GB-279 method).
// This tree's bench/cdp via a qa copy: GB315_ROOT selects the game files; --fp m4 calls dressGuns multicam.
// One throwaway on the working tree, then three TP, three --fp ak, three --fp m4 (camo on).
// One slot run per build: GB315_BUILD=tree|2d5fb605|28137581
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../..');
const builds = {
  tree: repo,
  '2d5fb605': 'C:/Users/Zero/Desktop/dw-gb315-2d5fb605',
  '28137581': 'C:/Users/Zero/Desktop/dw-gb315-28137581',
};
const build = process.env.GB315_BUILD;
if (!builds[build]) {
  console.error('Set GB315_BUILD to tree, 2d5fb605, or 28137581');
  process.exit(2);
}
const buildRoot = builds[build];
if (!fs.existsSync(path.join(buildRoot, 'index.html'))) {
  console.error('GB-315 missing index.html in ' + buildRoot);
  process.exit(2);
}

const src = fs.readFileSync(path.join(repo, 'tools', 'bench.mjs'), 'utf8');
let patched = src
  .replace("import { serve } from './serve.mjs';", "import { serve } from '../../tools/serve.mjs';")
  .replace("import { launch } from './cdp.mjs';", "import { launch } from '../../tools/cdp.mjs';")
  .replace(
    "const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));",
    "const ROOT = path.resolve(process.env.GB315_ROOT || fileURLToPath(new URL('../..', import.meta.url)));"
  );
const god = "      if (TT.runDevCommand) TT.runDevCommand('godmode');";
const camo = god + "      if (${JSON.stringify(FP)} === 'm4' && TT.dressGuns) TT.dressGuns({ guns: { m4: 'multicam' } }); // GB-315 camo\n";
if (!src.includes(god)) {
  console.error('GB-315: bench.mjs godmode marker not found; refusing to patch');
  process.exit(2);
}
if (!patched.includes('GB-315 camo')) patched = patched.replace(god, camo);
const setW = "      if (TT.setWeapon) TT.setWeapon(idx);";
if (!src.includes(setW)) { console.error('GB-315: setWeapon marker not found'); process.exit(2); }
if (!patched.includes('grantAllWeapons')) patched = patched.replace(setW, "      if (TT.grantAllWeapons) TT.grantAllWeapons();\n" + setW);
const benchFile = path.join(dir, 'bench.mjs');
fs.writeFileSync(benchFile, patched, 'utf8');

const plan = [];
if (build === 'tree') plan.push(['throwaway-tree', []]);
for (const i of [1, 2, 3]) plan.push([build + '-tp-' + i, []]);
for (const i of [1, 2, 3]) plan.push([build + '-fp-ak-' + i, ['--fp', 'ak']]);
for (const i of [1, 2, 3]) plan.push([build + '-fp-m4-' + i, ['--fp', 'm4']]);

const only = process.env.GB315_ONLY ? process.env.GB315_ONLY.split(',') : null;
const summaryFile = path.join(dir, 'summary.json');
const summary = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : [];

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
    draws: line.draws, zombies: line.zombies, spikes: (p.spikes || []).length, fp: line.fp || null };
}

console.log('GB-315 build ' + build + ' root ' + buildRoot + ' (' + plan.length + ' runs)');
for (const [name, extra] of plan) {
  if (only && !only.includes(name)) continue;
  const before = seat();
  fs.writeFileSync(path.join(dir, name + '.seat.json'), JSON.stringify(before), 'utf8');
  console.log('\n=== GB-315 ' + name + ' seat cpu ' + before.cpuPct + '% ===');
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [benchFile, '--night', '20', '--gfx', 'high', '--prof', ...extra], {
      cwd: repo,
      env: Object.assign({}, process.env, { GB315_ROOT: buildRoot }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const take = (b) => { chunks.push(b); process.stdout.write(b); };
    child.stdout.on('data', take); child.stderr.on('data', take);
    child.on('error', reject); child.on('exit', (c) => resolve(c ?? 1));
  });
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(path.join(dir, name + '.log'), text, 'utf8');
  let parsed = null; try { parsed = parse(text); } catch (e) { parsed = { error: String(e) }; }
  const rec = Object.assign({ name, build, buildRoot, code, cpuBefore: before.cpuPct }, parsed);
  const i = summary.findIndex((s) => s.name === name);
  if (i >= 0) summary[i] = rec; else summary.push(rec);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.fps == null) { console.error('GB-315 ' + name + ' did not finish (exit ' + code + '). Stopping.'); process.exit(code || 1); }
  if (extra[0] === '--fp' && parsed.fp && parsed.fp.weapon !== extra[1]) { console.error('GB-315 ' + name + ' weapon was ' + parsed.fp.weapon + ', expected ' + extra[1]); process.exit(1); }
  console.log('GB-315 ' + name + ': fps ' + parsed.fps + ' low ' + parsed.low + ' worst ' + parsed.worst + ' frame ' + parsed.frameMs + ' tick ' + parsed.tickMs + ' r:render ' + parsed.render + ' draws ' + parsed.draws);
}
console.log('GB-315: ' + build + ' runs finished.');