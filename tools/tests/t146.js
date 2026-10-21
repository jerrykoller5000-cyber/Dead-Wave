// t146 - CL-97 (P-132, D-66): the wardrobe on the rig. Every hat, every eyewear, sleeves rolled, shorts, bare hands,
// hair, eyes and skin show on a marine from TT.dressMarine, and the world marine follows the profile's picks.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const meshes = (grp) => { const a = []; grp.traverse((o) => { if (o.isMesh) a.push(o); }); return a; };
  try {
    const m = T.makeMarine();
    const d = m.userData.dress;
    ok(!!d, 'the rig carries its dress registry');
    ok(T.DRESS.cap.join() === 'cover,boonie,ballcap,ballcapBack', 'four hats: ' + T.DRESS.cap.join());
    ok(T.DRESS.eyewear.join() === 'none,aviators,pitViper,wayfarer,goggles', 'five eyewear picks: ' + T.DRESS.eyewear.join());
    // Defaults: the cover, no eyewear, sleeves down, trousers, gloves on.
    let p = T.dressMarine(m, T.normalizeWardrobe(null));
    ok(p.hat === 'cover' && p.eyewear === 'none' && !p.rolled && !p.shorts && p.gloves, 'the default dress: ' + JSON.stringify(p));
    ok(d.hats.cover.visible && !d.hats.boonie.visible && !d.hats.ballcap.visible && !d.hats.ballcapBack.visible, 'only the cover shows by default');
    for (const k of T.DRESS.cap) ok(meshes(d.hats[k]).length > 0, 'the ' + k + ' has a shape');
    for (const k of T.DRESS.eyewear.slice(1)) ok(meshes(d.eyes[k]).length > 0, 'the ' + k + ' have a shape');
    const w = (items, body) => {
      const base = T.normalizeWardrobe(null);
      for (const k of Object.keys(items || {})) base.items[k] = { ...base.items[k], ...items[k] };
      Object.assign(base.body, body || {});
      return base;
    };
    for (const hat of T.DRESS.cap) {
      T.dressMarine(m, w({ cap: { style: hat } }));
      ok(T.DRESS.cap.every((k) => d.hats[k].visible === (k === hat)), 'the ' + hat + ' alone');
    }
    for (const e of T.DRESS.eyewear) {
      T.dressMarine(m, w({ eyewear: { style: e } }));
      ok(T.DRESS.eyewear.every((k) => d.eyes[k].visible === (k === e)), 'eyewear ' + e + ' alone');
    }
    // The backwards cap turns the bill behind him.
    // The parts are baked into one mesh per material, so read the vertices, not the mesh positions.
    const bill = (grp) => {
      const a = meshes(grp); m.updateMatrixWorld(true);
      const v = a[0].position.clone(); let zMin = 9, zMax = -9;
      for (const o of a) { const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(o.matrixWorld); zMin = Math.min(zMin, v.z); zMax = Math.max(zMax, v.z); } }
      return { zMin, zMax };
    };
    const fwd = bill(d.hats.ballcap), bck = bill(d.hats.ballcapBack);
    ok(fwd.zMax > 0.15 && bck.zMin < -0.15, 'the ballcap bill forwards, and backwards behind (' + fwd.zMax.toFixed(2) + ', ' + bck.zMin.toFixed(2) + ')');
    // The cap takes the cap's camo whatever its shape.
    const capMats = new Set(m.userData.wardrobe.cap.mats);
    ok(meshes(d.hats.boonie).some((o) => capMats.has(o.material)) && meshes(d.hats.ballcap).some((o) => capMats.has(o.material)), 'the boonie and ballcap wear the cap camo');
    // Sleeves, shorts, gloves.
    T.dressMarine(m, w({ shirt: { sleeves: 'rolled' }, trousers: { cut: 'shorts' }, gloves: { worn: false } }));
    ok(d.sleeveRolled.length === 4 && d.sleeveRolled.every((g) => g.visible) && d.sleeveDown.every((g) => !g.visible), 'sleeves rolled on both arms');
    ok(d.legShort.length === 4 && d.legShort.every((g) => g.visible) && d.legLong.every((g) => !g.visible), 'shorts on both legs');
    ok(d.handBare.length === 2 && d.handBare.every((g) => g.visible) && d.gloveOn.every((g) => !g.visible), 'bare hands');
    const skinMats = (grp) => meshes(grp).map((o) => o.material);
    ok(d.handBare.every((g) => skinMats(g).includes(d.mats.skin)) && d.sleeveRolled.some((g) => skinMats(g).includes(d.mats.skin)), 'bare hands and forearms are his skin');
    T.dressMarine(m, w({}));
    ok(d.sleeveDown.every((g) => g.visible) && d.legLong.every((g) => g.visible) && d.gloveOn.every((g) => g.visible), 'and back to sleeves down, trousers and gloves');
    // Hair, eyes, skin.
    T.dressMarine(m, w({}, { hair: 'blond', eyes: 'blue', skin: 5 }));
    ok(d.mats.hair.color.getHex() === T.DRESS.hair.blond, 'blond hair');
    ok(d.mats.iris.color.getHex() === T.DRESS.eyes.blue, 'blue eyes');
    ok(d.mats.skin.color.getHex() === T.DRESS.skin[5], 'the darkest skin');
    const m2 = T.makeMarine();
    ok(m2.userData.dress.mats.skin.color.getHex() === T.DRESS.skin[3] && m2.userData.dress.mats.skin !== d.mats.skin, 'another marine keeps his own skin');
    T.dressMarine(m, w({}, { skin: 9, hair: 'green' }));
    ok(d.mats.skin.color.getHex() === T.DRESS.skin[3] && d.mats.hair.color.getHex() === T.DRESS.hair.darkBrown, 'a bad pick falls back to the default');
    // Part 2: camo on the guns' furniture, one pick per gun; metal stays metal.
    const F = T.getGunFurniture();
    ok(F && ['m4', 'ak', 'pistol', 'uzi', 'shotgun', 'sniper'].every((k) => F[k] && F[k].length > 0), 'the guns have furniture to camo: ' + Object.keys(F || {}).filter((k) => F[k].length).join(','));
    const metal = []; T.weaponMeshes.m4.traverse((o) => { if (o.isMesh && !F.m4.includes(o.material)) metal.push(o.material); });
    const metalMaps = metal.map((m) => m.map);
    T.dressGuns({ guns: { m4: 'multicam', uzi: 'tigerStripe' } });
    ok(F.m4.every((m) => m.map && m.map.image), 'the M4 furniture wears its camo');
    ok(F.ak.every((m) => !m.map), 'the AK keeps its wood');
    ok(metal.length > 0 && metal.every((m, i) => m.map === metalMaps[i]), 'the M4 metal is untouched (' + metal.length + ' parts)');
    const off = T.offhandMeshes && T.offhandMeshes.uzi; let offCamo = false;
    if (off) off.traverse((o) => { if (o.isMesh && F.uzi.includes(o.material) && o.material.map) offCamo = true; });
    ok(!off || offCamo, 'the second Uzi wears the same camo');
    T.dressGuns({ guns: { m4: 'nope' } });
    ok(F.m4.every((m) => !m.map && m.color.getHex() === m.userData.issueColor), 'an unknown camo leaves the gun bare');
    T.dressGuns({ guns: {} });
    // The world marine wears the profile's picks (dressWorld calls dressMarine with the profile's wardrobe).
    await startMatch(T, 'Dress97');
    const wm = T.getMarine(), ws = T.getWardrobe();
    const keep = JSON.parse(JSON.stringify(ws.items));
    ws.items.cap.style = 'boonie'; ws.items.eyewear = { style: 'aviators' };
    T.dressMarine(wm);
    ok(wm.userData.dress.hats.boonie.visible && wm.userData.dress.eyes.aviators.visible, 'the profile\'s boonie and aviators on him');
    T.getGearOwned().helmet = true; T.applyGearVisibility();
    ok(!shown(meshes(wm.userData.dress.hats.boonie)[0]), 'the helmet hides the hat');
    ok(shown(meshes(wm.userData.dress.eyes.aviators)[0]), 'the eyewear stays on with the helmet');
    Object.assign(ws.items, keep); T.dressMarine(wm);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
