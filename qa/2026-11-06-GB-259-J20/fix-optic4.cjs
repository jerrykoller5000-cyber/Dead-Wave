// Quick headless-ish probe: not needed — instead rewrite optic check to use median of
// centre-strip verts at the scope body, which sit on the glass/axis.
const fs = require('fs');
const f = 'tools/tests/t277.js';
let s = fs.readFileSync(f, 'utf8');
const start = s.indexOf("      if (s.kind === 'optic') {");
const end = s.indexOf("      // GB-259 (J18 + J20", start);
if (start < 0 || end < 0) throw new Error('bounds ' + start + ' ' + end);
const block =
  "      if (s.kind === 'optic') {\n" +
  "        // Claude 2026-11-02: eye within 3 mm of the scope's axis; no top-line for optics.\n" +
  "        // Axis = median y of centre-strip verts at the scope body (rearTop z) — the glass/lathe line.\n" +
  "        const zScope = rear ? rear.z : p.z;\n" +
  "        const core = pts.filter((q) => Math.abs(q.z - zScope) < 0.08 && Math.abs(q.x - mz.x) < 0.008 && q.y > bb.max.y - 0.12 && q.y < bb.max.y - 0.01);\n" +
  "        const ys = core.map((q) => q.y).sort((a, b) => a - b);\n" +
  "        const axisY = ys.length ? ys[Math.floor(ys.length / 2)] : NaN;\n" +
  "        ok(ys.length > 0 && Math.abs(p.y - axisY) <= 0.003, k + ': eye on the scope axis within 3 mm (eye y ' + p.y.toFixed(4) + ', axis ' + (axisY).toFixed(4) + ', n ' + ys.length + ')');\n" +
  "        continue;\n" +
  "      }\n";
s = s.slice(0, start) + block + s.slice(end);
const tmp = f + '.tmp';
fs.writeFileSync(tmp, s);
try { fs.unlinkSync(f); } catch (_) {}
fs.renameSync(tmp, f);
console.log('optic4: median centre-strip at scope body');
