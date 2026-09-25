// t72 — CL-45 / D-28 and CL-41: the sky follows the loop, and the next prep waits for the
// finisher. Prep is daylight and holds before dusk; the alarm brings the night; the last
// kill's finisher runs the sky round to the dawn, and only then does the next day's prep start.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  const hour = () => (T.getWorldTime() * 24);
  const tl = () => (document.getElementById('timeLine') || {}).textContent || '';
  try {
    await startMatch(T, 'SkyLoop');
    ok(hour() > 7 && hour() < 11, 'a match opens in the morning: ' + hour().toFixed(2) + 'h');
    ok(!/Night/.test(tl()), 'the HUD says day: "' + tl() + '"');
    // Prep holds in the late afternoon, however long you take.
    T.setWorldTime(0.678);
    await until(() => Math.abs(T.getWorldTime() - 0.68) < 0.0005, 10000);
    await wait(2000);
    ok(Math.abs(T.getWorldTime() - 0.68) < 0.0005, 'prep holds before dusk: ' + hour().toFixed(2) + 'h');
    ok(!/Night/.test(tl()), 'still day while it holds');
    // The alarm brings the night.
    T.hqStartWave();
    await until(() => T.getPhase() === 'wave', 12000);
    await until(() => /^Night/.test(tl()), 8000);
    ok(T.getPhase() === 'wave', 'the alarm starts the wave');
    ok(/^Night/.test(tl()) && hour() > 21, 'the wave is fought at night: ' + hour().toFixed(2) + 'h, "' + tl() + '"');
    const dayBefore = T.getWaveDirectorState().day;
    // The last kill.
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const z = T.spawnZombie(p.x + 4, p.z + 4, 'shambler', true, true);
    T.drainWavePlanDbg();
    T.killZombie(z, true, { kind: 'bullet', dir: { x: 1, z: 0 } });
    await wait(400);
    const F = T.getWaveFinisher();
    ok(!!F, 'the last kill starts the finisher');
    ok(T.getPhase() === 'wave' && T.getWaveDirectorState().day === dayBefore, 'the next prep waits for it: ' + T.getPhase() + ', day ' + T.getWaveDirectorState().day);
    const dur = F ? F.dur : 7.2;
    await wait(dur * 1000 * 0.5);
    ok(T.getPhase() === 'wave', 'still day ' + dayBefore + ' halfway through the finisher');
    await until(() => T.getPhase() === 'prep', (dur + 4) * 1000);
    ok(T.getPhase() === 'prep' && T.getWaveDirectorState().day === dayBefore + 1, 'then day ' + (dayBefore + 1) + "'s prep: " + T.getPhase());
    ok(!T.getWaveFinisher(), 'once the finisher has handed the camera back');
    ok(hour() > 6.9 && hour() < 9, 'and it is morning: ' + hour().toFixed(2) + 'h');
    ok(!/Night/.test(tl()), 'day on the HUD: "' + tl() + '"');
    ok(T.getSlowMo() < 0.05, 'no second slow-down after the finisher: ' + T.getSlowMo().toFixed(2));
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
