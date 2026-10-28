// t69 - GB-39 (GB-A1): fighting the wave at its own cave mouth doesn't poke the cave, and a
// round that hits a zombie doesn't count. A clean miss into a mouth still pokes (D-26); since
// GB-44 (D-32) the run's first poke is the warning and the next one brings it out.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(100); } return cond(); };
  // GB-240 (rule 13): the wave wait measures the game's own clock, not the wall clock. A loaded page runs game time at a
  // fraction of real time, so a wall-clock cap can expire while the wave is still legitimately coming out (CU-166 chunk-02
  // went red at 179.6 s that way). The stall guard is only for a frozen page: no game time at all for 20 s of wall clock
  // fails the check instead of running out the runner's 180 s limit.
  const untilGame = async (cond, gameS, stallMs = 20000) => {
    const g0 = T.getSimTime();
    let lastG = g0, lastWall = Date.now();
    while (T.getSimTime() - g0 < gameS) {
      if (cond()) return true;
      await wait(100);
      const g = T.getSimTime();
      if (g > lastG + 1e-6) { lastG = g; lastWall = Date.now(); } else if (Date.now() - lastWall > stallMs) return false;
    }
    return cond();
  };
  try {
    ok(typeof T.caveBusyWithWave === 'function' && typeof T.spawnPlayerRound === 'function', 'GB-39 hooks exported');
    await startMatch(T, 'MouthFight');
    T.runDevCommand('godmode');
    const caves = T.POI.caves;
    const front = (c, d) => { const x = c.x + Math.sin(c.yaw) * d, z = c.z + Math.cos(c.yaw) * d; return { x, z, y: T.sampleHeight(x, z) }; };
    const place = (c, d) => { const f = front(c, d); T.player.position.set(f.x, f.y, f.z); };
    const V = T.player.position.constructor;
    const shoot = (fx, fy, fz, tx, ty, tz) => T.spawnPlayerRound(new V(fx, fy, fz), new V(tx - fx, ty - fy, tz - fz), 24);
    const used = () => T.getCavePokeState().used;

    const pv = typeof T.getWavePreview === 'function' ? T.getWavePreview() : T.getWavePreview;
    const ci = pv.caveIndices[0];
    const free = caves.map((_, i) => i).filter((i) => pv.caveIndices.indexOf(i) < 0);
    const i0 = free[0], other = free[1];
    // --- A round that hits a zombie in the mouth doesn't count (prep, no wave guard). ---
    const c0 = caves[i0];
    place(c0, 12);
    await wait(200);
    const inside = front(c0, -0.8);
    const z0 = T.spawnZombie(inside.x, inside.z, 'shambler', true, true);
    ok(!!z0, 'a shambler stands in the mouth of cave ' + i0);
    const hp0 = z0 ? z0.hp : 0;
    const P = T.player.position;
    shoot(P.x, P.y + 1.3, P.z, z0.mesh.position.x, z0.mesh.position.y + 1.0, z0.mesh.position.z);
    await wait(900);
    ok(z0 && (z0.hp < hp0 || !z0.alive), 'the round hit the shambler (' + hp0 + ' -> ' + (z0 && Math.round(z0.hp)) + ')');
    ok(!T.getCaveChase() && !T.getScriptedKill() && used().indexOf(i0) < 0 && T.getCavePokeState().warned === false,
      'a round that hits a zombie does not poke the cave (not even the warning)');
    if (z0 && z0.alive) T.damageZombie(z0, 999, { kind: 'bullet' });
    await wait(300);

    // --- A clean miss into the mouth still pokes: the first of the run warns (GB-44). ---
    place(c0, 12);
    await wait(100);
    const deep = front(c0, -3.5);
    shoot(P.x, P.y + 1.3, P.z, deep.x, c0.gy + 1.1, deep.z);
    const warned = await until(() => T.getCavePokeState().warned === true, 3000);
    ok(warned && !T.getCaveChase() && used().indexOf(i0) < 0, 'the first round of the run into an empty mouth is the warning');
    await until(() => { const w = T.getCavePokeState().warning; return !!w && w.age > T.getCavePokeState().grace + 0.1; }, 8000);
    place(c0, 12);
    await wait(50);
    shoot(P.x, P.y + 1.3, P.z, deep.x, c0.gy + 1.1, deep.z);
    const poked = await until(() => !!T.getCaveChase() || used().indexOf(i0) >= 0, 3000);
    let diag = '';
    if (!poked) {
      const f = front(c0, 0); const st = T.getCavePokeState();
      diag = ' [P ' + P.x.toFixed(1) + ',' + P.y.toFixed(1) + ',' + P.z.toFixed(1) + ' gy ' + c0.gy.toFixed(1) + ' mouthY ' + f.y.toFixed(1) + ' deepY ' + T.sampleHeight(deep.x, deep.z).toFixed(1) + ' state ' + JSON.stringify(st).slice(0, 160) + ' direct ' + T.noteCaveMouthHit(i0, null) + ']';
    }
    ok(poked && !!T.getCaveChase(), 'the next round into an empty mouth brings the guardian out' + diag);
    T.abortCaveChase(); if (T.abortScriptedKill) T.abortScriptedKill();
    await wait(200);

    // --- During the wave: the assault cave can't be poked while spawning / zombies in the mouth. ---
    const ca = caves[ci];
    place(ca, 12);
    await wait(200);
    T.hqStartWave();
    const spawned = await until(() => T.getPhase() === 'wave' && T.getWaveDirectorState().waveSpawned > 0, 20000);
    ok(spawned, 'the wave is spawning');
    ok(T.getPhase() === 'wave', 'phase is wave');
    ok(T.caveBusyWithWave(ci) === true, 'assault cave is busy while the wave spawns');
    ok(T.noteCaveMouthHit(ci, null) === false && !T.getCaveChase(), 'a round into the assault mouth mid-spawn does not poke');
    ok(T.noteCaveMouthHit(ci, { explosive: true }) === false && !T.getCaveChase(), 'nor does a grenade at the mouth');
    ok(used().indexOf(ci) < 0, 'assault cave not marked used');

    // Another cave, nobody in its mouth: still pokeable mid-wave.
    place(caves[other], 12);
    await wait(150);
    ok(T.caveBusyWithWave(other) === false, 'a different, empty cave is not busy');
    ok(T.triggerCavePoke(other) === true, 'a different cave can still be poked mid-wave');
    T.abortCaveChase();
    await wait(150);

    // GB-240 (rule 13): night 1 holds its claw-ups until half its cave walkers are within DAY1_RISE_SYNC (60 m) of the HQ,
    // or DAY1_RISE_MAX (75 s of game time). Standing out at the cave (~180 m from the HQ) for the wait leaves them held, so
    // the wave never reads as all out before the check's own time runs out. He waits it out at the HQ; the wave is the same 15.
    T.player.position.set(0, T.sampleHeight(0, 8), 8);   // beside the HQ, clear of its footprint
    await wait(250);

    // Once the wave has all spawned and the mouth is clear, the assault cave is pokeable again.
    // GB-241 (rule 13, Claude 2026-10-27): the wave's own state is the condition: every body spawned (waveSpawned >= waveTotal)
    // or the old body count (either, since the test page's director count can lag the bodies).
    // GB-240 (rule 13): the cap is 30 s of GAME time, not 120 s of wall clock. Night 1's fifteen need about four seconds of
    // game time, so 30 s is a wide margin that a stalled wave still misses (the check then fails, as before).
    const allOut = await untilGame(() => { const w = T.getWaveDirectorState(); return (w.waveTotal > 0 && w.waveSpawned >= w.waveTotal) || T.zombies.filter((z) => z.alive).length >= (pv.total || 20); }, 30);
    ok(allOut, 'the whole wave is out');
    const far = front(ca, 70);
    for (const z of T.zombies) if (z.alive) z.mesh.position.set(far.x + (Math.random() - 0.5) * 6, far.y, far.z + (Math.random() - 0.5) * 6);
    await wait(50);
    ok(T.caveBusyWithWave(ci) === false, 'spawned out and the mouth clear: not busy');
    // A zombie back in the mouth makes it busy again.
    const zb = T.zombies.find((z) => z.alive);
    const m = front(ca, -1);
    zb.mesh.position.set(m.x, ca.gy, m.z);
    ok(T.caveBusyWithWave(ci) === true, 'a zombie standing in the mouth makes it busy');
    zb.mesh.position.set(far.x, far.y, far.z);
    place(ca, 12);
    await wait(50);
    for (const z of T.zombies) if (z.alive) z.mesh.position.set(far.x, far.y, far.z);
    ok(T.triggerCavePoke(ci) === true, 'the assault cave pokes normally once its mouth is clear');
    T.abortCaveChase(); if (T.abortScriptedKill) T.abortScriptedKill();
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
