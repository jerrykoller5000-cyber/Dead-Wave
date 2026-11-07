// qa/2026-11-07-GB-300/edit-gb300.mjs — exact replacements for GB-300 (preserve CRLF, no BOM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(ROOT, 'index.html');
const before = fs.readFileSync(file);
if (before[0] === 0xEF) throw new Error('BOM present');
let t = before.toString('utf8');
const nl = t.includes('\r\n') ? '\r\n' : '\n';
const N = (s) => s.replace(/\n/g, nl); // templates written with \n → file newlines

function mustReplace(src, from, to, label) {
  from = N(from); to = N(to);
  if (!src.includes(from)) throw new Error('missing block: ' + label);
  const once = src.split(from);
  if (once.length !== 2) throw new Error('not unique (' + (once.length - 1) + '): ' + label);
  return once[0] + to + once[1];
}

t = mustReplace(t,
`    function syncDualWeaponParts() {
      for (const name of Object.keys(offhandMeshes)) {
        const a = weaponMeshes[name].userData, b = offhandMeshes[name].userData;
        for (const key of ['mag', 'slide', 'cylinder', 'hammer']) {
          if (!a[key] || !b[key]) continue;
          b[key].position.copy(a[key].position);
          b[key].quaternion.copy(a[key].quaternion);
          b[key].visible = a[key].visible;
        }
      }
    }`,
`    function syncDualWeaponParts() {
      // GB-300: during an akimbo revolver reload each cylinder swings on its own beat
      // (right then left, matching akimboReloadDip). Do not mirror the right onto the left.
      const skipPairCyl = reloading && akimboOn() && currentWeapon === 'revolver';
      for (const name of Object.keys(offhandMeshes)) {
        const a = weaponMeshes[name].userData, b = offhandMeshes[name].userData;
        for (const key of ['mag', 'slide', 'cylinder', 'hammer']) {
          if (!a[key] || !b[key]) continue;
          if (skipPairCyl && name === 'revolver' && (key === 'cylinder' || key === 'mag')) continue;
          b[key].position.copy(a[key].position);
          b[key].quaternion.copy(a[key].quaternion);
          b[key].visible = a[key].visible;
        }
      }
    }`,
'syncDualWeaponParts');

t = mustReplace(t,
`        // J57: the crane is on gun-local -x, so the cylinder opens toward it
        // (screen-left in the mirrored first-person view), not across the gun.
        if (gun.userData.cylinder) {
          const cyl = gun.userData.cylinder;
          const bp = gun.userData.baseCylinderPos || gun.userData.baseMagPos;
          const br = gun.userData.baseCylinderRot || gun.userData.baseMagRot;
          if (bp && br) {
            const swing = openAmt;
            cyl.position.set(
              bp.x - 0.095 * swing - 0.012 * ejector,
              bp.y - 0.008 * swing,
              bp.z + 0.01 * swing
            );
            cyl.rotation.set(
              br.x,
              br.y - 0.16 * swing,
              br.z + chamberStep * (Math.PI * 2 / 6)
            );
          }
        }

        // Optional ejector-rod nudge during eject window
        if (gun.userData.hammer && gun.userData.baseHammerRot) {
          const hm = gun.userData.hammer;
          hm.rotation.x = gun.userData.baseHammerRot.x - 0.55 * hammerCock;
        }

        // Eject only spent casings once cylinder is open
        if (!revolverEjectDone && progress >= 0.18) {
          revolverEjectDone = true;
          const n = Math.max(0, revolverReloadSpent | 0);
          const right = akimboOn() ? Math.ceil(n / 2) : n;
          const left = n - right;
          for (let i = 0; i < right; i++) spawnRevolverEjectCasing(i, right);
          for (let i = 0; i < left; i++) spawnRevolverEjectCasing(i, left, offhandMeshes.revolver);
        }`,
`        // J57: the crane is on gun-local -x, so the cylinder opens toward it
        // (screen-left in the mirrored first-person view), not across the gun.
        // GB-300: pose one gun's cylinder for a 0..1 local reload beat (open / eject / load / close).
        function poseRevolverCylinder(g, u, needN) {
          if (!g || !g.userData.cylinder) return;
          const cyl = g.userData.cylinder;
          const bp = g.userData.baseCylinderPos || g.userData.baseMagPos;
          const br = g.userData.baseCylinderRot || g.userData.baseMagRot;
          if (!bp || !br) return;
          const open = _seg(u, 0.0, 0.16) * (1 - _seg(u, 0.80, 0.96));
          const ej = _pulse(u, 0.14, 0.20, 0.28);
          let step = 0;
          if (u >= 0.28 && u < 0.78) {
            const tt = (u - 0.28) / 0.50;
            const idx = Math.min(needN - 1, Math.floor(tt * needN));
            step = idx + _smooth(tt * needN - idx);
          } else if (u >= 0.78) step = needN;
          cyl.position.set(bp.x - 0.095 * open - 0.012 * ej, bp.y - 0.008 * open, bp.z + 0.01 * open);
          cyl.rotation.set(br.x, br.y - 0.16 * open, br.z + step * (Math.PI * 2 / 6));
        }
        // GB-300 pair timing = GB-145 akimboReloadDip windows: right 0.06..0.50, left 0.48..0.92.
        function pairCylLocal(u, hand) {
          const a = hand ? 0.48 : 0.06, span = 0.44;
          if (u <= a) return 0;
          if (u >= a + span) return 1;
          return (u - a) / span;
        }
        if (akimboOn()) {
          poseRevolverCylinder(weaponMeshes.revolver, pairCylLocal(progress, 0), need);
          poseRevolverCylinder(offhandMeshes.revolver, pairCylLocal(progress, 1), need);
        } else {
          poseRevolverCylinder(gun, progress, need);
        }

        // Optional ejector-rod nudge during eject window
        if (gun.userData.hammer && gun.userData.baseHammerRot) {
          const hm = gun.userData.hammer;
          hm.rotation.x = gun.userData.baseHammerRot.x - 0.55 * hammerCock;
        }

        // Eject only spent casings once each cylinder is open (pair: each hand's own window)
        if (akimboOn()) {
          const n = Math.max(0, revolverReloadSpent | 0);
          const nR = Math.ceil(n / 2), nL = n - nR;
          if (!(revolverEjectDone & 1) && pairCylLocal(progress, 0) >= 0.18) {
            revolverEjectDone |= 1;
            for (let i = 0; i < nR; i++) spawnRevolverEjectCasing(i, nR);
          }
          if (!(revolverEjectDone & 2) && pairCylLocal(progress, 1) >= 0.18) {
            revolverEjectDone |= 2;
            for (let i = 0; i < nL; i++) spawnRevolverEjectCasing(i, nL, offhandMeshes.revolver);
          }
        } else if (!revolverEjectDone && progress >= 0.18) {
          revolverEjectDone = true;
          const n = Math.max(0, revolverReloadSpent | 0);
          for (let i = 0; i < n; i++) spawnRevolverEjectCasing(i, n);
        }`,
'revolver cylinder pose');

t = mustReplace(t,
`      updateViewmodel(realDt);   // CL-281
      PROF.mark('viewmodel');`,
`      updateViewmodel(realDt);   // CL-281
      // GB-300: the view gun clones mirror the world guns' parts, but the akimbo reload path
      // reseats gun2.mag (the cylinder). Re-apply each world cylinder onto the view guns so
      // first person shows the open swing (right then left). VM_RELOADS hands stay Claude's.
      if (viewmodel && viewmodel.info && viewmodel.info.active && currentWeapon === 'revolver' && reloading) {
        const vg = viewmodel.gun, vg2 = viewmodel.gun2;
        const wr = weaponMeshes.revolver, wl = offhandMeshes && offhandMeshes.revolver;
        if (vg && vg.cylinder && wr && wr.userData.cylinder) {
          vg.cylinder.position.copy(wr.userData.cylinder.position);
          vg.cylinder.quaternion.copy(wr.userData.cylinder.quaternion);
        }
        if (vg2 && vg2.cylinder && wl && wl.userData.cylinder) {
          vg2.cylinder.position.copy(wl.userData.cylinder.position);
          vg2.cylinder.quaternion.copy(wl.userData.cylinder.quaternion);
        }
      }
      PROF.mark('viewmodel');`,
'viewmodel cylinder sync');

fs.writeFileSync(file, t);
const after = fs.readFileSync(file);
console.log(JSON.stringify({
  before: before.length, after: after.length, delta: after.length - before.length,
  bom: after[0] === 0xEF,
  cr: [...after].filter((x) => x === 13).length,
  lf: [...after].filter((x) => x === 10).length
}));