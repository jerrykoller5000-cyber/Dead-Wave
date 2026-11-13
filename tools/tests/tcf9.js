// tcf9 - CF-9 (J151, Jerry 13 Nov): the KR-7.
//  - 21: a fat, rounded Draco-style lower handguard the support hand wraps (through the grip, z 0.30-0.44: at least
//    0.074 across and down to y -0.064 or lower; it was 0.062 and -0.053).
//  - 24: the can bigger (SUPPRESSOR.ak r 0.033, len 0.25; was 0.0271, 0.2009) and taking the finish.
//  - 25: the magazine takes the finish. 27: wood or synthetic furniture; only the synthetic takes the finish.
//    setKr7Furniture(gun, kind) switches any copy; the wood never carries a paint role.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const M = await import(new URL('/studio/weapon-longarms.js', location.origin).href);
    const gun = T.weaponMeshes && T.weaponMeshes.ak;
    ok(!!gun, 'the game KR-7 exists');
    ok(typeof M.setKr7Furniture === 'function' && typeof M.kr7Furniture === 'function', 'setKr7Furniture / kr7Furniture exported');
    if (gun) {
      const find = (name) => { let g = null; gun.traverse((o) => { if (o.name === name) g = o; }); return g; };
      const wood = find(M.KR7_FURNITURE.wood), syn = find(M.KR7_FURNITURE.synthetic);
      ok(!!wood && !!syn, 'both furniture sets are on the gun');
      ok(wood && wood.visible && syn && !syn.visible && M.kr7Furniture(gun) === 'wood', 'wood is the default');
      // 21: the fore end's size through the grip, from the wood set's own vertices
      let w = 0, low = 0;
      if (wood) {
        wood.updateMatrixWorld(true);
        const inv = gun.matrixWorld.clone().invert(), v = new T.THREE.Vector3();
        wood.traverse((o) => {
          if (!o.isMesh) return;
          const P = o.geometry.attributes.position;
          for (let i = 0; i < P.count; i++) {
            v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
            if (v.z > 0.30 && v.z < 0.44 && v.y < 0.02) { w = Math.max(w, Math.abs(v.x)); low = Math.min(low, v.y); }
          }
        });
      }
      ok(2 * w >= 0.074 && low <= -0.064, `21: the lower handguard is fat and deep through the grip (${(2 * w).toFixed(3)} across, down to ${low.toFixed(3)})`);
      // 27, 25, 24: the paint roles the Armory's finish reaches
      const furn = T.runeFinishDbg && T.runeFinishDbg.furniture ? T.runeFinishDbg.furniture() : null;
      const roles = new Set(((furn && furn.ak) || []).map((m) => m.userData.weaponFinishRole));
      ok(roles.has('magazine'), '25: the magazine carries a paint role (' + [...roles].join(', ') + ')');
      ok(roles.has('furniture'), '27: the synthetic furniture carries a paint role');
      ok(roles.has('suppressor shell'), '24: the can carries a paint role');
      ok(!((furn && furn.ak) || []).some((m) => /walnut|stipple/i.test(m.name + ' ' + (m.userData.issueName || ''))) , '27: the wood is never painted');
      let woodPainted = false; if (wood) wood.traverse((o) => { if (o.isMesh && o.material && o.material.userData.weaponFinishRole) woodPainted = true; });
      ok(!woodPainted, '27: no wood part has a paint role');
      // the finish reaches them: paint, look, put the factory finish back
      const was = T.armoryFinishDbg.list('ak').current || '';
      const painted = T.armoryFinishDbg.paint('ak', 'm81');
      const mapped = ((furn && furn.ak) || []).filter((m) => ['magazine', 'furniture', 'suppressor shell'].includes(m.userData.weaponFinishRole));
      ok(painted && mapped.length >= 3 && mapped.every((m) => !!m.map), `24/25/27: Classic Woodland reaches the can, the magazine and the synthetic furniture (${mapped.length} materials)`);
      T.armoryFinishDbg.paint('ak', was);
      // the switch
      ok(M.setKr7Furniture(gun, 'synthetic') === 'synthetic' && !wood.visible && syn.visible && M.kr7Furniture(gun) === 'synthetic', '27: setKr7Furniture(gun, "synthetic") shows the polymer set only');
      ok(M.setKr7Furniture(gun, 'wood') === 'wood' && wood.visible && !syn.visible, '27: and back to wood');
      ok(M.setKr7Furniture({ traverse() {} }, 'wood') === null, '27: a gun without the sets answers null');
      // 24: the can
      const S = T.SUPPRESSOR && T.SUPPRESSOR.ak;
      ok(!!S && S.r >= 0.033 && S.len >= 0.25, '24: the KR-7 can is the bigger one (r ' + (S && S.r) + ', len ' + (S && S.len) + ')');
    }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
