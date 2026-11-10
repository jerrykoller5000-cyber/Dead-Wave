// studio/gun-detail.js - CL-309 (D-121, Jerry 7 Nov: the fidelity upgrade): the small real parts every gun has, built as
// geometry that is ATTACHED (J14: "rivets or screws of a few guns floating off of the model"): every helper takes the point
// on the parent's surface and the outward axis, and sinks its base SINK into the parent, so nothing can float.
//
// Use (any builder, any file):
//   import { gunDetail } from './gun-detail.js';
//   const D = gunDetail(ctx);                    // ctx = weaponModelContext() (THREE and the materials)
//   D.screw(gun, 0.0345, 0.004, -0.04, { axis: 'x', side: -1 });            // a 3.2 mm slotted screw on the left face
//   D.ribs(gun, { x: 0.02, y: 0.06, z: -0.12, axis: 'x', side: 1, along: 'z', count: 8, pitch: 0.004, w: 0.018 });  // slide serrations
//   D.vents(gun, { x: 0, y: 0.08, z: 0.2, axis: 'y', along: 'z', count: 6, pitch: 0.012, w: 0.01, len: 0.006 });     // a row of slots
//   D.groove(gun, { x: 0, y: 0.03, z: 0, axis: 'y', along: 'z', len: 0.18, w: 0.0008 });                            // a panel line
//   D.rivet(gun, x, y, z, { axis: 'x', side: 1, r: 0.0025 });
//   D.pin(gun, x, y, z, { axis: 'x', len: 0.028, r: 0.0015 });                                                     // both ends proud
//   D.mats.steel / parkerized / polymer / wood / rubber / brass: the paint-ready set (one material per part kind: the camo
//   of GP-20045 paints every material but glass, lights, brass, rubber and the bore).
//
// Axes: 'x', 'y' or 'z' is the outward normal of the face the part sits on; side (+1/-1) which way along it. along: the
// face's direction a row runs along. All sizes in the gun's own metres (the builders' units before weaponSizeFactor).

const SINK = 0.0006;   // how far a part's base sits inside its parent (never 0: that is a float at any rounding)

// Adjacent dark valleys and raised accent bands retain their original width,
// pitch and overall span. Each band replaces that interval of the base.
export function drawWeaponRail(length, width, side, addBox) {
  const sideways = side === 1 || side === -1;
  function segment(start, end, raised) {
    if (end <= start) return;
    const across = width + (raised ? .006 : 0);
    const height = raised ? .018 : .014;
    const lift = raised ? .002 : 0;
    // Only the exposed tips have rounded end faces. A flat valley meets the
    // adjacent band across its face and keeps the dark strip continuous.
    const tip = start === -length / 2 || end === length / 2;
    const bevel = raised ? .002 : tip ? .003 : 0;
    addBox(sideways ? height : across, sideways ? across : height, end - start,
      bevel, raised, sideways ? side * lift : 0,
      sideways ? 0 : side === 2 ? -lift : lift, (start + end) / 2);
  }
  let start = -length / 2;
  for (let z = start + .012; z < length / 2 - .006; z += .026) {
    segment(start, z - .005, false);
    segment(z - .005, z + .005, true);
    start = z + .005;
  }
  segment(start, length / 2, false);
}

export function gunDetail(ctx) {
  const { THREE } = ctx;
  const T = THREE;
  const mats = {
    steel: ctx.gunMetal || new T.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.85, roughness: 0.42 }),
    parkerized: ctx.gunAccent || new T.MeshStandardMaterial({ color: 0x383b41, metalness: 0.1, roughness: 0.6 }),
    body: ctx.gunBody || new T.MeshStandardMaterial({ color: 0x484b51, metalness: 0.08, roughness: 0.66 }),
    dark: ctx.gunDark || new T.MeshStandardMaterial({ color: 0x27292d, metalness: 0.08, roughness: 0.68 }),
    polymer: ctx.gunPoly || new T.MeshStandardMaterial({ color: 0x323437, metalness: 0.03, roughness: 0.76 }),
    wood: ctx.woodMat || new T.MeshStandardMaterial({ color: 0x7a4b29, roughness: 0.6, metalness: 0.03 }),
    rubber: ctx.gunRubber || new T.MeshStandardMaterial({ color: 0x17181a, metalness: 0.0, roughness: 0.95 }),
    brass: ctx.brassMat || new T.MeshStandardMaterial({ color: 0xc69b45, metalness: 0.65, roughness: 0.3 }),
    bright: ctx.steelMat || new T.MeshStandardMaterial({ color: 0xb0b6bd, metalness: 0.62, roughness: 0.26 })
  };
  const unit = (axis) => (axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1]);
  const place = (m, parent, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  // A cylinder whose own axis lies along `axis` (CylinderGeometry stands along y).
  const alongAxis = (m, axis) => { if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2; return m; };
  // A box w (across the row) x h (proud) x len (along the row), oriented so h runs along `axis` and len along `along`.
  const box = (w, h, len, axis, along) => {
    const d = { x: 0, y: 0, z: 0 };
    d[axis] = h; d[along] = len;
    const third = ['x', 'y', 'z'].find((k) => k !== axis && k !== along);
    d[third] = w;
    return new T.BoxGeometry(d.x, d.y, d.z);
  };
  const D = {
    mats,
    SINK,
    // A screw head: r (3.2 mm as a rule), proud `head` (1.6 mm), its base SINK inside; a slot, a hex socket, a button
    // (domed) or a torx (a six-point star) in its face, in the dark material.
    screw(parent, x, y, z, o = {}) {
      const r = o.r || 0.0032, head = o.head || 0.0016, axis = o.axis || 'x', side = o.side || 1, kind = o.kind || 'slot';
      const mat = o.mat || mats.dark, slotMat = o.slotMat || mats.steel;
      const n = unit(axis), g = new T.Group();
      const h = head + SINK;
      const m = alongAxis(new T.Mesh(new T.CylinderGeometry(r, r, h, 14), mat), axis);
      place(m, g, n[0] * side * (h / 2 - SINK), n[1] * side * (h / 2 - SINK), n[2] * side * (h / 2 - SINK));
      const faceAt = head - 0.0003;   // the slot sits just under the head's face
      if (kind === 'slot') {
        const s = new T.Mesh(box(r * 1.5, 0.0008, r * 0.3, axis, axis === 'z' ? 'x' : 'z'), slotMat);
        place(s, g, n[0] * side * faceAt, n[1] * side * faceAt, n[2] * side * faceAt);
      } else if (kind === 'hex' || kind === 'torx') {
        const s = alongAxis(new T.Mesh(new T.CylinderGeometry(r * 0.45, r * 0.45, 0.0008, kind === 'hex' ? 6 : 12), slotMat), axis);
        place(s, g, n[0] * side * faceAt, n[1] * side * faceAt, n[2] * side * faceAt);
      } else if (kind === 'button') {
        const s = new T.Mesh(new T.SphereGeometry(r * 0.9, 12, 8), mat);
        place(s, g, n[0] * side * (head - r * 0.5), n[1] * side * (head - r * 0.5), n[2] * side * (head - r * 0.5));
      }
      g.position.set(x, y, z); parent.add(g);
      return g;
    },
    // A rivet or a dome: a sphere whose centre sits r*0.35 inside the surface (a low dome stands r*0.65 proud).
    rivet(parent, x, y, z, o = {}) {
      const r = o.r || 0.0025, axis = o.axis || 'x', side = o.side || 1, n = unit(axis);
      const m = new T.Mesh(new T.SphereGeometry(r, 10, 7), o.mat || mats.dark);
      return place(m, parent, x - n[0] * side * r * 0.35, y - n[1] * side * r * 0.35, z - n[2] * side * r * 0.35);
    },
    // A through pin: a cylinder of len along `axis` through the part, its ends proud by `proud` (0.4 mm) each side.
    pin(parent, x, y, z, o = {}) {
      const r = o.r || 0.0015, len = (o.len || 0.02) + 2 * (o.proud == null ? 0.0004 : o.proud), axis = o.axis || 'x';
      const m = alongAxis(new T.Mesh(new T.CylinderGeometry(r, r, len, 10), o.mat || mats.steel), axis);
      return place(m, parent, x, y, z);
    },
    // Ribs or serrations: `count` thin boxes along `along`, each `w` wide, proud by `h` (1.2 mm), `t` thick (1 mm),
    // `pitch` apart, centred on (x, y, z). The row's base sinks SINK into the face.
    ribs(parent, o) {
      const axis = o.axis || 'x', side = o.side || 1, along = o.along || 'z', count = o.count || 6, pitch = o.pitch || 0.004;
      const w = o.w || 0.012, h = (o.h || 0.0012) + SINK, t = o.t || 0.001, n = unit(axis), a = unit(along), mat = o.mat || mats.dark;
      const g = new T.Group();
      const geo = box(w, h, t, axis, along);
      for (let i = 0; i < count; i++) {
        const s = (i - (count - 1) / 2) * pitch;
        const m = new T.Mesh(geo, mat);
        place(m, g, a[0] * s + n[0] * side * (h / 2 - SINK), a[1] * s + n[1] * side * (h / 2 - SINK), a[2] * s + n[2] * side * (h / 2 - SINK));
      }
      g.position.set(o.x || 0, o.y || 0, o.z || 0); parent.add(g);
      return g;
    },
    // Vents: a row of `count` dark slots `w` across, `len` along the row, cut `deep` (1.5 mm) into the face (a dark box
    // whose outer face sits 0.2 mm inside the surface, so the slot reads as a hole and never z-fights).
    vents(parent, o) {
      const axis = o.axis || 'y', side = o.side || 1, along = o.along || 'z', count = o.count || 5, pitch = o.pitch || 0.01;
      const w = o.w || 0.008, len = o.len || 0.006, deep = o.deep || 0.0015, n = unit(axis), a = unit(along), mat = o.mat || mats.rubber;
      const g = new T.Group();
      const geo = box(w, deep, len, axis, along);
      for (let i = 0; i < count; i++) {
        const s = (i - (count - 1) / 2) * pitch, in_ = deep / 2 + 0.0002;
        const m = new T.Mesh(geo, mat);
        m.castShadow = false;
        place(m, g, a[0] * s - n[0] * side * in_, a[1] * s - n[1] * side * in_, a[2] * s - n[2] * side * in_);
      }
      g.position.set(o.x || 0, o.y || 0, o.z || 0); parent.add(g);
      return g;
    },
    // A panel line: a thin dark strip `w` wide (0.8 mm), `len` along `along`, lying in the face (0.2 mm proud so it
    // draws over the face, its other half inside it).
    groove(parent, o) {
      const axis = o.axis || 'y', side = o.side || 1, along = o.along || 'z', len = o.len || 0.1, w = o.w || 0.0008, n = unit(axis);
      const t = 0.0006, m = new T.Mesh(box(w, t, len, axis, along), o.mat || mats.rubber);
      m.castShadow = false;
      return place(m, parent, (o.x || 0) + n[0] * side * (t / 2 - 0.0001), (o.y || 0) + n[1] * side * (t / 2 - 0.0001), (o.z || 0) + n[2] * side * (t / 2 - 0.0001));
    },
    // Checkering: a field of small diamonds over an outline ([z, y] pairs) on a side face at x (sign = the face's side),
    // in the part's own material so a camo still paints it (studio/weapon-sidearms.js checkeredPanel, GP-164, shared here).
    checkering(parent, mat, outline, x, spacing = 0.007, radius = 0.0012) {
      const inside = (z, y) => {
        let hit = false;
        for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
          const a = outline[i], b = outline[j];
          if ((a[1] > y) !== (b[1] > y) && z < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
        }
        return hit;
      };
      const ys = outline.map((p) => p[1]), zs = outline.map((p) => p[0]);
      const p = [], n = [], uv = [], ix = [], sign = x < 0 ? -1 : 1;
      let row = 0;
      for (let y = Math.min(...ys) + spacing; y < Math.max(...ys) - radius; y += spacing, row++) {
        for (let z = Math.min(...zs) + spacing * (row % 2 ? 0.5 : 1); z < Math.max(...zs) - radius; z += spacing) {
          if (![[z, y + radius], [z + radius, y], [z, y - radius], [z - radius, y]].every((q) => inside(...q))) continue;
          const at = p.length / 3;
          for (const [dy, dz] of [[-radius, 0], [0, radius], [radius, 0], [0, -radius]]) { p.push(x, y + dy, z + dz); n.push(sign, 0, 0); uv.push((z + dz) * 4, (y + dy) * 4); }
          ix.push(...(sign > 0 ? [at, at + 2, at + 1, at, at + 3, at + 2] : [at, at + 1, at + 2, at, at + 2, at + 3]));
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(n, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(ix);
      const mesh = new T.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
      return mesh;
    },
    // A row of the same part (a screw, a rivet) along one axis: f(x, y, z) called `count` times, `pitch` apart.
    row(count, pitch, along, x, y, z, f) {
      const a = unit(along), out = [];
      for (let i = 0; i < count; i++) { const s = (i - (count - 1) / 2) * pitch; out.push(f(x + a[0] * s, y + a[1] * s, z + a[2] * s)); }
      return out;
    }
  };
  return D;
}

// Every detail mesh's base inside its parent: a check for the tests and the builders' own handoffs. Returns the parts
// (meshes under `root`, not root itself) whose bounding box does not overlap the box of anything else in the model by at
// least `tol` (metres): a floating part. Cheap and coarse (boxes), so a part that merely touches at a corner can pass; it
// catches what Jerry saw (a screw a few millimetres off the face).
export function floatingParts(THREE, root, tol = 0.0002) {
  root.updateMatrixWorld(true);
  const boxes = [];
  root.traverse((o) => { if (o.isMesh && o !== root && o.geometry && o.geometry.attributes.position) boxes.push({ o, b: new THREE.Box3().setFromObject(o) }); });
  const out = [];
  for (const { o, b } of boxes) {
    const grown = b.clone().expandByScalar(tol);
    let touches = false;
    for (const q of boxes) { if (q.o === o) continue; if (grown.intersectsBox(q.b)) { touches = true; break; } }
    if (!touches) out.push(o);
  }
  return out;
}
