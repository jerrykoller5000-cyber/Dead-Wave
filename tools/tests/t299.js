// t299 - CL-261 part 2 (Jerry's N25: "Knife animations and body movement while using knife, machete, katana sucks").
// The knife's stab gets its reach from the body, as a straight blow does in the CMU strikes (02_05, 144_20): held at the
// cock his chest has drawn the knife's shoulder back; at the stab it has turned the shoulder through and leans in;
// the hand's point is straight out along his line, past where the arm alone reached (0.52 m in front of his chest), and
// it is in the arm's reach only because the shoulder came through: with the turn and lean off, the same point is out of
// reach. The machete's chop is as it was (its arm rides the chest round). CL-269: from his eyes, the stab and the chop
// cross the lower middle of the view, the cock keeps clear of the near plane and the gun dips out of the way. Measured on the arm's target and the shoulder,
// not the fist: headless, tools/tests/fakethree.mjs's Matrix4.transpose() is a no-op and the arm IK lands short.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const D = T.handsDbg, THREE = T.THREE;
    if (!D || !D.BLADE_BODY || !D.knifeHold || !D.knife) { ok(false, 'the knife hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Knife');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    T.setMacheteOwned && T.setMacheteOwned(false); T.setKatanaOwned && T.setKatanaOwned(false);
    const B = D.BLADE_BODY, KEEP = { ...B }, m = T.getMarine(), ud = m.userData, P = T.player.position;
    const REACH = 0.28 + D.HAND_L.length() - 0.005;
    const hold = async (u) => { T.setKnifeCd(0); T.knifeAttack(); D.knifeHold(u); const s0 = T.getSimTime(); while (T.getSimTime() - s0 < 0.3) await wait(40); m.updateMatrixWorld(true); };
    const facing = () => { const f = new THREE.Vector3(0, 0, 1).applyQuaternion(T.player.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; return f.normalize(); };
    const target = () => { const K = D.knife(); return K && K.places && K.places.out ? K.places.out.clone() : null; };
    const shoulder = () => ud.armLG.getWorldPosition(new THREE.Vector3());

    await hold(0);
    const yaw0 = ud.torsoG.rotation.y, pitch0 = ud.torsoG.rotation.x;
    await hold(0.14);
    const yawCock = ud.torsoG.rotation.y - yaw0;
    await hold(0.40);
    const yawStab = ud.torsoG.rotation.y - yaw0, pitchStab = ud.torsoG.rotation.x - pitch0, f = facing(), left = new THREE.Vector3(f.z, 0, -f.x);
    const tg = target(), sh = shoulder();
    const ahead = tg ? tg.clone().sub(P).dot(f) : 0, off = tg ? tg.clone().sub(P).dot(left) : 9, dist = tg ? tg.distanceTo(sh) : 9;
    Object.assign(B, { light: 0, stabLean: 0 });
    await hold(0.40);
    const distFlat = tg ? target().distanceTo(shoulder()) : 0, aheadFlat = tg ? target().clone().sub(P).dot(f) : 0;
    Object.assign(B, KEEP);
    out.push('INFO chest turn from rest at the cock ' + yawCock.toFixed(2) + ', at the stab ' + yawStab.toFixed(2) + ' rad (+ the knife\'s shoulder forward), lean ' + pitchStab.toFixed(2) +
      '; the stab\'s point ' + ahead.toFixed(2) + ' m ahead of him, ' + off.toFixed(2) + ' m to his left; shoulder to it ' + dist.toFixed(3) + ' m (reach ' + REACH.toFixed(3) +
      '), with the turn and lean off ' + distFlat.toFixed(3) + ' m (the point ' + aheadFlat.toFixed(2) + ' m ahead)');
    ok(yawCock < -0.12, 'at the cock his chest is turned the knife\'s shoulder back (' + yawCock.toFixed(2) + ' rad)');
    ok(yawStab > 0.3 && pitchStab > 0.12, 'at the stab it has turned the shoulder through and leans in (' + yawStab.toFixed(2) + ', lean ' + pitchStab.toFixed(2) + ' rad)');
    ok(ahead > 0.6 && Math.abs(off) < 0.2, 'the stab goes straight out along his line, past where the arm alone reached (' + ahead.toFixed(2) + ' m ahead, ' + off.toFixed(2) + ' m to the side)');
    ok(dist <= REACH && distFlat > REACH, 'the shoulder coming through is what puts it in reach (' + dist.toFixed(3) + ' m with the body, ' + distFlat.toFixed(3) + ' m without, reach ' + REACH.toFixed(3) + ')');
    ok(Math.abs(aheadFlat - ahead) < 0.01, 'the point is laid out before the turn, so the turn doesn\'t move it (' + (aheadFlat - ahead).toFixed(3) + ' m)');
    D.knifeHold(null);

    // CL-269 (AG-128): from his eyes the stab and the chop cross the lower middle of the view toward the crosshair,
    // the cock keeps his arm clear of the near plane, and the gun dips out of the way while a blade swings. Measured
    // on the arm's target in the view (screen x right, y up; -1..1 is the edge), from the eye and the look.
    if (D.FP_BLADE_PATH && T.setViewFirstDbg && T.fpDbg) {
      T.setViewFirstDbg(true);
      { const s0 = T.getSimTime(); while (T.getSimTime() - s0 < 20 && T.fpDbg().w < 0.999) await wait(60); }
      const cam = T.camera, view = (p) => {
        const o = T.otsDbg(), y = o.yaw, pi = o.pitch, cp = Math.cos(pi), E = T.fpDbg().eye;
        const F = new THREE.Vector3(Math.sin(y) * cp, Math.sin(pi), Math.cos(y) * cp), R = new THREE.Vector3(-Math.cos(y), 0, Math.sin(y)), U = new THREE.Vector3().crossVectors(R, F).normalize();
        const v = p.clone().sub(E), z = v.dot(F), t = Math.tan((cam.fov || 60) * Math.PI / 360);
        return { x: v.dot(R) / z / (t * (cam.aspect || 16 / 9)), y: v.dot(U) / z / t, dist: v.length() };
      };
      ok(T.fpDbg().w > 0.99, 'first person is on (' + T.fpDbg().w.toFixed(2) + ')');
      ok(D.fpBladeDip() === 0, 'no blade swinging, the gun has no dip (' + D.fpBladeDip() + ')');
      await hold(0.40);
      const st = view(target()), dipStab = D.fpBladeDip(), shF = shoulder(), dS = target().distanceTo(shF);
      await hold(0.14);
      const ck = view(target()), nearCk = Math.min(ck.dist, ...[0, 0.25, 0.5, 0.75, 1].map((a) => shoulder().lerp(target(), a).distanceTo(T.fpDbg().eye)));
      T.setMacheteOwned && T.setMacheteOwned(true); await wait(300);
      await hold(0.47);
      const ch = view(target());
      D.knifeHold(null); T.setMacheteOwned && T.setMacheteOwned(false);
      out.push('INFO first person: the stab at (' + st.x.toFixed(2) + ', ' + st.y.toFixed(2) + ') ' + st.dist.toFixed(2) + ' m from the eye, ' + dS.toFixed(3) +
        ' m from the shoulder; the cock (' + ck.x.toFixed(2) + ', ' + ck.y.toFixed(2) + '), its arm ' + nearCk.toFixed(2) + ' m from the eye at the nearest; the chop mid-cut (' + ch.x.toFixed(2) + ', ' + ch.y.toFixed(2) + '); the gun\'s dip at the stab ' + dipStab.toFixed(2));
      ok(Math.abs(st.x) < 0.3 && st.y < -0.2 && st.y > -0.8, 'from his eyes the stab lands in the lower middle of the view (' + st.x.toFixed(2) + ', ' + st.y.toFixed(2) + ')');
      ok(dS <= REACH + 0.01, 'and in his arm\'s reach (' + dS.toFixed(3) + ' m, reach ' + REACH.toFixed(3) + ')');
      ok(nearCk > 0.2, 'the cock keeps his arm clear of the near plane (' + nearCk.toFixed(2) + ' m from the eye)');
      ok(Math.abs(ch.x) < 0.45 && ch.y < 0 && ch.y > -0.75, 'the chop crosses the lower middle of the view (' + ch.x.toFixed(2) + ', ' + ch.y.toFixed(2) + ')');
      ok(dipStab > 0.9, 'the gun dips out of the way while the blade swings (' + dipStab.toFixed(2) + ')');
      T.setViewFirstDbg(false);
    } else ok(false, 'the first-person blade hooks are there');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
