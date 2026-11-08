// GP-164: heavy-weapon cosmetic constructors. Existing animation and grip contracts remain in the caller.

// Small closed surface builders use BufferGeometry, also available in the test renderer.
// Shared geometry contains no instance material, colour, animation or game state.
const geometryCaches = new WeakMap();
function geometry(T, key, build) {
  let cache = geometryCaches.get(T); if (!cache) geometryCaches.set(T, cache = new Map());
  if (cache.has(key)) return cache.get(key);
  const p = [], n = [], uv = [];
  const tri = (a, b, c, na, nb = na, nc = na) => {
    const ab = b.map((v, i) => v - a[i]), ac = c.map((v, i) => v - a[i]);
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (Math.hypot(...cross) < 1e-12) return;
    if (cross.reduce((sum, v, i) => sum + v * (na[i] + nb[i] + nc[i]), 0) < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
    for (const [v, normal] of [[a, na], [b, nb], [c, nc]]) { p.push(...v.map(x => Math.abs(x) < 1e-10 ? 0 : x)); n.push(...normal); uv.push(v[2] * 4, v[1] * 4); }
  };
  const quad = (a, b, c, d, na, nb = na, nc = na, nd = na) => { tri(a, b, c, na, nb, nc); tri(a, c, d, na, nc, nd); };
  build(quad, tri);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array(p), 3));
  geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(n), 3));
  geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
  geo.computeBoundingSphere(); geo.userData.shared = true; geo.userData.heavyGeometry = key; cache.set(key, geo); return geo;
}
function part(T, geo, mat, parent, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geo, mat); mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
// A rolled steel sheet with actual oval through-holes and a closed inside wall.
function ventTube(T, r, wall, length, rows, columns, holeA = 0.5, holeZ = 0.58, ringN = 12) {
  return geometry(T, ['vent', r, wall, length, rows, columns, holeA, holeZ, ringN].join(','), (quad) => {
    const da = Math.PI * 2 / rows, dz = length / columns;
    const position = (a, z, radius) => [Math.sin(a) * radius, Math.cos(a) * radius, z];
    const normal = (a, sign) => [Math.sin(a) * sign, Math.cos(a) * sign, 0];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const ax = da * (row + 0.5), zc = dz * (col + 0.5), hx = da / 2, hz = dz / 2;
      // Include every corner exactly so neighbouring patches meet without cracks.
      const corner = Math.atan2(hz, hx * r);
      const angles = [...Array.from({ length: ringN }, (_, i) => i * Math.PI * 2 / ringN), corner, Math.PI - corner, Math.PI + corner, 2 * Math.PI - corner].sort((a, b) => a - b);
      const ring = angles.map(a => {
        const dx = Math.cos(a), dy = Math.sin(a), outer = Math.min(hx * r / Math.max(1e-12, Math.abs(dx)), hz / Math.max(1e-12, Math.abs(dy)));
        const inner = 1 / Math.hypot(dx / (hx * r * holeA), dy / (hz * holeZ));
        return { outer: [ax + dx * outer / r, zc + dy * outer], inner: [ax + dx * inner / r, zc + dy * inner] };
      });
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        for (const [radius, sign] of [[r + wall, 1], [r, -1]]) quad(position(...a.inner, radius), position(...a.outer, radius), position(...b.outer, radius), position(...b.inner, radius), normal(a.inner[0], sign), normal(a.outer[0], sign), normal(b.outer[0], sign), normal(b.inner[0], sign));
        const midA = (a.inner[0] + b.inner[0]) / 2, tangent = [Math.cos(midA), -Math.sin(midA), 0];
        const hu = (a.inner[0] + b.inner[0]) / 2 - ax, hv = (a.inner[1] + b.inner[1]) / 2 - zc;
        const nx = -hu * r / (hx * r * holeA) ** 2, nz = -hv / (hz * holeZ) ** 2, len = Math.hypot(nx, nz) || 1;
        const hn = [tangent[0] * nx / len, tangent[1] * nx / len, nz / len];
        quad(position(...a.inner, r), position(...a.inner, r + wall), position(...b.inner, r + wall), position(...b.inner, r), hn);
      }
    }
    for (const z of [0, length]) for (let i = 0; i < rows * 8; i++) {
      const a = i * Math.PI * 2 / (rows * 8), b = (i + 1) * Math.PI * 2 / (rows * 8);
      quad(position(a, z, r), position(a, z, r + wall), position(b, z, r + wall), position(b, z, r), [0, 0, z ? 1 : -1]);
    }
  });
}
function bolt(K, dark, bright, x, y, z, radius = 0.006, parent = null) {
  K.cyl(radius, radius, 0.004, bright, x, y, z, parent, 8, 'x');
  K.box(0.005, radius * 0.35, radius * 1.05, dark, x, y, z, 0, 0, 0, parent, 0.0004);
}
function rod(T, K, a, b, radius, mat, parent = null) {
  const from = new T.Vector3(...a), to = new T.Vector3(...b), delta = to.clone().sub(from), mid = from.add(to).multiplyScalar(0.5);
  const mesh = K.cyl(radius, radius, delta.length(), mat, mid.x, mid.y, mid.z, parent, 8, 'y');
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return mesh;
}
// Side profile about an existing pistol-grip centre line. u runs down the handle;
// positive v faces the trigger. The socket at the palm stays on that centre line.
function gripShape(cz, cy, h, d, rake, points) {
  const sn = Math.sin(rake), cs = Math.cos(rake), scale = d / 0.08;
  return points.map(([u, v]) => {
    const along = (u - 0.5) * h, across = v * scale;
    return [cz - along * sn + across * cs, cy - along * cs - across * sn];
  });
}
// Six genuinely recessed chambers. Each sector is a closed cell surrounding its bore.
function launcherDrum(T) {
  return geometry(T, 'launcher-six-chambers', (quad) => {
    const outerR = 0.14, orbit = 0.075, holeR = 0.032, halfLength = 0.065;
    for (let sector = 0; sector < 6; sector++) {
      const angle = sector * Math.PI / 3, centre = [Math.sin(angle) * orbit, Math.cos(angle) * orbit];
      const rays = [];
      const samples = Array.from({ length: 36 }, (_, i) => i * Math.PI * 2 / 36);
      // Include the two outer sector corners exactly. Without them the sampled polygon
      // shortcuts the curve/straight join and leaves a triangular gap between cells.
      for (const s of [-1, 1]) {
        const edge = angle + s * Math.PI / 6;
        const a = Math.atan2(Math.sin(edge) * outerR - centre[0], Math.cos(edge) * outerR - centre[1]) - angle;
        samples.push(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
      }
      samples.sort((a, b) => a - b);
      for (const sample of samples) {
        const a = angle + sample, dir = [Math.sin(a), Math.cos(a)], cd = centre[0] * dir[0] + centre[1] * dir[1];
        let distance = -cd + Math.sqrt(cd * cd + outerR * outerR - orbit * orbit);
        for (const s of [-1, 1]) {
          const edge = angle + s * Math.PI / 6, inside = [-s * Math.cos(edge), s * Math.sin(edge)];
          const originDot = centre[0] * inside[0] + centre[1] * inside[1], directionDot = dir[0] * inside[0] + dir[1] * inside[1];
          if (directionDot < -1e-10) distance = Math.min(distance, -originDot / directionDot);
        }
        rays.push({ inner: [centre[0] + dir[0] * holeR, centre[1] + dir[1] * holeR], outer: [centre[0] + dir[0] * distance, centre[1] + dir[1] * distance], dir });
      }
      for (let i = 0; i < rays.length; i++) {
        const a = rays[i], b = rays[(i + 1) % rays.length], at = (p, z) => [p[0], p[1], z];
        for (const z of [-halfLength, halfLength]) quad(at(a.inner, z), at(a.outer, z), at(b.outer, z), at(b.inner, z), [0, 0, Math.sign(z)]);
        quad(at(a.inner, -halfLength), at(a.inner, halfLength), at(b.inner, halfLength), at(b.inner, -halfLength), [-a.dir[0], -a.dir[1], 0], [-a.dir[0], -a.dir[1], 0], [-b.dir[0], -b.dir[1], 0], [-b.dir[0], -b.dir[1], 0]);
        const dx = b.outer[0] - a.outer[0], dy = b.outer[1] - a.outer[1], len = Math.hypot(dx, dy) || 1;
        const faceN = [dy / len, -dx / len, 0];
        const mx = (a.outer[0] + b.outer[0]) / 2 - centre[0], my = (a.outer[1] + b.outer[1]) / 2 - centre[1];
        if (faceN[0] * mx + faceN[1] * my < 0) { faceN[0] *= -1; faceN[1] *= -1; }
        quad(at(a.outer, -halfLength), at(a.outer, halfLength), at(b.outer, halfLength), at(b.outer, -halfLength), faceN);
      }
    }
  });
}

export function makeMinigunModel(ctx) {
  const { THREE, gunKit, gunArc, gunBand, gunEffects, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, brassMat, gunOlive, fuelRedMat, glassMat, sightDotMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Housing: one moulded body with a round back end, bolted side plates, cooling slots, the hub showing.
  K.slab([[0.225, -0.13], [0.225, 0.13], ...gunArc(-0.32, 0, 0.13, Math.PI / 2, Math.PI * 1.5, 10)], 0.28, gunBody, { bevel: 0.035, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab([[-0.255, -0.092], [0.152, -0.092], [0.161, -0.08], [0.161, 0.087], [0.148, 0.098], [-0.247, 0.098]], 0.008, gunMid, { x: sx * 0.156, bevel: 0.003 });
    for (let i = 0; i < 4; i++) K.box(0.012, 0.009, 0.26, gunDark, sx * 0.158, 0.065 - i * 0.039, -0.064, 0, 0, 0, null, 0.003);
    for (const [by, bz] of [[0.085, 0.13], [0.085, -0.24], [-0.085, 0.13], [-0.085, -0.24]]) K.cyl(0.011, 0.011, 0.012, gunAccent, sx * 0.157, by, bz, null, 6, 'x');
  }
  // Two removable top service panels break up the broad receiver shell without
  // crossing the centre sight line or shifting either hand's support point.
  for (const sx of [-1, 1]) {
    K.box(0.061, 0.007, 0.19, gunDark, sx * 0.079, 0.129, -0.075, 0, 0, 0, null, 0.004);
    K.box(0.055, 0.008, 0.184, gunMid, sx * 0.079, 0.134, -0.075, 0, 0, 0, null, 0.004);
    for (const z of [-0.148, -0.002]) K.cyl(0.004, 0.004, 0.003, gunAccent, sx * 0.079, 0.139, z, null, 8, 'y');
  }
  K.cyl(0.07, 0.07, 0.3, gunDark, 0, -0.02, -0.32, null, 12, 'x');
  // Drive motor under the housing, finned, with its power lead.
  const fins = [[0, -0.18], [0.072, -0.18]];
  for (let i = 0; i < 6; i++) { const z = -0.15 + i * 0.04; fins.push([0.072, z - 0.006], [0.084, z - 0.006], [0.084, z + 0.006], [0.072, z + 0.006]); }
  fins.push([0.072, 0.08], [0, 0.08]);
  K.lathe(fins, gunDark, { y: -0.18, seg: 14 });
  // The motor is a separate serviceable unit: rear fan guard, eight open radial
  // windows and a bolted end cap. Its axle remains below the main receiver.
  K.cyl(0.064, 0.064, 0.006, gunMid, 0, -0.18, -0.191, null, 24);
  K.cyl(0.051, 0.051, 0.007, gunDark, 0, -0.18, -0.196, null, 24);
  K.cyl(0.013, 0.013, 0.011, gunAccent, 0, -0.18, -0.202, null, 12);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const x = Math.cos(a) * 0.039, y = -0.18 + Math.sin(a) * 0.039;
    rod(THREE, K, [x * 0.42, -0.18 + (y + 0.18) * 0.42, -0.201], [x, y, -0.201], 0.003, gunMid);
  }
  for (const sx of [-1, 1]) for (const z of [-0.13, 0.055]) {
    K.box(0.008, 0.026, 0.012, gunAccent, sx * 0.086, -0.18, z, 0, 0, 0, null, 0.002);
  }
  // GB-172: the power lead was a black bar floating out past the housing. The motor stays.
  // The rear firing hand grips behind the motor. A left-side peg keeps the support forearm clear of the housing.
  // The low arch remains as the reflex-sight mount, not as a hand rest.
  K.slab(gunBand([[-0.36, 0.095], [-0.51, 0.095], [-0.55, 0.045], [-0.55, -0.11], [-0.46, -0.13], [-0.40, -0.09]], 0.018), 0.065, gunPoly, { bevel: 0.008 });
  K.box(0.074, 0.133, 0.054, gunRubber, 0, -0.017, -0.52, 0, 0, 0, null, 0.012);
  for (let i = 0; i < 5; i++) K.box(0.078, 0.008, 0.056, gunPoly, 0, -0.067 + i * 0.025, -0.52, 0, 0, 0, null, 0.002);
  // GP-20024: steel bracket projects from the -X housing plate; a 36 mm rubber peg hangs at its outer end.
  // Grip centre (-0.304, 0.012, 0.16), axis +Y, 116 mm long. The glove sits outside the side plate.
  K.box(0.018, 0.12, 0.085, gunDark, -0.168, 0.055, 0.16, 0, 0, 0, null, 0.004);
  K.box(0.14, 0.028, 0.05, gunMid, -0.236, 0.083, 0.16, 0, 0, 0, null, 0.006);
  rod(THREE, K, [-0.17, -0.005, 0.16], [-0.255, 0.071, 0.16], 0.011, gunDark);
  K.cyl(0.018, 0.018, 0.116, gunRubber, -0.304, 0.012, 0.16, null, 12, 'y');
  for (const y of [-0.043, 0.066]) K.cyl(0.024, 0.024, 0.01, gunMid, -0.304, y, 0.16, null, 12, 'y');
  for (const y of [-0.026, -0.007, 0.012, 0.031, 0.05]) K.cyl(0.0188, 0.0188, 0.003, gunDark, -0.304, y, 0.16, null, 12, 'y');
  for (const z of [-0.12, 0.12]) K.box(0.03, 0.12, 0.03, gunDark, 0, 0.18, z);
  K.box(0.03, 0.03, 0.27, gunDark, 0, 0.24, 0);
  K.box(0.05, 0.035, 0.18, gunRubber, 0, 0.26, 0);
  for (const z of [-0.12, 0.12]) { K.cyl(0.018, 0.018, 0.047, gunMid, 0, 0.155, z, null, 10, 'x'); bolt(K, gunDark, gunAccent, -0.025, 0.155, z); }
  for (let i = 0; i < 8; i++) K.box(0.051, 0.003, 0.007, gunPoly, 0, 0.278, -0.072 + i * 0.020, 0, 0, 0, null, 0.001);
  // GP-20051/J22: protective chamfered reflex hood, lens, elevation/windage dials
  // and emitter housing. The red aiming datum stays at (0, .330, .0355).
  K.box(0.045, 0.013, 0.083, gunDark, 0, 0.284, 0.006, 0, 0, 0, null, 0.003);
  K.box(0.052, 0.017, 0.025, gunMid, 0, 0.298, -0.022, 0, 0, 0, null, 0.003);
  for (const sx of [-1, 1])
    K.slab([[-0.029, 0.294], [-0.029, 0.346], [-0.017, 0.366], [0.038, 0.366], [0.045, 0.352], [0.045, 0.294]], 0.005, gunDark, { x: sx * 0.025, bevel: 0.0015 });
  K.box(0.055, 0.007, 0.055, gunDark, 0, 0.367, 0.01, 0, 0, 0, null, 0.002);
  K.box(0.051, 0.003, 0.009, gunAccent, 0, 0.367, 0.04, 0, 0, 0, null, 0.001);
  K.cyl(0.012, 0.012, 0.013, gunMid, 0, 0.373, -0.007, null, 12, 'y');
  K.cyl(0.011, 0.011, 0.013, gunMid, 0.03, 0.329, -0.016, null, 12, 'x');
  const reflexGlass = Object.assign(glassMat.clone(), { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  reflexGlass.color.setHex(0x78919b);
  K.box(0.043, 0.064, 0.003, reflexGlass, 0, 0.325, 0.035);
  K.box(0.0035, 0.0035, 0.002, sightDotMat, 0, 0.330, 0.0355);
  K.tor(0.0075, 0.0006, sightDotMat, 0, 0.330, 0.0355, 0, 0, 0, null, Math.PI * 2, 24);
  // Trigger and guard sit just ahead of the rear firing grip.
  K.slab(gunBand([[-0.44, 0.07], [-0.43, 0.035], [-0.425, 0.008]], 0.005), 0.016, fuelRedMat, { bevel: 0.002 });
  K.slab(gunBand([[-0.46, 0.081], [-0.40, 0.078], [-0.39, -0.045], [-0.465, -0.06]], 0.006), 0.024, gunDark, { bevel: 0.003 });
  // Face plate and a spindle hub for the barrel cluster.
  K.lathe([[0, 0.21], [0.126, 0.21], [0.132, 0.216], [0.132, 0.264], [0.126, 0.27], [0, 0.27]], gunMid, { seg: 20 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.cyl(0.01, 0.01, 0.07, gunAccent, Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0.24, null, 6); }
  const barrelAssembly = new THREE.Group();
  barrelAssembly.position.set(0, 0, 0.27);
  const barrelLen = 0.84, barrelR = 0.028, clusterR = 0.075;
  K.cyl(0.03, 0.03, barrelLen, gunDark, 0, 0, barrelLen / 2, barrelAssembly, 10);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2, bx = Math.cos(ang) * clusterR, by = Math.sin(ang) * clusterR;
    K.cyl(barrelR * 0.85, barrelR, barrelLen, gunAccent, bx, by, barrelLen / 2, barrelAssembly, 10);
    K.lathe([[0, barrelLen - 0.04], [barrelR * 1.08, barrelLen - 0.04], [barrelR * 1.08, barrelLen + 0.008], [barrelR * 0.5, barrelLen + 0.01], [barrelR * 0.5, barrelLen + 0.004], [0, barrelLen + 0.004]], gunDark, { x: bx, y: by, parent: barrelAssembly, seg: 10 });
  }
  // Machined retaining collars replace the bulky rounded rings. The centre stays open.
  // GB-180 pass 5 (the collars were rings round the outside, not gripping the barrels): each clamp is a solid plate
  // from the spindle out past the barrels, the six barrels running through it, with a raised rim and bolts between them.
  for (const [rz, radius] of [[0.04, 0.118], [0.39, 0.112], [0.80, 0.108]]) {
    K.lathe([[0.026, rz - 0.016], [radius - 0.003, rz - 0.016], [radius, rz - 0.012], [radius, rz + 0.012], [radius - 0.003, rz + 0.016], [0.026, rz + 0.016], [0.026, rz - 0.016]], gunMid, { parent: barrelAssembly, seg: 28 });
    // Stepped rim and six transverse fasteners read as a barrel clamp rather
    // than a smooth ring; they turn with the animated barrel assembly.
    for (const dz of [-0.018, 0.018]) K.tor(radius - 0.004, 0.002, gunDark, 0, 0, rz + dz, 0, 0, 0, barrelAssembly, Math.PI * 2, 28);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      const x = Math.cos(a) * 0.075, y = Math.sin(a) * 0.075;
      K.cyl(0.007, 0.007, 0.04, gunDark, x, y, rz, barrelAssembly, 8);
      K.cyl(0.010, 0.010, 0.004, gunAccent, x, y, rz + 0.019, barrelAssembly, 6);
    }
  }
  gun.add(barrelAssembly);
  // Box feed and linked chute. Keep the animated reload group and its origin intact.
  const ammoBox = new THREE.Group();
  ammoBox.position.set(0.2, -0.08, -0.02);
  ammoBox.rotation.z = 0.12;
  K.box(0.17, 0.21, 0.27, gunOlive, -0.015, -0.06, -0.005, 0, 0, 0, ammoBox, 0.02);
  K.box(0.183, 0.026, 0.284, gunMid, -0.015, 0.052, -0.005, 0, 0, 0, ammoBox, 0.006);
  // Folded lid lip, rear hinge pin and two over-centre clasps remain attached
  // to the animated ammo box during reload.
  K.box(0.178, 0.006, 0.011, gunDark, -0.015, 0.037, 0.137, 0, 0, 0, ammoBox, 0.002);
  K.cyl(0.005, 0.005, 0.166, gunDark, -0.015, 0.051, -0.149, ammoBox, 10, 'x');
  for (const x of [-0.065, 0.035]) {
    K.box(0.017, 0.032, 0.009, gunDark, x, 0.017, 0.137, 0, 0, 0, ammoBox, 0.003);
    K.box(0.012, 0.006, 0.011, gunAccent, x, 0.031, 0.14, 0, 0, 0, ammoBox, 0.002);
  }
  for (const sx of [-1, 1]) {
    K.box(0.008, 0.11, 0.2, gunDark, -0.015 + sx * 0.089, -0.07, -0.005, 0, 0, 0, ammoBox, 0.003);
    for (const z of [-0.105, 0.095]) bolt(K, gunDark, gunAccent, -0.015 + sx * 0.094, -0.047, z, 0.004, ammoBox);
  }
  for (let i = 0; i < 5; i++) K.box(0.008, 0.11, 0.006, gunMid, 0.078, -0.065, -0.09 + i * 0.043, 0, 0, 0, ammoBox, 0.002);
  gun.add(ammoBox);
  // GP-20051/J21: the visible linked rounds have a slim case and a short
  // steel feed clip each, spaced along the chute rather than buried in slabs.
  for (let i = 0; i < 9; i++) {
    const u = i / 8, x = 0.20 - u * 0.046, y = 0.022 + u * 0.074, z = 0.027 - u * 0.035;
    K.cyl(0.0046, 0.0046, 0.052, brassMat, x, y, z, null, 8);
    K.cyl(0.0012, 0.0046, 0.011, gunAccent, x, y, z + 0.031, null, 8);
    K.box(0.016, 0.010, 0.012, gunMid, x, y - 0.003, z - 0.015, 0, 0, -0.4, null, 0.002);
  }
  // The feed throat is enclosed by a removable delinker cover. The dark seam
  // below its raised steel lid distinguishes it from the moving ammunition.
  K.box(0.064, 0.055, 0.103, gunDark, 0.172, 0.111, 0.034, 0, 0, -0.12, null, 0.006);
  K.box(0.068, 0.008, 0.108, gunMid, 0.172, 0.141, 0.034, 0, 0, -0.12, null, 0.003);
  for (const z of [-0.011, 0.079]) K.cyl(0.005, 0.005, 0.004, gunAccent, 0.172, 0.147, z, null, 8, 'y');
  gunEffects(gun, new THREE.Vector3(0, 0, 0.27 + barrelLen + 0.02), 0.08, 4, 8, 0.008);
  gun.userData.laser.position.set(0, 0, 0.27 + barrelLen + 4);
  gun.userData.laserBaseZ = 0.27 + barrelLen;
  gun.userData.barrelAssembly = barrelAssembly;
  gun.userData.ammoBox = ammoBox;
  gun.userData.mag = ammoBox;
  gun.userData.baseBarrelRotX = 0;
  gun.userData.baseAmmoPos = ammoBox.position.clone();
  gun.userData.baseAmmoRot = ammoBox.rotation.clone();
  // GB-302: Claude drives the ammo box (view gun.ammoBox / mag).
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    ammoBox: { restPos: [0.2, -0.08, -0.02], restRot: [0, 0, 0.12], visibleAtRest: true }
  });
  return finishGun(gun);
}

export function makeLauncherModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, gunOlive, hazardYellow } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Rear frame up to the drum's back face, the top strap over the drum, the forward frame round the barrel.
  K.slab([[-0.25, 0.08], [-0.25, -0.035], [-0.23, -0.06], [0.039, -0.06], [0.049, -0.044], [0.049, 0.09], [0.033, 0.106], [-0.227, 0.106]], 0.15, gunBody, { bevel: 0.012 });
  // A shallow stamped rear service cover breaks the large blank face seen at 40 cm.
  // It stays inside the frame envelope and folds into its existing opaque batch.
  K.box(0.104, 0.036, 0.002, gunDark, 0, 0.057, -0.251, 0, 0, 0, null, 0.003);
  K.box(0.084, 0.024, 0.001, gunMid, 0, 0.057, -0.253, 0, 0, 0, null, 0.002);
  for (const x of [-0.047, 0.047]) K.cyl(0.0025, 0.0025, 0.002, gunAccent, x, 0.057, -0.254, null, 8);
  // V3 had a smooth top and a tiny fixed datum, with no rail, lettering or raised ladder sight; the datum stays as the leaf's hinge block.
  K.slab([[-0.215, 0.109], [-0.184, 0.109], [-0.192, 0.12], [-0.208, 0.12]], 0.022, gunDark, { bevel: 0.002 });
  // J62 (Claude, 2026-11-02, from Jerry's J16: "the ability to arc rounds a little, maybe a leaf sight"): the drum's rim (y 0.123)
  // stood above the only sight, so nothing could be aimed over it. A folding rear leaf on the datum, its three notched rungs
  // (tops y 0.137, 0.144, 0.151: the higher ones lift the muzzle to arc a round further), and a front post on the front frame
  // with its tip level with the first notch (y 0.137), both above the drum line. Small and dark, so third person reads as before.
  K.cyl(0.0035, 0.0035, 0.03, gunDark, 0, 0.1225, -0.2, null, 8, 'x');   // the leaf's hinge pin on the datum
  for (const sx of [-1, 1]) {
    K.box(0.004, 0.034, 0.003, gunDark, sx * 0.011, 0.14, -0.2);   // the leaf's side rails (to y 0.157)
    for (const y of [0.137, 0.144, 0.151]) K.box(0.0055, 0.002, 0.003, gunDark, sx * 0.00625, y - 0.001, -0.2);   // open 7 mm notch: upper rungs stay clear of the lower sight line
  }
  // Open above the highest rung too: a bridge across the centre masks every notch below it.
  for (const sx of [-1, 1]) {
    K.slab([[-0.245, -0.017], [-0.112, -0.017], [-0.103, -0.024], [-0.103, -0.051], [-0.233, -0.051], [-0.245, -0.04]], 0.004, gunMid, { x: sx * 0.082, bevel: 0.002 });
    for (const [z, y, ox] of [[-0.229, 0.084, 0.0775], [0.023, 0.081, 0.0775], [-0.226, -0.035, 0.087], [-0.12, -0.035, 0.087]]) bolt(K, gunDark, gunAccent, sx * ox, y, z, 0.005);   // GB-297: upper bolts on the frame face, lower on the side panel
  }
  // Side-mounted quadrant backs the existing open leaf without crossing its sight line.
  K.box(0.012, 0.012, 0.108, gunMid, 0.084, 0.104, -0.174, 0, 0, 0, null, 0.003);
  const quadrant = [[0.09, 0.109, -0.225], [0.09, 0.141, -0.211], [0.09, 0.164, -0.187], [0.09, 0.181, -0.159], [0.09, 0.187, -0.129]];
  for (let i = 0; i < quadrant.length - 1; i++) rod(THREE, K, quadrant[i], quadrant[i + 1], 0.0035, gunDark);
  for (const [z, top] of [[-0.211, 0.141], [-0.187, 0.164], [-0.159, 0.181]])
    rod(THREE, K, [0.09, 0.109, z], [0.09, top, z], 0.0025, gunMid);
  for (const [y, z] of [[0.143, -0.211], [0.166, -0.187], [0.183, -0.159]])
    K.box(0.006, 0.003, 0.012, gunAccent, 0.092, y, z, 0, 0, 0, null, 0.001);
  K.slab([[0.265, -0.05], [0.315, -0.05], [0.315, 0.09], [0.265, 0.09]], 0.12, gunBody, { bevel: 0.014 });
  // J62: the front post on the front frame, its tip at the first notch's height (y 0.137), between two low guard ears.
  K.box(0.024, 0.012, 0.03, gunDark, 0, 0.096, 0.29);
  K.box(0.004, 0.035, 0.004, gunDark, 0, 0.1195, 0.29);
  for (const sx of [-1, 1]) K.box(0.003, 0.03, 0.012, gunDark, sx * 0.012, 0.117, 0.29);
  // Collapsible stock on its tube, with a pad; pistol grip, trigger guard, trigger.
  // J62 (GP-20016): the stock tube, olive body, rubber pad and stock-side slabs (with their bolts) are one group,
  // gun.userData.fpStock ('fp-stock'), for the view gun to leave out of the eye; third person and the shadow keep it.
  // Every part is where it was (the group sits at the gun's origin).
  const stock = K.group(0, 0, 0), stockStart = gun.children.length; stock.name = 'fp-stock';
  K.lathe([[0, -0.46], [0.024, -0.46], [0.024, -0.25], [0, -0.25]], gunDark, { y: 0.04, seg: 12 });
  for (const sx of [-1, 1]) for (const z of [-0.425, -0.395, -0.365])
    K.cyl(0.004, 0.004, 0.007, gunMid, sx * 0.022, 0.04, z, null, 8, 'x'); // telescoping tube stops
  K.slab([[-0.33, 0.08], [-0.47, 0.084], [-0.48, 0.08], [-0.48, -0.06], [-0.44, -0.065], [-0.37, -0.02], [-0.33, -0.01]], 0.08, gunOlive, { bevel: 0.016, segs: 3 });
  K.slab([[-0.504, 0.088], [-0.48, 0.088], [-0.48, -0.066], [-0.5, -0.072]], 0.086, gunRubber, { bevel: 0.008 });
  for (const sx of [-1, 1]) {
    K.slab([[-0.462, 0.06], [-0.359, 0.056], [-0.37, -0.009], [-0.45, -0.042]], 0.002, gunOlive, { x: sx * 0.048, bevel: 0.003 });
    bolt(K, gunDark, gunMid, sx * 0.05, 0.036, -0.452, 0.006);
  }
  for (const p of gun.children.slice(stockStart)) stock.add(p);
  gun.userData.fpStock = stock;
  // A2-style moulding on the same grip centre: one index-finger nub, shallow
  // lower grooves, a backstrap swell and a capped base. The 52 mm local width
  // is 36 mm at the launcher's game scale, so the glove can wrap the sides.
  const launcherGrip = (points) => gripShape(-0.05, -0.1, 0.16, 0.08, 0.3, points);
  K.slab(launcherGrip([
    [-0.08, 0.014], [0.06, 0.026], [0.28, 0.028], [0.37, 0.028], [0.43, 0.039],
    [0.51, 0.029], [0.7, 0.03], [0.9, 0.028], [1, 0.018], [1, -0.028],
    [0.8, -0.036], [0.5, -0.04], [0.2, -0.036], [0.04, -0.034], [-0.06, -0.043]
  ]), 0.052, gunPoly, { bevel: 0.009, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab(launcherGrip([[0.14, 0.014], [0.79, 0.016], [0.86, -0.024], [0.14, -0.026]]),
      0.004, gunRubber, { x: sx * 0.026, bevel: 0.002 });
    for (const y of [-0.091, -0.107, -0.123])
      K.box(0.0015, 0.002, 0.027, gunPoly, sx * 0.0284, y, -0.05, 0.25, 0, 0, null, 0.0005);
  }
  for (const u of [0.59, 0.76]) K.slab(launcherGrip([[u, 0.018], [u + 0.025, 0.019], [u + 0.025, 0.032], [u, 0.032]]),
    0.047, gunRubber, { bevel: 0.001 });
  K.slab(launcherGrip([[0.965, 0.025], [1.035, 0.022], [1.035, -0.033], [0.965, -0.035]]),
    0.054, gunDark, { bevel: 0.003 });
  K.slab(gunBand([[0.03, -0.058], [0.03, -0.088], [0.016, -0.096], [-0.01, -0.09]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire.
  K.slab([[0.0219, -0.062], [0.0173, -0.0725], [0.0179, -0.0788], [0.0223, -0.0832], [0.0177, -0.0888], [0.0101, -0.0832], [0.0067, -0.0715], [0.0101, -0.058]], 0.011, gunAccent, { bevel: 0.002 });
  // 6-chamber drum like a real M32/Milkor: cylinder axis along the bore (+z),
  // chambers parallel to the barrel, circular faces front/rear — not sideways.
  const drumHinge = new THREE.Group();
  drumHinge.position.set(-0.14, -0.02, 0.12);
  K.cyl(0.016, 0.016, 0.15, gunDark, -0.14, -0.02, 0.12, null, 12);
  K.box(0.14, 0.018, 0.026, gunMid, 0.07, 0, 0, 0, 0, 0, drumHinge, 0.004);
  const drumLatch = new THREE.Group();
  drumLatch.position.set(-0.076, 0.057, 0.043);
  K.box(0.031, 0.011, 0.064, gunDark, 0, 0, 0, 0, 0, 0, drumLatch, 0.003);
  K.cyl(0.007, 0.007, 0.035, gunAccent, 0, 0, -0.024, drumLatch, 10, 'x');
  gun.add(drumLatch);
  const drum = new THREE.Group();
  drum.position.set(0.14, 0, 0);
  K.cyl(0.018, 0.018, 0.14, gunMid, 0, 0, 0, drum, 8);
  part(THREE, launcherDrum(THREE), gunMid, drum);
  // The rim sits proud of the cap: coplanar flange/cap faces cause visible depth flicker.
  for (const sz of [-1, 1]) K.lathe([[0.125, sz * 0.0635 - 0.003], [0.143, sz * 0.0635 - 0.003], [0.143, sz * 0.0635 + 0.003], [0.125, sz * 0.0635 + 0.003], [0.125, sz * 0.0635 - 0.003]], gunDark, { parent: drum, seg: 36 });
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, x = Math.sin(a) * 0.075, y = Math.cos(a) * 0.075;
    K.lathe([[0.031, 0.065], [0.037, 0.065], [0.037, 0.070], [0.031, 0.070], [0.031, 0.065]],
      gunAccent, { x, y, parent: drum, seg: 16 }); // steel lips around the six open chamber mouths
  }
  const drumRounds = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const cx = Math.sin(ang) * 0.075, cy = Math.cos(ang) * 0.075;
    const round = new THREE.Group();
    K.cyl(0.0305, 0.0305, 0.006, gunDark, cx, cy, 0.026, round, 16);
    K.lathe([[0, 0.032], [0.025, 0.032], [0.025, 0.044], [0.024, 0.048], [0.020, 0.053], [0.012, 0.057], [0, 0.058]], gunOlive, { x: cx, y: cy, parent: round, seg: 16 });
    K.cyl(0.0255, 0.0255, 0.003, hazardYellow, cx, cy, 0.044, round, 16);
    drum.add(round);
    drumRounds.push(round);
    const fa = ang + Math.PI / 6;
    K.box(0.012, 0.004, 0.083, gunDark, Math.sin(fa) * 0.14, Math.cos(fa) * 0.14, 0, 0, 0, -fa, drum, 0.002);
    for (const z of [-0.043, 0.043]) K.box(0.016, 0.007, 0.01, gunAccent, Math.sin(fa) * 0.138, Math.cos(fa) * 0.138, z, 0, 0, -fa, drum, 0.001);
  }
  // A small rear winding key is reachable only after the cylinder swings out.
  const drumWinder = new THREE.Group();
  drumWinder.position.z = -0.071;
  K.cyl(0.011, 0.011, 0.014, gunAccent, 0, 0, 0, drumWinder, 12);
  K.box(0.042, 0.009, 0.009, gunDark, 0.019, 0, -0.003, 0, 0, 0, drumWinder, 0.003);
  drum.add(drumWinder);
  drumHinge.add(drum);
  gun.add(drumHinge);
  gun.userData.drum = drum;
  gun.userData.drumRounds = drumRounds;
  gun.userData.drumWinder = drumWinder;
  gun.userData.drumHinge = drumHinge;
  gun.userData.drumLatch = drumLatch;
  gun.userData.baseDrumHingeRot = drumHinge.rotation.clone();
  gun.userData.baseDrumHingePos = drumHinge.position.clone();
  gun.userData.baseDrumRot = drum.rotation.clone();
  gun.userData.baseDrumPos = drum.position.clone();
  gun.userData.mag = drumHinge;
  gun.userData.baseMagPos = drumHinge.position.clone();
  gun.userData.baseMagRot = drumHinge.rotation.clone();
  // One loose 40 mm round for the support palm during each loading trip. Its origin is the round's centre;
  // keep it as a hidden direct child so the first-person copy can move it independently of the drum.
  const loadRound = K.group(0, 0, 0);
  K.lathe([[0, -0.052], [0.025, -0.052], [0.027, -0.047], [0.027, -0.038],
    [0.025, -0.033], [0.025, 0.016], [0.022, 0.031], [0.014, 0.048], [0, 0.052]], gunOlive,
  { parent: loadRound, seg: 16 });
  K.cyl(0.0275, 0.0275, 0.005, gunAccent, 0, 0, -0.048, loadRound, 16);
  K.cyl(0.0255, 0.0255, 0.004, hazardYellow, 0, 0, -0.032, loadRound, 16);
  loadRound.visible = false;
  gun.userData.loadRound = loadRound;
  gun.userData.baseLoadRoundPos = loadRound.position.clone();
  gun.userData.baseLoadRoundRot = loadRound.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    loadRound: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: false,
      note: 'one loose grenade in the support palm, reused for each insertion' }
  });
  // Barrel shroud and original foregrip contact, with short accessory rails clear of the front sight.
  K.lathe([[0, 0.2], [0.052, 0.2], [0.052, 0.66], [0, 0.66]], gunAccent, { y: 0.04, seg: 16 });
  for (const x of [0.058, -0.058]) K.box(0.012, 0.03, 0.3, gunDark, x, 0.04, 0.42);
  K.box(0.03, 0.012, 0.3, gunDark, 0, -0.018, 0.42);
  K.box(0.045, 0.007, 0.22, gunDark, 0, 0.097, 0.515, 0, 0, 0, null, 0.002);
  for (let i = 0; i < 7; i++) K.box(0.049, 0.004, 0.01, gunMid, 0, 0.103, 0.42 + i * 0.03, 0, 0, 0, null, 0.001);
  for (const sx of [-1, 1]) {
    K.box(0.007, 0.022, 0.2, gunMid, sx * 0.068, 0.04, 0.505, 0, 0, 0, null, 0.002);
    for (let i = 0; i < 5; i++) K.box(0.003, 0.024, 0.01, gunDark, sx * 0.072, 0.04, 0.435 + i * 0.035, 0, 0, 0, null, 0.001);
  }
  K.slab([[0.395, -0.02], [0.445, -0.02], [0.44, -0.148], [0.43, -0.156], [0.405, -0.156], [0.398, -0.148]], 0.048, gunPoly, { bevel: 0.014, segs: 3 });
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) K.box(0.002, 0.006, 0.033, gunDark, sx * 0.033, -0.05 - i * 0.014, 0.419, 0, 0, 0, null, 0.001);
  K.lathe([[0, 0.65], [0.062, 0.65], [0.062, 0.68], [0.042, 0.682], [0.042, 0.672], [0, 0.672]], gunDark, { y: 0.04, seg: 16 });
  gunEffects(gun, new THREE.Vector3(0, 0.04, 0.72), 0.07, 3, 6, 0.006, 0xff9966, 0xff8844);
  gun.userData.laser.position.set(0, 0.04, 3.7);
  gun.userData.laserBaseZ = 0.72;
  gun.userData.barrelAssembly = null;
  return finishGun(gun);
}

export function makeFlamerModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, steelMat, brassMat, fuelRedMat, hazardYellow, gaugeFace, sightDotMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Angular sheet-metal case and inset blank service panels: no rail or lettering.
  K.slab([[-0.17, 0.076], [-0.17, -0.028], [-0.152, -0.035], [0.321, -0.035], [0.336, -0.022], [0.336, 0.078], [0.316, 0.095], [-0.142, 0.095]], 0.11, gunBody, { bevel: 0.007 });
  K.box(0.074, 0.0015, 0.28, gunMid, 0, 0.096, 0.076, 0, 0, 0, null, 0.002); // inset top service skin
  // Transverse pressed seams catch the light without changing the case silhouette.
  for (const z of [-0.112, 0.268]) K.box(0.083, 0.0018, 0.003, gunMid, 0, 0.096, z, 0, 0, 0, null, 0.001);
  for (const sx of [-1, 1]) {
    K.slab([[-0.133, -0.022], [0.272, -0.022], [0.284, -0.01], [0.284, 0.055], [0.266, 0.072], [-0.115, 0.072], [-0.133, 0.058]], 0.004, gunDark, { x: sx * 0.06, bevel: 0.003 });
    K.slab([[-0.12, -0.013], [0.27, -0.013], [0.273, -0.004], [0.273, 0.052], [0.26, 0.062], [-0.105, 0.062], [-0.12, 0.05]], 0.003, gunMid, { x: sx * 0.064, bevel: 0.002 });
    for (const [z, y] of [[-0.120, 0.050], [0.260, 0.050], [-0.120, -0.010], [0.260, -0.010], [-0.106, 0.047], [0.256, 0.047]]) bolt(K, gunDark, gunAccent, sx * 0.066, y, z, 0.0038);   // GB-297: corner bolts seated on the side panel face
  }
  K.lathe([[0, 0.29], [0.035, 0.29], [0.035, 0.71], [0, 0.71]], gunDark, { y: 0.05, seg: 12 });
  part(THREE, ventTube(THREE, 0.046, 0.004, 0.29, 6, 6, 0.44, 0.60), gunMid, gun, 0, 0.05, 0.375);
  for (const z of [0.371, 0.667]) K.lathe([[0.034, z - 0.007], [0.05, z - 0.007], [0.052, z - 0.004], [0.052, z + 0.004], [0.034, z + 0.007], [0.034, z - 0.007]], gunAccent, { y: 0.05, seg: 24 });
  // Nozzle: a thick flared bell, the igniter housing under it, the pilot light.
  K.lathe([[0.034, 0.69], [0.038, 0.69], [0.062, 0.786], [0.062, 0.792], [0.054, 0.792], [0.032, 0.705], [0.034, 0.69]], gunAccent, { y: 0.05, seg: 16 });
  K.box(0.03, 0.04, 0.08, gunDark, 0, 0.0, 0.7, 0, 0, 0, null, 0.01);
  K.cyl(0.004, 0.004, 0.05, steelMat, 0, 0.02, 0.73, null, 5, 'y');
  K.cyl(0.009, 0.009, 0.058, brassMat, 0, 0.01, 0.746, null, 8);
  K.cyl(0.005, 0.005, 0.015, steelMat, 0, 0.01, 0.78, null, 8);
  // GP-20044: the pilot sits below the bell, inside an open steel cage instead
  // of hidden in the bore. The sparker cable is clamped to the wand underside.
  for (const sx of [-1, 1]) {
    K.box(0.002, 0.024, 0.043, gunMid, sx * 0.017, -0.001, 0.702, 0, 0, 0, null, 0.001);
    K.box(0.002, 0.004, 0.024, brassMat, sx * 0.019, 0.002, 0.7, 0, 0, 0, null, 0.0005);
    rod(THREE, K, [sx * 0.018, -0.028, 0.735], [sx * 0.018, -0.028, 0.788], 0.0026, steelMat);
  }
  for (const z of [0.736, 0.786])
    K.lathe([[0.015, z - 0.002], [0.02, z - 0.002], [0.02, z + 0.002], [0.015, z + 0.002]], gunAccent, { y: -0.028, seg: 10 });
  for (let i = 0; i < 8; i++) {
    const pt = u => [0, -0.014 - Math.sin(Math.PI * u) * 0.007, 0.285 + 0.4 * u];
    rod(THREE, K, pt(i / 8), pt((i + 1) / 8), 0.0033, gunRubber);
  }
  for (const z of [0.37, 0.57]) K.box(0.018, 0.004, 0.01, gunMid, 0, -0.018, z, 0, 0, 0, null, 0.002);
  rod(THREE, K, [0, -0.018, 0.727], [0, -0.028, 0.766], 0.003, steelMat); // seated pilot electrode
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff6a10, emissiveIntensity: 1.6 }));
  pilot.position.set(0, -0.028, 0.766); gun.add(pilot);
  gun.userData.pilot = pilot.material;
  // Fuel tanks with domed ends shifted forward of the rear pistol grip/trigger so the grip is fully exposed:
  // straps, mounting brackets, manifold valves, connected front/rear hoses, and a pressure gauge.
  const tanks = K.group(0, 0, 0), tankStart = gun.children.length;
  const dome = (r, z0, z1) => [[0, z0], [r * 0.55, z0 + r * 0.06], [r * 0.85, z0 + r * 0.2], [r, z0 + r * 0.45], [r, z1 - r * 0.45], [r * 0.85, z1 - r * 0.2], [r * 0.55, z1 - r * 0.06], [0, z1]];
  K.lathe(dome(0.075, -0.048, 0.205), fuelRedMat, { y: -0.09, seg: 16 });
  K.lathe(dome(0.056, -0.038, 0.175), fuelRedMat, { x: 0.11, y: -0.05, seg: 14 });
  for (const z of [0.005, 0.14]) {
    // Upper saddle bracket bolting the tanks into the underside of the receiver housing.
    K.box(0.064, 0.032, 0.024, gunDark, 0.035, -0.036, z, 0, 0, 0, null, 0.003);
    for (const [x, y, r] of [[0, -0.09, 0.077], [0.11, -0.05, 0.058]]) {
      const outer = r + (x === 0 ? 0.008 : 0.007); // retain the old rounded strap's support envelope
      K.lathe([[r - 0.004, z - 0.012], [outer, z - 0.012], [outer, z + 0.012], [r - 0.004, z + 0.012], [r - 0.004, z - 0.012]], gunPoly, { x, y, seg: 24 });
      K.box(0.011, 0.03, 0.031, gunMid, x + r + 0.002, y, z, 0, 0, 0, null, 0.002);
      K.box(0.012, 0.018, 0.016, gunDark, x + r + 0.004, y, z, 0, 0, 0, null, 0.001);
      K.cyl(0.0032, 0.0032, 0.002, steelMat, x + r + 0.006, y, z, null, 8, 'x');
    }
  }
  // Front tank valves and receiver feed manifold block (connecting both front tank outlets into the receiver body).
  K.box(0.058, 0.028, 0.044, gunDark, 0.02, -0.034, 0.215, 0, 0, 0, null, 0.004);
  K.cyl(0.028, 0.028, 0.026, gunDark, 0, -0.09, 0.212, null, 10);
  K.cyl(0.013, 0.013, 0.018, brassMat, 0, -0.09, 0.228, null, 8);
  K.cyl(0.013, 0.013, 0.016, brassMat, 0, -0.044, 0.218, null, 8, 'y');
  for (let i = 0; i < 8; i++) {
    const u0 = i / 8, u1 = (i + 1) / 8;
    const pt = (u) => [0, -0.09 + 0.046 * Math.pow(u, 1.2), 0.228 + Math.sin(u * Math.PI) * 0.016 - 0.01 * u];
    rod(THREE, K, pt(u0), pt(u1), 0.0095, gunRubber);
  }
  // Side tank front valve, yellow regulator handwheel, and connected high-pressure feed hose into the receiver manifold.
  K.cyl(0.022, 0.022, 0.028, gunDark, 0.11, -0.05, 0.184, null, 10);
  K.cyl(0.01, 0.01, 0.034, steelMat, 0.11, -0.05, 0.206, null, 6);
  K.cyl(0.028, 0.012, 0.012, hazardYellow, 0.11, -0.05, 0.224, null, 10);          // valve wheel
  K.cyl(0.008, 0.008, 0.014, gunDark, 0.11, -0.05, 0.232, null, 8);
  for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2])
    rod(THREE, K, [0.11 + 0.009 * Math.cos(a), -0.05 + 0.009 * Math.sin(a), 0.231],
      [0.11 + 0.022 * Math.cos(a), -0.05 + 0.022 * Math.sin(a), 0.231], 0.0025, gunDark);
  K.cyl(0.012, 0.012, 0.016, brassMat, 0.098, -0.042, 0.196, null, 8, 'x');
  K.cyl(0.012, 0.012, 0.016, brassMat, 0.048, -0.034, 0.215, null, 8, 'x');
  for (let i = 0; i < 8; i++) {
    const u0 = i / 8, u1 = (i + 1) / 8;
    const pt = (u) => [
      0.098 - 0.05 * u + Math.sin(u * Math.PI) * 0.008,
      -0.042 + 0.008 * u + Math.sin(u * Math.PI) * 0.01,
      0.196 + 0.019 * u + Math.sin(u * Math.PI) * 0.014
    ];
    rod(THREE, K, pt(u0), pt(u1), 0.0085, gunRubber);
  }
  // Tank-mounted gauge on the exposed left flank, clear of the receiver panel.
  K.box(0.027, 0.018, 0.018, gunDark, -0.075, -0.065, 0.076, 0, 0, 0, null, 0.003);
  K.cyl(0.027, 0.027, 0.014, steelMat, -0.088, -0.065, 0.076, null, 12, 'x');
  K.disc(0.022, gaugeFace, -0.096, -0.065, 0.076, -Math.PI / 2, null, 12);
  for (const a of [-2.3, -1.75, -1.2, -0.65, -0.1])
    rod(THREE, K, [-0.097, -0.065 + 0.015 * Math.cos(a), 0.076 + 0.015 * Math.sin(a)],
      [-0.097, -0.065 + 0.019 * Math.cos(a), 0.076 + 0.019 * Math.sin(a)], 0.0012, gunDark);
  rod(THREE, K, [-0.098, -0.065, 0.076], [-0.098, -0.057, 0.088], 0.0017, sightDotMat);
  K.cyl(0.0023, 0.0023, 0.001, gunDark, -0.0965, -0.065, 0.076, null, 8, 'x');
  // Rear hose loop from the rear receiver bulkhead Fitting (z = -0.17) out to z = -0.262 and forward into the side tank rear dome (z = -0.038).
  K.cyl(0.02, 0.02, 0.018, gunDark, 0, 0.044, -0.168, null, 8);
  K.cyl(0.015, 0.015, 0.024, brassMat, 0, 0.044, -0.178, null, 8);
  K.cyl(0.022, 0.022, 0.026, gunDark, 0.11, -0.05, -0.042, null, 10);
  K.cyl(0.015, 0.015, 0.024, brassMat, 0.11, -0.05, -0.056, null, 8);
  for (const [x, y, z] of [[0, 0.044, -0.188], [0.11, -0.05, -0.066]]) {
    K.cyl(0.016, 0.016, 0.008, gunMid, x, y, z, null, 10);
    K.cyl(0.013, 0.013, 0.004, brassMat, x, y, z - 0.005, null, 10);
  }
  for (let i = 0; i < 18; i++) {
    const point = (u) => [
      0.11 * Math.pow(u, 0.85),
      -0.003 + Math.cos(u * Math.PI) * 0.047,
      -0.177 * (1 - u) - 0.056 * u - Math.sin(u * Math.PI) * 0.145
    ];
    rod(THREE, K, point(i / 18), point((i + 1) / 18), 0.011, gunRubber);
  }
  // Crossover manifold line connecting the side tank rear boss to the main tank rear dome.
  K.cyl(0.022, 0.022, 0.024, gunDark, 0.018, -0.09, -0.05, null, 10);
  K.cyl(0.013, 0.013, 0.02, brassMat, 0.018, -0.09, -0.062, null, 8);
  for (let i = 0; i < 8; i++) {
    const u0 = i / 8, u1 = (i + 1) / 8;
    const pt = (u) => [0.018 + 0.092 * u, -0.09 + 0.04 * u, -0.062 + 0.006 * u - Math.sin(u * Math.PI) * 0.022];
    rod(THREE, K, pt(u0), pt(u1), 0.0085, gunRubber);
  }
  for (const part of gun.children.slice(tankStart)) tanks.add(part);
  gun.userData.mag = tanks;
  gun.userData.baseMagPos = tanks.position.clone();
  gun.userData.baseMagRot = tanks.rotation.clone();
  // GB-302: the reload's moving can (off/on). Same group as mag; Claude drives fuelCan.
  gun.userData.fuelCan = tanks;
  gun.userData.baseFuelCanPos = tanks.position.clone();
  gun.userData.baseFuelCanRot = tanks.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    fuelCan: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: true, note: 'whole tank bank; pull down/away, fresh on with a twist' }
  });
  // Rear pistol grip (now completely clear of the fuel tanks!), grip housing mount, closed trigger guard, and curved trigger.
  K.box(0.054, 0.024, 0.115, gunDark, 0, -0.034, -0.125, 0, 0, 0, null, 0.004);
  // Narrow the palm swell to 36 x 59 mm without moving the grip's centre or rake.
  // The moulded finger notches stay in the front edge; rubber side panels carry
  // shallow cross ribs so neither close-up face is an empty rectangle.
  const rearGrip = (outline) => outline.map(([z, y]) => [-0.16 + (z + 0.16) * 0.65, y]);
  K.slab(rearGrip([
    [-0.195, -0.032], [-0.122, -0.032], [-0.126, -0.062], [-0.118, -0.082],
    [-0.128, -0.105], [-0.122, -0.126], [-0.132, -0.148], [-0.142, -0.162],
    [-0.196, -0.158], [-0.208, -0.142], [-0.192, -0.092], [-0.202, -0.052]
  ]), 0.036, gunPoly, { bevel: 0.008, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab(rearGrip([[-0.186, -0.052], [-0.136, -0.052], [-0.144, -0.144], [-0.19, -0.142]]),
      0.003, gunRubber, { x: sx * 0.018, bevel: 0.002 });
    for (const y of [-0.078, -0.101, -0.124])
      K.box(0.0015, 0.0025, 0.025, gunPoly, sx * 0.0195, y, -0.16, 0.22, 0, 0, null, 0.0005);
  }
  K.box(0.04, 0.012, 0.05, gunDark, 0, -0.162, -0.165, 0, 0, -0.06, null, 0.003);
  K.slab(gunBand([[-0.064, -0.034], [-0.064, -0.064], [-0.078, -0.076], [-0.128, -0.076], [-0.132, -0.062]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire, moved to mid-guard.
  K.slab([[-0.088, -0.0357], [-0.0927, -0.0484], [-0.092, -0.056], [-0.0875, -0.0615], [-0.0925, -0.0665], [-0.1, -0.06], [-0.1033, -0.0476], [-0.1, -0.0323]], 0.011, gunAccent, { bevel: 0.002 });
  // Ergonomic angled front pistol foregrip with upper collar, finger grooves, side panels, and flared baseplate.
  K.box(0.056, 0.018, 0.068, gunDark, 0, -0.034, 0.282, 0, 0, 0, null, 0.003);
  // 36 mm wide, round-ended and 56 mm deep at the support palm. The socket
  // remains (0,-0.07,0.28); the glove can close over the grooves on the front.
  const frontGrip = (outline) => outline.map(([z, y]) => [0.28 + (z - 0.28) * 0.8, y]);
  K.slab(frontGrip([
    [0.252, -0.032], [0.312, -0.032], [0.304, -0.058], [0.31, -0.078],
    [0.302, -0.098], [0.307, -0.116], [0.296, -0.134], [0.25, -0.132],
    [0.242, -0.116], [0.254, -0.078], [0.246, -0.048]
  ]), 0.036, gunPoly, { bevel: 0.01, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab(frontGrip([[0.258, -0.048], [0.296, -0.048], [0.29, -0.12], [0.252, -0.118]]),
      0.003, gunRubber, { x: sx * 0.018, bevel: 0.002 });
    for (const y of [-0.067, -0.087, -0.107])
      K.box(0.0015, 0.0025, 0.022, gunPoly, sx * 0.0195, y, 0.28, -0.18, 0, 0, null, 0.0005);
  }
  K.box(0.04, 0.011, 0.047, gunDark, 0, -0.135, 0.275, 0, 0, 0, null, 0.003);
  gun.userData.muzzleLocal = new THREE.Vector3(0, 0.05, 0.78);
  return finishGun(gun);
}

export function makeChainsawModel(ctx) {
  const { THREE, gunKit, gunArc, gunBand, gripOutline, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, steelMat, hazardYellow, bladeMat, layoutChainsawChain } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Engine body (glows when the saw runs hot) under a moulded top cover with vents.
  const bodyMat = gunBody.clone();
  bodyMat.color.setHex(0xa85225);
  bodyMat.emissive = new THREE.Color(0xff6611);
  bodyMat.emissiveIntensity = 0;
  const coverMat = bodyMat.clone();
  coverMat.color.setHex(0xc66b2e);
  const barMat = steelMat.clone();
  barMat.color.setHex(0xb1b9b2);
  barMat.roughness = 0.55;
  K.slab([[-0.27, 0.105], [-0.28, 0.083], [-0.28, -0.024], [-0.248, -0.06], [0.088, -0.06], [0.11, -0.038], [0.11, 0.112], [0.09, 0.14], [-0.24, 0.14]], 0.24, bodyMat, { bevel: 0.012, segs: 3 });
  // Orange cowling steps down at the front, leaving a clear grip over the engine.
  K.slab([[-0.25, 0.132], [0.073, 0.132], [0.073, 0.148], [-0.01, 0.154], [-0.03, 0.177], [-0.214, 0.18], [-0.25, 0.155]], 0.22, coverMat, { bevel: 0.010, segs: 3 });
  for (let i = 0; i < 4; i++) K.box(0.135, 0.008, 0.012, gunDark, 0, 0.18, -0.193 + i * 0.04, 0, 0, 0, null, 0.002);
  // Recessed air intake and service seam break up the broad moulded top.
  K.box(0.105, 0.003, 0.045, gunMid, 0.035, 0.181, -0.198, 0, 0, 0, null, 0.006);
  for (let i = 0; i < 4; i++) K.box(0.008, 0.004, 0.035, gunDark, -0.003 + i * 0.022, 0.184, -0.198, 0, 0, 0, null, 0.002);
  // Clutch/recoil housings follow the engine contour and meet the orange cowling.
  for (const sx of [-1, 1]) {
    K.slab([[-0.251, -0.035], [-0.251, 0.112], [-0.233, 0.127], [0.071, 0.127], [0.09, 0.108], [0.09, -0.035]], 0.012, gunMid, { x: sx * 0.13, bevel: 0.005 });
    K.slab([[-0.243, -0.027], [-0.243, 0.106], [-0.225, 0.117], [0.067, 0.117], [0.078, 0.10], [0.078, -0.027]], 0.009, bodyMat, { x: sx * 0.139, bevel: 0.004 });
    for (const [z, y] of [[-0.227, 0.101], [0.06, 0.1], [-0.226, -0.012], [0.058, -0.012]]) bolt(K, gunDark, gunAccent, sx * 0.1455, y, z, 0.0055);   // GB-297: seated on the outer cowling face (x 0.1435)
    K.box(0.012, 0.068, 0.064, gunDark, sx * 0.15, 0.004, -0.195, 0, 0, 0, null, 0.009);
    for (let i = 0; i < 5; i++) K.box(0.014, 0.004, 0.058, gunMid, sx * 0.152, -0.018 + i * 0.011, -0.195, 0, 0, 0, null, 0.001);
  }
  // Exhaust muffler with a dark vent, fuel and oil caps, spark-plug boot at rear of cowling.
  K.box(0.05, 0.09, 0.1, gunDark, 0.14, 0.02, 0.05, 0, 0, 0, null, 0.012);
  for (let i = 0; i < 3; i++) K.box(0.006, 0.05, 0.012, gunRubber, 0.166, 0.02, 0.025 + i * 0.022);
  K.box(0.005, 0.038, 0.068, steelMat, 0.17, 0.018, 0.05, 0, 0, 0, null, 0.004);
  for (const z of [0.026, 0.074]) bolt(K, gunDark, gunAccent, 0.172, 0.032, z, 0.005);
  // Circular recoil-starter cover and radial breathing slots, clear of the animated pull handle.
  K.cyl(0.063, 0.063, 0.012, gunMid, 0.15, 0.047, -0.085, null, 16, 'x');
  K.cyl(0.051, 0.051, 0.014, coverMat, 0.159, 0.047, -0.085, null, 16, 'x');
  K.cyl(0.016, 0.016, 0.016, gunDark, 0.169, 0.047, -0.085, null, 12, 'x');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    K.box(0.003, 0.004, 0.018, gunDark, 0.169, 0.047 + Math.sin(a) * 0.034, -0.085 + Math.cos(a) * 0.034, a, 0, 0, null, 0.001);
  }
  // Removable filter cover and thumb knob on the opposite side of the engine.
  K.box(0.012, 0.082, 0.082, gunMid, -0.151, 0.053, -0.09, 0, 0, 0, null, 0.009);
  K.box(0.008, 0.068, 0.067, coverMat, -0.16, 0.053, -0.09, 0, 0, 0, null, 0.007);
  for (let i = 0; i < 3; i++) K.box(0.003, 0.004, 0.045, gunDark, -0.165, 0.029 + i * 0.022, -0.09, 0, 0, 0, null, 0.001);
  K.cyl(0.009, 0.009, 0.01, gunRubber, -0.17, 0.079, -0.064, null, 10, 'x');
  // GB-302: fuel cap is a named part Claude can unscrew during the gas refill.
  const fuelCap = K.group(-0.12, 0.1, -0.15);
  K.cyl(0.025, 0.025, 0.02, gunRubber, 0, 0, 0, fuelCap, 10, 'x');
  K.cyl(0.012, 0.012, 0.008, gunAccent, 0.012, 0, 0, fuelCap, 8, 'x');
  gun.userData.fuelCap = fuelCap;
  gun.userData.baseFuelCapPos = fuelCap.position.clone();
  gun.userData.baseFuelCapRot = fuelCap.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    fuelCap: { restPos: [-0.12, 0.1, -0.15], restRot: [0, 0, 0], visibleAtRest: true, note: 'unscrew, pour, screw back' }
  });
  K.cyl(0.02, 0.02, 0.02, gunRubber, -0.12, 0.02, -0.03, null, 10, 'x');
  K.box(0.028, 0.024, 0.036, gunRubber, 0.045, 0.168, -0.232, -0.35, 0, 0, null, 0.008);
  // Rear throttle grip is in line with the bar, beyond the engine housing.
  K.slab(gunBand([[-0.245, 0.08], [-0.445, 0.08], [-0.49, 0.025], [-0.49, -0.095], [-0.27, -0.095]], 0.014), 0.07, gunPoly, { bevel: 0.007 });
  K.box(0.074, 0.13, 0.055, gunRubber, 0, -0.014, -0.46, 0, 0, 0, null, 0.012);
  for (let i = 0; i < 5; i++) K.box(0.076, 0.007, 0.058, gunPoly, 0, -0.064 + i * 0.024, -0.46, 0, 0, 0, null, 0.002);
  K.slab(gunBand([[-0.393, 0.045], [-0.375, 0.01], [-0.365, -0.03]], 0.006), 0.022, hazardYellow, { bevel: 0.002 });
  K.slab(gunBand([[-0.395, 0.062], [-0.34, 0.06], [-0.326, -0.065], [-0.42, -0.069]], 0.006), 0.033, gunDark, { bevel: 0.003 });
  K.box(0.072, 0.02, 0.04, gunAccent, 0, 0.085, -0.445, 0, 0, 0, null, 0.004);
  K.box(0.05, 0.009, 0.027, gunDark, 0, 0.101, -0.444, 0, 0, 0, null, 0.003); // throttle lock paddle
  // The front hoop crosses the top grip and descends on the left side of the body.
  const hoop = [[-0.15, 0.018, -0.14], [-0.15, 0.115, -0.13], [-0.14, 0.218, -0.085], [-0.08, 0.246, -0.035], [0.06, 0.246, -0.035], [0.13, 0.216, 0.018], [0.13, 0.027, 0.055]];
  for (let i = 0; i < hoop.length - 1; i++) rod(THREE, K, hoop[i], hoop[i + 1], 0.014, gunDark);
  K.cyl(0.018, 0.018, 0.132, gunRubber, -0.01, 0.246, -0.035, null, 14, 'x');
  for (let i = -2; i <= 2; i++) K.cyl(0.02, 0.02, 0.008, gunPoly, -0.01 + i * 0.025, 0.246, -0.035, null, 14, 'x');
  for (const [x, y, z] of [hoop[0], hoop[hoop.length - 1]]) K.box(0.032, 0.035, 0.04, gunPoly, x, y, z, 0, 0, 0, null, 0.006);
  // Front hand guard stands ahead of the support hand, before the chain root.
  K.slab([[0.075, 0.055], [0.102, 0.055], [0.135, 0.219], [0.109, 0.225]], 0.16, gunMid, { bevel: 0.007 });
  for (const sx of [-1, 1]) {
    K.cyl(0.012, 0.012, 0.008, gunDark, sx * 0.083, 0.075, 0.104, null, 10, 'x');
    bolt(K, gunDark, gunAccent, sx * 0.089, 0.075, 0.104, 0.005);
    rod(THREE, K, [sx * 0.074, 0.078, 0.106], [sx * 0.074, 0.187, 0.123], 0.004, steelMat);
  }
  // GB-180 pass 6 (vs a real saw: toothed bucking spikes at the bar root, a chain catcher under it): both added.
  // GB-180 pass 7 (the pass-6 spikes read as a dark clump under the bar): steel spike plates flat on the housing face,
  // either side of the bar, three big forward teeth each.
  for (const sx of [-1, 1]) K.slab([[0.104, -0.034], [0.13, -0.034], [0.165, -0.012], [0.13, 0.004], [0.165, 0.026], [0.13, 0.042], [0.165, 0.064], [0.13, 0.08], [0.104, 0.09]], 0.01, steelMat, { x: sx * 0.1, bevel: 0.002 });
  K.slab([[0.09, -0.06], [0.13, -0.06], [0.135, -0.075], [0.09, -0.078]], 0.04, gunDark, { bevel: 0.004 });   // chain catcher
  // Pull cord and its T-handle.
  K.cyl(0.012, 0.012, 0.06, gunDark, 0.14, 0.12, -0.22, null, 6, 'x');
  const starter = new THREE.Group();
  starter.position.set(0.19, 0.12, -0.22);
  const SK = gunKit(starter);
  SK.sph(0.018, gunMid, 0.01, 0, 0, null, 8);
  SK.box(0.025, 0.025, 0.085, gunPoly, 0, 0, 0, 0, 0, 0, null, 0.005);
  gun.add(starter);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 6), gunDark);
  cord.scale.set(1, 0.001, 1); // Keep the hidden starter cord out of static model bounds; the pull pose sets its length.
  cord.visible = false;
  gun.add(cord);
  gun.userData.starterHandle = starter;
  gun.userData.starterCord = cord;
  gun.userData.starterHome = starter.position.clone();
  gun.userData.starterExit = new THREE.Vector3(0.16, 0.12, -0.22);
  // Guide bar: the plate with its round nose, the inner plate, rivets, bar-stud nuts, the sprocket.
  K.slab([[0.06, -0.01], ...gunArc(0.88, 0.04, 0.05, -Math.PI / 2, Math.PI / 2, 8), [0.06, 0.09]], 0.032, barMat, { bevel: 0.006 });
  for (const sx of [-1, 1]) {
    K.slab([[0.14, 0.004], [0.848, 0.004], ...gunArc(0.874, 0.04, 0.036, -Math.PI / 2, Math.PI / 2, 8), [0.14, 0.076]], 0.003, barMat, { x: sx * 0.019, bevel: 0.001 });
    for (const z of [0.25, 0.67]) K.box(0.003, 0.014, 0.11, gunDark, sx * 0.0215, 0.04, z, 0, 0, 0, null, 0.006);
    for (const z of [0.14, 0.185]) {
      K.cyl(0.012, 0.012, 0.003, gunDark, sx * 0.024, 0.04, z, null, 10, 'x');
      bolt(K, gunDark, gunAccent, sx * 0.027, 0.04, z, 0.008);
    }
    for (const y of [0.006, 0.074]) for (let i = 0; i < 22; i++) K.cyl(0.0028, 0.0028, 0.002, steelMat, sx * 0.022, y, 0.155 + i * 0.032, null, 6, 'x');
  }
  for (const z of [0.1, 0.16]) K.cyl(0.014, 0.014, 0.05, gunDark, 0, 0.04, z, null, 6, 'x');
  K.cyl(0.05, 0.05, 0.03, gunDark, 0, 0.04, 0.90, null, 14, 'x');
  K.cyl(0.02, 0.02, 0.034, steelMat, 0, 0.04, 0.90, null, 8, 'x');
  // Chain teeth ride a racetrack path around the guide-bar perimeter (YZ plane).
  // Do NOT rigid-spin this group — advanceChainsawChain moves each tooth along the path.
  const chainGroup = new THREE.Group();
  chainGroup.position.set(0, 0.04, 0.48);
  const toothCount = 22;
  const chainTeeth = [];
  // GP-20051/J31: tall angled cutter crowns break the bar's outline at the
  // normal sheet scale; bright steel separates them from the grey guide bar.
  const toothPrototype = K.slab([[-0.016, -0.011], [0.013, -0.011], [0.016, 0.001], [0.008, 0.019], [-0.001, 0.014], [-0.004, 0.002], [-0.016, 0.002]], 0.053, steelMat, { bevel: 0.001, segs: 1 });
  gun.remove(toothPrototype);
  for (let i = 0; i < toothCount; i++) {
    // GB-189: teeth are transform-only nodes; one InstancedMesh draws all of them.
    const tooth = new THREE.Object3D();
    chainGroup.add(tooth);
    chainTeeth.push(tooth);
  }
  const chainInst = new THREE.InstancedMesh(toothPrototype.geometry, steelMat, toothCount);
  chainInst.castShadow = chainInst.receiveShadow = true;
  chainInst.frustumCulled = false;
  chainGroup.add(chainInst);
  gun.userData.chainInst = chainInst;
  gun.add(chainGroup);
  gun.userData.bladeSpin = chainGroup; // kept for callers; rotation is never used for chain motion
  gun.userData.chainGroup = chainGroup;
  gun.userData.chainTeeth = chainTeeth;
  gun.userData.chainPhase = 0;
  layoutChainsawChain(gun);
  // The inspector supplies only the transform nodes; seed the instance buffer
  // here too so a static sheet sees the same cutters the running game updates.
  for (let i = 0; i < toothCount; i++) {
    chainTeeth[i].updateMatrix();
    chainInst.setMatrixAt(i, chainTeeth[i].matrix);
  }
  chainInst.instanceMatrix.needsUpdate = true;
  gun.userData.heatMat = bodyMat;
  gun.userData.flash = null;
  gun.userData.flashLight = null;
  gun.userData.laser = null;
  gun.userData.barrelAssembly = null;
  gun.userData.muzzleLocal = new THREE.Vector3(0, 0.04, 0.94);
  return finishGun(gun);
}

export function makeMortarModel(ctx, matOverride = null, collapsed = false) {
  const { THREE, gunKit, finishGun, gunMetal, gunDark, gunMid, gunRubber, gunOlive, steelMat, gaugeFace } = ctx;
  const root = new THREE.Group();
  // The parts below were authored with the muzzle leaning toward -Z, while
  // everything that aims or crews the mortar treats +Z as its front: the tube ended
  // up pointing back at the marine standing behind it. Turned round as one piece.
  const g = new THREE.Group();
  if (!collapsed) g.rotation.y = Math.PI;
  root.add(g);
  const K = gunKit(g), material = (m) => matOverride || m;
  const steel = matOverride || new THREE.MeshStandardMaterial({ color: 0x3e4a3a, metalness: 0.08, roughness: 0.7 });   // GB-233: painted
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 12), steel);
  if (collapsed) { plate.position.set(0, 0.16, -0.1); plate.rotation.x = Math.PI / 2; }
  else plate.position.set(0, 0.04, 0.5);
  g.add(plate);
  const plateDetail = K.group(0, 0, 0, plate);
  // Pressed circular baseplate: raised radial webs and a low rolled outer edge.
  K.cyl(0.11, 0.125, 0.032, steel, 0, 0.041, 0, plateDetail, 16, 'y');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    K.box(0.015, 0.017, 0.295, steel, Math.sin(a) * 0.244, 0.045, Math.cos(a) * 0.244, 0, a, 0, plateDetail, 0.003);
  }
  K.tor(0.421, 0.009, steel, 0, 0.029, 0, Math.PI / 2, 0, 0, plateDetail, Math.PI * 2, 32);
  for (const sx of [-1, 1]) {
    const z = sx * 0.285;
    rod(THREE, K, [-0.074, 0.042, z], [-0.067, 0.087, z], 0.009, steel, plateDetail);
    rod(THREE, K, [0.074, 0.042, z], [0.067, 0.087, z], 0.009, steel, plateDetail);
    rod(THREE, K, [-0.067, 0.087, z], [0.067, 0.087, z], 0.009, steel, plateDetail);
  }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.25, 12, 1, true), matOverride || gunOlive);   // GB-233: matte olive phosphate
  const boreMat = (matOverride || gunDark).clone(); boreMat.side = THREE.BackSide;
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.102, 1.22, 12, 1, true), boreMat);
  const lip = new THREE.Mesh(new THREE.RingGeometry(0.083, 0.11, 12), matOverride || gunMetal);
  lip.rotation.x = -Math.PI / 2; lip.position.y = 0.626; tube.add(bore, lip);
  const breech = new THREE.Mesh(new THREE.CircleGeometry(0.102, 12), matOverride || gunDark);
  breech.rotation.x = -Math.PI / 2; breech.position.y = -0.59; tube.add(breech);
  if (collapsed) { tube.position.set(0, 0.62, 0); tube.rotation.x = 0; }
  else { tube.position.set(0, 0.62, 0.18); tube.rotation.x = -0.72; }
  tube.castShadow = true;
  g.add(tube);
  g.userData.tube = tube;
  const tubeDetail = K.group(0, 0, 0, tube);
  for (const [y, radius, length] of [[0.58, 0.128, 0.07], [-0.547, collapsed ? 0.129 : 0.134, 0.045]]) {   // GB-180: a heavier muzzle band
    const inner = y > 0 ? 0.108 : 0.127, a = y - length / 2, b = y + length / 2;
    K.lathe([[inner, a], [radius, a], [radius, b], [inner, b], [inner, a]], material(gunMetal), { rx: -Math.PI / 2, parent: tubeDetail, seg: 24 });
  }
  // Hollow lip is preserved above; collars stop short of it and never cap the bore.
  K.tor(0.1115, 0.0035, material(gunMid), 0, 0.613, 0, Math.PI / 2, 0, 0, tubeDetail, Math.PI * 2, 24);
  // GB-180 pass 6 (vs a real 81 mm tube: a heavy muzzle band and finned breech): five cooling fins round the breech end.
  if (!collapsed) for (let i = 0; i < 5; i++) { const y = -0.47 + i * 0.045; K.lathe([[0.126, y - 0.008], [0.155, y - 0.008], [0.155, y + 0.008], [0.126, y + 0.008], [0.126, y - 0.008]], material(gunMetal), { rx: -Math.PI / 2, parent: tubeDetail, seg: 24 }); }
  const clampR = collapsed ? 0.128 : 0.139;
  K.lathe([[0.117, 0.104], [clampR - 0.005, 0.104], [clampR, 0.11], [clampR, 0.15], [clampR - 0.005, 0.156], [0.117, 0.156], [0.117, 0.104]], steel, { rx: -Math.PI / 2, parent: tubeDetail, seg: 24 });
  for (const sx of [-1, 1]) {
    K.box(0.034, 0.1, 0.088, steel, sx * 0.137, 0.13, 0, 0, 0, 0, tubeDetail, 0.01);
    bolt(K, material(gunDark), material(steelMat), sx * 0.16, 0.13, 0, 0.016, tubeDetail);
  }
  // Optical level and elevation wheel are mounted on the tube clamp, so they follow its aim.
  K.box(0.038, 0.105, 0.034, steel, -0.135, 0.246, 0, 0, 0, 0, tubeDetail, 0.006);
  K.cyl(0.012, 0.012, 0.043, material(gunDark), -0.135, 0.269, 0, tubeDetail, 10, 'x');
  K.disc(0.0085, material(gaugeFace), -0.159, 0.269, 0, -Math.PI / 2, tubeDetail, 12);
  K.cyl(0.018, 0.018, 0.103, steel, 0.177, 0.102, 0, tubeDetail, 12, 'x');
  K.tor(0.059, 0.007, steel, 0.232, 0.102, 0, 0, Math.PI / 2, 0, tubeDetail, Math.PI * 2, 20);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    rod(THREE, K, [0.232, 0.102, 0], [0.232, 0.102 + Math.cos(a) * 0.057, Math.sin(a) * 0.057], 0.005, steel, tubeDetail);
  }
  K.cyl(0.008, 0.008, 0.029, material(gunRubber), 0.248, 0.151, 0.019, tubeDetail, 10, 'x');
  const bipod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), steel);
  if (collapsed) { bipod.position.set(0.14, 0.62, 0.02); bipod.rotation.set(0, 0, 0); }
  else { bipod.position.set(0.3, 0.45, -0.25); bipod.rotation.z = 0.5; bipod.rotation.x = 0.35; }
  g.add(bipod);
  const bipod2 = bipod.clone();
  bipod2.position.x = -bipod.position.x;
  if (!collapsed) bipod2.rotation.z = -0.5;
  g.add(bipod2);
  for (const leg of [bipod, bipod2]) {
    const legDetail = K.group(0, 0, 0, leg);
    for (const y of [-0.29, 0.30]) K.cyl(0.037, 0.037, 0.026, steel, 0, y, 0, legDetail, 12, 'y');
    K.cyl(0.036, 0.04, 0.062, steel, 0, -0.398, 0, legDetail, 12, 'y');
    K.cyl(0.04, 0.032, 0.022, steel, 0, -0.435, 0, legDetail, 16, 'y');
    K.box(0.025, 0.042, 0.044, steel, 0.028, -0.288, 0, 0, 0, 0, legDetail, 0.004);
    bolt(K, material(gunDark), material(steelMat), 0.043, -0.288, 0, 0.007, legDetail);
  }
  if (!collapsed) {
    const joint = new THREE.Vector3(0, 0.82, 0), up = new THREE.Vector3(0, 1, 0);
    for (const [leg, sx] of [[bipod, 1], [bipod2, -1]]) {
      const foot = new THREE.Vector3(sx * 0.35, 0.035, -0.32), delta = joint.clone().sub(foot);
      leg.position.copy(foot).add(joint).multiplyScalar(0.5);
      leg.quaternion.setFromUnitVectors(up, delta.clone().normalize());
      leg.scale.y = delta.length() / 0.9;
    }
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 6), steel);
    cup.position.set(0, 0.11, 0.59); g.add(cup);
    K.cyl(0.031, 0.031, 0.24, steel, 0, 0.82, 0, null, 12, 'x');
    K.box(0.14, 0.07, 0.054, steel, 0, 0.77, 0, 0, 0, 0, null, 0.007);
    for (const sx of [-1, 1]) {
      bolt(K, material(gunDark), material(steelMat), sx * 0.126, 0.82, 0, 0.021);
      rod(THREE, K, [sx * 0.16, 0.47, -0.14], [0, 0.4, -0.17], 0.013, steel);
    }
  } else {
    // Two closed webbing wraps bind the folded bipod and baseplate to the upright tube.
    for (const y of [0.30, 0.92]) {
      K.box(0.34, 0.033, 0.006, material(gunOlive), 0, y, 0.125, 0, 0, 0, null, 0.002);
      K.box(0.34, 0.033, 0.006, material(gunOlive), 0, y, -0.136, 0, 0, 0, null, 0.002);
      for (const sx of [-1, 1]) K.box(0.012, 0.033, 0.26, material(gunOlive), sx * 0.166, y, -0.0055, 0, 0, 0, null, 0.002);
      K.box(0.046, 0.038, 0.002, material(gunMid), 0.108, y, 0.128, 0, 0, 0, null, 0.0005);
      K.box(0.028, 0.023, 0.002, material(gunOlive), 0.108, y, 0.129, 0, 0, 0, null, 0.0005);
    }
  }
  root.userData.tube = g.userData.tube;
  // The plate and legs have no animated contracts. Bake their fixed decoration into
  // the common frame, so the added castings do not add a draw call for every leg.
  const fixed = [];
  for (const branch of g.children.slice()) if (branch !== tube) branch.traverse(o => { if (o.isMesh) fixed.push(o); });
  for (const mesh of fixed) g.attach(mesh);
  for (const mesh of fixed) for (const child of mesh.children.slice()) if (child.isGroup && child.children.length === 0) mesh.remove(child);
  return finishGun(root);
}

export function makeM240Model(ctx, folded = false) {
  const { THREE, gunKit, gunBand, gripOutline, finishGun, gunBody, gunDark, gunMid, gunAccent, gunPoly, gunRubber, brassMat, gunOlive, M240_PIVOT } = ctx;
  const g = new THREE.Group();
  const K = gunKit(g);
  // CU-81: a tripod with a traversing head, and an M240B on its cradle: the receiver and feed cover with its
  // rail, the butt stock and grip, the barrel with its carry handle, gas tube and flash hider, and the belt
  // feeding from an ammo can on the left. The barrel is userData.barrel (not .tube, which the mortar's aim tips).
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    const foot = folded ? new THREE.Vector3([-0.035, 0.035, 0][i], 0.66 + (i === 2 ? -0.03 : 0), 0.62)
      : new THREE.Vector3(Math.cos(a) * 0.46, 0.035, Math.sin(a) * 0.46);
    const hub = new THREE.Vector3(0, 0.74, 0), delta = hub.clone().sub(foot), mid = hub.clone().add(foot).multiplyScalar(0.5);
    const l = K.cyl(0.022, 0.028, delta.length(), gunDark, mid.x, mid.y, mid.z, null, 8, 'y');
    l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    for (const u of [0.23, 0.55, 0.84]) {
      const c = hub.clone().lerp(foot, u);
      const sleeve = K.cyl(0.032, 0.032, 0.042, gunBody, c.x, c.y, c.z, null, 12, 'y');
      sleeve.quaternion.copy(l.quaternion);
    }
    const hinge = hub.clone().lerp(foot, 0.59);
    if (!folded) {
      rod(THREE, K, [0, 0.44, 0], hinge.toArray(), 0.009, gunMid);
      K.cyl(0.058, 0.045, 0.019, gunBody, foot.x, 0.021, foot.z, null, 14, 'y');
    }
    if (folded) K.box(0.05, 0.03, 0.06, gunDark, foot.x, foot.y, foot.z, 0, 0, 0, null, 0.006);
    else K.box(0.09, 0.025, 0.075, gunDark, foot.x, 0.022, foot.z, 0, -a, 0, null, 0.006);
  }
  K.cyl(0.06, 0.075, 0.12, gunBody, 0, 0.74, 0, null, 14, 'y');
  K.cyl(0.024, 0.024, 0.1, gunDark, 0, 0.82, 0, null, 10, 'y');
  K.cyl(0.037, 0.037, 0.11, gunDark, 0, 0.765, 0, null, 14, 'x');
  for (const sx of [-1, 1]) bolt(K, gunDark, gunMid, sx * 0.058, 0.765, 0, 0.022);
  if (folded) {
    K.box(0.105, 0.016, 0.034, gunOlive, 0, 0.65, 0.46, 0, 0, 0, null, 0.004);
    K.box(0.105, 0.016, 0.034, gunOlive, 0, 0.713, 0.46, 0, 0, 0, null, 0.004);
    for (const sx of [-1, 1]) K.box(0.015, 0.077, 0.034, gunOlive, sx * 0.047, 0.6815, 0.46, 0, 0, 0, null, 0.004);
    K.box(0.032, 0.013, 0.043, gunMid, 0, 0.724, 0.46, 0, 0, 0, null, 0.003);
  }
  const firstGunPart = g.children.length;   // CL-131: from here on, the parts that elevate
  K.box(0.096, 0.026, 0.25, gunDark, 0, 0.805, 0.077, 0, 0, 0, null, 0.005);
  K.slab([[-0.22, 0.82], [0.2, 0.82], [0.2, 0.9], [0.18, 0.915], [-0.2, 0.915], [-0.22, 0.9]], 0.11, gunBody, { bevel: 0.01 });
  for (const sx of [-1, 1]) {
    K.slab([[-0.204, 0.831], [0.176, 0.831], [0.182, 0.846], [0.182, 0.893], [-0.204, 0.899]], 0.004, gunMid, { x: sx * 0.064, bevel: 0.002 });
    K.box(0.006, 0.007, 0.161, gunDark, sx * 0.067, 0.861, 0.034, 0, 0, 0, null, 0.002);
    for (const [z, y] of [[-0.185, 0.883], [0.158, 0.883], [-0.183, 0.844], [0.154, 0.844], [-0.049, 0.882]]) bolt(K, gunDark, gunAccent, sx * 0.069, y, z, 0.003);
  }
  K.slab([[-0.08, 0.912], [0.14, 0.912], [0.14, 0.945], [-0.06, 0.952]], 0.105, gunMid, { bevel: 0.01 });
  K.rail(0.2, 0, 0.957, 0.03);
  K.box(0.03, 0.03, 0.03, gunDark, 0, 0.94, -0.16, 0, 0, 0, null, 0.004);
  K.slab([[-0.22, 0.9], [-0.5, 0.89], [-0.52, 0.9], [-0.525, 0.78], [-0.5, 0.77], [-0.36, 0.81], [-0.22, 0.83]], 0.07, gunPoly, { bevel: 0.016, segs: 3 });
  K.slab([[-0.54, 0.904], [-0.522, 0.904], [-0.526, 0.776], [-0.542, 0.772]], 0.076, gunRubber, { bevel: 0.006 });
  K.slab(gripOutline(-0.166, 0.76, 0.14, 0.066, 0.28), 0.056, gunPoly, { bevel: 0.013, segs: 3 });
  K.slab(gunBand([[-0.078, 0.82], [-0.078, 0.788], [-0.092, 0.776], [-0.132, 0.778], [-0.135, 0.795]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire, moved to mid-guard.
  K.slab([[-0.098, 0.8183], [-0.1027, 0.8056], [-0.102, 0.7979], [-0.0973, 0.7913], [-0.1027, 0.7867], [-0.11, 0.7941], [-0.1133, 0.8064], [-0.11, 0.8217]], 0.011, gunAccent, { bevel: 0.002 });
  const barrel = K.lathe([[0, 0.2], [0.024, 0.2], [0.024, 0.24], [0.019, 0.25], [0.019, 0.72], [0, 0.72]], gunAccent, { y: 0.875, seg: 12 });
  part(THREE, ventTube(THREE, 0.028, 0.003, 0.24, 8, 7, 0.52, 0.56, 6), gunBody, g, 0, 0.875, 0.227);   // GB-189: 10-point holes (were 16)
  for (const z of [0.226, 0.469]) K.cyl(0.032, 0.032, 0.012, gunMid, 0, 0.875, z, null, 16);
  K.lathe([[0, 0.715], [0.024, 0.72], [0.024, 0.79], [0.012, 0.792], [0.012, 0.785], [0, 0.785]], gunDark, { y: 0.875, seg: 12 });
  K.lathe([[0, 0.2], [0.014, 0.2], [0.014, 0.56], [0, 0.56]], gunDark, { y: 0.835, seg: 10 });
  K.box(0.04, 0.05, 0.05, gunDark, 0, 0.85, 0.57, 0, 0, 0, null, 0.006);
  K.box(0.012, 0.05, 0.012, gunDark, 0, 0.915, 0.69);
  K.slab(gunBand([[0.26, 0.895], [0.3, 0.955], [0.42, 0.955], [0.46, 0.895]], 0.008), 0.016, gunDark, { bevel: 0.003 });
  for (const z of [0.267, 0.45]) K.cyl(0.008, 0.008, 0.047, gunMid, 0, 0.902, z, null, 8, 'x');
  for (let i = 0; i < 6; i++) K.box(0.018, 0.003, 0.006, gunRubber, 0, 0.964, 0.314 + i * 0.019, 0, 0, 0, null, 0.001);
  if (!folded) {
    K.box(0.09, 0.145, 0.2, gunOlive, -0.12, 0.7875, 0, 0, 0, 0, null, 0.008);
    K.box(0.096, 0.013, 0.206, gunMid, -0.12, 0.866, 0, 0, 0, 0, null, 0.003);
    for (const z of [-0.087, 0.087]) K.box(0.006, 0.126, 0.006, gunMid, -0.168, 0.79, z, 0, 0, 0, null, 0.001);
    K.box(0.009, 0.059, 0.043, gunDark, -0.171, 0.809, -0.003, 0, 0, 0, null, 0.002);
    K.box(0.011, 0.029, 0.034, gunMid, -0.176, 0.818, -0.003, 0, 0, 0, null, 0.003);
    // Linked cartridges turn continuously from the can's mouth into the feed port.
    for (let i = 0; i < 10; i++) {
      const u = i / 9, x = -0.122 + 0.074 * u, y = 0.873 + 0.037 * Math.sin(u * Math.PI / 2), z = 0.045;
      K.cyl(0.0043, 0.0043, 0.042, brassMat, x, y, z, null, 8);
      K.cyl(0.001, 0.0043, 0.013, brassMat, x, y, z + 0.0275, null, 8);
      K.box(0.009, 0.009, 0.011, gunDark, x, y - 0.001, z - 0.009, 0, 0, 0, null, 0.001);
    }
  }
  g.userData.barrel = barrel;
  const elev = new THREE.Group();
  elev.name = 'm240-elev'; elev.position.copy(M240_PIVOT);
  for (const part of g.children.slice(firstGunPart)) { part.position.sub(M240_PIVOT); elev.add(part); }
  g.add(elev);
  g.userData.elev = elev;
  return finishGun(g);
}
