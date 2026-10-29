import fs from 'fs';
// patch14 (GB-245 part 2, Claude's ruling (a), 2026-10-29): the rifles' support hand into view at the magwell. The base lift kept
// the gun at the frame's left edge, so the well (and the palm on the magazine's foot) sat below and left of it. Per gun, the reload
// carries the gun in toward the middle (side), and dips its muzzle a little (tip), which brings the well up to him.
// Measured per hand (rfocus2d, qa/2026-10-29-GB-245 seat3/seat4/seat5/seat6).
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) throw new Error('BOM at start');
const crIn = s.split('\r\n').length - 1;
const before = Buffer.byteLength(s, 'utf8');
function rep(a, b, label) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(label + ': expected 1, found ' + n);
  s = s.replace(a, () => b);
  console.log('ok ' + label);
}
rep(
  "    const FP_RELOAD_LIFT_GUN = { aa12: { up: 0.06, cant: 0.6 }, launcher: { up: 0.06, cant: 0.6 }, uzi: { up: 0.19, tip: -0.6 } };",
  "    // GB-245 part 2 (Claude's ruling (a)): at the base lift the rifles sat at the frame's left edge with the magwell below it, so the\n" +
  "    // support hand read 0 px from u0.10 to u0.70, the seat included. side carries the gun in toward the middle and tip dips the muzzle,\n" +
  "    // which brings the well up: m4 R 30-44k all reload, L 9-45k except u0.22-0.40 (the pouch trip); ak R 18-28k, L 23-46k except\n" +
  "    // u0.22-0.40 (seat3 row g2, seat4 row g3). The aa12's drum hides the palm under it at any framing that keeps the firing hand\n" +
  "    // (seat5, seat6): it takes the row with the strongest firing hand, R 10-24k, its palm a sliver at the seat (0.7-3.7k).\n" +
  "    const FP_RELOAD_LIFT_GUN = { m4: { up: 0.10, side: 0.10, tip: -0.25 }, ak: { up: 0.08, side: 0.12, tip: -0.30 },\n" +
  "      aa12: { up: 0.12, side: 0.12, tip: -0.25 }, launcher: { up: 0.06, cant: 0.6 }, uzi: { up: 0.19, tip: -0.6 } };",
  'rifle entries');
if (/^\uFEFF/.test(s)) throw new Error('BOM written');
if (s.split('\r\n').length - 1 !== crIn) throw new Error('CRLF count changed');
fs.writeFileSync(p, s, 'utf8');
console.log('written ' + before + ' -> ' + Buffer.byteLength(s, 'utf8'));