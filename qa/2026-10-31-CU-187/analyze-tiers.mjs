// CU-187: the functions of night 20's frame, each with the tier V8 gave it, how often its optimized code was made again, when TurboFan
// first got it, and its deoptimizations: from V8's own code log of a bench run in Chrome 156 (V8 15.6; --log-code --log-deopt), joined
// with the time the frame spends in each function (a raw CPU profile of CU-184) and with bytecode sizes (bytecode.mjs).
//   node qa/2026-10-31-CU-187/analyze-tiers.mjs <v8 log> <cpu json> <bytecode json> <frames in the cpu profile>
// Markers in the log: ~ Ignition, ^ Sparkplug, + Maglev, * TurboFan; an 'o' in front is on-stack replacement code.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const [logFile, cpuFile, bcFile, framesArg] = process.argv.slice(2);
const frames = Number(framesArg) || 1800;
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };
const text = fs.readFileSync(logFile, 'utf8').split('\n');

// ---- code events: name file:line -> events
const re = /^code-creation,JS,\d+,(\d+),0x[0-9a-f]+,(\d+),(.*?) (\S+?):(\d+):(\d+),0x[0-9a-f]+,(.*)$/;
let t0 = Infinity, tEnd = 0;
const fnEvents = new Map();   // name + file -> [{ t(s), size, base, osr, line, col }]
const starts = new Map();     // file -> [{ line, col, name }]
for (const l of text) {
  if (!l.startsWith('code-creation,JS,')) continue;
  const m = re.exec(l); if (!m) continue;
  const us = +m[1]; if (us < t0) t0 = us; if (us > tEnd) tEnd = us;
}
for (const l of text) {
  if (!l.startsWith('code-creation,JS,')) continue;
  const m = re.exec(l); if (!m) continue;
  const name = m[3] || '(anonymous)', file = m[4].split('?')[0].split('/').pop() || '';
  const mark = m[7], osr = mark.startsWith('o'), base = (osr ? mark.slice(1) : mark)[0];
  const k = `${name} ${file}`;
  (fnEvents.get(k) || (fnEvents.set(k, []), fnEvents.get(k))).push({ t: (+m[1] - t0) / 1e6, size: +m[2], base, osr });
  (starts.get(file) || (starts.set(file, []), starts.get(file))).push({ line: +m[5], col: +m[6], name });
}
for (const arr of starts.values()) arr.sort((a, b) => a.line - b.line || a.col - b.col);
const tierName = { '~': 'Ignition', '^': 'Sparkplug', '+': 'Maglev', '*': 'TurboFan' };
function summarize(ev) {
  const c = { '~': 0, '^': 0, '+': 0, '*': 0, o: 0 };
  let bytecode = null, firstTf = null, top = '~';
  for (const e of ev) {
    if (e.osr) { c.o++; continue; }
    if (c[e.base] === undefined) continue;
    c[e.base]++;
    if (e.base === '~' && bytecode == null) bytecode = e.size;
    if (e.base === '*' && firstTf == null) firstTf = e.t;
  }
  top = c['*'] ? '*' : c['+'] ? '+' : c['^'] ? '^' : '~';
  return { ...c, bytecode, firstTf, top };
}

// ---- deopts: positions -> functions (index.html by its logged source, other files by the nearest function start)
let src = null;
for (const l of text) { if (!l.startsWith('script-source,')) continue; const m = /^script-source,(\d+),([^,]*index\.html[^,]*),(.*)$/.exec(l); if (m && (!src || m[3].length > src.length)) src = m[3]; }
const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t').replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\\\/g, '\\');
const SL = src ? unesc(src).split('\n') : [];
let offset = 0;
{ const uz = (starts.get('index.html') || []).find((s) => s.name === 'updateZombies'); const at = SL.findIndex((x) => /^    function updateZombies\(/.test(x)); if (uz && at >= 0) offset = uz.line - (at + 1); }
const fns = [];
for (let i = 0; i < SL.length; i++) {
  const m = /^    (?:async )?function ([A-Za-z0-9_$]+)\(/.exec(SL[i]); if (!m) continue;
  let e = i; if (!/^    (?:async )?function .*\{.*\}\s*$/.test(SL[i])) { e = i + 1; while (e < SL.length && !/^    \}\s*$/.test(SL[e])) e++; }
  fns.push({ name: m[1], a: i + 1 + offset, b: e + 1 + offset });
}
const fnAt = (file, line, col) => {
  if (file === 'index.html') { let best = null; for (const f of fns) if (line >= f.a && line <= f.b && (!best || f.a > best.a)) best = f; return best ? best.name : null; }
  const arr = starts.get(file) || []; let best = null;
  for (const s of arr) { if (s.line < line || (s.line === line && s.col <= col)) best = s; else break; }
  return best ? best.name : null;
};
const deopts = new Map();   // name file -> { n, reasons }
let nDeopt = 0;
for (const l of text) {
  if (!l.startsWith('code-deopt,')) continue;
  const p = l.split(','); const m = /^<(.*?):(\d+):(\d+)>$/.exec(p[7]); if (!m) continue;
  nDeopt++;
  const file = m[1].split('?')[0].split('/').pop(), name = fnAt(file, +m[2], +m[3]); if (!name) continue;
  const k = `${name} ${file}`, reason = p.slice(8).join(',');
  const e = deopts.get(k) || { n: 0, reasons: new Map() }; e.n++; e.reasons.set(reason, (e.reasons.get(reason) || 0) + 1); deopts.set(k, e);
}

// ---- time in each function (CPU profile)
const raw = JSON.parse(fs.readFileSync(cpuFile, 'utf8')), prof = raw.profile;
const nodes = new Map(prof.nodes.map((n) => [n.id, n])), parent = new Map();
for (const n of prof.nodes) for (const c of n.children || []) parent.set(c, n.id);
const keyOfNode = (id) => { const cf = (nodes.get(id) || {}).callFrame || {}; return `${cf.functionName || '(anonymous)'} ${(cf.url || '').split('/').pop().split('?')[0]}`; };
const totalMs = new Map(), selfMs = new Map();
for (let i = 0; i < prof.samples.length; i++) {
  const dt = prof.timeDeltas[i] / 1000, seen = new Set(); let first = true;
  for (let id = prof.samples[i]; id != null; id = parent.get(id)) { const k = keyOfNode(id); if (first) { selfMs.set(k, (selfMs.get(k) || 0) + dt); first = false; } if (!seen.has(k)) { seen.add(k); totalMs.set(k, (totalMs.get(k) || 0) + dt); } }
}
const bc = JSON.parse(fs.readFileSync(bcFile, 'utf8')); const staticLen = new Map();
for (const [file, v] of Object.entries(bc)) for (const f of v.top) { const k = `${f.name} ${path.basename(file)}`; staticLen.set(k, Math.max(staticLen.get(k) || 0, f.len)); }

const f2 = (n) => (n == null ? '-' : Number(n).toFixed(2));
const rows = [];
for (const [k, ms] of totalMs) {
  const ev = fnEvents.get(k); if (!ev || /^\((root|program|idle|garbage collector)\)/.test(k)) continue;
  const s = summarize(ev), d = deopts.get(k);
  rows.push({ k, perFrame: ms / frames, self: (selfMs.get(k) || 0) / frames, ...s, static: staticLen.get(k) || null, deopts: d ? d.n : 0, why: d ? [...d.reasons].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([r, n]) => `${r} ${n}`).join('; ') : '' });
}
rows.sort((a, b) => b.perFrame - a.perFrame);
out(`V8 log: ${((tEnd - t0) / 1e6).toFixed(0)} s of code events, ${nDeopt} deoptimizations; the CPU profile is ${frames} frames of night 20; V8's TurboFan limit is 61,440 bytes of bytecode.`);
out();
out('## The frame path: time, size, the tier reached, the deoptimizations');
out('| function | file | ms a frame (with callees) | bytecode | highest tier | made: Maglev / TurboFan / OSR | first TurboFan at | deopts in the log | top reasons |');
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows.filter((r) => r.perFrame >= 0.25).slice(0, 50)) {
  const [name, file] = [r.k.slice(0, r.k.lastIndexOf(' ')), r.k.slice(r.k.lastIndexOf(' ') + 1)];
  out(`| ${name} | ${file} | ${f2(r.perFrame)} | ${r.bytecode ?? r.static ?? '-'} | ${tierName[r.top]} | ${r['+']} / ${r['*']} / ${r.o} | ${r.firstTf == null ? 'never' : r.firstTf.toFixed(0) + ' s'} | ${r.deopts} | ${r.why} |`);
}
const hot = rows.filter((r) => r.perFrame >= 0.25 && /index\.html|\/|\.js/.test(r.k) && !/three\./.test(r.k));
out();
out('## The game\'s own functions on the frame path that never reached TurboFan in the run');
out('| function | file | ms a frame | bytecode | % of the 61,440 limit | highest tier | Maglev code made | deopts |');
out('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of hot.filter((r) => !r['*'])) {
  const [name, file] = [r.k.slice(0, r.k.lastIndexOf(' ')), r.k.slice(r.k.lastIndexOf(' ') + 1)]; const len = r.bytecode ?? r.static;
  out(`| ${name} | ${file} | ${f2(r.perFrame)} | ${len ?? '-'} | ${len ? Math.round(len / 614.4) + ' %' : '-'} | ${tierName[r.top]} | ${r['+']} | ${r.deopts} |`);
}
out();
out('## Every function over 30,000 bytes of bytecode (the limit is 61,440): in the game\'s scripts, from V8');
out('| bytecode | function | file | hot? (ms a frame) |');
out('| --- | --- | --- | --- |');
const big = [];
for (const [file, v] of Object.entries(bc)) for (const f of v.top) if (f.len >= 30000 && f.name !== '(anonymous)') big.push({ ...f, file });
big.sort((a, b) => b.len - a.len);
for (const f of big) out(`| ${f.len} | ${f.name} | ${f.file} | ${totalMs.has(`${f.name} ${path.basename(f.file)}`) ? f2(totalMs.get(`${f.name} ${path.basename(f.file)}`) / frames) : 'not in the profile'} |`);
fs.writeFileSync(path.join(dir, 'tiers-tables.md'), lines.join('\n') + '\n', 'utf8');
