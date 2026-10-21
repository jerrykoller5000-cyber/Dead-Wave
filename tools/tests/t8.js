// t8 - builds and an open door with railing place mode on through the start of a wave. GB-45
// (GB-A9): every piece stands and the door is in, open. GB-46: it starts a real match first
// (Play needs a callsign; without one it used to end on phase idle with no zombies, so the wave
// part tested nothing), and checks the wave is on.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'DoorWave');
    T.unlockAllBuilds(); T.addCash(100000);
    const n0 = T.builds.length;
    const p = T.player.position; const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
    for (let i = -2; i <= 2; i++) { T.placeBuildAt('wall', gx + 3, gz + i); T.placeBuildAt('platform', gx + 3, gz + i); }
    T.placeBuildAt('wall', gx - 3, gz); T.placeBuildAt('wall', gx - 3, gz + 1); T.placeBuildAt('wall', gx - 3, gz - 1);
    const d = T.placeBuildAt('door', gx - 3, gz); if (d) d.doorOpen = true;
    T.setPlaceMode('railing');
    T.skipPrep(); T.skipGrace();
    const inWave = await until(() => T.getPhase() === 'wave' && T.zombies.some((z) => z.alive), 15000);
    await wait(3000);
    T.setPlaceMode(null);
    await wait(2000);
    out.push('zombies ' + T.zombies.length + ' builds ' + T.builds.length + ' phase ' + T.getPhase());
    const decks = [-2, -1, 0, 1, 2].filter((i) => { const b = T.cellOccupant(gx + 3, gz + i, 1, 'base'); return b && b.deck; }).length;
    ok(T.builds.length - n0 >= 13 && decks === 5, 'all the pieces stand: ' + (T.builds.length - n0) + ' new builds, ' + decks + '/5 platforms at lv1');
    ok(!!d && d.doorOpen === true && T.builds.indexOf(d) >= 0, 'the door went in and stands open');
    ok(inWave && T.getPhase() === 'wave', 'the match started and the wave came (' + T.getPhase() + ', ' + T.zombies.filter((z) => z.alive).length + ' alive)');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
