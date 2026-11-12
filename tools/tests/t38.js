(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const inside = (root, o) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const [k, g] of Object.entries(T.offhandMeshes)) {
    const refs = ['slide', 'mag', 'flash', 'laser', 'cylinder', 'hammer'].filter(r => g.userData[r]);
    ok(refs.every(r => inside(g, g.userData[r])), 'off-hand ' + k + ' animates its own parts (' + refs.join(', ') + ')');
  }
  const guns = Object.entries(T.weaponMeshes);
  const cold = new Map(guns.map(([key, gun]) => {
    let count = 0;
    gun.traverse(node => { if (node.isMesh) count++; });
    return [key, count];
  }));
  const attached = [...cold.values()].reduce((sum, n) => sum + n, 0);
  ok(guns.length === 12, 'all twelve equipped models represented (' + guns.length + ')');
  // J149 (Jerry, D-177; CLAUDE DIRECTOR's OK 20:09Z, CB-321 --review): every real control is its own named moving part, so
  // each one J149 added costs a mesh and, on the gun in hand, a draw: that is the requirement, not waste. The budgets are
  // 300 cold meshes and 260 equipped draws plus one per control listed here, and every listed control must exist.
  const J149_CONTROLS = { minigun: ['drumLatch', 'powerSwitch', 'safety'], aa12: ['magRelease', 'drumLatchLeft', 'drumLatchRight'],
    pistol: ['extractor', 'takedown'], revolver: ['cylinderRelease', 'ejector'], launcher: ['drumLatch', 'safety', 'stockRelease'],
    flamer: ['igniter', 'safety', 'valve'], chainsaw: ['chainBrake', 'stopSwitch', 'throttleLock'] };
  let j149 = 0;
  for (const [key, names] of Object.entries(J149_CONTROLS)) {
    const controls = (T.weaponMeshes[key] && T.weaponMeshes[key].userData.controls) || {}, missing = names.filter((n) => !controls[n]);
    ok(!missing.length, key + ': its J149 controls are named parts (' + (missing.length ? 'missing ' + missing.join(', ') : names.join(', ')) + ')');
    j149 += names.length;
  }
  ok(attached <= 300 + j149, 'cold attached mesh count ' + attached + ' / ' + (300 + j149) + ' (300 + ' + j149 + ' J149 controls; including hidden parts)');
  // The software runner needs the simulation and the isolated model draws. Leave the full-scene frame timing to the GPU run.
  const host = T.inspectHost(), worldMask = host.camera.layers.mask;
  try {
    host.camera.layers.disableAll();
    await startMatch(T, 'Tester');
    if (T.grantAllWeapons) T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    // Count real renderer submissions for the current equipped state, including
    // transparent passes. The independent High GPU frame samples use the full scene.
    const G = T.THREE, renderer = host.renderer;
    const scene = new G.Scene(), camera = new G.PerspectiveCamera(36, 1, .01, 100);
    scene.add(new G.HemisphereLight(0xdbe9ff, 0xb7a483, 1.1));
    const light = new G.DirectionalLight(0xfff0d8, 2);
    light.position.set(2, 3, 4); scene.add(light);
    camera.layers.enableAll();
    const counter = renderer.info, autoReset = counter.autoReset;
    const draw = () => {
      counter.reset();
      renderer.render(scene, camera);
      return {calls:counter.render.drawCalls ?? counter.render.calls, triangles:counter.render.triangles};
    };
    let sum = 0;
    T.setViewFirstDbg(false);
    try {
      counter.autoReset = false;
      camera.position.set(2, 1, 2); camera.lookAt(0, 0, 0);
      const empty = draw();
      for (const key of cold.keys()) {
        const gun = T.weaponMeshes[key];
        T.setWeapon(T.WEAPON_ORDER.indexOf(key));
        // Finish the actual draw-from-holster motion even on a slow software-rendered frame.
        for (let frame = 0; frame < 80; frame++) {
          T.stepFrame(.05);
          if (gun.visible && !T.drawDbg().active && T.getSwapDbg().swapT <= 0) break;
        }
        if (T.getCurrentWeapon() !== key || !gun.visible || T.drawDbg().active || T.getSwapDbg().swapT > 0) {
          throw Error('Could not equip ' + key + ' (selected ' + T.getCurrentWeapon() + ', visible ' + gun.visible + ')');
        }
        const copy = T.cloneLean(gun);
        copy.visible = true; copy.position.set(0, 0, 0); copy.quaternion.identity();
        copy.traverse(node => { node.frustumCulled = false; });
        scene.add(copy); copy.updateMatrixWorld(true);
        const bounds = new G.Box3().setFromObject(copy);
        const centre = bounds.getCenter(new G.Vector3()), span = bounds.getSize(new G.Vector3()).length();
        camera.position.copy(centre).addScaledVector(new G.Vector3(1, .4, .6).normalize(), span * 2.5);
        camera.lookAt(centre); camera.updateMatrixWorld();
        draw();
        const model = draw(), calls = model.calls - empty.calls;
        scene.remove(copy);
        const seen = model.triangles > empty.triangles && Number.isInteger(calls) && calls > 0;
        ok(seen && calls <= 35, key + ' submitted ' + calls + ' draws / 35');
        out.push('INFO ' + key + ' cold meshes ' + cold.get(key) + ', equipped draws ' + calls);
        sum += calls;
      }
    } finally {
      counter.autoReset = autoReset;
    }
    ok(sum > 0 && sum < 260 + j149, 'equipped draws across twelve individual models ' + sum + ' < ' + (260 + j149) + ' (260 + ' + j149 + ' J149 controls)');
    out.push('INFO twelve cold guns: ' + attached + ' attached meshes; equipped individually: ' + sum + ' actual draws');
    for (const k of ['ak', 'm4', 'pistol', 'shotgun', 'sniper', 'revolver', 'launcher', 'minigun']) {
      for (let i = 0; i < 20; i++) { T.setWeapon(i); if (T.getCurrentWeapon() === k) break; }
      await wait(600);
      const g = T.weaponMeshes[k];
      const part = g.userData.mag || g.userData.pump || g.userData.cylinder;
      const base = part && part.position.clone(), baseR = part && part.rotation.clone();
      T.setAmmoDbg(k, 0); T.startReload && T.startReload();
      let moved = false;
      for (let i = 0; i < 90 && !moved; i++) { await wait(60); if (part && (part.position.distanceTo(base) > 0.005 || Math.abs(part.rotation.x - baseR.x) + Math.abs(part.rotation.z - baseR.z) + Math.abs(part.rotation.y - baseR.y) > 0.02)) moved = true; }
      ok(!part || moved, k + ': reload moves the ' + (g.userData.mag ? 'magazine' : g.userData.pump ? 'pump' : 'cylinder'));
      await wait(2500);
    }
  } finally {
    host.camera.layers.mask = worldMask;
  }
  return out.join('\n');
})()
