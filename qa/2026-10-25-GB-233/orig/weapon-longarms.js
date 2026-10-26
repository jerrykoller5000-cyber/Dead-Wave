// GP-164: reference-led long-arm cosmetics. Moving-part roots and gameplay anchors stay unchanged.
// Context owns materials and finishing, so customization and rigid batching remain shared.

// A thin, faceted sleeve with actual through-slots. Each cut has an inner wall;
// the bore and background show through at every viewing angle. No CSG or new mats.
function ventedSleeve(T, parent, material, { z0, z1, radius, wall, y, faces = 12, slots, ventFaces }) {
  const pos = [], uv = [], step = Math.PI * 2 / faces;
  const quad = (a, b, c, d) => {
    for (const [p, u, v] of [[a, 0, 0], [b, 1, 0], [c, 1, 1], [a, 0, 0], [c, 1, 1], [d, 0, 1]]) {
      pos.push(...p); uv.push(u, v);
    }
  };
  for (let f = 0; f < faces; f++) {
    const a = (f - 0.5) * step, b = (f + 0.5) * step;
    const p = (t, z, r) => [r * (Math.cos(a) * (1 - t) + Math.cos(b) * t), y + r * (Math.sin(a) * (1 - t) + Math.sin(b) * t), z];
    const cuts = ventFaces.includes(f) ? slots : [];
    const zs = [z0, ...cuts.flat(), z1], ts = cuts.length ? [0, 0.2, 0.8, 1] : [0, 1];
    for (let iz = 0; iz < zs.length - 1; iz++) for (let it = 0; it < ts.length - 1; it++) {
      if (cuts.length && iz % 2 === 1 && it === 1) continue;
      const za = zs[iz], zb = zs[iz + 1], ta = ts[it], tb = ts[it + 1];
      quad(p(ta, za, radius), p(tb, za, radius), p(tb, zb, radius), p(ta, zb, radius));
      quad(p(ta, zb, radius - wall), p(tb, zb, radius - wall), p(tb, za, radius - wall), p(ta, za, radius - wall));
    }
    for (const [za, zb] of cuts) {
      quad(p(0.8, za, radius), p(0.8, za, radius - wall), p(0.2, za, radius - wall), p(0.2, za, radius));
      quad(p(0.2, zb, radius), p(0.2, zb, radius - wall), p(0.8, zb, radius - wall), p(0.8, zb, radius));
      quad(p(0.2, za, radius), p(0.2, za, radius - wall), p(0.2, zb, radius - wall), p(0.2, zb, radius));
      quad(p(0.8, zb, radius), p(0.8, zb, radius - wall), p(0.8, za, radius - wall), p(0.8, za, radius));
    }
    quad(p(0, z0, radius), p(0, z0, radius - wall), p(1, z0, radius - wall), p(1, z0, radius));
    quad(p(1, z1, radius), p(1, z1, radius - wall), p(0, z1, radius - wall), p(0, z1, radius));
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mesh = new T.Mesh(geo, material);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// A pistol grip on the same centre line as gripOutline (hand anchor stays), with its own side profile.
// u runs down the grip, v+ is the front strap. The palm point is u = 0.42, v = 0.
function shapedGrip(cz, cy, h, d, rake, pts) {
  const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => {
    const uu = (u - 0.5) * h, vv = v * k;
    return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr];
  });
}

export function makeM4Model(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, magPoly, glassMat, sightDotMat, gaugeFace } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Upper receiver: the flat-top and its rail, the forward assist, the port cover, the brass deflector.
  K.slab([[-0.18, -0.006], [0.2, -0.006], [0.2, 0.07], [0.192, 0.078], [-0.168, 0.078], [-0.18, 0.066]], 0.08, gunBody, { bevel: 0.007 });
  K.rail(0.36, 0, 0.085, 0.01);
  K.lathe([[0, -0.125], [0.013, -0.125], [0.013, -0.125], [0.013, -0.07], [0.0105, -0.058], [0, -0.058]], gunBody, { x: 0.044, y: 0.05, seg: 10 });
  K.box(0.004, 0.032, 0.085, gunDark, 0.0405, 0.034, 0.03);
  K.box(0.003, 0.004, 0.072, gunMid, 0.0425, 0.05, 0.03);
  K.slab([[-0.052, 0.022], [-0.016, 0.022], [-0.01, 0.06], [-0.052, 0.068]], 0.022, gunBody, { x: 0.042, bevel: 0.005 });
  // Charging handle out the back, the folded rear sight.
  K.box(0.028, 0.012, 0.045, gunDark, 0, 0.068, -0.195);
  K.slab([[-0.226, 0.058], [-0.206, 0.058], [-0.2, 0.077], [-0.226, 0.077]], 0.09, gunDark, { bevel: 0.004 });
  K.slab([[-0.165, 0.092], [-0.115, 0.092], [-0.12, 0.108], [-0.16, 0.108]], 0.034, gunDark, { bevel: 0.003 });
  // Lower receiver: the trigger housing, the flared magwell, the pins and controls.
  K.slab([[-0.172, 0.0], [0.13, 0.0], [0.13, -0.028], [0.118, -0.042], [0.117, -0.116], [0.124, -0.128], [-0.008, -0.128], [-0.004, -0.116],
          [-0.006, -0.064], [-0.03, -0.058], [-0.1, -0.058], [-0.16, -0.05], [-0.172, -0.03]], 0.07, gunBody, { bevel: 0.006 });
  for (const z of [-0.15, 0.115]) K.cyl(0.0055, 0.0055, 0.074, gunDark, 0, -0.012, z, null, 8, 'x');
  K.box(0.006, 0.03, 0.016, gunDark, -0.037, -0.03, 0.112);
  K.box(0.006, 0.012, 0.034, gunDark, -0.037, -0.022, -0.09, 0.3);
  K.cyl(0.008, 0.008, 0.006, gunDark, 0.037, -0.05, 0.0, null, 8, 'x');
  // Trigger guard, a trigger with its tip curling forward, an A2 grip.
  // Grip centre line is still gripOutline(-0.08, -0.12, 0.18, …, 0.3): the palm stays at the hold.
  K.slab(gunBand([[0.016, -0.05], [0.028, -0.09], [0.004, -0.122], [-0.028, -0.132], [-0.052, -0.112], [-0.048, -0.078]], 0.007), 0.03, gunBody, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire.
  K.slab([[-0.0103, -0.0525], [-0.0187, -0.0689], [-0.0179, -0.0843], [-0.0092, -0.0957], [-0.0148, -0.1003], [-0.0261, -0.0877], [-0.0293, -0.0671], [-0.0217, -0.0475]], 0.012, gunDark, { bevel: 0.002 });
  // GB-178 (Jerry: grips were butchered): a clean A2 grip: a straight front strap with the one finger swell, a beavertail under the tang, a flat base on the same centre line and hand anchor (u 0.42, v 0).
  K.slab(shapedGrip(-0.08, -0.12, 0.18, 0.072, 0.3, [
    [-0.05, 0.012], [0.06, 0.026], [0.24, 0.028], [0.38, 0.026], [0.46, 0.034], [0.54, 0.026], [0.72, 0.028], [0.9, 0.026], [1.0, 0.016],
    [1.02, 0.0], [1.0, -0.026], [0.8, -0.036], [0.5, -0.038], [0.2, -0.036], [0.04, -0.034], [-0.04, -0.042], [-0.08, -0.012]
  ]), 0.056, gunPoly, { bevel: 0.009, segs: 3 });
  // Telescoping stock: distinct cheek tube, open triangular web and shoulder pad.
  // The open area is geometry, not a painted black inset through a solid stock.
  K.lathe([[0, -0.505], [0.014, -0.505], [0.0175, -0.5], [0.0175, -0.19], [0.021, -0.188], [0.021, -0.168], [0, -0.168]], gunDark, { y: 0.035, seg: 12 });
  K.slab([[-0.33, 0.012], [-0.328, 0.05], [-0.345, 0.062], [-0.49, 0.064], [-0.548, 0.074], [-0.552, 0.016], [-0.38, 0.002]], 0.066, gunPoly, { bevel: 0.009, segs: 3 });
  K.slab([[-0.553, 0.055], [-0.533, 0.048], [-0.523, -0.056], [-0.54, -0.08], [-0.553, -0.078]], 0.066, gunPoly, { bevel: 0.007 });
  K.slab(gunBand([[-0.364, 0.003], [-0.405, -0.006], [-0.492, -0.064], [-0.538, -0.07]], 0.012), 0.057, gunPoly, { bevel: 0.005 });
  K.slab([[-0.569, 0.077], [-0.552, 0.077], [-0.552, -0.08], [-0.567, -0.083]], 0.072, gunRubber, { bevel: 0.006 });
  K.slab([[-0.34, 0.005], [-0.402, -0.01], [-0.401, -0.021], [-0.36, -0.018], [-0.34, -0.008]], 0.03, gunDark, { bevel: 0.003 });
  for (const sx of [-1, 1]) {
    K.slab([[-0.365, 0.053], [-0.505, 0.06], [-0.522, 0.047], [-0.37, 0.04]], 0.004, gunPoly, { x: sx * 0.033, bevel: 0.002 });
    K.cyl(0.011, 0.011, 0.004, gunDark, sx * 0.032, -0.045, -0.516, null, 12, 'x');
    K.cyl(0.0065, 0.0065, 0.005, gunRubber, sx * 0.034, -0.045, -0.516, null, 10, 'x');
  }
  for (let i = 0; i < 5; i++) K.box(0.066, 0.004, 0.002, gunDark, 0, -0.056 + i * 0.026, -0.568, 0, 0, 0, null, 0);
  K.cyl(0.009, 0.009, 0.07, gunDark, 0, 0.032, -0.52, null, 8, 'x');
  // Free-float handguard: the barrel nut, an octagon with M-LOK slots, a full-length top rail on a riser.
  K.lathe([[0.012, 0.186], [0.03, 0.186], [0.03, 0.206], [0.012, 0.206]], gunDark, { y: 0.02, seg: 12 });
  // GB-180 (close-up: a short handguard and a long pencil barrel): the handguard runs on to 0.70 over the gas block and a
  // heavier barrel; the front sight moves to the rail's end.
  ventedSleeve(THREE, gun, gunMid, { z0: 0.21, z1: 0.70, radius: 0.047, wall: 0.005, y: 0.02, faces: 12,
    slots: [[0.238, 0.286], [0.309, 0.357], [0.38, 0.428], [0.451, 0.499], [0.522, 0.57], [0.593, 0.641], [0.652, 0.68]], ventFaces: [0, 1, 5, 6, 7, 9, 11] });
  K.lathe([[0.037, 0.692], [0.047, 0.692], [0.047, 0.70], [0.043, 0.706], [0.036, 0.706]], gunBody, { y: 0.02, seg: 12, phase: Math.PI / 12 });
  K.box(0.03, 0.016, 0.49, gunMid, 0, 0.071, 0.455, 0, 0, 0, null, 0.004);
  K.rail(0.49, 0, 0.085, 0.455);
  for (const sx of [-1, 1]) {
    K.cyl(0.006, 0.006, 0.004, gunDark, sx * 0.0436, 0.019, 0.221, null, 6, 'x');
    K.cyl(0.005, 0.005, 0.004, gunDark, sx * 0.0436, 0.019, 0.69, null, 6, 'x');
  }
  // Barrel, the low gas block, the folding front sight, the A2 birdcage.
  K.lathe([[0, 0.18], [0.016, 0.18], [0.016, 0.915], [0, 0.915]], gunAccent, { y: 0.02, seg: 14 });
  K.box(0.03, 0.034, 0.03, gunDark, 0, 0.022, 0.614, 0, 0, 0, null, 0.004);
  K.slab([[0.65, 0.09], [0.693, 0.09], [0.685, 0.118], [0.663, 0.12]], 0.022, gunDark, { bevel: 0.003 });
  K.box(0.005, 0.02, 0.005, gunDark, 0, 0.128, 0.673);
  K.lathe([[0, 0.912], [0.016, 0.912], [0.016, 0.918], [0.0178, 0.925], [0.0178, 0.975], [0.0145, 0.978], [0.007, 0.978], [0.007, 0.97], [0, 0.97]], gunDark, { y: 0.02, seg: 12 });
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * 0.62; K.box(0.005, 0.005, 0.034, gunRubber, Math.cos(a) * 0.0176, 0.02 + Math.sin(a) * 0.0176, 0.952, 0, 0, a); }
  // Holographic sight on the upper's rail; a weapon light on the right of the handguard.
  K.box(0.05, 0.02, 0.11, gunDark, 0, 0.1, 0.0, 0, 0, 0, null, 0.004);
  for (const sx of [-1, 1]) K.slab([[-0.05, 0.108], [0.052, 0.108], [0.05, 0.158], [-0.042, 0.162]], 0.006, gunDark, { x: sx * 0.026, bevel: 0.002 });
  K.box(0.058, 0.01, 0.1, gunDark, 0, 0.163, 0.004, 0, 0, 0, null, 0.003);
  K.box(0.046, 0.044, 0.003, glassMat, 0, 0.134, 0.045);
  K.box(0.008, 0.008, 0.004, sightDotMat, 0, 0.134, 0.043);
  for (const z of [-0.02, 0.0]) K.box(0.008, 0.008, 0.012, gunRubber, 0.03, 0.118, z);
  K.cyl(0.008, 0.008, 0.012, gunMid, -0.032, 0.106, 0.019, null, 10, 'x');
  for (const sx of [-1, 1]) K.cyl(0.004, 0.004, 0.003, gunMid, sx * 0.03, 0.124, 0.033, null, 6, 'x');
  K.rail(0.086, 0.046, 0.02, 0.504, null, 0.025, 1);
  K.box(0.016, 0.022, 0.032, gunDark, 0.052, 0.02, 0.505);
  K.lathe([[0, 0.468], [0.015, 0.468], [0.015, 0.532], [0.019, 0.542], [0.019, 0.56], [0.015, 0.561], [0, 0.561]], gunDark, { x: 0.066, y: 0.02, seg: 12 });
  K.disc(0.014, gaugeFace, 0.066, 0.02, 0.5615, 0);
  // Magazine: a polymer mag with its curve, the grip ribs, a floorplate.
  const mag = K.group(0, -0.16, 0.05);
  K.slab([[-0.046, 0.108], ...profileCurve([-0.046, 0.03], [-0.042, -0.05], [-0.024, -0.104], 5), ...profileCurve([0.072, -0.098], [0.05, -0.04], [0.046, 0.03], 5), [0.046, 0.108]],
    0.058, magPoly, { bevel: 0.006, parent: mag });
  for (const sx of [-1, 1]) for (const z of [-0.027, 0, 0.027]) {
    K.slab(gunBand([[z, 0.053], [z + 0.004, -0.012], [z + 0.012, -0.07], [z + 0.019, -0.095]], 0.003), 0.003, gunDark, { x: sx * 0.0295, bevel: 0, parent: mag });   // GB-189: no 1 mm bevel on a 3 mm rib
  }
  for (const y of [-0.018, -0.049, -0.08]) K.box(0.061, 0.004, 0.082, magPoly, 0, y, 0.011 - y * 0.15, 0, 0, 0, mag, 0.001);
  K.slab([[-0.03, -0.1], [0.078, -0.094], [0.08, -0.112], [-0.03, -0.118]], 0.066, magPoly, { bevel: 0.005, parent: mag });
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Sling swivel.
  K.tor(0.012, 0.003, gunDark, 0, -0.035, 0.52, 0, Math.PI / 2, 0, null, Math.PI * 2, 12);
  gunEffects(gun, new THREE.Vector3(0, 0.02, 0.98), 0.06, 3.5, 8);
  gun.userData.laser.position.set(0, 0.02, 5);
  gun.userData.laserBaseZ = 1;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'm4');   // CL-95
  return finishGun(gun);
}

export function makeAkModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunRubber, woodMat, woodDark } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Stamped receiver with its rivets, the front trunnion, the rear tang falling to the stock.
  K.slab([[-0.225, 0.048], [-0.225, -0.032], [-0.2, -0.045], [0.252, -0.045], [0.252, 0.05], [0.2, 0.055], [-0.205, 0.055]], 0.088, gunBody, { bevel: 0.006 });
  K.box(0.092, 0.096, 0.05, gunMid, 0, 0.005, 0.225, 0, 0, 0, null, 0.008);
  for (const sx of [-1, 1]) for (const [ry, rz] of [[0.03, 0.2], [-0.02, 0.2], [0.03, 0.24], [-0.03, -0.15], [-0.03, 0.12], [0.02, -0.19]]) K.cyl(0.006, 0.006, 0.006, gunDark, sx * 0.045, ry, rz, null, 6, 'x');
  // Dust cover: a flat stamped lid, two ribs, then one rear-sight block and a low leaf.
  K.slab([[-0.20, 0.052], [0.155, 0.052], [0.155, 0.076], [0.145, 0.082], [-0.175, 0.082], [-0.20, 0.072]], 0.076, gunMid, { bevel: 0.004, segs: 2 });
  for (let i = 0; i < 2; i++) K.box(0.048, 0.003, 0.008, gunDark, 0, 0.083, -0.08 + i * 0.08);
  K.box(0.024, 0.008, 0.016, gunDark, 0, 0.078, -0.205);
  K.slab([[0.15, 0.054], [0.248, 0.054], [0.248, 0.068], [0.20, 0.084], [0.15, 0.08]], 0.044, gunDark, { bevel: 0.003 });
  K.box(0.026, 0.004, 0.062, gunDark, 0, 0.084, 0.195);
  K.box(0.008, 0.010, 0.008, gunAccent, 0, 0.090, 0.218);
  // Right side: the long safety lever and its tab, the charging handle on the carrier.
  K.slab(gunBand([[-0.17, 0.036], [-0.02, 0.03], [0.005, 0.008]], 0.008), 0.006, gunDark, { x: 0.047, bevel: 0.002 });
  K.box(0.006, 0.03, 0.018, gunDark, 0.047, 0.004, 0.012);
  K.box(0.04, 0.018, 0.02, gunDark, 0.062, 0.042, 0.13, 0, 0, 0, null, 0.005);
  K.sph(0.012, gunDark, 0.083, 0.042, 0.13, null, 8);
  // Trigger guard, the magazine release in front of it, a trigger with its tip curling forward, the wooden grip.
  // Grip centre line is still gripOutline(-0.1, -0.14, 0.19, …, 0.34): the palm stays at the hold.
  K.slab(gunBand([[0.002, -0.042], [0.004, -0.078], [-0.016, -0.096], [-0.042, -0.092], [-0.048, -0.07]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  K.box(0.02, 0.02, 0.006, gunDark, 0, -0.056, 0.0);
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire.
  K.slab([[-0.0165, -0.0429], [-0.0248, -0.056], [-0.024, -0.0681], [-0.0155, -0.0775], [-0.0205, -0.0825], [-0.032, -0.0719], [-0.0352, -0.054], [-0.0275, -0.0371]], 0.01, gunDark, { bevel: 0.002 });
  // GB-178 (Jerry: grips were butchered): a clean AK grip: smooth, a gentle palm swell, rounded base on the same centre line and hand anchor (u 0.42, v 0).
  K.slab(shapedGrip(-0.1, -0.14, 0.19, 0.07, 0.34, [
    // GB-180 pass 4 (close-up: the grip's rounded top stood clear of the receiver): its top runs up into the receiver.
    [-0.12, 0.018], [-0.02, 0.020], [0.14, 0.024], [0.4, 0.026], [0.64, 0.028], [0.86, 0.024], [0.98, 0.012],
    [1.0, -0.008], [0.9, -0.03], [0.6, -0.034], [0.3, -0.03], [0.08, -0.028], [-0.12, -0.014]
  ]), 0.054, woodMat, { bevel: 0.009, segs: 3 });
  K.cyl(0.0055, 0.0055, 0.003, gunDark, 0.0275, -0.155, -0.108, null, 8, 'x');   // GB-178: the grip screw seated on the panel
  K.slab([[-0.142, -0.040], [-0.058, -0.040], [-0.062, -0.052], [-0.136, -0.054]], 0.06, gunDark, { bevel: 0.003 });   // GB-180: the grip's steel mounting tang under the receiver
  // Stock: the dropped wooden butt with its wrist, a steel buttplate, the tang, a sling loop.
  K.slab([[-0.222, 0.042], ...profileCurve([-0.255, 0.038], [-0.34, 0.012], [-0.412, 0.012], 5),
    ...profileCurve([-0.412, 0.012], [-0.515, 0.017], [-0.571, -0.009], 5), [-0.579, -0.145], [-0.57, -0.153],
    ...profileCurve([-0.57, -0.153], [-0.414, -0.084], [-0.337, -0.069], 5),
    ...profileCurve([-0.337, -0.069], [-0.27, -0.044], [-0.222, -0.036], 4)], 0.07, woodMat, { bevel: 0.017, segs: 3 });
  K.slab([[-0.592, 0.0], [-0.573, -0.004], [-0.579, -0.152], [-0.597, -0.156]], 0.074, gunDark, { bevel: 0.004 });
  K.box(0.078, 0.022, 0.05, gunDark, 0, 0.033, -0.236);
  K.box(0.024, 0.004, 0.048, gunBody, 0, 0.046, -0.265, 0.08, 0, 0, null, 0.002);
  K.cyl(0.004, 0.004, 0.003, gunDark, 0, 0.05, -0.274, null, 6, 'y');
  for (const sx of [-1, 1]) {
    K.slab(gunBand([[-0.32, -0.035], [-0.386, -0.049], [-0.472, -0.056], [-0.535, -0.049]], 0.0015), 0.002, woodDark, { x: sx * 0.035, bevel: 0 });
    K.slab(gunBand([[-0.396, -0.066], [-0.451, -0.079], [-0.536, -0.096]], 0.0011), 0.002, woodDark, { x: sx * 0.035, bevel: 0 });
    K.cyl(0.0075, 0.0075, 0.003, gunDark, sx * 0.033, -0.15, -0.104, null, 10, 'x');
  }
  K.tor(0.014, 0.004, gunDark, 0, -0.122, -0.45, 0, Math.PI / 2, 0);
  // Handguards: the lower with its palm swell and grooves, the upper over the gas tube, the steel bands.
  K.slab([[0.244, 0.03], [0.53, 0.03], [0.535, 0.0], [0.53, -0.048], [0.45, -0.062], [0.33, -0.063], [0.262, -0.055], [0.244, -0.04]], 0.086, woodMat, { bevel: 0.016, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab(gunBand([[0.28, -0.005], [0.34, -0.014], [0.43, -0.012], [0.498, -0.003]], 0.0022), 0.002, woodDark, { x: sx * 0.043, bevel: 0.001 });
    K.slab(gunBand([[0.29, -0.033], [0.36, -0.04], [0.466, -0.036]], 0.0014), 0.002, woodDark, { x: sx * 0.043, bevel: 0.001 });
  }
  K.slab([[0.155, 0.054], [0.505, 0.050], [0.512, 0.064], [0.49, 0.082], [0.20, 0.084], [0.155, 0.072]], 0.054, woodMat, { bevel: 0.004, segs: 2 });
  for (const z of [0.236, 0.512]) K.box(0.086, 0.078, 0.014, gunDark, 0, -0.008, z, 0, 0, 0, null, 0.004);
  K.lathe([[0, 0.42], [0.013, 0.42], [0.013, 0.52], [0, 0.52]], gunDark, { y: 0.058, seg: 10 });
  K.lathe([[0, 0.24], [0.010, 0.24], [0.010, 0.43], [0, 0.43]], gunAccent, { y: 0.046, seg: 10 });
  for (const sx of [-1, 1]) for (const z of [0.275, 0.325, 0.375, 0.425]) K.box(0.003, 0.008, 0.016, gunDark, sx * 0.022, 0.058, z, 0, 0, 0, null, 0.001);
  K.cyl(0.0035, 0.0035, 0.04, gunAccent, 0, 0.064, 0.47, null, 8, 'x');
  K.slab(gunBand([[0.455, 0.058], [0.49, 0.062], [0.52, 0.056]], 0.0022), 0.005, gunDark, { x: 0.018, bevel: 0.001 });
  K.slab([[0.515, 0.068], [0.595, 0.06], [0.595, -0.018], [0.515, -0.02]], 0.04, gunMid, { bevel: 0.004 });
  // Barrel and cleaning rod; the front sight tower with its hood; the bayonet lug; the slant brake.
  K.lathe([[0, 0.5], [0.0155, 0.5], [0.0155, 0.6], [0.0135, 0.608], [0.0135, 0.92], [0, 0.92]], gunAccent, { y: -0.005, seg: 12 });
  K.lathe([[0, 0.53], [0.0035, 0.53], [0.0035, 0.832], [0.006, 0.836], [0.006, 0.846], [0, 0.846]], gunDark, { y: -0.032, seg: 6 });
  K.slab([[0.818, -0.03], [0.862, -0.03], [0.858, 0.05], [0.826, 0.05]], 0.034, gunDark, { bevel: 0.004 });
  K.tor(0.022, 0.005, gunDark, 0, 0.07, 0.84, 0, 0, 0, null, Math.PI, 10);
  for (const sx of [-1, 1]) K.box(0.006, 0.024, 0.012, gunDark, sx * 0.022, 0.06, 0.84);
  K.box(0.006, 0.03, 0.006, gunDark, 0, 0.066, 0.84);
  K.box(0.022, 0.02, 0.05, gunDark, 0, -0.03, 0.82);
  K.lathe([[0, 0.918], [0.019, 0.918], [0.019, 0.988], [0.0165, 0.994], [0.008, 0.994], [0.008, 0.985], [0, 0.985]], gunDark, { y: -0.005, seg: 12 });
  K.box(0.025, 0.01, 0.04, gunRubber, 0, 0.012, 0.965, -0.35);
  // Banana mag: the deep curve, two pressed ribs down each side, the floorplate.
  const mag = K.group(0, -0.06, 0.04);
  const magB = profileCurve([-0.046, 0.012], [-0.042, -0.13], [0.032, -0.262], 7), magF = profileCurve([0.056, 0.012], [0.062, -0.11], [0.136, -0.238], 7);
  K.slab([...magB, ...magF.slice().reverse()], 0.06, gunAccent, { bevel: 0.006, parent: mag });
  for (const w of [0.23, 0.5, 0.77]) K.slab(gunBand(magB.map((b, i) => [b[0] * (1 - w) + magF[i][0] * w, b[1] * (1 - w) + magF[i][1] * w]).slice(1, 7), 0.004), 0.065, gunBody, { bevel: 0.002, parent: mag });
  K.slab(gunBand(magB.slice(0, 8), 0.0025), 0.061, gunDark, { bevel: 0.001, parent: mag });
  K.slab(gunBand(magF.slice(0, 8), 0.0025), 0.061, gunDark, { bevel: 0.001, parent: mag });
  K.box(0.064, 0.022, 0.1, gunDark, 0, -0.016, 0.007, 0, 0, 0, mag, 0.002);
  K.slab([[0.028, -0.258], [0.14, -0.232], [0.144, -0.247], [0.03, -0.275]], 0.066, gunDark, { bevel: 0.004, parent: mag });
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  gunEffects(gun, new THREE.Vector3(0, -0.005, 1.02), 0.065, 3.5, 8);
  gun.userData.laser.position.set(0, -0.005, 5);
  gun.userData.laserBaseZ = 1;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'ak');   // CL-95
  return finishGun(gun);
}

export function makeAa12Model(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Pressed receiver with a rounded cover bulge, folded perimeter and fasteners.
  // GB-180 pass 7 (vs the real AA-12: a tall flat-sided slab receiver; ours was rounded and low): 25 mm taller, square-topped.
  K.slab([[-0.26, 0.1], [-0.26, -0.074], [-0.242, -0.09], [0.26, -0.09], [0.26, 0.115], [-0.245, 0.115]], 0.14, gunMid, { bevel: 0.008 });
  for (const sx of [-1, 1]) {
    K.slab([[-0.202, 0.075], [0.193, 0.075], [0.2, 0.066], [0.2, -0.053], [-0.202, -0.053]], 0.009, gunDark, { x: sx * 0.07, bevel: 0.003 });
    K.lathe([[0, -0.202], [0.046, -0.202], [0.052, -0.19], [0.052, 0.187], [0.046, 0.2], [0, 0.2]], gunBody, { x: sx * 0.03, y: -0.007, seg: 20 });
    for (const [by, bz] of [[0.03, 0.177], [-0.044, 0.177], [0.03, -0.181], [-0.044, -0.181]]) {
      K.cyl(0.0045, 0.0045, 0.004, gunDark, sx * 0.077, by, bz, null, 8, 'x');
      K.cyl(0.002, 0.002, 0.0045, gunMid, sx * 0.078, by, bz, null, 6, 'x');
    }
    K.slab(gunBand([[-0.239, -0.063], [-0.239, 0.096], [-0.218, 0.106], [0.225, 0.106], [0.246, 0.096]], 0.003), 0.002, gunBody, { x: sx * 0.07, bevel: 0.001 });
  }
  // The carry handle has one uninterrupted top and a clear opening underneath.
  K.slab(gunBand([[-0.17, 0.09], [-0.153, 0.143], [-0.138, 0.151], [0.188, 0.151], [0.217, 0.13], [0.225, 0.09]], 0.009), 0.043, gunDark, { bevel: 0.003 });
  for (const z of [-0.158, 0.211]) K.cyl(0.004, 0.004, 0.047, gunMid, 0, 0.108, z, null, 8, 'x');
  K.box(0.025, 0.007, 0.025, gunDark, 0, 0.156, -0.12, 0, 0, 0, null, 0.002);
  K.tor(0.009, 0.003, gunMid, 0, 0.168, -0.12, 0, 0, 0, null, Math.PI * 2, 12);
  // Ejection port, charging handle.
  K.box(0.004, 0.05, 0.12, gunRubber, 0.072, 0.045, 0.1);
  K.box(0.004, 0.014, 0.26, gunRubber, -0.072, 0.055, 0.025, 0, 0, 0, null, 0.003);
  K.box(0.03, 0.022, 0.035, gunDark, -0.08, 0.05, 0.18, 0, 0, 0, null, 0.004);
  // Stock: moulded polymer with its skeleton cut, a rubber pad.
  // GB-173 (Jerry: the stock was a boxy flared block): the AA-12's fixed stock. A moulded nose steps the receiver's
  // width down; the top and comb run straight back off the receiver, the underside slopes from the wrist to a deep butt.
  K.slab([[-0.255, 0.074], [-0.31, 0.072], [-0.31, -0.07], [-0.282, -0.074], [-0.255, -0.078]], 0.118, gunPoly, { bevel: 0.012, segs: 3 });
  K.slab([[-0.3, 0.07], [-0.535, 0.064], [-0.553, 0.058], [-0.553, -0.1], [-0.538, -0.106], [-0.47, -0.092], [-0.36, -0.07], [-0.3, -0.066]], 0.086, gunPoly, { bevel: 0.014, segs: 3 });
  K.slab([[-0.34, 0.078], [-0.522, 0.073], [-0.532, 0.064], [-0.34, 0.068]], 0.062, gunPoly, { bevel: 0.006, segs: 2 });   // the comb
  for (const sx of [-1, 1]) K.slab([[-0.335, 0.04], [-0.5, 0.034], [-0.5, -0.042], [-0.42, -0.054], [-0.335, -0.038]], 0.003, gunPoly, { x: sx * 0.044, bevel: 0.002 });
  K.slab([[-0.576, 0.058], [-0.553, 0.06], [-0.553, -0.102], [-0.573, -0.108], [-0.579, -0.09], [-0.579, 0.044]], 0.092, gunRubber, { bevel: 0.008 });   // butt pad
  // Pistol grip, trigger guard, trigger.
  // GB-173 (Jerry: grip and trigger too close to the drum): grip, guard, trigger and panels 70 mm further back, so the
  // guard clears the drum's rear face by ~13 mm (WEAPON_HOLD.aa12 grip/trig/hold follow in index.html).
  K.slab(gripOutline(-0.17, -0.16, 0.19, 0.09, 0.3), 0.072, gunPoly, { bevel: 0.015, segs: 3 });
  for (const sx of [-1, 1]) K.slab([[-0.168, -0.098], [-0.221, -0.241], [-0.161, -0.257], [-0.121, -0.112]], 0.003, gunRubber, { x: sx * 0.035, bevel: 0.002 });
  // GB-180 pass 6 (the guard still read as a hook): a moulded polymer guard, 20 mm band, 56 mm wide, with a squared front.
  K.slab(gunBand([[-0.06, -0.088], [-0.062, -0.124], [-0.072, -0.136], [-0.112, -0.136], [-0.122, -0.12]], 0.01), 0.056, gunPoly, { bevel: 0.006, segs: 2 });
  // GB-174: the trigger's face toward the grip, its tip curling forward (it was backwards).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire.
  K.slab([[-0.0781, -0.09], [-0.0827, -0.1005], [-0.082, -0.1081], [-0.0773, -0.1147], [-0.0827, -0.1193], [-0.09, -0.1119], [-0.0933, -0.0995], [-0.0899, -0.086]], 0.011, gunAccent, { bevel: 0.002 });
  // AA-12 drum: its axis along the bore, the round faces front and back, a hub, bolts, the feed tower.
  const mag = new THREE.Group();
  K.lathe([[0, -0.105], [0.142, -0.105], [0.154, -0.097], [0.155, -0.082], [0.149, -0.075], [0.149, 0.075], [0.155, 0.082], [0.154, 0.097], [0.142, 0.105], [0, 0.105]], gunAccent, { parent: mag, seg: 32 });
  for (const sz of [-1, 1]) {
    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.105, mag, 32);
    K.tor(0.138, 0.003, gunDark, 0, 0, sz * 0.108, 0, 0, 0, mag, Math.PI * 2, 24);
    K.cyl(0.059, 0.062, 0.009, gunDark, 0, 0, sz * 0.111, mag, 24);
    K.cyl(0.05, 0.052, 0.004, gunBody, 0, 0, sz * 0.117, mag, 24);
    K.cyl(0.017, 0.019, 0.009, gunDark, 0, 0, sz * 0.122, mag, 12);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.cyl(0.0035, 0.0035, 0.004, gunDark, Math.sin(a) * 0.132, Math.cos(a) * 0.132, sz * 0.109, mag, 8); }
  }
  K.box(0.1, 0.1, 0.12, gunAccent, 0, 0.155, 0.0, 0, 0, 0, mag, 0.012);
  K.box(0.11, 0.02, 0.13, gunDark, 0, 0.21, 0.0, 0, 0, 0, mag, 0.006);
  for (const sx of [-1, 1]) {
    K.box(0.009, 0.047, 0.027, gunDark, sx * 0.145, -0.012, -0.058, 0, 0, 0, mag, 0.003);
    K.box(0.006, 0.028, 0.019, gunMid, sx * 0.149, -0.012, -0.06, 0, 0, 0, mag, 0.002);
    for (let i = 0; i < 4; i++) K.box(0.006, 0.002, 0.015, gunDark, sx * 0.152, -0.022 + i * 0.007, -0.06, 0, 0, 0, mag, 0);
  }
  mag.position.set(0, -0.26, 0.05);
  mag.rotation.set(0, 0, 0);
  gun.add(mag);
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Handguard with vents, the perforated shroud, the front sight, the barrel and its brake.
  // A shallow palm relief keeps the underside close to the support hand; its
  // low transverse ribs give the otherwise smooth foreend a physical grip.
  K.slab([[0.23, 0.105], [0.49, 0.105], [0.49, -0.074], [0.475, -0.082],   // GB-180 pass 7: a square box handguard, flush with the receiver top
    [0.45, -0.082], [0.425, -0.07], [0.29, -0.07], [0.265, -0.082],
    [0.25, -0.082], [0.23, -0.068]], 0.14, gunBody, { bevel: 0.006 });
  for (const sx of [-1, 1]) for (const z of [0.29, 0.35, 0.41]) K.box(0.004, 0.03, 0.045, gunRubber, sx * 0.0705, 0.06, z + 0.02, 0, 0, 0, null, 0.003);   // side vent slots
  for (const z of [0.30, 0.33, 0.36, 0.39, 0.42]) K.box(0.11, 0.009, 0.01, gunPoly, 0, -0.0715, z, 0, 0, 0, null, 0.002);
  for (const sx of [-1, 1]) for (const z of [0.253, 0.463]) for (const y of [-0.045, 0.019, 0.085]) K.cyl(0.004, 0.004, 0.003, gunDark, sx * 0.0715, y, z, null, 8, 'x');
  // GB-180 pass 5 (vs the real AA-12: its shroud is a big angular tube nearly as tall as the handguard; ours was a thin
  // round sleeve): an octagonal shroud 24% fatter, and its collars, sight ring and barrel nut to match.
  ventedSleeve(THREE, gun, gunBody, { z0: 0.448, z1: 0.789, radius: 0.064, wall: 0.005, y: 0.015, faces: 8,
    slots: [[0.467, 0.496], [0.519, 0.548], [0.571, 0.6], [0.623, 0.652], [0.675, 0.704]], ventFaces: [0, 1, 2, 3, 5, 6, 7] });
  for (const z of [0.447, 0.787]) K.lathe([[0.03, z - 0.008], [0.069, z - 0.008], [0.069, z + 0.007], [0.03, z + 0.007]], gunMid, { y: 0.015, seg: 8, phase: Math.PI / 8 });
  // GB-174 (Jerry: a gap between the receiver and the shield): a barrel-nut sleeve runs from the receiver face (z 0.26)
  // to the shield's rear ring, so no bare barrel shows.
  K.lathe([[0.022, 0.255], [0.056, 0.255], [0.058, 0.262], [0.058, 0.27], [0.055, 0.275], [0.055, 0.444], [0.022, 0.444]], gunMid, { y: 0.015, seg: 16 });
  // GB-173 (Jerry: the sights did not line up): the front post rises on the bore's centre line to the height of the
  // carry handle's rear aperture (its centre y 0.168), with a clamp under it and protective ears either side.
  // GB-174 (Jerry: the ears floated): a clamp ring round the shroud carries a solid base; the post and both ears rise from it.
  K.lathe([[0.063, 0.737], [0.07, 0.737], [0.071, 0.74], [0.071, 0.76], [0.07, 0.763], [0.063, 0.763]], gunDark, { y: 0.015, seg: 18 });
  K.box(0.036, 0.018, 0.026, gunDark, 0, 0.088, 0.75, 0, 0, 0, null, 0.003);
  K.box(0.008, 0.092, 0.012, gunDark, 0, 0.122, 0.75, 0, 0, 0, null, 0.002);
  for (const sx of [-1, 1]) K.box(0.005, 0.098, 0.018, gunDark, sx * 0.0145, 0.126, 0.75, 0, 0, 0, null, 0.0015);
  // GB-173 (Jerry: no barrel inside the shroud): the barrel runs from the receiver through the vented shroud to the brake.
  K.lathe([[0, 0.25], [0.021, 0.25], [0.021, 0.74], [0.03, 0.75], [0.03, 0.905], [0, 0.905]], gunAccent, { y: 0.015, seg: 12 });   // GB-189: mostly inside the shroud
  K.lathe([[0, 0.902], [0.034, 0.902], [0.038, 0.91], [0.038, 0.97], [0.034, 0.976], [0.014, 0.976], [0.014, 0.966], [0, 0.966]], gunMid, { y: 0.015, seg: 14 });
  K.disc(0.0095, gunRubber, 0, 0.015, 0.9765, 0, null, 12);   // GB-173: the bore at the muzzle
  for (let i = 0; i < 3; i++) K.box(0.08, 0.008, 0.01, gunRubber, 0, 0.015, 0.92 + i * 0.018);
  gunEffects(gun, new THREE.Vector3(0, 0.015, 0.98), 0.08, 3.4, 7);
  gun.userData.laser.position.set(0, 0.015, 4.4);
  gun.userData.laserBaseZ = 0.95;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  return finishGun(gun);
}

export function makeShotgunModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, shellRedMat, brassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // The v2 reference has a rolled receiver shoulder and a continuous curved wrist.
  // Keep the grip's palm center while joining its upper tang to the stock arch.
  K.slab([[0.23, -0.041], [0.23, 0.073], [0.13, 0.073],
    ...profileCurve([0.13, 0.073], [0.06, 0.068], [-0.035, 0.088], 5),
    ...profileCurve([-0.035, 0.088], [-0.087, 0.095], [-0.137, 0.085], 5), [-0.195, 0.055], [-0.192, -0.035],
    ...profileCurve([-0.192, -0.035], [-0.129, -0.066], [-0.056, -0.045], 5), [0.09, -0.038], [0.135, -0.046]], 0.106, gunBody, { bevel: 0.011, segs: 3 });
  K.slab([[0.011, 0.05], [0.145, 0.05], [0.153, 0.039], [0.149, 0.013], [0.013, 0.013]], 0.003, gunRubber, { x: 0.0535, bevel: 0.003 });
  K.slab([[0.026, 0.047], [0.142, 0.047], [0.143, 0.035], [0.026, 0.035]], 0.002, gunAccent, { x: 0.055, bevel: 0.001 });
  K.box(0.05, 0.004, 0.14, gunRubber, 0, -0.047, 0.08);
  for (const sx of [-1, 1]) {
    K.slab([[0.229, 0.018], [0.125, 0.018], [0.097, 0.007], [0.103, -0.008], [0.13, -0.014], [0.229, -0.014]], 0.002, gunDark, { x: sx * 0.053, bevel: 0.002 });
    K.slab(gunBand([[-0.172, 0.049], [-0.127, 0.063], [-0.09, 0.065], [-0.051, 0.046], [0.006, 0.04]], 0.002), 0.002, gunMid, { x: sx * 0.051, bevel: 0.001 });
    K.cyl(0.005, 0.005, 0.003, gunDark, sx * 0.054, -0.027, -0.025, null, 8, 'x');
  }
  K.box(0.018, 0.008, 0.022, gunDark, 0, 0.083, -0.13, 0.2, 0, 0, null, 0.003);
  // Stock with a recoil pad; the pistol grip, trigger guard and trigger; a sling loop.
  K.slab([[-0.186, 0.056], ...profileCurve([-0.186, 0.056], [-0.229, 0.011], [-0.266, 0.027], 5),
    [-0.302, 0.057], [-0.454, 0.052], [-0.468, 0.048], [-0.469, -0.118], [-0.454, -0.121],
    ...profileCurve([-0.454, -0.121], [-0.346, -0.064], [-0.306, -0.07], 5), [-0.27, -0.094],
    ...profileCurve([-0.27, -0.094], [-0.228, -0.025], [-0.196, -0.035], 5), [-0.155, -0.044]], 0.084, gunPoly, { bevel: 0.012, segs: 3 });
  K.slab([[-0.494, 0.055], [-0.464, 0.054], [-0.47, -0.12], [-0.491, -0.124], [-0.496, -0.103]], 0.088, gunRubber, { bevel: 0.008 });
  K.slab([[-0.294, 0.047], [-0.45, 0.047], [-0.447, 0.024], [-0.424, 0.014], [-0.326, 0.026]], 0.087, gunPoly, { bevel: 0.007, segs: 3 });
  K.slab(gunBand([[-0.251, -0.044], [-0.204, -0.017], [-0.167, -0.019], [-0.105, -0.062]], 0.02), 0.07, gunPoly, { bevel: 0.008, segs: 3 });
  // Grip centre line is still gripOutline(-0.06, -0.1, 0.16, …, 0.28): the palm stays at the hold.
  // GB-178 (Jerry: grips were butchered): a clean pistol grip: an even front strap, a filled backstrap up into the stock arch on the same centre line and hand anchor (u 0.42, v 0).
  K.slab(shapedGrip(-0.06, -0.1, 0.16, 0.068, 0.28, [
    [-0.18, 0.006], [-0.08, 0.020], [0.08, 0.026], [0.3, 0.026], [0.5, 0.028], [0.72, 0.026], [0.94, 0.016],
    [1.02, -0.002], [0.96, -0.028], [0.7, -0.034], [0.42, -0.032], [0.16, -0.026], [-0.04, -0.034], [-0.16, -0.010]
  ]), 0.054, gunPoly, { bevel: 0.009, segs: 3 });
  // GB-180 pass 5 (the guard read as a hook): an 870-style trigger plate that hangs 12 mm below the receiver, full
  // width, its front and back faces squared, and a deep moulded guard loop (18 mm band) dropping from it; the trigger
  // sits in the middle of the opening.
  K.slab([[0.086, -0.034], [-0.036, -0.034], [-0.04, -0.044], [-0.03, -0.058], [0.08, -0.058], [0.088, -0.048]], 0.074, gunDark, { bevel: 0.005, segs: 2 });
  K.slab(gunBand([[0.072, -0.056], [0.076, -0.08], [0.064, -0.098], [0.012, -0.1], [-0.012, -0.09], [-0.02, -0.056]], 0.009), 0.04, gunDark, { bevel: 0.005, segs: 2 });
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire.
  K.slab([[0.0384, -0.0471], [0.0303, -0.0589], [0.0319, -0.0699], [0.0405, -0.0795], [0.0355, -0.0845], [0.0241, -0.0741], [0.0197, -0.0571], [0.0276, -0.0409]], 0.012, gunAccent, { bevel: 0.002 });
  K.tor(0.012, 0.004, gunDark, 0, -0.088, -0.4, 0, Math.PI / 2, 0);
  // Closed-action pump extends forward, while its original root and palm contact
  // stay put. Action bars, groove panels and lips all move with that same root.
  const pump = K.group(0, -0.02, 0.28);
  K.slab([[-0.04, 0.014], [-0.025, 0.047], [0.0, 0.052], [0.213, 0.052], [0.244, 0.034], [0.25, -0.057], [0.237, -0.061],
    [0.212, -0.041], [0.024, -0.038], [-0.019, -0.06], [-0.04, -0.054]], 0.102, gunPoly, { bevel: 0.013, segs: 3, parent: pump });
  for (let i = 0; i < 10; i++) {
    const z = 0.018 + i * 0.0195;
    K.slab([[z - 0.004, 0.034], [z + 0.004, 0.034], [z + 0.006, -0.041], [z - 0.006, -0.041]], 0.108, gunPoly, { bevel: 0.003, parent: pump });
  }
  for (const sx of [-1, 1]) {
    K.box(0.004, 0.011, 0.052, gunRubber, sx * 0.05, 0.037, 0.195, 0, 0, 0, pump, 0.003);
    K.box(0.007, 0.01, 0.16, gunAccent, sx * 0.028, 0.016, -0.084, 0, 0, 0, pump, 0.001);
  }
  gun.userData.pump = pump;
  gun.userData.basePumpPos = pump.position.clone();
  // Barrel + mag tube locked to the receiver (sibling of pump). Pump racks along the
  // tube; these must NOT share the pump transform or they float away on fire/pump.
  // Lengthened + extended rearward so they always overlap the forend travel (0.24)
  // and the receiver — short tubes used to leave a visible gap when the pump racked.
  const receiver = K.group(0, 0, 0);
  K.lathe([[0, 0.16], [0.03, 0.16], [0.03, 0.935], [0, 0.935]], gunAccent, { y: 0.03, seg: 14, parent: receiver });
  K.box(0.016, 0.006, 0.72, gunDark, 0, 0.066, 0.56, 0, 0, 0, receiver);
  for (let i = 0; i < 14; i++) K.box(0.006, 0.008, 0.008, gunDark, 0, 0.06, 0.22 + i * 0.05, 0, 0, 0, receiver);
  K.sph(0.0075, brassMat, 0, 0.074, 0.915, receiver);
  K.lathe([[0, 0.11], [0.022, 0.11], [0.022, 0.8], [0, 0.8]], gunDark, { y: -0.04, seg: 12, parent: receiver });
  K.lathe([[0, 0.795], [0.026, 0.795], [0.026, 0.825], [0.02, 0.84], [0, 0.84]], gunBody, { y: -0.04, seg: 12, parent: receiver });
  K.box(0.04, 0.11, 0.025, gunDark, 0, -0.005, 0.76, 0, 0, 0, receiver, 0.008);
  K.tor(0.012, 0.004, gunDark, 0, -0.07, 0.76, 0, Math.PI / 2, 0, receiver);
  K.lathe([[0, 0.92], [0.035, 0.92], [0.035, 0.95], [0.031, 0.952], [0.022, 0.952], [0.022, 0.945], [0, 0.945]], gunDark, { y: 0.03, seg: 14, parent: receiver });
  gun.userData.receiver = receiver;
  gunEffects(gun, new THREE.Vector3(0, 0.03, 0.97), 0.07, 3.2, 7);
  gun.userData.laser.position.set(0, 0.03, 4.5);
  gun.userData.laserBaseZ = 0.99;
  gun.userData.barrelAssembly = null;
  // Tube-load shell flash (hidden until reload insert beats)
  const loadShell = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.04, 8), shellRedMat);
  const loadRim = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.007, 8), brassMat);
  loadRim.position.y = -0.017;
  loadShell.add(loadRim);
  loadShell.rotation.x = Math.PI / 2;
  // Near magazine-tube loading port (under receiver / rear of tube)
  loadShell.position.set(0.02, -0.05, 0.22);
  loadShell.visible = false;
  gun.add(loadShell);
  gun.userData.reloadShell = loadShell;
  gun.userData.baseReloadShellPos = loadShell.position.clone();
  gunSuppressor(gun, K, 'shotgun');   // CL-95
  return finishGun(gun);
}

export function makeSniperModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, gunSuppressor, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, gunTan, steelMat, glassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // A short magwell and open rear chassis visibly separate the magazine and grip.
  // The black grip stays at the established hand anchor behind the magazine.
  K.slab([[-0.025, 0.028], [0.2, 0.028], [0.2, -0.04], [0.185, -0.05], [0.07, -0.05], [0.064, -0.062], [-0.016, -0.062], [-0.025, -0.049]], 0.1, gunTan, { bevel: 0.008 });
  K.slab([[-0.3, 0.03], [-0.251, 0.03], [-0.239, 0.019], [-0.239, -0.039], [-0.3, -0.051]], 0.09, gunTan, { bevel: 0.006 });
  K.slab([[-0.26, -0.034], [-0.024, -0.034], [-0.024, -0.052], [-0.26, -0.052]], 0.079, gunTan, { bevel: 0.003 });
  // Fore-end side slots have depth and open backgrounds, with a stiff bottom web.
  K.box(0.071, 0.012, 0.455, gunTan, 0, -0.035, 0.417, 0, 0, 0, null, 0.004);
  for (const sx of [-1, 1]) {
    K.slab([[0.197, 0.042], [0.635, 0.042], [0.647, 0.029], [0.64, 0.012], [0.197, 0.012]], 0.009, gunTan, { x: sx * 0.0375, bevel: 0.003 });
    K.slab([[0.197, -0.014], [0.64, -0.014], [0.65, -0.024], [0.635, -0.042], [0.197, -0.042]], 0.009, gunTan, { x: sx * 0.0375, bevel: 0.003 });
    for (let i = 0; i <= 5; i++) {
      const z = 0.208 + i * 0.083;
      K.slab([[z - 0.012, -0.026], [z + 0.012, -0.026], [z + 0.012, 0.027], [z - 0.012, 0.027]], 0.009, gunTan, { x: sx * 0.0375, bevel: 0.004 });
    }
    for (const z of [0.204, 0.632]) for (const y of [-0.027, 0.029]) K.cyl(0.004, 0.004, 0.003, gunDark, sx * 0.043, y, z, null, 8, 'x');
    for (const z of [-0.266, 0.153]) K.cyl(0.0045, 0.0045, 0.003, gunDark, sx * (z < 0 ? 0.046 : 0.05), -0.014, z, null, 8, 'x');
  }
  K.box(0.076, 0.058, 0.017, gunTan, 0, -0.001, 0.645, 0, 0, 0, null, 0.005);
  K.rail(0.2, 0, -0.045, 0.5, null, 0.04, 2);
  // Folded bipod under the fore-end.
  K.box(0.05, 0.03, 0.04, gunDark, 0, -0.055, 0.6);
  for (const sx of [-1, 1]) {
    K.cyl(0.008, 0.008, 0.24, gunDark, sx * 0.02, -0.07, 0.48, null, 8);
    K.box(0.02, 0.014, 0.02, gunRubber, sx * 0.02, -0.07, 0.35, 0, 0, 0, null, 0.003);
    K.cyl(0.011, 0.011, 0.025, gunBody, sx * 0.02, -0.07, 0.393, null, 10);
    K.cyl(0.013, 0.013, 0.012, gunBody, sx * 0.029, -0.056, 0.593, null, 12, 'x');
  }
  // Trigger guard, trigger, grip, magazine.
  K.slab(gunBand([[-0.03, -0.05], [-0.031, -0.075], [-0.042, -0.086], [-0.072, -0.083], [-0.082, -0.07]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-174 (Jerry: the trigger was backwards): face toward the grip, tip curling forward.
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire.
  K.slab([[-0.0441, -0.052], [-0.0487, -0.0625], [-0.048, -0.07], [-0.0435, -0.0755], [-0.0485, -0.0805], [-0.056, -0.074], [-0.0593, -0.0615], [-0.0559, -0.048]], 0.01, gunAccent, { bevel: 0.002 });
  // The old tang was buried in a solid receiver. Trim only that hidden upper end
  // into the new chassis bridge; the grip's palm center and lower contour stay put.
  K.slab(gripOutline(-0.12, -0.1, 0.16, 0.07, 0.25).map(([z, y]) => [z, Math.min(y, -0.04)]), 0.062, gunPoly, { bevel: 0.014, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab([[-0.107, -0.055], [-0.085, -0.069], [-0.121, -0.174], [-0.158, -0.168], [-0.164, -0.146], [-0.13, -0.058]], 0.003, gunRubber, { x: sx * 0.03, bevel: 0.002 });
    K.cyl(0.004, 0.004, 0.003, gunDark, sx * 0.032, -0.101, -0.121, null, 8, 'x');
  }
  const mag = K.group(0, -0.12, 0.02);
  K.slab([[-0.04, 0.07], [0.04, 0.07], [0.04, -0.07], [-0.04, -0.07]], 0.05, gunAccent, { bevel: 0.006, parent: mag });
  K.slab([[-0.043, -0.068], [0.043, -0.068], [0.043, -0.083], [-0.043, -0.083]], 0.056, gunDark, { bevel: 0.004, parent: mag });
  for (const sx of [-1, 1]) for (const z of [-0.026, 0.026]) K.box(0.0025, 0.113, 0.004, gunBody, sx * 0.025, -0.004, z, 0, 0, 0, mag, 0.001);
  K.box(0.021, 0.017, 0.007, gunDark, 0, -0.064, -0.031, 0, 0, 0, null, 0.002);
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Skeleton stock: the top bar, a cheek riser on two posts, the lower bar, the butt and pad, a rear monopod.
  // GB-180 pass 6 (vs an AXMC-style chassis: a solid, deep stock with a tall cheek riser and a thick pad; ours was a
  // thin open skeleton): one solid stock body from the action to the pad, deeper at the butt.
  K.slab([[-0.245, 0.062], [-0.6, 0.062], [-0.6, -0.112], [-0.56, -0.114], [-0.43, -0.082], [-0.31, -0.06], [-0.245, -0.045]], 0.074, gunTan, { bevel: 0.012, segs: 3 });
  K.slab([[-0.32, 0.058], [-0.535, 0.058], [-0.535, 0.122], [-0.37, 0.128], [-0.32, 0.106]], 0.07, gunTan, { bevel: 0.01, segs: 3 });   // GB-180: a tall cheek riser
  for (const z of [-0.36, -0.48]) for (const sx of [-1, 1]) K.cyl(0.008, 0.008, 0.004, steelMat, sx * 0.036, 0.09, z, null, 8, 'x');   // riser clamp knobs
  K.slab(gunBand([[-0.3, -0.052], [-0.45, -0.075], [-0.575, -0.098]], 0.015), 0.062, gunTan, { bevel: 0.01 });
  K.slab([[-0.566, 0.068], [-0.594, 0.068], [-0.598, -0.1], [-0.57, -0.104]], 0.07, gunTan, { bevel: 0.01 });
  K.slab([[-0.598, 0.074], [-0.636, 0.074], [-0.64, -0.118], [-0.602, -0.122]], 0.084, gunRubber, { bevel: 0.01 });   // GB-180: a thick pad
  for (const sx of [-1, 1]) {
    for (const [z, y] of [[-0.29, 0.025], [-0.29, -0.025], [-0.584, 0.052], [-0.588, -0.081]]) K.cyl(0.0045, 0.0045, 0.003, gunDark, sx * 0.035, y, z, null, 8, 'x');
    K.slab(gunBand([[-0.309, -0.05], [-0.444, -0.076], [-0.564, -0.098]], 0.002), 0.003, gunBody, { x: sx * 0.031, bevel: 0.001 });
  }
  K.cyl(0.01, 0.01, 0.1, gunDark, 0, -0.12, -0.5, null, 6, 'y');
  K.cyl(0.014, 0.014, 0.015, gunBody, 0, -0.127, -0.5, null, 12, 'y');
  K.box(0.04, 0.02, 0.1, gunTan, 0, -0.03, -0.26, 0, 0, 0, null, 0.006);
  // GB-173 (Jerry: a gap in the stock above the grip): the chassis is solid through the wrist, rear block to magwell,
  // under the action and above the grip and trigger.
  K.slab([[-0.245, 0.014], [-0.026, 0.014], [-0.026, -0.04], [-0.245, -0.04]], 0.07, gunTan, { bevel: 0.006 });
  // Round action with its bolt shroud, and the rail.
  // GB-180 pass 6: a beefier round action (r 0.036 -> 0.042), a big bolt shroud and a recoil lug under it.
  K.lathe([[0, -0.272], [0.026, -0.272], [0.036, -0.25], [0.042, -0.24], [0.042, 0.14], [0.034, 0.152], [0, 0.152]], gunBody, { y: 0.045, seg: 18 });
  K.lathe([[0, -0.3], [0.02, -0.3], [0.03, -0.29], [0.032, -0.27], [0, -0.27]], gunDark, { y: 0.045, seg: 14 });
  K.box(0.07, 0.03, 0.03, gunDark, 0, 0.012, 0.12, 0, 0, 0, null, 0.004);
  K.rail(0.34, 0, 0.085, -0.02, null, 0.04);
  // Fluted heavy barrel, tapered, and a chunky ported brake.
  // GB-180 pass 5 (vs a real heavy-barrel bolt gun: ours was a pencil): a 30%-fatter contour barrel, deeper flutes, a
  // bigger brake with real side ports.
  K.lathe([[0, 0.13], [0.034, 0.13], [0.034, 0.2], [0.031, 0.225], [0.023, 1.1], [0, 1.1]], gunAccent, { y: 0.04, seg: 16 });   // tip under t217 probe radius
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; K.box(0.007, 0.007, 0.46, gunDark, Math.cos(a) * 0.0265, 0.04 + Math.sin(a) * 0.0265, 0.78, 0, 0, a); }
  K.slab([[1.095, 0.015], [1.2, 0.015], [1.205, 0.022], [1.205, 0.058], [1.2, 0.065], [1.095, 0.065]], 0.06, gunMid, { bevel: 0.01 });   // pass 5: brake kept inside the can (t217)
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) K.box(0.006, 0.03, 0.018, gunRubber, sx * 0.03, 0.04, 1.115 + i * 0.03);
  // Scope: ocular, tube, saddle and objective in one turned profile; a rubber eyecup; turrets; rings.
  K.lathe([[0, -0.218], [0.031, -0.218], [0.036, -0.21], [0.036, -0.175], [0.03, -0.16], [0.026, -0.14], [0.0255, -0.13], [0.0255, 0.165], [0.03, 0.19],
           [0.042, 0.25], [0.0435, 0.3], [0.0435, 0.318], [0.038, 0.322], [0, 0.322]], gunDark, { y: 0.14, seg: 18 });
  K.lathe([[0.031, -0.236], [0.037, -0.236], [0.037, -0.214], [0.031, -0.214], [0.031, -0.236]], gunRubber, { y: 0.14, seg: 16 });
  K.disc(0.036, glassMat, 0, 0.14, 0.3225, 0, null, 16);
  K.disc(0.029, glassMat, 0, 0.14, -0.2185, Math.PI, null, 14);
  K.box(0.056, 0.058, 0.075, gunDark, 0, 0.14, 0.05, 0, 0, 0, null, 0.012);
  K.cyl(0.019, 0.019, 0.04, gunMid, 0, 0.189, 0.05, null, 14, 'y');
  K.cyl(0.019, 0.019, 0.04, gunMid, 0.048, 0.14, 0.05, null, 14, 'x');
  K.cyl(0.016, 0.016, 0.035, gunMid, -0.046, 0.14, 0.05, null, 12, 'x');
  // GB-174 (Jerry: the rings floated): each ring's base sits flush on the rail top (0.092), jaws hug the rail's sides
  // with a cross-bolt through a rail slot; a split ring clamps the 0.0255 tube on its axis (y 0.14).
  for (const z of [-0.061, 0.147]) {
    K.box(0.05, 0.016, 0.022, gunDark, 0, 0.1, z, 0, 0, 0, null, 0.003);
    for (const sx of [-1, 1]) K.box(0.006, 0.02, 0.022, gunDark, sx * 0.025, 0.092, z, 0, 0, 0, null, 0.0015);
    K.cyl(0.003, 0.003, 0.062, gunMid, 0, 0.088, z, null, 8, 'x');
    K.box(0.03, 0.01, 0.018, gunDark, 0, 0.11, z, 0, 0, 0, null, 0.002);
    K.lathe([[0.0255, z - 0.009], [0.0315, z - 0.009], [0.033, z - 0.007], [0.033, z + 0.007], [0.0315, z + 0.009], [0.0255, z + 0.009]], gunDark, { y: 0.14, seg: 20 });
    for (const sx of [-1, 1]) K.cyl(0.0035, 0.0035, 0.006, gunMid, sx * 0.0335, 0.14, z, null, 8, 'x');
  }
  for (const z of [-0.164, -0.151, 0.303]) K.lathe([[0.025, z - 0.003], [z > 0 ? 0.045 : 0.032, z - 0.003], [z > 0 ? 0.045 : 0.032, z + 0.003], [0.025, z + 0.003]], gunBody, { y: 0.14, seg: 20 });
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    K.box(0.003, 0.015, 0.003, gunDark, Math.cos(a) * 0.0192, 0.199, 0.05 + Math.sin(a) * 0.0192, 0, -a, 0, null, 0);
  }
  // Bolt handle — GB-146 (Jerry, 2026-10-09: "The sniper bolt is on the wrong side"): on the gun's right (-x) now,
  // where it was on the left (+x). Lifts by turning about the bolt's axis (boltSide sets which way), worked between
  // shots and after the magazine is seated on a reload (sniperBoltPose).
  const bolt = K.group(-0.055, 0.055, -0.18);
  K.box(0.018, 0.018, 0.09, gunMid, 0, 0, 0, 0, 0, 0, bolt, 0.006);
  K.cyl(0.0065, 0.0065, 0.07, gunAccent, -0.035, 0.012, 0.02, bolt, 8, 'x');
  K.sph(0.017, gunDark, -0.075, 0.012, 0.02, bolt, 12);
  K.cyl(0.008, 0.008, 0.018, gunBody, -0.048, 0.012, 0.02, bolt, 12, 'x');
  K.tor(0.012, 0.0015, gunBody, -0.082, 0.012, 0.02, 0, Math.PI / 2, 0, bolt, Math.PI * 2, 12);
  bolt.userData.gb145Grab = new THREE.Vector3(-0.075, 0.012, 0.02);   // the support hand takes the knob
  gun.userData.bolt = bolt;
  gun.userData.boltSide = -1;
  gun.userData.baseBoltPos = bolt.position.clone();
  gun.userData.baseBoltRot = bolt.rotation.clone();
  gunEffects(gun, new THREE.Vector3(0, 0.04, 1.22), 0.055, 3.5, 10, 0.005);
  gun.userData.laser.position.set(0, 0.04, 6.2);
  gun.userData.laserBaseZ = 1.2;
  gun.userData.barrelAssembly = null;
  gunSuppressor(gun, K, 'sniper');   // CL-95
  return finishGun(gun);
}
