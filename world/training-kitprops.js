// CG-7 (Jerry D-226, 21 Nov 2026: "these props need higher fidelity and the ability to be shot and destroyed";
// D-230: the ear-defender tray onto the bench). The small Training props, rebuilt at the guns' and the marine's detail:
// real proportions, rolled rims, wall thickness, handles, clips, bristles, foam. Built here once, so the same builder
// gives the still prop (baked into the room's kit draw) and, later (CG-7 step 2), its loose copy when it is shot.
//
// Every builder makes its prop round its own base: local origin at the floor (or worktop) under its centre, +y up.
// Nothing here is placed in the room: training-wear.js places them.
//
//   buildKitProp(T, id, P) -> Group (userData.propId = id)
//     id: 'mug' | 'clipboard' | 'brassBucket' | 'pushBroom' | 'earTray' | 'mopBucket' | 'mop' | 'squeegee' | 'glove'
//         | 'sharpsBin' | 'markers' | 'medMug' (CG-7 s2, D-240: shootable) | 'whiteboard' | 'sharpsBracket' (fixed: built here, never loose)
//     P: { mk(geo, swatch, x, y, z, parent, shadow?) -> Mesh, tiny(mesh) -> mesh, opts? }
//   KIT_PROPS: the ids and their real sizes (metres), for the tests
//
// Swatches are names in training-wear.js's WEAR.STORY.SWATCH_NAMES (one flat colour each, the room's kit sheet).

export const KIT_PROPS = Object.freeze({
  mug: Object.freeze({ h: 0.0958, r: 0.0395 }),                       // a 300 ml enamel-look mug
  clipboard: Object.freeze({ w: 0.23, d: 0.315, t: 0.003 }),          // letter hardboard
  brassBucket: Object.freeze({ h: 0.272, rTop: 0.152, rBot: 0.12 }), // a 10 l steel pail
  pushBroom: Object.freeze({ head: 0.457, handle: 1.37 }),            // an 18 in push broom
  earTray: Object.freeze({ w: 0.52, d: 0.34, h: 0.07 }),              // a shallow parts tray, three ear defenders
  mopBucket: Object.freeze({ w: 0.44, d: 0.34, h: 0.28, y0: 0.06 }),  // a 26 qt janitor's bucket on casters, side-press wringer
  mop: Object.freeze({ strands: 0.3 }),                                // a cotton string mop (the handle's length is where it leans)
  squeegee: Object.freeze({ blade: 0.55, handle: 1.4 }),               // a 22 in floor squeegee
  glove: Object.freeze({ len: 0.24, w: 0.1 }),                          // a tactical shooting glove, size M (CH-3 #18)
  sharpsBin: Object.freeze({ w: 0.15, d: 0.1, h: 0.19 }),               // CG-7 s2 (CF-23): a 2 l wall sharps bin (body; the lid adds ~4 cm)
  markers: Object.freeze({ len: 0.135, r: 0.0085 })                     // CG-7 s2 (CF-23): two dry-wipe markers and a board eraser in the tray
});

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

export function buildKitProp(T, id, P) {
  const g = new T.Group(); (g.userData || (g.userData = {})).propId = id;
  // (a stand-in THREE in the canvas tests has only planes, boxes and groups: nothing is built there)
  if (!(T.LatheGeometry && T.TubeGeometry && T.ExtrudeGeometry && T.SphereGeometry && T.TorusGeometry && T.CylinderGeometry
    && T.Vector2 && T.Vector3 && T.Shape && T.Quaternion && T.Matrix4 && T.CatmullRomCurve3)) return g;
  const mk = (geo, sw, x, y, z, parent = g, shadow = true) => P.mk(geo, sw, x, y, z, parent, shadow);
  const tiny = P.tiny || ((m) => m);
  const part = (m, name) => { if (name) (m.userData || (m.userData = {})).part = name; return m; };   // CG-7 step 2: how it comes apart
  const V2 = (x, y) => new T.Vector2(x, y), V3 = (x, y, z) => new T.Vector3(x, y, z);
  const lathe = (pts, sw, seg, x = 0, y = 0, z = 0, parent = g) => mk(new T.LatheGeometry(pts.map(([r, h]) => V2(r, h)), seg), sw, x, y, z, parent);
  const cyl = (rt, rb, h, sw, x, y, z, seg = 10, parent = g) => mk(new T.CylinderGeometry(rt, rb, h, seg), sw, x, y, z, parent);
  const box = (w, h, d, sw, x, y, z, parent = g) => mk(new T.BoxGeometry(w, h, d), sw, x, y, z, parent);
  const tube = (pts, r, sw, seg = 16, rs = 6, parent = g) => mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(([x, y, z]) => V3(x, y, z))), seg, r, rs), sw, 0, 0, 0, parent);
  // a rounded-rectangle slab, w (x) by d (z), t thick, its bottom on y = 0 (corner radius rr)
  // (three's ExtrudeGeometry builds no caps without a bevel here: a small bevel, the outline shrunk by it)
  const slab = (w, d, t, rr, sw, x, y, z, parent = g, hole = null) => {
    const bv = Math.min(0.0015, t / 4), s = new T.Shape(), X = w / 2 - bv, Z = d / 2 - bv, r = Math.min(rr, X * 0.9, Z * 0.9);
    s.moveTo(-X + r, -Z); s.lineTo(X - r, -Z); s.quadraticCurveTo(X, -Z, X, -Z + r); s.lineTo(X, Z - r); s.quadraticCurveTo(X, Z, X - r, Z);
    s.lineTo(-X + r, Z); s.quadraticCurveTo(-X, Z, -X, Z - r); s.lineTo(-X, -Z + r); s.quadraticCurveTo(-X, -Z, -X + r, -Z);
    if (hole && T.Path) {
      const [hw, hd, hr] = hole, hx = hw / 2 + bv, hz = hd / 2 + bv, q = Math.min(hr, hx * 0.9, hz * 0.9), p = new T.Path();
      p.moveTo(-hx + q, -hz); p.quadraticCurveTo(-hx, -hz, -hx, -hz + q); p.lineTo(-hx, hz - q); p.quadraticCurveTo(-hx, hz, -hx + q, hz);
      p.lineTo(hx - q, hz); p.quadraticCurveTo(hx, hz, hx, hz - q); p.lineTo(hx, -hz + q); p.quadraticCurveTo(hx, -hz, hx - q, -hz); p.lineTo(-hx + q, -hz);
      s.holes.push(p);
    }
    const geo = new T.ExtrudeGeometry(s, { depth: t - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 1, curveSegments: 3 });
    geo.rotateX(Math.PI / 2); geo.translate(0, t - bv, 0);   // the shape's y becomes +z, its front cap the top: bottom on y = 0
    return mk(geo, sw, x, y, z, parent);
  };
  // One ear defender as worn (band up over +y, the cups at +-x facing in, their ovals upright), into group m: the tray's
  // three and the one on the rack (CH-3 #16) share it.
  const earDefender = (m) => {
    for (const s of [-1, 1]) {
      const f = new T.Group(); f.position.set(s * 0.024, 0, 0); m.add(f);   // the cup's frame: +y out of the head, +z up
      f.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(V3(0, 0, s), V3(s, 0, 0), V3(0, 1, 0)));
      const shell = mk(new T.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2), 'earcup', 0, 0, 0, f);
      shell.scale.set(0.031, 0.035, 0.039);
      const rim = mk(new T.CylinderGeometry(1, 1, 1, 16), 'earcup', 0, -0.003, 0, f); rim.scale.set(0.031, 0.006, 0.039);
      const cg = new T.TorusGeometry(1, 0.3, 6, 18); cg.rotateX(Math.PI / 2);
      const cush = mk(cg, 'foam', 0, -0.0145, 0, f); cush.scale.set(0.024, 0.027, 0.031);   // the foam ring, facing in
      const pad = mk(new T.CylinderGeometry(1, 1, 1, 14), 'foam', 0, -0.009, 0, f); pad.scale.set(0.019, 0.003, 0.025);   // the liner
      box(0.012, 0.016, 0.03, 'earband', s * 0.04, 0.046, 0, m);                       // the yoke over the cup
      for (const dz of [-0.0075, 0.0075]) {                                            // two wire sliders up to the band
        const a = V3(s * 0.041, 0.05, dz), b = V3(s * 0.07, 0.078, dz);
        const w = cyl(0.0017, 0.0017, a.distanceTo(b), 'alu', (a.x + b.x) / 2, (a.y + b.y) / 2, dz, 6, m);
        w.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
      }
      box(0.01, 0.016, 0.024, 'earband', s * 0.07, 0.082, 0, m);                       // the band's end block
    }
    mk(new T.TorusGeometry(0.07, 0.0042, 5, 22, Math.PI), 'earband', 0, 0.082, 0, m);  // the spring band
    const crown = mk(new T.TorusGeometry(0.07, 0.0095, 7, 12, Math.PI * 0.5), 'foam', 0, 0.082, 0, m);
    crown.rotation.z = Math.PI * 0.25; crown.scale.z = 1.6;                            // the padded crown
  };

  if (id === 'medMug') {   // CG-7 s2: the medic's mug by the monitor (was a plain cylinder): the same mug, white
    const m = buildKitProp(T, 'mug', { ...P, opts: { ...(P.opts || {}), sw: 'whitemug' } }); m.userData.propId = 'medMug'; return m;
  }
  if (id === 'mug') {
    // A 4 mm wall with a rolled lip, a foot ring, coffee two thirds down with a meniscus, a stain ring where it stood
    // longest, one dried drip under the lip, and a D handle a little flatter than it is deep.
    lathe([[0, 0.003], [0.027, 0.003], [0.0295, 0], [0.0362, 0.0004], [0.0381, 0.004], [0.0391, 0.03], [0.0394, 0.088],
      [0.0395, 0.0935], [0.0389, 0.0953], [0.0377, 0.0958], [0.0365, 0.0951], [0.0359, 0.0925], [0.0352, 0.03],
      [0.0346, 0.0135], [0.0325, 0.0095], [0.027, 0.0083], [0, 0.0083]], (P.opts && P.opts.sw) || 'mug', 22);
    part(lathe([[0.0347, 0.0668], [0.031, 0.0657], [0, 0.0655]], 'coffee', 22), 'spill');
    part(tiny(lathe([[0.03515, 0.0745], [0.03515, 0.0668]], 'stain', 22)), 'spill');                       // the old level, a brown ring
    { const d = box(0.0055, 0.024, 0.0012, 'stain', 0, 0.081, -0.0397); tiny(d); d.rotation.x = 0.03; }   // a dried drip
    const hd = tube([[0.0375, 0.079, 0], [0.056, 0.0775, 0], [0.0655, 0.064, 0], [0.065, 0.04, 0], [0.0555, 0.0255, 0], [0.0375, 0.023, 0]], 0.0048, (P.opts && P.opts.sw) || 'mug', 18, 7);
    hd.scale.z = 1.35;
    return g;
  }

  if (id === 'clipboard') {
    // Hardboard with round corners; a stack of sheets, their edges a little out of true; the qualification card on top
    // (training-wear.js prints it); a lever clip on two rivets (base plate, spring roll, lever, jaw); a pen.
    const C = KIT_PROPS.clipboard, r = rng(41);
    slab(C.w, C.d, C.t, 0.009, 'hardboard', 0, 0, 0);
    for (let k = 0; k < 4; k++) {
      const s = part(box(0.2135, 0.0007, 0.276, 'paper', (r() - 0.5) * 0.004, C.t + 0.00035 + k * 0.0007, -0.008 + (r() - 0.5) * 0.004), k > 0 ? 'sheet' : null);
      s.rotation.y = (r() - 0.5) * 0.02;
    }
    const top = C.t + 4 * 0.0007, cz = C.d / 2 - 0.026;                                   // the clip's line, near the top end
    box(0.1, 0.0016, 0.03, 'clip', 0, C.t + 0.0008, cz + 0.004);                            // base plate on the board
    for (const sx of [-0.036, 0.036]) cyl(0.0035, 0.0035, 0.0024, 'alu', sx, C.t + 0.0024, cz + 0.012, 8);   // rivets
    { const roll = cyl(0.0052, 0.0052, 0.088, 'clip', 0, top + 0.0052, cz, 12); roll.rotation.z = Math.PI / 2; }   // the spring roll
    { const jaw = box(0.082, 0.0016, 0.024, 'clip', 0, top + 0.0011, cz - 0.014); jaw.rotation.x = -0.05; }        // the jaw on the paper
    { const lv = box(0.06, 0.0018, 0.05, 'clip', 0, top + 0.0135, cz + 0.016); lv.rotation.x = -0.42; }            // the lever, up off the roll
    { const lip = box(0.06, 0.0018, 0.012, 'clip', 0, top + 0.0225, cz + 0.042); lip.rotation.x = 0.35; }          // its turned thumb lip
    { const pen = new T.Group(); pen.position.set(0.078, top + 0.0045, -0.03); pen.rotation.y = 0.32; g.add(pen);
      const b = part(cyl(0.0045, 0.0045, 0.118, 'marker', 0, 0, 0, 10, pen), 'pen:1'); b.rotation.x = Math.PI / 2;
      const tip = part(cyl(0.0045, 0.0012, 0.016, 'alu', 0, 0, -0.067, 10, pen), 'pen:1'); tip.rotation.x = -Math.PI / 2;
      const cap = part(cyl(0.0049, 0.0049, 0.03, 'earband', 0, 0, 0.05, 10, pen), 'pen:1'); cap.rotation.x = Math.PI / 2;
      part(box(0.0025, 0.0022, 0.022, 'alu', 0, 0.0052, 0.048, pen), 'pen:1'); }                           // the cap's clip
    g.userData.cardY = top + 0.0003; g.userData.cardZ = -0.03;
    return g;
  }

  if (id === 'brassBucket') {
    // A galvanised pail: a tapered wall with two pressed ribs, a rolled bead at the brim, a chime ring under it, two ears
    // and a wire bail with a black grip, laid down to one side. Inside, a heap of spent brass, not a flat lid.
    const B = KIT_PROPS.brassBucket, h = B.h, r = rng(7);
    const wall = (y) => B.rBot + (B.rTop - B.rBot) * (y / h);
    const out = [[B.rBot - 0.004, 0.0], [B.rBot + 0.001, 0.003], [B.rBot + 0.001, 0.009], [wall(0.012), 0.012]];
    for (const ry of [0.085, 0.175]) out.push([wall(ry - 0.008), ry - 0.008], [wall(ry) + 0.0035, ry], [wall(ry + 0.008), ry + 0.008]);
    out.push([wall(h - 0.012), h - 0.012]);
    for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 6 * 1.6; out.push([wall(h) + 0.0035 + Math.cos(a) * 0.0045, h - 0.0045 + 0.0045 + Math.sin(a) * 0.0045]); }   // the rolled bead
    const inner = [[wall(h) - 0.003, h - 0.004], [wall(0.02) - 0.003, 0.02], [B.rBot - 0.006, 0.012], [0, 0.012]];
    // (Director 22:24Z: the pail read dark grey: galvanised zinc now, so it reads as a metal pail with the brass in it)
    lathe([...out, ...inner], 'clip', 28);
    lathe([[0, 0.0015], [B.rBot - 0.004, 0.0015], [B.rBot - 0.004, 0.0]], 'clip', 28);   // its floor's underside
    // the brass: a heap (dark between the cases), then loose cases lying on it
    const H0 = 0.205, peak = 0.238;
    const heap = []; for (let k = 6; k >= 0; k--) { const t = k / 6; heap.push([t * (wall(H0) - 0.004), peak - (peak - H0) * t * t]); }
    part(lathe(heap, 'brassdk', 24), 'heap');
    for (let i = 0; i < 64; i++) {
      const rad = Math.sqrt(r()) * (wall(H0) - 0.018), a = r() * Math.PI * 2, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const y = peak - (peak - H0) * Math.pow(rad / (wall(H0) - 0.004), 2) + 0.0045;
      const long = i % 4 === 0, c = part(cyl(0.0048, long ? 0.0032 : 0.0048, long ? 0.045 : 0.019, 'brass', x, y, z, 7), 'case');
      c.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.35, r() * Math.PI * 2, 0, 'YXZ');
    }
    // ears and bail
    for (const s of [-1, 1]) { const e = box(0.006, 0.03, 0.022, 'clip', s * (wall(h - 0.025) + 0.003), h - 0.025, 0); e.rotation.z = s * -0.11; }
    const bail = new T.Group(); bail.position.set(0, h - 0.022, 0); bail.rotation.x = 1.45; g.add(bail);   // laid over to -z, resting on the rim
    const R0 = wall(h - 0.022) + 0.006;
    mk(new T.TorusGeometry(R0, 0.0022, 5, 26, Math.PI), 'alu', 0, 0, 0, bail);
    { const gp = cyl(0.0105, 0.0105, 0.11, 'earband', 0, R0, 0, 10, bail); gp.rotation.z = Math.PI / 2; }
    return g;
  }

  if (id === 'pushBroom') {
    // An 18 in push broom: a lacquered block with chamfered top edges, three rows of black tufts a little splayed, a steel
    // brace and threaded socket, a turned wooden handle with a hang hole near its end. Local: the head flat on the floor
    // along x, the handle rising toward -z at `opts.lean` from the floor (P.opts.lean, radians; default 0.6).
    const L = KIT_PROPS.pushBroom, lean = (P.opts && P.opts.lean) || 0.6, r = rng(13);
    const bh = 0.076, hw = L.head, hd = 0.064, ht = 0.038;
    const head = slab(hw, hd, ht - 0.008, 0.006, 'broomwood', 0, bh, 0);
    void head;
    { const cap = box(hw - 0.016, 0.008, hd - 0.016, 'broomwood', 0, bh + ht - 0.004, 0); void cap; }   // the chamfered top
    for (let row = 0; row < 3; row++) for (let k = 0; k < 19; k++) {
      const x = -hw / 2 + 0.018 + k * (hw - 0.036) / 18, z = (row - 1) * 0.019;
      const t = box(0.017, bh - 0.002, 0.015, 'bristle', x + (r() - 0.5) * 0.003, bh / 2 + 0.002, z);   // their ends 1-3 mm off the floor (tilted)
      t.rotation.set((row - 1) * 0.08 + (r() - 0.5) * 0.06, 0, (r() - 0.5) * 0.06);
    }
    // the handle's line: from the socket on the head's top, up and back at `lean`
    const dir = V3(0, Math.sin(lean), -Math.cos(lean)), base = V3(0, bh + ht, 0);
    const at = (d) => base.clone().addScaledVector(dir, d);
    const q = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
    const along = (geo, sw, d) => { const m = mk(geo, sw, ...at(d).toArray()); m.quaternion.copy(q); return m; };
    along(new T.CylinderGeometry(0.0125, 0.0165, 0.05, 12), 'alu', 0.025);              // threaded steel socket
    { const p = box(0.12, 0.004, 0.03, 'alu', 0, bh + ht + 0.002, 0.006); void p; }      // its mounting plate
    for (const s of [-1, 1]) {                                                              // the brace: two straps, plate to collar
      const a = V3(s * 0.15, bh + ht + 0.003, 0), b = at(0.16).add(V3(s * 0.014, 0, 0));
      const m = mk(new T.BoxGeometry(0.012, a.distanceTo(b), 0.003), 'alu', (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    }
    along(new T.CylinderGeometry(0.0165, 0.0165, 0.03, 12), 'alu', 0.16);                // the brace's collar
    along(new T.CylinderGeometry(0.014, 0.014, L.handle - 0.05, 12), 'handle', 0.05 + (L.handle - 0.05) / 2);
    along(new T.CylinderGeometry(0.0115, 0.014, 0.02, 12), 'handle', L.handle + 0.01);   // the turned end
    g.userData.top = at(L.handle + 0.02);
    return g;
  }

  if (id === 'earTray') {
    // A shallow moulded tray (6 mm walls, round corners, a rolled lip) with three ear defenders lying in it on their
    // sides: oval shells, foam cushions facing each other, a padded band on two wire sliders each side.
    const E = KIT_PROPS.earTray, wt = 0.006;
    slab(E.w, E.d, 0.005, 0.03, 'tote', 0, 0, 0);                                         // floor
    slab(E.w, E.d, E.h - 0.005, 0.03, 'tote', 0, 0.005, 0, g, [E.w - 2 * wt, E.d - 2 * wt, 0.025]);   // the walls
    slab(E.w + 0.008, E.d + 0.008, 0.004, 0.034, 'tote', 0, E.h - 0.004, 0, g, [E.w - 2 * wt, E.d - 2 * wt, 0.025]);   // the lip
    // One ear defender built as worn (band up over +y, the cups at +-x facing in, their ovals upright), then laid down
    // in the tray: the band flat on the floor, the cups standing on their rims side by side, as Jerry's picture had them.
    const muff = (x, z, ry) => {
      const m = new T.Group(); m.position.set(x, 0.005 + 0.031, z); m.rotation.set(-Math.PI / 2, ry, 0, 'YXZ'); g.add(m);
      earDefender(m);
      const tag = 'muff:' + (nMuff++); m.traverse((o) => { if (o.isMesh) part(o, tag); });   // CG-7 step 3: each flies loose whole
    };
    let nMuff = 0;
    muff(-0.165, 0.06, 0.05); muff(0, 0.065, -0.04); muff(0.165, 0.055, 0.07);
    return g;
  }

  if (id === 'mopBucket') {
    // A janitor's mop bucket: a tub with round corners, a pressed rib and a rolled rim, on a dark base frame with four
    // swivel casters; grey water two thirds up with a pale scum line at the wall; a side-press wringer seated on the rim
    // at the +x end, its lever up to hip height with a black grip.
    const M = KIT_PROPS.mopBucket, wt = 0.012, y0 = M.y0, hole = [M.w - 2 * wt, M.d - 2 * wt, 0.045];
    slab(M.w - 0.04, M.d - 0.04, 0.02, 0.04, 'earband', 0, y0 - 0.02, 0);                 // the base frame
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {                       // casters: plate, fork, wheel
      const cx = sx * (M.w / 2 - 0.055), cz = sz * (M.d / 2 - 0.055);
      cyl(0.022, 0.022, 0.006, 'alu', cx, y0 - 0.023, cz, 10);
      for (const fz of [-0.013, 0.013]) box(0.03, 0.03, 0.004, 'alu', cx + 0.006, y0 - 0.04, cz + fz);
      const wh = cyl(0.022, 0.022, 0.018, 'earband', cx + 0.012, 0.022, cz, 12); wh.rotation.x = Math.PI / 2;
      const hub = cyl(0.008, 0.008, 0.026, 'alu', cx + 0.012, 0.022, cz, 8); hub.rotation.x = Math.PI / 2;
    }
    slab(M.w, M.d, wt, 0.05, 'mopyellow', 0, y0, 0);                                       // floor
    slab(M.w, M.d, M.h - wt, 0.05, 'mopyellow', 0, y0 + wt, 0, g, hole);                  // walls
    slab(M.w + 0.008, M.d + 0.008, 0.016, 0.054, 'mopyellow', 0, y0 + 0.12, 0, g, hole);  // the pressed rib
    slab(M.w + 0.014, M.d + 0.014, 0.012, 0.057, 'mopyellow', 0, y0 + M.h - 0.012, 0, g, hole);   // the rim
    { const sp = box(0.05, 0.012, 0.03, 'mopyellow', -M.w / 2 - 0.012, y0 + M.h - 0.004, M.d / 2 - 0.07); sp.rotation.z = 0.25; }   // the pour lip
    const wy = y0 + 0.19;                                                                   // the water
    slab(M.w - 2 * wt - 0.002, M.d - 2 * wt - 0.002, 0.004, 0.044, 'scuff', 0, wy, 0);
    tiny(slab(M.w - 2 * wt - 0.002, M.d - 2 * wt - 0.002, 0.003, 0.044, 'mophead', 0, wy + 0.003, 0, g, [M.w - 2 * wt - 0.022, M.d - 2 * wt - 0.022, 0.035]));   // scum at the wall
    // the wringer: a housing straddling the rim at +x, the press plate inside, the lever on a pivot, its grip
    const wx = M.w / 2 - 0.085, top = y0 + M.h;
    box(0.15, 0.14, M.d - 0.03, 'pail', wx, top + 0.01, 0);                                 // housing over the rim
    for (const s of [-1, 1]) box(0.15, 0.03, 0.012, 'pail', wx, top + 0.065, s * (M.d / 2 - 0.021));   // its side cheeks
    { const pl = box(0.012, 0.15, M.d - 0.06, 'alu', wx - 0.04, top + 0.02, 0); pl.rotation.z = -0.18; }   // the press plate
    const pv = V3(wx + 0.05, top + 0.075, M.d / 2 - 0.004);
    { const p = cyl(0.012, 0.012, 0.02, 'alu', pv.x, pv.y, pv.z, 10); p.rotation.x = Math.PI / 2; }
    const tipP = V3(wx - 0.02, y0 + 0.92, M.d / 2 + 0.005), L = pv.distanceTo(tipP);
    { const lv = box(0.022, L, 0.012, 'pail', (pv.x + tipP.x) / 2, (pv.y + tipP.y) / 2, (pv.z + tipP.z) / 2); lv.quaternion.setFromUnitVectors(V3(0, 1, 0), tipP.clone().sub(pv).normalize()); }
    { const gp = cyl(0.016, 0.016, 0.12, 'earband', tipP.x, tipP.y, tipP.z - 0.06, 10); gp.rotation.x = Math.PI / 2; }
    return g;
  }

  if (id === 'mop') {
    // A string mop: a turned handle, a steel clamp head (two jaws, a wing screw), and cotton strands bunched in the
    // clamp and falling round it. Local: the clamp at the origin, the handle up +y (P.opts.len, the handle's length),
    // the strands below.
    const len = (P.opts && P.opts.len) || 1.3, r = rng(23), S = (P.opts && P.opts.strands) || KIT_PROPS.mop.strands;
    cyl(0.0125, 0.0125, len, 'handle', 0, 0.05 + len / 2, 0, 10);
    cyl(0.0115, 0.0125, 0.02, 'handle', 0, 0.06 + len, 0, 10);
    box(0.13, 0.03, 0.035, 'alu', 0, 0.0, 0);                                                // the clamp's jaws
    box(0.13, 0.012, 0.012, 'alu', 0, 0.02, 0.02);
    cyl(0.016, 0.019, 0.05, 'alu', 0, 0.035, 0, 10);                                          // the ferrule
    { const w = box(0.03, 0.012, 0.004, 'alu', 0.07, 0.01, 0.024); void w; }                 // the wing screw
    for (let i = 0; i < 64; i++) {                                                           // the strands, from the clamp down and out
      const a = r() * Math.PI * 2, out = 0.015 + r() * 0.07, l = S * (0.75 + r() * 0.3);
      const a0 = V3((r() - 0.5) * 0.11, -0.01, (r() - 0.5) * 0.025), b = V3(a0.x + Math.cos(a) * out, -l, a0.z + Math.sin(a) * out);
      const m = cyl(0.0085, 0.007, a0.distanceTo(b), 'mophead', (a0.x + b.x) / 2, (a0.y + b.y) / 2, (a0.z + b.z) / 2, 5);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), a0.clone().sub(b).normalize());
    }
    return g;
  }

  if (id === 'squeegee') {
    // A floor squeegee: a steel channel frame with a black rubber blade, a threaded socket and two brace wires, a long
    // handle. Local like the push broom: the frame along x on the floor, the handle rising toward -z at P.opts.lean.
    const Q = KIT_PROPS.squeegee, lean = (P.opts && P.opts.lean) || 1.2;
    box(Q.blade, 0.04, 0.006, 'earband', 0, 0.02, 0);                                       // the rubber blade, on edge
    box(Q.blade + 0.01, 0.026, 0.026, 'pail', 0, 0.053, 0);                                 // the channel
    for (const s of [-1, 1]) box(0.008, 0.03, 0.03, 'pail', s * (Q.blade / 2 + 0.002), 0.05, 0);   // end caps
    const dir = V3(0, Math.sin(lean), -Math.cos(lean)), base = V3(0, 0.066, 0), at = (d) => base.clone().addScaledVector(dir, d);
    const q = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
    const along = (geo, sw, d) => { const m = mk(geo, sw, ...at(d).toArray()); m.quaternion.copy(q); return m; };
    along(new T.CylinderGeometry(0.0125, 0.017, 0.06, 10), 'alu', 0.03);
    for (const s of [-1, 1]) {
      const a = V3(s * 0.16, 0.066, 0), b = at(0.14);
      const m = cyl(0.002, 0.002, a.distanceTo(b), 'alu', (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, 5);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    }
    along(new T.CylinderGeometry(0.0125, 0.0125, Q.handle - 0.06, 10), 'handle', 0.06 + (Q.handle - 0.06) / 2);
    along(new T.CylinderGeometry(0.011, 0.0125, 0.02, 10), 'handle', Q.handle + 0.01);
    return g;
  }
  if (id === 'glove') {
    // CH-3 #18 (the native walk: "bench glove: flat slabs"): a shooting glove left lying back-up on the worktop, fingers
    // toward +z. A domed back of the hand, a hard knuckle guard, four fingers in two joints each curling down onto the
    // bench, a thumb out to the side, a cuff with its hook-and-loop tab. Local: its base on y = 0.
    const capsule = (r, l, sw, a, b, parent = g) => {   // from point a to point b ([x, y, z]), radius r
      const A = V3(...a), B = V3(...b), len = A.distanceTo(B);
      const m = mk(T.CapsuleGeometry ? new T.CapsuleGeometry(r, Math.max(0.001, len), 4, 10) : new T.CylinderGeometry(r, r, len + 2 * r, 10), sw, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, parent);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), B.clone().sub(A).normalize()); return m; };
    { const b = mk(new T.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), 'glove', 0, 0.004, 0.0); b.scale.set(0.047, 0.02, 0.055); }   // back of the hand
    box(0.086, 0.004, 0.1, 'glove', 0, 0.002, 0);                                            // the palm under it, flat on the bench
    { const k = mk(new T.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), 'earband', 0, 0.012, 0.038); k.scale.set(0.044, 0.014, 0.016); }   // knuckle guard
    const r = 0.0092;
    [[-0.033, 0.082], [-0.011, 0.09], [0.011, 0.086], [0.032, 0.07]].forEach(([x, l], k) => {   // index to little finger
      const z0 = 0.048, mid = [x + (k - 1.5) * 0.004, r + 0.002, z0 + l * 0.55], tip = [x + (k - 1.5) * 0.007, r, z0 + l * 0.95];
      capsule(r, 0, 'glove', [x, r + 0.004, z0], mid); capsule(r * 0.94, 0, 'glove', mid, tip);
      box(0.012, 0.003, 0.012, 'earband', mid[0], mid[1] + r - 0.0005, mid[2]); });             // the knuckle pads
    capsule(r * 1.08, 0, 'glove', [0.04, r + 0.003, -0.01], [0.058, r + 0.001, 0.022]);        // thumb, along the hand's side
    capsule(r, 0, 'glove', [0.058, r + 0.001, 0.022], [0.066, r, 0.05]);
    { const c = mk(new T.CylinderGeometry(0.044, 0.046, 0.05, 16), 'scuff', 0, 0.0185, -0.077); c.rotation.x = Math.PI / 2; c.scale.set(1, 1, 0.4); }   // the cuff, flattened
    { const m = mk(new T.CylinderGeometry(0.039, 0.039, 0.002, 16), 'earband', 0, 0.0185, -0.1025); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, 0.33); }   // its open mouth, dark
    box(0.044, 0.004, 0.028, 'earband', -0.01, 0.0365, -0.074);                                  // the hook-and-loop tab
    return g;
  }
  if (id === 'earDefender') {
    // CH-3 #16 follow-up (Claude 8: "the rack is still empty"): one ear defender hung by its padded crown on a rack hook.
    // Local: the hook's top under the crown at the origin; it hangs straight down, cups along x.
    const m = new T.Group(); m.position.set(0, -(0.082 + 0.07 - 0.0095), 0); g.add(m);   // the crown's underside on y = 0
    earDefender(m);
    return g;
  }

  if (id === 'lightSwitch') {
    // CH-3 #18 (the native walk: "light switch: placeholder boxes"; Jerry D-229 put it on the range's back wall): the
    // room's lighting switch as a real industrial one. A yellow powder-coated steel box (rounded, a front door on two
    // hinges with two quarter-turn latches), mounting screws in its four corner feet, the grey switch plate with a guarded
    // toggle and a round pilot lamp in a bezel, a cable gland under it, and the feed: a conduit out of its left side, flat
    // on the wall, bent up and run to a pull box high on the wall,
    // with one-hole straps. Local: the wall plane at z = 0, +z into the room, the box centred on the
    // origin. Swatches (training.js maps them to its materials): 'yellow', 'plate', 'steel', 'steelLight', 'dark', 'pilot'.
    // g.userData.lever: the toggle's pivot (a named group: the bake leaves it alone, setLights turns it on x);
    // g.userData.pilot: the lamp's lens (its own material: it glows when the lights are off).
    const W = 0.3, H = 0.42, D = 0.062, DOOR = 0.012, zf = 0.0004 + D + DOOR;   // zf: the door's face
    const face = (w, h, t, rr, sw, x, y, z, parent = g) => { const m = slab(w, h, t, rr, sw, x, y, z, parent); m.rotation.x = Math.PI / 2; return m; };   // a slab standing on the wall, t out from it
    face(W, H, D, 0.014, 'yellow', 0, 0, 0.0004);                                              // the box, 0.4 mm off the wall plane
    face(W - 0.012, H - 0.012, DOOR, 0.011, 'yellow', 0, 0, 0.0004 + D);                       // its door: the seam shows round it
    for (const [x, y] of [[-W / 2 - 0.012, H / 2 - 0.03], [W / 2 + 0.012, H / 2 - 0.03], [-W / 2 - 0.012, -H / 2 + 0.03], [W / 2 + 0.012, -H / 2 + 0.03]]) {
      box(0.026, 0.03, 0.003, 'yellow', x, y, 0.002);                                            // a mounting foot
      const s = cyl(0.0055, 0.0055, 0.003, 'steelLight', x - Math.sign(x) * 0.002, y, 0.0045, 10); s.rotation.x = Math.PI / 2;   // its screw head
      box(0.0075, 0.0012, 0.0006, 'dark', x - Math.sign(x) * 0.002, y, 0.0062);                   // the slot
    }
    for (const y of [H / 2 - 0.07, -H / 2 + 0.07]) {                                            // the hinges, left
      cyl(0.0055, 0.0055, 0.05, 'steelLight', -W / 2 - 0.001, y, 0.0004 + D + 0.004, 10);
      box(0.012, 0.046, 0.002, 'steelLight', -W / 2 + 0.006, y, zf + 0.0002);
    }
    for (const y of [H / 2 - 0.06, -H / 2 + 0.06]) {                                            // the quarter-turn latches, right
      const l = cyl(0.009, 0.0095, 0.006, 'steelLight', W / 2 - 0.028, y, zf + 0.003, 14); l.rotation.x = Math.PI / 2;
      box(0.012, 0.0022, 0.0012, 'dark', W / 2 - 0.028, y, zf + 0.0062);
    }
    face(0.15, 0.24, 0.004, 0.006, 'plate', 0, -0.015, zf);                                     // the switch plate on the door
    for (const [x, y] of [[-0.062, 0.093], [0.062, 0.093], [-0.062, -0.123], [0.062, -0.123]]) { const s = cyl(0.004, 0.004, 0.002, 'steelLight', x, y, zf + 0.005, 8); s.rotation.x = Math.PI / 2; }
    { const zp = zf + 0.004;                                                                     // the pilot lamp: a bezel, its lens
      const b = cyl(0.017, 0.019, 0.009, 'steelLight', 0, 0.06, zp + 0.0045, 20); b.rotation.x = Math.PI / 2;
      const lens = mk(new T.SphereGeometry(0.0125, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), 'pilot', 0, 0.06, zp + 0.008); lens.rotation.x = Math.PI / 2; lens.scale.set(1, 0.6, 1);
      g.userData.pilot = lens; }
    { const zp = zf + 0.004;                                                                     // the toggle: a boss, two guard ears, the bat
      const boss = cyl(0.013, 0.015, 0.012, 'steel', 0, -0.03, zp + 0.006, 16); boss.rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) box(0.004, 0.034, 0.03, 'steel', s * 0.02, -0.03, zp + 0.015);
      const lever = new T.Group(); lever.name = 'training-light-switch-lever'; lever.position.set(0, -0.03, zp + 0.012); g.add(lever);
      const bat = cyl(0.0042, 0.0065, 0.042, 'steelLight', 0, 0, 0.021, 12, lever); bat.rotation.x = Math.PI / 2;
      mk(new T.SphereGeometry(0.0072, 12, 8), 'dark', 0, 0, 0.043, lever);                     // the ball end
      g.userData.lever = lever; }
    { const gl = cyl(0.011, 0.012, 0.014, 'dark', 0.06, -H / 2 - 0.007, 0.0004 + D / 2, 12); void gl;   // a cable gland under the box
      cyl(0.008, 0.008, 0.006, 'dark', 0.06, -H / 2 - 0.017, 0.0004 + D / 2, 10); }
    { // the feed (Director's LOOK: "ends in mid-air"): a conduit flat on the wall out of the box's left side (the right
      // would run up through the PGB RANGE lettering), a bend, then straight up the wall into a pull box high up (P.opts.up:
      // from the box's middle to the pull box's middle, metres), one-hole straps on it. Its centre 0.4 mm + its radius off the wall.
      const r = 0.0105, z = 0.0004 + r, y = 0.1, xb = -(W / 2 + 0.225), R = 0.06, up = Math.max(0.5, (P.opts && P.opts.up) || 0.8);
      const hub = cyl(0.015, 0.015, 0.012, 'steelLight', -W / 2 - 0.006, y, z + 0.0045, 12); hub.rotation.z = Math.PI / 2;   // the hub on the box's side
      const run = (x0, y0, x1, y1) => { const l = Math.hypot(x1 - x0, y1 - y0), c = cyl(r, r, l, 'steelLight', (x0 + x1) / 2, (y0 + y1) / 2, z, 12); if (y0 === y1) c.rotation.z = Math.PI / 2; return c; };
      run(-W / 2 - 0.012, y, xb + R, y);                                                          // along the wall
      { const b = mk(new T.TorusGeometry(R, r, 8, 10, Math.PI / 2), 'steelLight', xb + R, y + R, z); b.rotation.z = Math.PI; }   // the bend, up
      run(xb, y + R, xb, up - 0.05);                                                              // up the wall
      box(0.1, 0.1, 0.05, 'steelLight', xb, up, 0.0254);                                          // into a pull box high on the wall
      for (const [dx, dy] of [[-0.04, -0.04], [0.04, -0.04], [-0.04, 0.04], [0.04, 0.04]]) { const sc = cyl(0.0035, 0.0035, 0.002, 'steelLight', xb + dx, up + dy, 0.0514, 8); sc.rotation.x = Math.PI / 2; }
      const strap = (x, yy, vertical) => {                                                         // a one-hole strap over it, screwed to the wall
        const s = mk(new T.TorusGeometry(r + 0.0016, 0.0016, 4, 10, Math.PI), 'steelLight', x, yy, z);
        if (vertical) s.rotation.x = Math.PI / 2; else s.rotation.set(0, Math.PI / 2, Math.PI / 2, 'YXZ');   // its front half, over the bar
        const tx = vertical ? x - r - 0.011 : x, ty = vertical ? yy : yy + r + 0.011;
        box(vertical ? 0.02 : 0.012, vertical ? 0.012 : 0.02, 0.0016, 'steelLight', tx, ty, 0.0012);
        const sc = cyl(0.0035, 0.0035, 0.002, 'steelLight', tx - (vertical ? 0.004 : 0), ty + (vertical ? 0 : 0.004), 0.003, 8); sc.rotation.x = Math.PI / 2; };
      strap((-W / 2 + xb + R) / 2, y, false);
      for (let sy = y + R + 0.3; sy < up - 0.2; sy += 1.2) strap(xb, sy, true);
    }
    return g;
  }
  if (id === 'sharpsBin') {
    // CG-7 s2 (CF-23 "primitive sharps bin"): a wall sharps bin. Origin: on the wall under its back edge (the bracket's
    // shelf; the tub's back 3 mm out, on the bracket's plate), +z out of the wall. A rounded tub with a moulded rib, a tinted window strip to see the fill, the
    // lid over its rim (a skirt), the drop hood with its slot and mouth, the closure flap standing open, two lock tabs.
    const S = KIT_PROPS.sharpsBin, W = S.w, D = S.d, H = S.h, zc = D / 2;
    slab(W, D, H, 0.014, 'pin', 0, 0, zc);
    slab(W + 0.004, D + 0.004, 0.006, 0.016, 'pin', 0, 0.06, zc);                               // the moulded rib
    box(0.03, 0.07, 0.002, 'whitemug', -0.04, 0.108, D + 0.0003);                               // the fill window
    slab(W + 0.006, D + 0.006, 0.02, 0.016, 'sharpslid', 0, H - 0.004, zc);                     // the lid, its skirt over the rim
    const ht = H + 0.016, hz = D * 0.6;
    { const hg = new T.CylinderGeometry(0.022, 0.022, 0.1, 14, 1, false, 0, Math.PI); const hd = mk(hg, 'sharpslid', 0, ht, hz); hd.rotation.z = Math.PI / 2; }   // the drop hood
    box(0.07, 0.003, 0.008, 'earband', 0, ht + 0.0205, hz);                                     // its slot
    box(0.08, 0.011, 0.004, 'earband', 0, ht + 0.007, hz + 0.0195);                             // its mouth
    { const f = box(0.09, 0.004, 0.035, 'sharpslid', 0, ht + 0.016, 0.022); f.rotation.x = -1.25; }   // the closure flap, open
    for (const s of [-1, 1]) box(0.006, 0.02, 0.025, 'sharpslid', s * (W / 2 + 0.004), H - 0.002, zc);   // lock tabs
    for (const c of g.children) c.position.z += 0.003;   // the lid and rib are 3 mm proud all round: the tub's back stands that far off its origin
    return g;
  }
  if (id === 'sharpsBracket') {
    // Its wall bracket (fixed): a plate up the wall, a shelf with a front lip and two cheeks, a key lock, screws.
    // Origin: the shelf's top at the wall; userData.binZ: where the bin's origin stands off the wall (its tub's back is
    // 3 mm in front of its origin: flush on the 3 mm plate).
    const t = 0.003, sd = 0.115;
    const plate = slab(0.1, 0.29, t, 0.01, 'clip', 0, 0, 0); plate.rotation.x = Math.PI / 2; plate.position.set(0, 0.115, 0);
    slab(0.17, sd, 0.004, 0.006, 'clip', 0, -0.004, t + sd / 2);                                // the shelf
    box(0.17, 0.016, 0.003, 'clip', 0, 0.004, t + sd + 0.0015);                                // its front lip
    for (const s of [-1, 1]) box(0.003, 0.05, 0.11, 'clip', s * 0.0835, 0.021, t + 0.055);       // the cheeks
    { const l = cyl(0.006, 0.006, 0.006, 'alu', 0, 0.005, t + sd + 0.006, 12); l.rotation.x = Math.PI / 2; }   // the key lock
    for (const x of [-0.03, 0.03]) { const sc = cyl(0.0035, 0.0035, 0.002, 'alu', x, 0.245, t + 0.001, 8); sc.rotation.x = Math.PI / 2; }
    g.userData.binZ = 0;
    return g;
  }
  if (id === 'markers') {
    // Two dry-wipe markers (a barrel and cap in the ink's colour, the cap's clip, a dark end plug) and a board eraser (a grip on
    // felt), lying in the whiteboard's tray. Origin: the tray floor. Shot: the markers fly; the eraser is the body.
    const L = KIT_PROPS.markers, r = L.r;
    const marker = (x, z, ry, col, name) => {
      const m = new T.Group(); m.position.set(x, r, z); m.rotation.y = ry; g.add(m);
      const barrel = cyl(r, r, 0.088, col, -0.0185, 0, 0, 12, m); barrel.rotation.z = Math.PI / 2; part(barrel, name);
      const cap = cyl(r + 0.0007, r + 0.0007, 0.045, col, 0.044, 0, 0, 12, m); cap.rotation.z = Math.PI / 2; part(cap, name);
      part(box(0.03, 0.003, 0.004, col, 0.04, r + 0.001, 0, m), name);                          // the cap's clip
      const plug = cyl(r - 0.002, r - 0.002, 0.004, 'earband', -0.0645, 0, 0, 10, m); plug.rotation.z = Math.PI / 2; part(plug, name);
    };
    marker(-0.12, -0.009, 0.03, 'marker', 'marker:1');
    marker(0.0, 0.009, -0.05, 'pin', 'marker:2');
    slab(0.122, 0.04, 0.006, 0.006, 'scuff', 0.17, 0, 0);                                      // the eraser's felt
    slab(0.118, 0.034, 0.02, 0.009, 'tote', 0.17, 0.006, 0);                                    // its grip
    return g;
  }
  if (id === 'whiteboard') {
    // CG-7 s2 (CF-23 "one flat sheet: no frame depth, no pen tray, no fixings"): the board's aluminium frame, fixed.
    // Origin: the board's middle at the wall, +z out. The printed face (training-wear.js) lies at z 0.0205 inside it:
    // four rails 22 mm wide stand 4.5 mm proud of it and lap 6 mm over its edge; grey corner caps, each with its wall
    // screw; a pen tray under it (a back flange, a floor, a rolled front lip) with end caps. opts: { w, h } of the face.
    const o = P.opts || {}, w = o.w || 0.9, h = o.h || 0.56, rw = 0.022, rd = 0.025, lap = 0.006, c = rw / 2 - lap;
    box(w + 0.004, h + 0.004, 0.019, 'earband', 0, 0, 0.0095);                                 // the board's core (behind the face)
    const rail = (sw, sd, x, y) => { const m = slab(sw, sd, rd, 0.004, 'alu', 0, 0, 0); m.rotation.x = Math.PI / 2; m.position.set(x, y, 0); return m; };
    rail(w + 2 * (c + rw / 2), rw, 0, h / 2 + c); rail(w + 2 * (c + rw / 2), rw, 0, -h / 2 - c);
    rail(rw, h, w / 2 + c, 0); rail(rw, h, -w / 2 - c, 0);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const cp = slab(0.032, 0.032, rd + 0.004, 0.009, 'earband', 0, 0, 0); cp.rotation.x = Math.PI / 2; cp.position.set(sx * (w / 2 + c), sy * (h / 2 + c), 0);
      const sc = cyl(0.0035, 0.0035, 0.002, 'clip', sx * (w / 2 + c), sy * (h / 2 + c), rd + 0.005, 8); sc.rotation.x = Math.PI / 2;
    }
    { // the pen tray: its profile (z out, y up) run along x, under the bottom rail
      const tl = w * 0.68, y0 = -h / 2 - c - rw / 2 - 0.03, s = new T.Shape();
      s.moveTo(0, 0); s.lineTo(0.055, 0); s.quadraticCurveTo(0.059, 0, 0.059, 0.004); s.lineTo(0.059, 0.014); s.lineTo(0.053, 0.014);
      s.lineTo(0.053, 0.004); s.lineTo(0.006, 0.004); s.lineTo(0.006, 0.03); s.lineTo(0, 0.03); s.lineTo(0, 0);
      const tg = new T.ExtrudeGeometry(s, { depth: tl, bevelEnabled: false, curveSegments: 3 });
      tg.rotateY(-Math.PI / 2); tg.translate(tl / 2, 0, 0);
      mk(tg, 'alu', 0, y0, 0);
      for (const sx of [-1, 1]) box(0.006, 0.018, 0.06, 'earband', sx * (tl / 2 + 0.003), y0 + 0.009, 0.03);
      g.userData.trayY = y0 + 0.004; g.userData.trayZ = 0.0295; g.userData.trayLen = tl;
    }
    return g;
  }
  throw new Error('buildKitProp: no prop ' + id);
}

// ---------------------------------------------------------------------------------------------------------------------
// CG-7 step 2 (D-226: "the ability to be shot and destroyed"). The props are still baked into the room's one kit draw
// (bakeStatic). When one is hit, its triangles in that baked mesh are folded to a point (its range found once, by its
// own vertices) and a loose copy, built by the same builder, takes its place: one mesh a piece, its own draw only while
// it is loose. A knocked prop lies where it lands until the room resets; a broken one's pieces settle and fade. Every
// piece is pooled (KIT_DEBRIS.max at once); nothing runs at rest (update returns at once when nothing is loose).
//
//   createKitPropRuntime(T, { root, mat, origin, props: [{ id, group, opts, metal? }], build(id, opts) -> Group,
//       surfaces?: [{ minX, maxX, minZ, maxZ, y }], rooms?: [{ minX, maxX, minZ, maxZ }], blocks?: [{ minX, maxX, minZ, maxZ, maxY, sides? }] }) -> {
//     solids: [box],                         world boxes for tg.solids: { prop: true, kitProp: id, kitIndex: i }
//     hit(solid, point, dir, damage, kind),  kind 'bullet' | 'pellet' | 'melee' | 'blast'   -> true when taken
//     blast(point, radius, power), cut(from, dir, reach), update(dt), reset(), loose() -> pieces now, bind(meshes)
//     blast and cut take an optional last arg canReach(fromWorld, toWorld, solid) -> bool (the shell's wall trace):
//     a prop it says false for is left alone (no blast or blade through a wall). None given: everything in reach.
//   }
//   world points in, the room's local frame inside (root sits at origin, unturned).

export const KIT_DEBRIS = Object.freeze({
  max: 24,                    // loose pieces at once (a whole knocked prop is one piece)
  g: 9.8, paperG: 1.6,        // m/s^2; paper falls slowly and drifts
  fadeAfter: 7, fade: 0.8,    // s a broken piece lies still before it fades, and the fade
  rest: 0.4,                  // s nearly still on a surface before a piece sleeps
  // hits before it breaks (Infinity: never, it only gets knocked about and dented)
  hp: Object.freeze({ mug: 1, clipboard: 3, brassBucket: Infinity, pushBroom: 4, earTray: 3, mopBucket: Infinity, mop: 3, squeegee: 4, glove: Infinity, sharpsBin: 3, markers: 2, medMug: 1 }),
  kick: Object.freeze({ bullet: 1.0, pellet: 0.45, melee: 0.8, blast: 1.6 }),
  // CG-7 step 3: how hard it is to throw (a kick is divided by it): the mop bucket holds about 12 litres of water, it
  // slides and tips, it does not fly
  mass: Object.freeze({ mopBucket: 3.2, earTray: 0.8, glove: 0.6, sharpsBin: 0.9 }),
  long: Object.freeze(['pushBroom', 'mop', 'squeegee'])   // a handle: loose, it lies along the floor; broken, it snaps in three along its length
});

// What stops a blast or a blade on its way to a prop (GP-20208, ChatGPT's wall repro): the room's walls, its columns and
// the backstop. Benches, lockers, fences and the other props do not (shrapnel and a swing get round or through them).
export const KIT_BLOCKERS = Object.freeze(['wall', 'column', 'backstop']);
// kitReach(tg, trace) -> canReach for blast/cut. trace is the Training trace (world/training-ballistics.js traceTraining),
// passed in so this file does not import it (training.js imports this one). r2.1 (ChatGPT's native r2: the perimeter fence
// stood in front of the shared wall and hid it): the line is walked on past anything that does not block (out the far
// side of its box) until it meets a blocker (false), the prop itself or nothing (true). At most 12 steps.
export function kitReach(tg, trace) {
  return (a, b, solid) => {
    let p = { x: a.x, y: a.y, z: a.z };
    for (let step = 0; step < 12; step++) {
      const h = trace(tg, p, b);
      if (!h || !h.solid || h.solid === solid) return true;
      for (const k of KIT_BLOCKERS) if (h.solid[k]) return false;
      const s = h.solid, d = { x: b.x - p.x, y: b.y - p.y, z: b.z - p.z }, len = Math.hypot(d.x, d.y, d.z) || 1;
      let out = 1;   // where the line leaves this solid's box (0..1 along p->b)
      for (const ax of ['x', 'y', 'z']) {
        if (Math.abs(d[ax]) < 1e-12) continue;
        const lo = ax === 'x' ? s.minX : ax === 'y' ? s.minY : s.minZ, hi = ax === 'x' ? s.maxX : ax === 'y' ? s.maxY : s.maxZ;
        out = Math.min(out, Math.max((lo - p[ax]) / d[ax], (hi - p[ax]) / d[ax]));
      }
      const t = Math.min(1, Math.max(0, out) + 0.001 / len);
      if (t >= 1) return true;
      p = { x: p.x + d.x * t, y: p.y + d.y * t, z: p.z + d.z * t };
    }
    return true;
  };
}

export function createKitPropRuntime(T, { root, mat, origin, props, build, surfaces = [], rooms = [], blocks = [], onEvent = null }) {
  const O = origin, V3 = (x, y, z) => new T.Vector3(x, y, z);
  const KIT_FX = { mug: 'china', medMug: 'china', clipboard: 'wood', brassBucket: 'brass', pushBroom: 'wood', earTray: 'plastic', mopBucket: 'plastic', mop: 'wood', squeegee: 'wood', glove: 'cloth', sharpsBin: 'plastic', markers: 'chalk' };
  const KIT_BURN_S = { clipboard: 0.85, markers: 0.75, mop: 0.95, pushBroom: 1.25, squeegee: 1.35, earTray: 1.2, sharpsBin: 1.15 };
  let emitEvent = typeof onEvent === 'function' ? onEvent : null;
  const emit = (ev) => { if (emitEvent) emitEvent(ev); };
  const entries = props.map((p, i) => ({ ...p, i, state: 'still', hits: 0, range: null, saved: null, piece: null, bound: false,
    water: p.id === 'mopBucket' ? 1 : 0, wet: p.id === 'mop' ? 1 : 0, heat: 0, steamCd: 0,
    solid: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, prop: true, kitProp: p.id, kitIndex: i, metal: !!p.metal } }));
  const pieces = [];
  let baked = null, tried = false;
  const tmpM = new T.Matrix4(), inv = new T.Matrix4();

  // The still boxes (world), from each prop's own drawn shape. Also its first and last few vertices in the root's frame:
  // how bind() finds its range in the baked mesh.
  root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert();
  for (const e of entries) {
    e.group.updateMatrixWorld(true);
    const seq = [], lo = V3(Infinity, Infinity, Infinity), hi = V3(-Infinity, -Infinity, -Infinity), wv = V3();
    e.group.traverse((o) => {
      if (!o.isMesh || o.material !== mat) return;
      const P = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : P.count;
      for (let k = 0; k < P.count; k++) { wv.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld); lo.min(wv); hi.max(wv); }
      tmpM.multiplyMatrices(inv, o.matrixWorld);
      seq.push({ n, first: V3().fromBufferAttribute(P, idx ? idx.getX(0) : 0).applyMatrix4(tmpM), last: V3().fromBufferAttribute(P, idx ? idx.getX(n - 1) : n - 1).applyMatrix4(tmpM) });
    });
    e.count = seq.reduce((a, q) => a + q.n, 0); e.first = seq[0] && seq[0].first; e.last = seq.length && seq[seq.length - 1].last;
    const pad = 0.01;
    e.still = { minX: lo.x - pad, maxX: hi.x + pad, minY: lo.y - pad, maxY: hi.y + pad, minZ: lo.z - pad, maxZ: hi.z + pad };
    Object.assign(e.solid, e.still);
  }

  // Find each prop's run of vertices in the merged kit mesh (bakeStatic keeps a group's meshes together, in order).
  function bind(meshes) {
    tried = true;
    const list = meshes || []; if (!meshes) root.traverse((o) => { if (o.isMesh && o.material === mat && o.userData && o.userData.baked) list.push(o); });
    for (const m of list) {
      const P = m.geometry.attributes.position, a = P.array;
      for (const e of entries) {
        if (e.bound || !e.first) continue;
        const fx = e.first.x, fy = e.first.y, fz = e.first.z, lx = e.last.x, ly = e.last.y, lz = e.last.z, n = e.count, end = (P.count - n) * 3;
        for (let j = 0; j <= end; j += 3) {   // (r2.2: plain numbers in the loop, a third of the time)
          const d = a[j] - fx; if (d > 1e-4 || d < -1e-4) continue;
          if (Math.abs(a[j + 1] - fy) > 1e-4 || Math.abs(a[j + 2] - fz) > 1e-4) continue;
          const l = j + (n - 1) * 3;
          if (Math.abs(a[l] - lx) > 1e-4 || Math.abs(a[l + 1] - ly) > 1e-4 || Math.abs(a[l + 2] - lz) > 1e-4) continue;
          e.range = { mesh: m, start: j / 3, count: n }; e.bound = true;
          e.stillCopy = a.slice(j, j + n * 3);   // its drawn shape, kept once: hiding and restoring it allocate nothing
          break;
        }
      }
    }
    baked = list;
    return entries.filter((e) => e.bound).length;
  }
  function hideStill(e, hide) {
    if (!e.range) return false;
    const P = e.range.mesh.geometry.attributes.position, a = P.array, s = e.range.start * 3, n = e.range.count * 3;
    if (hide) { e.saved = e.stillCopy || a.slice(s, s + n); const x = a[s], y = a[s + 1], z = a[s + 2]; a.fill(x, s, s + n); for (let k = 1; k < n; k += 3) { a[s + k] = y; a[s + k + 1] = z; } }
    else if (e.saved) { a.set(e.saved, s); e.saved = null; }
    if (P.addUpdateRange) P.addUpdateRange(s, n);   // (ranges add up until the next upload: a reset restores several at once)
    P.needsUpdate = true;
    return true;
  }

  // ---- the loose copies: one merged geometry a piece (in the prop's own frame, re-centred on its middle)
  function mergeInto(meshes, rootM) {
    let total = 0; for (const m of meshes) total += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
    const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    const v = V3(), nn = V3(), nm = new T.Matrix3(), M = new T.Matrix4(); let at = 0;
    for (const m of meshes) {
      M.multiplyMatrices(rootM, m.matrixWorld); nm.getNormalMatrix(M);
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, idx = g.index, n = idx ? idx.count : P.count;
      for (let k = 0; k < n; k++) {
        const i = idx ? idx.getX(k) : k;
        v.fromBufferAttribute(P, i).applyMatrix4(M); pos.set([v.x, v.y, v.z], (at + k) * 3);
        if (N) { nn.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nrm.set([nn.x, nn.y, nn.z], (at + k) * 3); }
        if (U) uv.set([U.getX(i), U.getY(i)], (at + k) * 2);
      }
      at += n;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nrm, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(V3()); geo.translate(-c.x, -c.y, -c.z); geo.computeBoundingBox(); geo.computeBoundingSphere();
    return { geo, centre: c };
  }
  // split one merged geometry's triangles into groups by key(centroid) -> [{ geo, centre }]
  function splitGeo(geo, key) {
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, groups = new Map(), c = V3();
    for (let t = 0; t < P.count; t += 3) {
      c.set((P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) / 3, (P.getY(t) + P.getY(t + 1) + P.getY(t + 2)) / 3, (P.getZ(t) + P.getZ(t + 1) + P.getZ(t + 2)) / 3);
      const k = key(c); let l = groups.get(k); if (!l) groups.set(k, l = []); l.push(t);
    }
    const out = [];
    for (const l of groups.values()) {
      const pos = new Float32Array(l.length * 9), nrm = new Float32Array(l.length * 9), uv = new Float32Array(l.length * 6);
      l.forEach((t, j) => { for (let q = 0; q < 3; q++) { const s = t + q, d = j * 3 + q; pos.set([P.getX(s), P.getY(s), P.getZ(s)], d * 3); nrm.set([N.getX(s), N.getY(s), N.getZ(s)], d * 3); uv.set([U.getX(s), U.getY(s)], d * 2); } });
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nrm, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      g.computeBoundingBox(); const m = g.boundingBox.getCenter(V3()); g.translate(-m.x, -m.y, -m.z); g.computeBoundingBox(); g.computeBoundingSphere();
      out.push({ geo: g, centre: m });
    }
    return out;
  }
  // Cut a shape across x into slabs between the given planes: a triangle that crosses a plane is clipped on it (a handle's
  // long side faces run end to end, so sorting whole triangles would not snap it). Normals and uvs are interpolated.
  function sliceX(geo, planes) {
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, out = [];
    const vtx = (s) => [P.getX(s), P.getY(s), P.getZ(s), N.getX(s), N.getY(s), N.getZ(s), U.getX(s), U.getY(s)];
    const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const clip = (poly, x, keepAbove) => { const r = [];
      for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ia = keepAbove ? a[0] >= x : a[0] <= x, ib = keepAbove ? b[0] >= x : b[0] <= x;
        if (ia) r.push(a); if (ia !== ib) r.push(mix(a, b, (x - a[0]) / (b[0] - a[0]))); }
      return r; };
    for (let k = 0; k + 1 < planes.length; k++) {
      const pos = [], nrm = [], uv = [];
      for (let t = 0; t < P.count; t += 3) {
        let poly = [vtx(t), vtx(t + 1), vtx(t + 2)];
        if (isFinite(planes[k])) poly = clip(poly, planes[k], true);
        if (poly.length >= 3 && isFinite(planes[k + 1])) poly = clip(poly, planes[k + 1], false);
        for (let j = 1; j + 1 < poly.length; j++) for (const v of [poly[0], poly[j], poly[j + 1]]) { pos.push(v[0], v[1], v[2]); nrm.push(v[3], v[4], v[5]); uv.push(v[6], v[7]); }
      }
      if (!pos.length) continue;
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(nrm), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
      g.computeBoundingBox(); const m = g.boundingBox.getCenter(V3()); g.translate(-m.x, -m.y, -m.z); g.computeBoundingBox(); g.computeBoundingSphere();
      out.push({ geo: g, centre: m });
    }
    return out;
  }
  // The loose copy of a prop, cut into its parts (part tags from the builder). -> { body: {geo, centre}, parts: {name: [{geo, centre}]} }
  function looseCopy(e) {
    const grp = build(e.id, e.opts);
    grp.position.copy(e.group.position); grp.quaternion.copy(e.group.quaternion); grp.scale.copy(e.group.scale);
    const holder = new T.Group(); (e.group.parent ? e.group.parent.matrixWorld : new T.Matrix4()).decompose(holder.position, holder.quaternion, holder.scale); holder.add(grp);
    holder.updateMatrixWorld(true);
    const byPart = new Map();
    grp.traverse((o) => { if (!o.isMesh) return; const k = (o.userData && o.userData.part) || 'body'; let l = byPart.get(k); if (!l) byPart.set(k, l = []); l.push(o); });
    const out = { body: null, parts: {} };
    for (const [k, list] of byPart) {
      if (k === 'body') { out.body = mergeInto(list, inv); continue; }
      const c = k.indexOf(':');   // 'muff:1': all its meshes are one piece (an ear defender); else a piece a mesh
      if (c < 0) out.parts[k] = list.map((m) => mergeInto([m], inv));
      else (out.parts[k.slice(0, c)] || (out.parts[k.slice(0, c)] = [])).push(mergeInto(list, inv));
    }
    grp.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    return out;
  }

  // ---- pieces
  // CG-7 r2.2 (Claude 2's bar on ChatGPT's native receipt: a break under 2 ms p95, the first under 3 ms; the mug was 3.9,
  // the brass bucket 7.2): every loose shape is made once, when the room is built (prepare, below), and kept for good.
  // A hit takes a pooled mesh and a ready shape: no geometry, no material, nothing cut or measured, nothing disposed.
  const meshPool = [];
  function shapeOf(geo) {   // its contact points and how it lies: measured once a shape
    if (geo.userData.kitShape) return geo.userData.kitShape;
    if (!geo.boundingBox) geo.computeBoundingBox();
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    // contact points: up to 96 of its own vertices (a box's corners hung a round pail in the air)
    const bb = geo.boundingBox, corners = [], GP = geo.attributes.position, step = Math.max(1, Math.floor(GP.count / 96));
    for (let k = 0; k < GP.count; k += step) corners.push(V3().fromBufferAttribute(GP, k));
    // a flat piece (a board, a sheet, a shard) falls onto its face: its thin axis, turned to the vertical once it touches
    const ext = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z], k = ext.indexOf(Math.min(...ext)), rest2 = ext.filter((_, j) => j !== k);
    const thin = ext[k] < 0.45 * Math.min(...rest2) ? V3(k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0) : null;   // else: it settles on whichever face is nearest
    // a long piece (a handle, a stick) lies along the floor: its long axis is never the one turned upright (CG-7 step 3)
    const kl = ext.indexOf(Math.max(...ext)), long = ext[kl] > 3 * Math.max(...ext.filter((_, j) => j !== kl)) ? AXES[kl] : null;
    return (geo.userData.kitShape = { corners, thin, long });
  }
  function addPiece(geo, centre, opts = {}) {
    while (pieces.length >= KIT_DEBRIS.max) {   // the oldest loose bit goes first; a whole knocked prop only if nothing else
      let k = pieces.findIndex((p) => p.debris && p.resting); if (k < 0) k = pieces.findIndex((p) => p.debris); if (k < 0) k = 0;
      freePiece(pieces[k]);
    }
    const m = meshPool.pop() || new T.Mesh(geo, mat);
    m.geometry = geo; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = true; m.visible = true;
    m.position.copy(centre); m.scale.set(1, 1, 1); if (opts.quat) m.quaternion.copy(opts.quat); else m.quaternion.set(0, 0, 0, 1);
    root.add(m);
    const sh = shapeOf(geo);
    let p = m.userData.kitPiece;   // the piece's own record goes round with its mesh
    if (!p) p = m.userData.kitPiece = { mesh: m, vel: V3(), ang: V3() };
    p.vel.set(0, 0, 0); p.ang.set(0, 0, 0);
    Object.assign(p, { corners: sh.corners, rest: 0, resting: false, life: 0, fade: 0, paper: !!opts.paper, debris: !!opts.debris,
      entry: opts.entry || null, bounce: opts.bounce ?? 0.25, scale: 1, thin: sh.thin, long: sh.long });
    pieces.push(p); return p;
  }
  function freePiece(p) {   // back to the pool; its shape is kept (the next Clear all breaks it again from the same one)
    const k = pieces.indexOf(p); if (k >= 0) pieces.splice(k, 1);
    root.remove(p.mesh); meshPool.push(p.mesh);
    if (p.entry && p.entry.piece === p) { p.entry.piece = null; offSolid(p.entry); }
    p.entry = null;
  }
  function offSolid(e) { const s = e.solid; s.minX = s.maxX = s.minY = s.maxY = s.minZ = s.maxZ = -1e9; }
  const tmpV = V3();
  function followSolid(e) {
    const p = e.piece; if (!p) return offSolid(e);
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    p.mesh.updateMatrix();
    for (const c of p.corners) { tmpV.copy(c).applyMatrix4(p.mesh.matrix); minX = Math.min(minX, tmpV.x); maxX = Math.max(maxX, tmpV.x); minY = Math.min(minY, tmpV.y); maxY = Math.max(maxY, tmpV.y); minZ = Math.min(minZ, tmpV.z); maxZ = Math.max(maxZ, tmpV.z); }
    const s = e.solid; s.minX = minX + O.x; s.maxX = maxX + O.x; s.minY = minY + O.y; s.maxY = maxY + O.y; s.minZ = minZ + O.z; s.maxZ = maxZ + O.z;
  }
  const rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  function kick(p, dir, power, at) {
    const d = V3(dir.x || 0, dir.y || 0, dir.z || 0); if (d.lengthSq() < 1e-9) d.set(0, 0, 1); d.normalize();
    p.vel.addScaledVector(d, power * (p.paper ? 0.6 : 1)).add(V3(0, power * (p.paper ? 0.5 : 0.45), 0));
    const lever = at ? V3(at.x, at.y, at.z).sub(p.mesh.position) : V3(rnd() - 0.5, 0.3, rnd() - 0.5).multiplyScalar(0.1);
    p.ang.add(lever.cross(d).multiplyScalar(power * 60)).add(V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(power * 4));
    if (p.ang.lengthSq() > 484) p.ang.setLength(22);
    p.resting = false; p.rest = 0;
  }

  // ---- what each prop does when it is hit (local point and direction)
  // A long prop's loose shape turned so its length runs along its own x (it leans in the room's frame: a box round it
  // there is no clue to which way is long). The mesh carries the turn back, so it looks the same.
  const X1 = V3(1, 0, 0);
  function alignLong(b) {
    const P = b.geo.attributes.position, a = V3(), c = V3(), v = V3(); let d = -1;
    for (let k = 0; k < P.count; k++) { v.fromBufferAttribute(P, k); if (v.lengthSq() > d) { d = v.lengthSq(); a.copy(v); } }
    d = -1; for (let k = 0; k < P.count; k++) { v.fromBufferAttribute(P, k); const l = v.distanceToSquared(a); if (l > d) { d = l; c.copy(v); } }
    const u = c.sub(a).normalize(), qq = new T.Quaternion().setFromUnitVectors(u, X1);
    b.geo.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(qq));
    b.geo.computeBoundingBox(); const m = b.geo.boundingBox.getCenter(V3()); b.geo.translate(-m.x, -m.y, -m.z); b.geo.computeBoundingBox(); b.geo.computeBoundingSphere();
    const back = qq.clone().invert();
    return { geo: b.geo, centre: b.centre.clone().add(m.applyQuaternion(back)), quat: back };
  }
  // prepare(e): its loose copy and, for what breaks, its broken bits, all cut now in the loose copy's own frame
  // (r2.2: they were built from the builder and cut on the hit). The broom, mop and squeegee snap in three along their
  // length; the mug in twelve (six round, top and bottom); the rest in four quarters.
  function prepare(e) {
    if (e.prep) return e.prep;
    const cp = looseCopy(e), long = KIT_DEBRIS.long.includes(e.id);
    const body = long ? alignLong(cp.body) : { geo: cp.body.geo, centre: cp.body.centre, quat: null };
    let bits = null;
    if (isFinite(KIT_DEBRIS.hp[e.id] ?? 3)) {
      const g = body.geo; g.computeBoundingBox();
      const bb = g.boundingBox, ex = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
      if (long) { const lo = bb.min.x, len = ex[0] || 1; bits = sliceX(g, [-Infinity, lo + len * (0.3 + rnd() * 0.1), lo + len * (0.62 + rnd() * 0.1), Infinity]); }   // not two clean thirds
      else if (e.id === 'mug' || e.id === 'medMug') bits = splitGeo(g, (c) => Math.floor((Math.atan2(c.z, c.x) + Math.PI) / (Math.PI / 3)) + (c.y > 0 ? 10 : 0));
      else bits = splitGeo(g, (c) => c.x > 0 ? (c.z > 0 ? 1 : 2) : (c.z > 0 ? 3 : 4));
    }
    for (const q of [body, ...(bits || []), ...Object.values(cp.parts).flat()]) shapeOf(q.geo);
    return (e.prep = { cp, body, bits });
  }
  // warm(): everything a hit needs, made now (the room's build calls it; update() makes sure on its first frame)
  let warmed = false;
  function warm() {
    if (!tried) bind();
    for (const e of entries) prepare(e);
    while (meshPool.length < KIT_DEBRIS.max) { const m = new T.Mesh(undefined, mat); m.name = 'training-kit-loose'; meshPool.push(m); }
    warmed = true;
    return entries.filter((e) => e.prep).length;
  }
  // prime(on): every ready shape drawn once, so its buffers go up to the GPU before any hit (ChatGPT's r2.2 native
  // receipt: the first break of a prop cost one 17-20 ms frame, 0.5 MB uploaded). Each shape gets a mesh at its prop's
  // middle, a ten-thousandth of its size (nothing to see), never frustum-culled; prime(false) takes them away again.
  // The shell's Training warm-up (its blackout compile) calls prime(true) before and prime(false) after; if it does
  // not, update() primes on its first frame and clears on its second. Nothing stays: +0 draws after.
  let primer = null, primed = false;
  function prime(on) {
    if (on) {
      if (primer) return primer.children.length;
      warm(); primer = new T.Group(); primer.name = 'training-kit-primer';
      const seen = new Set();
      for (const e of entries) {
        const c = V3((e.still.minX + e.still.maxX) / 2 - O.x, (e.still.minY + e.still.maxY) / 2 - O.y, (e.still.minZ + e.still.maxZ) / 2 - O.z);
        const p = e.prep; if (!p) continue;
        for (const q of [p.body, ...(p.bits || []), ...Object.values(p.cp.parts).flat()]) {
          if (seen.has(q.geo)) continue; seen.add(q.geo);
          const m = new T.Mesh(q.geo, mat); m.position.copy(c); m.scale.setScalar(1e-4); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
          primer.add(m);
        }
      }
      root.add(primer); primed = true;
      return primer.children.length;
    }
    if (primer) { root.remove(primer); primer = null; }
    return 0;
  }
  function release(e) {   // the still prop becomes its loose copy
    const { cp, body: b } = prepare(e);
    hideStill(e, true);
    e.copy = cp; e.state = 'loose';
    e.piece = addPiece(b.geo, b.centre, { entry: e, quat: b.quat, bounce: e.id === 'brassBucket' ? 0.15 : 0.25 });
    return cp;
  }
  function burst(list, centre, dir, power, opts) { for (const q of list) { const p = addPiece(q.geo, q.centre, { debris: true, ...opts }); kick(p, { x: dir.x + (rnd() - 0.5) * 1.2, y: 0.4 + rnd(), z: dir.z + (rnd() - 0.5) * 1.2 }, power * (0.5 + rnd() * 0.6), null); } }
  const atV = V3(), qB = new T.Quaternion(), sB = V3(), pB = V3();
  function breakUp(e, dir, power) {   // the loose copy goes; its ready bits take its place, turned and placed as it lay
    const p = e.piece; if (!p) return;
    const M = p.mesh; M.updateMatrix(); qB.copy(M.quaternion); pB.copy(M.position); sB.copy(M.scale);
    const bits = prepare(e).bits || [], long = KIT_DEBRIS.long.includes(e.id);
    freePiece(p); e.piece = null; e.state = 'broken'; offSolid(e);
    for (const b of bits) {
      atV.copy(b.centre).multiply(sB).applyQuaternion(qB).add(pB);
      const s = addPiece(b.geo, atV, { debris: true, quat: qB });
      if (long) kick(s, { x: dir.x + (rnd() - 0.5), y: 0.5, z: dir.z + (rnd() - 0.5) }, power * (0.5 + rnd() * 0.5), null);
      else kick(s, { x: dir.x + (atV.x - pB.x) * 8, y: 0.6, z: dir.z + (atV.z - pB.z) * 8 }, power * (0.6 + rnd() * 0.5), null);
    }
  }
  function take(e, at, dir, damage, kind) {
    if (e.state === 'broken') return false;
    if (!tried) bind();
    const power = Math.min(4, 1.2 + (damage || 1) * 0.04) * (KIT_DEBRIS.kick[kind] || 1) / (KIT_DEBRIS.mass[e.id] || 1);
    const first = e.state === 'still';
    const fxKind = KIT_FX[e.id] || 'plastic';
    const wPt = at ? toWorld(at) : toWorld(centreOf(e));
    if (first) {
      if (!e.range) return false;   // not found in the baked mesh: it stays a still prop (safe)
      const cp = release(e);
      if (cp.parts.sheet) burst(cp.parts.sheet, cp.body.centre, dir, power * 0.8, { paper: true });
      if (cp.parts.pen) burst(cp.parts.pen, cp.body.centre, dir, power * 0.85, {});
      if (cp.parts.case) burst(cp.parts.case.slice(0, 10), cp.body.centre, dir, power * 0.7, {});
      if (cp.parts.muff) burst(cp.parts.muff, cp.body.centre, dir, power * 0.6, {});
      if (cp.parts.marker) burst(cp.parts.marker, cp.body.centre, dir, power * 0.8, {});   // CG-7 s2: the markers fly out of the tray
      if (e.id === 'brassBucket') emit({ type: 'spill', id: e.id, kind: 'brass', point: wPt, dir, radius: 0.4 });
      if (e.id === 'pushBroom') emit({ type: 'fx', id: e.id, fx: 'concrete', point: wPt, dir, scale: 0.7 });
      for (const r of entries) if (r.rides === e.id && r.state === 'still' && r.range) {
        release(r);
        kick(r.piece, { x: -dir.z * 0.3, y: 0, z: dir.x >= 0 ? 1 : -1 }, power * 0.6, null);
        if (r.wet > 0) { r.wet = 0; emit({ type: 'spill', id: r.id, kind: 'water', point: toWorld(centreOf(r)), dir, radius: 0.24 }); }
      }   // the mop in the bucket falls off its side, clear of the tub
    }
    if (e.id === 'mopBucket' && e.water > 0.08) {
      const amt = first ? 0.55 : 0.35;
      e.water = Math.max(0, e.water - amt);
      emit({ type: 'spill', id: e.id, kind: 'water', point: { x: wPt.x, y: O.y + groundAt(wPt.x - O.x, wPt.z - O.z, wPt.y - O.y), z: wPt.z }, dir, radius: first ? 0.62 : 0.42, sprayY: wPt.y });
    } else if (e.id === 'mop' && e.wet > 0) {
      e.wet = 0;
      emit({ type: 'spill', id: e.id, kind: 'water', point: wPt, dir, radius: 0.24, sprayY: wPt.y });
    }
    e.hits++;
    if (e.hits >= (KIT_DEBRIS.hp[e.id] ?? 3)) {
      const bPt = e.piece ? toWorld(e.piece.mesh.position) : wPt;
      breakUp(e, dir, power);
      if (e.id === 'mug' || e.id === 'medMug') {
        const gy = groundAt(bPt.x - O.x, bPt.z - O.z, bPt.y - O.y);
        emit({ type: 'spill', id: e.id, kind: 'coffee', point: { x: bPt.x, y: O.y + gy, z: bPt.z }, dir, radius: 0.26, sprayY: bPt.y });
        emit({ type: 'break', id: e.id, fx: 'china', extraFx: 'coffee', point: bPt, dir, kind });
      } else {
        const extraFx = e.id === 'clipboard' ? 'paper' : e.id === 'sharpsBin' ? 'china' : e.id === 'earTray' ? 'cloth' : null;
        emit({ type: 'break', id: e.id, fx: fxKind, extraFx, point: bPt, dir, kind });
      }
      return true;
    }
    if (e.id === 'brassBucket' && e.hits > 1 && e.piece) { const s = e.piece.mesh.scale; s.set(s.x * 0.95, s.y * 0.97, s.z * 1.02); }   // a dent
    kick(e.piece, dir, power, at);
    emit({ type: 'hit', id: e.id, fx: fxKind, point: wPt, dir, kind, first });
    return true;
  }

  const toLocal = (p) => ({ x: p.x - O.x, y: p.y - O.y, z: p.z - O.z });
  function hit(solid, point, dir, damage = 1, kind = 'bullet') {
    const e = solid && solid.kitIndex != null ? entries[solid.kitIndex] : null;
    return e ? take(e, point ? toLocal(point) : null, dir || { x: 0, y: 0, z: 1 }, damage, kind) : false;
  }
  function centreOf(e) { const s = e.solid; return { x: (s.minX + s.maxX) / 2 - O.x, y: (s.minY + s.maxY) / 2 - O.y, z: (s.minZ + s.maxZ) / 2 - O.z }; }
  const toWorld = (p) => ({ x: p.x + O.x, y: p.y + O.y, z: p.z + O.z });
  function blast(point, radius = 4, power = 1, canReach = null) {
    const c = toLocal(point); let n = 0;
    for (const e of entries) {
      if (e.state === 'broken') continue;
      const q = centreOf(e), dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z, d = Math.hypot(dx, dy, dz);
      if (d > radius) continue;
      if (canReach && !canReach(point, toWorld(q), e.solid)) continue;   // a wall between: the blast does not reach it
      const k = (1 - d / radius) * power, dl = d || 1;
      if (take(e, q, { x: dx / dl, y: 0.5, z: dz / dl }, 60 * k, 'blast')) n++;
    }
    return n;
  }
  function cut(from, dir, reach = 1.2, canReach = null) {
    const f = toLocal(from), dl = Math.hypot(dir.x, dir.z) || 1; let n = 0;
    for (const e of entries) {
      if (e.state === 'broken') continue;
      const q = centreOf(e), dx = q.x - f.x, dz = q.z - f.z, d = Math.hypot(dx, dz);
      if (d > reach + 0.35 || (dx * dir.x + dz * dir.z) / (d * dl || 1) < 0.3) continue;
      if (canReach && !canReach({ x: from.x, y: q.y + O.y, z: from.z }, toWorld(q), e.solid)) continue;   // no blade through a wall
      if (take(e, q, { x: dir.x / dl, y: 0.2, z: dir.z / dl }, 30, 'melee')) n++;
    }
    return n;
  }

  // ---- motion: gravity, the floor and the worktop, the room's walls; friction; sleep; fade
  const q = new T.Quaternion(), qi = new T.Quaternion(), w = V3(), upV = V3(), AXES = [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1)];   // (reused: nothing allocated a frame)
  function groundAt(x, z, y) { let g = 0; for (const s of surfaces) if (x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ && y >= s.y - 0.06) g = Math.max(g, s.y); return g; }
  // Two whole loose props do not sit inside each other (the mop off its bucket): the moving one is pushed out of the
  // other's box along the shallower of x and z. Boxes only, a few props: next to nothing a frame.
  function apart(p) {
    const a = p.entry.solid;
    for (const o of entries) {
      if (o === p.entry || !o.piece) continue;
      const b = o.solid, ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX), oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ), oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
      if (ox <= 0 || oz <= 0 || oy <= 0.02) continue;
      const m = p.mesh.position;
      if (ox < oz) { const s = (a.minX + a.maxX) < (b.minX + b.maxX) ? -1 : 1; m.x += s * ox; p.vel.x = s * Math.abs(p.vel.x) * 0.3; }
      else { const s = (a.minZ + a.maxZ) < (b.minZ + b.maxZ) ? -1 : 1; m.z += s * oz; p.vel.z = s * Math.abs(p.vel.z) * 0.3; }
      followSolid(p.entry);
    }
  }
  function update(dt) {
    if (!warmed) warm();   // (once, if the room's build did not)
    if (!primed) prime(true); else if (primer) prime(false);   // drawn once, the first frame, if the shell's warm-up did not
    if (!pieces.length) return 0;
    dt = Math.min(dt, 1 / 30);
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i], m = p.mesh;
      if (p.resting) {
        if (p.debris && (p.life += dt) > KIT_DEBRIS.fadeAfter) { p.fade += dt / KIT_DEBRIS.fade; const s = Math.max(0, 1 - p.fade); m.scale.setScalar(s); if (s <= 0) freePiece(p); }
        continue;
      }
      p.vel.y -= (p.paper ? KIT_DEBRIS.paperG : KIT_DEBRIS.g) * dt;
      if (p.paper) { p.vel.multiplyScalar(1 - Math.min(1, 2.5 * dt)); p.vel.x += Math.sin(p.life * 7 + i) * 0.6 * dt; p.vel.z += Math.cos(p.life * 5 + i) * 0.6 * dt; p.life += dt; }
      m.position.addScaledVector(p.vel, dt);
      const a = p.ang.length(); if (a > 1e-6) { w.copy(p.ang).divideScalar(a); q.setFromAxisAngle(w, a * dt); m.quaternion.premultiply(q); }
      m.updateMatrix();
      let low = Infinity; for (const c of p.corners) { tmpV.copy(c).applyMatrix4(m.matrix); if (tmpV.y < low) low = tmpV.y; }
      const gy = groundAt(m.position.x, m.position.z, low);
      let touching = false;
      if (low < gy) {
        m.position.y += gy - low; touching = true;
        const impactVy = -p.vel.y;
        if (p.vel.y < 0) p.vel.y = p.vel.y < -0.6 ? -p.vel.y * (p.paper ? 0 : p.bounce) : 0;   // a real bounce, or it lies
        if (p.entry && impactVy > 1.15 && !p.paper) {
          emit({ type: 'bounce', id: p.entry.id, fx: KIT_FX[p.entry.id] || 'plastic', point: toWorld(m.position), speed: impactVy });
        }
        const f = Math.min(1, (p.paper ? 12 : 6) * dt); p.vel.x *= 1 - f; p.vel.z *= 1 - f; p.ang.multiplyScalar(1 - Math.min(1, 5 * dt));
        {   // topple onto a face: a flat piece onto its broad side, anything else onto the face nearest the floor
          let ax = p.thin;
          if (!ax) { let best = -1; for (const c of AXES) { if (c === p.long) continue; w.copy(c).applyQuaternion(m.quaternion); const a = Math.abs(w.y); if (a > best) { best = a; ax = c; } } }
          w.copy(ax).applyQuaternion(m.quaternion); upV.set(0, w.y >= 0 ? 1 : -1, 0); const up = upV;
          q.setFromUnitVectors(w, up); qi.identity().slerp(q, Math.min(1, 7 * dt)); m.quaternion.premultiply(qi);
        }
      }
      for (const r of rooms) {   // the walls of the room it is in
        if (m.position.x < r.minX - 0.5 || m.position.x > r.maxX + 0.5 || m.position.z < r.minZ - 0.5 || m.position.z > r.maxZ + 0.5) continue;
        const rad = m.geometry.boundingSphere ? m.geometry.boundingSphere.radius * 0.6 : 0.05;
        if (m.position.x < r.minX + rad) { m.position.x = r.minX + rad; p.vel.x = Math.abs(p.vel.x) * 0.3; }
        if (m.position.x > r.maxX - rad) { m.position.x = r.maxX - rad; p.vel.x = -Math.abs(p.vel.x) * 0.3; }
        if (m.position.z < r.minZ + rad) { m.position.z = r.minZ + rad; p.vel.z = Math.abs(p.vel.z) * 0.3; }
        if (m.position.z > r.maxZ - rad) { m.position.z = r.maxZ - rad; p.vel.z = -Math.abs(p.vel.z) * 0.3; }
        break;
      }
      for (const b of blocks) {   // CG-7 step 3: the bench's kick panel and the space under its worktop: nothing goes in under it
        const px = m.position.x, pz = m.position.z, r = 0.04;
        if (px < b.minX - (b.sides ? r : 0) || px > b.maxX + (b.sides ? r : 0) || pz < b.minZ - r || pz > b.maxZ + r || low > b.maxY) continue;
        // CG-7 s2: a block with sides (a cabinet: open at both ends) also pushes out through the nearer end, when that is nearer
        const ex = b.sides ? Math.min(px - b.minX, b.maxX - px) : Infinity, ez = Math.min(pz - b.minZ, b.maxZ - pz);
        if (ex < ez) { if (px - b.minX < b.maxX - px) { m.position.x = b.minX - r; p.vel.x = -Math.abs(p.vel.x) * 0.3; } else { m.position.x = b.maxX + r; p.vel.x = Math.abs(p.vel.x) * 0.3; } }
        else if (pz - b.minZ < b.maxZ - pz) { m.position.z = b.minZ - r; p.vel.z = -Math.abs(p.vel.z) * 0.3; }
        else { m.position.z = b.maxZ + r; p.vel.z = Math.abs(p.vel.z) * 0.3; }
      }
      if (touching && p.vel.lengthSq() < 0.0036 && p.ang.lengthSq() < 0.09) { if ((p.rest += dt) > KIT_DEBRIS.rest) { p.resting = true; p.vel.set(0, 0, 0); p.ang.set(0, 0, 0); p.life = 0; } }
      else p.rest = 0;
      if (p.entry) { followSolid(p.entry); apart(p); }
    }
    return pieces.length;
  }
  // AH-12: gently nudge loose floor kit props when the player walks into them (zero work when nothing is loose)
  function bump(worldPos, velXZ, radius = 0.42) {
    if (!pieces.length || !worldPos) return 0;
    const lx = worldPos.x - O.x, ly = worldPos.y - O.y, lz = worldPos.z - O.z;
    if (ly > 0.6) return 0;
    const spd = velXZ ? Math.hypot(velXZ.x || 0, velXZ.z || 0) : 0;
    let moved = 0;
    for (const p of pieces) {
      if (!p.entry || p.paper) continue;
      const m = p.mesh.position;
      if (m.y > 0.55) continue;
      const rad = (m.geometry && m.geometry.boundingSphere ? Math.min(0.28, m.geometry.boundingSphere.radius * 0.65) : 0.14) + radius;
      const dx = m.x - lx, dz = m.z - lz, d = Math.hypot(dx, dz);
      if (d <= 1e-4 || d >= rad) continue;
      const ux = dx / d, uz = dz / d, push = Math.min(2.6, 0.9 + spd * 0.45) / (KIT_DEBRIS.mass[p.entry.id] || 1);
      m.x += ux * (rad - d) * 0.6; m.z += uz * (rad - d) * 0.6;
      p.vel.x += ux * push; p.vel.z += uz * push; p.vel.y = Math.max(p.vel.y, 0.28 * push);
      p.ang.x += uz * push * 4; p.ang.z -= ux * push * 4;
      if (p.ang.lengthSq() > 484) p.ang.setLength(22);
      p.resting = false; p.rest = 0;
      followSolid(p.entry);
      emit({ type: 'bounce', id: p.entry.id, fx: KIT_FX[p.entry.id] || 'plastic', point: toWorld(m), speed: push * 1.4 });
      moved++;
    }
    return moved;
  }
  // AH-12: flamethrower heats/ignites flammable kit props and steams water in mopBucket
  function burn(worldPoint, dt) {
    if (!worldPoint || !(dt > 0)) return 0;
    const c = toLocal(worldPoint); let n = 0;
    for (const e of entries) {
      if (e.state === 'broken') continue;
      const q = centreOf(e), d = Math.hypot(q.x - c.x, q.y - c.y, q.z - c.z);
      if (d > 0.72) continue;
      if (e.id === 'mopBucket' && e.water > 0.05) {
        e.steamCd -= dt;
        if (e.steamCd <= 0) { e.steamCd = 0.22; emit({ type: 'steam', id: e.id, point: toWorld(q) }); }
        n++; continue;
      }
      const thr = KIT_BURN_S[e.id];
      if (!thr) continue;
      e.heat += dt;
      if (e.heat >= thr) {
        e.heat = 0;
        const wPt = toWorld(q);
        if (e.state === 'still' && e.range) release(e);
        if (e.piece) {
          breakUp(e, { x: 0, y: 1, z: 0 }, 1.1);
          emit({ type: 'break', id: e.id, fx: 'ember', extraFx: KIT_FX[e.id], point: wPt, dir: { x: 0, y: 1, z: 0 }, kind: 'fire' });
          n++;
        }
      }
    }
    return n;
  }
  function reset() {
    for (const p of pieces.slice()) freePiece(p);
    for (const e of entries) {
      if (e.state !== 'still') hideStill(e, false);
      e.state = 'still'; e.hits = 0; e.piece = null; e.copy = null;
      e.water = e.id === 'mopBucket' ? 1 : 0; e.wet = e.id === 'mop' ? 1 : 0; e.heat = 0; e.steamCd = 0;
      Object.assign(e.solid, e.still);
    }
  }
  for (const e of entries) prepare(e);   // r2.2: at the room's build (enterTraining), never on a hit
  return { solids: entries.map((e) => e.solid), entries, hit, blast, cut, bump, burn, update, reset, bind, setEventHandler: (fn) => { emitEvent = typeof fn === 'function' ? fn : null; }, loose: () => pieces.length, pieces: () => pieces, surfaces, warm, prime };   // surfaces: for world/training-hitfx.js
}
