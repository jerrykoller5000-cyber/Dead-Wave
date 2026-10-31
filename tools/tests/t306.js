// t306 - CU-189 (Jerry's J26): the weapon wheel keeps the camera. Opening it in third person must not
// switch to first person, and opening it in first person must not ease the view back out.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.fpDbg || !T.setViewFirstDbg || !T.openWheel || !T.closeWheelDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Wheel camera');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace();
    const F = () => T.fpDbg();
    const cam = T.camera;
    ok(!F().first && F().w < 0.05, 'third person to start (w ' + F().w.toFixed(2) + ')');
    const third = cam.position.clone();
    ok(T.openWheel('weapon') === true, 'the weapon wheel opens in third person');
    await wait(1000);
    ok(!F().first && F().w < 0.05, 'still third person with the wheel up (w ' + F().w.toFixed(2) + ')');
    ok(cam.position.distanceTo(third) < 1.5, 'the third-person camera stays (' + cam.position.distanceTo(third).toFixed(2) + ' m)');
    T.closeWheelDbg();
    await wait(200);

    T.setViewFirstDbg(true);
    ok(await until(() => F().w > 0.95, 20000), 'first person settles (w ' + F().w.toFixed(2) + ')');
    await wait(400);
    const eye = cam.position.clone();
    const w0 = F().w;
    ok(T.openWheel('weapon') === true, 'the weapon wheel opens in first person');
    await wait(1000);
    ok(F().first && F().w > 0.9, 'still first person, no ease out (w ' + w0.toFixed(2) + ' -> ' + F().w.toFixed(2) + ')');
    ok(cam.position.distanceTo(eye) < 0.35, 'the eye stays (' + cam.position.distanceTo(eye).toFixed(3) + ' m)');
    ok(F().headHidden, 'his head stays hidden');
    T.closeWheelDbg();
    await wait(400);
    ok(F().first && F().w > 0.9, 'closing the wheel leaves first person (w ' + F().w.toFixed(2) + ')');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't306 threw: ' + String((e && e.stack) || e).slice(0, 300));
  } finally {
    T.closeWheelDbg && T.closeWheelDbg();
    T.setViewFirstDbg && T.setViewFirstDbg(false);
  }
  return out.join('\n');
})()
