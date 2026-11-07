// qa/2026-11-07-GB-301/fix-boltHand.mjs - restore wipe from bad GB-301 edit; apply RH bolt correctly
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(ROOT, 'index.html');
const before = fs.readFileSync(file);
if (before[0] === 0xEF) throw new Error('BOM present');
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

// 1) Pull the clean m4..launcher span from pre-GB-301 commit 16b3adfb
const pre = execSync('git show 16b3adfb:index.html', { cwd: ROOT, maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
const m4Mark = "      } else if (currentWeapon === 'm4' || currentWeapon === 'ak' || currentWeapon === 'aa12') {";
const launchMark = "      } else if (currentWeapon === 'launcher') {";
const p1 = pre.indexOf(m4Mark);
const p2 = pre.indexOf(launchMark);
if (p1 < 0 || p2 < 0 || p2 <= p1) throw new Error('pre markers missing');
let span = pre.slice(p1, p2);
// Normalize span newlines to working file's
span = span.replace(/\r\n/g, '\n').replace(/\n/g, nl);

// 2) Apply GB-300 revolver cylinder pose into the restored span (same edit as edit-gb300.mjs)
span = mustReplace(span,
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
'revolver cylinder pose in span');

// 3) Apply GB-301 RH bolt ONLY inside the sniper branch of the span
{
  // Unique within sniper: comment with "assist bolt"
  const startNeedle = '        // Left hand: fetch';
  // Find the sniper one (assist bolt), not m4's "seat slam"
  const sniperLH = span.indexOf('        // Left hand: fetch → seat → assist bolt');
  if (sniperLH < 0) {
    // Try unicode arrow variants
    const alt = span.indexOf('        // Left hand: fetch');
    // Find the one that is after sniper branch header
    const sniperHdr = span.indexOf("      } else if (currentWeapon === 'sniper') {");
    if (sniperHdr < 0) throw new Error('sniper header missing in restored span');
    let start = span.indexOf('        // Left hand: fetch', sniperHdr);
    if (start < 0) throw new Error('sniper LH comment missing');
    const endMarker = '        const base = GUN_BASE.sniper;';
    const end = span.indexOf(endMarker, start);
    if (end < 0) throw new Error('GUN_BASE.sniper missing after sniper LH');
    const replacement = N(
`        // GB-301 (J18): LH fetch/seat only; the FIRING hand works the bolt after the mag seats.
        reloadArmOffL.x = -0.20 * fetchDown - 0.10 * fetchUp - 0.08 * slap;
        reloadArmOffL.y = 0.10 * fetchDown + 0.05 * fetchUp;
        reloadArmOffL.z = 0.16 * fetchDown + 0.08 * fetchUp;
        reloadElbowOffL.x = -0.80 * fetchDown - 0.50 * fetchUp - 0.90 * slap;
        reloadElbowOffL.y = 0.12 * fetchDown;
        reloadElbowOffL.z = 0.08 * fetchUp - 0.10 * slap;
        // RH leaves the grip onto the bolt (lift / pull / push / close), then returns.
        reloadArmOff.x = -0.10 * boltHand - 0.06 * boltBack;
        reloadArmOff.y = 0.04 * boltOpen;
        reloadArmOff.z = -0.12 * boltHand - 0.04 * boltOpen;
        reloadElbowOffR.x = -0.45 * boltHand - 0.35 * boltBack;
        reloadElbowOffR.y = 0.08 * boltHand;
        reloadElbowOffR.z = 0.06 * boltOpen;

`);
    span = span.slice(0, start) + replacement + span.slice(end);
  } else {
    const start = sniperLH;
    const endMarker = '        const base = GUN_BASE.sniper;';
    const end = span.indexOf(endMarker, start);
    if (end < 0) throw new Error('GUN_BASE.sniper missing after sniper LH (arrow form)');
    const replacement = N(
`        // GB-301 (J18): LH fetch/seat only; the FIRING hand works the bolt after the mag seats.
        reloadArmOffL.x = -0.20 * fetchDown - 0.10 * fetchUp - 0.08 * slap;
        reloadArmOffL.y = 0.10 * fetchDown + 0.05 * fetchUp;
        reloadArmOffL.z = 0.16 * fetchDown + 0.08 * fetchUp;
        reloadElbowOffL.x = -0.80 * fetchDown - 0.50 * fetchUp - 0.90 * slap;
        reloadElbowOffL.y = 0.12 * fetchDown;
        reloadElbowOffL.z = 0.08 * fetchUp - 0.10 * slap;
        // RH leaves the grip onto the bolt (lift / pull / push / close), then returns.
        reloadArmOff.x = -0.10 * boltHand - 0.06 * boltBack;
        reloadArmOff.y = 0.04 * boltOpen;
        reloadArmOff.z = -0.12 * boltHand - 0.04 * boltOpen;
        reloadElbowOffR.x = -0.45 * boltHand - 0.35 * boltBack;
        reloadElbowOffR.y = 0.08 * boltHand;
        reloadElbowOffR.z = 0.06 * boltOpen;

`);
    span = span.slice(0, start) + replacement + span.slice(end);
  }
}

// Verify span has all branches and boltHand is defined before use
for (const k of ["'pistol'", "'shotgun'", "'revolver'", "'sniper'", 'const boltHand', 'poseRevolverCylinder', "GUN_BASE[currentWeapon]"]) {
  if (!span.includes(k)) throw new Error('restored span missing: ' + k);
}
// boltHand use must come AFTER const boltHand in sniper
const defAt = span.indexOf('const boltHand');
const useAt = span.indexOf('reloadArmOff.x = -0.10 * boltHand');
if (defAt < 0 || useAt < 0 || useAt < defAt) throw new Error('boltHand use before def');

// 4) Replace corrupted span in working file
const c1 = t.indexOf(m4Mark);
const c2 = t.indexOf(launchMark);
if (c1 < 0 || c2 < 0 || c2 <= c1) throw new Error('working markers missing');
// Sanity: corrupted span should NOT have pistol branch
const corrupted = t.slice(c1, c2);
if (corrupted.includes("currentWeapon === 'pistol'")) throw new Error('working span unexpectedly has pistol - abort');
if (!corrupted.includes('boltHand')) throw new Error('working span missing boltHand - wrong target?');

t = t.slice(0, c1) + span + t.slice(c2);
fs.writeFileSync(file, t);
const after = fs.readFileSync(file);
console.log(JSON.stringify({
  before: before.length, after: after.length, delta: after.length - before.length,
  bom: after[0] === 0xEF,
  branches: ['pistol','shotgun','revolver','sniper'].map((k) => ({
    k, n: (t.match(new RegExp("currentWeapon === '" + k + "'", 'g')) || []).length
  }))
}));
