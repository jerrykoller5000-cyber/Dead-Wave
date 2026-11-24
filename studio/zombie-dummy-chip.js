// CC-365 (Jerry D-225, 21 Nov 2026): the dummy-mode brain chip. Training's dummy mode (CH-2) sends zombies in that stand
// still and never attack; Jerry: "the zombies need to have a chip poking out of their brain like some sort of mad
// scientist put it in there to lobotomize them. (Chip only viewable when they are dummies)".
//
// A crude implant pushed into the skull: a bare circuit board standing up out of a stapled scalp wound on the top-front of
// the head, a black chip and two parts on it, a short steel antenna, three wires looping up from its top edge and back into
// the wound, two steel tabs screwed down either side, and a red LED that double-blinks (a shared emissive, no light).
// D-238 (Jerry: "Bigger chips in head so player can see"): 3x the first chip, so a player sees it at 8-12 m.
// No logos, text or markings (J168).
//
//   setDummyChip(zombie, on, THREE)   on: build it the first time (lazily), fit it to this head, show it.
//                                     off: hide it (nothing is built for a zombie that never was a dummy).
//   hasDummyChip(zombie)              true while it shows.
//
// Free when off: nothing exists until the first `on`; after that it is one hidden group under the head (three skips a
// hidden subtree). It never changes hit boxes or headshots: every mesh in it has an empty raycast, so the headshot and
// zombie-surface rays (game/zombie-headshots.js) pass through it as before. It rides the head bone, so it nods, turns,
// and goes with the head when the head is severed (the bone collapses to nothing and the chip with it).
// Two draws while it shows (the implant, and the LED), no shadows cast or received (a vertex-coloured standard material
// that receives shadows drew nothing on the WebGL2 fallback in the cloud), one shared material each for every zombie.
//
// Where: each kind has a spot on its skull (CHIP_SPOTS: a direction from the centre of its head's hit box, in the head's
// own axes, and a turn). The implant is placed where a ray along that direction meets the skull itself (the head's own
// meshes, never the eyes, hair cards or glass), and its scalp parts are bent to the skull's curve there (a height field
// from five rays), so nothing floats and nothing sinks except what is meant to (the board, the wire ends, the screws).
// The fit is kept per head build (geometry), so a pooled zombie that comes back as a dummy is not measured again.

const MM = 0.001;
// Per kind: dir = from the head box centre (head-local: +x the zombie's left, +y up, +z the face), turn = the board's
// heading about the skull normal (radians), size = a scale on the implant (1 = a 135 mm board standing ~140 mm out of a
// shambler's skull, its antenna another ~95 mm: D-238, Jerry: "Bigger chips in head so player can see").
// scalp: false = no wound or staples (the military's chip is bolted through his helmet: a drilled hole, tabs, screws).
// The board's face is turned toward the front of the head (then by turn), so a dummy facing the player shows it.
export const CHIP_SPOTS = Object.freeze({
  default: { dir: [0.3, 0.88, 0.38], turn: 0.25, size: 1, scalp: true },  // top-front: the side a dummy shows the player
  demon: { dir: [0.08, 1, 0.3], turn: 0.12, size: 1, scalp: true },        // between the horns
  military: { dir: [0.3, 0.86, 0.4], turn: 0.25, size: 1, scalp: false },  // through the helmet
  guardian: { dir: [0.12, 1, 0.05], turn: 0.2, size: 0.85, scalp: true },  // the middle of his flat skull, off its edges
});
export function chipSpot(kind) { return CHIP_SPOTS[kind] || CHIP_SPOTS.default; }

// Colours: worn surfaces under the 45% saturation cap (docs/art-direction.md); the LED is the one reserved red point,
// backed by its blink (rule 35).
const C = {
  board: 0x4a7a46, boardEdge: 0x355434, ic: 0x1c1d1f, pin: 0x9a9fa3, cap: 0x434d57, capTop: 0x8d9296,
  steel: 0x7b8085, screw: 0x8f9499, slot: 0x2a2c2e, staple: 0xa3a7ab,
  wound: 0x3a1613, woundWet: 0x521e19, rim: 0x6b3b34, crust: 0x2c1210,
  wireR: 0x6e302a, wireK: 0x262628, wireB: 0x56606b, aerial: 0x9da2a6,
  ledBody: 0x4a0d0a, led: 0xff2a1a,
};

const cache = new WeakMap();   // THREE -> { mat, ledMat, parts: Map(sizeKey -> { implant, led }) }
const fits = new WeakMap();    // head geometry -> Map(kind -> fit)
let t0 = 0, ledHold = null;
// Review pictures only: hold the LED lit (true), dark (false) or blinking (null).
export function dummyChipLedHold(v) { ledHold = v == null ? null : !!v; }

function shared(T) {
  let s = cache.get(T);
  if (s) return s;
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.28 });
  mat.name = 'dummy-chip';
  const ledMat = new T.MeshStandardMaterial({ color: C.ledBody, emissive: new T.Color(C.led), emissiveIntensity: 2.2, roughness: 0.25, metalness: 0 });
  ledMat.name = 'dummy-chip-led';
  s = { mat, ledMat };
  cache.set(T, s);
  return s;
}

// --- geometry ----------------------------------------------------------------------------------------------------------
// Pieces are built in the implant's frame (metres): origin on the skull at the wound's centre, +y out of the skull, the
// board's face toward +z. "bend" pieces are scalp pieces: their y is a height above the skull, bent to its curve later.
function pieces(T, scalp = true, lean = -0.1) {
  const out = [];
  const add = (geo, color, bend = false, m = null) => {
    if (m) geo.applyMatrix4(m);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count, col = new Float32Array(n * 3), c = new T.Color(color);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    g.userData.bend = bend;
    out.push(g);
  };
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
  const box = (w, h, d) => new T.BoxGeometry(w * MM, h * MM, d * MM);
  const cyl = (r, h, seg = 10) => new T.CylinderGeometry(r * MM, r * MM, h * MM, seg);

  // D-238: the board is bigger than the wound's share of it; the scalp parts keep 0.78 of their size so they stay on the skull.
  const W = 0.78;
  // The wound: a ragged dark opening (a fan with an uneven edge), a wetter inner slit along the board, a swollen rim.
  {
    const seg = 22, pos = [], rnd = (i) => 0.5 + 0.5 * Math.sin(i * 12.9898 + 4.1) * Math.cos(i * 7.233);
    const R = (a, i) => W * (17 + 5 * rnd(i)) * MM * (1 + 0.22 * Math.cos(a * 2));   // longer along the board (x)
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, r0 = R(a0, i), r1 = R(a1, (i + 1) % seg);
      pos.push(0, 0.35 * MM, 0, Math.cos(a1) * r1, 0.35 * MM, Math.sin(a1) * r1, Math.cos(a0) * r0, 0.35 * MM, Math.sin(a0) * r0);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    add(g, scalp ? C.wound : C.crust, true);
    if (scalp) {
      add(new T.CircleGeometry(1, 16), C.woundWet, true, M(0, 0.5 * MM, 0, -Math.PI / 2, 0, 0, 23 * MM, 6 * MM, 1));
      // The swollen, puckered scalp round it: a torus flattened onto the skull.
      add(new T.TorusGeometry(21 * W * MM, 1.5 * MM, 6, 28), C.rim, true, M(0, 0, 0, Math.PI / 2, 0, 0, 1.18, 0.92, 0.25));
      // Dried crust flecks on the rim.
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, r = W * (23 + (i % 3) * 2.2) * MM; add(new T.CircleGeometry(1, 7), C.crust, true, M(Math.cos(a) * r * 1.15, 1.0 * MM, Math.sin(a) * r, -Math.PI / 2, 0, a, (2.2 + (i % 2)) * MM, 1.6 * MM, 1)); }
    }
  }
  // Staples across the wound edge: a bar and two legs into the scalp, eight round the rim.
  for (let i = 0; scalp && i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2, r = 21 * W * MM, x = Math.cos(a) * r * 1.18, z = Math.sin(a) * r * 0.92;
    const m = M(x, 1.7 * MM, z, 0, -a, 0);   // bar across the edge (radial)
    add(box(7.5, 0.9, 1.1), C.staple, true, m.clone());
    add(box(0.9, 3.2, 1.1), C.staple, true, m.clone().multiply(M(3.3 * MM, -1.5 * MM, 0)));
    add(box(0.9, 3.2, 1.1), C.staple, true, m.clone().multiply(M(-3.3 * MM, -1.5 * MM, 0)));
  }
  // The board (D-238): 36 x 46 x 2.4 mm, only 8 mm of it in the skull, standing up out of the head: upright in the head's
  // own frame and back 6 degrees (lean, from the fit), whatever the skull's slope there, so its face shows to the front.
  const B = M(0, 0, 0, lean, 0, 0);
  const onBoard = (x, y, z, rx = 0, ry = 0, rz = 0) => B.clone().multiply(M(x * MM, y * MM, z * MM, rx, ry, rz));
  add(box(36, 46, 2.4), C.board, false, onBoard(0, 15, 0));
  add(box(36.4, 1.0, 2.8), C.boardEdge, false, onBoard(0, 38.2, 0));   // the cut top edge, a shade darker
  add(box(1.0, 46, 2.8), C.boardEdge, false, onBoard(-17.8, 15, 0));
  add(box(1.0, 46, 2.8), C.boardEdge, false, onBoard(17.8, 15, 0));
  // The black chip (no markings) with its legs, and two parts.
  add(box(13, 13, 2.6), C.ic, false, onBoard(-5, 17, 2.5));
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add(box(1.0, 1.4, 0.7), C.pin, false, onBoard(-10.2 + i * 2.6, 17 + s * 7.0, 1.6, 0, 0, Math.PI / 2));
  add(cyl(2.6, 6.5), C.cap, false, onBoard(10, 9, 4.4, Math.PI / 2, 0, 0));
  add(cyl(2.65, 0.6), C.capTop, false, onBoard(10, 9, 7.7, Math.PI / 2, 0, 0));
  add(box(5, 2.4, 1.6), C.ic, false, onBoard(10, 21, 2.0));
  // The LED's black bezel on the top-right corner (the LED itself is its own draw, so it can blink).
  add(box(12.5, 12.5, 1.6), C.ic, false, onBoard(10, 31, 2.0));
  // Header pins on the top edge, where the wires go in.
  for (let i = 0; i < 3; i++) { add(box(2.4, 3.2, 2.4), C.ic, false, onBoard(-3 + i * 4.2, 40.2, 0)); add(box(0.7, 2.2, 0.7), C.pin, false, onBoard(-3 + i * 4.2, 42.8, 0)); }
  // The antenna (D-238): a steel whip out of a black block on the top-left corner, a coil at its foot and a ball tip,
  // standing up and a little out: 26 mm on the board's scale (about 95 mm on a shambler).
  add(box(5, 4, 4), C.ic, false, onBoard(-13, 40, 0));
  {
    const tip = onBoard(-13, 42, 0, 0, 0, 0.14);
    add(cyl(0.75, 26, 6), C.aerial, false, tip.clone().multiply(M(0, 13 * MM, 0)));
    add(new T.SphereGeometry(1.9 * MM, 8, 6), C.aerial, false, tip.clone().multiply(M(0, 26.5 * MM, 0)));
    for (let i = 0; i < 4; i++) add(new T.TorusGeometry(2.0 * MM, 0.45 * MM, 4, 10), C.aerial, false, tip.clone().multiply(M(0, (2 + i * 1.6) * MM, 0, Math.PI / 2, 0, 0)));
  }
  // The tabs: two steel strips on the scalp either side of the board, each with a slotted screw.
  for (const s of [-1, 1]) {
    add(box(12, 1.3, 8), C.steel, true, M(s * 24.5 * MM, 1.1 * MM, 0, 0, 0, 0));
    add(box(1.6, 9, 8), C.steel, false, M(s * 19.0 * MM, 3.5 * MM, 0, 0, 0, 0));   // the bent-up lip against the board
    add(cyl(3.1, 2.0, 12), C.screw, true, M(s * 26.5 * MM, 2.4 * MM, 0));
    add(box(5.2, 0.8, 0.9), C.slot, true, M(s * 26.5 * MM, 3.15 * MM, 0, 0, s * 0.6, 0));
  }
  // Three wires out of the header pins: up in a loop that stands over the board (D-238), back, and down into the
  // wound's back edge.
  const wires = [[C.wireR, -3, [-6, 58, -6], [-12, 2, -14]], [C.wireK, 1.2, [3, 54, -10], [-3, 2, -15]], [C.wireB, 5.4, [11, 50, -7], [7, 2, -14]]];
  for (const [col, px, mid, end] of wires) {
    const top = new T.Vector3(px * MM, 44 * MM, 0).applyMatrix4(B);
    const pts = [top, new T.Vector3(px * MM, 50 * MM, 1.5 * MM).applyMatrix4(B), new T.Vector3(...mid.map((v) => v * MM)).applyMatrix4(B), new T.Vector3(mid[0] * MM * 1.2, 36 * MM, (mid[2] - 6) * MM).applyMatrix4(B), new T.Vector3(end[0] * MM, end[1] * MM + 9 * MM, end[2] * MM), new T.Vector3(end[0] * MM, -3 * MM, end[2] * MM)];
    add(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 28, 1.15 * MM, 6, false), col, false);
  }
  return out;
}

// The LED: a small domed body on the board's top corner (its own draw so it can blink without a light).
function ledGeometry(T, lean = -0.1) {
  // D-238: 10 mm across on the board's scale (about 37 mm on a shambler), on the bezel at the top-right corner.
  const g = new T.SphereGeometry(5 * MM, 12, 8);
  g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(10 * MM, 31 * MM, 3.2 * MM), new T.Quaternion(), new T.Vector3(1, 1, 0.75)));
  g.applyMatrix4(new T.Matrix4().makeRotationX(lean));
  return g;
}

// --- the fit -----------------------------------------------------------------------------------------------------------
function skullMeshes(head, eyes) {
  const list = [];
  head.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.dummyChip || o.userData.stump) return;
    if (!(o.visible || o.userData.skinSrc)) return;
    for (let n = o.parent; n && n !== head; n = n.parent) if (n.visible === false && !n.userData.skinSrc) return;
    if (eyes && eyes.includes(o)) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent || m.alphaTest > 0) return;
    if (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity || 0) > 0.2) return;   // eyes and glows
    list.push(o);
  });
  return list;
}

// Head-local: the skull point and normal where a ray from outside along dir (toward the box centre) first meets it.
function castLocal(T, head, list, origin, dirIn, ray, inv, nm) {
  const o = origin.clone().applyMatrix4(head.matrixWorld), d = dirIn.clone().transformDirection(head.matrixWorld);
  ray.set(o, d); ray.near = 0; ray.far = 10;
  const hits = ray.intersectObjects(list, false);
  const h = hits[0];
  if (!h) return null;
  const p = h.point.clone().applyMatrix4(inv);
  let n = null;
  if (h.face) { nm.getNormalMatrix(h.object.matrixWorld); n = h.face.normal.clone().applyMatrix3(nm).transformDirection(inv).normalize(); }
  return { p, n };
}

export function fitChip(T, zombie, head) {
  const u = zombie.mesh.userData;
  const list = skullMeshes(head, u.eyes);
  const key = list[0] ? list[0].geometry : head;
  const spot = chipSpot(zombie.typeKey);
  let byKind = fits.get(key);
  if (!byKind) fits.set(key, byKind = new Map());
  let f = byKind.get(zombie.typeKey);
  if (f) return f;
  zombie.mesh.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(head.matrixWorld).invert(), nm = new T.Matrix3(), ray = new T.Raycaster();
  // The head's hit box (game/zombie-headshots.js headCore, read as numbers only): its centre and size.
  const core = coreOf(zombie, head);
  const centre = new T.Vector3(0, core.cy, core.cz);
  const dir = new T.Vector3(...spot.dir).normalize();
  const reach = 0.8 * Math.max(core.x, core.y, core.z) * 4;
  const from = centre.clone().addScaledVector(dir, reach);
  const hit = castLocal(T, head, list, from, dir.clone().negate(), ray, inv, nm);
  let p, n;
  if (hit) { p = hit.p; n = hit.n && hit.n.dot(dir) > 0.2 ? hit.n : dir.clone(); }
  else { p = centre.clone().add(new T.Vector3(dir.x * core.x, dir.y * core.y, dir.z * core.z)); n = dir.clone(); }   // no skull found: the box
  // The implant's frame on the skull: +y the normal, +x the board's length (turned by spot.turn about the normal).
  const up = n.clone().normalize();
  // The board faces the front of the head: head +z laid onto the skull's tangent plane (head +y if the spot faces forward).
  let face = new T.Vector3(0, 0, 1).addScaledVector(up, -up.z);
  if (face.lengthSq() < 0.04) face = new T.Vector3(0, 1, 0).addScaledVector(up, -up.y);
  const z0 = face.normalize(), x0 = new T.Vector3().crossVectors(up, z0).normalize();
  const xa = x0.clone().multiplyScalar(Math.cos(spot.turn)).addScaledVector(z0, -Math.sin(spot.turn)).normalize();
  const za = new T.Vector3().crossVectors(xa, up).normalize();
  const basis = new T.Matrix4().makeBasis(xa, up, za);
  // D-238: the board stands upright in the world as the body stands when it is fitted (its lean undoes the skull's slope
  // about the board's long axis, and a hunched head's pitch), so on a sloped crown or helmet it does not lie forward over
  // the face and shows its face, not its edge, to the front. It then rides the head like the rest.
  const wu = new T.Vector3(0, 1, 0).transformDirection(inv);
  const lean = Math.max(-0.9, Math.min(0.9, Math.atan2(za.dot(wu), up.dot(wu)))) - 0.1;
  // Size: by the head's width in the world (a shambler's head is about 0.23 m across: 1), clamped; k is the implant
  // group's scale under the head bone (the bone may be scaled, and squashed by a pose: its mean is used).
  const hw = new T.Vector3(); head.getWorldScale(hw);
  const headScale = (Math.abs(hw.x) + Math.abs(hw.y) + Math.abs(hw.z)) / 3 || 1;
  // D-238 (Jerry, Director 23:00Z): 3x the first look so the player sees it at 8-12 m (capped on the biggest heads).
  const size = Math.min(6.4, 3.75 * Math.max(0.9, Math.min(2.2, (core.x * 2 * headScale) / 0.23)) * (spot.size || 1));
  const k = size / headScale;
  // The skull's curve under the implant: heights from four more rays (+-x, +-z at 24 mm), as h = a x^2 + b z^2 + c x + d z.
  const sL = 24 * MM, S = sL * k, heights = [];
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const q = p.clone().addScaledVector(xa, ax * S).addScaledVector(za, az * S);
    const h2 = castLocal(T, head, list, q.clone().addScaledVector(up, 0.15 * k), up.clone().negate(), ray, inv, nm);
    heights.push(h2 ? h2.p.clone().sub(p).dot(up) : 0);
  }
  const hx = heights.map((v) => Math.max(-0.02, Math.min(0.005, v / k)));   // head-local -> implant metres
  const curve = { a: (hx[0] + hx[1]) / (2 * sL * sL), b: (hx[2] + hx[3]) / (2 * sL * sL), c: (hx[0] - hx[1]) / (2 * sL), d: (hx[2] - hx[3]) / (2 * sL) };
  f = { kind: zombie.typeKey, p, basis, size, k, curve, lean, found: !!hit, heights: hx, scalp: spot.scalp !== false };
  byKind.set(zombie.typeKey, f);
  return f;
}

function coreOf(zombie, head) {
  // The same numbers as headCore (game/zombie-headshots.js), kept here so the chip never imports combat code.
  const u = zombie.mesh.userData;
  const s = u.headScale || Math.abs(u.legLG?.userData?.shinG?.position.y || 0.38) / 0.38;
  if (u.bossRig) return { x: 0.32, y: 0.26, z: 0.48, cy: 0.015, cz: 0.38 };
  if (zombie.typeKey === 'spider') return { x: 0.15 * s, y: 0.125 * s, z: 0.2 * s, cy: 0, cz: 0.015 * s };
  if (zombie.typeKey === 'shambler' && head.userData.cc359NeckJoin) return { x: 0.113 * s, y: 0.173 * s, z: 0.145 * s, cy: 0.2465 * s, cz: 0.017 * s };
  const heavy = ['brute', 'colossus', 'demon', 'guardian'].includes(zombie.typeKey), fat = zombie.typeKey === 'bomber';
  return { x: (heavy ? 0.185 : fat ? 0.174 : 0.155) * s, y: 0.195 * s, z: (fat ? 0.225 : 0.215) * s, cy: 0.015 * s, cz: 0.005 * s };
}

// Bent copies of the scalp pieces for this fit, merged with the rest: one geometry per fit (shared by every zombie
// whose head is the same build).
function implantGeometry(T, f) {
  if (f.geometry) return f.geometry;
  const parts = pieces(T, f.scalp, f.lean);
  let total = 0; for (const g of parts) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), col = new Float32Array(total * 3);
  const { a, b, c, d } = f.curve;
  let k = 0;
  for (const g of parts) {
    const P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color;
    for (let i = 0; i < P.count; i++, k++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
      if (g.userData.bend) {
        y += a * x * x + b * z * z + c * x + d * z;
        // tilt the normal with the slope
        const sx = 2 * a * x + c, sz = 2 * b * z + d;
        const l = Math.hypot(nx - ny * sx, ny, nz - ny * sz) || 1;
        nx = (nx - ny * sx) / l; nz = (nz - ny * sz) / l; ny = ny / l;
      }
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      nrm[k * 3] = nx; nrm[k * 3 + 1] = ny; nrm[k * 3 + 2] = nz;
      col[k * 3] = Cc.getX(i); col[k * 3 + 1] = Cc.getY(i); col[k * 3 + 2] = Cc.getZ(i);
    }
    g.dispose();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  geo.userData.dummyChip = true;
  f.geometry = geo;
  return geo;
}

const noRay = () => {};
function blink(ledMat) {
  return () => {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    if (!t0) t0 = now;
    const ph = (now - t0) % 1.2;
    if (ledHold != null) { ledMat.emissiveIntensity = ledHold ? 5 : 0.15; return; }
    ledMat.emissiveIntensity = ph < 0.16 || (ph > 0.32 && ph < 0.46) ? 5 : 0.15;   // a double blink, then a dim second
  };
}

function build(T, zombie, head) {
  const s = shared(T), f = fitChip(T, zombie, head);
  const g = new T.Group();
  g.name = 'dummy-chip';
  g.userData.dummyChip = true;
  g.matrixAutoUpdate = false;
  const implant = new T.Mesh(implantGeometry(T, f), s.mat);
  implant.name = 'dummy-chip-implant';
  const led = new T.Mesh(f.ledGeo || (f.ledGeo = ledGeometry(T, f.lean)), s.ledMat);
  led.name = 'dummy-chip-led';
  // The LED's own height on the bent scalp is not needed: it sits on the board, which is not bent.
  for (const m of [implant, led]) { m.raycast = noRay; m.castShadow = false; m.receiveShadow = false; m.userData.dummyChip = true; m.matrixAutoUpdate = false; m.updateMatrix(); }
  led.onBeforeRender = blink(s.ledMat);
  g.add(implant, led);
  g.matrix.copy(new T.Matrix4().compose(f.p, new T.Quaternion().setFromRotationMatrix(f.basis), new T.Vector3(f.k, f.k, f.k)));
  g.userData.fit = f;
  g.matrixWorldNeedsUpdate = true;
  head.add(g);
  return g;
}

function headOf(zombie) {
  const u = zombie && zombie.mesh && zombie.mesh.userData;
  if (!u) return null;
  return (u.bossRig && u.bossRig.userData && u.bossRig.userData.rig && u.bossRig.userData.rig.head) || u.head || null;
}

export function setDummyChip(zombie, on, T) {
  const head = headOf(zombie);
  if (!head) return false;
  const u = zombie.mesh.userData;
  let g = u.dummyChip;
  if (g && g.parent !== head) { g.removeFromParent(); g = u.dummyChip = null; }
  if (!on) { if (g) g.visible = false; return false; }
  if (zombie.typeKey === 'caveguard') return false;   // never the Cave Guard
  if (!T) return false;
  if (g && g.userData.fit !== fitChip(T, zombie, head)) { g.removeFromParent(); g = u.dummyChip = null; }   // a pooled body with another head
  if (!g) g = u.dummyChip = build(T, zombie, head);
  g.visible = true;
  return true;
}
export function hasDummyChip(zombie) { const g = zombie && zombie.mesh && zombie.mesh.userData.dummyChip; return !!(g && g.visible); }
