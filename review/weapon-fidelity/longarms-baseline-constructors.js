function makeM4() {
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
  // Trigger guard, the curved trigger, the pistol grip.
  K.slab(gunBand([[-0.002, -0.104], [-0.004, -0.13], [-0.022, -0.137], [-0.046, -0.126]], 0.0035), 0.014, gunBody, { bevel: 0.002 });
  K.slab(gunBand([[-0.01, -0.058], [-0.011, -0.078], [-0.016, -0.095]], 0.0032), 0.008, gunDark, { bevel: 0.002 });
  K.slab(gripOutline(-0.08, -0.12, 0.18, 0.08, 0.3), 0.064, gunPoly, { bevel: 0.014, segs: 3 });
  // Buffer tube and its castle nut; the stock with a cheek rest and a rubber pad; the lever, a sling cup.
  K.lathe([[0, -0.505], [0.014, -0.505], [0.0175, -0.5], [0.0175, -0.19], [0.021, -0.188], [0.021, -0.168], [0, -0.168]], gunDark, { y: 0.035, seg: 12 });
  K.slab([[-0.33, 0.04], [-0.335, 0.058], [-0.47, 0.062], [-0.548, 0.074], [-0.553, 0.068], [-0.553, -0.074], [-0.547, -0.08], [-0.5, -0.07],
          [-0.45, -0.03], [-0.4, 0.0], [-0.36, 0.006], [-0.333, 0.01]], 0.066, gunPoly, { bevel: 0.012, segs: 3 });
  K.slab([[-0.569, 0.077], [-0.552, 0.077], [-0.552, -0.08], [-0.567, -0.083]], 0.072, gunRubber, { bevel: 0.006 });
  K.box(0.018, 0.03, 0.022, gunDark, 0, -0.006, -0.345);
  K.cyl(0.009, 0.009, 0.07, gunDark, 0, 0.032, -0.52, null, 8, 'x');
  // Free-float handguard: the barrel nut, an octagon with M-LOK slots, a full-length top rail on a riser.
  K.lathe([[0.012, 0.186], [0.03, 0.186], [0.03, 0.206], [0.012, 0.206]], gunDark, { y: 0.02, seg: 12 });
  K.lathe([[0.03, 0.206], [0.047, 0.21], [0.047, 0.58], [0.042, 0.588], [0.016, 0.588]], gunMid, { y: 0.02, seg: 8, phase: Math.PI / 8 });
  K.box(0.03, 0.016, 0.37, gunMid, 0, 0.071, 0.395, 0, 0, 0, null, 0.004);
  K.rail(0.37, 0, 0.085, 0.395);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) K.box(0.004, 0.012, 0.042, gunDark, sx * 0.0436, 0.02, 0.27 + i * 0.08);
  for (let i = 0; i < 3; i++) K.box(0.012, 0.004, 0.042, gunDark, 0, 0.02 - 0.0436, 0.3 + i * 0.09);
  // Barrel, the low gas block, the folding front sight, the A2 birdcage.
  K.lathe([[0, 0.18], [0.014, 0.18], [0.014, 0.6], [0.014, 0.6], [0.0125, 0.606], [0.0125, 0.915], [0, 0.915]], gunAccent, { y: 0.02, seg: 12 });
  K.box(0.03, 0.034, 0.03, gunDark, 0, 0.022, 0.614, 0, 0, 0, null, 0.004);
  K.slab([[0.535, 0.09], [0.578, 0.09], [0.57, 0.118], [0.548, 0.12]], 0.022, gunDark, { bevel: 0.003 });
  K.box(0.005, 0.02, 0.005, gunDark, 0, 0.128, 0.558);
  K.lathe([[0, 0.912], [0.0125, 0.912], [0.0125, 0.918], [0.0148, 0.925], [0.0148, 0.975], [0.012, 0.978], [0.006, 0.978], [0.006, 0.97], [0, 0.97]], gunDark, { y: 0.02, seg: 12 });
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * 0.62; K.box(0.005, 0.005, 0.034, gunRubber, Math.cos(a) * 0.0146, 0.02 + Math.sin(a) * 0.0146, 0.952, 0, 0, a); }
  // Holographic sight on the upper's rail; a weapon light on the right of the handguard.
  K.box(0.05, 0.02, 0.11, gunDark, 0, 0.1, 0.0, 0, 0, 0, null, 0.004);
  for (const sx of [-1, 1]) K.slab([[-0.05, 0.108], [0.052, 0.108], [0.05, 0.158], [-0.042, 0.162]], 0.006, gunDark, { x: sx * 0.026, bevel: 0.002 });
  K.box(0.058, 0.01, 0.1, gunDark, 0, 0.163, 0.004, 0, 0, 0, null, 0.003);
  K.box(0.046, 0.044, 0.003, glassMat, 0, 0.134, 0.045);
  K.box(0.008, 0.008, 0.004, sightDotMat, 0, 0.134, 0.043);
  for (const z of [-0.02, 0.0]) K.box(0.008, 0.008, 0.012, gunRubber, 0.03, 0.118, z);
  K.box(0.016, 0.022, 0.032, gunDark, 0.052, 0.02, 0.505);
  K.lathe([[0, 0.468], [0.015, 0.468], [0.015, 0.532], [0.019, 0.542], [0.019, 0.56], [0.015, 0.561], [0, 0.561]], gunDark, { x: 0.066, y: 0.02, seg: 12 });
  K.disc(0.014, gaugeFace, 0.066, 0.02, 0.5615, 0);
  // Magazine: a polymer mag with its curve, the grip ribs, a floorplate.
  const mag = K.group(0, -0.16, 0.05);
  K.slab([[-0.046, 0.108], ...profileCurve([-0.046, 0.03], [-0.042, -0.05], [-0.024, -0.104], 5), ...profileCurve([0.072, -0.098], [0.05, -0.04], [0.046, 0.03], 5), [0.046, 0.108]],
    0.058, magPoly, { bevel: 0.006, parent: mag });
  for (const [y, z] of [[-0.045, 0.012], [-0.06, 0.016], [-0.075, 0.021]]) K.box(0.061, 0.005, 0.084, magPoly, 0, y, z, 0, 0, 0, mag, 0.002);
  K.slab([[-0.03, -0.1], [0.078, -0.094], [0.08, -0.112], [-0.03, -0.118]], 0.066, magPoly, { bevel: 0.005, parent: mag });
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Sling swivel.
  K.tor(0.012, 0.003, gunDark, 0, -0.035, 0.52, 0, Math.PI / 2, 0);
  gunEffects(gun, new THREE.Vector3(0, 0.02, 0.98), 0.06, 3.5, 8);
  gun.userData.laser.position.set(0, 0.02, 5);
  gun.userData.laserBaseZ = 1;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'm4');   // CL-95
  return finishGun(gun);
}

function makeAk() {
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Stamped receiver with its rivets, the front trunnion, the rear tang falling to the stock.
  K.slab([[-0.225, 0.048], [-0.225, -0.032], [-0.2, -0.045], [0.252, -0.045], [0.252, 0.05], [0.2, 0.055], [-0.205, 0.055]], 0.088, gunBody, { bevel: 0.006 });
  K.box(0.092, 0.096, 0.05, gunMid, 0, 0.005, 0.225, 0, 0, 0, null, 0.008);
  for (const sx of [-1, 1]) for (const [ry, rz] of [[0.03, 0.2], [-0.02, 0.2], [0.03, 0.24], [-0.03, -0.15], [-0.03, 0.12], [0.02, -0.19]]) K.cyl(0.006, 0.006, 0.006, gunDark, sx * 0.045, ry, rz, null, 6, 'x');
  // Dust cover, ribbed, and its latch; the rear sight block and leaf.
  K.slab([[-0.208, 0.045], [0.168, 0.045], [0.168, 0.084], [0.155, 0.09], [-0.17, 0.094], [-0.208, 0.078]], 0.084, gunMid, { bevel: 0.018, segs: 3 });
  for (let i = 0; i < 4; i++) K.box(0.06, 0.005, 0.012, gunDark, 0, 0.094, -0.16 + i * 0.03);
  K.box(0.03, 0.012, 0.03, gunDark, 0, 0.086, -0.21);
  K.slab([[0.168, 0.05], [0.25, 0.05], [0.25, 0.068], [0.19, 0.09], [0.168, 0.09]], 0.05, gunDark, { bevel: 0.004 });
  K.box(0.034, 0.007, 0.075, gunDark, 0, 0.094, 0.2, -0.06);
  K.box(0.01, 0.016, 0.01, gunAccent, 0, 0.1, 0.23);
  // Right side: the long safety lever and its tab, the charging handle on the carrier.
  K.slab(gunBand([[-0.17, 0.036], [-0.02, 0.03], [0.005, 0.008]], 0.008), 0.006, gunDark, { x: 0.047, bevel: 0.002 });
  K.box(0.006, 0.03, 0.018, gunDark, 0.047, 0.004, 0.012);
  K.box(0.04, 0.018, 0.02, gunDark, 0.062, 0.042, 0.13, 0, 0, 0, null, 0.005);
  K.sph(0.012, gunDark, 0.083, 0.042, 0.13, null, 8);
  // Trigger guard, the magazine release in front of it, the trigger, the wooden grip.
  K.slab(gunBand([[-0.012, -0.044], [-0.012, -0.076], [-0.022, -0.088], [-0.038, -0.086]], 0.004), 0.016, gunDark, { bevel: 0.002 });
  K.box(0.022, 0.024, 0.006, gunDark, 0, -0.058, -0.009);
  K.slab(gunBand([[-0.018, -0.044], [-0.019, -0.062], [-0.025, -0.074]], 0.003), 0.008, gunDark, { bevel: 0.002 });
  K.slab(gripOutline(-0.1, -0.14, 0.19, 0.085, 0.34, 0.4), 0.064, woodMat, { bevel: 0.015, segs: 3 });
  // Stock: the dropped wooden butt with its wrist, a steel buttplate, the tang, a sling loop.
  K.slab([[-0.222, 0.042], [-0.26, 0.04], [-0.4, 0.013], [-0.564, -0.004], [-0.572, -0.01], [-0.578, -0.148], [-0.57, -0.153], [-0.47, -0.118],
          [-0.36, -0.074], [-0.3, -0.054], [-0.245, -0.041], [-0.222, -0.036]], 0.07, woodMat, { bevel: 0.018, segs: 3 });
  K.slab([[-0.592, 0.0], [-0.573, -0.004], [-0.579, -0.152], [-0.597, -0.156]], 0.074, gunDark, { bevel: 0.004 });
  K.box(0.078, 0.022, 0.05, gunDark, 0, 0.033, -0.236);
  K.tor(0.014, 0.004, gunDark, 0, -0.122, -0.45, 0, Math.PI / 2, 0);
  // Handguards: the lower with its palm swell and grooves, the upper over the gas tube, the steel bands.
  K.slab([[0.244, 0.03], [0.53, 0.03], [0.535, 0.0], [0.53, -0.048], [0.45, -0.062], [0.33, -0.063], [0.262, -0.055], [0.244, -0.04]], 0.086, woodMat, { bevel: 0.016, segs: 3 });
  for (const y of [-0.012, -0.028]) K.box(0.088, 0.004, 0.2, woodDark, 0, y, 0.39);
  K.slab([[0.25, 0.05], [0.448, 0.05], [0.448, 0.072], [0.438, 0.088], [0.262, 0.088], [0.25, 0.076]], 0.06, woodMat, { bevel: 0.016, segs: 3 });
  for (const z of [0.236, 0.532]) K.box(0.092, 0.09, 0.016, gunDark, 0, -0.012, z, 0, 0, 0, null, 0.006);
  K.lathe([[0, 0.44], [0.016, 0.44], [0.016, 0.556], [0, 0.556]], gunDark, { y: 0.068, seg: 10 });
  K.slab([[0.54, 0.084], [0.6, 0.078], [0.6, -0.022], [0.54, -0.026]], 0.045, gunMid, { bevel: 0.006 });
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
  for (const w of [0.3, 0.7]) K.slab(gunBand(magB.map((b, i) => [b[0] * (1 - w) + magF[i][0] * w, b[1] * (1 - w) + magF[i][1] * w]).slice(1, 7), 0.006), 0.065, gunAccent, { bevel: 0.002, parent: mag });
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

function makeAa12() {
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Slab-sided receiver: bolted side plates and ribs.
  K.slab([[-0.26, 0.07], [-0.26, -0.074], [-0.242, -0.09], [0.26, -0.09], [0.26, 0.08], [0.244, 0.09], [-0.226, 0.09]], 0.14, gunMid, { bevel: 0.014 });
  for (const sx of [-1, 1]) {
    K.box(0.01, 0.1, 0.4, gunBody, sx * 0.071, -0.01, 0.0, 0, 0, 0, null, 0.004);
    for (let i = 0; i < 4; i++) K.box(0.012, 0.012, 0.3, gunDark, sx * 0.074, 0.05 - i * 0.03, -0.02);
    for (const [by, bz] of [[0.03, 0.17], [-0.05, 0.17], [0.03, -0.17], [-0.05, -0.17]]) K.cyl(0.006, 0.006, 0.006, gunAccent, sx * 0.077, by, bz, null, 6, 'x');
  }
  // Carry rail: two uprights, a slotted top rail, the rear sight on it.
  for (const z of [-0.14, 0.2]) K.slab([[z - 0.03, 0.088], [z + 0.03, 0.088], [z + 0.02, 0.132], [z - 0.02, 0.132]], 0.05, gunDark, { bevel: 0.004 });
  K.rail(0.4, 0, 0.14, 0.03, null, 0.05);
  K.box(0.04, 0.03, 0.03, gunDark, 0, 0.165, -0.12);
  // Ejection port, charging handle.
  K.box(0.004, 0.05, 0.12, gunRubber, 0.072, 0.045, 0.1);
  K.box(0.03, 0.02, 0.03, gunDark, -0.08, 0.05, 0.18);
  // Stock: moulded polymer with its skeleton cut, a rubber pad.
  K.slab([[-0.26, 0.066], [-0.5, 0.058], [-0.548, 0.068], [-0.552, -0.074], [-0.52, -0.08], [-0.46, -0.045], [-0.3, -0.045], [-0.26, -0.07]], 0.1, gunPoly, { bevel: 0.02, segs: 3 });
  K.slab([[-0.47, 0.028], [-0.32, 0.028], [-0.32, -0.014], [-0.44, -0.014]], 0.102, gunRubber, { bevel: 0.004 });
  K.slab([[-0.572, 0.072], [-0.55, 0.072], [-0.55, -0.078], [-0.57, -0.082]], 0.106, gunRubber, { bevel: 0.008 });
  // Pistol grip, trigger guard, trigger.
  K.slab(gripOutline(-0.1, -0.16, 0.19, 0.09, 0.3), 0.072, gunPoly, { bevel: 0.015, segs: 3 });
  K.slab(gunBand([[0.002, -0.088], [0.0, -0.118], [-0.018, -0.13], [-0.04, -0.124]], 0.004), 0.014, gunMid, { bevel: 0.002 });
  K.slab(gunBand([[-0.014, -0.088], [-0.016, -0.104], [-0.022, -0.116]], 0.0032), 0.009, gunAccent, { bevel: 0.002 });
  // AA-12 drum: its axis along the bore, the round faces front and back, a hub, bolts, the feed tower.
  const mag = new THREE.Group();
  K.lathe([[0.085, -0.1], [0.148, -0.1], [0.155, -0.093], [0.155, 0.093], [0.148, 0.1], [0.085, 0.1]], gunAccent, { parent: mag, seg: 28 });
  K.lathe([[0, -0.106], [0.085, -0.106], [0.085, 0.106], [0, 0.106]], gunDark, { parent: mag, seg: 16 });
  for (const sz of [-1, 1]) {
    K.tor(0.13, 0.008, gunDark, 0, 0, sz * 0.1, 0, 0, 0, mag, Math.PI * 2, 24);
    K.tor(0.055, 0.01, gunMid, 0, 0, sz * 0.106, 0, 0, 0, mag, Math.PI * 2, 16);
    K.cyl(0.028, 0.028, 0.02, gunMid, 0, 0, sz * 0.11, mag, 10);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; K.cyl(0.01, 0.01, 0.014, gunMid, Math.sin(a) * 0.11, Math.cos(a) * 0.11, sz * 0.101, mag, 6); }
  }
  K.box(0.1, 0.1, 0.12, gunAccent, 0, 0.155, 0.0, 0, 0, 0, mag, 0.012);
  K.box(0.11, 0.02, 0.13, gunDark, 0, 0.21, 0.0, 0, 0, 0, mag, 0.006);
  K.box(0.02, 0.04, 0.16, gunMid, 0, -0.12, -0.12, 0.15, 0, 0, mag, 0.004);
  mag.position.set(0, -0.26, 0.05);
  mag.rotation.set(0, 0, 0);
  gun.add(mag);
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Handguard with vents, the perforated shroud, the front sight, the barrel and its brake.
  K.slab([[0.23, 0.035], [0.49, 0.035], [0.49, -0.06], [0.475, -0.066], [0.25, -0.066], [0.23, -0.052]], 0.11, gunBody, { bevel: 0.014 });
  for (let i = 0; i < 4; i++) K.box(0.113, 0.008, 0.2, gunDark, 0, -0.045 + i * 0.02, 0.37);
  K.lathe([[0.03, 0.45], [0.045, 0.455], [0.045, 0.78], [0.034, 0.79], [0.03, 0.79]], gunDark, { y: 0.015, seg: 14 });
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const a = r * 0.9 - 0.9; K.box(0.012, 0.012, 0.03, gunRubber, Math.sin(a) * 0.046, 0.015 + Math.cos(a) * 0.046, 0.49 + i * 0.05, 0, 0, -a); }
  K.box(0.012, 0.05, 0.02, gunDark, 0, 0.07, 0.75);
  K.lathe([[0, 0.74], [0.03, 0.74], [0.03, 0.905], [0, 0.905]], gunAccent, { y: 0.015, seg: 12 });
  K.lathe([[0, 0.902], [0.034, 0.902], [0.038, 0.91], [0.038, 0.97], [0.034, 0.976], [0.014, 0.976], [0.014, 0.966], [0, 0.966]], gunMid, { y: 0.015, seg: 14 });
  for (let i = 0; i < 3; i++) K.box(0.08, 0.008, 0.01, gunRubber, 0, 0.015, 0.92 + i * 0.018);
  gunEffects(gun, new THREE.Vector3(0, 0.015, 0.98), 0.08, 3.4, 7);
  gun.userData.laser.position.set(0, 0.015, 4.4);
  gun.userData.laserBaseZ = 0.95;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  return finishGun(gun);
}

function makeShotgun() {
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Receiver: the high back sloping to the stock, the ejection and loading ports, a sidesaddle of shells, the tang safety.
  K.slab([[-0.19, 0.06], [-0.19, -0.036], [-0.172, -0.046], [0.23, -0.046], [0.23, 0.07], [0.216, 0.084], [-0.15, 0.084]], 0.108, gunBody, { bevel: 0.012 });
  K.box(0.004, 0.045, 0.12, gunRubber, 0.055, 0.035, 0.06);
  K.box(0.05, 0.004, 0.14, gunRubber, 0, -0.047, 0.08);
  K.slab([[-0.07, 0.058], [0.13, 0.058], [0.13, -0.018], [-0.07, -0.018]], 0.012, gunPoly, { x: -0.06, bevel: 0.004 });
  for (let i = 0; i < 5; i++) {
    K.cyl(0.015, 0.015, 0.065, shellRedMat, -0.078, 0.02, -0.04 + i * 0.035, null, 8, 'y');
    K.cyl(0.016, 0.016, 0.014, brassMat, -0.078, -0.018, -0.04 + i * 0.035, null, 8, 'y');
  }
  K.box(0.018, 0.008, 0.022, gunDark, 0, 0.087, -0.13, 0, 0, 0, null, 0.003);
  // Stock with a recoil pad; the pistol grip, trigger guard and trigger; a sling loop.
  K.slab([[-0.186, 0.066], [-0.45, 0.05], [-0.462, 0.052], [-0.468, -0.088], [-0.46, -0.092], [-0.36, -0.07], [-0.25, -0.05], [-0.186, -0.038]], 0.084, gunPoly, { bevel: 0.018, segs: 3 });
  K.slab([[-0.494, 0.055], [-0.464, 0.054], [-0.47, -0.092], [-0.496, -0.095]], 0.088, gunRubber, { bevel: 0.008 });
  K.slab(gripOutline(-0.06, -0.1, 0.16, 0.08, 0.28), 0.066, gunPoly, { bevel: 0.014, segs: 3 });
  K.slab(gunBand([[0.05, -0.044], [0.05, -0.068], [0.04, -0.078], [0.006, -0.078], [-0.008, -0.068]], 0.004), 0.014, gunDark, { bevel: 0.002 });
  K.slab(gunBand([[0.024, -0.044], [0.023, -0.058], [0.016, -0.068]], 0.0032), 0.008, gunAccent, { bevel: 0.002 });
  K.tor(0.012, 0.004, gunDark, 0, -0.088, -0.4, 0, Math.PI / 2, 0);
  // Pump (moves): a rounded fore-end with grip rings.
  const pump = K.group(0, -0.02, 0.28);
  K.slab([[-0.11, 0.042], [0.11, 0.042], [0.11, -0.034], [0.098, -0.048], [-0.098, -0.048], [-0.11, -0.034]], 0.098, gunPoly, { bevel: 0.028, segs: 3, parent: pump });
  for (let i = 0; i < 6; i++) K.box(0.1, 0.092, 0.01, gunRubber, 0, -0.003, -0.08 + i * 0.032, 0, 0, 0, pump, 0.02);
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

function makeSniper() {
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Chassis: the action bed and its magwell, the slotted fore-end, the rails.
  K.slab([[-0.3, 0.03], [0.2, 0.03], [0.2, -0.04], [0.188, -0.05], [0.07, -0.05], [0.064, -0.062], [-0.016, -0.062], [-0.022, -0.05], [-0.3, -0.05]], 0.1, gunTan, { bevel: 0.012 });
  K.slab([[0.19, 0.042], [0.638, 0.042], [0.652, 0.028], [0.652, -0.028], [0.638, -0.042], [0.19, -0.042]], 0.085, gunTan, { bevel: 0.016, segs: 3 });
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) K.box(0.004, 0.02, 0.05, gunRubber, sx * 0.043, -0.005, 0.25 + i * 0.075);
  K.rail(0.2, 0, -0.045, 0.5, null, 0.04, 2);
  // Folded bipod under the fore-end.
  K.box(0.05, 0.03, 0.04, gunDark, 0, -0.055, 0.6);
  for (const sx of [-1, 1]) { K.cyl(0.008, 0.008, 0.24, gunDark, sx * 0.02, -0.07, 0.48, null, 6); K.box(0.02, 0.014, 0.02, gunRubber, sx * 0.02, -0.07, 0.35); }
  // Trigger guard, trigger, grip, magazine.
  K.slab(gunBand([[-0.03, -0.05], [-0.031, -0.075], [-0.042, -0.086], [-0.072, -0.083], [-0.082, -0.07]], 0.004), 0.014, gunDark, { bevel: 0.002 });
  K.slab(gunBand([[-0.05, -0.05], [-0.052, -0.064], [-0.058, -0.074]], 0.0032), 0.008, gunAccent, { bevel: 0.002 });
  K.slab(gripOutline(-0.12, -0.1, 0.16, 0.07, 0.25), 0.062, gunPoly, { bevel: 0.014, segs: 3 });
  const mag = K.group(0, -0.12, 0.02);
  K.slab([[-0.04, 0.07], [0.04, 0.07], [0.04, -0.07], [-0.04, -0.07]], 0.05, gunAccent, { bevel: 0.006, parent: mag });
  K.slab([[-0.043, -0.068], [0.043, -0.068], [0.043, -0.083], [-0.043, -0.083]], 0.056, gunDark, { bevel: 0.004, parent: mag });
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Skeleton stock: the top bar, a cheek riser on two posts, the lower bar, the butt and pad, a rear monopod.
  K.slab([[-0.25, 0.06], [-0.582, 0.06], [-0.582, 0.03], [-0.25, 0.03]], 0.07, gunTan, { bevel: 0.012 });
  K.slab([[-0.33, 0.072], [-0.52, 0.072], [-0.52, 0.1], [-0.36, 0.106], [-0.33, 0.094]], 0.056, gunPoly, { bevel: 0.012, segs: 3 });
  for (const z of [-0.36, -0.48]) K.cyl(0.006, 0.006, 0.014, steelMat, 0, 0.066, z, null, 6, 'y');
  K.slab(gunBand([[-0.3, -0.052], [-0.45, -0.075], [-0.575, -0.098]], 0.015), 0.062, gunTan, { bevel: 0.01 });
  K.slab([[-0.566, 0.068], [-0.594, 0.068], [-0.598, -0.1], [-0.57, -0.104]], 0.07, gunTan, { bevel: 0.01 });
  K.slab([[-0.596, 0.072], [-0.618, 0.072], [-0.622, -0.104], [-0.6, -0.108]], 0.075, gunRubber, { bevel: 0.008 });
  K.cyl(0.01, 0.01, 0.1, gunDark, 0, -0.12, -0.5, null, 6, 'y');
  K.box(0.04, 0.02, 0.1, gunDark, 0, -0.03, -0.26, 0, 0, 0, null, 0.006);
  // Round action with its bolt shroud, and the rail.
  K.lathe([[0, -0.262], [0.022, -0.262], [0.03, -0.24], [0.036, -0.232], [0.036, 0.14], [0.03, 0.15], [0, 0.15]], gunBody, { y: 0.045, seg: 16 });
  K.rail(0.34, 0, 0.085, -0.02, null, 0.04);
  // Fluted heavy barrel, tapered, and a chunky ported brake.
  K.lathe([[0, 0.13], [0.027, 0.13], [0.027, 0.2], [0.024, 0.215], [0.02, 1.1], [0, 1.1]], gunAccent, { y: 0.04, seg: 14 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.785; K.box(0.006, 0.006, 0.4, gunDark, Math.cos(a) * 0.022, 0.04 + Math.sin(a) * 0.022, 0.8); }
  K.slab([[1.095, 0.015], [1.2, 0.015], [1.205, 0.022], [1.205, 0.058], [1.2, 0.065], [1.095, 0.065]], 0.06, gunMid, { bevel: 0.01 });
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
  for (const z of [-0.06, 0.15]) { K.box(0.06, 0.018, 0.035, gunDark, 0, 0.1, z); K.tor(0.028, 0.006, gunMid, 0, 0.14, z); }
  // Bolt handle — GB-146 (Jerry, 2026-10-09: "The sniper bolt is on the wrong side"): on the gun's right (-x) now,
  // where it was on the left (+x). Lifts by turning about the bolt's axis (boltSide sets which way), worked between
  // shots and after the magazine is seated on a reload (sniperBoltPose).
  const bolt = K.group(-0.055, 0.055, -0.18);
  K.box(0.018, 0.018, 0.09, gunMid, 0, 0, 0, 0, 0, 0, bolt, 0.006);
  K.cyl(0.0065, 0.0065, 0.07, gunAccent, -0.035, 0.012, 0.02, bolt, 8, 'x');
  K.sph(0.017, gunDark, -0.075, 0.012, 0.02, bolt, 12);
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
