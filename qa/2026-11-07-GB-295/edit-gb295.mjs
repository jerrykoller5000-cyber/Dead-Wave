// qa/2026-11-07-GB-295/edit-gb295.mjs — exact replacements for GB-295 (preserve file newlines, no BOM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(ROOT, 'index.html');
const before = fs.readFileSync(file);
if (before[0] === 0xEF) throw new Error('BOM present index.html');
let t = before.toString('utf8');
const nl = t.includes('\r\n') ? '\r\n' : '\n';
const N = (s) => s.replace(/\n/g, nl);

function mustReplace(src, from, to, label) {
  from = N(from); to = N(to);
  if (!src.includes(from)) throw new Error('missing block: ' + label);
  const once = src.split(from);
  if (once.length !== 2) throw new Error('not unique (' + (once.length - 1) + '): ' + label);
  return once[0] + to + once[1];
}

// GB-295 / J10: hip fire (and ADS) in first person — tracer and shot leave the view gun's muzzle,
// as the laser (CL-281) and flamer already do. Falls back to the body gun when the viewmodel is
// not up (raise) or third person.
t = mustReplace(t,
`    function getMuzzleWorld() {
      const gun = firingGun();
      gun.updateMatrixWorld(true);
      muzzleWorld.copy(gun.userData.muzzleLocal);
      gun.localToWorld(muzzleWorld);
      return muzzleWorld;
    }`,
`    function getMuzzleWorld() {
      // GB-295 (J10/D-118): in first person the tracer and the shot start at the view gun's muzzle
      // (its muzzle point, as the sights and the laser use), not the third-person gun or the eye.
      // Akimbo: which matches firingGun / the laser's offhand (1 = right, 2 = left).
      if (viewmodel && viewFirst && viewmodel.showing(currentWeapon)) {
        const which = (akimboOn() && akimboHand === 1) ? 2 : 1;
        if (viewmodel.muzzleWorld(muzzleWorld, which)) return muzzleWorld;
      }
      const gun = firingGun();
      gun.updateMatrixWorld(true);
      muzzleWorld.copy(gun.userData.muzzleLocal);
      gun.localToWorld(muzzleWorld);
      return muzzleWorld;
    }`,
  'getMuzzleWorld FP view muzzle');

const out = Buffer.from(t, 'utf8');
if (out[0] === 0xEF) throw new Error('wrote BOM');
fs.writeFileSync(file, out);
console.log('GB-295 edit applied; bytes', out.length, 'nl', nl === '\r\n' ? 'CRLF' : 'LF');
