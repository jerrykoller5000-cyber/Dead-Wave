// patch4.mjs: GB-245, the shape Claude's option (b) asks for. The handguns' first-person reload already reads well:
// their gun rides the hip carry, in front of him, and both gloves sit in the picture through it. The long guns ride
// the SHOULDER, whose reload only rolls the gun about the butt -- so the gun, and the firing hand that follows the
// grip, swing out of the frame. In first person a long gun's reload now holds forward on the carry the handguns use,
// rises a little and cants, so the firing hand stays on the grip in view and the support hand works the magazine
// where he can see it. `hip` is the door: 0 (or absent) leaves the old behaviour, 1 takes the carry.
import fs from 'node:fs';
import crypto from 'node:crypto';
const DRY = process.argv.includes('--dry');
const FILE = 'index.html';
const buf = fs.readFileSync(FILE);
const got = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
console.log('index.html sha256 ' + got + ', ' + buf.length + ' bytes');
const text = buf.toString('utf8');
const EDITS = [
 ['lift-const', `    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1 };`,
  `    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1, hip: 1 };`],
 ['gate', `      if (H.sh && !aki && !vault) holdShoulderGun(ud, gun, H, k);   // GB-129`,
  `      // GB-245: in first person a reload brings the gun forward off the shoulder onto the carry the handguns use, so
      // the grip, the magwell and both hands stay in his view; the shoulder itself is unchanged at rest and aimed.
      const fpReloadHipW = viewFirst && reloading && FP_RELOAD_LIFT.hip ? Math.min(1, fpReloadLiftW * 4) : 0;
      if (H.sh && !aki && !vault && fpReloadHipW < 0.5) holdShoulderGun(ud, gun, H, k);   // GB-129`],
];
let out = text, bad = 0;
for (const [n, a, b] of EDITS) { const c = out.split(a).length - 1; console.log((c === 1 ? 'ok   ' : 'FAIL ') + n + ' x' + c); if (c !== 1) { bad++; continue; } out = out.replace(a, () => b); }
if (bad) process.exit(1);
if (DRY) { console.log('dry +' + (Buffer.byteLength(out) - buf.length)); process.exit(0); }
const now = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase();
if (now !== got) { console.error('REFUSING: file changed while patching'); process.exit(1); }
fs.writeFileSync(FILE, out, 'utf8');
console.log('wrote, new sha256 ' + crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase() + ' ' + fs.statSync(FILE).size);