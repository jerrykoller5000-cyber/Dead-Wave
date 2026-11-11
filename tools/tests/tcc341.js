// tcc341 - CC-341 (J128, Jerry 10 Nov, standing, D-140): the marine's fabric, layer on layer. Third person: every layer of
//  his kit stays outside the one under it (the boots under the trousers bloused over them (CL-198; the Director asked), the shirt under the belt and the pack, the gloves'
//  cuffs under the sleeves, the head under the balaclava and the cap or helmet, the neck under the collar) in every clip
//  and stance: stand armed and unarmed, walk, run, crouch, crouch-walk, aim, reload, jump. For each pair, every vertex of
//  the outer layer that lies over the inner one (its foot inside one of the inner's faces) is measured along that face's
//  normal: more than 0.5 mm under it fails. (Open shells: the nearest face's signed distance, not ray parity.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const TOL = 0.0005, REACH = 0.03;
  try {
    await startMatch(T, 'Layers');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000);
    const THREE = T.THREE, M = T.marine;
    const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const matName = (o) => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return m && typeof m.name === 'string' ? m.name : ''; };
    const layerOf = (o) => {
      const n = matName(o);
      if (n.startsWith('wear:')) return n.slice(5);
      if (o.name === 'marine-shaped-head') return 'head';
      return null;
    };
    // World triangles of a layer, with each face's outward normal (a mirrored part's winding flipped back).
    const trisOf = (meshes) => {
      const T9 = [], N3 = [], v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (const m of meshes) {
        const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count, flip = m.matrixWorld.determinant() < 0;
        for (let i = 0; i < n; i += 3) {
          a.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld);
          b.fromBufferAttribute(p, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(m.matrixWorld);
          c.fromBufferAttribute(p, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(m.matrixWorld);
          v.subVectors(b, a).cross(c.clone().sub(a)); const l = v.length(); if (l < 1e-12) continue; v.multiplyScalar((flip ? -1 : 1) / l);
          T9.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); N3.push(v.x, v.y, v.z);
        }
      }
      const box = new THREE.Box3(); for (let i = 0; i < T9.length; i += 3) box.expandByPoint(v.set(T9[i], T9[i + 1], T9[i + 2]));
      return { P: T9, N: N3, box };
    };
    // The deepest point of `outer` under `inner`: for each outer vertex near the inner, its nearest inner face; counted only
    // where its foot lies on that face (within 1 mm of it sideways), signed along the face's normal.
    const depth = (inner, outerMeshes) => {
      const I = trisOf(inner), box = I.box.clone().expandByScalar(REACH), v = new THREE.Vector3(), nv = new THREE.Vector3(), nm = new THREE.Matrix3();
      // a grid of the inner faces, REACH cells
      const G = new Map(), cell = (x) => Math.floor(x / REACH), P = I.P;
      for (let t = 0; t < P.length; t += 9) {
        const x0 = cell(Math.min(P[t], P[t + 3], P[t + 6])), x1 = cell(Math.max(P[t], P[t + 3], P[t + 6]));
        const y0 = cell(Math.min(P[t + 1], P[t + 4], P[t + 7])), y1 = cell(Math.max(P[t + 1], P[t + 4], P[t + 7]));
        const z0 = cell(Math.min(P[t + 2], P[t + 5], P[t + 8])), z1 = cell(Math.max(P[t + 2], P[t + 5], P[t + 8]));
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const k = x + ',' + y + ',' + z; let l = G.get(k); if (!l) G.set(k, l = []); l.push(t); }
      }
      let worst = 0, at = null;
      for (const m of outerMeshes) {
        const p = m.geometry.attributes.position, na = m.geometry.attributes.normal, flip = m.matrixWorld.determinant() < 0;
        nm.getNormalMatrix(m.matrixWorld);
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (!box.containsPoint(v)) continue;
          const cx = cell(v.x), cy = cell(v.y), cz = cell(v.z);
          let best = REACH, bt = -1;
          for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
            const l = G.get(x + ',' + y + ',' + z); if (!l) continue;
            for (const t of l) { const d = distTri(P, t, v.x, v.y, v.z); if (d < best) { best = d; bt = t; } }
          }
          if (bt < 0) continue;
          const f = bt / 3, nx = I.N[f], ny = I.N[f + 1], nz = I.N[f + 2];
          // only a layer lying over the layer: the outer surface here faces the same way as the inner face
          if (na) { nv.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); if (flip) nv.negate(); if (nv.x * nx + nv.y * ny + nv.z * nz < 0.5) continue; }
          const dx = v.x - P[bt], dy = v.y - P[bt + 1], dz = v.z - P[bt + 2], s = dx * nx + dy * ny + dz * nz;
          const side = Math.sqrt(Math.max(0, best * best - s * s));
          if (s < 0 && side < 0.001 && -s > worst) { worst = -s; at = v.clone(); at.part = (m.name || '') + '/' + (m.parent && m.parent.name || ''); }
        }
      }
      return { worst, at };
    };
    const distTri = (P, t, px, py, pz) => {   // point to triangle (Ericson), as in clip-check.js
      const a = [P[t], P[t + 1], P[t + 2]], b = [P[t + 3], P[t + 4], P[t + 5]], c = [P[t + 6], P[t + 7], P[t + 8]];
      const sub = (u, w) => [u[0] - w[0], u[1] - w[1], u[2] - w[2]], dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2], p = [px, py, pz];
      const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap); let q;
      if (d1 <= 0 && d2 <= 0) q = a; else {
        const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
        if (d3 >= 0 && d4 <= d3) q = b; else { const vc = d1 * d4 - d3 * d2;
          if (vc <= 0 && d1 >= 0 && d3 <= 0) { const w = d1 / (d1 - d3); q = [a[0] + ab[0] * w, a[1] + ab[1] * w, a[2] + ab[2] * w]; } else {
            const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
            if (d6 >= 0 && d5 <= d6) q = c; else { const vb = d5 * d2 - d1 * d6;
              if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); q = [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; } else {
                const va = d3 * d6 - d5 * d4;
                if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); q = [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; } else {
                  const den = 1 / (va + vb + vc), w1 = vb * den, w2 = vc * den; q = [a[0] + ab[0] * w1 + ac[0] * w2, a[1] + ab[1] * w1 + ac[1] * w2, a[2] + ab[2] * w1 + ac[2] * w2]; } } } } } }
      return Math.hypot(px - q[0], py - q[1], pz - q[2]);
    };
    // inner, outer
    const PAIRS = [['boots', 'trousers'], ['trousers', 'belt'], ['shirt', 'belt'], ['shirt', 'pack'], ['shirt', 'vest'], ['belt', 'vest'], ['trousers', 'pads'], ['shirt', 'pads'],
      ['gloves', 'shirt'], ['head', 'shirt'], ['head', 'mask'], ['mask', 'cap'], ['mask', 'helmet'], ['head', 'cap'], ['head', 'helmet']];
    const tubes = new Set(), STANDIN_TUBES = new Set(['balaclava-hem']);
    const layers = () => {
      M.updateMatrixWorld(true);
      // The live cloth (the sleeves, the trousers: studio/marine-cloth.js liveCloth; the shirt's waist) bends to its bones just
      // before each draw (onBeforeRender), and the test page never draws: bend it here, as the frame would.
      M.traverse((o) => { if (o.userData && o.userData.cloth && typeof o.userData.cloth.bend === 'function') o.userData.cloth.bend(); });
      if (M.userData.waist && typeof M.userData.waist.bend === 'function') M.userData.waist.bend();   // the shirt's waist (studio/marine-waist.js), the same
      const L = {}, gearOf = new Map(), gp = M.userData.gearParts || {};
      for (const g of ['vest', 'helmet', 'pads']) for (const root of gp[g] || []) root.traverse((o) => gearOf.set(o, g));
      M.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position || !vis(o)) return; const k = gearOf.get(o) || layerOf(o); if (!k) return;
        // The test page's three (tools/tests/fakethree.mjs) builds a TubeGeometry as rings that don't turn with the path and
        // wind one way or the other by its direction: not the game's shape, so it is not measured (the balaclava's rolled
        // hem read as inside out, and a part 4 cm outside it as 27.7 mm under it). Named, so a tube can't hide unseen. The hem's
        // geometry is a plain BufferGeometry by the time the test sees it, so it is named here too; until fakethree's tube
        // follows its path (asked of Claude 2, CC-341).
        const gp0 = o.geometry.parameters, path = gp0 && (Array.isArray(gp0) ? gp0[0] : gp0.path);
        if (STANDIN_TUBES.has(o.name) || (THREE.TubeGeometry && o.geometry instanceof THREE.TubeGeometry) || (path && typeof path.getPoint === 'function')) { tubes.add(k + ':' + (o.name || '?')); return; }
        (L[k] = L[k] || []).push(o); });
      return L;
    };
    const first = layers();
    out.push('INFO layers on him: ' + Object.entries(first).map(([k, v]) => k + ' ' + v.length).join(', '));
    const step = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 30); };
    const press = (keys, zoom) => T.flightInput({ keys, zoom: !!zoom });
    T.flightHold(true);
    const home = T.player.position.clone();
    const POSES = [
      ['stand unarmed', async () => { if (!T.isUnarmed()) T.toggleHolster(); press([]); step(45); }],
      ['stand armed', async () => { if (T.isUnarmed()) T.toggleHolster(); press([]); step(45); }],
      ['walk', async () => { press(['KeyW']); step(20); }],
      ['run', async () => { press(['KeyW', 'ShiftLeft']); step(24); }],
      ['crouch', async () => { press(['KeyC']); step(40); }],
      ['crouch-walk', async () => { press(['KeyC', 'KeyW']); step(20); }],
      ['aim', async () => { press([], true); step(40); }],
      ['reload', async () => { press([]); step(10); T.startReload && T.startReload(); step(12); }],
      ['jump', async () => { press(['Space']); step(2); press([]); step(8); }],
    ];
    // and again in the full kit: the helmet, the plate carrier, the pads and the NVG
    const KIT = [['kit: run', POSES[3][1]], ['kit: crouch', POSES[4][1]], ['kit: aim', POSES[6][1]]];
    const kitOn = async () => {
      for (const k of ['helmet', 'vest', 'pads', 'nvg']) T.setGearDbg && T.setGearDbg(k);
      // as applyGearVisibility does when they are bought
      const gp = M.userData.gearParts || {};
      for (const k of Object.keys(gp)) { const on = k === 'bareHead' ? false : k === 'bareTorso' ? false : ['helmet', 'vest', 'pads', 'nvg'].includes(k); for (const m of gp[k]) m.visible = on; }
      press([]); step(30);
    };
    const worst = {}, fails = [], excused = [];
    // AGENTS rule 24: the named exceptions (core/clip-exceptions.js); every one used is printed
    let CX = null; try { CX = await import('/core/clip-exceptions.js'); } catch (e) { out.push('INFO no clip exceptions: ' + e.message); }
    for (const [pose, set] of [...POSES, ['kit on', kitOn], ...KIT]) {
      T.player.position.copy(home); await set();
      const L = layers(), row = [];
      for (const [a, b] of PAIRS) {
        if (!L[a] || !L[b]) continue;
        const r = depth(L[a], L[b]), key = a + '<' + b, mm = r.worst * 1000;
        row.push(key + ' ' + mm.toFixed(1));
        const ex = r.worst > TOL && CX ? CX.clipException(a, b, pose, r.worst) : null;
        if (!worst[key]) worst[key] = { mm: 0, pose };
        if (ex) { excused.push(pose + ': ' + key + ' ' + mm.toFixed(1) + ' mm (' + ex.id + ')'); continue; }
        if (mm > worst[key].mm) worst[key] = { mm, pose };
        let local = '';
        if (r.at && a === 'gloves') { let bw = null, bd = 1; M.traverse((o) => { if (o.name === 'wrist') { const w = o.getWorldPosition(new THREE.Vector3()); const d = w.distanceTo(r.at); if (d < bd) { bd = d; bw = o; } } });
          if (bw) { const q = r.at.clone().applyMatrix4(new THREE.Matrix4().copy(bw.parent.matrixWorld).invert()); local = ' [elbow ' + [q.x, q.y, q.z].map((x) => x.toFixed(3)).join(',') + ' wrist rot ' + [bw.rotation.x, bw.rotation.y, bw.rotation.z].map((x) => x.toFixed(2)).join(',') + ']'; } }
        if (r.worst > TOL) fails.push(pose + ': ' + b + ' ' + mm.toFixed(1) + ' mm under ' + a + local + (r.at && r.at.part ? ' {' + r.at.part + '}' : '') + (r.at ? ' at (' + [r.at.x - T.player.position.x, r.at.y - T.player.position.y, r.at.z - T.player.position.z].map((x) => x.toFixed(2)).join(', ') + ')' : ''));
      }
      out.push('INFO ' + pose + ' (mm under): ' + row.join(', '));
    }
    press([]); T.flightHold(false);
    out.push('INFO excused (core/clip-exceptions.js): ' + (excused.join('; ') || 'none'));
    out.push('INFO not measured (the test page\'s stand-in tubes): ' + ([...tubes].join(', ') || 'none'));
    for (const [k, w] of Object.entries(worst)) ok(w.mm <= TOL * 1000, 'the ' + k.split('<')[1] + ' stays over the ' + k.split('<')[0] + ' in every stance (worst ' + w.mm.toFixed(1) + ' mm, ' + w.pose + ')');
    if (fails.length) out.push('INFO through: ' + fails.slice(0, 30).join('; '));
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
