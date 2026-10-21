// t229 - GB-151 (Jerry, 2026-10-09 15:35 CT, with a photo of a 1911 held two-handed, thumbs forward: "This picture shows
// what proper pistol grip looks like. Right now our player does not do that with the pistol or the revolver.").
// For the pistol and the revolver, single-wielded, standing, aiming level, a little up and a little down:
//  - GB-152: the hands are the fingered hands (studio/marine-hand.js), never drawn mirrored (GB-151 mirrored the mitts,
//    built each the mirror image of its hand), each with its thumb on its index finger's edge, for every gun.
//  - The firing fist is on the grip (its channel's middle within 2.5 cm of the grip anchor) and its thumb lies over on the
//    support side of the frame, high (gun space: x < 0, at least 1.5 cm above the anchor). It was on the outside.
//  - The support fist is closed round the firing fingers (its wrist turned onto the grip: gripA ~1; it used to hang at
//    the hand point, gripA 0): its channel within 2.5 cm of its anchor, on the support side, 1.5 to 5 cm from the firing
//    fist's channel (it was 9 cm), its palm within 4 cm of the firing knuckles (no air between the hands; it was 13 cm),
//    its thumb on the support side of the frame within 5 cm of the firing thumb (stacked; it was 12 cm). The revolver's support thumb
//    stays low, under the cylinder (< 3 cm above the grip anchor).
//  - The firing wrist is nearly straight (gun in line with the forearm): its turn under 0.75 rad (it was 1.14).
//  - The gun is where the hold puts it (no slide toward the support shoulder), so aim and muzzle are unchanged.
//  - Firing, the support fist stays round the firing hand; a reload takes it away for the GB-145 plan and brings it
//    back without a pop (the hand under 1.5 m/s as it leaves and rejoins) to within 2.5 cm of the wrap.
// Akimbo pistols: each fist on its own grip, wrist under 0.9 rad.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  // The test page's Matrix4.transpose is a stub, so its arm IK is inert (as t188): where the hands land is checked on the
  // real renderer (handoffs/2026-10-09-grokbot-GB-151/real-test.mjs t229); the mirror, the fists' closing (gripA) and the
  // blend are checked everywhere.
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const real = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const handOk = (c, m) => out.push(real ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page Matrix4.transpose is a stub, arm IK inert) ' + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Grip');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const m = T.getMarine(), ud = m.userData, HD = T.handsDbg;
    const P = T.localPlayer || T.player, home = P.position.clone();
    const sim = () => T.getSimTime();
    const simWait = async (s) => { const t0 = sim(), w0 = Date.now(); while (sim() - t0 < s && Date.now() - w0 < 20000) await wait(4); };
    let pitch = 0;
    const aim = () => { P.position.x = home.x; P.position.z = home.z; T.aimTarget.set(home.x, home.y + 1.25 + Math.tan(pitch) * 30, home.z + 30); T.setAimYawDbg(0); };
    const pin = setInterval(aim, 5);
    const take = async (w) => { for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await simWait(1.0); };
    const mirrored = (e) => { const wr = e.userData.wrist; return !!wr && wr.children.some((h) => h.scale.x < 0); };
    // GB-152: each hand a fingered rig, its index finger and thumb on the +x*side edge (the mitt's were on -x*side).
    const handed = (e, side) => { const rig = e.userData.wrist && e.userData.wrist.userData.hand; if (!rig) return false;
      const L = rig.layout; return rig.side === side && Math.sign(L.fingers[0].x - L.ox) === side && Math.sign(L.thumb.x - L.ox) === side; };
    // Points on a hand (hand space, its current pose), through its wrist now.
    const handPt = (e, side, which) => {
      const wr = e.userData.wrist, rig = wr.userData.hand; wr.updateMatrixWorld(true);
      // 'knuckles': the front of the firing fist, where the curled middle finger ends (the mitt's ridge of fingers)
      const p = rig.point({ palm: 'palm', knuckles: 'middleTip', thumbTip: 'thumbTip' }[which], V());
      return wr.localToWorld(p.sub(wr.position));
    };
    // The closest the two visible hand meshes come (world, metres).
    const handsGap = () => {
      const pts = (e) => { const a = []; e.userData.wrist.traverse((o) => { if (!o.isMesh || o.name !== 'gb152-hand') return; for (let x = o; x; x = x.parent) if (!x.visible) return;
        o.updateMatrixWorld(true); const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i += 2) a.push(V(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(o.matrixWorld)); }); return a; };
      const A = pts(ud.elbowRG), B = pts(ud.elbowLG); let d = 1;
      for (const p of A) for (const q of B) { const k = p.distanceToSquared(q); if (k < d) d = k; }
      return Math.sqrt(d);
    };
    const frame = (w) => {
      m.updateMatrixWorld(true);
      const gun = T.weaponMeshes[w], H = T.getShoulderDbg().holds[w]; gun.updateMatrixWorld(true);
      const inv = gun.getWorldQuaternion(new THREE.Quaternion()).invert(), a = gun.localToWorld(V(...H.grip));
      return { gun, H, a, loc: (v) => v.clone().sub(a).applyQuaternion(inv), fore: gun.localToWorld(V(...H.fore)) };
    };
    const f3 = (v) => v.toArray().map((x) => x.toFixed(3)).join(',');
    for (const w of ['pistol', 'revolver']) {
      await take(w);
      for (const pt of [0, 0.4, -0.4]) {
        pitch = pt; await simWait(0.6);
        const F = frame(w), tag = w + (pt ? (pt > 0 ? ' aiming up' : ' aiming down') : '');
        const gR = HD.gripPoint('R', V()), gL = HD.gripPoint('L', V()), gA = HD.gripA(), wt = HD.wrist();
        const tR = F.loc(handPt(ud.elbowRG, 1, 'thumbTip')), tL = F.loc(handPt(ud.elbowLG, -1, 'thumbTip'));
        const palmL = handPt(ud.elbowLG, -1, 'palm'), knR = handPt(ud.elbowRG, 1, 'knuckles');
        if (!pt) ok(!mirrored(ud.elbowRG) && !mirrored(ud.elbowLG) && handed(ud.elbowRG, 1) && handed(ud.elbowLG, -1), tag + ': fingered hands, thumbs on the index edge, not mirrored');
        handOk(gR.distanceTo(F.a) < 0.025, tag + ': firing fist on the grip (' + gR.distanceTo(F.a).toFixed(3) + ' m)');
        handOk(tR.x < 0 && tR.y > 0.015, tag + ': firing thumb over on the support side, high (' + f3(tR) + ')');
        ok(gA.l > 0.9, tag + ': support fist closed (wrist turned onto the grip, a ' + gA.l.toFixed(2) + ')');
        handOk(gL.distanceTo(F.fore) < 0.025, tag + ': support fist round its anchor (' + gL.distanceTo(F.fore).toFixed(3) + ' m)');
        const lL = F.loc(gL), dRL = gL.distanceTo(gR);
        handOk(lL.x < 0 && dRL > 0.015 && dRL < 0.05, tag + ': support fist on the support side round the firing fingers (' + f3(lL) + ', ' + dRL.toFixed(3) + ' m from the firing fist)');
        // GB-152: with fingered hands, "no air" is the meshes themselves: the support hand's glove within 1 cm of the firing hand's.
        const gap = handsGap();
        handOk(gap < 0.01, tag + ': support hand on the firing fingers, no air (gloves ' + gap.toFixed(3) + ' m apart; palm to firing fingertips ' + palmL.distanceTo(knR).toFixed(3) + ' m)');
        handOk(tL.x < -0.005 && tL.distanceTo(tR) < 0.05, tag + ': thumbs stacked on the support side (' + f3(tL) + ', ' + tL.distanceTo(tR).toFixed(3) + ' m apart)');
        if (w === 'revolver') handOk(tL.y < 0.03, tag + ': the support thumb low, under the cylinder (' + tL.y.toFixed(3) + ' m above the grip anchor)');
        handOk(wt.r < 0.75, tag + ': firing wrist nearly straight, gun in line with the forearm (' + wt.r.toFixed(2) + ' rad)');
        // The gun where the hold alone puts it: no slide toward the support shoulder (aim and muzzle as before GB-151).
        const shW = ud.armRG.getWorldPosition(V()), aT = T.aimTarget;
        const pch = Math.max(-0.75, Math.min(0.6, Math.atan2(aT.y - shW.y, Math.max(0.5, Math.hypot(aT.x - shW.x, aT.z - shW.z)))));
        const want = ud.armRG.position.clone().add(V(...F.H.hold).applyAxisAngle(V(1, 0, 0), -pch * 0.7));
        const got = ud.torsoG.worldToLocal(F.a.clone());
        handOk(got.distanceTo(want) < 0.012, tag + ': the gun where the hold puts it (' + got.distanceTo(want).toFixed(4) + ' m off)');
      }
      pitch = 0; await simWait(0.5);
      // Firing: the hands stay together through the kick.
      let worst = 0;
      T.setMouseFireDbg(true);
      { const t0 = sim(); while (sim() - t0 < 0.5) { await wait(4); const F = frame(w); worst = Math.max(worst, HD.gripPoint('L', V()).distanceTo(F.fore)); } }
      T.setMouseFireDbg(false);
      handOk(worst < 0.035, w + ': firing, the support fist stays round the firing hand (worst ' + worst.toFixed(3) + ' m)');
      await simWait(0.6);
      // A reload: away for the GB-145 plan, then back to the wrap without a pop.
      T.setMagazinesDbg(w, 1, [12, 12]); T.startReload();
      // The hand's speed (gun space) where the hold hands over: the reload's first 0.25 s and the 0.8 s after it ends. A pop
      // between the wrap and the reload's hand point shows as a one-frame dash far past the plan's own pace.
      let away = 0, speed = 0, last = null, lastT = 0; const t0 = sim();
      const track = (watch) => { const F = frame(w), g = HD.gripPoint('L', V()), l = F.loc(g), t = sim(); away = Math.max(away, g.distanceTo(F.fore));
        if (last && watch && t > lastT) speed = Math.max(speed, l.distanceTo(last) / Math.max(t - lastT, 1 / 60)); last = l; lastT = t; };
      while (sim() - t0 < 4 && (T.isReloading() || sim() - t0 < 0.2)) { await wait(4); track(sim() - t0 < 0.25); }
      const t1 = sim(); while (sim() - t1 < 0.8) { await wait(4); track(true); }
      const back = HD.gripPoint('L', V()).distanceTo(frame(w).fore);
      handOk(away > 0.06, w + ': the reload takes the support hand off the grip (' + away.toFixed(3) + ' m at most)');
      ok(HD.gripA().l > 0.9, w + ': the support fist closes again after the reload (a ' + HD.gripA().l.toFixed(2) + ')');
      handOk(back < 0.025, w + ': and back round the firing hand (' + back.toFixed(3) + ' m)');
      handOk(speed < 1.5, w + ': no pop leaving or rejoining the grip (' + speed.toFixed(2) + ' m/s at most)');
    }
    // The M4: the same hands.
    await take('m4');
    ok(!mirrored(ud.elbowRG) && !mirrored(ud.elbowLG) && handed(ud.elbowRG, 1) && handed(ud.elbowLG, -1), 'm4: the same fingered hands (not mirrored)');
    // Akimbo pistols.
    await take('pistol'); T.toggleDualWieldDbg(); await simWait(1.2);
    { const F = frame('pistol'), og = T.offhandMeshes.pistol, H = F.H; og.updateMatrixWorld(true);
      const gR = HD.gripPoint('R', V()), gL = HD.gripPoint('L', V()), wt = HD.wrist(), gA = HD.gripA();
      ok(!mirrored(ud.elbowRG) && !mirrored(ud.elbowLG), 'akimbo: hands not mirrored');
      handOk(gR.distanceTo(F.a) < 0.025 && gA.r > 0.9, 'akimbo: right fist on its grip (' + gR.distanceTo(F.a).toFixed(3) + ')');
      handOk(gL.distanceTo(og.localToWorld(V(...H.grip))) < 0.025 && gA.l > 0.9, 'akimbo: left fist on its own grip (' + gL.distanceTo(og.localToWorld(V(...H.grip))).toFixed(3) + ')');
      handOk(wt.r < 0.9 && wt.l < 0.9, 'akimbo: wrists firm, guns in line with the forearms (' + wt.r.toFixed(2) + ', ' + wt.l.toFixed(2) + ' rad)'); }
    T.toggleDualWieldDbg(); await simWait(0.5);
    clearInterval(pin);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'F13', key: 'F13', bubbles: true }));
    const bad = errs.filter((e) => !/contains' on 'Node'/.test(e));   // a known page error outside the hands
    ok(bad.length === 0, 'no errors' + (bad.length ? ': ' + bad[0] : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
