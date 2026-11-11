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
      getHeatGradientTexture,
      findGunHeatParts,
      applyGlowToNode,
      createBarrelHeat
    } = await import(new URL('../../game/barrel-heat.js', location.href).href);

    // 1. Module Exports & Constants
    ok(typeof createBarrelHeat === 'function', 'createBarrelHeat is exported');
    ok(typeof getHeatGlow === 'function', 'getHeatGlow is exported');
    ok(typeof getHeatGradientTexture === 'function', 'getHeatGradientTexture is exported');
    ok(typeof findGunHeatParts === 'function', 'findGunHeatParts is exported');
    ok(typeof applyGlowToNode === 'function', 'applyGlowToNode is exported');
    ok(GLOW_HEAT_THRESHOLD === 0.18, `GLOW_HEAT_THRESHOLD is 0.18 (was ${GLOW_HEAT_THRESHOLD})`);
    ok(SMOKE_HEAT_THRESHOLD === 0.10, `SMOKE_HEAT_THRESHOLD is 0.10 (was ${SMOKE_HEAT_THRESHOLD})`);

    // 2. Heat Per Shot Tuning (Jerry J132: rifle does not glow after 1 mag; minigun quickest)
    ok(HEAT_PER_SHOT.minigun > 0 && HEAT_PER_SHOT.minigun < HEAT_PER_SHOT.m4, 'minigun per-shot heat is calibrated for rapid fire (~0.0033)');
    ok(HEAT_PER_SHOT.m240 >= HEAT_PER_SHOT.m4, 'm240 per-shot heat is calibrated for heavy machine gun (~0.0040)');
    ok(HEAT_PER_SHOT.flamer > 0, 'flamer per-tick heat is positive (~0.040)');
    ok(HEAT_PER_SHOT.shotgun > HEAT_PER_SHOT.pistol, 'shotgun per-shot heat reflects heavy propellant charge (~0.014)');

    // 3. Rounds to Glow Verification (Director point 4)
    const bhCalib = createBarrelHeat({ THREE: REAL_THREE });
    for (let i = 0; i < 30; i++) bhCalib.addShot('m4', false);
    ok(bhCalib.getHeat('m4') < GLOW_HEAT_THRESHOLD, `M4 does not glow after 1 full magazine (30 rounds: heat ${bhCalib.getHeat('m4').toFixed(3)} < 0.18)`);
    for (let i = 0; i < 20; i++) bhCalib.addShot('m4', false);
    ok(bhCalib.getHeat('m4') >= GLOW_HEAT_THRESHOLD, `M4 starts glowing after steady fire (50 rounds: heat ${bhCalib.getHeat('m4').toFixed(3)})`);

    const bhMini = createBarrelHeat({ THREE: REAL_THREE });
    for (let i = 0; i < 55; i++) bhMini.addShot('minigun', false);
    ok(bhMini.getHeat('minigun') >= GLOW_HEAT_THRESHOLD, `Minigun reaches glow after ~55 rounds (~1.1 s continuous fire: ${bhMini.getHeat('minigun').toFixed(3)})`);

    // 4. Heat Accumulation and Clamping
    const bh = createBarrelHeat({ THREE: REAL_THREE });
    ok(bh.getHeat('m4') === 0, 'initial heat is 0');
    bh.addShot('m4', false);
    const h1 = bh.getHeat('m4');
    ok(h1 > 0.0035 && h1 < 0.0045, `addShot('m4') increments heat to ~0.0038 (was ${h1.toFixed(4)})`);

    for (let i = 0; i < 350; i++) bh.addShot('m4', false);
    ok(bh.getHeat('m4') === 1.0, `sustained fire clamps heat to 1.0 (was ${bh.getHeat('m4')})`);

    bh.setHeat('pistol', 0.5);
    ok(Math.abs(bh.getHeat('pistol') - 0.5) < 1e-4, 'setHeat sets heat accurately');
    bh.setHeat('pistol', 1.5);
    ok(bh.getHeat('pistol') === 1.0, 'setHeat clamps values > 1.0 to 1.0');
    bh.setHeat('pistol', -0.5);
    ok(bh.getHeat('pistol') === 0.0, 'setHeat clamps values < 0.0 to 0.0');

    // 5. Cooling Over Time
    bh.setHeat('ak', 1.0);
    bh.update(1.0, { currentWeapon: 'ak' });
    const hCool1 = bh.getHeat('ak');
    ok(hCool1 < 1.0 && hCool1 > 0.85, `1s cooldown reduces heat smoothly (was ${hCool1.toFixed(3)})`);

    bh.update(25.0, { currentWeapon: 'ak' });
    ok(bh.getHeat('ak') === 0.0, `extended cooldown returns heat to 0.0 (was ${bh.getHeat('ak')})`);

    // 6. Glow Progression (Dull Red -> Cherry Red -> Incandescent Orange Only When Hot)
    const glowCold = getHeatGlow(0.0);
    ok(glowCold.intensity === 0 && glowCold.colorHex === 0, 'cold barrel (heat 0.0) has 0 glow intensity');

    const glowWarm = getHeatGlow(0.12);
    ok(glowWarm.intensity === 0 && glowWarm.colorHex === 0, 'warm barrel below 0.18 has 0 glow intensity');

    const glowDull = getHeatGlow(0.35);
    ok(glowDull.intensity > 0.4 && glowDull.intensity < 1.0, `heat 0.35 gives dull red glow (intensity ${glowDull.intensity.toFixed(2)})`);
    ok(glowDull.r > 80 && glowDull.g < 20 && glowDull.b === 0, `heat 0.35 color is dull deep red (${glowDull.r}, ${glowDull.g}, ${glowDull.b})`);

    const glowCherry = getHeatGlow(0.65);
    ok(glowCherry.intensity >= 0.95 && glowCherry.intensity < 2.0, `heat 0.65 gives cherry red glow (intensity ${glowCherry.intensity.toFixed(2)})`);
    ok(glowCherry.r > 150 && glowCherry.g < 40, `heat 0.65 color is cherry red (${glowCherry.r}, ${glowCherry.g}, ${glowCherry.b})`);

    const glowHot = getHeatGlow(0.95, 0.0); // Night (full intensity)
    ok(glowHot.intensity >= 1.8, `heat 0.95 gives intense bright glow (intensity ${glowHot.intensity.toFixed(2)})`);
    ok(glowHot.r >= 235 && glowHot.g >= 55, `heat 0.95 color is glowing red-orange (${glowHot.r}, ${glowHot.g}, ${glowHot.b})`);

    // 7. Daylight Attenuation (Director point 1)
    const glowNoon = getHeatGlow(0.95, 1.0); // Noon
    ok(glowNoon.intensity < glowHot.intensity * 0.35, `daylight attenuation reduces noon glow to ~28% (night ${glowHot.intensity.toFixed(2)} -> noon ${glowNoon.intensity.toFixed(2)})`);

    // 8. Gradient Falloff & Texture (Director point 1)
    const gradTex = getHeatGradientTexture(REAL_THREE);
    ok(!!gradTex && gradTex.isDataTexture, 'getHeatGradientTexture produces valid DataTexture for length falloff');

    // 9. Suppressor vs Barrel Isolation & Glow
    const mockGun = new REAL_THREE.Group();
    const mockBarrelMesh = new REAL_THREE.Mesh(new REAL_THREE.BoxGeometry(0.1, 0.1, 0.5), new REAL_THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 }));
    mockBarrelMesh.name = 'heatParts-barrel';
    const mockSuppressorMesh = new REAL_THREE.Mesh(new REAL_THREE.CylinderGeometry(0.03, 0.03, 0.2), new REAL_THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x000000 }));
    mockSuppressorMesh.name = 'suppressor';
    const mockLaserBeam = new REAL_THREE.Mesh(new REAL_THREE.ConeGeometry(0.01, 1), new REAL_THREE.MeshBasicMaterial({ color: 0xff0000 }));
    mockLaserBeam.name = 'laser';
    mockLaserBeam.userData = { laser: true };

    mockGun.add(mockBarrelMesh);
    mockGun.add(mockSuppressorMesh);
    mockGun.add(mockLaserBeam);
    mockGun.userData.heatParts = { barrel: 'heatParts-barrel', suppressor: 'suppressor' };
    mockGun.userData.muzzleLocal = new REAL_THREE.Vector3(0, 0, 0.5);

    const parts = findGunHeatParts(mockGun, 'm4');
    ok(parts.barrel === mockBarrelMesh, 'findGunHeatParts finds barrel node by userData.heatParts');
    ok(parts.suppressor === mockSuppressorMesh, 'findGunHeatParts finds suppressor node by userData.heatParts');

    // Unsuppressed: barrel glows, suppressor & laser are zero
    applyGlowToNode(REAL_THREE, parts.barrel, glowHot, parts.suppressor);
    ok(mockBarrelMesh.material.emissiveIntensity > 1.5, `unsuppressed: barrel glows (emissiveIntensity = ${mockBarrelMesh.material.emissiveIntensity.toFixed(2)})`);
    ok(mockSuppressorMesh.material.emissiveIntensity === 0, 'unsuppressed: suppressor has 0 emissive intensity');
    ok(!mockLaserBeam.material.emissive || mockLaserBeam.material.emissiveIntensity === 0, 'laser beam strictly ignored and never glows');

    // Suppressed: suppressor glows, barrel is zero
    applyGlowToNode(REAL_THREE, parts.suppressor, glowHot, parts.barrel);
    ok(mockSuppressorMesh.material.emissiveIntensity > 1.5, `suppressed: suppressor glows (emissiveIntensity = ${mockSuppressorMesh.material.emissiveIntensity.toFixed(2)})`);
    ok(mockBarrelMesh.material.emissiveIntensity === 0, 'suppressed: barrel has 0 emissive intensity');

    // Cool down: both zero
    applyGlowToNode(REAL_THREE, parts.suppressor, glowCold, parts.barrel);
    ok(mockSuppressorMesh.material.emissiveIntensity === 0 && mockBarrelMesh.material.emissiveIntensity === 0, 'cooled down: both barrel & suppressor return to 0 emissive');

    // 10. Smoke Wisp Simulation & Pooling (Director point 2)
    const testScene = new REAL_THREE.Scene();
    const testCamera = new REAL_THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const bhSim = createBarrelHeat({ THREE: REAL_THREE, scene: testScene, camera: testCamera, weaponMeshes: { m4: mockGun } });
    ok(bhSim._wisps && bhSim._wisps.length === 48, `smoke wisp pool initialized with 48 pooled billboards (got ${bhSim._wisps.length})`);
    ok(bhSim._wispGroup && bhSim._wispGroup.userData && bhSim._wispGroup.userData.effectPooled === true, 'wispGroup marked effectPooled so trainingHideWorld keeps wisps visible in Training Ground');

    bhSim.setHeat('m4', 0.85);
    bhSim.update(0.2, {
      currentWeapon: 'm4',
      isSuppressed: false,
      weaponMesh: mockGun,
      camera: testCamera
    });
    const activeWisps = bhSim._wisps.filter(w => w.active);
    ok(activeWisps.length > 0, `hot barrel spawns active drifting smoke wisps (active count = ${activeWisps.length})`);

    bhSim.reset();
    ok(mockBarrelMesh.material.emissiveIntensity === 0, 'reset() clears residual glow on weaponMeshes so slung weapons stay cold');

    // 11. Live Game Integration (window.TT)
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