// tag289 - AG-289 (Jerry, 10 Nov, D-144): Training Ground props part-on-part check (tag284's kind),
// zombie gate corrugated header (Find 2), infirmary O2/IV/mat seating (Find 4), stretcher casters & 4-leg cabinet (Find 5),
// containment gate threshold seating (Find 6), cot scissor legs & pivot pin (Find 7), Build Room wall decals (Find 8),
// and tactical flashlight close-range night hotspot cap.
(async () => {
  const T = window.TT;
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 25000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { if (f()) return true; await wait(40); }
    return !!f();
  };

  try {
    // =========================================================================
    // 1. EXACT 3D TRIANGLE-TO-TRIANGLE PART-ON-PART AUDIT (tag284's kind)
    //    Uses real three.core.js so ExtrudeGeometry / LatheGeometry bevels and
    //    profiles are verified identically in both npm test and realtest.mjs.
    // =========================================================================
    const REAL_THREE = await import(new URL('./vendor/three/three.core.js', location.href).href);
    const { TRAINING } = await import(new URL('./world/training.js', location.href).href);
    const { dressTrainingProps } = await import(new URL('./world/training-props.js', location.href).href);
    const { dressTrainingWear } = await import(new URL('./world/training-wear.js', location.href).href);
    const { BUILD_WEAR, dressBuildWear } = await import(new URL('./world/training-build-wear.js', location.href).href);

    const _v = new REAL_THREE.Vector3();
    const _bExp = new REAL_THREE.Box3();

    function isVisibleInRoot(obj, root) {
      for (let x = obj; x; x = x.parent) {
        if (x.visible === false) return false;
        if (x === root) break;
      }
      return true;
    }

    function extractParts(root) {
      root.updateMatrixWorld(true);
      const parts = [];
      let idx = 0;
      root.traverse((m) => {
        if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position) return;
        if (!isVisibleInRoot(m, root)) return;
        if (m.userData && m.userData.isDecal) return;
        const p = m.geometry.attributes.position;
        const ix = m.geometry.index;
        const n = ix ? ix.count : p.count;
        if (n < 3) return;
        const P = new Float32Array(n * 3);
        const box = new REAL_THREE.Box3();
        for (let i = 0; i < n; i++) {
          _v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld);
          P[i * 3] = _v.x; P[i * 3 + 1] = _v.y; P[i * 3 + 2] = _v.z;
          box.expandByPoint(_v);
        }
        const size = new REAL_THREE.Vector3(); box.getSize(size);
        const center = new REAL_THREE.Vector3(); box.getCenter(center);
        const triCount = (n / 3) | 0;
        const N = new Float32Array(triCount * 3);
        const TBox = new Float32Array(triCount * 6);
        for (let t = 0; t < triCount; t++) {
          const o = t * 9;
          const ax = P[o], ay = P[o + 1], az = P[o + 2];
          const bx = P[o + 3], by = P[o + 4], bz = P[o + 5];
          const cx = P[o + 6], cy = P[o + 7], cz = P[o + 8];
          const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
          const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
          const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
          const l = Math.hypot(nx, ny, nz) || 1;
          N[t * 3] = nx / l; N[t * 3 + 1] = ny / l; N[t * 3 + 2] = nz / l;
          const tb = t * 6;
          TBox[tb] = Math.min(ax, bx, cx); TBox[tb + 1] = Math.min(ay, by, cy); TBox[tb + 2] = Math.min(az, bz, cz);
          TBox[tb + 3] = Math.max(ax, bx, cx); TBox[tb + 4] = Math.max(ay, by, cy); TBox[tb + 5] = Math.max(az, bz, cz);
        }
        const vMap = new Map(), verts = [], vIdx = new Int32Array(n);
        for (let i = 0; i < n; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
          const k = Math.round(x * 1e5) + ',' + Math.round(y * 1e5) + ',' + Math.round(z * 1e5);
          let vi = vMap.get(k);
          if (vi === undefined) { vi = verts.length / 3; vMap.set(k, vi); verts.push(x, y, z); }
          vIdx[i] = vi;
        }
        const edgeCounts = new Map(), edges = [];
        for (let t = 0; t < triCount; t++) {
          const a = vIdx[t * 3], b = vIdx[t * 3 + 1], c = vIdx[t * 3 + 2];
          if (a === b || b === c || c === a) continue;
          for (const [u, w] of [[a, b], [b, c], [c, a]]) {
            const ek = u < w ? u + '|' + w : w + '|' + u;
            const prev = edgeCounts.get(ek) || 0;
            if (prev === 0) edges.push(u, w);
            edgeCounts.set(ek, prev + 1);
          }
        }
        let closed = edgeCounts.size > 0;
        for (const c of edgeCounts.values()) if (c !== 2) { closed = false; break; }
        const label = '#' + idx + '(' + (m.name || m.geometry.type || 'Geo') + '[' + size.x.toFixed(3) + 'x' + size.y.toFixed(3) + 'x' + size.z.toFixed(3) + '@' + center.x.toFixed(2) + ',' + center.y.toFixed(3) + ',' + center.z.toFixed(2) + '])';
        parts.push({ idx: idx++, mesh: m, label, P, N, TBox, triCount, verts: new Float32Array(verts), edges: new Int32Array(edges), closed, box, size, center });
      });
      return parts;
    }

    function ptTriDistSq(P, o, px, py, pz) {
      const ax = P[o], ay = P[o + 1], az = P[o + 2];
      const bx = P[o + 3], by = P[o + 4], bz = P[o + 5];
      const cx = P[o + 6], cy = P[o + 7], cz = P[o + 8];
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cz - az;
      const apx = px - ax, apy = py - ay, apz = pz - az;
      const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
      if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;
      const bpx = px - bx, bpy = py - by, bpz = pz - bz;
      const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
      if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        const qx = ax + abx * v - px, qy = ay + aby * v - py, qz = az + abz * v - pz;
        return qx * qx + qy * qy + qz * qz;
      }
      const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
      const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
      if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;
      const vb = d5 * d2 - d1 * d6;
      if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        const w = d2 / (d2 - d6);
        const qx = ax + acx * w - px, qy = ay + acy * w - py, qz = az + acz * w - pz;
        return qx * qx + qy * qy + qz * qz;
      }
      const va = d3 * d6 - d5 * d4;
      if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
        const qx = bx + (cx - bx) * w - px, qy = by + (cy - by) * w - py, qz = bz + (cz - bz) * w - pz;
        return qx * qx + qy * qy + qz * qz;
      }
      const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom;
      const qx = ax + abx * v + acx * w - px, qy = ay + aby * v + acy * w - py, qz = az + abz * v + acz * w - pz;
      return qx * qx + qy * qy + qz * qz;
    }

    function segSegDistSq(p1x, p1y, p1z, q1x, q1y, q1z, p2x, p2y, p2z, q2x, q2y, q2z) {
      const d1x = q1x - p1x, d1y = q1y - p1y, d1z = q1z - p1z;
      const d2x = q2x - p2x, d2y = q2y - p2y, d2z = q2z - p2z;
      const rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
      const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz;
      let s, t;
      if (a <= 1e-16 && e <= 1e-16) return rx * rx + ry * ry + rz * rz;
      if (a <= 1e-16) { s = 0; t = Math.max(0, Math.min(1, f / e)); }
      else {
        const c = d1x * rx + d1y * ry + d1z * rz;
        if (e <= 1e-16) { t = 0; s = Math.max(0, Math.min(1, -c / a)); }
        else {
          const b = d1x * d2x + d1y * d2y + d1z * d2z, denom = a * e - b * b;
          s = denom !== 0 ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
          t = (b * s + f) / e;
          if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); }
          else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
        }
      }
      const cx = rx + d1x * s - d2x * t, cy = ry + d1y * s - d2y * t, cz = rz + d1z * s - d2z * t;
      return cx * cx + cy * cy + cz * cz;
    }

    function pointDistToMeshSq(part, px, py, pz, bestSq = Infinity) {
      const P = part.P, TB = part.TBox, tc = part.triCount;
      for (let t = 0; t < tc; t++) {
        const tb = t * 6;
        const dx = px < TB[tb] ? TB[tb] - px : (px > TB[tb + 3] ? px - TB[tb + 3] : 0);
        const dy = py < TB[tb + 1] ? TB[tb + 1] - py : (py > TB[tb + 4] ? py - TB[tb + 4] : 0);
        const dz = pz < TB[tb + 2] ? TB[tb + 2] - pz : (pz > TB[tb + 5] ? pz - TB[tb + 5] : 0);
        if (dx * dx + dy * dy + dz * dz >= bestSq) continue;
        const dSq = ptTriDistSq(P, t * 9, px, py, pz);
        if (dSq < bestSq) bestSq = dSq;
      }
      return bestSq;
    }

    function pointInsideClosedMesh(part, x, y, z) {
      if (!part.closed || !part.box.containsPoint(_v.set(x, y, z))) return false;
      const dx = 0.83660006, dy = 0.34190011, dz = 0.42790019, P = part.P;
      let hits = 0;
      for (let o = 0; o < P.length; o += 9) {
        const ax = P[o], ay = P[o + 1], az = P[o + 2];
        const e1x = P[o + 3] - ax, e1y = P[o + 4] - ay, e1z = P[o + 5] - az;
        const e2x = P[o + 6] - ax, e2y = P[o + 7] - ay, e2z = P[o + 8] - az;
        const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
        const det = e1x * hx + e1y * hy + e1z * hz;
        if (Math.abs(det) < 1e-16) continue;
        const f = 1 / det, sx = x - ax, sy = y - ay, sz = z - az;
        const u = f * (sx * hx + sy * hy + sz * hz);
        if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const w = f * (dx * qx + dy * qy + dz * qz);
        if (w < 0 || u + w > 1) continue;
        if (f * (e2x * qx + e2y * qy + e2z * qz) > 1e-9) hits++;
      }
      return (hits & 1) === 1;
    }

    function segmentMeshHits(part, ax, ay, az, bx, by, bz) {
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const sMinX = Math.min(ax, bx), sMaxX = Math.max(ax, bx), sMinY = Math.min(ay, by), sMaxY = Math.max(ay, by), sMinZ = Math.min(az, bz), sMaxZ = Math.max(az, bz);
      const P = part.P, N = part.N, TB = part.TBox, hits = [];
      for (let ti = 0; ti < part.triCount; ti++) {
        const tb = ti * 6;
        if (sMaxX < TB[tb] || sMinX > TB[tb + 3] || sMaxY < TB[tb + 1] || sMinY > TB[tb + 4] || sMaxZ < TB[tb + 2] || sMinZ > TB[tb + 5]) continue;
        const o = ti * 9, v0x = P[o], v0y = P[o + 1], v0z = P[o + 2];
        const e1x = P[o + 3] - v0x, e1y = P[o + 4] - v0y, e1z = P[o + 5] - v0z;
        const e2x = P[o + 6] - v0x, e2y = P[o + 7] - v0y, e2z = P[o + 8] - v0z;
        const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
        const det = e1x * hx + e1y * hy + e1z * hz;
        if (Math.abs(det) < 1e-14) continue;
        const f = 1 / det, sx = ax - v0x, sy = ay - v0y, sz = az - v0z;
        const u = f * (sx * hx + sy * hy + sz * hz);
        if (u < -1e-7 || u > 1 + 1e-7) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const w = f * (dx * qx + dy * qy + dz * qz);
        if (w < -1e-7 || u + w > 1 + 1e-7) continue;
        const t = f * (e2x * qx + e2y * qy + e2z * qz);
        if (t > 1e-6 && t < 1 - 1e-6) hits.push({ t, nx: N[ti * 3], ny: N[ti * 3 + 1], nz: N[ti * 3 + 2] });
      }
      if (hits.length > 1) {
        hits.sort((a, b) => a.t - b.t);
        const dedup = [hits[0]];
        for (let i = 1; i < hits.length; i++) if (hits[i].t - dedup[dedup.length - 1].t > 1e-4) dedup.push(hits[i]);
        return dedup;
      }
      return hits;
    }

    function analyzePair(A, B, maxSearchDist = 0.15) {
      _bExp.copy(A.box).expandByScalar(maxSearchDist);
      if (!_bExp.intersectsBox(B.box)) return { dist: Infinity, penDepth: 0, passThrough: false };
      let penDepth = 0, passThrough = false, hasIntersection = false;
      if (A.box.intersectsBox(B.box)) {
        for (const [src, dst] of [[A, B], [B, A]]) {
          const V = src.verts, E = src.edges;
          if (dst.closed) {
            for (let i = 0; i < V.length; i += 3) {
              if (pointInsideClosedMesh(dst, V[i], V[i + 1], V[i + 2])) {
                hasIntersection = true;
                const d = Math.sqrt(pointDistToMeshSq(dst, V[i], V[i + 1], V[i + 2]));
                if (d > penDepth) penDepth = d;
              }
            }
          }
          for (let e = 0; e < E.length; e += 2) {
            const u = E[e] * 3, w = E[e + 1] * 3;
            const ax = V[u], ay = V[u + 1], az = V[u + 2], bx = V[w], by = V[w + 1], bz = V[w + 2];
            if (Math.max(ax, bx) < dst.box.min.x || Math.min(ax, bx) > dst.box.max.x ||
                Math.max(ay, by) < dst.box.min.y || Math.min(ay, by) > dst.box.max.y ||
                Math.max(az, bz) < dst.box.min.z || Math.min(az, bz) > dst.box.max.z) continue;
            const hits = segmentMeshHits(dst, ax, ay, az, bx, by, bz);
            if (!hits.length) continue;
            hasIntersection = true;
            const eLen = Math.hypot(bx - ax, by - ay, bz - az);
            const pts = [{ t: 0, n: null }, ...hits.map((h) => ({ t: h.t, n: h })), { t: 1, n: null }];
            for (let k = 0; k < pts.length - 1; k++) {
              const t0 = pts[k].t, t1 = pts[k + 1].t, chord = (t1 - t0) * eLen;
              if (chord <= 0.0005) continue;
              const tm = 0.5 * (t0 + t1);
              const mx = ax + (bx - ax) * tm, my = ay + (by - ay) * tm, mz = az + (bz - az) * tm;
              if (dst.closed && pointInsideClosedMesh(dst, mx, my, mz)) {
                const d = Math.sqrt(pointDistToMeshSq(dst, mx, my, mz));
                if (d > penDepth) penDepth = d;
                if (pts[k].n && pts[k + 1].n) {
                  const n0 = pts[k].n, n1 = pts[k + 1].n;
                  if (n0.nx * n1.nx + n0.ny * n1.ny + n0.nz * n1.nz < -0.3 && chord > 0.001 && d > 0.0006) passThrough = true;
                }
              }
            }
          }
        }
      }
      if (hasIntersection) return { dist: 0, penDepth, passThrough };
      let bestSq = Infinity;
      const VA = A.verts, VB = B.verts, EA = A.edges, EB = B.edges;
      for (let i = 0; i < VA.length; i += 3) bestSq = pointDistToMeshSq(B, VA[i], VA[i + 1], VA[i + 2], bestSq);
      for (let i = 0; i < VB.length; i += 3) bestSq = pointDistToMeshSq(A, VB[i], VB[i + 1], VB[i + 2], bestSq);
      for (let i = 0; i < EA.length; i += 2) {
        const a0 = EA[i] * 3, a1 = EA[i + 1] * 3;
        for (let j = 0; j < EB.length; j += 2) {
          const b0 = EB[j] * 3, b1 = EB[j + 1] * 3;
          const dSq = segSegDistSq(VA[a0], VA[a0 + 1], VA[a0 + 2], VA[a1], VA[a1 + 1], VA[a1 + 2], VB[b0], VB[b0 + 1], VB[b0 + 2], VB[b1], VB[b1 + 1], VB[b1 + 2]);
          if (dSq < bestSq) bestSq = dSq;
        }
      }
      return { dist: Math.sqrt(bestSq), penDepth: 0, passThrough: false };
    }

    function auditGroup(root, { groundY = 0, seatMax = 0.030 } = {}) {
      const GAP_MAX = 0.0005;
      const parts = extractParts(root);
      const grounded = new Set();
      for (const p of parts) {
        if (p.box.min.y <= groundY + GAP_MAX && p.box.max.y >= groundY - GAP_MAX) grounded.add(p.idx);
      }
      const adj = Array.from({ length: parts.length }, () => []);
      const pens = [];
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const r = analyzePair(parts[i], parts[j], 0.15);
          if (r.dist <= GAP_MAX) { adj[i].push(j); adj[j].push(i); }
          if (r.passThrough || r.penDepth > seatMax) {
            pens.push(parts[i].label + ' <-> ' + parts[j].label + ' pen=' + (r.penDepth * 1000).toFixed(1) + 'mm pass=' + r.passThrough);
          }
        }
      }
      for (const p of parts) {
        if (p.box.min.y < groundY - GAP_MAX) pens.push('BELOW_GROUND: ' + p.label + ' minY=' + p.box.min.y.toFixed(4));
      }
      const visited = new Set(grounded);
      const q = [...grounded];
      while (q.length) {
        const u = q.shift();
        for (const w of adj[u]) if (!visited.has(w)) { visited.add(w); q.push(w); }
      }
      const gaps = [];
      for (const p of parts) if (!visited.has(p.idx)) gaps.push('FLOATING: ' + p.label);
      return { parts, gaps, pens };
    }

    // Build Containment Gate + Field Infirmary + Sagging Cot with REAL_THREE
    const B = TRAINING.BUILD, R = TRAINING.RANGE;
    const gate = { x: (B.minX + B.maxX) / 2, z: B.maxZ - 1.4 };
    const bedAt = { x: B.minX + 3.15, z: B.minZ + 2.0 };

    const infirmaryGroup = new REAL_THREE.Group();
    const std = (o) => new REAL_THREE.MeshStandardMaterial(o || {});
    const add = (geo, mat, x, y, z, parent = infirmaryGroup) => {
      const m = new REAL_THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const box = (w, h, d, mat, x, y, z, parent) => add(new REAL_THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
    const sign = (text, w, h, x, y, z, yaw) => {
      const m = add(new REAL_THREE.PlaneGeometry(w, h), std({}), x, y, z);
      m.rotation.y = yaw;
      return m;
    };
    const rel = dressTrainingProps(REAL_THREE, {
      B, gate, bedAt, box, add, std,
      texture: () => null, sign, steel: std({}), steelLight: std({}), hazard: std({}), lampMat: std({}),
      labels: { gate: 'ZOMBIE GATE', containment: 'CONTAINMENT', infirmary: 'FIELD INFIRMARY', medical: 'MEDICAL' }
    });

    const gateAll = new REAL_THREE.Group();
    gateAll.add(rel.gateFrame);
    for (const l of rel.gateLeaves) gateAll.add(l);

    const wearRoot = new REAL_THREE.Group();
    const wearAdd = (geo, mat, x, y, z, parent = wearRoot) => {
      const m = new REAL_THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const wearBox = (w, h, d, mat, x, y, z, parent) => wearAdd(new REAL_THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
    const wear = dressTrainingWear(REAL_THREE, { R, B, bedAt, add: wearAdd, box: wearBox, std, texture: () => null, lampMat: std({}), root: wearRoot });
    for (const d of wear.decals) d.userData.isDecal = true;
    for (const c of [...wearRoot.children]) {
      if (c.position.x < -10 && !c.userData.isDecal) infirmaryGroup.add(c);
    }

    const gateAudit = auditGroup(gateAll, { groundY: 0, seatMax: 0.035 });
    ok(gateAudit.parts.length >= 125, 'Containment Gate built with ' + gateAudit.parts.length + ' parts');
    ok(gateAudit.gaps.length === 0, 'Containment Gate part-on-part seating (<= 0.5 mm): 0 floating parts' + (gateAudit.gaps.length ? ' -> ' + gateAudit.gaps[0] : ''));
    ok(gateAudit.pens.length === 0, 'Containment Gate non-penetration & floor check: 0 pass-throughs / below-ground' + (gateAudit.pens.length ? ' -> ' + gateAudit.pens[0] : ''));

    const infAudit = auditGroup(infirmaryGroup, { groundY: 0, seatMax: 0.030 });
    ok(infAudit.parts.length >= 215, 'Field Infirmary + Cot built with ' + infAudit.parts.length + ' parts');
    ok(infAudit.gaps.length === 0, 'Field Infirmary + Cot part-on-part seating (<= 0.5 mm): 0 floating parts' + (infAudit.gaps.length ? ' -> ' + infAudit.gaps[0] : ''));
    ok(infAudit.pens.length === 0, 'Field Infirmary + Cot non-penetration & floor check: 0 pass-throughs / below-ground' + (infAudit.pens.length ? ' -> ' + infAudit.pens[0] : ''));

    // Explicit checks for Finds 4, 5, 6, 7 on extracted world-space parts
    const threshold = gateAudit.parts.find((p) => Math.abs(p.size.x - 8.2) < 0.05 && Math.abs(p.size.y - 0.0448) < 0.005 && Math.abs(p.size.z - 1.0) < 0.05);
    ok(!!threshold && Math.abs(threshold.box.min.y - 0.0) <= 0.0005, 'Find 6: containment gate threshold seated flush on floor y = 0.0000 m');

    const baseMat = infAudit.parts.find((p) => Math.abs(p.size.x - 7.4) < 0.05 && Math.abs(p.size.y - 0.012) < 0.002);
    const insetMat = infAudit.parts.find((p) => Math.abs(p.size.x - 7.2) < 0.05 && Math.abs(p.size.y - 0.008) < 0.002);
    ok(!!baseMat && Math.abs(baseMat.box.min.y - 0.0) <= 0.0005, 'Find 4: infirmary dark base mat seated flush on floor y = 0.0000 m');
    ok(!!insetMat && Math.abs(insetMat.box.min.y - 0.012) <= 0.0005 && Math.abs(insetMat.box.max.y - 0.020) <= 0.0005, 'Find 4: infirmary pale inset mat seated at y = 0.012..0.020 m');

    const o2 = infAudit.parts.find((p) => p.mesh.geometry.type === 'LatheGeometry' && p.size.y > 0.70);
    ok(!!o2 && Math.abs(o2.box.min.y - 0.020) <= 0.0005, 'Find 4: oxygen bottle seated flush on mat at y = 0.0200 m (minY=' + (o2 ? o2.box.min.y.toFixed(4) : 'missing') + ')');

    const ivFeet = infAudit.parts.filter((p) => Math.abs(p.size.y - 0.024) < 0.002 && Math.abs(Math.hypot(p.center.x - (bedAt.x - 1.42), p.center.z - (bedAt.z - 0.66)) - 0.26) < 0.02);
    ok(ivFeet.length === 4 && ivFeet.every((f) => Math.abs(f.box.min.y - 0.020) <= 0.0005), 'Find 4: IV stand 4 rubber feet seated flush on mat at y = 0.0200 m (n=' + ivFeet.length + ')');

    const casters = infAudit.parts.filter((p) => Math.abs(p.size.x - 0.190) < 0.006 && Math.abs(p.size.y - 0.190) < 0.006 && Math.abs(p.size.z - 0.052) < 0.004);
    ok(casters.length === 4 && casters.every((c) => Math.abs(c.box.min.y - 0.020) <= 0.0005), 'Find 5: stretcher 4 rubber casters seated flush on mat at y = 0.0200 m (n=' + casters.length + ')');

    const cabCz = B.minZ + 0.64;
    const cabLegs = infAudit.parts.filter((p) => Math.abs(p.size.x - 0.080) < 0.003 && Math.abs(p.size.y - 0.090) < 0.003 && Math.abs(p.size.z - 0.080) < 0.003 && Math.abs(p.center.y - 0.065) < 0.003);
    const frontCabLegs = cabLegs.filter((l) => l.center.z > cabCz);
    const rearCabLegs = cabLegs.filter((l) => l.center.z < cabCz);
    ok(cabLegs.length === 4 && frontCabLegs.length === 2 && rearCabLegs.length === 2 && cabLegs.every((l) => Math.abs(l.box.min.y - 0.020) <= 0.0005),
      'Find 5: medical cabinet has 2 front + 2 rear steel legs seated flush on mat at y = 0.0200 m');

    const cotX = bedAt.x + 3.25, cotZ = B.minZ + 3.25;
    const cotScissor = infAudit.parts.filter((p) => Math.abs(p.size.x - 0.026) < 0.003 && p.size.y > 0.34 && p.size.y < 0.42 && p.size.z > 0.68 && p.size.z < 0.78);
    const headPair = cotScissor.filter((l) => l.center.x < cotX);
    const footPair = cotScissor.filter((l) => l.center.x > cotX);
    ok(headPair.length === 2 && footPair.length === 2, 'Find 7: cot has 2 head-end and 2 foot-end angled X-scissor legs');
    if (headPair.length === 2 && footPair.length === 2) {
      const dxH = Math.abs(headPair[0].center.x - headPair[1].center.x);
      const dxF = Math.abs(footPair[0].center.x - footPair[1].center.x);
      ok(dxH >= 0.030 && dxF >= 0.030 && !headPair[0].box.intersectsBox(headPair[1].box) && !footPair[0].box.intersectsBox(footPair[1].box),
        'Find 7: cot scissor legs offset along X by ' + (dxH * 1000).toFixed(1) + ' mm with 0 AABB/triangle intersections');
    }
    const pivotHardware = infAudit.parts.filter((p) => Math.abs(p.center.y - 0.21025) < 0.003 && p.size.x < 0.015 && Math.abs(p.center.z - cotZ) < 0.01);
    ok(pivotHardware.length === 6, 'Find 7: cot horizontal X-pivot washers (2) & outer pin caps (4) installed (n=' + pivotHardware.length + ')');

    // =========================================================================
    // 2. FIND 8: BUILD ROOM WALL DECAL TEXEL DENSITY & <= 2048 CANVAS CLAMP
    // =========================================================================
    ok(BUILD_WEAR.WALL_PX === 64, 'Find 8: BUILD_WEAR.WALL_PX === 64 px/m');
    const decalCanvases = [];
    const bwRoot = new REAL_THREE.Group();
    dressBuildWear(REAL_THREE, {
      B, D: TRAINING.DOOR, gate,
      add: (geo, mat, x, y, z, parent = bwRoot) => { const m = new REAL_THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; },
      std,
      texture: (w, h) => { decalCanvases.push([w, h]); return null; }
    });
    const maxDim = decalCanvases.reduce((mx, [w, h]) => Math.max(mx, w, h), 0);
    ok(decalCanvases.length >= 5 && maxDim <= 2048, 'Find 8: Build Room wall/floor wear canvases clamped <= 2048 px (max=' + maxDim + ')');

    // =========================================================================
    // 3. LIVE TRAINING GROUND SCENE: FIND 2 (GATE HEADER) & NIGHT FLASHLIGHT CAP
    // =========================================================================
    const H = T.inspectHost ? T.inspectHost() : null;
    const D = T.trainingDbg;
    ok(!!(H && D), 'Training Ground inspectHost and trainingDbg reachable');
    if (H && D) {
      if (!D.state().active || !D.tg()) {
        const nameEl = document.getElementById('playerName');
        if (nameEl) nameEl.value = 'AG289';
        H.enterTraining();
        await until(() => D.state().active && D.tg(), 25000);
        await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 15000);
      }
      const tg = D.tg();
      ok(!!tg, 'Training Ground booted cleanly');
      if (tg && tg.group) {
        const header = tg.group.getObjectByName('training-gate-header');
        ok(!!header, 'Find 2: training-gate-header mesh present in live Training Ground');
        if (header) {
          ok(header.material && header.material.roughness >= 0.7,
            'Find 2: training-gate-header uses corrugated steel siding (roughness=' + (header.material && header.material.roughness) + ')');
          ok(Math.abs(header.position.z - (TRAINING.BUILD.maxZ - 0.025)) < 0.01,
            'Find 2: training-gate-header aligned at B.maxZ - 0.025 with corrugated neighbours');
        }

        // Live tactical flashlight test at night (3 m wall vs >16 m open range)
        let flashlight = null;
        H.scene.traverse((o) => { if (o.isSpotLight && o.distance === 26) flashlight = o; });
        ok(!!flashlight, 'Flashlight: scene SpotLight (distance=26) present');
        if (flashlight) {
          ok(flashlight.penumbra >= 0.70, 'Flashlight: softened penumbra >= 0.70 (got ' + flashlight.penumbra + ')');
          T.grantAllWeapons();
          T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
          if (T.isUnarmed()) T.toggleHolster();
          T.setViewFirstDbg(true);
          D.state().lightsOff = true;
          tg.setLights(false);
          if (typeof step === 'function') await step(T, 0.65);
          else await wait(650);
          if (!(flashlight.intensity > 0.5)) {
            if (!T.toggleFlashlightDbg()) T.toggleFlashlightDbg();
          }
          const O = tg.origin;
          // 1) 1.0 m from Firing Range back wall (z = O.z - 12.0), aiming due south (-Z, yaw = Math.PI)
          H.placePlayer(O.x - 0.4, O.z - 11.0, Math.PI);
          T.player.position.set(O.x - 0.4, O.y, O.z - 11.0);
          T.setOtsAimDbg(Math.PI, 0);
          if (typeof step === 'function') await step(T, 0.30);
          else await wait(300);
          const int1m = flashlight.intensity;
          ok(int1m > 0.4 && int1m < 3.5, 'Flashlight: 1 m night wall caps intensity for readable pool (got ' + int1m.toFixed(2) + ')');

          // 2) 3.0 m from Firing Range back wall
          H.placePlayer(O.x - 0.4, O.z - 9.0, Math.PI);
          T.player.position.set(O.x - 0.4, O.y, O.z - 9.0);
          T.setOtsAimDbg(Math.PI, 0);
          if (typeof step === 'function') await step(T, 0.30);
          else await wait(300);
          const int3m = flashlight.intensity;
          ok(int3m > 2.5 && int3m < 10.0 && int3m > int1m, 'Flashlight: 3 m night wall scales up cleanly without white burnout (got ' + int3m.toFixed(2) + ')');

          // 3) 8.0 m from Firing Range back wall
          H.placePlayer(O.x - 0.4, O.z - 4.0, Math.PI);
          T.player.position.set(O.x - 0.4, O.y, O.z - 4.0);
          T.setOtsAimDbg(Math.PI, 0);
          if (typeof step === 'function') await step(T, 0.30);
          else await wait(300);
          const int8m = flashlight.intensity;
          ok(int8m > 12.0 && int8m < 32.0 && int8m > int3m, 'Flashlight: 8 m night wall scales up cleanly (got ' + int8m.toFixed(2) + ')');

          // 4) Aiming downrange (+Z, yaw = 0) with >16 m open distance
          H.placePlayer(O.x, O.z - 1.0, 0);
          T.player.position.set(O.x, O.y, O.z - 1.0);
          T.setOtsAimDbg(0, 0);
          if (typeof step === 'function') await step(T, 0.25);
          else await wait(220);
          const intOpen = flashlight.intensity;
          ok(intOpen === 42, 'Flashlight: >= 16 m open downrange preserves full 42 intensity (got ' + intOpen.toFixed(2) + ')');
        }
      }
    }

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})();
