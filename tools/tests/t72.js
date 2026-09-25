// t72 — CL-45 / D-28, CL-41 and D-34 (CL-51): the sky follows the loop. Prep is daylight and
// holds before dusk; the alarm brings the night; the next prep waits for the finisher; the
// night holds until the player picks Proceed to Morning (the sunrise, back at spawn) or Next
// Night (straight into the alarm).
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
    ok(T.getSlowMo() < 0.05, 'no second slow-down after the finisher: ' + T.getSlowMo().toFixed(2));
    // D-34: the night holds under the Night N Complete card until the player picks.
    ok(T.getSkyMode() === 'hold' && (hour() > 21 || hour() < 4), 'the night holds after the last kill: ' + T.getSkyMode() + ', ' + hour().toFixed(2) + 'h');
    // Proceed to Morning: the sunrise shot, then the marine at his spawn, in the morning.
    T.player.position.x += 20;
    ok(T.loopMorning() === true, 'Proceed to Morning starts the sunrise shot');
    ok(!!T.getLoopCine() && T.getLoopCine().kind === 'morning', 'the camera goes up to the sunrise');
    await until(() => !T.getLoopCine(), 9000);
    ok(!T.getLoopCine(), 'and comes back down');
    ok(hour() > 6.9 && hour() < 9, 'and it is morning: ' + hour().toFixed(2) + 'h');
    ok(!/Night/.test(tl()), 'day on the HUD: "' + tl() + '"');
    ok(Math.hypot(T.player.position.x - 0, T.player.position.z + 8.5) < 1.5, 'the marine is back at his spawn: ' + T.player.position.x.toFixed(1) + ', ' + T.player.position.z.toFixed(1));
    ok(T.getSkyMode() === 'prep', 'and prep runs as usual: ' + T.getSkyMode());
    // Next Night: from a held night, straight into the alarm (the moon, then the HQ).
    T.hqStartWave();
    await until(() => T.getPhase() === 'wave' && !T.getLoopCine(), 15000);
    T.clearZombies && T.clearZombies();
    const z2 = T.spawnZombie(p.x + 4, p.z + 4, 'shambler', true, true);
    T.drainWavePlanDbg();
    T.killZombie(z2, true, { kind: 'bullet', dir: { x: 1, z: 0 } });
    await until(() => T.getPhase() === 'prep', 8000);
    ok(T.getSkyMode() === 'hold', 'the second night holds too: ' + T.getSkyMode());
    const dayN = T.getWaveDirectorState().day;
    T.player.position.x += 20;
    ok(T.loopNextNight() === true, 'Next Night pulls the alarm at once');
    ok(!!T.getLoopCine() && T.getLoopCine().kind === 'night', 'from a dark sky: the moon, then the HQ');
    await until(() => T.getPhase() === 'wave', 9000);
    ok(T.getPhase() === 'wave' && T.getWaveDirectorState().day === dayN, 'night ' + dayN + ' is on: ' + T.getPhase());
    ok(Math.hypot(T.player.position.x - 0, T.player.position.z + 8.5) < 1.5, 'with the marine at the HQ');
    ok(hour() > 21 || hour() < 4, 'and the sky never went round through a day: ' + hour().toFixed(2) + 'h');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
