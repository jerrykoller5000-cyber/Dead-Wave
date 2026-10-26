// t284 - GB-228 (N11, Jerry: "first person weapon sights not FPS accurate"): aimed in first person, each iron-sighted gun's
// rear sight top and front sight top land on the screen centre together (modern-shooter alignment). Rear/front tops in the
// gun's own space from t277 (game/sight-points.js comments); the m4's 'rear' is its holo dot (GB-233). Bar: |ndc y| <= 0.02 for both, |rear - front| <= 0.015.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const RF = { pistol: [[0,.075,.072],[0,.087,.287]], revolver: [[0,.109,.081],[0,.121,.326]], uzi: [[0,.156,-.087],null],
    m4: [[0,.134,.0455],[0,.138,.673]], ak: [[0,.095,.218],[0,.097,.84]], aa12: [[0,.18,-.12],[0,.175,.75]], launcher: [[0,.123,.053],[0,.102,.65]] };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Sights');
    T.setHp(100000); T.grantAllWeapons();
    for (const [w, [r, f]] of Object.entries(RF)) {
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); }
      await wait(1500); T.setViewFirstDbg(true); await wait(1000); T.setZoomHeldDbg(true);
      const t0 = Date.now(); while (T.fpDbg().ads < 0.99 && Date.now() - t0 < 6000) await wait(100); await wait(400);
      const g = T.weaponMeshes[w], c = T.camera || window.camera; g.updateWorldMatrix(true, false);
      const y = (a) => a ? g.localToWorld(new T.THREE.Vector3(...a)).project(c).y : null;
      const ry = y(r), fy = y(f);
      ok(Math.abs(ry) <= 0.02 && (fy == null || (Math.abs(fy) <= 0.02 && Math.abs(ry - fy) <= 0.015)),
        w + ' aimed: rear ' + ry.toFixed(3) + ' front ' + (fy == null ? '-' : fy.toFixed(3)) + ' (ndc y)');
      T.setZoomHeldDbg(false); await wait(700); T.setViewFirstDbg(false); await wait(500);
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();