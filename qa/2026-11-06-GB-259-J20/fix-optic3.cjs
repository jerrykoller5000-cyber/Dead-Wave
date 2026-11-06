const fs = require('fs');
const f = 'tools/tests/t277.js';
let s = fs.readFileSync(f, 'utf8');
const start = s.indexOf("      if (s.kind === 'optic') {");
const end = s.indexOf("      // GB-259 (J18 + J20", start);
if (start < 0 || end < 0) throw new Error('optic block bounds ' + start + ' ' + end);
const block =
  "      if (s.kind === 'optic') {\n" +
  "        // Measure the tube at its rear (rearTop z), not at the eye-relief point behind the stock.\n" +
  "        const zScope = rear ? rear.z : p.z;\n" +
  "        const nearOcular = pts.filter((q) => Math.abs(q.z - zScope) < 0.05 && Math.abs(q.x - mz.x) < 0.04 && q.y > bb.max.y - 0.12);\n" +
  "        const yLo = nearOcular.reduce((m, q) => Math.min(m, q.y), Infinity);\n" +
  "        const yHi = nearOcular.reduce((m, q) => Math.max(m, q.y), -Infinity);\n" +
  "        const axisY = (yLo + yHi) / 2;\n" +
  "        ok(nearOcular.length > 0 && Math.abs(p.y - axisY) <= 0.003, k + ': eye on the scope axis within 3 mm (eye y ' + p.y.toFixed(4) + ', axis ' + axisY.toFixed(4) + ')');\n" +
  "        continue;\n" +
  "      }\n";
s = s.slice(0, start) + block + s.slice(end);
const tmp = f + '.tmp';
fs.writeFileSync(tmp, s);
try { fs.unlinkSync(f); } catch (_) {}
fs.renameSync(tmp, f);
console.log('optic3: measure at rearTop z');
