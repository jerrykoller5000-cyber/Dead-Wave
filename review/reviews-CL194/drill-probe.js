// review/reviews-CL194/drill-probe.js (CL-194): copy into tools/tests/ and run it as a check (needs the Training Ground to enter in the suite).
// probe (CL-194): no bullet time in a timed range drill; free practice keeps it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const D = T.trainingDbg, V = () => T.diveDbg();
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl && !nameEl.value) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 8000), 'in the Training Ground');
    await wait(1500);
    const R = T.rangeDbg; ok(!!R && typeof R.feature === 'function', 'rangeDbg there');
    // free practice first: bullet time
    T.setDiveMeterDbg(1);
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(V().phase === 'air' && await until(() => V().k < 0.35, 6000), 'free practice: the dive slows time (k ' + V().k.toFixed(2) + ')');
    await until(() => V().phase === 'idle' && V().cd <= 0, 12000);
    // a timed drill
    const M = await import('/ui/range-drills.js');
    const d = M.drillsFor('pistol')[0];
    const r = R.start(d); await wait(300);
    const F = R.feature();
    ok(F && F.ruled && F.ruled(), 'a timed drill is on (' + JSON.stringify(R.read && R.read() && R.read().state) + ', start ' + JSON.stringify(r && r.ok) + ')');
    const m0 = V().meter;
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(V().phase === 'air', 'in the drill the dive still goes (' + V().phase + ')');
    let minK = 1; const t0 = Date.now(); while (Date.now() - t0 < 1500) { minK = Math.min(minK, V().k); await wait(30); }
    ok(minK > 0.999 && V().meter >= m0 - 1e-9, 'time at full speed (' + minK.toFixed(3) + '), meter not charged (' + m0.toFixed(2) + ' -> ' + V().meter.toFixed(2) + ')');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
