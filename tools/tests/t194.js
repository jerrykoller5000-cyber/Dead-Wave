// t194 - CL-84 part 2: the magazine change through the studio (studio/clips/marine/reload-rifle.json, a hand path clip).
//  For the GW-4 (m4), KR-7 (ak) and Breacher-12 (aa12): the support hand's target starts on the forend, goes to the
//  seated magazine's foot, out round the front of the body to a magazine pouch (the carrier's when he wears one, the
//  belt's when not), back under the well, pushes the new magazine home and returns to the forend. The empty drops and
//  is gone; the new one appears when his hand is at the pouch, rides in that hand, and is seated at the end.
//  Hand-on-target and magazine-in-hand are checked where the arm IK works (the real renderer; the test page's
//  Matrix4.transpose is a stub, as in t187): elsewhere they print SKIP.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE, V = () => new THREE.Vector3();
  const f3 = (n) => (+n).toFixed(3);
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const ikWorks = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const ikOk = (c, m) => out.push(ikWorks ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page arm IK inert) ' + m);
  try {
    const R = T.reloadClipDbg;
    ok(!!R, 'TT.reloadClipDbg is exported');
    for (let i = 0; i < 100 && !R.clip(); i++) await wait(100);
    const clip = R.clip();
    ok(!!clip && clip.name === 'reload-rifle' && ['m4', 'ak', 'aa12'].every((w) => clip.weapons.includes(w)), 'the reload clip is loaded for the GW-4, KR-7 and Breacher-12');
    await startMatch(T, 'Reload');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));   // busy: no idle
    const m = T.marine || window.worldMarine, ud = m.userData;
    const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
    const aimer = setInterval(pin, 5); pin();
    const hand = () => ud.elbowLG.localToWorld(new THREE.Vector3(0.02, -0.27, 0.13));
    for (const w of ['m4', 'ak', 'aa12']) {
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
      await wait(2800);
      if (T.getCurrentWeapon() !== w) { ok(false, w + ': could not take it'); continue; }
      const gun = T.weaponMeshes[w], mag = gun.userData.mag;
      T.setAmmoDbg(w, 1); T.startReload();
      const at = async (u) => { R.hold(u); await wait(450); m.updateMatrixWorld(true); return R.places(); };
      // The forend, the well, the pouch: resolved by the game this frame.
      let P = await at(0.0);
      ok(!!P, w + ': the reload runs the clip');
      if (!P) { R.hold(null); continue; }
      const d = (a, b) => a.distanceTo(b);
      const tgt = () => V().set(P.out.x, P.out.y, P.out.z);
      ok(d(tgt(), P.fore) < 0.01, w + ': starts on the forend (' + f3(d(tgt(), P.fore)) + ' m)');
      P = await at(0.10);
      ok(d(tgt(), P.well) < 0.04, w + ': then at the magazine (' + f3(d(tgt(), P.well)) + ' m)');
      P = await at(0.32);
      ok(d(tgt(), P.pouch) < 0.05, w + ': at the pouch (' + f3(d(tgt(), P.pouch)) + ' m)');
      const vest = ud.gearParts.vest && ud.gearParts.vest.some((o) => o.visible);
      const torsoP = ud.torsoG.worldToLocal(P.pouch.clone());
      ok(vest ? torsoP.y > 0.15 : torsoP.y < 0.05, w + ': the ' + (vest ? 'carrier' : 'belt') + '\'s pouch (torso height ' + f3(torsoP.y) + ')');
      // On the way from the magazine to the pouch the hand stays in front of the chest, not through it.
      let worstIn = Infinity;
      for (const u of [0.18, 0.21, 0.24, 0.27, 0.4, 0.43]) { P = await at(u); worstIn = Math.min(worstIn, ud.torsoG.worldToLocal(tgt()).z); }
      ok(worstIn > 0.12, w + ': the hand swings out in front of the body (nearest ' + f3(worstIn) + ' m in front of the torso\'s pivot)');
      // The magazine: dropped, gone, in the hand, seated.
      await at(0.14); ok(R.mag().state === 'drop' && mag.visible, w + ': the empty drops');
      await at(0.26); ok(R.mag().state === 'gone' && !mag.visible, w + ': and is gone');
      P = await at(0.40);
      ok(R.mag().state === 'hand' && mag.visible, w + ': the new one is out, in his hand');
      mag.updateMatrixWorld(true); const foot = mag.localToWorld(gun.userData.magFootInMag.clone());
      ikOk(d(hand(), foot) < 0.05, w + ': the magazine\'s foot is in his palm (' + f3(d(hand(), foot)) + ' m)');
      ikOk(d(hand(), tgt()) < 0.05, w + ': the hand is on the path (' + f3(d(hand(), tgt())) + ' m)');
      P = await at(0.62);
      ok(R.mag().state === 'seated' && mag.visible && mag.position.distanceTo(gun.userData.baseMagPos) < 0.002, w + ': seated');
      P = await at(0.99);
      ok(d(tgt(), P.fore) < 0.02, w + ': back on the forend (' + f3(d(tgt(), P.fore)) + ' m)');
      R.hold(null); await wait(2500);
    }
    clearInterval(aimer);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
