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

    // 1. Module Exports & Thresholds
    ok(typeof createBarrelHeat === 'function', 'createBarrelHeat is exported');
    ok(typeof getHeatGlow === 'function', 'getHeatGlow is exported');
    ok(typeof findGunHeatParts === 'function', 'findGunHeatParts is exported');
    ok(typeof applyGlowToNode === 'function', 'applyGlowToNode is exported');
    ok(GLOW_HEAT_THRESHOLD === 0.25, `GLOW_HEAT_THRESHOLD is 0.25 (was ${GLOW_HEAT_THRESHOLD})`);
    ok(SMOKE_HEAT_THRESHOLD === 0.12, `SMOKE_HEAT_THRESHOLD is 0.12 (was ${SMOKE_HEAT_THRESHOLD})`);
    ok(COOLING_BASE > 0 && COOLING_EXP > 0, 'cooling constants are positive');

    // 2. Per-Shot & Steady-Fire Calibration (Jerry: rifle doesn't glow after 1 mag; minigun quickest)
    const bhCal = createBarrelHeat({ THREE: REAL_THREE });
    // Simulate 1 full 30-rd GW-4 magazine at 10 rps (0.10s interval)
    for (let i = 0; i < 30; i++) {
      bhCal.addShot('m4', false);
      bhCal.update(0.10, { currentWeapon: 'm4' });
    }
    const m4Mag1 = bhCal.getHeat('m4');
    ok(m4Mag1 > SMOKE_HEAT_THRESHOLD && m4Mag1 < GLOW_HEAT_THRESHOLD,
      `GW-4 after 1 full 30-rd magazine smokes (>0.12) without glowing (<0.25): heat=${m4Mag1.toFixed(3)}`);

    // Simulate reload (1.55s) + second magazine steady fire -> starts glowing dull red
    bhCal.update(1.55, { currentWeapon: 'm4' });
    let m4GlowRound = null;
    for (let i = 31; i <= 60; i++) {
      bhCal.addShot('m4', false);
      if (m4GlowRound === null && bhCal.getHeat('m4') >= GLOW_HEAT_THRESHOLD) m4GlowRound = i;
      bhCal.update(0.10, { currentWeapon: 'm4' });
    }
    ok(m4GlowRound !== null && m4GlowRound >= 40 && m4GlowRound <= 55,
      `GW-4 starts dull-red glow in 2nd magazine around round 44 (got round ${m4GlowRound})`);

    // Simulate Minigun at 15 rps (1/15s interval): quickest time-to-glow (<2.0s)
    bhCal.reset();
    let miniGlowRound = null, miniGlowTime = 0;
    for (let i = 1; i <= 120; i++) {
      bhCal.addShot('minigun', false);
      if (miniGlowRound === null && bhCal.getHeat('minigun') >= GLOW_HEAT_THRESHOLD) {
        miniGlowRound = i;
        miniGlowTime = (i - 1) / 15;
      }
      bhCal.update(1 / 15, { currentWeapon: 'minigun' });
    }
    ok(miniGlowRound !== null && miniGlowTime < 2.2,
      `Minigun reaches glow quickest (${miniGlowRound} rds / ${miniGlowTime.toFixed(2)}s < 2.2s)`);
    ok(bhCal.getHeat('minigun') > 0.85,
      `Minigun reaches hot glow (>0.85) within 120 rounds (got ${bhCal.getHeat('minigun').toFixed(3)})`);

    // 3. Heat Accumulation, Clamping & Cooling
    const bh = createBarrelHeat({ THREE: REAL_THREE });
    ok(bh.getHeat('m4') === 0, 'initial heat is 0');
    for (let i = 0; i < 150; i++) bh.addShot('m4', false);
    ok(bh.getHeat('m4') === 1.0, `sustained fire clamps heat to 1.0 (was ${bh.getHeat('m4')})`);

    bh.setHeat('pistol', 0.5);
    ok(Math.abs(bh.getHeat('pistol') - 0.5) < 1e-4, 'setHeat sets heat accurately');
    bh.setHeat('pistol', 1.5);
    ok(bh.getHeat('pistol') === 1.0, 'setHeat clamps values > 1.0 to 1.0');
    bh.setHeat('pistol', -0.5);
    ok(bh.getHeat('pistol') === 0.0, 'setHeat clamps values < 0.0 to 0.0');

    bh.setHeat('ak', 1.0);
    bh.update(1.0, { currentWeapon: 'ak' });
    const hCool1 = bh.getHeat('ak');
    ok(hCool1 < 1.0 && hCool1 > 0.90, `1s cooldown reduces heat smoothly (was ${hCool1.toFixed(3)})`);
    bh.update(28.0, { currentWeapon: 'ak' });
    ok(bh.getHeat('ak') === 0.0, `extended cooldown returns heat to 0.0 (was ${bh.getHeat('ak')})`);

    // 4. Blackbody Color Ramp (Dull Red -> Cherry Red -> Cherry-Orange Only When Very Hot) & Daylight Attenuation
    const glowCold = getHeatGlow(0.0, 0);
    ok(glowCold.intensity === 0 && glowCold.colorHex === 0, 'cold barrel (heat 0.0) has 0 glow intensity');

    const glowSmokeOnly = getHeatGlow(0.20, 0);
    ok(glowSmokeOnly.intensity === 0 && glowSmokeOnly.colorHex === 0, '1-mag warm barrel (heat 0.20) has 0 glow intensity');

    const glowDull = getHeatGlow(0.35, 0);
    ok(glowDull.intensity > 0.2 && glowDull.intensity < 0.6, `heat 0.35 gives dull red glow (intensity ${glowDull.intensity.toFixed(2)})`);
    ok(glowDull.r >= 90 && glowDull.r <= 130 && glowDull.g <= 10 && glowDull.b === 0,
      `heat 0.35 color is dull blood red (${glowDull.r}, ${glowDull.g}, ${glowDull.b})`);

    const glowCherry = getHeatGlow(0.68, 0);
    ok(glowCherry.intensity >= 0.85 && glowCherry.intensity < 1.25, `heat 0.68 gives cherry red glow (intensity ${glowCherry.intensity.toFixed(2)})`);
    ok(glowCherry.r > 170 && glowCherry.g < 25, `heat 0.68 color is rich cherry red, not orange (${glowCherry.r}, ${glowCherry.g}, ${glowCherry.b})`);

    const glowHotNight = getHeatGlow(0.92, 0.0);
    const glowHotNoon = getHeatGlow(0.92, 1.0);
    ok(glowHotNight.r >= 225 && glowHotNight.g >= 50, `heat 0.92 reaches hot cherry-orange (${glowHotNight.r}, ${glowHotNight.g}, ${glowHotNight.b})`);
    ok(glowHotNoon.intensity < glowHotNight.intensity * 0.35 && glowHotNoon.intensity > 0.2,
      `daylight (Noon) glow intensity (${glowHotNoon.intensity.toFixed(2)}) is much fainter (<0.35x) than Night (${glowHotNight.intensity.toFixed(2)})`);

    // 5. Suppressor vs Barrel Isolation, Axial Gradient (uv1 + emissiveMap), & Bore/Clamp Exclusion
    const mockGun = new REAL_THREE.Group();
    const mockBarrelMesh = new REAL_THREE.Mesh(
      new REAL_THREE.CylinderGeometry(0.012, 0.012, 0.6, 8),
      new REAL_THREE.MeshStandardMaterial({ color: 0x383b41, roughness: 0.5, metalness: 0.4, emissive: 0x000000 })
    );
    mockBarrelMesh.rotation.x = Math.PI / 2;
    mockBarrelMesh.name = 'heatParts-barrel';

    const mockSuppressor = new REAL_THREE.Group();
    mockSuppressor.name = 'suppressor';
    const supTube = new REAL_THREE.Mesh(
      new REAL_THREE.CylinderGeometry(0.024, 0.024, 0.18, 10),
      new REAL_THREE.MeshStandardMaterial({ color: 0x27292d, roughness: 0.52, metalness: 0.3, emissive: 0x000000 })
    );
    supTube.rotation.x = Math.PI / 2;
    const supBore = new REAL_THREE.Mesh(
      new REAL_THREE.CylinderGeometry(0.006, 0.006, 0.004, 8),
      new REAL_THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.92, metalness: 0.0, emissive: 0x000000 })
    );
    supBore.name = 'bore';
    mockSuppressor.add(supTube, supBore);

    mockGun.add(mockBarrelMesh, mockSuppressor);
    mockGun.userData.heatParts = { barrel: 'heatParts-barrel', suppressor: 'suppressor' };
    mockGun.userData.muzzleLocal = new REAL_THREE.Vector3(0, 0, 0.5);

    const parts = findGunHeatParts(mockGun, 'm4');
    ok(parts.barrel === mockBarrelMesh, 'findGunHeatParts finds barrel node by userData.heatParts');
    ok(parts.suppressor === mockSuppressor, 'findGunHeatParts finds suppressor node by userData.heatParts');

    // Unsuppressed: barrel glows with axial emissiveMap on uv1, suppressor stays zero
    applyGlowToNode(REAL_THREE, parts.barrel, glowHotNight, parts.suppressor, { kind: 'barrel' });
    ok(mockBarrelMesh.material.emissiveIntensity > 1.2, `unsuppressed: barrel glows (emissiveIntensity=${mockBarrelMesh.material.emissiveIntensity.toFixed(2)})`);
    ok(!!mockBarrelMesh.material.emissiveMap && mockBarrelMesh.material.emissiveMap.channel === 1, 'barrel uses axial emissiveMap on channel 1 (uv1)');
    ok(!!mockBarrelMesh.geometry.attributes.uv1, 'barrel geometry receives normalized axial uv1 attribute');
    ok(supTube.material.emissiveIntensity === 0, 'unsuppressed: suppressor tube has 0 emissive intensity');

    // Suppressed: suppressor tube glows, dark rubber bore stays 0, barrel returns to 0
    applyGlowToNode(REAL_THREE, parts.suppressor, glowHotNight, parts.barrel, { kind: 'suppressor' });
    ok(supTube.material.emissiveIntensity > 1.2, `suppressed: suppressor tube glows (emissiveIntensity=${supTube.material.emissiveIntensity.toFixed(2)})`);
    ok(supBore.material.emissiveIntensity === 0, 'suppressed: dark bore insert stays unlit (0 emissive)');
    ok(mockBarrelMesh.material.emissiveIntensity === 0, 'suppressed: barrel behind suppressor stays at 0 emissive');

    // Cool down: all zero
    applyGlowToNode(REAL_THREE, parts.suppressor, glowCold, parts.barrel, { kind: 'suppressor' });
    ok(supTube.material.emissiveIntensity === 0 && mockBarrelMesh.material.emissiveIntensity === 0, 'cooled down: both barrel & suppressor return to 0 emissive');

    // 6. Smoke Wisp Simulation, Training Ground Pool Flag, & Duration Scaling
    const testScene = new REAL_THREE.Scene();
    const testCamera = new REAL_THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const bhSim = createBarrelHeat({ THREE: REAL_THREE, scene: testScene, camera: testCamera, weaponMeshes: { m4: mockGun } });
    ok(bhSim._wisps && bhSim._wisps.length === 48, `smoke wisp pool initialized with 48 pooled tendrils (got ${bhSim._wisps.length})`);
    ok(bhSim._wispGroup && bhSim._wispGroup.userData && bhSim._wispGroup.userData.effectPooled === true,
      'wispGroup marked effectPooled so trainingHideWorld keeps wisps visible in Training Ground');

    bhSim.setHeat('m4', 0.20);
    bhSim.update(0.25, { currentWeapon: 'm4', isSuppressed: false, weaponMesh: mockGun, camera: testCamera, daylight: 1.0 });
    const warmWisp = bhSim._wisps.find((w) => w.active);

    bhSim.reset();
    bhSim.setHeat('m4', 0.90);
    bhSim.update(0.25, { currentWeapon: 'm4', isSuppressed: false, weaponMesh: mockGun, camera: testCamera, daylight: 1.0 });
    const hotWisp = bhSim._wisps.find((w) => w.active);
    ok(!!warmWisp && !!hotWisp && hotWisp.maxOpacity > warmWisp.maxOpacity * 1.6 && hotWisp.life > warmWisp.life,
      `smoke wisp grows stronger & longer-lived with firing duration (warm=${warmWisp?.maxOpacity.toFixed(2)}, hot=${hotWisp?.maxOpacity.toFixed(2)})`);

    bhSim.reset();
    ok(mockBarrelMesh.material.emissiveIntensity === 0, 'reset() clears residual glow on weaponMeshes so slung weapons stay cold');

    // 7. Live Game Integration (window.TT)
    const T = window.TT;
    if (T) {
      ok(!!T.barrelHeat, 'window.TT.barrelHeat is exposed on live game');
      ok(typeof T.getBarrelHeat === 'function', 'window.TT.getBarrelHeat is exposed');
      ok(typeof T.setBarrelHeatDbg === 'function', 'window.TT.setBarrelHeatDbg is exposed');

      T.setBarrelHeatDbg('m4', 0.72);
      const liveH = T.getBarrelHeat('m4');
      ok(Math.abs(liveH - 0.72) < 1e-3, `live game barrel heat debug setter works (got ${liveH})`);

      if (T.weaponMeshes) {
        if (T.weaponMeshes.m4) {
          const m4Parts = findGunHeatParts(T.weaponMeshes.m4, 'm4');
          ok(!!m4Parts.barrel && m4Parts.barrel !== T.weaponMeshes.m4.userData.laser, 'live M4 resolves real barrel node (not laser)');
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
      T.barrelHeat.reset();
    } else {
      ok(true, 'window.TT checks skipped in standalone Node harness');
    }

  } catch (err) {
    ok(false, 'Unhandled exception: ' + (err.stack || err.message || err));
  }

  const passed = out.filter((l) => l.startsWith('PASS')).length;
  const failed = out.filter((l) => l.startsWith('FAIL')).length;
  console.log(`tag290: ${passed} pass, ${failed} fail\n` + out.join('\n'));
  return out.join('\n');
})();
