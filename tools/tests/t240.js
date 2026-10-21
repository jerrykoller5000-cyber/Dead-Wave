// t240 - GB-152 Phase A (Jerry, 2026-10-09 16:57 CT: "Make hands that have real finger."): the fingered hands.
//  - Each of the player's wrists carries a hand rig (studio/marine-hand.js): a palm, four fingers of three segments and a
//    two-segment thumb (15 joints), the index finger and the thumb on the +x*side edge (the mitt had them on -x*side and
//    GB-151 drew it mirrored; nothing under the wrists is mirrored now).
//  - The index finger moves on its own: curling it alone moves its tip and leaves the middle finger's where it was.
//  - The meshes follow the pose (the glove's vertices move when the pose changes) and the rig is shared by the glove and
//    the bare hand (one rig, both skins).
//  - Cost: the hands draw with the mitt's mesh count (4 visible under the wrists: glove and knuckle guards per hand) and
//    under 2000 triangles for both.
//  - Holding the M4 each holding hand closes (knuckle curl > 0.9); holstered both relax (< 0.7).
//  - A survivor (the same body, T.makeSurvivorFigure) has the hands too, relaxed.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Hands');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const m = T.getMarine(), ud = m.userData;
    const sim = () => T.getSimTime();
    const simWait = async (s) => { const t0 = sim(), w0 = Date.now(); while (sim() - t0 < s && Date.now() - w0 < 20000) await wait(4); };
    const take = async (w) => { for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await simWait(1.0); };
    const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const tris = (o) => { const g = o.geometry; return g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0; };
    for (const [side, e] of [[1, ud.elbowRG], [-1, ud.elbowLG]]) {
      const wr = e.userData.wrist, rig = wr && wr.userData.hand, tag = side > 0 ? 'right hand' : 'left hand';
      ok(!!rig && rig.joints.length === 15 && rig.layout.fingers.length === 4 && rig.layout.thumb.len.length === 2, tag + ': a fingered rig (palm, 4 x 3 finger segments, 2 thumb segments: ' + (rig ? rig.joints.length : 0) + ' joints)');
      if (!rig) continue;
      const L = rig.layout;
      ok(Math.sign(L.fingers[0].x - L.ox) === side && Math.sign(L.thumb.x - L.ox) === side && Math.sign(L.fingers[3].x - L.ox) === -side, tag + ': index finger and thumb on the +x*side edge, little finger on the other');
      let mir = false; wr.traverse((o) => { if (o.scale && o.scale.x < 0) mir = true; });
      ok(!mir, tag + ': nothing under the wrist drawn mirrored');
      ok(rig.skins.length === 3, tag + ': one rig moves the glove (and its guards) and the bare hand (' + rig.skins.length + ' skins)');
      // The index finger on its own.
      const keep = JSON.parse(JSON.stringify(rig.pose));
      const p0 = JSON.parse(JSON.stringify(rig.pose)); p0.f[0] = [0, 0, 0, 0]; rig.set(p0).update(true);
      const i0 = rig.point('indexTip', V()), m0 = rig.point('middleTip', V());
      const g0 = rig.skins[0].mesh.geometry.attributes.position.array.slice();
      const p1 = JSON.parse(JSON.stringify(p0)); p1.f[0] = [1.2, 1.3, 0.8, 0]; rig.set(p1).update(true);
      const i1 = rig.point('indexTip', V()), m1 = rig.point('middleTip', V());
      const g1 = rig.skins[0].mesh.geometry.attributes.position.array;
      let moved = 0; for (let k = 0; k < g1.length; k++) moved = Math.max(moved, Math.abs(g1[k] - g0[k]));
      ok(i0.distanceTo(i1) > 0.03 && m0.distanceTo(m1) < 1e-6, tag + ': the index finger curls on its own (tip ' + i0.distanceTo(i1).toFixed(3) + ' m, middle tip ' + m0.distanceTo(m1).toFixed(4) + ' m)');
      ok(moved > 0.03, tag + ': the glove mesh follows the pose (' + moved.toFixed(3) + ' m)');
      rig.set(keep).update(true);
    }
    let hm = 0, ht = 0;
    for (const e of [ud.elbowRG, ud.elbowLG]) e.userData.wrist.traverse((o) => { if (o.isMesh && vis(o)) { hm++; ht += tris(o); } });
    ok(hm <= 4 && ht < 2000, 'cost: ' + hm + ' visible meshes, ' + Math.round(ht) + ' triangles for both hands (the mitt: 4 meshes, 1472)');
    // Holding and holstered.
    const rigR = ud.elbowRG.userData.wrist.userData.hand, rigL = ud.elbowLG.userData.wrist.userData.hand;
    await take('m4'); await simWait(0.8);
    ok(rigR.pose.f[1][0] > 0.9 && rigL.pose.f[1][0] > 0.9, 'M4: both holding hands closed (knuckle curl ' + rigR.pose.f[1][0].toFixed(2) + ', ' + rigL.pose.f[1][0].toFixed(2) + ')');
    if (!T.isUnarmed()) T.toggleHolster();
    await simWait(1.5);
    ok(T.isUnarmed() && rigR.pose.f[1][0] < 0.7 && rigL.pose.f[1][0] < 0.7, 'holstered: both hands relaxed (' + rigR.pose.f[1][0].toFixed(2) + ', ' + rigL.pose.f[1][0].toFixed(2) + ')');
    if (T.isUnarmed()) T.toggleHolster();
    await simWait(0.5);
    // A survivor.
    const fig = T.makeSurvivorFigure && T.makeSurvivorFigure('okafor');
    const sm = fig && (fig.userData && fig.userData.elbowRG ? fig : (fig.traverse ? (() => { let f = null; fig.traverse((o) => { if (!f && o.userData && o.userData.elbowRG) f = o; }); return f; })() : null));
    const sr = sm && sm.userData.elbowRG.userData.wrist && sm.userData.elbowRG.userData.wrist.userData.hand;
    ok(!!sr && sr.pose.f[1][0] > 0.2 && sr.pose.f[1][0] < 0.7, 'survivor: the same fingered hands, relaxed' + (sr ? ' (curl ' + sr.pose.f[1][0].toFixed(2) + ')' : ''));
    const bad = errs.filter((e) => !/contains' on 'Node'/.test(e));   // a known page error outside the hands
    ok(bad.length === 0, 'no errors' + (bad.length ? ': ' + bad[0] : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
