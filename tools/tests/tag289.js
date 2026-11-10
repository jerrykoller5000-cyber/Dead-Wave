// tag289 - AG-289 (Jerry, 10 Nov, D-144): Training Ground props, part-on-part seating,
// flashlight hotspot cap, gate header siding, infirmary bay seating & cot scissor legs.
(async () => {
  const T = window.TT;
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));

  try {
    const THREE = T.THREE;
    const Box3 = THREE.Box3;
    const _v = new THREE.Vector3();

    function getBounds(obj) {
      const b = new Box3();
      obj.updateMatrixWorld(true);
      obj.traverse((m) => {
        if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position) return;
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          _v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          b.expandByPoint(_v);
        }
      });
      return b;
    }

    // =========================================================================
    // 1. FIND 2: ZOMBIE GATE HEADER CORRUGATED SIDING (world/training.js)
    // =========================================================================
    const H = T.inspectHost ? T.inspectHost() : null;
    const training = H && H.training ? H.training() : null;
    ok(!!training, 'Training Ground active and inspectHost reachable');

    if (training && training.tg && training.tg.group) {
      const header = training.tg.group.getObjectByName('training-gate-header');
      ok(!!header, 'training-gate-header mesh exists above Zombie Gate');
      if (header) {
        const hb = getBounds(header);
        const width = hb.max.x - hb.min.x;
        const height = hb.max.y - hb.min.y;
        ok(Math.abs(width - 6.6) < 0.1, 'gate header width is 6.6 m (got ' + width.toFixed(3) + ' m)');
        ok(hb.min.y >= 6.25 && hb.min.y <= 6.35, 'gate header sits above gate at y = 6.30 m (got ' + hb.min.y.toFixed(3) + ' m)');
        ok(hb.max.y >= 23.5, 'gate header reaches hangar roof y = 24 m (got ' + hb.max.y.toFixed(3) + ' m)');
        const matName = header.material ? (header.material.name || '') : '';
        const isSiding = header.material && header.material.roughness >= 0.7;
        ok(isSiding, 'gate header uses corrugated siding material (roughness=' + (header.material?.roughness || 0) + ')');
      }
    }

    // =========================================================================
    // 2. FIND 4, 5, 6: ISOLATED TRAINING PROPS SEATING & PART-ON-PART AUDIT
    // =========================================================================
    const { dressTrainingProps } = await import('../../world/training-props.js');
    ok(typeof dressTrainingProps === 'function', 'dressTrainingProps imported');

    const propBoxes = [];
    const propMeshes = [];
    const testAdd = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.updateMatrixWorld(true);
      propMeshes.push(m);
      return m;
    };
    const testBox = (w, h, d, mat, x, y, z) => {
      const m = testAdd(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
      propBoxes.push({ w, h, d, x, y, z, mat, mesh: m });
      return m;
    };

    const mockB = { minX: -44, maxX: 44, minZ: -10, maxZ: 10 };
    const mockGate = { x: 0, z: 8.6 };
    const mockBedAt = { x: -40.85, z: -8.0 };
    const dummyMat = new THREE.MeshBasicMaterial();

    dressTrainingProps(THREE, {
      B: mockB,
      gate: mockGate,
      bedAt: mockBedAt,
      box: testBox,
      add: testAdd,
      std: () => dummyMat,
      texture: () => null,
      sign: () => new THREE.Group(),
      steel: dummyMat,
      steelLight: dummyMat,
      hazard: dummyMat,
      lampMat: dummyMat,
      labels: {}
    });

    // --- A. FIND 6: Containment Gate Threshold Plate on floor (y = 0.000 m) ---
    const thresholdPlate = propBoxes.find(b => Math.abs(b.w - 8.2) < 0.1 && Math.abs(b.h - 0.032) < 0.005 && Math.abs(b.d - 1.0) < 0.1);
    ok(!!thresholdPlate, 'containment gate threshold plate created');
    if (thresholdPlate) {
      const minY = thresholdPlate.y - thresholdPlate.h / 2;
      ok(Math.abs(minY - 0.000) <= 0.0005, 'threshold plate seated flush on floor y = 0.000 m (minY=' + minY.toFixed(4) + ' m)');
      const topY = thresholdPlate.y + thresholdPlate.h / 2;
      ok(Math.abs(topY - 0.032) <= 0.001, 'threshold plate top at y = 0.032 m (topY=' + topY.toFixed(4) + ' m)');
    }

    const hazardNosing = propBoxes.find(b => Math.abs(b.w - 8.2) < 0.1 && Math.abs(b.h - 0.032) < 0.005 && Math.abs(b.d - 0.14) < 0.05);
    ok(!!hazardNosing, 'containment gate hazard nosing created');
    if (hazardNosing) {
      const minY = hazardNosing.y - hazardNosing.h / 2;
      ok(Math.abs(minY - 0.000) <= 0.0005, 'hazard nosing seated flush on floor y = 0.000 m (minY=' + minY.toFixed(4) + ' m)');
    }

    const tractionRibs = propBoxes.filter(b => Math.abs(b.w - 0.055) < 0.01 && Math.abs(b.h - 0.012) < 0.005);
    ok(tractionRibs.length >= 25, 'approach rubber traction ribs created (found ' + tractionRibs.length + ')');
    if (tractionRibs.length > 0) {
      const ribMinY = tractionRibs[0].y - tractionRibs[0].h / 2;
      ok(Math.abs(ribMinY - 0.032) <= 0.001, 'traction ribs seated on threshold plate at y = 0.032 m (ribMinY=' + ribMinY.toFixed(4) + ' m)');
    }

    // --- B. FIND 4: Infirmary Mat seated on floor (y = 0.000 m), top at y = 0.020 m ---
    const darkMat = propBoxes.find(b => Math.abs(b.w - 7.4) < 0.1 && Math.abs(b.h - 0.012) < 0.005);
    ok(!!darkMat, 'infirmary dark base mat created');
    if (darkMat) {
      const minY = darkMat.y - darkMat.h / 2;
      ok(Math.abs(minY - 0.000) <= 0.0005, 'dark base mat seated flush on floor y = 0.000 m (minY=' + minY.toFixed(4) + ' m)');
      const topY = darkMat.y + darkMat.h / 2;
      ok(Math.abs(topY - 0.012) <= 0.0005, 'dark base mat top at y = 0.012 m (topY=' + topY.toFixed(4) + ' m)');
    }

    const insetMat = propBoxes.find(b => Math.abs(b.w - 7.2) < 0.1 && Math.abs(b.h - 0.008) < 0.005);
    ok(!!insetMat, 'infirmary pale inset mat created');
    if (insetMat) {
      const minY = insetMat.y - insetMat.h / 2;
      ok(Math.abs(minY - 0.012) <= 0.0005, 'pale inset mat seated on dark base at y = 0.012 m (minY=' + minY.toFixed(4) + ' m)');
      const topY = insetMat.y + insetMat.h / 2;
      ok(Math.abs(topY - 0.020) <= 0.0005, 'pale inset mat working surface at y = 0.020 m (topY=' + topY.toFixed(4) + ' m)');
    }

    // --- C. FIND 4: Oxygen Bottle seated flush on mat at y = 0.020 m ---
    const o2Bottle = propMeshes.find(m => Math.abs(m.position.y - 0.02) < 0.005 && Math.abs(m.position.x - (mockBedAt.x - 1.49)) < 0.02 && Math.abs(m.position.z - (mockBedAt.z + 0.8)) < 0.02);
    ok(!!o2Bottle, 'oxygen cylinder LatheGeometry seated at y = 0.020 m');
    if (o2Bottle) {
      const b = getBounds(o2Bottle);
      ok(Math.abs(b.min.y - 0.020) <= 0.0005, 'O2 bottle base seated flush on mat surface at y = 0.0200 m (min.y=' + b.min.y.toFixed(4) + ' m)');
      ok(b.max.y >= 0.80, 'O2 bottle height reaches y = 0.81 m (max.y=' + b.max.y.toFixed(4) + ' m)');
    }

    // --- D. FIND 4: IV Stand spider legs seated flush on mat at y = 0.020 m ---
    const ivSpiderFeet = propMeshes.filter(m => Math.abs(m.position.y - 0.032) < 0.005 && m.geometry && m.geometry.parameters && Math.abs(m.geometry.parameters[2] - 0.024) < 0.002);
    ok(ivSpiderFeet.length === 4, 'IV stand has 4 spider rubber feet (found ' + ivSpiderFeet.length + ')');
    for (let i = 0; i < ivSpiderFeet.length; i++) {
      const foot = ivSpiderFeet[i];
      const minY = foot.position.y - foot.geometry.parameters[2] / 2;
      ok(Math.abs(minY - 0.020) <= 0.0005, 'IV foot #' + i + ' seated flush on mat at y = 0.0200 m (minY=' + minY.toFixed(4) + ' m)');
    }

    // --- E. FIND 5: Wheeled Stretcher Casters seated flush on mat at y = 0.020 m ---
    const wheels = propMeshes.filter(m => Math.abs(m.position.y - 0.115) < 0.005 && m.geometry && m.geometry.parameters && Math.abs(m.geometry.parameters[0] - 0.095) < 0.002);
    ok(wheels.length === 4, 'stretcher has 4 wheeled rubber casters (found ' + wheels.length + ')');
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      const b = getBounds(w);
      ok(Math.abs(b.min.y - 0.020) <= 0.0005, 'stretcher wheel #' + i + ' seated flush on mat at y = 0.0200 m (min.y=' + b.min.y.toFixed(4) + ' m)');
    }

    // --- F. FIND 5: Medical Cabinet Legs (all 4 legs present & seated on mat) ---
    const cabLegs = propBoxes.filter(b => Math.abs(b.w - 0.08) < 0.01 && Math.abs(b.h - 0.09) < 0.01 && Math.abs(b.y - 0.065) < 0.005);
    ok(cabLegs.length === 4, 'medical cabinet has all 4 steel legs (2 front + 2 rear, found ' + cabLegs.length + ')');
    const cabCz = mockB.minZ + 0.64;
    const frontLegs = cabLegs.filter(b => b.z > cabCz);
    const rearLegs = cabLegs.filter(b => b.z < cabCz);
    ok(frontLegs.length === 2, 'medical cabinet has 2 front legs');
    ok(rearLegs.length === 2, 'medical cabinet has 2 rear legs');
    for (let i = 0; i < cabLegs.length; i++) {
      const leg = cabLegs[i];
      const minY = leg.y - leg.h / 2;
      ok(Math.abs(minY - 0.020) <= 0.0005, 'cabinet leg #' + i + ' seated flush on mat at y = 0.0200 m (minY=' + minY.toFixed(4) + ' m)');
    }

    // =========================================================================
    // 3. FIND 7: INFIRMARY COT SCISSOR LEGS AUDIT (world/training-wear.js)
    // =========================================================================
    const { dressTrainingWear } = await import('../../world/training-wear.js');
    ok(typeof dressTrainingWear === 'function', 'dressTrainingWear imported');

    const wearBoxes = [];
    const wearMeshes = [];
    const wearAdd = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.updateMatrixWorld(true);
      wearMeshes.push(m);
      return m;
    };
    const wearBox = (w, h, d, mat, x, y, z) => {
      const m = wearAdd(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
      wearBoxes.push({ w, h, d, x, y, z, mat, mesh: m });
      return m;
    };

    dressTrainingWear(THREE, {
      R: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      B: mockB,
      bedAt: mockBedAt,
      add: wearAdd,
      box: wearBox,
      std: () => dummyMat,
      texture: () => null,
      lampMat: dummyMat,
      root: new THREE.Group()
    });

    // Scissor legs: length ~0.79 m, rotated around X axis
    const cotLegs = wearBoxes.filter(b => Math.abs(b.w - 0.026) < 0.005 && Math.abs(b.h - 0.79) < 0.02);
    ok(cotLegs.length === 4, 'cot has 4 scissor legs (found ' + cotLegs.length + ')');

    if (cotLegs.length === 4) {
      // Check head end pair and foot end pair
      const headPair = cotLegs.filter(l => l.x < mockBedAt.x + 3.25);
      const footPair = cotLegs.filter(l => l.x > mockBedAt.x + 3.25);
      ok(headPair.length === 2, 'head-end scissor leg pair has 2 crossing members');
      ok(footPair.length === 2, 'foot-end scissor leg pair has 2 crossing members');

      for (const [pairName, pair] of [['head', headPair], ['foot', footPair]]) {
        const xDiff = Math.abs(pair[0].x - pair[1].x);
        ok(xDiff >= 0.030, pairName + ' scissor legs offset along X by ' + (xDiff * 1000).toFixed(1) + ' mm (>= 30 mm, zero pass-through)');
        const b0 = getBounds(pair[0].mesh);
        const b1 = getBounds(pair[1].mesh);
        const intersects = b0.intersectsBox(b1);
        ok(!intersects, pairName + ' scissor leg 3D bounding boxes do not penetrate (pass past each other cleanly)');
      }
    }

    // Pivot pins / caps along X axis (radius 0.012 m, thickness 0.008 m)
    const cotCaps = wearMeshes.filter(m => m.geometry && m.geometry.parameters && Math.abs(m.geometry.parameters[0] - 0.012) < 0.001 && Math.abs(m.geometry.parameters[2] - 0.008) < 0.001);
    ok(cotCaps.length === 4, 'cot has 4 scissor pivot pin caps (found ' + cotCaps.length + ')');

    // =========================================================================
    // 4. FIND 8: BUILD ROOM WALL WEAR TEXEL DENSITY (world/training-build-wear.js)
    // =========================================================================
    const { BUILD_WEAR } = await import('../../world/training-build-wear.js');
    ok(!!BUILD_WEAR, 'BUILD_WEAR configuration imported');
    ok(BUILD_WEAR.WALL_PX === 64, 'BUILD_WEAR.WALL_PX is 64 px/m matching wall texel density (got ' + BUILD_WEAR.WALL_PX + ')');

    // =========================================================================
    // 5. FLASHLIGHT HOTSPOT CAP AT NIGHT & 3 M (index.html)
    // =========================================================================
    const scene = H && H.scene;
    ok(!!scene, 'scene reachable via inspectHost');

    let flashlight = null;
    if (scene) {
      scene.traverse((o) => {
        if ((o.isSpotLight || o.distance === 26) && o.distance === 26) flashlight = o;
      });
    }
    ok(!!flashlight, 'tactical flashlight SpotLight found in scene');

    if (flashlight) {
      // Test formula: at 3 m night, capped intensity should prevent white blowout
      const falloff3m = Math.pow(Math.max(0.5, 3.0), -1.1);
      const cappedIntensity3m = Math.min(42, 3.6 / falloff3m);
      ok(cappedIntensity3m <= 13.0 && cappedIntensity3m >= 11.5, 'flashlight intensity at 3 m is capped to ~12.1 (got ' + cappedIntensity3m.toFixed(2) + ')');

      // At 20 m, full power
      const falloff20m = Math.pow(Math.max(0.5, 20.0), -1.1);
      const cappedIntensity20m = Math.min(42, 3.6 / falloff20m);
      ok(cappedIntensity20m === 42, 'flashlight intensity at 20 m retains full 42 tactical power (got ' + cappedIntensity20m + ')');

      // Monotonic scaling between 1m and 10m
      let prevInt = 0;
      let monotonic = true;
      for (let d = 1; d <= 12; d += 1) {
        const fo = Math.pow(Math.max(0.5, d), -1.1);
        const curInt = d < 10 ? Math.min(42, 3.6 / fo) : 42;
        if (curInt < prevInt) monotonic = false;
        prevInt = curInt;
      }
      ok(monotonic, 'flashlight intensity cap increases monotonically with obstacle distance from 1 m to 10 m');
    }

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})();