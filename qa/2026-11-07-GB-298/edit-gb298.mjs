// qa/2026-11-07-GB-298/edit-gb298.mjs — exact replacements for GB-298 (preserve newlines, no BOM)
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

// GB-298 / J15: in first person the beam leaves the view gun's muzzle along the view gun's
// bore (sway + kick), not toward the aim point. Body gun still hosts the mesh (CL-281).
t = mustReplace(t,
`          // CL-281: in first person with the view gun the beam leaves the view gun's muzzle (where the eye sees it) for
          // the aim point; his own gun, out of the eye's pass, still holds the beam's mesh.
          const vmLaser = !!viewmodel && viewmodel.showing(name) && !!viewmodel.muzzleWorld(_laserOrigin, offhand ? 2 : 1);   // CL-301: the pair's left beam from the left view gun
          if (!vmLaser) { _laserOrigin.set(mz.x, mz.y, mz.z); gun.localToWorld(_laserOrigin); }
          weaponAimPoint(_laserAim);
          const reach = _laserAim.distanceTo(_laserOrigin);
          if (reach < 0.05) { laser.visible = false; continue; }
          if (vmLaser) {
            _laserDir.subVectors(_laserAim, _laserOrigin).normalize();
            _laserLocal.copy(_laserDir).transformDirection(_vmLaserInv.copy(gun.matrixWorld).invert());
          } else {
            _laserLocal.set(0, 0, mz.z >= 0 ? 1 : -1);
            _laserDir.copy(_laserLocal).transformDirection(gun.matrixWorld);
          }`,
`          // CL-281 / GB-298 (J15): in first person the beam leaves the view gun's muzzle along the view
          // gun's bore (its sway and kick), not from the eye, the body's gun, or toward the aim point.
          // His own gun, out of the eye's pass, still holds the beam's mesh.
          const vmWhich = offhand ? 2 : 1;
          const vmLaser = !!viewmodel && viewmodel.showing(name) && !!viewmodel.muzzleWorld(_laserOrigin, vmWhich);   // CL-301: the pair's left beam from the left view gun
          if (!vmLaser) { _laserOrigin.set(mz.x, mz.y, mz.z); gun.localToWorld(_laserOrigin); }
          weaponAimPoint(_laserAim);
          const reach = _laserAim.distanceTo(_laserOrigin);
          if (reach < 0.05) { laser.visible = false; continue; }
          if (vmLaser) {
            const gVm = vmWhich === 2 ? viewmodel.gun2 : viewmodel.gun;
            const mzV = gVm.src.userData.muzzleLocal;
            const sgn = mzV.z >= 0 ? 1 : -1;
            // Ahead of the muzzle along the bore, projected the same way as muzzleWorld.
            viewmodel.viewPoint(_vmLaserAt.set(mzV.x, mzV.y, mzV.z + sgn), _vmLaserAt, vmWhich);
            const kFov = Math.tan((camera.fov || 60) * Math.PI / 360) / Math.tan(viewmodel.proj.fov * Math.PI / 360);
            const mx = viewmodel.space.scale.x;
            _vmLaserAt.x *= kFov * mx; _vmLaserAt.y *= kFov;
            camera.updateMatrixWorld(true);
            _vmLaserAt.applyMatrix4(camera.matrixWorld);
            _laserDir.subVectors(_vmLaserAt, _laserOrigin);
            if (_laserDir.lengthSq() < 1e-10) _laserDir.set(0, 0, -1); else _laserDir.normalize();
            _laserLocal.copy(_laserDir).transformDirection(_vmLaserInv.copy(gun.matrixWorld).invert());
          } else {
            _laserLocal.set(0, 0, mz.z >= 0 ? 1 : -1);
            _laserDir.copy(_laserLocal).transformDirection(gun.matrixWorld);
          }`,
  'updateLasers FP bore');

const out = Buffer.from(t, 'utf8');
if (out[0] === 0xEF) throw new Error('wrote BOM');
fs.writeFileSync(file, out);
console.log('GB-298 edit applied; bytes', out.length, 'nl', nl === '\r\n' ? 'CRLF' : 'LF');