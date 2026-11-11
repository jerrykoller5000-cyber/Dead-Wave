// tcc342 - CC-342 (Jerry's playtest J108, J109, J119, J123): the first-person view.
//  J109 "the new optics do not have any recoil visible when using them": through a magnified optic's glass (the ACOG,
//    the prism) the drawn view turns with the gun's own kick and settles; a red dot's dot rides the view gun's bore (it sat
//    fixed at the screen's centre) and comes back to it. Iron sights keep the small camera share they had (CL-293).
//  J108 "Weird laser bend when looking as far down as you can": in first person the aim point (the laser's end, the
//    rounds) is the centre ray's own hit, not GP-170's third-person personal space (pushed out to 2.25 m and up).
//    Third person keeps the personal space.
//  J123 "the transparent front end of the optic ... the model stays visible for too long when transitioning to scope":
//    the NX8's lenses in the view copy are opaque coated glass; the view gun goes behind the glass at 60% of the aim.
//  J119 the Breacher's "stock disappearing ... when going from hip-fire to ads": its stock is in the frame's corner at the
//    hip and was put away at 8% of the aim, still on screen; now it goes only once in the sights, out of the frame.
// The game's frames are stepped by hand (T.flightHold, T.stepFrame) so every number is the same on every machine.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const st = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) T.stepFrame(dt); };
  const D = T.trainingDbg;
  const f1 = (x) => (x * 1000).toFixed(1);
  let held = false;
  try {
    if (!D || !T.fpDbg || !T.viewmodelDbg || !T.opticDbg || !T.stepFrame || !T.flightHold) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    T.runDevCommand && T.runDevCommand('godmode');
    T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false);
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person');
    T.flightHold(true); held = true;
    const arm = (k) => { for (let i = 0; i < 20 && T.getCurrentWeapon() !== k; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(k)); st(5); } st(30); return T.getCurrentWeapon() === k; };
    const v = () => T.viewmodelDbg();
    const THREE = T.THREE || window.THREE, q = new THREE.Quaternion();
    // One round, then 0.6 s of frames at 60 fps: the drawn view's pitch (cameraPunch), the view gun's own turn (boreDelta,
    // its pitch), and the red dot's place (ndc).
    const shot = (key) => {
      const n0 = T.weaponMeshes[key].userData.shots | 0;
      T.setAmmoDbg && T.setAmmoDbg(key, 20);
      T.setMouseFireDbg(true); T.stepFrame(1 / 60); T.setMouseFireDbg(false);
      const r = { fired: (T.weaponMeshes[key].userData.shots | 0) - n0, punch: 0, bore: 0, dot: 0, punchEnd: 0, dotEnd: 0, dotEl: 0 };
      for (let i = 0; i < 36; i++) {
        T.stepFrame(1 / 60);
        const p = v().cameraPunch(); v().boreDelta(q);
        r.punch = Math.max(r.punch, p.p); r.bore = Math.max(r.bore, 2 * q.x);
        const d = v().opticDotOffset ? v().opticDotOffset() : null; if (d) r.dot = Math.max(r.dot, d.y);
        const el = document.getElementById('opticDot'), m = el && /translate\([-\d.]+px, ([-\d.]+)px\)/.exec(el.style.transform || '');
        if (m) r.dotEl = Math.min(r.dotEl, parseFloat(m[1]));
        if (i === 35) { r.punchEnd = Math.abs(p.p); r.dotEnd = d ? Math.hypot(d.x, d.y) : 0; }
      }
      return r;
    };
    const aim = (on) => { T.setZoomHeldDbg(on); st(30); return T.fpDbg().ads; };
    T.setOtsAimDbg(0, 0);

    // J109: the M4 with each optic, down the sights.
    ok(arm('m4'), 'the M4 in hand');
    T.opticDbg.clear('m4'); st(5);
    aim(true);
    const iron = shot('m4');
    out.push('INFO iron sights: view ' + f1(iron.punch) + ' mrad, gun ' + f1(iron.bore) + ' mrad');
    ok(iron.fired === 1 && iron.punch > 0.001 && iron.punch < 0.008, 'iron sights: the view keeps its small share of the kick (' + f1(iron.punch) + ' mrad)');
    aim(false);
    for (const kind of ['acog', 'prism']) {
      T.opticDbg.grant('m4', kind); ok(T.opticDbg.fit('m4', kind), kind + ': fitted');
      st(10); const a = aim(true);
      const r = shot('m4');
      out.push('INFO ' + kind + ' (aim ' + a.toFixed(2) + '): the view through the glass peaks ' + f1(r.punch) + ' mrad (gun ' + f1(r.bore) + '), ' + f1(r.punchEnd) + ' after 0.6 s');
      ok(r.fired === 1, kind + ': a round fired');
      ok(r.punch > 0.015 && r.punch > 0.5 * r.bore && r.punch < 1.5 * r.bore, kind + ': through the glass the view turns with the gun\'s kick (' + f1(r.punch) + ' mrad, the gun ' + f1(r.bore) + ')');
      ok(r.punchEnd < 0.002, kind + ': and settles within 0.6 s (' + f1(r.punchEnd) + ' mrad)');
      aim(false);
    }
    T.opticDbg.grant('m4', 'rmr'); ok(T.opticDbg.fit('m4', 'rmr'), 'rmr: fitted');
    st(10); aim(true); st(20);
    { const d0 = v().opticDotOffset ? v().opticDotOffset() : null;
      ok(!!d0 && Math.hypot(d0.x, d0.y) < 0.004, 'rmr: at rest the dot is on the sight line (' + (d0 ? f1(d0.x) + ', ' + f1(d0.y) : 'none') + ' x0.001 ndc)'); }
    { const r = shot('m4');
      out.push('INFO rmr: the dot rises ' + f1(r.dot) + ' x0.001 ndc (#opticDot ' + r.dotEl.toFixed(1) + ' px), ' + f1(r.dotEnd) + ' after 0.6 s');
      ok(r.dot > 0.03, 'rmr: the dot rides the kick (up ' + f1(r.dot) + ' x0.001 ndc)');
      ok(r.dotEl < -5, 'rmr: #opticDot moves with it (' + r.dotEl.toFixed(1) + ' px)');
      ok(r.dotEnd < 0.006, 'rmr: and comes back to the aim (' + f1(r.dotEnd) + ')'); }
    aim(false);
    T.opticDbg.clear('m4'); st(5);

    // J108: looking as far down as the mouse goes (OTS_PITCH -0.72), the aim point is where the centre ray meets the floor.
    { const cam = T.camera, dir = new THREE.Vector3(), floorY = (D.tg().floorY != null ? D.tg().floorY : T.player.position.y);
      // on open floor behind the firing line's bench (at the spawn the centre ray meets the bench 0.8 m out)
      const home = T.player.position.clone();
      for (const ads of [false, true]) {
        T.player.position.set(home.x - 2, floorY, home.z - 4.4);
        T.setOtsAimDbg(0, -0.72); aim(ads); st(10);
        cam.updateMatrixWorld(true); cam.getWorldDirection(dir);
        const e = cam.getWorldPosition(new THREE.Vector3()), t = (floorY - e.y) / dir.y, hit = e.clone().addScaledVector(dir, t);
        const ap = T.getWeaponAimDbg(), dd = ap.distanceTo(hit);
        out.push('INFO looking down, ' + (ads ? 'down the sights' : 'at the hip') + ': the centre ray meets the floor ' + t.toFixed(2) + ' m out; the aim point is ' + dd.toFixed(3) + ' m from it');
        ok(dd < 0.08, 'looking down ' + (ads ? 'down the sights' : 'at the hip') + ': the aim point (the laser\'s end, the rounds) is the centre ray\'s floor point (' + dd.toFixed(3) + ' m off)');
      }
      aim(false); T.setOtsAimDbg(0, 0); T.player.position.copy(home); st(10);
    }
    // ... and third person keeps GP-170's personal space: a cursor on the floor 1 m ahead aims 2.25 m out.
    { T.setViewFirstDbg(false); T.flightHold(false); await until(() => T.fpDbg().w < 0.1, 15000); T.flightHold(true);
      const P = T.player.position, yaw = T.player.rotation.y;
      T.setAimTargetDbg(P.x + Math.sin(yaw) * 1.0, P.z + Math.cos(yaw) * 1.0); st(2);
      const ap = T.getWeaponAimDbg(), d = Math.hypot(ap.x - P.x, ap.z - P.z);
      ok(d > 2.0, 'third person: a cursor 1 m ahead still aims out past his personal space (' + d.toFixed(2) + ' m)');
      T.flightHold(false); T.setViewFirstDbg(true); await until(() => T.fpDbg().w > 0.9, 15000); T.flightHold(true); st(10); }

    // J123: the sniper's scope.
    ok(arm('sniper'), 'the sniper rifle in hand');
    { const g = v().gun; let n = 0, clear = 0;
      if (g) g.root.traverse((o) => { if (o.isMesh && /objective lens|ocular lens/.test(o.name)) { n++; const m = o.material; if (m && (m.transparent || m.opacity < 0.99)) clear++; } });
      ok(n === 2 && clear === 0, 'the view\'s NX8 lenses are coated glass, not see-through (' + n + ' lenses, ' + clear + ' clear)'); }
    { T.setZoomHeldDbg(true); let at = null, seenAt = 0;
      for (let i = 0; i < 40; i++) { T.stepFrame(1 / 60); const a = T.fpDbg().ads; if (v().root.visible) seenAt = a; else if (at == null) at = a; }
      out.push('INFO the sniper\'s view gun goes behind the glass at ' + (at == null ? '-' : at.toFixed(2)) + ' of the aim (last seen at ' + seenAt.toFixed(2) + ')');
      ok(at != null && at <= 0.7 && seenAt < 0.6, 'the sniper\'s view gun goes behind the glass by 60% of the aim (seen to ' + seenAt.toFixed(2) + ')');
      aim(false); }

    // J119 ("Stock disappearing ... when going from hip-fire to ads"): the view puts the stock away from 8% of the aim
    // (GB-296); since CL-324's closer holds the Breacher's stock is out of the frame from the hip all the way in, so its going
    // never shows. Each frame of the raise: the stock's corners (view space) are off the screen.
    ok(arm('aa12'), 'the Breacher in hand');
    { const vm = v(), sp = vm.space, inv = new THREE.Matrix4(), c = new THREE.Vector3();
      const inFrame = () => {   // any of the stock's vertices (view space) on the screen
        const s = vm.gun && vm.gun.stock; if (!s) return null;
        sp.updateMatrixWorld(true); s.updateMatrixWorld(true); inv.copy(sp.matrixWorld).invert();
        let any = false;
        s.traverse((o) => { if (any || !o.isMesh || !o.geometry || !o.geometry.attributes.position) return; const p = o.geometry.attributes.position;
          for (let i = 0; i < p.count && !any; i++) { c.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); const n = vm.ndc(c); if (n.d > 0 && Math.abs(n.x) < 1 && Math.abs(n.y) < 1) any = true; } });
        return any;
      };
      const seen = [], vis = () => !!(vm.gun && vm.gun.stock && vm.gun.stock.visible);
      T.setZoomHeldDbg(false); st(30); seen.push([0, inFrame(), vis()]);
      T.setZoomHeldDbg(true);
      for (let i = 0; i < 40; i++) { T.stepFrame(1 / 60); seen.push([T.fpDbg().ads, inFrame(), vis()]); }
      // (the receiver hides it from about 12% of the aim on: the pictures in Claude outputs/CC-342/ match with and without it)
      const early = seen.filter(([a, , s]) => a < 0.9 && !s);
      ok(seen[0][1] === true, 'at the hip the Breacher\'s stock is in the frame (the bottom right)');
      ok(early.length === 0, 'the Breacher\'s stock is not put away on the way up (it was at 8% of the aim, still in the corner)' + (early.length ? ' (gone at ' + early[0][0].toFixed(2) + ')' : ''));
      ok(!seen[seen.length - 1][2], 'and it is put away down the sights (GB-296)');
      aim(false); }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  } finally {
    try { if (held) T.flightHold(false); T.setZoomHeldDbg && T.setZoomHeldDbg(false); T.setOtsAimDbg && T.setOtsAimDbg(0, 0); T.setViewFirstDbg && T.setViewFirstDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
