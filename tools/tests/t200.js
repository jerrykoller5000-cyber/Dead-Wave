// t200 - the "night N" console cheat (Jerry, 2026-10-06): jump a run to a night for a playthrough.
//  - "night 5": day 5's prep (the day before night 5), the night's plan queued, no "night cleared" for the skipped one.
//  - "night 10 now": night 10 under way at once.
//  - "night 1" goes back to the first; out-of-range numbers clamp to 1..20; a jump is never an earned badge.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Nights');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    let cleared = 0;
    window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'night-cleared') cleared++; });
    T.runDevCommand('night 5');
    await wait(300);
    ok(T.getDay() === 5 && T.getPhase() === 'prep', '"night 5": day 5, in the prep before the night (day ' + T.getDay() + ', ' + T.getPhase() + ')');
    ok(T.getDebugTouched(), 'a console jump is not an earned run (no badges)');
    ok(cleared === 0, 'no "night cleared" for a night he did not play');
    T.runDevCommand('night 10 now');
    await wait(600);
    ok(T.getDay() === 10 && T.getPhase() === 'wave', '"night 10 now": night 10 under way (day ' + T.getDay() + ', ' + T.getPhase() + ')');
    T.runDevCommand('Night 1');
    await wait(300);
    ok(T.getDay() === 1 && T.getPhase() === 'prep', '"Night 1": back to the first day (day ' + T.getDay() + ')');
    T.runDevCommand('night 99');
    await wait(300);
    ok(T.getDay() === 20, '"night 99" clamps to the last night, 20 (day ' + T.getDay() + ')');
    T.runDevCommand('night 0');
    await wait(300);
    ok(T.getDay() === 1, '"night 0" clamps to 1 (day ' + T.getDay() + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
