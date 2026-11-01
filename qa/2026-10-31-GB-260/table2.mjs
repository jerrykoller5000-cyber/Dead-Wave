import fs from 'node:fs';
const rd = (f) => JSON.parse(fs.readFileSync('qa/2026-10-31-GB-260/' + f, 'utf8'));
const F = rd('final.json'), A = rd('final.json').mags;
const fT = {}; for (const r of F.mags) if (!(r.gun in fT)) fT[r.gun] = r.fTable;
// before.json (probe.mjs) prints builder mm and the WORLD factor; the table convention is builder x fTable.
const B = rd('before.json').mags;
const get = (L, g, e) => L.find((r) => r.gun === g && r.ext === e);
const n = (x) => +x.toFixed(1);
for (const g of ['pistol', 'uzi', 'm4', 'ak', 'sniper', 'aa12']) for (const e of [false, true]) {
  const b = get(B, g, e), a = get(A, g, e);
  if (!b || !a) { console.log(g + ' MISSING'); continue; }
  const bt = { across: n(b.mag.acrossB * fT[g]), long: n(b.mag.longB * fT[g]), deep: n(b.mag.deepB * fT[g]), protrude: n(b.protrudeB * fT[g]) };
  console.log([g + (e ? ' ext' : ' std'), fT[g], bt.across + ' -> ' + a.magMM.across, bt.long + ' -> ' + a.magMM.long, bt.deep + ' -> ' + a.magMM.deep, bt.protrude + ' -> ' + a.protrudeMM].join(' | '));
}
