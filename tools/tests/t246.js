// t246 - CU-114 (Jerry: right-click aim tilts the camera). Same zoom as before, but on
// every weapon except the sniper the rig drops to about eye height just behind the
// gun shoulder and the view levels off, as if you were standing on the ground.
// The sniper stays a scope: first person, no shoulder pose.
// CL-174 (Jerry, after trying it: "more from behind his shoulder and more level"; then "2": shooter-style): aiming now
// puts the camera close behind his right shoulder at head height, level, looking where he aims, the crosshair in the
// middle and the mouse turning him. The expectations for range and side changed with it (REVIEW in the log): the camera
// comes in to about 3 m, sits a little to his right along his aim, and turns when the mouse does.
// CL-247 (D-87, Jerry after his friends' playtest: "No more using right click to go first person"): right-click in third
// person is now a 2x zoom on the cursor (t276 has it): no shoulder pose, no shoulder camera, the view still looks down.
// The shoulder camera came with the 5 key (viewFirst) for a moment; CL-249 (D-87: a true first person) put that view at
// his eyes, so the checks for it here are now: right-click there, down the sights, about his eye height, level, the
// Aim FOV, the mouse turning the view (t279 has the eye and the sight line in detail). The sniper's third-person
// right-click is its scope.
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
  // CL-247: first = the 5 key's shoulder camera; otherwise right-click's third-person zoom.
  const zoom = async (on, first = true) => {
    if (first || !on) T.setViewFirstDbg(!!on && first);
    T.setZoomHeldDbg(!!on);
    const t0 = Date.now();
    let v = view(), prev = v.dy, stable = 0;
    while (Date.now() - t0 < 8000) {
      await wait(100);
      v = view();
      const o = v.ots, zw = T.aimZoomDbg().w;
      const posed = on ? (first ? o && o.w > 0.96 : zw > 0.99) : (!o || o.w < 0.02) && zw === 0;
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
    // CL-247: the cursor on the canvas, as in play (the third-person zoom works from where it is).
    { const cv = T.renderer.domElement, r = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width * 0.55, clientY: r.top + r.height * 0.6, bubbles: true })); }
    const hip = view();
    const bl = Math.hypot(hip.dx, hip.dz) || 1;
    restRight = { x: hip.dz / bl, z: -hip.dx / bl };
    ok(hip.aim.pose < 0.05, 'no shoulder pose before aiming (pose ' + hip.aim.pose.toFixed(2) + ')');
    ok(hip.pitch < -0.4, 'the ordinary view looks down (pitch ' + hip.pitch.toFixed(2) + ')');
    ok(hip.dy > 6, 'the ordinary camera sits well above him (' + hip.dy.toFixed(1) + ' m)');

    ok(await arm('m4'), 'm4 in hand');
    // CL-247: right-click in third person: the zoom, not the shoulder.
    const tz = await zoom(true, false);
    ok(tz.aim.pose < 0.05 && !(tz.ots && tz.ots.w > 0.02), 'third person, right-click: no shoulder pose and no shoulder camera (pose ' + tz.aim.pose.toFixed(2) + ', ots ' + (tz.ots ? tz.ots.w.toFixed(2) : '-') + ')');
    ok(tz.pitch < -0.35 && tz.dy > 4, 'the view still looks down on him from above (pitch ' + tz.pitch.toFixed(2) + ', ' + tz.dy.toFixed(1) + ' m up)');
    ok(Math.abs(Math.tan(tz.fov * Math.PI / 360) / Math.tan(hip.fov * Math.PI / 360) - 0.5) < 0.04, 'and it zooms 2x (fov ' + tz.fov.toFixed(1) + ', was ' + hip.fov.toFixed(1) + ')');
    await zoom(false);
    const m4 = await zoom(true);
    ok(m4.fov > 34 && m4.fov < 42, 'm4 aim keeps the same zoom (fov ' + m4.fov.toFixed(1) + ', was 60 → 38)');
    ok(m4.ots && m4.ots.on && m4.ots.w > 0.9, 'm4, the 5 key: first person (CL-249)');
    ok(m4.dist < 1.7 && m4.dy > 1.0 && m4.dy < 1.9, 'm4 down the sights: at his own head height, on him (' + m4.dist.toFixed(2) + ' m from his feet, ' + m4.dy.toFixed(2) + ' m up; was ' + hip.dist.toFixed(1) + ' m)');
    ok(m4.pitch > hip.pitch + 0.35 && Math.abs(m4.pitch) < 0.3, 'm4 aim levels the view (pitch ' + m4.pitch.toFixed(2) + ', was ' + hip.pitch.toFixed(2) + ')');
    { const h0 = m4.heading; T.otsLook(-180, 0); await wait(900); const t = view();
      ok(Math.abs(t.heading - h0) > 0.2, 'the mouse turns the view while aiming (' + h0.toFixed(2) + ' -> ' + t.heading.toFixed(2) + ')'); }

    const back = await zoom(false);
    ok(!(back.ots && back.ots.w > 0.1) && back.dy > 4, 'letting go restores the high camera (' + back.dy.toFixed(1) + ' m up)');
    ok(back.pitch < -0.35, 'letting go looks down again (pitch ' + back.pitch.toFixed(2) + ')');

    for (const w of ['pistol', 'shotgun']) {
      ok(await arm(w), w + ' in hand');
      const z = await zoom(true);
      ok(z.ots && z.ots.on && z.dy > 1.0 && z.dy < 1.9 && z.dist < 1.7 && z.fov > 34 && z.fov < 42,
        w + ' aim: down the sights at his head height, same zoom (height ' + z.dy.toFixed(2) + ', ' + z.dist.toFixed(2) + ' m from his feet, fov ' + z.fov.toFixed(1) + ')');
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
