(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    ok(typeof T.noteCaveMouthHit === 'function' && typeof T.triggerCavePoke === 'function', 'poke APIs exported');
    ok(typeof T.getCavePokeState === 'function', 'getCavePokeState exported');
    ok(typeof T.beginScriptedKill === 'function', 'beginScriptedKill exported');

    await startMatch(T, 'PokeGrab');
    ok(T.getPhase && T.getPhase() === 'prep', 'startMatch leaves prep');

    const caves = T.POI.caves;
    ok(caves && caves.length >= 2, 'at least two caves');
    const i0 = 0, i1 = 1;
    const c0 = caves[i0], c1 = caves[i1];

    let phases = [];
    const onEv = (ev) => {
      if (ev.detail && ev.detail.type === 'cave-guardian') phases.push(ev.detail.phase + ':' + ev.detail.caveIndex);
    };
    window.addEventListener('dw-game', onEv);

    // Park in front of cave 0 within 45 m (outward along yaw), outside the grab band.
    const placeFront = (c, dist) => {
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      const x = c.x + fx * dist, z = c.z + fz * dist;
      T.player.position.set(x, T.sampleHeight(x, z), z);
    };
    placeFront(c0, 12);
    await wait(80);

    // Far away: should refuse (out of range / LoS).
    T.player.position.set(0, T.sampleHeight(0, 0), 0);
    await wait(40);
    ok(T.triggerCavePoke(i0) === false, 'refuse when player far from mouth');

    placeFront(c0, 12);
    await wait(40);

    // Three-hit window then grab.
    phases = [];
    const h1 = T.noteCaveMouthHit(i0);
    const h2 = T.noteCaveMouthHit(i0);
    const h3 = T.noteCaveMouthHit(i0);
    ok(h1 === false && h2 === false, 'first two hits do not grab');
    ok(h3 === true, 'third hit triggers immortal grab');
    ok(!!T.getScriptedKill && T.getScriptedKill() && T.getScriptedKill().kind === 'cave',
      'scripted cave kill running');
    ok(phases.some((p) => p === 'aggro:' + i0), 'cave-guardian aggro event');
    ok(!T.zombies.some((z) => z.cavePoke || z.cavePokeAwake), 'no fightable poke guardian spawned');
    ok(T.getCavePokeState().used.indexOf(i0) >= 0, 'cave marked used for the day');

    // Same cave blocked while / after (once per cave per day).
    ok(T.triggerCavePoke(i0) === false, 'same cave blocked after poke');

    // Abort the cine so we can poke another cave (test harness).
    if (T.abortScriptedKill) T.abortScriptedKill();
    await wait(60);
    ok(!T.getScriptedKill(), 'cine aborted for second cave');

    // Second cave still allowed (once-per-cave, not a global 2-cap).
    placeFront(c1, 12);
    await wait(40);
    phases = [];
    ok(T.triggerCavePoke(i1) === true, 'second cave poke ok');
    ok(!!T.getScriptedKill() && T.getScriptedKill().kind === 'cave', 'second cave grab running');
    ok(phases.some((p) => p === 'aggro:' + i1), 'second aggro event');
    if (T.abortScriptedKill) T.abortScriptedKill();
    await wait(40);

    ok(T.triggerCavePoke(i0) === false && T.triggerCavePoke(i1) === false, 'both caves spent for the day');
    ok(T.noteCaveMouthHit(i0, { explosive: true }) === false, 'explosive also blocked when spent');

    // Day reset frees caves again.
    if (T.startPrep) T.startPrep();
    await wait(40);
    placeFront(c0, 12);
    await wait(40);
    ok(T.getCavePokeState().used.length === 0, 'startPrep clears used caves');
    ok(T.triggerCavePoke(i0) === true, 'poke works again after day reset');
    if (T.abortScriptedKill) T.abortScriptedKill();

    window.removeEventListener('dw-game', onEv);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
