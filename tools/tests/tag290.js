// tools/tests/tag290.js - AG-290 (Jerry, 10 Nov; J131, J132): barrel heat, smoke wisp & red glow.
(async () => {
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));

  try {
    const REAL_THREE = await import(new URL('../../vendor/three/three.core.js', location.href).href);
    const {
      COOLING_BASE,
      COOLING_EXP,
      GLOW_HEAT_THRESHOLD,
      HEAT_PER_SHOT,
      SMOKE_HEAT_THRESHOLD,
      getHeatGlow,
      findGunHeatParts,
      applyGlowToNode,
      createBarrelHeat
    } = await import(new URL('../../game/barrel-heat.js', location.href).href);

    // 1. Module Exports & Constants
    ok(typeof createBarrelHeat === 'function', 'createBarrelHeat is exported');
    ok(typeof getHeatGlow === 'function', 'getHeatGlow is exported');
    ok(typeof findGunHeatParts === 'function', 'findGunHeatParts is exported');
    ok(typeof applyGlowToNode === 'function', 'applyGlowToNode is exported');
    ok(GLOW_HEAT_THRESHOLD === 0.18, `GLOW_HEAT_THRESHOLD is 0.18 (was ${GLOW_HEAT_THRESHOLD})`);
    ok(SMOKE_HEAT_THRESHOLD === 0.15, `SMOKE_HEAT_THRESHOLD is 0.15 (was ${SMOKE_HEAT_THRESHOLD})`);

    // 2. Heat Per Shot Tuning
    ok(HEAT_PER_SHOT.minigun > 0 && HEAT_PER_SHOT.minigun < HEAT_PER_SHOT.m4, 'minigun per-shot heat is calibrated for rapid fire (~0.016)');
    ok(HEAT_PER_SHOT.m240 >= HEAT_PER_SHOT.m4, 'm240 per-shot heat is calibrated for heavy machine gun (~0.038)');
    ok(HEAT_PER_SHOT.flamer > 0, 'flamer per-tick heat is positive (~0.030)');
    ok(HEAT_PER_SHOT.shotgun > HEAT_PER_SHOT.pistol, 'shotgun per-shot heat reflects heavy propellant charge (~0.085)');

    // 3. Heat Accumulation and Clamping
    const bh = createBarrelHeat({ THREE: REAL_THREE });
    ok(bh.getHeat('m4') === 0, 'initial heat is 0');
    bh.addShot('m4', false);
    const h1 = bh.getHeat('m4');
    ok(h1 > 0.035 && h1 < 0.045, `addShot('m4') increments heat to ~0.038 (was ${h1.toFixed(4)})`);

    for (let i = 0; i < 40; i++) bh.addShot('m4', false);
    ok(bh.getHeat('m4') === 1.0, `sustained fire clamps heat to 1.0 (was ${bh.getHeat('m4')})`);

    bh.setHeat('pistol', 0.5);
    ok(Math.abs(bh.getHeat('pistol') - 0.5) < 1e-4, 'setHeat sets heat accurately');
    bh.setHeat('pistol', 1.5);
    ok(bh.getHeat('pistol') === 1.0, 'setHeat clamps values > 1.0 to 1.0');
    bh.setHeat('pistol', -0.5);
    ok(bh.getHeat('pistol') === 0.0, 'setHeat clamps values < 0.0 to 0.0');

    // 4. Cooling Over Time
    bh.setHeat('ak', 1.0);
    bh.update(1.0, { currentWeapon: 'ak' });
    const hCool1 = bh.getHeat('ak');
    ok(hCool1 < 1.0 && hCool1 > 0.85, `1s cooldown reduces heat smoothly (was ${hCool1.toFixed(3)})`);

    bh.update(15.0, { currentWeapon: 'ak' });
    ok(bh.getHeat('ak') === 0.0, `extended cooldown returns heat to 0.0 (was ${bh.getHeat('ak')})`);

    // 5. Glow Progression (Dull Red -> Cherry Red -> Incandescent Orange)
    const glowCold = getHeatGlow(0.0);
    ok(glowCold.intensity === 0 && glowCold.colorHex === 0, 'cold barrel (heat 0.0) has 0 glow intensity');

    const glowWarm = getHeatGlow(0.12);
    ok(glowWarm.intensity === 0 && glowWarm.colorHex === 0, 'warm barrel below 0.18 has 0 glow intensity');

    const glowDull = getHeatGlow(0.35);
    ok(glowDull.intensity > 0.4 && glowDull.intensity < 1.0, `heat 0.35 gives dull red glow (intensity ${glowDull.intensity.toFixed(2)})`);
    ok(glowDull.r > 80 && glowDull.g < 20 && glowDull.b === 0, `heat 0.35 color is dull deep red (${glowDull.r}, ${glowDull.g}, ${glowDull.b})`);

    const glowCherry = getHeatGlow(0.65);
    ok(glowCherry.intensity >= 1.0 && glowCherry.intensity < 2.2, `heat 0.65 gives cherry red glow (intensity ${glowCherry.intensity.toFixed(2)})`);
    ok(glowCherry.r > 180 && glowCherry.g < 45, `heat 0.65 color is cherry red (${glowCherry.r}, ${glowCherry.g}, ${glowCherry.b})`);

    const glowHot = getHeatGlow(0.95);
    ok(glowHot.intensity >= 2.5, `heat 0.95 gives intense bright glow (intensity ${glowHot.intensity.toFixed(2)})`);
    ok(glowHot.r >= 240 && glowHot.g >= 80, `heat 0.95 color is glowing red-orange (${glowHot.r}, ${glowHot.g}, ${glowHot.b})`);

    // 6. Suppressor vs Barrel Isolation & Glow
    const mockGun = new REAL_THREE.Group();
    const mockBarrelMesh = new REAL_THREE.Mesh(new REAL_THREE.BoxGeometry(0.1, 0.1, 0.5), new REAL_THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 }));
    mockBarrelMesh.name = 'heatParts-barrel';
    const mockSuppressorMesh = new REAL_THREE.Mesh(new REAL_THREE.CylinderGeometry(0.03, 0.03, 0.2), new REAL_THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x000000 }));
    mockSuppressorMesh.name = 'suppressor';
    mockGun.add(mockBarrelMesh);
    mockGun.add(mockSuppressorMesh);
    mockGun.userData.heatParts = { barrel: 'heatParts-barrel', suppressor: 'suppressor' };
    mockGun.userData.muzzleLocal = new REAL_THREE.Vector3(0, 0, 0.5);

    const parts = findGunHeatParts(mockGun, 'm4');
    ok(parts.barrel === mockBarrelMesh, 'findGunHeatParts finds barrel node by userData.heatParts');
    ok(parts.suppressor === mockSuppressorMesh, 'findGunHeatParts finds suppressor node by userData.heatParts');

    // Unsuppressed: barrel glows, suppressor is zero
    applyGlowToNode(REAL_THREE, parts.barrel, glowHot, parts.suppressor);
    ok(mockBarrelMesh.material.emissiveIntensity > 2.0, `unsuppressed: barrel glows (emissiveIntensity = ${mockBarrelMesh.material.emissiveIntensity.toFixed(2)})`);
    ok(mockSuppressorMesh.material.emissiveIntensity === 0, 'unsuppressed: suppressor has 0 emissive intensity');

    // Suppressed: suppressor glows, barrel is zero
    applyGlowToNode(REAL_THREE, parts.suppressor, glowHot, parts.barrel);
    ok(mockSuppressorMesh.material.emissiveIntensity > 2.0, `suppressed: suppressor glows (emissiveIntensity = ${mockSuppressorMesh.material.emissiveIntensity.toFixed(2)})`);
    ok(mockBarrelMesh.material.emissiveIntensity === 0, 'suppressed: barrel has 0 emissive intensity');

    // Cool down: both zero
    applyGlowToNode(REAL_THREE, parts.suppressor, glowCold, parts.barrel);
    ok(mockSuppressorMesh.material.emissiveIntensity === 0 && mockBarrelMesh.material.emissiveIntensity === 0, 'cooled down: both barrel & suppressor return to 0 emissive');

    // 7. Smoke Wisp Simulation & Pooling
    const testScene = new REAL_THREE.Scene();
    const testCamera = new REAL_THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const bhSim = createBarrelHeat({ THREE: REAL_THREE, scene: testScene, camera: testCamera });
    ok(bhSim._wisps && bhSim._wisps.length === 36, `smoke wisp pool initialized with 36 pooled billboards (got ${bhSim._wisps.length})`);

    bhSim.setHeat('m4', 0.85);
    bhSim.update(0.2, {
      currentWeapon: 'm4',
      isSuppressed: false,
      weaponMesh: mockGun,
      camera: testCamera
    });
    const activeWisps = bhSim._wisps.filter(w => w.active);
    ok(activeWisps.length > 0, `hot barrel spawns active drifting smoke wisps (active count = ${activeWisps.length})`);

    // 8. Live Game Integration (window.TT)
    const T = window.TT;
    if (T) {
      ok(!!T.barrelHeat, 'window.TT.barrelHeat is exposed on live game');
      ok(typeof T.getBarrelHeat === 'function', 'window.TT.getBarrelHeat is exposed');
      ok(typeof T.setBarrelHeatDbg === 'function', 'window.TT.setBarrelHeatDbg is exposed');

      T.setBarrelHeatDbg('m4', 0.72);
      const liveH = T.getBarrelHeat('m4');
      ok(Math.abs(liveH - 0.72) < 1e-3, `live game barrel heat debug setter works (got ${liveH})`);

      // Verify weaponMeshes resolution
      if (T.weaponMeshes) {
        if (T.weaponMeshes.m4) {
          const m4Parts = findGunHeatParts(T.weaponMeshes.m4, 'm4');
          ok(!!m4Parts.barrel, 'live M4 resolves barrel node');
        }
        if (T.weaponMeshes.pistol) {
          const pistolParts = findGunHeatParts(T.weaponMeshes.pistol, 'pistol');
          ok(!!pistolParts.barrel, 'live Pistol resolves barrel node');
        }
        if (T.weaponMeshes.minigun) {
          const miniParts = findGunHeatParts(T.weaponMeshes.minigun, 'minigun');
          ok(!!miniParts.barrel, 'live Minigun resolves barrelAssembly');
        }
      }
    } else {
      ok(true, 'window.TT checks skipped in standalone Node harness');
    }

  } catch (err) {
    ok(false, 'Unhandled exception: ' + (err.stack || err.message || err));
  }

  const passed = out.filter(l => l.startsWith('PASS')).length;
  const failed = out.filter(l => l.startsWith('FAIL')).length;
  console.log(`tag290: ${passed} pass, ${failed} fail\n` + out.join('\n'));
  return out.join('\n');
})();
