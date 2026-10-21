// t104 - CU-59 (P-55): a TT debug hook marks the run, so it earns no badge. A fresh start
// clears the flag. A read-only Dbg hook does not set it.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'DebugFlag');
    ok(T.getDebugTouched() === false, 'a fresh run is eligible');
    T.fogCullDbg();
    ok(T.getDebugTouched() === false, 'reading the fog cull does not mark it');
    T.setGearDbg('helmet');
    ok(T.getDebugTouched() === true, 'setGearDbg marks the run');
    T.resetGame();
    ok(T.getDebugTouched() === false, 'a fresh start clears it');
    T.skipPrep();
    ok(T.getDebugTouched() === true, 'skipPrep marks the run');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
