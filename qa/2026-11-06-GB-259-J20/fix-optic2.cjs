const fs = require('fs');
const f = 'tools/tests/t277.js';
let s = fs.readFileSync(f, 'utf8');
const a =
  "        // Tube wall near the ocular: verts above the bore, so the mid-y is the scope axis (not the whole receiver).\n" +
  "        const nearOcular = pts.filter((q) => Math.abs(q.z - p.z) < 0.10 && Math.abs(q.x - mz.x) < 0.05 && q.y > mz.y + 0.04);\n";
const b =
  "        // Tube band near the ocular: verts in the top ~14 cm of the gun (scope OD), so mid-y is the tube axis.\n" +
  "        const nearOcular = pts.filter((q) => Math.abs(q.z - p.z) < 0.10 && Math.abs(q.x - mz.x) < 0.05 && q.y > bb.max.y - 0.14);\n";
const n = s.split(a).length - 1;
if (n !== 1) throw new Error('optic2 anchor x' + n + ' snippet=' + JSON.stringify(s.slice(s.indexOf('nearOcular')-80, s.indexOf('nearOcular')+200)));
s = s.replace(a, b);
const tmp = f + '.tmp';
fs.writeFileSync(tmp, s);
try { fs.unlinkSync(f); } catch (_) {}
fs.renameSync(tmp, f);
console.log('optic tube-band filter applied');
