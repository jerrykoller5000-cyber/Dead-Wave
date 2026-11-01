// CU-195: view gun against the old first person. A is ?vm=0, B is the view gun.
// Three pairs at night 20 High, then three at day 5, 30 s each, one browser at a time.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
function findRoot(start) {
  let d = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'tools', 'bench.mjs'))) return d;
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  throw new Error('tools/bench.mjs not found above ' + start);
}
const root = findRoot(dir);
const bench = path.join(root, 'tools', 'bench.mjs');

function jobs() {
  const out = [];
  for (const [scene, base] of [
    ['n20', ['--night', '20', '--gfx', 'high']],
    ['d5', ['--scenario', 'day5', '--gfx', 'high']],
  ]) {
    let pair = 0;
    for (const vm of [0, 1, 0, 1, 0, 1]) {
      if (vm === 0) pair += 1;
      const arm = vm ? 'B' : 'A';
      out.push({
        name: `${scene}-${arm}${pair}`,
        args: [...base, '--seconds', '30', '--prof', '--fp', 'pistol', ...(vm ? [] : ['--vm', '0'])],
      });
    }
  }
  return out;
}

function runOne(job) {
  return new Promise((resolve) => {
    const logPath = path.join(dir, job.name + '.log');
    const log = fs.createWriteStream(logPath);
    const child = spawn(process.execPath, [bench, ...job.args], { cwd: root });
    const tap = (chunk) => { process.stdout.write(chunk); log.write(chunk); };
    child.stdout.on('data', tap);
    child.stderr.on('data', tap);
    child.on('exit', (code) => { log.end(); resolve(code ?? 1); });
  });
}

function jsonLine(name) {
  const text = fs.readFileSync(path.join(dir, name + '.log'), 'utf8');
  const rows = text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{') && l.endsWith('}'));
  if (!rows.length) return null;
  try { return JSON.parse(rows[rows.length - 1]); } catch { return null; }
}

function median(nums) {
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const results = [];
for (const job of jobs()) {
  console.log(`\nCU-195 run ${job.name}: node tools/bench.mjs ${job.args.join(' ')}`);
  const code = await runOne(job);
  const line = jsonLine(job.name);
  results.push({ name: job.name, code, line });
  console.log(`CU-195 ${job.name} exit ${code}`);
}

function pick(line, key) {
  if (!line) return null;
  if (key === 'tickMs') return line.prof && line.prof.last10 ? line.prof.last10.tickMs : (line.prof ? line.prof.tickMs : null);
  if (key === 'frameMs') return line.prof && line.prof.last10 ? line.prof.last10.frameMs : (line.prof ? line.prof.frameMs : null);
  if (key === 'viewmodelMs') return line.prof && line.prof.last10 && line.prof.last10.viewmodelMs != null ? line.prof.last10.viewmodelMs : line.viewmodelMs;
  return line[key];
}

const summary = { runs: results.map((r) => ({ name: r.name, code: r.code, fps: r.line && r.line.fps, draws: r.line && r.line.draws, fp: r.line && r.line.fp, tickMs: pick(r.line, 'tickMs'), frameMs: pick(r.line, 'frameMs'), viewmodelMs: pick(r.line, 'viewmodelMs') })) };
for (const scene of ['n20', 'd5']) {
  const pairs = [];
  for (let i = 1; i <= 3; i++) {
    const a = results.find((r) => r.name === `${scene}-A${i}`);
    const b = results.find((r) => r.name === `${scene}-B${i}`);
    if (!a || !b || !a.line || !b.line) { pairs.push({ pair: i, missing: true }); continue; }
    const diff = (key) => {
      const av = pick(a.line, key), bv = pick(b.line, key);
      return av == null || bv == null ? null : Math.round((bv - av) * 100) / 100;
    };
    pairs.push({ pair: i, fps: diff('fps'), tickMs: diff('tickMs'), frameMs: diff('frameMs'), viewmodelMs: diff('viewmodelMs'), draws: diff('draws') });
  }
  const spread = (key) => {
    const nums = pairs.map((p) => p[key]).filter((n) => typeof n === 'number');
    if (!nums.length) return null;
    return { median: Math.round(median(nums) * 100) / 100, min: Math.min(...nums), max: Math.max(...nums) };
  };
  summary[scene] = { pairs, fps: spread('fps'), tickMs: spread('tickMs'), frameMs: spread('frameMs'), viewmodelMs: spread('viewmodelMs'), draws: spread('draws') };
}
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log('CU-195 summary ' + JSON.stringify(summary));
if (results.some((r) => r.code !== 0 || !r.line)) process.exit(1);
