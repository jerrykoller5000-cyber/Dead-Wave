// t299 - CL-261 part 2 (Jerry's N25: "Knife animations and body movement while using knife, machete, katana sucks").
// The knife's stab gets its reach from the body, as a straight blow does in the CMU strikes (02_05, 144_20): held at the
// cock his chest has drawn the knife's shoulder back; at the stab it has turned the shoulder through and leans in;
// the hand's point is straight out along his line, past where the arm alone reached (0.52 m in front of his chest), and
// it is in the arm's reach only because the shoulder came through: with the turn and lean off, the same point is out of
// reach. The machete's chop is as it was (its arm rides the chest round). Measured on the arm's target and the shoulder,
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
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
