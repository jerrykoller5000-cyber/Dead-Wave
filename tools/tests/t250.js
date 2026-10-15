// t250 - CU-128: camp fires start out. Lighting one makes it burn. The next daybreak puts it out.
// Lighting every camp is only counted, for later.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Camps');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const camps = (T.campfires || []).filter((f) => f.camp && !f.dead);
    ok(camps.length > 0, 'the map has camp fires (' + camps.length + ')');
    ok(camps.every((f) => !f.lit && f.light.intensity === 0), 'they start cold');
    const cold = T.campfireCensus();
    ok(cold.total === camps.length && cold.lit === 0 && cold.all === false, 'none are lit (' + cold.lit + '/' + cold.total + ')');
    ok(T.lightCampfire(camps[0]) && camps[0].lit && camps[0].flames && camps[0].flames.visible, 'lighting one builds a flame');
    T.runDevCommand('night ops');
    await wait(400);
    ok(camps[0].light.intensity > 1, 'a lit fire throws light at night (' + camps[0].light.intensity.toFixed(2) + ')');
    const one = T.campfireCensus();
    ok(one.lit === 1 && one.all === (one.total === 1), 'the count is one lit, all only when that is every camp');
    T.campfireDawn();
    ok(!camps[0].lit && camps[0].light.intensity === 0 && !camps[0].flames.visible, 'daybreak puts it out');
    for (const f of camps) T.lightCampfire(f);
    const all = T.campfireCensus();
    ok(all.lit === all.total && all.all === true, 'every camp burning is counted (' + all.lit + '/' + all.total + ')');
    T.campfireDawn();
    ok(T.campfireCensus().lit === 0 && camps.every((f) => !f.lit), 'the next daybreak puts them all out');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
