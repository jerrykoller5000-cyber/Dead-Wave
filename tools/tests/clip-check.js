// CL-334 h: the hands against the guns, first person (J126 rule 2, J128), for tcl334b/c/d: each a few guns (the suite's
// time limit). clipCheck(T, keys, ok, out): every gun in keys up at the hip, settled; both hands (the glove, its pads, or the
// bare hand and its nails) against every closed body of the gun (each mesh split into its bodies, CD-1), and the gloved wrists against the sleeves.
export async function clipCheck(T, keys, ok, out) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE, TOL = 0.0005;
  const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const worldTris = (m) => {
    const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count, out = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    return out;
  };
  // closed: every edge shared by two faces (positions rounded to 10 µm)
  const closedOf = (P) => {
    const E = new Map(), key = (i) => Math.round(P[i * 3] * 1e5) + ',' + Math.round(P[i * 3 + 1] * 1e5) + ',' + Math.round(P[i * 3 + 2] * 1e5);
    for (let t = 0; t < P.length / 9; t++) { const k = [key(t * 3), key(t * 3 + 1), key(t * 3 + 2)]; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = k[a] < k[b] ? k[a] + '|' + k[b] : k[b] + '|' + k[a]; E.set(e, (E.get(e) || 0) + 1); } }
    for (const c of E.values()) if (c !== 2) return false;
    return true;
  };
  // CD-1 (11 Nov): a mesh can hold several bodies (the revolver's walnut grip shares its mesh with 780 open checkering quads):
  // split it into its connected bodies (faces sharing an edge, 10 µm) and check every closed one; one open body no longer
  // hides the rest of the mesh from the check
  const bodiesOf = (P) => {
    const n = P.length / 9, par = new Int32Array(n), first = new Map(), key = (i) => Math.round(P[i * 3] * 1e5) + ',' + Math.round(P[i * 3 + 1] * 1e5) + ',' + Math.round(P[i * 3 + 2] * 1e5);
    for (let t = 0; t < n; t++) par[t] = t;
    const fd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let t = 0; t < n; t++) { const k = [key(t * 3), key(t * 3 + 1), key(t * 3 + 2)]; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = k[a] < k[b] ? k[a] + '|' + k[b] : k[b] + '|' + k[a]; const f = first.get(e); if (f === undefined) first.set(e, t); else par[fd(t)] = fd(f); } }
    const g = new Map(); for (let t = 0; t < n; t++) { const r = fd(t); if (!g.has(r)) g.set(r, []); g.get(r).push(t); }
    if (g.size === 1) return [P];
    return [...g.values()].map((ts) => { const B = new Float32Array(ts.length * 9); ts.forEach((t, i) => B.set(P.subarray(t * 9, t * 9 + 9), i * 9)); return B; });
  };
  const rayHits = (P, x, y, z) => {   // faces crossed by the ray from (x, y, z) along a slanted direction
    const dx = 0.8366, dy = 0.3419, dz = 0.4279; let n = 0;
    for (let t = 0; t < P.length; t += 9) {
      const ax = P[t], ay = P[t + 1], az = P[t + 2], e1x = P[t + 3] - ax, e1y = P[t + 4] - ay, e1z = P[t + 5] - az, e2x = P[t + 6] - ax, e2y = P[t + 7] - ay, e2z = P[t + 8] - az;
      const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x, det = e1x * hx + e1y * hy + e1z * hz;
      if (Math.abs(det) < 1e-16) continue; const f = 1 / det, sx = x - ax, sy = y - ay, sz = z - az, u = f * (sx * hx + sy * hy + sz * hz); if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = f * (dx * qx + dy * qy + dz * qz); if (w < 0 || u + w > 1) continue;
      if (f * (e2x * qx + e2y * qy + e2z * qz) > 0) n++;
    }
    return n;
  };
  const distTri = (P, t, px, py, pz) => {   // point to triangle (Ericson)
    const a = [P[t], P[t + 1], P[t + 2]], b = [P[t + 3], P[t + 4], P[t + 5]], c = [P[t + 6], P[t + 7], P[t + 8]];
    const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], p = [px, py, pz];
    const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap); let q;
    if (d1 <= 0 && d2 <= 0) q = a; else {
      const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
      if (d3 >= 0 && d4 <= d3) q = b; else { const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); q = [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; } else {
          const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
          if (d6 >= 0 && d5 <= d6) q = c; else { const vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); q = [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; } else {
              const va = d3 * d6 - d5 * d4;
              if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); q = [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; } else {
                const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]; } } } } } }
    return Math.hypot(px - q[0], py - q[1], pz - q[2]);
  };
    await startMatch(T, 'Clip');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000); T.grantAllWeapons && T.grantAllWeapons();
    const vm = () => T.viewmodelDbg && T.viewmodelDbg();
    if (!vm()) { ok(false, 'no view model'); return out.join('\n'); }
    const home = T.player.position.clone();
    T.setViewFirstDbg(true); T.setWorldTime && T.setWorldTime(0.42);
    const take = async (key) => {
      vm().info.tune = {}; vm().retune(); T.flightHold(false);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== key; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(key)); await wait(150); }
      T.player.position.copy(home); T.flightHold(true); T.setOtsAimDbg && T.setOtsAimDbg(0, -0.25);
      for (let i = 0; i < 120 && !(vm().info.active && vm().info.key === key && vm().info.raise > 0.999); i++) T.stepFrame(1 / 30);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
      return vm().info.key === key;
    };
    const bad = [], seen = [], sleeveBad = [], handsBad = [];
    for (const key of keys) {
      if (!(await take(key))) { out.push('INFO ' + key + ': not up in first person'); continue; }
      const V = vm(); V.root.updateMatrixWorld(true);
      const parts = []; V.gun.root.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.attributes.position && vis(m)) { for (const P of bodiesOf(worldTris(m))) if (closedOf(P)) { const box = new THREE.Box3(); const v = new THREE.Vector3(); for (let i = 0; i < P.length; i += 3) box.expandByPoint(v.set(P[i], P[i + 1], P[i + 2])); parts.push({ name: m.name || (m.parent && m.parent.name) || '?', P, box }); } } });
      let worst = 0, where = '';
      for (const sd of ['r', 'l']) {
        const A = V.arms && V.arms[sd]; if (!A) continue;
        for (const mk of ['glove', 'glovePads', 'bare', 'bareNails']) {
          const m = A.meshes[mk]; if (!m || !vis(m)) continue;
          const pa = m.geometry.attributes.position, v = new THREE.Vector3();
          for (let i = 0; i < pa.count; i++) {
            v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
            for (const pt of parts) {
              if (!pt.box.containsPoint(v)) continue;
              if ((rayHits(pt.P, v.x, v.y, v.z) & 1) === 0) continue;
              let d = 1; for (let t = 0; t < pt.P.length; t += 9) { const e = distTri(pt.P, t, v.x, v.y, v.z); if (e < d) d = e; }
              if (d > worst) { worst = d; where = sd + ' ' + mk + ' in ' + pt.name; }
            }
          }
        }
      }
      // the wrist in the sleeve: glove edges through the sleeve or its hem, near the hem
      for (const sd of ['r', 'l']) {
        const A = V.arms && V.arms[sd]; if (!A || !A.meshes.fore || !vis(A.meshes.fore) || !A.meshes.glove || !vis(A.meshes.glove)) continue;
        const hemBox = new THREE.Box3().setFromObject(A.meshes.cuff).expandByScalar(0.03);
        const S = [A.meshes.fore, A.meshes.cuff].map(worldTris).map((P) => { const keep = []; for (let t = 0; t < P.length; t += 9) { const c = new THREE.Vector3((P[t] + P[t + 3] + P[t + 6]) / 3, (P[t + 1] + P[t + 4] + P[t + 7]) / 3, (P[t + 2] + P[t + 5] + P[t + 8]) / 3); if (hemBox.containsPoint(c)) for (let k = 0; k < 9; k++) keep.push(P[t + k]); } return keep; }).flat();
        const g = A.meshes.glove, gp = g.geometry.attributes.position, gi = g.geometry.index.array, W = new Float32Array(gp.count * 3), v = new THREE.Vector3();
        for (let i = 0; i < gp.count; i++) { v.fromBufferAttribute(gp, i).applyMatrix4(g.matrixWorld); W[i * 3] = v.x; W[i * 3 + 1] = v.y; W[i * 3 + 2] = v.z; }
        let cross = 0;
        for (let t = 0; t < gi.length; t += 3) for (const [a, b] of [[gi[t], gi[t + 1]], [gi[t + 1], gi[t + 2]]]) {
          v.set(W[a * 3], W[a * 3 + 1], W[a * 3 + 2]); if (!hemBox.containsPoint(v)) continue;
          const dx = W[b * 3] - W[a * 3], dy = W[b * 3 + 1] - W[a * 3 + 1], dz = W[b * 3 + 2] - W[a * 3 + 2];
          for (let u = 0; u < S.length; u += 9) {
            const ax = S[u], ay = S[u + 1], az = S[u + 2], e1x = S[u + 3] - ax, e1y = S[u + 4] - ay, e1z = S[u + 5] - az, e2x = S[u + 6] - ax, e2y = S[u + 7] - ay, e2z = S[u + 8] - az;
            const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x, det = e1x * hx + e1y * hy + e1z * hz;
            if (Math.abs(det) < 1e-16) continue; const f = 1 / det, sx = W[a * 3] - ax, sy = W[a * 3 + 1] - ay, sz = W[a * 3 + 2] - az, uu = f * (sx * hx + sy * hy + sz * hz); if (uu < 0 || uu > 1) continue;
            const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, ww = f * (dx * qx + dy * qy + dz * qz); if (ww < 0 || uu + ww > 1) continue;
            const tt = f * (e2x * qx + e2y * qy + e2z * qz); if (tt > 0 && tt < 1) { cross++; break; }
          }
        }
        if (cross) sleeveBad.push(key + ' ' + sd + ': ' + cross + ' glove edges through the sleeve (' + JSON.stringify(A.wristBend || null) + ')');
      }
      // the two hands against each other (the support hand over the firing hand's fingers): the gloves as drawn
      {
        const G = ['r', 'l'].map((sd) => { const A = V.arms && V.arms[sd], m = A && [A.meshes.glove, A.meshes.bare].find((x) => x && vis(x)); if (!m) return null; const P = worldTris(m), box = new THREE.Box3(), v = new THREE.Vector3(); for (let i = 0; i < P.length; i += 3) box.expandByPoint(v.set(P[i], P[i + 1], P[i + 2])); return { m, P, box }; });
        if (G[0] && G[1] && G[0].box.intersectsBox(G[1].box)) {
          let hh = 0;
          for (const [a, b] of [[0, 1], [1, 0]]) {
            const pa = G[a].m.geometry.attributes.position, v = new THREE.Vector3();
            for (let i = 0; i < pa.count; i++) {
              v.fromBufferAttribute(pa, i).applyMatrix4(G[a].m.matrixWorld); if (!G[b].box.containsPoint(v)) continue;
              if ((rayHits(G[b].P, v.x, v.y, v.z) & 1) === 0) continue;
              let d = 1; for (let t = 0; t < G[b].P.length; t += 9) { const e = distTri(G[b].P, t, v.x, v.y, v.z); if (e < d) d = e; }
              if (d > hh) hh = d;
            }
          }
          if (hh > TOL) handsBad.push(key + ': ' + (hh * 1000).toFixed(1) + ' mm');
          out.push('INFO ' + key + ' the hands into each other: ' + (hh * 1000).toFixed(1) + ' mm');
        }
      }
      seen.push(key + ' ' + (worst * 1000).toFixed(1));
      if (worst > TOL) bad.push(key + ': ' + (worst * 1000).toFixed(1) + ' mm (' + where + ')');
    }
    ok(seen.length === keys.length, 'guns checked up in first person: ' + seen.length + ' of ' + keys.length);
    ok(bad.length === 0, 'no part of either hand inside any part of a gun (deepest per gun, mm: ' + seen.join(', ') + ')' + (bad.length ? '; through: ' + bad.join('; ') : ''));
    ok(handsBad.length === 0, 'neither hand through the other (D-140)' + (handsBad.length ? ': ' + handsBad.join('; ') : ''));
    ok(sleeveBad.length === 0, 'the gloved wrists stay inside the sleeves at every gun\'s hip hold' + (sleeveBad.length ? ': ' + sleeveBad.join('; ') : ''));
}
