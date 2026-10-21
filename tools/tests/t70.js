// t70 - GB-40 (D-29, GB-A7): day 1 is 15 shamblers. 7 or 8 claw up out of the ground in the
// treeline 35-60 m from the HQ, out of the camera's view and never within 25 m of the marine;
// the rest walk out of the day's cave. No cave role on day 1. A marine standing at the mouth
// doesn't get zombies spawned on top of him.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    ok(typeof T.getWaveSpawnLog === 'function' && typeof T.pickGroundRiseSpot === 'function' && typeof T.pointInCameraView === 'function', 'GB-40 hooks exported');
    await startMatch(T, 'DayOne15');
    T.runDevCommand('godmode');
    const pv = T.getWavePreview();
    ok(pv && pv.day === 1 && pv.total === 15 && pv.queue.length === 15, 'day 1 is 15 (' + (pv && pv.total) + ')');
    ok(pv.queue.every((t) => t === 'shambler'), 'all shamblers');
    const gN = pv.groundByIndex.filter(Boolean).length;
    ok(gN === pv.groundRisers && gN >= 7 && gN <= 8, '7 or 8 from the ground (' + gN + ')');
    ok(pv.groundByIndex.every((g, i) => !g || pv.caveByIndex[i] === -1), 'ground rows carry caveIndex -1 in the preview');
    ok(pv.caveByIndex.every((c, i) => pv.groundByIndex[i] || (c >= 0 && pv.caveIndices.includes(c))), 'the rest come from the day\'s cave');
    const gb = pv.byTypeAndCave.filter((b) => b.ground);
    ok(gb.length === 1 && gb[0].count === gN && gb[0].caveIndex === -1, 'briefing rows: one ground bucket of ' + gN);
    ok(pv.byTypeAndCave.reduce((a, b) => a + b.count, 0) === 15, 'briefing rows add to 15');

    // Stand at the HQ window, fight the wave.
    const hqx = -5.9, hqz = -2.2;
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    await wait(300);
    T.hqStartWave();
    const allOut = await until(() => T.getWaveDirectorState().waveSpawned >= 15, 40000);
    ok(allOut, 'all 15 spawned (' + T.getWaveDirectorState().waveSpawned + ')');
    const log = T.getWaveSpawnLog();
    const g = log.filter((e) => e.ground), c = log.filter((e) => !e.ground);
    ok(log.length === 15, 'spawn log has 15 (' + log.length + ')');
    ok(g.length >= 6 && g.length <= gN, 'ground risers came up (' + g.length + ' of ' + gN + ' planned; a miss walks out of the cave)');
    ok(g.every((e) => e.hq >= 35 && e.hq <= 60), 'ground risers 35-60 m from the HQ (' + g.map((e) => e.hq.toFixed(0)).join(',') + ')');
    ok(g.every((e) => e.pd >= 25), 'never within 25 m of the marine (min ' + Math.min(...g.map((e) => e.pd)).toFixed(1) + ')');
    ok(g.every((e) => !e.inView), 'out of the camera\'s view');
    ok(c.every((e) => e.ci >= 0 && pv.caveIndices.includes(e.ci)), 'the rest walked out of the day\'s cave');
    const zs = T.zombies.filter((z) => z.alive);
    ok(zs.filter((z) => z.groundRise).every((z) => z.caveIndex === -1 && z.riseDur > 0), 'ground risers claw up (rise animation, no cave)');
    ok(zs.every((z) => !z.caveTrait), 'no cave role on day 1');

    // GB-A7: a new day 1 with the marine 4 m out from the assault mouth.
    T.clearZombies && T.clearZombies();
    T.setDay(0); T.startPrep();
    await wait(100);
    const pv2 = T.getWavePreview();
    ok(pv2 && pv2.day === 1, 'a second day 1 planned');
    const ci = pv2.caveIndices[0], cave = T.POI.caves[ci];
    const fx = cave.x + Math.sin(cave.yaw) * 4, fz = cave.z + Math.cos(cave.yaw) * 4;
    T.player.position.set(fx, T.sampleHeight(fx, fz), fz);
    await wait(200);
    T.hqStartWave();
    const some = await until(() => T.getWaveSpawnLog().filter((e) => !e.ground).length >= 4, 30000);
    const cl = T.getWaveSpawnLog().filter((e) => !e.ground);
    ok(some, 'cave spawns with the marine at the mouth (' + cl.length + ')');
    const minPd = Math.min(...cl.map((e) => e.pd));
    ok(minPd >= 5, 'none spawned on top of him: nearest ' + minPd.toFixed(1) + ' m (was ~2-4 m at lz -1.4..-0.2)');
    ok(!T.getScriptedKill() && !T.getCaveChase(), 'no grab or chase from standing there');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
