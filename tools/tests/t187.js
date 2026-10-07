// t187 - GB-129 (Jerry): shoulder-fired long guns are shouldered.
//  - m4, ak, aa12, shotgun, sniper, launcher: the butt sits in the gun-side shoulder pocket (inside the
//    shoulder joint, in front of it), the firing hand is on the pistol grip and the support hand on the
//    forend, and the barrel lies on the aim (two different aims).
//  - Cheek weld only while RMB-zoomed: not zoomed the head keeps its pose (no bend, not moved); fully
//    zoomed the head bends toward the stock and the eye comes much closer to the sight line; let go and
//    it is back.
//  - A pistol is not shouldered: the shoulders' roll-forward lets go.
//  A held do-nothing key keeps the idle (smoking) from taking his hands mid-test.
//  (The Watchman MG / m240 is a tripod build, never in his hands, so it is not here.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = () => new THREE.Vector3();
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await new Promise((r) => { const t0 = Date.now(); const f = () => (T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0) || Date.now() - t0 > 4000 ? r() : setTimeout(f, 50); f(); });
    const s0 = T.getSimTime ? T.getSimTime() : 0, w0 = Date.now();
    await wait(2600);   // the draw from the pack, then the hold settles
    // Counted in game time too: the first draw of the run can stall the page for ~3 s (seen headless), and a
    // wall-clock wait alone then measured the m4 mid-draw (GB-138's t187 report).
    while (T.getSimTime && T.getSimTime() - s0 < 1.5 && Date.now() - w0 < 20000) await wait(100);
    return T.getCurrentWeapon() === w;
  };
  let aimAt = [0, 1.25, 10];
  const pin = () => { const p = T.player.position; T.aimTarget.set(p.x + aimAt[0], T.sampleHeight(p.x, p.z) + aimAt[1], p.z + aimAt[2]); };
  // The gun's visible vertices in gun space (once per gun).
  const vertsOf = (gun) => {
    gun.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), v = V(), pts = [];
    gun.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      for (let q = o; q && q !== gun; q = q.parent) if (!q.visible) return;
      if (o === gun.userData.laser || o === gun.userData.flash) return;
      const mm = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), pa = o.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mm); pts.push(v.x, v.y, v.z); }
    });
    return pts;
  };
  const measure = (w, pts) => {
    const m = T.marine || window.worldMarine, ud = m.userData, gun = T.weaponMeshes[w];
    m.updateMatrixWorld(true); gun.updateMatrixWorld(true);
    let minZ = Infinity; for (let i = 2; i < pts.length; i += 3) minZ = Math.min(minZ, pts[i]);
    let ymin = Infinity, ymax = -Infinity, bx = 0, bn = 0;
    for (let i = 0; i < pts.length; i += 3) if (pts[i + 2] < minZ + 0.025) { bx += pts[i]; bn++; ymin = Math.min(ymin, pts[i + 1]); ymax = Math.max(ymax, pts[i + 1]); }
    const tInv = new THREE.Matrix4().copy(ud.torsoG.matrixWorld).invert();
    const butt = gun.localToWorld(new THREE.Vector3(bx / bn, (ymin + ymax) / 2, minZ)).applyMatrix4(tInv);
        const handR = ud.elbowRG.localToWorld(new THREE.Vector3(-0.01, -0.26, 0.12)), handL = ud.elbowLG.localToWorld(new THREE.Vector3(0.02, -0.27, 0.13));
    // The hold's own grip and forend points on the gun (the test page's geometry is not the real mesh, so not the nearest vertex).
    const hold = T.getShoulderDbg().holds[w];
    const gripW = gun.localToWorld(new THREE.Vector3(...hold.grip));
    const foreL = hold.fore === 'pump' ? gun.userData.pump.position.clone().add(new THREE.Vector3(0, -0.045, 0)) : new THREE.Vector3(...hold.fore);
    const foreW = gun.localToWorld(foreL);
    const fwd = new THREE.Vector3(0, 0, 1).transformDirection(gun.matrixWorld);
    const muz = gun.localToWorld(gun.userData.muzzleLocal.clone());
    const aimErr = Math.acos(Math.max(-1, Math.min(1, fwd.dot(V().subVectors(T.aimTarget, muz).normalize())))) * 180 / Math.PI;
    let sy = -Infinity; for (let i = 0; i < pts.length; i += 3) if (Math.abs(pts[i + 2]) < 0.12 && Math.abs(pts[i]) < 0.03) sy = Math.max(sy, pts[i + 1]);
    const sight = gun.localToWorld(new THREE.Vector3(0, sy, 0));
    const eye = ud.headG.localToWorld(new THREE.Vector3(0.045, 0.215, 0.125));
    const d = V().subVectors(eye, sight); const eyeToSight = d.addScaledVector(fwd, -d.dot(fwd)).length();
    const sh = T.getShoulderDbg();
    return { butt, shoulder: ud.armRG.position.clone(), handR: handR.distanceTo(gripW), handL: handL.distanceTo(foreW), aimErr, eyeToSight, sh,
      headPos: ud.headG.position.clone() };
  };
  // The arm IK needs Matrix4.transpose; the test page's three stand-in (tools/tests/fakethree.mjs) has it as a stub
  // that returns the matrix unchanged, so there the arms never reach the gun. Hands are checked only where it works
  // (the shots in the real renderer measure them); a fixed stand-in turns these checks on by itself.
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const ikWorks = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const handOk = (c, m) => out.push(ikWorks ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page Matrix4.transpose is a stub, arm IK inert) ' + m);
  const f3 = (v) => '(' + [v.x, v.y, v.z].map((n) => n.toFixed(3)).join(', ') + ')';
  try {
    await startMatch(T, 'Shoulder');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const aimer = setInterval(pin, 5); pin();
    // A key held down that does nothing: he counts as busy, so the idle (bored, the cigarette) never takes his hands.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    ok(typeof T.getShoulderDbg === 'function', 'TT.getShoulderDbg is exported');
    const ud = (T.marine || window.worldMarine).userData;
    const head0 = ud.headG.position.clone();
    const H = T.getShoulderDbg().hold;
    const pocket = new THREE.Vector3(...H.pocket), adsPocket = new THREE.Vector3(...H.adsPocket);
    for (const w of ['m4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher']) {
      aimAt = [0, 1.25, 10];
      if (!await take(w)) { ok(false, w + ': could not take it'); continue; }
      const pts = vertsOf(T.weaponMeshes[w]);
      const a = measure(w, pts);
      ok(a.sh.w > 0.95, w + ': shouldered (roll ' + a.sh.w.toFixed(2) + ')');
      ok(a.butt.distanceTo(pocket) < 0.06, w + ': butt in the shoulder pocket ' + f3(a.butt) + ' vs ' + f3(pocket) + ' (' + a.butt.distanceTo(pocket).toFixed(3) + ' m)');
      ok(a.butt.x < a.shoulder.x && a.butt.z > a.shoulder.z && a.butt.distanceTo(a.shoulder) < 0.16,
        w + ': butt just inside and in front of the gun-side shoulder joint (' + a.butt.distanceTo(a.shoulder).toFixed(3) + ' m)');
      handOk(a.handR < 0.05, w + ': firing hand on the grip (' + a.handR.toFixed(3) + ' m)');
      handOk(a.handL < 0.065, w + ': support hand on the forend (' + a.handL.toFixed(3) + ' m)');
      ok(a.aimErr < 1.5, w + ': barrel on the aim, ahead (' + a.aimErr.toFixed(2) + ' deg)');
      ok(a.sh.cheek < 0.001 && a.headPos.distanceTo(head0) < 1e-4, w + ': not zoomed, the head keeps its pose (bend ' + a.sh.cheek.toFixed(3) + ')');
      aimAt = [-4, 3.5, 9];
      await wait(400);
      const b = measure(w, pts);
      ok(b.aimErr < 1.5, w + ': barrel follows the aim up and to the side (' + b.aimErr.toFixed(2) + ' deg)');
      ok(b.butt.distanceTo(pocket) < 0.08, w + ': butt stays in the shoulder aiming up (' + b.butt.distanceTo(pocket).toFixed(3) + ' m)');
      aimAt = [0, 1.25, 10];
      T.setZoomHeldDbg(true);
      await wait(1100);
      const z = measure(w, pts);
      ok(z.sh.ads > 0.95, w + ': RMB zoom all the way in (' + z.sh.ads.toFixed(2) + ')');
      ok(z.sh.cheek > 0.3, w + ': zoomed, the head bends down onto the stock (' + z.sh.cheek.toFixed(2) + ' rad)');
      ok(z.eyeToSight < a.eyeToSight * 0.55, w + ': zoomed, the eye comes to the sight line (' + a.eyeToSight.toFixed(3) + ' -> ' + z.eyeToSight.toFixed(3) + ' m)');
      ok(z.butt.distanceTo(adsPocket) < 0.06 && z.aimErr < 1.5,
        w + ': zoomed, still shouldered and on the aim (butt ' + z.butt.distanceTo(adsPocket).toFixed(3) + ', ' + z.aimErr.toFixed(2) + ' deg)');
      handOk(z.handR < 0.05 && z.handL < 0.065, w + ': zoomed, both hands still on (' + z.handR.toFixed(3) + '/' + z.handL.toFixed(3) + ')');
      T.setZoomHeldDbg(false);
      await wait(1200);
      const r = measure(w, pts);
      ok(r.sh.cheek < 0.01 && r.headPos.distanceTo(head0) < 0.002, w + ': zoom let go, the head comes back up (bend ' + r.sh.cheek.toFixed(3) + ')');
    }
    // Not a long gun: no shoulder roll, the arms back where the rig puts them.
    await take('pistol');
    await wait(600);
    const p = T.getShoulderDbg();
    ok(T.getCurrentWeapon() === 'pistol' && p.w < 0.02 && p.cheek === 0, 'pistol: not shouldered (roll ' + p.w.toFixed(3) + ')');
    ok(Math.abs(ud.armRG.position.z - 0.02) < 0.004 && Math.abs(ud.armLG.position.z - 0.02) < 0.004, 'pistol: the shoulders are back (' + f3(ud.armRG.position) + ')');
    clearInterval(aimer);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'F13', key: 'F13', bubbles: true }));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
