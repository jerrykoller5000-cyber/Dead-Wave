// t291 - CL-260 (Jerry's N5): "Right click and run while in first person causes the camera to rapidly shift up and down."
// Down the sights the eye was glued to the gun's sight point, and the gun rides his stride. Now the view follows the
// sight's offset from his steadied eye through a low-pass: slow while he moves, quick when he stands.
//  - walking with right-click held, the view's height (over his feet) and its pitch bounce much less than the sight's;
//  - standing, it settles back onto the sight line within a moment (t279 checks the line itself).
//  - CL-260 part 2: and the gun goes with the steadied view, so its sights stay on the view's line while he runs.
// CL-260 part 2: first person's way in gets 20 s (the gun now in view at the hip is more for the 2-core box's
// software renderer to draw; it came in at w 0.93 at 12 s).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  let held = false, walking = false;
  // The spread of a series round its own straight line (the ground's slope taken out).
  const wobble = (ys) => { const n = ys.length; if (n < 4) return 0; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    ys.forEach((y, i) => { sx += i; sy += y; sxx += i * i; sxy += i * y; });
    const b = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx), a = (sy - b * sx) / n;
    return Math.sqrt(ys.reduce((s, y, i) => s + (y - a - b * i) ** 2, 0) / n); };
  try {
    if (!T.fpDbg || !T.setViewFirstDbg || !T.setZoomHeldDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Sights steady');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const THREE = T.THREE, cam = T.camera, P = T.player.position, F = () => T.fpDbg();
    T.grantAllWeapons(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) T.setWeapon(i); await wait(300);
    ok(T.getCurrentWeapon() === 'm4', 'an m4 in hand');

    // A straight, open, dry, gentle 16 m to walk: from his spawn, the first heading that has one.
    const clear = (x, z, yaw) => { for (let d = 0; d <= 16; d += 0.5) {
      const px = x + Math.sin(yaw) * d, pz = z + Math.cos(yaw) * d, r = T.resolveStaticProps(px, pz, 0.6);
      if (Math.hypot(r.x - px, r.z - pz) > 0.02) return false;
      if (T.waterDepthAt && T.waterDepthAt(px, pz) > 0) return false;
      if (Math.abs(T.sampleHeight(px + 0.5, pz) - T.sampleHeight(px - 0.5, pz)) > 0.18 || Math.abs(T.sampleHeight(px, pz + 0.5) - T.sampleHeight(px, pz - 0.5)) > 0.18) return false;
    } return true; };
    let start = null;
    for (const [x, z] of [[P.x, P.z], [P.x + 12, P.z], [P.x - 12, P.z], [P.x, P.z + 12], [P.x, P.z - 12], [-150, -100], [60, 80]]) {
      for (let k = 0; k < 16 && !start; k++) { const yaw = k * Math.PI / 8; if (clear(x, z, yaw)) start = { x, z, yaw }; }
      if (start) break;
    }
    ok(!!start, 'an open stretch to walk (' + (start ? start.x.toFixed(0) + ', ' + start.z.toFixed(0) : 'none') + ')');
    if (!start) return out.join('\n');
    const goStart = async () => { P.set(start.x, T.sampleHeight(start.x, start.z) + 0.05, start.z); await wait(250); };
    await goStart();

    T.setViewFirstDbg(true);
    ok(await until(() => F().w > 0.95, 20000), 'first person');
    // Face the stretch.
    for (let i = 0; i < 40; i++) { const o = T.otsDbg(); let d = start.yaw - o.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < 0.01) break;
      const y0 = o.yaw; T.otsLook(d > 0 ? -20 : 20, 0); await wait(30); const per = (T.otsDbg().yaw - y0) / (d > 0 ? -20 : 20);
      if (Math.abs(per) > 1e-6) { T.otsLook(Math.max(-400, Math.min(400, d / per)), 0); await wait(60); } }
    { const o = T.otsDbg(); const d = Math.atan2(Math.sin(start.yaw - o.yaw), Math.cos(start.yaw - o.yaw)); ok(Math.abs(d) < 0.08, 'facing the stretch (' + (d * 180 / Math.PI).toFixed(1) + ' deg off)'); }
    T.otsLook(0, 0);
    await goStart();

    T.setZoomHeldDbg(true); held = true;
    ok(await until(() => F().ads > 0.99, 9000), 'right-click: down the sights');
    await wait(500);

    // Walk with the sights up: the view against the sight it follows.
    const camH = [], sightH = [], camP = [], sightP = [], gaps = [];
    const x0 = P.x, z0 = P.z;
    key('keydown', 'KeyW'); key('keydown', 'ShiftLeft'); walking = true;   // "right click and run": Shift held
    await wait(600);   // up to pace
    const t0 = Date.now();
    while (Date.now() - t0 < 2600) {
      const s = F().sight; if (s) {
        const dir = cam.getWorldDirection(new THREE.Vector3());
        camH.push(cam.position.y - P.y); sightH.push(s.pos.y - P.y);
        camP.push(Math.asin(Math.max(-1, Math.min(1, dir.y)))); sightP.push(Math.asin(Math.max(-1, Math.min(1, s.fwd.y))));
        // CL-260 part 2: the gun's sight point against the view's line (camera space, across the view).
        const d = s.pos.clone().sub(cam.position).applyQuaternion(cam.quaternion.clone().invert()); gaps.push(Math.hypot(d.x, d.y));
      }
      await wait(16);
    }
    // The mouse still turns the view at once while he walks: no lag from the easing.
    { const o0 = T.otsDbg(); T.otsLook(-60, 0); await wait(120); const o = T.otsDbg();
      const want = new THREE.Vector3(Math.sin(o.yaw) * Math.cos(o.pitch), Math.sin(o.pitch), Math.cos(o.yaw) * Math.cos(o.pitch));
      const ang = cam.getWorldDirection(new THREE.Vector3()).angleTo(want) * 180 / Math.PI;
      ok(Math.abs(o.yaw - o0.yaw) > 0.02 && ang < 4, 'a turn of the mouse while walking: the view goes with it (' + ((o.yaw - o0.yaw) * 180 / Math.PI).toFixed(1) + ' deg turned, ' + ang.toFixed(1) + ' deg off the aim)'); }
    key('keyup', 'KeyW'); key('keyup', 'ShiftLeft'); walking = false;
    const moved = Math.hypot(P.x - x0, P.z - z0);
    ok(moved > 3, 'he ran with the sights up (' + moved.toFixed(1) + ' m, ' + camH.length + ' samples)');
    const wc = wobble(camH), ws = wobble(sightH), pc = wobble(camP) * 180 / Math.PI, ps = wobble(sightP) * 180 / Math.PI;
    out.push('INFO the view height wobbles ' + (wc * 100).toFixed(2) + ' cm, the sight ' + (ws * 100).toFixed(2) + ' cm; the pitch ' + pc.toFixed(2) + ' deg, the sight ' + ps.toFixed(2) + ' deg');
    ok(wc < 0.006 || wc < ws * 0.5, 'the view\'s height bounces much less than the sight\'s (' + (wc * 100).toFixed(2) + ' vs ' + (ws * 100).toFixed(2) + ' cm)');
    ok(pc < 0.25 || pc < ps * 0.5, 'and its pitch too (' + pc.toFixed(2) + ' vs ' + ps.toFixed(2) + ' deg)');
    // CL-260 part 2 (AG-123's fp-run-aim-pistol.png): the gun goes with the steadied view, so the sights stay on its line.
    // (The test page runs at a few frames a second, so a frame of stride is centimetres: the middle of the run and its
    // worst frame are checked, not every frame.)
    { const sg = gaps.slice().sort((a, b) => a - b), med = sg.length ? sg[sg.length >> 1] : 1, g = sg.length ? sg[sg.length - 1] : 1;
      ok(med < 0.006 && g < 0.025, 'the sights stay on the view\'s line on the run (' + (med * 100).toFixed(2) + ' cm off in the middle, at most ' + (g * 100).toFixed(2) + ')'); }

    // Standing: back onto the sight line.
    ok(await until(() => {
      const s = F().sight; if (!s) return false;
      const along = cam.position.clone().sub(s.pos), off = along.clone().sub(s.fwd.clone().multiplyScalar(along.dot(s.fwd))).length();
      return off < 0.02 && cam.getWorldDirection(new THREE.Vector3()).angleTo(s.fwd) * 180 / Math.PI < 2;
    }, 4000), 'standing, the eye settles back onto the sight line');

    T.setZoomHeldDbg(false); held = false;
    ok(await until(() => F().ads < 0.02, 12000), 'let go: back to his eyes');
    T.setViewFirstDbg(false);
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  if (walking) { key('keyup', 'KeyW'); key('keyup', 'ShiftLeft'); }
  if (held) T.setZoomHeldDbg(false);
  return out.join('\n');
})()
