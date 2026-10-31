import fs from 'node:fs';
const f = 'index.html'; let t = fs.readFileSync(f, 'utf8');
if (t.charCodeAt(0) === 0xFEFF) throw new Error('BOM'); const crlf = t.split('\r\n').length - 1;   // three were there before (lines 866, 28518, 31526): left as they are
const reps = [
 [`          const on = lasersEnabled && gearOwned.laser && active && !st.melee && gameStarted && !placeMode && !gameOver && !won && !reloading && !playerSwimming && !mortarMounted;\n`,
  `          // GB-257 (J9): the beam stays on through a reload; it rides the gun as the hands work the magazine.\n          const on = lasersEnabled && gearOwned.laser && active && !st.melee && gameStarted && !placeMode && !gameOver && !won && !playerSwimming && !mortarMounted;\n`],
 [`          // Same point the round is fired at. The cone leaves this muzzle and stops
          // on the first material along that line, so it meets the cursor.
          const mz = gun.userData.muzzleLocal;
          _laserOrigin.set(mz.x, mz.y, mz.z);
          gun.localToWorld(_laserOrigin);
          weaponAimPoint(_laserAim);
          _laserDir.subVectors(_laserAim, _laserOrigin);
          const reach = _laserDir.length();
          if (reach < 0.05) { laser.visible = false; continue; }
          _laserDir.multiplyScalar(1 / reach);
          const stop = laserStop(_laserOrigin, _laserDir, reach);
          const len = stop.len;
          _laserInv.copy(gun.matrixWorld).invert();
          _laserLocal.copy(_laserDir).transformDirection(_laserInv);
          if (_laserLocal.lengthSq() < 1e-8) _laserLocal.copy(_laserZ);
          else _laserLocal.normalize();
          laser.quaternion.setFromUnitVectors(_laserZ, _laserLocal);
`,
  `          // GB-257 (J8): the cone leaves this muzzle along the bore every frame, so it moves with the recoil, the sway
          // and the reload, and stops on the first material along that line. At rest the hold points the bore at the
          // aim point (the round's), so it meets the cursor there; the reach is that point's distance plus a margin.
          const mz = gun.userData.muzzleLocal;
          _laserOrigin.set(mz.x, mz.y, mz.z);
          gun.localToWorld(_laserOrigin);
          weaponAimPoint(_laserAim);
          const reach = _laserAim.distanceTo(_laserOrigin);
          if (reach < 0.05) { laser.visible = false; continue; }
          _laserLocal.set(0, 0, mz.z >= 0 ? 1 : -1);
          _laserDir.copy(_laserLocal).transformDirection(gun.matrixWorld);
          const stop = laserStop(_laserOrigin, _laserDir, reach * 1.25 + 1);
          const len = stop.len;
          laser.quaternion.setFromUnitVectors(_laserZ, _laserLocal);
`]];
for (const [a, b] of reps) { const n = t.split(a).length - 1; if (n !== 1) throw new Error('match ' + n + ': ' + a.slice(0, 60)); t = t.replace(a, () => b); }
if (t.split('\r\n').length - 1 !== crlf) throw new Error('line endings changed');
fs.writeFileSync(f, t);
console.log('edited');