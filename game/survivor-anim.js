// game/survivor-anim.js — AI-1 (Antigravity 3, Jerry direct):
// Procedural skeletal animation & pose engine for Cpl. Okafor, Sgt. Brandt, and Spc. Pike
// across all life states:
//   - Roof Combat Alert (M4 shouldered aim/recoil/reload for Okafor & Pike; crouched orbiting
//     M240B tripod gunner with cyclic burst shudder & belt-box reload for Brandt)
//   - Roof Daytime Resting (grounded, zero-clipping seated/tending/watch poses with breathing,
//     player-proximity head tracking, wave/nod acknowledgment, and Okafor patch-up gesture)
//   - Valley Rescue Sites (cautious cover crouch when guards live, rising/beckoning wave when
//     cleared and player approaches, and grateful nod + brisk departure fadeout on rescue)
// Follows docs/animation-principles.md (breathing, anticipation, follow-through, arcs, weight)
// and AGENTS.md Rules 24-25 (anatomically clamped joints, zero clipping, grounded feet).

import { HAND_POSES } from '../studio/marine-hand.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const ease = (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-rate * Math.min(0.1, Math.max(0, dt))));
const easeAngle = (cur, target, dt, rate) => cur + wrapAngle(target - cur) * (1 - Math.exp(-rate * Math.min(0.1, Math.max(0, dt))));

// Set hand pose only when state actually changes (avoids per-frame CPU vertex updates!).
function setHandState(m, leftKey, rightKey) {
  const u = m && m.userData;
  if (!u) return;
  if (u._handLKey !== leftKey) {
    u._handLKey = leftKey;
    const h = u.elbowLG?.userData?.wrist?.userData?.hand;
    if (h && HAND_POSES[leftKey]) h.set(HAND_POSES[leftKey]).update();
  }
  if (u._handRKey !== rightKey) {
    u._handRKey = rightKey;
    const h = u.elbowRG?.userData?.wrist?.userData?.hand;
    if (h && HAND_POSES[rightKey]) h.set(HAND_POSES[rightKey]).update();
  }
}

function setWristPose(u, l = [0.05, 1.15, 0], r = [0.05, -1.15, 0]) {
  const wL = u?.elbowLG?.userData?.wrist;
  const wR = u?.elbowRG?.userData?.wrist;
  if (wL) wL.rotation.set(l[0], l[1], l[2]);
  if (wR) wR.rotation.set(r[0], r[1], r[2]);
}

// Compute grounded body drop for a symmetric or asymmetric leg crouch (exact 2-bone trig
// using the actual D-243 hipY=0.785, thigh=0.355, shin=0.330 so boots stay planted on y=0!).
function applyGroundedLegs(u, m, { thighL = 0, thighR = 0, kneeL = 0, kneeR = 0, splayL = 0, splayR = 0, lowerYaw = 0 }) {
  const THIGH = 0.355, SHIN = 0.330, FULL = THIGH + SHIN;
  const footDrop = (th, kn) => {
    const h = THIGH * Math.cos(th) + SHIN * Math.cos(th + kn);
    return FULL - h;
  };
  const drop = Math.max(0, Math.min(footDrop(thighL, kneeL), footDrop(thighR, kneeR)));
  if (u.legLG) u.legLG.rotation.set(thighL, 0, splayL);
  if (u.legRG) u.legRG.rotation.set(thighR, 0, splayR);
  if (u.kneeLG) u.kneeLG.rotation.set(kneeL, 0, 0);
  if (u.kneeRG) u.kneeRG.rotation.set(kneeR, 0, 0);
  if (u.ankleLG) u.ankleLG.rotation.set(-(thighL + kneeL) * 0.92, 0, -splayL * 0.6);
  if (u.ankleRG) u.ankleRG.rotation.set(-(thighR + kneeR) * 0.92, 0, -splayR * 0.6);
  if (u.lowerBody) u.lowerBody.rotation.set(0, lowerYaw, 0);
  m.position.y = -drop;
}

// Toggle slung back M4 vs combat hand-held M4 cleanly.
export function setSurvivorRifleMode(m, inHands) {
  const u = m && m.userData;
  if (!u) return;
  if (u.survivorHeldRifle) u.survivorHeldRifle.visible = !!inHands;
  if (u.survivorSlungRifle) u.survivorSlungRifle.visible = !inHands;
}

// Create per-survivor animation state record.
export function createSurvivorAnimState(who, seed = 0) {
  return {
    who,
    t: seed * 3.7 + Math.random() * 6.28,
    yaw: 0,
    pitch: 0,
    headYaw: 0,
    headPitch: 0,
    recoil: 0,
    burstKick: 0,
    reloadT: 0,
    reloadDur: 0,
    healT: 0,
    waveT: 0,
    talkT: 0,
    crouchBlend: 0,
    alertBlend: 0,
    scanPhase: seed * 1.9
  };
}

// ---------------------------------------------------------------------------
// 1. ROOF SURVIVOR ANIMATION (Alert combat vs Daytime resting + player reactions)
// ---------------------------------------------------------------------------
export function updateRoofSurvivorAnim(r, dt, ctx) {
  const m = r.figure;
  if (!m || !m.userData) return;
  const u = m.userData;
  const A = r.anim || (r.anim = createSurvivorAnimState(r.who, r.who === 'okafor' ? 1 : r.who === 'brandt' ? 2 : 3));
  const step = Math.min(0.05, Math.max(0.001, dt || 0.016));
  A.t += step;

  // Decay transient impulses
  A.recoil = Math.max(0, A.recoil - step * 6.5);
  A.burstKick = Math.max(0, A.burstKick - step * 10.0);
  if (A.healT > 0) A.healT = Math.max(0, A.healT - step);
  if (A.waveT > 0) A.waveT = Math.max(0, A.waveT - step);
  if (A.talkT > 0) A.talkT = Math.max(0, A.talkT - step);
  if (A.reloadT > 0) A.reloadT = Math.max(0, A.reloadT - step);

  const alert = !!r.awake;
  A.alertBlend = ease(A.alertBlend, alert ? 1 : 0, step, 6.5);

  const playerPos = ctx.playerPos;
  const postPos = ctx.postPos;
  const rootYaw = r.root ? r.root.rotation.y : 0;
  const onRoof = !!ctx.onHqRoof;

  // Player proximity awareness on the roof (3.0 m so adjacent posts behind machinery stay on watch; > ROOF_REACH 2.2 m)
  let playerDist = 999;
  let playerLocalYaw = 0;
  if (playerPos && postPos) {
    const dx = playerPos.x - postPos.x, dz = playerPos.z - postPos.z;
    playerDist = Math.hypot(dx, dz);
    if (playerDist < 4.5 && onRoof) {
      playerLocalYaw = wrapAngle(Math.atan2(dx, dz) - rootYaw);
    }
  }
  const nearPlayer = onRoof && playerDist < 3.0;

  const breath = Math.sin(A.t * (alert ? 2.8 : 1.45));
  const breath2 = Math.sin(A.t * 0.72 + 1.1);

  // =========================================================================
  // BRANCH A: COMBAT ALERT (Wave / Alarm active)
  // =========================================================================
  if (alert) {
    // Ensure figure is upright (never tilted!)
    r.pivot.rotation.x = 0;
    r.pivot.rotation.z = 0;

    if (r.who === 'brandt' && r.gun) {
      // BRANDT ON THE M240B TRIPOD:
      // Orbit Brandt smoothly behind the M240B receiver/buttstock as it traverses!
      const gunX = r.gun.position.x, gunZ = r.gun.position.z;
      const targetLocalYaw = r.aimLocalYaw != null ? r.aimLocalYaw : 0;
      A.yaw = easeAngle(A.yaw, targetLocalYaw, step, r.hasTarget ? 9.5 : 3.0);
      r.gun.rotation.y = A.yaw;

      const standBack = 0.48;
      r.pivot.position.set(
        gunX - Math.sin(A.yaw) * standBack,
        0,
        gunZ - Math.cos(A.yaw) * standBack
      );
      r.pivot.rotation.y = A.yaw;

      const targetPitch = clamp(r.aimPitch != null ? r.aimPitch : -0.18, -0.45, 0.35);
      A.pitch = ease(A.pitch, targetPitch, step, 8.0);

      // Deep braced gunner crouch so shoulders align behind the 0.714 m trunnion & ACOG!
      const shudder = A.burstKick > 0 ? Math.sin(A.t * 58) * 0.022 * A.burstKick : 0;
      const kick = A.recoil * 0.065;
      applyGroundedLegs(u, m, {
        thighL: -0.78, kneeL: 1.38, splayL: -0.12,
        thighR: -0.34, kneeR: 0.92, splayR: 0.14,
        lowerYaw: -0.14
      });

      const reloading = A.reloadT > 0 && A.reloadDur > 0;
      const relU = reloading ? 1 - (A.reloadT / A.reloadDur) : 0;

      // Animate M240B feed cover opening during belt reload!
      if (r.gun.userData?.feedCover) {
        const coverOpen = reloading
          ? Math.sin(clamp((relU - 0.10) / 0.72, 0, 1) * Math.PI)
          : 0;
        r.gun.userData.feedCover.rotation.x = -coverOpen * 1.08;
      }

      // Torso leaned forward over the receiver, tracking gun elevation
      u.torsoG.rotation.set(
        0.38 - A.pitch * 0.45 - kick * 0.5 + breath * 0.014,
        0.10 + shudder,
        shudder * 0.6
      );
      u.headG.rotation.set(
        -0.28 + A.pitch * 0.35 + (reloading ? 0.25 : 0) + kick * 0.25,
        -0.10 + (reloading ? -0.18 : 0),
        0.04
      );

      if (reloading) {
        // Left hand reaches down to olive ammo can (relU 0.15-0.45), lifts belt across feed tray (0.45-0.78), slams cover (0.78-0.95)
        const dip = Math.sin(clamp((relU - 0.12) / 0.48, 0, 1) * Math.PI);
        const slam = Math.sin(clamp((relU - 0.72) / 0.24, 0, 1) * Math.PI);
        u.armLG.rotation.set(-0.55 + dip * 0.45 - slam * 0.35, 0.22 - dip * 0.35, 0.28 + dip * 0.18);
        u.elbowLG.rotation.set(-0.85 - dip * 0.35, 0, 0);
        u.armRG.rotation.set(-0.88 - slam * 0.15, -0.08, -0.16);
        u.elbowRG.rotation.set(-0.55, 0, 0);
        setHandState(m, 'relaxed', 'fist');
      } else {
        // Right hand grips M240B pistol grip firmly; left hand braces rear stock toe & belt feed!
        u.armRG.rotation.set(-0.92 - A.pitch * 0.35 - kick, -0.10, -0.20 + shudder);
        u.elbowRG.rotation.set(-0.56 + kick * 0.8, 0, 0);
        u.armLG.rotation.set(-0.88 - A.pitch * 0.30 - kick * 0.6, 0.24, 0.30 - shudder);
        u.elbowLG.rotation.set(-0.64 + kick * 0.5, 0, 0);
        setWristPose(u, [0.15, 0.35, 0], [0.12, -0.22, 0]);
        setHandState(m, 'fist', 'point');
      }
      return;
    }

    // OKAFOR & PIKE: SHOULDERED M4 COMBAT OVERWATCH!
    setSurvivorRifleMode(m, true);
    r.pivot.position.set(0, 0, 0);

    const idleScan = r.hasTarget ? 0 : Math.sin(A.t * 0.65 + A.scanPhase) * 0.42;
    const targetLocalYaw = r.hasTarget && r.aimLocalYaw != null ? r.aimLocalYaw : idleScan;
    A.yaw = easeAngle(A.yaw, targetLocalYaw, step, r.hasTarget ? 10.0 : 2.6);
    r.pivot.rotation.y = A.yaw;

    // Aim down slightly over the 5.4 m roof edge when engaging zombies below!
    const wantPitch = r.hasTarget && r.aimPitch != null ? clamp(r.aimPitch, -0.58, 0.28) : -0.10;
    A.pitch = ease(A.pitch, wantPitch, step, r.hasTarget ? 9.0 : 3.2);

    const reloading = A.reloadT > 0 && A.reloadDur > 0;
    const relU = reloading ? 1 - (A.reloadT / A.reloadDur) : 0;
    const kick = A.recoil;

    // Athletic bladed stance — boots planted firmly on the roof deck
    applyGroundedLegs(u, m, {
      thighL: -0.22, kneeL: 0.34, splayL: -0.07,
      thighR: 0.14, kneeR: 0.18, splayR: 0.08,
      lowerYaw: 0.18
    });

    // Bladed torso (+0.46 rad brings support arm -X forward toward M4 quad-rail, right shoulder +X back!)
    const blade = 0.46;
    const torsoPitch = clamp(-A.pitch * 0.55, -0.14, 0.34) - kick * 0.07 + breath * 0.010;
    u.torsoG.rotation.set(torsoPitch, blade, 0);

    // Head counter-turned to sight straight down the M4 optic toward target (or glance at player if healing)
    let lookYaw = -blade;
    let lookPitch = clamp(-A.pitch * 0.30, -0.20, 0.26) + (reloading ? 0.26 : 0);
    if (A.healT > 0) {
      lookYaw = clamp(playerLocalYaw - A.yaw - blade, -0.9, 0.9);
      lookPitch = 0.06;
    }
    u.headG.rotation.set(lookPitch, lookYaw, 0.06);

    // Aim the shouldered M4 straight along world target direction (compensating for torso blade!)
    if (u.survivorHeldRifle) {
      const gunPitch = clamp(-A.pitch * 0.45 - torsoPitch * 0.15, -0.30, 0.42);
      const relTilt = reloading ? Math.sin(relU * Math.PI) : 0;
      u.survivorHeldRifle.position.set(
        0.135 - relTilt * 0.04,
        (1.135 - (u.torsoPivotY || 0.865)) - relTilt * 0.03,
        0.145 - kick * 0.042 + relTilt * 0.02
      );
      u.survivorHeldRifle.rotation.set(
        gunPitch - kick * 0.11 - relTilt * 0.34,
        -blade + relTilt * 0.22,
        relTilt * 0.55
      );
    }

    if (reloading) {
      // Smooth 3-stage tactical M4 reload: drop to mag pouch -> insert fresh mag -> slap bolt catch
      const magArc = Math.sin(clamp((relU - 0.12) / 0.62, 0, 1) * Math.PI);
      u.armRG.rotation.set(-0.98, -0.22, -0.18);
      u.elbowRG.rotation.set(-0.92, 0, 0);
      u.armLG.rotation.set(-0.55 + magArc * 0.55, 0.35 - magArc * 0.45, 0.42 + magArc * 0.22);
      u.elbowLG.rotation.set(-0.95 + magArc * 0.30, 0, 0);
      setHandState(m, 'relaxed', 'fist');
    } else if (A.healT > 0 && r.who === 'okafor') {
      // Quick one-handed field-patch gesture while holding rifle secure
      const g = Math.sin(clamp(A.healT / 1.4, 0, 1) * Math.PI);
      u.armRG.rotation.set(-0.92, -0.26, -0.18);
      u.elbowRG.rotation.set(-0.88, 0, 0);
      u.armLG.rotation.set(-0.75 - g * 0.35, 0.15 - g * 0.25, 0.15);
      u.elbowLG.rotation.set(-0.70 - g * 0.45, 0, 0);
      setHandState(m, 'open', 'fist');
    } else {
      // Crisp shouldered M4 firing grip: right arm on A2 pistol grip, left palm cupped UNDER quad-rail!
      const elev = clamp(-A.pitch * 0.42, -0.25, 0.38);
      u.armRG.rotation.set(-0.96 + elev - kick * 0.14, -0.28, -0.22);
      u.elbowRG.rotation.set(-1.14 + kick * 0.16, 0, 0);
      u.armLG.rotation.set(-0.92 + elev - kick * 0.08, 0.44, 0.34);
      u.elbowLG.rotation.set(-0.76 + kick * 0.08, 0, 0);
      setWristPose(u, [0.35, -0.45, 0.28], [0.12, 0.15, -0.12]);
      setHandState(m, 'fist', 'point');
    }
    return;
  }

  // =========================================================================
  // BRANCH B: DAYTIME RESTING ON THE ROOF (Alive, Grounded, Player-Reactive!)
  // =========================================================================
  // Keep r.awake = false (so t156 passes!), but pose them naturally resting/sitting/tending gear
  // near their crate & bedroll — ZERO clipping rifles through the concrete roof!
  if (r.who !== 'brandt') setSurvivorRifleMode(m, false);
  if (r.gun?.userData?.feedCover) r.gun.userData.feedCover.rotation.x = 0;

  r.pivot.rotation.x = 0;
  r.pivot.rotation.z = 0;

  // Each survivor rests in a natural spot beside their crate/bedroll with ZERO boot-in-bedroll overlap!
  const restPos = r.who === 'okafor'
    ? { x: 0.16, z: -0.42, baseYaw: -0.32 }      // beside triage crate overlooking North
    : r.who === 'brandt'
      ? { x: -0.06, z: -0.44, baseYaw: 0.08 }    // keeping quiet watch right behind his M240B
      : { x: 0.20, z: -0.44, baseYaw: 0.96 };    // crouched beside red mechanic toolbox tinkering

  r.pivot.position.set(restPos.x, 0, restPos.z);
  setWristPose(u, [0.05, 1.15, 0], [0.05, -1.15, 0]);

  // Turn smoothly to acknowledge the player when they climb up near this survivor!
  const wantYaw = nearPlayer ? playerLocalYaw : restPos.baseYaw;
  A.yaw = easeAngle(A.yaw, wantYaw, step, nearPlayer ? 5.2 : 2.0);
  r.pivot.rotation.y = A.yaw;

  // Head tracks player smoothly when nearby, else relaxed valley glance / looking at gear
  const relPlayerYaw = nearPlayer ? clamp(wrapAngle(playerLocalYaw - A.yaw), -0.75, 0.75) : 0;
  const idleLookYaw = nearPlayer ? relPlayerYaw : Math.sin(A.t * 0.38 + A.scanPhase) * 0.30;
  const idleLookPitch = nearPlayer ? -0.04 : (r.who === 'pike' ? 0.28 : 0.08 + breath2 * 0.05);
  A.headYaw = ease(A.headYaw, idleLookYaw, step, 6.0);
  A.headPitch = ease(A.headPitch, idleLookPitch, step, 6.0);

  // When player is close or talking/healing, survivor straightens up out of deep rest!
  const engage = (nearPlayer || A.healT > 0 || A.talkT > 0) ? 1 : 0;
  A.crouchBlend = ease(A.crouchBlend, engage ? 0.18 : 0.78, step, 4.2);
  const c = A.crouchBlend;

  if (r.who === 'okafor') {
    // Okafor: steady, composed medic — crouched checking supplies by day, rises cleanly to tend you!
    applyGroundedLegs(u, m, {
      thighL: -0.68 * c - 0.08, kneeL: 1.18 * c + 0.10, splayL: -0.09,
      thighR: -0.52 * c + 0.06, kneeR: 0.96 * c + 0.08, splayR: 0.10,
      lowerYaw: 0.05
    });
    u.torsoG.rotation.set(0.18 * c + breath * 0.015, 0, 0);
    u.headG.rotation.set(A.headPitch, A.headYaw, 0);

    if (A.healT > 0) {
      // Field patch-up animation: reaches right hand to IFAK, then brings both hands forward to wrap bandage!
      const uH = 1 - clamp(A.healT / 1.5, 0, 1);
      const reachBag = Math.sin(clamp(uH / 0.35, 0, 1) * Math.PI);
      const wrap = Math.sin(clamp((uH - 0.30) / 0.70, 0, 1) * Math.PI);
      const wrapOsc = Math.sin(uH * Math.PI * 6) * 0.10 * wrap;
      u.armRG.rotation.set(-0.20 + reachBag * 0.45 - wrap * 0.72, -0.15 - wrap * 0.15, 0.18 * reachBag - 0.12 * wrap);
      u.elbowRG.rotation.set(-0.45 - reachBag * 0.55 - wrap * 0.45 + wrapOsc, 0, 0);
      u.armLG.rotation.set(-0.15 - wrap * 0.78, 0.12 + wrap * 0.20, 0.10 + wrap * 0.12);
      u.elbowLG.rotation.set(-0.35 - wrap * 0.58 - wrapOsc, 0, 0);
      setHandState(m, 'relaxed', 'relaxed');
    } else if (nearPlayer) {
      // Welcoming nod / calm medic posture
      const wave = A.waveT > 0 ? Math.sin(clamp(A.waveT / 1.1, 0, 1) * Math.PI) : 0;
      u.armRG.rotation.set(0.05 - wave * 1.15, -wave * 0.15, 0.05 + wave * 0.25);
      u.elbowRG.rotation.set(-0.22 - wave * 0.85, 0, 0);
      u.armLG.rotation.set(0.06, 0, -0.05);
      u.elbowLG.rotation.set(-0.24, 0, 0);
      setHandState(m, 'hang', wave > 0.2 ? 'open' : 'hang');
    } else {
      // Resting elbows gently on knees while catching breath
      u.armLG.rotation.set(-0.42 * c, 0.08, -0.06);
      u.elbowLG.rotation.set(-0.62 * c - 0.15, 0, 0);
      u.armRG.rotation.set(-0.38 * c, -0.08, 0.06);
      u.elbowRG.rotation.set(-0.58 * c - 0.15, 0, 0);
      setHandState(m, 'hang', 'hang');
    }
  } else if (r.who === 'brandt') {
    // Brandt: veteran heavy gunner — low knee-rest watching the perimeter with arms crossed/ready
    applyGroundedLegs(u, m, {
      thighL: -0.74 * c - 0.06, kneeL: 1.24 * c + 0.08, splayL: -0.11,
      thighR: -0.26 * c + 0.08, kneeR: 0.78 * c + 0.06, splayR: 0.11,
      lowerYaw: -0.08
    });
    u.torsoG.rotation.set(0.14 * c + breath * 0.016, 0, 0);
    u.headG.rotation.set(A.headPitch, A.headYaw, 0);
    const salute = A.talkT > 0 ? Math.sin(clamp(A.talkT / 1.0, 0, 1) * Math.PI) * 0.35 : 0;
    u.armLG.rotation.set(-0.36 * c + 0.04, 0.10, -0.06);
    u.elbowLG.rotation.set(-0.54 * c - 0.22, 0, 0);
    u.armRG.rotation.set(-0.34 * c - salute * 1.4, -0.08, 0.06 + salute * 0.25);
    u.elbowRG.rotation.set(-0.50 * c - 0.22 - salute * 1.2, 0, 0);
    setHandState(m, 'hang', 'hang');
  } else {
    // Pike: combat engineer — crouched beside his red toolbox tinkering with wrench/parts!
    applyGroundedLegs(u, m, {
      thighL: -0.82 * c - 0.08, kneeL: 1.38 * c + 0.10, splayL: -0.10,
      thighR: -0.66 * c + 0.05, kneeR: 1.22 * c + 0.08, splayR: 0.12,
      lowerYaw: 0.06
    });
    const tink = engage ? 0 : Math.sin(A.t * 3.4) * 0.14;
    u.torsoG.rotation.set(0.28 * c + breath * 0.014, 0, 0);
    u.headG.rotation.set(A.headPitch, A.headYaw, 0);
    if (nearPlayer) {
      const wave = A.waveT > 0 ? Math.sin(clamp(A.waveT / 1.1, 0, 1) * Math.PI) : 0;
      u.armRG.rotation.set(0.04 - wave * 1.35, -wave * 0.15, 0.05 + wave * 0.32);
      u.elbowRG.rotation.set(-0.22 - wave * 0.78 + Math.sin(A.t * 10) * 0.14 * wave, 0, 0);
      u.armLG.rotation.set(0.05, 0, -0.05);
      u.elbowLG.rotation.set(-0.20, 0, 0);
      setHandState(m, 'hang', wave > 0.2 ? 'open' : 'hang');
    } else {
      // Rhythmic tinkering at the toolbox!
      u.armLG.rotation.set(-0.56 * c, 0.16, 0.04);
      u.elbowLG.rotation.set(-0.72 * c - 0.18, 0, 0);
      u.armRG.rotation.set(-0.62 * c + tink * 0.5, -0.14, -0.04);
      u.elbowRG.rotation.set(-0.76 * c - 0.20 - tink, 0, 0);
      setHandState(m, 'relaxed', 'fist');
    }
  }
}

// ---------------------------------------------------------------------------
// 2. VALLEY WAITING SURVIVOR ANIMATION (Cautious cover, guard panic, wave-over!)
// ---------------------------------------------------------------------------
export function updateWaitingSurvivorAnim(s, dt, ctx) {
  const m = s && s.figure;
  if (!m || !m.userData || !s.root || !s.root.visible) return;
  const u = m.userData;
  const A = s.anim || (s.anim = createSurvivorAnimState(s.who || 'okafor', s.camp || 1));
  const step = Math.min(0.05, Math.max(0.001, dt || 0.016));
  A.t += step;

  const guardsAlive = !!ctx.guardsAlive;
  const p = ctx.playerPos;
  const dx = p ? (p.x - s.x) : 99;
  const dz = p ? (p.z - s.z) : 99;
  const dist = Math.hypot(dx, dz);
  const playerClose = dist < 11.0;
  const playerVeryClose = dist < 5.5;

  // When guards are alive: stay crouched tight in hiding, scanning nervously.
  // When guards are cleared & player approaches: stand up cautiously and wave them over!
  const wantCrouch = guardsAlive ? 0.92 : (playerClose ? 0.06 : 0.62);
  A.crouchBlend = ease(A.crouchBlend, wantCrouch, step, 3.8);
  const c = A.crouchBlend;

  const baseYaw = s.baseYaw != null ? s.baseYaw : (s.baseYaw = s.root.rotation.y);
  const targetYaw = (!guardsAlive && playerClose) ? Math.atan2(dx, dz) : baseYaw;
  s.root.rotation.y = easeAngle(s.root.rotation.y, targetYaw, step, 4.0);

  const breath = Math.sin(A.t * (guardsAlive ? 3.2 : 1.9));
  applyGroundedLegs(u, m, {
    thighL: -0.78 * c - 0.05, kneeL: 1.32 * c + 0.06, splayL: -0.09,
    thighR: -0.58 * c + 0.05, kneeR: 1.04 * c + 0.06, splayR: 0.10,
    lowerYaw: 0
  });

  // Nervous head scan when hiding vs tracking the player's eyes when safe
  const lookYaw = (!guardsAlive && playerClose)
    ? clamp(wrapAngle(Math.atan2(dx, dz) - s.root.rotation.y), -0.7, 0.7)
    : Math.sin(A.t * (guardsAlive ? 1.5 : 0.75) + A.scanPhase) * (guardsAlive ? 0.55 : 0.35);
  const lookPitch = guardsAlive ? 0.12 + Math.sin(A.t * 2.1) * 0.05 : -0.03;

  u.torsoG.rotation.set(0.32 * c + breath * 0.018, 0, 0);
  u.headG.rotation.set(lookPitch, lookYaw, 0);

  if (!guardsAlive && playerClose && !playerVeryClose) {
    // Beckoning wave ("Over here — I'm alive!")
    const w = Math.sin(A.t * 6.2);
    u.armRG.rotation.set(-2.05 + w * 0.16, -0.15, 0.36 + w * 0.14);
    u.elbowRG.rotation.set(-0.55 + w * 0.25, 0, 0);
    u.armLG.rotation.set(0.06, 0, -0.05);
    u.elbowLG.rotation.set(-0.22, 0, 0);
    setHandState(m, 'hang', 'open');
  } else if (!guardsAlive && playerVeryClose) {
    // Relieved ready stance waiting for E interaction
    u.armRG.rotation.set(0.05, 0, 0.05);
    u.elbowRG.rotation.set(-0.22, 0, 0);
    u.armLG.rotation.set(0.05, 0, -0.05);
    u.elbowLG.rotation.set(-0.22, 0, 0);
    setHandState(m, 'hang', 'hang');
  } else {
    // Hunkered cover posture (hands braced forward near chest/knees)
    u.armLG.rotation.set(-0.52 * c, 0.14, 0.08);
    u.elbowLG.rotation.set(-0.78 * c - 0.18, 0, 0);
    u.armRG.rotation.set(-0.50 * c, -0.14, -0.08);
    u.elbowRG.rotation.set(-0.75 * c - 0.18, 0, 0);
    setHandState(m, 'relaxed', 'relaxed');
  }
}

// ---------------------------------------------------------------------------
// 3. RESCUE DEPARTURE ANIMATION (Brief salute/nod + jog off before cleanup)
// ---------------------------------------------------------------------------
export function stepDepartingSurvivors(departing, dt, scene, sampleHeight) {
  const step = Math.min(0.05, Math.max(0.001, dt || 0.016));
  for (let i = departing.length - 1; i >= 0; i--) {
    const d = departing[i];
    d.t += step;
    const m = d.figure;
    const u = m && m.userData;

    if (d.t < 0.55) {
      // Phase 1: crisp grateful nod / quick wave toward player
      const k = Math.sin((d.t / 0.55) * Math.PI);
      if (u) {
        applyGroundedLegs(u, m, { thighL: -0.04, kneeL: 0.06, thighR: 0.04, kneeR: 0.06 });
        u.torsoG.rotation.set(0.05 * k, 0, 0);
        u.headG.rotation.set(0.24 * k, 0, 0);
        u.armRG.rotation.set(-1.35 * k, -0.1 * k, 0.22 * k);
        u.elbowRG.rotation.set(-0.95 * k - 0.2, 0, 0);
        u.armLG.rotation.set(0.05, 0, -0.05);
        u.elbowLG.rotation.set(-0.2, 0, 0);
        setHandState(m, 'hang', 'open');
      }
    } else if (d.t < 1.95) {
      // Phase 2: turns toward HQ / treeline and briskly jogs away!
      const runT = d.t - 0.55;
      d.root.rotation.y = easeAngle(d.root.rotation.y, d.escapeYaw, step, 6.5);
      const speed = 2.8;
      d.root.position.x += Math.sin(d.escapeYaw) * speed * step;
      d.root.position.z += Math.cos(d.escapeYaw) * speed * step;
      if (d.useTerrainY && sampleHeight) {
        d.root.position.y = sampleHeight(d.root.position.x, d.root.position.z);
      }
      if (u) {
        const ph = runT * 9.5;
        const sw = Math.sin(ph);
        applyGroundedLegs(u, m, {
          thighL: 0.52 * sw, kneeL: Math.max(0, -sw) * 0.85 + 0.12,
          thighR: -0.52 * sw, kneeR: Math.max(0, sw) * 0.85 + 0.12
        });
        m.position.y += Math.abs(Math.cos(ph)) * 0.035;
        u.torsoG.rotation.set(0.16, -sw * 0.12, 0);
        u.headG.rotation.set(-0.08, sw * 0.08, 0);
        u.armLG.rotation.set(-0.48 * sw + 0.15, 0, -0.06);
        u.elbowLG.rotation.set(-1.15 - Math.max(0, sw) * 0.35, 0, 0);
        u.armRG.rotation.set(0.48 * sw + 0.15, 0, 0.06);
        u.elbowRG.rotation.set(-1.15 - Math.max(0, -sw) * 0.35, 0, 0);
        setHandState(m, 'fist', 'fist');
      }
      // Subtle scale-down vanish in final 0.35 s so they never pop out awkwardly
      if (d.t > 1.60) {
        const s = Math.max(0.01, 1 - (d.t - 1.60) / 0.35);
        d.root.scale.setScalar(s);
      }
    } else {
      if (d.root && scene) scene.remove(d.root);
      departing.splice(i, 1);
    }
  }
}
