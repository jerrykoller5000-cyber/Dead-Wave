// t62 — CU-5 / CU-25: the morning ledger round-trips cash. Play does not resume it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    T.clearDayStart();
    try { localStorage.setItem('tt_death_log', JSON.stringify(['fire', 'blast'])); } catch (_) {}
    await startMatch(T, 'Ledger');
    let left = [];
    try { left = JSON.parse(localStorage.getItem('tt_death_log') || '[]'); } catch (_) {}
    ok(left.length === 0, 'a new game locks the tombstone');
    ok(T.getPhase() === 'prep' && T.getDay() === 1, 'a fresh run is day 1 prep');
    const blob = T.saveDayStart();
    ok(blob && blob.v === 1 && blob.day === 1 && blob.bank === T.getBank(), 'the morning save matches the bank (' + (blob && blob.bank) + ')');
    const before = T.getBank();
    T.addCash(250);
    ok(T.getBank() === before + 250, 'cash moved');
    ok(T.loadDayStart() === true, 'load accepts the save');
    ok(T.getBank() === before, 'cash is back to the morning (' + T.getBank() + ')');
    T.clearDayStart();
    ok(T.loadDayStart() === false, 'quit throws the morning away');
  } catch (e) {
    ok(false, 'threw ' + (e && e.message));
  }
  return out.join('\n');
})()
