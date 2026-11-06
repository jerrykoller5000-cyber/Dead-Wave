const fs = require('fs');
const f = 'tools/tests/t277.js';
let s = fs.readFileSync(f, 'utf8');
const a =
  "        const nearOcular = pts.filter((q) => Math.abs(q.z - p.z) < 0.08 && Math.abs(q.x - mz.x) < 0.04);\n" +
  "        const yLo = nearOcular.reduce((m, q) => Math.min(m, q.y), Infinity);\n" +
  "        const yHi = nearOcular.reduce((m, q) => Math.max(m, q.y), -Infinity);\n" +
  "        const axisY = (yLo + yHi) / 2;\n" +
  "        ok(nearOcular.length > 0 && Math.abs(p.y - axisY) <= 0.003, k + ': eye on the scope axis within 3 mm (eye y ' + p.y.toFixed(4) + ', axis ' + axisY.toFixed(4) + ')');";
const b =
  "        // Tube wall near the ocular: verts above the bore, so the mid-y is the scope axis (not the whole receiver).\n" +
  "        const nearOcular = pts.filter((q) => Math.abs(q.z - p.z) < 0.10 && Math.abs(q.x - mz.x) < 0.05 && q.y > mz.y + 0.04);\n" +
  "        const yLo = nearOcular.reduce((m, q) => Math.min(m, q.y), Infinity);\n" +
  "        const yHi = nearOcular.reduce((m, q) => Math.max(m, q.y), -Infinity);\n" +
  "        const axisY = (yLo + yHi) / 2;\n" +
  "        ok(nearOcular.length > 0 && Math.abs(p.y - axisY) <= 0.003, k + ': eye on the scope axis within 3 mm (eye y ' + p.y.toFixed(4) + ', axis ' + axisY.toFixed(4) + ')');";
const n = s.split(a).length - 1;
if (n !== 1) throw new Error('optic anchor x' + n);
s = s.replace(a, b);
fs.writeFileSync(f, s);
console.log('optic filter tightened');
