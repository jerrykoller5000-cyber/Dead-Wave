// GP-164: reference-based sidearms and blades. Animation and gameplay stay with the caller.

// Millimetre-scale knurl teeth do not need the rounded box helper's subdivisions.
// Same centre line as gripOutline. u runs down the grip, v+ is the front strap.
function shapedGrip(cz, cy, h, d, rake, pts) {
  const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => {
    const uu = (u - 0.5) * h, vv = v * k;
    return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr];
  });
}

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
  const rOuter = .0505;   // GB-177: slimmer (was 0.0562); the chambers at r 0.033 keep the bore line
  const rings = [[-.04, .045, 0], [-.034, rOuter, 0], [-.026, rOuter, 1], [.022, rOuter, 1], [.032, rOuter, 0], [.04, .0445, 0]];
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
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, gunBody, gunDark, gunMid, gunPoly, gunRubber, gunAccent, magPoly, gaugeFace, sightDotMat, glassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Slide (moves): chamfered top, rear and front serrations, sights, the ejection port and extractor.
  const slide = K.group(0, 0.05, 0.05);
  // GB-154 (Jerry: "slide and frame are too short and do not reach the muzzle"): the slide runs 120 mm further forward,
  // its front face flush with the barrel's crown (gun z 0.31; the muzzle point stays at 0.32). The rear, the ejection
  // port and the rear sight stay where they were, so the GB-145 rack grab and the hand anchors are unchanged.
  // GB-172: a lower, narrower slide. The front face stays at local z 0.26 so it still meets the crown.
  // GB-180 (Jerry: the slide floated over the frame): the slide's bottom comes down to local -0.044 (gun y 0.006), 6 mm
  // over the frame's top rail (0.012), so the slide sits on the frame with no daylight under it.
  K.slab([[-0.14, -0.044], [0.252, -0.044], [0.26, -0.034], [0.26, 0.012], [0.254, 0.020], [0.242, 0.024], [-0.126, 0.024], [-0.134, 0.018], [-0.14, 0.010]], 0.046, gunBody, { bevel: 0.005, segs: 3, parent: slide });
  for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) K.slab([[-.128 + i * .009, -.024], [-.123 + i * .009, -.024], [-.123 + i * .009, .016], [-.128 + i * .009, .016]], .0014, gunDark, { x: sx * .0232, bevel: .0005, parent: slide });
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) K.slab([[.2 + i * .009, -.022], [.205 + i * .009, -.022], [.205 + i * .009, .014], [.2 + i * .009, .014]], .0014, gunDark, { x: sx * .0232, bevel: .0005, parent: slide });
  // GB-180: dovetailed sights. Rear: a dovetail base across the slide and a U notch (two ears), not a bare block.
  K.slab([[-0.131, 0.016], [-0.095, 0.016], [-0.098, 0.026], [-0.128, 0.026]], 0.030, gunMid, { bevel: 0.0015, parent: slide });
  K.slab([[-0.128, 0.024], [-0.099, 0.024], [-0.101, 0.032], [-0.126, 0.032]], 0.024, gunDark, { bevel: 0.0015, parent: slide });
  for (const sx of [-1, 1]) K.slab([[-0.128, 0.030], [-0.104, 0.030], [-0.106, 0.042], [-0.126, 0.042]], 0.0075, gunDark, { x: sx * 0.0078, bevel: 0.0012, parent: slide });
  for (const sx of [-1, 1]) K.box(0.004, 0.005, 0.002, gaugeFace, sx * 0.006, 0.036, -0.1285, 0, 0, 0, slide);
  K.slab([[0.217, 0.016], [0.245, 0.016], [0.242, 0.026], [0.220, 0.026]], 0.022, gunMid, { bevel: 0.0015, parent: slide });   // GB-180: front dovetail
  K.slab([[0.221, 0.024], [0.241, 0.024], [0.237, 0.037], [0.226, 0.037]], 0.008, gunDark, { bevel: 0.0015, parent: slide });
  K.box(0.004, 0.004, 0.002, sightDotMat, 0, 0.032, 0.2195, 0, 0, 0, slide);
  K.slab([[-.011, .002], [.05, .002], [.05, .016], [.043, .020], [-.011, .020]], .0014, gunRubber, { x: .0233, bevel: .001, parent: slide });
  K.box(.002, .003, .055, gunMid, .0242, .004, .019, 0, 0, 0, slide);
  K.box(0.003, 0.006, 0.04, gunDark, 0.0236, 0.004, -0.03, 0, 0, 0, slide);
  for (const sx of [-1, 1]) K.box(0.003, 0.003, 0.054, gunDark, sx * 0.0145, 0.0235, 0.022, 0, 0, 0, slide);   // GB-180: the ejection port's edges
  K.box(0.032, 0.003, 0.003, gunDark, 0, 0.0235, -0.006, 0, 0, 0, slide);
  // Barrel hood lives on the frame (below), not the slide — otherwise reload rack
  // peels a gunAccent chunk off the muzzle and reads as the barrel detaching.
  // Frame: the dust cover with an accessory rail, the trigger guard, trigger, controls.
  // GB-154: the dust cover runs on under the longer slide to 40 mm short of its front (was 0.17).
  // GB-180: frame and slide line up. The frame's rear is flush with the slide's rear (gun z -0.09) and its dust cover
  // runs to 14 mm short of the slide's front (a real pistol's proportion), its top 0.012 tucked up inside the slide.
  K.slab([[-0.09, 0.012], [0.294, 0.012], [0.298, 0.000], [0.294, -0.020], [0.112, -0.020], [0.104, -0.016], [0.04, -0.016], [0.026, -0.030], [-0.004, -0.036], [-0.022, -0.020], [-0.07, -0.012], [-0.09, -0.004]], 0.044, gunPoly, { bevel: 0.006, segs: 3 });
  // GB-180: a beavertail / tang that sweeps back under the slide's rear and blends down into the grip's back strap.
  K.slab([[-0.06, 0.008], [-0.098, 0.006], [-0.104, 0.000], [-0.098, -0.008], [-0.074, -0.012], [-0.052, -0.020], [-0.036, -0.028], [-0.026, -0.010]], 0.044, gunPoly, { bevel: 0.008, segs: 3 });   // v2: a short tang, not a spike
  K.rail(0.1, 0, -0.025, 0.2, null, 0.03);   // GB-180: the accessory rail along the dust cover, its top in the frame
  // GB-177 (pass 2: the guard read as a thin wire): a moulded guard, thicker and wider, its front squared, its back
  // running up into the frame.
  // GB-180 (Jerry: the guard was oversized and too far forward): a smaller guard, its front at z 0.104, its back
  // curving up into the grip's front strap (the strap is at z ~0.02-0.027 here) so guard and grip are one moulding.
  K.slab(gunBand([[0.110, -0.016], [0.114, -0.032], [0.111, -0.050], [0.100, -0.058], [0.050, -0.058], [0.040, -0.050], [0.034, -0.036], [0.036, -0.016]], 0.0068), 0.018, gunPoly, { bevel: 0.003 });   // v2: thicker, its back on the new strap
  K.slab([[0.026, -0.030], [0.042, -0.030], [0.046, -0.052], [0.036, -0.062], [0.024, -0.050]], 0.03, gunPoly, { bevel: 0.006 });   // the guard's root blended into the strap
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180 (Jerry: the trigger was a thin wire at the back of the guard): a solid curved blade in the middle of the
  // guard, its face toward the grip, its tip curling forward, with a safety tab down its face.
  K.slab([[0.068, -0.014], [0.077, -0.014], [0.076, -0.028], [0.078, -0.040], [0.085, -0.049], [0.081, -0.054], [0.070, -0.047], [0.065, -0.034], [0.065, -0.022]], 0.010, gunDark, { bevel: 0.002 });
  K.slab([[0.068, -0.026], [0.071, -0.026], [0.073, -0.042], [0.070, -0.044]], 0.003, gunMid, { x: 0, bevel: 0.0008 });
  K.box(0.005, 0.012, 0.036, gunDark, -0.023, 0.004, 0.06);
  K.box(0.005, 0.016, 0.016, gunDark, -0.023, -0.016, 0.028);
  for (const sx of [-1, 1]) {
    K.cyl(.0034, .0034, .0016, gunDark, sx * .0226, -.004, .006, null, 12, 'x');
    K.cyl(.0026, .0026, .0018, gunDark, sx * .0228, -.024, -.016, null, 10, 'x');
    K.slab([[-.03, -.012], [-.01, -.012], [-.012, -.026], [-.028, -.026]], .0014, gunDark, {x: sx * .0224, bevel: .001});
  }
  for (let i = 0; i < 3; i++) flatDetail(THREE, gun, gunDark, .0014, .0012, .024, -.0226, .002 + i * .003, .06);
  // GB-172: narrower grip on the same centre line (cz -0.02, cy -0.08, h 0.18, rake 0.30, GB-179: 17 deg). t242 copies these points.
  // GB-180 (Jerry: the grip was long, thin and had no swell): same centre line and rake (hand anchor unchanged), but
  // deeper (d 0.084) and 52 mm wide, full depth at the bottom, finger swells down the front strap. t242 copies these.
  // GB-180 v2 (close-ups: still too thin front to back, a gap to the guard): d 0.1, the front strap 10 mm further forward.
  const pistolGrip = [[0.00, 0.026], [0.08, 0.032], [0.20, 0.030], [0.30, 0.035], [0.42, 0.029], [0.54, 0.034], [0.68, 0.030], [0.84, 0.031], [0.96, 0.029], [1.00, 0.024], [1.00, -0.026], [0.96, -0.030], [0.70, -0.031], [0.40, -0.030], [0.18, -0.029], [0.08, -0.033], [0.05, -0.024]];
  K.slab(shapedGrip(-0.02, -0.08, 0.18, 0.1, 0.3, pistolGrip), 0.052, gunPoly, { bevel: 0.009, segs: 3 });
  const gripPanel = shapedGrip(-0.02, -0.08, 0.18, 0.1, 0.3, [[0.16, 0.018], [0.42, 0.018], [0.70, 0.020], [0.90, 0.016], [0.90, -0.020], [0.62, -0.022], [0.34, -0.020], [0.16, -0.016]]);
  for (const sx of [-1, 1]) {
    K.slab(gripPanel, .0018, gunPoly, { x: sx * .0262, bevel: .001 });
    checkeredPanel(THREE, gun, gunRubber, gripPanel, sx * .0272, .006, .001);
  }
  // GB-154 (Jerry: "the magazine does not actually fit into the grip"): the magazine sits in the grip's well. Its group
  // is on the grip's own axis (gripOutline above: rake 0.25, so the slabs' rx 0.25 lines it up), 55% of the way down
  // the grip and 3 mm behind its centre line. The body (48 x 60 mm, 162 mm long) is inside the grip from just under
  // the frame to the grip's bottom; the baseplate closes the bottom (12 mm below it). It was 25 mm forward of the
  // grip's axis (out through the front strap by ~20 mm) and its baseplate hung 44 mm below the grip. gunExtLook
  // stretches the same body down its own axis, so the extended one only comes out below the grip.
  const mag = K.group(0, -0.0877, -0.0255);
  K.slab([[-0.010, 0.081], [0.010, 0.081], [0.010, -0.081], [-0.010, -0.081]], 0.028, magPoly, { bevel: 0.003, rx: 0.3, parent: mag });
  K.slab([[-0.022, -0.081], [0.016, -0.081], [0.018, -0.092], [-0.024, -0.092]], 0.046, magPoly, { bevel: 0.003, rx: 0.3, parent: mag });   // GB-180: baseplate square to the mag and flush with the grip
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
  K.box(0.040, 0.016, 0.24, gunPoly, 0, 0.006, 0.14, 0, 0, 0, frame, 0.006);
  K.box(0.034, 0.014, 0.18, gunDark, 0, 0.028, 0.08, 0, 0, 0, frame, 0.004);
  K.box(0.022, 0.014, 0.06, gunAccent, 0.0, 0.042, 0.09, 0, 0, 0, frame, 0.004);
  // GB-180: the barrel hood shows in the ejection port, flush with the slide's top, sitting on the barrel.
  K.box(0.026, 0.014, 0.05, gunAccent, 0, 0.068, 0.072, 0, 0, 0, frame, 0.003);
  // GB-154: the barrel runs to its crown 1.5 mm proud of the slide's new front face; the compensator that stood out
  // in front of the short slide is gone (the slide is the front of the gun now, like a real pistol).
  K.lathe([[0, -0.02], [0.0145, -0.02], [0.0145, 0.311], [0, 0.311]], gunAccent, { y: 0.05, seg: 12, parent: frame });
  K.disc(0.0065, gunRubber, 0, 0.05, 0.3115, 0, frame, 10);   // the bore at the crown
  // The reference light is an accessory below the rail, never a second barrel.
  // GB-180 (Jerry: the light floated): the light hangs on the rail by a clamp block with a cross-bolt.
  K.box(.034, .012, .044, gunDark, 0, -.036, .2, 0, 0, 0, frame, .003);   // v2: a full-size weapon light
  for (const sx of [-1, 1]) K.cyl(.004, .004, .003, gunMid, sx * .0175, -.036, .2, frame, 10, 'x');
  K.box(.034, .028, .1, gunDark, 0, -.055, .2, 0, 0, 0, frame, .007);
  K.cyl(.018, .016, .022, gunAccent, 0, -.055, .259, frame, 18);
  K.cyl(.016, .018, .004, gunDark, 0, -.055, .272, frame, 18);
  K.disc(.014, glassMat, 0, -.055, .2745, 0, frame, 18);
  for (const sx of [-1, 1]) K.box(.003, .01, .016, gunAccent, sx * .018, -.052, .158, 0, 0, 0, frame);   // switch paddles
  gun.userData.frame = frame;
  gunEffects(gun, new THREE.Vector3(0, 0.05, 0.32), 0.045, 2.5, 6, 0.005);
  gun.userData.laser.position.set(0, 0.05, 3.3);
  gun.userData.laserBaseZ = 0.3;
  gun.userData.barrelAssembly = null;
  gunSuppressor(gun, K, 'pistol');   // CL-95
  return finishGun(gun);
}

export function makeRevolverModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, finishGun, revolverSteel: steelMat, woodMat, woodDark, gunDark, gunAccent, gunRubber } = ctx;   // GB-233: its own steel
  const gun = new THREE.Group();
  const K = gunKit(gun);
  // Stainless frame round the cylinder's window: the recoil shield and hammer housing, the top strap, the
  // bottom of the window, the barrel lug; the rear-sight notch, the cylinder latch.
  // GB-173 (Jerry: the rear looked blocky): a slimmer frame whose back runs from the top strap round the hammer seat
  // and down a curved backstrap into the grip; a round recoil shield stands behind the cylinder.
  K.slab([[-.02, .112], [-.056, .11], [-.068, .104], [-.074, .094], [-.077, .078], [-.08, .058], [-.08, .036], [-.076, .016], [-.07, 0], [-.066, -.009], [-.052, -.024], [-.034, -.036], [-.016, -.036], [-.005, -.02], [-.02, -.007]], .066, steelMat, {bevel: .012, segs: 4});
  K.lathe([[0, -.03], [.047, -.03], [.05, -.027], [.047, -.022], [0, -.022]], steelMat, {y: .05, seg: 28});   // recoil shield (GB-177: to the slimmer cylinder)
  // Keep the thin bridges' bevels below half their height so their inset caps
  // cannot fold through themselves into pointed ears at the barrel lug.
  K.slab([[-.049, .108], [-.042, .114], [.057, .114], [.069, .112], [.077, .105], [.073, .097], [-.041, .097], [-.049, .101]], .04, steelMat, {bevel: .0025, segs: 3});   // GB-233 r4: the top strap a little taller, standing clear over the cylinder
  K.slab([[-.031, .003], [.075, .003], [.083, -.006], [.072, -.012], [.011, -.014], [-.015, -.012], [-.031, -.005]], .066, steelMat, {bevel: .003, segs: 3});
  // GB-173: the frame's front starts 6 mm ahead of the cylinder, so the barrel's forcing cone shows in the gap.
  K.slab([[.066, .111], [.072, .11], [.087, .098], [.095, .084], [.095, .013], [.09, -.002], [.075, -.011], [.066, -.012]], .06, steelMat, {bevel: .008, segs: 4});
  K.lathe([[0, .058], [.011, .058], [.016, .068], [.016, .09], [0, .09]], steelMat, {y: .083, seg: 16});   // forcing cone
  for (const sx of [-1, 1]) K.box(0.012, 0.012, 0.014, gunDark, sx * 0.012, 0.117, -0.05);
  // GB-174 (Jerry: small parts floated): the latch and screws sit on the frame's side faces (half-width 0.033).
  K.box(0.004, 0.012, 0.02, gunDark, -0.0345, 0.004, -0.04, 0, 0, 0, null, 0.0012);   // cylinder release latch
  for (const sx of [-1, 1]) for (const [y, z] of [[0.086, -0.062], [0.02, -0.058]]) K.cyl(0.0032, 0.0032, 0.0016, gunAccent, sx * 0.0338, y, z, null, 10, 'x');   // side-plate screws
  // A continuously curved walnut grip and restrained checkering; no medallions,
  // lettering or badges were present in Jerry's final revolver reference.
  // GB-173 (Jerry: the grip): rounder (bigger bevel), a touch slimmer than the frame so the frame overhangs nothing.
  K.slab([[.025, -.008], [.02, -.026], [.012, -.043], [.01, -.06], [.005, -.083], [-.001, -.103], [-.01, -.125], [-.02, -.147], [-.032, -.16], [-.046, -.166], [-.06, -.165], [-.075, -.157], [-.087, -.144], [-.088, -.127], [-.085, -.101], [-.079, -.076], [-.071, -.052], [-.066, -.027], [-.066, -.009], [-.062, -.002], [-.043, -.003], [-.02, -.004]], .064, woodMat, {bevel: .018, segs: 5});
  const woodPanel = [[-.007, -.063], [-.014, -.091], [-.025, -.132], [-.037, -.153], [-.056, -.155], [-.075, -.144], [-.074, -.119], [-.061, -.07], [-.052, -.047], [-.032, -.046]];
  for (const sx of [-1, 1]) {
    K.slab(woodPanel, .0016, woodDark, {x: sx * .0315, bevel: .0006});
    checkeredPanel(THREE, gun, woodMat, woodPanel, sx * .0324, .0048, .0014);
    K.cyl(.003, .003, .0016, gunAccent, sx * .0331, -.072, -.03, null, 10, 'x');   // GB-174: grip screw on the wood panel's face
  }
  // GB-180: a smaller, heavier guard (it was a big wire ring), closed into the grip's front.
  K.slab(gunBand([[.006, -.008], [.028, -.008], [.050, -.008], [.066, -.015], [.073, -.028], [.072, -.042], [.064, -.055], [.048, -.062], [.028, -.060], [.014, -.050], [.010, -.036]], .0062), .018, steelMat, {bevel: .004, segs: 3});
  // GB-173 (Jerry: the trigger curved the wrong way): the finger's face is concave toward the front; the blade drops
  // and bows back toward the grip, its tip curling forward inside the guard.
  K.slab([[.0418, -.0086], [.0359, -.0233], [.0356, -.0372], [.0393, -.0462], [.0465, -.0505], [.0435, -.0555], [.0335, -.0478], [.0244, -.0408], [.0262, -.0247], [.0322, -.0114]], .011, steelMat, {bevel: .002, segs: 3});   // GB-180: a solid blade
  // Cylinder (swings out / rotates): fluted, chamfered at the front, the chambers front and back.
  const cylinder = K.group(0, 0.05, 0.02);
  flutedCylinder(THREE, cylinder, steelMat);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;   // GB-173: a chamber at the top, on the bore's axis (y 0.083)
    K.disc(0.009, gunDark, Math.cos(a) * 0.033, Math.sin(a) * 0.033, -0.0405, Math.PI, cylinder, 16);
    K.disc(0.01, gunDark, Math.cos(a) * 0.033, Math.sin(a) * 0.033, 0.0405, 0, cylinder, 16);
    K.slab([[.019, -.002], [.031, -.002], [.029, .002], [.021, .002]], .0012, gunDark, {x: Math.cos(a) * .049, y: Math.sin(a) * .049, rz: a, parent: cylinder, bevel: .0004});
  }
  gun.userData.cylinder = cylinder;
  gun.userData.baseCylinderRot = cylinder.rotation.clone();
  gun.userData.baseCylinderPos = cylinder.position.clone();
  gun.userData.mag = cylinder;
  gun.userData.baseMagPos = cylinder.position.clone();
  gun.userData.baseMagRot = cylinder.rotation.clone();
  // The reference has a smooth full underlug and continuous top rib.
  // GB-173 (Jerry: the barrel did not line up with the cylinder): the bore is on the top chamber's axis (y 0.083),
  // 33 mm above the cylinder's centre; the underlug, rib, sight, muzzle and laser moved up with it.
  // GB-177 (pass 2: barrel and cylinder too heavy): a slimmer barrel, underlug and rib; the bore stays at y 0.083.
  // GB-180 (close-up: the barrel read as a thin tube): a heavier barrel and a full-width underlug and rib, one piece.
  // GB-180 pass 6 (vs a real 6-inch revolver the barrel ran ~3x the cylinder): 50 mm shorter; rib, lug, sight, muzzle follow.
  K.lathe([[0, .09], [.02, .09], [.02, .11], [.017, .134], [.017, .17], [.017, .321], [.0158, .328], [.0138, .332], [0, .332]], steelMat, {y: .083, seg: 24});   // GB-233 r4: thinner (was .021)
  K.slab([[.09, .086], [.32, .086], [.329, .08], [.331, .066], [.328, .054], [.315, .048], [.15, .046], [.125, .042], [.105, .036], [.09, .036]], .032, steelMat, {bevel: .008, segs: 4});   // GB-233 r4: underlug slimmer with the barrel
  K.slab([[.081, .109], [.102, .104], [.133, .101], [.322, .101], [.328, .098], [.325, .092], [.15, .092], [.105, .094], [.085, .1]], .016, steelMat, {bevel: .003, segs: 3});
  // GB-233 r4: the crane, on his left of the window's front, the arm the cylinder swings out on, and its pivot screw.
  K.slab([[.04, .03], [.066, .028], [.066, -.01], [.04, -.006]], .006, steelMat, {x: -.0335, bevel: .0015});
  K.cyl(.0032, .0032, .0016, gunAccent, -.0368, .002, .058, null, 10, 'x');
  // GB-173 (Jerry: the sights did not line up): the front blade's top is level with the rear notch (y 0.121) on x 0.
  K.slab([[0.298, 0.097], [0.326, 0.097], [0.326, 0.121], [0.31, 0.121]], 0.005, gunDark, { bevel: 0.001 });
  // the ejector rod on the cylinder's axis, inside the underlug
  K.cyl(0.006, 0.006, 0.1, steelMat, 0, 0.046, 0.1, null, 12);
  K.cyl(.007, .007, .018, gunAccent, 0, .046, .143, null, 12);
  K.disc(0.013, gunRubber, 0, 0.083, 0.3325, 0, null, 10);
  // Hammer (cocks and falls): the body and a chequered spur.
  const hammer = K.group(0, 0.1, -0.08);
  // GB-174 (Jerry: the hammer was a crude bent slab): a hammer body seated in the frame's slot behind the recoil shield,
  // its short spur curving back and down over the backstrap, chequered across the top. Same pivot (0, 0.1, -0.08).
  K.slab([[0.01, -0.03], [0.012, -0.004], [0.008, 0.01], [0.002, 0.016], [-0.008, 0.019], [-0.018, 0.02], [-0.027, 0.018], [-0.033, 0.013], [-0.035, 0.008], [-0.03, 0.006], [-0.02, 0.006], [-0.012, 0.002], [-0.009, -0.01], [-0.008, -0.03]], 0.011, gunDark, { bevel: 0.002, parent: hammer });
  for (const [z, y, a] of [[-0.006, 0.0185, -0.35], [-0.012, 0.0205, -0.12], [-0.018, 0.0212, 0], [-0.024, 0.0202, 0.2], [-0.029, 0.0178, 0.45]]) K.box(0.0112, 0.0012, 0.0012, gunAccent, 0, y, z, a, 0, 0, hammer);
  gun.userData.hammer = hammer;
  gun.userData.baseHammerRot = hammer.rotation.clone();
  gun.userData.baseHammerPos = hammer.position.clone();
  gunEffects(gun, new THREE.Vector3(0, 0.083, 0.35), 0.045, 2.8, 6, 0.005);
  gun.userData.laser.position.set(0, 0.083, 3.35);
  gun.userData.laserBaseZ = 0.35;
  gun.userData.barrelAssembly = null;
  return finishGun(gun);
}

export function makeUziModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber } = ctx;
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
  // GB-235 (Jerry: "Uzi sights need to be usable, right now the charging handle gets in the way"): the knob sits low in the
  // top cover's groove like the real one, its top at y .122, 7 mm under the line from the rear aperture to the post (.129 here); was .138.
  K.cyl(0.014, 0.014, 0.03, gunDark, 0, 0.098, 0.11, null, 8, 'y');
  K.cyl(.016, .016, .014, gunDark, 0, .115, .11, null, 20, 'y');
  for (let j = 0; j < 16; j++) {const a = j / 16 * Math.PI * 2; flatDetail(THREE, gun, gunAccent, .002, .011, .002, Math.cos(a) * .0157, .115, .11 + Math.sin(a) * .0157);}
  // Sights: slim ears, a rear aperture you can look through, a hooded front post.
  for (const sx of [-1, 1]) {
    K.slab([[-.096, .100], [-.096, .142], [-.088, .158], [-.072, .158], [-.064, .142], [-.064, .100]], .006, gunDark, {x: sx * .018, bevel: .0015, segs: 2});
    K.slab([[.182, .096], [.182, .136], [.190, .150], [.206, .150], [.212, .136], [.212, .096]], .006, gunDark, {x: sx * .016, bevel: .0015, segs: 2});
  }
  K.box(.006, .034, .008, gunDark, 0, .118, -.08);
  K.tor(.0042, .0016, gunAccent, 0, .126, -.08, 0, 0, 0, null, Math.PI * 2, 12);
  K.box(.004, .026, .004, gunDark, 0, .116, .198);
  for (const sx of [-1, 1]) K.box(.004, .030, .014, gunDark, sx * .011, .114, .198);
  K.box(.026, .004, .014, gunDark, 0, .130, .198);
  // Folding stock: a straight wire frame and a butt, not the drooping struts.
  for (const sx of [-1, 1]) {
    K.slab([[-.118, .030], [-.305, .016], [-.305, .006], [-.118, .018]], .007, gunMid, {x: sx * .040, bevel: .002});
    K.slab([[-.118, -.010], [-.305, -.030], [-.305, -.040], [-.118, -.022]], .007, gunDark, {x: sx * .038, bevel: .002});
    K.cyl(.007, .007, .004, gunAccent, sx * .044, .020, -.122, null, 10, 'x');
  }
  K.slab([[-.318, .028], [-.300, .022], [-.306, -.048], [-.324, -.054]], .062, gunDark, {bevel: .004});
  K.slab([[-.332, .024], [-.316, .020], [-.322, -.050], [-.338, -.054]], .066, gunRubber, {bevel: .003});
  // The folded hinge stays on its original outer support envelope, which the
  // stowed-weapon fitting code uses when another gun rests against this side.
  K.slab([[-.177, .019], [-.147, .019], [-.131, .032], [-.142, .049], [-.163, .054], [-.182, .04]], .03498504, gunMid, {x: .06, bevel: .005, segs: 2});
  // Grip. The safety is the same polymer as the grip and follows the backstrap.
  // Centre line is still gripOutline(-0.02, -0.1, 0.16, …, 0.22): the palm stays at the hold.
  // GB-236 (Jerry: "way too skinny and not proportionate to the gun"): the real Uzi's grip is a block the magazine runs
  // up through, about 3/4 the receiver's width and deeper front to back than a pistol's. Width 56 -> 76 mm, depth
  // 56 -> 88 mm (d 0.072 -> 0.12), grown mostly rearward (centre 10 mm back) so the trigger keeps 21 mm of finger room.
  const UZI_GZ = -0.030, UZI_GD = 0.12;
  K.slab(shapedGrip(UZI_GZ, -0.1, 0.16, UZI_GD, 0.22, [
    [-0.04, 0.014], [0.12, 0.026], [0.36, 0.020], [0.62, 0.028], [0.86, 0.020], [1.0, 0.006],
    [1.02, -0.010], [0.90, -0.028], [0.60, -0.034], [0.30, -0.024], [0.08, -0.016], [-0.04, -0.028], [-0.07, -0.006]
  ]), 0.078, gunPoly, { bevel: 0.010, segs: 3 });   // GB-236: 78 mm across (was 56) under the 98 mm receiver
  K.slab(shapedGrip(UZI_GZ, -0.1, 0.16, UZI_GD, 0.22, [
    [0.10, -0.020], [0.28, -0.026], [0.55, -0.032], [0.78, -0.026],
    [0.78, -0.016], [0.55, -0.020], [0.28, -0.014], [0.10, -0.010]
  ]), 0.068, gunPoly, { bevel: 0.004, segs: 2 });
  K.slab(gunBand([[0.09, -0.036], [0.094, -0.064], [0.072, -0.078], [0.028, -0.078], [0.014, -0.062]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // GB-180: a moulded guard, not a wire (pass 4: as wide as a real guard)
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire, moved to mid-guard.
  K.slab([[0.0574, -0.0411], [0.0492, -0.0532], [0.0498, -0.0617], [0.0582, -0.0692], [0.0538, -0.0748], [0.0422, -0.0663], [0.0388, -0.0508], [0.0466, -0.0349]], 0.011, gunAccent, { bevel: 0.002 });
  K.box(0.006, 0.02, 0.02, gunDark, -0.052, -0.02, 0.0);
  for (const sx of [-1, 1]) {
    const panel = shapedGrip(UZI_GZ, -0.1, 0.16, UZI_GD, 0.22, [[0.22, 0.010], [0.48, 0.012], [0.76, 0.008], [0.80, -0.008], [0.62, -0.018], [0.36, -0.012], [0.18, -0.002]]);
    K.slab(panel, .0016, gunPoly, {x: sx * .0392, bevel: .0006});
    for (let i = 0; i < 6; i++) K.slab(gunBand(shapedGrip(UZI_GZ, -0.1, 0.16, UZI_GD, 0.22, [[0.30 + i * 0.08, 0.006], [0.34 + i * 0.08, -0.008]]), .0008), .001, gunDark, {x: sx * .040, bevel: .0003});
    for (const [u, v] of [[0.32, -0.004], [0.72, -0.006]]) {
      const [z, y] = shapedGrip(UZI_GZ, -0.1, 0.16, UZI_GD, 0.22, [[u, v]])[0];
      K.cyl(.0026, .0026, .0016, gunAccent, sx * .0402, y, z, null, 8, 'x');
    }
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
  groundBlade(THREE, kn, bladeMat, edgeMat, [[.038, .03, -.042, 0], [.06, .03, -.042, 0], [.076, .03, -.042, 1], [.22, .03, -.042, 1], [.245, .03, -.042, 0], [.26, .022, -.042, 0], [.28, .012, -.042, 0], [.3, .006, -.042, 0], [.32, .003, -.04, 0], [.34, .001, -.034, 0], [.36, -.001, -.024, 0], [.375, -.003, -.013, 0], [.39, -.005, -.005, 0]], {rotate: Math.PI / 2, fuller: .0045, half: .0052, edgeWidth: .0135});   // GB-180 pass 7: a real concave KA-BAR clip and an edge that stays straight, then sweeps up
  // The only marking on the blade is the small skull beside the guard.
  const skull = [[.049, -.003], [.049, .003], [.052, .003], [.053, .005], [.057, .006], [.061, .004], [.062, .001], [.061, -.004], [.057, -.006], [.053, -.005], [.052, -.003]];
  for (const side of [-1, 1]) {
    K.slab(skull, .0003, gunDark, {y: side * .0055, rz: Math.PI / 2, bevel: .0001, parent: kn});
    for (const x of [-.0022, .0022]) {const eye = K.disc(.00125, bladeMat, x, side * .00575, .057, 0, kn, 8); eye.rotation.x = -side * Math.PI / 2;}
    for (const x of [-.0015, .0015]) K.box(.00065, .0003, .0016, bladeMat, x, side * .00575, .0498, 0, 0, 0, kn);
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
  groundBlade(THREE, mc, gunAccent, edgeMat, [[.035, .031, -.031, 0], [.08, .0307, -.0346, 0], [.1, .0306, -.038, 1], [.44, .0283, -.08, 1], [.48, .028, -.086, 0], [.5, .026, -.088, 0], [.56, .02, -.078, 0], [.6, .012, -.062, 0], [.63, .004, -.04, 0], [.655, -.004, -.018, 0], [.67, -.008, -.008, 0]], {fuller: .019, edgeWidth: .012});   // GB-180 pass 7: a swept point, not a squared end
  // GB-235 (Jerry: "Machete serrations should be on blade not on top of machete"): the 16 raked teeth run along the cutting
  // edge (the lower edge groundBlade grinds, z 0.14-0.54), pointing down from it; the spine is plain.
  {
    const sawPos = [], sawUv = [], teeth = 16, zStart = 0.14, zEnd = 0.54, step = (zEnd - zStart) / teeth, halfX = 0.0024;
    const EDGE = [[.1, -.038], [.44, -.08], [.48, -.086], [.5, -.088], [.56, -.078]];   // groundBlade's bottom line above
    const edgeY = (z) => { for (let k = 0; k + 1 < EDGE.length; k++) if (z <= EDGE[k + 1][0]) return EDGE[k][1] + (z - EDGE[k][0]) / (EDGE[k + 1][0] - EDGE[k][0]) * (EDGE[k + 1][1] - EDGE[k][1]); return EDGE[EDGE.length - 1][1]; };
    const addTri = (a, c, b) => { sawPos.push(...a, ...b, ...c);   // wound the other way: the teeth are mirrored downward
 sawUv.push(a[2] * 4, a[1] * 4, b[2] * 4, b[1] * 4, c[2] * 4, c[1] * 4); };
    for (let i = 0; i < teeth; i++) {
      const z0 = zStart + i * step, zPeak = z0 + step * 0.28, zGullet = z0 + step * 0.86, z1 = z0 + step;
      const y0 = edgeY(z0) + 0.0032, yPeak = edgeY(zPeak) - 0.0060, yGullet = edgeY(zGullet) + 0.0018, y1 = edgeY(z1) + 0.0032;
      const L0 = [halfX, y0, z0], R0 = [-halfX, y0, z0], L1 = [halfX, y1, z1], R1 = [-halfX, y1, z1];
      const P = [0, yPeak, zPeak], G = [0, yGullet, zGullet], LG = [halfX * 0.7, yGullet, zGullet], RG = [-halfX * 0.7, yGullet, zGullet];
      // Left bevel faces (+x)
      addTri(L0, LG, P); addTri(LG, L1, G);
      // Right bevel faces (-x)
      addTri(R0, P, RG); addTri(RG, G, R1);
      // Front and back tooth facets closing the gullet
      addTri(L0, P, R0); addTri(P, LG, G); addTri(P, G, RG); addTri(LG, L1, R1); addTri(LG, R1, RG);
    }
    const sawGeo = new THREE.BufferGeometry();
    sawGeo.setAttribute('position', new THREE.Float32BufferAttribute(sawPos, 3));
    sawGeo.setAttribute('uv', new THREE.Float32BufferAttribute(sawUv, 2));
    sawGeo.computeVertexNormals();
    const sawMesh = new THREE.Mesh(sawGeo, edgeMat);
    sawMesh.castShadow = sawMesh.receiveShadow = true;
    mc.add(sawMesh);
  }
  g.userData.knifeModel = kn;
  g.userData.macheteModel = mc;
  mergeRigidMeshes(g, {}, new Set([kn, mc]));
  g.visible = false;
  return g;
}
