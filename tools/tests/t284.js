// t284 - GB-228 (N11, Jerry: "first person weapon sights not FPS accurate"): aimed in first person, each iron-sighted gun's
// rear sight top and front sight top land on the screen centre together (modern-shooter alignment). Rear/front tops in the
// gun's own space from t277 (game/sight-points.js comments); the m4's 'rear' is its holo dot (GB-233). Bar: |ndc y| <= 0.02 for both, |rear - front| <= 0.015.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  // GB-240: real-renderer only, marked as t222's and t282's are (the test page's stand-in three has no working Matrix4.transpose, so
  // its projection puts every sight at ndc y ~ -1.9: qa/2026-10-27-CU-164/chunk-11.log). On the test page they're INFO; the bars are unchanged.
  const real = (() => { const m = new T.THREE.Matrix4().makeRotationX(0.3), e = m.elements.slice(); m.transpose(); return m.elements[6] === e[9] && m.elements[9] === e[6] && e[6] !== e[9]; })();
  const okReal = real ? ok : (c, m) => out.push('INFO ' + m + (c ? '' : ' (would fail; INFO on the test page)'));
  // GB-233 (rule 13, with t277's iron-sight ruling 2026-10-26): the pistol's and revolver's rear is the notch, not the slide's or rib's mid-top (was .075@.072, .109@.081).
  // GB-259 (Claude 2026-11-02/03): RF tracks game/sight-points.js — pistol ears .092, uzi aperture centre .126 + front .126@.198, aa12 ring .168 / post .168@.75, launcher leaf .137 / post .137@.29.
  // CL-322 (t284's datums): the revolver's rear notch floor 0.120 on CL-320's strap; the launcher through the M2A1's dot (no front post).
  const RF = { pistol: [[0,.092,-.064],[0,.092,.282]], revolver: [[0,.120,-.05],[0,.121,.318]], uzi: [[0,.126,-.08],[0,.126,.198]],
    m4: [[0,.134,.0455],[0,.138,.673]], ak: [[0,.074,.218],[0,.0745,.84]], aa12: [[0,.168,-.12],[0,.168,.75]], launcher: [[0,.17,-.0145],null] };
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
      // GB-262 (CL-281): where the view gun draws this weapon his own gun is out of the eye's pass, so measure the view gun's sights
      // through its own projection (the same gun-local points, the same bars: rule 13). Other guns as before.
      const vm = T.viewmodelDbg ? T.viewmodelDbg() : null, viaVm = !!(vm && vm.showing && vm.showing(w));
      const y = (a) => a ? (viaVm ? vm.ndc(vm.viewPoint(new T.THREE.Vector3(...a))).y : g.localToWorld(new T.THREE.Vector3(...a)).project(c).y) : null;
      const ry = y(r), fy = y(f);
      okReal(Math.abs(ry) <= 0.02 && (fy == null || (Math.abs(fy) <= 0.02 && Math.abs(ry - fy) <= 0.015)),
        w + ' aimed: rear ' + ry.toFixed(3) + ' front ' + (fy == null ? '-' : fy.toFixed(3)) + ' (ndc y' + (viaVm ? ', view gun' : '') + ')');
      T.setZoomHeldDbg(false); await wait(700); T.setViewFirstDbg(false); await wait(500);
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();