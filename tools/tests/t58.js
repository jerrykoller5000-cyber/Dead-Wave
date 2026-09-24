(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const near = (a, b, eps) => Math.abs(a - b) <= eps;
  try {
    document.getElementById('modeHunt').click(); await wait(1200);
    const p = T.player.position;
    for (const t of T.trees) { t.alive = false; t.stump = false; }
    for (const r of T.rocks) r.alive = false;
    const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
    T.levelGroundRect(T.gridCentre(gx - 8), T.gridCentre(gz - 8), T.gridCentre(gx + 8), T.gridCentre(gz + 8), T.sampleHeight(p.x, p.z), 6);
    T.unlockAllBuilds(); T.addCash(100000);
    const m = T.placeBuildAt('mortar', gx + 2, gz);
    ok(!!m, 'mortar placed');
    p.set(m.x - 1.1, T.sampleHeight(m.x, m.z), m.z); await wait(80);
    T.mountMortar(m);
    ok(typeof T.updateMortarArc === 'function', 'mortar APIs present');
    // Face east first so mount yaw is known.
    T.setAimTargetDbg(m.x + 20, m.z);
    T.updateMortarArc();
    await wait(50);
    const yaw0 = m.mesh.rotation.y;
    const px0 = p.x, pz0 = p.z, cx0 = T.camera.position.x, cz0 = T.camera.position.z, cy0 = T.camera.position.y;
    // Aim hard behind the mount bearing (west) and hold zoom — the old freakout case.
    T.setAimTargetDbg(m.x - 20, m.z);
    if (T.setZoomHeldDbg) T.setZoomHeldDbg(true);
    let maxPlayerJump = 0, maxCamJump = 0, nan = false;
    let prevPx = p.x, prevPz = p.z, prevCx = T.camera.position.x, prevCy = T.camera.position.y, prevCz = T.camera.position.z;
    for (let i = 0; i < 45; i++) {
      T.updateMortarArc();
      await wait(33);
      const pj = Math.hypot(p.x - prevPx, p.z - prevPz);
      const cj = Math.hypot(T.camera.position.x - prevCx, T.camera.position.y - prevCy, T.camera.position.z - prevCz);
      if (pj > maxPlayerJump) maxPlayerJump = pj;
      if (cj > maxCamJump) maxCamJump = cj;
      if (![p.x, p.z, T.camera.position.x, T.camera.position.y, T.camera.position.z].every(Number.isFinite)) nan = true;
      prevPx = p.x; prevPz = p.z; prevCx = T.camera.position.x; prevCy = T.camera.position.y; prevCz = T.camera.position.z;
    }
    if (T.setZoomHeldDbg) T.setZoomHeldDbg(false);
    const sol = T.mortarSolve(m);
    ok(!nan, 'camera/player positions stay finite');
    // Impact must stay on the camera-forward side of the tube (not behind into the view).
    const toImpactX = sol.tx - m.x, toImpactZ = sol.tz - m.z;
    // camYawCurrent is not exported; use camera→player as view forward.
    const viewX = p.x - T.camera.position.x, viewZ = p.z - T.camera.position.z;
    const vLen = Math.hypot(viewX, viewZ) || 1;
    const iLen = Math.hypot(toImpactX, toImpactZ) || 1;
    const dot = (toImpactX * viewX + toImpactZ * viewZ) / (vLen * iLen);
    ok(dot > -0.25, 'arc does not point back into the camera/marine view (dot=' + dot.toFixed(2) + ')');
    ok(maxPlayerJump < 1.2, 'marine footing does not teleport (max jump ' + maxPlayerJump.toFixed(2) + 'm/frame)');
    ok(maxCamJump < 4.0, 'camera does not freak (max jump ' + maxCamJump.toFixed(2) + 'm/frame)');
    // Zoom while mounted must not pull FOV/dist the way free aim does.
    const dist = Math.hypot(T.camera.position.x - p.x, T.camera.position.z - p.z);
    ok(dist > 3.5 && dist < 28, 'camera stays at a sane third-person range (' + dist.toFixed(1) + ')');
    // Forward aim still works (t33 regression smoke).
    T.setAimTargetDbg(m.x + 20, m.z);
    T.updateMortarArc();
    ok(!T.mortarArcBlocked(m, T.mortarSolve(m)), 'forward aim still clear under open sky');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
