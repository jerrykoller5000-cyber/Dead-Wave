import fs from 'fs';
// patch13 (GB-245, the uzi): land the tuned row. rfocus12 grid row g3 measured the strongest firing hand of every uzi
// sweep (40k px from u0.25 through u0.85, up from 0 in every frame before the offset existed). It needed the hip path to
// read side/up/fwd (patch11) and the reload's own tip (patch12); both are in and default to nothing, so no other gun moves.
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
  "    // The two that read only a sliver of glove at cant 0.4 (aa12 ~970 px, launcher ~1.2k) carry a little more lift and cant.\n" +
  "    const FP_RELOAD_LIFT_GUN = { aa12: { up: 0.06, cant: 0.6 }, launcher: { up: 0.06, cant: 0.6 } };",
  "    // The two that read only a sliver of glove at cant 0.4 (aa12 ~970 px, launcher ~1.2k) carry a little more lift and cant.\n" +
  "    // The uzi has no sh block (it rides the hip path), so the shoulder lift never reached it and it read 0 glove px in every\n" +
  "    // frame of every sweep, at rest included. It takes the hip path's own side/up/fwd and the reload's own tip instead: up 0.19\n" +
  "    // and tip -0.6 measured its strongest firing hand (40k px from u0.25 through u0.85, qa/2026-10-29-GB-245 rfocus12 row g3).\n" +
  "    const FP_RELOAD_LIFT_GUN = { aa12: { up: 0.06, cant: 0.6 }, launcher: { up: 0.06, cant: 0.6 }, uzi: { up: 0.19, tip: -0.6 } };",
  'uzi entry');
if (/^\uFEFF/.test(s)) throw new Error('BOM written');
if (s.split('\r\n').length - 1 !== crIn) throw new Error('CRLF count changed');
fs.writeFileSync(p, s, 'utf8');
console.log('written ' + before + ' -> ' + Buffer.byteLength(s, 'utf8'));
