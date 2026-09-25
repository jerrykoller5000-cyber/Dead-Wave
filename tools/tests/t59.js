(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
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
    const onAxis = (c, d) => ({ x: c.x + Math.sin(c.yaw) * d, z: c.z + Math.cos(c.yaw) * d });

    let phases = [], warnFlags = [];
    const onEv = (ev) => {
      if (ev.detail && ev.detail.type === 'cave-guardian') {
        phases.push(ev.detail.phase + ':' + ev.detail.caveIndex);
        warnFlags.push(ev.detail.phase + ':' + ev.detail.warning);
      }
    };
    window.addEventListener('dw-game', onEv);

    // Park in front of a cave (outward along yaw), outside the grab band.
    const placeFront = (c, dist) => {
      const p = onAxis(c, dist);
      T.player.position.set(p.x, T.sampleHeight(p.x, p.z), p.z);
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
    ok(T.getCavePokeState().warned === false, 'nor does it count as the warning');

    placeFront(c0, 12);
    await wait(40);

    // GB-44 (D-32): the first poke of a run is only a warning: the screech, the eyes, a nudge.
    phases = []; warnFlags = [];
    const prior = c0.warnLevel || 0;
    ok(T.getCavePokeState().warned === false && T.getCavePokeState().warning === null, 'a new run starts unwarned');
    ok(T.noteCaveMouthHit(i0) === true, 'the first shot within 20 m is taken: the warning');
    ok(!T.getCaveChase() && !T.getScriptedKill(), 'the first poke of the run brings nothing out');
    ok(warnFlags.indexOf('aggro:true') >= 0 && phases.indexOf('aggro:' + i0) >= 0,
      'warning publishes the aggro (screech) cue with warning:true [' + warnFlags.join(',') + ']');
    const stW = T.getCavePokeState();
    ok(stW.warned === true && !!stW.warning && stW.warning.caveIndex === i0, 'run marked warned at cave ' + i0);
    ok((c0.warnLevel || 0) === 2 && stW.warning && stW.warning.eyes === true, 'the eyes: warn level ' + c0.warnLevel + ' (was ' + prior + ')');
    ok(!!stW.warning && stW.warning.shake > 0.15, 'the camera nudge: shake ' + (stW.warning && stW.warning.shake));
    ok(stW.used.indexOf(i0) < 0, 'the warning does not spend the cave');
    ok(T.noteCaveMouthHit(i0) === false && T.triggerCavePoke(i0) === false && !T.getCaveChase(),
      'the rest of the burst lands in the grace (' + stW.grace + ' s) and does nothing');
    const eyesShut = await until(() => { const w = T.getCavePokeState().warning; return !!w && w.age > stW.eyesFor + 0.1; }, 12000);
    ok(eyesShut && (c0.warnLevel || 0) === prior && T.getCavePokeState().warning.eyes === false,
      'the eyes close after ' + stW.eyesFor + ' s, back to level ' + prior + ' (now ' + c0.warnLevel + ')');

    // The second poke comes for him. GB-44 (GB-A8): a rock-sized solid on its line, and a wall
    // put down in its way once it is out (a wall up front would block the line of sight).
    const sp = onAxis(c0, 5.5), sy = T.sampleHeight(sp.x, sp.z);
    const solid = { x: sp.x, z: sp.z, radius: 0.9, y0: sy - 1, y1: sy + 4, landmark: null };
    T.worldSolids.push(solid);
    phases = []; warnFlags = [];
    ok(T.noteCaveMouthHit(i0) === true, 'the second shot within 20 m brings the guardian out');
    const ch = T.getCaveChase();
    ok(!!ch && ch.caveIndex === i0, 'guardian chase running');
    ok(!T.getScriptedKill(), 'no crawl-in snatch: the kill waits until he reaches the marine');
    ok(!!ch && ch.speed >= ch.playerRun * 2,
      'far too fast to outrun: ' + (ch && ch.speed) + ' m/s vs sprint ' + (ch && ch.playerRun));
    ok(warnFlags.indexOf('aggro:false') >= 0 && phases.indexOf('aggro:' + i0) >= 0, 'cave-guardian aggro event, warning:false');
    ok(!T.zombies.some((z) => z.cavePoke || z.cavePokeAwake), 'no fightable poke guardian spawned');
    ok(T.getCavePokeState().used.indexOf(i0) >= 0, 'cave marked used for the day');
    ok(T.triggerCavePoke(i0) === false, 'same cave blocked after poke');
    let wall = null;

    // Run straight away from the mouth at 1.3x a flat-out sprint, on the chase's own clock:
    // he still gets there.
    const fx0 = Math.sin(c0.yaw), fz0 = Math.cos(c0.yaw);
    let lastT = ch ? ch.t : 0, caught = false, ran = 0, minSolid = 1e9, steered = 0, smashed = 0, wallDownAt = null, wallLx = null;
    const tRun = performance.now();
    while (performance.now() - tRun < 20000) {
      const cc = T.getCaveChase();
      if (!cc) { caught = !!T.getScriptedKill(); break; }
      if (lzOf(c0, cc.x, cc.z) > 1) minSolid = Math.min(minSolid, Math.hypot(cc.x - solid.x, cc.z - solid.z));
      steered = cc.steered; smashed = cc.smashed;
      // Past the solid, a wall goes down 2.5 m ahead of it, on its line to him.
      if (!wall && lzOf(c0, cc.x, cc.z) > 7.5) {
        const p = T.player.position, hx = p.x - cc.x, hz = p.z - cc.z, hd = Math.hypot(hx, hz) || 1;
        wall = T.spawnBuild('wall', cc.x + hx / hd * 2.5, cc.z + hz / hd * 2.5);
        wallLx = (wall ? 'placed d ' + hd.toFixed(1) : 'no wall');
      }
      if (wall && wallDownAt === null && T.builds.indexOf(wall) < 0) wallDownAt = lzOf(c0, cc.x, cc.z);
      const step = Math.max(0, cc.t - lastT) * cc.playerRun * 1.3; lastT = cc.t;
      ran += step;
      const p = T.player.position, nx = p.x + fx0 * step, nz = p.z + fz0 * step;
      p.set(nx, T.sampleHeight(nx, nz), nz);
      await wait(16);
    }
    const si = T.worldSolids.indexOf(solid); if (si >= 0) T.worldSolids.splice(si, 1);
    const sk = T.getScriptedKill();
    ok(caught && !!sk && sk.kind === 'cave', 'caught while running at 1.3x sprint (ran ' + ran.toFixed(1) + ' m)');
    ok(minSolid >= 0.9 + 0.45 && steered > 0, 'it went round the solid on its line (closest ' + minSolid.toFixed(2) + ' m, steered ' + steered + ')');
    ok(!!wall && T.builds.indexOf(wall) < 0 && smashed >= 1, 'crashed through the wall put in its way (' + wallLx + ', smashed ' + smashed + ', down at ' + (wallDownAt === null ? '-' : wallDownAt.toFixed(1)) + ' m)');
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

    // Second cave still allowed (once-per-cave, not a global 2-cap), and the run is already
    // warned: it comes straight out.
    placeFront(c1, 12);
    await wait(40);
    phases = [];
    ok(T.triggerCavePoke(i1) === true, 'second cave poke ok');
    ok(!!T.getCaveChase() && T.getCaveChase().caveIndex === i1, 'second cave guardian out on its first poke: the warning is once a run');
    ok(phases.some((p) => p === 'aggro:' + i1), 'second aggro event');
    if (T.abortScriptedKill) T.abortScriptedKill();
    await wait(40);
    ok(!T.getCaveChase(), 'abort clears a running chase');

    ok(T.triggerCavePoke(i0) === false && T.triggerCavePoke(i1) === false, 'both caves spent for the day');
    ok(T.noteCaveMouthHit(i0, { explosive: true }) === false, 'explosive also blocked when spent');

    // Day reset frees caves again; the warning is not given twice in a run.
    if (T.startPrep) T.startPrep();
    await wait(40);
    placeFront(c0, 12);
    await wait(40);
    ok(T.getCavePokeState().used.length === 0, 'startPrep clears used caves');
    ok(T.getCavePokeState().warned === true, 'the run stays warned across the day');
    ok(T.triggerCavePoke(i0) === true && !!T.getCaveChase(), 'poke works again after day reset, and comes straight out');
    if (T.abortScriptedKill) T.abortScriptedKill();

    window.removeEventListener('dw-game', onEv);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
