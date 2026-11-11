// tcb297 - CB-297 (J118, CLAUDE DIRECTOR for Claude 5's CE-2): the revolver's double-action trigger. Stepped frame by frame at
// 60 a second (T.stepFrame, one synchronous run, so the page's own frame rate does not matter):
// - the revolver does not fire on the click: its shot goes at the break, 0.12 s later (between 0.11 and 0.14 s);
// - the pull's progress reaches the view (st.triggerPull = { weapon: 'revolver', u }) rising from 0 toward 1, null after the shot;
// - let go before the break: the trigger goes back and no shot;
// - held, the pull repeats at its own rate (a second shot comes, its own pull after the gun is ready again);
// - the pistol and the M4 still fire on the click (the first frame), and st.triggerPull is null on them.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.revolverPullDbg || !T.stepFrame) { ok(false, 'the hooks are there (revolverPullDbg, stepFrame)'); return out.join('\n'); }
    await startMatch(T, 'CB297');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(400); return T.getCurrentWeapon() === w; };
    const dt = 1 / 60;
    // hold the trigger for n frames; returns the frame (1-based) of each shot and the view's pull per frame
    const hold = (w, n) => {
      const a0 = T.getAmmo()[w]; let last = a0; const shots = [], pulls = [];
      T.setMouseFireDbg(true);
      for (let i = 1; i <= n; i++) {
        T.stepFrame(dt);
        const a = T.getAmmo()[w]; if (a < last) shots.push(i); last = a;
        const v = T.vmStateDbg ? T.vmStateDbg() : null; const tp = v ? v.triggerPull : undefined; pulls.push(tp && tp.weapon === 'revolver' ? tp.u : tp);
      }
      T.setMouseFireDbg(false); T.stepFrame(dt); T.stepFrame(dt);
      return { shots, pulls };
    };
    ok(await take('revolver'), 'the revolver in hand');
    T.setViewFirstDbg && T.setViewFirstDbg(true); await wait(300);
    T.setAmmoDbg('revolver', 6); for (let i = 0; i < 30; i++) T.stepFrame(dt);
    let r = hold('revolver', 12);
    const t1 = r.shots[0] != null ? r.shots[0] * dt : null;
    ok(r.shots.length === 1 && t1 > 0.105 && t1 < 0.145, 'the shot at the break: ' + (t1 != null ? (t1 * 1000).toFixed(0) + ' ms' : 'none') + ' after the click (one shot in 12 frames: ' + r.shots.join(',') + ')');
    ok(r.shots[0] > 1, 'not on the click (frame ' + r.shots[0] + ')');
    const before = r.pulls.slice(0, r.shots[0] - 1).filter((p) => typeof p === 'number');
    ok(before.length > 3 && before.every((p, i) => i === 0 || p >= before[i - 1]) && before[before.length - 1] > 0.75, 'the view\'s pull rises to the break: ' + before.map((p) => p != null ? p.toFixed(2) : '-').join(' '));
    ok(r.pulls[r.shots[0] - 1] === null || r.pulls[r.shots[0] - 1] === undefined || r.pulls[r.shots[0] - 1] < 0.5, 'and is gone after the shot (' + r.pulls.slice(-3).map((p) => p != null ? p.toFixed(2) : '-').join(' ') + ')');
    for (let i = 0; i < 60; i++) T.stepFrame(dt);
    // let go before the break
    T.setAmmoDbg('revolver', 6); const a0 = T.getAmmo().revolver;
    T.setMouseFireDbg(true); for (let i = 0; i < 4; i++) T.stepFrame(dt); T.setMouseFireDbg(false);
    for (let i = 0; i < 20; i++) T.stepFrame(dt);
    ok(T.getAmmo().revolver === a0 && T.revolverPullDbg().t < 0, 'let go after 4 frames (67 ms): the trigger goes back, no shot');
    // held: repeats at its own rate
    for (let i = 0; i < 60; i++) T.stepFrame(dt);
    T.setAmmoDbg('revolver', 6);
    r = hold('revolver', 150);
    const gaps = r.shots.slice(1).map((s, i) => ((s - r.shots[i]) * dt).toFixed(2));
    ok(r.shots.length >= 2, 'held 2.5 s: the pull repeats (' + r.shots.length + ' shots, ' + gaps.join(', ') + ' s apart)');
    ok(r.shots.length >= 2 && (r.shots[1] - r.shots[0]) * dt >= T.WEAPON_STATS.revolver.interval, 'no faster than the gun\'s own rate (' + T.WEAPON_STATS.revolver.interval + ' s)');
    T.setViewFirstDbg && T.setViewFirstDbg(false);
    // the others fire on the click
    for (const w of ['pistol', 'm4']) {
      ok(await take(w), w + ' in hand');
      T.setAmmoDbg(w, 10); for (let i = 0; i < 40; i++) T.stepFrame(dt);
      const q = hold(w, 3);
      ok(q.shots[0] === 1, w + ' fires on the click (frame ' + q.shots[0] + ')');
      ok(q.pulls.every((p) => p === null || p === undefined), w + ': no trigger pull in the view\'s state');
    }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { try { T.setMouseFireDbg(false); } catch (_) {} }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
