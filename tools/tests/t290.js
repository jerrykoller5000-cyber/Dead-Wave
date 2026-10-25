// t290 - CL-262 (Jerry's N14 and N15).
// N14: "Storms and rain happen a bit too often: about half as often. A grace period with no storms until day 3."
//  - the gap between storms is 200-540 s (was 100-270), day 3's first 140-320 s;
//  - on days 1 and 2 the storm clock doesn't run; on day 3 it does and a storm comes when it runs out.
// N15: "Add wind and windy elements to the world that flow in and out like the storms."
//  - a windy spell rises over ~10 s: the wind's strength goes up, leaves blow past him (one draw), and it falls away
//    after: the leaves go.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.windDbg) { ok(false, 'the CL-262 hook is there'); return out.join('\n'); }
    await startMatch(T, 'Weather');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    const W = T.windDbg, R = T.weather;

    // N14: the gaps.
    const gaps = [], firsts = [];
    for (let i = 0; i < 400; i++) { W.schedule(false); gaps.push(R.timer); W.schedule(true); firsts.push(R.timer); }
    const lo = Math.min(...gaps), hi = Math.max(...gaps), mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    ok(lo >= 200 && hi <= 540 && mean > 330 && mean < 410, 'between storms 200-540 s, about twice the old 100-270 (' + lo.toFixed(0) + '-' + hi.toFixed(0) + ', mean ' + mean.toFixed(0) + ' s)');
    ok(Math.min(...firsts) >= 140 && Math.max(...firsts) <= 320, "day 3's first storm 140-320 s in");

    // Days 1 and 2: the clock stands; day 3 it runs.
    R.raining = false; R.intensity = 0; R.rainTimeLeft = 0;
    for (const d of [1, 2]) {
      T.setDay(d); R.timer = 5; W.update(1); W.update(1); W.update(4);
      ok(!R.raining && R.timer === 5, 'day ' + d + ': no storm, its clock stands (' + R.timer + ' s left)');
    }
    T.setDay(3); R.timer = 5; W.update(1); W.update(1);
    ok(!R.raining && Math.abs(R.timer - 3) < 1e-6, 'day 3: the clock runs (' + R.timer.toFixed(1) + ' s left)');
    W.update(3.5);
    ok(R.raining && R.rainTimeLeft > 0, 'and the storm comes when it runs out');
    R.raining = false; R.rainTimeLeft = 0; R.intensity = 0; W.schedule(false);
    T.setDay(1);

    // N15: a windy spell.
    const S = W.spell, wind = W.wind, mesh = W.mesh;
    S.on = false; S.timer = 9999; S.w = 0;
    await wait(1500);
    const calm = []; { const t0 = Date.now(); while (Date.now() - t0 < 1500) { calm.push(wind.strength); await wait(50); } }
    ok(!mesh.visible && W.leaves.every((L) => !L.on), 'calm: no leaves blowing');
    S.timer = 0;   // it comes now
    ok(await until(() => S.on, 3000), 'a windy spell starts');
    ok(await until(() => S.w > 0.9, 60000), 'it rises (' + S.w.toFixed(2) + ')');
    const gale = []; { const t0 = Date.now(); while (Date.now() - t0 < 1500) { gale.push(wind.strength); await wait(50); } }
    const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    ok(avg(gale) > avg(calm) + 0.3, 'the wind is stronger (' + avg(calm).toFixed(2) + ' -> ' + avg(gale).toFixed(2) + ')');
    ok(wind.gale > 0.9, 'wind.gale ' + wind.gale.toFixed(2));
    ok(await until(() => W.leaves.filter((L) => L.on).length >= 40, 20000), 'leaves blow past him (' + W.leaves.filter((L) => L.on).length + ' at once)');
    ok(mesh.visible && mesh.isInstancedMesh, 'in one draw');
    const P = T.player.position, near = W.leaves.filter((L) => L.on && Math.hypot(L.x - P.x, L.z - P.z) < 30);
    ok(near.length >= 20, 'round him (' + near.length + ' within 30 m)');
    const moving = W.leaves.filter((L) => L.on && !L.ground);
    ok(moving.length > 0 && moving.every((L) => L.vx * wind.dirX + L.vz * wind.dirZ > 0), 'carried along the wind');
    ok(W.leaves.filter((L) => L.on).every((L) => L.y >= T.sampleHeight(L.x, L.z) - 0.01), 'none under the ground');
    S.left = 0;   // it ends
    ok(await until(() => !S.on, 3000), 'the spell ends');
    ok(await until(() => S.w < 0.15 && !mesh.visible, 60000), 'it falls away and the leaves go (' + S.w.toFixed(2) + ', ' + W.leaves.filter((L) => L.on).length + ' left)');
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
