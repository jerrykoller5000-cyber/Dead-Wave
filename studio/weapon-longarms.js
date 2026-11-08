// GP-164: reference-led long-arm cosmetics. Moving-part roots and gameplay anchors stay unchanged.
// Context owns materials and finishing, so customization and rigid batching remain shared.

// A thin, faceted sleeve with actual through-slots. Each cut has an inner wall;
// the bore and background show through at every viewing angle. No CSG or new mats.
import { gunDetail } from './gun-detail.js';

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

export function makeM4Model(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, magPoly, glassMat, sightDotMat, gaugeFace } = ctx;
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
  // Upper receiver: the flat-top with its rail, the port's bulge on +x with the ejection port, its spring-loaded cover
  // door, the brass deflector and the forward assist behind it; the seam to the lower at y 0.
  K.slab([[-0.18, -0.006], [0.2, -0.006], [0.2, 0.07], [0.192, 0.078], [-0.168, 0.078], [-0.18, 0.066]], UW, gunBody, { bevel: 0.005, segs: 2 });
  K.rail(0.36, 0, 0.085, 0.01, null, 0.031);
  K.slab([[-0.11, 0.0], [0.16, 0.0], [0.16, 0.058], [-0.06, 0.058], [-0.11, 0.04]], 0.012, gunBody, { x: UW / 2, bevel: 0.004 });   // the bulge round the port
  K.box(0.004, 0.028, 0.072, gunRubber, UW / 2 + 0.0043, 0.03, 0.06, 0, 0, 0, null, 0.001);                                      // the ejection port: a dark recess, 0.3 mm over the bulge's face
  K.box(0.004, 0.016, 0.04, gunMid, UW / 2 + 0.0047, 0.03, 0.058, 0, 0, 0, null, 0.001);                                         // the bolt carrier's side seen in it
  K.slab([[0.022, -0.02], [0.096, -0.02], [0.096, 0.012], [0.022, 0.012]], 0.004, gunBody, { x: LW / 2 + 0.005, bevel: 0.0015 });   // the port cover, open: hinged under the port, hanging down the lower's side
  D.pin(gun, LW / 2 + 0.004, 0.013, 0.059, { axis: 'z', len: 0.08, r: 0.0016 });                                                      // its hinge pin along the port's bottom edge
  K.slab([[-0.062, 0.018], [-0.026, 0.018], [-0.018, 0.06], [-0.062, 0.066]], 0.02, gunBody, { x: UW / 2 + 0.006, bevel: 0.004 });   // the brass deflector
  K.lathe([[0, -0.125], [0.011, -0.125], [0.011, -0.088], [0.0085, -0.082], [0.0085, -0.06], [0, -0.06]], gunBody, { x: UW / 2 + 0.014, y: 0.046, seg: 10 });   // the forward assist
  D.ribs(gun, { x: UW / 2 + 0.014, y: 0.046, z: -0.114, axis: 'y', side: 1, along: 'z', count: 4, pitch: 0.004, w: 0.012, h: 0.001, t: 0.0014, mat: gunMid });   // its button's grooves
  // Charging handle: the T out the back with its latch on -x. GB-269: its own group, gun.userData.work, at rest where it was.
  const work = K.group(0, 0.068, -0.195); work.name = 'work';
  K.box(0.04, 0.011, 0.028, gunDark, 0, 0, -0.006, 0, 0, 0, work, 0.002);                   // the T
  K.box(0.014, 0.009, 0.05, gunDark, 0, 0.0, 0.03, 0, 0, 0, work, 0.0015);                   // the shaft into the receiver
  K.box(0.008, 0.009, 0.022, gunMid, -0.023, 0.0, -0.003, 0, 0, 0, work, 0.0015);            // the latch, on the real left
  D.ribs(work, { x: 0, y: 0.0055, z: -0.006, axis: 'y', side: 1, along: 'z', count: 3, pitch: 0.005, w: 0.036, h: 0.001, t: 0.0014, mat: gunMid });
  gun.userData.work = work;
  K.slab([[-0.226, 0.058], [-0.206, 0.058], [-0.2, 0.077], [-0.226, 0.077]], UW + 0.004, gunDark, { bevel: 0.004 });   // the receiver's rear plate under the handle
  K.slab([[-0.165, 0.092], [-0.115, 0.092], [-0.12, 0.108], [-0.16, 0.108]], 0.03, gunDark, { bevel: 0.003 });          // the folded rear sight
  // Lower receiver: the trigger housing, the flared mag well, the two pins through, the selector and bolt catch on -x,
  // the mag release button in its fence on +x, the trigger guard, the A2 grip (CL-312 b).
  K.slab([[-0.172, 0.0], [0.13, 0.0], [0.13, -0.028], [0.118, -0.042], [0.117, -0.112], [0.132, -0.13], [-0.016, -0.13], [-0.004, -0.112],
          [-0.006, -0.064], [-0.03, -0.058], [-0.1, -0.058], [-0.16, -0.05], [-0.172, -0.03]], LW, gunBody, { bevel: 0.005, segs: 2 });
  for (const sx of [-1, 1]) D.groove(gun, { x: sx * LW / 2, y: -0.03, z: 0.0, axis: 'x', side: sx, along: 'z', len: 0.1, w: 0.0008 });   // the housing's machined step
  for (const z of [-0.15, 0.115]) D.pin(gun, 0, -0.012, z, { axis: 'x', len: LW, r: 0.0045, proud: 0.0015 });                          // the takedown and pivot pins
  K.slab(gunBand([[-0.11, -0.012], [-0.08, -0.03]], 0.004), 0.004, gunDark, { x: -LW / 2 - 0.001, bevel: 0.001 });                    // the selector lever
  K.cyl(0.0075, 0.0075, 0.004, gunDark, -LW / 2 - 0.001, -0.012, -0.11, null, 10, 'x');                                                // its axle's boss
  for (const [ry, rz] of [[-0.003, -0.126], [0.0, -0.11], [-0.003, -0.094]]) D.screw(gun, -LW / 2, ry + 0.005, rz, { axis: 'x', side: -1, r: 0.0015, kind: 'button', mat: gunMid });   // the safe/semi/auto marks
  K.slab([[0.09, -0.016], [0.118, -0.016], [0.118, -0.046], [0.09, -0.046]], 0.006, gunDark, { x: -LW / 2 - 0.002, bevel: 0.002 });   // the bolt catch paddle (the work point, the reload's slap)
  K.tor(0.009, 0.0025, gunBody, LW / 2 + 0.0015, -0.03, 0.09, 0, Math.PI / 2, 0, null, Math.PI * 2, 12);                            // the mag release's fence
  K.cyl(0.006, 0.006, 0.006, gunDark, LW / 2 + 0.003, -0.03, 0.09, null, 10, 'x');                                                    // the button
  K.box(0.006, 0.006, 0.012, gunDark, LW / 2 + 0.001, -0.07, 0.03, 0, 0, 0, null, 0.001);                                            // the pivot pin's detent plate
  K.slab(gunBand([[0.016, -0.05], [0.028, -0.09], [0.004, -0.122], [-0.028, -0.132], [-0.052, -0.112], [-0.048, -0.078]], 0.0095), 0.026, gunDark, { bevel: 0.004 });   // the trigger guard
  K.slab([[-0.0103, -0.0525], [-0.0187, -0.0689], [-0.0179, -0.0843], [-0.0092, -0.0957], [-0.0148, -0.1003], [-0.0261, -0.0877], [-0.0293, -0.0671], [-0.0217, -0.0475]], 0.012, gunDark, { bevel: 0.002 });   // GB-175/180: the trigger
  // CL-312 b (Jerry: "check and fix all pistol grips"): an A2 grip at an A2's size (32 mm wide, 53 mm deep under the
  // beavertail, 46 at the palm): the finger nub on the front strap and the four ridges under it, the backstrap's swell,
  // a flat base with its trapdoor and screw. The centre line, h and rake are as before, so the palm point stays.
  K.slab(shapedGrip(-0.08, -0.12, 0.18, 0.08, 0.3, [
    [-0.06, 0.038], [0.08, 0.034], [0.22, 0.028], [0.32, 0.027], [0.39, 0.035], [0.46, 0.027], [0.6, 0.024], [0.8, 0.025], [0.96, 0.027],
    [1.03, 0.012], [1.03, -0.022], [0.98, -0.038], [0.8, -0.04], [0.55, -0.04], [0.3, -0.037], [0.1, -0.036], [-0.03, -0.044], [-0.08, -0.02]
  ]), 0.047, gunPoly, { bevel: 0.011, segs: 3 });
  gripRidges(K, gunPoly, -0.08, -0.12, 0.18, 0.08, 0.3, [0.56, 0.64, 0.72, 0.8], 0.0245, 0.03);   // the front strap's ridges
  K.box(0.024, 0.003, 0.03, gunDark, 0, -0.12 - 0.53 * 0.18 * Math.cos(0.3), -0.08 - 0.53 * 0.18 * Math.sin(0.3) - 0.004, 0.3, 0, 0, null, 0.0008);   // the base's trapdoor
  D.screw(gun, 0, -0.12 - 0.535 * 0.18 * Math.cos(0.3), -0.08 - 0.535 * 0.18 * Math.sin(0.3) + 0.012, { axis: 'y', side: -1, r: 0.0035, kind: 'hex' });   // the grip screw
  // Buffer tube with its castle nut and end plate, the six-position stock: the cheek tube over the buffer, the open web,
  // the butt with its rubber pad and sling slot, the release lever, the QD socket. GB-269: all one group, fpStock.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  K.lathe([[0, -0.505], [0.019, -0.505], [0.022, -0.5], [0.022, -0.19], [0.026, -0.188], [0.026, -0.168], [0, -0.168]], gunDark, { y: 0.035, seg: 12, parent: stock });
  K.lathe([[0, -0.19], [0.03, -0.19], [0.03, -0.178], [0, -0.178]], gunDark, { y: 0.035, seg: 8, phase: Math.PI / 8, parent: stock });   // the castle nut
  D.vents(stock, { x: 0, y: 0.065, z: -0.184, axis: 'y', side: 1, along: 'x', count: 1, w: 0.004, len: 0.005, deep: 0.003 });   // its top notch
  K.box(0.062, 0.062, 0.004, gunDark, 0, 0.03, -0.172, 0, 0, 0, stock, 0.002);                                                 // the end plate
  for (const z of [-0.22, -0.26, -0.3, -0.34, -0.38]) D.vents(stock, { x: 0, y: 0.013, z, axis: 'y', side: -1, along: 'z', count: 1, w: 0.006, len: 0.012, deep: 0.002 });   // the tube's position notches underneath
  K.slab([[-0.33, 0.012], [-0.328, 0.05], [-0.345, 0.062], [-0.49, 0.064], [-0.548, 0.074], [-0.552, 0.016], [-0.38, 0.002]], 0.058, gunPoly, { bevel: 0.008, segs: 3, parent: stock });   // the cheek tube
  K.slab([[-0.553, 0.055], [-0.533, 0.048], [-0.523, -0.056], [-0.54, -0.08], [-0.553, -0.078]], 0.058, gunPoly, { bevel: 0.007, parent: stock });              // the butt
  K.slab(gunBand([[-0.364, 0.003], [-0.405, -0.006], [-0.492, -0.064], [-0.538, -0.07]], 0.012), 0.05, gunPoly, { bevel: 0.005, parent: stock });              // the web's strut
  K.slab([[-0.569, 0.077], [-0.552, 0.077], [-0.552, -0.08], [-0.567, -0.083]], 0.06, gunRubber, { bevel: 0.006, parent: stock });                              // the pad
  K.slab([[-0.34, 0.005], [-0.402, -0.01], [-0.401, -0.021], [-0.36, -0.018], [-0.34, -0.008]], 0.026, gunDark, { bevel: 0.003, parent: stock });              // the release lever
  for (const sx of [-1, 1]) {
    K.slab([[-0.365, 0.053], [-0.505, 0.06], [-0.522, 0.047], [-0.37, 0.04]], 0.004, gunPoly, { x: sx * 0.029, bevel: 0.002, parent: stock });                  // the cheek's side panel line
    K.cyl(0.011, 0.011, 0.004, gunDark, sx * 0.028, -0.045, -0.516, stock, 12, 'x');                                                                           // the QD socket
    K.cyl(0.0065, 0.0065, 0.005, gunRubber, sx * 0.03, -0.045, -0.516, stock, 10, 'x');
    K.box(0.003, 0.012, 0.03, gunRubber, sx * 0.029, 0.01, -0.46, 0, 0, 0, stock, 0.001);                                                                      // the sling slot
  }
  for (let i = 0; i < 5; i++) K.box(0.058, 0.004, 0.002, gunDark, 0, -0.056 + i * 0.026, -0.568, 0, 0, 0, stock, 0);   // the pad's grooves
  K.cyl(0.009, 0.009, 0.062, gunDark, 0, 0.032, -0.52, stock, 8, 'x');                                                     // the lever's pin
  gun.userData.fpStock = stock;
  // Free-float handguard: the barrel nut, a 40 mm octagon with M-LOK slots, its anti-rotation tabs into the upper, the
  // full-length top rail on its riser, the two end screws each side, the QD sling socket at its front.
  K.lathe([[0.012, 0.186], [0.024, 0.186], [0.024, 0.206], [0.012, 0.206]], gunDark, { y: 0.02, seg: 12 });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; K.box(0.004, 0.003, 0.02, gunDark, Math.cos(a) * 0.0245, 0.02 + Math.sin(a) * 0.0245, 0.196, 0, 0, a + Math.PI / 2); }   // the nut's teeth
  ventedSleeve(THREE, gun, gunMid, { z0: 0.21, z1: 0.70, radius: 0.03, wall: 0.004, y: 0.02, faces: 12,
    slots: [[0.238, 0.286], [0.309, 0.357], [0.38, 0.428], [0.451, 0.499], [0.522, 0.57], [0.593, 0.641], [0.652, 0.68]], ventFaces: [0, 1, 5, 6, 7, 9, 11] });
  K.lathe([[0.022, 0.692], [0.03, 0.692], [0.03, 0.70], [0.027, 0.706], [0.022, 0.706]], gunBody, { y: 0.02, seg: 12, phase: Math.PI / 12 });   // the front cap
  K.box(0.024, 0.012, 0.49, gunMid, 0, 0.051, 0.455, 0, 0, 0, null, 0.003);   // the rail's riser
  K.rail(0.49, 0, 0.085, 0.455, null, 0.031);
  K.box(0.03, 0.03, 0.03, gunMid, 0, 0.046, 0.218, 0, 0, 0, null, 0.003);    // the riser's root over the barrel nut
  for (const sx of [-1, 1]) {
    D.screw(gun, sx * 0.0285, 0.02, 0.221, { axis: 'x', side: sx, r: 0.0028, kind: 'hex' });
    D.screw(gun, sx * 0.0285, 0.02, 0.232, { axis: 'x', side: sx, r: 0.0028, kind: 'hex' });
    D.screw(gun, sx * 0.0285, 0.02, 0.69, { axis: 'x', side: sx, r: 0.0024, kind: 'hex' });
  }
  K.cyl(0.0065, 0.0065, 0.004, gunDark, 0, -0.0085, 0.66, null, 10, 'y');   // the QD socket under the front
  // Barrel: 0.75" at the chamber stepping to the pencil, the low gas block inside the handguard, the folding front sight
  // on the rail, the A2 birdcage with its five slots and the crush washer.
  K.lathe([[0, 0.18], [0.0135, 0.18], [0.0135, 0.3], [0.0115, 0.306], [0.0115, 0.915], [0, 0.915]], gunAccent, { y: 0.02, seg: 14 });
  K.box(0.024, 0.028, 0.028, gunDark, 0, 0.022, 0.614, 0, 0, 0, null, 0.003);
  K.slab([[0.65, 0.09], [0.693, 0.09], [0.685, 0.118], [0.663, 0.12]], 0.02, gunDark, { bevel: 0.003 });
  for (const sx of [-1, 1]) K.box(0.003, 0.02, 0.016, gunDark, sx * 0.0085, 0.122, 0.672);   // the sight's ears
  K.box(0.004, 0.02, 0.004, gunDark, 0, 0.128, 0.673);                                        // the post
  K.lathe([[0, 0.905], [0.0115, 0.905], [0.0135, 0.912], [0.0135, 0.918], [0, 0.918]], gunMid, { y: 0.02, seg: 12 });   // the crush washer
  K.lathe([[0, 0.912], [0.0135, 0.912], [0.0135, 0.918], [0.016, 0.925], [0.016, 0.975], [0.013, 0.978], [0.007, 0.978], [0.007, 0.97], [0, 0.97]], gunDark, { y: 0.02, seg: 12 });
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * 0.62; K.box(0.004, 0.004, 0.034, gunRubber, Math.cos(a) * 0.0158, 0.02 + Math.sin(a) * 0.0158, 0.952, 0, 0, a); }
  // Holographic sight on the upper's rail (its dot the sight line: unchanged), the clamp's lever and screw; the weapon
  // light on the right of the handguard with its bezel and tail switch.
  K.box(0.05, 0.02, 0.11, gunDark, 0, 0.1, 0.0, 0, 0, 0, null, 0.004);
  for (const sx of [-1, 1]) K.slab([[-0.05, 0.108], [0.052, 0.108], [0.05, 0.158], [-0.042, 0.162]], 0.006, gunDark, { x: sx * 0.026, bevel: 0.002 });
  K.box(0.058, 0.01, 0.1, gunDark, 0, 0.163, 0.004, 0, 0, 0, null, 0.003);
  // GB-233: a holographic sight's window is clear glass with a small dot (EOTech-style), not an opaque teal plate.
  const holoGlass = Object.assign(glassMat.clone(), { transparent: true, opacity: 0.18, depthWrite: false });
  K.box(0.046, 0.044, 0.003, holoGlass, 0, 0.134, 0.045);
  // GB-259 (J10): a 3.5 mm dot inside a thin ring, EOTech-style.
  K.box(0.0035, 0.0035, 0.002, sightDotMat, 0, 0.134, 0.0455);
  K.tor(0.0075, 0.0006, sightDotMat, 0, 0.134, 0.0455, 0, 0, 0, null, Math.PI * 2, 24);
  for (const z of [-0.02, 0.0]) K.box(0.008, 0.008, 0.012, gunRubber, 0.03, 0.118, z);            // the brightness buttons
  K.cyl(0.008, 0.008, 0.012, gunMid, -0.032, 0.106, 0.019, null, 10, 'x');                        // the battery cap
  K.slab([[-0.046, 0.092], [-0.02, 0.092], [-0.02, 0.098], [-0.046, 0.098]], 0.008, gunDark, { x: 0.03, bevel: 0.0015 });   // the clamp's lever
  for (const sx of [-1, 1]) D.screw(gun, sx * 0.025, 0.1, 0.033, { axis: 'x', side: sx, r: 0.0025, kind: 'hex' });
  K.rail(0.086, 0.031, 0.02, 0.504, null, 0.025, 1);
  K.box(0.012, 0.02, 0.032, gunDark, 0.037, 0.02, 0.505);
  K.lathe([[0, 0.468], [0.013, 0.468], [0.013, 0.532], [0.0165, 0.542], [0.0165, 0.56], [0.013, 0.561], [0, 0.561]], gunDark, { x: 0.049, y: 0.02, seg: 12 });
  D.ribs(gun, { x: 0.049, y: 0.0365, z: 0.551, axis: 'y', side: 1, along: 'z', count: 3, pitch: 0.004, w: 0.012, h: 0.0008, t: 0.0012, mat: gunMid });   // the bezel's knurl
  K.cyl(0.006, 0.006, 0.006, gunRubber, 0.049, 0.02, 0.466, null, 10);   // the tail switch
  K.disc(0.012, gaugeFace, 0.049, 0.02, 0.5615, 0);
  // Magazine: a polymer STANAG with its curve, the ribs down each side, the witness windows, the floorplate; 24 mm in the
  // 32 mm well (GB-260: a real mag fills about 0.9 of its well). The group, curve, rake and feed top are untouched.
  const mag = K.group(0, -0.16, 0.05);
  K.slab([[-0.046, 0.108], ...profileCurve([-0.046, 0.03], [-0.04, -0.05], [-0.01, -0.104], 5), ...profileCurve([0.086, -0.096], [0.054, -0.04], [0.046, 0.03], 5), [0.046, 0.108]],
    0.036, magPoly, { bevel: 0.004, parent: mag });
  for (const sx of [-1, 1]) {
    for (const z of [-0.027, 0, 0.027]) K.slab(gunBand([[z, 0.053], [z + 0.004, -0.012], [z + 0.012, -0.07], [z + 0.019, -0.095]], 0.003), 0.003, gunDark, { x: sx * 0.0185, bevel: 0, parent: mag });
    for (const [z, y] of [[0.035, -0.02], [0.04, -0.05], [0.046, -0.08]]) K.box(0.002, 0.006, 0.006, gunRubber, sx * 0.0185, y, z, 0, 0, 0, mag, 0.0006);   // the witness windows
  }
  for (const y of [-0.018, -0.049, -0.08]) K.box(0.039, 0.004, 0.082, magPoly, 0, y, 0.011 - y * 0.15, 0, 0, 0, mag, 0.001);   // the grip rings
  K.slab([[-0.016, -0.1], [0.092, -0.092], [0.094, -0.11], [-0.016, -0.118]], 0.042, magPoly, { bevel: 0.004, parent: mag });   // the floorplate, proud of the body
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
  return finishGun(gun);
}

export function makeAkModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunRubber, woodMat, woodDark, gunMetal } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  // CL-311 (D-121, the fidelity upgrade; AG-229: ours 58 % wider than the reference): an AKM at an AKM's proportions.
  // Builder's units (x 0.78 to metres): the stamped receiver 36 mm wide and 44 mm tall on its sides, the dust cover's
  // round top 23 mm over it, the magazine 27 mm, the lower handguard 44 mm, the grip 33 mm, the butt 41 mm; the bore at
  // y -0.005 as before, the gas tube 20 mm over it. The grip's centre line, the support point under the lower handguard
  // and the stock's butt stay where the hold has them. Real-right controls (the selector, the charging handle) are on +x:
  // the mirrored first-person view shows +x on the right (docs/fps/fidelity.md).
  const HW = 0.023;
  // Receiver: flat stamped sides, the rear tang falling to the stock, the front trunnion's seam and its rivets.
  K.slab([[-0.225, 0.028], [-0.225, -0.018], [-0.2, -0.028], [0.252, -0.028], [0.252, 0.028]], 2 * HW, gunBody, { bevel: 0.0025, segs: 2 });
  for (const sx of [-1, 1]) {
    for (const [ry, rz] of [[0.012, 0.19], [-0.012, 0.19], [0.0, 0.232], [-0.012, -0.165], [0.012, -0.205]]) D.rivet(gun, sx * HW, ry, rz, { axis: 'x', side: sx, r: 0.0032 });   // the trunnions' rivets
    for (const rz of [-0.04, 0.02]) D.rivet(gun, sx * HW, -0.02, rz, { axis: 'x', side: sx, r: 0.0028 });   // the trigger guard's
    D.groove(gun, { x: sx * HW, y: 0.004, z: 0.2, axis: 'x', side: sx, along: 'y', len: 0.05, w: 0.0007 });   // the front trunnion's seam
    K.box(0.003, 0.016, 0.07, gunBody, sx * (HW + 0.0005), 0.0, 0.07, 0, 0, 0, null, 0.0012);                 // the dimple over the magazine well, as a pressed boss
  }
  D.pin(gun, 0, 0.0, -0.12, { axis: 'x', len: 2 * HW, r: 0.003, mat: gunDark });   // the hammer pin
  D.pin(gun, 0, -0.006, -0.06, { axis: 'x', len: 2 * HW, r: 0.003, mat: gunDark });  // the trigger pin
  // Dust cover: the stamped lid with its rounded top and the AKM's eight ribs across the rear half.
  // (CL-315 note: one parkerized finish on the cover and the receiver, as an AKM has; the ribs a shade lighter to read.)
  K.slab([[-0.2, 0.027], [0.155, 0.027], [0.155, 0.04], [-0.18, 0.04], [-0.2, 0.036]], 2 * HW - 0.002, gunBody, { bevel: 0.002, segs: 2 });
  K.lathe([[0, -0.2], [0.021, -0.2], [0.022, -0.19], [0.022, 0.15], [0.021, 0.155], [0, 0.155]], gunBody, { y: 0.036, seg: 16, phase: Math.PI / 16 });
  D.ribs(gun, { x: 0, y: 0.058, z: -0.12, axis: 'y', side: 1, along: 'z', count: 8, pitch: 0.013, w: 0.03, h: 0.001, t: 0.0022, mat: gunMid });
  K.box(0.02, 0.006, 0.012, gunDark, 0, 0.055, -0.205);   // the cover's rear latch (the recoil spring guide's button)
  // The rear sight block on the cover's front: the tangent leaf on it, its slider, the U notch's ears at the sight line (0.074).
  K.slab([[0.15, 0.03], [0.248, 0.03], [0.248, 0.056], [0.2, 0.066], [0.15, 0.064]], 0.034, gunDark, { bevel: 0.0025 });
  K.box(0.022, 0.004, 0.064, gunDark, 0, 0.068, 0.196);                                       // the leaf
  K.box(0.024, 0.006, 0.01, gunMid, 0, 0.069, 0.182);                                         // the slider
  for (const sx of [-1, 1]) K.box(0.004, 0.004, 0.008, gunAccent, sx * 0.005, 0.072, 0.218);   // GB-259: the U notch's ears, their tops the sight line
  // Right side (+x in the mirrored view): the long safety lever in its notches, the charging handle on the carrier.
  K.slab(gunBand([[-0.17, 0.018], [-0.02, 0.014], [0.005, -0.006]], 0.006), 0.004, gunDark, { x: HW + 0.001, bevel: 0.0015 });
  K.box(0.004, 0.022, 0.012, gunDark, HW + 0.002, -0.004, 0.012);                      // the lever's tab
  for (const z of [-0.14, -0.1]) D.groove(gun, { x: HW, y: 0.024, z, axis: 'x', side: 1, along: 'y', len: 0.012, w: 0.0008 });   // the selector's notches
  // GB-269 (GP-20012, docs/contracts.md): the charging handle is its own group, gun.userData.work, at rest where it was.
  const work = K.group(HW + 0.006, 0.02, 0.13); work.name = 'work';
  K.box(0.016, 0.012, 0.02, gunDark, 0, 0, 0, 0, 0, 0, work, 0.003);   // (t333: 20 mm long, so the knob on it hangs on a part the test calls big)
  K.sph(0.009, gunDark, 0.012, 0, 0, work, 8);
  gun.userData.work = work;
  // Trigger guard, the magazine release in front of it, a trigger with its tip curling forward, the wooden grip.
  // Grip centre line is still gripOutline(-0.1, -0.14, 0.19, ..., 0.34): the palm stays at the hold.
  K.slab(gunBand([[0.002, -0.028], [0.004, -0.07], [-0.016, -0.088], [-0.042, -0.084], [-0.048, -0.062]], 0.006), 0.022, gunDark, { bevel: 0.003 });
  K.box(0.016, 0.018, 0.006, gunDark, 0, -0.04, 0.0);   // the mag release paddle
  // GB-175: trigger face toward the grip, tip curling forward; GB-180: a solid blade.
  K.slab([[-0.0165, -0.0329], [-0.0248, -0.046], [-0.024, -0.0581], [-0.0155, -0.0675], [-0.0205, -0.0725], [-0.032, -0.0619], [-0.0352, -0.044], [-0.0275, -0.0271]], 0.009, gunDark, { bevel: 0.002 });
  // GB-178: a clean AK grip on the same centre line and hand anchor (u 0.42, v 0); its top runs up into the receiver.
  // CL-312 b (Jerry: "check and fix all pistol grips"): the AKM grip widens a little to a flat base (it tapered to a point).
  K.slab(shapedGrip(-0.1, -0.14, 0.19, 0.08, 0.34, [
    [-0.12, 0.02], [-0.02, 0.022], [0.14, 0.024], [0.4, 0.024], [0.64, 0.026], [0.86, 0.03], [1.0, 0.031], [1.04, 0.018],
    [1.04, -0.02], [0.98, -0.036], [0.8, -0.038], [0.5, -0.034], [0.2, -0.03], [0.0, -0.028], [-0.12, -0.014]
  ]), 0.042, woodMat, { bevel: 0.008, segs: 3 });
  K.box(0.03, 0.003, 0.036, gunDark, 0, -0.14 - 0.54 * 0.19 * Math.cos(0.34), -0.1 - 0.54 * 0.19 * Math.sin(0.34), 0.34, 0, 0, null, 0.0008);   // the base's steel plate
  for (const sx of [-1, 1]) D.checkering(gun, woodDark, shapedGrip(-0.1, -0.14, 0.15, 0.05, 0.34, [[0.12, 0.012], [0.88, 0.012], [0.88, -0.022], [0.12, -0.022]]), sx * 0.0212, 0.0045, 0.0011);   // the grip's checkering
  D.screw(gun, 0.0212, -0.155, -0.108, { axis: 'x', side: 1, r: 0.0045, kind: 'slot' });                 // GB-178: the grip screw on the panel
  K.slab([[-0.142, -0.027], [-0.058, -0.027], [-0.062, -0.04], [-0.136, -0.042]], 0.046, gunDark, { bevel: 0.002 });   // GB-180: the grip's steel mounting tang under the receiver
  // Stock: the dropped wooden butt with its wrist, a steel buttplate, the tang, a sling loop. GB-269: one group, fpStock.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  K.slab([[-0.222, 0.03], ...profileCurve([-0.255, 0.03], [-0.34, 0.012], [-0.412, 0.012], 5),
    ...profileCurve([-0.412, 0.012], [-0.515, 0.017], [-0.571, -0.009], 5), [-0.579, -0.145], [-0.57, -0.153],
    ...profileCurve([-0.57, -0.153], [-0.414, -0.084], [-0.337, -0.069], 5),
    ...profileCurve([-0.337, -0.069], [-0.27, -0.044], [-0.222, -0.03], 4)], 0.052, woodMat, { bevel: 0.012, segs: 3, parent: stock });
  K.slab([[-0.592, 0.0], [-0.573, -0.004], [-0.579, -0.152], [-0.597, -0.156]], 0.056, gunDark, { bevel: 0.003, parent: stock });   // the buttplate
  D.screw(stock, 0, -0.03, -0.593, { axis: 'z', side: -1, r: 0.003, kind: 'slot' }); D.screw(stock, 0, -0.125, -0.593, { axis: 'z', side: -1, r: 0.003, kind: 'slot' });   // its screws
  K.box(0.022, 0.03, 0.016, gunDark, 0, -0.06, -0.593, 0, 0, 0, stock, 0.002);                     // the trapdoor
  K.box(0.05, 0.018, 0.05, gunDark, 0, 0.018, -0.236, 0, 0, 0, stock, 0.002);                       // the rear tang's block
  for (const sx of [-1, 1]) {
    K.slab(gunBand([[-0.32, -0.035], [-0.386, -0.049], [-0.472, -0.056], [-0.535, -0.049]], 0.0015), 0.002, woodDark, { x: sx * 0.026, bevel: 0, parent: stock });
    K.slab(gunBand([[-0.396, -0.066], [-0.451, -0.079], [-0.536, -0.096]], 0.0011), 0.002, woodDark, { x: sx * 0.026, bevel: 0, parent: stock });
    D.rivet(stock, sx * 0.025, -0.0, -0.24, { axis: 'x', side: sx, r: 0.0032 });   // the stock's tang rivets
  }
  K.tor(0.012, 0.0035, gunDark, 0, -0.122, -0.45, 0, Math.PI / 2, 0, stock);
  gun.userData.fpStock = stock;
  // Handguards: the lower with its palm swell and finger grooves, the upper over the gas tube, the steel bands and their latches.
  K.slab([[0.244, 0.012], [0.53, 0.012], [0.535, -0.01], [0.53, -0.04], [0.45, -0.052], [0.33, -0.053], [0.262, -0.047], [0.244, -0.034]], 0.056, woodMat, { bevel: 0.01, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab(gunBand([[0.28, -0.005], [0.34, -0.014], [0.43, -0.012], [0.498, -0.003]], 0.0022), 0.002, woodDark, { x: sx * 0.028, bevel: 0.001 });
    K.slab(gunBand([[0.29, -0.03], [0.36, -0.036], [0.466, -0.032]], 0.0014), 0.002, woodDark, { x: sx * 0.028, bevel: 0.001 });
  }
  K.slab([[0.248, 0.012], [0.505, 0.012], [0.512, 0.026], [0.49, 0.04], [0.26, 0.04], [0.248, 0.03]], 0.04, woodMat, { bevel: 0.004, segs: 2 });   // the upper handguard
  for (const sx of [-1, 1]) for (const z of [0.3, 0.36, 0.42]) D.vents(gun, { x: sx * 0.02, y: 0.028, z, axis: 'x', side: sx, along: 'y', count: 1, w: 0.014, len: 0.006, deep: 0.002 });   // its vents
  for (const z of [0.236, 0.512]) { K.box(0.064, 0.064, 0.014, gunDark, 0, -0.004, z, 0, 0, 0, null, 0.003); D.screw(gun, 0.032, -0.004, z, { axis: 'x', side: 1, r: 0.0025, kind: 'slot' }); }   // the bands
  K.box(0.012, 0.008, 0.014, gunDark, 0.03, 0.014, 0.512, 0, 0, 0, null, 0.001);   // the front band's latch
  K.lathe([[0, 0.42], [0.0095, 0.42], [0.0095, 0.66], [0, 0.66]], gunDark, { y: 0.021, seg: 10 });   // the gas tube on to the gas block
  K.lathe([[0, 0.24], [0.0095, 0.24], [0.0095, 0.43], [0, 0.43]], gunAccent, { y: 0.021, seg: 10 });
  for (const sx of [-1, 1]) for (const z of [0.275, 0.325, 0.375, 0.425]) K.box(0.003, 0.006, 0.014, gunDark, sx * 0.0095, 0.021, z, 0, 0, 0, null, 0.001);   // the tube's vent holes' lips
  K.cyl(0.0035, 0.0035, 0.034, gunAccent, 0, 0.027, 0.47, null, 8, 'x');   // the upper handguard's retainer
  K.slab([[0.655, 0.04], [0.705, 0.036], [0.705, -0.02], [0.655, -0.022]], 0.03, gunMid, { bevel: 0.003 });   // the gas block
  D.pin(gun, 0, 0.012, 0.68, { axis: 'x', len: 0.03, r: 0.002 });
  // Barrel and cleaning rod; the front sight tower with its hood; the bayonet lug; the slant brake. (GB-259: the post's tip at the sight line.)
  K.lathe([[0, 0.5], [0.0125, 0.5], [0.0125, 0.6], [0.011, 0.608], [0.011, 0.92], [0, 0.92]], gunAccent, { y: -0.005, seg: 12 });
  K.lathe([[0, 0.53], [0.003, 0.53], [0.003, 0.832], [0.005, 0.836], [0.005, 0.846], [0, 0.846]], gunDark, { y: -0.026, seg: 6 });
  K.slab([[0.818, -0.024], [0.862, -0.024], [0.858, 0.036], [0.826, 0.036]], 0.026, gunDark, { bevel: 0.003 });
  K.tor(0.018, 0.0045, gunDark, 0, 0.062, 0.84, 0, 0, 0, null, Math.PI, 10);                          // the hood
  for (const sx of [-1, 1]) K.box(0.005, 0.028, 0.01, gunDark, sx * 0.018, 0.048, 0.84);           // its ears
  K.box(0.005, 0.038, 0.005, gunDark, 0, 0.0555, 0.84);                                                  // the post: its tip at 0.0745
  K.box(0.018, 0.016, 0.044, gunDark, 0, -0.024, 0.82);                                                  // the bayonet lug
  K.lathe([[0, 0.918], [0.014, 0.918], [0.014, 0.988], [0.012, 0.994], [0.0065, 0.994], [0.0065, 0.985], [0, 0.985]], gunDark, { y: -0.005, seg: 12 });
  K.box(0.019, 0.008, 0.036, gunRubber, 0, 0.009, 0.965, -0.35);   // the slant brake's cut
  // Banana mag: the deep curve, three pressed ribs down each side, the floorplate; 27 mm across now, its top at the well.
  const mag = K.group(0, -0.04, 0.04);
  const magB = profileCurve([-0.046, 0.012], [-0.04, -0.13], [0.052, -0.258], 7), magF = profileCurve([0.056, 0.012], [0.066, -0.11], [0.156, -0.232], 7);
  K.slab([...magB, ...magF.slice().reverse()], 0.034, gunAccent, { bevel: 0.004, parent: mag });
  for (const w of [0.23, 0.5, 0.77]) K.slab(gunBand(magB.map((b, i) => [b[0] * (1 - w) + magF[i][0] * w, b[1] * (1 - w) + magF[i][1] * w]).slice(1, 7), 0.003), 0.037, gunBody, { bevel: 0.0012, parent: mag });
  K.slab(gunBand(magB.slice(0, 8), 0.002), 0.035, gunDark, { bevel: 0.001, parent: mag });
  K.slab(gunBand(magF.slice(0, 8), 0.002), 0.035, gunDark, { bevel: 0.001, parent: mag });
  K.box(0.036, 0.018, 0.1, gunDark, 0, -0.01, 0.007, 0, 0, 0, mag, 0.002);                                // the well's lips
  K.slab([[0.048, -0.254], [0.16, -0.226], [0.164, -0.241], [0.05, -0.271]], 0.038, gunDark, { bevel: 0.003, parent: mag });   // the floorplate
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
  const D = gunDetail(ctx);
  // CL-313 (D-121, the fidelity upgrade; aa12.glb measured): the Breacher-12 at an AA-12's widths. Builder's units
  // (x 0.684 to metres): the receiver 62 mm wide (it was 96) with a rounded top, the handguard 62, the shroud 63 across
  // the flats (it was 88), the drum 212 across and 89 thick (it was 144 thick), the stock 48, the grip 36 (CL-312 b).
  // The bore (y 0.015), the carry handle's ring and the post (the sight line, 0.168), the grip's centre line, the drum's
  // axis and radius (the magFoot), the stock's length and the handguard's underside (the support) are where they were.
  // The ejection port is on +x (the view's right); the charging handle in its slot and the selector on -x.
  const RW = 0.09;
  // Receiver: the tall slab-sided box with its rounded top, the pressed side plates on their bolts, the seam lines, the
  // vents along the top edge, the rear's stock seam.
  K.slab([[-0.26, 0.1], [-0.26, -0.074], [-0.242, -0.09], [0.26, -0.09], [0.26, 0.07], [-0.26, 0.07]], RW, gunMid, { bevel: 0.006, segs: 2 });
  K.lathe([[0, -0.258], [0.043, -0.258], [0.045, -0.25], [0.045, 0.252], [0.043, 0.26], [0, 0.26]], gunMid, { y: 0.07, seg: 28, phase: Math.PI / 28 });   // the rounded top
  for (const sx of [-1, 1]) {
    K.slab([[-0.202, 0.062], [0.193, 0.062], [0.2, 0.054], [0.2, -0.053], [-0.202, -0.053]], 0.006, gunDark, { x: sx * RW / 2, bevel: 0.0025 });   // the side plate
    for (const [by, bz] of [[0.03, 0.177], [-0.04, 0.177], [0.03, -0.181], [-0.04, -0.181]]) D.screw(gun, sx * (RW / 2 + 0.003), by, bz, { axis: 'x', side: sx, r: 0.004, kind: 'hex' });
    D.groove(gun, { x: sx * RW / 2, y: -0.076, z: 0.0, axis: 'x', side: sx, along: 'z', len: 0.49, w: 0.0008 });                 // the fold line along the bottom
    D.vents(gun, { x: sx * RW / 2, y: 0.082, z: 0.12, axis: 'x', side: sx, along: 'z', count: 4, pitch: 0.02, w: 0.016, len: 0.006, deep: 0.002 });   // the vents
  }
  D.groove(gun, { x: 0, y: 0.115, z: -0.246, axis: 'y', side: 1, along: 'x', len: RW - 0.01, w: 0.001 });   // the cover's rear seam
  // The carry handle: one uninterrupted top and a clear opening under it; the rear sight's aperture ring at 0.168, the
  // sight line (GB-259/J20); two sling loops.
  K.slab(gunBand([[-0.17, 0.09], [-0.153, 0.143], [-0.138, 0.151], [0.188, 0.151], [0.217, 0.13], [0.225, 0.09]], 0.009), 0.04, gunDark, { bevel: 0.003 });
  for (const z of [-0.158, 0.211]) D.pin(gun, 0, 0.108, z, { axis: 'x', len: 0.04, r: 0.0035, proud: 0.001 });
  K.box(0.025, 0.007, 0.025, gunDark, 0, 0.156, -0.12, 0, 0, 0, null, 0.002);
  K.tor(0.009, 0.003, gunMid, 0, 0.168, -0.12, 0, 0, 0, null, Math.PI * 2, 12);
  for (const sx of [-1, 1]) D.screw(gun, sx * 0.02, 0.142, 0.06, { axis: 'x', side: sx, r: 0.003, kind: 'slot' });   // the handle's clamp screws
  // Ejection port on +x with the bolt's face in it; the charging handle in its slot on -x (the work part's place); the
  // selector over the grip on -x with its marks.
  const PX = RW / 2 + 0.003;   // the side plates' outer face
  K.box(0.004, 0.05, 0.12, gunRubber, PX + 0.0003, 0.02, 0.1, 0, 0, 0, null, 0.001);
  K.box(0.004, 0.03, 0.05, gunMid, PX + 0.0008, 0.02, 0.08, 0, 0, 0, null, 0.001);
  K.box(0.004, 0.014, 0.26, gunRubber, -PX - 0.0003, 0.055, 0.025, 0, 0, 0, null, 0.002);
  K.box(0.022, 0.022, 0.035, gunDark, -PX - 0.008, 0.05, 0.18, 0, 0, 0, null, 0.004);
  D.ribs(gun, { x: -PX - 0.019, y: 0.05, z: 0.18, axis: 'x', side: -1, along: 'z', count: 4, pitch: 0.006, w: 0.016, h: 0.001, t: 0.0018, mat: gunMid });
  K.slab(gunBand([[-0.13, -0.045], [-0.095, -0.062]], 0.004), 0.004, gunDark, { x: -PX - 0.0015, bevel: 0.001 });
  K.cyl(0.007, 0.007, 0.004, gunDark, -PX - 0.0015, -0.045, -0.13, null, 10, 'x');
  for (const [ry, rz] of [[-0.058, -0.112], [-0.066, -0.13], [-0.058, -0.148]]) D.screw(gun, -RW / 2, ry, rz, { axis: 'x', side: -1, r: 0.0015, kind: 'button', mat: gunMid });   // on the receiver's face, under the plate's edge
  for (const sx of [-1, 1]) {
    D.groove(gun, { x: sx * PX, y: 0.005, z: sx > 0 ? -0.08 : 0.0, axis: 'x', side: sx, along: 'z', len: sx > 0 ? 0.22 : 0.38, w: 0.0008 });   // the plate's pressed line (broken by the port on +x)
    D.groove(gun, { x: sx * PX, y: -0.038, z: 0.0, axis: 'x', side: sx, along: 'z', len: 0.38, w: 0.0008 });
  }
  // Stock: the moulded nose stepping the receiver's width down, the body, the comb, the side panels, the rubber pad.
  // GB-259 (GP-20014): one group, gun.userData.fpStock ('fp-stock'). Every part is where it was, narrower.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  K.slab([[-0.255, 0.074], [-0.31, 0.072], [-0.31, -0.07], [-0.282, -0.074], [-0.255, -0.078]], 0.08, gunPoly, { bevel: 0.01, segs: 3, parent: stock });
  K.slab([[-0.3, 0.07], [-0.535, 0.064], [-0.553, 0.058], [-0.553, -0.1], [-0.538, -0.106], [-0.47, -0.092], [-0.36, -0.07], [-0.3, -0.066]], 0.07, gunPoly, { bevel: 0.012, segs: 3, parent: stock });
  K.slab([[-0.34, 0.078], [-0.522, 0.073], [-0.532, 0.064], [-0.34, 0.068]], 0.054, gunPoly, { bevel: 0.006, segs: 2, parent: stock });   // the comb
  for (const sx of [-1, 1]) {
    K.slab([[-0.335, 0.04], [-0.5, 0.034], [-0.5, -0.042], [-0.42, -0.054], [-0.335, -0.038]], 0.003, gunPoly, { x: sx * 0.036, bevel: 0.002, parent: stock });
    D.groove(stock, { x: sx * 0.035, y: 0.0, z: -0.42, axis: 'x', side: sx, along: 'z', len: 0.17, w: 0.0008 });   // the moulding seam
  }
  K.slab([[-0.576, 0.058], [-0.553, 0.06], [-0.553, -0.102], [-0.573, -0.108], [-0.579, -0.09], [-0.579, 0.044]], 0.074, gunRubber, { bevel: 0.007, parent: stock });   // the pad
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
  for (const sx of [-1, 1]) K.slab(shapedGrip(-0.17, -0.16, 0.19, 0.08, 0.3, [[0.16, 0.012], [0.94, 0.014], [0.94, -0.026], [0.16, -0.022]]), 0.003, gunRubber, { x: sx * 0.0255, bevel: 0.002 });
  K.slab(gunBand([[-0.06, -0.088], [-0.062, -0.124], [-0.072, -0.136], [-0.112, -0.136], [-0.122, -0.12]], 0.01), 0.046, gunPoly, { bevel: 0.006, segs: 2 });   // GB-180: the moulded guard
  K.slab([[-0.0781, -0.09], [-0.0827, -0.1005], [-0.082, -0.1081], [-0.0773, -0.1147], [-0.0827, -0.1193], [-0.09, -0.1119], [-0.0933, -0.0995], [-0.0899, -0.086]], 0.011, gunAccent, { bevel: 0.002 });   // GB-174/180: the trigger
  // The drum: its axis along the bore, 89 mm thick now, the rolled rims, the hub with its winding cover and key on the
  // front face, the eight face bolts, the feed tower up into the receiver, the latches at its sides.
  const mag = new THREE.Group();
  K.lathe([[0, -0.065], [0.142, -0.065], [0.154, -0.057], [0.155, -0.044], [0.149, -0.037], [0.149, 0.037], [0.155, 0.044], [0.154, 0.057], [0.142, 0.065], [0, 0.065]], gunAccent, { parent: mag, seg: 32 });
  for (const sz of [-1, 1]) {
    K.cyl(0.137, 0.137, 0.005, gunBody, 0, 0, sz * 0.065, mag, 32);
    K.tor(0.138, 0.003, gunDark, 0, 0, sz * 0.068, 0, 0, 0, mag, Math.PI * 2, 24);
    K.cyl(0.059, 0.062, 0.009, gunDark, 0, 0, sz * 0.071, mag, 24);
    K.cyl(0.05, 0.052, 0.004, gunBody, 0, 0, sz * 0.077, mag, 24);
    K.cyl(0.017, 0.019, 0.009, gunDark, 0, 0, sz * 0.082, mag, 12);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; D.screw(mag, Math.sin(a) * 0.125, Math.cos(a) * 0.125, sz * 0.0675, { axis: 'z', side: sz, r: 0.0035, kind: 'hex' }); }
  }
  K.box(0.07, 0.012, 0.008, gunDark, 0, 0, 0.088, 0, 0, 0.55, mag, 0.002);                   // the winding key on the front hub
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; K.box(0.006, 0.003, 0.05, gunDark, Math.sin(a) * 0.1495, Math.cos(a) * 0.1495, 0, 0, 0, -a, mag, 0.0008); }   // the rim's ribs
  K.box(0.08, 0.1, 0.12, gunAccent, 0, 0.155, 0.0, 0, 0, 0, mag, 0.01);                      // the feed tower
  K.box(0.088, 0.02, 0.13, gunDark, 0, 0.21, 0.0, 0, 0, 0, mag, 0.005);
  for (const sx of [-1, 1]) {
    K.box(0.009, 0.047, 0.027, gunDark, sx * 0.145, -0.012, -0.03, 0, 0, 0, mag, 0.003);     // the latch
    K.box(0.006, 0.028, 0.019, gunMid, sx * 0.149, -0.012, -0.032, 0, 0, 0, mag, 0.002);
    for (let i = 0; i < 4; i++) K.box(0.006, 0.002, 0.015, gunDark, sx * 0.152, -0.022 + i * 0.007, -0.032, 0, 0, 0, mag, 0);
  }
  mag.position.set(0, -0.26, 0.05);
  mag.rotation.set(0, 0, 0);
  gun.add(mag);
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Handguard: the box flush with the receiver top, its side vents, the ribs under it for the support hand (its underside
  // -0.082 where the fist rides), its screws; the barrel-nut sleeve, the octagonal shroud with its collars, the front
  // sight on its clamp ring (the post's tip 0.168: the sight line), the barrel and the brake.
  K.slab([[0.23, 0.105], [0.49, 0.105], [0.49, -0.074], [0.475, -0.082], [0.45, -0.082], [0.425, -0.07], [0.29, -0.07], [0.265, -0.082], [0.25, -0.082], [0.23, -0.068]], RW, gunBody, { bevel: 0.005, segs: 2 });
  for (const sx of [-1, 1]) {
    for (const z of [0.29, 0.35, 0.41]) K.box(0.004, 0.03, 0.045, gunRubber, sx * (RW / 2 + 0.0003), 0.06, z + 0.02, 0, 0, 0, null, 0.002);   // the side vent slots
    for (const z of [0.253, 0.463]) for (const y of [-0.045, 0.019, 0.085]) D.screw(gun, sx * RW / 2, y, z, { axis: 'x', side: sx, r: 0.003, kind: 'hex' });
    D.groove(gun, { x: sx * RW / 2, y: 0.0, z: 0.36, axis: 'x', side: sx, along: 'z', len: 0.24, w: 0.0008 });   // the moulding seam
  }
  for (const z of [0.30, 0.33, 0.36, 0.39, 0.42]) K.box(0.07, 0.009, 0.01, gunPoly, 0, -0.0715, z, 0, 0, 0, null, 0.002);
  K.lathe([[0.02, 0.255], [0.04, 0.255], [0.042, 0.262], [0.042, 0.27], [0.039, 0.275], [0.039, 0.444], [0.02, 0.444]], gunMid, { y: 0.015, seg: 16 });   // GB-174: the barrel nut sleeve
  ventedSleeve(THREE, gun, gunBody, { z0: 0.448, z1: 0.789, radius: 0.046, wall: 0.004, y: 0.015, faces: 8,
    slots: [[0.467, 0.496], [0.519, 0.548], [0.571, 0.6], [0.623, 0.652], [0.675, 0.704]], ventFaces: [0, 1, 2, 3, 5, 6, 7] });
  for (const z of [0.447, 0.787]) K.lathe([[0.02, z - 0.008], [0.05, z - 0.008], [0.05, z + 0.007], [0.02, z + 0.007]], gunMid, { y: 0.015, seg: 8, phase: Math.PI / 8 });
  K.lathe([[0.045, 0.737], [0.052, 0.737], [0.053, 0.74], [0.053, 0.76], [0.052, 0.763], [0.045, 0.763]], gunDark, { y: 0.015, seg: 18 });   // GB-174: the clamp ring
  K.box(0.036, 0.018, 0.026, gunDark, 0, 0.072, 0.75, 0, 0, 0, null, 0.003);                                                               // its base
  K.box(0.008, 0.092, 0.012, gunDark, 0, 0.122, 0.75, 0, 0, 0, null, 0.002);                                                               // the post: its tip 0.168
  for (const sx of [-1, 1]) K.box(0.005, 0.098, 0.018, gunDark, sx * 0.0145, 0.126, 0.75, 0, 0, 0, null, 0.0015);                         // the ears
  D.screw(gun, 0, 0.063, 0.75, { axis: 'z', side: 1, r: 0.003, kind: 'hex' });
  K.lathe([[0, 0.25], [0.018, 0.25], [0.018, 0.74], [0.024, 0.75], [0.024, 0.905], [0, 0.905]], gunAccent, { y: 0.015, seg: 12 });   // GB-173/189: the barrel, mostly inside the shroud
  K.lathe([[0, 0.902], [0.03, 0.902], [0.034, 0.91], [0.034, 0.97], [0.03, 0.976], [0.014, 0.976], [0.014, 0.966], [0, 0.966]], gunMid, { y: 0.015, seg: 14 });   // the brake
  K.disc(0.0095, gunRubber, 0, 0.015, 0.9765, 0, null, 12);   // GB-173: the bore at the muzzle
  for (let i = 0; i < 3; i++) K.box(0.072, 0.008, 0.01, gunRubber, 0, 0.015, 0.92 + i * 0.018);
  for (const sx of [-1, 1]) D.vents(gun, { x: sx * 0.034, y: 0.015, z: 0.94, axis: 'x', side: sx, along: 'z', count: 3, pitch: 0.018, w: 0.008, len: 0.01, deep: 0.002 });
  gunEffects(gun, new THREE.Vector3(0, 0.015, 0.98), 0.08, 3.4, 7);
  gun.userData.laser.position.set(0, 0.015, 4.4);
  gun.userData.laserBaseZ = 0.95;
  gun.userData.barrelAssembly = null;
  gun.userData.slide = null;
  return finishGun(gun);
}

export function makeShotgunModel(ctx) {
  const { THREE, gunKit, gunBand, gunEffects, gunSuppressor, finishGun, profileCurve, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, shellRedMat, brassMat, gunMetal } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
  // CL-312 (D-121, the fidelity upgrade; the audit: "its receiver a flat grey block"): a pump gun at a real pump gun's
  // proportions. In the builder's units (x 0.79 to metres): the barrel 24 mm across on the bore at y 0.03, the magazine
  // tube 23 mm under it at y -0.006, the receiver 40 mm wide and 62 mm tall round them, the forend 44 mm across on the
  // tube. The grip, trigger, guard, stock and the hold's palm points stay where they were (the hands fit); the forend's
  // centre moved up 2 cm with the tube (VM_SOCKETS.shotgun support and WEAPON_HOLD follow, the same card).
  const HW = 0.0255;   // the receiver's half width
  // Receiver: flat sides, the top rolled over the bolt, the tang running back into the stock's wrist, the bottom flat
  // with the loading port cut into it. Side outline [z, y].
  K.slab([[0.23, -0.03], [0.23, 0.027], [-0.195, 0.027], [-0.195, -0.028], [-0.17, -0.03], [0.09, -0.03], [0.135, -0.032]], 2 * HW, gunBody, { bevel: 0.003, segs: 2 });
  // the rolled top: a half-round the receiver's width, tangent to the flat sides, running back over the tang into the stock's wrist
  K.lathe([[0, -0.195], [0.0245, -0.195], [0.0255, -0.185], [0.0255, 0.225], [0.0245, 0.23], [0, 0.23]], gunBody, { y: 0.026, seg: 20, phase: Math.PI / 20 });
  K.lathe([[0, -0.2], [0.0205, -0.2], [0.0225, -0.19], [0.0225, -0.1], [0, -0.1]], gunBody, { y: 0.026, seg: 16 });   // the tang's round, into the wrist
  // The ejection port on the gun's real right, which is +x here: the mirrored first-person view shows +x on the right (docs/fps/fidelity.md).
  K.box(0.006, 0.026, 0.068, gunRubber, HW - 0.002, 0.016, 0.098, 0, 0, 0, null, 0.001);
  K.box(0.004, 0.02, 0.058, gunMetal, HW - 0.004, 0.016, 0.1, 0, 0, 0, null, 0.001);   // the bolt's side, bright
  K.box(0.005, 0.006, 0.012, gunDark, HW - 0.0045, 0.025, 0.126);                        // the extractor
  // The loading port underneath: the opening, the shell latch and the lifter (carrier) seen in it.
  K.box(0.03, 0.006, 0.07, gunRubber, 0, -0.028, 0.12, 0, 0, 0, null, 0.001);
  K.box(0.022, 0.003, 0.062, gunMetal, 0, -0.0265, 0.12, 0, 0, 0, null, 0.001);   // the carrier
  K.box(0.004, 0.004, 0.02, gunDark, 0.012, -0.027, 0.1);                           // the shell latch
  // The receiver's cross pins (two trigger-plate pins), the stamped lines, the serial band, the safety's cross bolt.
  for (const z of [-0.09, 0.05]) D.pin(gun, 0, -0.012, z, { axis: 'x', len: 2 * HW, r: 0.0035, mat: gunDark });
  for (const sx of [-1, 1]) {
    D.groove(gun, { x: sx * HW, y: 0.036, z: 0.0, axis: 'x', side: sx, along: 'z', len: 0.4, w: 0.0007 });     // the top edge's stamping line
    D.groove(gun, { x: sx * HW, y: -0.018, z: 0.02, axis: 'x', side: sx, along: 'z', len: 0.37, w: 0.0007 });   // the lower line
    D.screw(gun, sx * HW, 0.012, 0.19, { axis: 'x', side: sx, r: 0.0028, kind: 'slot' });                       // the barrel-band screw
  }
  D.pin(gun, 0, -0.04, -0.06, { axis: 'x', len: 0.034, r: 0.004, mat: gunDark });   // the safety button through the trigger plate
  K.box(0.018, 0.006, 0.02, gunDark, 0, 0.052, -0.13, 0.15, 0, 0, null, 0.002);       // the receiver's top at the tang: the notch block for the sight line
  // Trigger plate, guard, trigger and the pistol grip: the plate hangs below the receiver's new bottom (-0.03).
  K.slab([[0.086, -0.028], [-0.036, -0.028], [-0.04, -0.04], [-0.03, -0.054], [0.08, -0.054], [0.088, -0.044]], 0.044, gunDark, { bevel: 0.004, segs: 2 });
  K.slab(gunBand([[0.072, -0.052], [0.076, -0.08], [0.064, -0.098], [0.012, -0.1], [-0.012, -0.09], [-0.02, -0.052]], 0.009), 0.034, gunDark, { bevel: 0.004, segs: 2 });
  // GB-175/180: the trigger's face toward the grip, the tip curling forward, a solid blade.
  K.slab([[0.0384, -0.0471], [0.0303, -0.0589], [0.0319, -0.0699], [0.0405, -0.0795], [0.0355, -0.0845], [0.0241, -0.0741], [0.0197, -0.0571], [0.0276, -0.0409]], 0.012, gunAccent, { bevel: 0.002 });
  // Stock with a recoil pad; the pistol grip; a sling loop. GB-259: the stock group is gun.userData.fpStock ('fp-stock').
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  // CL-312 b (Jerry, 7 Nov: "that weird protrusion where the stock fades into the receiver"): the stock's front meets the
  // receiver's rear face flush and its underside sweeps forward as one wrist into the grip's back, as a one-piece
  // pistol-grip stock is moulded; nothing hangs under the receiver any more (the old toe and the GB-296 wedge).
  K.slab([[-0.29, 0.054], [-0.302, 0.057], [-0.454, 0.052], [-0.468, 0.048], [-0.469, -0.118], [-0.454, -0.121],
    ...profileCurve([-0.454, -0.121], [-0.346, -0.064], [-0.29, -0.073], 5)], 0.058, gunPoly, { bevel: 0.01, segs: 3, parent: stock });
  K.slab([[-0.494, 0.055], [-0.464, 0.054], [-0.47, -0.12], [-0.491, -0.124], [-0.496, -0.103]], 0.062, gunRubber, { bevel: 0.007, parent: stock });
  K.slab([[-0.294, 0.047], [-0.45, 0.047], [-0.447, 0.024], [-0.424, 0.014], [-0.326, 0.026]], 0.06, gunPoly, { bevel: 0.006, segs: 3, parent: stock });   // the comb
  for (const sx of [-1, 1]) D.groove(stock, { x: sx * 0.029, y: -0.02, z: -0.38, axis: 'x', side: sx, along: 'z', len: 0.14, w: 0.0008 });   // the stock's moulding seam
  // GB-296: the wrist goes with fp-stock. Its underside is the concave sweep from the stock's toe to the grip's backstrap.
  // The wrist is narrower than the receiver (3.8 cm to its 4 cm) and runs from the receiver's rear face, under the dip
  // behind it, to the comb, where the butt widens to 4.6 cm.
  K.slab([[-0.2, 0.046], ...profileCurve([-0.2, 0.046], [-0.235, 0.012], [-0.266, 0.027], 5), [-0.3, 0.054],
    [-0.3, -0.072], ...profileCurve([-0.3, -0.072], [-0.2, -0.092], [-0.084, -0.074], 6),
    [-0.072, -0.052], [-0.062, -0.026], [-0.2, -0.026]], 0.048, gunPoly, { bevel: 0.007, segs: 3, parent: stock });
  // Grip centre line is still gripOutline(-0.06, -0.1, 0.16, ..., 0.28): the palm stays at the hold (GB-178).
  // CL-312 b (Jerry: "skinny and ugly"): a tactical pump's rubber-feel polymer grip, 5 cm deep at the palm swell, 3.3 cm
  // wide, with its heel flared and its base a rounded cap, not a point; the finger grooves down the front strap. The
  // centre line, h and rake are unchanged, so the palm point (u 0.42, v 0) and WEAPON_HOLD/VM_SOCKETS stay.
  const gripPts = [
    [-0.14, 0.03], [0.02, 0.028], [0.18, 0.024], [0.3, 0.021], [0.4, 0.024], [0.5, 0.021], [0.6, 0.024], [0.7, 0.022],
    [0.84, 0.026], [0.98, 0.024], [1.04, 0.006], [1.04, -0.012], [1.0, -0.03], [0.92, -0.038], [0.72, -0.038],
    [0.5, -0.036], [0.3, -0.032], [0.1, -0.03], [-0.14, -0.028]
  ];
  K.slab(shapedGrip(-0.06, -0.1, 0.16, 0.08, 0.28, gripPts), 0.042, gunPoly, { bevel: 0.009, segs: 3 });
  for (const sx of [-1, 1]) D.checkering(gun, gunPoly, shapedGrip(-0.06, -0.1, 0.16, 0.08, 0.28, [[0.2, 0.012], [0.96, 0.014], [0.96, -0.024], [0.2, -0.02]]), sx * 0.0212, 0.0045, 0.0011);   // the grip's checkering
  K.tor(0.012, 0.004, gunDark, 0, -0.088, -0.4, 0, Math.PI / 2, 0, stock);
  gun.userData.fpStock = stock;
  // The forend (the pump): 44 mm across round the magazine tube, 19 cm long, with its grooves round the lower two
  // thirds and the two action bars running back into the receiver. Its root stays at the old place (z 0.28) and it
  // still racks along the tube (gun.userData.pump, basePumpPos); the hold's palm is under its middle.
  const pump = K.group(0, -0.006, 0.28);
  K.lathe([[0, -0.02], [0.02, -0.02], [0.026, -0.012], [0.028, 0.0], [0.028, 0.19], [0.026, 0.2], [0.02, 0.21], [0, 0.21]], gunPoly, { seg: 18, parent: pump });
  for (let i = 0; i < 12; i++) {   // the grooves: ribs round the lower two thirds, a real corncob's
    const ang = Math.PI * 0.6 + i * (Math.PI * 1.8 / 11);
    K.box(0.0035, 0.0035, 0.17, gunPoly, Math.cos(ang) * 0.0285, Math.sin(ang) * 0.0285, 0.095, 0, 0, ang, pump, 0.001);
  }
  for (const sx of [-1, 1]) K.box(0.004, 0.011, 0.26, gunMetal, sx * 0.017, 0.0, -0.1, 0, 0, 0, pump, 0.001);   // the action bars (out of the forend's back into the receiver)
  gun.userData.pump = pump;
  gun.userData.basePumpPos = pump.position.clone();
  // Barrel and magazine tube locked to the receiver (siblings of the pump): the barrel 24 mm on the bore, the tube under
  // it, the barrel band joining them at the front, the tube cap, the vent rib and the bead.
  const receiver = K.group(0, 0, 0);
  K.lathe([[0, 0.16], [0.0155, 0.16], [0.0155, 0.935], [0, 0.935]], gunAccent, { y: 0.03, seg: 16, parent: receiver });
  K.lathe([[0, 0.14], [0.02, 0.14], [0.02, 0.21], [0.0165, 0.215], [0, 0.215]], gunBody, { y: 0.03, seg: 16, parent: receiver });   // the chamber's step out of the receiver
  K.box(0.008, 0.005, 0.7, gunDark, 0, 0.049, 0.565, 0, 0, 0, receiver, 0.001);                     // the vent rib
  for (let i = 0; i < 13; i++) K.box(0.005, 0.006, 0.012, gunDark, 0, 0.0455, 0.24 + i * 0.05, 0, 0, 0, receiver, 0.001);   // its posts
  K.sph(0.0045, brassMat, 0, 0.055, 0.91, receiver, 10);                                              // the bead
  K.lathe([[0, 0.11], [0.0145, 0.11], [0.0145, 0.8], [0, 0.8]], gunDark, { y: -0.006, seg: 14, parent: receiver });   // the magazine tube
  K.lathe([[0, 0.795], [0.017, 0.795], [0.017, 0.83], [0.014, 0.84], [0.006, 0.842], [0, 0.842]], gunBody, { y: -0.006, seg: 14, parent: receiver });   // its cap
  D.ribs(receiver, { x: 0, y: -0.006 - 0.017, z: 0.815, axis: 'y', side: -1, along: 'x', count: 5, pitch: 0.006, w: 0.03, h: 0.0012, t: 0.0012 });   // the cap's knurl
  K.box(0.02, 0.062, 0.02, gunDark, 0, 0.012, 0.76, 0, 0, 0, receiver, 0.003);                       // the barrel band
  D.screw(receiver, 0.01, 0.012, 0.76, { axis: 'x', side: 1, r: 0.0025, kind: 'hex' });
  K.tor(0.01, 0.0035, gunDark, 0, -0.026, 0.76, 0, Math.PI / 2, 0, receiver);                           // the sling swivel
  K.lathe([[0, 0.92], [0.0155, 0.92], [0.0175, 0.93], [0.0175, 0.95], [0.015, 0.952], [0.011, 0.952], [0.011, 0.945], [0, 0.945]], gunDark, { y: 0.03, seg: 16, parent: receiver });   // the muzzle crown
  gun.userData.receiver = receiver;
  gunEffects(gun, new THREE.Vector3(0, 0.03, 0.97), 0.07, 3.2, 7);
  gun.userData.laser.position.set(0, 0.03, 4.5);
  gun.userData.laserBaseZ = 0.99;
  gun.userData.barrelAssembly = null;
  // The tube-load shell (hidden until the reload's insert beats), at the loading port's mouth.
  const loadShell = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.011, 0.058, 10), shellRedMat);
  const loadRim = new THREE.Mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.007, 10), brassMat);
  loadRim.position.y = -0.0255;
  loadShell.add(loadRim);
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
  return finishGun(gun);
}

export function makeSniperModel(ctx) {
  const { THREE, gunKit, gunBand, gripOutline, gunEffects, gunSuppressor, finishGun, gunBody, gunMid, gunDark, gunAccent, gunPoly, gunRubber, gunTan, steelMat, glassMat } = ctx;
  const gun = new THREE.Group();
  const K = gunKit(gun);
  const D = gunDetail(ctx);
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
  // Fore-end side slots have depth and open backgrounds, with a stiff bottom web.
  K.box(0.05, 0.012, 0.455, gunTan, 0, -0.035, 0.417, 0, 0, 0, null, 0.004);
  for (const sx of [-1, 1]) {
    K.slab([[0.197, 0.042], [0.635, 0.042], [0.647, 0.029], [0.64, 0.012], [0.197, 0.012]], 0.009, gunTan, { x: sx * 0.027, bevel: 0.003 });
    K.slab([[0.197, -0.014], [0.64, -0.014], [0.65, -0.024], [0.635, -0.042], [0.197, -0.042]], 0.009, gunTan, { x: sx * 0.027, bevel: 0.003 });
    for (let i = 0; i <= 5; i++) {
      const z = 0.208 + i * 0.083;
      K.slab([[z - 0.012, -0.026], [z + 0.012, -0.026], [z + 0.012, 0.027], [z - 0.012, 0.027]], 0.009, gunTan, { x: sx * 0.027, bevel: 0.004 });
    }
    for (const z of [0.204, 0.632]) for (const y of [-0.027, 0.029]) D.screw(gun, sx * 0.0315, y, z, { axis: 'x', side: sx, r: 0.0032, kind: 'hex' });
    for (const z of [-0.266, 0.153]) D.screw(gun, sx * (z < 0 ? 0.033 : 0.035), -0.014, z, { axis: 'x', side: sx, r: 0.004, kind: 'hex' });
  }
  K.box(0.056, 0.058, 0.017, gunTan, 0, -0.001, 0.645, 0, 0, 0, null, 0.005);
  K.rail(0.2, 0, -0.045, 0.5, null, 0.031, 2);
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
  K.slab([[-0.0441, -0.052], [-0.0487, -0.0625], [-0.048, -0.07], [-0.0435, -0.0755], [-0.0485, -0.0805], [-0.056, -0.074], [-0.0593, -0.0615], [-0.0559, -0.048]], 0.01, gunAccent, { bevel: 0.002 });
  // The old tang was buried in a solid receiver. Trim only that hidden upper end
  // into the new chassis bridge; the grip's palm center and lower contour stay put.
  // CL-312 b (Jerry: "check and fix all pistol grips"): the thumbhole stock's grip as a moulded grip (34 mm wide, 54 deep
  // at the swell; it was a 45 mm plank), the finger grooves on its front strap, a flared heel and a flat base; the
  // rubber panels and their screw on its sides. The centre line, h and rake are gripOutline's, so the palm point stays.
  K.slab(shapedGrip(-0.12, -0.1, 0.16, 0.08, 0.25, [
    [-0.06, 0.036], [0.1, 0.032], [0.22, 0.026], [0.32, 0.03], [0.42, 0.025], [0.52, 0.029], [0.62, 0.024], [0.72, 0.027], [0.86, 0.026], [0.98, 0.03],
    [1.04, 0.016], [1.04, -0.02], [0.99, -0.04], [0.82, -0.043], [0.55, -0.042], [0.3, -0.038], [0.1, -0.036], [-0.06, -0.038]
  ]).map(([z, y]) => [z, Math.min(y, -0.04)]), 0.048, gunPoly, { bevel: 0.011, segs: 3 });
  for (const sx of [-1, 1]) {
    K.slab(shapedGrip(-0.12, -0.1, 0.16, 0.08, 0.25, [[0.2, 0.012], [0.95, 0.014], [0.95, -0.026], [0.2, -0.022]]), 0.003, gunRubber, { x: sx * 0.0235, bevel: 0.002 });
    D.screw(gun, sx * 0.025, -0.1 - 0.1 * 0.16 * Math.cos(0.25), -0.12 - 0.1 * 0.16 * Math.sin(0.25), { axis: 'x', side: sx, r: 0.003, kind: 'slot' });   // the panel screw at the palm point
  }
  const mag = K.group(0, -0.12, 0.02);
  K.slab([[-0.04, 0.07], [0.04, 0.07], [0.04, -0.07], [-0.04, -0.07]], 0.042, gunAccent, { bevel: 0.005, parent: mag });
  K.slab([[-0.043, -0.068], [0.043, -0.068], [0.043, -0.083], [-0.043, -0.083]], 0.048, gunDark, { bevel: 0.004, parent: mag });
  for (const sx of [-1, 1]) for (const z of [-0.026, 0.026]) K.box(0.0025, 0.113, 0.004, gunBody, sx * 0.021, -0.004, z, 0, 0, 0, mag, 0.001);
  K.box(0.021, 0.017, 0.007, gunDark, 0, -0.064, -0.031, 0, 0, 0, null, 0.002);
  gun.userData.mag = mag;
  gun.userData.baseMagPos = mag.position.clone();
  gun.userData.baseMagRot = mag.rotation.clone();
  // Skeleton stock: the top bar, a cheek riser on two posts, the lower bar, the butt and pad, a rear monopod.
  // GB-180 pass 6 (vs an AXMC-style chassis: a solid, deep stock with a tall cheek riser and a thick pad; ours was a
  // thin open skeleton): one solid stock body from the action to the pad, deeper at the butt.
  // GB-259 (GP-20014): the stock body, cheek riser, butt, pad and monopod are one group, gun.userData.fpStock ('fp-stock'),
  // for the view gun to leave out of the eye; third person and the shadow keep it. Every part is where it was.
  const stock = K.group(0, 0, 0); stock.name = 'fp-stock';
  K.slab([[-0.245, 0.062], [-0.6, 0.062], [-0.6, -0.112], [-0.56, -0.114], [-0.43, -0.082], [-0.31, -0.06], [-0.245, -0.045]], 0.06, gunTan, { bevel: 0.011, segs: 3, parent: stock });
  K.slab([[-0.32, 0.058], [-0.535, 0.058], [-0.535, 0.122], [-0.37, 0.128], [-0.32, 0.106]], 0.054, gunTan, { bevel: 0.009, segs: 3, parent: stock });   // GB-180: a tall cheek riser
  for (const z of [-0.36, -0.48]) for (const sx of [-1, 1]) K.cyl(0.008, 0.008, 0.004, steelMat, sx * 0.028, 0.09, z, stock, 8, 'x');   // riser clamp knobs
  K.slab(gunBand([[-0.3, -0.052], [-0.45, -0.075], [-0.575, -0.098]], 0.015), 0.05, gunTan, { bevel: 0.009, parent: stock });
  K.slab([[-0.566, 0.068], [-0.594, 0.068], [-0.598, -0.1], [-0.57, -0.104]], 0.056, gunTan, { bevel: 0.009, parent: stock });
  K.slab([[-0.598, 0.074], [-0.636, 0.074], [-0.64, -0.118], [-0.602, -0.122]], 0.066, gunRubber, { bevel: 0.009, parent: stock });   // GB-180: a thick pad
  for (const sx of [-1, 1]) {
    for (const [z, y] of [[-0.29, 0.025], [-0.29, -0.025], [-0.584, 0.052], [-0.588, -0.081]]) D.screw(stock, sx * 0.028, y, z, { axis: 'x', side: sx, r: 0.004, kind: 'hex' });
    K.slab(gunBand([[-0.309, -0.05], [-0.444, -0.076], [-0.564, -0.098]], 0.002), 0.003, gunBody, { x: sx * 0.025, bevel: 0.001, parent: stock });
  }
  K.cyl(0.01, 0.01, 0.1, gunDark, 0, -0.12, -0.5, stock, 6, 'y');
  K.cyl(0.014, 0.014, 0.015, gunBody, 0, -0.127, -0.5, stock, 12, 'y');
  gun.userData.fpStock = stock;
  K.box(0.04, 0.02, 0.1, gunTan, 0, -0.03, -0.26, 0, 0, 0, null, 0.006);
  // GB-173 (Jerry: a gap in the stock above the grip): the chassis is solid through the wrist, rear block to magwell,
  // under the action and above the grip and trigger.
  K.slab([[-0.245, 0.014], [-0.026, 0.014], [-0.026, -0.04], [-0.245, -0.04]], 0.056, gunTan, { bevel: 0.006 });
  // Round action with its bolt shroud, and the rail.
  // GB-180 pass 6: a beefier round action (r 0.036 -> 0.042), a big bolt shroud and a recoil lug under it.
  K.lathe([[0, -0.272], [0.018, -0.272], [0.024, -0.25], [0.027, -0.24], [0.027, 0.14], [0.022, 0.152], [0, 0.152]], gunBody, { y: 0.045, seg: 18 });
  K.box(0.031, 0.014, 0.34, gunDark, 0, 0.074, -0.02, 0, 0, 0, null, 0.002);   // the rail's base on the action's flat
  K.lathe([[0, -0.3], [0.014, -0.3], [0.02, -0.29], [0.022, -0.27], [0, -0.27]], gunDark, { y: 0.045, seg: 14 });
  K.box(0.05, 0.03, 0.03, gunDark, 0, 0.012, 0.12, 0, 0, 0, null, 0.004);
  K.rail(0.34, 0, 0.085, -0.02, null, 0.031);
  // Fluted heavy barrel, tapered, and a chunky ported brake.
  // GB-180 pass 5 (vs a real heavy-barrel bolt gun: ours was a pencil): a 30%-fatter contour barrel, deeper flutes, a
  // bigger brake with real side ports.
  K.lathe([[0, 0.13], [0.026, 0.13], [0.026, 0.2], [0.024, 0.225], [0.0185, 1.1], [0, 1.1]], gunAccent, { y: 0.04, seg: 16 });   // tip under t217 probe radius
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; K.box(0.005, 0.005, 0.46, gunDark, Math.cos(a) * 0.0205, 0.04 + Math.sin(a) * 0.0205, 0.78, 0, 0, a); }
  K.slab([[1.095, 0.019], [1.2, 0.019], [1.205, 0.025], [1.205, 0.055], [1.2, 0.061], [1.095, 0.061]], 0.046, gunMid, { bevel: 0.008 });   // pass 5: brake kept inside the can (t217)
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) K.box(0.006, 0.024, 0.018, gunRubber, sx * 0.023, 0.04, 1.115 + i * 0.03);
  // Scope: ocular, tube, saddle and objective in one turned profile; a rubber eyecup; turrets; rings.
  K.lathe([[0, -0.218], [0.028, -0.218], [0.032, -0.21], [0.032, -0.175], [0.027, -0.16], [0.024, -0.14], [0.0235, -0.13], [0.0235, 0.165], [0.028, 0.19],
           [0.038, 0.25], [0.039, 0.3], [0.039, 0.318], [0.034, 0.322], [0, 0.322]], gunDark, { y: 0.14, seg: 20 });
  K.lathe([[0.028, -0.236], [0.033, -0.236], [0.033, -0.214], [0.028, -0.214], [0.028, -0.236]], gunRubber, { y: 0.14, seg: 16 });
  K.disc(0.033, glassMat, 0, 0.14, 0.3225, 0, null, 16);
  K.disc(0.026, glassMat, 0, 0.14, -0.2185, Math.PI, null, 14);
  K.box(0.05, 0.052, 0.075, gunDark, 0, 0.14, 0.05, 0, 0, 0, null, 0.011);
  K.cyl(0.017, 0.017, 0.04, gunMid, 0, 0.185, 0.05, null, 14, 'y');
  K.cyl(0.017, 0.017, 0.04, gunMid, 0.044, 0.14, 0.05, null, 14, 'x');
  K.cyl(0.015, 0.015, 0.035, gunMid, -0.042, 0.14, 0.05, null, 12, 'x');
  // GB-174 (Jerry: the rings floated): each ring's base sits flush on the rail top (0.092), jaws hug the rail's sides
  // with a cross-bolt through a rail slot; a split ring clamps the 0.0255 tube on its axis (y 0.14).
  for (const z of [-0.061, 0.147]) {
    K.box(0.04, 0.016, 0.022, gunDark, 0, 0.1, z, 0, 0, 0, null, 0.003);
    for (const sx of [-1, 1]) K.box(0.006, 0.02, 0.022, gunDark, sx * 0.0185, 0.092, z, 0, 0, 0, null, 0.0015);
    K.cyl(0.003, 0.003, 0.05, gunMid, 0, 0.088, z, null, 8, 'x');
    K.box(0.03, 0.01, 0.018, gunDark, 0, 0.11, z, 0, 0, 0, null, 0.002);
    K.lathe([[0.0235, z - 0.009], [0.0295, z - 0.009], [0.031, z - 0.007], [0.031, z + 0.007], [0.0295, z + 0.009], [0.0235, z + 0.009]], gunDark, { y: 0.14, seg: 20 });
    for (const sx of [-1, 1]) D.screw(gun, sx * 0.031, 0.14 + 0.012, z, { axis: 'x', side: sx, r: 0.003, kind: 'torx' });
  }
  for (const z of [-0.164, -0.151, 0.303]) K.lathe([[0.023, z - 0.003], [z > 0 ? 0.041 : 0.029, z - 0.003], [z > 0 ? 0.041 : 0.029, z + 0.003], [0.023, z + 0.003]], gunBody, { y: 0.14, seg: 20 });
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    K.box(0.003, 0.015, 0.003, gunDark, Math.cos(a) * 0.0172, 0.195, 0.05 + Math.sin(a) * 0.0172, 0, -a, 0, null, 0);
  }
  // Bolt handle — GB-146 (Jerry, 2026-10-09: "The sniper bolt is on the wrong side") put it on the gun's right (-x) for
  // the eye of the time, which looked out of his (left-handed) head unmirrored. CL-306 (7 Nov): the first-person view
  // now mirrors his hold (D-75, VM.mirror), so -x read on the LEFT again; the handle is on +x (the gun's left) so it
  // reads on the right in first person, where Jerry looks. Lifts by turning about the bolt's axis (boltSide sets which
  // way), worked between shots and after the magazine is seated on a reload (sniperBoltPose).
  const BS = 1;   // the handle's side: +1 the gun's left (+x), -1 its right
  const bolt = K.group(BS * 0.04, 0.055, -0.18);   // CL-314: the root on the 38 mm action; the knob stays at x 0.13 (VM_SOCKETS.sniper.boltKnob)
  K.box(0.018, 0.018, 0.09, gunMid, 0, 0, 0, 0, 0, 0, bolt, 0.006);
  K.cyl(0.0065, 0.0065, 0.084, gunAccent, BS * 0.05, 0.012, 0.02, bolt, 8, 'x');
  K.sph(0.017, gunDark, BS * 0.09, 0.012, 0.02, bolt, 12);
  K.cyl(0.008, 0.008, 0.018, gunBody, BS * 0.063, 0.012, 0.02, bolt, 12, 'x');
  K.tor(0.012, 0.0015, gunBody, BS * 0.097, 0.012, 0.02, 0, Math.PI / 2, 0, bolt, Math.PI * 2, 12);
  bolt.userData.gb145Grab = new THREE.Vector3(BS * 0.09, 0.012, 0.02);   // the hand takes the knob
  gun.userData.bolt = bolt;
  gun.userData.boltSide = BS;
  gun.userData.baseBoltPos = bolt.position.clone();
  gun.userData.baseBoltRot = bolt.rotation.clone();
  // GB-301: for Claude's VM_RELOADS — the firing hand works this part after each shot and on the reload's work beat.
  // Grab is bolt-local (knob); beats match SNIPER_BOLT in index.html (fractions of the between-shot cycle).
  gun.userData.boltWork = {
    hand: 'fire',
    grab: [BS * 0.09, 0.012, 0.02],
    afterShot: { from: 0.08, to: 0.86, reach: 0.2, lift: [0.2, 0.35], back: [0.35, 0.52], fwd: [0.56, 0.72], down: [0.72, 0.85] },
    reloadWork: [0.62, 0.94]
  };
  gunEffects(gun, new THREE.Vector3(0, 0.04, 1.22), 0.055, 3.5, 10, 0.005);
  gun.userData.laser.position.set(0, 0.04, 6.2);
  gun.userData.laserBaseZ = 1.2;
  gun.userData.barrelAssembly = null;
  gunSuppressor(gun, K, 'sniper');   // CL-95
  return finishGun(gun);
}
