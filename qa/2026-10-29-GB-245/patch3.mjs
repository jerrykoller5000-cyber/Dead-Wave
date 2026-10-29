// patch3.mjs: GB-245's reload pose gets its real shape. A lift alone cannot do it: a gun lifted high enough to bring
// the AA12's grip into view has already gone out of the top of the frame. What brings a grip up to his eye is the gun
// tipping its muzzle down about the butt (the roll in toward the eye), with a modest lift under it. Both are here, in
// camera space (up / toward him) and in the gun's own frame (tip), so one set of numbers can serve every long gun.
import fs from 'node:fs';
import crypto from 'node:crypto';
const DRY = process.argv.includes('--dry');
const FILE = 'index.html';
const buf = fs.readFileSync(FILE);
const got = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
console.log('index.html sha256 ' + got + ', ' + buf.length + ' bytes');
const text = buf.toString('utf8');
const EDITS = [
 ['lift-const', `    const FP_RELOAD_LIFT = { x: 0.02, y: 0.30, z: 0.04, turn: 1 };`,
  `    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1 };   // GB-245: up his view (m), toward him (m), muzzle-down tip about the butt (rad), and how much of the reload's own tilt (GB-233)\n    const _rlBasis = { p: null };`],
 ['tip', `      const rlT = viewFirst ? 1 + (FP_RELOAD_LIFT.turn - 1) * fpReloadLiftW : 1;   // GB-245: first person keeps this much of the reload's tilt
      _hE.set(reloadMountOff.rx * rlT + recoilKick.rx, reloadMountOff.ry * rlT + recoilKick.ry, reloadMountOff.rz * rlT + recoilKick.rz);`,
  `      const rlT = viewFirst ? 1 + (FP_RELOAD_LIFT.turn - 1) * fpReloadLiftW : 1;   // GB-245: first person keeps this much of the reload's tilt
      const rlTip = viewFirst ? FP_RELOAD_LIFT.tip * fpReloadLiftW : 0;   // GB-245: the muzzle dips, which brings the grip and the magwell up to him
      _hE.set(reloadMountOff.rx * rlT + rlTip + recoilKick.rx, reloadMountOff.ry * rlT + recoilKick.ry, reloadMountOff.rz * rlT + recoilKick.rz);`],
 ['shoulder-cam', `      if (viewFirst && fpReloadLiftW > 0) { const rw = fpReloadLiftW; P.x += FP_RELOAD_LIFT.x * rw; P.y += FP_RELOAD_LIFT.y * rw; P.z += FP_RELOAD_LIFT.z * rw; }   // GB-245: the reload lifts the hands into view`,
  `      if (viewFirst && fpReloadLiftW > 0) {   // GB-245: the reload lifts the hold into his view, in camera space so it is the same raise for every gun
        const rw = fpReloadLiftW;
        if (!_rlBasis.p) _rlBasis.p = new THREE.Vector3();
        const e = camera.matrixWorld.elements;
        P.x += (e[4] * FP_RELOAD_LIFT.up + e[8] * FP_RELOAD_LIFT.in) * rw;
        P.y += (e[5] * FP_RELOAD_LIFT.up + e[9] * FP_RELOAD_LIFT.in) * rw;
        P.z += (e[6] * FP_RELOAD_LIFT.up + e[10] * FP_RELOAD_LIFT.in) * rw;
      }`],
 ['hip-cam', `        if (viewFirst && OTS.w > 0 && !aki && fpReloadLiftW > 0) { off.x += FP_RELOAD_LIFT.x * fpReloadLiftW; off.y += FP_RELOAD_LIFT.y * fpReloadLiftW; off.z += FP_RELOAD_LIFT.z * fpReloadLiftW; }   // GB-245: the reload lifts the hands into view`,
  `        if (viewFirst && OTS.w > 0 && !aki && fpReloadLiftW > 0) { off.y += FP_RELOAD_LIFT.up * fpReloadLiftW; }   // GB-245: the reload lifts the hands into view (this path is in torso space, y is up)`],
];
let out = text, bad = 0;
for (const [n, a, b] of EDITS) { const c = out.split(a).length - 1; console.log((c === 1 ? 'ok   ' : 'FAIL ') + n + ' x' + c); if (c !== 1) { bad++; continue; } out = out.replace(a, () => b); }
if (bad) process.exit(1);
if (DRY) { console.log('dry +' + (Buffer.byteLength(out) - buf.length)); process.exit(0); }
const now = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase();
if (now !== got) { console.error('REFUSING: file changed while patching'); process.exit(1); }
fs.writeFileSync(FILE, out, 'utf8');
console.log('wrote, new sha256 ' + crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase() + ' ' + fs.statSync(FILE).size);