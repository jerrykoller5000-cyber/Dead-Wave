// t225 - CU-97 (Jerry, 2026-10-09): the grenade. "The grenade arc needs to be distinct and also faster and more simple
// than the mortar. A simple arc will do fine. The grenade needs to reach full distance in 1.6 seconds instead of 3. We
// also need an animation for grabbing the grenade and wind up and throw." G down: his off hand reaches to the pouch on
// his hip and comes out with one (the pouch shows one fewer), then draws it back behind his head; G up: the arm comes
// over and the grenade leaves his hand at the top of the swing, from the point the arc starts at, a moment later; a tap
// throws as soon as it is in his hand; a hold cut off puts it back. The arc is one line, not the mortar's dots.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(10); } return !!f(); };
  const f2 = (v) => (+v).toFixed(2);
  // GB-214: waits between steps in game time (capped by wall clock), so a slow page does not start the next step early.
  const gwait = async (s, cap = 20000) => { const t0 = window.TT.getSimTime(), w0 = Date.now(); while (window.TT.getSimTime() - t0 < s && Date.now() - w0 < cap) await wait(10); };
  try {
    await startMatch(T, 'Throw225');
    T.clearZombies && T.clearZombies(); T.runDevCommand && T.runDevCommand('godmode');
    const A = () => T.grenadeAnimDbg(), D = () => T.grenadeArcDbg();
    ok(typeof T.grenadeAnimDbg === 'function' && typeof T.holdGrenadeAnim === 'function' && typeof T.setGrenadesDbg === 'function', 'hooks: grenadeAnimDbg, holdGrenadeAnim, setGrenadesDbg');
    ok(T.GRENADE_THROW.FULL_S === 0.8, 'the longest throw is held 0.8 s (was 1.6)');
    const P = T.player.position;
    T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));   // he keeps facing one way
    T.grantAllWeapons(); T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
    T.setAimYawDbg(0); await wait(1200);
    // --- Where the throw puts his hand (the keys grenadeArm reaches by IK). The hand itself is not measured here: the
    // test build's Matrix4.transpose is a no-op, so solveArmIK poses every arm wrong in a test page (reported to the lead);
    // tools/grenadesheet.mjs measures the real hand at each beat on the real renderer.
    const K = A().keys, E = 1.35;   // E: his eye height
    ok(K.pouch.frame === 'torso' && K.pouch.at.y < 0.95 && K.pouch.at.z > 0.1, 'the grab goes to the pouch on his hip, in front at his belt (' + K.pouch.at.y + ' m up)');
    ok(K.cock.frame === 'body' && K.cock.at.y > E && K.cock.at.z < -0.1 && K.cock.at.x < -0.15, 'the wind-up holds it behind his head on his off side (' + K.cock.at.y + ' up, ' + K.cock.at.z + ' forward)');
    ok(K.lift.at.z > 0.15 && K.lift.at.x < -0.25, 'on the way up the hand comes out in front of his shoulder, not through his chest');
    const yw = 0, rp = A().release, want0 = { x: P.x + K.release.at.x * Math.cos(yw) + K.release.at.z * Math.sin(yw), y: P.y + K.release.at.y, z: P.z - K.release.at.x * Math.sin(yw) + K.release.at.z * Math.cos(yw) };
    ok(Math.hypot(rp.x - want0.x, rp.y - want0.y, rp.z - want0.z) < 1e-6 && K.release.at.y > K.cock.at.y && K.release.at.z > 0.15, 'the release is over his shoulder, a little forward, and it is where the grenade leaves (' + K.release.at.y + ' m up)');
    ok(K.follow.at.y < K.release.at.y - 0.4 && K.follow.at.z > 0.3, 'the follow-through ends down across his front');
    const beat = async (phase, t) => { T.holdGrenadeAnim(phase, t); await wait(220); };
    await beat('grab', 0.05);
    ok(!A().inHand && !A().hand.visible && A().carriedShown === 0, 'reaching: nothing in his hand yet');
    await beat('grab', 0.155);
    ok(A().inHand && A().hand.visible && A().carriedShown === 1, 'out of the pouch: one in his hand, and the pouch on his hip shows one fewer');
    await beat('cocked', 0);
    ok(A().hand.visible, 'held behind his head: still in his hand');
    await beat('throw', 0.2);
    ok(!A().hand.visible && A().carriedShown === 0, 'past the release: his hand empty');
    T.holdGrenadeAnim(null); await wait(200);
    ok(A().phase === '' && !A().hand.visible && A().carriedShown === 0, 'let go of the hold: nothing in his hand');
    // --- A real hold: the grab, the wind-up, the arc, the throw at the top.
    T.setGrenadesDbg(4); await wait(700);
    const n0 = D().n, f0 = T.grenadesInFlight.length;
    ok(T.startGrenadeCharge() === true && A().phase === 'grab', 'G down: the grab');
    await until(() => A().phase === 'cocked', 3000);
    ok(A().phase === 'cocked' && A().inHand && D().visible && A().simple && A().segs >= 20, 'then held behind his head, and the arc shows: one line of ' + A().segs + ' pieces (not the mortar\'s dots)');
    await until(() => D().t >= 0.8, 4000);
    ok(D().t === 0.8, 'full at 0.8 s (' + f2(D().t) + ')');
    const want = A().release.clone();
    const s0 = T.getSimTime();
    T.releaseGrenadeCharge();
    ok(T.grenadesInFlight.length === f0 && D().n === n0 && (A().queued || A().phase === 'throw'), 'G up: the arm comes over (the grenade not out yet)');
    await until(() => D().n === n0 - 1, 2000);
    const dt = T.getSimTime() - s0, g = T.grenadesInFlight[T.grenadesInFlight.length - 1];
    ok(g && dt > 0.04 && dt < 0.2 && D().n === n0 - 1, 'it leaves at the top of the swing, ' + f2(dt) + ' s after G up (game time)');
    ok(g && g.from && g.from.distanceTo(want) < 0.05, 'from his hand, where the arc started (' + (g && g.from ? f2(g.from.distanceTo(want)) : '-') + ' m off it)');
    await until(() => A().phase === '', 20000);
    ok(A().phase === '' && !A().hand.visible, 'then the hand goes back to the gun');
    // --- A tap: thrown as soon as it is in his hand.
    await gwait(0.7);
    const n1 = D().n, s1 = T.getSimTime();
    T.startGrenadeCharge(); T.releaseGrenadeCharge();
    await until(() => D().n === n1 - 1, 2000);
    const dt1 = T.getSimTime() - s1;
    ok(D().n === n1 - 1 && dt1 < 0.32 && D().last.charge < 0.1, 'a tap: out of the pouch and away in ' + f2(dt1) + ' s, a short lob');
    // --- A hold cut off: it goes back in the pouch, none used.
    await until(() => A().phase === '', 20000); await gwait(0.7);
    const n2 = D().n;
    T.startGrenadeCharge();
    await until(() => A().inHand, 1500);
    window.dispatchEvent(new Event('blur'));
    await wait(400);
    ok(D().n === n2 && !A().hand.visible && A().phase === '' && !D().visible, 'a hold cut off (the window loses focus): it goes back, none thrown (' + D().n + ' left)');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.holdGrenadeAnim && T.holdGrenadeAnim(null); T.releaseGrenadeCharge && T.releaseGrenadeCharge(); } catch (_) {}
  return out.join('\n');
})()
