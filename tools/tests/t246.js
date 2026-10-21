// t246 - CU-114 (Jerry: right-click aim tilts the camera). Same zoom as before, but on
// every weapon except the sniper the rig drops to about eye height just behind the
// gun shoulder and the view levels off, as if you were standing on the ground.
// The sniper stays a scope: first person, no shoulder pose.
// CL-174 (Jerry, after trying it: "more from behind his shoulder and more level"; then "2": shooter-style): aiming now
// puts the camera close behind his right shoulder at head height, level, looking where he aims, the crosshair in the
// middle and the mouse turning him. The expectations for range and side changed with it (REVIEW in the log): the camera
// comes in to about 3 m, sits a little to his right along his aim, and turns when the mouse does.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  // Side is measured along the resting camera's right, not the aim view's right:
  // once the rig steps behind the shoulder it looks back toward him, and that
  // view-right shrinks a real 2.4 m offset down to about half a metre.
  let restRight = null;
  const view = () => {
    const p = T.player.position, c = T.camera.position;
    const dir = T.camera.getWorldDirection(new THREE.Vector3());
    const pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    const dx = c.x - p.x, dy = c.y - p.y, dz = c.z - p.z;
    const side = restRight ? dx * restRight.x + dz * restRight.z : 0;
    const ground = T.sampleHeight(c.x, c.z);
    return { pitch, side, dy, dist: Math.hypot(dx, dy, dz), fov: T.camera.fov, aim: T.getAimCamDbg(),
      clearance: c.y - ground, dx, dz, ots: T.otsDbg ? T.otsDbg() : null,
      // CL-174: how far to the right of his aim line the camera sits, and the view's heading
      shoulder: (() => { const o = T.otsDbg ? T.otsDbg() : null; if (!o) return 0; return dx * -Math.cos(o.yaw) + dz * Math.sin(o.yaw); })(),
      heading: Math.atan2(dir.x, dir.z) };
  };
  const arm = async (w) => {
    T.grantAllWeapons();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await wait(200);
    return T.getCurrentWeapon() === w;
  };
  // The headless page can deliver only a handful of frames a second, and the
  // camera eases on those frames. Wait until the pose and the height both sit still.
  const zoom = async (on) => {
    T.setZoomHeldDbg(!!on);
    const t0 = Date.now();
    let v = view(), prev = v.dy, stable = 0;
    while (Date.now() - t0 < 8000) {
      await wait(100);
      v = view();
      const posed = on ? v.aim.pose > 0.96 : v.aim.pose < 0.05;
      if (posed && Math.abs(v.dy - prev) < 0.08) stable++; else stable = 0;
      prev = v.dy;
      if (posed && stable >= 3) break;
    }
    return v;
  };
  try {
    await startMatch(T, 'AimCam');
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const y = T.sampleHeight(p.x, p.z);
    const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
    T.levelGroundRect(T.gridCentre(gx - 24), T.gridCentre(gz - 24), T.gridCentre(gx + 24), T.gridCentre(gz + 24), y, 8);
    p.y = y;
    await wait(800);
    ok(!!T.getAimCamDbg, 'aim camera debug is on the page');
    const hip = view();
    const bl = Math.hypot(hip.dx, hip.dz) || 1;
    restRight = { x: hip.dz / bl, z: -hip.dx / bl };
    ok(hip.aim.pose < 0.05, 'no shoulder pose before aiming (pose ' + hip.aim.pose.toFixed(2) + ')');
    ok(hip.pitch < -0.4, 'the ordinary view looks down (pitch ' + hip.pitch.toFixed(2) + ')');
    ok(hip.dy > 6, 'the ordinary camera sits well above him (' + hip.dy.toFixed(1) + ' m)');

    ok(await arm('m4'), 'm4 in hand');
    const m4 = await zoom(true);
    ok(m4.aim.pose > 0.9, 'm4 aim brings the shoulder pose in (pose ' + m4.aim.pose.toFixed(2) + ')');
    ok(m4.fov > 34 && m4.fov < 42, 'm4 aim keeps the same zoom (fov ' + m4.fov.toFixed(1) + ', was 60 → 38)');
    ok(m4.ots && m4.ots.on && m4.ots.w > 0.9, 'm4 aim is the shoulder camera (CL-174)');
    ok(m4.dist > 2 && m4.dist < 4.5 && m4.dist < hip.dist * 0.6, 'm4 aim comes in behind his shoulder (' + m4.dist.toFixed(1) + ' m, was ' + hip.dist.toFixed(1) + ')');
    ok(m4.dy > 1.2 && m4.dy < 2.4 && m4.dy < hip.dy - 4, 'm4 aim drops to head height (' + m4.dy.toFixed(2) + ' m above his feet, ' + m4.clearance.toFixed(2) + ' m above the ground there)');
    ok(m4.pitch > hip.pitch + 0.35 && Math.abs(m4.pitch) < 0.2, 'm4 aim levels the view (pitch ' + m4.pitch.toFixed(2) + ', was ' + hip.pitch.toFixed(2) + ')');
    ok(m4.shoulder > 0.35 && m4.shoulder < 1.1, 'm4 aim sits off his right shoulder (' + m4.shoulder.toFixed(2) + ' m right of his aim line)');
    { const h0 = m4.heading; T.otsLook(-180, 0); await wait(900); const t = view();
      ok(Math.abs(t.heading - h0) > 0.2, 'the mouse turns the view while aiming (' + h0.toFixed(2) + ' -> ' + t.heading.toFixed(2) + ')'); }

    const back = await zoom(false);
    ok(back.aim.pose < 0.1, 'letting go restores the high camera (pose ' + back.aim.pose.toFixed(2) + ')');
    ok(back.pitch < -0.35, 'letting go looks down again (pitch ' + back.pitch.toFixed(2) + ')');

    for (const w of ['pistol', 'shotgun']) {
      ok(await arm(w), w + ' in hand');
      const z = await zoom(true);
      ok(z.ots && z.ots.on && z.dy < 2.4 && z.shoulder > 0.35 && z.fov > 34 && z.fov < 42,
        w + ' aim: head height, off the shoulder, same zoom (height ' + z.dy.toFixed(2) + ', clearance ' + z.clearance.toFixed(2) + ', shoulder ' + z.shoulder.toFixed(2) + ', fov ' + z.fov.toFixed(1) + ')');
      await zoom(false);
    }

    ok(await arm('sniper'), 'sniper in hand');
    T.setZoomHeldDbg(true);
    let scope = view();
    const t0 = Date.now();
    while (Date.now() - t0 < 2500) {
      await wait(40);
      scope = view();
      if (scope.fov < 28 && scope.dist < 3) break;
    }
    ok(!(scope.ots && scope.ots.on), 'sniper aim is not the shoulder camera (CL-174)');
    ok(scope.aim.pose < 0.15, 'sniper aim does not use the shoulder pose (pose ' + scope.aim.pose.toFixed(2) + ')');
    ok(scope.fov < 28, 'sniper aim is still the scope (fov ' + scope.fov.toFixed(1) + ')');
    ok(scope.dist < 3, 'sniper aim stays at the glass (' + scope.dist.toFixed(2) + ' m), not the standing rig');
    T.setZoomHeldDbg(false);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
