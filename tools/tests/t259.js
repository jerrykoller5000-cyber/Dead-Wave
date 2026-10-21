// t259 — CU-150: Quit asks before it ends a run. Closing the tab writes the run down and
// asks the browser to confirm. Reset profile asks, then erases the tt_ keys (D-31).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const best = () => { try { return JSON.parse(localStorage.getItem('tt_best_run') || 'null'); } catch (_) { return null; } };
  try {
    localStorage.removeItem('tt_best_run');
    localStorage.setItem('tt_cu150', 'kept');
    localStorage.setItem('tt_death_log', JSON.stringify(['fire']));
    await startMatch(T, 'Keep');
    ok(T.getPhase() === 'prep', 'in a run');
    document.getElementById('quitMenuBtn').click();
    ok(document.getElementById('pauseQuitView').classList.contains('on') && T.getPhase() === 'prep', 'quit asks first, the run is still on');
    document.getElementById('quitCancelBtn').click();
    ok(!document.getElementById('pauseQuitView').classList.contains('on') && T.getPhase() === 'prep', 'keep playing stays in the run');
    document.getElementById('quitMenuBtn').click();
    document.getElementById('quitConfirmBtn').click();
    const afterQuit = best();
    ok(T.getPhase() === 'idle' && afterQuit && afterQuit.runs === 1, 'ending it writes the run and returns to the menu (' + (afterQuit && afterQuit.runs) + ')');
    await startMatch(T, 'Keep');
    const beforeLeave = (best() || {}).runs;
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    const afterLeave = best();
    ok(T.getPhase() === 'prep' && afterLeave && afterLeave.runs === beforeLeave + 1, 'closing the tab writes the run while it is still on (' + (afterLeave && afterLeave.runs) + ')');
    document.getElementById('menuSettingsBtn').click();
    document.getElementById('resetProfileBtn').click();
    ok(document.getElementById('pauseResetView').classList.contains('on') && localStorage.getItem('tt_cu150') === 'kept' && localStorage.getItem('tt_death_log'), 'reset asks first and has not erased anything');
    document.getElementById('resetCancelBtn').click();
    ok(document.getElementById('pauseSettingsView').classList.contains('on') && localStorage.getItem('tt_death_log'), 'keeping the profile leaves the deaths');
    window.__DW_TEST_HOLD_RELOAD = true;
    document.getElementById('resetProfileBtn').click();
    document.getElementById('resetConfirmBtn').click();
    ok(localStorage.getItem('tt_cu150') === null && localStorage.getItem('tt_death_log') === null && localStorage.getItem('tt_best_run') === null, 'erasing the profile clears the tt_ keys');
  } catch (e) {
    ok(false, 'threw ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
