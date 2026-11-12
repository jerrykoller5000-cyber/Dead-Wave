// tce4b - CE-4 (J16, Claude 5, 12 Nov; CLAUDE DIRECTOR: "the knife stab first, Jerry uses it a lot"). The knife's stab in
// first person, stepped at 60 frames a second from the pistol and the GW-4 at the hip:
// - the view gun is never put away while it is still in sight: it goes down first (its raise under 0.2 when it vanishes)
//   and the blade shows only once it is gone (never both at once);
// - the stab: the fist comes up from below the view at the right, its blade's tip reaches in toward the middle, below the
//   crosshair (the thrust: the tip within 0.25 of the screen's middle across, between 0.05 and 0.45 below it), and goes
//   back down out of sight before the swing ends; no frame-to-frame jump of the fist over 0.45 of the screen (the part of
//   the step on it, with a 0.2 margin where the forearm still shows; the view's own projection, VM.fov);
// - the gun comes back up after it, from below, to full raise.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const THREE = T.THREE || window.THREE, dt = 1 / 60;
  try {
    await startMatch(T, 'CE4B');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(1e6); T.grantAllWeapons();
    T.setMacheteOwned && T.setMacheteOwned(false); T.setKatanaOwned && T.setKatanaOwned(false);
    const vm = () => T.viewmodelDbg && T.viewmodelDbg();
    if (!vm()) { ok(false, 'the view model'); return out.join('\n'); }
    const home = T.player.position.clone(), cam = T.camera;
    const take = async (w) => {
      vm().info.tune = {}; vm().retune(); T.flightHold(false); T.setViewFirstDbg(true);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); }
      T.player.position.copy(home); T.flightHold(true); T.setOtsAimDbg && T.setOtsAimDbg(0, -0.05);
      for (let i = 0; i < 200 && !(vm().info.active && vm().info.key === w && vm().info.raise > 0.999); i++) T.stepFrame(1 / 30);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    };
    // the screen as the eye sees the view at 16:9: the view's own space (its root is the eye) through the view's own
    // projection (VM.fov, 54 degrees vertical; the test page's canvas and camera are stand-ins)
    const VFOV = 54, ndc = (p) => { const V = vm(); V.root.updateMatrixWorld(true); const q = p.clone().applyMatrix4(V.root.matrixWorld.clone().invert()), ty = Math.tan(VFOV * Math.PI / 360);
      return { x: q.x / -q.z / (ty * 16 / 9), y: q.y / -q.z / ty, z: q.z }; };
    for (const w of ['pistol', 'm4']) {
      await take(w);
      const rows = []; T.setKnifeCd(0); T.knifeAttack();
      for (let f = 0; f < 60; f++) {
        T.stepFrame(dt);
        const V = vm(); cam.updateMatrixWorld();
        const gunOn = !!(V.gun && V.gun.root.visible), bl = V.root.getObjectByName('vm-blade');
        let bladeOn = false, tip = null;
        if (bl) {
          const g = V.arms.r.meshes.glove; g.geometry.computeBoundingBox();
          const gc = g.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(g.matrixWorld);
          let dm = -1;
          bl.traverseVisible((o) => { if (!o.isMesh) return; bladeOn = true; const pos = o.geometry.attributes.position; o.updateWorldMatrix(true, false);
            for (let i = 0; i < pos.count; i++) { const q = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); const d = q.distanceTo(gc); if (d < 0.4 && d > dm) { dm = d; tip = q; } } });   // the blade's tip: its far end from the fist (nothing a knife's length off)
          rows.push({ f, kt: T.getKnifeAnimT(), raise: V.info.raise, gunOn, bladeOn, dm, fist: bladeOn ? ndc(gc) : null, tip: bladeOn && tip ? ndc(tip) : null });
        } else rows.push({ f, kt: T.getKnifeAnimT(), raise: V.info.raise, gunOn, bladeOn: false, fist: null, tip: null });
        if (f > 20 && T.getKnifeAnimT() <= 0 && V.info.raise > 0.999) break;
      }
      const sw = rows.filter((r) => r.kt > 0), first = rows.findIndex((r) => !r.gunOn);
      ok(sw.length >= 10, w + ': a stab stepped (' + sw.length + ' frames of the swing)');
      ok(rows.every((r) => !(r.gunOn && r.bladeOn)), w + ': never the gun and the blade at once');
      ok(first > 0 && rows[first].raise < 0.2 && rows[first - 1].gunOn, w + ': the gun goes down before it is put away (raise ' + (first > 0 ? rows[first].raise.toFixed(2) : '-') + ' when it goes, after ' + first + ' frame(s) of drop)');
      const shown = rows.filter((r) => r.bladeOn && r.fist);
      const inView = (p) => p && Math.abs(p.x) < 1 && Math.abs(p.y) < 1;
      ok(shown.length > 0 && !inView(shown[0].fist) && !inView(shown[0].tip), w + ': the blade comes in from below the view (first frame fist ' + (shown[0] ? shown[0].fist.y.toFixed(2) : '-') + ')');
      const thrust = shown.filter((r) => r.tip && Math.abs(r.tip.x) < 0.25 && r.tip.y < -0.05 && r.tip.y > -0.45);
      ok(thrust.length >= 2, w + ': the thrust: the tip in toward the middle below the crosshair (' + thrust.length + ' frames; tips ' + shown.map((r) => r.tip ? r.tip.x.toFixed(2) + ',' + r.tip.y.toFixed(2) : '-').join(' ') + ')');
      const last = shown[shown.length - 1];
      ok(last && !inView(last.fist) && !inView(last.tip), w + ': back down out of sight before the swing ends (fist ' + (last ? last.fist.y.toFixed(2) : '-') + ')');
      // each frame's step of the fist, the part of it on the screen (and a margin of 0.2, where the forearm still shows)
      const onScreen = (a, b, m = 1.2) => { let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y;
        for (const [p, q] of [[-dx, a.x + m], [dx, m - a.x], [-dy, a.y + m], [dy, m - a.y]]) { if (p === 0) { if (q < 0) return 0; continue; } const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); }
        return t1 > t0 ? (t1 - t0) * Math.hypot(dx, dy) : 0; };
      let jump = 0, jf = -1; for (let i = 1; i < shown.length; i++) if (shown[i].f === shown[i - 1].f + 1) { const d = onScreen(shown[i - 1].fist, shown[i].fist); if (d > jump) { jump = d; jf = shown[i].f; } }
      ok(jump < 0.45, w + ': no jump of the fist in view (largest step ' + jump.toFixed(2) + ' of the screen, at frame ' + jf + '; fist ' + shown.map((r) => r.f + ':' + r.fist.x.toFixed(2) + ',' + r.fist.y.toFixed(2)).join(' ') + ')');
      const after = rows.filter((r) => r.kt <= 0 && r.f > first);
      ok(after.length > 0 && after[0].raise < 0.3 && after[after.length - 1].raise > 0.999 && after.every((r) => r.gunOn && !r.bladeOn), w + ': the gun comes back up from below after it (' + (after[0] ? after[0].raise.toFixed(2) : '-') + ' to ' + (after.length ? after[after.length - 1].raise.toFixed(2) : '-') + ')');
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
