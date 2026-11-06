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

edit('game/sight-points.js', [[
  "aa12:     { kind: 'iron',  pos: [0, 0.1807, -0.25], fwd: [0, -0.0057, 1] },         // GB-228: on the line (was .183)",
  "aa12:     { kind: 'iron',  pos: [0, 0.1680, -0.25], fwd: [0, 0, 1] },                // GB-259 (J20): level through the carry handle's rear ring (centre .168 @ -0.12) to the front post tip (.168 @ 0.75); GB-228 had .1807 sloping, over the ring's top"
]]);

edit('tools/tests/tcl281.js', [[
  "['aa12', 'the Breacher', [0, 0.1807, -0.25], [0, -0.145, -0.166], true],",
  "['aa12', 'the Breacher', [0, 0.168, -0.25], [0, -0.145, -0.166], true],   // GB-259 (J20 / Claude 2026-11-03): rear through ring centre"
]]);

edit('tools/tests/t277.js', [[
  "      ok(s.kind === 'optic' || k === 'm4' ? p.y < bb.max.y && p.y > bb.max.y - 0.06 : p.y >= (rear ? rear.y : bb.max.y) - 0.005 && p.y <= bb.max.y + 0.08, k + ': eye clears the top line and stays near it (eye y ' + p.y.toFixed(3) + ', top ' + bb.max.y.toFixed(3) + ')');\n",
  "      // GB-259 (Claude 2026-11-02): for kind 'optic' the eye sits on the scope's axis within 3 mm; the top-line rule is left out for optics.\n" +
  "      if (s.kind === 'optic') {\n" +
  "        const nearOcular = pts.filter((q) => Math.abs(q.z - p.z) < 0.08 && Math.abs(q.x - mz.x) < 0.04);\n" +
  "        const yLo = nearOcular.reduce((m, q) => Math.min(m, q.y), Infinity);\n" +
  "        const yHi = nearOcular.reduce((m, q) => Math.max(m, q.y), -Infinity);\n" +
  "        const axisY = (yLo + yHi) / 2;\n" +
  "        ok(nearOcular.length > 0 && Math.abs(p.y - axisY) <= 0.003, k + ': eye on the scope axis within 3 mm (eye y ' + p.y.toFixed(4) + ', axis ' + axisY.toFixed(4) + ')');\n" +
  "        continue;\n" +
  "      }\n" +
  "      // GB-259 (J18 + J20 / Claude 2026-11-03): m4 holo, minigun reflex and Breacher ring — eye on the sight centre (below the hood/ring top, within 6 cm), not the iron top-line rule.\n" +
  "      ok(k === 'm4' || k === 'minigun' || k === 'aa12' ? p.y < bb.max.y && p.y > bb.max.y - 0.06 : p.y >= (rear ? rear.y : bb.max.y) - 0.005 && p.y <= bb.max.y + 0.08, k + ': eye clears the top line and stays near it (eye y ' + p.y.toFixed(3) + ', top ' + bb.max.y.toFixed(3) + ')');\n"
]]);

edit('tools/tests/t284.js', [[
  "  const RF = { pistol: [[0,.082,-.064],[0,.087,.282]], revolver: [[0,.114,-.05],[0,.121,.318]], uzi: [[0,.156,-.087],null],\n" +
  "    m4: [[0,.134,.0455],[0,.138,.673]], ak: [[0,.095,.218],[0,.097,.84]], aa12: [[0,.18,-.12],[0,.175,.75]], launcher: [[0,.123,.053],[0,.102,.65]] };",
  "  // GB-259 (Claude 2026-11-02/03): RF tracks game/sight-points.js — pistol ears .092, uzi aperture centre .126 + front .126@.198, aa12 ring .168 / post .168@.75.\n" +
  "  const RF = { pistol: [[0,.092,-.064],[0,.092,.282]], revolver: [[0,.114,-.05],[0,.121,.318]], uzi: [[0,.126,-.08],[0,.126,.198]],\n" +
  "    m4: [[0,.134,.0455],[0,.138,.673]], ak: [[0,.095,.218],[0,.097,.84]], aa12: [[0,.168,-.12],[0,.168,.75]], launcher: [[0,.123,.053],[0,.102,.65]] };"
]]);

console.log('all edits applied');
