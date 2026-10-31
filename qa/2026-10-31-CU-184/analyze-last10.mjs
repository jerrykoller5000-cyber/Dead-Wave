// CU-184 (Claude's follow-up, from AG-162): the CPU profiles of the last 10 s only (all 48 round him), old against new, two runs each:
// the functions' self time a frame, then what is under updateZombies and under the renderer's render (the 'zombies' and 'r:render'
// phases) by the function directly below them. Function keys are name + file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const f2 = (n) => (n == null ? '-' : Number(n).toFixed(2));
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };

function load(tag) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, `cpu-${tag}.cpu.json`), 'utf8'));
  const prof = raw.profile;
  const nodes = new Map(prof.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of prof.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const keyOf = new Map();
  for (const n of prof.nodes) { const cf = n.callFrame || {}; keyOf.set(n.id, `${cf.functionName || '(anonymous)'} ${(cf.url || '').split('/').pop().split('?')[0]}`); }
  const chain = new Map();   // node id -> keys from the root down
  const chainOf = (id) => { let c = chain.get(id); if (!c) { c = []; for (let i = id; i != null; i = parent.get(i)) c.push(keyOf.get(i)); c.reverse(); chain.set(id, c); } return c; };
  let ts = prof.startTime; const t = [], d = [], ids = [];
  for (let i = 0; i < prof.samples.length; i++) { ts += prof.timeDeltas[i]; t.push(raw.sync + (ts - prof.startTime) / 1000); d.push(prof.timeDeltas[i] / 1000); ids.push(prof.samples[i]); }
  const endT = t[t.length - 1];
  const a = endT - 10000, b = endT + 1;
  // frames in the window: the frame start times recorded by the bench's hook
  const ftTimes = Object.values(raw.ft || {}).filter((x) => x >= a && x < b).length;
  const self = new Map(), under = { updateZombies: new Map(), render: new Map() };
  let idle = 0, busy = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < a || t[i] >= b) continue;
    const c = chainOf(ids[i]), k = c[c.length - 1];
    if (/^\(idle\)/.test(k)) { idle += d[i]; continue; }
    busy += d[i];
    self.set(k, (self.get(k) || 0) + d[i]);
    const uz = c.indexOf('updateZombies index.html');
    if (uz >= 0) { const child = c[uz + 1] || '(self)'; under.updateZombies.set(child, (under.updateZombies.get(child) || 0) + d[i]); }
    const rr = c.findIndex((x) => x === 'render three.webgpu.js' || x === 'renderAsync three.webgpu.js');
    if (rr >= 0) { const child = c[rr + 1] || '(self)'; under.render.set(child, (under.render.get(child) || 0) + d[i]); }
  }
  const frames = Math.max(1, ftTimes);
  const per = (m) => new Map([...m].map(([k, v]) => [k, v / frames]));
  return { tag, frames, busy: busy / frames, idle: idle / frames, self: per(self), uz: per(under.updateZombies), rr: per(under.render) };
}
const runs = {};
for (const tag of ['old-1', 'new-1', 'old-2', 'new-2']) runs[tag] = load(tag);
out('## The last 10 s of each CPU-profiled run (ms a frame)');
out('| run | frames in the window | busy (not idle) | idle |');
out('| --- | --- | --- | --- |');
for (const r of Object.values(runs)) out(`| ${r.tag} | ${r.frames} | ${f2(r.busy)} | ${f2(r.idle)} |`);
const mean = (tags, pick) => { const all = new Map(); for (const t of tags) for (const [k, v] of runs[t][pick]) all.set(k, (all.get(k) || 0) + v / tags.length); return all; };
function table(title, pick, rows = 10) {
  const O = mean(['old-1', 'old-2'], pick), N = mean(['new-1', 'new-2'], pick);
  const keys = [...new Set([...O.keys(), ...N.keys()])];
  const d = keys.map((k) => [k, O.get(k) || 0, N.get(k) || 0]).map(([k, o, n]) => [k, o, n, n - o]);
  out(); out(`## ${title} (mean of two runs, ms a frame, last 10 s)`);
  out('| function | old | new | new - old |'); out('| --- | --- | --- | --- |');
  for (const [k, o, n, x] of d.sort((a, b) => b[3] - a[3]).slice(0, rows)) out(`| ${k} | ${f2(o)} | ${f2(n)} | ${x >= 0 ? '+' : ''}${f2(x)} |`);
  out('| ... | | | |');
  for (const [k, o, n, x] of d.sort((a, b) => a[3] - b[3]).slice(0, 3)) out(`| ${k} | ${f2(o)} | ${f2(n)} | ${f2(x)} |`);
  const so = [...O.values()].reduce((a, b) => a + b, 0), sn = [...N.values()].reduce((a, b) => a + b, 0);
  out(`| (all of them) | ${f2(so)} | ${f2(sn)} | ${sn - so >= 0 ? '+' : ''}${f2(sn - so)} |`);
}
table('Self time by function, everything', 'self', 12);
table('Under updateZombies (the zombies phase): the function directly below it', 'uz', 10);
table('Under the renderer\'s render (the r:render phase): the function directly below it', 'rr', 10);
fs.writeFileSync(path.join(dir, 'last10-tables.md'), lines.join('\n') + '\n', 'utf8');
