// GP-20003: W1's distant clues. Each smoke column is one instanced draw; the
// circling crows are two. All anchors come from the built POIs, never map coords.
const smooth = (v) => { const u = Math.max(0, Math.min(1, v)); return u * u * (3 - 2 * u); };

// Invisible inside the lit yard, useful beyond the trees, and gone at the far
// edge of the valley. Fog is handled here because a night mist ends at 32 m.
export function hqGlowOpacity(distance, lit) {
  if (!lit || !Number.isFinite(distance)) return 0;
  return 0.16 * smooth((distance - 24) / 36) * (1 - smooth((distance - 155) / 100));
}

export function createSkylinePulls(THREE, { scene, poi, landmarks = [], height, camera, hq = null }) {
  const TAU = Math.PI * 2;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const cameraRotation = new THREE.Quaternion();

  const trapper = poi.campsites.find(p => p.style === 'trapper') || poi.campsites[2];
  const hikers = poi.campsites.find(p => p.style === 'hikers') || poi.campsites[1];
  const depot = poi.sheds[2];
  const mast = poi.mast;
  const at = (p, lift) => p ? { x: p.x, y: height(p.x, p.z) + lift, z: p.z } : null;
  const trapperCabin = landmarks.find(l => l.kind === 'campsite' && l.campStyle === 'trapper' && l.x === trapper?.x && l.z === trapper?.z);
  function pipeAt(p, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const world = (x, z) => ({ x: p.x + x * c + z * s, z: p.z - x * s + z * c });
    const footA = world(-4.2, -3.6), footB = world(-1.6, -1.6), pipe = world(-3.52, -3.15);
    return { x: pipe.x, y: Math.max(height(footA.x, footA.z), height(footB.x, footB.z)) + 2.0, z: pipe.z };
  }
  const sites = {
    trapper: trapperCabin ? pipeAt(trapper, trapperCabin.campYaw || 0) : at(trapper, 2),
    fuel: at(depot, 2.8), hikers: at(hikers, 28), mast: at(mast, 15.3)
  };

  // A soft uneven edge reads as smoke, without one transparent mesh per puff.
  function radialTexture(smoke) {
    const n = 48, bytes = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const nx = (x + 0.5) * 2 / n - 1, ny = (y + 0.5) * 2 / n - 1;
      const a = Math.atan2(ny, nx), r = Math.hypot(nx, ny);
      const edge = smoke ? 0.84 + 0.07 * Math.sin(a * 5 + 0.4) + 0.04 * Math.sin(a * 9 - 1.1) : 0.94;
      const alpha = Math.max(0, 1 - r / edge);
      const i = (y * n + x) * 4;
      bytes[i] = bytes[i + 1] = bytes[i + 2] = 255;
      bytes[i + 3] = Math.round(255 * (smoke ? alpha * alpha * (0.86 + 0.14 * Math.sin(x * 0.37 + y * 0.31)) : alpha * alpha));
    }
    const tex = new THREE.DataTexture(bytes, n, n, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }
  const smokeTex = radialTexture(true), glowTex = radialTexture(false);
  const puffGeo = new THREE.PlaneGeometry(1, 1);
  function column(name, color, opacity, capacity) {
    const mat = new THREE.MeshBasicMaterial({ map: smokeTex, color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: true });
    const mesh = new THREE.InstancedMesh(puffGeo, mat, capacity);
    mesh.name = name; mesh.frustumCulled = false; mesh.userData.noCull = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, zero);
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }
  const chimney = sites.trapper ? column('skyline-trapper-smoke', 0x92958f, 0.50, 14) : null;
  const fuel = sites.fuel ? column('skyline-fuel-smoke', 0x292b2a, 0.55, 15) : null;
  function drawColumn(mesh, anchor, n, t, wind, rise, width, seed, span = 33) {
    if (!mesh || !anchor || !n) { if (mesh) mesh.visible = false; return; }
    mesh.visible = true; mesh.count = n;
    for (let i = 0; i < n; i++) {
      const u = (t * rise + i / n + seed) % 1;
      const y = anchor.y + 1.2 + u * span;
      const lean = (y - anchor.y) * (0.12 + wind.strength * 0.16);
      position.set(anchor.x + wind.dirX * lean + Math.sin(t * 0.37 + i * 1.7) * 0.9 * u,
        y, anchor.z + wind.dirZ * lean + Math.cos(t * 0.29 + i * 1.9) * 0.9 * u);
      const fade = Math.max(0.12, Math.sin(Math.PI * u) ** 0.65);
      const s = (width + u * 6.2) * fade;
      scale.set(s, s * (1.16 + 0.1 * Math.sin(i * 2.3)), 1);
      matrix.compose(position, cameraRotation, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  const crowMat = new THREE.MeshBasicMaterial({ color: 0x11151a, side: THREE.DoubleSide, fog: true });
  const bodyGeo = new THREE.SphereGeometry(1, 6, 4);
  bodyGeo.scale(0.09, 0.055, 0.31);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0.04, 0, 0.14, 0.08, 0, -0.17, 0.72, 0.035, -0.12,
    0.04, 0, 0.14, 0.72, 0.035, -0.12, 0.96, 0.025, -0.22,
    0.72, 0.035, -0.12, 0.08, 0, -0.17, 0.58, 0.025, -0.34
  ], 3));
  wingGeo.computeVertexNormals();
  const crowCount = 7;
  const bodies = sites.hikers ? new THREE.InstancedMesh(bodyGeo, crowMat, crowCount) : null;
  const wings = sites.hikers ? new THREE.InstancedMesh(wingGeo, crowMat, crowCount * 2) : null;
  if (bodies && wings) {
    bodies.name = 'skyline-hikers-crows'; wings.name = 'skyline-hikers-crow-wings';
    for (const mesh of [bodies, wings]) {
      mesh.frustumCulled = false; mesh.userData.noCull = true; mesh.visible = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, zero);
      scene.add(mesh);
    }
  }
  function drawCrows(t, wind, daylight) {
    if (!bodies || !wings) return;
    bodies.visible = wings.visible = daylight;
    if (!daylight) return;
    for (let i = 0; i < crowCount; i++) {
      const a = t * 0.14 + i * TAU / crowCount;
      const r = 8.5 + 1.8 * Math.sin(t * 0.21 + i * 1.9);
      const heading = -a + Math.PI * 0.5;
      position.set(sites.hikers.x + Math.cos(a) * r + wind.dirX * wind.strength * 1.4,
        sites.hikers.y + 2.0 * Math.sin(t * 0.43 + i * 1.3),
        sites.hikers.z + Math.sin(a) * r + wind.dirZ * wind.strength * 1.4);
      const flap = 0.2 + 0.47 * Math.sin(t * (5.1 + i * 0.09) + i * 1.7);
      euler.set(0, heading, 0.09, 'YXZ'); rotation.setFromEuler(euler);
      scale.set(1.22, 1.22, 1.22); matrix.compose(position, rotation, scale); bodies.setMatrixAt(i, matrix);
      for (let side = 0; side < 2; side++) {
        const sign = side ? -1 : 1;
        euler.set(0, heading, sign * flap, 'YXZ'); rotation.setFromEuler(euler);
        scale.set(sign * 1.22, 1.22, 1.22);
        matrix.compose(position, rotation, scale); wings.setMatrixAt(i * 2 + side, matrix);
      }
    }
    bodies.instanceMatrix.needsUpdate = wings.instanceMatrix.needsUpdate = true;
  }

  // The mast already has its story-gated bulb and point light. This adds only a
  // soft visible disc above the canopy, following that same blink and dusk gate.
  // Night fog ends at 65 m, before the 150 m mast; fade it by distance ourselves.
  const beacon = sites.mast ? new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2416, transparent: true, opacity: 0.94, depthWrite: false, fog: false })) : null;
  if (beacon) {
    beacon.name = 'skyline-mast-red-light'; beacon.position.set(sites.mast.x, sites.mast.y, sites.mast.z);
    beacon.scale.set(2.3, 2.3, 1); beacon.visible = false; beacon.userData.noCull = true;
    scene.add(beacon);
  }

  // One fog-exempt, depth-tested haze disc above the HQ canopy. It has no
  // light, shadow or gameplay collider, and borrows the mast's radial texture.
  const hqGlow = hq ? new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex,
    color: 0xffdfb3, blending: THREE.AdditiveBlending, transparent: true,
    opacity: 0, depthTest: true, depthWrite: false, fog: false })) : null;
  if (hqGlow) {
    hqGlow.name = 'skyline-hq-haze';
    hqGlow.position.set(hq.x, hq.y + 22, hq.z);
    hqGlow.scale.set(40, 27, 1);
    hqGlow.visible = false;
    hqGlow.userData.noCull = true;
    scene.add(hqGlow);
  }

  let time = 0;
  function update(dt, { wind, daylight, fuelDone, beaconOn, hqGlowOn = false }) {
    time += Math.max(0, dt);
    camera.getWorldQuaternion(cameraRotation);
    drawColumn(chimney, sites.trapper, daylight ? 14 : 0, time, wind, 0.025, 2.1, 0.07, 44);
    drawColumn(fuel, sites.fuel, fuelDone ? 5 : 15, time, wind, 0.032, fuelDone ? 1.5 : 2.2, 0.43);
    drawCrows(time, wind, daylight);
    if (beacon) {
      beacon.visible = !!beaconOn;
      if (beaconOn) {
        const s = 2.3 * (1 + 0.07 * Math.sin(time * 8)); beacon.scale.set(s, s, 1);
        const distance = camera.position.distanceTo(beacon.position);
        beacon.material.opacity = 0.94 * Math.max(0, 1 - Math.max(0, distance - 45) / 260);
      }
    }
    if (hqGlow) {
      hqGlow.material.opacity = hqGlowOpacity(camera.position.distanceTo(hqGlow.position), hqGlowOn);
      hqGlow.visible = hqGlow.material.opacity > 0.001;
    }
  }
  return { update, sites, chimney, fuel, bodies, wings, beacon, hqGlow };
}
