// GP-164: reference-led long-arm cosmetics. Moving-part roots and gameplay anchors stay unchanged.
// Context owns materials and finishing, so customization and rigid batching remain shared.

// A thin, faceted sleeve with actual through-slots. Each cut has an inner wall;
// the bore and background show through at every viewing angle. No CSG or new mats.
import { slab } from '../core/geometry.js';
import { gunDetail } from './gun-detail.js';
import { attachLaserLight } from './weapon-attachments.js';
import { fitPortCarrier, roundGeometry } from './weapon-casings.js';
import { birchTexture, mapBirchSlab, markPaintSurface } from './weapon-finish.js';
import { addTriggerArtwork, bindModelArtwork, groupArtwork, optionalArtworkGroup } from './weapon-model-hooks.js';

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
// CL-312 b (Jerry, 7 Nov: "check and fix all pistol grips"): ridges across a grip's strap. Each is a bar the grip's
// width (w) at the grip's (u, v), lying along the strap (its thickness t stands half proud of the strap's face),
// turned with the grip's rake so it follows the strap. v > 0 is the front strap.
function gripRidges(K, mat, cz, cy, h, d, rake, us, v, w, t = 0.003, along = 0.0025) {
  const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return us.map((u) => {
    const uu = (u - 0.5) * h, vv = v * k;
    return K.box(w, along, t, mat, 0, cy - uu * cr - vv * sr, cz - uu * sr + vv * cr, rake, 0, 0, null, 0.0008);
  });
}

const gw4Finishes = new WeakMap();
function gw4Finish(base) {
  if (!gw4Finishes.has(base)) {
    const surface = (color, roughness, metalness) => {
      const mat = base.clone();
      mat.color.setHex(color);
      mat.roughness = roughness;
      mat.metalness = metalness;
      return mat;
    };
    gw4Finishes.set(base, {
      upper: surface(0x404247, 0.44, 0.50),
      lower: surface(0x303236, 0.53, 0.36),
      furniture: surface(0x37383a, 0.83, 0.02),
      tube: surface(0x505255, 0.41, 0.54),
      panel: Object.assign(surface(0x747e85, 0.52, 0.40), { flatShading: true }),
      rib: surface(0x454649, 0.71, 0.06),
      seam: surface(0x2f3539, 0.61, 0.28),
      magazine: surface(0x303133, 0.78, 0.04)
    });
  }
  return gw4Finishes.get(base);
}

// The nested outlines give the window a lip that catches side light and a shaded inner wall.
function gw4Window(T, gun, K, x, finish, dark) {
  const outline = (length, height, rearCorner = .006) => {
    const bottom = -(.65 * height + .0022), topCorner = rearCorner + .002;
    return [[-length + rearCorner, bottom], [length - .003, bottom], [length, bottom + .003],
      [length, height - .004], [length - .004, height], [-length + topCorner, height],
      [-length, height - topCorner], [-length, bottom + rearCorner]];
  };
  const floor = outline(.045, .0145, .0015);
  const rings = [
    [0, outline(.050, .020)], [.0038, outline(.050, .020)],
    [.0065, outline(.0485, .0186, .004)], [.0065, outline(.0466, .0169, .0025)],
    [.00287, floor], [0, floor]
  ];
  const positions = [], uv = [];
  for (let r = 0; r < rings.length; r++) {
    const a = rings[r], b = rings[(r + 1) % rings.length];
    for (let i = 0; i < a[1].length; i++) {
      const j = (i + 1) % a[1].length;
      for (const [ring, corner] of [[a,i],[b,i],[b,j],[a,i],[b,j],[a,j]]) {
        const [z, y] = ring[1][corner];
        positions.push(ring[0], y, z);
        uv.push(z + .05, y + .02);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  const rim = new T.Mesh(geometry, finish.lower);
  rim.name = 'GW-4 window rim';
  rim.castShadow = rim.receiveShadow = true;
  rim.position.set(x, .029, .059);
  gun.add(rim);
  K.slab(floor, .00287, dark, {x:x + .00287 / 2, y:.029, z:.059, bevel:0}).name = 'GW-4 window inset';

  fitPortCarrier(gun, K, {x:x + .0042, y:.029, rear:.017, front:.089, height:.020}, finish.tube, finish.panel);
  // A gently crowned face gives the moving artwork a gradient even at rest.
  for (const part of gun.userData.recoilBoltParts) {
    part.geometry.computeBoundingBox();
    const bounds = part.geometry.boundingBox;
    const profile = [[-.00133, -.010], [-.00065, -.010], [.00055, -.006],
      [.0011, -.001], [.00085, .0035], [-.0001, .008], [-.00105, .010], [-.00133, .010]];
    part.geometry = slab(profile, bounds.max.z - bounds.min.z, .00012, 1).rotateY(Math.PI / 2);
  }
}

export function makeM4Model(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, gunMetal, magPoly, glassMat, sightDotMat, gaugeFace } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  // CL-310 (D-121, the fidelity upgrade; AG-229 measured ours against m4_sopmod): an M4 at an M4's widths. Builder's units
  // (x 0.674 to metres): the upper receiver 30 mm wide, the lower's mag well 32, the rail 21, the free-float handguard
  // 40 across the flats, the buffer tube 30, the stock 39, the magazine 24, the grip 32 (CL-312 b). The bore stays at
  // y 0.02, the holographic sight's dot at (0, 0.134, 0.0455), the grip's centre line, the mag well and the stock's
  // length where they were: the hold and the sight line do not move. The real right's controls (the ejection port, its
  // cover and the brass deflector, the forward assist, the mag release button) are on +x, which the mirrored
  // first-person view shows on the right (CL-306 k, docs/fps/fidelity.md); the selector, the bolt catch and the
  // charging handle's latch on -x. The length (1.04 m at the game's scale) is kept for the hold's and view's tuning.
  const UW = 0.0445, LW = 0.0475;
  const finish = gw4Finish(gunBody);
  const paintedRail = (...args) => {
    const first = gun.children.length;
    K.rail(...args);
    for (const mesh of gun.children.slice(first)) markPaintSurface(mesh, 'rail');
  };
  // Upper receiver: the flat-top with its rail, the port's bulge on +x with the ejection port, its spring-loaded cover
  // door, the brass deflector and the forward assist behind it; the seam to the lower at y 0.
  K.slab([[-0.18, -0.006], [0.2, -0.006], [0.2, 0.07], [0.192, 0.078], [-0.168, 0.078], [-0.18, 0.066]], UW, finish.upper, { bevel: 0.005, segs: 2 });
  paintedRail(0.36, 0, 0.085, 0.01, null, 0.031);
  gun.userData.opticPlate = optionalArtworkGroup(ctx, gun, 'flat-top optic adapter', plate => {
    K.box(0.034, 0.011, 0.070, gunDark, 0, 0.1015, 0.005, 0, 0, 0, plate, 0.001);
    for (const piece of plate.children) markPaintSurface(piece, 'optic shell');
  });
  gun.userData.ejectPort = [UW / 2 + 0.008, 0.029, 0.062];
  const windowPanel = K.slab([[-0.11, 0.0], [0.16, 0.0], [0.16, 0.058], [-0.06, 0.058], [-0.11, 0.04]], 0.012, finish.upper, { x: UW / 2, bevel: 0.004 });
  trimPanelBack(THREE, windowPanel, 1, UW / 2);
  gw4Window(THREE, gun, K, UW / 2 + .006, finish, gunRubber);
  K.slab([[0.014, -0.022], [0.104, -0.022], [0.104, 0.011], [0.014, 0.011]], 0.004, finish.seam, { x: LW / 2 + 0.005, bevel: 0.0015 });   // the port cover, open: hinged under the port, hanging down the lower's side
  D.pin(gun, LW / 2 + 0.004, 0.012, 0.0604, { axis: 'z', len: 0.094, r: 0.0016 });                                                     // its hinge pin along the port's bottom edge
  K.slab([[-0.062, 0.018], [-0.026, 0.018], [-0.018, 0.06], [-0.062, 0.066]], 0.02, finish.upper, { x: UW / 2 + 0.006, bevel: 0.004 });   // the brass deflector
  K.lathe([[0, -0.125], [0.011, -0.125], [0.011, -0.088], [0.0085, -0.082], [0.0085, -0.06], [0, -0.06]], finish.tube, { x: UW / 2 + 0.014, y: 0.046, seg: 10 });   // the forward assist
  D.ribs(gun, { x: UW / 2 + 0.014, y: 0.046, z: -0.114, axis: 'y', side: 1, along: 'z', count: 4, pitch: 0.004, w: 0.012, h: 0.001, t: 0.0014, mat: gunMid });   // its button's grooves
  // Charging handle: the T out the back with its latch on -x. GB-269: its own group, gun.userData.work, at rest where it was.
  const work = K.group(0, 0.068, -0.195); work.name = 'work';
  K.box(0.04, 0.011, 0.028, finish.tube, 0, 0, -0.006, 0, 0, 0, work, 0.002);                   // the T
  K.box(0.014, 0.009, 0.05, gunDark, 0, 0.0, 0.03, 0, 0, 0, work, 0.0015);                   // the shaft into the receiver
  K.box(0.008, 0.009, 0.022, finish.tube, -0.023, 0.0, -0.003, 0, 0, 0, work, 0.0025);            // the latch, on the real left
  D.ribs(work, { x: 0, y: 0.0055, z: -0.006, axis: 'y', side: 1, along: 'z', count: 3, pitch: 0.005, w: 0.036, h: 0.001, t: 0.0014, mat: gunMid });
  gun.userData.work = work;
  // Keep the scalloped trim seated on the tube and below the travelling artwork.
  const rearFace = K.slab([[-.024,.061],[-.019,.057],[.018,.057],[.024,.061],[.022,.069],
    [.016,.072],[.010,.072],[.006,.069],[-.006,.069],[-.012,.073],[-.021,.071]],
    .018, finish.seam, { bevel:.0016, segs:2, ry:Math.PI/2, z:-.205 });
  rearFace.name = 'GW-4 rear face';
  rearFace.scale.y = 1 / 3;
  rearFace.position.y = .057 * (1 - rearFace.scale.y);
  K.slab([[-0.165, 0.092], [-0.115, 0.092], [-0.12, 0.108], [-0.16, 0.108]], 0.03, gunDark, { bevel: 0.003 });          // the folded rear sight
  // Lower receiver: the trigger housing, the flared mag well, the two pins through, the selector and bolt catch on -x,
  // the mag release button in its fence on +x, the trigger guard, the A2 grip (CL-312 b).
  K.slab([[-0.172, -0.006], [0.13, -0.006], [0.13, -0.028], [0.118, -0.042], [0.117, -0.112], [0.132, -0.13], [-0.016, -0.13], [-0.004, -0.112],
          [-0.006, -0.064], [-0.03, -0.058], [-0.1, -0.058], [-0.16, -0.05], [-0.172, -0.03]], LW, finish.lower, { bevel: 0.005, segs: 2 });
  for (const sx of [-1, 1]) D.groove(gun, { x: sx * LW / 2, y: -0.03, z: 0.0, axis: 'x', side: sx, along: 'z', len: 0.1, w: 0.0008 });   // the housing's machined step
  for (const z of [-0.15, 0.115]) D.pin(gun, 0, -0.012, z, { axis: 'x', len: LW, r: 0.0045, proud: 0.0015, caps: true, mat: z < 0 ? finish.panel : gunMetal });                          // the takedown and pivot pins
  const selector = K.slab(gunBand([[-0.11, -0.012], [-0.08, -0.03]], 0.004), 0.004, gunDark, { x: -LW / 2 - 0.001, bevel: 0.001 });                    // the selector lever
  const selectorCap = K.cyl(0.0075, 0.0075, 0.004, gunDark, -LW / 2 - 0.001, -0.012, -0.11, null, 10, 'x');                                                // its axle's boss
  // The raised centre mark sits on the narrower upper panel above the seam.
  for (const [y, z, x] of [[.002,-.126,-LW/2+.0012],[.005,-.11,-UW/2],[.002,-.094,-LW/2+.0012]]) {
    D.screw(gun, x, y, z, { axis:'x', side:-1, r:.0015, kind:'button', mat:gunMid });
  }
  const catchPlate = K.slab([[0.09, -0.016], [0.118, -0.016], [0.118, -0.046], [0.09, -0.046]], 0.006, gunDark, { x: -LW / 2 - 0.002, bevel: 0.002 });   // the bolt catch paddle (the work point, the reload's slap)
  K.tor(0.009, 0.0025, gunBody, LW / 2 + 0.0015, -0.03, 0.09, 0, Math.PI / 2, 0, null, Math.PI * 2, 12);                            // the mag release's fence
  const release = K.cyl(0.006, 0.006, 0.006, gunDark, LW / 2 + 0.003, -0.03, 0.09, null, 10, 'x');                                                    // the button
  K.box(0.006, 0.006, 0.012, gunDark, LW / 2 + 0.001, -0.07, 0.03, 0, 0, 0, null, 0.001);                                            // the pivot pin's detent plate
  // CL-318 (J26: "trigger and trigger guard look too shallow and vertically narrow; pistol grip needs to slide back opening
  // up more space"): the trigger 18 units behind where it was (15 mm behind the well's rear face), the guard a real loop
  // from the well's rear to the grip's front, 4 cm deep, and the grip 4 units back on its mount boss.
  const gloveGuard = K.slab(gunBand([[-0.008, -0.062], [-0.014, -0.1], [-0.03, -0.108], [-0.066, -0.108], [-0.082, -0.096], [-0.08, -0.07]], 0.008), 0.03, gunDark, { bevel: 0.003 });
  // Give the oversized game glove room in the drawn loop; keep its upper attachment fixed.
  {
    const geometry = gloveGuard.geometry, vertices = geometry.attributes.position;
    geometry.computeBoundingBox();
    const {min, max} = geometry.boundingBox, height = max.y - min.y;
    const smooth = THREE.MathUtils.smoothstep;
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i), z = vertices.getZ(i), depth = (max.y - y) / height;
      vertices.setY(i, y - height * .12 * smooth(depth, .34, .80));
      const front = (z - min.z) / (max.z - min.z);
      vertices.setZ(i, z + .008 * smooth(front, .54, .81) * smooth(depth, .09, .44));
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }   // the trigger guard
  addTriggerArtwork(gun, K, [[-0.0283, -0.0525], [-0.0367, -0.0689], [-0.0359, -0.0843], [-0.0272, -0.0957], [-0.0328, -0.1003], [-0.0441, -0.0877], [-0.0473, -0.0671], [-0.0397, -0.0475]], 0.012, gunDark, { bevel: 0.002 });   // GB-175/180: the trigger
  const collarOutline = shapedGrip(-0.12, -0.12, 0.18, 0.08, 0.3, [[-0.12, 0.04], [0.04, 0.04], [0.04, -0.046], [-0.12, -0.046]]);
  const collar = K.slab(collarOutline, 0.048, finish.lower, { bevel: 0.006, segs: 2 });
  fitCollarFaces(THREE, collar, LW / 2);
  // CL-312 b (Jerry: "check and fix all pistol grips"): an A2 grip at an A2's size (32 mm wide, 53 mm deep under the
  // beavertail, 46 at the palm): the finger nub on the front strap and the four ridges under it, the backstrap's swell,
  // a flat base with its trapdoor and screw. The centre line, h and rake are as before, so the palm point stays.
  // CL-318: the grip's centre line 4 units back (cz -0.12, was -0.08): the palm point with it (VM_SOCKETS.m4 grip,
  // WEAPON_HOLD.m4 grip and trig: z -0.116, -0.029).
  K.slab(shapedGrip(-0.12, -0.12, 0.18, 0.08, 0.3, [
    [-0.06, 0.038], [0.08, 0.034], [0.22, 0.028], [0.32, 0.027], [0.39, 0.035], [0.46, 0.027], [0.6, 0.024], [0.8, 0.025], [0.96, 0.027],
    [1.03, 0.012], [1.03, -0.022], [0.98, -0.038], [0.8, -0.04], [0.55, -0.04], [0.3, -0.037], [0.1, -0.036], [-0.03, -0.044], [-0.08, -0.02]
  ]), 0.047, finish.furniture, { bevel: 0.011, segs: 3 });
  gripRidges(K, finish.furniture, -0.12, -0.12, 0.18, 0.08, 0.3, [0.56, 0.64, 0.72, 0.8], 0.0245, 0.03);   // the front strap's ridges
  K.box(0.024, 0.003, 0.03, gunDark, 0, -0.12 - 0.53 * 0.18 * Math.cos(0.3), -0.12 - 0.53 * 0.18 * Math.sin(0.3) - 0.004, 0.3, 0, 0, null, 0.0008);   // the base's trapdoor
  D.screw(gun, 0, -0.12 - 0.535 * 0.18 * Math.cos(0.3), -0.12 - 0.535 * 0.18 * Math.sin(0.3) + 0.012, { axis: 'y', side: -1, r: 0.0035, kind: 'hex' });   // the grip screw
  // Buffer tube with its castle nut and end plate, the four-position M4 stock: the cheek tube over the buffer, the open web,
  // the butt with its rubber pad and sling slot, the release lever, the QD socket. GB-269: all one group, fpStock.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  K.lathe([[0, -0.505], [0.019, -0.505], [0.022, -0.5], [0.022, -0.19], [0.026, -0.188], [0.026, -0.168], [0, -0.168]], finish.tube, { y: 0.035, seg: 12 }).name = 'GW-4 tube';
  K.lathe([[0, -0.19], [0.03, -0.19], [0.03, -0.178], [0, -0.178]], finish.seam, { y: 0.035, seg: 8, phase: Math.PI / 8 }).name = 'GW-4 rear collar';   // the castle nut
  D.vents(stock, { x: 0, y: 0.065, z: -0.184, axis: 'y', side: 1, along: 'x', count: 1, w: 0.004, len: 0.005, deep: 0.003 });   // its top notch
  K.box(0.062, 0.062, 0.004, gunDark, 0, 0.03, -0.172, 0, 0, 0, null, 0.002).name = 'GW-4 rear end plate';                                                 // the end plate
  for (const z of [-0.22, -0.27, -0.32, -0.38]) D.vents(stock, { x: 0, y: 0.013, z, axis: 'y', side: -1, along: 'z', count: 1, w: 0.006, len: 0.012, deep: 0.002 });   // closed, half, three-quarter and open stops
  // The cheek piece and fixed tube are visible from the eye. The stock web
  // and pad remain in the viewmodel's existing stock-visibility group.
  K.slab([[-.33,.012],[-.316,.042],[-.316,.060],[-.320,.073],[-.326,.080],[-.338,.078],[-.35,.072],
    [-.389,.069],[-.47,.064],[-.51,.067],[-.548,.074],[-.552,.016],[-.38,.002]],
    .058, finish.furniture, { bevel:.009, segs:3 }).name = 'GW-4 comb';
  K.slab([[-0.553, 0.055], [-0.533, 0.048], [-0.523, -0.056], [-0.54, -0.08], [-0.553, -0.078]], 0.058, finish.furniture, { bevel: 0.007, parent: stock });              // the butt
  K.slab(gunBand([[-0.364, 0.003], [-0.405, -0.006], [-0.492, -0.064], [-0.538, -0.07]], 0.012), 0.05, finish.furniture, { bevel: 0.005, parent: stock });              // the web's strut
  K.slab([[-0.569, 0.077], [-0.552, 0.077], [-0.552, -0.08], [-0.567, -0.083]], 0.06, gunRubber, { bevel: 0.006, parent: stock });                              // the pad
  K.slab([[-0.34, 0.005], [-0.402, -0.01], [-0.401, -0.021], [-0.36, -0.018], [-0.34, -0.008]], 0.026, gunDark, { bevel: 0.003, parent: stock });              // the release lever
  for (const sx of [-1, 1]) {
    const cheekStripe = K.slab([[-0.365, 0.053], [-0.505, 0.06], [-0.522, 0.047], [-0.37, 0.04]], 0.004, finish.furniture, { x: sx * 0.029, bevel: 0.002 });
    trimPanelBack(THREE, cheekStripe, sx, .029);
    K.cyl(0.011, 0.011, 0.004, gunDark, sx * 0.028, -0.045, -0.516, stock, 12, 'x');                                                                           // the QD socket
    K.cyl(0.0065, 0.0065, 0.005, gunRubber, sx * 0.03, -0.045, -0.516, stock, 10, 'x');
    K.box(0.003, 0.012, 0.03, gunRubber, sx * 0.029, 0.01, -0.46, 0, 0, 0, stock, 0.001);                                                                      // the sling slot
  }
  for (let i = 0; i < 5; i++) K.box(0.058, 0.004, 0.002, gunDark, 0, -0.056 + i * 0.026, -0.568, 0, 0, 0, stock, 0);   // the pad's grooves
  K.cyl(0.009, 0.009, 0.062, gunDark, 0, 0.032, -0.52, stock, 8, 'x');                                                     // the lever's pin
  gun.userData.fpStock = stock;
  // GP-20055 (J49): free-float quad rail on the same 40 mm sleeve and barrel nut. The four Picatinny strips
  // run from the receiver towards the front sight; the left and underside wear ribbed covers, while the
  // front of the right strip stays open for the kiosk laser/light unit. Keep the handguard and optic datums.
  K.lathe([[0.012, 0.186], [0.024, 0.186], [0.024, 0.206], [0.012, 0.206]], gunDark, { y: 0.02, seg: 12 });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; K.box(0.004, 0.003, 0.02, gunDark, Math.cos(a) * 0.0245, 0.02 + Math.sin(a) * 0.0245, 0.196, 0, 0, a + Math.PI / 2); }   // the nut's teeth
  ventedSleeve(THREE, gun, finish.lower, { z0: 0.21, z1: 0.70, radius: 0.03, wall: 0.004, y: 0.02, faces: 12,
    slots: [[0.238, 0.286], [0.309, 0.357], [0.38, 0.428], [0.451, 0.499], [0.522, 0.57], [0.593, 0.641], [0.652, 0.68]], ventFaces: [1, 4, 7, 10] });
  markPaintSurface(K.lathe([[0.022, 0.692], [0.03, 0.692], [0.03, 0.70], [0.027, 0.706], [0.022, 0.706]], gunBody, { y: 0.02, seg: 12, phase: Math.PI / 12 }), 'rail');   // the front cap
  // Seat the narrow painted strip between the sleeve's top facet and the base of the raised bands.
  const webBottom = 0.02 + 0.03 * Math.cos(Math.PI / 12), webTop = 0.085 - 0.007;
  markPaintSurface(K.box(0.024, webTop - webBottom, 0.49, gunMid, 0, (webTop + webBottom) / 2, 0.455, 0, 0, 0, null, 0.003), 'rail');
  paintedRail(0.49, 0, 0.085, 0.455, null, 0.031);
  for (const sx of [-1, 1]) paintedRail(0.49, sx * 0.033, 0.02, 0.455, null, 0.034, sx);
  paintedRail(0.49, 0, -0.013, 0.455, null, 0.031, 2);
  // Covers sleeve over the rail teeth and leave the M-LOK cuts on the four diagonal faces visible.
  const railCover = (sx, y, z0, z1, bottom = false) => {
    const len = z1 - z0, z = (z0 + z1) / 2;
    if (bottom) K.box(0.035, 0.009, len, finish.furniture, 0, y, z, 0, 0, 0, null, 0.003);
    else K.box(0.009, 0.037, len, finish.furniture, sx * 0.047, y, z, 0, 0, 0, null, 0.003);
    for (let p = z0 + 0.012; p < z1 - 0.008; p += 0.026) {
      if (bottom) K.box(0.036, 0.002, 0.004, gunRubber, 0, y - 0.005, p, 0, 0, 0, null, 0);
      else K.box(0.002, 0.038, 0.004, gunRubber, sx * 0.052, y, p, 0, 0, 0, null, 0);
    }
  };
  railCover(-1, 0.02, 0.25, 0.645);
  railCover(1, 0.02, 0.25, 0.53);
  railCover(0, -0.026, 0.25, 0.645, true);
  K.box(0.03, 0.03, 0.03, gunMid, 0, 0.046, 0.218, 0, 0, 0, null, 0.003);    // the riser's root over the barrel nut
  for (const sx of [-1, 1]) {
    D.screw(gun, sx * 0.0285, 0.02, 0.221, { axis: 'x', side: sx, r: 0.0028, kind: 'hex' });
    D.screw(gun, sx * 0.0285, 0.02, 0.232, { axis: 'x', side: sx, r: 0.0028, kind: 'hex' });
    D.screw(gun, sx * 0.0285, 0.02, 0.69, { axis: 'x', side: sx, r: 0.0024, kind: 'hex' });
  }
  K.cyl(0.0065, 0.0065, 0.004, gunDark, 0, -0.0085, 0.66, null, 10, 'y');   // the QD socket under the front
  // Barrel: 0.75" at the chamber stepping to the pencil, the low gas block inside the handguard, the folding front sight
  // on the rail, the A2 birdcage with its five slots and the crush washer.
  const barrel = K.lathe([[0, 0.18], [0.0135, 0.18], [0.0135, 0.3], [0.0115, 0.306], [0.0115, 0.915], [0, 0.915]], finish.tube, { y: 0.02, seg: 14 });
  K.box(0.024, 0.028, 0.028, gunDark, 0, 0.022, 0.614, 0, 0, 0, null, 0.003);
  K.slab([[0.65, 0.09], [0.693, 0.09], [0.685, 0.118], [0.663, 0.12]], 0.02, gunDark, { bevel: 0.003 });
  for (const sx of [-1, 1]) K.box(0.003, 0.02, 0.016, gunDark, sx * 0.0085, 0.122, 0.672);   // the sight's ears
  K.box(0.004, 0.02, 0.004, gunDark, 0, 0.128, 0.673);                                        // the post
  K.box(0.012, 0.009, 0.027, gunDark, 0, -0.009, 0.688, 0, 0, 0, null, 0.002);                 // bayonet lug below the front sight
  K.lathe([[0, 0.905], [0.0115, 0.905], [0.0135, 0.912], [0.0135, 0.918], [0, 0.918]], gunMid, { y: 0.02, seg: 12 });   // the crush washer
  K.lathe([[0, 0.912], [0.0135, 0.912], [0.0135, 0.918], [0.016, 0.925], [0.016, 0.975], [0.013, 0.978], [0.007, 0.978], [0.007, 0.97], [0, 0.97]], gunDark, { y: 0.02, seg: 12 });
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * 0.62; K.box(0.004, 0.004, 0.034, gunRubber, Math.cos(a) * 0.0158, 0.02 + Math.sin(a) * 0.0158, 0.952, 0, 0, a); }
  // Holographic sight on the upper's rail (its dot the sight line: unchanged), the clamp's lever and screw.
  const holoStart = gun.children.length;
  // GP-20065 replaces this with the standard ACOG/RMR; GP-20066 fits the combined laser/light to the open right rail.
  // CL-318 (J22: "red dot sights need an upgrade"): a hooded holographic sight: the clamp base on the rail, the lower
  // housing (its battery cap and buttons), a hood frame of four bars round the window rather than a box, the window's
  // glass with the dot and its ring on the same line (0, 0.134, 0.0455).
  K.box(0.05, 0.018, 0.112, gunDark, 0, 0.099, 0.0, 0, 0, 0, null, 0.004);                   // the base
  K.slab([[-0.052, 0.108], [0.054, 0.108], [0.054, 0.118], [-0.052, 0.118]], 0.05, gunDark, { bevel: 0.003 });   // the housing's floor
  K.box(0.046, 0.016, 0.04, gunDark, 0, 0.118, -0.03, 0, 0, 0, null, 0.003);                  // the rear housing (the emitter); CL-332 d: under the dot's line (was 0.02 tall at 0.126: it hid the dot)
  for (const sx of [-1, 1]) K.box(0.007, 0.05, 0.03, gunDark, sx * 0.0235, 0.14, 0.046, 0, 0, 0, null, 0.0025);   // the hood's uprights
  K.box(0.054, 0.007, 0.03, gunDark, 0, 0.1665, 0.046, 0, 0, 0, null, 0.0025);                                  // the hood's top bar
  K.box(0.054, 0.006, 0.03, gunDark, 0, 0.1125, 0.046, 0, 0, 0, null, 0.002);                                   // its bottom bar
  for (const mesh of gun.children.slice(holoStart)) markPaintSurface(mesh, 'optic shell');
  for (const sx of [-1, 1]) D.screw(gun, sx * 0.027, 0.1665, 0.04, { axis: 'x', side: sx, r: 0.002, kind: 'torx' });   // the hood's screws
  // GB-233: a holographic sight's window is clear glass with a small dot (EOTech-style), not an opaque teal plate.
  const holoGlass = Object.assign(glassMat.clone(), { transparent: true, opacity: 0.18, depthWrite: false });
  K.box(0.04, 0.047, 0.003, holoGlass, 0, 0.1395, 0.045);
  // GB-259 (J10): a 3.5 mm dot inside a thin ring, EOTech-style.
  K.box(0.0035, 0.0035, 0.002, sightDotMat, 0, 0.134, 0.0455);
  K.tor(0.0075, 0.0006, sightDotMat, 0, 0.134, 0.0455, 0, 0, 0, null, Math.PI * 2, 24);
  for (const z of [-0.036, -0.022]) K.box(0.006, 0.008, 0.01, gunRubber, 0.0255, 0.118, z);        // the brightness buttons on the emitter's side
  K.cyl(0.007, 0.007, 0.012, gunMid, -0.028, 0.118, -0.03, null, 10, 'x');                        // the battery cap
  K.slab([[-0.046, 0.092], [-0.02, 0.092], [-0.02, 0.098], [-0.046, 0.098]], 0.008, gunDark, { x: 0.0285, bevel: 0.0015 });   // the clamp's lever
  for (const sx of [-1, 1]) D.screw(gun, sx * 0.025, 0.1, 0.033, { axis: 'x', side: sx, r: 0.0025, kind: 'hex' });
  const defaultSight = K.group(0, 0, 0);
  defaultSight.name = 'm4-default-holo';
  for (const part of gun.children.slice(holoStart, -1)) defaultSight.add(part);
  gun.userData.defaultSight = defaultSight;
  // Magazine: a polymer STANAG with its curve, the ribs down each side, the witness windows, the floorplate; 24 mm in the
  // 32 mm well (GB-260: a real mag fills about 0.9 of its well). The group, curve, rake and feed top are untouched.
  const mag = K.group(0, -0.16, 0.05);
  K.slab([[-0.046, 0.108], ...profileCurve([-0.046, 0.03], [-0.04, -0.05], [-0.01, -0.104], 5), ...profileCurve([0.086, -0.096], [0.054, -0.04], [0.046, 0.03], 5), [0.046, 0.108]],
    0.036, finish.magazine, { bevel: 0.004, parent: mag });
  const bandHalfWidth = .0195, bandHalfLength = .041, bandBevel = .001;
  const bandCentreZ = y => .011 - y * .15;
  // In the rounded box's middle row the 45-degree end facet recedes in both X and Z.
  const edgeDrop = (1 - Math.SQRT1_2) * bandBevel;
  const bandSideSlope = edgeDrop / (bandHalfLength - edgeDrop);
  for (const sx of [-1, 1]) {
    for (const z of [-0.027, 0, 0.027]) K.slab(gunBand([[z, 0.053], [z + 0.004, -0.012], [z + 0.012, -0.07], [z + 0.019, -0.095]], 0.003), 0.002, finish.rib, { x: sx * 0.019, bevel: 0, parent: mag });
    // The small dark marks sit on the cross bands just beyond the last raised rib.
    for (const [z, y] of [[.039, -.018], [.044, -.049], [.050, -.080]]) {
      const backX = bandHalfWidth - (z - .0028 - bandCentreZ(y)) * bandSideSlope;
      const frontX = .020;
      K.slab([[z-.0028,y-.0016],[z+.0028,y-.0016],[z+.0028,y+.0016],[z-.0028,y+.0016]],
        frontX - backX, gunRubber, { x: sx * (frontX + backX) / 2, bevel: .00015, parent: mag });
    }
  }
  for (const y of [-.018, -.049, -.08]) K.box(2*bandHalfWidth, .004, 2*bandHalfLength,
    finish.furniture, 0, y, bandCentreZ(y), 0, 0, 0, mag, bandBevel);
  K.slab([[-0.016, -0.1], [0.092, -0.092], [0.094, -0.11], [-0.016, -0.118]], 0.042, finish.seam, { bevel: 0.004, parent: mag });   // the floorplate, proud of the body
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Sling swivel under the handguard.
  K.tor(0.01, 0.0025, gunDark, 0, -0.012, 0.52, 0, Math.PI / 2, 0, null, Math.PI * 2, 12);
  gunEffects(gun, new THREE.Vector3(0, 0.02, 0.98), 0.06, 3.5, 8);
  gun.userData.laser.position.set(0, 0.02, 5);
  gun.userData.laserBaseZ = 1;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'm4');   // CL-95
  attachLaserLight(gun, 'm4', ctx);
  gun.userData.partFinish = true;
  const can = gun.userData.suppressor, light = gun.userData.laserLightUnit;
  gun.traverse(mesh => {
    if (!mesh.isMesh || mesh.parent === mag || mesh.parent === work) return;
    const mat = mesh.material;
    if (mesh.parent === light) {
      if (mesh.name === 'moduleShell' || mesh.name === 'topPlate') markPaintSurface(mesh, 'light shell');
    } else if (mesh.parent === can) {
      if (mat === gunDark || mat === gunAccent) markPaintSurface(mesh, 'suppressor shell');
    } else if (mat === finish.upper || mat === finish.lower ||
               (mat === finish.seam && mesh.parent === gun && mesh.name !== 'GW-4 rear collar')) {
      markPaintSurface(mesh, 'receiver');
    } else if (mat === finish.furniture) {
      markPaintSurface(mesh, 'furniture');
    }
  });
  bindModelArtwork(gun, 'controls', 'selector', groupArtwork(THREE, selector, selectorCap));
  bindModelArtwork(gun, 'controls', 'boltCatch', groupArtwork(THREE, catchPlate));
  bindModelArtwork(gun, 'controls', 'magRelease', groupArtwork(THREE, release));
  bindModelArtwork(gun, 'controls', 'chargingHandle', work);
  bindModelArtwork(gun, 'heatParts', 'barrel', groupArtwork(THREE, barrel));
  bindModelArtwork(gun, 'heatParts', 'suppressor', gun.userData.suppressor);
  return finishGun(gun);
}

const krFinishes = new WeakMap();
function krFinish(ctx) {
  if (!krFinishes.has(ctx.gunBody)) {
    const receiver = ctx.gunBody.clone();
    receiver.color.setHex(0x4a5055); receiver.roughness = .49; receiver.metalness = .34;
    const bracket = ctx.gunMid.clone();
    bracket.color.setHex(0x50565a); bracket.roughness = .52; bracket.metalness = .35;
    const birch = ctx.woodMat.clone();
    birch.name = 'KR-7 walnut'; // Stable material key used by the Armory's finish checks.
    birch.color.setHex(0xffffff);
    birch.roughness = .46;
    birch.metalness = 0;
    birch.map = birchTexture(ctx.THREE);
    birch.userData.preserveArtworkUV = true;
    const cartridge = ctx.brassMat.clone();
    cartridge.color.setHex(0xffffff); cartridge.vertexColors = true;
    cartridge.roughness = .38; cartridge.metalness = .42;
    krFinishes.set(ctx.gunBody, {receiver, bracket, birch, cartridge});
  }
  return krFinishes.get(ctx.gunBody);
}

// Fold the concealed part of the curved artwork onto its neighbouring panel.
// Vertices above the seam keep their authored normals and texture coordinates.
function trimRoundedArtwork(T, geometry, profile, floorAt, segments) {
  const {position, normal, uv} = geometry.attributes;
  const row = new Map(), step = 2 * Math.PI / segments;
  for (const [radius,z] of profile) {
    if (!radius) continue;
    const floor = floorAt(z);
    const lower = (Math.ceil(Math.asin(floor / radius) / step - .5) - .5) * step;
    const upper = lower + step;
    const t = (floor / radius - Math.sin(lower)) / (Math.sin(upper) - Math.sin(lower));
    const edge = radius * ((1 - t) * Math.cos(lower) + t * Math.cos(upper));
    row.set(Math.fround(z), {radius, floor, edge});
  }
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const positions = [], normals = [], uvs = [];
  for (let i = 0; i < position.count; i += 3) {
    let onUnderside = true;
    for (let j = i; j < i + 3; j++) {
      const {radius, floor, edge} = row.get(position.getZ(j));
      if (position.getY(j) > floor) { onUnderside = false; continue; }
      const x = position.getX(j);
      position.setXY(j, Math.abs(x) >= edge - 1e-7 ? Math.sign(x) * edge : x, floor);
      uv.setY(j, floor * 4);
      if (Math.abs(x) >= edge - 1e-7) {
        const radial = Math.hypot(normal.getX(j), normal.getY(j));
        normal.setXY(j, radial * Math.sign(x) * edge / radius, radial * floor / radius);
      }
    }
    if (onUnderside) continue;
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1).sub(a);
    c.fromBufferAttribute(position, i + 2).sub(a);
    b.cross(c);
    if (b.lengthSq() < 1e-18) continue;
    for (let j = i; j < i + 3; j++) {
      positions.push(position.getX(j),position.getY(j),position.getZ(j));
      normals.push(normal.getX(j),normal.getY(j),normal.getZ(j));
      uvs.push(uv.getX(j),uv.getY(j));
    }
  }
  // Close each pair of neighbouring rows. A centre vertex at both ends
  // matches the original end-cap fans and avoids a subdivided edge opposite a long edge.
  let previous;
  for (const [z,{floor,edge}] of row) {
    const ring = [[-edge,floor,z],[0,floor,z],[edge,floor,z]];
    if (previous) {
      const underside = a.set(0, previous[0][2] - z, floor - previous[0][1]).normalize();
      for (let j = 0; j < 2; j++) {
        for (const p of [previous[j],previous[j+1],ring[j+1],previous[j],ring[j+1],ring[j]]) {
          positions.push(...p); normals.push(underside.x,underside.y,underside.z); uvs.push(p[2]*4,p[1]*4);
        }
      }
    }
    previous = ring;
  }
  const skin = new T.BufferGeometry();
  skin.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  skin.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  skin.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  skin.computeBoundingSphere();
  geometry.dispose();
  return skin;
}

export function makeAkModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunMid, gunDark, gunAccent, gunRubber, woodDark, gunMetal } = ctx;
  const {receiver: gunBody, bracket, birch: woodMat, cartridge} = krFinish(ctx);
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  // CL-311 (D-121, the fidelity upgrade; AG-229: ours 58 % wider than the reference): an AKM at an AKM's proportions.
  // Builder's units (x 0.78 to metres): the stamped receiver 36 mm wide and 44 mm tall on its sides before the deeper J85 lower, the dust cover's
  // round top 23 mm over it, the magazine 27 mm, the lower handguard 44 mm, the grip 33 mm, the butt 41 mm; the bore at
  // y -0.005 as before, the gas tube 20 mm over it. The grip's centre line and support point under the lower handguard
  // stay where the hold has them; J85 shortens the butt. Real-right controls (the selector, the charging handle) are on +x:
  // the mirrored first-person view shows +x on the right (docs/fps/fidelity.md).
  const HW = 0.023;
  // Receiver: flat stamped sides, the rear tang falling to the stock, the front trunnion's seam and its rivets.
  K.slab([[-0.225, 0.028], [-0.225, -0.018], [-0.2, -0.028], [-0.12, -0.028], [-0.11, -0.026], [0.252, -0.026], [0.252, 0.028]], 2 * HW, gunBody, { bevel: 0.0025, segs: 2 });
  // J85: the lower stamping has real depth around the magazine well instead of
  // reading as a pencil-thin line above a full-size magazine and pistol grip.
  K.slab([[-0.11, -0.026], [0.252, -0.026], [0.252, -0.039], [0.18, -0.047], [0.07, -0.047], [-0.065, -0.039], [-0.11, -0.031]], 2 * HW, gunBody, { bevel: 0.0025, segs: 2 });
  for (const sx of [-1, 1]) {
    for (const [ry, rz] of [[0.012, 0.19], [-0.012, 0.19], [0.0, 0.232], [-0.012, -0.165], [0.012, -0.205]]) D.rivet(gun, sx * HW, ry, rz, { axis: 'x', side: sx, r: 0.0032 });   // the trunnions' rivets
    for (const rz of [-0.04, 0.02]) D.rivet(gun, sx * HW, -0.02, rz, { axis: 'x', side: sx, r: 0.0028 });   // the trigger guard's
    D.groove(gun, { x: sx * HW, y: 0.004, z: 0.2, axis: 'x', side: sx, along: 'y', len: 0.05, w: 0.0007 });   // the front trunnion's seam
    const stamp = K.box(.003, .016, .07, gunBody, sx * (HW + .0005), 0, .07, 0, 0, 0, null, .0012);
    trimPanelBack(THREE, stamp, sx, HW);
  }
  D.pin(gun, 0, 0.0, -0.12, { axis: 'x', len: 2 * HW, r: 0.003, mat: gunDark, caps: true });   // the hammer pin
  D.pin(gun, 0, -0.006, -0.06, { axis: 'x', len: 2 * HW, r: 0.003, mat: gunDark, caps: true });  // the trigger pin
  // Removable side bracket. Its shelf supports the short optic rail at y=.085.
  gun.userData.opticPlate = optionalArtworkGroup(ctx, gun, 'side optic bracket', plate => {
    K.box(0.010, 0.025, 0.111, gunDark, -HW - 0.005, 0.008, 0.063, 0, 0, 0, plate, 0.002);
    // A flared side plate carries the visual weight of the sight. The scallop
    // leaves a strip of the rounded cover visible below the rail in profile.
    K.slab([[.009,.020],[.109,.020],[.114,.026],[.097,.041],[.093,.054],
      [.111,.069],[.111,.077],[.017,.077],[.017,.065],[.035,.048],
      [.032,.039],[.009,.029]], .010, bracket, {x:-HW-.005,bevel:.002,segs:3,parent:plate}).name = 'KR-7 bracket web';
    K.slab([[.013,.007],[.014,.016],[.052,.025],[.063,.024],[.065,.019],
      [.056,.014],[.026,.006]], .003, gunDark,
      {x:-HW-.011,bevel:.0009,segs:2,parent:plate}).name = 'KR-7 bracket latch';
    K.box(HW + 0.027, 0.008, 0.100, gunDark, (0.007 - HW) / 2, 0.081, 0.064, 0, 0, 0, plate, 0.0015);
    for (const piece of plate.children) if (piece.name !== 'KR-7 bracket latch') markPaintSurface(piece, 'rail');
  });
  gun.userData.ejectPort = [HW + 0.003, 0.016, 0.1875];
  // Dust cover: the stamped lid with its rounded top and the AKM's eight ribs across the rear half.
  // (CL-315 note: one parkerized finish on the cover and the receiver, as an AKM has; the ribs a shade lighter to read.)
  const rearCorner = [-.2, .036], topCorner = [-.18, .04];
  K.slab([[-.2, .028], [.155, .028], [.155, topCorner[1]], topCorner, rearCorner],
    2 * HW - .002, gunBody, { bevel: .002, segs: 2 });
  const coverProfile = [[0, rearCorner[0]], [.021, rearCorner[0]], [.022, -.19], [.022, topCorner[0]]];
  for (let i = 0; i < 8; i++) {
    const z = -.167 + i * .013;
    coverProfile.push([.022,z],[.0231,z+.0016],[.0231,z+.0030],[.022,z+.0047]);
  }
  coverProfile.push([.022,.15],[.021,.155],[0,.155]);
  // Stop the metal artwork at the neighbouring side panel's sloped upper edge.
  const rise = topCorner[1] - rearCorner[1];
  const slope = rise / (topCorner[0] - rearCorner[0]);
  const cover = K.lathe(coverProfile, gunBody, {y:rearCorner[1], seg:20, phase:Math.PI/20});
  cover.name = 'KR-7 receiver cover';
  cover.geometry = trimRoundedArtwork(THREE, cover.geometry, coverProfile,
    z => Math.min(rise, (z - rearCorner[0]) * slope), 20);
  // GP-20056, Century parts figure 1 and field strip: the recoil spring cam protrudes through the rear of the lid.
  const rearButtonFinish = gunMid.clone();
  rearButtonFinish.color.lerp(gunDark.color, .60);
  rearButtonFinish.roughness = .80;
  rearButtonFinish.metalness = .12;
  K.cyl(0.008, 0.008, 0.003, rearButtonFinish, 0, 0.044, -0.202, null, 12, 'z');
  K.cyl(0.0055, 0.0055, 0.009, gunDark, 0, 0.044, -0.205, null, 12, 'z');
  // The rear sight block on the cover's front: the tangent leaf on it, its slider, the U notch's ears at the sight line (0.074).
  K.slab([[0.15, 0.03], [0.248, 0.03], [0.248, 0.056], [0.2, 0.066], [0.15, 0.064]], 0.034, gunDark, { bevel: 0.0025 });
  K.box(0.022, 0.004, 0.064, gunDark, 0, 0.068, 0.196);                                       // the leaf
  K.box(0.024, 0.006, 0.01, gunMid, 0, 0.069, 0.182);                                         // the slider
  for (const sx of [-1, 1]) K.box(0.004, 0.004, 0.008, gunAccent, sx * 0.005, 0.072, 0.218);   // GB-259: the U notch's ears, their tops the sight line
  // Right side (+x in the mirrored view): the long safety lever in its notches, the charging handle on the carrier.
  // CL-318 (J27: "the safety needs to look more realistic and like an AK-47 safety"): the stamped selector lever: its
  // hub on the axle above and behind the trigger, the long flat blade running forward along the receiver's side to the
  // thumb tab over the trigger guard's front, the two notches it clicks into at the cover's edge.
  const selectorHub = K.cyl(0.011, 0.011, 0.004, gunDark, HW + 0.002, 0.004, -0.12, null, 14, 'x');                                             // the hub
  D.screw(gun, HW + 0.004, 0.004, -0.12, { axis: 'x', side: 1, r: 0.004, kind: 'slot' });                                    // the axle's head
  const selectorBlade = K.slab(gunBand([[-0.12, 0.012], [-0.05, 0.01], [0.012, 0.004]], 0.0055), 0.0035, gunDark, { x: HW + 0.0022, bevel: 0.0012 });   // the blade
  const selectorTab = K.slab(gunBand([[0.006, 0.006], [0.02, -0.004], [0.028, -0.02]], 0.005), 0.0035, gunDark, { x: HW + 0.0022, bevel: 0.0012 });   // the thumb tab, bent down at the front
  const selectorLip = K.box(0.005, 0.004, 0.012, gunDark, HW + 0.0045, -0.012, 0.024, 0, 0, 0, null, 0.001);                                       // its lip, bent out
  for (const z of [-0.145, -0.108]) D.groove(gun, { x: HW, y: 0.024, z, axis: 'x', side: 1, along: 'y', len: 0.012, w: 0.0008 });   // the selector's notches
  // The pressed SAFE/FIRE sweep and its end stops are on the same right wall as the selector.
  K.slab(gunBand([[-0.12, 0.004], [-0.085, 0.025], [-0.038, 0.03]], 0.0012), 0.0015, gunMid, { x: HW + 0.001, bevel: 0 });
  K.box(0.003, 0.006, 0.01, gunDark, HW + 0.0015, 0.027, -0.034, 0, 0, 0, null, 0.0005);
  K.box(0.003, 0.006, 0.01, gunDark, HW + 0.0015, -0.019, 0.034, 0, 0, 0, null, 0.0005);
  // CL-318 (J27: "ejection port and charging handle need to line up and be properly sized"): the port cut in the
  // receiver's right wall in front of the handle, 58 x 23 mm, its rim, the carrier's bright side in it; the handle's
  // slot runs back from the port's top edge under the cover, the handle (the work part) riding in it at the slot's front.
  K.slab(gunBand([[0.15, 0.001], [0.15, 0.031], [0.225, 0.031], [0.225, 0.001], [0.15, 0.001]], 0.0025), 0.003, gunMid, { x: HW + 0.001, bevel: 0.0008 });   // the rim
  K.box(0.004, 0.028, 0.072, gunRubber, HW - 0.0003, 0.016, 0.1875, 0, 0, 0, null, 0.001);   // the recess
  fitPortCarrier(gun, K, {x: HW + 0.0018, y: 0.016, rear: 0.153, front: 0.219, height: 0.017}, gunMetal, gunMid);
  K.box(0.0035, 0.009, 0.1, gunRubber, HW - 0.0005, 0.03, 0.095, 0, 0, 0, null, 0.001);      // the handle's slot
  // GB-269 (GP-20012, docs/contracts.md): the charging handle is its own group, gun.userData.work, at rest where it was.
  const work = K.group(HW + 0.006, 0.02, 0.13); work.name = 'work';
  K.box(0.016, 0.014, 0.022, gunDark, 0, 0.004, 0, 0, 0, 0, work, 0.003);   // the handle's root in the slot (t333: 22 mm long, so the knob on it hangs on a part the test calls big)
  K.cyl(0.0045, 0.0045, 0.012, gunDark, 0.012, 0.004, 0, work, 8, 'x');      // the stem
  K.sph(0.0095, gunDark, 0.021, 0.004, 0, work, 10);                          // the knob
  gun.userData.work = work;
  // Trigger guard, the magazine release in front of it, a trigger with its tip curling forward, the wooden grip.
  // Grip centre line is still gripOutline(-0.1, -0.14, 0.19, ..., 0.34): the palm stays at the hold.
  // CL-318 (J27: the guard squeezed between the grip and the magazine; the grip shortened): the guard a real loop from
  // the mag release's rear to the grip's front, 36 units long; the grip 3 units back and 2.5 shorter.
  K.slab(gunBand([[0.002, -0.028], [0.0, -0.072], [-0.016, -0.084], [-0.06, -0.084], [-0.076, -0.068], [-0.074, -0.04]], 0.0055), 0.022, gunDark, { bevel: 0.003 });
  const magRelease = K.box(0.016, 0.018, 0.006, gunDark, 0, -0.04, 0.004);   // the mag release paddle
  // GB-175: trigger face toward the grip, tip curling forward; GB-180: a solid blade.
  addTriggerArtwork(gun, K, [[-0.0165, -0.0329], [-0.0248, -0.046], [-0.024, -0.0581], [-0.0155, -0.0675], [-0.0205, -0.0725], [-0.032, -0.0619], [-0.0352, -0.044], [-0.0275, -0.0271]], 0.009, gunDark, { bevel: 0.002 });
  // GB-178: a clean AK grip on the same centre line and hand anchor (u 0.42, v 0); its top runs up into the receiver.
  // CL-312 b (Jerry: "check and fix all pistol grips"): the AKM grip widens a little to a flat base (it tapered to a point).
  // The centre line cz -0.13, cy -0.135, h 0.165 (was -0.1, -0.14, 0.19): the palm point (u 0.42) is (-0.1256, -0.1226) now:
  // VM_SOCKETS.ak grip, WEAPON_HOLD.ak grip and trig follow.
  const gripWood = K.slab(shapedGrip(-0.13, -0.135, 0.165, 0.08, 0.34, [
    [-0.14, 0.02], [-0.02, 0.022], [0.14, 0.024], [0.4, 0.024], [0.64, 0.026], [0.86, 0.03], [1.0, 0.031], [1.04, 0.018],
    [1.04, -0.02], [0.98, -0.036], [0.8, -0.038], [0.5, -0.034], [0.2, -0.03], [0.0, -0.028], [-0.14, -0.014]
  ]), 0.045, woodMat, { bevel: 0.008, segs: 3 });
  mapBirchSlab(gripWood, Math.PI / 2 - .34, .36);
  K.box(0.03, 0.003, 0.036, gunDark, 0, -0.135 - 0.54 * 0.165 * Math.cos(0.34), -0.13 - 0.54 * 0.165 * Math.sin(0.34), 0.34, 0, 0, null, 0.0008);   // the base's steel plate
  for (const sx of [-1, 1]) D.checkering(gun, woodDark, shapedGrip(-0.13, -0.135, 0.13, 0.05, 0.34, [[0.12, 0.012], [0.88, 0.012], [0.88, -0.022], [0.12, -0.022]]), sx * 0.0227, 0.0045, 0.0011);   // the grip's checkering
  D.screw(gun, 0.0227, -0.15, -0.136, { axis: 'x', side: 1, r: 0.0045, kind: 'slot' });                 // GB-178: the grip screw on the panel
  K.slab([[-0.17, -0.027], [-0.088, -0.027], [-0.092, -0.04], [-0.164, -0.042]], 0.046, gunDark, { bevel: 0.002 });   // GB-180: the grip's steel mounting tang under the receiver
  // Stock: the dropped wooden butt with its wrist, a steel buttplate, the tang, a sling loop. GB-269: one group, fpStock.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  // CL-318 (J27: "the stock needs to transition better to the receiver"): the wood runs into a steel rear-trunnion sleeve
  // the receiver's own width, riveted, instead of meeting the receiver's end with a step and a block on top.
  const stockBody = K.slab([[-0.232, 0.028], ...profileCurve([-0.255, 0.03], [-0.34, 0.012], [-0.412, 0.012], 5),
    ...profileCurve([-0.412, 0.012], [-0.515, 0.017], [-0.571, -0.009], 5), [-0.579, -0.145], [-0.57, -0.153],
    ...profileCurve([-0.57, -0.153], [-0.414, -0.084], [-0.337, -0.069], 5),
    ...profileCurve([-0.337, -0.069], [-0.27, -0.044], [-0.232, -0.028], 4)], 0.046, woodMat, { bevel: 0.01, segs: 3, parent: stock });
  const stockCollar = K.slab([[-0.252, 0.029], [-0.218, 0.029], [-0.218, -0.029], [-0.252, -0.029]], 2 * HW + 0.001, gunBody, { bevel: 0.0025, parent: stock });
  // Keep the original birch visible from the eye. Fill just the gap between it and the body.
  const joint = slab([[-.232,.029],[-.225,.029],[-.225,-.018],[-.232,-.028]],2 * HW,.001,2);
  fitCollarFaces(THREE, stockCollar, HW, joint);
  for (const sx of [-1, 1]) for (const ry of [0.014, -0.014]) D.rivet(stock, sx * (HW + 0.0005), ry, -0.236, { axis: 'x', side: sx, r: 0.0032 });
  K.slab([[-0.592, 0.0], [-0.573, -0.004], [-0.579, -0.152], [-0.597, -0.156]], 0.056, gunDark, { bevel: 0.003, parent: stock });   // the buttplate
  for (const y of [-0.03, -0.125]) {
    const surfaceZ = -0.592 + (y - 0.003) * (0.005 / 0.156);
    D.screw(stock, 0, y, surfaceZ, { axis: 'z', side: -1, r: 0.003, kind: 'slot' });
  }
  K.box(0.022, 0.03, 0.016, gunDark, 0, -0.06, -0.593, 0, 0, 0, stock, 0.002);                     // the trapdoor
  mapBirchSlab(stockBody, .12, .08);
  K.tor(0.012, 0.0035, gunDark, 0, -0.119, -0.45, 0, Math.PI / 2, 0, stock);
  // J85: shorten only the butt behind the receiver joint; the grip and reload datums stay put.
  stock.scale.z = 0.77;
  stock.position.z = -0.225 * (1 - stock.scale.z);
  // Keep the wood visible from the player's eye, with the same issued contour.
  stockBody.scale.z = stock.scale.z;
  stockBody.position.z = stock.position.z;
  stockBody.name = 'KR-7 stock';
  gun.add(stockBody);
  gun.userData.fpStock = stock;
  // Handguards: the lower with its palm swell and finger grooves, the upper over the gas tube, the steel bands and their latches.
  const lowerWood = K.slab([[0.244, 0.012], [0.53, 0.012], [0.535, -0.01], [0.53, -0.04], [0.45, -0.052], [0.33, -0.053], [0.262, -0.047], [0.244, -0.034]], 0.062, woodMat, { bevel: 0.01, segs: 3 });
  mapBirchSlab(lowerWood, 0, .63);
  const upperWood = K.slab([[0.248, 0.012], [0.505, 0.012], [0.512, 0.026], [0.49, 0.04], [0.26, 0.04], [0.248, 0.03]], 0.044, woodMat, { bevel: 0.004, segs: 2 });   // the upper handguard
  mapBirchSlab(upperWood, 0, .21);
  for (const sx of [-1, 1]) for (const z of [0.3, 0.36, 0.42]) D.vents(gun, { x: sx * 0.022, y: 0.028, z, axis: 'x', side: sx, along: 'y', count: 1, w: 0.014, len: 0.006, deep: 0.002 });   // its vents
  for (const z of [0.236, 0.512]) { K.box(0.064, 0.064, 0.014, gunDark, 0, -0.004, z, 0, 0, 0, null, 0.003); D.screw(gun, 0.032, -0.004, z, { axis: 'x', side: 1, r: 0.0025, kind: 'slot' }); }   // the bands
  K.box(0.012, 0.008, 0.014, gunDark, 0.03, 0.014, 0.512, 0, 0, 0, null, 0.001);   // the front band's latch
  K.lathe([[0, 0.42], [0.0095, 0.42], [0.0095, 0.61], [0, 0.61]], gunDark, { y: 0.021, seg: 10 });   // the gas tube on to the gas block
  K.lathe([[0, 0.24], [0.0095, 0.24], [0.0095, 0.43], [0, 0.43]], gunAccent, { y: 0.021, seg: 10 });
  for (const sx of [-1, 1]) for (const z of [0.275, 0.325, 0.375, 0.425]) K.box(0.003, 0.006, 0.014, gunDark, sx * 0.0095, 0.021, z, 0, 0, 0, null, 0.001);   // the tube's vent holes' lips
  K.cyl(0.0035, 0.0035, 0.034, gunAccent, 0, 0.027, 0.47, null, 8, 'x');   // the upper handguard's retainer
  // The rear gas tube lock arm pivots above the right edge of the rear sight block.
  K.cyl(0.005, 0.005, 0.007, gunDark, 0.0185, 0.047, 0.236, null, 10, 'x');
  K.slab(gunBand([[0.235, 0.047], [0.258, 0.052], [0.276, 0.061]], 0.0025), 0.003, gunMid, { x: 0.022, bevel: 0.0007 });
  K.box(0.007, 0.005, 0.006, gunDark, 0.023, 0.061, 0.276, 0, 0, 0, null, 0.001);
  K.slab([[0.595, 0.04], [0.645, 0.036], [0.645, -0.02], [0.595, -0.022]], 0.03, gunMid, { bevel: 0.003 });   // the gas block
  D.pin(gun, 0, 0.012, 0.62, { axis: 'x', len: 0.03, r: 0.002, caps: true });
  // Barrel and cleaning rod; the front sight tower with its hood; the bayonet lug; the slant brake. (GB-259: the post's tip at the sight line.)
  const barrel = K.lathe([[0, 0.5], [0.0125, 0.5], [0.0125, 0.6], [0.011, 0.608], [0.011, 0.755], [0, 0.755]], gunAccent, { y: -0.005, seg: 12 });
  K.lathe([[0, 0.53], [0.003, 0.53], [0.003, 0.715], [0.005, 0.719], [0.005, 0.729], [0, 0.729]], gunDark, { y: -0.026, seg: 6 });
  K.slab([[0.701, -0.024], [0.745, -0.024], [0.741, 0.036], [0.709, 0.036]], 0.026, gunDark, { bevel: 0.003 });
  K.tor(0.018, 0.0045, gunDark, 0, 0.062, 0.723, 0, 0, 0, null, Math.PI, 10);                          // the hood
  for (const sx of [-1, 1]) K.box(0.005, 0.028, 0.01, gunDark, sx * 0.018, 0.048, 0.723);           // its ears
  K.box(0.005, 0.038, 0.005, gunDark, 0, 0.0555, 0.723);                                                  // the post: its tip at 0.0745
  // Windage drum through the block, and a threaded post base below the existing sight tip.
  K.cyl(0.009, 0.009, 0.032, gunMid, 0, 0.038, 0.723, null, 12, 'x');
  K.cyl(0.004, 0.004, 0.008, gunAccent, 0, 0.043, 0.723, null, 10, 'y');
  K.box(0.018, 0.016, 0.044, gunDark, 0, -0.024, 0.703);                                                  // the bayonet lug
  K.lathe([[0, 0.753], [0.014, 0.753], [0.014, 0.823], [0.012, 0.829], [0.0065, 0.829], [0.0065, 0.820], [0, 0.820]], gunDark, { y: -0.005, seg: 12 });
  K.box(0.019, 0.008, 0.036, gunRubber, 0, 0.009, 0.800, -0.35);   // the slant brake's cut
  K.cyl(0.0035, 0.0035, 0.019, gunMid, 0, 0.009, 0.751, null, 8, 'z');   // spring detent under the brake's rear edge
  K.box(0.008, 0.004, 0.007, gunAccent, 0, 0.01, 0.759, 0, 0, 0, null, 0.001);   // the detent nose
  // Banana mag: the deep curve, three pressed ribs down each side, the floorplate; 27 mm across now, its top at the well.
  const mag = K.group(0, -0.04, 0.04);
  const magB = profileCurve([-0.046, 0.012], [-0.04, -0.13], [0.052, -0.258], 7), magF = profileCurve([0.056, 0.012], [0.066, -0.11], [0.156, -0.232], 7);
  const backBorder = gunBand(magB, .002), frontBorder = gunBand(magF, .002);
  // The centre paint ends at the inner edges of the two dark border graphics.
  K.slab([...backBorder.slice(0,magB.length), ...frontBorder.slice(magF.length)], 0.034, gunAccent, { bevel: 0.004, parent: mag });
  for (const w of [0.23, 0.5, 0.77]) {
    const line = magB.map(([z,y], i) => [z * (1-w) + magF[i][0] * w, y * (1-w) + magF[i][1] * w]);
    const outline = gunBand(line.slice(1, 7), 0.003);
    const relief = K.slab(outline, 0.037, gunBody, { bevel: 0.0012, parent: mag });
    separateBandFaces(THREE, relief.geometry, outline, 0.034 / 2);
  }
  K.slab(backBorder, 0.035, gunDark, { bevel: 0.001, parent: mag });
  K.slab(frontBorder, 0.035, gunDark, { bevel: 0.001, parent: mag });
  K.box(0.036, 0.018, 0.1, gunDark, 0, -0.01, 0.007, 0, 0, 0, mag, 0.002);                                // the well's lips
  // The front lug seats first; the rear locking lug catches when the magazine rocks back into the well.
  K.box(0.018, 0.009, 0.018, gunDark, 0, 0.01, 0.06, 0, 0, 0, mag, 0.001);
  K.box(0.022, 0.007, 0.012, gunDark, 0, 0.009, -0.057, 0, 0, 0, mag, 0.001);
  K.slab([[0.048, -0.254], [0.16, -0.226], [0.164, -0.241], [0.05, -0.271]], 0.038, gunDark, { bevel: 0.003, parent: mag });   // the floorplate
  // The top prop follows this specific magazine into the support hand. Its
  // visibility belongs to the ammo count of the magazine being displayed.
  const roundArt = roundGeometry(THREE, 'ak');
  roundArt.computeBoundingBox();
  const metresPerLocalUnit = .92 * .88 * 1.35 / 1.464;
  const topRound = new THREE.Mesh(roundArt, cartridge);
  topRound.name = 'magazine top round';
  topRound.scale.setScalar(1 / metresPerLocalUnit);
  topRound.rotation.x = Math.PI/2;
  topRound.position.set(.001, .012 + roundArt.boundingBox.max.z / metresPerLocalUnit, .004);
  topRound.visible = false;
  mag.add(topRound);
  for (const side of [-1,1]) {
    K.slab([[-.038,.012],[-.035,.019],[-.029,.022],[.011,.020],[.022,.015],[.026,.012]],
      .003, gunDark, {x:side*.0115,bevel:.0008,segs:2,parent:mag});
  }
  gun.userData.magazineTopRound = topRound;
  gun.userData.setMagazineRounds = count => { topRound.visible = Number.isFinite(count) && count > 0; };
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  gunEffects(gun, new THREE.Vector3(0, -0.005, 0.855), 0.065, 3.5, 8);
  gun.userData.laser.position.set(0, -0.005, 5);
  gun.userData.laserBaseZ = 0.835;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  gunSuppressor(gun, K, 'ak');   // CL-95
  attachLaserLight(gun, 'ak', ctx);
  gun.userData.partFinish = true;
  gun.traverse(mesh => {
    if (!mesh.isMesh || mesh.parent === mag) return;
    if (mesh.material === gunBody) {
      markPaintSurface(mesh, 'receiver');
    } else if (mesh.parent === gun.userData.laserLightUnit && ['moduleShell','railClamp'].includes(mesh.name)) {
      markPaintSurface(mesh, 'light shell');
    }
  });
  // gunSuppressor appends the end-face insert and the bore after the outer sleeve.
  for (const mesh of gun.userData.suppressor?.children.slice(0,-2) || []) markPaintSurface(mesh, 'suppressor shell');
  const selector = K.group(selectorHub.position.x, selectorHub.position.y, selectorHub.position.z);
  for (const part of [selectorHub, selectorBlade, selectorTab, selectorLip]) {
    part.position.sub(selector.position);
    selector.add(part);
  }
  bindModelArtwork(gun, 'controls', 'selector', selector);
  bindModelArtwork(gun, 'controls', 'magRelease', groupArtwork(THREE, magRelease));
  bindModelArtwork(gun, 'controls', 'chargingHandle', work);
  bindModelArtwork(gun, 'heatParts', 'barrel', groupArtwork(THREE, barrel));
  bindModelArtwork(gun, 'heatParts', 'suppressor', gun.userData.suppressor);
  return finishGun(gun);
}

// A raised graphic on each side of a flat panel. Keep the slab's exterior bevels
// and close each ribbon against the painted face underneath it.
function separateBandFaces(T, geometry, outline, faceX) {
  const { position, normal, uv } = geometry.attributes;
  const positions = [], normals = [], uvs = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < position.count; i += 3) {
      if (side * position.getX(i) < 0 && side * position.getX(i+1) < 0 && side * position.getX(i+2) < 0) continue;
      for (let v = i; v < i + 3; v++) {
        positions.push(side * Math.max(faceX, side * position.getX(v)), position.getY(v), position.getZ(v));
        normals.push(normal.getX(v), normal.getY(v), normal.getZ(v));
        uvs.push(uv.getX(v), uv.getY(v));
      }
    }
    // gunBand returns one edge of a ribbon followed by the other in reverse.
    // Close each short segment independently so the back follows its curve.
    for (let a = 0; a < outline.length / 2 - 1; a++) {
      const b = a + 1, d = outline.length - 1 - a, c = d - 1;
      const corners = side > 0 ? [a,c,b, a,d,c] : [a,b,c, a,c,d];
      for (const corner of corners) {
        const [z, y] = outline[corner];
        positions.push(side * faceX, y, z);
        normals.push(-side, 0, 0);
        uvs.push(z * 4, y * 4);
      }
    }
  }
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();
}

// Clip the back of a convex decorative panel against its support. All original
// exposed positions, normals and UVs remain in the same local coordinates.
export function trimPanelBack(T, panel, side, supportFace, axis = 'x') {
  const source = panel.geometry;
  const {position, normal, uv} = source.attributes;
  const plane = side * supportFace - panel.position[axis];
  const distance = vertex => side * (vertex.point[axis] - plane);
  const vertices = Array.from({length: position.count}, (_, i) => ({
    point: new T.Vector3().fromBufferAttribute(position, i),
    normal: new T.Vector3().fromBufferAttribute(normal, i),
    uv: new T.Vector2().fromBufferAttribute(uv, i)
  }));
  const positions = [], normals = [], uvs = [], edges = [];
  function triangle(a, b, c) {
    for (const v of [a, b, c]) {
      positions.push(v.point.x, v.point.y, v.point.z);
      normals.push(v.normal.x, v.normal.y, v.normal.z);
      uvs.push(v.uv.x, v.uv.y);
    }
  }
  const index = source.index, count = index ? index.count : vertices.length;
  for (let i = 0; i < count; i += 3) {
    const face = [0, 1, 2].map(j => vertices[index ? index.getX(i + j) : i + j]);
    const kept = [], ends = [];
    for (let j = 0; j < 3; j++) {
      const a = face[j], b = face[(j + 1) % 3], da = distance(a), db = distance(b);
      if (da >= 0) kept.push(a);
      if ((da < 0) === (db < 0)) continue;
      const t = da / (da - db);
      const v = {point: a.point.clone().lerp(b.point, t), normal: a.normal.clone().lerp(b.normal, t), uv: a.uv.clone().lerp(b.uv, t)};
      v.point[axis] = plane;
      kept.push(v); ends.push(v.point);
    }
    for (let j = 2; j < kept.length; j++) triangle(kept[0], kept[j - 1], kept[j]);
    if (ends.length === 2) edges.push(ends);
  }
  if (!edges.length) return;
  // Each cut triangle supplies one boundary edge. Keeping even collinear
  // subdivisions closes the original surface without T-junctions in the cap.
  const centre = new T.Vector3();
  for (const [a, b] of edges) centre.add(a).add(b);
  centre.multiplyScalar(1 / (2 * edges.length));
  const backNormal = new T.Vector3();
  backNormal[axis] = -side;
  const back = point => ({point, normal: backNormal, uv: new T.Vector2(
    (axis === 'z' ? point.x : point.z) * 4, (axis === 'y' ? point.x : point.y) * 4)});
  const [u, v] = {x: ['y','z'], y: ['z','x'], z: ['x','y']}[axis];
  const middle = back(centre);
  for (const [a, b] of edges) {
    const cross = (a[u] - centre[u]) * (b[v] - centre[v]) - (a[v] - centre[v]) * (b[u] - centre[u]);
    if (side * cross > 0) triangle(middle, back(b), back(a));
    else triangle(middle, back(a), back(b));
  }
  const trimmed = new T.BufferGeometry();
  trimmed.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  trimmed.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  trimmed.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  trimmed.computeBoundingSphere();
  panel.geometry = trimmed;
  if (!source.userData.shared) source.dispose();
}

// Clip each outside face on its true bevel. The short centre patch is used only at an exposed join.
function fitCollarFaces(T, panel, halfWidth, centre = null) {
  const other = panel.clone();
  other.geometry = panel.geometry.clone();
  trimPanelBack(T, panel, -1, halfWidth);
  trimPanelBack(T, other, 1, halfWidth);
  const pieces = centre ? [panel.geometry,other.geometry,centre] : [panel.geometry,other.geometry];
  for (const key of ['position','normal','uv']) {
    const attributes = pieces.map(g => g.attributes[key]);
    const values = new Float32Array(attributes.reduce((n,a) => n + a.array.length, 0));
    let offset = 0;
    for (const attr of attributes) { values.set(attr.array, offset); offset += attr.array.length; }
    panel.geometry.setAttribute(key, new T.BufferAttribute(values,attributes[0].itemSize));
  }
  panel.geometry.computeBoundingSphere();
  other.geometry.dispose();
  if (centre) centre.dispose();
}

// A closed rounded skin with a flat underside. The ring's cut height follows
// the top of its neighbouring painted panel, including the sloped rear corner.
function roundedCoverSkin(T, profile, cutHeight) {
  const positions=[], uv=[], indices=[];
  const vertex=([x,y,z])=>{
    const i=positions.length/3;
    positions.push(x,y,z); uv.push(z*4,y*4);
    return i;
  };
  const quad=(a,b,c,d)=>indices.push(a,b,c,a,c,d);
  const fractions=[0,...Array.from({length:14},(_,i)=>(i+.5)/14),1];
  const arc=profile.map(([radius,z])=>{
    const base=cutHeight(z), begin=Math.asin(base/radius);
    return fractions.map(f=>{
      const a=begin+f*(Math.PI-2*begin);
      return [radius*Math.cos(a),radius*Math.sin(a),z];
    });
  });
  const sides=arc.map(points=>points.map(vertex));
  const bottom=arc.map((points,i)=>{
    const right=points[0],left=points[points.length-1];
    return [left,[0,cutHeight(profile[i][1]),profile[i][1]],right].map(vertex);
  });
  for(let i=1;i<sides.length;i++){
    const front=sides[i],back=sides[i-1];
    for(let j=1;j<front.length;j++)quad(back[j-1],back[j],front[j],front[j-1]);
    for(let j=1;j<3;j++)quad(bottom[i-1][j-1],bottom[i-1][j],bottom[i][j],bottom[i][j-1]);
  }
  for(const i of [0,arc.length-1]){
    const points=arc[i].map(vertex),z=profile[i][1],mid=vertex([0,cutHeight(z),z]);
    for(let j=1;j<points.length;j++){
      if(i===0)indices.push(mid,points[j],points[j-1]);
      else indices.push(mid,points[j-1],points[j]);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function makeAa12Model(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, gunMetal } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  // CL-313 (D-121, the fidelity upgrade; aa12.glb measured): the Breacher-12 at an AA-12's widths. Builder's units
  // (x 0.684 to metres): the receiver 62 mm wide (it was 96) with a rounded top, the handguard 62, the shroud 63 across
  // the flats (it was 88), the drum 212 across and 89 thick (it was 144 thick), the stock 48, the grip 36 (CL-312 b).
  // The bore (y 0.015), the carry handle's ring and the post (the sight line, 0.168), the grip's centre line, the drum's
  // axis and radius (the magFoot), the stock's length and the handguard's underside (the support) are where they were.
  // The ejection port is on +x (the view's right); the charging handle in its slot and the selector on -x.
  const RW = 0.09;
  const coverSteel = new THREE.MeshStandardMaterial({color: 0x49515a, metalness: .33, roughness: .43});
  const plateSteel = new THREE.MeshStandardMaterial({color: 0x363c41, metalness: .26, roughness: .52});
  // Receiver: the tall slab-sided box with its rounded top, the pressed side plates on their bolts, the seam lines, the
  // vents along the top edge, the rear's stock seam.
  // A short sloping corner closes the side under the rounded cover. The old
  // outline doubled back along its rear edge and the bevel crossed the seam.
  const rearCorner = [-0.26, 0.1], topCorner = [-0.244, 0.07];
  const casingJoin = [[0.23, -0.068], [0.25, -0.082]];
  // The front casing keeps the contact surface the hand already follows. The
  // side below it ends at that casing's outline and keeps its exposed lower lip.
  const receiver = K.slab([rearCorner, [-0.26, -0.074], [-0.242, -0.09], [0.26, -0.09],
    [0.26, casingJoin[1][1]], casingJoin[1], casingJoin[0], [casingJoin[0][0], topCorner[1]], topCorner],
    RW, coverSteel, { bevel: 0.006, segs: 2 });
  // Form the rear seam in the rounded cover itself. A straight strip across
  // the crown previously stood clear of both sides when seen from the eye.
  const cornerSlope = (rearCorner[1]-topCorner[1])/(rearCorner[0]-topCorner[0]);
  const coverGeometry = roundedCoverSkin(THREE, [[.043, -.258], [.045, -.250], [.045, -.2474], [.0442, -.2469],
    [.0442, -.2458], [.045, -.2453], [.045, topCorner[0]], [.045, .252], [.043, .26]],
    z=>Math.max(0,(z-topCorner[0])*cornerSlope));
  const cover = new THREE.Mesh(coverGeometry,coverSteel);
  cover.position.y=topCorner[1]; cover.castShadow=true; cover.receiveShadow=true; gun.add(cover);
  // Only the outward half of each decorative side panel is visible. Its back
  // meets the side wall; the outer paint plane still meets its original trim.
  const panelDepth = 0.003;
  for (const sx of [-1, 1]) {
    const plate = K.slab([[-0.202, 0.062], [0.193, 0.062], [0.2, 0.054], [0.2, -0.053], [-0.202, -0.053]],
      panelDepth, plateSteel, { x: sx * (RW + panelDepth) / 2, bevel: 0.0013 });
    markPaintSurface(plate, 'receiver');
    for (const [by, bz] of [[0.03, 0.177], [-0.04, 0.177], [0.03, -0.181], [-0.04, -0.181]]) D.screw(gun, sx * (RW / 2 + 0.003), by, bz, { axis: 'x', side: sx, r: 0.004, kind: 'hex' });
    D.groove(gun, { x: sx * RW / 2, y: -0.076, z: 0.0, axis: 'x', side: sx, along: 'z', len: 0.49, w: 0.0008 });                 // the fold line along the bottom
    D.vents(gun, { x: sx * RW / 2, y: 0.082, z: 0.12, axis: 'x', side: sx, along: 'z', count: 4, pitch: 0.02, w: 0.016, len: 0.006, deep: 0.002 });   // the vents
  }
  // The carry handle: one uninterrupted top and a clear opening under it; the rear sight's aperture ring at 0.168, the
  // sight line (GB-259/J20); two sling loops.
  const band = gunBand([[-0.17, 0.09], [-0.153, 0.143], [-0.138, 0.151], [0.188, 0.151], [0.217, 0.13], [0.225, 0.09]], 0.009);
  // End each foot at the central facet of the painted cover.
  const crown = topCorner[1] + .045 * Math.cos(Math.PI / 28);
  const handleOutline = [];
  for (let i = 0; i < band.length; i++) {
    const a = band[i], b = band[(i + 1) % band.length];
    if (a[1] >= crown) handleOutline.push(a);
    if ((a[1] < crown) !== (b[1] < crown)) {
      const t = (crown - a[1]) / (b[1] - a[1]);
      handleOutline.push([a[0] + t * (b[0] - a[0]), crown]);
    }
  }
  const handle = K.slab(handleOutline, 0.04, gunDark, { bevel: 0.003 });
  for (const z of [-0.158, 0.211]) D.pin(gun, 0, 0.108, z, { axis: 'x', len: 0.04, r: 0.0035, proud: 0.001, caps: z === -0.158 });
  K.box(0.025, 0.007, 0.025, gunDark, 0, 0.156, -0.12, 0, 0, 0, null, 0.002);
  K.tor(0.009, 0.003, plateSteel, 0, 0.168, -0.12, 0, 0, 0, null, Math.PI * 2, 12);
  for (const sx of [-1, 1]) D.screw(gun, sx * 0.02, 0.142, 0.06, { axis: 'x', side: sx, r: 0.003, kind: 'slot' });   // the handle's clamp screws
  // Ejection port on +x with the bolt's face in it; the charging handle in its slot on -x (the work part's place); the
  // selector over the grip on -x with its marks.
  gun.userData.ejectPort = [RW / 2 + 0.006, 0.021, 0.100];
  const PX = RW / 2 + 0.003;   // the side plates' outer face
  // CL-318 (J28: "ejection port needs to look more believable"): a rimmed 85 x 36 mm opening, the recess, the bolt
  // carrier's bright side in it with the bolt's face and the extractor at the front.
  // The dark inset lies on the side panel; only its border has a raised edge.
  const borderDepth = 0.00275, insetDepth = 0.00035;
  K.slab(gunBand([[0.04, -0.004], [0.04, 0.046], [0.16, 0.046], [0.16, -0.004], [0.04, -0.004]], 0.003),
    borderDepth, gunMid, { x: PX + borderDepth / 2, bevel: 0.001 });
  K.box(insetDepth, 0.0438, 0.1138, gunRubber, PX + insetDepth / 2, 0.021, 0.1, 0, 0, 0, null, 0.00012);
  // The three visible bolt pieces travel together during the AA-12's constant-recoil stroke.
  const recoilBolt = new THREE.Group(); recoilBolt.name = 'recoil-bolt'; gun.add(recoilBolt);
  // The animated highlights share the inset's front plane at their backs.
  // Keep their previous outer faces, child order and pose coordinates.
  const highlight = (front, h, length, material, y, z) => {
    const depth = front - insetDepth;
    K.box(depth, h, length, material, PX + insetDepth + depth / 2, y, z, 0, 0, 0, recoilBolt, 0.001);
  };
  highlight(0.0028, 0.03, 0.07, gunMetal, 0.021, 0.08);
  highlight(0.0029, 0.03, 0.016, gunMid, 0.021, 0.124);
  highlight(0.0035, 0.008, 0.014, gunDark, 0.036, 0.13);
  gun.userData.recoilBolt = recoilBolt;
  // CL-322: the stroke seen through the port. grp is this group or the view gun's copy of it (the same three children);
  // s the stroke back (>= 0). The carrier's side is trimmed to what is still in the opening (z 0.043-0.157), the face and
  // the extractor go back with the stroke and are hidden once past the opening's rear edge.
  gun.userData.recoilBoltPose = (grp, s) => {
    const [side, face, claw] = grp.children;
    if (!side || !face || !claw) return;
    const zf = 0.132 - s, front = Math.min(zf - 0.016, 0.157), len = front - 0.043;
    side.visible = len > 0.002; side.scale.z = Math.max(len, 0.002) / 0.07; side.position.z = 0.043 + Math.max(len, 0.002) / 2;
    face.visible = claw.visible = zf - 0.016 >= 0.043;
    face.position.z = zf - 0.008; claw.position.z = zf - 0.002;
  };
  // The dark side marking lies flat on the panel. Keep its visible face at its original height.
  const stripeDepth = 0.0023;
  K.box(stripeDepth, 0.014, 0.26, gunRubber, -PX - stripeDepth / 2, 0.055, 0.025, 0, 0, 0, null, 0.001);
  // CL-326 (J77): the charging handle is its own group (gun.userData.work, as the GW-4's and KR-7's), at rest where it
  // was at its slot's front, so the reload's hand can pull it back along the slot
  { const work = K.group(-PX - 0.008, 0.05, 0.18); work.name = 'work';
    K.box(0.022, 0.022, 0.035, gunDark, 0, 0, 0, 0, 0, 0, work, 0.004);
    D.ribs(work, { x: -0.011, y: 0, z: 0, axis: 'x', side: -1, along: 'z', count: 4, pitch: 0.006, w: 0.016, h: 0.001, t: 0.0018, mat: gunMid });
    gun.userData.work = work; }
  K.slab(gunBand([[-0.13, -0.045], [-0.095, -0.062]], 0.004), 0.004, gunDark, { x: -PX - 0.0015, bevel: 0.001 });
  K.cyl(0.007, 0.007, 0.004, gunDark, -PX - 0.0015, -0.045, -0.13, null, 10, 'x');
  // GP-20063 AA-12 manual pass: a positive thumb selector above the firing
  // grip, with two recessed index positions. Its seat is part of the left
  // receiver plate; the lever projects only enough to catch the thumb.
  K.box(0.006, 0.027, 0.060, gunDark, -PX - 0.002, -0.045, -0.132, 0, 0, 0, null, 0.003);
  const selectorLever = K.box(0.008, 0.009, 0.033, gunMid, -PX - 0.006, -0.046, -0.118, -0.18, 0, 0, null, 0.002);
  const selectorHub = K.cyl(0.008, 0.008, 0.007, gunAccent, -PX - 0.007, -0.045, -0.13, null, 10, 'x');
  for (const z of [-0.157, -0.108]) K.cyl(0.0025, 0.0025, 0.002, gunMid, -PX - 0.0055, -0.058, z, null, 8, 'x');
  for (const [ry, rz] of [[-0.058, -0.112], [-0.066, -0.13], [-0.058, -0.148]]) D.screw(gun, -RW / 2, ry, rz, { axis: 'x', side: -1, r: 0.0015, kind: 'button', mat: gunMid });   // on the receiver's face, under the plate's edge
  for (const sx of [-1, 1]) {
    D.groove(gun, { x: sx * PX, y: 0.005, z: sx > 0 ? -0.08 : 0.0, axis: 'x', side: sx, along: 'z', len: sx > 0 ? 0.22 : 0.38, w: 0.0008 });   // the plate's pressed line (broken by the port on +x)
    D.groove(gun, { x: sx * PX, y: -0.038, z: 0.0, axis: 'x', side: sx, along: 'z', len: 0.38, w: 0.0008 });
  }
  // Stock: the moulded nose stepping the receiver's width down, the body, the comb, the side panels, the rubber pad.
  // GB-259 (GP-20014): one group, gun.userData.fpStock ('fp-stock'). Every part is where it was, narrower.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  // CL-318 (J28: "stock needs to transition into the gun not leave a giant shelf on the top portion"): the nose fills the
  // receiver's rear profile up to its rounded top and the comb runs straight back from there, as an AA-12's does.
  // Trim the hidden ends of the three static shells to their shared outlines.
  // The top still follows the original slope across the whole visible panel.
  const polymerTop = z => 0.104 + (z + 0.3) * (0.104 - 0.068) / (0.535 - 0.3);
  K.slab([[-0.26, 0.11], [-0.31, 0.104], [-0.31, -0.07], [-0.282, -0.074], [-0.26, -0.078]],
    0.08, gunPoly, { bevel: 0.01, segs: 3, parent: stock });
  K.slab([[-0.31, polymerTop(-0.31)], [-0.535, 0.068], [-0.553, 0.06], [-0.553, -0.1], [-0.538, -0.106],
    [-0.47, -0.092], [-0.36, -0.07], [-0.31, -0.0667]], 0.07, gunPoly, { bevel: 0.012, segs: 3, parent: stock });
  K.slab([[-0.33, 0.108], [-0.522, 0.076], [-0.532, polymerTop(-0.532)], [-0.33, polymerTop(-0.33)]],
    0.054, gunPoly, { bevel: 0.006, segs: 2, parent: stock });
  for (const sx of [-1, 1]) {
    K.slab([[-0.335, 0.04], [-0.5, 0.034], [-0.5, -0.042], [-0.42, -0.054], [-0.335, -0.038]], 0.003, gunPoly, { x: sx * 0.036, bevel: 0.002, parent: stock });
    D.groove(stock, { x: sx * 0.035, y: 0.0, z: -0.42, axis: 'x', side: sx, along: 'z', len: 0.17, w: 0.0008 });   // the moulding seam
  }
  K.slab([[-0.576, 0.064], [-0.553, 0.066], [-0.553, -0.102], [-0.573, -0.108], [-0.579, -0.09], [-0.579, 0.05]], 0.074, gunRubber, { bevel: 0.007, parent: stock });   // the pad
  for (let i = 0; i < 5; i++) K.box(0.07, 0.004, 0.002, gunDark, 0, -0.085 + i * 0.032, -0.579, 0, 0, 0, stock, 0);
  K.tor(0.01, 0.003, gunDark, 0, -0.095, -0.45, 0, Math.PI / 2, 0, stock);   // the sling loop
  gun.userData.fpStock = stock;
  // Pistol grip (CL-312 b: 36 mm wide, 55 deep at the swell, the finger grooves, the panels; the centre line, h and rake
  // gripOutline's so the palm point stays), the moulded trigger guard, the trigger.
  // GB-173 (Jerry: grip and trigger too close to the drum): 70 mm further back than the first; WEAPON_HOLD.aa12 follows.
  K.slab(shapedGrip(-0.17, -0.16, 0.19, 0.08, 0.3, [
    [-0.06, 0.036], [0.08, 0.032], [0.2, 0.026], [0.3, 0.03], [0.4, 0.025], [0.5, 0.029], [0.6, 0.024], [0.7, 0.028], [0.82, 0.026], [0.96, 0.03],
    [1.03, 0.014], [1.03, -0.022], [0.98, -0.04], [0.8, -0.042], [0.55, -0.042], [0.3, -0.038], [0.1, -0.036], [-0.06, -0.04]
  ]), 0.052, gunPoly, { bevel: 0.012, segs: 3 });
  for (const sx of [-1, 1]) {
    const graphic = K.slab(shapedGrip(-0.17, -0.16, 0.19, 0.08, 0.3,
      [[0.16, 0.012], [0.94, 0.014], [0.94, -0.026], [0.16, -0.022]]), 0.003, gunRubber, { x: sx * 0.0255, bevel: 0.002 });
    trimPanelBack(THREE, graphic, sx, 0.026);
  }
  // CL-318 (J28: "trigger guard needs work"): a real loop, 9 units long from the receiver's underside ahead of the
  // trigger to the grip's front, 5 cm deep, 2 cm wide; the trigger in its middle (18 units ahead of where it was).
  const gloveGuard = K.slab(gunBand([[-0.03, -0.088], [-0.034, -0.13], [-0.05, -0.142], [-0.1, -0.142], [-0.118, -0.128], [-0.116, -0.1]], 0.009), 0.03, gunPoly, { bevel: 0.0035, segs: 2 });
  // The oversized virtual index root sits beside the rear of this drawn loop.
  {
    const geometry = gloveGuard.geometry, vertices = geometry.attributes.position;
    geometry.computeBoundingBox();
    const {min, max} = geometry.boundingBox, height = max.y - min.y, length = max.z - min.z;
    for (let i = 0; i < vertices.count; i++) {
      const z = vertices.getZ(i), depth = (max.y - vertices.getY(i)) / height;
      const rear = (max.z - z) / length;
      const u = Math.max(0, Math.min(1, (rear - .59) / (.90 - .59)));
      const v = Math.max(0, Math.min(1, (depth - .13) / (.53 - .13)));
      vertices.setZ(i, z + length * .068 * u * u * (3 - 2 * u) * v * v * (3 - 2 * v));
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  addTriggerArtwork(gun, K, [[-0.0601, -0.09], [-0.0647, -0.1005], [-0.064, -0.1081], [-0.0593, -0.1147], [-0.0647, -0.1193], [-0.072, -0.1119], [-0.0753, -0.0995], [-0.0719, -0.086]], 0.011, gunAccent, { bevel: 0.002 });   // GB-174/180: the trigger
  // The drum: its axis along the bore, 89 mm thick now, the rolled rims, the hub with its winding cover and key on the
  // front face, the eight face bolts, the feed tower up into the receiver, the latches at its sides.
  const mag = new THREE.Group();
  // Enlarge only the drum, about its top tangent. Both magazines fit the same feed well.
  const drumBody = K.group(0, 0, 0, mag);
  drumBody.name = 'magazineBody';
  drumBody.userData.feedY = 0.155;
  gun.userData.magStretch = drumBody;
  gun.userData.magBaseScale = mag.scale.clone();
  K.lathe([[0, -0.065], [0.142, -0.065], [0.154, -0.057], [0.155, -0.044], [0.149, -0.037], [0.149, 0.037], [0.155, 0.044], [0.154, 0.057], [0.142, 0.065], [0, 0.065]], gunAccent, { parent: drumBody, seg: 32 });
  for (const sz of [-1, 1]) {
    // The decorative face, bead and concentric badges meet at their edges.
    // Matching the bead's angular divisions keeps its border continuous.
    const faceLayer = (rt, rb, back, front, material, sides) =>
      K.cyl(rt, rb, front - back, material, 0, 0, sz * (front + back) / 2, drumBody, sides);
    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.065, drumBody, 32);
    K.tor(0.139, 0.002, gunDark, 0, 0, sz * 0.068, 0, 0, 0, drumBody, Math.PI * 2, 32);
    faceLayer(0.059, 0.062, 0.0675, 0.0755, gunDark, 24);
    faceLayer(0.05, 0.052, 0.0755, 0.079, gunBody, 24);
    faceLayer(0.017, 0.019, 0.079, 0.0865, gunDark, 12);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; D.screw(drumBody, Math.sin(a) * 0.125, Math.cos(a) * 0.125, sz * 0.0675, { axis: 'z', side: sz, r: 0.0035, kind: 'hex' }); }
  }
  K.box(0.07, 0.012, 0.008, gunDark, 0, 0, 0.088, 0, 0, 0.55, drumBody, 0.002);                   // the winding key on the front hub
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; K.box(0.006, 0.003, 0.05, gunDark, Math.sin(a) * 0.1495, Math.cos(a) * 0.1495, 0, 0, 0, -a, drumBody, 0.0008); }   // the rim's ribs
  for (const sx of [-1, 1]) {
    K.box(0.009, 0.047, 0.027, gunDark, sx * 0.145, -0.012, -0.03, 0, 0, 0, drumBody, 0.003);     // the latch
    K.box(0.006, 0.028, 0.019, gunMid, sx * 0.149, -0.012, -0.032, 0, 0, 0, drumBody, 0.002);
    for (let i = 0; i < 4; i++) K.box(0.006, 0.002, 0.015, gunDark, sx * 0.152, -0.022 + i * 0.007, -0.032, 0, 0, 0, drumBody, 0);
  }
  // The reload briefly shows the top of the drum. Keep the displayed shell
  // within the old cap silhouette by giving its unseen underside a shallow back.
  const floorTop = .1615;
  K.box(.071, .0065, .093, gunDark, 0, floorTop - .00325, 0, 0, 0, 0, mag, .001);
  for (const side of [-1, 1]) {
    K.box(.011, .015, .087, gunAccent, side * .0225, floorTop + .0075, 0, 0, 0, 0, mag, .002);
  }
  const shellArt = roundGeometry(THREE, 'aa12').clone();
  const points = shellArt.attributes.position;
  for (let i = 0; i < points.count; i++) {
    if (points.getZ(i) > 0) points.setZ(i, points.getZ(i) * .12);
  }
  shellArt.computeVertexNormals();
  shellArt.computeBoundingBox();
  shellArt.computeBoundingSphere();
  const topShell = new THREE.Mesh(shellArt, new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: .48, metalness: .2
  }));
  const artScale = 1.393 / (.9 * .96 * 1.2);
  topShell.name = 'magazine top round';
  topShell.rotation.x = Math.PI / 2;
  topShell.scale.setScalar(artScale);
  topShell.position.y = floorTop + shellArt.boundingBox.max.z * artScale;
  topShell.visible = false;
  mag.add(topShell);
  gun.userData.magazineTopRound = topShell;
  gun.userData.setMagazineRounds = count => { topShell.visible = Number.isFinite(count) && count > 0; };
  mag.position.set(0, -0.26, 0.05);
  mag.rotation.set(0, 0, 0);
  gun.add(mag);
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Handguard: the box flush with the receiver top, its side vents, the ribs under it for the support hand (its underside
  // -0.082 where the fist rides), its screws; the barrel-nut sleeve, the octagonal shroud with its collars, the front
  // sight on its clamp ring (the post's tip 0.168: the sight line), the barrel and the brake.
  const forearm = K.slab([[0.23, 0.105], [0.49, 0.105], [0.49, -0.074], [0.475, -0.082], [0.45, -0.082], [0.425, -0.07], [0.29, -0.07], [0.265, -0.082], casingJoin[1], casingJoin[0]], RW, gunBody, { bevel: 0.005, segs: 2 });
  forearm.userData.clipPart = 'breacher-opaque-front-casing';
  for (const sx of [-1, 1]) {
    for (const z of [0.29, 0.35, 0.41]) K.box(0.004, 0.03, 0.045, gunRubber, sx * (RW / 2 + 0.0003), 0.06, z + 0.02, 0, 0, 0, null, 0.002);   // the side vent slots
    for (const z of [0.253, 0.463]) for (const y of [-0.045, 0.019, 0.085]) D.screw(gun, sx * RW / 2, y, z, { axis: 'x', side: sx, r: 0.003, kind: 'hex' });
    D.groove(gun, { x: sx * RW / 2, y: 0.0, z: 0.36, axis: 'x', side: sx, along: 'z', len: 0.24, w: 0.0008 });   // the moulding seam
  }
  for (const z of [0.30, 0.33, 0.36, 0.39, 0.42]) K.box(0.07, 0.009, 0.01, gunPoly, 0, -0.0715, z, 0, 0, 0, null, 0.002);
  const innerSleeve = K.lathe([[0.02, 0.255], [0.04, 0.255], [0.042, 0.262], [0.042, 0.27], [0.039, 0.275], [0.039, 0.444], [0.02, 0.444]], gunMid, { y: 0.015, seg: 16 });
  innerSleeve.userData.clipPart = 'breacher-inner-sleeve';
  const shroud = ventedSleeve(THREE, gun, gunBody, { z0: 0.448, z1: 0.789, radius: 0.046, wall: 0.004, y: 0.015, faces: 8,
    slots: [[0.467, 0.496], [0.519, 0.548], [0.571, 0.6], [0.623, 0.652], [0.675, 0.704]], ventFaces: [0, 1, 2, 3, 5, 6, 7] });
  for (const z of [0.447, 0.787]) K.lathe([[0.02, z - 0.008], [0.05, z - 0.008], [0.05, z + 0.007], [0.02, z + 0.007]], gunMid, { y: 0.015, seg: 8, phase: Math.PI / 8 });
  K.lathe([[0.045, 0.737], [0.052, 0.737], [0.053, 0.74], [0.053, 0.76], [0.052, 0.763], [0.045, 0.763]], gunDark, { y: 0.015, seg: 18 });   // GB-174: the clamp ring
  K.box(0.036, 0.018, 0.026, gunDark, 0, 0.072, 0.75, 0, 0, 0, null, 0.003);                                                               // its base
  K.box(0.008, 0.092, 0.012, gunDark, 0, 0.122, 0.75, 0, 0, 0, null, 0.002);                                                               // the post: its tip 0.168
  for (const sx of [-1, 1]) K.box(0.005, 0.098, 0.018, gunDark, sx * 0.0145, 0.126, 0.75, 0, 0, 0, null, 0.0015);                         // the ears
  D.screw(gun, 0, 0.063, 0.75, { axis: 'z', side: 1, r: 0.003, kind: 'hex' });
  const barrel = K.lathe([[0, 0.25], [0.018, 0.25], [0.018, 0.74], [0.024, 0.75], [0.024, 0.905], [0, 0.905]], gunAccent, { y: 0.015, seg: 12 });   // GB-173/189: the barrel, mostly inside the shroud
  K.lathe([[0, 0.902], [0.03, 0.902], [0.034, 0.91], [0.034, 0.97], [0.03, 0.976], [0.014, 0.976], [0.014, 0.966], [0, 0.966]], gunMid, { y: 0.015, seg: 14 }).name = 'Breacher muzzle brake';   // the brake
  K.disc(0.0095, gunRubber, 0, 0.015, 0.9661, 0, null, 12);   // GB-173: the bore at the muzzle
  for (let i = 0; i < 3; i++) K.box(0.072, 0.008, 0.01, gunRubber, 0, 0.015, 0.92 + i * 0.018);
  for (const sx of [-1, 1]) D.vents(gun, { x: sx * 0.034, y: 0.015, z: 0.94, axis: 'x', side: sx, along: 'z', count: 3, pitch: 0.018, w: 0.008, len: 0.01, deep: 0.002 });
  gunEffects(gun, new THREE.Vector3(0, 0.015, 0.98), 0.08, 3.4, 7);
  gun.userData.laser.position.set(0, 0.015, 4.4);
  gun.userData.laserBaseZ = 0.95;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  // The drum, sights, controls and exposed metal retain their factory finish.
  gun.userData.partFinish = true;
  // The integral forearm and shroud share their issue metal and paint draw.
  for (const shell of [receiver, cover, forearm, shroud]) markPaintSurface(shell, 'receiver');
  markPaintSurface(handle, 'rail');
  gun.traverse(piece => {
    if (piece.material === gunPoly) markPaintSurface(piece, 'furniture');
  });
  attachLaserLight(gun, 'aa12', ctx);
  const lamp = gun.userData.laserLightUnit;
  for (const name of ['collarClamp','lampHead','lightBezel','laserBezel']) lamp.getObjectByName(name).material = coverSteel;
  lamp.getObjectByName('lampBand').material = plateSteel;
  for (const name of ['collarClamp', 'lightTube', 'lampHead', 'laserBridge']) {
    markPaintSurface(lamp.getObjectByName(name), 'light shell');
  }
  const selector = K.group(...selectorHub.position.toArray());
  for (const part of [selectorHub, selectorLever]) {
    part.position.sub(selector.position);
    selector.add(part);
  }
  bindModelArtwork(gun, 'controls', 'selector', selector);
  bindModelArtwork(gun, 'controls', 'chargingHandle', gun.userData.work);
  bindModelArtwork(gun, 'heatParts', 'barrel', barrel);
  return finishGun(gun);
}

const shotgunFinishes = new WeakMap();
function shotgunFinish(base) {
  if (!shotgunFinishes.has(base)) {
    const surface = (color, roughness, metalness) => {
      const material = base.clone();
      material.color.setHex(color);
      material.roughness = roughness;
      material.metalness = metalness;
      return material;
    };
    shotgunFinishes.set(base, {
      blued: surface(0x39424d, 0.37, 0.57),
      receiver: surface(0x555c65, 0.43, 0.32),
      bolt: surface(0x4d5967, 0.27, 0.62),
      lifter: surface(0x78838a, 0.38, 0.46),
      shell: Object.assign(surface(0xffffff, 0.52, 0.14), { vertexColors: true }),
      edge: surface(0x555d64, 0.46, 0.48),
      inlay: Object.assign(surface(0x858e93, 0.55, 0.38), { flatShading: true }),
      furniture: surface(0x38393b, 0.80, 0.04)
    });
  }
  return shotgunFinishes.get(base);
}

// A closed prop skin. The two windows are shallow blind recesses in its surface,
// so their near lips occlude the artwork behind them as the camera moves.
function shotgunReceiver(T, width, material) {
  const rear = -0.03, front = 0.23, bottom = -0.030, shoulder = 0.031;
  const section = [
    [-width + 0.003, bottom], [width - 0.003, bottom],
    [width, bottom + 0.003], [width, shoulder]
  ];
  const arcSteps = 14;
  for (let i = 1; i <= arcSteps; i++) {
    const a = Math.PI * i / arcSteps;
    section.push([width * Math.cos(a), shoulder + 0.020 * Math.sin(a)]);
  }
  section.push([-width, bottom + 0.003]);
  const positions = [], normals = [], uvs = [];
  function triangle(a, b, c, smooth) {
    const normal = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a)).normalize();
    for (const [i, p] of [a, b, c].entries()) {
      positions.push(p.x, p.y, p.z);
      const n = smooth ? smooth[i] : normal;
      normals.push(n.x, n.y, n.z);
      if (Math.abs(n.z) > Math.max(Math.abs(n.x), Math.abs(n.y))) uvs.push(p.x, p.y);
      else uvs.push(p.z, Math.abs(n.x) > Math.abs(n.y) ? p.y : p.x);
    }
  }
  const quad = (a, b, c, d) => { triangle(a, b, c); triangle(a, c, d); };
  const crownNormal = i => {
    const a = Math.PI * (i - 3) / arcSteps;
    return new T.Vector3(Math.cos(a) / width, Math.sin(a) / 0.020, 0).normalize();
  };
  function pocket(outer, outline, inward) {
    const along = outer[1].clone().sub(outer[0]).normalize();
    const map = p => new T.Vector2(p.clone().sub(outer[0]).dot(along), p.z);
    const points = [...outer, ...outline];
    const faces = T.ShapeUtils.triangulateShape(outer.map(map), [outline.map(map)]);
    for (const [a,b,c] of faces) triangle(points[a], points[b], points[c]);
    const back = outline.map(p => p.clone().add(inward));
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      quad(outline[i], outline[j], back[j], back[i]);
    }
    for (let i = 1; i < back.length - 1; i++) triangle(back[0], back[i], back[i + 1]);
  }
  for (let i = 0; i < section.length; i++) {
    const j = (i + 1) % section.length;
    const a = new T.Vector3(...section[i], rear), b = new T.Vector3(...section[j], rear);
    const c = new T.Vector3(b.x, b.y, front), d = new T.Vector3(a.x, a.y, front);
    if (i === 0) {
      const opening = [[-.011,.102],[.011,.102],[.017,.109],[.017,.178],
        [.012,.190],[-.012,.190],[-.017,.178],[-.017,.109]];
      pocket([a,b,c,d], opening.map(([x,z]) => new T.Vector3(x,bottom,z)), new T.Vector3(0,.010,0));
    } else if (i === 2) {
      const opening = [[.004,.059],[.024,.059],[.030,.065],[.030,.135],
        [.026,.144],[.005,.144],[.001,.139],[.001,.065]];
      pocket([a,b,c,d], opening.map(([y,z]) => new T.Vector3(width,y,z)), new T.Vector3(-.009,0,0));
    } else if (i >= 3 && i < 3 + arcSteps) {
      const start = crownNormal(i), end = crownNormal(j);
      triangle(a,b,c,[start,end,end]); triangle(a,c,d,[start,end,start]);
    } else {
      quad(a,b,c,d);
    }
    triangle(new T.Vector3(0,0,rear),b,a);
    triangle(new T.Vector3(0,0,front),d,c);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(normals,3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs,2));
  const mesh = new T.Mesh(geo,material);
  mesh.name = 'shotgun receiver';
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function makeShotgunModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, brassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  const finish = shotgunFinish(gunBody);
  // CL-312 (D-121, the fidelity upgrade; the audit: "its receiver a flat grey block"): a pump gun at a real pump gun's
  // proportions. In the builder's units (x 0.79 to metres): the barrel 24 mm across on the bore at y 0.03, the magazine
  // tube 23 mm under it at y -0.006, the receiver 40 mm wide and 62 mm tall round them, the forend 44 mm across on the
  // tube. The grip, trigger, guard, stock and the hold's palm points stay where they were (the hands fit); the forend's
  // centre moved up 2 cm with the tube (VM_SOCKETS.shotgun support and WEAPON_HOLD follow, the same card).
  const HW = 0.0255;   // the receiver's half width
  // Receiver: flat sides, the top rolled over the bolt, the bottom flat with the loading port cut into it. Side outline
  // [z, y]. CL-319 (Jerry, 8 Nov, a picture of a tactical pump with a one-piece pistol-grip stock: "not satisfied with the
  // shotgun stock, needs to look like this"): the receiver ends just behind the trigger guard (z -0.03, it ran back to
  // -0.195 over the grip) and the stock's wrist starts there, as on the reference.
  gun.add(shotgunReceiver(THREE, HW, finish.receiver));
  // The curved artwork sits behind the lip. The existing pose hook crops it
  // to the visible part of the side recess throughout the animation.
  const PORT_R = 0.0625, PORT_F = 0.1395, BOLT_F = 0.137;   // the opening inside the rim (rear, front); the face, closed
  const shotgunBolt = K.group(0, 0, 0); shotgunBolt.name = 'shotgun-bolt';
  const boltSide = K.cyl(0.012, 0.012, 0.1, finish.bolt, HW - 0.010, 0.016, 0, shotgunBolt, 16);
  // Bake the kit's cylinder orientation so poseBolt can scale its local Z.
  boltSide.geometry.rotateX(boltSide.rotation.x);
  boltSide.rotation.x = 0;
  boltSide.geometry.scale(0.67, 1, 1);
  const boltFace = K.box(0.007, 0.018, 0.006, finish.edge, HW - 0.006, 0.016, 0, 0, 0, 0, shotgunBolt, 0.002);
  const boltClaw = K.box(0.005, 0.004, 0.008, gunDark, HW - 0.005, 0.023, 0, 0, 0, 0, shotgunBolt, 0.001);
  const poseBolt = (s) => {   // s: how far the forend is back (0 closed .. 0.12 open)
    const zf = BOLT_F - s, front = Math.min(zf - 0.006, PORT_F), len = front - PORT_R;
    boltSide.visible = len > 0.002;
    boltSide.scale.z = Math.max(len, 0.002) / 0.1; boltSide.position.z = PORT_R + Math.max(len, 0.002) / 2;
    boltFace.visible = boltClaw.visible = zf - 0.008 >= PORT_R;
    boltFace.position.z = zf - 0.003; boltClaw.position.z = zf - 0.004;
  };
  poseBolt(0);
  // A rounded, sloping tongue leaves visible shadow along both sides.
  const lifter = K.slab([[.103,-.006],[.111,-.010],[.157,-.012],[.174,-.011],
    [.183,-.009],[.185,-.007],[.184,-.005],[.177,-.003],[.175,0],
    [.177,.003],[.184,.005],[.185,.007],[.183,.009],[.174,.011],
    [.157,.012],[.111,.010],[.103,.006]], .003, finish.lifter,
    {bevel:.001,segs:3,rz:Math.PI / 2,rx:.078,y:-.0115});
  lifter.name = 'shotgun lifter';
  // The receiver's cross pins (two trigger-plate pins), the stamped lines, the serial band, the safety's cross bolt.
  for (const z of [-0.012, 0.05]) D.pin(gun, 0, -0.012, z, { axis: 'x', len: 2 * HW, r: 0.0035, mat: gunDark, caps: true });
  for (const sx of [-1, 1]) {
    const topLines = sx > 0 ? [[-.02,.058],[.145,.22]] : [[-.02,.22]];
    for (const [start, end] of topLines) {
      D.groove(gun, { x: sx * HW, y: .023, z: (start + end) / 2, axis: 'x', side: sx, along: 'z', len: end - start, w: .0007 });
    }
    D.groove(gun, { x: sx * HW, y: -0.018, z: 0.1, axis: 'x', side: sx, along: 'z', len: 0.24, w: 0.0007 });   // the lower line
    D.screw(gun, sx * HW, 0.012, 0.19, { axis: 'x', side: sx, r: 0.0028, kind: 'slot' });                       // the barrel-band screw
  }
  D.pin(gun, 0, -0.043, -0.011, { axis: 'x', len: 0.05, r: 0.004, mat: gunDark });   // the safety's cross-bolt through the trigger plate, behind the trigger
  const buttonFaces = [];
  for (const sx of [-1, 1]) {
    K.tor(0.0055, 0.001, gunMid, sx * 0.0233, -0.043, -0.011, 0, Math.PI / 2, 0);
    buttonFaces.push(K.sph(0.0039, finish.edge, sx * 0.025, -0.043, -0.011, null, 10));
  }
  // The left-side slide-lock paddle is hinged into the rear of the trigger plate; it is
  // separate from the safety cross-bolt and can be depressed to release a locked forend.
  const slideLock = K.group(-0.024, -0.052, -0.027); slideLock.name = 'shotgun-slide-lock';
  K.slab([[-0.013, 0.004], [0.006, 0.004], [0.013, -0.003], [0.008, -0.01], [-0.009, -0.01]], 0.0035, gunMid, { bevel: 0.001, parent: slideLock });
  K.sph(0.0025, gunDark, -0.002, 0.001, -0.006, slideLock, 8);
  gun.userData.slideLock = slideLock;
  K.box(0.018, 0.006, 0.02, gunDark, 0, 0.052, -0.012, 0.15, 0, 0, null, 0.002).name = 'shotgun rear sight';      // the receiver's rear top: the notch block for the sight line
  // Trigger plate, guard, trigger and the pistol grip: the plate hangs below the receiver's new bottom (-0.03).
  K.slab([[0.086, -0.028], [-0.036, -0.028], [-0.04, -0.04], [-0.03, -0.054], [0.08, -0.054], [0.088, -0.044]], 0.044, gunDark, { bevel: 0.004, segs: 2 });
  K.slab(gunBand([[0.072, -0.052], [0.076, -0.08], [0.064, -0.098], [0.012, -0.1], [-0.012, -0.09], [-0.02, -0.052]], 0.009), 0.034, gunDark, { bevel: 0.004, segs: 2 });
  // GB-175/180: the trigger's face toward the grip, the tip curling forward, a solid blade.
  addTriggerArtwork(gun, K, [[0.0384, -0.0471], [0.0303, -0.0589], [0.0319, -0.0699], [0.0405, -0.0795], [0.0355, -0.0845], [0.0241, -0.0741], [0.0197, -0.0571], [0.0276, -0.0409]], 0.012, gunAccent, { bevel: 0.002 }).name = 'shotgun trigger';
  // Stock with a recoil pad; the pistol grip; the sling slot. GB-259: the stock group is gun.userData.fpStock ('fp-stock').
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  // CL-319 (Jerry's reference: a one-piece synthetic pistol-grip stock): its outline measured off the picture at the
  // receiver's height (66 px = 0.0785) and laid from the receiver's rear (z -0.03) to the pad's end (z -0.496, the old
  // length; the hold and the shoulder keep it). The top runs from the receiver's top with a short fall and then a long,
  // nearly straight drop to the heel at the receiver's bottom height; the butt is deep (the toe 2 cm under the grip's
  // base); the underside runs dead straight from the toe up to the web behind the grip, where it turns down into the
  // grip's back. The wrist is 44 mm wide at the receiver and widens smoothly to 56 at the butt (the slab is tapered in x).
  const stockBody = K.slab([
    [-0.029, 0.045], [-0.045, 0.036], [-0.062, 0.0265], [-0.0753, 0.0205], [-0.0882, 0.0164], [-0.1012, 0.0128], [-0.1141, 0.0104],
    [-0.1271, 0.008], [-0.1918, 0.0009], [-0.2565, -0.0062], [-0.3212, -0.0122], [-0.3859, -0.0181], [-0.4506, -0.0253], [-0.4744, -0.0275],
    [-0.4744, -0.197], [-0.4506, -0.1907], [-0.3212, -0.1348], [-0.1918, -0.0788], [-0.1271, -0.0515], [-0.112, -0.0452], [-0.103, -0.0413],
    [-0.097, -0.0397], [-0.092, -0.0412], [-0.087, -0.047], [-0.0815, -0.056], [-0.0748, -0.042], [-0.0718, -0.031], [-0.029, -0.031]
  ], 0.056, finish.furniture, { bevel: 0.012, segs: 4, parent: stock });
  {
    const P = stockBody.geometry.attributes.position;
    for (let k = 0; k < P.count; k++) {
      const t = Math.min(1, Math.max(0, (-0.03 - P.getZ(k)) / 0.3)), e = t * t * (3 - 2 * t);
      P.setX(k, P.getX(k) * (0.786 + 0.214 * e));   // 44 mm at the receiver to 56 at the butt
    }
    P.needsUpdate = true; stockBody.geometry.computeBoundingSphere();
    stockBody.geometry.computeVertexNormals();
    stockBody.name = 'shotgun stock body';
  }
  // The forward slope is visible from the eye. The near-camera pad and sling
  // trim retain the usual first-person stock visibility switch.
  gun.add(stockBody);
  // the black rubber pad, a little proud of the butt all round
  K.slab([[-0.4734, -0.0262], [-0.4935, -0.0268], [-0.4962, -0.034], [-0.4968, -0.19], [-0.4945, -0.1985], [-0.4734, -0.198]], 0.059, gunRubber, { bevel: 0.006, segs: 2, parent: stock }).name = 'shotgun recoil pad';
  // the sling slot through the butt, in a shallow frame
  K.box(0.0572, 0.03, 0.01, gunRubber, 0, -0.088, -0.36, 0, 0, 0, stock, 0.001);
  for (const sx of [-1, 1]) K.slab(gunBand([[-0.388, -0.069], [-0.388, -0.107], [-0.342, -0.107], [-0.342, -0.069], [-0.388, -0.069]], 0.003), 0.002, gunPoly, { x: sx * 0.0281, bevel: 0.0006, parent: stock });
  // Grip centre line is still gripOutline(-0.06, -0.1, 0.16, ..., 0.28): the palm stays at the hold (GB-178).
  // CL-312 b (Jerry: "skinny and ugly"): a tactical pump's rubber-feel polymer grip, 5 cm deep at the palm swell, 3.3 cm
  // wide, with its heel flared and its base a rounded cap, not a point; the finger grooves down the front strap. The
  // centre line, h and rake are unchanged, so the palm point (u 0.42, v 0) and WEAPON_HOLD/VM_SOCKETS stay.
  const gripPts = [
    [-0.14, 0.03], [0.02, 0.028], [0.18, 0.024], [0.3, 0.021], [0.4, 0.024], [0.5, 0.021], [0.6, 0.024], [0.7, 0.022],
    [0.84, 0.026], [0.98, 0.024], [1.04, 0.006], [1.04, -0.012], [1.0, -0.03], [0.92, -0.038], [0.72, -0.038],
    [0.5, -0.036], [0.3, -0.032], [0.1, -0.03], [-0.14, -0.028]
  ];
  K.slab(shapedGrip(-0.06, -0.1, 0.16, 0.08, 0.28, gripPts), 0.042, finish.furniture, { bevel: 0.009, segs: 3 }).name = 'shotgun grip';
  // CL-319: the reference's moulded ribs across the grip's sides (they were checkering), square to its centre line.
  for (let r = 0; r < 8; r++) {
    const u = 0.3 + r * 0.085, d = (0.5 - u) * 0.16, cz = -0.06 + d * Math.sin(0.28) - 0.006 * Math.cos(0.28), cy = -0.1 + d * Math.cos(0.28) + 0.006 * Math.sin(0.28);
    for (const sx of [-1, 1]) K.box(0.0016, 0.0024, 0.032, finish.furniture, sx * 0.0212, cy, cz, 0.28, 0, 0, null, 0.0006);
  }
  gun.userData.fpStock = stock;
  // The forend (the pump): 44 mm across round the magazine tube, 19 cm long, with its grooves round the lower two
  // thirds and the two action bars running back into the receiver. Its root stays at the old place (z 0.28) and it
  // still racks along the tube (gun.userData.pump, basePumpPos); the hold's palm is under its middle.
  // CL-322: the forend rests one stroke (0.12, 9.5 cm, a real pump's) ahead of the receiver's face (z 0.23) so the stroke
  // brings it back to the face, not 9 cm into the receiver (its root was 0.28, 3 cm off the face); the action bars run
  // over the tube between them, as on the real gun. The hands follow (VM_SOCKETS.shotgun.support; WEAPON_HOLD's 'pump').
  const pump = K.group(0, -0.006, 0.375);
  // One continuous shell produces a broad highlight on each moulded ridge.
  const pumpOutline = [[0, -0.02], [0.02, -0.02], [0.026, -0.012], [0.028, 0]];
  for (let i = 0; i < 9; i++) {
    const z = 0.008 + i * 0.020;
    pumpOutline.push([0.028, z], [0.030, z + 0.003], [0.030, z + 0.010], [0.028, z + 0.014]);
  }
  pumpOutline.push([0.028, 0.19], [0.026, 0.20], [0.020, 0.21], [0, 0.21]);
  const pumpSkin = K.lathe(pumpOutline, finish.furniture, { seg: 18, parent: pump });
  // Keep the moulded sides and lower hand contact. Only the upper display seam is flat.
  const pumpVertices = pumpSkin.geometry.attributes.position, pumpNormals = pumpSkin.geometry.attributes.normal;
  const seamY = .0145 - pump.position.y;
  for (let i = 0; i < pumpVertices.count; i += 3) {
    const flat = [i, i + 1, i + 2].every(j => pumpVertices.getY(j) >= seamY);
    for (let j = i; j < i + 3; j++) {
      if (pumpVertices.getY(j) > seamY) pumpVertices.setY(j, seamY);
      if (flat) pumpNormals.setXYZ(j, 0, 1, 0);
    }
  }
  pumpSkin.geometry.computeBoundingSphere();
  for (const sx of [-1, 1]) K.box(0.004, 0.011, 0.26, finish.edge, sx * 0.017, 0.0, -0.1, 0, 0, 0, pump, 0.001);   // the action bars (out of the forend's back into the receiver)
  gun.userData.shotgunBolt = shotgunBolt;
  gun.userData.pump = pump;
  gun.userData.basePumpPos = pump.position.clone();
  // CL-322: index.html calls this after posing the forend (the fire cycle, the reload's rack, the resets); the eye's
  // copy mirrors the bolt's parts. The hull leaves from the port (spawnCasing reads ejectPort).
  gun.userData.pumpPoseHook = () => poseBolt(Math.max(0, Math.min(0.12, gun.userData.basePumpPos.z - pump.position.z)));
  gun.userData.ejectPort = [HW + 0.003, 0.018, 0.1];
  // Barrel and magazine tube locked to the receiver (siblings of the pump): the barrel 24 mm on the bore, the tube under
  // it, the barrel band joining them at the front, the tube cap, the vent rib and the bead.
  const receiver = K.group(0, 0, 0);
  const barrel = K.lathe([[0, 0.16], [0.0155, 0.16], [0.0155, 0.935], [0, 0.935]], finish.blued, { y: 0.03, seg: 16, parent: receiver });
  K.lathe([[0, 0.14], [0.02, 0.14], [0.02, 0.21], [0.0165, 0.215], [0, 0.215]], gunBody, { y: 0.03, seg: 16, parent: receiver });   // the chamber's step out of the receiver
  K.box(0.008, 0.005, 0.7, gunDark, 0, 0.049, 0.565, 0, 0, 0, receiver, 0.001);                     // the vent rib
  for (let i = 0; i < 13; i++) K.box(0.005, 0.006, 0.012, gunDark, 0, 0.0455, 0.24 + i * 0.05, 0, 0, 0, receiver, 0.001);   // its posts
  K.sph(0.0045, brassMat, 0, 0.055, 0.91, receiver, 10).name = 'shotgun bead';
  K.lathe([[0, 0.11], [0.0145, 0.11], [0.0145, 0.8], [0, 0.8]], gunDark, { y: -0.006, seg: 14, parent: receiver });   // the magazine tube
  K.lathe([[0, 0.795], [0.017, 0.795], [0.017, 0.83], [0.014, 0.84], [0.006, 0.842], [0, 0.842]], finish.edge, { y: -0.006, seg: 14, parent: receiver });   // its cap
  for (let i = -2; i <= 2; i++) {
    const a = i * Math.PI / 9;
    K.box(0.0012, 0.0012, 0.03, finish.inlay, 0.017 * Math.sin(a), -0.006 - 0.017 * Math.cos(a), 0.815, 0, 0, a, receiver, 0.0002);
  }
  // The barrel's retaining lug loops over the magazine tube; the tube cap clamps against
  // its front face. The upper collar and narrow bridge connect the lug back to the barrel.
  K.tor(0.0175, 0.003, gunBody, 0, -0.006, 0.76, 0, 0, 0, receiver, Math.PI * 2, 16);
  K.tor(0.0185, 0.003, gunBody, 0, 0.03, 0.76, 0, 0, 0, receiver, Math.PI * 2, 16);
  K.box(0.012, 0.021, 0.016, gunBody, 0, 0.012, 0.76, 0, 0, 0, receiver, 0.002);
  D.screw(receiver, 0.01, 0.012, 0.76, { axis: 'x', side: 1, r: 0.0025, kind: 'hex' });
  K.tor(0.01, 0.0035, gunDark, 0, -0.026, 0.76, 0, Math.PI / 2, 0, receiver);                           // the sling swivel
  K.lathe([[0, 0.92], [0.0155, 0.92], [0.0175, 0.93], [0.0175, 0.95], [0.015, 0.952], [0.011, 0.952], [0.011, 0.945], [0, 0.945]], gunDark, { y: 0.03, seg: 16, parent: receiver });   // the muzzle crown
  gun.userData.receiver = receiver;
  gunEffects(gun, new THREE.Vector3(0, 0.03, 0.97), 0.07, 3.2, 7);
  gun.userData.laser.position.set(0, 0.03, 4.5);
  gun.userData.laserBaseZ = 0.99;
  gun.userData.barrelAssembly = null;
  // The tube-load shell (hidden until the reload's insert beats), at the loading port's mouth.
  const loadShell = new THREE.Mesh(roundGeometry(THREE, 'shotgun'), finish.shell);
  loadShell.name = 'shotgun reload shell';
  // Undo the issued gun's art scale so the held prop has the same size as the loose prop.
  const issuedMetresPerLocalUnit = 0.95 * 1.25 / 1.376;
  loadShell.scale.setScalar(1 / issuedMetresPerLocalUnit);
  gun.userData.setReloadShellType = load => { loadShell.geometry = roundGeometry(THREE, 'shotgun', load); };
  loadShell.rotation.x = Math.PI / 2;
  loadShell.position.set(0.0, -0.034, 0.12);
  loadShell.visible = false;
  gun.add(loadShell);
  gun.userData.reloadShell = loadShell;
  gun.userData.baseReloadShellPos = loadShell.position.clone();
  gun.userData.baseReloadShellRot = loadShell.rotation.clone();
  // GB-302: Claude drives the loading-port shell via VM_RELOADS (view gun.shell).
  gun.userData.reloadParts = Object.assign(gun.userData.reloadParts || {}, {
    reloadShell: { restPos: [0.0, -0.034, 0.12], restRot: [Math.PI / 2, 0, 0], visibleAtRest: false }
  });
  gunSuppressor(gun, K, 'shotgun');   // CL-95
  attachLaserLight(gun, 'shotgun', ctx);
  gun.userData.partFinish = true;
  gun.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (mesh.material === finish.receiver) markPaintSurface(mesh, 'receiver');
    else if (mesh.material === finish.furniture) markPaintSurface(mesh, 'furniture');
    else if (mesh.parent === gun.userData.laserLightUnit && ['lightTube', 'laserTube', 'sideRail'].includes(mesh.name)) {
      markPaintSurface(mesh, 'light shell');
    } else if (mesh.parent === gun.userData.suppressor && (mesh.material === gunDark || mesh.material === gunAccent)) {
      markPaintSurface(mesh, 'suppressor shell');
    }
  });
  bindModelArtwork(gun, 'controls', 'safety', groupArtwork(THREE, ...buttonFaces));
  bindModelArtwork(gun, 'controls', 'slideRelease', slideLock);
  bindModelArtwork(gun, 'controls', 'pump', pump);
  bindModelArtwork(gun, 'heatParts', 'barrel', groupArtwork(THREE, barrel));
  bindModelArtwork(gun, 'heatParts', 'suppressor', gun.userData.suppressor);
  return finishGun(gun);
}

// Closed square cladding around an existing faceted round skin. Both contours
// are sampled on the same rays, so the inside follows the neighbour's actual faces.
function squareCladding(T, radius, depth, bevel, facets) {
  const sides = facets * 4, positions = [], uvs = [], indices = [];
  const steps = [[0,bevel],[.14,.48*bevel],[.46,.16*bevel],[1,0]];
  const rear = steps.map(([t,inset])=>[-depth/2+t*bevel,inset]);
  const rows = [...rear,...rear.map(([z,inset])=>[-z,inset]).reverse()];
  const inner = [], directions = [];
  for (let i=0;i<sides;i++) {
    const angle=i*2*Math.PI/sides, facetAngle=2*Math.PI/facets;
    directions.push([Math.cos(angle),Math.sin(angle)]);
    const offset=angle-(Math.floor(i/4)+.5)*facetAngle;
    inner.push(radius*Math.cos(facetAngle/2)/Math.cos(offset));
  }
  function ring(radii,z) {
    return radii.map((r,i)=>{
      const [cx,cy]=directions[i], index=positions.length/3;
      positions.push(r*cx,r*cy,z);uvs.push(z*4,r*cy*4);
      return index;
    });
  }
  function join(a,b) {
    for(let i=0;i<sides;i++){
      const j=(i+1)%sides;
      indices.push(a[i],a[j],b[j],a[i],b[j],b[i]);
    }
  }
  const outside = rows.map(([z,inset])=>{
    const half=radius-inset, corner=bevel-.8*inset;
    const radii=directions.map(([cx,cy],i)=>{
      const major=Math.max(Math.abs(cx),Math.abs(cy)),minor=Math.min(Math.abs(cx),Math.abs(cy));
      let distance=half/major;
      if(distance*minor>half-corner){
        const centre=half-corner, along=centre*(major+minor);
        distance=along+Math.sqrt(Math.max(0,along*along-2*centre*centre+corner*corner));
      }
      // A narrow painted edge stays continuous at the four tangencies.
      return Math.max(distance,inner[i]+.00025);
    });
    return {z,radii,vertices:ring(radii,z)};
  });
  for(let i=1;i<outside.length;i++)join(outside[i-1].vertices,outside[i].vertices);
  const first=outside[0],last=outside[outside.length-1];
  join(ring(inner,last.z),ring(inner,first.z));
  // End annuli have their own normals; the visible side highlights stop at the edge.
  join(ring(inner,first.z),ring(first.radii,first.z));
  join(ring(last.radii,last.z),ring(inner,last.z));
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
  return geo;
}

// Each thin dark band keeps its outside bevel. Its back follows the tapered
// silhouette of the existing artwork in the band's own outward direction.
const sniperStripSkins = new WeakMap();
function fittedSniperStrip(T, strip, host, index) {
  const original = strip.geometry;
  let skins = sniperStripSkins.get(original);
  if (!skins) { skins = []; sniperStripSkins.set(original, skins); }
  if (skins[index]) return skins[index];

  strip.updateMatrix();
  host.updateMatrix();
  const toStrip = strip.matrix.clone().invert().multiply(host.matrix);
  const shell = host.geometry.attributes.position, point = new T.Vector3(), rim = new Map();
  for (let i = 0; i < shell.count; i++) {
    point.fromBufferAttribute(shell, i).applyMatrix4(toStrip);
    rim.set(point.z, Math.max(rim.get(point.z) ?? -Infinity, point.x));
  }
  const profile = [...rim].sort(([z1], [z2]) => z1 - z2);
  const skin = original.clone(), position = skin.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i);
    const hi = profile.findIndex(([section]) => section >= z);
    if (hi < 1) continue;
    const [z0, x0] = profile[hi - 1], [z1, x1] = profile[hi];
    const faceX = x0 + (x1 - x0) * (z - z0) / (z1 - z0);
    if (position.getX(i) < faceX) position.setX(i, faceX);
  }
  skin.userData = { ...original.userData, shared: true };
  skin.computeBoundingBox();
  skin.computeBoundingSphere();
  skins[index] = skin;
  return skin;
}

export function makeSniperModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, gunSuppressor, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, gunMetal, gunTan, steelMat, glassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  const cheekFinish = new THREE.MeshStandardMaterial({color: 0x695e47, metalness: .02, roughness: .86});
  // CL-314 (D-121, the fidelity upgrade): the sniper at a chassis rifle's widths. Builder's units (x 0.723 to metres):
  // the chassis 51 mm wide at the mag well (it was 72), the forend 50 across its rails (64), the action 39 (61), the
  // barrel 38 at the chamber to 27 at the muzzle (49 to 33), the brake 33, the stock 43 and its pad 48, the cheek
  // riser 39, the scope's tube 34 (37) with a 56 mm objective, the mag 30 (36). The bore (y 0.04), the scope's axis
  // (y 0.14, the sight line), the grip's centre line, the mag, the bolt knob (x 0.13) and the support are where they were.
  // A short magwell and open rear chassis visibly separate the magazine and grip.
  // The black grip stays at the established hand anchor behind the magazine.
  K.slab([[-0.025, 0.028], [0.2, 0.028], [0.2, -0.04], [0.185, -0.05], [0.07, -0.05], [0.064, -0.062], [-0.016, -0.062], [-0.025, -0.049]], 0.07, gunTan, { bevel: 0.007 });
  K.slab([[-0.3, 0.03], [-0.251, 0.03], [-0.239, 0.019], [-0.239, -0.039], [-0.3, -0.051]], 0.066, gunTan, { bevel: 0.006 });
  K.slab([[-0.26, -0.034], [-0.024, -0.034], [-0.024, -0.052], [-0.26, -0.052]], 0.064, gunTan, { bevel: 0.003 });
  // GP-20059: the MRAD upper continues its top rail over the handguard.
  // Upper channel: two integral side walls carry the rail deck over the barrel.
  for (const side of [-1, 1]) K.box(0.010, 0.032, 0.448, gunTan, side * 0.026, 0.057, 0.422, 0, 0, 0, null, 0.002);
  K.box(0.060, 0.009, 0.457, gunTan, 0, 0.0765, 0.421, 0, 0, 0, null, 0.002);
  function coatRail(length, y, z) {
    const first = gun.children.length;
    K.rail(length, 0, y, z, null, .031);
    for (const piece of gun.children.slice(first)) markPaintSurface(piece, 'rail');
  }
  coatRail(.49, .088, .405);
  // Fore-end side slots have depth and open backgrounds, with a stiff bottom web.
  K.box(0.05, 0.012, 0.455, gunTan, 0, -0.035, 0.417, 0, 0, 0, null, 0.004);
  D.vents(gun, { x: 0, y: -0.041, z: 0.42, axis: 'y', side: -1, along: 'z', count: 5, pitch: 0.08, w: 0.012, len: 0.056, deep: 0.003 });   // 6-o'clock M-LOK
  for (const sx of [-1, 1]) {
    K.slab([[0.197, 0.041], [0.635, 0.041], [0.647, 0.029], [0.64, 0.012], [0.197, 0.012]], 0.009, gunTan, { x: sx * 0.027, bevel: 0.003 });
    K.slab([[0.197, -0.014], [0.64, -0.014], [0.65, -0.024], [0.635, -0.042], [0.197, -0.042]], 0.009, gunTan, { x: sx * 0.027, bevel: 0.003 });
    for (let i = 0; i <= 5; i++) {
      const z = 0.208 + i * 0.083;
      K.slab([[z - 0.012, -0.026], [z + 0.012, -0.026], [z + 0.012, 0.027], [z - 0.012, 0.027]], 0.009, gunTan, { x: sx * 0.027, bevel: 0.004 });
    }
    for (const z of [0.204, 0.632]) for (const y of [-0.027, 0.029]) D.screw(gun, sx * 0.0315, y, z, { axis: 'x', side: sx, r: 0.0032, kind: 'hex' });
    for (const z of [-0.266, 0.153]) D.screw(gun, sx * (z < 0 ? 0.033 : 0.035), -0.014, z, { axis: 'x', side: sx, r: 0.004, kind: 'hex' });
  }
  K.box(0.056, 0.058, 0.017, gunTan, 0, -0.001, 0.645, 0, 0, 0, null, 0.005);
  // The MRAD handguard uses underside slots here instead of a continuous lower Picatinny rail.
  // Folded bipod under the fore-end.
  K.box(0.04, 0.03, 0.04, gunDark, 0, -0.055, 0.6);
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
  addTriggerArtwork(gun, K, [[-0.0441, -0.052], [-0.0487, -0.0625], [-0.048, -0.07], [-0.0435, -0.0755], [-0.0485, -0.0805], [-0.056, -0.074], [-0.0593, -0.0615], [-0.0559, -0.048]], 0.01, gunAccent, { bevel: 0.002 });
  // The old tang was buried in a solid receiver. Trim only that hidden upper end
  // into the new chassis bridge; the grip's palm center and lower contour stay put.
  // CL-312 b (Jerry: "check and fix all pistol grips"): the thumbhole stock's grip as a moulded grip (34 mm wide, 54 deep
  // at the swell; it was a 45 mm plank), the finger grooves on its front strap, a flared heel and a flat base; the
  // rubber panels and their screw on its sides. The centre line, h and rake are gripOutline's, so the palm point stays.
  const palm = K.slab(shapedGrip(-0.12, -0.1, 0.16, 0.08, 0.25, [
    [-0.06, 0.036], [0.1, 0.032], [0.22, 0.026], [0.32, 0.03], [0.42, 0.025], [0.52, 0.029], [0.62, 0.024], [0.72, 0.027], [0.86, 0.026], [0.98, 0.03],
    [1.04, 0.016], [1.04, -0.02], [0.99, -0.04], [0.82, -0.043], [0.55, -0.042], [0.3, -0.038], [0.1, -0.036], [-0.06, -0.038]
  ]).map(([z, y]) => [z, Math.min(y, -0.04)]), 0.048, gunPoly, { bevel: 0.011, segs: 3 });
  trimPanelBack(THREE, palm, -1, .052, 'y');
  for (const sx of [-1, 1]) {
    const cheek = K.slab(shapedGrip(-0.12, -0.1, 0.16, 0.08, 0.25, [[0.2, 0.012], [0.95, 0.014], [0.95, -0.026], [0.2, -0.022]]), 0.003, gunRubber, { x: sx * 0.0235, bevel: 0.002 });
    trimPanelBack(THREE, cheek, sx, .024);
    trimPanelBack(THREE, cheek, -1, .052, 'y');
    D.screw(gun, sx * 0.025, -0.1 - 0.1 * 0.16 * Math.cos(0.25), -0.12 - 0.1 * 0.16 * Math.sin(0.25), { axis: 'x', side: sx, r: 0.003, kind: 'slot' });   // the panel screw at the palm point
  }
  // CL-318 (J30: "the mag should have more width"): 36 mm (0.05) like a big-bore box, the floorplate 40, the ribs at its edges.
  const mag = K.group(0, -0.12, 0.02);
  const issueArt = roundGeometry(THREE, 'sniper');
  issueArt.computeBoundingBox();
  const bounds = issueArt.boundingBox;
  const displayScale = .098 / (bounds.max.y - bounds.min.y);
  const issueFinish = new THREE.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: .39, metalness: .42});
  const displayArt = issueArt.clone();
  const positions = displayArt.attributes.position;
  // Only the forward portion of the graphic is exposed in the existing box.
  // Close the hidden end on its last colour ring and flatten the unseen back.
  const rear = bounds.max.y - .069 / displayScale;
  let lastRing = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y <= rear) lastRing = Math.max(lastRing, y);
  }
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y < lastRing) positions.setXYZ(i, 0, rear, 0);
    else {
      positions.setY(i, Math.max(rear, y));
      if (positions.getZ(i) > 0) positions.setZ(i, positions.getZ(i) * .15);
    }
  }
  displayArt.computeBoundingBox();
  displayArt.computeBoundingSphere();
  const displayBounds = displayArt.boundingBox;
  const shelfTop = .070 - (displayBounds.max.z - displayBounds.min.z) * displayScale;
  K.slab([[-.04,shelfTop],[.04,shelfTop],[.04,-.07],[-.04,-.07]], .05, gunAccent, {bevel:.005, parent:mag});
  for (const side of [-1, 1]) {
    K.box(.004, .070 - shelfTop, .073, gunDark, side * .019, (shelfTop + .070) / 2, 0, 0, 0, 0, mag, .001);
  }
  // The back edge of the window covers the cropped end in the close view.
  K.box(.034, .070 - shelfTop, .004, gunDark, 0, (shelfTop + .070) / 2, -.0365, 0, 0, 0, mag, 0);
  const topRound = new THREE.Mesh(displayArt, issueFinish);
  topRound.name = 'magazine top round';
  topRound.rotation.x = Math.PI / 2;
  topRound.scale.setScalar(displayScale);
  topRound.position.set(0, shelfTop + displayBounds.max.z * displayScale,
    -(displayBounds.min.y + displayBounds.max.y) * displayScale / 2);
  topRound.visible = false;
  mag.add(topRound);
  gun.userData.magazineTopRound = topRound;
  K.slab([[-0.043, -0.068], [0.043, -0.068], [0.043, -0.083], [-0.043, -0.083]], 0.056, gunDark, { bevel: 0.004, parent: mag });
  for (const sx of [-1, 1]) for (const z of [-0.026, 0.026]) K.box(0.0025, 0.113, 0.004, gunBody, sx * 0.025, -0.004, z, 0, 0, 0, mag, 0.001);
  for (const sx of [-1, 1]) K.box(0.002, 0.03, 0.05, gunDark, sx * 0.0255, -0.02, 0, 0, 0, 0, mag, 0.001);   // the witness window's frame
  K.box(0.021, 0.017, 0.007, gunDark, 0, -0.064, -0.031, 0, 0, 0, null, 0.002);
  const magazineCatch = K.box(0.024, 0.012, 0.01, gunDark, 0, -0.06, 0.047, 0, 0, 0, null, 0.002);   // forward-pressed magazine catch
  K.box(0.024, 0.006, 0.036, gunDark, 0, -0.055, -0.22, 0, 0, 0, null, 0.002);   // upper/lower receiver latch behind grip
  for (const sx of [-1, 1]) K.cyl(0.009, 0.009, 0.003, gunDark, sx * 0.0335, -0.039, -0.12, null, 12, 'x');   // ambidextrous safety hubs
  for (const sx of [-1, 1]) K.box(0.004, 0.009, 0.02, gunDark, sx * 0.034, -0.043, -0.104, 0, 0, 0, null, 0.002);   // selector tabs
  for (const sx of [-1, 1]) for (const z of [0.105, 0.158]) D.screw(gun, sx * 0.035, 0.004, z, { axis: 'x', side: sx, r: 0.006, kind: 'torx' });   // two barrel clamp screws
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // MRAD folding stock: open upper/lower struts, adjustable cheek riser and sliding butt pad.
  // GB-259 (GP-20014): the stock body, cheek riser, butt, pad and monopod are one group, gun.userData.fpStock ('fp-stock'),
  // for the view gun to leave out of the eye; third person and the shadow keep it. Every part is where it was.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  K.slab(gunBand([[-0.245, 0.03], [-0.405, 0.05], [-0.592, 0.052]], 0.018), 0.058, gunTan, { bevel: 0.007, segs: 3, parent: stock });   // MRAD's open upper strut
  K.slab(gunBand([[-0.257, 0.026], [-0.285, -0.025], [-0.315, -0.06]], 0.016), 0.057, gunTan, { bevel: 0.006, parent: stock });   // front diagonal strut
  K.cyl(0.021, 0.021, 0.105, gunDark, 0, -0.005, -0.26, stock, 14, 'y');   // vertical fold hinge for port-side swing
  K.cyl(0.008, 0.008, 0.006, gunMid, 0.031, -0.002, -0.26, stock, 12, 'x');   // hinge release button
  K.slab([[-0.32, 0.058], [-0.535, 0.058], [-0.535, 0.122], [-0.37, 0.128], [-0.32, 0.106]], 0.054, cheekFinish, { bevel: 0.009, segs: 3, parent: stock });   // GB-180: a tall cheek riser
  for (const z of [-0.36, -0.48]) for (const sx of [-1, 1]) K.cyl(0.008, 0.008, 0.004, steelMat, sx * 0.028, 0.09, z, stock, 8, 'x');   // riser clamp knobs
  for (const z of [-0.38, -0.5]) K.cyl(0.007, 0.007, 0.05, gunMid, 0, 0.065, z, stock, 10, 'y');   // cheek-height posts
  K.cyl(0.014, 0.014, 0.008, gunDark, 0.031, 0.09, -0.48, stock, 16, 'x');   // cheek-height knob
  K.slab(gunBand([[-0.3, -0.052], [-0.45, -0.075], [-0.575, -0.098]], 0.015), 0.05, gunTan, { bevel: 0.009, parent: stock });
  K.slab([[-0.566, 0.068], [-0.594, 0.068], [-0.598, -0.1], [-0.57, -0.104]], 0.056, gunTan, { bevel: 0.009, parent: stock });
  K.slab([[-0.598, 0.074], [-0.636, 0.074], [-0.64, -0.118], [-0.602, -0.122]], 0.066, gunRubber, { bevel: 0.009, parent: stock });   // GB-180: a thick pad
  for (const sx of [-1, 1]) K.box(0.005, 0.14, 0.009, gunMid, sx * 0.028, -0.022, -0.593, 0, 0, 0, stock, 0.002);   // pad-height slider tracks
  K.box(0.006, 0.015, 0.018, gunDark, 0.033, -0.032, -0.6, 0, 0, 0, stock, 0.002);   // right-side pad latch
  for (const sx of [-1, 1]) {
    for (const [z, y] of [[-0.29, 0.025], [-0.29, -0.025], [-0.584, 0.052], [-0.588, -0.081]]) {
      const diagonal = z === -0.29 && y < 0;
      D.screw(stock, sx * (diagonal ? 0.0285 : 0.028), y, z, { axis: 'x', side: sx, r: 0.004, head: diagonal ? 0.0011 : 0.0016, kind: 'hex' });
    }
    const stripe = K.slab(gunBand([[-0.309, -0.05], [-0.444, -0.076], [-0.564, -0.098]], 0.002), 0.003, gunBody, { x: sx * 0.025, bevel: 0.001, parent: stock });
    trimPanelBack(THREE, stripe, sx, .025);
  }
  stock.position.z = -0.26;
  for (const piece of stock.children) piece.position.z += 0.26;   // rest pose unchanged; rotate about the fold hinge
  gun.userData.fpStock = stock;
  K.box(0.04, 0.02, 0.1, gunTan, 0, -0.03, -0.26, 0, 0, 0, null, 0.006);
  // GB-173 (Jerry: a gap in the stock above the grip): the chassis is solid through the wrist, rear block to magwell,
  // under the action and above the grip and trigger.
  const wrist = K.slab([[-.239, .014], [-.026, .014], [-.026, -.04], [-.239, -.04]], .056, gunTan, { bevel: .006 });
  trimPanelBack(THREE, wrist, 1, -.034, 'y');
  // Round action with its bolt shroud, and the rail.
  // GB-180 pass 6: a beefier round action (r 0.036 -> 0.042), a big bolt shroud and a recoil lug under it.
  // CL-318 (J30: "the bolt and its recess need to look a little better"; Jerry, 8 Nov: "a bolt action sniper does not
  // have a separate ejection port: the action of the bolt kicks out the round when lifted and pulled to the rear"): the
  // action is three pieces now. The rear part under a flat-sided rear bridge (an AXMC's) with the handle's notch cut in
  // its +x side, where the handle's root sits closed; the front ring from the chamber forward; between them the
  // receiver's right wall is cut away from 20 degrees under the bore line to 60 above it, the way a bolt gun's is, and
  // the bolt's bright body shows in the opening: no rim, no carrier, the round leaves this way when the bolt comes back.
  // CL-319 (Jerry's bolt-action diagram): the opening sits over the magazine, where the bolt's face travels (z -0.035 to
  // 0.067; the chamber starts at its front), and the bolt (below) is a real bolt's length, from the rear bridge to the face.
  const rearRadius=.027, rearFacets=18;
  K.lathe([[0, -0.272], [0.018, -0.272], [0.024, -0.25], [rearRadius, -0.24], [rearRadius, -0.035], [0, -0.035]], gunBody, { y: 0.045, seg: rearFacets });
  K.lathe([[0, 0.067], [0.027, 0.067], [0.027, 0.14], [0.022, 0.152], [0, 0.152]], gunBody, { y: 0.045, seg: 18 });
  {
    const shellMat = gunBody.clone(); shellMat.side = THREE.DoubleSide;   // the wall shows its inside through the cut
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.102, 14, 1, true, 2.618, 4.887), shellMat);   // cylinder theta 0 is -y; 2.618 = 60 degrees over +x, round the top and -x to 20 under +x
    shell.position.set(0, 0.045, 0.016); shell.rotation.x = Math.PI / 2; shell.castShadow = true; shell.receiveShadow = true; gun.add(shell);
    for (const a of [-0.349, 1.047]) K.box(0.0045, 0.002, 0.102, gunBody, 0.0248 * Math.cos(a), 0.045 + 0.0248 * Math.sin(a), 0.016, 0, 0, a);   // the wall's thickness at the cut's edges
  }
  const railBase = K.box(0.031, 0.014, 0.34, gunDark, 0, 0.074, -0.02, 0, 0, 0, null, 0.002);
  trimPanelBack(THREE, railBase, 1, .045 + rearRadius, 'y');
  const cladding=new THREE.Mesh(squareCladding(THREE,rearRadius,.104,.005,rearFacets),gunBody);
  cladding.position.set(0,.045,-.184);
  cladding.castShadow=cladding.receiveShadow=true;
  gun.add(cladding);
  K.box(0.004, 0.026, 0.1, gunRubber, 0.0265, 0.055, -0.18, 0, 0, 0, null, 0.001);   // the handle notch
  for (const z of [-0.225, -0.144]) D.screw(gun, rearRadius, 0.035, z, { axis: 'x', side: 1, r: 0.0028, head: 0.0012, kind: 'hex' });   // the bridge's bedding screws
  K.lathe([[0, -0.3], [0.014, -0.3], [0.02, -0.29], [0.022, -0.27], [0, -0.27]], gunDark, { y: 0.045, seg: 14 });
  K.box(0.05, 0.03, 0.03, gunDark, 0, 0.012, 0.12, 0, 0, 0, null, 0.004);
  coatRail(.34, .085, -.02);
  // Fluted heavy barrel, tapered, and a chunky ported brake.
  // GB-180 pass 5 (vs a real heavy-barrel bolt gun: ours was a pencil): a 30%-fatter contour barrel, deeper flutes, a
  // bigger brake with real side ports.
  const barrel = K.lathe([[0, 0.13], [0.026, 0.13], [0.026, 0.2], [0.024, 0.225], [0.0185, 1.1], [0, 1.1]], gunAccent, { y: 0.04, seg: 16 });   // tip under t217 probe radius
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const strip = K.box(0.005, 0.005, 0.46, gunDark, Math.cos(a) * 0.0205, 0.04 + Math.sin(a) * 0.0205, 0.78, 0, 0, a);
    strip.geometry = fittedSniperStrip(THREE, strip, barrel, i);
  }
  K.slab([[1.095, 0.019], [1.2, 0.019], [1.205, 0.025], [1.205, 0.055], [1.2, 0.061], [1.095, 0.061]], 0.046, gunMid, { bevel: 0.008 });   // pass 5: brake kept inside the can (t217)
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) K.box(0.006, 0.024, 0.018, gunRubber, sx * 0.023, 0.04, 1.115 + i * 0.03);
  for (const z of [1.133, 1.163, 1.193]) K.box(0.049, 0.008, 0.006, gunDark, 0, 0.06, z, 0, 0, 0, null, 0.001);   // ported brake's top baffles
  // Scope: ocular, tube, saddle and objective in one turned profile; a rubber eyecup; turrets; rings.
  // CL-318 (Jerry, 8 Nov: "the scope sits too far forward and hangs off the railing; move the scope and its mounting
  // rings back an inch or two"): the whole scope and both rings 0.06 back (4.3 cm): the front ring at 0.087 on the rail
  // (its base hung past the rail's end at 0.15), the rear at -0.121, the eyecup at -0.296 (the cheek riser starts at
  // -0.32). The axis (y 0.14, the sight line) is unchanged and SIGHT.sniper's point (-0.20) is still inside the tube.
  // Standalone inspection can show the older artwork. The game equips its issued optic before drawing.
  const scope = optionalArtworkGroup(ctx, gun, 'scope', art => {
    K.lathe([[0, -0.218], [0.028, -0.218], [0.032, -0.21], [0.032, -0.175], [0.027, -0.16], [0.024, -0.14], [0.0235, -0.13], [0.0235, 0.165], [0.028, 0.19],
             [0.038, 0.25], [0.039, 0.3], [0.039, 0.318], [0.034, 0.322], [0, 0.322]], gunDark, { y: 0.14, seg: 20, parent: art });
    K.lathe([[0.028, -0.236], [0.033, -0.236], [0.033, -0.214], [0.028, -0.214], [0.028, -0.236]], gunRubber, { y: 0.14, seg: 16, parent: art });
    K.disc(0.033, glassMat, 0, 0.14, 0.3225, 0, art, 16);
    K.disc(0.026, glassMat, 0, 0.14, -0.2185, Math.PI, art, 14);
    K.box(0.05, 0.052, 0.075, gunDark, 0, 0.14, 0.05, 0, 0, 0, art, 0.011);
    K.cyl(0.017, 0.017, 0.04, gunMid, 0, 0.185, 0.05, art, 14, 'y');
    K.cyl(0.017, 0.017, 0.04, gunMid, 0.044, 0.14, 0.05, art, 14, 'x');
    K.cyl(0.015, 0.015, 0.035, gunMid, -0.042, 0.14, 0.05, art, 12, 'x');
    // GB-174 (Jerry: the rings floated): each ring's base sits flush on the rail top (0.092), jaws hug the rail's sides
    // with a cross-bolt through a rail slot; a split ring clamps the 0.0255 tube on its axis (y 0.14).
    for (const z of [-0.061, 0.147]) {
      K.box(0.04, 0.016, 0.022, gunDark, 0, 0.1, z, 0, 0, 0, art, 0.003);
      for (const sx of [-1, 1]) K.box(0.006, 0.02, 0.022, gunDark, sx * 0.0185, 0.092, z, 0, 0, 0, art, 0.0015);
      K.cyl(0.003, 0.003, 0.05, gunMid, 0, 0.088, z, art, 8, 'x');
      K.box(0.03, 0.01, 0.018, gunDark, 0, 0.11, z, 0, 0, 0, art, 0.002);
      K.lathe([[0.0235, z - 0.009], [0.0295, z - 0.009], [0.031, z - 0.007], [0.031, z + 0.007], [0.0295, z + 0.009], [0.0235, z + 0.009]], gunDark, { y: 0.14, seg: 20, parent: art });
      for (const sx of [-1, 1]) D.screw(art, sx * 0.031, 0.14 + 0.012, z, { axis: 'x', side: sx, r: 0.003, kind: 'torx' });
    }
    for (const z of [-0.164, -0.151, 0.303]) K.lathe([[0.023, z - 0.003], [z > 0 ? 0.041 : 0.029, z - 0.003], [z > 0 ? 0.041 : 0.029, z + 0.003], [0.023, z + 0.003]], gunBody, { y: 0.14, seg: 20, parent: art });
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      K.box(0.003, 0.015, 0.003, gunDark, Math.cos(a) * 0.0172, 0.195, 0.05 + Math.sin(a) * 0.0172, 0, -a, 0, art, 0);
    }
  }, 'optic.nx8');
  scope.position.z = -0.06;
  // Bolt handle — GB-146 (Jerry, 2026-10-09: "The sniper bolt is on the wrong side") put it on the gun's right (-x) for
  // the eye of the time, which looked out of his (left-handed) head unmirrored. CL-306 (7 Nov): the first-person view
  // now mirrors his hold (D-75, VM.mirror), so -x read on the LEFT again; the handle is on +x (the gun's left) so it
  // reads on the right in first person, where Jerry looks. Lifts by turning about the bolt's axis (boltSide sets which
  // way), worked between shots and after the magazine is seated on a reload (sniperBoltPose).
  const BS = 1;   // the handle's side: +1 the gun's left (+x), -1 its right
  // CL-319 (Jerry, 8 Nov, the bolt-action cycle: 0 closed, 1 the handle turned up, 2 drawn back and the case thrown out,
  // 3 pushed forward, the next round into the chamber, 4 turned down): the bolt group's origin is on the bore's axis
  // (it was 4 cm beside the action, so the handle swung round a point outside the gun), so the handle turns about the
  // bolt's own axis; the bolt's body is in the group and slides back with the handle through the open receiver. Closed,
  // the knob is 4 cm out and 3 cm down from the axis (VM_SOCKETS.sniper.boltKnob [0.13, 0.035, -0.16], was y 0.067).
  const bolt = K.group(0, 0.045, -0.18);
  K.slab([[-0.045, -0.009], [0.038, -0.009], [0.045, 0], [0.038, 0.009], [-0.045, 0.009]], 0.03, gunMid, { x: BS * 0.027, y: 0.01, bevel: 0.004, segs: 2, parent: bolt });   // the root, out of the bridge's notch
  // the handle swept down 12 degrees from its root, so turned up 60 degrees its knob stands out to the side and clears the
  // scope's eyepiece (straight out, the knob rose into it on the pull)
  const stem = K.group(BS * 0.04, 0.01, 0.02, bolt); stem.rotation.z = BS * -0.2187;
  K.cyl(0.0065, 0.0065, 0.084, gunAccent, BS * 0.045, 0, 0, stem, 8, 'x');
  K.sph(0.017, gunDark, BS * 0.0922, 0, 0, stem, 12);
  K.cyl(0.008, 0.008, 0.018, gunBody, BS * 0.063, 0, 0, stem, 12, 'x');
  K.tor(0.012, 0.0015, gunBody, BS * 0.099, 0, 0, 0, Math.PI / 2, 0, stem, Math.PI * 2, 12);
  // These four rigid details share the parent animation and can enter its material batches.
  for (const detail of stem.children.slice()) bolt.attach(detail);
  bolt.remove(stem);
  // the body: closed, its tail in the rear bridge and its face at the chamber (z 0.067); bright, with two flutes that turn
  // up out of the opening as the handle lifts, the lug ring and the extractor band behind the face, the extractor's claw
  K.cyl(0.0205, 0.0205, 0.207, gunMetal, 0, 0, 0.1435, bolt, 18, 'z');
  for (const z of [0.225, 0.238]) K.cyl(0.0212, 0.0212, 0.004, gunMid, 0, 0, z, bolt, 18, 'z');
  for (const a of [0.05, 0.75]) K.box(0.0035, 0.003, 0.12, gunDark, Math.cos(a) * 0.0195, Math.sin(a) * 0.0195, 0.135, 0, 0, a, bolt, 0.0008);
  K.box(0.004, 0.006, 0.014, gunDark, BS * 0.0205, -0.004, 0.24, 0, 0, 0, bolt, 0.0008);
  bolt.userData.gb145Grab = new THREE.Vector3(BS * 0.13, -0.01, 0.02);   // the hand takes the knob
  // The next round (CL-319): up on the magazine's lips in the open receiver once the bolt is drawn back, driven forward
  // and up into the chamber by the bolt's face on the forward stroke. The case it replaces is thrown from the opening
  // (gun.userData.ejectPort, index.html's spawnCasing) on the back stroke.
  const round = K.group(0, 0.033, -0.022);
  const movingArt = new THREE.Mesh(issueArt, issueFinish);
  movingArt.rotation.x = Math.PI / 2;
  movingArt.scale.setScalar(displayScale);
  movingArt.position.z = -bounds.min.y * displayScale;
  round.add(movingArt);
  gun.userData.setMagazineRounds = count => {
    topRound.visible = Number.isFinite(count) && count > 0;
    if (!topRound.visible) round.visible = false;
  };
  round.visible = false;
  gun.userData.boltRound = round;
  gun.userData.ejectPort = [0.03, 0.058, 0.01];
  {
    const RB = round.position.clone(), BY = bolt.position.y;
    let prevBack = 0, stroke = 0;
    gun.userData.boltPoseHook = (open, back) => {
      bolt.position.y = BY;   // the bolt turns on its own axis: index.html's 1 cm lift was for the old pivot beside the action
      if (back > prevBack + 1e-4) stroke = 1; else if (back < prevBack - 1e-4) stroke = -1;
      prevBack = back;
      if (back < 0.002) { round.visible = false; stroke = 0; return; }
      if (stroke >= 0) {   // 2: drawn back; the next round rises onto the lips once the face has passed it
        const up = Math.min(1, Math.max(0, (back - 0.75) / 0.25));
        round.visible = topRound.visible && up > 0; round.position.set(0, RB.y - 0.014 * (1 - up), RB.z);
      } else {             // 3: pushed forward; the face drives it up the ramp into the chamber
        const f = 1 - back;
        round.visible = topRound.visible; round.position.set(0, RB.y + (BY - RB.y) * f, RB.z + 0.09 * f);
      }
    };
  }
  gun.userData.bolt = bolt;
  gun.userData.boltSide = BS;
  gun.userData.baseBoltPos = bolt.position.clone();
  gun.userData.baseBoltRot = bolt.rotation.clone();
  // GB-301: for Claude's VM_RELOADS — the firing hand works this part after each shot and on the reload's work beat.
  // Grab is bolt-local (knob); beats match SNIPER_BOLT in index.html (fractions of the between-shot cycle).
  gun.userData.boltWork = {
    hand: 'fire',
    grab: [BS * 0.13, -0.01, 0.02],
    afterShot: { from: 0.08, to: 0.86, reach: 0.2, lift: [0.2, 0.35], back: [0.35, 0.52], fwd: [0.56, 0.72], down: [0.72, 0.85] },
    reloadWork: [0.62, 0.94]
  };
  gunEffects(gun, new THREE.Vector3(0, 0.04, 1.22), 0.055, 3.5, 10, 0.005);
  gun.userData.laser.position.set(0, 0.04, 6.2);
  gun.userData.laserBaseZ = 1.2;
  gun.userData.barrelAssembly = null;
  gun.userData.partFinish = true;
  gun.traverse(piece => {
    if (piece.material === gunTan) {
      markPaintSurface(piece, piece.parent === stock ? 'furniture' : 'receiver');
    } else if (piece.material === gunPoly) {
      markPaintSurface(piece, 'furniture');
    }
  });
  gunSuppressor(gun, K, 'sniper');   // CL-95
  // Leave the front face, glass, buttons and dials in their factory finishes.
  const suppressor = gun.userData.suppressor;
  for (const piece of suppressor.children.slice(0, -2)) markPaintSurface(piece, 'suppressor shell');
  attachLaserLight(gun, 'sniper', ctx);
  const lamp = gun.userData.laserLightUnit;
  for (const name of ['moduleShell', 'topPlate']) markPaintSurface(lamp.getObjectByName(name), 'light shell');
  bindModelArtwork(gun, 'controls', 'magRelease', groupArtwork(THREE, magazineCatch));
  bindModelArtwork(gun, 'heatParts', 'barrel', groupArtwork(THREE, barrel));
  bindModelArtwork(gun, 'heatParts', 'suppressor', gun.userData.suppressor);
  return finishGun(gun);
}
