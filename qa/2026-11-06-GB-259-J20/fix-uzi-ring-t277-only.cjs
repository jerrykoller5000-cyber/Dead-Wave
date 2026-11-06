const fs = require('fs');
const f = 'tools/tests/t277.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('if (s.ring)')) { console.log('already has ring check'); process.exit(0); }
const a = "      // GB-259 (Claude 2026-11-02): for kind 'optic' the eye sits on the scope's axis within 3 mm; the top-line rule is left out for optics.\n";
const b =
  "      // GB-259 (Claude 2026-11-02): aperture / ring sights — eye within 3 mm of the ring centre; nothing on the centre line inside the hole blocks it.\n" +
  "      if (s.ring) {\n" +
  "        const near = (z, dz, hx) => pts.filter((q) => Math.abs(q.z - z) < dz && Math.abs(q.x - mz.x) < hx);\n" +
  "        const hole = near(s.ring[0], 0.02, 0.003).some((q) => q.y > s.ring[1] - 0.003 && q.y < s.ring[1] + 0.003);\n" +
  "        ok(Math.abs(p.y - s.ring[1]) <= 0.003 && !hole, k + ': eye on the ring centre within 3 mm' + (hole ? ' (blocked)' : '') + ' (eye y ' + p.y.toFixed(4) + ', ring ' + s.ring[1].toFixed(4) + ')');\n" +
  "        continue;\n" +
  "      }\n" +
  "      // GB-259 (Claude 2026-11-02): for kind 'optic' the eye sits on the scope's axis within 3 mm; the top-line rule is left out for optics.\n";
const n = s.split(a).length - 1;
if (n !== 1) throw new Error('t277 optic comment anchor x' + n);
s = s.replace(a, b);
const tmp = f + '.tmp';
fs.writeFileSync(tmp, s);
try { fs.unlinkSync(f); } catch (_) {}
fs.renameSync(tmp, f);
console.log('uzi ring check inserted via rename');
