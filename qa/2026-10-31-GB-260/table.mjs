import fs from 'node:fs';
const rd = (f) => JSON.parse(fs.readFileSync('qa/2026-10-31-GB-260/' + f, 'utf8'));
const norm = (r) => r.magMM ? { gun: r.gun, ext: r.ext, across: r.magMM.across, long: r.magMM.long, deep: r.magMM.deep, protrude: r.protrudeMM }
  : { gun: r.gun, ext: r.ext, across: r.mag.acrossMM, long: r.mag.longMM, deep: r.mag.deepMM, protrude: r.protrudeMM };
const B = rd('before.json').mags.map(norm), A = rd('final.json').mags.map(norm);
const get = (L, g, e) => L.find((r) => r.gun === g && r.ext === e);
for (const g of ['pistol', 'uzi', 'm4', 'ak', 'sniper', 'aa12']) for (const e of [false, true]) {
  const b = get(B, g, e), a = get(A, g, e);
  if (!b || !a) { console.log(g + (e ? ' ext' : ' std') + ' | MISSING'); continue; }
  console.log(g + (e ? ' ext' : ' std') + ' | across ' + b.across + ' -> ' + a.across + ' | long ' + b.long + ' -> ' + a.long + ' | deep ' + b.deep + ' -> ' + a.deep + ' | protrude ' + b.protrude + ' -> ' + a.protrude);
}
