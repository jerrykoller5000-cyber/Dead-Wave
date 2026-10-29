import fs from 'fs';
// patch11 (GB-245, the uzi): the hip path's reload lift reads a torso-space side/up/fwd, so a gun with no sh block can
// carry a reload-only offset of its own. Undefined reads add nothing: every other gun moves exactly as before.
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

// 1. the shared scratch object gets the new key, and fpReloadSet clears it every call (a per-gun fwd must not leak
//    to the next gun in hand).
rep(
  "    const _fpRlOut = { up: 0, in: 0, side: 0, tip: 0, turn: 0, cant: 0, hip: 0 };",
  "    const _fpRlOut = { up: 0, in: 0, side: 0, fwd: 0, tip: 0, turn: 0, cant: 0, hip: 0 };",
  '_fpRlOut key');
rep(
  "      o.up = b.up; o.in = b.in; o.side = b.side; o.tip = b.tip; o.turn = b.turn; o.cant = b.cant; o.hip = b.hip;",
  "      o.up = b.up; o.in = b.in; o.side = b.side; o.fwd = b.fwd; o.tip = b.tip; o.turn = b.turn; o.cant = b.cant; o.hip = b.hip;   // fwd reset every call: a per-gun fwd must not leak to the next gun",
  'fpReloadSet fwd reset');

// 2. the hip path's lift: side/up/fwd in torso space (+x the gun side, +y up, +z forward)
rep(
  "        if (viewFirst && OTS.w > 0 && !aki && fpReloadLiftW > 0) { off.y += fpReloadSet().up * fpReloadLiftW; }   // GB-245: the reload lifts the hands into view (this path is in torso space, y is up)",
  "        // GB-245: the reload lifts the hands into view. This path is torso space (+x the gun side, +y up, +z forward), so a gun\n" +
  "        // that never takes the shoulder path (the uzi has no sh block) can carry a reload-only side/up/fwd of its own; an\n" +
  "        // undefined read adds nothing, so every gun without them moves exactly as it did before.\n" +
  "        if (viewFirst && OTS.w > 0 && !aki && fpReloadLiftW > 0) { const rl = fpReloadSet(), rw = fpReloadLiftW; off.x += (rl.side || 0) * rw; off.y += (rl.up || 0) * rw; off.z += (rl.fwd || 0) * rw; }",
  'hip path side/up/fwd');

if (/^\uFEFF/.test(s)) throw new Error('BOM written');
if (s.split('\r\n').length - 1 !== crIn) throw new Error('CRLF count changed');
fs.writeFileSync(p, s, 'utf8');
console.log('written ' + before + ' -> ' + Buffer.byteLength(s, 'utf8'));
