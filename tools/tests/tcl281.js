// tcl281 - CL-281 stage 1 (Claude; docs/specs/first-person-1.2.md §8): first person's view gun with the pistol. Its own
// arms and gun up in first person; his body's arms and gun out of the eye's pass (kept for his shadow); the hands on
// their sockets (1 cm), the wrists within their bend, nothing in front of the near plane, low right at the hip and
// canted, the sights on the view's centre down them with the eye still at his eyes; the reload in front of the eye
// (the magazine in the support palm, away, back in the well); the recoil and the slide; off again with a gun it has
// no entry for yet and in third person.
(async () => {
  const T = window.TT; const out = [];
  // Every line's numbers echoed as INFO too (run-all prints INFO with --all-fails), for the handoff.
  const ok = (c, m) => { out.push((c ? 'PASS ' : 'FAIL ') + m); if (c && /\(/.test(m)) out.push('INFO = ' + m); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CL281');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const THREE = T.THREE || window.THREE;
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } return T.getCurrentWeapon() === w; };
    if (!T.viewmodelDbg || !T.setViewFirstDbg) { ok(false, 'the CL-281 hooks are there'); return out.join('\n'); }
    ok(await take('pistol'), 'a pistol in hand');
    await wait(900);
    const VM = () => T.viewmodelDbg();
    ok(!VM() || !VM().info.active, 'third person: no view gun');
    T.setViewFirstDbg(true);
    ok(await until(() => VM() && VM().info.active && VM().info.raise > 0.99, 20000), 'first person with the pistol: the view gun is up (raise ' + (VM() ? VM().info.raise.toFixed(2) : '-') + ')');
    const vm = VM();
    if (!vm || !vm.gun) { ok(false, 'a view gun'); return out.join('\n'); }
    await wait(600);
    const ud = T.marine.userData, src = T.weaponMeshes.pistol;
    // His body's arms and gun: out of the eye's pass, every mesh; the laser's beam is not.
    const beams = new Set(Object.values(T.weaponMeshes).map((g) => g && g.userData && g.userData.laser).filter(Boolean));
    let armN = 0, armHid = 0; for (const a of [ud.armLG, ud.armRG]) a.traverse((o) => { if (o.isMesh && !beams.has(o)) { armN++; if (vm.isEyeHidden(o)) armHid++; } });
    let gunN = 0, gunHid = 0; src.traverse((o) => { if (o.isMesh && o !== src.userData.laser) { gunN++; if (vm.isEyeHidden(o)) gunHid++; } });
    ok(armN > 0 && armHid === armN && gunN > 0 && gunHid === gunN, 'his own arms (' + armHid + '/' + armN + ') and pistol (' + gunHid + '/' + gunN + ') are out of the eye\'s pass');
    ok(!src.userData.laser || !vm.isEyeHidden(src.userData.laser), 'the laser\'s beam is still drawn');
    const skins = ud.rigSkin ? ud.rigSkin.skins : [];
    const split = skins.filter((s) => s.userData.rigSplit);
    if (ud.rigSkin) ok(split.length > 0 && split.every((s) => vm.isEyeHidden(s)) && skins.filter((s) => !s.userData.rigSplit).every((s) => !vm.isEyeHidden(s)), 'his baked arms are skins of their own, out of the eye\'s pass; the rest of him is in it (' + split.length + ' of ' + skins.length + ')');
    else out.push('INFO no rig skins on this page (the stand-in three): his arms are their own meshes');
    const radio = ud.gearParts.vest.filter((o) => o.userData.vmEyeRadio), carrier = ud.gearParts.vest.filter((o) => !o.userData.vmEyeRadio);
    const radioSkins = skins.filter((s) => s.userData.rigSplit === 2);
    const bakedRadio = ud.rigSkin ? ud.rigSkin.sources.filter((s) => s.o.userData.vmEyeRadio && s.baked) : [];
    ok(radio.length >= 3 && radio.every((o) => vm.isEyeHidden(o) && o.visible && o.castShadow) && carrier.some((o) => o.visible && !vm.isEyeHidden(o)) && (bakedRadio.length === 0 || (radioSkins.length > 0 && radioSkins.every((s) => vm.isEyeHidden(s) && s.castShadow))), 'the radio and antenna are eye-hidden in first person while the worn carrier and shadow remain (' + radio.length + ' radio meshes, ' + bakedRadio.length + ' baked, ' + radioSkins.length + ' radio skins)');
    ok(vm.filtering, 'the eye\'s pass leaves them out (the render filter is on)');
    ok(armHid === armN && ud.armLG.visible && ud.armRG.visible && src.visible, 'and they are still there for his shadow (visible)');
    // the hands on their sockets
    const G = vm.frame, A = vm.arms, wr = vm.wrists;
    const rootInvNow = () => { const sp = vm.space || vm.root; sp.updateMatrixWorld(true); return sp.matrixWorld.clone().invert(); };   // his (mirrored) hold's space
    const inView = (o, p) => { o.updateWorldMatrix(true, false); return p.clone().applyMatrix4(o.matrixWorld).applyMatrix4(rootInvNow()); };
    const gunAt = (p) => vm.viewPoint(new THREE.Vector3(p[0], p[1], p[2]));
    const sockErr = (arm, W) => { const p = inView(arm.wrist, new THREE.Vector3()); return p.distanceTo(W.p); };
    const eR = sockErr(A.r, wr.r), eL = sockErr(A.l, wr.l);
    ok(eR < 0.01 && eL < 0.01, 'both wrists on their sockets (' + (eR * 100).toFixed(2) + ', ' + (eL * 100).toFixed(2) + ' cm)');
    // the firing hand's grip channel on the pistol's grip (WEAPON_HOLD.pistol.grip)
    const L = A.r.layout, chan = inView(A.r.wrist, new THREE.Vector3(L.grip[0] - L.wrist[0], L.grip[1] - L.wrist[1], L.grip[2] - L.wrist[2]));
    const gp = gunAt([0, -0.066, -0.016]);
    const dc = chan.distanceTo(gp);
    // Real renderer only: the stand-in three's arm poses are wrong (tools/realtest.mjs), its own hand 38-46 cm off the grip.
    const real = (() => { const m = new THREE.Matrix4().makeRotationX(0.3), e = m.elements.slice(); m.transpose(); return m.elements[6] === e[9] && e[6] !== e[9]; })();
    (real ? ok : (c, m) => out.push('INFO ' + m + ' (the stand-in three)'))(dc < 0.02, 'the firing hand\'s grip through the pistol\'s grip (' + (dc * 100).toFixed(2) + ' cm)');
    // the wrists' bend
    const bend = (arm) => { const a = new THREE.Vector3(0, 1, 0).applyQuaternion(arm.root.quaternion), b = new THREE.Vector3(0, 1, 0).applyQuaternion(arm.root.quaternion.clone().multiply(arm.wrist.quaternion)); return Math.acos(Math.max(-1, Math.min(1, a.dot(b)))); };
    const bR = bend(A.r), bL = bend(A.l);
    const wmax = vm.info.wristMax;   // AG-168 v2: 35 degrees left the forearms pointing at the eye; 50 now, and never more
    ok(wmax > 0 && wmax <= 0.873 && bR <= wmax + 1e-3 && bL <= wmax + 1e-3, 'the wrists bend no more than VM.wristMax, at most 50 degrees (' + bR.toFixed(2) + ', ' + bL.toFixed(2) + ' of ' + (wmax || 0).toFixed(2) + ')');
    // AG-168 v2: the forearms run down out of the view, not at the eye: each forearm's line from the wrist to the elbow
    // at least 40 degrees off the wrist's line to the eye, and the elbow below the view's bottom edge (the real renderer:
    // the stand-in three's sockets come from its own arm poses, which are off).
    { const endOn = (arm) => { const w = inView(arm.wrist, new THREE.Vector3()), e = inView(arm.root, new THREE.Vector3()); const d = e.clone().sub(w).normalize(), toEye = w.clone().multiplyScalar(-1).normalize(); return { ang: Math.acos(Math.max(-1, Math.min(1, d.dot(toEye)))), ey: vm.ndc(e).y }; };
      const fr = endOn(A.r), fl = endOn(A.l);
      (real ? ok : (c, m) => out.push('INFO ' + m + ' (the stand-in three)'))(fr.ang > 0.698 && fl.ang > 0.698 && fr.ey < -1 && fl.ey < -1,
        'the forearms leave the view downward, not at the eye (' + [fr.ang, fl.ang].map((v) => (v * 180 / Math.PI).toFixed(0)).join(', ') + ' degrees off the eye line; elbows at ndc y ' + [fr.ey, fl.ey].map((v) => v.toFixed(2)).join(', ') + ')'); }
    ok(vm.info.flip === !!(T.renderer && T.renderer.backend && T.renderer.backend.isWebGPUBackend && vm.space && vm.space.scale.x < 0), 'the mirrored meshes draw wound the other way on WebGPU, as they are elsewhere (flip ' + vm.info.flip + ')');
    // nothing in front of the near plane, of what is on screen
    const near = 0.01; let minD = Infinity, onScreen = 0, meshes = 0;
    vm.root.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      let vis = true; for (let q = o; q && q !== vm.root; q = q.parent) if (!q.visible) { vis = false; break; }
      if (!vis) return; meshes++;
      o.updateWorldMatrix(true, false);
      const m = rootInvNow().multiply(o.matrixWorld), pa = o.geometry.attributes.position, v = new THREE.Vector3(), step = Math.max(1, Math.floor(pa.count / 200));
      for (let i = 0; i < pa.count; i += step) {
        v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
        const n = vm.ndc(v);
        if (n.d > 0 && Math.abs(n.x) <= 1.05 && Math.abs(n.y) <= 1.05) { onScreen++; minD = Math.min(minD, n.d); }
      }
    });
    ok(onScreen > 0 && minD > near * 1.5, 'nothing on screen in front of the near plane (nearest ' + (minD * 100).toFixed(1) + ' cm, ' + meshes + ' meshes)');
    out.push('INFO view gun draws: ' + meshes + ' meshes');
    // at the hip: low right, canted
    const n1 = vm.ndc(gp), mz = vm.ndc(vm.viewPoint(src.userData.muzzleLocal.clone()));
    ok(n1.x > 0.15 && n1.x < 0.75 && n1.y < -0.3 && n1.y > -0.95 && mz.x > 0.05 && mz.y < 0, 'at the hip the pistol is low right (grip ndc ' + n1.x.toFixed(2) + ', ' + n1.y.toFixed(2) + '; muzzle ' + mz.x.toFixed(2) + ', ' + mz.y.toFixed(2) + ')');
    // AG-168: the firing forearm leaves the view at the right, the support one at the left (they crossed before).
    { const er = vm.ndc(inView(A.r.root, new THREE.Vector3(A.r.layout.wrist[0], 0, A.r.layout.wrist[2]))), el = vm.ndc(inView(A.l.root, new THREE.Vector3(A.l.layout.wrist[0], 0, A.l.layout.wrist[2])));
      ok(er.x > el.x + 0.2, 'the forearms don\'t cross: the firing elbow to the right of the support one (ndc x ' + er.x.toFixed(2) + ', ' + el.x.toFixed(2) + ')'); }
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(G.q), cant = Math.atan2(-up.x, up.y) * 180 / Math.PI;
    ok(Math.abs(cant) > 4 && Math.abs(cant) < 11, 'and canted (' + cant.toFixed(1) + ' deg)');
    // down the sights
    const eye0 = T.fpDbg().eye;
    T.setZoomHeldDbg(true);
    ok(await until(() => T.fpDbg().ads > 0.99, 9000), 'right-click: down the sights');
    await wait(700);
    const nR = vm.ndc(gunAt([0, 0.082, -0.064])), nF = vm.ndc(gunAt([0, 0.087, 0.282]));
    ok(Math.abs(nR.x) < 0.002 && Math.abs(nR.y) < 0.002 && Math.abs(nF.x) < 0.002 && Math.abs(nF.y) < 0.002, 'the rear notch and the front post on the view\'s centre, within a pixel at 1080p (' + [nR.x, nR.y, nF.x, nF.y].map((v) => v.toFixed(3)).join(', ') + ')');
    const eye1 = T.fpDbg().eye, cam = T.camera || window.camera;
    ok(eye0 && eye1 && eye1.distanceTo(cam.position) < 0.06, 'the eye stays at his eyes down the sights (' + (eye1 ? eye1.distanceTo(cam.position).toFixed(3) : '-') + ' m)');
    const eA = sockErr(A.r, wr.r), eB = sockErr(A.l, wr.l);
    ok(eA < 0.01 && eB < 0.01, 'down the sights the wrists are on their sockets too (' + (eA * 100).toFixed(2) + ', ' + (eB * 100).toFixed(2) + ' cm)');
    T.setZoomHeldDbg(false);
    await until(() => T.fpDbg().ads < 0.02, 9000); await wait(300);
    // a shot: recoil and the slide
    {
      const z0 = vm.frame.p.z, s0 = vm.gun.slide ? vm.gun.slide.position.z : 0;
      src.userData.shots = (src.userData.shots | 0) + 1;   // as triggerMuzzleFlash does
      await wait(60);
      const z1 = vm.frame.p.z, s1 = vm.gun.slide ? vm.gun.slide.position.z : 0;
      ok(z1 > z0 + 0.004, 'a shot kicks the gun back (' + ((z1 - z0) * 100).toFixed(1) + ' cm)');
      out.push('INFO the slide on the shot: ' + ((s1 - s0) * 100).toFixed(1) + ' cm (gun units)');
      await wait(700);
      ok(Math.abs(vm.frame.p.z - z0) < 0.006, 'and it settles back (' + ((vm.frame.p.z - z0) * 100).toFixed(2) + ' cm off)');
    }
    // the reload
    {
      T.setAmmoDbg('pistol', 2);
      T.startReload();
      ok(await until(() => T.isReloading(), 3000), 'a reload starts');
      const seen = new Set(), places = new Set(); let handFit = Infinity, maxFit = 0, hidden = false, rackSteep = Infinity;
      const palmOf = () => { const p = new THREE.Vector3(); A.l.rig.point('palm', p); const W = A.l.layout.wrist; return inView(A.l.wrist, p.set(p.x - W[0], p.y - W[1], p.z - W[2])); };
      while (T.isReloading()) {
        const i = vm.info; seen.add(i.magState); places.add(i.handPlace);
        if (i.magState === 'hand' && vm.gun.mag) {
          // the magazine's foot in the support palm (the foot as seated, carried by the hand)
          const foot = (() => { const g = vm.gun; if (!g.foot) return null; const inGun = g.foot.clone(); const magM = new THREE.Matrix4().compose(g.mag.position, g.mag.quaternion, g.mag.scale), base = new THREE.Matrix4().compose(g.magBase.pos, g.magBase.quat, g.magBase.scale); const local = inGun.applyMatrix4(base.clone().invert()).applyMatrix4(magM); return vm.viewPoint(local); })();
          if (foot) { const d = foot.distanceTo(palmOf()); handFit = Math.min(handFit, d); maxFit = Math.max(maxFit, d); }
        }
        if (i.magState === 'pouch' && vm.gun.mag && !vm.gun.mag.visible) hidden = true;
        if (i.handPlace === 'work') {   // AG-171: racking, the support forearm comes up from low left, not across the gun
          const w = vm.ndc(inView(A.l.wrist, new THREE.Vector3())), e = vm.ndc(inView(A.l.root, new THREE.Vector3()));
          const asp = (T.camera || window.camera).aspect || 1.78, dx = (e.x - w.x) * asp, dy = e.y - w.y;
          rackSteep = Math.min(rackSteep, Math.atan2(-dy, Math.abs(dx)));
        }
        await wait(30);
      }
      ok(seen.has('hand') && seen.has('pouch') && seen.has('seated'), 'the magazine: seated, in his palm, away, back (' + [...seen].join(' ') + ')');
      ok(places.has('well') && places.has('pouch') && places.has('work'), 'the support hand goes to the well, the pouch and the slide (' + [...places].join(' ') + ')');
      ok(maxFit < 0.015, 'the magazine rides the support palm (its foot within ' + (maxFit * 100).toFixed(2) + ' cm)');
      ok(hidden, 'away in the pouch it is out of sight');
      (real ? ok : (c, m) => out.push('INFO ' + m + ' (the stand-in three)'))(rackSteep > 0.61 && rackSteep < Infinity, 'racking the slide, the support forearm runs down out of the view, at least 35 degrees below level on screen (' + (rackSteep * 180 / Math.PI).toFixed(0) + ')');
      await wait(400);
      const g = vm.gun, dm = g.mag.position.distanceTo(g.magBase.pos);
      ok(vm.info.magState === 'seated' && g.mag.visible && dm < 1e-4, 'after it: the magazine seated in the well (' + dm.toExponential(1) + ')');
      const eL2 = sockErr(A.l, wr.l);
      ok(vm.info.handPlace === 'fore' && eL2 < 0.01, 'and the support hand back on the gun (' + (eL2 * 100).toFixed(2) + ' cm)');
    }
    // the laser leaves the view gun's muzzle
    {
      const w = vm.muzzleWorld(new THREE.Vector3()), cam2 = T.camera || window.camera;
      ok(!!w && w.distanceTo(cam2.position) > 0.2 && w.distanceTo(cam2.position) < 1.5, 'the view gun\'s muzzle in the world for the laser (' + (w ? w.distanceTo(cam2.position).toFixed(2) : '-') + ' m from the eye)');
    }
    // CL-281 stage 2 (CU-223, GP-20012): the GW-4, the AK and the Wasp. Rear points are
    // game/sight-points.js (none of the three has a notch, so the view gun centres that
    // point, the same one adsOf uses). The shotgun is stage 3 and still has no entry.
    const stage2 = [
      ['m4', 'the GW-4', [0, 0.134, -0.12], [0, -0.106, -0.076]],
      ['ak', 'the AK', [0, 0.0943, 0], [0, -0.126, -0.095]],
      ['uzi', 'the Wasp', [0, 0.156, -0.25], [0, -0.088, -0.027]]
    ];
    const scanNear = () => {
      let minD = Infinity, onScreen = 0, meshes = 0;
      vm.root.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        let vis = true; for (let q = o; q && q !== vm.root; q = q.parent) if (!q.visible) { vis = false; break; }
        if (!vis) return; meshes++;
        o.updateWorldMatrix(true, false);
        const m = rootInvNow().multiply(o.matrixWorld), pa = o.geometry.attributes.position, v = new THREE.Vector3(), step = Math.max(1, Math.floor(pa.count / 200));
        for (let i = 0; i < pa.count; i += step) {
          v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
          const n = vm.ndc(v);
          if (n.d > 0 && Math.abs(n.x) <= 1.05 && Math.abs(n.y) <= 1.05) { onScreen++; minD = Math.min(minD, n.d); }
        }
      });
      return { minD, onScreen, meshes };
    };
    for (const [key, label, rear, grip] of stage2) {
      ok(await take(key), 'a ' + key + ' in hand');
      ok(await until(() => vm.info.active && vm.info.key === key && vm.info.raise > 0.99, 12000),
        label + ': the view gun is up (raise ' + (vm.info.raise == null ? '-' : vm.info.raise.toFixed(2)) + ')');
      const srcG = T.weaponMeshes[key], udG = srcG && srcG.userData;
      ok(!!(udG && udG.mag && udG.mag.parent === srcG && udG.work && udG.work.parent === srcG
        && vm.gun && vm.gun.mag && vm.gun.mag.parent === vm.gun.root && vm.gun.work && vm.gun.work.parent === vm.gun.root),
        label + ': the magazine and the work part are direct children, and the view copy has both');
      if (key !== 'uzi') {
        let inViewStock = false;
        if (vm.gun && vm.gun.root) vm.gun.root.traverse((o) => { if (o.name === 'fp-stock') inViewStock = true; });
        ok(!!(udG && udG.fpStock && udG.fpStock.parent === srcG && udG.fpStock.name === 'fp-stock') && !inViewStock,
          label + ': the stock is one direct child, and the view copy leaves it out');
      }
      await wait(500);
      const e1 = sockErr(A.r, wr.r), e2 = sockErr(A.l, wr.l);
      ok(e1 < 0.01 && e2 < 0.01, label + ': both wrists on their sockets (' + (e1 * 100).toFixed(2) + ', ' + (e2 * 100).toFixed(2) + ' cm)');
      const br1 = bend(A.r), bl1 = bend(A.l);
      ok(br1 <= wmax + 1e-3 && bl1 <= wmax + 1e-3, label + ': the wrists stay within VM.wristMax (' + br1.toFixed(2) + ', ' + bl1.toFixed(2) + ' of ' + (wmax || 0).toFixed(2) + ')');
      { const endOn = (arm) => { const w = inView(arm.wrist, new THREE.Vector3()), e = inView(arm.root, new THREE.Vector3()); const d = e.clone().sub(w).normalize(), toEye = w.clone().multiplyScalar(-1).normalize(); return { ang: Math.acos(Math.max(-1, Math.min(1, d.dot(toEye)))), ey: vm.ndc(e).y }; };
        const fr = endOn(A.r), fl = endOn(A.l);
        // CU-223, Claude: a rifle keeps the 40-degree line. Its support elbow may show, only low (below ndc y -0.5). The pistol's full bar stays on the Wasp, which already cleared it.
        const rifle = key !== 'uzi';
        const elbowOk = rifle ? fl.ey < -0.5 : (fr.ey < -1 && fl.ey < -1);
        (real ? ok : (c, m) => out.push('INFO ' + m + ' (the stand-in three)'))(fr.ang > 0.698 && fl.ang > 0.698 && elbowOk,
          label + ': the forearms stay off the eye line' + (rifle ? ', the support elbow low' : ', the elbows off the bottom') + ' (' + [fr.ang, fl.ang].map((v) => (v * 180 / Math.PI).toFixed(0)).join(', ') + ' degrees; elbows ndc y ' + [fr.ey, fl.ey].map((v) => v.toFixed(2)).join(', ') + ')'); }
      const nearG = scanNear();
      ok(nearG.onScreen > 0 && nearG.minD > 0.015, label + ': nothing on screen in front of the near plane (nearest ' + (nearG.minD * 100).toFixed(1) + ' cm)');
      const nHip = vm.ndc(gunAt(grip));
      ok(nHip.x > 0 && nHip.y < 0 && nHip.d > 0.2, label + ': at the hip the grip is low and to the right (ndc ' + nHip.x.toFixed(2) + ', ' + nHip.y.toFixed(2) + ')');
      T.setZoomHeldDbg(true);
      ok(await until(() => T.fpDbg().ads > 0.99, 9000), label + ': down the sights');
      await wait(500);
      const nS = vm.ndc(gunAt(rear));
      ok(Math.abs(nS.x) < 0.002 && Math.abs(nS.y) < 0.002, label + ': the rear sight on the view\'s centre (' + nS.x.toFixed(3) + ', ' + nS.y.toFixed(3) + ')');
      const eA2 = sockErr(A.r, wr.r), eB2 = sockErr(A.l, wr.l);
      ok(eA2 < 0.01 && eB2 < 0.01, label + ': down the sights the wrists are on their sockets (' + (eA2 * 100).toFixed(2) + ', ' + (eB2 * 100).toFixed(2) + ' cm)');
      T.setZoomHeldDbg(false);
      await until(() => T.fpDbg().ads < 0.02, 9000);
      await wait(200);
      T.setAmmoDbg(key, 2);
      T.startReload();
      ok(await until(() => T.isReloading(), 3000), label + ': a reload starts');
      const seen = new Set(), places = new Set();
      let maxFit = 0, hidden = false;
      const palmOf = () => { const p = new THREE.Vector3(); A.l.rig.point('palm', p); const W = A.l.layout.wrist; return inView(A.l.wrist, p.set(p.x - W[0], p.y - W[1], p.z - W[2])); };
      while (T.isReloading()) {
        const i = vm.info; seen.add(i.magState); places.add(i.handPlace);
        if (i.magState === 'hand' && vm.gun && vm.gun.mag) {
          const foot = (() => { const g = vm.gun; if (!g.foot) return null; const inGun = g.foot.clone(); const magM = new THREE.Matrix4().compose(g.mag.position, g.mag.quaternion, g.mag.scale), base = new THREE.Matrix4().compose(g.magBase.pos, g.magBase.quat, g.magBase.scale); const local = inGun.applyMatrix4(base.clone().invert()).applyMatrix4(magM); return vm.viewPoint(local); })();
          if (foot) maxFit = Math.max(maxFit, foot.distanceTo(palmOf()));
        }
        if (i.magState === 'pouch' && vm.gun && vm.gun.mag && !vm.gun.mag.visible) hidden = true;
        await wait(30);
      }
      ok(seen.has('hand') && seen.has('pouch') && seen.has('seated'), label + ': the magazine seated, in his palm, away, back (' + [...seen].join(' ') + ')');
      ok(places.has('well') && places.has('pouch') && places.has('work'), label + ': the support hand goes to the well, the pouch and the work part (' + [...places].join(' ') + ')');
      ok(maxFit > 0 && maxFit < 0.015, label + ': the magazine rides the support palm (its foot within ' + (maxFit * 100).toFixed(2) + ' cm)');
      ok(hidden, label + ': away in the pouch it is out of sight');
      await wait(300);
      ok(vm.info.magState === 'seated' && vm.info.handPlace === 'fore', label + ': after it, the magazine is seated and the support hand is back on the gun');
    }
    // a gun with no entry yet: the old first person. The GW-4 has an entry now (stage 2); the shotgun is stage 3.
    ok(await take('shotgun'), 'a shotgun in hand');
    ok(await until(() => !vm.info.active, 8000), 'the view gun goes down for a gun it has no entry for yet');
    let still = 0; for (const a of [ud.armLG, ud.armRG]) a.traverse((o) => { if (o.isMesh && vm.isEyeHidden(o)) still++; });
    ok(still === 0 && !vm.filtering, 'his own arms back in the eye\'s pass (' + still + ' left out), the filter off');
    ok(await take('pistol'), 'the pistol again');
    ok(await until(() => vm.info.active && vm.info.raise > 0.99, 8000), 'and the view gun is up again');
    T.setViewFirstDbg(false);
    ok(await until(() => !vm.info.active, 12000), 'third person: the view gun goes');
    ok(radio.every((o) => o.visible && !vm.isEyeHidden(o)) && (!ud.rigSkin || ud.rigSkin.skins.filter((s) => s.userData.rigSplit === 2).every((s) => !vm.isEyeHidden(s))), 'the radio and antenna are drawn in third person');
    let left = 0; T.marine.traverse((o) => { if (o.userData && o.userData.vmEyeHide) left++; }); src.traverse((o) => { if (o.userData && o.userData.vmEyeHide) left++; });
    ok(left === 0 && !vm.filtering, 'nothing of his left out of the eye\'s pass (' + left + ')');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw ' + String((e && e.stack) || e).slice(0, 400)); }
  return out.join('\n');
})();
