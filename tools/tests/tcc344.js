// tcc344 - CC-344 (J128, Jerry 10 Nov, standing, D-140; AGENTS rule 24): his kit against his moving body. Third person, in
//  the full kit (the helmet, the plate carrier, the pads, the NVG; the pack, the belt and its pouches, the holster): every kit
//  part he wears on his trunk (anything carried by the chest, the hips or the head) against the parts that move by it: each
//  arm (sleeve, glove, hand) and each leg (trouser leg, boot, the pads and holster riding on that leg), in every clip and
//  stance (stand armed and unarmed, walk, run, crouch, crouch-walk, aim, reload, jump), several frames of each. A vertex of a
//  moving part inside a kit part (signed distance to its nearest face, 3 cm reach) by more than 0.5 mm fails, and so does a
//  leg's kit inside the other leg (only by a closed mesh: inside means behind its nearest face AND inside by ray parity on two
//  of three axes; the kit parts that are open shells are listed, not measured as solids). A vertex hidden inside his own
//  trunk (the shirt's body, the seat) or within SEAM of its shoulder or hip joint (a sleeve's or trouser leg's top, sewn in
//  there) is not counted. Named exceptions: core/clip-exceptions.js (printed when used).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  // SEAM: a sleeve's or a trouser leg's top, within this of its shoulder or hip joint, is sewn into the shirt or the seat
  // under the kit by design (the seam, not a limb through it): not measured.
  const TOL = 0.0005, REACH = 0.03, SEAM = 0.07;
  try {
    await startMatch(T, 'Kit');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000);
    const THREE = T.THREE, M = T.marine, ud = M.userData;
    const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const matName = (o) => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return m && typeof m.name === 'string' ? m.name : ''; };
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

    // Which group a mesh belongs to: 'armL', 'armR', 'legL', 'legR' (moving), 'trunk' (the kit), or null (not measured: his
    // skin, head and face, the gun, the trunk's own cloth).
    const chain = (o) => { for (let x = o; x; x = x.parent) {
      if (x === ud.armLG || x === ud.elbowLG || x === ud.forearmLG) return 'armL'; if (x === ud.armRG || x === ud.elbowRG || x === ud.forearmRG) return 'armR';
      if (x === ud.legLG) return 'legL'; if (x === ud.legRG) return 'legR'; if (x === ud.weaponMount || x === ud.gripR || x === ud.gripL) return 'gun'; if (x === M) return null; } return null; };
    const gearOf = new Map(), gp = ud.gearParts || {};
    for (const g of Object.keys(gp)) for (const r of gp[g] || []) r.traverse((o) => gearOf.set(o, g));
    const KIT_WEAR = new Set(['pack', 'belt', 'carrier', 'vest', 'pads', 'helmet', 'holster']), MOVE_WEAR = new Set(['shirt', 'gloves', 'trousers', 'boots', 'pads', 'holster', 'belt']);
    const tubes = new Set();
    const W = (o) => o.getWorldPosition(new THREE.Vector3());
    const segD = (v, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, v.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()))); return v.distanceTo(a.clone().addScaledVector(ab, t)); };
    const groups = () => {
      M.updateMatrixWorld(true);
      M.traverse((o) => { if (o.userData && o.userData.cloth && typeof o.userData.cloth.bend === 'function') o.userData.cloth.bend(); });
      if (ud.waist && typeof ud.waist.bend === 'function') ud.waist.bend();
      const G = { trunk: [], body: [], armL: [], armR: [], legL: [], legR: [], rigid: { armL: [], armR: [], legL: [], legR: [] } };
      // the limbs' lines, for the live cloth's vertices (one mesh may dress both legs)
      const hand = (s) => { let h = null; (s === 'L' ? ud.forearmLG : ud.forearmRG).traverse((o) => { if (!h && /hand/.test(o.name || '')) h = o; }); return h ? new THREE.Box3().setFromObject(h).getCenter(new THREE.Vector3()) : W(s === 'L' ? ud.forearmLG : ud.forearmRG); };
      const LINES = { armL: [[W(ud.armLG), W(ud.elbowLG)], [W(ud.elbowLG), hand('L')]], armR: [[W(ud.armRG), W(ud.elbowRG)], [W(ud.elbowRG), hand('R')]],
        legL: [[W(ud.legLG), W(ud.kneeLG)], [W(ud.kneeLG), W(ud.ankleLG)]], legR: [[W(ud.legRG), W(ud.kneeRG)], [W(ud.kneeRG), W(ud.ankleRG)]] };
      const nearest = (v, keys) => { let bk = null, bd = Infinity; for (const k of keys) for (const [a, b] of LINES[k]) { const d = segD(v, a, b); if (d < bd) { bd = d; bk = k; } } return bk; };
      M.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position || !vis(o)) return;
        const gp0 = o.geometry.parameters, path = gp0 && (Array.isArray(gp0) ? gp0[0] : gp0.path);
        if ((THREE.TubeGeometry && o.geometry instanceof THREE.TubeGeometry) || (path && typeof path.getPoint === 'function')) { tubes.add(o.name || '?'); return; }
        const n = matName(o), wear = n.startsWith('wear:') ? n.slice(5) : null, g = gearOf.get(o), c = chain(o), nm = o.name || '';
        if (c === 'gun') return;
        if (c) { G[c].push({ m: o }); G.rigid[c].push(o); return; }
        // the live cloth (the sleeves, the trouser legs) hangs off him, not off its limb: each vertex goes with the limb it is on
        if (/live-sleeve|live-trouser-leg/.test(nm)) {
          const keys = /sleeve/.test(nm) ? ['armL', 'armR'] : ['legL', 'legR'], p = o.geometry.attributes.position, v = new THREE.Vector3(), side = new Uint8Array(p.count);
          for (let i = 0; i < p.count; i++) side[i] = nearest(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld), keys) === keys[0] ? 0 : 1;
          G[keys[0]].push({ m: o, keep: (i) => side[i] === 0 }); G[keys[1]].push({ m: o, keep: (i) => side[i] === 1 });
          return;
        }
        if (g === 'bareHead' || g === 'bareTorso') return;
        if (g || (wear && KIT_WEAR.has(wear))) { G.trunk.push(o); return; }
        if (wear === 'shirt' || wear === 'trousers' || /marine-flexible-shirt|fitted-pelvis|live-seat/.test(nm)) G.body.push(o);
      });
      return G;
    };
    // A solid's triangles, outward normals, a grid of REACH cells.
    const solid = (meshes, R = REACH) => {
      const P = [], N = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), v = new THREE.Vector3(), owner = [];
      for (const m of meshes) {
        const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count, flip = m.matrixWorld.determinant() < 0;
        for (let i = 0; i + 2 < n; i += 3) {
          a.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(p, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(p, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(m.matrixWorld);
          v.subVectors(b, a).cross(c.clone().sub(a)); const l = v.length(); if (l < 1e-12) continue; v.multiplyScalar((flip ? -1 : 1) / l);
          P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); N.push(v.x, v.y, v.z); owner.push(m);
        }
      }
      const G = new Map(), cell = (x) => Math.floor(x / R);
      for (let t = 0; t < P.length; t += 9) {
        const x0 = cell(Math.min(P[t], P[t + 3], P[t + 6])), x1 = cell(Math.max(P[t], P[t + 3], P[t + 6]));
        const y0 = cell(Math.min(P[t + 1], P[t + 4], P[t + 7])), y1 = cell(Math.max(P[t + 1], P[t + 4], P[t + 7]));
        const z0 = cell(Math.min(P[t + 2], P[t + 5], P[t + 8])), z1 = cell(Math.max(P[t + 2], P[t + 5], P[t + 8]));
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const k = x + ',' + y + ',' + z; let l = G.get(k); if (!l) G.set(k, l = []); l.push(t); }
      }
      // each mesh's triangles, and whether it is closed (every edge shared by two of its faces, positions welded at 0.01 mm):
      // only a closed mesh has an inside
      const range = new Map();
      for (let t = 0; t < owner.length; t++) { const r = range.get(owner[t]); if (r) r[1] = t + 1; else range.set(owner[t], [t, t + 1]); }
      const closed = new Map();
      for (const [m, [t0, t1]] of range) {
        const key = (i) => Math.round(P[i] * 1e5) + ',' + Math.round(P[i + 1] * 1e5) + ',' + Math.round(P[i + 2] * 1e5), E = new Map();
        for (let t = t0; t < t1; t++) { const k = [key(t * 9), key(t * 9 + 3), key(t * 9 + 6)]; for (let j = 0; j < 3; j++) { const a2 = k[j], b2 = k[(j + 1) % 3]; if (a2 === b2) continue; const e = a2 < b2 ? a2 + '|' + b2 : b2 + '|' + a2; E.set(e, (E.get(e) || 0) + 1); } }
        let ok2 = E.size > 0; for (const c2 of E.values()) if (c2 % 2) { ok2 = false; break; }
        closed.set(m, ok2);
      }
      return { P, N, G, cell, owner, R, range, closed };
    };
    // The deepest vertex of `moving` inside the solid S, along the nearest face's normal; the parts it is in, named.
    const label = (o) => (matName(o) || '?') + ':' + (o.name || (o.parent && o.parent.name) || '?');
    // Is world point v inside solid S (the nearest face within its reach, behind it)? How deep, which face.
    const depthIn = (S, v) => {
      const cx = S.cell(v.x), cy = S.cell(v.y), cz = S.cell(v.z); let best = S.R, bt = -1;
      for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
        const l = S.G.get(x + ',' + y + ',' + z); if (!l) continue;
        for (const t of l) { const d = distTri(S.P, t, v.x, v.y, v.z); if (d < best) { best = d; bt = t; } }
      }
      if (bt < 0) return null;
      const f = bt / 3, s = (v.x - S.P[bt]) * S.N[f] + (v.y - S.P[bt + 1]) * S.N[f + 1] + (v.z - S.P[bt + 2]) * S.N[f + 2];
      return s < 0 ? { d: best, t: bt } : null;
    };
    // Inside a closed mesh by ray parity (Moller-Trumbore), on two of three axes.
    const parityIn = (S, m, v) => {
      const r = S.range.get(m); if (!r || !S.closed.get(m)) return false; const P = S.P; let votes = 0;
      for (const [dx, dy, dz] of [[1, 0.0013, 0.0007], [0.0009, 1, 0.0011], [0.0012, 0.0005, 1]]) {
        let hits = 0;
        for (let t = r[0]; t < r[1]; t++) { const i = t * 9;
          const e1x = P[i + 3] - P[i], e1y = P[i + 4] - P[i + 1], e1z = P[i + 5] - P[i + 2], e2x = P[i + 6] - P[i], e2y = P[i + 7] - P[i + 1], e2z = P[i + 8] - P[i + 2];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-14) continue;
          const inv = 1 / det, tx = v.x - P[i], ty = v.y - P[i + 1], tz = v.z - P[i + 2], u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, w = (dx * qx + dy * qy + dz * qz) * inv; if (w < 0 || u + w > 1) continue;
          if ((e2x * qx + e2y * qy + e2z * qz) * inv > 0) hits++; }
        if (hits % 2) votes++;
      }
      return votes >= 2;
    };
    // The deepest point of `moving` ({ m, keep }: a mesh and which of its vertices) inside S, but not one hidden inside his
    // own trunk (H: the shirt's body and the trousers' seat; a sleeve's or a trouser leg's top is sewn in there).
    const inside = (S, moving, H, roots) => {
      let worst = 0, at = null, kit = null, part = null; const v = new THREE.Vector3();
      for (const { m, keep } of moving) {
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          if (keep && !keep(i)) continue;
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          if (roots && roots.some((r) => r.distanceToSquared(v) < SEAM * SEAM)) continue;
          const r = depthIn(S, v); if (!r || r.d <= worst) continue;
          if (!parityIn(S, S.owner[r.t / 9], v)) continue;
          if (H && depthIn(H, v)) continue;
          worst = r.d; at = v.clone(); kit = S.owner[r.t / 9]; part = m;
        }
      }
      return { worst, at, kit: kit && label(kit), part: part && label(part) };
    };
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
    let CX = null; try { CX = await import('/core/clip-exceptions.js'); } catch (e) { out.push('INFO no clip exceptions: ' + e.message); }
    await kitOn();
    const first = groups();
    out.push('INFO measured: ' + ['trunk', 'body', 'armL', 'armR', 'legL', 'legR'].map((k) => k + ' ' + first[k].length).join(', '));
    { const S0 = solid(first.trunk), open = [...S0.closed].filter(([, c]) => !c).map(([m]) => label(m)); out.push('INFO kit parts with no inside (open shells, not measured as solids): ' + open.length + ' of ' + S0.closed.size + (open.length ? ': ' + open.slice(0, 12).join(', ') : '')); }
    const SAMPLES = 4;
    for (const [pose, set] of [...POSES, ...KIT.map(([n, f]) => [n.replace('kit: ', '') + ' again', f])]) {
      T.player.position.copy(home); await set();
      const row = [];
      for (let s = 0; s < SAMPLES; s++) {
        if (s) step(3);
        const G = groups(), trunk = solid(G.trunk), H = solid(G.body, 0.08);
        const pairs = [['armL', trunk, G.armL], ['armR', trunk, G.armR], ['legL', trunk, G.legL], ['legR', trunk, G.legR], ['legL<legR', solid(G.rigid.legL), G.legR], ['legR<legL', solid(G.rigid.legR), G.legL]];
        for (const [name, S, mv] of pairs) {
          const r = inside(S, mv, H, name.startsWith('arm') ? [W(ud.armLG), W(ud.armRG)] : [W(ud.legLG), W(ud.legRG)]), mm = r.worst * 1000, key = name.includes('<') ? 'the ' + name.split('<')[1] + ' out of the ' + name.split('<')[0] : 'the ' + name + ' out of his kit';
          if (!worst[key]) worst[key] = { mm: 0, pose };
          const ex = r.worst > TOL && CX ? CX.clipException(r.kit || 'kit', r.part || name, pose, r.worst) : null;
          if (ex) { excused.push(pose + ': ' + name + ' ' + mm.toFixed(1) + ' mm (' + ex.id + ')'); continue; }
          if (mm > worst[key].mm) worst[key] = { mm, pose };
          if (r.worst > TOL) fails.push(pose + '#' + s + ': ' + name + ' ' + mm.toFixed(1) + ' mm {' + r.part + ' in ' + r.kit + '} at (' + [r.at.x - T.player.position.x, r.at.y - T.player.position.y, r.at.z - T.player.position.z].map((x) => x.toFixed(2)).join(', ') + ')');
          if (!s) row.push(name + ' ' + mm.toFixed(1));
        }
      }
      out.push('INFO ' + pose + ' (mm in, first frame): ' + row.join(', '));
    }
    press([]); T.flightHold(false);
    out.push('INFO excused (core/clip-exceptions.js): ' + (excused.join('; ') || 'none'));
    out.push('INFO not measured (the test page\'s stand-in tubes): ' + ([...tubes].join(', ') || 'none'));
    for (const [k, w] of Object.entries(worst)) ok(w.mm <= TOL * 1000, k + ' in every stance (worst ' + w.mm.toFixed(1) + ' mm, ' + w.pose + ')');
    if (fails.length) out.push('INFO through: ' + fails.slice(0, 40).join('; '));
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
