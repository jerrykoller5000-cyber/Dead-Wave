/* The seven Phase 2 objective props (CL-12): a radio cabinet, a fuel stand and five small
   caches, one at each site Claude checked in CL-6 and ChatGPT designed in GP-8
   (docs/specs/objectives-phase2.md).

   Plain script, like campsites.js: it registers globals and touches nothing else.
     window.OBJECTIVE_SITES                  the seven sites: anchor, offset, approach
     window.objectiveSitesFrom(POI, height)  -> [{ id, x, y, z, ax, ay, az, facing }]
     window.buildObjectiveProps(THREE, opts) -> { group, props, stateFor }

   Each prop is two draws at most: its static base, plus the mesh for its current state
   (the radio adds one small light). Its state is a visual only: the objective's own state,
   rewards and saving are ChatGPT's and Cursor's. `stateFor(objectiveState, id)` maps the
   GP-8 state machine (undiscovered, available, active, ready-to-claim, claimed) onto the
   visual states below. `setState` never rebuilds anything: it swaps which prebuilt mesh is
   visible, and the radio light's colour is a uniform. */
(() => {
  // Anchor + world-axis offset (not rotated with the anchor), and where the player stands,
  // as an offset from the prop's centre. From the CL-6 table; GP-8 uses the same numbers.
  const SITES = [
    { id: 'objective:radio-repair',   anchor: 'mast',        off: [3.5, 3.0],   approach: [0.58, 1.38] },
    { id: 'objective:medical-convoy', anchor: 'wrecks.0',    off: [4.8, 4.8],   approach: [1.06, 1.06] },
    { id: 'objective:ranger-cache',   anchor: 'campsites.0', off: [-5.0, 4.0],  approach: [0.57, 1.39] },
    { id: 'objective:hikers-cache',   anchor: 'campsites.1', off: [4.0, 4.0],   approach: [1.39, -0.58] },
    { id: 'objective:trapper-cache',  anchor: 'campsites.2', off: [-4.0, 4.0],  approach: [-0.57, -1.39] },
    { id: 'objective:fuel-depot',     anchor: 'sheds.2',     off: [4.0, -2.0],  approach: [1.06, 1.06] },
    { id: 'objective:wreck-salvage',  anchor: 'wrecks.1',    off: [4.0, -4.0],  approach: [-1.06, -1.06] }
  ];
  window.OBJECTIVE_SITES = SITES;

  const anchorOf = (POI, path) => {
    let v = POI;
    for (const k of path.split('.')) v = v == null ? v : v[k];
    return v && Number.isFinite(v.x) && Number.isFinite(v.z) ? v : null;
  };
  // `facing` is the player's yaw looking from the approach point at the prop (GP-8's number).
  window.objectiveSitesFrom = (POI, height) => SITES.map((s) => {
    const a = anchorOf(POI, s.anchor);
    if (!a) return null;
    const x = a.x + s.off[0], z = a.z + s.off[1];
    const ax = x + s.approach[0], az = z + s.approach[1];
    return { id: s.id, x, z, y: height ? height(x, z) : 0, ax, az, ay: height ? height(ax, az) : 0, facing: Math.atan2(x - ax, z - az) };
  }).filter(Boolean);

  // Visual states per prop, and how the GP-8 states map onto them.
  const KIND = {
    'objective:radio-repair': 'radio', 'objective:medical-convoy': 'medical', 'objective:ranger-cache': 'ranger',
    'objective:hikers-cache': 'hikers', 'objective:trapper-cache': 'trapper', 'objective:fuel-depot': 'fuel',
    'objective:wreck-salvage': 'salvage'
  };
  const STATES = {
    radio: ['broken', 'repaired'],
    fuel: ['stocked', 'partial', 'empty'],
    medical: ['closed', 'open', 'empty'], ranger: ['closed', 'open', 'empty'], hikers: ['closed', 'open', 'empty'],
    trapper: ['closed', 'open', 'empty'], salvage: ['closed', 'open', 'empty']
  };
  function stateFor(objectiveState, id, remaining) {
    const kind = KIND[id];
    if (!kind || objectiveState === 'unavailable') return null;   // null: leave the prop as it is
    if (kind === 'radio') return objectiveState === 'ready-to-claim' || objectiveState === 'claimed' ? 'repaired' : 'broken';
    if (kind === 'fuel') return objectiveState === 'claimed' ? 'empty' : remaining ? 'partial' : 'stocked';
    if (objectiveState === 'claimed') return 'empty';
    if (objectiveState === 'ready-to-claim' || remaining) return 'open';
    return 'closed';   // undiscovered, available, active
  }

  window.buildObjectiveProps = (THREE, opts = {}) => {
    const { POI, height, solid } = opts;
    const sites = opts.sites || window.objectiveSitesFrom(POI, height);
    const material = opts.material || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const root = new THREE.Group();
    root.name = 'objectiveProps';
    const props = {};

    // --- a small kit: parts are built in the prop's own frame (origin on the ground at the
    // centre, +z towards the approach point), then merged into vertex-coloured meshes.
    const tmpColor = new THREE.Color();
    function kit() {
      const parts = [];
      const add = (geo, color, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo);
        m.userData.color = color;
        m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
        parts.push(m);
        return m;
      };
      return {
        parts,
        box: (w, h, d, c, x, y, z, rx, ry, rz) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz),
        cyl: (r0, r1, h, c, x, y, z, rx, ry, rz, seg = 10) => add(new THREE.CylinderGeometry(r0, r1, h, seg), c, x, y, z, rx, ry, rz),
        bar: (a, b, r, c, seg = 6) => {
          const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
          const m = add(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg), c, 0, 0, 0);
          m.position.copy(A).add(B).multiplyScalar(0.5);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
          return m;
        },
        torus: (r, t, c, x, y, z, rx, ry, rz, arc = Math.PI * 2) => add(new THREE.TorusGeometry(r, t, 5, 12, arc), c, x, y, z, rx, ry, rz)
      };
    }
    // Merge a kit's parts into one mesh, in the prop's frame. A lid that opens is built as its
    // own kit and merged separately, so every visual state is one prebuilt mesh.
    function merge(k) {
      if (!k.parts.length) return null;
      let total = 0;
      const geos = k.parts.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
        g.applyMatrix4(m.matrix);
        total += g.attributes.position.count;
        return { g, color: m.userData.color };
      });
      const P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3);
      let o = 0;
      for (const { g, color } of geos) {
        const n = g.attributes.position.count;
        P.set(g.attributes.position.array, o * 3);
        if (g.attributes.normal) N.set(g.attributes.normal.array, o * 3);
        tmpColor.setHex(color);
        for (let i = 0; i < n; i++) { C[(o + i) * 3] = tmpColor.r; C[(o + i) * 3 + 1] = tmpColor.g; C[(o + i) * 3 + 2] = tmpColor.b; }
        o += n;
        g.dispose();
      }
      for (const m of k.parts) m.geometry.dispose();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    }

    // Shared colours. Painted steel, worn canvas, straps and latches; pale trim so each one
    // reads under the flashlight; nothing lit except the radio's status light.
    const C = {
      steel: 0x5a6553, steelDark: 0x2e332d, pale: 0xcfc9b2, black: 0x1c1d1b, brass: 0x9b8448,
      concrete: 0x77746b, strap: 0x4e4130, leather: 0x5b3c25, canvas: 0x6f6a55, foam: 0x282926,
      olive: 0x4f5a3c, rust: 0x7b4a2d, tray: 0x3b3b36, oil: 0x1a1916, redCan: 0x8a3226,
      medBody: 0xb8b3a4, medLid: 0xd8d4c8, medCross: 0x3e6a47, burgundy: 0x6a292d, sheet: 0x4b584a,
      salvage: 0x6c6a5f, bundle: 0x6a6a3b, pen: 0xd5d3c4, penCap: 0x2f6f8f
    };

    // The open case's inside: a dark lining with a rim, on the body's top face (the body is
    // solid), so an open case reads as open and its contents sit on the lining.
    const inner = (k, hb, w, d) => {
      k.box(w * 0.9, 0.012, d * 0.86, C.foam, 0, hb + 0.006, 0);
      for (const s of [-1, 1]) { k.box(w, 0.03, 0.025, C.steelDark, 0, hb + 0.015, s * (d / 2 - 0.012)); k.box(0.025, 0.03, d, C.steelDark, s * (w / 2 - 0.012), hb + 0.015, 0); }
    };

    // A hard case: body, strap, latches, and a lid on a back hinge. `open` swings the lid up
    // and back; contents sit inside. Sizes are GP-8's maximums.
    function caseProp(o) {
      const { w, d, h, body, lid, latch = 0x7d807b, trim } = o;
      const hb = h * 0.72, hl = h - hb;             // body and lid heights
      const base = kit(), closed = kit(), opened = kit(), empty = kit();
      base.box(w, hb, d, body, 0, hb / 2, 0);
      base.box(w * 0.94, 0.01, d * 0.94, C.black, 0, 0.004, 0);             // shadow line
      if (trim) base.box(w + 0.004, 0.035, d + 0.004, trim, 0, hb * 0.55, 0); // pale band round it
      // Latches sit on the seam, towards the ends; the carry handle is on the side, so the
      // front never reads as a face.
      for (const s of [-1, 1]) base.box(0.06, 0.055, 0.02, s < 0 && o.oddLatch ? o.oddLatch : latch, s * w * 0.36, hb - 0.02, d / 2 + 0.01);
      if (o.handle) base.box(0.035, 0.035, d * 0.34, C.black, w / 2 + 0.02, hb * 0.6, 0);
      if (o.under) o.under(base);                                           // canvas, groundsheet
      const lidParts = (k, openAngle) => {
        // Hinged along the back edge (z = -d/2, y = hb).
        const a = openAngle, cy = hb, cz = -d / 2;
        const place = (lx, ly, lz) => [lx, cy + ly * Math.cos(a) + (lz + d / 2) * Math.sin(a), cz - ly * Math.sin(a) + (lz + d / 2) * Math.cos(a)];
        const p = place(0, hl / 2, 0);
        k.box(w, hl, d, lid, p[0], p[1], p[2], -a, 0, 0);
        if (o.lidMark) o.lidMark(k, place, a, hl);
      };
      lidParts(closed, 0);
      lidParts(opened, 1.95);
      lidParts(empty, 1.95);
      if (o.contents) o.contents(opened, hb);
      if (o.dregs) o.dregs(empty, hb);
      return { base, states: { closed, open: opened, empty } };
    }

    const builders = {
      medical: () => caseProp({
        w: 0.65, d: 0.5, h: 0.28, body: C.medBody, lid: C.medLid, handle: true,
        lidMark: (k, place, a, hl) => {                                     // a plain cross, no text
          const p = place(0, hl + 0.004, 0);
          k.box(0.2, 0.006, 0.06, C.medCross, p[0], p[1], p[2], -a, 0, 0);
          k.box(0.06, 0.006, 0.2, C.medCross, p[0], p[1], p[2], -a, 0, 0);
          const s = place(0.05, hl + 0.01, 0.02);                          // the torn strap across it
          k.box(0.05, 0.008, 0.52, C.strap, s[0], s[1], s[2], -a, 0.25, 0);
        },
        contents: (k, hb) => { inner(k, hb, 0.65, 0.5); for (const x of [-0.08, 0.08]) { k.cyl(0.022, 0.022, 0.2, C.pen, x - 0.03, hb + 0.03, 0.02, 0, 0, Math.PI / 2); k.cyl(0.024, 0.024, 0.05, C.penCap, x + 0.09, hb + 0.03, 0.02, 0, 0, Math.PI / 2); } },
        dregs: (k, hb) => inner(k, hb, 0.65, 0.5)
      }),
      ranger: () => caseProp({
        w: 0.65, d: 0.5, h: 0.32, body: C.olive, lid: C.olive, trim: C.pale, handle: true,
        under: (k) => k.box(0.63, 0.03, 0.48, C.canvas, 0, 0.012, 0),                    // folded canvas, under it
        lidMark: (k, place, a, hl) => { const p = place(0, hl + 0.003, 0); k.box(0.62, 0.005, 0.07, C.pale, p[0], p[1], p[2], -a, 0, 0); },
        contents: (k, hb) => { inner(k, hb, 0.65, 0.5); k.box(0.34, 0.09, 0.2, C.bundle, 0, hb + 0.055, 0); k.box(0.36, 0.02, 0.05, C.strap, 0, hb + 0.1, 0); },
        dregs: (k, hb) => inner(k, hb, 0.65, 0.5)
      }),
      trapper: () => caseProp({
        w: 0.55, d: 0.4, h: 0.27, body: C.rust, lid: C.rust, latch: 0x8c8f8a,
        under: (k) => k.torus(0.07, 0.014, C.leather, -0.2, 0.12, 0.2 + 0.01, 0, 0, 0, Math.PI), // carrying loop
        contents: (k, hb) => {
          inner(k, hb, 0.55, 0.4);
          k.cyl(0.045, 0.045, 0.1, C.olive, 0.05, hb + 0.045, 0, 0, 0, Math.PI / 2);       // one grenade, in its recess
          k.cyl(0.012, 0.012, 0.04, C.steelDark, 0.12, hb + 0.045, 0, 0, 0, Math.PI / 2);
          k.box(0.14, 0.02, 0.1, C.canvas, -0.12, hb + 0.02, 0.05, 0, 0.3, 0);             // greasy cloth
        },
        dregs: (k, hb) => { inner(k, hb, 0.55, 0.4); k.box(0.14, 0.02, 0.1, C.canvas, -0.12, hb + 0.02, 0.05, 0, 0.3, 0); }
      }),
      salvage: () => caseProp({
        w: 0.65, d: 0.5, h: 0.3, body: C.salvage, lid: C.salvage, oddLatch: 0xa6a9ad, handle: true,
        under: (k) => k.box(0.06, 0.012, 0.51, C.strap, 0.2, 0.3 * 0.72 + 0.004, 0),      // tie-down strap over the body
        contents: (k, hb) => { inner(k, hb, 0.65, 0.5); k.box(0.3, 0.08, 0.18, C.bundle, 0, hb + 0.05, 0); k.box(0.32, 0.015, 0.04, C.strap, 0, hb + 0.095, 0); },
        dregs: (k, hb) => inner(k, hb, 0.65, 0.5)
      }),
      // A rolled first-aid pouch on a thin groundsheet: tied, opened with a pen, then flat.
      hikers: () => {
        const base = kit(), closed = kit(), opened = kit(), empty = kit();
        base.box(0.4, 0.008, 0.3, C.sheet, 0, 0.004, 0);                                  // groundsheet edge
        closed.cyl(0.085, 0.085, 0.36, C.burgundy, 0, 0.085, 0, 0, 0, Math.PI / 2, 12);
        closed.torus(0.088, 0.012, C.strap, 0.08, 0.085, 0, 0, Math.PI / 2, 0);
        closed.box(0.09, 0.01, 0.05, C.pale, 0, 0.17, 0);                                // stitched cross
        closed.box(0.03, 0.01, 0.1, C.pale, 0, 0.17, 0);
        closed.box(0.04, 0.008, 0.13, C.strap, -0.12, 0.01, 0.08, 0, 0.4, 0);            // undone end of the strap
        const flat = (k) => { k.box(0.4, 0.025, 0.28, C.burgundy, 0, 0.02, 0); k.box(0.09, 0.006, 0.05, C.pale, 0, 0.035, 0.08); k.box(0.03, 0.006, 0.1, C.pale, 0, 0.035, 0.08); };
        flat(opened); opened.cyl(0.022, 0.022, 0.2, C.pen, 0, 0.05, -0.04, 0, 0.3, Math.PI / 2); opened.cyl(0.024, 0.024, 0.05, C.penCap, 0.115, 0.05, -0.075, 0, 0.3, Math.PI / 2);
        flat(empty);
        return { base, states: { closed, open: opened, empty } };
      },
      // A service cabinet on a small pad by the mast: cover open and a cable loose before the
      // repair; cover still open but connectors seated after it. The status light is separate.
      radio: () => {
        const base = kit(), broken = kit(), repaired = kit();
        const W = 0.8, D = 0.6, H = 1.1;
        base.box(0.84, 0.12, 0.64, C.concrete, 0, 0.02, -0.02);                        // plinth, sunk into the ground
        base.box(W, H, D, C.steel, 0, 0.08 + H / 2, -0.02);
        base.box(W + 0.04, 0.05, D + 0.04, C.steelDark, 0, 0.08 + H + 0.025, -0.02);   // rain cap
        base.box(W * 0.9, 0.04, 0.02, C.pale, 0, 0.08 + H - 0.1, D / 2 - 0.01);        // pale trim over the bay
        base.box(0.62, 0.62, 0.02, C.steelDark, 0, 0.08 + 0.6, D / 2 - 0.018);          // the open bay's back
        for (const x of [-0.14, 0.14]) base.cyl(0.05, 0.05, 0.05, C.brass, x, 0.08 + 0.55, D / 2 - 0.0, Math.PI / 2, 0, 0); // two sockets
        base.box(0.02, 0.5, 0.36, C.steel, W / 2 + 0.03, 0.08 + 0.25, 0.02, 0, 0, -0.12); // the dented panel, leaning on its side
        base.box(0.12, 0.12, 0.05, C.steelDark, 0.28, 0.08 + 0.92, D / 2 - 0.0);         // light housing
        // The hinged cover over the connector bay, lifted up and out on its top hinge. (A
        // full-height door would swing out into the approach, or past the footprint.)
        const cover = (k, a) => {
          const hy = 0.08 + 0.86, hz = D / 2 - 0.02, fh = 0.36;
          k.box(0.5, fh, 0.02, C.steel, 0, hy - Math.cos(a) * fh / 2, hz + Math.sin(a) * fh / 2, -a, 0, 0);
          k.box(0.46, 0.035, 0.025, C.pale, 0, hy - Math.cos(a) * (fh - 0.03), hz + Math.sin(a) * (fh - 0.03), -a, 0, 0);
        };
        cover(broken, 1.95); cover(repaired, 1.95);
        // Loose: plugs hang, a slack cable tucked along the base.
        for (const x of [-0.14, 0.14]) { broken.bar([x, 0.08 + 0.5, D / 2 + 0.05], [x + 0.05, 0.14, D / 2 + 0.12], 0.018, C.black); broken.cyl(0.05, 0.05, 0.1, C.brass, x + 0.05, 0.12, D / 2 + 0.15, 0, 0, 0); }
        broken.bar([0.2, 0.1, D / 2 + 0.15], [0.46, 0.1, D / 2 - 0.1], 0.02, C.black); broken.bar([0.46, 0.1, D / 2 - 0.1], [0.46, 0.1, -0.35], 0.02, C.black);
        // Seated: plugs in their sockets, the cable dressed up the side.
        for (const x of [-0.14, 0.14]) { repaired.cyl(0.05, 0.05, 0.09, C.brass, x, 0.08 + 0.55, D / 2 + 0.06, Math.PI / 2, 0, 0); repaired.bar([x, 0.08 + 0.55, D / 2 + 0.1], [x, 0.14, D / 2 + 0.12], 0.018, C.black); }
        repaired.bar([-0.14, 0.12, D / 2 + 0.12], [0.44, 0.12, D / 2 + 0.05], 0.02, C.black); repaired.bar([0.44, 0.12, D / 2 + 0.05], [0.44, 0.12, -0.35], 0.02, C.black);
        return { base, states: { broken, repaired }, solid: { r: 0.5, h: 1.25 }, light: { x: 0.28, y: 0.08 + 0.92, z: D / 2 + 0.03 } };
      },
      // A bunded stand: squat drum, removable can, short hose and tap over a shallow tray.
      fuel: () => {
        const base = kit(), stocked = kit(), partial = kit(), empty = kit();
        base.box(1.0, 0.1, 0.8, C.tray, 0, 0.03, 0);                                   // the tray, sunk a little
        base.box(0.9, 0.012, 0.7, C.oil, 0, 0.085, 0);                                  // oil wear stays in the tray
        base.cyl(0.29, 0.29, 0.62, C.olive, -0.2, 0.09 + 0.31, -0.08, 0, 0, 0, 14);    // the drum
        for (const y of [0.25, 0.55]) base.torus(0.292, 0.012, C.steelDark, -0.2, 0.09 + y, -0.08, Math.PI / 2, 0, 0);
        base.cyl(0.03, 0.03, 0.12, C.brass, -0.2, 0.09 + 0.25, 0.23, Math.PI / 2, 0, 0); // the tap, closed
        base.box(0.06, 0.02, 0.02, C.brass, -0.2, 0.09 + 0.25, 0.3);
        base.bar([-0.32, 0.09 + 0.62, 0.0], [0.05, 0.2, 0.3], 0.018, C.black);          // short hose
        base.bar([0.05, 0.2, 0.3], [0.28, 0.1, 0.32], 0.018, C.black);
        const can = (k, x, y, z, rx, rz) => {
          k.box(0.34, 0.46, 0.17, C.redCan, x, y, z, rx, 0, rz);
          k.box(0.2, 0.05, 0.05, C.black, x, y + 0.25 * Math.cos(rz), z, rx, 0, rz);      // handle
        };
        can(stocked, 0.28, 0.09 + 0.23, 0.08, 0, 0);
        can(partial, 0.3, 0.09 + 0.23, 0.12, 0, 0.12); partial.cyl(0.025, 0.025, 0.03, C.black, 0.4, 0.1, 0.3, 0, 0, 0); // cap off, beside it
        can(empty, 0.25, 0.09 + 0.085, 0.14, 0, Math.PI / 2);                           // on its side
        return { base, states: { stocked, partial, empty }, solid: { r: 0.55, h: 0.95 } };
      }
    };

    for (const site of sites) {
      const kind = KIND[site.id];
      if (!kind) continue;
      const spec = builders[kind]();
      const g = new THREE.Group();
      g.name = site.id;
      // Front (+z) towards the approach point, on the lowest ground under the footprint so
      // nothing floats; the pad and tray sink into the rise.
      const yaw = Math.atan2(site.ax - site.x, site.az - site.z);
      let gy = site.y;
      if (height) for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0, 0]]) gy = Math.min(gy, height(site.x + dx, site.z + dz));
      g.position.set(site.x, gy, site.z);
      g.rotation.y = yaw;
      const baseMesh = merge(spec.base);
      if (baseMesh) g.add(baseMesh);
      const stateMeshes = {};
      for (const [name, k] of Object.entries(spec.states)) {
        const m = merge(k);
        if (m) { m.visible = false; m.name = name; g.add(m); }
        stateMeshes[name] = m;
      }
      let light = null;
      if (spec.light) {
        light = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffa31a, emissiveIntensity: 1.6, roughness: 0.6 }));
        light.position.set(spec.light.x, spec.light.y, spec.light.z);
        g.add(light);
      }
      if (spec.solid && solid) solid(site.x, site.z, spec.solid.r, gy, gy + spec.solid.h);
      const states = STATES[kind];
      const prop = {
        id: site.id, kind, group: g, states, state: null, exists: true,
        centre: { x: site.x, y: gy, z: site.z },
        approach: { x: site.ax, y: site.ay, z: site.az },
        facing: site.facing,
        meshes: stateMeshes, light,
        setState(name) {
          if (!states.includes(name) || name === prop.state) return prop.state === name;
          for (const [n, m] of Object.entries(stateMeshes)) if (m) m.visible = n === name;
          if (light) light.material.emissive.setHex(name === 'repaired' ? 0x3dff6a : 0xffa31a);
          prop.state = name;
          return true;
        }
      };
      prop.setState(states[0]);
      props[site.id] = prop;
      root.add(g);
    }
    return { group: root, props, stateFor, sites };
  };
})();
