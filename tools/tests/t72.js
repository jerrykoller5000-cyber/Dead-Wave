// t72 — CL-45 / D-28, CL-41 and D-39 (CL-56): the sky follows the loop. Prep is daylight and
// holds before dusk; the alarm brings the night under a shot that holds the HQ; the next prep
// waits for the finisher; the last kill brings the morning by itself, with a banner and no
// card; the next night is started at the panel.
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
    // D-39 (revises D-34): the last kill brings the day by itself. No card, no camera move:
    // the sky sweeps on to the morning over the finisher and the first seconds of prep, and
    // the night's numbers go up on a small banner with no buttons.
    ok(T.getSkyMode() === 'prep', 'prep after the finisher, no held night: ' + T.getSkyMode());
    await until(() => { const h = hour(); return h > 7.6 && h < 9; }, 14000);
    ok(hour() > 7.6 && hour() < 9, 'and it is morning by itself: ' + hour().toFixed(2) + 'h');
    ok(!/Night/.test(tl()), 'day on the HUD: "' + tl() + '"');
    const card = document.getElementById('dawnCard');
    ok(!!card && card.open === true, 'the Night Complete banner is up');
    ok(!!card && card.querySelectorAll('button').length === 0, 'and it has no buttons');
    ok(!!card && card.tagName !== 'DIALOG', 'and it is not a modal');
    ok(/Night 1 Complete/i.test(card ? card.textContent : ''), 'it names the night: "' + (card ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : '') + '"');
    ok(T.getPhase() === 'prep', 'the game goes on under it: ' + T.getPhase());
    ok(Math.abs(T.player.position.x - p.x) < 0.01, 'and the marine was not moved');
    // The next night comes from the briefing panel only; the alarm's shot holds the HQ.
    T.hqStartWave();
    ok(!!T.getLoopCine() && T.getLoopCine().kind === 'alarm', 'the alarm shot frames the HQ (no sky pan): ' + (T.getLoopCine() && T.getLoopCine().kind));
    await until(() => T.getPhase() === 'wave' && !T.getLoopCine(), 15000);
    ok(T.getPhase() === 'wave', 'night 2 is on: ' + T.getPhase());
    ok(hour() > 21 || hour() < 4, 'and it is night: ' + hour().toFixed(2) + 'h');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
