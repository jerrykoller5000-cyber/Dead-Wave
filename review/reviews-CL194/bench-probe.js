// review/reviews-CL194/bench-probe.js (CL-194): copy into tools/tests/ and run it as a check. Needs the Training Ground to enter in the suite (game/training-containment.js guard).
// probe (CL-193 x GP-19907): the dive at the firing bench in the Training Ground. Dive at it, along it, and away.
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
    const tg = D.tg(), TR = D.TRAINING, O = tg.origin, P = T.localPlayer ? T.localPlayer.position : T.player.position;
    const benchFront = O.z + TR.LINE_Z + 0.18;
    for (const [name, k, x] of [['at the bench', 'KeyW', 0], ['along it', 'KeyD', -3], ['away from it', 'KeyS', 3]]) {
      await until(() => V().phase === 'idle' && V().cd <= 0, 8000);
      P.set(O.x + x, tg.floorY, benchFront - 1.2); await wait(400);
      const z0 = P.z; let maxZ = -Infinity, maxY = -Infinity;
      key('keydown', k); key('keydown', 'KeyV'); key('keyup', 'KeyV');
      const dv = V();
      ok(dv.phase === 'air', name + ': V dives (dir ' + dv.dirX.toFixed(2) + ',' + dv.dirZ.toFixed(2) + ')');
      const t0 = Date.now();
      while (Date.now() - t0 < 12000 && V().phase !== 'idle') { maxZ = Math.max(maxZ, P.z); maxY = Math.max(maxY, P.y - tg.floorY); if (V().phase === 'down') key('keyup', k); await wait(30); }
      key('keyup', k);
      ok(maxZ < benchFront + 0.05, name + ': he stays on the shooter side (max z ' + (maxZ - benchFront).toFixed(2) + ' m from the bench front, ' + maxY.toFixed(2) + ' m up)');
      ok(await until(() => V().phase === 'idle', 6000), name + ': back on his feet (' + V().phase + ', moved ' + (P.z - z0).toFixed(2) + ' m in z)');
    }
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
