// t226 - GB-149 (Jerry, 2026-10-09: "the top half of the players body moves faster than his legs can keep up on rotation.
// I need them to synch up a little more so it does not look like the top half of the player is twisting way beyond what
// would be realistic. In essence the legs need to keep up more with the top half").
//  - His shoulders (torsoG) never turn more than 55 degrees (TWIST cap 0.96 rad, + 1 degree of slack) past his hips
//    (lowerBody): standing turns at 90 and 360 deg/s, snap 180s both ways, a pistol, crouched, walking and running while
//    turning, strafing with a rifle (it was 105 degrees), and while firing. It used to reach 180 on a snap.
//  - The legs catch up: after the turn stops the twist is back within 10 degrees of where it rests in under 0.45 s (a
//    snap 180 took 0.55 s with a rifle and 1.5 s with a pistol).
//  - Standing, the feet still step round (the turn steps count up) and the thighs never cross: the two boots stay within
//    100 degrees of each other (a step is at most 90; ~6 more shows at 20 fps while a pivot lands; it was 156 before the
//    GB-149 step fixes).
//  - The aim is untouched: after each turn the player faces exactly the aim yaw.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const D = 180 / Math.PI, CAP = 0.96, SLACK = 1 / D, FEET = 100 / D;
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Twist');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const m = T.getMarine(), ud = m.userData;
    const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
    const sim = () => T.getSimTime();
    const simWait = async (s) => { const t0 = sim(), w0 = Date.now(); while (sim() - t0 < s && Date.now() - w0 < 20000) await wait(4); };
    const twistNow = () => wrap(ud.torsoG.rotation.y - ud.lowerBody.rotation.y);
    const take = async (w) => { for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await simWait(1.2); };
    const P = T.localPlayer || T.player, p = P.position, home = p.clone();
    // One measured turn: the aim goes from `from` by `by` radians at `rate` rad/s (Infinity: in one go), sampled every few ms.
    async function turn(name, o) {
      p.copy(home); T.setAimYawDbg(o.from || 0); await take(o.weapon);
      for (const k of o.keys || []) key(k, true);
      if (o.fire) T.setMouseFireDbg(true);
      await simWait(o.settle || 0.8);
      let rest = 0; for (let i = 0; i < 8; i++) { rest += twistNow() / 8; await wait(6); }
      const t0 = sim(), dur = o.rate === Infinity ? 0 : Math.abs(o.by) / o.rate;
      let max = 0, last = 0, aimOff = 0, feet = 0; const st0 = ud.turn ? ud.turn.steps || 0 : 0; let steps = 0, gapAt = '';
      while (sim() - t0 < dur + (o.hold || 1.2)) {
        const t = sim() - t0, a = (o.from || 0) + (dur ? Math.sign(o.by) * Math.min(Math.abs(o.by), o.rate * t) : o.by);
        T.setAimYawDbg(a);
        await wait(4);
        const tw = twistNow(); max = Math.max(max, Math.abs(tw));
        if (Math.abs(wrap(tw - rest)) > 10 / D) last = sim() - t0;
        if (ud.turn && ud.turn.active) { steps = Math.max(steps, (ud.turn.steps || 0)); }
        const f = ud.turn && ud.turn.active ? ud.turn : null;
        if (f && ud.ankleLG && ud.ankleRG) { const yw = (a) => { const v = new T.THREE.Vector3(0, 0, 1).applyQuaternion(a.getWorldQuaternion(new T.THREE.Quaternion())); return Math.atan2(v.x, v.z); }; const g = Math.abs(wrap(yw(ud.ankleLG) - yw(ud.ankleRG))); if (g > feet) { feet = g; gapAt = ' t' + (sim() - t0).toFixed(3) + ' sw' + f.swing + ' st' + f.steps + ' L' + (yw(ud.ankleLG) * D).toFixed(0) + ' R' + (yw(ud.ankleRG) * D).toFixed(0) + ' y' + (f.yaw * D).toFixed(0) + ' hl' + ((f.hipLead || 0) * D).toFixed(0); } }
      }
      aimOff = Math.abs(wrap(P.rotation.y - ((o.from || 0) + o.by)));
      if (o.fire) T.setMouseFireDbg(false);
      for (const k of o.keys || []) key(k, false);
      const catchUp = Math.max(0, last - dur);
      ok(max <= CAP + SLACK, name + ': shoulders past hips at most ' + (max * D).toFixed(1) + ' deg (cap ' + (CAP * D).toFixed(0) + ')');
      if (o.catchUp) ok(catchUp <= o.catchUp, name + ': legs back within 10 deg of rest ' + catchUp.toFixed(2) + ' s after the turn (at most ' + o.catchUp + ')');
      if (o.standing) ok(feet <= FEET, name + ': the feet stay within 100 deg of each other, never crossed (' + (feet * D).toFixed(0) + gapAt + ')');
      ok(aimOff < 1e-6, name + ': the facing is the aim (' + (aimOff * D).toFixed(4) + ' deg off)');
      await simWait(0.6);
      return { max, catchUp, steps };
    }
    const R = (deg) => deg / D;
    const s1 = await turn('stand m4 90 deg/s x180', { weapon: 'm4', by: Math.PI, rate: R(90), catchUp: 0.45, standing: true });
    const s2 = await turn('stand m4 360 deg/s x360', { weapon: 'm4', by: 2 * Math.PI, rate: R(360), catchUp: 0.45, standing: true });
    await turn('stand m4 snap 180', { weapon: 'm4', by: Math.PI - 0.01, rate: Infinity, catchUp: 0.45, standing: true });
    await turn('stand m4 snap 180 the other way', { weapon: 'm4', by: -Math.PI + 0.01, rate: Infinity, catchUp: 0.45, standing: true });
    await turn('stand pistol snap 180', { weapon: 'pistol', by: Math.PI - 0.01, rate: Infinity, catchUp: 0.45, standing: true });
    await turn('crouched m4 snap 180', { weapon: 'm4', keys: ['KeyC'], by: Math.PI - 0.01, rate: Infinity, catchUp: 0.6, settle: 1.2, standing: true });
    await turn('m4 firing, 360 deg/s', { weapon: 'm4', fire: true, by: 2 * Math.PI, rate: R(360) });
    await turn('m4 strafing right, aim held', { weapon: 'm4', keys: ['KeyD'], by: 0, rate: 1, hold: 1 });
    await turn('m4 strafing left, aim held', { weapon: 'm4', keys: ['KeyA'], by: 0, rate: 1, hold: 1 });
    await turn('m4 walking, 180 deg/s x360', { weapon: 'm4', keys: ['KeyW'], by: 2 * Math.PI, rate: R(180) });
    await turn('m4 running, 360 deg/s x360', { weapon: 'm4', keys: ['KeyW', 'ShiftLeft'], by: 2 * Math.PI, rate: R(360) });
    await turn('pistol strafing right, snap 180', { weapon: 'pistol', keys: ['KeyD'], by: Math.PI - 0.01, rate: Infinity });
    ok(s1.steps > 0 && s2.steps > 0, 'standing, the feet still step round (' + s1.steps + ', ' + s2.steps + ' steps)');
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'F13', key: 'F13', bubbles: true }));
    // The 'contains' on 'Node' TypeError is a known page error outside the pose code (seen on every real-renderer page too).
  const bad = errs.filter((m) => !/contains' on 'Node'/.test(m));
  ok(bad.length === 0, 'no errors' + (bad.length ? ': ' + bad[0] : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
