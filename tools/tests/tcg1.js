// tcg1 - CG-1 (J151 note 4, Jerry 13 Nov: "Camo glitch again and again!", "Camo resize glitch is persistent in 1st person
// on arms and all weapons throughout the training area"). Claude 7. First person, every gun and the sleeves in multicam,
// stepped at 60 frames a second:
// - a change of gun (four changes, long gun to shotgun to pistol to KR-7 to minigun): on no frame between the old gun going
//   down and the new one up does the eye's pass draw his body's own arms or the gun in his hand (they were drawn there
//   for those frames, at the world's field of view and his body's size: the camo on the sleeves, gloves and gun jumped
//   to another size and back on every change);
// - the view's sleeves (forearm, rolled sleeve, upper sleeve) keep the camo's size, in tiles a metre, within 8 % of his
//   body's own sleeve through the hold, a reload and the aim of seven guns (the upper sleeve was stretched up to 2.5x
//   to reach his shoulder, and the camo with it).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const THREE = T.THREE || window.THREE, dt = 1 / 60;
  // tiles a metre of a mesh's map, as it is drawn (its world matrix): the median over its triangles
  const dens = (o) => {
    const g = o.geometry, P = g && g.attributes.position, U = g && g.attributes.uv;
    if (!P || !U) return null;
    o.updateWorldMatrix(true, false);
    const M = o.matrixWorld, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const idx = g.index ? g.index.array : null, n = idx ? idx.length : P.count, r = [];
    const step = Math.max(3, Math.floor(n / 3 / 400) * 3);
    for (let i = 0; i + 2 < n; i += step) {
      const i0 = idx ? idx[i] : i, i1 = idx ? idx[i + 1] : i + 1, i2 = idx ? idx[i + 2] : i + 2;
      a.fromBufferAttribute(P, i0).applyMatrix4(M); b.fromBufferAttribute(P, i1).applyMatrix4(M); c.fromBufferAttribute(P, i2).applyMatrix4(M);
      const wa = e1.subVectors(b, a).cross(e2.subVectors(c, a)).length() / 2;
      const ua = Math.abs((U.getX(i1) - U.getX(i0)) * (U.getY(i2) - U.getY(i0)) - (U.getX(i2) - U.getX(i0)) * (U.getY(i1) - U.getY(i0))) / 2;
      if (wa > 1e-9 && ua > 1e-12) r.push(Math.sqrt(ua / wa));
    }
    r.sort((x, y) => x - y);
    return r.length ? r[r.length >> 1] : null;
  };
  const shown = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
  try {
    await startMatch(T, 'CG1');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(1e6); T.grantAllWeapons();
    const vm = () => T.viewmodelDbg && T.viewmodelDbg();
    if (!vm()) { ok(false, 'the view model'); return out.join('\n'); }
    T.setCamo('multicam', false);
    const W = T.getWardrobe(); W.guns = W.guns || {}; for (const k of Object.keys(T.weaponMeshes)) W.guns[k] = 'multicam'; T.dressGuns(W);
    T.setViewFirstDbg(true); T.setUnarmedDbg(false); T.setOtsAimDbg && T.setOtsAimDbg(0, -0.2);
    const up = (w) => { const V = vm(); return V.info.active && V.info.key === w && V.info.raise > 0.999; };
    const take = async (w) => {
      T.flightHold(false);
      for (let i = 0; i < 24 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); }
      T.setUnarmedDbg(false); T.flightHold(true);
      for (let i = 0; i < 400 && !up(w); i++) T.stepFrame(dt);
      for (let i = 0; i < 20; i++) T.stepFrame(dt);
      return up(w);
    };
    // --- 1. a change of gun: what the eye's pass draws of his body's arms and the gun in his hand ---
    const cam = T.camera, box = new THREE.Box3(), cp = new THREE.Vector3();
    // does a world box reach into the camera's view? its corners in front of the eye, projected, overlapping the screen
    const camInv = new THREE.Matrix4();
    const inView = (b) => {
      const ty = Math.tan((cam.fov || 60) * Math.PI / 360), tx = ty * (cam.aspect || 16 / 9);
      let x0 = 2, x1 = -2, y0 = 2, y1 = -2, any = false;
      for (let i = 0; i < 8; i++) {
        cp.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(camInv);
        if (cp.z > -0.02) { x0 = -2; x1 = 2; y0 = -2; y1 = 2; any = true; continue; }   // a corner at or behind the eye: count it as reaching in
        const px = cp.x / (-cp.z * tx), py = cp.y / (-cp.z * ty); any = true;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      return any && x1 > -1 && x0 < 1 && y1 > -1 && y0 < 1;
    };
    const eyeDraws = (roots) => {
      cam.updateMatrixWorld(); camInv.copy(cam.matrixWorld).invert();
      const V = vm(), names = new Set(); let n = 0;
      for (const r of roots) if (r) r.traverse((o) => {
        if (!(o.isMesh || o.isSkinnedMesh) || !shown(o) || !o.layers.test(cam.layers)) return;
        if (V.isEyeHidden(o)) return;   // the view's own call (the renderer's filter acts on it)
        if (o.material && !Array.isArray(o.material) && o.material.visible === false) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        if (!inView(box)) return;
        n++; names.add(o.name || '?');
      });
      return { n, names: [...names].slice(0, 4).join(', ') };
    };
    const ud = T.getMarine().userData;
    for (const [a, b] of [['m4', 'shotgun'], ['shotgun', 'pistol'], ['pistol', 'ak'], ['ak', 'minigun']]) {
      if (!(await take(a))) { ok(false, a + ': the view gun up'); continue; }
      T.setWeapon(T.WEAPON_ORDER.indexOf(b));
      let frames = 0, bad = 0, worst = null, downSeen = false;
      for (let f = 0; f < 600; f++) {
        T.stepFrame(dt); frames++;
        const V = vm(); if (!V.info.active || V.info.raise < 0.999) downSeen = true;
        const d = eyeDraws([ud.armLG, ud.armRG, T.weaponMeshes[a], T.weaponMeshes[b]]);
        if (d.n) { bad++; if (!worst || d.n > worst.n) worst = { f, ...d }; }
        if (downSeen && up(b)) break;
      }
      ok(downSeen && up(b), a + ' to ' + b + ': the change ran (' + frames + ' frames)');
      ok(bad === 0, a + ' to ' + b + ': his body\'s arms and gun never in the eye\'s pass (' + bad + ' of ' + frames + ' frames' + (worst ? '; worst frame ' + worst.f + ': ' + worst.n + ' meshes, ' + worst.names : '') + ')');
    }
    // --- 2. the camo's size on the view's sleeves against his body's sleeve ---
    let ref = []; T.getMarine().traverse((o) => { if (o.isMesh && o.name === 'live-sleeve' && o.material && o.material.map) { const d = dens(o); if (d) ref.push(d); } });
    ref.sort((x, y) => x - y); ref = ref.length ? ref[ref.length >> 1] : null;
    ok(ref > 1.5 && ref < 3.5, 'his body\'s sleeve camo: ' + (ref ? ref.toFixed(3) : '?') + ' tiles a metre');
    const SLEEVES = new Set(['vm-forearm', 'vm-rolled-sleeve', 'vm-upper-sleeve']);
    for (const w of ['pistol', 'm4', 'ak', 'shotgun', 'sniper', 'chainsaw', 'flamer']) {
      if (!(await take(w))) { ok(false, w + ': the view gun up'); continue; }
      const lo = {}, hi = {};
      const samp = () => { const V = vm(); for (const arm of [V.arms.r, V.arms.l]) arm.root.traverse((o) => {
        if (!o.isMesh || !SLEEVES.has(o.name) || !shown(o)) return;
        const k = (arm === V.arms.r ? 'R ' : 'L ') + o.name, d = dens(o); if (d == null) return;
        lo[k] = Math.min(lo[k] ?? 1e9, d); hi[k] = Math.max(hi[k] ?? 0, d); }); };
      for (let f = 0; f < 30; f++) { T.stepFrame(dt); if (f % 3 === 0) samp(); }
      T.setAmmoDbg && T.setAmmoDbg(w, 1); T.startReload && T.startReload();
      for (let f = 0; f < 600 && (f < 10 || T.isReloading()); f++) { T.stepFrame(dt); if (f % 4 === 0) samp(); }
      T.setZoomHeldDbg(true); for (let f = 0; f < 50; f++) { T.stepFrame(dt); if (f % 4 === 0) samp(); }
      T.setZoomHeldDbg(false); for (let f = 0; f < 30; f++) { T.stepFrame(dt); if (f % 4 === 0) samp(); }
      const keys = Object.keys(lo); let worst = null;
      for (const k of keys) for (const v of [lo[k], hi[k]]) { const e = Math.abs(v / ref - 1); if (!worst || e > worst.e) worst = { k, v, e }; }
      ok(keys.length >= 2 && worst && worst.e <= 0.08, w + ': the view\'s sleeve camo within 8% of his body\'s through the hold, a reload and the aim (' + keys.length + ' sleeves; worst ' + (worst ? worst.k + ' ' + worst.v.toFixed(3) + ', ' + (worst.e * 100).toFixed(0) + '%' : '?') + ')');
    }
    T.flightHold(false);
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  try { T.flightHold(false); T.setViewFirstDbg(false); } catch (_) {}
  return out.join('\n');
})()
