// tcb310 - CB-310 (J141, Jerry 12 Nov: "slow him to half on stairs and see how it plays"): on a flight of stairs his pace is
// STAIR_SPEED_SCALE of what it is on the flat (0.5), walking and sprinting, up and down, eased in and out at the foot and the
// top; off the flight he is back to full pace. The game is held and stepped at 1/30 s, so the numbers don't depend on the
// test machine's speed (as tcc343b).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  let aimDir = 0, aimOn = false, p = null;
  const step = (n = 1) => { for (let i = 0; i < n; i++) {
    if (aimOn) { T.aimPointDbg(p.x + Math.sin(aimDir) * 6, p.y + 1.3, p.z + Math.cos(aimDir) * 6); T.setAimYawDbg(aimDir); }
    T.stepFrame(1 / 30);
  } };
  try {
    await startMatch(T, 'Stairs pace');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const V = T.THREE.Vector3; p = T.player.position;
    if (!T.stairSpeedDbg) { ok(false, 'TT.stairSpeedDbg is there'); return out.join('\n'); }
    const S = T.stairSpeedDbg();
    ok(S.scale === 0.5, 'the stairs pace is half (STAIR_SPEED_SCALE ' + S.scale + ')');
    T.flightHold(true);
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const camYaw = () => { const d = T.camera.getWorldDirection(new V()); return Math.atan2(d.x, d.z); };
    const aimAt = (yaw) => { aimDir = yaw; aimOn = true; T.rotateCamera(wrap(yaw - camYaw())); for (let i = 0; i < 90 && Math.abs(wrap(camYaw() - yaw)) > 0.03; i++) step(1); };
    const SX = 18, SZ = 18, G0 = T.sampleHeight(SX, SZ);
    T.levelGroundRect(SX - 14, SZ - 14, SX + 14, SZ + 14, G0, 6);
    const gx = Math.round((SX - 6) / 2), gz = Math.round((SZ - 6) / 2);
    const stairs = T.placeBuildAt('stairs', gx, gz, 0);
    ok(!!stairs && !!stairs.deck, 'a flight of stairs is built (rise ' + (stairs && stairs.rise) + ' m)');
    if (!stairs || !stairs.deck) return out.join('\n');
    const d = stairs.deck, cx = d.x, cz = d.z, half = d.hl;   // it climbs towards +z from the cell's -z side
    // Walk (or sprint) along x = cx from z0 the way yaw faces for n frames: the horizontal pace each frame, where he is.
    const walk = (z0, yaw, sprint, n) => {
      key('KeyW', false); key('ShiftLeft', false); T.setVelDbg(0, 0);
      p.set(cx, T.entityGroundY(cx, z0, p.y + 3), z0); aimAt(yaw); p.set(cx, T.entityGroundY(cx, z0, p.y + 3), z0); step(3);
      key('KeyW', true); if (sprint) key('ShiftLeft', true);
      const rows = []; let last = p.clone();
      for (let i = 0; i < n; i++) { step(1); const v = Math.hypot(p.x - last.x, p.z - last.z) * 30; last = p.clone(); rows.push({ z: p.z, y: p.y, v, w: T.stairSpeedDbg().w, on: T.stairSpeedDbg().on }); }
      key('KeyW', false); key('ShiftLeft', false); step(10);
      return rows;
    };
    const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
    for (const sprint of [false, true]) {
      const how = sprint ? 'sprinting' : 'walking';
      // Up: from 3 m before the foot, on past the top onto the deck behind (the floor beyond the flight is the ground,
      // the flight lands on its own top step); the pace on the flat before it, on the flight's middle, and off it again.
      for (const [dir, z0, yaw] of [['up', cz - half - 3, 0], ['down', cz + half - 0.15, Math.PI]]) {
        const rows = walk(z0, yaw, sprint, sprint ? 40 : 55);
        const flat = rows.filter((r) => !r.on && r.w < 0.02 && Math.abs(r.z - cz) > half + 0.6);
        const mid = rows.filter((r) => r.on && r.w > 0.9 && Math.abs(r.z - cz) < half * 0.6);
        const vFlat = med(flat.map((r) => r.v)), vMid = med(mid.map((r) => r.v));
        const after = dir === 'down' ? rows.filter((r) => r.z < cz - half - 1.2) : [];
        out.push('INFO ' + how + ' ' + dir + ': flat ' + vFlat.toFixed(2) + ' m/s (' + flat.length + ' frames), on the flight ' + vMid.toFixed(2) + ' m/s (' + mid.length + ' frames)');
        if (dir === 'up') ok(flat.length >= 5 && mid.length >= 2 && Math.abs(vMid / vFlat - 0.5) < 0.08, how + ' up the stairs: half his pace on the flat (' + vMid.toFixed(2) + ' of ' + vFlat.toFixed(2) + ' m/s, ' + (vMid / vFlat).toFixed(2) + ')');
        else {
          const vAfter = med(after.slice(-6).map((r) => r.v)), vOn = vMid;
          ok(mid.length >= 2 && after.length >= 6 && Math.abs(vOn / vAfter - 0.5) < 0.08 && vAfter > 0.95 * (sprint ? 11.8 : 7.4) * 0.9, how + ' down the stairs: half pace on them (' + vOn.toFixed(2) + ' m/s), and full pace again on the floor after (' + vAfter.toFixed(2) + ' m/s)');
        }
        // Eased: no frame's pace jumps by more than a quarter of the flat pace at the foot or the top.
        // (not the frames he drops off the top of this lone flight and lands, which has no deck behind it: a fall, not the pace)
        let jump = 0; for (let i = 1; i < rows.length; i++) if (rows[i - 1].v > 0.5 && rows[i].v > 0.5 && !rows.slice(Math.max(1, i - 2), i + 1).some((r, k, a) => Math.abs(r.y - rows[Math.max(1, i - 2) + k - 1].y) > 0.3)) jump = Math.max(jump, Math.abs(rows[i].v - rows[i - 1].v));
        ok(jump < 0.3 * (sprint ? 11.8 : 7.4), how + ' ' + dir + ': the pace eases at the foot and the top (the biggest change in a frame ' + jump.toFixed(2) + ' m/s)');
      }
    }
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  finally { try { T.flightHold(false); } catch (e) { /* */ } }
  return out.join('\n');
})()
