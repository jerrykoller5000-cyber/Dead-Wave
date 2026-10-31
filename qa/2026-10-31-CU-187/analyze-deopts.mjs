// CU-187: V8's deoptimization events (--log-deopt) of a night-20 run, tallied by function and reason. index.html's functions are found
// in the script source V8 logged (the exact text that ran), by the position of each deopt; other files are listed by position.
//   node qa/2026-10-31-CU-187/analyze-deopts.mjs <v8 log>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const logFile = process.argv[2];
const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };
const text = fs.readFileSync(logFile, 'utf8').split('\n');

// the logged source of index.html (an escaped string in a script-source line), and where its first line sits in the document
let src = null, srcUrl = null;
for (const l of text) {
  if (!l.startsWith('script-source,')) continue;
  const m = /^script-source,(\d+),([^,]*index\.html[^,]*),(.*)$/.exec(l);
  if (m && (!src || m[3].length > src.length)) { srcUrl = m[2]; src = m[3]; }
}
const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t').replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\\\/g, '\\');
const L = src ? unesc(src).split('\n') : [];
// the document line of the script's first line: updateZombies is created at <line>:<col> in the log
let offset = 0;
{
  const uz = text.find((l) => /^code-creation,JS,\d+,\d+,0x[0-9a-f]+,\d+,updateZombies \S*index\.html/.test(l));
  const m = uz && /updateZombies \S*?index\.html\S*?:(\d+):(\d+),/.exec(uz);
  const at = L.findIndex((l) => /^    function updateZombies\(/.test(l));
  if (m && at >= 0) offset = +m[1] - (at + 1);
}
// top-level functions of the script: [first line, last line] in the document's numbering
const fns = [];
for (let i = 0; i < L.length; i++) {
  const m = /^    (?:async )?function ([A-Za-z0-9_$]+)\(/.exec(L[i]);
  if (!m) continue;
  let e = i;
  if (!/\}\s*$/.test(L[i]) || !/^    (?:async )?function .*\{.*\}\s*$/.test(L[i])) { e = i + 1; while (e < L.length && !/^    \}\s*$/.test(L[e])) e++; }
  fns.push({ name: m[1], a: i + 1 + offset, b: e + 1 + offset });
}
out(`index.html as served: ${L.length} script lines, document offset ${offset}, ${fns.length} top-level functions found`);
const fnAt = (line) => { let best = null; for (const f of fns) if (line >= f.a && line <= f.b && (!best || f.a > best.a)) best = f; return best ? best.name : '(top level or nested)'; };

// WINDOW_S (default 35): only the deopts of the last seconds of the run, the measured fight, not the world's build at load
const WINDOW_S = Number(process.env.WINDOW_S) || 35;
let tEnd = 0; for (const l of text) { if (l.startsWith('code-deopt,') || l.startsWith('code-creation,')) { const us = Number(l.split(',')[l.startsWith('code-deopt') ? 1 : 3]); if (us > tEnd) tEnd = us; } }
const tFrom = tEnd - WINDOW_S * 1e6;
const byFn = new Map(), byPos = new Map(), reasonsAll = new Map(), kinds = new Map();
let total = 0;
for (const l of text) {
  if (!l.startsWith('code-deopt,')) continue;
  // code-deopt,<us>,<size>,<addr>,<inlining>,<script offset>,<kind>,<position>,<reason>
  const p = l.split(',');
  if (Number(p[1]) < tFrom) continue;
  const kind = p[6], pos = p[7], reason = p.slice(8).join(',');
  total++;
  kinds.set(kind, (kinds.get(kind) || 0) + 1);
  reasonsAll.set(reason, (reasonsAll.get(reason) || 0) + 1);
  const m = /^<(.*?):(\d+):(\d+)>$/.exec(pos);
  if (!m) continue;
  const file = m[1].split('?')[0].split('/').pop(), line = +m[2];
  const name = /index\.html$/.test(file) ? fnAt(line) : '';
  const key = name ? `${name} (index.html)` : `${file}:${line}:${m[3]}`;
  const e = byFn.get(key) || { n: 0, reasons: new Map(), kinds: new Map(), lines: new Set() };
  e.n++; e.reasons.set(reason, (e.reasons.get(reason) || 0) + 1); e.kinds.set(kind, (e.kinds.get(kind) || 0) + 1); e.lines.add(line);
  byFn.set(key, e);
}
out(`${total} deoptimizations in the last ${WINDOW_S} s of the run (the log ends at ${(tEnd / 1e6).toFixed(1)} s).`);
out();
out('## By kind and by reason');
out('| kind | count |'); out('| --- | --- |');
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) out(`| ${k} | ${n} |`);
out(); out('| reason | count |'); out('| --- | --- |');
for (const [k, n] of [...reasonsAll].sort((a, b) => b[1] - a[1]).slice(0, 12)) out(`| ${k} | ${n} |`);
out();
out('## By function (index.html) or by position (other files): the most deoptimized');
out('| function or position | deopts | kinds | top reasons | distinct lines |');
out('| --- | --- | --- | --- | --- |');
const fmtMap = (m, n = 3) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join('; ');
for (const [k, e] of [...byFn].sort((a, b) => b[1].n - a[1].n).slice(0, 30)) out(`| ${k} | ${e.n} | ${fmtMap(e.kinds, 3)} | ${fmtMap(e.reasons, 3)} | ${e.lines.size} |`);
fs.writeFileSync(path.join(dir, 'deopt-tables.md'), lines.join('\n') + '\n', 'utf8');
