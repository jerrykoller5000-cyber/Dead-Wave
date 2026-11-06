const fs = require('fs');
function edit(f, pairs) {
  let s = fs.readFileSync(f, 'utf8');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(f + ' anchor x' + n + ': ' + JSON.stringify(a).slice(0, 80));
    s = s.replace(a, b);
  }
  fs.writeFileSync(f, s);
  console.log('ok', f);
}
// Add ring to SIGHT.uzi (Claude 2026-11-02 approved)
edit('game/sight-points.js', [[
  "uzi:      { kind: 'iron',  pos: [0, 0.126, -0.25], fwd: [0, 0, 1] },                // GB-259: through the rear aperture's centre (.126 @ -0.08) to the post tip (.126 @ 0.198); GB-228 had .156, over the ears",
  "uzi:      { kind: 'iron',  pos: [0, 0.126, -0.25], fwd: [0, 0, 1], ring: [-0.08, 0.126] }, // GB-259: through the rear aperture's centre (.126 @ -0.08) to the post tip (.126 @ 0.198); GB-228 had .156, over the ears"
]]);
// Insert ring-sight check before top-line in t277 (after notch/tip block, before optic)
edit('tools/tests/t277.js', [[
  "      // GB-259 (Claude 2026-11-02): for kind 'optic' the eye sits on the scope's axis within 3 mm; the top-line rule is left out for optics.\n",
  "      // GB-259 (Claude 2026-11-02): aperture / ring sights — eye within 3 mm of the ring centre; nothing on the centre line inside the hole blocks it.\n" +
  "      if (s.ring) {\n" +
  "        const near = (z, dz, hx) => pts.filter((q) => Math.abs(q.z - z) < dz && Math.abs(q.x - mz.x) < hx);\n" +
  "        const hole = near(s.ring[0], 0.02, 0.003).some((q) => q.y > s.ring[1] - 0.003 && q.y < s.ring[1] + 0.003);\n" +
  "        ok(Math.abs(p.y - s.ring[1]) <= 0.003 && !hole, k + ': eye on the ring centre within 3 mm' + (hole ? ' (blocked)' : '') + ' (eye y ' + p.y.toFixed(4) + ', ring ' + s.ring[1].toFixed(4) + ')');\n" +
  "        continue;\n" +
  "      }\n" +
  "      // GB-259 (Claude 2026-11-02): for kind 'optic' the eye sits on the scope's axis within 3 mm; the top-line rule is left out for optics.\n"
]]);
console.log('uzi ring rule landed');
