// GB-167 (Jerry, 2026-10-13): "The X button to switch between semi and full auto needs a little click sound. Also a
// small little thumb animation for each weapon that has both semi and full auto." The firing hand's thumb reaches up
// to the selector, rocks it over and comes back in SELECTOR_FLICK.dur s. Visual only: it adds to the hand pose after
// the grip has been worked out, never touches the fire timing, and drops out the moment the gun changes.
export const SELECTOR_FLICK = Object.freeze({ dur: 0.3, reach: 0.85, swing: 0.55, roll: 0.6 });
// Contact on the visible end of each model's moving tab, in its pivot's local coordinates.
export const WORLD_SELECTOR_TOUCH = Object.freeze({
  ak: [0.00498, -0.01608, 0.14398], m4: [-0.002, -0.016, 0.026],
  aa12: [-0.00224, -0.00281, 0.02293], pistol: [-0.007, 0, 0.017]
});
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };
const travel = phase => smooth((phase - 0.30) / 0.32);
export const selectorReach = (phase, start = 0) => phase < 0 ? 0 :
  (start + (1-start)*smooth(phase/0.30)) * (1-smooth((phase-0.78)/0.22));

export function createSelectorFlick(now = () => performance.now() / 1000) {
  const st = { weapon: null, t0: -1, mode: null, count: 0, hold: null, from: 0, reachFrom: 0, waiting: false };   // hold: a fixed phase, for shots
  return {
    state: st,
    start(weapon, dual, mode) {
      if (!dual) return false;
      const same = st.weapon === weapon, prior = same ? this.phase(weapon) : -1;
      st.from = same && (prior >= 0 || st.waiting) ? this.turn(prior, st.mode) : Number(mode !== 'auto');
      st.reachFrom = selectorReach(prior, st.reachFrom);
      st.weapon = weapon; st.t0 = now(); st.mode = mode; st.waiting = false; st.count++; return true;
    },
    cancel() { st.weapon = null; st.t0 = -1; st.waiting = false; },
    available(weapon, free) {
      if (st.weapon !== weapon) return;
      if (!free && !st.waiting) {
        const p = this.phase(weapon);
        if (p >= 0) { st.from = this.turn(p, st.mode); st.reachFrom = 0; st.waiting = true; }
      } else if (free && st.waiting) { st.t0 = now(); st.waiting = false; }
    },
    turn(phase, mode) {
      const to = Number(mode === 'auto');
      return st.waiting ? st.from : phase < 0 ? to : st.from + (to - st.from) * travel(phase);
    },
    // 0..1 through the flick for this gun, or -1 when none is running.
    phase(weapon) {
      if (st.waiting && st.weapon === weapon) return -1;
      if (st.hold != null && st.weapon === weapon) return st.hold;
      if (st.weapon == null || st.t0 < 0) return -1;
      if (weapon !== st.weapon) { this.cancel(); return -1; }
      const p = (now() - st.t0) / SELECTOR_FLICK.dur;
      if (p >= 1 || p < 0) { this.cancel(); return -1; }
      return p;
    },
    // Adds the flick to a hand pose's thumb (t: [curl, swing, tip]) in place.
    apply(pose, weapon) {
      const p = this.phase(weapon);
      if (p < 0 || !pose || !pose.t) return p;
      const reach = Math.sin(Math.PI * Math.min(1, p / 0.85));            // out, then home
      const rock = Math.max(0, Math.sin(Math.PI * (p - 0.3) / 0.4)) * (p > 0.3 && p < 0.7 ? 1 : 0);   // the push on the lever
      pose.t[0] -= SELECTOR_FLICK.reach * reach;
      pose.t[1] += SELECTOR_FLICK.swing * reach;
      pose.t[2] += SELECTOR_FLICK.roll * rock * (st.mode === 'auto' ? 1 : -0.6);
      return p;
    }
  };
}

// Pose the avatar and its held artwork only for the world draw. Restore the simulation's arm,
// gun mount and authored switch transform before the viewmodel reads its source again.
export function createWorldSelector(T, { controls, poses, copyPose, solveArm }) {
  const vec = () => new T.Vector3(), quat = () => new T.Quaternion();
  const target = vec(), tip = vec(), pole = vec(), local = vec(), xAxis = vec().set(1,0,0);
  const rotation = quat(), mountLocal = new T.Matrix4(), parts = new WeakMap();
  const handState = () => ({
    armQ: quat(), elbowQ: quat(), wristQ: quat(), ikQ: quat(), partQ: quat(),
    mountQ: quat(), mountP: vec(), mountS: vec(), mountWorld: new T.Matrix4(), posed: false
  });
  const hands = [handState(), handState()];

  function show(gun, key, left, paired, elbow, mount, turn, reach) {
    const row = controls[key]?.selector, grip = poses[key]?.selector;
    if (!gun || !row || !grip) return;
    let part = parts.get(gun);
    if (!part) {
      part = gun.getObjectByName(gun.userData.controls?.selector);
      if (!part) return;
      parts.set(gun, part);
    }
    const s = hands[left ? 1 : 0], angle = row.turns.semi + (row.turns.auto - row.turns.semi) * turn;
    s.part = part; s.visible = part.visible; s.partQ.copy(part.quaternion);
    part.visible = true;
    part.quaternion.premultiply(rotation.setFromAxisAngle(xAxis, angle));
    const wrist = elbow?.userData.wrist, rig = wrist?.userData.hand;
    const fit = paired ? grip.pair?.[left ? 'l' : 'r'] : grip;
    if (!rig || !fit || reach <= 0) return;
    const arm = elbow.parent;
    s.posed = true; s.rig = rig; s.arm = arm; s.elbow = elbow; s.wrist = wrist; s.mount = mount;
    s.armQ.copy(arm.quaternion); s.elbowQ.copy(elbow.quaternion);
    s.wristQ.copy(wrist.quaternion); s.ikFrame = arm.userData.cb291Ik;
    if (arm.userData.cb291Q) s.ikQ.copy(arm.userData.cb291Q);
    s.mountP.copy(mount.position); s.mountQ.copy(mount.quaternion); s.mountS.copy(mount.scale);
    mount.updateWorldMatrix(true,false); s.mountWorld.copy(mount.matrixWorld);
    s.basePose = copyPose(rig.pose, s.basePose); s.pose = copyPose(rig.pose, s.pose);
    const digit = grip.digit || 'thumb', dst = digit === 'index' ? s.pose.f[0] : s.pose.t;
    const at = fit.at || grip.at;
    let i = 0;
    while (i + 2 < at.length && angle > at[i + 1]) i++;
    const k = Math.max(0, Math.min(1, (angle - at[i]) / (at[i + 1] - at[i])));
    for (let j = 0; j < dst.length; j++) {
      const contactPose = fit.v[i][j] + (fit.v[i + 1][j] - fit.v[i][j]) * k;
      dst[j] += (contactPose - dst[j]) * reach;
    }
    rig.set(s.pose).update();
    target.fromArray(WORLD_SELECTOR_TOUCH[key]);
    if (left) target.x *= -1;
    part.localToWorld(target);
    rig.skins[0].mesh.localToWorld(rig.point(digit+'Tip',tip));
    // The tip is an ordinary two-bone IK end point in elbow space. Keep the same
    // elbow plane as the current hold, and keep the held prop at its pre-reach pose.
    elbow.worldToLocal(local.copy(tip));
    arm.parent.worldToLocal(elbow.getWorldPosition(pole)).sub(arm.position);
    solveArm(arm,elbow,local,target,pole,reach);
    // The general IK solver relaxes the wrist. The fingertip target above includes
    // its fitted rotation already, so retain that rotation on the solved forearm.
    wrist.quaternion.copy(s.wristQ);
    mount.parent.updateWorldMatrix(true,false);
    mountLocal.copy(mount.parent.matrixWorld).invert().multiply(s.mountWorld)
      .decompose(mount.position,mount.quaternion,mount.scale);
  }
  function restore() {
    for (const s of hands) {
      if (!s.part) continue;
      s.part.quaternion.copy(s.partQ); s.part.visible = s.visible;
      if (s.posed) {
        s.arm.quaternion.copy(s.armQ); s.elbow.quaternion.copy(s.elbowQ);
        s.wrist.quaternion.copy(s.wristQ); s.arm.userData.cb291Ik = s.ikFrame;
        if (s.arm.userData.cb291Q) s.arm.userData.cb291Q.copy(s.ikQ);
        s.mount.position.copy(s.mountP); s.mount.quaternion.copy(s.mountQ); s.mount.scale.copy(s.mountS);
        s.rig.set(s.basePose).update(); s.posed = false;
      }
      s.part = null;
    }
  }
  return {show,restore};
}
