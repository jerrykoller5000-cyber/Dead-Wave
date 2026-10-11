// CU-100 probe (page side, after posesheet's PAGE): every gun in his hands through the states he holds it in, on the
// 60 fps clock. For each, the worst over 40 frames of: the firing hand's palm point to the gun's grip anchor, the
// support hand's to its anchor (the second gun's grip in akimbo), and the barrel off the reticle. Real renderer.
(() => {
  const T = TT, THREE = T.THREE, m = T.getMarine(), ud = m.userData, D = 180 / Math.PI;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const HOLDS = T.getShoulderDbg().holds;
  const STATES = window.__STATES || [
    { name: 'stand' }, { name: 'ads', zoom: true }, { name: 'walk', keys: ['KeyW'] }, { name: 'run', keys: ['KeyW', 'ShiftLeft'] },
    { name: 'strafe', keys: ['KeyD'] }, { name: 'crouch', keys: ['KeyC'] }, { name: 'crouch-walk', keys: ['KeyC', 'KeyW'] },
    { name: 'turn', turn: 1.6 }, { name: 'fire', fire: true }
  ];
  const GUNS = window.__GUNS || ['pistol', 'revolver', 'uzi', 'm4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'minigun', 'flamer', 'chainsaw', 'pistol*2', 'uzi*2', 'revolver*2'];
  const rows = [];
  const measure = (w, aki) => {
    const gun = T.weaponMeshes[w], H = HOLDS[w]; m.updateMatrixWorld(true);
    // The hold's grip points (CU-100: the fist's channel middle) where the game has them; the hand points before.
    const HD = T.handsDbg;
    const hR = HD.gripPoint ? HD.gripPoint('R') : ud.elbowRG.localToWorld(V(-0.01, -0.26, 0.12));
    const hL = HD.gripPoint ? HD.gripPoint('L') : ud.elbowLG.localToWorld(V(0.02, -0.27, 0.13));
    const r = { R: hR.distanceTo(gun.localToWorld(V(...H.grip))), L: null, barrel: null };
    if (aki) { const og = T.offhandMeshes[w]; if (og) r.L = hL.distanceTo(og.localToWorld(V(...H.grip))); }
    else if (H.fore) {
      const fl = H.fore === 'pump' ? gun.userData.pump.position.clone().add(V(0, H.pumpDy != null ? H.pumpDy : -0.045, 0)) : V(...H.fore);
      fl.y -= gun.userData.cu100Drop || 0;   // CU-100: the fist closes round the forend's lower edge
      const fw = gun.localToWorld(fl), rel = hL.clone().sub(fw);
      r.L = rel.length();
      // A long gun's support hand may go back along the forend (CU-100): there, how far it is off the forend's line.
      if (H.sh && Array.isArray(H.fore) && !HD.HANDS.fore[w] && HD.gripPoint) {
        const c = V(0, 0, 1).applyQuaternion(gun.getWorldQuaternion(new THREE.Quaternion())), along = rel.dot(c);
        if (along < 0) { r.slide = -along; r.L = rel.addScaledVector(c, -along).length(); }
      }
    }
    if (!H.level && gun.userData.muzzleLocal) {
      const f = V(0, 0, 1).transformDirection(gun.matrixWorld), mz = gun.localToWorld(gun.userData.muzzleLocal.clone());
      r.barrel = Math.acos(Math.max(-1, Math.min(1, f.dot(V().subVectors(T.aimTarget, mz).normalize())))) * D;
    }
    return r;
  };
  for (const spec of GUNS) {
    const [w, two] = spec.split('*'), aki = two === '2';
    __weapon(w); __aim(0); __step(30);
    const isAki = () => !!(T.offhandMeshes[w] && T.offhandMeshes[w].visible);
    if (aki !== isAki() && T.toggleDualWieldDbg) { T.toggleDualWieldDbg(); __step(40); }
    if (aki && !isAki()) { rows.push({ gun: spec, error: 'no pair' }); continue; }
    for (const st of STATES) {
      for (const k of st.keys || []) __key(k, true);
      if (st.zoom) T.setZoomHeldDbg(true);
      if (st.fire) { T.setAmmoDbg && T.setAmmoDbg(w, 999); T.setMouseFireDbg(true); }
      __step(60);
      const worst = { R: 0, L: 0, barrel: 0, slide: 0 };
      for (let i = 0; i < 40; i++) {
        if (st.turn) __aim(st.turn * Math.sin(i / 40 * Math.PI));
        __step(1);
        const r = measure(w, aki);
        worst.R = Math.max(worst.R, r.R); if (r.L != null) worst.L = Math.max(worst.L, r.L); if (r.barrel != null) worst.barrel = Math.max(worst.barrel, r.barrel);
        if (r.slide) worst.slide = Math.max(worst.slide, r.slide);
      }
      rows.push({ gun: spec, state: st.name, R: +worst.R.toFixed(3), L: +worst.L.toFixed(3), barrel: +worst.barrel.toFixed(2), slide: +worst.slide.toFixed(3) });
      for (const k of st.keys || []) __key(k, false);
      if (st.zoom) T.setZoomHeldDbg(false);
      if (st.fire) T.setMouseFireDbg(false);
      __aim(0); __step(45);
    }
    if (aki && T.toggleDualWieldDbg) { T.toggleDualWieldDbg(); __step(40); }
  }
  return JSON.stringify(rows);
})()
