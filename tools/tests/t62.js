// t62 — CU-31 (D-30, D-31): no morning save, and the ways-to-die collection lasts across runs.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    try {
      localStorage.removeItem('tt_day_start');
      localStorage.setItem('tt_death_log', JSON.stringify(['fire', 'blast']));
    } catch (_) {}
    await startMatch(T, 'Ledger');
    ok(T.getPhase() === 'prep' && T.getDay() === 1, 'a fresh run is day 1 prep');
    ok(localStorage.getItem('tt_day_start') === null, 'no morning save is written');
    ok(typeof T.saveDayStart === 'undefined' && typeof T.loadDayStart === 'undefined', 'the save hooks are gone');
    const log = T.loadDeathLog();
    ok(log.includes('fire') && log.includes('blast'), 'a new game keeps the deaths found before: ' + JSON.stringify(log));
  } catch (e) {
    ok(false, 'threw ' + (e && e.message));
  }
  return out.join('\n');
})()
