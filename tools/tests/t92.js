// t92 - the marine has no reacting body (Jerry, 2026-10-09). A shambler's swipe is GB-50's
// stumble, and a brute still puts him on one knee. He is never taken over by a body.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    ok(!document.getElementById('ragdollToggle'), 'settings has no Ragdoll control');
    await startMatch(T, 'Knocked');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.setHp(100000);
    const p = T.player.position;
    const px = 18, pz = 18;
    T.levelGroundRect(px - 12, pz - 12, px + 12, pz + 12, T.sampleHeight(px, pz), 6);
    p.set(px, T.sampleHeight(px, pz), pz);
    await wait(400);
    const fake = (dx, dz, extra) => Object.assign({ mesh: { position: { x: p.x + dx, y: p.y, z: p.z + dz } } }, extra || {});
    T.damagePlayer(6, 'shambler', fake(1, 0));
    let s = T.getHitStumble();
    ok(s.stumbleT > 0 && s.kneeT === 0 && s.kvx < -1, 'a shambler stumbles him and does not knee him');
    await wait(700);
    T.damagePlayer(16, 'brute', fake(0, 1, { brute: true }));
    s = T.getHitStumble();
    ok(s.kneeT > 0, 'a brute still puts him on one knee');
    ok(!T.marineDown(), 'he is not held by a reacting body');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 1).join('').slice(0, 80) : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
