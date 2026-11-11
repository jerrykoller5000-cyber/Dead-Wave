// tcb291 - CB-291 (J127, Jerry 10 Nov, standing, D-139; AGENTS.md rule 25): no part of the player's body bends or turns in a
// way a body can't, unless he is dead or it is named in the limits table. Third person, every gun class and the bare hands,
// standing, walking, running, sprinting, crouched, crouch-walking, jumping, aimed, reloading, swinging the blade and holding a
// grenade to throw: every joint of the body read from the rig itself, frame by frame, against core/body-limits.js:
// the neck and the spine (against the hips), each shoulder and hip, each knee (never backwards, at most 150 deg), each ankle,
// each elbow and wrist (CB-289's); the shoulder read in the torso's space, its turn from the hinge (core/body-limits.js shoulderAngles). Death is left out. The worst five are printed as INFO for the before/after pictures.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const deg = (r) => (r * 180 / Math.PI).toFixed(0);
  try {
    const BL = await import('/core/body-limits.js');
    const { BODY_LIMITS: L, limbAngles, trunkAngles, hingeAngle, outside, wristInside, ARM_LIMITS, shoulderAngles } = BL;
    await startMatch(T, 'CB291');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    const M = T.getMarine(), ud = M.userData, THREE = T.THREE || window.THREE;
    const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    const rel = (child, parent) => { child.getWorldQuaternion(qa); parent.getWorldQuaternion(qb); return q.copy(qb).invert().multiply(qa); };
    const bad = [], worst = [];
    const counts = {}, axes = {};
    let samples = 0;
    const FOREGRIP = new Set(['shotgun', 'launcher', 'flamer', 'minigun']);
    const check = (tag, joint, reading, row, gun) => {
      const o = outside(row, reading, 0.02);
      let over = 0;
      for (const k of Object.keys(row)) { const v = reading[k]; if (v == null) continue; over = Math.max(over, row[k][0] - v, v - row[k][1]); }
      worst.push({ tag: tag + ' ' + joint, over, reading });
      for (const k of o) { const key = joint.replace(/[RL]$/, '') + '.' + k + (reading[k] < row[k][0] ? '<' : '>'); axes[key] = axes[key] || { n: 0, worst: 0, at: '' }; axes[key].n++; const past = Math.max(row[k][0] - reading[k], reading[k] - row[k][1]); if (past > axes[key].worst) { axes[key].worst = past; axes[key].at = tag; } }
      if (o.length) { counts[joint] = (counts[joint] || 0) + 1; if (bad.length < 400) bad.push(tag + ' ' + joint + ' ' + o.map((k) => k + ' ' + deg(reading[k])).join(' ')); }
    };
    const sample = (gun, stance) => {
      samples++;
      const tag = gun + ' ' + stance;
      const lower = ud.lowerBody, torso = ud.torsoG, head = ud.headG;
      if (torso && lower) check(tag, 'spine', trunkAngles(rel(torso, lower)), L.spine);
      if (head && torso) check(tag, 'neck', trunkAngles(rel(head, head.parent)), L.neck);
      for (const [k, side, arm, leg] of [['R', 1, ud.armRG, ud.legRG], ['L', -1, ud.armLG, ud.legLG]]) {
        if (arm && torso) {   // CB-291: read in the torso's space, the turn from the hinge (where the elbow points: the arm's +x)
          const ps = torso.worldToLocal(arm.getWorldPosition(new THREE.Vector3())), el = k === 'R' ? ud.elbowRG : ud.elbowLG;
          const pe = torso.worldToLocal(el.getWorldPosition(new THREE.Vector3()));
          const hq = rel(arm, torso), h = new THREE.Vector3(1, 0, 0).applyQuaternion(hq);
          const a = shoulderAngles([pe.x - ps.x, pe.y - ps.y, pe.z - ps.z], [h.x, h.y, h.z], side);
          check(tag, 'shoulder' + k, { back: a.back, across: a.across, turn: a.turn }, L.shoulder);
        }
        if (leg) {
          check(tag, 'hip' + k, limbAngles(leg.quaternion, side), L.hip);
          const kn = leg.userData.knee, an = leg.userData.ankle;
          if (kn) check(tag, 'knee' + k, { bend: hingeAngle(kn.quaternion) }, L.knee);
          if (an) { const a = trunkAngles(an.quaternion); check(tag, 'ankle' + k, { flex: a.flex, side: a.side }, L.ankle); }
        }
        const e = k === 'R' ? ud.elbowRG : ud.elbowLG, wr = e && e.userData.wrist;
        if (wr) {
          const roll = (T.handsDbg && T.handsDbg.roll()) || {}, r = k === 'R' ? roll.r : roll.l;
          const ex = k === 'L' && FOREGRIP.has(gun) && !(T.isReloading && T.isReloading()) ? 'support-foregrip' : null;
          const w = wristInside(wr.quaternion, side, -(r || 0), ex, 0.02);
          if (!w.ok) { counts['wrist' + k] = (counts['wrist' + k] || 0) + 1; if (bad.length < 400) bad.push(tag + ' wrist' + k + ' ellipse ' + w.over.toFixed(2)); }
        }
      }
    };
    const watch = async (gun, stance, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { sample(gun, stance); await wait(80); } };
    const take = async (w) => {
      if (w === 'hands') { if (!(T.isUnarmed && T.isUnarmed()) && T.toggleHolster) T.toggleHolster(); await wait(500); return T.isUnarmed && T.isUnarmed(); }
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(120); }
      await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(300); return T.getCurrentWeapon() === w;
    };
    const p0 = { x: T.player.position.x, z: T.player.position.z };
    const home = () => { T.player.position.x = p0.x; T.player.position.z = p0.z; };
    const classes = ['hands', 'pistol', 'uzi', 'm4', 'shotgun', 'sniper', 'aa12', 'launcher', 'minigun', 'flamer', 'chainsaw'];
    for (const gun of classes) {
      if (!(await take(gun))) { info(gun + ' not in hand, skipped'); continue; }
      home();
      await watch(gun, 'standing', 400);
      key('KeyW', true); await wait(300); await watch(gun, 'walking', 500); key('KeyW', false); home();
      key('ShiftLeft', true); key('KeyW', true); await wait(400); await watch(gun, 'sprinting', 600); key('KeyW', false); key('ShiftLeft', false); home(); await wait(300);
      key('KeyC', true); await wait(500); await watch(gun, 'crouched', 400);
      key('KeyW', true); await wait(300); await watch(gun, 'crouch-walking', 500); key('KeyW', false); key('KeyC', false); home(); await wait(400);
      key('Space', true); await wait(60); key('Space', false); await watch(gun, 'jumping', 700); await wait(300);
      if (gun !== 'hands') { T.setZoomHeldDbg && T.setZoomHeldDbg(true); await wait(400); await watch(gun, 'aimed', 400); T.setZoomHeldDbg && T.setZoomHeldDbg(false); await wait(250); }
      if (gun !== 'hands' && gun !== 'chainsaw' && T.startReload) { T.setAmmoDbg && T.setAmmoDbg(gun, 0); T.startReload(); await wait(120); const t0 = Date.now(); while (Date.now() - t0 < 5000 && T.isReloading && T.isReloading()) { sample(gun, 'reload'); await wait(90); } }
      if (gun === 'pistol' || gun === 'hands') { key('KeyF', true); await wait(40); key('KeyF', false); await watch(gun, 'blade', 600); await wait(300); }
      if (gun === 'm4') { key('KeyG', true); await watch(gun, 'grenade held', 600); key('KeyG', false); await watch(gun, 'grenade thrown', 600); }
      home();
    }
    if (T.armLimitsDbg) { const h = T.armLimitsDbg().hits; info('the arm IK held the shoulder ' + (h.shoulder || 0) + ' times (' + (h.shoulderShort || 0) + ' with no swing inside the table: the least bad kept)'); }
    if (T.bodyLimitsDbg) info('held after the pose: ' + JSON.stringify(T.bodyLimitsDbg().hits));
    ok(samples > 300, samples + ' body samples over ' + classes.length + ' hands and gun classes');
    const byJoint = Object.entries(counts).map(([k, n]) => k + ' ' + n).join(', ');
    ok(!bad.length, 'every joint inside the table' + (bad.length ? ' (outside: ' + byJoint + '); first: ' + bad.slice(0, 10).join(' | ') : ''));
    for (const [k, v] of Object.entries(axes).sort((a, b) => b[1].n - a[1].n)) info('axis ' + k + ': ' + v.n + ' samples, worst ' + deg(v.worst) + ' deg past at ' + v.at);
    worst.sort((a, b) => b.over - a.over);
    const seen = new Set();
    for (const w of worst) { if (seen.size >= 5) break; const k = w.tag.split(' ').slice(-1)[0] + w.tag.split(' ')[0]; if (seen.has(k) || w.over <= 0) continue; seen.add(k); info('worst: ' + w.tag + ' ' + deg(w.over) + ' deg past (' + Object.entries(w.reading).map(([a, b]) => a + ' ' + deg(b)).join(', ') + ')'); }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { for (const k of ['KeyW', 'ShiftLeft', 'KeyC', 'KeyG']) try { key(k, false); } catch (_) {} }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
