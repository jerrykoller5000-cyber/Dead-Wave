// GB-149 probe (page side): drive his aim and keys frame by frame on a manual clock (60 fps) and measure the twist
// between his shoulders (torsoG) and his hips (lowerBody), and the feet, in world yaw.
(() => {
  const T = window.TT, THREE = T.THREE;
  const m = T.getMarine(), ud = m.userData;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const fwd = new THREE.Vector3();
  const yawOf = (o) => { fwd.set(0, 0, 1).transformDirection(o.matrixWorld); return Math.atan2(fwd.x, fwd.z); };
  // Manual clock: performance.now and requestAnimationFrame are ours from here on.
  if (!window.__ft) {
    const real = performance.now.bind(performance);
    window.__ft = real(); window.__q = [];
    performance.now = () => window.__ft;
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    window.cancelAnimationFrame = () => {};
    clearInterval(window.__pin);
  }
  const S = window.__S;
  const p = T.localPlayer ? T.localPlayer.position : T.player.position;
  let aimYaw = 0;
  const pinAim = () => { p.x = S.x; p.z = S.z; T.aimTarget.set(S.x + Math.sin(aimYaw) * 30, S.y + 1.25, S.z + Math.cos(aimYaw) * 30); T.setAimYawDbg(aimYaw); };
  window.__step = (n = 1) => { for (let i = 0; i < n; i++) { pinAim(); window.__ft += 1000 / 60; const q = window.__q; window.__q = []; for (const cb of q) cb(window.__ft); } };
  window.__setAim = (y) => { aimYaw = y; };
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const sample = () => {
    m.updateMatrixWorld(true);
    const chest = yawOf(ud.torsoG), hips = yawOf(ud.lowerBody);
    const feet = wrap(yawOf(ud.ankleLG) + wrap(yawOf(ud.ankleRG) - yawOf(ud.ankleLG)) / 2);
    const gap = Math.abs(wrap(yawOf(ud.ankleLG) - yawOf(ud.ankleRG)));
    return { chest, hips, feet, gap, twist: wrap(chest - hips), hipFeet: wrap(hips - feet) };
  };
  // scn: { weapon, keys: [codes], settle: s, turn: { from, to, rate (rad/s, Infinity = snap) }, hold: s after the turn ends }
  window.__twist = async (scn) => {
    if (scn.weapon) for (let i = 0; i < 16 && T.getCurrentWeapon() !== scn.weapon; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(scn.weapon)); window.__step(10); }
    if (scn.crouch && T.setCrouchDbg) T.setCrouchDbg(true);
    aimYaw = scn.turn.from; window.__step(Math.round((scn.preSettle || 1.5) * 60));
    for (const k of scn.keys || []) key(k, true);
    window.__step(Math.round((scn.settle || 0.8) * 60));
    const rest = []; for (let i = 0; i < 12; i++) { window.__step(1); rest.push(sample().twist); }
    const restTwist = rest.reduce((a, b) => a + b, 0) / rest.length;
    const { from, to, rate } = scn.turn, total = to - from, dur = rate === Infinity ? 0 : Math.abs(total) / rate;
    const rows = []; let maxGap = 0, gapAt = null; let f = 0, maxTwist = 0, maxDev = 0, maxHipFeet = 0, last = 0, endF = Math.ceil(dur * 60);
    const holdF = Math.round((scn.hold || 1.5) * 60);
    for (; f <= endF + holdF; f++) {
      const t = f / 60;
      aimYaw = from + (dur ? Math.sign(total) * Math.min(Math.abs(total), rate * t) : total);
      window.__step(1);
      const s = sample(), dev = wrap(s.twist - restTwist);
      maxTwist = Math.max(maxTwist, Math.abs(s.twist)); maxDev = Math.max(maxDev, Math.abs(dev)); maxHipFeet = Math.max(maxHipFeet, Math.abs(s.hipFeet));
      if (s.gap > maxGap) { maxGap = s.gap; gapAt = { f, turn: ud.turn ? { active: ud.turn.active, swing: ud.turn.swing, steps: ud.turn.steps, yaw: +(ud.turn.yaw||0).toFixed(2) } : null }; }
      if (Math.abs(dev) > 0.1) last = f;
      if (f % 3 === 0) rows.push([+t.toFixed(3), +(s.twist * 57.3).toFixed(1), +(s.hipFeet * 57.3).toFixed(1)]);
    }
    for (const k of scn.keys || []) key(k, false);
    if (scn.crouch && T.setCrouchDbg) T.setCrouchDbg(false);
    window.__step(30);
    return { name: scn.name, restDeg: +(restTwist * 57.3).toFixed(1), maxTwistDeg: +(maxTwist * 57.3).toFixed(1), maxDevDeg: +(maxDev * 57.3).toFixed(1),
      maxHipFeetDeg: +(maxHipFeet * 57.3).toFixed(1), maxFeetGapDeg: +(maxGap * 57.3).toFixed(1), gapAt, turnS: +dur.toFixed(2), catchUpS: +Math.max(0, (last + 1) / 60 - dur).toFixed(2), steps: ud.turn ? ud.turn.steps : null, rows };
  };
})();
