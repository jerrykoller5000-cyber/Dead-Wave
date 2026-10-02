// t163 - CL-93 (P-123, D-63): the rabbit mound. One mound far out from the trails, bones and a skull round it. A round
// into another burrow does nothing; a round into the mound wakes a white rabbit that comes for him, and one bite ends
// the run as 'rabbit' with his head off. With the holy grenade (from the graveyard tree's roots), G throws it at the
// rabbit: the choir on the pin, the rabbit frozen, the blast kills it and the run goes on.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Rabbit');
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const R = T.rabbitDbg, S = () => R.state();
    ok(!!R.ensure(), 'the mound is built');
    const site = S().site, mound = S().mound;
    ok(mound.getObjectByName('rabbit-mound-skull') && mound.getObjectByName('rabbit-mound-bones'), 'bones and a skull round it');
    const pd = R.distToPath(site.x, site.z);
    ok(pd > 20, 'out of the way: ' + pd.toFixed(0) + ' m from the nearest trail');
    // Another burrow: a round into it does nothing.
    const bu = T.getBurrows()[0];
    if (bu) {
      T.fireRoundDbg(bu.x, T.sampleHeight(bu.x, bu.z) + 1.2, bu.z - 3, 0, -0.3, 1, 27, 100, 0);
      for (let i = 0; i < 20; i++) T.stepProjectilesDbg(1 / 60);
      ok(S().rabbit.mode === 'asleep', 'a round into another burrow: nothing (' + S().rabbit.mode + ')');
    } else ok(true, 'no other burrow this run');
    // Stand 12 m in front of the mound's mouth and put a round into it.
    const P = T.player.position;
    const fx = Math.sin(site.yaw), fz = Math.cos(site.yaw);
    P.set(site.x + fx * 12, T.sampleHeight(site.x + fx * 12, site.z + fz * 12), site.z + fz * 12);
    T.setArmor(0); T.setHp(100);
    const ox = site.x + fx * 4, oz = site.z + fz * 4, oy = site.gy + 1.2;
    const dx = site.x - ox, dy = site.gy + 0.25 - oy, dz = site.z - oz, L = Math.hypot(dx, dy, dz);
    T.fireRoundDbg(ox, oy, oz, dx / L, dy / L, dz / L, 27, 100, 0);
    for (let i = 0; i < 20; i++) T.stepProjectilesDbg(1 / 60);
    ok(S().rabbit.mode !== 'asleep', 'a round into the mound wakes it (' + S().rabbit.mode + ')');
    let t = 0;
    while (t < 6 && T.getHp() > 0) { R.update(1 / 30); t += 1 / 30; }
    ok(T.getHp() === 0 && T.getDeathCause() === 'rabbit', 'it comes for him and bites: ' + T.getDeathCause() + ' after ' + t.toFixed(1) + ' s');
    ok(S().headOff, 'his head is off');
    // A new run, with the holy grenade.
    T.resetGame();
    await startMatch(T, 'Rabbit 2');
    T.clearZombies(); T.skipGrace && T.skipGrace();
    ok(S().rabbit.mode === 'asleep' && !S().headOff, 'a new run: it sleeps again, his head is on');
    const rel = S().reliquaryAt;
    const P2 = T.player.position;
    P2.set(rel.x, T.sampleHeight(rel.x, rel.z), rel.z);
    R.update(1 / 60);
    ok(S().holy, 'he takes the holy grenade from the dead tree\'s roots');
    P2.set(site.x + fx * 14, T.sampleHeight(site.x + fx * 14, site.z + fz * 14), site.z + fz * 14);
    T.setArmor(0); T.setHp(100);
    R.wake();
    for (let i = 0; i < 45; i++) R.update(1 / 30);   // out, and staring
    ok(R.ready(), 'awake and near: G will throw the holy one');
    const choirs = S().choirs, before = T.getGrenades ? T.getGrenades() : null;
    R.throwG();
    ok(S().choirs === choirs + 1, 'the pin: the choir sings');
    ok(S().rabbit.mode === 'held', 'the rabbit freezes (' + S().rabbit.mode + ')');
    for (let i = 0; i < 80 && S().rabbit.mode !== 'dead'; i++) R.update(1 / 30);
    ok(S().rabbit.mode === 'dead', 'the blast kills it (' + S().rabbit.mode + ')');
    ok(T.getHp() === 100, 'and he lives (' + T.getHp() + ')');
    ok(before == null || T.getGrenades() === before, 'his plain grenades are untouched');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
    T.resetGame();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
