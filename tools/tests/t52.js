// t52 — the seven objective props (CL-12): where they stand, what they look like per state, and
// that the player's approach stays clear. The props file isn't wired into the game until the
// split, so the check loads it into the page itself.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    if (!window.buildObjectiveProps) {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/assets/world/objective-props.js'; s.onload = res; s.onerror = () => rej(new Error('could not load objective-props.js')); document.head.appendChild(s); });
    }
    ok(typeof window.buildObjectiveProps === 'function' && window.OBJECTIVE_SITES.length === 7, 'props file loads: seven sites');
    // The CL-6 table (centre x, z; approach x, z) and GP-8's facing.
    const CL6 = {
      'objective:radio-repair':   [-149.87, -1.15, -149.29, 0.23, -2.75],
      'objective:medical-convoy': [-112.85, 50.77, -111.79, 51.83, -2.36],
      'objective:ranger-cache':   [30.52, -19.24, 31.09, -17.85, -2.75],
      'objective:hikers-cache':   [2.02, -77.68, 3.41, -78.26, -1.18],
      'objective:trapper-cache':  [-37.49, 47.81, -38.06, 46.42, 0.39],
      'objective:fuel-depot':     [-44.13, -18.34, -43.07, -17.28, -2.36],
      'objective:wreck-salvage':  [-95.91, -45.77, -96.97, -46.83, 0.79]
    };
    const sites = window.objectiveSitesFrom(T.POI, T.sampleHeight);
    let posOk = true, bad = [];
    for (const s of sites) {
      const e = CL6[s.id];
      const d = Math.max(Math.abs(s.x - e[0]), Math.abs(s.z - e[1]), Math.abs(s.ax - e[2]), Math.abs(s.az - e[3]));
      const df = Math.abs(Math.atan2(Math.sin(s.facing - e[4]), Math.cos(s.facing - e[4])));
      if (d > 0.02 || df > 0.02) { posOk = false; bad.push(s.id + ' ' + d.toFixed(3) + ' ' + df.toFixed(3)); }
    }
    ok(sites.length === 7 && posOk, 'sites match the CL-6 centres and approaches and GP-8 facings' + (bad.length ? ': ' + bad.join('; ') : ''));
    // CL-15: the world builds them at load. (Before CL-15 the check built its own copy.)
    const wired = typeof T.getObjectiveProps === 'function' && T.getObjectiveProps();
    ok(!!wired, 'the world builds the props at load (CL-15)');
    const built = wired || window.buildObjectiveProps(T.THREE, { POI: T.POI, height: T.sampleHeight,
      solid: (x, z, radius, y0, y1) => T.worldSolids.push({ x, z, radius, y0, y1, landmark: null }) });
    if (!wired) T.scene.add(built.group);
    const props = Object.values(built.props);
    ok(props.length === 7 && built.group.parent === T.scene, 'seven props, in the scene');
    const colliderAt = (p) => T.worldSolids.some((s) => Math.hypot(s.x - p.centre.x, s.z - p.centre.z) < 0.05 && s.radius >= 0.45);
    const withSolid = props.filter(colliderAt).map((p) => p.kind).sort().join(',');
    ok(withSolid === 'fuel,radio', 'colliders on the radio cabinet and the fuel stand only (' + withSolid + ')');
    if (wired && T.foliage) {
      const grass = T.foliage.filter((f) => props.some((p) => Math.hypot(f.x - p.centre.x, f.z - p.centre.z) < 1.3)).length;
      ok(grass === 0, 'no ground cover within 1.3 m of any prop (' + grass + ')');
    }
    // Draw calls: base + one state mesh (+ the radio light).
    const visibleMeshes = (p) => { let n = 0; p.group.traverse((o) => { if (o.isMesh) { let v = true; for (let q = o; q; q = q.parent) if (!q.visible) v = false; if (v) n++; } }); return n; };
    ok(props.every((p) => visibleMeshes(p) === (p.light ? 3 : 2)), 'two draws a prop (three for the radio): ' + props.map((p) => visibleMeshes(p)).join(','));
    // Sizes: GP-8's maximum footprints and heights, in the prop's own frame.
    // GP-8's sizes (w x d x h). The radio's allowance is the 0.8 x 0.6 x 1.1 cabinet plus its
    // plinth, rain cap, the side panel and the connector cover lifted out over the bay. A case's
    // carry handle adds a few cm at one end; latches a centimetre in front.
    const MAX = { radio: [0.95, 1.0, 1.25], fuel: [1.0, 0.8, 0.9], medical: [0.65, 0.5, 0.28], ranger: [0.65, 0.5, 0.32], hikers: [0.4, 0.3, 0.18], trapper: [0.55, 0.4, 0.27], salvage: [0.65, 0.5, 0.3] };
    const sizeBad = [];
    for (const p of props) {
      p.group.updateMatrixWorld(true);
      for (const st of p.states) {
        p.setState(st);
        const box = new T.THREE.Box3();
        for (const m of p.group.children) if (m.isMesh && m.visible && m !== p.light) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone()); }
        const s = [box.max.x - box.min.x, box.max.z - box.min.z, box.max.y];
        const mx = MAX[p.kind];
        // The open lid of a case stands up behind it: height is checked closed only.
        const lidUp = p.kind !== 'radio' && p.kind !== 'fuel' && p.kind !== 'hikers' && (st === 'open' || st === 'empty');
        if (s[0] > mx[0] + 0.05 || s[1] > mx[1] + (lidUp ? 0.45 : 0.04) || (!lidUp && s[2] > mx[2] + 0.02)) sizeBad.push(p.kind + '/' + st + ' ' + s.map((v) => v.toFixed(2)).join('x'));
      }
      p.setState(p.states[0]);
    }
    ok(!sizeBad.length, 'every state within GP-8\'s footprint' + (sizeBad.length ? ': ' + sizeBad.join('; ') : ''));
    // Grounded: nothing floats over the ground at the centre.
    const floaters = props.filter((p) => p.centre.y > T.sampleHeight(p.centre.x, p.centre.z) + 0.005);
    ok(!floaters.length, 'every prop sits on the lowest ground under it' + (floaters.length ? ': ' + floaters.map((p) => p.kind).join(',') : ''));
    // The approach: 0.75 m standing radius clear of every solid (props, landmarks, trees).
    const blocked = [];
    for (const p of props) {
      for (const s of T.worldSolids) {
        const d = Math.hypot(s.x - p.approach.x, s.z - p.approach.z) - (s.radius || 0);
        if (d < 0.75 && s.y1 > p.approach.y + 0.2 && s.y0 < p.approach.y + 1.8) blocked.push(p.kind + ' by a solid ' + d.toFixed(2) + ' m');
      }
      for (const t of T.trees) if (t.alive && Math.hypot(t.x - p.approach.x, t.z - p.approach.z) < 0.75 + (t.trunkRadius || 0.3)) blocked.push(p.kind + ' by a tree');
    }
    ok(!blocked.length, 'every approach point has 0.75 m clear' + (blocked.length ? ': ' + blocked.join('; ') : ''));
    // States: each prop's states, and the GP-8 mapping.
    const r = built.props['objective:radio-repair'];
    ok(r.state === 'broken' && r.light.material.emissive.getHex() === 0xffa31a, 'radio starts broken, light amber');
    r.setState(built.stateFor('ready-to-claim', r.id));
    ok(r.state === 'repaired' && r.light.material.emissive.getHex() === 0x3dff6a && r.meshes.repaired.visible && !r.meshes.broken.visible, 'repaired: connectors seated, light green');
    const m = built.props['objective:medical-convoy'];
    const seq = ['available', 'ready-to-claim', 'claimed'].map((s) => { m.setState(built.stateFor(s, m.id)); return m.state; });
    ok(seq.join(',') === 'closed,open,empty', 'a cache goes closed → open → empty (' + seq.join(',') + ')');
    const f = built.props['objective:fuel-depot'];
    f.setState(built.stateFor('ready-to-claim', f.id, true));
    ok(f.state === 'partial', 'fuel: a partial claim shows partial');
    ok(built.stateFor('unavailable', m.id) === null && built.stateFor('available', 'objective:nope') === null, 'unavailable and unknown ids leave a prop alone');
    ok(m.setState('nonsense') === false && m.state === 'empty', 'an unknown state is refused');
    const tris = props.reduce((n, p) => { p.group.traverse((o) => { if (o.isMesh && o.visible) n += o.geometry.attributes.position.count / 3; }); return n; }, 0);
    out.push('info: ' + Math.round(tris) + ' triangles drawn for all seven');
    ok(tris < 8000, 'cheap: under 8,000 triangles for all seven');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
