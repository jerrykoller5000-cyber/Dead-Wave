// CU-184: night 20 High, old (82d75118 worktree outside the repo) against new (this tree), a throwaway (new) then old, new, old, new.
//   node qa/2026-10-31-CU-184/run.mjs cpu   --prof --cpu --save-cpu <raw file>   (the raw profile and frame times, for the spike frames)
//   node qa/2026-10-31-CU-184/run.mjs gc    --prof --gc --alloc                  (V8's GC per spike, and who allocates)
// Inherits the game-test lease. Not a quiet-seat job: pairs, relative.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, '../..');
const old = 'C:/Users/Zero/Desktop/dw-cu184/old';
const phase = process.argv[2];
if (!['cpu', 'gc'].includes(phase)) throw new Error('usage: run.mjs cpu|gc');
const plan = [['throwaway-new', repo], ['old-1', old], ['new-1', repo], ['old-2', old], ['new-2', repo]];
const summaryFile = path.join(dir, 'summary.json');
const summary = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : [];
const load = () => { try { return Number(execFileSync('powershell.exe', ['-NoProfile', '-Command', '(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average'], { encoding: 'utf8', timeout: 60000 }).trim()); } catch { return null; } };
function parse(text) {
  const jl = text.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"'));
  if (!jl) return null;
  const line = JSON.parse(jl), p = line.prof || {};
  return { fps: line.fps, low: line.low, worst: line.worst, hitches: line.hitches, tick: p.tickMs, outside: p.outsideMs, draws: line.draws, spikes: (p.spikes || []).length, spikeCauses: p.spikeCauses || null, builds: p.builds && p.builds.made, pipelines: p.pipelines && p.pipelines.made };
}
for (const [name, cwd] of plan) {
  const tag = `${phase}-${name}`;
  const ld = load();
  const args = [path.join(cwd, 'tools', 'bench.mjs'), '--night', '20', '--gfx', 'high', '--prof'];
  if (phase === 'cpu') args.push('--cpu', '--save-cpu', path.join(dir, `${tag}.cpu.json`));
  else args.push('--gc', '--alloc');
  console.log(`\n=== CU-184 ${tag} (${cwd}) load before ${ld}% ===`);
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (b) => { chunks.push(b); process.stdout.write(b); };
    child.stdout.on('data', take); child.stderr.on('data', take);
    child.on('error', reject); child.on('exit', (c) => resolve(c ?? 1));
  });
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(path.join(dir, `${tag}.log`), text, 'utf8');
  let parsed = null; try { parsed = parse(text); } catch (e) { parsed = { error: String(e) }; }
  summary.push({ tag, phase, code, loadBefore: ld, ...parsed });
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  if (code !== 0 || !parsed || parsed.error || parsed.fps == null) { console.error(`CU-184 ${tag} did not finish (exit ${code}). Stopping.`); process.exit(code || 1); }
  console.log(`CU-184 ${tag}: fps ${parsed.fps}  low ${parsed.low}  worst ${parsed.worst} ms  tick ${parsed.tick} ms  spikes ${parsed.spikes}  hitches ${parsed.hitches}`);
}
console.log(`CU-184 ${phase}: five runs finished.`);
