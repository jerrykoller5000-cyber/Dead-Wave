// tcb317 - CB-317 (J149's draw gate, t38): a gun's muzzle flash costs no draw while it is unlit.
//  - every gun's flash (and each akimbo twin's) is hidden at rest: its material is not drawn at opacity 0;
//  - a shot lights it (drawn, opacity > 0) and the fade hides it again (opacity 0, not drawn);
//  - the eye's copy follows (first person: the view gun's flash material mirrors the hide).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(20); } return !!f(); };
  try {
    await startMatch(T, 'CB317');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const flashes = [];
    for (const [k, g] of Object.entries(T.weaponMeshes)) if (g.userData.flash) flashes.push([k, g.userData.flash]);
    for (const [k, g] of Object.entries(T.offhandMeshes || {})) if (g.userData.flash) flashes.push([k + ' (akimbo)', g.userData.flash]);
    ok(flashes.length >= 10, 'the guns have their flashes (' + flashes.length + ')');
    const lit = flashes.filter(([, f]) => f.material.visible !== false || f.material.opacity > 0).map(([k]) => k);
    ok(!lit.length, 'every flash hidden at rest, opacity 0 (' + (lit.join(', ') || 'none drawn') + ')');
    // The M4 in hand, third person; every write of its flash's opacity logged with whether it is drawn after it.
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await wait(150); }
    await until(() => T.getSwapDbg().swapT <= 0 && !T.drawDbg().active, 5000);
    T.setViewFirstDbg(false);
    const fm = T.weaponMeshes.m4.userData.flash.material, d = Object.getOwnPropertyDescriptor(fm, 'opacity'), log = [];
    ok(!!(d && d.set), 'the flash material hides itself on its opacity');
    if (d && d.set) Object.defineProperty(fm, 'opacity', { configurable: true, enumerable: true, get: d.get, set(v) { d.set.call(this, v); log.push([v, this.visible]); } });
    T.setAmmoDbg && T.setAmmoDbg('m4', 30);
    const shots0 = T.weaponMeshes.m4.userData.shots | 0;
    T.setMouseFireDbg(true);
    await until(() => (T.weaponMeshes.m4.userData.shots | 0) > shots0, 3000);
    await wait(120);
    T.setMouseFireDbg(false);
    await wait(500);
    if (d) Object.defineProperty(fm, 'opacity', d);
    const shots = (T.weaponMeshes.m4.userData.shots | 0) - shots0;
    ok(shots > 0, 'the M4 fired (' + shots + ' shots)');
    ok(log.some(([v, vis]) => v > 0 && vis === true), 'a shot lights it: drawn while its opacity is up (' + log.filter(([v]) => v > 0).length + ' writes)');
    ok(log.every(([v, vis]) => vis === (v > 0)), 'drawn exactly while lit (' + log.filter(([v, vis]) => vis !== (v > 0)).length + ' writes otherwise)');
    ok(fm.opacity === 0 && fm.visible === false, 'the fade hides it again (opacity ' + fm.opacity + ', drawn ' + fm.visible + ')');
    // First person: the view gun mirrors the source's material (its opacity and its visibility).
    T.setViewFirstDbg(true);
    await until(() => T.viewmodelDbg() && T.viewmodelDbg().info && T.viewmodelDbg().info.active, 20000);
    await wait(300);
    let eyeLit = null;
    const vm = T.viewmodelDbg(), root = vm && (vm.root || (vm.info && vm.info.root));
    if (root && root.traverse) root.traverse((o) => { if (o.isMesh && o.material && o.material.transparent && o.material.depthWrite === false && o.geometry && o.geometry.type === 'SphereGeometry' && o.material.visible !== false && o.visible) eyeLit = (eyeLit || 0) + 1; });
    out.push('INFO the eye: ' + (root ? 'unlit flash spheres drawn ' + (eyeLit || 0) : 'no view root exposed (not measured)'));
    T.setViewFirstDbg(false);
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
