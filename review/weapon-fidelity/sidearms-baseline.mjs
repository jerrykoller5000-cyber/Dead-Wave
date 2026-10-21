// Exact pre-GP-164 sidearm constructors, retained for CPU contract comparison.

export function makePistolModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, gunSuppressor, finishGun, gunBody, gunDark, gunMid, gunPoly, gunRubber, gunAccent, magPoly, gaugeFace, sightDotMat, glassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Slide (moves): chamfered top, rear and front serrations, sights, the ejection port and extractor.
  const slide = K.group(0, 0.05, 0.05);
  K.slab([[-0.14, -0.042], [0.14, -0.042], [0.14, 0.03], [0.133, 0.047], [0.12, 0.055], [-0.13, 0.055], [-0.14, 0.046]], 0.072, gunBody, { bevel: 0.007, segs: 1, parent: slide });
  for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) K.box(0.003, 0.058, 0.005, gunDark, sx * 0.0355, 0.004, -0.128 + i * 0.01, 0, 0, 0, slide);
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) K.box(0.003, 0.048, 0.005, gunDark, sx * 0.0355, 0.006, 0.088 + i * 0.01, 0, 0, 0, slide);
  K.slab([[-0.128, 0.052], [-0.098, 0.052], [-0.102, 0.072], [-0.124, 0.072]], 0.032, gunDark, { bevel: 0.003, parent: slide });
  for (const sx of [-1, 1]) K.box(0.005, 0.006, 0.002, gaugeFace, sx * 0.008, 0.066, -0.1285, 0, 0, 0, slide);
  K.slab([[0.1, 0.052], [0.122, 0.052], [0.118, 0.068], [0.106, 0.068]], 0.01, gunDark, { bevel: 0.002, parent: slide });
  K.box(0.005, 0.005, 0.002, sightDotMat, 0, 0.064, 0.0995, 0, 0, 0, slide);
  K.box(0.004, 0.028, 0.062, gunRubber, 0.036, 0.022, 0.02, 0, 0, 0, slide);
  K.box(0.004, 0.008, 0.04, gunDark, 0.0365, 0.008, -0.03, 0, 0, 0, slide);
  // Barrel hood lives on the frame (below), not the slide — otherwise reload rack
  // peels a gunAccent chunk off the muzzle and reads as the barrel detaching.
  // Frame: the dust cover with an accessory rail, the trigger guard, trigger, controls.
  K.slab([[-0.1, 0.013], [0.17, 0.013], [0.172, -0.028], [0.162, -0.034], [0.13, -0.034], [0.124, -0.028], [0.02, -0.03], [-0.02, -0.028], [-0.1, -0.018]], 0.066, gunPoly, { bevel: 0.008 });
  K.rail(0.07, 0, -0.04, 0.15, null, 0.04);
  K.slab(gunBand([[0.128, -0.028], [0.128, -0.07], [0.116, -0.082], [0.04, -0.082], [0.022, -0.07], [0.014, -0.05]], 0.0055), 0.016, gunPoly, { bevel: 0.004 });
  K.slab(gunBand([[0.075, -0.028], [0.073, -0.05], [0.066, -0.068]], 0.004), 0.012, gunDark, { bevel: 0.002 });
  K.box(0.006, 0.014, 0.04, gunDark, -0.034, 0.008, 0.06);                               // slide stop
  K.box(0.006, 0.02, 0.02, gunDark, -0.034, -0.02, 0.03);                                // mag release
  // Grip: a beavertail, texture panels, the magazine's base below.
  K.slab(gripOutline(-0.02, -0.08, 0.18, 0.1, 0.25, 1.6), 0.066, gunPoly, { bevel: 0.014, segs: 3 });
  for (const sx of [-1, 1]) K.slab([[0.02, -0.07], [0.008, -0.145], [-0.058, -0.128], [-0.048, -0.06]], 0.004, gunRubber, { x: sx * 0.032, bevel: 0.001 });
  const mag = K.group(0, -0.14, -0.01);
  K.slab([[-0.04, 0.06], [0.04, 0.06], [0.04, -0.06], [-0.04, -0.06]], 0.054, magPoly, { bevel: 0.005, rx: 0.25, parent: mag });
  K.slab([[-0.054, -0.058], [0.046, -0.058], [0.048, -0.074], [-0.056, -0.078]], 0.064, magPoly, { bevel: 0.006, rx: 0.25, parent: mag });
  gun.userData.slide = slide;
  gun.userData.mag = mag;
  gun.userData.baseSlidePos = slide.position.clone();
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Barrel + compensator locked to the frame group (receiver). Slide is a sibling
  // that racks over them on reload. Barrel is lengthened rearward into the dust
  // cover so a racked slide never leaves the muzzle floating off the gun body
  // (see kickPistolRecoil / slideKick). Reload slide travel is 0.13 — barrel must
  // stay continuous through that full rack (no floating stub in the ejection window).
  const frame = K.group(0, 0, 0);
  // Dust-cover shelf under the barrel — bridges polymer receiver to muzzle so the
  // barrel stays visually locked when the slide racks back on reload.
  K.box(0.062, 0.028, 0.26, gunPoly, 0, 0.018, 0.12, 0, 0, 0, frame, 0.01);
  K.box(0.055, 0.02, 0.20, gunDark, 0, 0.036, 0.09, 0, 0, 0, frame, 0.006);          // chamber block
  K.box(0.03, 0.022, 0.07, gunAccent, 0.0, 0.055, 0.09, 0, 0, 0, frame, 0.006);      // barrel hood (frame-locked)
  K.lathe([[0, -0.02], [0.0145, -0.02], [0.0145, 0.262], [0, 0.262]], gunAccent, { y: 0.05, seg: 12, parent: frame });
  K.slab([[0.232, 0.024], [0.306, 0.024], [0.31, 0.068], [0.3, 0.075], [0.24, 0.075], [0.232, 0.068]], 0.05, gunDark, { bevel: 0.008, parent: frame });
  for (let i = 0; i < 3; i++) K.box(0.03, 0.006, 0.01, gunRubber, 0, 0.076, 0.25 + i * 0.018, 0, 0, 0, frame);
  K.disc(0.012, gunRubber, 0, 0.05, 0.3105, 0, frame, 10);
  gun.userData.frame = frame;
  gunEffects(gun, new THREE.Vector3(0, 0.05, 0.32), 0.045, 2.5, 6, 0.005);
  gun.userData.laser.position.set(0, 0.05, 3.3);
  gun.userData.laserBaseZ = 0.3;
  gun.userData.barrelAssembly = null;
  gunSuppressor(gun, K, 'pistol');   // CL-95
  return finishGun(gun);
}

export function makeRevolverModel(ctx) {
  const { THREE, gunKit, gunBand, gunArc, gunEffects, finishGun, steelMat, woodMat, woodDark, gunDark, gunAccent, gunRubber, brassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Stainless frame round the cylinder's window: the recoil shield and hammer housing, the top strap, the
  // bottom of the window, the barrel lug; the rear-sight notch, the cylinder latch.
  K.slab([[-0.095, 0.098], [-0.02, 0.112], [-0.02, -0.012], [-0.084, -0.012], [-0.1, 0.02]], 0.078, steelMat, { bevel: 0.01 });
  K.slab([[-0.03, 0.096], [0.075, 0.096], [0.075, 0.113], [-0.03, 0.113]], 0.044, steelMat, { bevel: 0.006 });
  K.slab([[-0.03, -0.012], [0.075, -0.012], [0.075, 0.003], [-0.03, 0.003]], 0.066, steelMat, { bevel: 0.006 });
  K.slab([[0.058, 0.112], [0.095, 0.104], [0.095, -0.004], [0.058, -0.012]], 0.06, steelMat, { bevel: 0.01 });
  for (const sx of [-1, 1]) K.box(0.012, 0.012, 0.014, gunDark, sx * 0.012, 0.117, -0.05);
  K.box(0.006, 0.012, 0.02, gunDark, -0.04, 0.004, -0.04);
  // Grip: round-butt wood with a medallion each side; the round trigger guard, the trigger.
  K.slab([[0.025, -0.008], [0.01, -0.06], [0.006, -0.08], [-0.008, -0.12], [-0.02, -0.148], [-0.042, -0.166], [-0.07, -0.162], [-0.088, -0.142],
          [-0.086, -0.09], [-0.07, -0.032], [-0.066, -0.002], [-0.03, 0.002]], 0.068, woodMat, { bevel: 0.016, segs: 3 });
  for (const sx of [-1, 1]) K.cyl(0.011, 0.011, 0.004, brassMat, sx * 0.0345, -0.065, -0.035, null, 10, 'x');
  K.tor(0.035, 0.006, steelMat, 0, -0.035, 0.04, 0, Math.PI / 2, 0, null, Math.PI * 1.3, 12);
  K.box(0.01, 0.04, 0.012, gunDark, 0, -0.02, 0.035, 0.3);
  // Cylinder (swings out / rotates): fluted, chamfered at the front, the chambers front and back.
  const cylinder = K.group(0, 0.05, 0.02);
  K.lathe([[0, -0.04], [0.05, -0.04], [0.055, -0.034], [0.055, 0.032], [0.049, 0.04], [0, 0.04]], steelMat, { parent: cylinder, seg: 24 });
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, fa = a + Math.PI / 6;
    K.box(0.014, 0.014, 0.06, gunAccent, Math.cos(fa) * 0.055, Math.sin(fa) * 0.055, 0, 0, 0, fa, cylinder);
    K.disc(0.009, gunDark, Math.cos(a) * 0.033, Math.sin(a) * 0.033, -0.0405, Math.PI, cylinder, 6);
    K.disc(0.01, gunDark, Math.cos(a) * 0.033, Math.sin(a) * 0.033, 0.0405, 0, cylinder, 6);
  }
  gun.userData.cylinder = cylinder;
  gun.userData.baseCylinderRot = cylinder.rotation.clone();
  gun.userData.baseCylinderPos = cylinder.position.clone();
  gun.userData.mag = cylinder;
  gun.userData.baseMagPos = cylinder.position.clone();
  gun.userData.baseMagRot = cylinder.rotation.clone();
  // Barrel with a full underlug, a ventilated rib, the front sight blade, the ejector rod.
  K.lathe([[0, 0.09], [0.022, 0.09], [0.022, 0.378], [0.019, 0.382], [0, 0.382]], steelMat, { y: 0.05, seg: 14 });
  K.slab([[0.09, 0.04], [0.372, 0.04], [0.38, 0.03], [0.376, 0.008], [0.11, 0.006], [0.09, 0.0]], 0.034, steelMat, { bevel: 0.008 });
  K.box(0.016, 0.012, 0.28, steelMat, 0, 0.074, 0.24);
  for (let i = 0; i < 5; i++) K.box(0.018, 0.006, 0.02, gunDark, 0, 0.074, 0.14 + i * 0.05);
  K.slab([[0.35, 0.08], [0.375, 0.08], [0.375, 0.1], [0.362, 0.1]], 0.006, gunDark, { bevel: 0.001 });
  K.cyl(0.006, 0.006, 0.1, steelMat, 0, 0.0, 0.1, null, 6);
  K.disc(0.013, gunRubber, 0, 0.05, 0.3825, 0, null, 10);
  // Hammer (cocks and falls): the body and a chequered spur.
  const hammer = K.group(0, 0.1, -0.08);
  K.slab([[-0.012, -0.03], [0.014, -0.03], [0.016, 0.006], [0.004, 0.024], [-0.028, 0.038], [-0.034, 0.03], [-0.016, 0.012]], 0.022, gunDark, { bevel: 0.004, parent: hammer });
  K.box(0.026, 0.006, 0.02, gunAccent, 0, 0.034, -0.026, -0.5, 0, 0, hammer, 0.002);
  gun.userData.hammer = hammer;
  gun.userData.baseHammerRot = hammer.rotation.clone();
  gun.userData.baseHammerPos = hammer.position.clone();
  gunEffects(gun, new THREE.Vector3(0, 0.05, 0.4), 0.045, 2.8, 6, 0.005);
  gun.userData.laser.position.set(0, 0.05, 3.4);
  gun.userData.laserBaseZ = 0.4;
  gun.userData.barrelAssembly = null;
  return finishGun(gun);
}

export function makeUziModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, gunSuppressor, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Stamped receiver with pressed ribs; the top cover and its cocking knob.
  K.slab([[-0.14, -0.04], [0.22, -0.04], [0.22, 0.078], [-0.122, 0.078], [-0.14, 0.06]], 0.098, gunBody, { bevel: 0.01 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) K.box(0.006, 0.012, 0.3, gunMid, sx * 0.0495, 0.05 - i * 0.035, 0.04);
  K.slab([[-0.13, 0.074], [0.2, 0.074], [0.2, 0.098], [-0.11, 0.104], [-0.13, 0.094]], 0.09, gunMid, { bevel: 0.012 });
  K.cyl(0.014, 0.014, 0.03, gunDark, 0, 0.114, 0.11, null, 8, 'y');
  K.sph(0.016, gunDark, 0, 0.13, 0.11);
  // Sights with their protective ears.
  for (const sx of [-1, 1]) { K.box(0.008, 0.045, 0.03, gunAccent, sx * 0.022, 0.124, -0.08); K.box(0.008, 0.04, 0.02, gunAccent, sx * 0.018, 0.114, 0.2); }
  K.box(0.022, 0.03, 0.02, gunAccent, 0, 0.12, -0.08);
  K.box(0.005, 0.03, 0.006, gunAccent, 0, 0.115, 0.2);
  // Folding stock: struts along the sides and the butt plate.
  K.box(0.05, 0.06, 0.1, gunDark, 0, 0.04, -0.18, -0.15, 0, 0, null, 0.012);
  for (const sx of [-1, 1]) K.box(0.01, 0.012, 0.22, gunMid, sx * 0.04, 0.02, -0.12, 0.05);
  K.box(0.09, 0.06, 0.015, gunDark, 0, 0.0, -0.24, 0, 0, 0, null, 0.005);
  K.box(0.03, 0.03, 0.12, gunMid, 0.04, 0.05, -0.16, 0, 0.45, 0);
  // Grip with the grip safety at the back, the big trigger guard, trigger, selector.
  K.slab(gripOutline(-0.02, -0.1, 0.16, 0.08, 0.22, 0.2), 0.064, gunPoly, { bevel: 0.014, segs: 3 });
  K.box(0.03, 0.07, 0.02, gunDark, 0, -0.08, -0.07, 0.22);
  K.slab(gunBand([[0.088, -0.04], [0.09, -0.068], [0.078, -0.079], [0.03, -0.079], [0.018, -0.07]], 0.005), 0.014, gunDark, { bevel: 0.003 });
  K.slab(gunBand([[0.052, -0.04], [0.05, -0.056], [0.044, -0.066]], 0.0035), 0.01, gunAccent, { bevel: 0.002 });
  K.box(0.006, 0.02, 0.02, gunDark, -0.052, -0.02, 0.0);
  // The narrow magazine passes through the grip. Bake its rake into the inner
  // assembly: reload animates the outer group back to zero at insertion.
  const mag = K.group(0, -0.205, -0.0435);
  const stick = new THREE.Group(); stick.rotation.x = 0.22; mag.add(stick);
  K.slab([[-0.022, 0.115], [0.022, 0.115], [0.022, -0.109], [-0.022, -0.109]], 0.036, gunAccent, { bevel: 0.003, parent: stick });
  for (const sx of [-1, 1]) K.box(0.003, 0.18, 0.006, gunDark, sx * 0.0185, 0, 0, 0, 0, 0, stick);
  K.slab([[-0.026, -0.106], [0.026, -0.106], [0.026, -0.119], [-0.026, -0.119]], 0.042, gunDark, { bevel: 0.003, parent: stick });
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Front of the receiver, the knurled barrel nut, the threaded barrel.
  K.slab([[0.18, -0.01], [0.34, -0.01], [0.34, 0.07], [0.18, 0.07]], 0.08, gunMid, { bevel: 0.016, segs: 3 });
  K.lathe([[0, 0.325], [0.035, 0.325], [0.035, 0.355], [0, 0.355]], gunDark, { y: 0.03, seg: 16 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.box(0.006, 0.006, 0.03, gunAccent, Math.cos(a) * 0.036, 0.03 + Math.sin(a) * 0.036, 0.34); }
  K.lathe([[0, 0.34], [0.017, 0.34], [0.017, 0.455], [0.02, 0.458], [0.02, 0.475], [0.012, 0.478], [0, 0.478]], gunAccent, { y: 0.03, seg: 12 });
  gunEffects(gun, new THREE.Vector3(0, 0.03, 0.48), 0.05, 2.8, 7, 0.005);
  gun.userData.laser.position.set(0, 0.03, 4.0);
  gun.userData.laserBaseZ = 0.45;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'uzi');   // CL-95
  return finishGun(gun);
}

export function makeKnifeModel(ctx) {
  const { THREE, gunKit, gunBand, mergeRigidMeshes, gunDark, gunPoly, gunAccent, bladeMat, edgeMat, gloveMat, brassMat } = ctx;
  const g = new THREE.Group();
  const kn = new THREE.Group();
  g.add(kn);
  const K = gunKit(kn);
  // Combat knife: a pommel and a ridged grip, a crossguard, a clip-point blade with its fuller and edge.
  K.lathe([[0, -0.142], [0.024, -0.142], [0.031, -0.13], [0.031, -0.116], [0, -0.116]], gunDark, { parent: kn, seg: 12 });
  const ridges = [[0, -0.118], [0.026, -0.118]];
  for (let i = 0; i < 5; i++) { const z = -0.105 + i * 0.024; ridges.push([0.026, z - 0.008], [0.029, z - 0.004], [0.029, z + 0.004], [0.026, z + 0.008]); }
  ridges.push([0.027, 0.02], [0, 0.02]);
  K.lathe(ridges, gunPoly, { parent: kn, seg: 12 });
  K.slab([[0.02, 0.056], [0.044, 0.05], [0.044, -0.05], [0.02, -0.056]], 0.03, gunDark, { rz: Math.PI / 2, bevel: 0.006, parent: kn });
  K.slab([[0.042, 0.016], [0.26, 0.016], [0.31, 0.011], [0.382, -0.002], [0.34, -0.014], [0.27, -0.018], [0.042, -0.018]], 0.008, bladeMat, { rz: Math.PI / 2, bevel: 0.0028, segs: 1, parent: kn });
  K.slab(gunBand([[0.07, 0.004], [0.24, 0.004]], 0.003), 0.0095, gunDark, { rz: Math.PI / 2, bevel: 0.001, parent: kn });
  K.slab(gunBand([[0.046, -0.018], [0.27, -0.018], [0.34, -0.014], [0.38, -0.002]], 0.0016), 0.003, edgeMat, { rz: Math.PI / 2, bevel: 0.0006, segs: 1, parent: kn });
  // Machete: long, wide, slightly swept blade with a black polymer grip and
  // a flared tip — reads as a different tool at a glance.
  const mc = new THREE.Group();
  mc.visible = false;
  g.add(mc);
  const M = gunKit(mc);
  M.slab([[-0.152, 0.024], [0.02, 0.026], [0.02, -0.03], [-0.03, -0.034], [-0.1, -0.03], [-0.148, -0.04], [-0.16, -0.022]], 0.032, gloveMat, { bevel: 0.01, segs: 3, parent: mc });
  for (const z of [-0.11, -0.07, -0.03]) M.cyl(0.005, 0.005, 0.036, gunDark, 0, 0, z, mc, 8, 'x');
  M.box(0.05, 0.075, 0.02, gunDark, 0, 0, 0.03, 0, 0, 0, mc, 0.006);
  M.slab([[0.035, 0.031], [0.48, 0.028], [0.56, 0.02], [0.63, 0.0], [0.64, -0.022], [0.6, -0.055], [0.5, -0.068], [0.035, -0.031]], 0.008, bladeMat, { bevel: 0.0028, segs: 1, parent: mc });
  M.slab(gunBand([[0.04, 0.028], [0.48, 0.026], [0.56, 0.018]], 0.0022), 0.0095, gunDark, { bevel: 0.001, parent: mc });
  M.slab(gunBand([[0.038, -0.031], [0.5, -0.068], [0.6, -0.055], [0.638, -0.022]], 0.0018), 0.003, edgeMat, { bevel: 0.0006, segs: 1, parent: mc });
  g.userData.knifeModel = kn;
  g.userData.macheteModel = mc;
  mergeRigidMeshes(g, {}, new Set([kn, mc]));
  g.visible = false;
  return g;
}
