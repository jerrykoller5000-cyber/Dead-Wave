// CU-184: the GC and allocation pass (gc-<run>.log: --prof --gc --alloc) read: V8's GC on the main thread per run and per spike frame,
// and who allocates, new against old (function = name + file; the line moves with every edit).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const f1 = (n) => (n == null ? '-' : Number(n).toFixed(1));
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };
const strip = (k) => k.replace(/:\d+/g, '');
function load(tag) {
  const t = fs.readFileSync(path.join(dir, `gc-${tag}.log`), 'utf8');
  return JSON.parse(t.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"')));
}
const runs = {};
for (const tag of ['old-1', 'new-1', 'old-2', 'new-2']) { try { runs[tag] = load(tag); } catch (e) { out(`(${tag}: ${e.message})`); } }

out('## Runs and V8 garbage collection on the main thread');
out('| run | fps | 1% low | tick | spikes | spikes with GC (>=1 ms) | GC ms in the run | GC ms a frame | kB allocated a frame | MB/s | GC by kind |');
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [tag, l] of Object.entries(runs)) {
  const p = l.prof || {}, g = p.gc || {}, a = l.alloc || {};
  const kinds = Object.entries(g.byName || {}).map(([k, v]) => `${k} ${v.n}x ${v.ms}ms`).join('; ');
  out(`| ${tag} | ${f1(l.fps)} | ${f1(l.low)} | ${(p.tickMs || 0).toFixed(2)} | ${(p.spikes || []).length} | ${g.spikesWithGc} | ${g.totalMs} | ${g.perFrameMs} | ${a.kbPerFrame} | ${a.mbPerSecond} | ${kinds} |`);
}
for (const tag of ['new-1', 'new-2', 'old-1', 'old-2']) {
  const l = runs[tag]; if (!l || !l.prof || !l.prof.gc) continue;
  out();
  out(`## ${tag}: each spike frame and the GC inside it`);
  out('| frame | ms | wall ms | GC ms | GC events | top sections |');
  out('| --- | --- | --- | --- | --- | --- |');
  const tops = new Map((l.prof.spikes || []).map((s) => [s.frame, s.top.slice(0, 3).join(', ')]));
  for (const s of l.prof.gc.spikes) out(`| ${s.frame} | ${s.ms} | ${s.wallMs} | ${s.gcMs} | ${Object.entries(s.names || {}).map(([k, v]) => `${k} ${v}`).join('; ')} | ${tops.get(s.frame) || ''} |`);
}
// who allocates: self kB a frame, mean of the two runs, new against old
const mean = (tags, pick) => { const ms = tags.filter((t) => runs[t] && runs[t].alloc).map((t) => new Map((runs[t].alloc[pick] || []).map((x) => [strip(x.k), x.kb]))); const all = new Map(); for (const m of ms) for (const [k, v] of m) all.set(k, (all.get(k) || 0) + v / ms.length); return all; };
for (const [pick, title] of [['self', 'by function (self)'], ['stacks', 'by function and its two callers']]) {
  const O = mean(['old-1', 'old-2'], pick), N = mean(['new-1', 'new-2'], pick);
  const keys = new Set([...O.keys(), ...N.keys()]);
  const d = [...keys].map((k) => [k, O.get(k) || 0, N.get(k) || 0]).map(([k, o, n]) => [k, o, n, n - o]);
  out();
  out(`## kB allocated a frame ${title}: new against old (mean of two runs; only the 25 heaviest of each run are listed by the bench)`);
  out('| function | old | new | new - old |');
  out('| --- | --- | --- | --- |');
  for (const [k, o, n, x] of d.sort((a, b) => b[3] - a[3]).slice(0, 12)) out(`| ${k.slice(0, 150)} | ${f1(o)} | ${f1(n)} | ${x >= 0 ? '+' : ''}${f1(x)} |`);
}
fs.writeFileSync(path.join(dir, 'gc-tables.md'), lines.join('\n') + '\n', 'utf8');
