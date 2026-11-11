// GP-164: reference-based sidearms and blades. Animation and gameplay stay with the caller.

// Millimetre-scale knurl teeth do not need the rounded box helper's subdivisions.
// Same centre line as gripOutline. u runs down the grip, v+ is the front strap.
import { gunDetail } from './gun-detail.js';
import * as TSL from 'three/tsl';
import { foldStatic } from '../world/bake.js';
import { addArtworkInstances, addTriggerArtwork, bindModelArtwork, groupArtwork, optionalArtworkGroup } from './weapon-model-hooks.js';
import { markPaintSurface, walnutTexture } from './weapon-finish.js';
import { attachLaserLight } from './weapon-attachments.js';
import { fitPortCarrier, roundGeometry, spentCaseGeometry } from './weapon-casings.js';

function shapedGrip(cz, cy, h, d, rake, pts) {
  const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => {
    const uu = (u - 0.5) * h, vv = v * k;
    return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr];
  });
}
// GB-314 / CL-312 b: ridges across a grip strap (same helper as studio/weapon-longarms.js).
function gripRidges(K, mat, cz, cy, h, d, rake, us, v, w, t = 0.003, along = 0.0025) {
  const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return us.map((u) => {
    const uu = (u - 0.5) * h, vv = v * k;
    return K.box(w, along, t, mat, 0, cy - uu * cr - vv * sr, cz - uu * sr + vv * cr, rake, 0, 0, null, 0.0008);
  });
}

function flatDetail(T, parent, mat, w, h, d, x, y, z, rz = 0) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z); mesh.rotation.z = rz;
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

// Shallow checkering is one small mesh per panel, then folded into the caller's
// material batch. It uses the existing furniture material, so camo still works.
function checkeredPanel(T, parent, mat, outline, x, spacing = .007, radius = .0012, exposed = () => true) {
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
      if (!exposed(z,y) || ![[z, y + radius], [z + radius, y], [z, y - radius], [z - radius, y]].every(q => inside(...q))) continue;
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

// Replace the two triangles on the solid magazine top with a continuous shaded relief.
// Each ring shares its boundary with the next, including the original four top corners.
function magazineTop(T, mesh) {
  const src = mesh.geometry, p = src.attributes.position, n = src.attributes.normal;
  const pos = [], normals = [], uv = [], top = [];
  let height = -Infinity;
  for (let i = 0; i < p.count; i++) height = Math.max(height, p.getY(i));
  for (let i = 0; i < p.count; i += 3) {
    const ends = [i, i + 1, i + 2];
    if (ends.every(j => Math.abs(p.getY(j) - height) < 1e-7)) {
      for (const j of ends) top.push(new T.Vector3().fromBufferAttribute(p, j));
    } else for (const j of ends) {
      pos.push(p.getX(j), p.getY(j), p.getZ(j));
      normals.push(n.getX(j), n.getY(j), n.getZ(j));
      uv.push(src.attributes.uv.getX(j), src.attributes.uv.getY(j));
    }
  }
  const bounds = new T.Box3().setFromPoints(top);
  const w = bounds.max.x, d = bounds.max.z;
  const ring = (x, z, y) => [[-x,-z], [-x,z], [x,z], [x,-z]].map(([a,b]) => new T.Vector3(a, height + y, b));
  const rings = [ring(w,d,0), ring(w*.86,d*.82,.001), ring(w*.66,d*.76,.0036), ring(w*.53,d*.70,.0008)];
  const normal = new T.Vector3();
  function face(a,b,c) {
    T.Triangle.getNormal(a,b,c,normal);
    for (const v of [a,b,c]) {
      pos.push(v.x,v.y,v.z); normals.push(normal.x,normal.y,normal.z);
      uv.push(v.x/(2*w)+.5,v.z/(2*d)+.5);
    }
  }
  for (let i = 1; i < rings.length; i++) {
    const outer = rings[i-1], inner = rings[i];
    for (let j = 0; j < 4; j++) {
      const k = (j+1)%4;
      face(outer[j],outer[k],inner[k]); face(outer[j],inner[k],inner[j]);
    }
  }
  const cap = rings[rings.length-1];
  face(cap[0],cap[1],cap[2]); face(cap[0],cap[2],cap[3]);
  const result = new T.BufferGeometry();
  for (const [key,values,size] of [['position',pos,3],['normal',normals,3],['uv',uv,2]])
    result.setAttribute(key,new T.Float32BufferAttribute(values,size));
  mesh.geometry = result;
  src.dispose();
}

const pistolFinishes = new WeakMap();
function pistolFinish(body) {
  if (!pistolFinishes.has(body)) {
    const finished = (color, roughness, metalness) => {
      const mat = body.clone();
      mat.color.setHex(color);
      mat.roughness = roughness;
      mat.metalness = metalness;
      return mat;
    };
    pistolFinishes.set(body, {
      slideSteel: finished(0x424c58, 0.36, 0.61),
      rearPlate: finished(0x2e343c, 0.58, 0.29),
      bareSteel: finished(0x89929b, 0.34, 0.58)
    });
  }
  return pistolFinishes.get(body);
}

export function makePistolModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, gunBody, gunDark, gunMid, gunPoly, gunRubber, gunAccent, magPoly, gaugeFace, sightDotMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);   // GB-307 / CL-309 helpers
  const { slideSteel, rearPlate, bareSteel } = pistolFinish(gunBody);
  // The rear and top occupy most of the first-person silhouette.
  const slide = K.group(0, 0.05, 0.05);
  gun.userData.ejectPort = [0.024, 0.065, 0.068];
  // GB-154 (Jerry: "slide and frame are too short and do not reach the muzzle"): the slide runs 120 mm further forward,
  // its front face flush with the barrel's crown (gun z 0.31; the muzzle point stays at 0.32). The rear, the ejection
  // port and the rear sight stay where they were, so the GB-145 rack grab and the hand anchors are unchanged.
  // GB-172: a lower, narrower slide. The front face stays at local z 0.26 so it still meets the crown.
  // GB-180 (Jerry: the slide floated over the frame): the slide's bottom comes down to local -0.044 (gun y 0.006), 6 mm
  // over the frame's top rail (0.012), so the slide sits on the frame with no daylight under it.
  K.slab([[-0.14, -0.044], [0.252, -0.044], [0.26, -0.034], [0.26, 0.012], [0.254, 0.020], [0.242, 0.024], [-0.126, 0.024], [-0.134, 0.018], [-0.14, 0.010]], 0.046, slideSteel, { bevel: 0.006, segs: 3, parent: slide });
  const plateOutline = [[-.015, .008], [.015, .008], [.019, .003], [.019, -.023],
    [.014, -.030], [-.014, -.030], [-.019, -.023], [-.019, .003]];
  K.slab(plateOutline, .002, rearPlate, {ry:Math.PI / 2, z:-.141, bevel:.0005, parent:slide});
  for (const [y, width] of [[-.007, .026], [-.014, .026], [-.021, .022]]) {
    K.box(width, .0022, .0008, gunDark, 0, y, -.1424, 0, 0, 0, slide, .0003);
  }
  for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) K.slab([[-.128 + i * .009, -.024], [-.123 + i * .009, -.024], [-.123 + i * .009, .016], [-.128 + i * .009, .016]], .0014, gunDark, { x: sx * .0232, bevel: .0005, parent: slide });
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) K.slab([[.2 + i * .009, -.022], [.205 + i * .009, -.022], [.205 + i * .009, .014], [.2 + i * .009, .014]], .0014, gunDark, { x: sx * .0232, bevel: .0005, parent: slide });
  // GB-180: dovetailed sights. Rear: a dovetail base across the slide and a U notch (two ears), not a bare block.
  K.slab([[-0.1286, 0.024], [-0.0974, 0.024], [-0.098, 0.026], [-0.128, 0.026]], 0.030, gunMid, { bevel: 0.0004, parent: slide });
  K.slab([[-0.1275, 0.026], [-0.0995, 0.026], [-0.101, 0.032], [-0.126, 0.032]], 0.024, gunDark, { bevel: 0.0010, parent: slide });
  for (const sx of [-1, 1]) K.slab([[-0.12767, 0.032], [-0.10433, 0.032], [-0.106, 0.042], [-0.126, 0.042]], 0.0075, gunDark, { x: sx * 0.0078, bevel: 0.0012, parent: slide });
  for (const sx of [-1, 1]) {
    // Round paint patches lie along the sloping backs of the two existing ears.
    const dot = K.cyl(.00245, .00245, .00028, gaugeFace, sx * .0078, .036, -.12714, slide, 16);
    dot.rotation.x += Math.atan(.167);
  }
  K.slab([[0.2194, 0.024], [0.2426, 0.024], [0.242, 0.026], [0.220, 0.026]], 0.022, gunMid, { bevel: 0.0004, parent: slide });   // GB-180: front dovetail
  // GB-259 (down the sights the post's tip sat at the notch's floor, so none of it showed in the notch): the post up 5 mm,
  // its tip level with the ears' tops (gun y 0.092), its dot level with the rear dots (0.086): a three-dot picture.
  K.slab([[0.22156, 0.026], [0.24056, 0.026], [0.237, 0.042], [0.226, 0.042]], 0.008, gunDark, { bevel: 0.0015, parent: slide });
  // A surface marking follows the existing sloping rear face. Its centre stays at y=.036.
  const markZ = y => 0.221 + (y - 0.024) * (0.005 / 0.018);
  const markBottom = 0.034, markTop = 0.038, ink = 0.0002;
  K.slab([[markZ(markBottom) - ink, markBottom], [markZ(markBottom), markBottom],
    [markZ(markTop), markTop], [markZ(markTop) - ink, markTop]], 0.004, sightDotMat, {parent:slide, bevel:0});
  K.slab([[-.011, .002], [.05, .002], [.05, .016], [.043, .020], [-.011, .020]], .0014, gunRubber, { x: .0233, bevel: .001, parent: slide });
  K.slab([[-.007, .006], [.044, .006], [.047, .010], [.042, .016], [-.007, .016]],
    .0006, bareSteel, {x:.0243, bevel:.0002, parent:slide});
  K.box(.002, .003, .055, gunMid, .0242, .004, .019, 0, 0, 0, slide);
  K.box(0.0021, 0.006, 0.039, gunDark, 0.02405, 0.004, -0.0305, 0, 0, 0, slide);
  for (const sx of [-1, 1]) K.box(0.003, 0.001, 0.054, gunDark, sx * 0.0145, 0.0245, 0.022, 0, 0, 0, slide);   // GB-180: the ejection port's edges
  K.box(0.026, 0.001, 0.003, gunDark, 0, 0.0245, -0.006, 0, 0, 0, slide);
  // Barrel hood lives on the frame (below), not the slide — otherwise reload rack
  // peels a gunAccent chunk off the muzzle and reads as the barrel detaching.
  // Frame: the dust cover with an accessory rail, the trigger guard, trigger, controls.
  // GB-154: the dust cover runs on under the longer slide to 40 mm short of its front (was 0.17).
  // GB-180: frame and slide line up. The frame's rear is flush with the slide's rear (gun z -0.09) and its dust cover
  // runs to 14 mm short of the slide's front (a real pistol's proportion), its top 0.012 tucked up inside the slide.
  // CL-331 (J95): the frame's back 2.5 mm inside the slide's (they were one plane at z -0.09: the flicker on the back)
  K.slab([[-0.0875, 0.012], [0.294, 0.012], [0.298, 0.000], [0.294, -0.020], [0.112, -0.020], [0.104, -0.016], [0.04, -0.016], [0.026, -0.030], [-0.004, -0.036], [-0.022, -0.020], [-0.07, -0.012], [-0.0875, -0.004]], 0.044, gunPoly, { bevel: 0.007, segs: 3 }).name = 'pistol dust cover';
  // GB-180: a beavertail / tang that sweeps back under the slide's rear and blends down into the grip's back strap.
  K.slab([[-.060,.006], [-.085,.005], [-.097,.003], [-.100,.002], [-.100,-.002],
    [-.096,-.006], [-.084,-.009], [-.073,-.013], [-.062,-.020], [-.048,-.014],
    [-.036,-.008], [-.026,-.002]], .040, gunPoly, {bevel:.004, segs:3}).name = 'pistol rear tang';
  K.rail(0.1, 0, -0.025, 0.2, null, 0.03);   // GB-180: the accessory rail along the dust cover, its top in the frame
  // GB-177 (pass 2: the guard read as a thin wire): a moulded guard, thicker and wider, its front squared, its back
  // running up into the frame.
  // GB-180 (Jerry: the guard was oversized and too far forward): a smaller guard, its front at z 0.104, its back
  // curving up into the grip's front strap (the strap is at z ~0.02-0.027 here) so guard and grip are one moulding.
  K.slab(gunBand([[.110,-.016], [.113,-.026], [.114,-.032], [.113,-.041], [.110,-.048],
    [.105,-.053], [.097,-.057], [.088,-.058], [.056,-.058], [.048,-.056],
    [.042,-.051], [.037,-.044], [.034,-.036], [.036,-.016]], .0068),
    .018, gunPoly, {bevel:.003, segs:3}).name = 'pistol guard';
  K.slab([[0.026, -0.030], [0.042, -0.030], [0.046, -0.052], [0.036, -0.062], [0.024, -0.050]], 0.03, gunPoly, { bevel: 0.006 }).name = 'pistol guard root';
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180 (Jerry: the trigger was a thin wire at the back of the guard): a solid curved blade in the middle of the
  // guard, its face toward the grip, its tip curling forward, with a safety tab down its face.
  const trigger = K.slab([[0.068, -0.014], [0.077, -0.014], [0.076, -0.028], [0.078, -0.040], [0.085, -0.049], [0.081, -0.054], [0.070, -0.047], [0.065, -0.034], [0.065, -0.022]], 0.010, rearPlate, { bevel: 0.002 });
  trigger.name = 'pistol trigger';
  const triggerInset = K.slab([[0.068, -0.026], [0.071, -0.026], [0.073, -0.042], [0.070, -0.044]], 0.003, gunMid, { x: 0, bevel: 0.0008 });
  K.box(0.005, 0.012, 0.036, gunDark, -0.023, 0.004, 0.06);
  const release = K.slab([[.020,-.014], [.024,-.009], [.032,-.009], [.036,-.014], [.032,-.023], [.024,-.023]], .005, gunDark, {x:-.023, bevel:.0015});
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
  K.slab(shapedGrip(-0.02, -0.08, 0.18, 0.1, 0.3, pistolGrip), 0.052, gunPoly, { bevel: 0.009, segs: 3 }).name = 'pistol grip';
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
  // GB-260 (J7, Jerry: the pistol's extended magazine reads undersized): the body was 28 mm across and 20 mm front to
  // back inside a grip 52 mm across and about 100 mm deep (docs/weapons-sizes.md) - the narrowest thing on the gun, and
  // shallower than it was wide, which no real box magazine is. A .45 double-stack body is 40 mm across and 46 mm front
  // to back, deeper than wide, with a floorplate proud of it on every side (52 x 54 mm here). Same 162 mm length, centre
  // line and rake as GB-154/GB-180, so the well, the hand hold and gunExtLook's own growth are untouched.
  const magBody = K.slab([[-0.015, 0.081], [0.015, 0.081], [0.015, -0.081], [-0.015, -0.081]], 0.040, magPoly, { bevel: 0.003, rx: 0.3, parent: mag });
  magazineTop(THREE, magBody);
  K.slab([[-.022,-.081], [.019,-.081], [.025,-.084], [.026,-.089], [.023,-.092],
    [-.025,-.092], [-.028,-.089], [-.027,-.085]], .052, rearPlate, {bevel:.003, rx:.3, parent:mag});
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
  const barrelPanel = K.box(0.026, 0.014, 0.05, bareSteel, 0, 0.068, 0.072, 0, 0, 0, frame, 0.003);
  // GB-154: the barrel runs to its crown 1.5 mm proud of the slide's new front face; the compensator that stood out
  // in front of the short slide is gone (the slide is the front of the gun now, like a real pistol).
  const barrel = K.lathe([[0, -0.02], [0.0145, -0.02], [0.0145, 0.311], [0, 0.311]], gunAccent, { y: 0.05, seg: 12, parent: frame });
  const bore = K.disc(0.0065, gunRubber, 0, 0.05, 0.3115, 0, frame, 10);   // the bore at the crown
  K.cyl(0.009, 0.009, 0.003, bareSteel, 0, 0.017, 0.309, frame, 16);  // recoil spring guide beneath the barrel
  // D-123: the weapon light is the kiosk's combined laser/light unit, already mounted by attachLaserLight below.
  // The Glock frame's own accessory rail stays in place for that purchase.
  gun.userData.frame = frame;
  // --- GB-307 fidelity (D-121 / docs/fps/fidelity.md pistol list) ---
  // Six dark marks on each animated side panel. Only their exposed relief is drawn.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const yy = 0.055 - i * 0.022;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.001, 12), gunRubber);
      hole.rotation.z = Math.PI / 2;
      hole.position.set(sx * 0.0205, yy * Math.cos(0.3), yy * Math.sin(0.3));
      hole.castShadow = hole.receiveShadow = true;
      mag.add(hole);
    }
  }
  // Backstrap texture: shallow polymer ribs down the grip's rear (no bare strap).
  // GB-316 (J23): backstrap texture follows the rake (the old D.ribs sat at one z and floated off the strap).
  gripRidges(K, gunDark, -0.02, -0.08, 0.18, 0.1, 0.3, [0.22, 0.32], -0.0295, 0.028, 0.0014, 0.0022);
  gripRidges(K, gunDark, -0.02, -0.08, 0.18, 0.1, 0.3, [0.42, 0.52, 0.62, 0.72, 0.82, 0.90], -0.031, 0.028, 0.0014, 0.0022);
  // Undercut trigger guard: a high-hold bite where the guard meets the front strap.
  K.slab([[0.028, -0.026], [0.046, -0.026], [0.044, -0.038], [0.026, -0.036]], 0.026, gunPoly, { bevel: 0.002 });
  K.slab([[0.018, -0.020], [0.040, -0.022], [0.048, -0.034], [0.040, -0.048], [0.022, -0.044], [0.012, -0.030]], 0.036, gunPoly, { bevel: 0.006, segs: 3 });   // GB-316 (J23): web from guard into the front strap
  // Muzzle crown: recessed ring at the barrel tip (sits on the barrel; bore disc stays).
  const crown = K.cyl(0.0136, 0.0122, 0.0032, bareSteel, 0, 0.05, 0.3098, frame, 20);
  const innerCrown = K.cyl(0.0108, 0.0108, 0.0015, gunDark, 0, 0.05, 0.3108, frame, 14);
  // Slide-stop lever (left): a recognisable paddle over the existing stop post, sunk into the frame face.
  const slideStop = K.slab([[-0.014, -0.003], [0.020, -0.003], [0.022, 0.003], [0.016, 0.007], [-0.012, 0.005]], 0.0020, rearPlate, { x: -0.0228, y: 0.004, z: 0.055, bevel: 0.0007 });
  D.screw(gun, -0.0226, 0.004, 0.040, { axis: 'x', side: -1, r: 0.0022, head: 0.0011, kind: 'slot' });
  // Takedown lever: keyed tabs both sides + one through-pin (base inside the frame).
  for (const sx of [-1, 1]) {
    K.slab([[-0.009, -0.0035], [0.009, -0.0035], [0.009, 0.0035], [-0.009, 0.0035]], 0.0016, ctx.gunMetal, { x: sx * 0.0228, y: -0.018, z: 0.018, bevel: 0.0005 });
  }
  D.pin(gun, 0, -0.018, 0.018, { axis: 'x', len: 0.0472, r: 0.0013, proud: 0.0008, caps: true });
  // Extractor claw in the port's right wall (attached to the slide).
  K.slab([[0.000, -0.003], [0.011, -0.001], [0.013, 0.003], [0.001, 0.005]], 0.00035, gunMid, { x: 0.024175, y: 0.010, z: -0.004, parent: slide, bevel: 0.0001 });
  // Panel lines on the slide top and the dust-cover seam (yardstick: no bare >3 cm face).
  // The longitudinal graphic ends on either side of the transverse dark band.
  for (const [start, end] of [[-0.05, -0.0075], [-0.0045, 0.15]]) {
    D.groove(slide, { x: 0, y: 0.024, z: (start + end) / 2, axis: 'y', side: 1, along: 'z', len: end - start, w: 0.0007 });
  }
  D.groove(gun, { x: 0, y: 0.012, z: 0.14, axis: 'y', side: 1, along: 'z', len: 0.14, w: 0.0007 });
  // Front-strap finger grooves: three shallow recesses into the front strap (not proud blocks).
  // GB-316 (J23): finger grooves follow the raked front strap (the old boxes sat at one z and floated low down).
  for (const u of [0.28, 0.44, 0.60]) {
    const sr = Math.sin(0.3), cr = Math.cos(0.3), uu = (u - 0.5) * 0.18, vv = 0.028 * (0.1 / 0.08);
    K.box(0.022, 0.012, 0.008, gunDark, 0, -0.08 - uu * cr - vv * sr, -0.02 - uu * sr + vv * cr, 0.3, 0, 0, null, 0.002);
  }
  // Grip-panel screws (attached; CL-309 sink).
  for (const sx of [-1, 1]) {
    D.screw(gun, sx * 0.0271, -0.052, -0.018, { axis: 'x', side: sx, r: 0.0025, head: 0.0009, kind: 'slot' });
    D.screw(gun, sx * 0.0271, -0.108, -0.026, { axis: 'x', side: sx, r: 0.0025, head: 0.0009, kind: 'slot' });
  }
  // J72: the extra ribs sit in the gaps between the existing serrations; their old
  // centre was almost coplanar with every dark strip and shimmered at the rear.
  for (const sx of [-1, 1]) {
    D.ribs(slide, { x: sx * 0.023, y: -0.004, z: -0.0905, axis: 'x', side: sx, along: 'z', count: 8, pitch: 0.009, w: 0.017, h: 0.0006, t: 0.0011, mat: D.mats.dark });
    D.ribs(slide, { x: sx * 0.023, y: -0.004, z: 0.2245, axis: 'x', side: sx, along: 'z', count: 5, pitch: 0.009, w: 0.015, h: 0.0006, t: 0.0011, mat: D.mats.dark });
  }

  gunEffects(gun, new THREE.Vector3(0, 0.05, 0.32), 0.045, 2.5, 6, 0.005);
  gun.userData.laser.position.set(0, 0.05, 3.3);
  gun.userData.laserBaseZ = 0.3;
  gun.userData.barrelAssembly = null;
  gunSuppressor(gun, K, 'pistol');   // CL-95
  attachLaserLight(gun, 'pistol', ctx);
  // The armory paints the exterior coating. Bare metal, sight dots, controls,
  // textured grip inserts, magazine and lens assemblies keep their factory finish.
  gun.userData.partFinish = true;
  const light = gun.userData.laserLightUnit, can = gun.userData.suppressor;
  gun.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (mesh.parent === light) {
      if (mesh.name === 'moduleShell' || mesh.name === 'guardPad') markPaintSurface(mesh, 'light shell');
    } else if (mesh.parent === can) {
      if (mesh.material === gunDark || mesh.material === gunAccent) markPaintSurface(mesh, 'suppressor shell');
    } else if (mesh.material === slideSteel) markPaintSurface(mesh, 'slide');
    else if (mesh.material === gunPoly) markPaintSurface(mesh, 'frame');
  });
  bindModelArtwork(gun, 'controls', 'trigger', groupArtwork(THREE, trigger, triggerInset));
  bindModelArtwork(gun, 'controls', 'magRelease', groupArtwork(THREE, release));
  bindModelArtwork(gun, 'controls', 'slideStop', groupArtwork(THREE, slideStop));
  bindModelArtwork(gun, 'heatParts', 'barrel', groupArtwork(THREE, barrel, barrelPanel, crown, innerCrown, bore));
  bindModelArtwork(gun, 'heatParts', 'suppressor', can);
  return finishGun(gun);
}

// CL-320 (Jerry, 8 Nov, a picture of a Smith & Wesson N-frame with its parts named: "Use this picture in how to put
// together the revolver. Make sure it resembles this image. The aesthetic and how it looks in all areas needs to match
// this image."): a blued N-frame target revolver. The builder's units are the real gun's at 0.558 m a unit (len 0.484
// for a 0.27 m revolver): the cylinder 44 mm across and 41 long (it was 56 across), its chambers on a 14.5 mm circle so
// the top one stays on the bore (y 0.083); the 6-inch barrel round with a serrated rib and a ramp front sight, the
// ejector rod bare under it into a shroud lug, its head two inches short of the muzzle (Jerry: "keep it two inches short
// of barrel"); the frame with its top strap, the rear sight on it, the recoil shield, the side-plate screws (the gun's
// right, +x) and the checkered thumbpiece latch (its left, -x), the crane; a case-coloured target hammer with its
// firing pin and a wide smooth trigger in a round guard; the walnut target grip with its border, checkered panels, a
// plain medallion and the grip screw. The bore, the muzzle, the sight line (SIGHT.revolver's notch and post), the
// grip's palm (VM_SOCKETS.revolver) and every part the reloads drive are where they were.
function revolverCylinder(T, parent, mat, R, z0, z1, depth) {
  const p = [], uv = [], ix = [], n = 72;
  const rings = [[z0, R * 0.88, 0], [z0 + 0.005, R, 0], [z0 + 0.013, R, 1], [z1 - 0.016, R, 1], [z1 - 0.007, R, 0], [z1, R * 0.86, 0]];
  for (const [z, r, fade] of rings) for (let j = 0; j <= n; j++) {
    const a = j / n * Math.PI * 2, radius = r - depth * fade * Math.max(0, Math.cos(6 * a)) ** 4;
    p.push(Math.cos(a) * radius, Math.sin(a) * radius, z); uv.push(j / n, (z - z0) / (z1 - z0));
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
  return mesh;
}

// The grip occupies fewer UVs than the longarm furniture. Sample a finer,
// slightly sloped cut on its smooth back and both checkered panels.
let revolverGrain;
function revolverWalnutTexture(T) {
  if (!revolverGrain) {
    revolverGrain = walnutTexture(T).clone();
    revolverGrain.repeat.set(6.8, 3.1);
    revolverGrain.offset.set(0.21, 0.18);
    revolverGrain.rotation = -0.12;
    revolverGrain.needsUpdate = true;
  }
  return revolverGrain;
}

export function makeRevolverModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, finishGun, gunDark, gunRubber, brassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  // The fixed frame takes the armory coating. The action and walnut retain their factory finishes.
  const blued = new THREE.MeshStandardMaterial({ color: 0x404955, metalness: 0.68, roughness: 0.32 });
  const frameFinish = blued.clone();
  // A satin finish keeps the curve visible above the walnut grip in direct sun.
  frameFinish.roughness = .58;
  frameFinish.metalness = .53;
  frameFinish.userData.weaponFinishRole = 'frame';
  const caseCol = new THREE.MeshStandardMaterial({ color: 0x62584d, metalness: 0.68, roughness: 0.40 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x76492f, map: revolverWalnutTexture(THREE), metalness: 0, roughness: 0.48 });
  const walnutDark = new THREE.MeshStandardMaterial({ color: 0x573922, map: revolverWalnutTexture(THREE), metalness: 0, roughness: 0.65 });
  walnut.name = 'Revolver walnut';
  walnutDark.name = 'Revolver walnut inset';
  const nickel = new THREE.MeshStandardMaterial({ color: 0xc9c6bd, metalness: 0.9, roughness: 0.22 });
  const BY = 0.083, MZ = 0.332;                      // the bore's height and the muzzle
  const CY = 0.057, CZ = 0.02, CR = 0.044, CH = 0.039, RC = 0.026;   // larger J78 cylinder; the chamber circle still meets the bore

  // --- Frame (blued). The rear: the recoil-shield block and the hammer's housing, its back running down into the grip.
  K.slab([[-.021, .100], [-.050, .109], [-.064, .104], [-.074, .093], [-.080, .076], [-.082, .054], [-.080, .032], [-.075, .014], [-.066, .001],
    [-.046, -.005], [-.021, -.004]], .064, frameFinish, { bevel: .011, segs: 4 });
  K.lathe([[0, -.028], [.044, -.028], [.046, -.025], [.044, -.0205], [0, -.0205]], blued, { y: CY, z: 0, seg: 32 });   // the recoil shield behind the cylinder
  // the top strap over the cylinder, from the rear sight to the barrel's frame
  K.slab([[-.056, .1095], [-.044, .1145], [.064, .1145], [.074, .112], [.074, .0975], [-.044, .0975]], .036, frameFinish, { bevel: .003, segs: 3 });
  // the frame's front, round the barrel's shank, and its lug down to the crane's seat
  K.slab([[.059, .113], [.078, .112], [.093, .102], [.099, .089], [.099, .066], [.094, .052], [.086, .034], [.078, .018], [.066, .012], [.059, .012]], .056, frameFinish, { bevel: .009, segs: 4 });
  // the frame's bottom under the cylinder, from the recoil shield to the crane's seat
  K.slab([[-.026, .017], [.072, .017], [.082, .011], [.080, .001], [.062, -.006], [.020, -.008], [-.012, -.007], [-.026, .002]], .060, frameFinish, { bevel: .006, segs: 3 });
  K.lathe([[0, .058], [.0105, .058], [.0145, .066], [.0145, .092], [0, .092]], blued, { y: BY, seg: 18 });   // the forcing cone in the gap
  // the crane on the gun's left (-x), at the window's front, and its screw
  K.slab([[.058, .040], [.072, .040], [.072, .012], [.058, .016]], .006, blued, { x: -.0305, bevel: .0015 });
  D.screw(gun, -0.0335, 0.026, 0.065, { axis: 'x', side: -1, r: 0.0028, head: 0.0014, kind: 'slot' });
  // J78: an articulated yoke from the fixed front-left pivot to the cylinder's
  // front hub. At rest the arm folds inside the frame; CL-326 can rotate this
  // group +2.13 rad about Y as the cylinder swings to gun-local -X.
  // CL-326 (J78): the arm lies along the group's own +y (from the pin to the hub), so the game can aim the group at the
  // cylinder's front hub as it swings and stretch it to reach (scale.y); crane.userData.len is its length at rest.
  const crane = K.group(-0.043, 0.026, 0.090); crane.name = 'revolver-crane';
  const craneEnd = new THREE.Vector3(0.043, 0.031, -0.031), craneLen = craneEnd.length();
  crane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), craneEnd.clone().normalize());
  const craneArm = new THREE.Mesh(new THREE.BoxGeometry(0.010, craneLen, 0.013), blued);
  craneArm.name = 'swinging yoke arm'; craneArm.position.set(0, craneLen / 2, 0);
  craneArm.castShadow = craneArm.receiveShadow = true; crane.add(craneArm);
  { const hub = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), blued); hub.position.set(0, craneLen, 0); hub.castShadow = true; crane.add(hub); }
  crane.userData.len = craneLen; crane.userData.baseQuat = crane.quaternion.clone();
  // CL-326 (J78): the hinge on the frame: the pin through two ears on the frame's front left, the arm's eye between them
  // (the pin stood 7 mm off the frame's side with nothing to it: "no obvious way that it is attached")
  K.cyl(0.0068, 0.0068, 0.032, caseCol, -0.043, 0.026, 0.090, null, 12, 'y');
  for (const ey of [0.0135, 0.0385]) K.box(0.019, 0.007, 0.018, blued, -0.0375, ey, 0.090, 0, 0, 0, null, 0.002);
  gun.userData.crane = crane;
  gun.userData.baseCraneRot = crane.rotation.clone();
  // the side plate's outline and its screws on the gun's right (+x); the thumbpiece latch on its left (-x)
  for (const [y, z, x] of [[0.088, -0.061, 0.032], [0.028, -0.064, 0.032], [0.006, -0.034, 0.032], [0.006, 0.07, 0.030]]) D.screw(gun, x, y, z, { axis: 'x', side: 1, r: 0.0027, head: 0.0014, kind: 'slot' });
  D.groove(gun, { x: 0.032, y: 0.093, z: -0.044, axis: 'x', side: 1, along: 'z', len: 0.036, w: 0.0007 });
  D.groove(gun, { x: 0.032, y: 0.054, z: -0.075, axis: 'x', side: 1, along: 'y', len: 0.07, w: 0.0007 });
  K.slab([[-.064, .062], [-.036, .062], [-.032, .058], [-.032, .049], [-.036, .045], [-.064, .045], [-.067, .0535]], .005, blued, { x: -.0335, bevel: .0015 });   // the thumbpiece
  for (let i = 0; i < 6; i++) K.box(0.0012, 0.013, 0.0016, gunDark, -0.0362, 0.0535, -0.061 + i * 0.0045, 0, 0, 0, null, 0.0003);   // its grooves
  // The rear sight on the top strap (GB-308/313's adjustable sight, kept: the sight line runs through its notch).
  K.slab([[-0.013, 0.112], [0.013, 0.112], [0.013, 0.120], [-0.013, 0.120]], 0.026, gunDark, { bevel: 0.001, z: -0.050 });
  for (const sx of [-1, 1]) K.box(0.0045, 0.008, 0.012, gunDark, sx * 0.0085, 0.118, -0.050, 0, 0, 0, null, 0.0006);
  for (const sx of [-1, 1]) K.box(0.0034, 0.005, 0.009, blued, sx * 0.0048, 0.1195, -0.050, 0, 0, 0, null, 0.0005);   // CL-322: the blade either side of its notch (6 mm, the floor the base's top 0.120); one block filled it
  for (const sx of [-1, 1]) D.screw(gun, sx * 0.009, 0.120, -0.050, { axis: 'y', side: 1, r: 0.0018, head: 0.0010, kind: 'slot' });
  D.screw(gun, 0.013, 0.116, -0.043, { axis: 'x', side: 1, r: 0.0017, head: 0.0009, kind: 'slot' });   // the windage screw

  // --- Barrel (blued): round, with a raised rib along its top, serrated, a ramp front sight at the muzzle; under it the
  // shroud lug that takes the ejector rod's head.
  const barrel = K.lathe([[0, .09], [.0185, .09], [.0185, .104], [.0165, .112], [.0165, .326], [.0152, .3315], [.0118, .332], [0, .332]], blued, { y: BY, seg: 28 });
  K.slab([[.09, .0965], [.326, .0965], [.329, .1015], [.326, .1045], [.09, .1045]], .0115, blued, { bevel: .002, segs: 2 });   // the rib
  for (let i = 0; i < 26; i++) K.box(0.0096, 0.0006, 0.0012, gunDark, 0, 0.1048, 0.112 + i * 0.0068, 0, 0, 0, null, 0);   // its serrations
  K.slab([[0.292, 0.104], [0.312, 0.117], [0.318, 0.121], [0.326, 0.121], [0.328, 0.104]], 0.0048, gunDark, { bevel: 0.0008 });   // the ramp front sight (its top at the sighted tip)
  K.slab([[.234, .0735], [.31, .0735], [.3185, .068], [.3185, .057], [.311, .0485], [.252, .0485], [.240, .051], [.234, .058]], .021, blued, { bevel: .006, segs: 3 });   // the shroud lug
  K.disc(0.0118, gunRubber, 0, BY, 0.3325, 0, null, 14);   // the bore

  // --- Trigger guard (blued, a round loop into the grip's front) and the trigger (case-coloured, wide and smooth).
  K.slab(gunBand([[.062, -.005], [.066, -.022], [.060, -.040], [.046, -.052], [.026, -.054], [.012, -.046], [.006, -.030], [.005, -.012]], .0058), .013, frameFinish, { bevel: .0035, segs: 3 });
  const trigger = K.group(0, -0.008, 0.036);
  trigger.name = 'revolver-trigger';
  const triggerProfile = [[.0420, -.0060], [.0360, -.0210], [.0350, -.0340], [.0385, -.0430], [.0450, -.0480], [.0420, -.0520], [.0330, -.0470], [.0255, -.0380], [.0250, -.0230], [.0300, -.0080]];
  K.slab(triggerProfile.map(([z,y]) => [z - trigger.position.z, y - trigger.position.y]), .012, caseCol, { bevel: .0025, segs: 3, parent: trigger });
  gun.userData.trigger = trigger;

  // --- Cylinder (blued): fluted between the chambers, the stop notches over them; the chambers' mouths; the ejector rod
  // with its knurled head on the cylinder's axis (it swings out with it).
  const cylinder = K.group(0, CY, CZ);
  revolverCylinder(THREE, cylinder, blued, CR, -CH, CH, 0.0058);
  const liveArt = roundGeometry(THREE, 'revolver'), emptyArt = spentCaseGeometry(THREE, 'revolver');
  liveArt.computeBoundingBox();
  emptyArt.computeBoundingBox();
  // Keep the artist's existing palm-round width on all three loose props.
  // Their carriers set the pose. Only the child artwork has an offset.
  const artScale = .0184 / (liveArt.boundingBox.max.x - liveArt.boundingBox.min.x);
  const cartridge = new THREE.MeshStandardMaterial({color: 0xffffff, vertexColors: true, metalness: .58, roughness: .32});
  const copper = new THREE.MeshStandardMaterial({color: new THREE.Color().setRGB(.58, .22, .105), metalness: .58, roughness: .32});
  const noseCap = new THREE.SphereGeometry(.0054, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const looseRound = (geometry, rear) => {
    const mesh = new THREE.Mesh(geometry, cartridge);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.setScalar(artScale);
    mesh.position.z = rear - geometry.boundingBox.min.y * artScale;
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };
  // Bake the fixed colours once using the same material batch as the original chamber artwork.
  const chamberArt = new THREE.Group();
  K.cyl(0.0076, 0.0076, 0.048, brassMat, 0, 0, -0.008, chamberArt, 12);
  K.disc(0.0077, brassMat, 0, 0, -CH - 0.0015, Math.PI, chamberArt, 16);
  K.disc(0.0023, gunDark, 0, 0, -CH - 0.0018, Math.PI, chamberArt, 10);
  ctx.mergeRigidMeshes(chamberArt, {}, new Set());
  foldStatic(THREE, TSL, chamberArt);
  const chamberLayers = chamberArt.children.map(source => ({source, entries:[]}));
  const chamberRounds = [], chamberNoses = [], noseEntries = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;   // a chamber at the top, on the bore (y 0.083)
    const rx = Math.cos(a) * RC, ry = Math.sin(a) * RC;
    K.disc(0.0088, gunDark, rx, ry, -CH - 0.0005, Math.PI, cylinder, 16);
    K.disc(0.0092, gunDark, rx, ry, CH + 0.0005, 0, cylinder, 16);
    const round = new THREE.Group(); round.name = `chamber-round-${i}`;
    round.position.set(rx, ry, 0);
    for (const layer of chamberLayers) {
      const mesh = layer.source.clone(false);
      round.add(mesh);
      layer.entries.push({anchor:round, mesh});
    }
    // The counter hides this copper cap independently of the brass back.
    const cap = new THREE.Group();
    cap.name = 'revolver-nose-' + i;
    const tip = new THREE.Mesh(noseCap, copper);
    cap.add(tip);
    noseEntries.push({anchor:cap, mesh:tip});
    cap.scale.y = .34;
    cap.rotation.x = Math.PI / 2;
    cap.position.z = CH + .0005;
    round.add(cap); chamberNoses.push(cap);
    cylinder.add(round); chamberRounds.push(round);
    K.box(0.0012, 0.0045, 0.006, gunDark, Math.cos(a) * (CR - 0.0002), Math.sin(a) * (CR - 0.0002), -CH + 0.012, 0, 0, a, cylinder, 0.0003);   // the stop notch
  }
  for (const [index, layer] of chamberLayers.entries()) {
    addArtworkInstances(THREE, gun, cylinder, 'revolver-chamber-layer-' + index, layer.entries);
  }
  addArtworkInstances(THREE, gun, cylinder, 'revolver-visible-tips', noseEntries);
  gun.userData.chamberRounds = chamberRounds; // CL-326 can hide each live round as its chamber fires.
  gun.userData.chamberNoses = chamberNoses;
  // CL-326 (J78): the unfired rounds he tips out into his palm on a reload (first person places them; hidden otherwise)
  const palmRounds = new THREE.Group(); palmRounds.name = 'palm-rounds'; palmRounds.visible = false;
  for (let i = 0; i < 6; i++) {   // a group a round: the model's finishing merges one material's meshes inside a group
    const r = new THREE.Group(); r.name = `palm-round-${i}`; r.add(looseRound(liveArt, -.025));
    r.visible = false; palmRounds.add(r);
  }
  gun.add(palmRounds);
  gun.userData.palmRounds = palmRounds;
  K.cyl(0.0042, 0.0042, 0.182, blued, 0, 0, 0.121, cylinder, 12);   // the ejector rod (local 0.030 to 0.212)
  K.cyl(0.0058, 0.0058, 0.014, blued, 0, 0, 0.219, cylinder, 14);   // its head: the front at gun z 0.246, two inches short of the muzzle
  for (const z of [0.215, 0.219, 0.223]) K.cyl(0.0060, 0.0060, 0.0012, gunDark, 0, 0, z, cylinder, 14);   // the knurl
  gun.userData.cylinder = cylinder;
  gun.userData.baseCylinderRot = cylinder.rotation.clone();
  gun.userData.baseCylinderPos = cylinder.position.clone();
  gun.userData.mag = cylinder;
  gun.userData.baseMagPos = cylinder.position.clone();
  gun.userData.baseMagRot = cylinder.rotation.clone();
  // GB-300: pair reload timing (matches index.html akimboReloadDip / pairCylLocal) and swing amounts the viewmodel can read.
  gun.userData.pairReload = { right: [0.06, 0.50], left: [0.48, 0.92] };
  gun.userData.cylinderSwing = { openX: -0.095, openY: -0.008, openZ: 0.01, yaw: -0.16, ejectX: -0.012 };
  // GB-302: six empties + a speedloader for the reload, in the chambers (now on the 26 mm circle round y 0.057).
  const empties = new THREE.Group();
  empties.name = 'empties';
  const emptyCasings = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const casing = new THREE.Group();
    casing.position.set(Math.cos(a) * RC, CY + Math.sin(a) * RC, CZ);
    // Rimmed, straight-walled .44 case. The mouth and the recess inside it
    // are visible from the open cylinder. Each empty remains independently visible.
    casing.add(looseRound(emptyArt, -CH - .0015));
    casing.visible = false;
    empties.add(casing);
    emptyCasings.push(casing);
  }
  gun.add(empties);
  gun.userData.empties = empties;
  gun.userData.emptyCasings = emptyCasings;
  gun.userData.baseEmptiesPos = empties.position.clone();
  gun.userData.baseEmptiesRot = empties.rotation.clone();
  const speedloader = new THREE.Group();
  speedloader.name = 'speedloader';
  speedloader.position.set(-0.02, CY, CZ);
  const loaderRing = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.004, 8, 16), gunDark);
  loaderRing.rotation.y = Math.PI / 2;
  speedloader.add(loaderRing);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    // CL-326: a group a round (they were merged into one mesh, so a part-full loader could not show its count)
    const rnd = new THREE.Group(); rnd.name = `loader-round-${i}`;
    rnd.add(looseRound(liveArt, -.017));
    rnd.position.set(Math.cos(a) * RC, Math.sin(a) * RC, 0);
    speedloader.add(rnd);
  }
  speedloader.visible = false;
  gun.add(speedloader);
  for (const [name, slots] of [
    ['revolver-live-reload-instances', [...palmRounds.children, ...speedloader.children.slice(1)]],
    ['revolver-spent-instances', emptyCasings]
  ]) {
    addArtworkInstances(THREE, gun, gun, name, slots.map(anchor => ({anchor, mesh:anchor.children[0]})));
  }
  gun.userData.speedloader = speedloader;
  gun.userData.baseSpeedloaderPos = speedloader.position.clone();
  gun.userData.baseSpeedloaderRot = speedloader.rotation.clone();
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    empties: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: false, chamberR: RC, chamberY0: CY, chamberZ0: CZ, note: 'six casings; show on eject, then fall' },
    speedloader: { restPos: [-0.02, CY, CZ], restRot: [0, 0, 0], visibleAtRest: false, note: 'into the open cylinder; hide at rest' },
    palmRounds: { restPos: [0, 0, 0], restRot: [0, 0, 0], visibleAtRest: false },
    cylinder: { restPos: [0, CY, CZ], swing: gun.userData.cylinderSwing, pairReload: gun.userData.pairReload },
    crane: { restPos: [-0.043, 0.026, 0.090], hub: [0, 0, CH], note: 'CL-326: aimed from its pin at the cylinder\'s front hub (cylinder-local hub) every frame, scale.y to reach' }
  });

  // --- Hammer (case-coloured, cocks and falls about the same pivot): the body in the frame's slot, the wide target spur
  // checkered across its top (kept 5+ mm under the notch-to-post line), the firing pin on its nose.
  K.box(0.016, 0.022, 0.026, gunDark, 0, 0.093, -0.069, 0, 0, 0, null, 0.001);   // the slot's floor
  for (const sx of [-1, 1]) K.box(0.004, 0.024, 0.028, blued, sx * 0.0105, 0.094, -0.069, 0, 0, 0, null, 0.0008);   // its cheeks
  const hammer = K.group(0, 0.085, -0.08);
  K.slab([[0.013, -0.028], [0.015, -0.006], [0.012, 0.007], [0.005, 0.014], [-0.006, 0.018], [-0.020, 0.0190], [-0.030, 0.0185], [-0.038, 0.014],
    [-0.041, 0.007], [-0.036, 0.002], [-0.026, 0.003], [-0.016, 0.000], [-0.011, -0.010], [-0.008, -0.028]], 0.0135, caseCol, { bevel: 0.0035, segs: 3, parent: hammer });
  K.slab([[-0.008, 0.016], [-0.038, 0.015], [-0.040, 0.008], [-0.010, 0.010]], 0.0175, caseCol, { bevel: 0.003, segs: 2, parent: hammer });   // the target spur, wider than the body
  for (let i = 0; i < 6; i++) K.box(0.016, 0.0012, 0.0013, gunDark, 0, 0.0164, -0.012 - i * 0.0048, 0, 0, 0, hammer);   // its checkering
  K.cyl(0.0019, 0.0019, 0.009, nickel, 0, 0.004, 0.019, hammer, 8, 'z');   // the firing pin
  gun.userData.hammer = hammer;
  gun.userData.baseHammerRot = hammer.rotation.clone();
  gun.userData.baseHammerPos = hammer.position.clone();
  // The hand owns trigger travel (0..1). The sear breaks near the end of the pull.
  gun.userData.doubleActionPose = (triggerPart, hammerPart, travel, resetting = false) => {
    const pull = Math.max(0, Math.min(1, travel));
    triggerPart.rotation.x = 0.36 * pull;
    const lift = pull < 0.88 ? pull / 0.88 : (1 - pull) / 0.12;
    hammerPart.rotation.x = resetting ? 0 : -0.55 * lift;
  };

  // --- The walnut target grip: one rounded stock from behind the guard round the frame's back, the hump under the hammer
  // and the toe's flare; raked back like the picture's (its front strap ~115 degrees to the bore: every point below the
  // frame's bottom slides back 0.27 of its depth, so the palm is at (0, -0.07, -0.059), VM_SOCKETS/WEAPON_HOLD follow);
  // a smooth border round a checkered panel on each side, the plain medallion high at the back and the grip screw.
  // J78: keep the upper palm and trigger reach where the hands meet it, but shorten the
  // oversized lower target stock. The cylinder/frame now read as the dominant mass.
  const RK = 0.27, sh = ([z, y]) => [z + Math.min(0, y) * RK, y < -0.07 ? -0.07 + (y + 0.07) * 0.72 : y];
  K.slab([[.014, -.006], [.010, -.030], [.004, -.060], [-.002, -.090], [-.006, -.118], [-.006, -.140], [-.002, -.158], [-.006, -.172], [-.018, -.180],
    [-.045, -.183], [-.075, -.181], [-.094, -.174], [-.102, -.160], [-.100, -.135], [-.094, -.105], [-.088, -.075], [-.084, -.045], [-.084, -.015],
    [-.086, .010], [-.082, .026], [-.072, .032], [-.060, .020], [-.042, .005], [-.017, -.002]].map(sh), .066, walnut, { bevel: .010, segs: 4 });
  const panel = [[-.004, -.040], [-.010, -.080], [-.016, -.115], [-.018, -.140], [-.022, -.160], [-.045, -.168], [-.075, -.166], [-.086, -.152], [-.084, -.120],
    [-.078, -.088], [-.074, -.055], [-.072, -.035], [-.060, -.026], [-.020, -.028]].map(sh);
  const med = sh([-.058, -.031]), scr = sh([-.046, -.074]);
  for (const sx of [-1, 1]) {
    K.slab(panel, .0012, walnutDark, { x: sx * .0329, bevel: .0004 });
    checkeredPanel(THREE, gun, walnut, panel, sx * .0336, .0042, .0013);
    K.cyl(0.0072, 0.0072, 0.0016, nickel, sx * 0.0338, med[1], med[0], null, 18, 'x');   // the medallion
    K.cyl(0.0058, 0.0058, 0.0018, gunDark, sx * 0.0339, med[1], med[0], null, 18, 'x');
    K.cyl(0.0044, 0.0044, 0.002, nickel, sx * 0.034, med[1], med[0], null, 16, 'x');
    // Keep the silver trim nearly flush with the flat grip panel. The slotted
    // head sits on its outer face, so the drive mark follows the same stack.
    K.cyl(0.0042, 0.0042, 0.0006, nickel, sx * 0.0336, scr[1], scr[0], null, 14, 'x');
    D.screw(gun, sx * 0.0339, scr[1], scr[0], { axis: 'x', side: sx, r: 0.0026, head: 0.0012, kind: 'slot' });
  }

  gunEffects(gun, new THREE.Vector3(0, BY, 0.35), 0.045, 2.8, 6, 0.005);
  gun.userData.laser.position.set(0, BY, 3.35);
  gun.userData.laserBaseZ = 0.35;
  gun.userData.barrelAssembly = null;
  gun.userData.partFinish = true;
  attachLaserLight(gun, 'revolver', ctx);
  const light = gun.userData.laserLightUnit;
  for (const name of ['moduleShell', 'railClamp']) markPaintSurface(light.getObjectByName(name), 'light shell');
  const firstMountPart = light.children.length;
  // J44: keep the S&W outline bare. The short underlug rail and rear top-strap plate
  // appear with their separately purchased attachments, never on the base gun.
  // This saddle reaches up into the shroud lug so the purchased unit does not hang below the barrel.
  K.box(0.022, 0.020, 0.112, blued, 0, 0.022, -0.002, 0, 0, 0, gun.userData.laserLightUnit, 0.002);
  K.rail(0.080, 0, 0.018, 0.018, gun.userData.laserLightUnit, 0.026, 2);
  for (const piece of light.children.slice(firstMountPart)) markPaintSurface(piece, 'rail');
  gun.userData.opticPlate = optionalArtworkGroup(ctx, gun, 'revolverOpticPlate', plate => {
    K.box(0.028, 0.003, 0.052, blued, 0, 0.1165, -0.018, 0, 0, 0, plate, 0.0008);
    K.box(0.024, 0.004, 0.046, blued, 0, 0.120, -0.018, 0, 0, 0, plate, 0.0006);
    for (const sx of [-1, 1]) {
      K.box(0.003, 0.004, 0.041, gunDark, sx * 0.014, 0.119, -0.018, 0, 0, 0, plate, 0.0004);
      K.cyl(0.0017, 0.0017, 0.001, gunDark, sx * 0.008, 0.1185, -0.032, plate, 8, 'y');
    }
    for (const piece of plate.children) {
      if (piece.material === blued) markPaintSurface(piece, 'rail');
    }
  });
  // The eye and the off hand resolve these names on their own copy. Both
  // action bindings use the same pivots as the original reload and shot art.
  gun.userData.triggerPin = trigger.position.toArray();
  bindModelArtwork(gun, 'controls', 'trigger', trigger);
  bindModelArtwork(gun, 'controls', 'hammer', hammer);
  bindModelArtwork(gun, 'heatParts', 'barrel', barrel);
  return finishGun(gun);
}

export function makeUziModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, gunMid, gunDark, gunAccent, gunPoly, gunRubber } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);   // GB-309 / CL-309 helpers
  const stamped = new THREE.MeshStandardMaterial({color: 0x495157, metalness: .28, roughness: .48});
  const coverSteel = new THREE.MeshStandardMaterial({color: 0x555e64, metalness: .36, roughness: .38});
  const loopSteel = new THREE.MeshStandardMaterial({color: 0x555a59, metalness: .65, roughness: .35});
  // Stamped receiver with pressed ribs; the top cover and its cocking knob.
  K.slab([[-.14, -.031], [-.132, -.04], [.211, -.04], [.22, -.032], [.22, .067], [.215, .078], [-.122, .078], [-.134, .072], [-.14, .06]], .098, stamped, {bevel: .009, segs: 3});
  for (const sx of [-1, 1]) {
    for (const y of [.014, .042]) {
      K.slab(gunBand([[.024, y], [.038, y + .001], [.186, y + .001], [.198, y]], .0036), .003, coverSteel, {x: sx * .0496, bevel: .0014, segs: 3});
      K.slab(gunBand([[-.116, y], [-.105, y + .001], [-.047, y + .001], [-.038, y]], .0036), .003, coverSteel, {x: sx * .0496, bevel: .0014, segs: 3});
    }
    K.slab([[-.116, -.035], [.077, -.035], [.081, -.017], [-.116, -.017]], .003, gunDark, {x: sx * .0494, bevel: .001});
    for (const z of [-.112, .073]) D.rivet(gun, sx * .0509, -.025, z, { axis: 'x', side: sx, r: 0.0032, mat: D.mats.dark });   // GB-309: spot welds (was floating accent cyl)
  }
  K.slab([[-.13, .074], [.2, .074], [.2, .09], [.192, .098], [-.11, .104], [-.123, .1], [-.13, .092]], .09, coverSteel, {bevel: .009, segs: 3});
  // GP-20054 (FN manual): the catch at the rear of the top cover is pushed back before the cover lifts.
  K.box(0.026, 0.008, 0.016, gunDark, 0, 0.100, -0.118, 0, 0, 0, null, 0.0015);
  for (const x of [-0.007, 0, 0.007]) K.box(0.002, 0.001, 0.011, gunAccent, x, 0.1045, -0.118, 0, 0, 0, null, 0);
  // GB-235 (Jerry: "Uzi sights need to be usable, right now the charging handle gets in the way"): the knob sits low in the
  // top cover's groove like the real one, its top at y .122, 7 mm under the line from the rear aperture to the post (.129 here); was .138.
  // GB-269 (GP-20012, docs/contracts.md): the cocking knob is its own group, gun.userData.work, at rest where it was.
  const work = K.group(0, 0.098, 0.11); work.name = 'work';
  K.cyl(0.014, 0.014, 0.03, gunDark, 0, 0, 0, work, 8, 'y');
  K.cyl(.016, .016, .014, gunDark, 0, .017, 0, work, 20, 'y');
  for (let j = 0; j < 16; j++) {const a = j / 16 * Math.PI * 2; flatDetail(THREE, work, gunAccent, .002, .011, .002, Math.cos(a) * .0157, .017, Math.sin(a) * .0157);}
  gun.userData.work = work;
  // Sights: slim ears, a rear aperture you can look through, a hooded front post.
  for (const sx of [-1, 1]) {
    K.slab([[-.096, .100], [-.096, .142], [-.088, .158], [-.072, .158], [-.064, .142], [-.064, .100]], .006, gunDark, {x: sx * .018, bevel: .0015, segs: 2});
    K.slab([[.182, .088], [.182, .136], [.190, .150], [.206, .150], [.212, .136], [.212, .088]], .006, gunDark, {x: sx * .016, bevel: .0015, segs: 2});   // GB-316 (J25): ears sit on the top cover
  }
  // GB-259 (J4: the sights unusable): the aperture was a 5 mm ring with a solid block through it, and the eye rode the ears'
  // tops, 3 cm over it. Now an 11.8 mm hole on a stem below it, the post's tip on its centre (y .126), the hood clear above.
  K.box(.006, .016, .008, gunDark, 0, .109, -.08);
  K.tor(.0075, .0016, gunAccent, 0, .126, -.08, 0, 0, 0, null, Math.PI * 2, 16);
  K.box(.004, .029, .004, gunDark, 0, .1115, .198);
  for (const sx of [-1, 1]) K.box(.004, .038, .014, gunDark, sx * .011, .118, .198);
  K.box(.026, .004, .014, gunDark, 0, .135, .198);
  K.box(0.034, 0.010, 0.032, gunDark, 0, 0.092, 0.197, 0, 0, 0, null, 0.002);   // GB-316 (J25): front-sight base on the receiver
  K.box(0.018, 0.007, 0.012, gunMid, 0, 0.100, 0.214, 0, 0, 0, null, 0.001);    // barrel catch at the front of the sight housing
  // Jerry's UZI PRO photo supplies attachment points only (J44). The short RMR rail bridges over the
  // original top cocking knob's travel, preserving the iron sight and top-knob silhouette when no optic is fitted.
  gun.userData.opticRail = optionalArtworkGroup(ctx, gun, 'uzi-optic-rail', plate => {
    for (const sx of [-1, 1]) K.box(0.008, 0.042, 0.088, gunDark, sx * 0.031, 0.119, 0.035, 0, 0, 0, plate, 0.002);
    K.rail(0.088, 0, 0.145, 0.035, plate, 0.066);
    for (const piece of plate.children) markPaintSurface(piece, 'rail');
  });
  // The stowed-weapon fitting uses this side support envelope when another
  // gun rests against the Wasp; the stock struts, pivots and butt are gone.
  K.slab([[-.150, .016], [-.118, .016], [-.114, .034], [-.124, .050], [-.148, .052], [-.156, .036]], .028, stamped, {x: .051, bevel: .005, segs: 3});   // GB-316 (J25): side pad seated on the receiver (was a floating rear blob)
  // Grip. GB-309b / GB-314 (Jerry: check and fix all pistol grips; fidelity.md line 11): a MAC-10 rectangular
  // box round its magazine — 33 mm wide x 55 deep at the game scale (builder 0.062 x 0.104), square-cornered
  // 6-8 mm bevels, front-strap serrations, flat backstrap, floorplate flush with the base. Centre line / h /
  // rake unchanged so the palm point and WEAPON_HOLD.uzi stay; mag part name unchanged.
  const UZI_GZ = -0.030, UZI_GD = 0.104, UZI_GH = 0.16, UZI_GY = -0.1, UZI_RAKE = 0.22;
  K.slab(shapedGrip(UZI_GZ, UZI_GY, UZI_GH, UZI_GD, UZI_RAKE, [
    [-0.04, 0.026], [0.12, 0.026], [0.35, 0.026], [0.58, 0.026], [0.82, 0.026], [0.98, 0.024],
    [1.02, 0.008], [1.02, -0.008], [0.98, -0.024], [0.75, -0.026], [0.45, -0.026], [0.18, -0.026],
    [-0.02, -0.026], [-0.06, -0.010], [-0.05, 0.010]
  ]), 0.062, gunPoly, { bevel: 0.007, segs: 2 });
  const gripSafety = K.box(0.040, 0.047, 0.006, gunDark, 0, -0.087, -0.065, UZI_RAKE, 0, 0, null, 0.0015);  // backstrap grip safety, proud enough to squeeze
  const strapRibs = gripRidges(K, gunDark, UZI_GZ, UZI_GY, UZI_GH, UZI_GD, UZI_RAKE, [0.42, 0.52, 0.62, 0.72, 0.82], 0.025, 0.048, 0.0028, 0.0022);   // front-strap serrations
  for (const rib of strapRibs) markPaintSurface(rib, 'furniture');
  // Flat base cap (mag floorplate reads flush with it).
  K.box(0.050, 0.003, 0.090, gunDark, 0, UZI_GY - 0.52 * UZI_GH * Math.cos(UZI_RAKE), UZI_GZ - 0.52 * UZI_GH * Math.sin(UZI_RAKE), UZI_RAKE, 0, 0, null, 0.0006);
  K.slab(gunBand([[0.088, -0.034], [0.096, -0.042], [0.100, -0.056], [0.094, -0.070], [0.078, -0.080], [0.052, -0.082], [0.030, -0.076], [0.018, -0.062], [0.016, -0.046]], 0.0075), 0.032, gunDark, { bevel: 0.005, segs: 3 });   // GB-316 (J25): smoother moulded guard
  K.slab([[0.012, -0.030], [0.036, -0.032], [0.040, -0.050], [0.024, -0.058], [0.008, -0.046]], 0.028, gunPoly, { bevel: 0.005, segs: 3 });   // guard root into the front strap
  K.box(0.068, 0.010, 0.108, gunPoly, 0, UZI_GY - 0.48 * UZI_GH * Math.cos(UZI_RAKE), UZI_GZ - 0.48 * UZI_GH * Math.sin(UZI_RAKE), UZI_RAKE, 0, 0, null, 0.003);   // GB-316 (J25): clean magwell flare at the base
  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).
  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire, moved to mid-guard.
  addTriggerArtwork(gun, K, [[0.0574, -0.0411], [0.0492, -0.0532], [0.0498, -0.0617], [0.0582, -0.0692], [0.0538, -0.0748], [0.0422, -0.0663], [0.0388, -0.0508], [0.0466, -0.0349]], 0.011, gunAccent, { bevel: 0.002 });
  // Side panels: flat faces on the rectangular grip (something on every face).
  for (const sx of [-1, 1]) {
    const panel = shapedGrip(UZI_GZ, UZI_GY, UZI_GH, UZI_GD, UZI_RAKE, [[0.18, 0.014], [0.50, 0.014], [0.82, 0.012], [0.86, -0.012], [0.50, -0.014], [0.18, -0.012]]);
    K.slab(panel, 0.0016, gunPoly, { x: sx * 0.0315, bevel: 0.0006 });
  }
  // FN manual: the thumb-operated magazine catch is at the left heel of the grip.
  const releasePaddle = K.box(0.0045, 0.014, 0.022, gunDark, -0.0335, -0.159, -0.068, 0, 0, 0, null, 0.001);   // paddle
  const release = D.screw(gun, -0.03575, -0.159, -0.068, { axis: 'x', side: -1, r: 0.0036, head: 0.00155, kind: 'button', mat: D.mats.bright });
  const selector = D.screw(gun, -0.0494, 0.033, 0.006, { axis: 'x', side: -1, r: 0.0085, head: 0.0022, kind: 'slot', mat: D.mats.dark });   // GB-309: selector dial (attached)
  const selectorLever = K.slab([[-.001, .027], [.026, .025], [.026, .031], [.009, .038], [.004, .044]], .003, gunDark, {x: -.0523, bevel: .001});
  for (const z of [-0.018, 0.006, 0.030]) K.box(0.0015, 0.004, 0.005, gunAccent, -0.04975, 0.055, z, 0, 0, 0, null, 0); // S / R / A marks pressed into the left receiver face
  // The narrow magazine passes through the grip. Bake its rake into the inner
  // assembly: reload animates the outer group back to zero at insertion.
  const mag = K.group(0, -0.205, -0.0435);
  const stick = new THREE.Group(); stick.rotation.x = 0.22; mag.add(stick);
  K.slab([[-0.022, 0.107], [0.022, 0.107], [0.022, -0.109], [-0.022, -0.109]], 0.036, gunAccent, { bevel: 0.003, parent: stick });
  for (const sx of [-1, 1]) K.box(0.003, 0.18, 0.006, gunDark, sx * 0.0185, 0, 0, 0, 0, 0, stick);
  K.slab([[-0.026, -0.106], [0.026, -0.106], [0.026, -0.119], [-0.026, -0.119]], 0.042, gunDark, { bevel: 0.003, parent: stick });
  // The dark floor is visible between the two lips when this magazine is empty.
  K.box(.026, .002, .042, gunDark, 0, .108, 0, 0, 0, 0, stick, 0);
  for (const side of [-1, 1]) {
    K.slab([[-.021,.107],[-.019,.115],[-.014,.119],[.009,.117],[.019,.112],[.021,.107]],
      .004, gunDark, {x:side*.015, bevel:.0008, parent:stick});
  }
  const liveArt = roundGeometry(THREE, 'uzi');
  liveArt.computeBoundingBox();
  const topRound = new THREE.Mesh(liveArt, new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, metalness: .55, roughness: .33
  }));
  const artScale = .660 / .47;   // Wasp builder units per game metre
  topRound.name = 'magazine top round';
  topRound.scale.setScalar(artScale);
  topRound.rotation.x = Math.PI / 2;
  topRound.position.y = .109 + liveArt.boundingBox.max.z * artScale;
  topRound.visible = false;
  stick.add(topRound);
  gun.userData.magazineTopRound = topRound;
  gun.userData.setMagazineRounds = function (count) {
    // The HUD calls this detached on the main gun. A paired magazine can be
    // addressed through its own rebound userData without touching its twin.
    const mesh = this?.magazineTopRound || topRound;
    mesh.visible = Number.isFinite(count) && count > 0;
  };
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Front of the receiver, the knurled barrel nut, the threaded barrel.
  K.slab([[.18, -.002], [.187, -.013], [.319, -.016], [.334, -.009], [.34, .001], [.34, .058], [.331, .067], [.185, .07], [.18, .061]], .08, gunPoly, {bevel: .016, segs: 4});
  for (let j = 0; j < 12; j++) {
    const z = .19 + j * .012;
    const rib = K.slab([[z, -.007], [z + .003, -.007], [z + .003, .061], [z, .061]], .0808, gunDark, {bevel: .0015, segs: 2});
    markPaintSurface(rib, 'furniture');
  }
  for (const sx of [-1, 1]) for (const z of [.198, .324]) K.cyl(.0038, .0038, .0016, gunDark, sx * .0407, .002, z, null, 12, 'x');
  K.lathe([[0, 0.325], [0.035, 0.325], [0.035, 0.355], [0, 0.355]], gunDark, { y: 0.03, seg: 16 });
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; flatDetail(THREE, gun, gunAccent, .0025, .0025, .027, Math.cos(a) * .0358, .03 + Math.sin(a) * .0358, .34, a); }
  const barrel = K.lathe([[0, 0.34], [0.017, 0.34], [0.017, 0.455], [0.02, 0.458], [0.02, 0.475], [0.012, 0.478], [0, 0.478]], gunAccent, { y: 0.03, seg: 12 });
  const threads = [[.0194, .4585]];
  for (let i = 0; i < 5; i++) {const z = .459 + i * .0034; threads.push([.02055, z], [.02055, z + .001], [.0194, z + .0017]);}
  K.lathe(threads, gunDark, {y: .03, seg: 16});
  K.disc(.0095, gunRubber, 0, .03, .4779999852, 0, null, 16);
  // --- GB-309 fidelity (D-121 / docs/fps/fidelity.md Wasp list) ---
  // Extra stamped receiver ribs (horizontal) + spot welds along the seam (yardstick).
  for (const sx of [-1, 1]) {
    D.ribs(gun, { x: sx * 0.049, y: 0.028, z: 0.10, axis: 'x', side: sx, along: 'z', count: 7, pitch: 0.014, w: 0.012, h: 0.0018, t: 0.0022, mat: D.mats.dark });
    D.ribs(gun, { x: sx * 0.049, y: 0.028, z: -0.075, axis: 'x', side: sx, along: 'z', count: 5, pitch: 0.014, w: 0.012, h: 0.0018, t: 0.0022, mat: D.mats.dark });
    for (const [y, z] of [[0.014, -0.113], [0.014, 0.195], [0.042, -0.113], [0.042, 0.195], [0.060, -0.05], [0.060, 0.12]]) {
      // The high pair sits on the bare side. The other four sit on the pressed strips.
      const surfaceX = y === 0.060 ? 0.049 : 0.0511;
      D.rivet(gun, sx * surfaceX, y, z, { axis: 'x', side: sx, r: 0.0026, mat: D.mats.dark });
    }
  }
  // Top cocking knob slot between the sight ears (yardstick); the work knob rides in this groove.
  D.groove(gun, { x: 0, y: 0.098, z: 0.04, axis: 'y', side: 1, along: 'z', len: 0.28, w: 0.016 });
  K.box(0.024, 0.010, 0.26, gunDark, 0, 0.090, 0.04, 0, 0, 0, null, 0.0006);   // GB-316 (J25): deeper top cocking slot / chamber
  K.box(0.016, 0.006, 0.10, gunMid, 0, 0.093, 0.06, 0, 0, 0, null, 0.0004);   // bolt body visible in the slot
  gun.userData.ejectPort = [0.052, 0.030, 0.085];
  K.box(0.004, 0.030, 0.058, gunDark, 0.0492, 0.030, 0.085, 0, 0, 0, null, 0.0008);   // GB-316 (J25): right ejection port
  K.box(0.002, 0.024, 0.050, gunRubber, 0.0506, 0.030, 0.085, 0, 0, 0, null, 0.0004);   // port interior
  fitPortCarrier(gun, K, {x: 0.0517, y: 0.030, rear: 0.061, front: 0.109, height: 0.021}, gunMid, gunAccent);
  // Strap / sling loop at the rear of the receiver (yardstick).
  K.tor(0.010, 0.0022, loopSteel, 0, 0.022, -0.145, Math.PI / 2, 0, 0, null, Math.PI * 2, 14);   // GB-316 (J25): loop on the rear face
  K.box(0.018, 0.010, 0.008, gunMid, 0, 0.022, -0.136, 0, 0, 0, null, 0.001);   // loop mount seated on the butt
  // Lower receiver seam line both sides (yardstick: the lower's seam).
  for (const sx of [-1, 1]) D.groove(gun, { x: sx * 0.0492, y: -0.017, z: 0.04, axis: 'x', side: sx, along: 'z', len: 0.30, w: 0.0009 });
  // Threaded muzzle thread protector (distinct collar over the existing threads; bore disc stays).
  K.cyl(0.0155, 0.0155, 0.014, gunDark, 0, 0.03, 0.468, null, 16);
  K.cyl(0.0135, 0.0135, 0.006, gunMid, 0, 0.03, 0.476, null, 14);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; flatDetail(THREE, gun, gunAccent, .0022, .0022, .012, Math.cos(a) * .0158, .03 + Math.sin(a) * .0158, .468, a); }
  // Front sight post kept (GB-259); knob stays gun.userData.work (GB-269 / card).
  gunEffects(gun, new THREE.Vector3(0, 0.03, 0.48), 0.05, 2.8, 7, 0.005);
  gun.userData.laser.position.set(0, 0.03, 4.0);
  gun.userData.laserBaseZ = 0.45;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'uzi');   // CL-95
  // The Micro UZI's can seats at the barrel nut rather than at the exposed muzzle threads.
  // Stretch it forward around the existing barrel: its front remains at the established suppressed muzzle.
  if (gun.userData.suppressor) {
    gun.userData.suppressor.position.z = 0.34;
    gun.userData.suppressor.scale.z = 1.8;
  }
  attachLaserLight(gun, 'uzi', ctx);
  // The lower Picatinny strip belongs to the purchased combined laser/light, so the bare Wasp retains J44's outline.
  // Its top just meets the lowest edge of the stationary fore-end.
  const light = gun.userData.laserLightUnit, firstRailPiece = light.children.length;
  K.rail(0.11, 0, 0.02075, 0.04, light, 0.030, 2);
  for (const piece of light.children.slice(firstRailPiece)) markPaintSurface(piece, 'rail');
  for (const name of ['moduleShell','railClamp']) markPaintSurface(light.getObjectByName(name), 'light shell');
  for (const piece of gun.userData.suppressor?.children.slice(0,-2) || []) markPaintSurface(piece, 'suppressor shell');
  gun.userData.partFinish = true;
  gun.traverse(piece => {
    if (!piece.isMesh || piece.parent === light) return;
    if (piece.material === stamped || piece.material === coverSteel) markPaintSurface(piece, 'receiver');
    else if (piece.material === gunPoly) markPaintSurface(piece, 'furniture');
  });
  // Keep the existing cap and lever together on each copy. Both groups are
  // direct children of the gun, so these offsets preserve every rest surface.
  for (const [pivot, part] of [[release, releasePaddle], [selector, selectorLever]]) {
    part.position.sub(pivot.position);
    pivot.add(part);
  }
  bindModelArtwork(gun, 'controls', 'magRelease', release);
  bindModelArtwork(gun, 'controls', 'selector', selector);
  bindModelArtwork(gun, 'controls', 'safety', gripSafety);
  bindModelArtwork(gun, 'controls', 'chargingHandle', work);
  bindModelArtwork(gun, 'heatParts', 'barrel', barrel);
  bindModelArtwork(gun, 'heatParts', 'suppressor', gun.userData.suppressor);
  return finishGun(gun);
}

export function makeKnifeModel(ctx) {
  const { THREE, gunKit, mergeRigidMeshes, gunDark, gunPoly, gunRubber, gunAccent, bladeMat, edgeMat, brassMat } = ctx;
  const g = new THREE.Group();
  const kn = new THREE.Group();
  g.add(kn);
  const K = gunKit(kn);
  const D = gunDetail(ctx);   // GB-310 / CL-309 helpers
  // Combat knife: a pommel and a ridged grip, a crossguard, a clip-point blade with its fuller and edge.
  K.lathe([[0, -.142], [.024, -.142], [.028, -.138], [.031, -.13], [.031, -.121], [.028, -.116], [0, -.116]], gunDark, {parent: kn, seg: 20});
  const ridges = [[0, -0.116], [0.026, -0.116]];
  for (let i = 0; i < 6; i++) { const z = -.104 + i * .02; ridges.push([.026, z - .008], [.028, z - .0055], [.029, z - .003], [.029, z + .003], [.028, z + .0055], [.026, z + .008]); }
  ridges.push([0.027, 0.01], [0, 0.01]);
  K.lathe(ridges, gunPoly, {parent: kn, seg: 20});
  K.lathe([[0, .01], [.027, .01], [.028, .013], [.028, .020], [0, .020]], gunDark, {parent: kn, seg: 20});
  K.slab([[.02, .049], [.023, .056], [.037, .054], [.044, .05], [.044, -.05], [.037, -.054], [.023, -.056], [.02, -.049]], .03, gunDark, {rz: Math.PI / 2, bevel: .006, segs: 3, parent: kn});
  groundBlade(THREE, kn, bladeMat, edgeMat, [[.044, .03, -.042, 0], [.06, .03, -.042, 0], [.076, .03, -.042, 1], [.22, .03, -.042, 1], [.245, .03, -.042, 0], [.26, .022, -.042, 0], [.28, .012, -.042, 0], [.3, .006, -.042, 0], [.32, .003, -.04, 0], [.34, .001, -.034, 0], [.36, -.001, -.024, 0], [.375, -.003, -.013, 0], [.39, -.005, -.005, 0]], {rotate: Math.PI / 2, fuller: .0045, half: .0052, edgeWidth: .0135});   // GB-180 pass 7: a real concave KA-BAR clip and an edge that stays straight, then sweeps up
  // The only marking on the blade is the small skull beside the guard.
  const skull = [[.049, -.003], [.049, .003], [.052, .003], [.053, .005], [.057, .006], [.061, .004], [.062, .001], [.061, -.004], [.057, -.006], [.053, -.005], [.052, -.003]];
  for (const side of [-1, 1]) {
    K.slab(skull, .0003, gunDark, {y: side * .0055, rz: Math.PI / 2, bevel: .0001, parent: kn});
    for (const x of [-.0022, .0022]) {const eye = K.disc(.00125, bladeMat, x, side * .00575, .057, 0, kn, 8); eye.rotation.x = -side * Math.PI / 2;}
    for (const x of [-.0015, .0015]) K.box(.00065, .0003, .0016, bladeMat, x, side * .00575, .0498, 0, 0, 0, kn);
  }
  // --- GB-310 fidelity (D-121 / docs/fps/fidelity.md knife list) ---
  // Only the pin ends show on the two flat guard faces.
  for (const side of [-1, 1]) for (const x of [-0.018, 0.018])
    K.cyl(0.0018, 0.0018, 0.0008, D.mats.steel, x, side * 0.0154, 0.032, kn, 10, 'y');
  // Pommel butt-cap nut (yardstick: pommel).
  K.cyl(0.0075, 0.0075, 0.0032, D.mats.dark, 0, 0, -0.1436, kn, 14);
  K.box(0.011, 0.0022, 0.0002, D.mats.steel, 0, 0, -0.1453, 0, 0, 0, kn);
  // Fuller accent grooves on both faces (yardstick: fuller reads at hip).
  D.groove(kn, { x: 0.0, y: 0.0054, z: 0.18, axis: 'y', side: 1, along: 'z', len: 0.18, w: 0.0010 });
  D.groove(kn, { x: 0.0, y: -0.0054, z: 0.18, axis: 'y', side: -1, along: 'z', len: 0.18, w: 0.0010 });
  // Ricasso panel lines beside the guard (no flat slab).
  D.groove(kn, { x: 0.0, y: 0.0052, z: 0.058, axis: 'y', side: 1, along: 'z', len: 0.022, w: 0.0008 });
  D.groove(kn, { x: 0.0, y: -0.0052, z: 0.058, axis: 'y', side: -1, along: 'z', len: 0.022, w: 0.0008 });
  // Choil notch at the edge near the guard (clip-point knife detail).
  K.box(0.0045, 0.011, 0.012, gunDark, -0.038, 0, 0.050, 0, 0, 0, kn, 0.001);
  // Ridged grip kept via the lathe ridges above (torus accents dropped to stay under 4 k tris).
  // Quillon tip rivets on the crossguard ends.
  for (const x of [-0.044, 0.044]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 5, 0, 2 * Math.PI, 0, Math.PI / 2), D.mats.dark);
    cap.position.set(x, 0.015, 0.032); cap.castShadow = cap.receiveShadow = true; kn.add(cap);
  }
  // Machete: long, wide, slightly swept blade with a black polymer grip and
  // a flared tip — reads as a different tool at a glance.
  const mc = new THREE.Group();
  mc.visible = false;
  g.add(mc);
  const M = gunKit(mc);
  M.slab([[-.152, .024], [-.13, .026], [-.04, .024], [.011, .026], [.02, .018], [.02, -.024], [.01, -.03], [-.03, -.034], [-.08, -.031], [-.11, -.032], [-.138, -.039], [-.148, -.04], [-.157, -.032], [-.16, -.022]], .032, gunPoly, {bevel: .01, segs: 4, parent: mc});
  const handlePanel = [[-.139, .014], [.005, .015], [.006, -.021], [-.028, -.024], [-.089, -.022], [-.141, -.029]];
  const pinZs=[-.11,-.07,-.03], ribZs=[-.104,-.082,-.06,-.038,-.016];
  const exposed=(z,y)=>Math.abs(y-.012)>.0017 &&
    !pinZs.some(pin=>Math.hypot(z-pin,y)<.0055) &&
    !(Math.abs(y)<.0102 && ribZs.some(rib=>Math.abs(z-rib)<.0022));
  for (const side of [-1,1]) {
    M.slab(handlePanel,.0015,gunRubber,{x:side*.01675,bevel:.0006,parent:mc});
    checkeredPanel(THREE,mc,gunDark,handlePanel,side*.01758,.005,.0012,exposed);
    for (const z of pinZs) D.pin(mc,side*.01795,0,z,{axis:'x',len:.0009,proud:0,r:.0042,mat:D.mats.brass});
    D.groove(mc,{x:side*.0175,y:.012,z:-.066,axis:'x',side,along:'z',len:.13,w:.0009});
    for (const z of ribZs) M.box(.0009,.018,.002,D.mats.dark,side*.01795,0,z,0,0,0,mc);
  }
  M.box(0.05, 0.075, 0.02, gunDark, 0, 0, 0.03, 0, 0, 0, mc, 0.006);
  groundBlade(THREE, mc, gunAccent, edgeMat, [[.040, .031, -.031, 0], [.08, .0307, -.0346, 0], [.1, .0306, -.038, 1], [.44, .0283, -.08, 1], [.48, .028, -.086, 0], [.5, .026, -.088, 0], [.56, .02, -.078, 0], [.6, .012, -.062, 0], [.63, .004, -.04, 0], [.655, -.004, -.018, 0], [.67, -.008, -.008, 0]], {fuller: .019, edgeWidth: .012});   // GB-180 pass 7: a swept point, not a squared end
  // --- GB-310 fidelity (D-121 / docs/fps/fidelity.md machete list) ---

  // Bolster face screws on the guard plate (pins already attached above).
  for(const side of [-1,1]) {
    M.cyl(.003,.003,.0016,D.mats.dark,side*.0258,0,.03,mc,14,'x');
    M.box(.00015,.0045,.0009,D.mats.steel,side*.026675,0,.03,0,0,0,mc);
  }
  // Hang hole / butt ring at the grip rear (common machete detail).
  M.tor(0.010, 0.0020, gunDark, 0, -.018, -.1714, Math.PI / 2, 0, 0, mc, Math.PI * 2, 14);
  // Fuller accent on the wide blade (reads at hip; groundBlade fuller kept).
  D.groove(mc, { x: 0.0045, y: 0.0, z: 0.28, axis: 'x', side: 1, along: 'z', len: 0.28, w: 0.0012 });
  D.groove(mc, { x: -0.0045, y: 0.0, z: 0.28, axis: 'x', side: -1, along: 'z', len: 0.28, w: 0.0012 });
  // Teeth (GB-235) kept below; spine stays plain.
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
