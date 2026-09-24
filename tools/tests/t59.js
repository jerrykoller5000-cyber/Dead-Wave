(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    ok(typeof T.noteCaveMouthHit === 'function' && typeof T.triggerCavePoke === 'function', 'poke APIs exported');
    ok(typeof T.getCavePokeState === 'function', 'getCavePokeState exported');
    ok(typeof T.beginWave === 'function', 'beginWave exported');

    await startMatch(T, 'Poke');
    ok(T.getPhase && T.getPhase() === 'prep', 'startMatch leaves prep');

    const caves = T.POI.caves;
    ok(caves.length >= 2, 'at least two caves');
    T.player.position.set(0, T.sampleHeight(0, 0), 0);
    await wait(100);

    let phases = [];
    const onEv = (ev) => {
      if (ev.detail && ev.detail.type === 'cave-guardian') phases.push(ev.detail.phase + ':' + ev.detail.caveIndex);
    };
    window.addEventListener('dw-game', onEv);

    const i0 = 0, i1 = 1;

    // --- GB-27: prep poke (daytime exploring) ---
    phases = [];
    const ph1 = T.noteCaveMouthHit(i0);
    const ph2 = T.noteCaveMouthHit(i0);
    const ph3 = T.noteCaveMouthHit(i0);
    ok(ph1 === false && ph2 === false, 'prep: first two hits no spawn');
    ok(ph3 === true, 'prep: third hit triggers poke');
    await wait(80);
    let gPrep = T.zombies.find((z) => z.alive && z.typeKey === 'guardian' && z.cavePoke);
    ok(!!gPrep, 'prep poke guardian spawned');
    ok(!!gPrep && gPrep.guardianPlanned === false && gPrep.cashDrop === 75, 'prep: planned:false half cash');
    ok(phases.some((p) => p.indexOf('aggro:') === 0) && phases.some((p) => p.indexOf('emerge:') === 0),
      'prep: aggro+emerge (' + phases.join(',') + ')');

    // --- GB-27: alarm return (beginWave), not prep ---
    phases = [];
    if (gPrep) {
      // Pull it into the open so retreat is visible before mouth despawn.
      const c0 = caves[i0];
      gPrep.mesh.position.set(c0.x + Math.sin(c0.yaw) * 12, T.sampleHeight(c0.x, c0.z), c0.z + Math.cos(c0.yaw) * 12);
      gPrep.x = gPrep.mesh.position.x; gPrep.z = gPrep.mesh.position.z;
      T.beginWave();
      await wait(80);
      ok(!!gPrep.guardianRetreat || phases.some((p) => p.indexOf('retreat:') === 0),
        'alarm (beginWave) forces retreat');
      // Finish return so the slot frees for later wave cases.
      gPrep.guardianRetreat = true;
      gPrep.mesh.position.set(c0.x - Math.sin(c0.yaw) * 1.2, c0.gy, c0.z - Math.cos(c0.yaw) * 1.2);
      for (let i = 0; i < 50; i++) {
        await wait(40);
        if (!gPrep.alive || T.zombies.indexOf(gPrep) < 0) break;
      }
      ok(!gPrep.alive || T.zombies.indexOf(gPrep) < 0, 'despawned after alarm return');
    } else {
      ok(false, 'no prep guardian for alarm return');
      ok(false, 'despawned after alarm return');
    }

    // Day counters persist across alarm (same calendar day); cave 0 already used.
    ok(T.getCavePokeState().dayCount === 1 && T.getCavePokeState().used.indexOf(i0) >= 0, 'dayCount still 1 after alarm');
    ok(T.triggerCavePoke(i0) === false, 'same cave still blocked after alarm');

    // --- wave path still works on a second cave ---
    ok(T.getPhase() === 'wave', 'in wave after beginWave');
    phases = [];
    ok(T.triggerCavePoke(i1) === true, 'wave: second cave poke ok');
    const g1 = T.zombies.find((z) => z.alive && z.cavePoke && z.caveIndex === i1);
    ok(!!g1, 'wave poke guardian alive');
    if (g1) {
      T.killZombie(g1, true, { kind: 'bullet', dir: { x: 0, z: 1 } });
      await wait(60);
      ok(phases.some((p) => p.indexOf('death:') === 0), 'death phase on kill');
    } else ok(false, 'missing g1 for death phase');
    ok(T.getCavePokeState().dayCount === 2, 'dayCount is 2');
    ok(T.triggerCavePoke(i0) === false && T.triggerCavePoke(i1) === false, 'two-a-day cap blocks further pokes');
    ok(T.noteCaveMouthHit(i0, { explosive: true }) === false, 'explosive also blocked at day cap');

    // Leash still works: reset day via startPrep then poke in wave... keep it simple —
    // re-open day with a fresh reset by calling startPrep then beginWave again would bump day.
    // Spot-check leash on a fresh poke after clearing used set is out of scope for GB-27 adds.

    window.removeEventListener('dw-game', onEv);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
