// t334 - GP-20045 (J20): the selected camo covers the eligible whole gun,
// including its fitted suppressor, with one root-space projection and follows
// the live first-person copy. Excluded rubber, lenses, glow and bore stay bare.
(async () => {
  const T = window.TT, out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const near = (a, b, e = 0.0005) => Math.abs(a - b) < e;
  const meshes = (root) => { const a = []; root.traverse((o) => { if (o.isMesh) a.push(o); }); return a; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const F = T.getGunFurniture();
    T.dressGuns({ guns: { m4: 'multicam', ak: 'multicam' } });
    for (const id of ['m4', 'ak']) {
      const gun = T.weaponMeshes[id], mats = F[id], can = gun.userData.suppressor;
      T.setGunSuppressor(gun, true);
      ok(mats.length >= 6, id + ': several distinct painted surfaces (' + mats.length + ')');
      ok(mats.every((m) => m.map && m.userData.gunPaintId === id && near(m.roughness, 0.62) && near(m.metalness, 0.05)), id + ': paint map and dielectric finish on every registered material');
      const all = meshes(gun), painted = all.filter((o) => o.material.userData.gunPaintId === id);
      const leaks = painted.filter((o) => o.material.map !== mats[0].map || !o.geometry.attributes.uv);
      ok(painted.length >= 12 && !leaks.length, id + ': eligible gun meshes share one camo map and UVs (' + painted.length + ', leaks ' + leaks.length + ')');
      const bare = all.filter((o) => o.material.userData.gunPaintId !== id);
      ok(bare.length > 0 && bare.every((o) => !mats.includes(o.material)), id + ': excluded surfaces stay out of the paint registry (' + bare.length + ')');
      const canParts = meshes(can), canPaint = canParts.filter((o) => o.material.userData.gunPaintId === id);
      ok(can.visible && canPaint.length >= 2 && canPaint.every((o) => o.material.map === mats[0].map), id + ': fitted can shell and trim take the same camo (' + canPaint.length + ')');
      ok(canParts.some((o) => o.material.userData.gunPaintId !== id), id + ': suppressor bore remains bare');
      gun.updateWorldMatrix(true, true);
      const inv = gun.matrixWorld.clone().invert(), rel = inv.clone(), v = gun.position.clone();
      let uvBad = 0, samples = 0;
      for (const o of painted.slice(0, 24)) {
        const P = o.geometry.attributes.position, U = o.geometry.attributes.uv;
        if (!P || !U || P.count < 3) continue;
        rel.multiplyMatrices(inv, o.matrixWorld);
        const a = [], b = [];
        for (let i = 0; i < 3; i++) { v.fromBufferAttribute(P, i).applyMatrix4(rel); a.push([v.x, v.y, v.z]); }
        const ab = [a[1][0]-a[0][0], a[1][1]-a[0][1], a[1][2]-a[0][2]];
        const ac = [a[2][0]-a[0][0], a[2][1]-a[0][1], a[2][2]-a[0][2]];
        const n = [Math.abs(ab[1]*ac[2]-ab[2]*ac[1]), Math.abs(ab[2]*ac[0]-ab[0]*ac[2]), Math.abs(ab[0]*ac[1]-ab[1]*ac[0])];
        const s = Math.abs(gun.scale.x) || 1;
        for (let i = 0; i < 3; i++) {
          const [x,y,z] = a[i];
          const want = n[0]>=n[1] && n[0]>=n[2] ? [z,y] : n[1]>=n[2] ? [x,z] : [x,y];
          if (!near(U.getX(i), want[0]*s/0.42) || !near(U.getY(i), want[1]*s/0.42)) uvBad++;
          samples++;
        }
      }
      ok(samples >= 24 && !uvBad, id + ': sampled UVs match the gun-root 0.42 m box projection (' + samples + ', bad ' + uvBad + ')');
    }
    await startMatch(T, 'GP20045'); T.clearZombies?.(); T.grantAllWeapons();
    T.dressGuns({ guns: { m4: 'multicam', ak: 'multicam', uzi: 'multicam' } });
    const offhand = meshes(T.offhandMeshes.uzi).filter((o) => o.material.userData.gunPaintId === 'uzi');
    ok(offhand.length >= 6 && offhand.every((o) => o.material.map && F.uzi.includes(o.material)), 'offhand copy shares the Uzi paint materials (' + offhand.length + ')');
    T.setViewFirstDbg(true);
    for (const id of ['m4', 'ak']) {
      T.setGunSuppressor(T.weaponMeshes[id], true);
      T.setWeapon(T.WEAPON_ORDER.indexOf(id));
      let settled = false;
      for (let i = 0; i < 200; i++) {
        const vm = T.viewmodelDbg();
        if (vm?.gun?.key === id && vm.info.raise > 0.99) { settled = true; break; }
        await wait(60);
      }
      const vm = T.viewmodelDbg(), copy = vm?.gun?.root;
      ok(settled && !!copy, id + ': first-person gun settled');
      if (copy) {
        const painted = vm.gun.pairs.filter(([src, dst]) => src.isMesh && src.material.userData.gunPaintId === id && dst.isMesh);
        ok(painted.length >= 12 && painted.every(([src, dst]) => !!src.material.map && dst.material.map === src.material.map), id + ': first-person copy mirrors the whole-gun camo (' + painted.length + ')');
        const can = copy.getObjectByName('suppressor');
        ok(!!can && can.visible && meshes(can).some((o) => o.material.map === F[id][0].map), id + ': first-person fitted can carries camo');
      }
    }
    T.carryDbg({ loadout: { primary: ['m4', 'ak'], secondary: ['uzi', null] }, inHand: null, vest: true });
    const rig = T.getMarine().userData.carry;
    const carry = rig.slings[0].gun;
    const carryPaint = carry && meshes(carry).filter((o) => o.material.userData.gunPaintId === 'm4');
    ok(!!carry && carryPaint.length >= 6 && carryPaint.every((o) => o.material.map && F.m4.includes(o.material)), 'slung copy shares M4 paint materials (' + (carryPaint?.length || 0) + ')');
    { const arm = T.armoryDbg.ui().armory;   // CB-307: an M4 stored in the Armory, so the rack shows one
      if (!arm.read().shelf.some((g) => g.kind === 'm4')) arm.buy({ id: 't334-rack-m4', kind: 'm4' }, { store: true }); }
    T.armoryDbg.refreshRack(true);
    const rack = T.house.armoryRack.children.find((o) => o.userData.rackKind === 'm4');
    const rackPaint = rack && meshes(rack).filter((o) => o.material.userData.gunPaintId === 'm4');
    ok(!!rack && rackPaint.length >= 6 && rackPaint.every((o) => o.material.map && o.geometry.attributes.uv && F.m4.includes(o.material)), 'rack copy shares M4 paint and root UVs (' + (rackPaint?.length || 0) + ')');
    T.addCash(10000); T.buyHeavyBarrel('m4');
    const heavyFit = T.fitWeaponMod('m4', 'heavy');
    T.buyExtMag('shotgun');
    const tubeFit = T.fitWeaponMod('shotgun', 'ext');
    T.dressGuns({ guns: { m4: 'multicam', shotgun: 'multicam' } });
    const heavy = T.weaponMeshes.m4.userData.heavyLook, tube = T.weaponMeshes.shotgun.userData.tubeExt;
    const heavyParts = heavy && meshes(heavy), tubeParts = tube && meshes(tube);
    ok(heavyFit && heavy.visible && heavyParts.length >= 2 && heavyParts.every((o) => o.material.map && F.m4.includes(o.material)), 'new fitted M4 heavy sleeve is registered for camo (' + (heavyParts?.length || 0) + ')');
    ok(tubeFit && tube.visible && tubeParts.length >= 1 && tubeParts.every((o) => o.material.map && F.shotgun.includes(o.material)), 'new fitted shotgun tube is registered for camo (' + (tubeParts?.length || 0) + ')');
    T.dressGuns({ guns: {} });
    ok(['m4', 'ak'].every((id) => F[id].every((m) => m.map === m.userData.issueMap && m.color.getHex() === m.userData.issueColor && near(m.roughness, m.userData.issueRoughness) && near(m.metalness, m.userData.issueMetalness))), 'unselecting camo restores issue colours and surface response');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
