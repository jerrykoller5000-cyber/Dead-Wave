// t195 - CL-122 (GB-130, GP-128): the hands.
//  - The support anchor is inside the support arm's reach for every two-handed gun (the flamer's front grip was 2.6 cm
//    past it, the Uzi's 1.2): the gun slides toward that shoulder, and its barrel is still on the reticle.
//  - The forearm rolls onto the grip: the fist's channel within 45 degrees of the grip on the gun hand, and of the
//    forend on the support hand, for the m4 and the pistol, closer than without the roll (needs the arm IK: SKIP on
//    the test page, whose Matrix4.transpose is a stub; the real renderer measures it, see the handoff).
//  - The draw reaches for the stowed gun itself: held at the end of the reach, the hand's target is on the gun's fitted
//    copy (its grip, or for a rifle slung muzzle-up its handguard), not the table's point.
//  - The knife arm swings: held at the cut, the left hand's target is out in front of his chest.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const ikWorks = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const handOk = (c, m) => out.push(ikWorks ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page Matrix4.transpose is a stub, arm IK inert) ' + m);
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await wait(300);   // the draw starts on the next frame
    await new Promise((r) => { const t0 = Date.now(); const f = () => (T.getCurrentWeapon() === w && !T.drawDbg().active) || Date.now() - t0 > 6000 ? r() : setTimeout(f, 50); f(); });
    await wait(1500);
    return T.getCurrentWeapon() === w;
  };
  let aimer = null;
  try {
    await startMatch(T, 'Hands');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
    aimer = setInterval(pin, 5); pin();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const D = T.handsDbg, H = D && D.HANDS, ud = (T.marine || window.worldMarine).userData;
    ok(!!(D && H && H.rollMax > 0.5 && H.rollMax < 1.2 && H.reachL > 0.5 && H.reachL < 0.6), 'TT.handsDbg is exported (roll cap ' + (H && H.rollMax) + ' rad, support reach ' + (H && H.reachL.toFixed(3)) + ' m)');
    const holds = T.getShoulderDbg().holds;
    // Reach and aim.
    for (const w of ['flamer', 'uzi', 'chainsaw']) {
      if (!(await take(w))) { ok(false, w + ': in hand'); continue; }
      const gun = T.weaponMeshes[w], h = holds[w];
      T.marine.updateMatrixWorld(true);
      const fore = gun.localToWorld(V(...h.fore)), sh = ud.armLG.getWorldPosition(V());
      ok(fore.distanceTo(sh) <= H.reachL + 0.002, w + ': the support anchor within the support arm\'s reach (' + fore.distanceTo(sh).toFixed(3) + ' m, reach ' + H.reachL.toFixed(3) + ')');
      if (w !== 'chainsaw') {
        const fwd = V(0, 0, 1).transformDirection(gun.matrixWorld), muz = gun.localToWorld(gun.userData.muzzleLocal.clone());
        const err = Math.acos(Math.max(-1, Math.min(1, fwd.dot(V().subVectors(T.aimTarget, muz).normalize())))) * 180 / Math.PI;
        ok(err < 2.5, w + ': the barrel still on the reticle (' + err.toFixed(2) + ' deg)');
      }
    }
    // The roll (the real renderer).
    const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180 / Math.PI;
    for (const w of ['m4', 'pistol']) {
      if (!(await take(w))) { ok(false, w + ': in hand'); continue; }
      const gq = T.weaponMeshes[w].getWorldQuaternion(new THREE.Quaternion());
      const meas = () => {
        T.marine.updateMatrixWorld(true);
        const chR = V(1, 0, 0).applyQuaternion(ud.elbowRG.getWorldQuaternion(new THREE.Quaternion())), chL = V(1, 0, 0).applyQuaternion(ud.elbowLG.getWorldQuaternion(new THREE.Quaternion()));
        return { r: ang(chR, D.gripDownDir(V()).applyQuaternion(gq)), l: ang(chL, D.foreChannelDir(w, V()).applyQuaternion(gq)) };
      };
      const after = meas(); const keep = H.rollMax; H.rollMax = 0; await wait(600); const before = meas(); H.rollMax = keep; await wait(600);
      handOk(after.r < 70 && after.r < before.r - 20, w + ': the gun hand rolled onto the grip (' + before.r.toFixed(0) + ' -> ' + after.r.toFixed(0) + ' deg)');
      handOk(after.l < 80 && after.l < before.l - 20, w + ': the support hand rolled onto the gun (' + before.l.toFixed(0) + ' -> ' + after.l.toFixed(0) + ' deg)');
    }
    // The draw: from a gun he doesn't stow (the chainsaw) to each stowed one, held at the end of the reach.
    await take('chainsaw');
    const cd = T.carryDbg(), load = [];
    cd.slung.forEach((k, i) => k && k !== 'minigun' && load.push([k, 'back', i]));
    cd.holstered.forEach((k, i) => k && load.push([k, 'chest', i]));
    if (cd.hip) load.push([cd.hip, 'hip', 0]);
    ok(load.length >= 2, 'stowed guns to draw: ' + load.map((l) => l.join('@')).join(', '));
    for (const [k, at, slot] of load.slice(0, 3)) {
      const place = D.drawPlace(k, at, slot);
      ok(!!place, k + ' (' + at + slot + '): the fitted copy is found');
      if (!place) continue;
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== k; i++) T.setWeapon(i);
      await wait(50);
      const dd = T.drawDbg();
      if (!dd.active) { ok(false, k + ': a draw move starts'); continue; }
      const segs = T.drawDbg().segs;
      const tReach = (segs[0] === 'stow' ? 0.18 : 0) + (at === 'hip' ? 0.16 : at === 'chest' ? 0.15 : 0.2) - 0.002;
      D.drawHold(tReach); await wait(500);
      const f = T.drawDbg().frame, tgt = f.target && V(f.target.x, f.target.y, f.target.z);
      const now = D.drawPlace(k, at, slot);
      ok(tgt && now && tgt.distanceTo(now) < 0.02, k + ': at the end of the reach the hand goes to the gun on him (' + (tgt && now ? tgt.distanceTo(now).toFixed(3) : '?') + ' m from it; ' + segs.join('+') + ')');
      D.drawHold(null); await wait(1200);
      await take('chainsaw');
    }
    // The knife.
    await take('m4');
    ok(!!(D.knife().clip), 'the knife arm\'s slash clip is loaded (studio/clips/marine/knife-slash.json)');
    T.setKnifeCd(0); T.knifeAttack(); D.knifeHold(0.4); await wait(500);
    const K = D.knife();
    ok(K.u > 0.39 && K.u < 0.41, 'the slash holds at the cut (u ' + (K.u != null ? K.u.toFixed(2) : '?') + ')');
    if (K.places) {
      const t = ud.torsoG.worldToLocal(V(K.places.out.x, K.places.out.y, K.places.out.z));
      ok(t.z > 0.35, 'at the cut the knife hand\'s target is out in front of his chest (' + t.z.toFixed(2) + ' m ahead)');
    } else ok(false, 'the knife arm ran');
    D.knifeHold(null);
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  finally { if (aimer) clearInterval(aimer); }
  return out.join('\n');
})()
