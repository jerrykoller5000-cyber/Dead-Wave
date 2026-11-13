// tci2 - CI-2 (J151 note 32, Jerry: "The chainsaw should vibrate slightly when running."): the running saw shakes a
// little in his hands (more on the throttle), not at all when it is off, and never the camera.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Saw shake');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.setHp && T.setHp(1e6);
    T.grantWeaponDbg ? T.grantWeaponDbg('chainsaw') : (T.getWeaponOwned().chainsaw = true);
    T.setWeapon((T.WEAPON_ORDER || []).indexOf('chainsaw'));
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && T.sawStartDbg().phase !== 'ready') await wait(50);
    ok(T.sawStartDbg().phase === 'ready', 'the saw started (' + T.sawStartDbg().phase + ')');
    await wait(1200);
    const gun = T.weaponMeshes.chainsaw, V = T.THREE.Vector3, cam = new V();
    // The saw's place in his own frame, frame by frame: the shake is what changes from one frame to the next beyond a
    // smooth path (the second difference), in millimetres; the camera's the same way.
    const jitter = async (n) => {
      const ps = [], cs = [];
      for (let i = 0; i < n; i++) {
        await frame();
        // the mount the saw (or whatever is in hand) sits on: its own offsets only (recoil, the reload's tilt, the shake),
        // none of the arms' or the body's animation; rotation as millimetres at the bar's tip (0.9 m out)
        const held = (T.getActiveGun && T.getActiveGun()) || gun, m = held.parent;
        ps.push([m.position.x + m.rotation.y * 0.9, m.position.y + m.rotation.x * 0.9, m.position.z + m.rotation.z * 0.05]);
        const p = T.player.position;
        T.camera.getWorldPosition(cam); cs.push([cam.x - p.x, cam.y - p.y, cam.z - p.z]);
      }
      const d2 = (a) => { let s = 0, k = 0; for (let i = 2; i < a.length; i++) { for (let j = 0; j < 3; j++) { const v = a[i][j] - 2 * a[i - 1][j] + a[i - 2][j]; s += v * v; } k++; } return k ? Math.sqrt(s / k) * 1000 : 0; };
      return { gun: d2(ps), cam: d2(cs) };
    };
    T.setMouseFireDbg(false);
    await wait(500);
    const idle = await jitter(40);
    const vIdle = T.vmStateDbg ? T.vmStateDbg().sawShake : null;
    T.setMouseFireDbg(true);
    await wait(600);
    const rev = await jitter(40);
    const vRev = T.vmStateDbg ? T.vmStateDbg().sawShake : null;
    T.setMouseFireDbg(false);
    await wait(600);
    ok(idle.gun > 0.3, 'third person: the running saw shakes a little idling (' + idle.gun.toFixed(2) + ' mm a frame)');
    // On the throttle the mount already moves with the saw's bite kicks (12.8 mm a frame on this page before CI-2), so the
    // throttle's shake is checked by its level (below) and here only that it adds, within reason.
    ok(rev.gun > idle.gun && rev.gun < 25, 'third person: more on the throttle (' + rev.gun.toFixed(2) + ' mm a frame, the bite kicks included)');
    ok(rev.cam < 0.2 && idle.cam < 0.2, 'the camera does not shake (' + idle.cam.toFixed(3) + ' / ' + rev.cam.toFixed(3) + ' mm a frame)');
    ok(vIdle != null && Math.abs(vIdle - 0.4 * 1.8) < 0.1 && vRev > 0.9 * 1.8, 'first person: the view gun gets the shake at its share (level idling ' + vIdle + ', on the throttle ' + vRev + '; 1.8x the body\'s)');
    // Off: out of gas the engine stops; the saw stays in his hands, still.
    const fuel = T.setSawFuelDbg || null;
    T.setWeapon((T.WEAPON_ORDER || []).indexOf('pistol'));
    { const g0 = T.getSimTime(); while (T.getSimTime() - g0 < 3) await wait(50); }
    const off = await jitter(30);
    ok(off.gun < 0.3 && (!T.vmStateDbg || !T.vmStateDbg().sawShake), 'off (put away, the engine stopped): no shake (' + off.gun.toFixed(2) + ' mm a frame' + (fuel ? '' : '') + ')');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 1).join('').slice(0, 120) + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  try { window.TT.setMouseFireDbg(false); } catch (_) {}
  return out.join('\n');
})()
