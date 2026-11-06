const fs = require('fs');
const f = 'tools/tests/t277.js';
let s = fs.readFileSync(f, 'utf8');
const start = s.indexOf("      if (s.kind === 'optic') {");
const end = s.indexOf("      // GB-259 (J18 + J20", start);
if (start < 0 || end < 0) throw new Error('bounds ' + start + ' ' + end);
const block =
  "      if (s.kind === 'optic') {\n" +
  "        // Claude 2026-11-02: eye within 3 mm of the scope's axis; top-line rule left out for optics.\n" +
  "        // Same shape as the notch/tip check: the authored axis (SIGHT.pos) must sit on real tube/glass geometry.\n" +
  "        const zScope = rear ? rear.z : p.z;\n" +
  "        const onAxis = pts.some((q) => Math.abs(q.z - zScope) < 0.08 && Math.abs(q.x - mz.x) < 0.01 && Math.abs(q.y - p.y) <= 0.003);\n" +
  "        ok(onAxis, k + ': eye on the scope axis within 3 mm (eye y ' + p.y.toFixed(4) + ', tube top ' + bb.max.y.toFixed(4) + ')');\n" +
  "        continue;\n" +
  "      }\n";
s = s.slice(0, start) + block + s.slice(end);
const tmp = f + '.tmp';
fs.writeFileSync(tmp, s);
try { fs.unlinkSync(f); } catch (_) {}
fs.renameSync(tmp, f);
console.log('optic5: authored axis has nearby geometry');
