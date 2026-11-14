// tcb334 - CB-333 (J153, D-181), Jerry's playtest notes 19, 39 and 4, in the Training Ground's third person:
//  19 "3rd person rotate on camera still getting stuck. Unplayable" (review/J153-playtest/16-3p-camera-stuck.png): within
//     8.5 m of a station's face (the CIF, the supply terminal, the Armory, the HQ panel, the skull window, the light switch,
//     the range console), a heading turned away from it was taken by GP-20091's station shoulder: the view sat facing the
//     station with him off the bottom of the screen for ~140 degrees of the mouse's turn. Now the view's heading follows the
//     middle-drag (the game's own mouse handlers) every frame, all the way round, both ways, standing and walking.
//  39 "the round does not actually hit where aiming it hits the wall across from him. The player model does not point the
//     gun elevation wise where the cross hair terminates" (35-3p-aim-floor.png): a crosshair on the floor sent the round at
//     chest height over the spot (CL-247's lift) into the far wall, the gun level. Now the round goes from the muzzle to the
//     crosshair's world point and the gun's bore points at it; the spine takes a share of the pitch (tpAim).
//  4  "Cannot shoot dummy up close" (04-dummy-point-blank.png): pressed against the dummy the muzzle is inside it and the
//     trace from the muzzle never met its front face. Now the round's first trace starts behind the muzzle.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (!D || !T.stepFrame || !T.flightHold || !T.tpAimDbg) { ok(false, 'the hooks are there (trainingDbg, stepFrame, flightHold, tpAimDbg)'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active && !D.state().warming, 30000), 'the Training Ground is up');
    T.setViewFirstDbg(false);
    const tr = D.state(), O = D.TRAINING.ORIGIN, P = T.player.position, cam = T.camera, THREE = T.THREE, V = THREE.Vector3;
    const cv = T.renderer.domElement, rc = () => cv.getBoundingClientRect();
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), DEG = 180 / Math.PI;
    const d3 = new V(), yawNow = () => { cam.getWorldDirection(d3); return Math.atan2(d3.x, d3.z); };
    let cx = 800;
    const mmb = (type, x) => cv.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: 400, button: 1, buttons: type === 'mouseup' ? 0 : 4, bubbles: true }));
    T.flightHold(true);

    // 19. A 360 by middle-drag at each station (and walking past the terminal), both ways: the view's heading follows.
    const spots = [[4, -6.6, 90, 0, 1], [4, -6.6, 90, 0, -1], [5.6, -2.2, 90, 0, 1], [-41.8, 3, -90, 0, -1], [4, -9, 90, 1.5, 1]];   // terminal both ways, the Armory, the HQ panel, walking past the CIF and terminal
    const rows = []; let worstRun = 0, worstLag = 0, offFrames = 0;
    const PX = 10, t0 = Date.now();
    for (const s of spots) { const dir = s[4];
      P.set(O.x + s[0], O.y, O.z + s[1]);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 60);
      mmb('mousedown', cx); cx += 6; mmb('mousemove', cx);
      for (let k = 0; k < 3; k++) { const e = wrap(s[2] / DEG - yawNow()); cx += Math.round(-e / 0.006); mmb('mousemove', cx); for (let i = 0; i < 45; i++) T.stepFrame(1 / 60); }
      mmb('mouseup', cx);
      mmb('mousedown', cx); cx += 6 * dir; mmb('mousemove', cx);
      let want = yawNow(), prev = want, run = 0, maxRun = 0, maxLag = 0, off = 0;
      const n = Math.ceil(2 * Math.PI / 0.006 / PX) + 30, hv = new V();
      for (let f = 0; f < n; f++) {
        cx += PX * dir; mmb('mousemove', cx); want += -PX * dir * 0.006;
        if (s[3]) P.z += s[3] / 60;
        T.stepFrame(1 / 60);
        const y = yawNow();
        if (f > 30) maxLag = Math.max(maxLag, Math.abs(wrap(want - y)) * DEG);
        if (Math.abs(wrap(y - prev)) * DEG < 0.15) { run++; maxRun = Math.max(maxRun, run); } else run = 0;
        prev = y;
        hv.set(P.x, P.y + 1.5, P.z).project(cam); if (Math.abs(hv.x) > 1 || Math.abs(hv.y) > 1 || hv.z > 1) off++;
      }
      mmb('mouseup', cx);
      worstRun = Math.max(worstRun, maxRun); worstLag = Math.max(worstLag, maxLag); offFrames += off;
      rows.push(s.slice(0, 2).join(',') + (s[3] ? ' walking' : '') + (dir > 0 ? ' L' : ' R') + ': lag ' + maxLag.toFixed(0) + ', held ' + maxRun);
    }
    ok(worstRun <= 8, 'turning the camera round at the stations (' + spots.length + ' turns of 360): the view never holds still while the mouse turns it (longest hold ' + worstRun + ' frames; 23-24 on the old code, 40-42 at 6 px a frame)');
    ok(worstLag < 60, 'the view\'s heading stays with the mouse (the usual ease only: worst ' + worstLag.toFixed(1) + ' deg; was 180)');
    info(rows.join(' | ') + ' | head off screen ' + offFrames + ' frames | ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');

    // 39. The crosshair's world point is where the round goes and where the gun points.
    T.grantAllWeapons && T.grantAllWeapons();
    if (T.isUnarmed()) T.setUnarmedDbg(false);
    const pointAt = (nx, ny) => { const r = rc(), x = r.left + (nx + 1) / 2 * r.width, y = r.top + (1 - ny) / 2 * r.height; cv.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerType: 'mouse' })); };
    const pointWorld = (p) => { const v = p.clone().project(cam); pointAt(v.x, v.y); };
    const muzzleOf = (w) => { const g = T.weaponMeshes[w]; g.updateMatrixWorld(true); const m = new V().copy(g.userData.muzzleLocal); g.localToWorld(m); const q = new THREE.Quaternion(); g.getWorldQuaternion(q); return { m, bore: new V(0, 0, 1).applyQuaternion(q) }; };
    for (const w of ['revolver', 'm4']) {
      T.setWeapon(T.WEAPON_ORDER.indexOf(w)); for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      P.set(O.x - 20, O.y, O.z + 8);   // the open floor of the build room (at the firing line the rail holds a long gun at low ready)
      const res = [];
      for (const [nx, ny] of [[0.3, -0.3], [-0.35, 0.35], [0.5, 0.2], [0, 0.75], [0.12, -0.12]]) {
        for (let i = 0; i < 90; i++) { pointAt(nx, ny); T.stepFrame(1 / 60); }
        const X = T.aimTarget.clone(), kind = T.aimKindDbg(), { m, bore } = muzzleOf(w), dir = T.getAimDirDbg().clone();
        const dist = Math.hypot(X.x - P.x, X.z - P.z);
        // how far the round's line passes from the crosshair's point, and the bore's angle off that line
        const v = X.clone().sub(m), along = v.dot(dir), miss = v.clone().addScaledVector(dir, -along).length();
        const boreOff = Math.acos(Math.min(1, bore.dot(dir))) * DEG;
        res.push({ nx, ny, kind, dist, miss, along, boreOff, y: X.y - O.y, tp: T.tpAimDbg() });
      }
      const far = res.filter((r) => r.dist >= 2.25), near = res.filter((r) => r.dist < 2.25 && r.dist > 0.75);
      ok(far.length >= 3 && far.every((r) => r.miss < 0.05 && r.along > 0), w + ': the round\'s line runs from the muzzle through the crosshair\'s point at every far spot (' + far.map((r) => r.kind + ' ' + r.dist.toFixed(1) + ' m: ' + r.miss.toFixed(3)).join(', ') + ')');
      ok(far.every((r) => r.boreOff < 2), w + ': the bore points along it (' + far.map((r) => r.boreOff.toFixed(1)).join(', ') + ' deg)');
      ok(res.filter((r) => r.kind === 'ground').every((r) => Math.abs(r.y) < 0.05), w + ': a crosshair on the floor is a point on the floor (no chest lift; ' + res.filter((r) => r.kind === 'ground').map((r) => r.y.toFixed(2)).join(', ') + ' m up)');
      if (near.length) ok(near.every((r) => r.miss < 0.12), w + ': a crosshair a step ahead (' + near.map((r) => r.dist.toFixed(2)).join(', ') + ' m): the line still passes through it (' + near.map((r) => r.miss.toFixed(3)).join(', ') + ')');
      const down = res.find((r) => r.kind === 'ground' && r.dist < 6), up = res.find((r) => r.y > 2);
      ok(!!down && down.tp.on && down.tp.lean > 0.02 && (!up || up.tp.lean < down.tp.lean), w + ': the spine leans toward a floor aim (' + (down ? (down.tp.lean * DEG).toFixed(1) : '-') + ' deg forward' + (up ? ', ' + (up.tp.lean * DEG).toFixed(1) + ' at a high one' : '') + ')');
    }

    // 4. Point blank: pressed to the dummy, the cursor on its chest; first and third person.
    const dm = tr.dummy, sol = dm && dm.solid, floor = tr.tg.floorY;
    if (!sol) ok(false, 'the dummy is there');
    else {
      let strikes = 0; const os = dm.strike; dm.strike = function () { const c = os.apply(this, arguments); if (c) strikes++; return c; };
      const yaw = -Math.PI / 2, fx = Math.sin(yaw), fz = Math.cos(yaw);
      cv.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      const shoot = async (w, d, first) => {
        T.setWeapon(T.WEAPON_ORDER.indexOf(w)); T.setViewFirstDbg(!!first); T.setAmmoDbg(w, 6);
        const chest = new V(sol.cx, floor + 1.25, sol.cz);
        const at = () => { P.set(sol.cx - fx * d, floor, sol.cz - fz * d); T.setAimYawDbg(yaw); if (first) T.setOtsAimDbg(yaw, -Math.atan2(0.35, Math.max(0.3, Math.hypot(P.x - sol.cx, P.z - sol.cz)))); else T.aimPointDbg(chest.x, chest.y, chest.z); };   // the cursor held on its chest (off the canvas, as tcb331)
        for (let i = 0; i < 90; i++) { at(); T.stepFrame(1 / 60); }
        const stood = Math.hypot(P.x - sol.cx, P.z - sol.cz);
        const { m } = muzzleOf(w), inside = Math.hypot(m.x - sol.cx, m.z - sol.cz);
        const s0 = strikes; T.flightHold(false); T.setMouseFireDbg(true);
        for (let i = 0; i < 12; i++) { at(); await wait(40); }
        T.setMouseFireDbg(false); for (let i = 0; i < 8; i++) { at(); await wait(40); }
        T.flightHold(true);
        return { hit: strikes > s0, stood, inside };
      };
      const pb = [];
      for (const [w, first] of [['pistol', false], ['shotgun', false], ['ak', false], ['pistol', true], ['shotgun', true]]) {
        const r = await shoot(w, 0.45, first);   // the closest he can stand: the dummy's collider holds him off
        pb.push(w + (first ? ' 1P' : ' 3P') + ': ' + (r.hit ? 'hit' : 'MISS') + ' (stood ' + r.stood.toFixed(2) + ' m from its middle, muzzle ' + r.inside.toFixed(2) + ' m)');
        ok(r.hit, 'point blank with the ' + w + ' in ' + (first ? 'first' : 'third') + ' person, pressed to the dummy: the round hits it (muzzle ' + r.inside.toFixed(2) + ' m from its middle, radius ' + (sol.radius || 0).toFixed(2) + ')');
      }
      dm.strike = os;
      info(pb.join(' | '));
      T.setViewFirstDbg(false);
    }
    T.flightHold(false);
    ok(!errs.length, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); try { T.flightHold(false); } catch (_) {} }
  return out.join('\n');
})()
