// tcl283 - CL-283 (Claude; Jerry's J37): the goggles down by day wash his vision out (the tube's day filter on the
// canvas, the eyepiece's overlay on); at night the usual tube; goggles up, neither.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'CL283');
    T.setHp(100000);
    if (T.setGearDbg) T.setGearDbg('nvg');
    const cv = (T.renderer && T.renderer.domElement) || document.querySelector('canvas'), ov = document.getElementById('nvgOverlay');
    const state = () => ({ day: cv.classList.contains('nvg-washout'), night: cv.classList.contains('nvg-phosphor'), over: !!(ov && ov.classList.contains('on')) });
    ok(!!document.getElementById('nvgImageTubeDay'), 'the day tube filter is in the page');
    T.setWorldTime(0.5); await wait(400);
    let s = state();
    ok(!s.day && !s.night && !s.over, 'goggles up by day: no tube (' + JSON.stringify(s) + ')');
    T.toggleNvgDbg();
    await wait(400); s = state();
    ok(s.day && !s.night && s.over, 'goggles down by day: the washed-out tube and the eyepiece (' + JSON.stringify(s) + ')');
    T.setWorldTime(0.0); await wait(600); s = state();
    ok(!s.day && s.night && s.over, 'at night: the usual tube (' + JSON.stringify(s) + ')');
    T.toggleNvgDbg();
    await wait(400); s = state();
    ok(!s.day && !s.night && !s.over, 'goggles up again: neither (' + JSON.stringify(s) + ')');
  } catch (e) { ok(false, 'threw ' + String((e && e.stack) || e).slice(0, 300)); }
  return out.join('\n');
})();
