import fs from 'fs';
// patch10 = patch9 with the anchors matched to the live lines (their trailing comments) - GB-245
const p = 'index.html';
let s = fs.readFileSync(p, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) throw new Error('BOM at start');
const crIn = s.split('\r\n').length - 1;   // index.html already carries 3 CRLF lines (866, 28403, 31411); keep them as they are
const before = Buffer.byteLength(s, 'utf8');
function rep(a, b, label) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(label + ': expected 1, found ' + n);
  s = s.replace(a, () => b);
  console.log('ok ' + label);
}
const oldConst = "    const FP_RELOAD_LIFT = { up: 0.06, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 };   // GB-245 tuning doors: up/in (camera space), tip (muzzle down), turn (GB-233's tilt), cant (the roll), hip (the carry, off)   // GB-245: up his view (m), toward him (m), muzzle-down tip about the butt (rad), and how much of the reload's own tilt (GB-233)\n";
const i0 = s.indexOf(oldConst);
if (i0 < 0) throw new Error('constant line not found whole');
rep(oldConst,
  "    // GB-245: first-person reload framing. up/in/side move the gun in camera space (m), tip dips the muzzle (rad), turn is how much of\n" +
  "    // the reload's own mount tilt (GB-233's reloadMountOff.rx) first person keeps, cant how much of its roll, hip the carry (off).\n" +
  "    // turn 0 is the finding: that tilt is what dropped the firing hand out of frame (0 glove px mid-reload); with it off the glove holds\n" +
  "    // the grip the whole reload (per-hand px, qa/2026-10-29-GB-245 rfocus2-rfocus5). Third person keeps the tilt untouched.\n" +
  "    const FP_RELOAD_LIFT = { up: 0.02, in: 0.04, side: 0, tip: 0, turn: 0, cant: 0.4, hip: 0 };\n" +
  "    // The two that read only a sliver of glove at cant 0.4 (aa12 ~970 px, launcher ~1.2k) carry a little more lift and cant.\n" +
  "    const FP_RELOAD_LIFT_GUN = { aa12: { up: 0.06, cant: 0.6 }, launcher: { up: 0.06, cant: 0.6 } };\n" +
  "    const _fpRlOut = { up: 0, in: 0, side: 0, tip: 0, turn: 0, cant: 0, hip: 0 };\n" +
  "    function fpReloadSet() {   // GB-245: the live reload framing for the gun in hand\n" +
  "      const o = _fpRlOut, b = FP_RELOAD_LIFT, g = FP_RELOAD_LIFT_GUN[currentWeapon];\n" +
  "      o.up = b.up; o.in = b.in; o.side = b.side; o.tip = b.tip; o.turn = b.turn; o.cant = b.cant; o.hip = b.hip;\n" +
  "      if (g) for (const k in g) if (g[k] != null) o[k] = g[k];\n" +
  "      return o;\n" +
  "    }\n", 'constant + table');
rep("        const rw = fpReloadLiftW;\n        if (!_rlBasis.p) _rlBasis.p = new THREE.Vector3();\n        const e = camera.matrixWorld.elements;\n        P.x += (e[0] * FP_RELOAD_LIFT.side + e[4] * FP_RELOAD_LIFT.up + e[8] * FP_RELOAD_LIFT.in) * rw;\n        P.y += (e[5] * FP_RELOAD_LIFT.up + e[9] * FP_RELOAD_LIFT.in) * rw;\n        P.z += (e[2] * FP_RELOAD_LIFT.side + e[6] * FP_RELOAD_LIFT.up + e[10] * FP_RELOAD_LIFT.in) * rw;",
    "        const rw = fpReloadLiftW, rls = fpReloadSet();\n        if (!_rlBasis.p) _rlBasis.p = new THREE.Vector3();\n        const e = camera.matrixWorld.elements;\n        P.x += (e[0] * rls.side + e[4] * rls.up + e[8] * rls.in) * rw;\n        P.y += (e[5] * rls.up + e[9] * rls.in) * rw;\n        P.z += (e[2] * rls.side + e[6] * rls.up + e[10] * rls.in) * rw;", 'camera-space lift');
rep("      const rlT = viewFirst ? 1 + (FP_RELOAD_LIFT.turn - 1) * fpReloadLiftW : 1;", "      const _rls = fpReloadSet();\n      const rlT = viewFirst ? 1 + (_rls.turn - 1) * fpReloadLiftW : 1;", 'tilt');
rep("      const rlTip = viewFirst ? FP_RELOAD_LIFT.tip * fpReloadLiftW : 0;", "      const rlTip = viewFirst ? _rls.tip * fpReloadLiftW : 0;", 'tip');
rep("      const rlCant = viewFirst ? 1 + (FP_RELOAD_LIFT.cant - 1) * fpReloadLiftW : 1;", "      const rlCant = viewFirst ? 1 + (_rls.cant - 1) * fpReloadLiftW : 1;", 'cant');
rep("      const fpReloadHipW = viewFirst && reloading && FP_RELOAD_LIFT.hip ?", "      const fpReloadHipW = viewFirst && reloading && fpReloadSet().hip ?", 'hip weight');
rep("{ off.y += FP_RELOAD_LIFT.up * fpReloadLiftW; }", "{ off.y += fpReloadSet().up * fpReloadLiftW; }", 'hip lift');
rep("fpReloadLiftDbg: () => FP_RELOAD_LIFT,   /* GB-245 */", "fpReloadLiftDbg: () => FP_RELOAD_LIFT, fpReloadLiftGunDbg: () => FP_RELOAD_LIFT_GUN, fpReloadSetDbg: () => ({ ...fpReloadSet() }),   /* GB-245 */", 'tuning door');
if (/^\uFEFF/.test(s)) throw new Error('BOM written');
if (s.split('\r\n').length - 1 !== crIn) throw new Error('CRLF count changed');
fs.writeFileSync(p, s, 'utf8');
console.log('written ' + before + ' -> ' + Buffer.byteLength(s, 'utf8'));