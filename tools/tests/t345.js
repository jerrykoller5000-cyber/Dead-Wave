// t345 - CM-1 (Jerry, 24 Nov: "be my first person auditor"): first person's look.
//  - from his eyes he looks 69 degrees down and up (FP_PITCH), not the shoulder camera's -41 / +35 (OTS_PITCH);
//  - the mouse turn scales with the view's zoom: 1 at the hip, the tangent ratio down the sights (Aim FOV) and less again
//    in the sniper's scope, so a mouse movement moves the picture by the same amount at every zoom;
//  - a click in first person with no pointer lock ever granted (this headless browser) still fires: the "click only
//    takes the lock back" rule needs first person to have held the lock first (fpHadLock).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.fpLookDbg || !T.setViewFirstDbg || !T.otsLook || !T.setZoomHeldDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    await startMatch(T, 'FP look');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.grantAllWeapons();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) T.setWeapon(i); await wait(300);
    ok(T.getCurrentWeapon() === 'm4', 'an m4 in hand');
    const L0 = T.fpLookDbg();
    ok(Math.abs(L0.pitch[0] + 1.2) < 1e-6 && Math.abs(L0.pitch[1] - 1.2) < 1e-6, 'first person pitch range is +-1.2 rad (' + L0.pitch + ')');
    ok(L0.otsPitch[0] > -0.8 && L0.otsPitch[1] < 0.7, 'the shoulder camera keeps its own (' + L0.otsPitch + ')');

    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().w > 0.95, 20000), 'first person');
    await wait(400);
    // Pitch: far past the old stops both ways.
    T.otsLook(0, 100000); await wait(60);
    const down = T.otsDbg().pitch;
    ok(Math.abs(down + 1.2) < 0.001, 'looks down to -1.2 rad / 69 deg (' + down.toFixed(3) + ')');
    T.otsLook(0, -200000); await wait(60);
    const up = T.otsDbg().pitch;
    ok(Math.abs(up - 1.2) < 0.001, 'looks up to +1.2 rad / 69 deg (' + up.toFixed(3) + ')');
    T.setOtsAimDbg(null, 0); await wait(300);

    // The turn at the hip: one-to-one.
    const hip = T.fpLookDbg();
    ok(Math.abs(hip.zoomK - 1) < 0.02, 'at the hip the turn is unscaled (' + hip.zoomK.toFixed(3) + ', fov ' + hip.fov.toFixed(1) + ')');
    let y0 = T.otsDbg().yaw; T.otsLook(100, 0); await wait(30);
    const hipTurn = Math.abs(T.otsDbg().yaw - y0);
    // Down the sights.
    T.setZoomHeldDbg(true);
    ok(await until(() => T.fpDbg().ads > 0.99 && Math.abs(T.fpLookDbg().fov - T.otsDbg().fov) < 0.5, 9000), 'down the sights at the Aim FOV (' + T.fpLookDbg().fov.toFixed(1) + ')');
    const ads = T.fpLookDbg();
    const want = Math.tan(ads.fov * Math.PI / 360) / Math.tan(ads.hipFov * Math.PI / 360);
    ok(Math.abs(ads.zoomK - want) < 0.01 && ads.zoomK < 0.8, 'down the sights the turn scales by the zoom (' + ads.zoomK.toFixed(3) + ', want ' + want.toFixed(3) + ')');
    y0 = T.otsDbg().yaw; T.otsLook(100, 0); await wait(30);
    const adsTurn = Math.abs(T.otsDbg().yaw - y0);
    ok(Math.abs(adsTurn / hipTurn - ads.zoomK) < 0.02, 'the same mouse move turns ' + (adsTurn / hipTurn).toFixed(3) + ' as far down the sights');
    T.setZoomHeldDbg(false); await until(() => T.fpDbg().ads < 0.01, 6000);
    // The sniper's scope: a much narrower view, a much smaller turn.
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'sniper'; i++) T.setWeapon(i); await wait(600);
    if (T.getCurrentWeapon() === 'sniper') {
      T.setZoomHeldDbg(true);
      await until(() => T.fpLookDbg().fov < 30, 9000); await wait(1500);
      const sc = T.fpLookDbg();
      ok(sc.zoomK < 0.45 && Math.abs(sc.zoomK - Math.tan(sc.fov * Math.PI / 360) / Math.tan(sc.hipFov * Math.PI / 360)) < 0.01, 'in the scope the turn scales too (' + sc.zoomK.toFixed(3) + ' at ' + sc.fov.toFixed(1) + ' deg)');
      T.setZoomHeldDbg(false); await wait(600);
    } else ok(false, 'a sniper in hand');
    // Third person: never scaled.
    T.setViewFirstDbg(false); await until(() => T.fpDbg().w < 0.05, 9000);
    ok(T.fpLookDbg().zoomK === 1, 'third person: the turn is not scaled');

    // A click in first person when the lock was never granted still fires.
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) T.setWeapon(i);
    T.setViewFirstDbg(true); await until(() => T.fpDbg().w > 0.95, 20000); await wait(600);
    ok(T.fpLookDbg().hadLock === false, 'no pointer lock granted here (headless)');
    const ammo0 = T.getAmmo ? T.getAmmo().pistol : null;
    const cv = T.renderer.domElement, r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: cx, clientY: cy, bubbles: true }));
    await wait(250);
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: cx, clientY: cy, bubbles: true }));
    cv.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: cx, clientY: cy, bubbles: true }));
    await wait(300);
    const ammo1 = T.getAmmo ? T.getAmmo().pistol : null;
    ok(ammo0 != null && ammo1 != null && ammo1 < ammo0, 'the click fired (' + ammo0 + ' -> ' + ammo1 + ')');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    ok(false, 'threw: ' + (e && e.stack || e));
  }
  return out.join('\n');
})()
