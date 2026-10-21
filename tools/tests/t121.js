// t121 — CL-95 (P-126, D-65): six guns each carry a suppressor that belongs on them. Built hidden; fitted, it shows and
// the muzzle point and flash move to the can's end; taken off, both go back. Guns without one (AA-12, revolver) say no.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const six = ['m4', 'ak', 'pistol', 'uzi', 'sniper', 'shotgun'];
    for (const k of six) {
      const g = T.weaponMeshes[k], ud = g.userData, can = ud.suppressor;
      ok(!!can && can.visible === false && can.children.length >= 2, k + ': a can, hidden, ' + (can ? can.children.length : 0) + ' parts');
      const z0 = ud.muzzleLocal.z;
      ok(T.setGunSuppressor(g, true) && can.visible && ud.suppressed, k + ': fitted, it shows');
      const dz = ud.muzzleLocal.z - z0;
      ok(dz > 0.05 && dz < 0.35 && Math.abs(ud.flash.position.z - ud.muzzleLocal.z) < 1e-6, k + ': the muzzle and flash move ' + dz.toFixed(3) + ' m to the can end');
      ok(Math.abs(T.SUPPRESSOR[k].len - T.SUPPRESSOR[k].back + z0 - ud.muzzleLocal.z) < 1e-6, k + ': length as specified');
      T.setGunSuppressor(g, false);
      ok(!can.visible && !ud.suppressed && Math.abs(ud.muzzleLocal.z - z0) < 1e-9, k + ': off again, back where it was');
    }
    ok(!T.setGunSuppressor(T.weaponMeshes.aa12, true) && !T.setGunSuppressor(T.weaponMeshes.revolver, true), 'the AA-12 and the revolver have none');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
