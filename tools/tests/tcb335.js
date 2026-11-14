// tcb335 - CB-333 (J153 note 19, Jerry: "3rd person rotate on camera still getting stuck. Unplayable"), the town half: in a
//  match the third-person view's heading follows the middle-drag (the game's own mouse handlers) every frame, all the way
//  round, both ways, standing against the HQ's four walls and corners, walking along one, and on open ground. (In the
//  Training Ground the stuck turn was GP-20091's station shoulder: tcb334.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.stepFrame || !T.flightHold || !T.house) { ok(false, 'the hooks are there (stepFrame, flightHold, house)'); return out.join('\n'); }
    await startMatch(T, 'Turn');
    T.clearZombies && T.clearZombies(); T.runDevCommand && T.runDevCommand('godmode');
    T.setViewFirstDbg && T.setViewFirstDbg(false);
    const P = T.player.position, cam = T.camera, V = T.THREE.Vector3, H = T.house.group.position, h = T.house.half || 3;
    const cv = T.renderer.domElement, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), DEG = 180 / Math.PI;
    const d3 = new V(), yawNow = () => { cam.getWorldDirection(d3); return Math.atan2(d3.x, d3.z); };
    let cx = 800;
    const mmb = (type, x) => cv.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: 400, button: 1, buttons: type === 'mouseup' ? 0 : 4, bubbles: true }));
    T.flightHold(true);
    const g = h + 0.9;   // just off the HQ's walls
    const spots = [[0, -g, 1], [g, 0, -1], [0, g, 1], [-g, 0, -1], [g, g, 1], [-g, -g, -1], [-g, -g + 0.5, 1, 0, 1.5], [14, 9, 1]];
    const PX = 10, rows = []; let worstRun = 0, worstLag = 0;
    for (const s of spots) {
      const dir = s[2];
      const put = (x, z) => P.set(x, T.sampleHeight(x, z), z);
      put(H.x + s[0], H.z + s[1]);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      mmb('mousedown', cx); cx += 6 * dir; mmb('mousemove', cx);
      let want = yawNow(), prev = want, run = 0, maxRun = 0, maxLag = 0;
      const n = Math.ceil(2 * Math.PI / 0.006 / PX) + 30;
      for (let f = 0; f < n; f++) {
        cx += PX * dir; mmb('mousemove', cx); want += -PX * dir * 0.006;
        if (s[4]) put(P.x + (s[3] || 0) / 60, P.z + s[4] / 60);
        T.stepFrame(1 / 60);
        const y = yawNow();
        if (f > 30) maxLag = Math.max(maxLag, Math.abs(wrap(want - y)) * DEG);
        if (Math.abs(wrap(y - prev)) * DEG < 0.15) { run++; maxRun = Math.max(maxRun, run); } else run = 0;
        prev = y;
      }
      mmb('mouseup', cx);
      worstRun = Math.max(worstRun, maxRun); worstLag = Math.max(worstLag, maxLag);
      rows.push(s.slice(0, 2).map((v) => v.toFixed(1)).join(',') + (s[4] ? ' walking' : '') + ': lag ' + maxLag.toFixed(0) + ', held ' + maxRun);
    }
    T.flightHold(false);
    ok(worstRun <= 8, 'turning the camera round at the HQ\'s walls and corners, walking along one, and on open ground (' + spots.length + ' turns of 360): the view never holds still while the mouse turns it (longest ' + worstRun + ' frames)');
    ok(worstLag < 60, 'the view\'s heading stays with the mouse (the usual ease only: worst ' + worstLag.toFixed(1) + ' deg)');
    info(rows.join(' | '));
    ok(!errs.length, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); try { T.flightHold(false); } catch (_) {} }
  return out.join('\n');
})()
