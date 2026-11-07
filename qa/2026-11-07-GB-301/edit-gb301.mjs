// qa/2026-11-07-GB-301/edit-gb301.mjs — exact replacements for GB-301 (preserve CRLF, no BOM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const nlOf = (t) => (t.includes('\r\n') ? '\r\n' : '\n');
const N = (s, nl) => s.replace(/\n/g, nl);

function mustReplace(src, from, to, label, nl) {
  from = N(from, nl); to = N(to, nl);
  if (!src.includes(from)) throw new Error('missing block: ' + label);
  const once = src.split(from);
  if (once.length !== 2) throw new Error('not unique (' + (once.length - 1) + '): ' + label);
  return once[0] + to + once[1];
}

function editIndex() {
  const file = path.join(ROOT, 'index.html');
  const before = fs.readFileSync(file);
  if (before[0] === 0xEF) throw new Error('BOM present index.html');
  let t = before.toString('utf8');
  const nl = nlOf(t);

  t = mustReplace(t,
`    // on the knob. Visual only: fireCooldown, the interval, damage and the reload are untouched; the cycle is sized from
    // the cooldown left when it starts and is over before that runs out. No cycle after the last round: the reload's
    // own bolt beat works it and throws that case. Beats are fractions of the cycle (from..to of the cooldown).
    const SNIPER_BOLT = { from: 0.08, to: 0.86, reach: 0.2, lift: [0.2, 0.35], back: [0.35, 0.52], eject: 0.48, fwd: [0.56, 0.72], down: [0.72, 0.85] };`,
`    // on the knob (GB-301 / J18: the FIRING hand works it; support stays on the forend). Fire waits while
    // boltCycle.active (as the shotgun waits on its pump). The cycle is sized from the cooldown left when it starts;
    // no cycle after the last round: the reload's own bolt beat works it and throws that case. Beats are fractions of
    // the cycle (from..to of the cooldown).
    const SNIPER_BOLT = { from: 0.08, to: 0.86, reach: 0.2, lift: [0.2, 0.35], back: [0.35, 0.52], eject: 0.48, fwd: [0.56, 0.72], down: [0.72, 0.85] };`,
  'SNIPER_BOLT comment', nl);

  t = mustReplace(t,
`        if (currentWeapon === 'shotgun' && shotgunPumping) return;
        if (ammo <= 0) {`,
`        if (currentWeapon === 'shotgun' && shotgunPumping) return;
        // GB-301: the sniper's shot cadence waits for the bolt (J18).
        if (currentWeapon === 'sniper') {
          const _bs = weaponMeshes.sniper && weaponMeshes.sniper.userData.boltCycle;
          if (_bs && _bs.active) return;
        }
        if (ammo <= 0) {`,
  'fire gate bolt', nl);

  t = mustReplace(t,
`      if (currentWeapon === 'shotgun' && shotgunPumping) return false;
      autoReloadT += dt;`,
`      if (currentWeapon === 'shotgun' && shotgunPumping) return false;
      if (currentWeapon === 'sniper') {
        const _bs = weaponMeshes.sniper && weaponMeshes.sniper.userData.boltCycle;
        if (_bs && _bs.active) return false;
      }
      autoReloadT += dt;`,
  'autoReload bolt gate', nl);

  t = mustReplace(t,
`      st.reloadU = reloading ? _clamp01(1 - reloadTimer / Math.max(0.05, reloadAnimDuration || 1)) : null;
      st.reloadEmpty = reloading ? reloadWasEmpty : null;   // CL-306: tactical (rounds left) or empty`,
`      st.reloadU = reloading ? _clamp01(1 - reloadTimer / Math.max(0.05, reloadAnimDuration || 1)) : null;
      st.reloadEmpty = reloading ? reloadWasEmpty : null;   // CL-306: tactical (rounds left) or empty
      // GB-301: between shots the firing hand's weight on the bolt (0..1); the viewmodel rides the bolt knob.
      { const _bs = (!reloading && currentWeapon === 'sniper' && weaponMeshes.sniper)
          ? weaponMeshes.sniper.userData.boltCycle : null;
        st.boltHand = (_bs && _bs.active) ? (_bs.hand || 0) : 0;
        // Reload work window: same signal so FP RH takes the bolt after the mag seats.
        if (reloading && currentWeapon === 'sniper' && RELOAD_PLAN.sniper) {
          const u = _clamp01(1 - reloadTimer / Math.max(0.05, reloadAnimDuration || 1));
          const K = RELOAD_PLAN.sniper.keys;
          let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
          const a = K[i][1], b = K[Math.min(K.length - 1, i + 1)][1];
          if (a === 'work' || b === 'work') {
            const t = (i < K.length - 1) ? _smooth((u - K[i][0]) / Math.max(1e-4, K[i + 1][0] - K[i][0])) : 0;
            st.boltHand = Math.max(st.boltHand, a === 'work' && b === 'work' ? 1 : (a === 'work' ? 1 - t : t));
          }
        }
      }`,
  'st.boltHand', nl);

  // Sniper reload arm offsets: RH works bolt; LH fetch/seat only.
  // Match the exact Unicode arrows in the file.
  {
    const start = t.indexOf('        // Left hand: fetch');
    if (start < 0) throw new Error('missing Left hand fetch comment');
    const endMarker = '        const base = GUN_BASE.sniper;';
    const end = t.indexOf(endMarker, start);
    if (end < 0) throw new Error('missing GUN_BASE.sniper after LH block');
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

`, nl);
    t = t.slice(0, start) + replacement + t.slice(end);
  }

  // Support hand: don't send LH to bolt (between shots or reload work).
  t = mustReplace(t,
`      } else if (reloading && RELOAD_PLAN[currentWeapon]) {
        // GB-145: the support hand follows the gun's reload plan; a magazine or a shell between the well and the pouch
        // rides in the palm (placed once the arm is solved, below).
        const u = _clamp01(1 - reloadTimer / Math.max(0.05, reloadAnimDuration || WEAPON_STATS[currentWeapon].reload));
        palmItem = reloadSupportTarget(currentWeapon, u, gun, fore, ud, torso);
      } else if (!reloading && currentWeapon === 'sniper' && gun.userData.bolt && gun.userData.boltCycle && gun.userData.boltCycle.hand > 0) {
        // GB-146: between shots the support hand goes to the bolt's knob (the gun's right) and rides it through the cycle.
        const bolt = gun.userData.bolt;
        bolt.updateMatrixWorld(true);
        boltWork = gun.userData.boltCycle.hand;
        fore.lerp(bolt.localToWorld(_rsp.work.copy(bolt.userData.gb145Grab || reloadGrabPoint(bolt, 'bolt'))), boltWork);
      } else if (reloading && gun.userData.mag !== undefined) {`,
`      } else if (reloading && RELOAD_PLAN[currentWeapon]) {
        // GB-145: the support hand follows the gun's reload plan; a magazine or a shell between the well and the pouch
        // rides in the palm (placed once the arm is solved, below).
        // GB-301 (J18): sniper 'work' is the firing hand on the bolt — support stays on the forend for those beats.
        const u = _clamp01(1 - reloadTimer / Math.max(0.05, reloadAnimDuration || WEAPON_STATS[currentWeapon].reload));
        if (currentWeapon === 'sniper') {
          const K = RELOAD_PLAN.sniper.keys;
          let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
          const a = K[i][1], b = K[Math.min(K.length - 1, i + 1)][1];
          if (a === 'work' || b === 'work') {
            /* fore stays on forend */ boltWork = 0;
          } else {
            palmItem = reloadSupportTarget(currentWeapon, u, gun, fore, ud, torso);
          }
        } else {
          palmItem = reloadSupportTarget(currentWeapon, u, gun, fore, ud, torso);
        }
      } else if (!reloading && currentWeapon === 'sniper' && gun.userData.bolt && gun.userData.boltCycle && gun.userData.boltCycle.hand > 0) {
        // GB-301: bolt animates; FP firing hand rides it via st.boltHand. 3P RH leave-grip skipped (gun is parented
        // to gripR — not cheap). Support stays on the forend.
        boltWork = 0;
      } else if (reloading && gun.userData.mag !== undefined) {`,
  'support hand no bolt', nl);

  t = mustReplace(t,
`      handRollLW += ((reloading ? 0 : 1 - boltWork) - handRollLW) * _lerpK(12, dt);   // GB-146: and off the forend for the bolt`,
`      // GB-301: bolt work is the firing hand; support keeps its forend roll (off only while swapping the mag).
      handRollLW += ((reloading ? 0 : 1) - handRollLW) * _lerpK(12, dt);`,
  'handRollLW', nl);

  fs.writeFileSync(file, t);
  console.log('index.html OK');
}

function editViewmodel() {
  const file = path.join(ROOT, 'game', 'viewmodel.js');
  const before = fs.readFileSync(file);
  if (before[0] === 0xEF) throw new Error('BOM present viewmodel.js');
  let t = before.toString('utf8');
  const nl = nlOf(t);

  // boltBase like pumpBase
  t = mustReplace(t,
`    gun.workBase = gun.work ? gun.work.position.clone() : null;
    gun.pumpBase = gun.pump ? gun.pump.position.clone() : null;`,
`    gun.workBase = gun.work ? gun.work.position.clone() : null;
    gun.pumpBase = gun.pump ? gun.pump.position.clone() : null;
    gun.boltBase = gun.bolt ? gun.bolt.position.clone() : null;   // GB-301: exposed like the shotgun's pump`,
  'boltBase', nl);

  // After right wrist is placed on grip (mul(G, SR, WR) ... twistToward), and BEFORE left-hand block:
  // if st.boltHand, lerp WR toward the bolt knob (firing hand works the bolt).
  t = mustReplace(t,
`    if (AKF) followK(WR, eR);
    else if (FOL) follow(WR, eR);
    else if (REL) rel(WR, REL.r, eR);
    twistToward(arms.r, WR, eR);
    let poseL = sockets.poseL;`,
`    if (AKF) followK(WR, eR);
    else if (FOL) follow(WR, eR);
    else if (REL) rel(WR, REL.r, eR);
    twistToward(arms.r, WR, eR);
    // GB-301 (J18): the firing hand leaves the grip onto the sniper's bolt knob (after each shot and on reload work).
    // Gun frame stays put (unlike 3P where the gun is parented to the hand). Support stays on the forend.
    let poseR = sockets.poseR;
    const boltW = (!AK && gun.bolt && (st.boltHand || 0) > 0.001) ? clamp(st.boltHand, 0, 1) : 0;
    if (boltW > 0) {
      gun.bolt.updateMatrix();
      const grab = (VM_SOCKETS.sniper && VM_SOCKETS.sniper.boltKnob)
        ? null
        : null;
      // Prefer the live bolt part's grab (moves with lift/pull); fall back to authored boltKnob in gun space.
      const _bat = _pat, _bz = _pz, _by = _py;
      if (gun.bolt) {
        _bat.set(-0.075, 0.012, 0.02).applyMatrix4(gun.bolt.matrix);
      } else {
        _bat.set(-0.13, 0.067, -0.16);
      }
      _bz.set(-0.8, 0.1, -0.6).normalize();
      _by.set(0.6, -0.25, -0.76).addScaledVector(_bz, -_by.dot(_bz)).normalize();
      const _bx = _px.crossVectors(_by, _bz);
      const _bF = _local2; basisQ(_bx, _by, _bz, _bF.q); _bF.s = sockets.r.s;
      const palmR = wristSpacePoint(arms.r, 'palm', _ppalm).multiplyScalar(_bF.s).applyQuaternion(_bF.q);
      _bF.p.copy(_bat).sub(palmR);
      mul(G, _bF, _outF);
      // lerp wrist from grip to bolt
      WR.p.lerp(_outF.p, boltW);
      WR.q.slerp(_outF.q, boltW);
      if (FOL) follow(WR, eR);
      else if (REL) rel(WR, REL.r, eR);
      twistToward(arms.r, WR, eR);
      poseR = POSES.pinch || sockets.poseR;
      info.handPlace = 'bolt';
    }
    let poseL = sockets.poseL;`,
  'RH bolt follow', nl);

  // During sniper reload, when left hand would go to 'work', keep it on forend (RH already on bolt via boltW).
  t = mustReplace(t,
`    } else if (u != null) {
      poseL = reloadHand(R, u, _localF); mul(G, _localF, WL);
      // CL-306 (the audit: the Wasp's and KR-7's charging pulls swept the support forearm across the view, 10 cm from the
      // eye): during a reload the support elbow stays where the hold keeps it, so the forearm pivots from low left up to
      // the magazine or the handle instead of standing up through the middle of the view under the raised hand.
      mul(G, sockets.l, _foreWL);
      if (FOL) follow(_foreWL, eL); else if (REL) rel(_foreWL, REL.l, eL);
    }`,
`    } else if (u != null) {
      poseL = reloadHand(R, u, _localF); mul(G, _localF, WL);
      // GB-301 (J18): sniper 'work' is the firing hand on the bolt — support returns to the forend for those beats.
      if (gun.key === 'sniper' && info.handPlace === 'work') {
        mul(G, sockets.l, WL); poseL = sockets.poseL; info.handPlace = boltW > 0 ? 'bolt' : 'fore';
      }
      // CL-306 (the audit: the Wasp's and KR-7's charging pulls swept the support forearm across the view, 10 cm from the
      // eye): during a reload the support elbow stays where the hold keeps it, so the forearm pivots from low left up to
      // the magazine or the handle instead of standing up through the middle of the view under the raised hand.
      mul(G, sockets.l, _foreWL);
      if (FOL) follow(_foreWL, eL); else if (REL) rel(_foreWL, REL.l, eL);
    }`,
  'reload work LH stay', nl);

  // Use poseR (may be pinch on bolt) instead of always sockets.poseR
  t = mustReplace(t,
`    arms.r.rig.set(sockets.poseR).update(); arms.l.rig.set(poseL).update();`,
`    arms.r.rig.set(poseR).update(); arms.l.rig.set(poseL).update();`,
  'poseR apply', nl);

  fs.writeFileSync(file, t);
  console.log('viewmodel.js OK');
}

function editStudio() {
  const file = path.join(ROOT, 'studio', 'weapon-longarms.js');
  const before = fs.readFileSync(file);
  if (before[0] === 0xEF) throw new Error('BOM present weapon-longarms.js');
  let t = before.toString('utf8');
  const nl = nlOf(t);

  t = mustReplace(t,
`  gun.userData.bolt = bolt;
  gun.userData.boltSide = -1;
  gun.userData.baseBoltPos = bolt.position.clone();
  gun.userData.baseBoltRot = bolt.rotation.clone();`,
`  gun.userData.bolt = bolt;
  gun.userData.boltSide = -1;
  gun.userData.baseBoltPos = bolt.position.clone();
  gun.userData.baseBoltRot = bolt.rotation.clone();
  // GB-301: for Claude's VM_RELOADS — the firing hand works this part after each shot and on the reload's work beat.
  // Grab is bolt-local (knob); beats match SNIPER_BOLT in index.html (fractions of the between-shot cycle).
  gun.userData.boltWork = {
    hand: 'fire',
    grab: [-0.075, 0.012, 0.02],
    afterShot: { from: 0.08, to: 0.86, reach: 0.2, lift: [0.2, 0.35], back: [0.35, 0.52], fwd: [0.56, 0.72], down: [0.72, 0.85] },
    reloadWork: [0.62, 0.94]
  };`,
  'boltWork meta', nl);

  fs.writeFileSync(file, t);
  console.log('weapon-longarms.js OK');
}

editIndex();
editViewmodel();
editStudio();
console.log('GB-301 edits applied');
