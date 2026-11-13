// t337 — CJ-1 / J151 note 63 (Jerry: "an insane amount of flickering textures throughout the training area"):
// no two visible faces in the Training Ground lie on the same plane, overlap, and leave the depth buffer to pick the
// winner (z-fighting, the flicker as the camera moves). Every visible triangle of the Training group (instances
// expanded) is put in a bucket by its plane; two faces of different meshes that face the same way (or either is
// two-sided), sit within 0.8 mm of each other along the normal (the depth step at ~37 m with the Training camera's
// 0.1 m near plane and a 24-bit depth buffer) and overlap by 1 cm² or more must be separated by a
// polygonOffset that differs by at least 1, or a different renderOrder when neither writes depth. Faces that would
// look identical either way (the same material, or the same untextured colour) are skipped: a fight there can't be
// seen. The cutaway walls are brought to rest first (camera and player mid-range), so every wall is solid.
(async () => {
  const T = window.TT, out = [], ok = (v, s) => out.push((v ? 'PASS ' : 'FAIL ') + s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(40); } return !!f(); };
  try {
    if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
    const name = document.getElementById('playerName'); if (name) name.value = 'CJ-1';
    if (!T.trainingDbg.state().active) document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active), 'Training Ground opened');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 20000), 'entry blackout cleared');
    const tg = T.trainingDbg.tg(), g = tg.group, O = tg.origin, H = T.THREE;
    // Rest the cutaway: the camera and the player in the middle of the range, nothing between them.
    if (tg.cutaway?.update) for (let i = 0; i < 4; i++) tg.cutaway.update({ x: O.x, y: O.y + 1.7, z: O.z + 6 }, { x: O.x, y: O.y, z: O.z + 9 }, 1);
    g.updateMatrixWorld(true);

    const SEP = 0.0008, MINAREA = 1e-4, NQ = 60;
    const shown = o => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const label = o => { const p = []; for (let x = o; x && x !== g && p.length < 3; x = x.parent) if (x.name) p.push(x.name); return p.join('<') || '(unnamed ' + (o.geometry?.type || '') + ')'; };
    const tris = [], va = new H.Vector3(), vb = new H.Vector3(), vc = new H.Vector3(), e1 = new H.Vector3(), e2 = new H.Vector3(), m4 = new H.Matrix4(), im = new H.Matrix4();
    // Which way a face points is read from its winding. The suite's stand-in three (fakethree) winds a cylinder's
    // bottom cap, and whole lathes and tori, the other way round from three.js, so the winding is first made
    // consistent: on every closed part (vertices welded by position, every edge shared by exactly two faces) the faces
    // are oriented alike across their edges and then outward (positive volume). On real three this changes nothing.
    const flipCache = new Map();
    const outward = geo => {
      if (flipCache.has(geo)) return flipCache.get(geo);
      const pos = geo.attributes.position, idx = geo.index, n = idx ? idx.count : pos.count, nt = Math.floor(n / 3);
      const flip = new Uint8Array(nt), weld = new Map(), wid = new Array(pos.count);
      for (let i = 0; i < pos.count; i++) { const k = Math.round(pos.getX(i) * 1e5) + ',' + Math.round(pos.getY(i) * 1e5) + ',' + Math.round(pos.getZ(i) * 1e5); if (!weld.has(k)) weld.set(k, weld.size); wid[i] = weld.get(k); }
      const tv = new Int32Array(nt * 3), ok = new Uint8Array(nt), edges = new Map();
      for (let t = 0; t < nt; t++) {
        const a = wid[idx ? idx.getX(t * 3) : t * 3], b = wid[idx ? idx.getX(t * 3 + 1) : t * 3 + 1], c = wid[idx ? idx.getX(t * 3 + 2) : t * 3 + 2];
        tv[t * 3] = a; tv[t * 3 + 1] = b; tv[t * 3 + 2] = c;
        if (a === b || b === c || a === c) continue;
        ok[t] = 1;
        for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? p + ':' + q : q + ':' + p; let l = edges.get(k); if (!l) edges.set(k, l = []); l.push(t, p < q ? 1 : -1); }
      }
      const seen = new Uint8Array(nt), sgn = new Int8Array(nt);
      for (let s = 0; s < nt; s++) {
        if (!ok[s] || seen[s]) continue;
        const comp = [s], q = [s]; seen[s] = 1; sgn[s] = 1; let closed = true, consistent = true;
        while (q.length) {
          const t = q.pop();
          for (let e = 0; e < 3; e++) {
            const p = tv[t * 3 + e], r = tv[t * 3 + (e + 1) % 3], l = edges.get(p < r ? p + ':' + r : r + ':' + p);
            if (l.length !== 4) { closed = false; continue; }
            const u = l[0] === t ? l[2] : l[0], du = l[0] === t ? l[3] : l[1], dt = l[0] === t ? l[1] : l[3];
            const want = -dt * sgn[t] * du;   // the neighbour runs the shared edge the other way
            if (!seen[u]) { seen[u] = 1; sgn[u] = want; comp.push(u); q.push(u); } else if (sgn[u] !== want) consistent = false;
          }
        }
        if (!closed || !consistent) continue;
        let vol = 0;
        for (const t of comp) {
          const ia = idx ? idx.getX(t * 3) : t * 3, ib = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, ic = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          const ax = pos.getX(ia), ay = pos.getY(ia), az = pos.getZ(ia), bx = pos.getX(ib), by = pos.getY(ib), bz = pos.getZ(ib), cx = pos.getX(ic), cy = pos.getY(ic), cz = pos.getZ(ic);
          vol += sgn[t] * (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx));
        }
        const out = vol >= 0 ? 1 : -1;
        for (const t of comp) flip[t] = sgn[t] * out < 0 ? 1 : 0;
      }
      flipCache.set(geo, flip); return flip;
    };
    let meshes = 0, repaired = 0;
    g.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position || !shown(o)) return;
      meshes++;
      const geo = o.geometry, pos = geo.attributes.position, idx = geo.index, n = idx ? idx.count : pos.count;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const groups = geo.groups?.length ? geo.groups : [{ start: 0, count: n, materialIndex: 0 }];
      const d0 = geo.drawRange?.start || 0, d1 = d0 + Math.min(geo.drawRange?.count ?? Infinity, n);
      const count = o.isInstancedMesh ? o.count : 1, flip = outward(geo);
      for (let k = 0; k < count; k++) {
        if (o.isInstancedMesh) { o.getMatrixAt(k, im); m4.multiplyMatrices(o.matrixWorld, im); } else m4.copy(o.matrixWorld);
        const mirror = m4.determinant() < 0;   // three.js turns the front face round for a mirrored matrix
        for (const gr of groups) {
          const mat = mats[gr.materialIndex || 0] || mats[0];
          if (!mat || mat.visible === false || mat.colorWrite === false || mat.opacity === 0) continue;
          for (let i = Math.max(gr.start, d0), e = Math.min(gr.start + gr.count, d1); i + 2 < e; i += 3) {
            const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
            va.fromBufferAttribute(pos, a).applyMatrix4(m4); vb.fromBufferAttribute(pos, b).applyMatrix4(m4); vc.fromBufferAttribute(pos, c).applyMatrix4(m4);
            e1.subVectors(vb, va); e2.subVectors(vc, va); e1.cross(e2);
            const len = e1.length(); if (len < 2e-6) continue;
            const fl = flip[Math.floor(i / 3)]; if (fl) repaired++;
            const sg = (fl ^ (mirror ? 1 : 0) ^ (mat.side === 1 ? 1 : 0)) ? -1 : 1;   // side 1 = BackSide: its back is the face drawn
            let nx = sg * e1.x / len, ny = sg * e1.y / len, nz = sg * e1.z / len, d = nx * va.x + ny * va.y + nz * va.z, f = 1;
            if (nx < -1e-6 || (Math.abs(nx) <= 1e-6 && (ny < -1e-6 || (Math.abs(ny) <= 1e-6 && nz < 0)))) { nx = -nx; ny = -ny; nz = -nz; d = -d; f = -1; }
            tris.push({ o, id: o.uuid + ':' + k, mat, n: [nx, ny, nz], d, f, v: [va.toArray(), vb.toArray(), vc.toArray()] });
          }
        }
      }
    });
    ok(meshes >= 250 && tris.length >= 20000, `scanned ${tris.length} visible triangles in ${meshes} Training meshes (${repaired} faces turned outward first)`);

    const buckets = new Map();
    for (const t of tris) { const k = Math.round(t.n[0] * NQ) + ',' + Math.round(t.n[1] * NQ) + ',' + Math.round(t.n[2] * NQ); t.k = k; t.b = Math.floor(t.d / SEP); const kk = k + '|' + t.b; if (!buckets.has(kk)) buckets.set(kk, []); buckets.get(kk).push(t); }
    const offs = m => m.polygonOffset ? [m.polygonOffsetFactor || 0, m.polygonOffsetUnits || 0] : [0, 0];
    const look = m => m.map || m.vertexColors ? null : [m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.opacity, m.roughness, m.metalness].join(':');
    const area2 = P => { let s = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
    const clip = (subj, cp) => {
      let res = subj; const cw = area2(cp) < 0;
      for (let i = 0; i < cp.length && res.length; i++) {
        const A = cp[i], B = cp[(i + 1) % cp.length], inside = p => { const c = (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]); return cw ? c <= 0 : c >= 0; };
        const src = res; res = [];
        for (let j = 0; j < src.length; j++) {
          const P = src[j], Q = src[(j + 1) % src.length], pi = inside(P), qi = inside(Q);
          if (pi) res.push(P);
          if (pi !== qi) { const dx = Q[0] - P[0], dy = Q[1] - P[1], ex = B[0] - A[0], ey = B[1] - A[1], den = dx * ey - dy * ex; if (Math.abs(den) > 1e-12) { const s = ((A[0] - P[0]) * ey - (A[1] - P[1]) * ex) / den; res.push([P[0] + s * dx, P[1] + s * dy]); } }
        }
      }
      return res;
    };
    const fights = new Map();
    for (const [kk, list] of buckets) {
      const [k, b] = kk.split('|'), near = list.concat(buckets.get(k + '|' + (+b + 1)) || []);
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < near.length; j++) {
        const A = list[i], B = near[j];
        if (A.id === B.id || A.o === B.o && !A.o.isInstancedMesh) continue;
        if (Math.abs(A.d - B.d) > SEP) continue;
        if (A.n[0] * B.n[0] + A.n[1] * B.n[1] + A.n[2] * B.n[2] < 0.9995) continue;
        if (A.f !== B.f && A.mat.side !== 2 && B.mat.side !== 2) continue;   // back to back: one is always culled
        if (A.f < 0 && A.n[1] > 0.999 && B.f < 0 && A.mat.side !== 2 && B.mat.side !== 2 && A.d <= O.y + 0.0005) continue;   // facing down at or under the floor: never seen
        const oa = offs(A.mat), ob = offs(B.mat);
        if (Math.abs(oa[0] - ob[0]) >= 0.99 || Math.abs(oa[1] - ob[1]) >= 0.99) continue;   // a polygonOffset step apart
        if (A.mat.depthTest === false || B.mat.depthTest === false) continue;
        const depth = A.mat.depthWrite !== false || B.mat.depthWrite !== false;
        if (!depth && A.o.renderOrder !== B.o.renderOrder) continue;   // blended layers in a fixed order
        if (!depth) { A.o.getWorldPosition(va); B.o.getWorldPosition(vb); if (va.distanceToSquared(vb) < 1e-10) continue; }   // same sort depth: a fixed order by id
        if (A.mat === B.mat || (look(A.mat) && look(A.mat) === look(B.mat))) continue;   // nothing to see
        const ax = Math.abs(A.n[0]), ay = Math.abs(A.n[1]), az = Math.abs(A.n[2]);
        const [u, w, x] = ax >= ay && ax >= az ? [1, 2, ax] : ay >= az ? [0, 2, ay] : [0, 1, az];
        const P = A.v.map(p => [p[u], p[w]]), Q = B.v.map(p => [p[u], p[w]]);
        if (Math.max(...P.map(p => p[0])) <= Math.min(...Q.map(p => p[0])) || Math.max(...Q.map(p => p[0])) <= Math.min(...P.map(p => p[0]))) continue;
        if (Math.max(...P.map(p => p[1])) <= Math.min(...Q.map(p => p[1])) || Math.max(...Q.map(p => p[1])) <= Math.min(...P.map(p => p[1]))) continue;
        const C = clip(P, Q); if (C.length < 3) continue;
        const ar = Math.abs(area2(C)) / x;
        if (ar < 1e-7) continue;
        const la = label(A.o), lb = label(B.o), key = (A.o.uuid < B.o.uuid ? A.o.uuid + B.o.uuid : B.o.uuid + A.o.uuid);
        const f = fights.get(key) || { pair: `${la} × ${lb}`, area: 0, sep: 1, at: A.v[0].map((v, q) => v - [O.x, O.y, O.z][q]), kind: depth ? 'depth' : 'blend order', offs: [oa, ob] };
        f.area += ar; f.sep = Math.min(f.sep, Math.abs(A.d - B.d)); fights.set(key, f);
      }
    }
    const list = [...fights.values()].filter(f => f.area >= MINAREA).sort((a, b) => b.area - a.area);
    const say = f => `${f.pair} (${f.kind}, ${(f.area * 1e4).toFixed(0)} cm², ${(f.sep * 1000).toFixed(1)} mm apart, offsets ${JSON.stringify(f.offs)}, at ${f.at.map(v => v.toFixed(2)).join(',')})`;
    const depthFights = list.filter(f => f.kind === 'depth'), orderFights = list.filter(f => f.kind !== 'depth');
    ok(!depthFights.length, `no coplanar overlapping faces left to the depth buffer (z-fighting)${depthFights.length ? `: ${depthFights.length} pairs, ${(depthFights.reduce((s, f) => s + f.area, 0)).toFixed(2)} m², each below` : ''}`);
    for (const f of depthFights.slice(0, 40)) ok(false, 'z-fight: ' + say(f));
    ok(!orderFights.length, `no coplanar blended layers in a camera-dependent order${orderFights.length ? `: ${orderFights.length} pairs, each below` : ''}`);
    for (const f of orderFights.slice(0, 20)) ok(false, 'blend order: ' + say(f));
    // The layer stacks that flickered (CJ-1): paint over floor, wear over paint, each a step apart.
    const byName = n => { let m = null; g.traverse(o => { if (!m && o.name === n) m = o; }); return m; };
    const paint = byName('training-no-build-paint');
    ok(!!paint && paint.material.polygonOffset, 'the no-build stripe paint is lifted off the build floor by polygonOffset');
  } catch (e) { ok(false, 't337 threw: ' + String(e.stack || e).slice(0, 700)); }
  return out.join('\n');
})()
