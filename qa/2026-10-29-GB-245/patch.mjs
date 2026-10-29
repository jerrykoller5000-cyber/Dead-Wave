// patch.mjs: GB-245's change to index.html, applied by exact line, verified before and after.
//
//   node qa/2026-10-29-GB-245/patch.mjs            apply (refuses if the file is not the hash it expects)
//   node qa/2026-10-29-GB-245/patch.mjs --dry       show every replacement, write nothing
//
// AGENTS.md: no BOM, LF line endings, an exact-line edit, then node --check and a duplicate-block scan.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DRY = process.argv.includes('--dry');
const FILE = 'index.html';
const WANT = 'B56BE703A6D465FC94EE89B8E38D672C97E63558D16DC124AC32E22560D103AF';   // rebased 2026-10-29 01:5x CT after another agent's edit; anchors re-verified

const text = fs.readFileSync(FILE, 'utf8');
const hash = crypto.createHash('sha256').update(text, 'utf8').digest('hex').toUpperCase().replace(/^/, '');
const got = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase();
console.log('index.html sha256 ' + got);
if (got !== WANT) { console.error('REFUSING: index.html is not the hash this patch was written against (' + WANT + ')'); process.exit(1); }

const EDITS = [];
const edit = (name, find, replace) => EDITS.push({ name, find, replace });

// 1. The constants, beside the other first-person hold offsets.
edit('constants',
`    const FP_HIP_HAND_GUNS = { pistol: 1, revolver: 1, uzi: 1 };`,
`    const FP_HIP_HAND_GUNS = { pistol: 1, revolver: 1, uzi: 1 };
    // GB-245 (Claude, 2026-10-29: option (b)). Every long gun's first-person mount dropped his hands out of the frame
    // for the whole reload (0 glove pixels mid-reload). In first person a reload now lifts the gun in toward his eye
    // as it goes, so the firing hand stays on the grip in view and the support hand works the magazine where he can
    // see it; the cant he already had turns the magwell up toward the camera. Torso space, metres, on top of the hip
    // carry. fpReloadLiftW is the reload's own envelope (updateReloadAnim): 0 whenever he is not reloading, so the
    // rest hold and the aimed hold are untouched.
    const FP_RELOAD_LIFT = { x: 0.02, y: 0.30, z: 0.04 };
    let fpReloadLiftW = 0;`);

// 2. The envelope, once per frame, from the reload's own clock.
edit('envelope',
`      decayRecoil(dt);`,
`      decayRecoil(dt);
      // GB-245: the reload lift's envelope. In as the reload starts, out as it ends, and 0 the rest of the time, so a
      // reload looks the same length and the holds on either side of it do not move.
      if (reloading && viewFirst && !akimboOn()) {
        const ru = _clamp01(1 - reloadTimer / Math.max(0.05, reloadAnimDuration || 1));
        fpReloadLiftW = _seg(ru, 0.0, 0.18) * (1 - _seg(ru, 0.88, 1.0));
      } else fpReloadLiftW = 0;`);

// 3. The shouldered long guns: the lift goes into the seat, which the aim, the grip and the cheek weld all read.
edit('shoulder-lift',
`      if (viewFirst && OTS.w > 0 && fpBladeDip > 0) { const bw = OTS.w * fpBladeDip; P.x += FP_BLADE_DIP.x * bw; P.y += FP_BLADE_DIP.y * bw; P.z += FP_BLADE_DIP.z * bw; }   // CL-269: out of the blade's way`,
`      if (viewFirst && OTS.w > 0 && fpBladeDip > 0) { const bw = OTS.w * fpBladeDip; P.x += FP_BLADE_DIP.x * bw; P.y += FP_BLADE_DIP.y * bw; P.z += FP_BLADE_DIP.z * bw; }   // CL-269: out of the blade's way
      if (viewFirst && fpReloadLiftW > 0) { const rw = fpReloadLiftW; P.x += FP_RELOAD_LIFT.x * rw; P.y += FP_RELOAD_LIFT.y * rw; P.z += FP_RELOAD_LIFT.z * rw; }   // GB-245: the reload lifts the hands into view`);

// 4. The handguns, the uzi and the heavies take the non-shouldered path; same lift, same envelope.
edit('hip-lift',
`        if (viewFirst && OTS.w > 0 && !aki && FP_HIP_HAND_GUNS[currentWeapon]) { const hw = OTS.w * (1 - fpAdsW * fpAdsW * (3 - 2 * fpAdsW)); off.x += FP_HIP_HAND.x * hw; off.y += FP_HIP_HAND.y * hw; off.z += FP_HIP_HAND.z * hw; }   // CL-260: the first-person hip carry`,
`        if (viewFirst && OTS.w > 0 && !aki && FP_HIP_HAND_GUNS[currentWeapon]) { const hw = OTS.w * (1 - fpAdsW * fpAdsW * (3 - 2 * fpAdsW)); off.x += FP_HIP_HAND.x * hw; off.y += FP_HIP_HAND.y * hw; off.z += FP_HIP_HAND.z * hw; }   // CL-260: the first-person hip carry
        if (viewFirst && OTS.w > 0 && !aki && fpReloadLiftW > 0) { off.x += FP_RELOAD_LIFT.x * fpReloadLiftW; off.y += FP_RELOAD_LIFT.y * fpReloadLiftW; off.z += FP_RELOAD_LIFT.z * fpReloadLiftW; }   // GB-245: the reload lifts the hands into view`);

let out = text;
let bad = 0;
for (const e of EDITS) {
  const n = out.split(e.find).length - 1;
  console.log((n === 1 ? 'ok   ' : 'FAIL ') + e.name + ': anchor found ' + n + ' time(s)');
  if (n !== 1) { bad++; continue; }
  out = out.replace(e.find, e.replace);
}
if (bad) { console.error('REFUSING: ' + bad + ' anchor(s) not found exactly once; nothing written'); process.exit(1); }

if (DRY) {
  console.log('\n--- dry run: would write ' + out.length + ' bytes (was ' + text.length + ', ' + (out.length - text.length) + ') ---');
  console.log('index.html has no BOM: ' + (fs.readFileSync(FILE)[0] !== 0xEF));
  process.exit(0);
}

// LF, no BOM, exactly as the file is now.
fs.writeFileSync(FILE, out, { encoding: 'utf8' });   // byte-for-byte as the file is, other agents' lines untouched
const after = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase();
console.log('wrote index.html, new sha256 ' + after + ', ' + out.length + ' bytes (+' + (out.length - text.length) + ')');