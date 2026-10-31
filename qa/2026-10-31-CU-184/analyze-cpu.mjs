// CU-184: the raw CPU profiles (cpu-<run>.cpu.json) read frame by frame. For each new run's spike frames: the functions with the
// most self time in that frame, and what the same frame numbers cost in the old runs; plus every function's mean ms a frame, old
// against new. Function keys are name + file (the line moves with every edit).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const f1 = (n) => (n == null ? '-' : Number(n).toFixed(1));
const f2 = (n) => (n == null ? '-' : Number(n).toFixed(2));
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };

function load(tag) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, `cpu-${tag}.cpu.json`), 'utf8'));
  const logText = fs.readFileSync(path.join(dir, `cpu-${tag}.log`), 'utf8');
  const line = JSON.parse(logText.split(/\r?\n/).reverse().find((l) => l.startsWith('{"scenario"')));
  const prof = raw.profile, nodes = new Map(prof.nodes.map((n) => [n.id, n]));
  const key = (id) => { const cf = (nodes.get(id) || {}).callFrame || {}; return `${cf.functionName || '(anonymous)'} ${(cf.url || '').split('/').pop().split('?')[0]}`; };
  const keyOf = new Map(); for (const n of prof.nodes) keyOf.set(n.id, key(n.id));
  // page time (ms) of each sample, and its self key
  const t = [], k = [], d = [];
  let ts = prof.startTime;
  for (let i = 0; i < prof.samples.length; i++) { ts += prof.timeDeltas[i]; t.push(raw.sync + (ts - prof.startTime) / 1000); k.push(keyOf.get(prof.samples[i])); d.push(prof.timeDeltas[i] / 1000); }
  const ft = raw.ft || {};
  return { tag, t, k, d, ft, line, spikes: (line.prof && line.prof.spikes) || [], frames: line.prof && line.prof.frames, parsed: line };
}
// self ms by function inside [a, b) (page time)
function window_(run, a, b) {
  const m = new Map(); let lo = 0, hi = run.t.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (run.t[mid] < a) lo = mid + 1; else hi = mid; }
  for (let i = lo; i < run.t.length && run.t[i] < b; i++) m.set(run.k[i], (m.get(run.k[i]) || 0) + run.d[i]);
  return m;
}
const frameWin = (run, f) => (run.ft[f] != null && run.ft[f - 1] != null ? [run.ft[f - 1], run.ft[f]] : null);
const top = (m, n = 6, skip = /^\(idle\)/) => [...m.entries()].filter(([k]) => !skip.test(k)).sort((x, y) => y[1] - x[1]).slice(0, n);
const fmt = (arr) => arr.map(([k, v]) => `${k} ${f1(v)}`).join('; ');

const runs = {};
for (const tag of ['old-1', 'new-1', 'old-2', 'new-2']) { try { runs[tag] = load(tag); } catch (e) { out(`(${tag}: ${e.message})`); } }

out('## Runs (the CPU profiler is on at 0.5 ms: slower than the plain runs, the same in both builds)');
out('| run | fps | 1% low | tick | spikes (>25 ms) | spikeCauses |');
out('| --- | --- | --- | --- | --- | --- |');
for (const [tag, r] of Object.entries(runs)) { const p = r.parsed; out(`| ${tag} | ${f1(p.fps)} | ${f1(p.low)} | ${f2(p.prof && p.prof.tickMs)} | ${r.spikes.length} | ${JSON.stringify(p.prof && p.prof.spikeCauses)} |`); }

// every function's mean self ms a frame over the measured run, old against new
const perFrame = (run) => { const m = new Map(); const frames = run.frames || 1; for (let i = 0; i < run.k.length; i++) m.set(run.k[i], (m.get(run.k[i]) || 0) + run.d[i]); for (const [k, v] of m) m.set(k, v / frames); return m; };
const avg = (tags) => { const ms = tags.filter((t) => runs[t]).map((t) => perFrame(runs[t])); const all = new Map(); for (const m of ms) for (const [k, v] of m) all.set(k, (all.get(k) || 0) + v / ms.length); return all; };
const O = avg(['old-1', 'old-2']), N = avg(['new-1', 'new-2']);
out();
out('## Self time a frame, mean of the two runs (ms): the functions that grew or shrank most, new against old');
out('| function | old | new | new - old |');
out('| --- | --- | --- | --- |');
const keys = new Set([...O.keys(), ...N.keys()]);
const diffs = [...keys].filter((k) => !/^\(idle\)/.test(k)).map((k) => [k, O.get(k) || 0, N.get(k) || 0]).map(([k, o, n]) => [k, o, n, n - o]);
for (const [k, o, n, d] of diffs.sort((a, b) => b[3] - a[3]).slice(0, 12)) out(`| ${k} | ${f2(o)} | ${f2(n)} | ${d >= 0 ? '+' : ''}${f2(d)} |`);
out('| ... | | | |');
for (const [k, o, n, d] of diffs.sort((a, b) => a[3] - b[3]).slice(0, 5)) out(`| ${k} | ${f2(o)} | ${f2(n)} | ${f2(d)} |`);

// each new run's spike frames
for (const nt of ['new-1', 'new-2']) {
  const run = runs[nt]; if (!run) continue;
  const ot = nt === 'new-1' ? 'old-1' : 'old-2'; const old = runs[ot];
  // the median frame's self profile as a baseline (frames between spikes)
  const spikeSet = new Set(run.spikes.map((s) => s.frame));
  out();
  out(`## ${nt}: each spike frame, the top self-time functions in it, and the same frame number in ${ot}`);
  out('| frame | ms | top functions in the frame (ms self) | same frame in old: ms, top functions |');
  out('| --- | --- | --- | --- |');
  for (const s of run.spikes) {
    const w = frameWin(run, s.frame) || [s.t0, s.t1];
    const m = window_(run, w[0], w[1]);
    const ow = old && frameWin(old, s.frame);
    const om = ow ? window_(old, ow[0], ow[1]) : null;
    const oms = ow ? ow[1] - ow[0] : null;
    out(`| ${s.frame} | ${f1(s.ms)} (wall ${f1(w[1] - w[0])}) | ${fmt(top(m, 5))} | ${om ? f1(oms) + ' ms: ' + fmt(top(om, 3)) : 'no frame time'} |`);
  }
}
fs.writeFileSync(path.join(dir, 'cpu-tables.md'), lines.join('\n') + '\n', 'utf8');
