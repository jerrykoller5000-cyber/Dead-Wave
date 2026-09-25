(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    ok(typeof T.noteCaveMouthHit === 'function' && typeof T.triggerCavePoke === 'function', 'poke APIs exported');
    ok(typeof T.getCavePokeState === 'function', 'getCavePokeState exported');
    ok(typeof T.beginScriptedKill === 'function', 'beginScriptedKill exported');
    ok(typeof T.getCaveChase === 'function' && typeof T.abortCaveChase === 'function', 'GB-35 chase APIs exported');

    await startMatch(T, 'PokeGrab');
    ok(T.getPhase && T.getPhase() === 'prep', 'startMatch leaves prep');

    const caves = T.POI.caves;
    ok(caves && caves.length >= 2, 'at least two caves');
    const i0 = 0, i1 = 1;
    const c0 = caves[i0], c1 = caves[i1];
    const lzOf = (c, x, z) => (x - c.x) * Math.sin(c.yaw) + (z - c.z) * Math.cos(c.yaw);

    let phases = [];
    const onEv = (ev) => {
      if (ev.detail && ev.detail.type === 'cave-guardian') phases.push(ev.detail.phase + ':' + ev.detail.caveIndex);
    };
    window.addEventListener('dw-game', onEv);

    // Park in front of a cave (outward along yaw), outside the grab band.
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

    // GB-35: the range is 20 m now (D-25 had 45).
    placeFront(c0, 26);
    await wait(40);
    ok(T.triggerCavePoke(i0) === false, 'refuse beyond 20 m (26 m out front)');
    ok(T.noteCaveMouthHit(i0) === false && !T.getCaveChase(), 'a shot into the mouth from 26 m does nothing');

    placeFront(c0, 12);
    await wait(40);

    // GB-35: one shot into the cave from within 20 m brings him out after the marine.
    phases = [];
    ok(T.noteCaveMouthHit(i0) === true, 'one shot within 20 m brings the guardian out');
    const ch = T.getCaveChase();
    ok(!!ch && ch.caveIndex === i0, 'guardian chase running');
    ok(!T.getScriptedKill(), 'no crawl-in snatch: the kill waits until he reaches the marine');
    ok(!!ch && ch.speed >= ch.playerRun * 2,
      'far too fast to outrun: ' + (ch && ch.speed) + ' m/s vs sprint ' + (ch && ch.playerRun));
    ok(phases.some((p) => p === 'aggro:' + i0), 'cave-guardian aggro event');
    ok(!T.zombies.some((z) => z.cavePoke || z.cavePokeAwake), 'no fightable poke guardian spawned');
    ok(T.getCavePokeState().used.indexOf(i0) >= 0, 'cave marked used for the day');
    ok(T.triggerCavePoke(i0) === false, 'same cave blocked after poke');

    // Run straight away from the mouth at 1.3x a flat-out sprint, on the chase's own clock:
    // he still gets there.
    const fx0 = Math.sin(c0.yaw), fz0 = Math.cos(c0.yaw);
    let lastT = ch ? ch.t : 0, caught = false, ran = 0;
    const tRun = performance.now();
    while (performance.now() - tRun < 20000) {
      const cc = T.getCaveChase();
      if (!cc) { caught = !!T.getScriptedKill(); break; }
      const step = Math.max(0, cc.t - lastT) * cc.playerRun * 1.3; lastT = cc.t;
      ran += step;
      const p = T.player.position, nx = p.x + fx0 * step, nz = p.z + fz0 * step;
      p.set(nx, T.sampleHeight(nx, nz), nz);
      await wait(16);
    }
    const sk = T.getScriptedKill();
    ok(caught && !!sk && sk.kind === 'cave', 'caught while running at 1.3x sprint (ran ' + ran.toFixed(1) + ' m)');
    ok(!!sk && sk.drag === true, 'leg grab plays the drag variant');
    ok(!!sk && sk.gFrom && lzOf(c0, sk.gFrom.x, sk.gFrom.z) > 3, 'grabbed out on the apron, not at the lip');
    ok(phases.some((p) => p === 'grab:' + i0), 'cave-guardian grab event');

    // The drag: the camera follows the guardian hauling him back to the mouth.
    let samples = 0, camNear = 0, lzMin = 1e9;
    const tDrag = performance.now();
    while (T.getScriptedKill() && !T.getScriptedKill().dragDone && performance.now() - tDrag < 20000) {
      const s = T.getScriptedKill(), g = s.guardian.position, cam = T.camera ? T.camera.position : s.cam;
      samples++;
      if (Math.hypot(cam.x - g.x, cam.z - g.z) < 10) camNear++;
      lzMin = Math.min(lzMin, lzOf(c0, T.player.position.x, T.player.position.z));
      await wait(40);
    }
    const sk2 = T.getScriptedKill();
    ok(!!sk2 && sk2.dragDone === true && sk2.t >= 2.2, 'drag finished, kill timeline resumed at the fade');
    ok(lzMin < 1.2, 'dragged to the mouth (closest ' + lzMin.toFixed(2) + ' m from the lip)');
    ok(samples > 0 && camNear / samples >= 0.75, 'camera follows the drag (' + camNear + '/' + samples + ' frames within 10 m)');

    // Then the thrown-out cutscene.
    let thrown = false;
    const tThrow = performance.now();
    while (performance.now() - tThrow < 20000) {
      const s = T.getScriptedKill();
      if (!s) break;
      if (s.remains && s.t >= 4.4) { thrown = true; break; }
      await wait(40);
    }
    ok(thrown, 'thrown-out cutscene plays after the drag');

    // Abort the cine so we can poke another cave (test harness).
    if (T.abortScriptedKill) T.abortScriptedKill();
    await wait(60);
    ok(!T.getScriptedKill() && !T.getCaveChase(), 'cine aborted for second cave');

    // Second cave still allowed (once-per-cave, not a global 2-cap).
    placeFront(c1, 12);
    await wait(40);
    phases = [];
    ok(T.triggerCavePoke(i1) === true, 'second cave poke ok');
    ok(!!T.getCaveChase() && T.getCaveChase().caveIndex === i1, 'second cave guardian out');
    ok(phases.some((p) => p === 'aggro:' + i1), 'second aggro event');
    if (T.abortScriptedKill) T.abortScriptedKill();
    await wait(40);
    ok(!T.getCaveChase(), 'abort clears a running chase');

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
