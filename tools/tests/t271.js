// t271 - CL-237: in the night proper the sun's shadow map is redrawn as the night comes, when he walks 16 m from
// where it was drawn, and every 900 frames otherwise (it was every 150: each one a whole shadow pass in one frame,
// AG-110's night-20 spikes). By day it is drawn every frame, as before.
//  - The day: the map updates by itself (autoUpdate), not in the night proper.
//  - The night proper: one redraw as it comes, then none while he stands for 200 frames.
//  - He moves 20 m: one more, counted as a move.
//  - Back to day: autoUpdate again. No page errors.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Sun shadow');
    T.clearZombies && T.clearZombies();
    const S = () => T.sunShadowDbg(), sun = T.sun;
    if (typeof T.sunShadowDbg !== 'function' || !sun) { ok(false, 'TT.sunShadowDbg and TT.sun are there'); return out.join('\n'); }
    if (!sun.castShadow) { out.push('SKIP the sun casts no shadow at this quality'); return out.join('\n'); }
    ok(S().every === 900 && S().move === 16, 'every 900 frames, or 16 m (' + S().every + ', ' + S().move + ')');

    T.setWorldTime(0.5);
    ok(await until(() => sun.shadow.autoUpdate === true && !S().deep, 15000), 'by day the map draws every frame (autoUpdate ' + sun.shadow.autoUpdate + ')');

    const r0 = S().redraws;
    T.setWorldTime(0.97);
    ok(await until(() => S().deep, 20000), 'the night proper comes (sun ' + sun.intensity.toFixed(3) + ')');
    ok(sun.shadow.autoUpdate === false, 'at night the map is not drawn every frame');
    const r1 = S().redraws;
    ok(r1 === r0 + 1, 'one redraw as the night comes (' + (r1 - r0) + ')');

    // He stands: 200 frames with no redraw (the clock is held in the night).
    const hold = setInterval(() => { if (S().deep) return; T.setWorldTime(0.97); }, 200);
    const tick0 = S().tick;
    await until(() => S().tick - tick0 >= 200 || !S().deep, 120000);
    const stood = S().tick - tick0;
    ok(stood >= 200 && S().redraws === r1, 'no redraw while he stands (' + stood + ' frames, ' + (S().redraws - r1) + ' redraws)');

    // He moves 20 m: one more.
    const P = T.player.position, m0 = S().moved;
    P.x += 20;
    ok(await until(() => S().redraws > r1, 15000), 'a redraw when he has moved 20 m (' + (S().redraws - r1) + ')');
    ok(S().moved === m0 + 1 && S().redraws === r1 + 1, 'counted once, as a move (moved ' + (S().moved - m0) + ', redraws ' + (S().redraws - r1) + ')');
    P.x -= 20;
    clearInterval(hold);

    T.setWorldTime(0.5);
    ok(await until(() => sun.shadow.autoUpdate === true && !S().deep, 15000), 'back to day: every frame again');
  } catch (e) {
    ok(false, 'threw: ' + (e && e.stack || e));
  } finally {
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  }
  return out.join('\n');
})()
