// GP-164: reference-based sidearms and blades. Animation and gameplay stay with the caller.

// Millimetre-scale knurl teeth do not need the rounded box helper's subdivisions.
function flatDetail(T, parent, mat, w, h, d, x, y, z, rz = 0) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z); mesh.rotation.z = rz;
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

// Shallow checkering is one small mesh per panel, then folded into the caller's
// material batch. It uses the existing furniture material, so camo still works.
function checkeredPanel(T, parent, mat, outline, x, spacing = .007, radius = .0012) {
  const inside = (z, y) => {
    let hit = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i], b = outline[j];
      if ((a[1] > y) !== (b[1] > y) && z < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  };
  const ys = outline.map(p => p[1]), zs = outline.map(p => p[0]);
  const p = [], n = [], uv = [], ix = [], sign = x < 0 ? -1 : 1;
  let row = 0;
  for (let y = Math.min(...ys) + spacing; y < Math.max(...ys) - radius; y += spacing, row++) {
    for (let z = Math.min(...zs) + spacing * (row % 2 ? .5 : 1); z < Math.max(...zs) - radius; z += spacing) {
      if (![[z, y + radius], [z + radius, y], [z, y - radius], [z - radius, y]].every(q => inside(...q))) continue;
      const at = p.length / 3;
      for (const [dy, dz] of [[-radius, 0], [0, radius], [radius, 0], [0, -radius]]) {
        p.push(x, y + dy, z + dz); n.push(sign, 0, 0); uv.push((z + dz) * 4, (y + dy) * 4);
      }
      ix.push(...(sign > 0 ? [at, at + 2, at + 1, at, at + 3, at + 2] : [at, at + 1, at + 2, at, at + 2, at + 3]));
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(n, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(ix);
  const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

// A ground blade has an actual recessed fuller and broad cutting bevels, rather
// than a dark bar floating over a flat plate. Stations are [z, top, edge, groove].
function groundBlade(T, parent, metal, edgeMat, stations, {rotate = 0, fuller = .003, half = .004, edgeWidth = .009} = {}) {
  const buffers = [[], []];
  const section = ([z, top, bottom, groove]) => {
    const span = top - bottom, h = Math.min(half, span * .2), fy = Math.min(top - span * .18, Math.max(bottom + span * .45, fuller));
    const q = Math.min(.003, span * .08), recess = h * .38 * groove;
    const upper = top - Math.min(.003, span * .12), lower = bottom + Math.min(edgeWidth, span * .28);
    return [[0, top], [h, upper], [h, fy + q], [h - recess, fy + q * .4], [h - recess, fy - q * .4], [h, fy - q], [h, lower], [0, bottom], [-h, lower], [-h, fy - q], [-h + recess, fy - q * .4], [-h + recess, fy + q * .4], [-h, fy + q], [-h, upper]].map(([x, y]) => [x, y, z]);
  };
  const rings = stations.map(section), count = rings[0].length;
  const tri = (buffer, a, b, c) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    if (Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) < 1e-12) return;
    buffer.push(...a, ...b, ...c);
  };
  for (let row = 0; row + 1 < rings.length; row++) for (let j = 0; j < count; j++) {
    const next = (j + 1) % count, dst = buffers[j === 6 || j === 7 ? 1 : 0];
    tri(dst, rings[row][j], rings[row + 1][next], rings[row][next]);
    tri(dst, rings[row][j], rings[row + 1][j], rings[row + 1][next]);
  }
  for (const row of [0, rings.length - 1]) {
    const center = [0, (stations[row][1] + stations[row][2]) * .5, stations[row][0]];
    for (let j = 0; j < count; j++) {
      const a = rings[row][j], b = rings[row][(j + 1) % count];
      tri(buffers[0], center, ...(row === 0 ? [a, b] : [b, a]));
    }
  }
  for (let i = 0; i < buffers.length; i++) {
    const geo = new T.BufferGeometry(), p = buffers[i], uv = [];
    for (let j = 0; j < p.length; j += 3) uv.push(p[j + 2] * 4, p[j + 1] * 4);
    geo.setAttribute('position', new T.Float32BufferAttribute(p, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, i ? edgeMat : metal); mesh.rotation.z = rotate;
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
  }
}

function flutedCylinder(T, parent, mat) {
  const p = [], uv = [], ix = [], n = 72;
  // Match the old flutes' outer width while cutting the grooves into the shell.
  const rOuter = .05618532;
  const rings = [[-.04, .05, 0], [-.034, rOuter, 0], [-.026, rOuter, 1], [.022, rOuter, 1], [.032, rOuter, 0], [.04, .049, 0]];
  for (const [z, r, fade] of rings) for (let j = 0; j <= n; j++) {
    const a = j / n * Math.PI * 2, radius = r - .006 * fade * Math.max(0, Math.cos(6 * a)) ** 4;
    p.push(Math.cos(a) * radius, Math.sin(a) * radius, z); uv.push(j / n, (z + .04) / .08);
  }
  for (let row = 0; row + 1 < rings.length; row++) for (let j = 0; j < n; j++) {
    const a = row * (n + 1) + j, b = a + n + 1; ix.push(a, a + 1, b, a + 1, b + 1, b);
  }
  for (const row of [0, rings.length - 1]) {
    const center = p.length / 3; p.push(0, 0, rings[row][0]); uv.push(.5, .5);
    for (let j = 0; j < n; j++) { const a = row * (n + 1) + j; ix.push(center, ...(row === 0 ? [a + 1, a] : [a, a + 1])); }
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(p, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(ix); geo.computeVertexNormals();
  const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
}

export function makePistolModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, gunSuppressor, finishGun, gunBody, gunDark, gunMid, gunPoly, gunRubber, gunAccent, magPoly, gaugeFace, sightDotMat, glassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Slide (moves): chamfered top, rear and front serrations, sights, the ejection port and extractor.
  const slide = K.group(0, 0.05, 0.05);
  // GB-154 (Jerry: "slide and frame are too short and do not reach the muzzle"): the slide runs 120 mm further forward,
  // its front face flush with the barrel's crown (gun z 0.31; the muzzle point stays at 0.32). The rear, the ejection
  // port and the rear sight stay where they were, so the GB-145 rack grab and the hand anchors are unchanged.
  K.slab([[-0.14, -0.042], [0.252, -0.042], [0.26, -0.034], [0.26, 0.03], [0.257, 0.042], [0.25, 0.05], [0.24, 0.055], [-0.126, 0.055], [-0.137, 0.05], [-0.14, 0.039]], 0.072, gunBody, { bevel: 0.007, segs: 3, parent: slide });
  for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) K.slab([[-.128 + i * .009, -.031], [-.123 + i * .009, -.031], [-.123 + i * .009, .041], [-.128 + i * .009, .041]], .0016, gunDark, { x: sx * .0361, bevel: .0006, parent: slide });
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) K.slab([[.2 + i * .009, -.03], [.205 + i * .009, -.03], [.205 + i * .009, .04], [.2 + i * .009, .04]], .0016, gunDark, { x: sx * .0361, bevel: .0006, parent: slide });   // GB-154: front serrations at the new front
  K.slab([[-0.128, 0.052], [-0.098, 0.052], [-0.102, 0.072], [-0.124, 0.072]], 0.032, gunDark, { bevel: 0.003, parent: slide });
  for (const sx of [-1, 1]) K.box(0.005, 0.006, 0.002, gaugeFace, sx * 0.008, 0.066, -0.1285, 0, 0, 0, slide);
  K.slab([[0.22, 0.052], [0.242, 0.052], [0.238, 0.068], [0.226, 0.068]], 0.01, gunDark, { bevel: 0.002, parent: slide });   // GB-154: front sight at the new front
  K.box(0.005, 0.005, 0.002, sightDotMat, 0, 0.064, 0.2195, 0, 0, 0, slide);
  K.slab([[-.011, .008], [.05, .008], [.05, .034], [.043, .042], [-.011, .042]], .0016, gunRubber, { x: .0362, bevel: .001, parent: slide });
  K.box(.002, .004, .055, gunMid, .0372, .0085, .019, 0, 0, 0, slide);
  K.box(0.004, 0.008, 0.04, gunDark, 0.0365, 0.008, -0.03, 0, 0, 0, slide);
  // Barrel hood lives on the frame (below), not the slide — otherwise reload rack
  // peels a gunAccent chunk off the muzzle and reads as the barrel detaching.
  // Frame: the dust cover with an accessory rail, the trigger guard, trigger, controls.
  // GB-154: the dust cover runs on under the longer slide to 40 mm short of its front (was 0.17).
  K.slab([[-0.1, 0.013], [0.27, 0.013], [0.272, -.014], [0.27, -0.028], [0.262, -0.034], [0.13, -0.034], [0.124, -0.028], [0.036, -0.03], [.019, -.044], [-.007, -.049], [-.028, -.029], [-.078, -.023], [-0.1, -0.018]], 0.066, gunPoly, { bevel: 0.009, segs: 3 });
  K.rail(0.07, 0, -0.04, 0.15, null, 0.04);
  K.slab(gunBand([[0.128, -0.028], [0.128, -0.07], [0.116, -0.082], [0.04, -0.082], [0.022, -0.07], [0.014, -0.05]], 0.0055), 0.016, gunPoly, { bevel: 0.004 });
  K.slab(gunBand([[0.075, -0.028], [0.073, -0.05], [0.066, -0.068]], 0.004), 0.012, gunDark, { bevel: 0.002 });
  K.box(0.006, 0.014, 0.04, gunDark, -0.034, 0.008, 0.06);                               // slide stop
  K.box(0.006, 0.02, 0.02, gunDark, -0.034, -0.02, 0.03);                                // mag release
  for (const sx of [-1, 1]) {
    K.cyl(.0042, .0042, .0018, gunDark, sx * .0335, -.008, .006, null, 12, 'x');
    K.cyl(.0032, .0032, .0022, gunDark, sx * .0337, -.032, -.02, null, 10, 'x');
    K.slab([[-.036, -.017], [-.013, -.017], [-.016, -.035], [-.033, -.035]], .0018, gunDark, {x: sx * .0335, bevel: .001});
  }
  for (let i = 0; i < 3; i++) flatDetail(THREE, gun, gunDark, .0018, .0015, .028, -.0361, .004 + i * .0035, .06);
  // Grip: a beavertail, texture panels, the magazine's base below.
  K.slab(gripOutline(-0.02, -0.08, 0.18, 0.1, 0.25, 1.6), 0.066, gunPoly, { bevel: 0.014, segs: 3 });
  const gripPanel = [[.018, -.064], [.018, -.083], [.004, -.153], [-.037, -.166], [-.061, -.157], [-.068, -.139], [-.048, -.067], [-.026, -.055]];
  for (const sx of [-1, 1]) {
    K.slab(gripPanel, .0022, gunPoly, { x: sx * .0325, bevel: .001 });
    checkeredPanel(THREE, gun, gunRubber, gripPanel, sx * .0337, .006, .001);
  }
  // GB-154 (Jerry: "the magazine does not actually fit into the grip"): the magazine sits in the grip's well. Its group
  // is on the grip's own axis (gripOutline above: rake 0.25, so the slabs' rx 0.25 lines it up), 55% of the way down
  // the grip and 3 mm behind its centre line. The body (48 x 60 mm, 162 mm long) is inside the grip from just under
  // the frame to the grip's bottom; the baseplate closes the bottom (12 mm below it). It was 25 mm forward of the
  // grip's axis (out through the front strap by ~20 mm) and its baseplate hung 44 mm below the grip. gunExtLook
  // stretches the same body down its own axis, so the extended one only comes out below the grip.
  const mag = K.group(0, -0.088, -0.0251);
  K.slab([[-0.03, 0.081], [0.03, 0.081], [0.03, -0.081], [-0.03, -0.081]], 0.048, magPoly, { bevel: 0.004, rx: 0.25, parent: mag });
  K.slab([[-0.044, -0.081], [0.036, -0.081], [0.038, -0.091], [-0.046, -0.093]], 0.06, magPoly, { bevel: 0.004, rx: 0.25, parent: mag });
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
  // GB-154: the barrel runs to its crown 1.5 mm proud of the slide's new front face; the compensator that stood out
  // in front of the short slide is gone (the slide is the front of the gun now, like a real pistol).
  K.lathe([[0, -0.02], [0.0145, -0.02], [0.0145, 0.311], [0, 0.311]], gunAccent, { y: 0.05, seg: 12, parent: frame });
  K.disc(0.0065, gunRubber, 0, 0.05, 0.3115, 0, frame, 10);   // the bore at the crown
  // The reference light is an accessory below the rail, never a second barrel.
  K.box(.036, .024, .045, gunDark, 0, -.062, .15, 0, 0, 0, frame, .006);
  K.cyl(.015, .015, .022, gunAccent, 0, -.062, .181, frame, 16);
  K.cyl(.013, .015, .005, gunDark, 0, -.062, .194, frame, 16);
  K.disc(.0105, glassMat, 0, -.062, .1968, 0, frame, 16);
  for (const sx of [-1, 1]) K.cyl(.004, .004, .003, gunAccent, sx * .02, -.045, .15, frame, 10, 'x');
  gun.userData.frame = frame;
  gunEffects(gun, new THREE.Vector3(0, 0.05, 0.32), 0.045, 2.5, 6, 0.005);
  gun.userData.laser.position.set(0, 0.05, 3.3);
  gun.userData.laserBaseZ = 0.3;
  gun.userData.barrelAssembly = null;
  gunSuppressor(gun, K, 'pistol');   // CL-95
  return finishGun(gun);
}

export function makeRevolverModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, finishGun, steelMat, woodMat, woodDark, gunDark, gunAccent, gunRubber } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Stainless frame round the cylinder's window: the recoil shield and hammer housing, the top strap, the
  // bottom of the window, the barrel lug; the rear-sight notch, the cylinder latch.
  K.slab([[-.098, .025], [-.097, .071], [-.091, .094], [-.079, .105], [-.057, .111], [-.02, .112], [-.02, -.007], [-.005, -.02], [-.013, -.04], [-.034, -.053], [-.063, -.037], [-.083, -.018], [-.096, .002]], .078, steelMat, {bevel: .014, segs: 4});
  // Keep the thin bridges' bevels below half their height so their inset caps
  // cannot fold through themselves into pointed ears at the barrel lug.
  K.slab([[-.049, .106], [-.042, .111], [.057, .111], [.069, .109], [.077, .103], [.073, .098], [-.041, .098], [-.049, .101]], .044, steelMat, {bevel: .0025, segs: 3});
  K.slab([[-.031, .003], [.075, .003], [.083, -.006], [.072, -.012], [.011, -.014], [-.015, -.012], [-.031, -.005]], .066, steelMat, {bevel: .003, segs: 3});
  K.slab([[.058, .111], [.072, .11], [.087, .098], [.095, .084], [.095, .013], [.09, -.002], [.075, -.011], [.058, -.012]], .06, steelMat, {bevel: .008, segs: 4});
  for (const sx of [-1, 1]) K.box(0.012, 0.012, 0.014, gunDark, sx * 0.012, 0.117, -0.05);
  K.box(0.006, 0.012, 0.02, gunDark, -0.04, 0.004, -0.04);
  // A continuously curved walnut grip and restrained checkering; no medallions,
  // lettering or badges were present in Jerry's final revolver reference.
  K.slab([[.025, -.008], [.02, -.026], [.012, -.043], [.01, -.06], [.005, -.083], [-.001, -.103], [-.01, -.125], [-.02, -.147], [-.032, -.16], [-.046, -.166], [-.06, -.165], [-.075, -.157], [-.087, -.144], [-.088, -.127], [-.085, -.101], [-.079, -.076], [-.071, -.052], [-.066, -.027], [-.066, -.009], [-.062, -.002], [-.043, -.003], [-.02, -.004]], .068, woodMat, {bevel: .016, segs: 4});
  const woodPanel = [[-.007, -.063], [-.014, -.091], [-.025, -.132], [-.037, -.153], [-.056, -.155], [-.075, -.144], [-.074, -.119], [-.061, -.07], [-.052, -.047], [-.032, -.046]];
  for (const sx of [-1, 1]) {
    K.slab(woodPanel, .0016, woodDark, {x: sx * .0335, bevel: .0006});
    checkeredPanel(THREE, gun, woodMat, woodPanel, sx * .0344, .0048, .0014);
    K.cyl(.003, .003, .002, gunAccent, sx * .0391, .024, -.07, null, 10, 'x');
  }
  K.slab(gunBand([[.004, -.008], [.025, -.008], [.048, -.007], [.068, -.014], [.08, -.028], [.081, -.043], [.076, -.06], [.064, -.071], [.045, -.076], [.026, -.073], [.012, -.063], [.007, -.048]], .0048), .014, steelMat, {bevel: .004, segs: 3});
  K.slab(gunBand([[.037, -.01], [.044, -.022], [.043, -.039], [.037, -.052], [.028, -.059]], .0033), .01, steelMat, {bevel: .002, segs: 3});
  // Cylinder (swings out / rotates): fluted, chamfered at the front, the chambers front and back.
  const cylinder = K.group(0, 0.05, 0.02);
  flutedCylinder(THREE, cylinder, steelMat);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    K.disc(0.009, gunDark, Math.cos(a) * 0.033, Math.sin(a) * 0.033, -0.0405, Math.PI, cylinder, 16);
    K.disc(0.01, gunDark, Math.cos(a) * 0.033, Math.sin(a) * 0.033, 0.0405, 0, cylinder, 16);
    K.slab([[.019, -.002], [.031, -.002], [.029, .002], [.021, .002]], .0012, gunDark, {x: Math.cos(a) * .0545, y: Math.sin(a) * .0545, rz: a, parent: cylinder, bevel: .0004});
  }
  gun.userData.cylinder = cylinder;
  gun.userData.baseCylinderRot = cylinder.rotation.clone();
  gun.userData.baseCylinderPos = cylinder.position.clone();
  gun.userData.mag = cylinder;
  gun.userData.baseMagPos = cylinder.position.clone();
  gun.userData.baseMagRot = cylinder.rotation.clone();
  // The reference has a smooth full underlug and continuous top rib.
  K.lathe([[0, .09], [.025, .09], [.025, .11], [.023, .134], [.022, .17], [.022, .371], [.021, .378], [.019, .382], [0, .382]], steelMat, {y: .05, seg: 24});
  K.slab([[.09, .044], [.12, .039], [.2, .036], [.37, .036], [.379, .03], [.38, .021], [.376, .012], [.365, .008], [.15, .006], [.125, .004], [.105, -.002], [.09, .0]], .034, steelMat, {bevel: .009, segs: 4});
  K.slab([[.081, .087], [.102, .081], [.133, .076], [.37, .077], [.378, .081], [.375, .071], [.15, .069], [.105, .07], [.085, .076]], .016, steelMat, {bevel: .003, segs: 3});
  K.slab([[0.35, 0.08], [0.375, 0.08], [0.375, 0.1], [0.362, 0.1]], 0.006, gunDark, { bevel: 0.001 });
  K.cyl(0.006, 0.006, 0.1, steelMat, 0, 0.0, 0.1, null, 12);
  K.cyl(.007, .007, .018, gunAccent, 0, 0, .143, null, 12);
  K.disc(0.013, gunRubber, 0, 0.05, 0.3825, 0, null, 10);
  // Hammer (cocks and falls): the body and a chequered spur.
  const hammer = K.group(0, 0.1, -0.08);
  K.slab([[-0.012, -0.03], [0.014, -0.03], [0.016, 0.006], [0.004, 0.024], [-0.028, 0.038], [-0.034, 0.03], [-0.016, 0.012]], 0.022, gunDark, { bevel: 0.004, parent: hammer });
  K.box(0.026, 0.006, 0.02, gunAccent, 0, 0.034, -0.026, -0.5, 0, 0, hammer, 0.002);
  for (let i = 0; i < 4; i++) K.box(.022, .0015, .0015, gunDark, 0, .036, -.033 + i * .004, -.5, 0, 0, hammer);
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
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, gunSuppressor, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Stamped receiver with pressed ribs; the top cover and its cocking knob.
  K.slab([[-.14, -.031], [-.132, -.04], [.211, -.04], [.22, -.032], [.22, .067], [.215, .078], [-.122, .078], [-.134, .072], [-.14, .06]], .098, gunBody, {bevel: .009, segs: 3});
  for (const sx of [-1, 1]) {
    for (const y of [.014, .042]) {
      K.slab(gunBand([[.024, y], [.038, y + .001], [.186, y + .001], [.198, y]], .0036), .003, gunMid, {x: sx * .0496, bevel: .0014, segs: 3});
      K.slab(gunBand([[-.116, y], [-.105, y + .001], [-.047, y + .001], [-.038, y]], .0036), .003, gunMid, {x: sx * .0496, bevel: .0014, segs: 3});
    }
    K.slab([[-.116, -.035], [.077, -.035], [.081, -.017], [-.116, -.017]], .003, gunDark, {x: sx * .0494, bevel: .001});
    for (const z of [-.112, .073]) K.cyl(.0038, .0038, .002, gunAccent, sx * .0514, -.025, z, null, 12, 'x');
  }
  K.slab([[-.13, .074], [.2, .074], [.2, .09], [.192, .098], [-.11, .104], [-.123, .1], [-.13, .092]], .09, gunMid, {bevel: .009, segs: 3});
  K.cyl(0.014, 0.014, 0.03, gunDark, 0, 0.114, 0.11, null, 8, 'y');
  K.cyl(.016, .016, .014, gunDark, 0, .131, .11, null, 20, 'y');
  for (let j = 0; j < 16; j++) {const a = j / 16 * Math.PI * 2; flatDetail(THREE, gun, gunAccent, .002, .011, .002, Math.cos(a) * .0157, .131, .11 + Math.sin(a) * .0157);}
  // Sights with their protective ears.
  for (const sx of [-1, 1]) {
    K.slab([[-.095, .102], [-.095, .13], [-.091, .141], [-.085, .1465], [-.075, .1465], [-.065, .138], [-.065, .102]], .007, gunAccent, {x: sx * .022, bevel: .003, segs: 3});
    K.slab([[.189, .094], [.189, .125], [.193, .132], [.201, .134], [.209, .13], [.211, .121], [.211, .094]], .007, gunAccent, {x: sx * .018, bevel: .003, segs: 3});
  }
  K.tor(.007, .0025, gunAccent, 0, .129, -.08, 0, 0, 0, null, Math.PI * 2, 16);
  K.box(.006, .013, .005, gunAccent, 0, .115, -.08);
  K.box(0.005, 0.03, 0.006, gunAccent, 0, 0.115, 0.2);
  // Folding stock: struts along the sides and the butt plate.
  for (const sx of [-1, 1]) {
    K.slab(gunBand([[-.109, .021], [-.142, .017], [-.194, -.009], [-.213, -.054]], .006), .009, gunMid, {x: sx * .039, bevel: .003, segs: 3});
    K.slab(gunBand([[-.112, -.015], [-.157, -.018], [-.19, -.046], [-.213, -.094]], .005), .008, gunDark, {x: sx * .037, bevel: .0025, segs: 3});
    K.cyl(.008, .008, .003, gunAccent, sx * .044, .019, -.122, null, 12, 'x');
  }
  K.slab([[-.233, .05], [-.245, .044], [-.2475, .027], [-.244, -.092], [-.239, -.11], [-.228, -.12], [-.217, -.114], [-.215, -.094], [-.224, -.015], [-.222, .025]], .025, gunDark, {bevel: .006, segs: 3});
  K.cyl(.012, .012, .043, gunDark, 0, .039, -.146, null, 16, 'x');
  // The folded hinge stays on its original outer support envelope, which the
  // stowed-weapon fitting code uses when another gun rests against this side.
  K.slab([[-.177, .019], [-.147, .019], [-.131, .032], [-.142, .049], [-.163, .054], [-.182, .04]], .03498504, gunMid, {x: .06, bevel: .005, segs: 2});
  // Grip with the grip safety at the back, the big trigger guard, trigger, selector.
  K.slab(gripOutline(-0.02, -0.1, 0.16, 0.08, 0.22, 0.2), 0.064, gunPoly, { bevel: 0.014, segs: 3 });
  K.box(0.03, 0.07, 0.02, gunDark, 0, -0.08, -0.07, 0.22);
  K.slab(gunBand([[0.088, -0.04], [0.09, -0.068], [0.078, -0.079], [0.03, -0.079], [0.018, -0.07]], 0.005), 0.014, gunDark, { bevel: 0.003 });
  K.slab(gunBand([[0.052, -0.04], [0.05, -0.056], [0.044, -0.066]], 0.0035), 0.01, gunAccent, { bevel: 0.002 });
  K.box(0.006, 0.02, 0.02, gunDark, -0.052, -0.02, 0.0);
  for (const sx of [-1, 1]) {
    const panel = [[.004, -.08], [-.008, -.151], [-.047, -.15], [-.053, -.1], [-.039, -.061], [-.016, -.065]];
    K.slab(panel, .002, gunPoly, {x: sx * .0319, bevel: .0008});
    for (let i = 0; i < 8; i++) K.slab(gunBand([[-.041 + i * .001, -.087 - i * .007], [-.012 - i * .001, -.087 - i * .007]], .001), .0012, gunDark, {x: sx * .033, bevel: .0004});
    for (const [y, z] of [[-.076, -.027], [-.146, -.025]]) K.cyl(.003, .003, .002, gunAccent, sx * .0333, y, z, null, 10, 'x');
  }
  K.cyl(.01, .01, .003, gunAccent, -.0515, .033, .006, null, 16, 'x');
  K.slab([[-.001, .027], [.026, .025], [.026, .031], [.009, .038], [.004, .044]], .003, gunDark, {x: -.0535, bevel: .001});
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
  K.slab([[.18, -.002], [.187, -.013], [.319, -.016], [.334, -.009], [.34, .001], [.34, .058], [.331, .067], [.185, .07], [.18, .061]], .08, gunPoly, {bevel: .016, segs: 4});
  for (let j = 0; j < 12; j++) {
    const z = .19 + j * .012;
    K.slab([[z, -.007], [z + .003, -.007], [z + .003, .061], [z, .061]], .0808, gunDark, {bevel: .0015, segs: 2});
  }
  for (const sx of [-1, 1]) for (const z of [.198, .324]) K.cyl(.0038, .0038, .0016, gunDark, sx * .0407, .002, z, null, 12, 'x');
  K.lathe([[0, 0.325], [0.035, 0.325], [0.035, 0.355], [0, 0.355]], gunDark, { y: 0.03, seg: 16 });
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; flatDetail(THREE, gun, gunAccent, .0025, .0025, .027, Math.cos(a) * .0358, .03 + Math.sin(a) * .0358, .34, a); }
  K.lathe([[0, 0.34], [0.017, 0.34], [0.017, 0.455], [0.02, 0.458], [0.02, 0.475], [0.012, 0.478], [0, 0.478]], gunAccent, { y: 0.03, seg: 12 });
  const threads = [[.0194, .4585]];
  for (let i = 0; i < 5; i++) {const z = .459 + i * .0034; threads.push([.02055, z], [.02055, z + .001], [.0194, z + .0017]);}
  K.lathe(threads, gunDark, {y: .03, seg: 16});
  K.disc(.0095, gunRubber, 0, .03, .4779999852, 0, null, 16);
  gunEffects(gun, new THREE.Vector3(0, 0.03, 0.48), 0.05, 2.8, 7, 0.005);
  gun.userData.laser.position.set(0, 0.03, 4.0);
  gun.userData.laserBaseZ = 0.45;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'uzi');   // CL-95
  return finishGun(gun);
}

export function makeKnifeModel(ctx) {
  const { THREE, gunKit, mergeRigidMeshes, gunDark, gunPoly, gunAccent, bladeMat, edgeMat, gloveMat, brassMat } = ctx;
  const g = new THREE.Group();
  const kn = new THREE.Group();
  g.add(kn);
  const K = gunKit(kn);
  // Combat knife: a pommel and a ridged grip, a crossguard, a clip-point blade with its fuller and edge.
  K.lathe([[0, -.142], [.024, -.142], [.028, -.138], [.031, -.13], [.031, -.121], [.028, -.116], [0, -.116]], gunDark, {parent: kn, seg: 20});
  const ridges = [[0, -0.118], [0.026, -0.118]];
  for (let i = 0; i < 6; i++) { const z = -.104 + i * .02; ridges.push([.026, z - .008], [.028, z - .0055], [.029, z - .003], [.029, z + .003], [.028, z + .0055], [.026, z + .008]); }
  ridges.push([0.027, 0.02], [0, 0.02]);
  K.lathe(ridges, gunPoly, {parent: kn, seg: 20});
  K.lathe([[0, .01], [.027, .01], [.028, .013], [.028, .022], [0, .022]], gunDark, {parent: kn, seg: 20});
  K.slab([[.02, .049], [.023, .056], [.037, .054], [.044, .05], [.044, -.05], [.037, -.054], [.023, -.056], [.02, -.049]], .03, gunDark, {rz: Math.PI / 2, bevel: .006, segs: 3, parent: kn});
  groundBlade(THREE, kn, bladeMat, edgeMat, [[.042, .016, -.018, 0], [.06, .016, -.018, 0], [.076, .016, -.018, 1], [.238, .016, -.018, 1], [.255, .016, -.018, 0], [.27, .015, -.018, 0], [.31, .011, -.016, 0], [.34, .0056, -.014, 0], [.382, -.002, -.002, 0]], {rotate: Math.PI / 2, fuller: .003, edgeWidth: .009});
  // The only marking on the blade is the small skull beside the guard.
  const skull = [[.049, -.003], [.049, .003], [.052, .003], [.053, .005], [.057, .006], [.061, .004], [.062, .001], [.061, -.004], [.057, -.006], [.053, -.005], [.052, -.003]];
  for (const side of [-1, 1]) {
    K.slab(skull, .0003, gunDark, {y: side * .0043, rz: Math.PI / 2, bevel: .0001, parent: kn});
    for (const x of [-.0022, .0022]) {const eye = K.disc(.00125, bladeMat, x, side * .00455, .057, 0, kn, 8); eye.rotation.x = -side * Math.PI / 2;}
    for (const x of [-.0015, .0015]) K.box(.00065, .0003, .0016, bladeMat, x, side * .00455, .0498, 0, 0, 0, kn);
  }
  // Machete: long, wide, slightly swept blade with a black polymer grip and
  // a flared tip — reads as a different tool at a glance.
  const mc = new THREE.Group();
  mc.visible = false;
  g.add(mc);
  const M = gunKit(mc);
  M.slab([[-.152, .024], [-.13, .026], [-.04, .024], [.011, .026], [.02, .018], [.02, -.024], [.01, -.03], [-.03, -.034], [-.08, -.031], [-.11, -.032], [-.138, -.039], [-.148, -.04], [-.157, -.032], [-.16, -.022]], .032, gloveMat, {bevel: .01, segs: 4, parent: mc});
  const handlePanel = [[-.139, .014], [.005, .015], [.006, -.021], [-.028, -.024], [-.089, -.022], [-.141, -.029]];
  for (const side of [-1, 1]) {
    M.slab(handlePanel, .0015, gloveMat, {x: side * .0157, bevel: .0006, parent: mc});
    checkeredPanel(THREE, mc, gunDark, handlePanel, side * .01655, .005, .0012);
  }
  for (const z of [-0.11, -0.07, -0.03]) M.cyl(.005, .005, .036, brassMat, 0, 0, z, mc, 14, 'x');
  M.box(0.05, 0.075, 0.02, gunDark, 0, 0, 0.03, 0, 0, 0, mc, 0.006);
  groundBlade(THREE, mc, gunAccent, edgeMat, [[.035, .031, -.031, 0], [.08, .0307, -.0346, 0], [.1, .0306, -.0362, 1], [.44, .0283, -.0632, 1], [.48, .028, -.0675, 0], [.5, .026, -.06979836, 0], [.56, .02, -.0602, 0], [.6, .0086, -.055, 0], [.63, 0, -.03025, 0], [.64, -.022, -.022, 0]], {fuller: .019, edgeWidth: .012});
  g.userData.knifeModel = kn;
  g.userData.macheteModel = mc;
  mergeRigidMeshes(g, {}, new Set([kn, mc]));
  g.visible = false;
  return g;
}
