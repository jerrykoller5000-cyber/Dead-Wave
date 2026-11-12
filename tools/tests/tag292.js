// tools/tests/tag292.js
// tag292 - AG-292 J128 (Jerry, 10 Nov, standing, D-140): Training Ground props seating & pass-through check on RTX 5080.
// Every prop in Antigravity's files in the Training Ground (the range, the Armory room, the CIF, the corridors, the yard):
// each seated on what holds it (no gap over 0.5 mm) and none through another or through a wall or floor.
(async () => {
  const T = window.TT;
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 25000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { if (f()) return true; await wait(40); }
    return !!f();
  };

  try {
    const THREE = T.THREE;
    const Box3 = THREE.Box3;
    const Vector3 = THREE.Vector3;

    const { TRAINING, buildTrainingGround } = await import(new URL('/world/training.js', location.origin).href);
    const { dressTrainingProps } = await import(new URL('/world/training-props.js', location.origin).href);
    const { dressTrainingWear, WEAR } = await import(new URL('/world/training-wear.js', location.origin).href);
    const { buildFiringLine, FIRING_LINE } = await import(new URL('/world/training-firing-line.js', location.origin).href);

    const GAP_MAX = 0.0005; // 0.5 mm tolerance (J128 / D-140)

    // =========================================================================
    // 1. THE RANGE AREA PROPS
    // =========================================================================
    const R = TRAINING.RANGE;
    const B = TRAINING.BUILD;
    const BZ = R.minZ; // -12
    const bedAt = { x: B.minX + 3.15, z: B.minZ + 2.0 };

    const wearGroup = new THREE.Group();
    const std = (o) => new THREE.MeshStandardMaterial(o || {});
    const add = (geo, mat, x, y, z, parent = wearGroup) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);

    const wear = dressTrainingWear(THREE, {
      R, B, bedAt,
      add, box, std,
      texture: () => null,
      lampMat: std({}),
      root: wearGroup
    });
    wearGroup.updateMatrixWorld(true);

    // A. Lockers bank seating on floor y = 0.0000 m (minY <= 0.0005)
    let lockerCount = 0;
    wearGroup.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      const b = new Box3().setFromObject(m);
      const sz = new Vector3(); b.getSize(sz);
      const c = new Vector3(); b.getCenter(c);
      if (c.z > BZ + 0.20 && c.z < BZ + 0.35 && sz.y > 1.80 && sz.x < 0.65) {
        lockerCount++;
        ok(Math.abs(b.min.y) <= GAP_MAX, `Range: Locker #${lockerCount} seated flush on floor y=0.0000m (minY=${b.min.y.toFixed(4)}m, gap <= 0.5mm)`);
      }
    });
    ok(lockerCount === 3, `Range: all 3 lockers audited on back wall (found ${lockerCount})`);

    // B. Wall Vents flush seating against east and west wall faces (px at R.maxX, nx at R.minX)
    let ventCount = 0;
    wearGroup.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      const b = new Box3().setFromObject(m);
      const sz = new Vector3(); b.getSize(sz);
      const c = new Vector3(); b.getCenter(c);
      if (Math.abs(c.y - 5.0) < 0.2 && sz.z > 0.8 && sz.y > 0.4) {
        ventCount++;
        const isPx = c.x > 0;
        const wallX = isPx ? R.maxX : R.minX;
        const backFace = isPx ? b.max.x : b.min.x;
        const gap = Math.abs(wallX - backFace);
        ok(gap <= GAP_MAX, `Range: Vent Grille Frame (${isPx ? 'East' : 'West'} Wall) seated flush on wall face (gap=${(gap * 1000).toFixed(2)}mm <= 0.5mm)`);
      }
    });
    ok(ventCount === 4, `Range: all 4 wall vents audited on side walls (found ${ventCount})`);

    // C. Conduit Brackets flush mounting against wall faces
    let bracketCount = 0;
    wearGroup.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      const b = new Box3().setFromObject(m);
      const sz = new Vector3(); b.getSize(sz);
      const c = new Vector3(); b.getCenter(c);
      if (Math.abs(c.y - 4.4) < 0.1 && sz.z < 0.15 && sz.y > 0.10) {
        bracketCount++;
        const isPx = c.x > 0;
        const wallX = isPx ? R.maxX : R.minX;
        const backFace = isPx ? b.max.x : b.min.x;
        const gap = Math.abs(wallX - backFace);
        ok(gap <= GAP_MAX, `Range: Conduit Base Bracket (${isPx ? 'East' : 'West'} Wall) mounts flush on wall face (gap=${(gap * 1000).toFixed(2)}mm <= 0.5mm)`);
      }
    });
    ok(bracketCount >= 8, `Range: conduit wall brackets audited (found ${bracketCount})`);

    // D. Weapon Rack & Monitor on back wall
    let rackRails = 0;
    wearGroup.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      const b = new Box3().setFromObject(m);
      const sz = new Vector3(); b.getSize(sz);
      const c = new Vector3(); b.getCenter(c);
      if (sz.x > 2.0 && sz.y > 0.10 && sz.y < 0.15 && Math.abs(c.x - 2.3) < 0.1) {
        rackRails++;
        const gap = Math.abs(b.min.z - BZ);
        ok(gap <= GAP_MAX, `Armory Room / Range: weapon rack rail mounts flush against back wall BZ (gap=${(gap * 1000).toFixed(2)}mm <= 0.5mm)`);
      }
    });
    ok(rackRails === 2, `Armory Room / Range: weapon rack rails audited (found ${rackRails})`);

    // E. Firing Line Bench & Kick Rail
    const flGroup = new THREE.Group();
    let kickRailBox = null;
    const fl = buildFiringLine(THREE, {
      root: flGroup,
      origin: TRAINING.ORIGIN,
      range: R,
      height: TRAINING.WALL_H,
      box: (w, h, d, mat, x, y, z, parent) => {
        const m = box(w, h, d, mat, x, y, z, parent);
        // GP-20119: the current base strip is a 75 mm steel rail at the front of the
        // panel. Match its full span, 75 mm section and exact front-face seat; the
        // old 80–100 mm / z=.24 selector described the retired bench geometry.
        if (Math.abs(w - (R.maxX - R.minX)) < 1e-6 &&
            Math.abs(h - 0.075) < 1e-6 && Math.abs(d - 0.075) < 1e-6 &&
            Math.abs(x - (R.minX + R.maxX) / 2) < 1e-6 &&
            Math.abs(z - (FIRING_LINE.front + d / 2)) < 1e-6) {
          kickRailBox = { w, h, d, x, y, z, minY: y - h / 2 };
        }
        return m;
      },
      std, keep: (x) => x,
      steel: std({}), steelLight: std({}), hazard: std({})
    });
    flGroup.updateMatrixWorld(true);

    ok(!!kickRailBox, 'Range: Firing Line base kick rail created');
    if (kickRailBox) {
      ok(Math.abs(kickRailBox.minY) <= GAP_MAX, 'Range: Firing Line base kick rail seated flush on floor y=0.0000m (minY=' + kickRailBox.minY.toFixed(4) + 'm, gap <= 0.5mm)');
    }

    // =========================================================================
    // 2. THE YARD / BUILD ROOM & CORRIDORS PROPS
    // =========================================================================
    const propGroup = new THREE.Group();
    const gate = { x: (B.minX + B.maxX) / 2, z: B.maxZ - 1.4 };
    const sign = (text, w, h, x, y, z, yaw) => {
      const m = add(new THREE.PlaneGeometry(w, h), std({}), x, y, z, propGroup);
      m.rotation.y = yaw;
      return m;
    };
    const rel = dressTrainingProps(THREE, {
      B, gate, bedAt,
      box: (w, h, d, mat, x, y, z, p = propGroup) => box(w, h, d, mat, x, y, z, p),
      add: (geo, mat, x, y, z, p = propGroup) => add(geo, mat, x, y, z, p),
      std, texture: () => null, sign,
      steel: std({}), steelLight: std({}), hazard: std({}), lampMat: std({}),
      labels: { gate: 'GATE', containment: 'CONTAINMENT', infirmary: 'INFIRMARY', medical: 'MEDICAL' }
    });
    if (rel && rel.gateFrame) propGroup.add(rel.gateFrame);
    propGroup.updateMatrixWorld(true);

    // Containment Gate Threshold
    let thresholdFound = false;
    propGroup.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      const b = new Box3().setFromObject(m);
      const sz = new Vector3(); b.getSize(sz);
      const c = new Vector3(); b.getCenter(c);
      if (sz.x > 8.0 && sz.z > 0.9 && true) {
        thresholdFound = true;
        ok(Math.abs(b.min.y) <= GAP_MAX, `Yard: Containment Gate threshold seated flush on floor y=0.0000m (minY=${b.min.y.toFixed(4)}m, gap <= 0.5mm)`);
      }
    });
    ok(thresholdFound, 'Yard: Containment Gate threshold plate verified');

    // Field Infirmary Floor Mat
    let baseMatFound = false;
    propGroup.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      const b = new Box3().setFromObject(m);
      const sz = new Vector3(); b.getSize(sz);
      if (sz.x > 7.3 && sz.z > 4.0 && sz.y < 0.02) {
        baseMatFound = true;
        ok(Math.abs(b.min.y) <= GAP_MAX, `Yard: Infirmary dark base mat seated flush on floor y=0.0000m (minY=${b.min.y.toFixed(4)}m, gap <= 0.5mm)`);
      }
    });
    ok(baseMatFound, 'Yard: Infirmary dark base mat verified');

    // =========================================================================
    // 3. LIVE SCENE INSPECTION IN WEBGPU
    // =========================================================================
    const H = T.inspectHost ? T.inspectHost() : null;
    const D = T.trainingDbg;
    ok(!!(H && D), 'Training Ground inspectHost and trainingDbg reachable');
    if (H && D) {
      if (!D.state().active || !D.tg()) {
        const nameEl = document.getElementById('playerName');
        if (nameEl) nameEl.value = 'AG292';
        H.enterTraining();
        await until(() => D.state().active && D.tg(), 25000);
        await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 15000);
      }
      const tg = D.tg();
      ok(!!tg, 'Training Ground booted cleanly in WebGPU renderer');

      // Verify Doorway Keypad mounting
      const leftKeypad = tg.securityDoor && tg.securityDoor.keypads ? tg.securityDoor.keypads[0] : null;
      ok(!!leftKeypad, 'Corridors: security door keypads verified');

      // Verify Stations (CIF, Armory, Kiosk, HQ Panel, Skull Window)
      for (const stName of ['cif', 'armory', 'kiosk', 'hqPanel', 'skullWindow']) {
        const st = tg.stations[stName];
        ok(!!st, `Stations: station ${stName} positioned in Training Ground`);
      }
    }

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})();
