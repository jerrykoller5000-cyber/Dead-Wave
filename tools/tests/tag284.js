// tag284 - AG-284 J128 (Jerry, 10 Nov, standing, D-140): the buildables and props, part on part.
// Every model in Antigravity's lane (walls, floors, barricades, sandbags, wire, railing, platform, pillar, stairs, traps, the skeletal marine),
// at every build stage and damage state: each part seated on what holds it (no gap over 0.5 mm) and none through another past the depth it is seated at.
(async () => {
  const T = window.TT;
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));

  try {
    const THREE = T.THREE;
    const Box3 = THREE.Box3;
    const _v = new THREE.Vector3();

    function getBounds(obj) {
      const b = new Box3();
      obj.updateMatrixWorld(true);
      obj.traverse((m) => {
        if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position) return;
        if (!isVisibleInRoot(m, obj)) return;
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          _v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          b.expandByPoint(_v);
        }
      });
      return b;
    }

    function isVisibleInRoot(obj, root) {
      for (let x = obj; x; x = x.parent) {
        if (!x.visible) return false;
        if (x === root) break;
      }
      return true;
    }

    // =========================================================================
    // Exact 3D Mesh / Triangle Seating (<= 0.5 mm) & Non-Penetration Analyzer
    // =========================================================================
    function extractParts(root) {
      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);
      root.scale.set(1, 1, 1);
      root.updateMatrixWorld(true);
      const parts = [];
      let idx = 0;
      root.traverse((m) => {
        if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position) return;
        if (!isVisibleInRoot(m, root)) return;
        const p = m.geometry.attributes.position;
        const ix = m.geometry.index;
        const n = ix ? ix.count : p.count;
        if (n < 3) return;
        const P = new Float32Array(n * 3);
        const box = new Box3();
        for (let i = 0; i < n; i++) {
          _v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld);
          P[i * 3] = _v.x; P[i * 3 + 1] = _v.y; P[i * 3 + 2] = _v.z;
          box.expandByPoint(_v);
        }
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

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
          let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
          const l = Math.hypot(nx, ny, nz) || 1;
          nx /= l; ny /= l; nz /= l;
          // Ensure outward normal on Cylinder/Cone end-caps in fakethree.mjs
          if (m.geometry.parameters && m.geometry.parameters.length >= 3) {
            const mcx = (ax + bx + cx) / 3 - center.x;
            const mcy = (ay + by + cy) / 3 - center.y;
            const mcz = (az + bz + cz) / 3 - center.z;
            // Only flip pure axial cap tris that point toward centroid on convex primitives
            if (Math.abs(ny) > 0.99 && Math.hypot(mcx, mcz) < Math.min(size.x, size.z) * 0.35 && (mcx * nx + mcy * ny + mcz * nz) < -1e-6) {
              nx = -nx; ny = -ny; nz = -nz;
            }
          }
          N[t * 3] = nx; N[t * 3 + 1] = ny; N[t * 3 + 2] = nz;
          const tb = t * 6;
          TBox[tb] = Math.min(ax, bx, cx);
          TBox[tb + 1] = Math.min(ay, by, cy);
          TBox[tb + 2] = Math.min(az, bz, cz);
          TBox[tb + 3] = Math.max(ax, bx, cx);
          TBox[tb + 4] = Math.max(ay, by, cy);
          TBox[tb + 5] = Math.max(az, bz, cz);
        }

        const vMap = new Map();
        const verts = [];
        const vIdx = new Int32Array(n);
        for (let i = 0; i < n; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
          const k = Math.round(x * 1e5) + ',' + Math.round(y * 1e5) + ',' + Math.round(z * 1e5);
          let vi = vMap.get(k);
          if (vi === undefined) {
            vi = verts.length / 3;
            vMap.set(k, vi);
            verts.push(x, y, z);
          }
          vIdx[i] = vi;
        }
        const edgeCounts = new Map();
        const edges = [];
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

        const geoType = m.geometry.type || 'Geo';
        const label = '#' + idx + '(' + (m.name || geoType) + '[' + size.x.toFixed(3) + 'x' + size.y.toFixed(3) + 'x' + size.z.toFixed(3) + '@' + center.x.toFixed(2) + ',' + center.y.toFixed(2) + ',' + center.z.toFixed(2) + '])';
        parts.push({
          idx: idx++,
          mesh: m,
          label,
          P,
          N,
          TBox,
          triCount,
          verts: new Float32Array(verts),
          edges: new Int32Array(edges),
          closed,
          box,
          size,
          center
        });
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
      const d1 = abx * apx + aby * apy + abz * apz;
      const d2 = acx * apx + acy * apy + acz * apz;
      if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;

      const bpx = px - bx, bpy = py - by, bpz = pz - bz;
      const d3 = abx * bpx + aby * bpy + abz * bpz;
      const d4 = acx * bpx + acy * bpy + acz * bpz;
      if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;

      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        const qx = ax + abx * v - px, qy = ay + aby * v - py, qz = az + abz * v - pz;
        return qx * qx + qy * qy + qz * qz;
      }

      const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
      const d5 = abx * cpx + aby * cpy + abz * cpz;
      const d6 = acx * cpx + acy * cpy + acz * cpz;
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

      const denom = 1 / (va + vb + vc);
      const v = vb * denom, w = vc * denom;
      const qx = ax + abx * v + acx * w - px;
      const qy = ay + aby * v + acy * w - py;
      const qz = az + abz * v + acz * w - pz;
      return qx * qx + qy * qy + qz * qz;
    }

    function segSegDistSq(p1x, p1y, p1z, q1x, q1y, q1z, p2x, p2y, p2z, q2x, q2y, q2z) {
      const d1x = q1x - p1x, d1y = q1y - p1y, d1z = q1z - p1z;
      const d2x = q2x - p2x, d2y = q2y - p2y, d2z = q2z - p2z;
      const rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
      const a = d1x * d1x + d1y * d1y + d1z * d1z;
      const e = d2x * d2x + d2y * d2y + d2z * d2z;
      const f = d2x * rx + d2y * ry + d2z * rz;
      let s, t;
      if (a <= 1e-16 && e <= 1e-16) return rx * rx + ry * ry + rz * rz;
      if (a <= 1e-16) {
        s = 0; t = Math.max(0, Math.min(1, f / e));
      } else {
        const c = d1x * rx + d1y * ry + d1z * rz;
        if (e <= 1e-16) {
          t = 0; s = Math.max(0, Math.min(1, -c / a));
        } else {
          const b = d1x * d2x + d1y * d2y + d1z * d2z;
          const denom = a * e - b * b;
          s = denom !== 0 ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
          t = (b * s + f) / e;
          if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); }
          else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
        }
      }
      const cx = rx + d1x * s - d2x * t;
      const cy = ry + d1y * s - d2y * t;
      const cz = rz + d1z * s - d2z * t;
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
      const dx = 0.83660006, dy = 0.34190011, dz = 0.42790019;
      const P = part.P;
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
      const sMinX = Math.min(ax, bx), sMaxX = Math.max(ax, bx);
      const sMinY = Math.min(ay, by), sMaxY = Math.max(ay, by);
      const sMinZ = Math.min(az, bz), sMaxZ = Math.max(az, bz);
      const P = part.P, N = part.N, TB = part.TBox;
      const hits = [];
      for (let ti = 0; ti < part.triCount; ti++) {
        const tb = ti * 6;
        if (sMaxX < TB[tb] || sMinX > TB[tb + 3] || sMaxY < TB[tb + 1] || sMinY > TB[tb + 4] || sMaxZ < TB[tb + 2] || sMinZ > TB[tb + 5]) continue;
        const o = ti * 9;
        const v0x = P[o], v0y = P[o + 1], v0z = P[o + 2];
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
        if (t > 1e-6 && t < 1 - 1e-6) {
          hits.push({ t, nx: N[ti * 3], ny: N[ti * 3 + 1], nz: N[ti * 3 + 2] });
        }
      }
      if (hits.length > 1) {
        hits.sort((a, b) => a.t - b.t);
        const dedup = [hits[0]];
        for (let i = 1; i < hits.length; i++) {
          if (hits[i].t - dedup[dedup.length - 1].t > 1e-4) dedup.push(hits[i]);
        }
        return dedup;
      }
      return hits;
    }

    const _bExp = new Box3();
    function analyzePair(A, B, maxSearchDist = 0.05) {
      _bExp.copy(A.box).expandByScalar(maxSearchDist);
      if (!_bExp.intersectsBox(B.box)) return { dist: Infinity, penDepth: 0, passThrough: false, passChord: 0 };

      const boxesOverlap = A.box.intersectsBox(B.box);
      let penDepth = 0;
      let passThrough = false;
      let passChord = 0;
      let hasIntersection = false;

      if (boxesOverlap) {
        for (const [src, dst] of [[A, B], [B, A]]) {
          const V = src.verts, E = src.edges;
          if (dst.closed) {
            for (let i = 0; i < V.length; i += 3) {
              const x = V[i], y = V[i + 1], z = V[i + 2];
              if (pointInsideClosedMesh(dst, x, y, z)) {
                hasIntersection = true;
                const d = Math.sqrt(pointDistToMeshSq(dst, x, y, z));
                if (d > penDepth) penDepth = d;
              }
            }
            const P = src.P;
            for (let o = 0; o < P.length; o += 9) {
              const cx = (P[o] + P[o + 3] + P[o + 6]) / 3;
              const cy = (P[o + 1] + P[o + 4] + P[o + 7]) / 3;
              const cz = (P[o + 2] + P[o + 5] + P[o + 8]) / 3;
              if (pointInsideClosedMesh(dst, cx, cy, cz)) {
                hasIntersection = true;
                const d = Math.sqrt(pointDistToMeshSq(dst, cx, cy, cz));
                if (d > penDepth) penDepth = d;
              }
            }
          }
          for (let e = 0; e < E.length; e += 2) {
            const u = E[e] * 3, w = E[e + 1] * 3;
            const ax = V[u], ay = V[u + 1], az = V[u + 2];
            const bx = V[w], by = V[w + 1], bz = V[w + 2];
            if (Math.max(ax, bx) < dst.box.min.x || Math.min(ax, bx) > dst.box.max.x ||
                Math.max(ay, by) < dst.box.min.y || Math.min(ay, by) > dst.box.max.y ||
                Math.max(az, bz) < dst.box.min.z || Math.min(az, bz) > dst.box.max.z) continue;
            const hits = segmentMeshHits(dst, ax, ay, az, bx, by, bz);
            if (!hits.length) continue;
            hasIntersection = true;
            const eLen = Math.hypot(bx - ax, by - ay, bz - az);
            const pts = [{ t: 0, n: null }, ...hits.map((h) => ({ t: h.t, n: h })), { t: 1, n: null }];
            for (let k = 0; k < pts.length - 1; k++) {
              const t0 = pts[k].t, t1 = pts[k + 1].t;
              const chord = (t1 - t0) * eLen;
              if (chord <= 0.0005) continue;
              const tm = 0.5 * (t0 + t1);
              const mx = ax + (bx - ax) * tm, my = ay + (by - ay) * tm, mz = az + (bz - az) * tm;
              if (dst.closed ? pointInsideClosedMesh(dst, mx, my, mz) : false) {
                const d = Math.sqrt(pointDistToMeshSq(dst, mx, my, mz));
                if (d > penDepth) penDepth = d;
                if (pts[k].n && pts[k + 1].n) {
                  const n0 = pts[k].n, n1 = pts[k + 1].n;
                  const dot = n0.nx * n1.nx + n0.ny * n1.ny + n0.nz * n1.nz;
                  if (dot < -0.3 && chord > 0.001 && d > 0.0006) {
                    passThrough = true;
                    if (chord > passChord) passChord = chord;
                  }
                }
              }
            }
          }
        }
      }

      if (hasIntersection) {
        return { dist: 0, penDepth, passThrough, passChord };
      }

      let bestSq = Infinity;
      const VA = A.verts, VB = B.verts;
      const bMinX = B.box.min.x, bMinY = B.box.min.y, bMinZ = B.box.min.z;
      const bMaxX = B.box.max.x, bMaxY = B.box.max.y, bMaxZ = B.box.max.z;
      const aMinX = A.box.min.x, aMinY = A.box.min.y, aMinZ = A.box.min.z;
      const aMaxX = A.box.max.x, aMaxY = A.box.max.y, aMaxZ = A.box.max.z;
      for (let i = 0; i < VA.length; i += 3) {
        const px = VA[i], py = VA[i + 1], pz = VA[i + 2];
        const dx = px < bMinX ? bMinX - px : (px > bMaxX ? px - bMaxX : 0);
        const dy = py < bMinY ? bMinY - py : (py > bMaxY ? py - bMaxY : 0);
        const dz = pz < bMinZ ? bMinZ - pz : (pz > bMaxZ ? pz - bMaxZ : 0);
        if (dx * dx + dy * dy + dz * dz >= bestSq) continue;
        bestSq = pointDistToMeshSq(B, px, py, pz, bestSq);
        if (bestSq <= 1e-12) return { dist: 0, penDepth: 0, passThrough: false, passChord: 0 };
      }
      for (let i = 0; i < VB.length; i += 3) {
        const px = VB[i], py = VB[i + 1], pz = VB[i + 2];
        const dx = px < aMinX ? aMinX - px : (px > aMaxX ? px - aMaxX : 0);
        const dy = py < aMinY ? aMinY - py : (py > aMaxY ? py - aMaxY : 0);
        const dz = pz < aMinZ ? aMinZ - pz : (pz > aMaxZ ? pz - aMaxZ : 0);
        if (dx * dx + dy * dy + dz * dz >= bestSq) continue;
        bestSq = pointDistToMeshSq(A, px, py, pz, bestSq);
        if (bestSq <= 1e-12) return { dist: 0, penDepth: 0, passThrough: false, passChord: 0 };
      }
      const EA = A.edges, EB = B.edges;
      for (let i = 0; i < EA.length; i += 2) {
        const a0 = EA[i] * 3, a1 = EA[i + 1] * 3;
        const p1x = VA[a0], p1y = VA[a0 + 1], p1z = VA[a0 + 2];
        const q1x = VA[a1], q1y = VA[a1 + 1], q1z = VA[a1 + 2];
        const eMinX = Math.min(p1x, q1x), eMaxX = Math.max(p1x, q1x);
        const eMinY = Math.min(p1y, q1y), eMaxY = Math.max(p1y, q1y);
        const eMinZ = Math.min(p1z, q1z), eMaxZ = Math.max(p1z, q1z);
        const dx = eMaxX < bMinX ? bMinX - eMaxX : (eMinX > bMaxX ? eMinX - bMaxX : 0);
        const dy = eMaxY < bMinY ? bMinY - eMaxY : (eMinY > bMaxY ? eMinY - bMaxY : 0);
        const dz = eMaxZ < bMinZ ? bMinZ - eMaxZ : (eMinZ > bMaxZ ? eMinZ - bMaxZ : 0);
        if (dx * dx + dy * dy + dz * dz >= bestSq) continue;
        for (let j = 0; j < EB.length; j += 2) {
          const b0 = EB[j] * 3, b1 = EB[j + 1] * 3;
          const dSq = segSegDistSq(p1x, p1y, p1z, q1x, q1y, q1z, VB[b0], VB[b0 + 1], VB[b0 + 2], VB[b1], VB[b1 + 1], VB[b1 + 2]);
          if (dSq < bestSq) bestSq = dSq;
        }
        if (bestSq <= 1e-12) return { dist: 0, penDepth: 0, passThrough: false, passChord: 0 };
      }
      return { dist: Math.sqrt(bestSq), penDepth: 0, passThrough: false, passChord: 0 };
    }

    function auditModel(name, root, opts = {}) {
      const GAP_MAX = 0.0005; // 0.5 mm
      const SEAT_MAX = opts.seatMax ?? 0.006; // 6.0 mm max boss/socket depth, 0 pass-throughs
      const parts = extractParts(root);
      if (!parts.length) return { name, parts: 0, gaps: ['NO VISIBLE PARTS'], pens: [] };

      const grounded = new Set();
      if (opts.anchor === 'first') {
        grounded.add(0);
      } else {
        for (const p of parts) {
          if (p.box.min.y <= GAP_MAX && p.box.max.y >= -GAP_MAX) grounded.add(p.idx);
        }
      }

      const gaps = [];
      const pens = [];
      if (grounded.size === 0) {
        let minAbsY = Infinity;
        for (const p of parts) minAbsY = Math.min(minAbsY, Math.abs(p.box.min.y), Math.abs(p.box.max.y));
        gaps.push('UNGROUNDED at y=0 (closest ' + (minAbsY * 1000).toFixed(2) + ' mm)');
        grounded.add(0);
      }

      const adj = Array.from({ length: parts.length }, () => []);
      const minNeighborDist = new Float64Array(parts.length).fill(Infinity);
      const nearestNeighbor = new Int32Array(parts.length).fill(-1);

      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const r = analyzePair(parts[i], parts[j], 0.15);
          if (r.dist < minNeighborDist[i]) { minNeighborDist[i] = r.dist; nearestNeighbor[i] = j; }
          if (r.dist < minNeighborDist[j]) { minNeighborDist[j] = r.dist; nearestNeighbor[j] = i; }
          if (r.dist <= GAP_MAX) {
            adj[i].push(j);
            adj[j].push(i);
          }
          if (r.passThrough || r.penDepth > SEAT_MAX) {
            pens.push({
              a: parts[i].label,
              b: parts[j].label,
              penMm: +(r.penDepth * 1000).toFixed(2),
              passThrough: r.passThrough,
              chordMm: +(r.passChord * 1000).toFixed(1)
            });
          }
        }
      }

      const visited = new Set(grounded);
      const queue = [...grounded];
      while (queue.length) {
        const u = queue.shift();
        for (const w of adj[u]) {
          if (!visited.has(w)) { visited.add(w); queue.push(w); }
        }
      }

      if (visited.size < parts.length) {
        for (let i = 0; i < parts.length; i++) {
          if (visited.has(i)) continue;
          let bestD = minNeighborDist[i], bestJ = nearestNeighbor[i];
          if (!visited.has(bestJ)) {
            bestD = Infinity; bestJ = -1;
            for (const v of visited) {
              const r = analyzePair(parts[i], parts[v], 2.5);
              if (r.dist < bestD) { bestD = r.dist; bestJ = v; }
            }
          }
          gaps.push(parts[i].label + ' gap ' + (bestD * 1000).toFixed(2) + ' mm to ' + (bestJ >= 0 ? parts[bestJ].label : 'none'));
        }
      }

      return { name, parts: parts.length, gaps, pens };
    }

    // =========================================================================
    // 1. FOUNDATION / SKIRT DEPTHS ON SLOPES ACROSS ALL TIERS (<= -0.60m)
    // =========================================================================
    const kindsAndTiers = [
      ['wall', 0], ['wall', 1], ['wall', 2], ['wall', 3], ['wall', 4],
      ['floor', 0], ['floor', 1], ['floor', 2],
      ['barricade', 0], ['barricade', 1], ['barricade', 2],
      ['sandbag', 0], ['sandbag', 1], ['sandbag', 2],
      ['wire', 0], ['wire', 1], ['wire', 2],
      ['railing', 0], ['railing', 1], ['railing', 2],
      ['platform', 0], ['platform', 1], ['platform', 2],
      ['pillar', 0], ['pillar', 1], ['pillar', 2],
      ['stairs', 0], ['stairs', 1], ['stairs', 2],
      ['spikes', 0], ['spikes', 1], ['spikes', 2]
    ];

    for (const [k, tier] of kindsAndTiers) {
      const mesh = T.makeBuildMesh(k, tier);
      ok(!!mesh, 'makeBuildMesh ' + k + ' tier ' + tier + ' exists');
      if (mesh) {
        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);
        const b = getBounds(mesh);
        const minThresh = (k === 'spikes' ? -0.58 : -0.64);
        ok(b.min.y <= minThresh, k + ' tier ' + tier + ' foundation reaches slope depth (min.y ' + b.min.y.toFixed(3) + ' <= ' + minThresh + ')');
      }
    }

    // =========================================================================
    // 2. TARGETED STRUCTURAL & SKELETAL MARINE SEATING CHECKS
    // =========================================================================
    {
      const sk = T.makeBuildMesh('skeletalMarine');
      ok(!!sk, 'skeletal marine mesh exists');
      if (sk) {
        sk.position.set(0, 0, 0);
        sk.updateMatrixWorld(true);
        const skBounds = getBounds(sk);
        ok(Math.abs(skBounds.min.y) <= 0.0005, 'skeletal marine right boot sole seated flush on ground y=0 (min.y ' + skBounds.min.y.toFixed(4) + ')');
        ok(skBounds.max.y >= 1.2, 'skeletal marine standing height reaches anatomical scale (max.y ' + skBounds.max.y.toFixed(3) + ' >= 1.2m)');
        let boneCount = 0;
        sk.traverse((o) => { if (o.isMesh) boneCount++; });
        ok(boneCount >= 40, 'skeletal marine has detailed articulated anatomy (baked mesh count ' + boneCount + ' >= 40)');
      }
    }

    // =========================================================================
    // 3. COMPLETE 116-CASE 3D PART-ON-PART SEATING & NON-PENETRATION MATRIX
    // =========================================================================
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, transparent: true, opacity: 0.45 });
    const cases = [];

    // 1. Walls: ghost, tiers 0..4 (plain, window, window-barred), doors 0..4 (shut, open+, open-)
    cases.push(['wall:ghost', () => T.makeBuildMesh('wall', 0, { ghostMat })]);
    for (let t = 0; t <= 4; t++) {
      cases.push(['wall:t' + t + ':plain', () => T.makeBuildMesh('wall', t)]);
      cases.push(['wall:t' + t + ':window', () => {
        const m = T.makeBuildMesh('wall', t);
        T.applyOpeningLook({ type: 'wall', tier: t, opening: 'window', barred: false, mesh: m });
        return m;
      }]);
      cases.push(['wall:t' + t + ':window-barred', () => {
        const m = T.makeBuildMesh('wall', t);
        const b = { type: 'wall', tier: t, opening: 'window', barred: true, mesh: m, _noMerge: true };
        T.applyOpeningLook(b);
        T.addWindowBars(b);
        return m;
      }]);
    }
    for (let dt = 0; dt <= 4; dt++) {
      for (const [tag, amt, side] of [['shut', 0, 1], ['open+', 1, 1], ['open-', 1, -1]]) {
        cases.push(['wall:t' + dt + ':door-t' + dt + ':' + tag, () => {
          const m = T.makeBuildMesh('wall', dt);
          const b = { type: 'wall', tier: dt, opening: 'door', doorTier: dt, doorAmt: amt, doorSide: side, mesh: m, _noMerge: true };
          T.applyOpeningLook(b);
          T.buildDoorLeaves(b);
          return m;
        }]);
      }
    }
    cases.push(['wall:t2:door-t4:open-', () => {
      const m = T.makeBuildMesh('wall', 2);
      const b = { type: 'wall', tier: 2, opening: 'door', doorTier: 4, doorAmt: 1, doorSide: -1, mesh: m, _noMerge: true };
      T.applyOpeningLook(b);
      T.buildDoorLeaves(b);
      return m;
    }]);

    // 2. Floors: ghost, tiers 0..2
    cases.push(['floor:ghost', () => T.makeBuildMesh('floor', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['floor:t' + t, () => T.makeBuildMesh('floor', t)]);

    // 3. Barricades: ghost, tiers 0..2, gates 0..2 (shut, open+, open-)
    cases.push(['barricade:ghost', () => T.makeBuildMesh('barricade', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['barricade:t' + t, () => T.makeBuildMesh('barricade', t)]);
    for (let gt = 0; gt <= 2; gt++) {
      for (const [tag, amt, side] of [['shut', 0, 1], ['open+', 1, 1], ['open-', 1, -1]]) {
        cases.push(['barricade:gate-t' + gt + ':' + tag, () => {
          const m = T.makeBuildMesh('barricade', 0);
          const b = { type: 'barricade', tier: 0, opening: 'gate', gateTier: gt, doorAmt: amt, doorSide: side, mesh: m, _noMerge: true };
          T.applyOpeningLook(b);
          T.buildGateLeaves(b);
          return m;
        }]);
      }
    }

    // 4. Sandbags: ghost, tiers 0..2
    cases.push(['sandbag:ghost', () => T.makeBuildMesh('sandbag', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['sandbag:t' + t, () => T.makeBuildMesh('sandbag', t)]);

    // 5. Wire: ghost, tiers 0..2, gates 0..2 (shut, open+, open-)
    cases.push(['wire:ghost', () => T.makeBuildMesh('wire', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['wire:t' + t, () => T.makeBuildMesh('wire', t)]);
    for (let gt = 0; gt <= 2; gt++) {
      for (const [tag, amt, side] of [['shut', 0, 1], ['open+', 1, 1], ['open-', 1, -1]]) {
        cases.push(['wire:gate-t' + gt + ':' + tag, () => {
          const m = T.makeBuildMesh('wire', 0);
          const b = { type: 'wire', tier: 0, opening: 'gate', gateTier: gt, doorAmt: amt, doorSide: side, mesh: m, _noMerge: true };
          T.applyOpeningLook(b);
          T.buildGateLeaves(b);
          return m;
        }]);
      }
    }

    // 6. Railing: ghost, tiers 0..2, gates 0..2 (shut, open+, open-)
    cases.push(['railing:ghost', () => T.makeBuildMesh('railing', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['railing:t' + t, () => T.makeBuildMesh('railing', t)]);
    for (let gt = 0; gt <= 2; gt++) {
      for (const [tag, amt, side] of [['shut', 0, 1], ['open+', 1, 1], ['open-', 1, -1]]) {
        cases.push(['railing:gate-t' + gt + ':' + tag, () => {
          const m = T.makeBuildMesh('railing', 0);
          const b = { type: 'railing', tier: 0, opening: 'gate', gateTier: gt, doorAmt: amt, doorSide: side, mesh: m, _noMerge: true };
          T.applyOpeningLook(b);
          T.buildGateLeaves(b);
          return m;
        }]);
      }
    }

    // 7. Platform: ghost, tiers 0..2
    cases.push(['platform:ghost', () => T.makeBuildMesh('platform', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['platform:t' + t, () => T.makeBuildMesh('platform', t)]);

    // 8. Pillar: ghost, tiers 0..2
    cases.push(['pillar:ghost', () => T.makeBuildMesh('pillar', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['pillar:t' + t, () => T.makeBuildMesh('pillar', t)]);

    // 9. Stairs: ghost, tiers 0..2, folded T2
    cases.push(['stairs:ghost', () => T.makeBuildMesh('stairs', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['stairs:t' + t, () => T.makeBuildMesh('stairs', t)]);
    cases.push(['stairs:t2:folded', () => {
      const m = T.makeBuildMesh('stairs', 2);
      if (m.userData.pivot) m.userData.pivot.rotation.x = -(Math.PI / 2 - Math.atan2(2.0, 2.0));
      return m;
    }]);

    // 10. Traps: spikes (ghost, 0..2 unsprung & sprung), mine (ghost, 0..2), lure (ghost, 0..2), barrel (ghost, fuel, napalm)
    cases.push(['spikes:ghost', () => T.makeBuildMesh('spikes', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) {
      cases.push(['spikes:t' + t + ':unsprung', () => {
        const m = T.makeBuildMesh('spikes', t);
        if (m.userData.spikes) { m.userData.spikes.visible = false; m.userData.spikes.position.y = -T.SPIKE_SINK; }
        return m;
      }]);
      cases.push(['spikes:t' + t + ':sprung', () => {
        const m = T.makeBuildMesh('spikes', t);
        if (m.userData.spikes) { m.userData.spikes.visible = true; m.userData.spikes.position.y = 0; }
        return m;
      }]);
    }
    cases.push(['mine:ghost', () => T.makeBuildMesh('mine', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['mine:t' + t, () => T.makeBuildMesh('mine', t)]);
    cases.push(['lure:ghost', () => T.makeBuildMesh('lure', 0, { ghostMat })]);
    for (let t = 0; t <= 2; t++) cases.push(['lure:t' + t, () => T.makeBuildMesh('lure', t)]);
    cases.push(['barrel:ghost', () => T.makeBuildMesh('barrel', 0, { ghostMat })]);
    cases.push(['barrel:t0:fuel', () => T.makeBuildMesh('barrel', 0)]);
    cases.push(['barrel:t1:napalm', () => T.makeBuildMesh('barrel', 1)]);

    // 11. Skeletal Marine: standing rest (grounded at y=0) + sway & throw/landed poses (569 unmerged parts)
    cases.push(['skeletalMarine:default', () => T.makeBuildMesh('skeletalMarine', 0, { unmerged: true })]);
    cases.push(['skeletalMarine:sway0', () => {
      const m = T.makeBuildMesh('skeletalMarine', 0, { unmerged: true });
      T.poseRemains(m, 0);
      return m;
    }, { anchor: 'first' }]);
    cases.push(['skeletalMarine:sway1', () => {
      const m = T.makeBuildMesh('skeletalMarine', 0, { unmerged: true });
      T.poseRemains(m, 0.55);
      return m;
    }, { anchor: 'first' }]);
    for (const [tag, fly] of [['throw-start', 1.0], ['throw-mid', 0.5], ['landed', 0.0]]) {
      cases.push(['skeletalMarine:' + tag, () => {
        const rm = T.makeBuildMesh('skeletalMarine', 0, { unmerged: true });
        const p = rm.userData.parts;
        p.armL.rotation.set(Math.PI - 0.9 * fly, 0, 0.5); p.armR.rotation.set(Math.PI - 0.7 * fly, 0, -0.45);
        p.foreL.rotation.x = 0.9 + fly * 0.8; p.foreR.rotation.x = 1.1 + fly * 0.6;
        p.legL.rotation.set(Math.PI + 0.35 * fly, 0, 0.12); p.legR.rotation.set(Math.PI - 0.2 * fly, 0, -0.14);
        p.shinL.rotation.x = 0.7 + fly * 0.5; p.shinR.rotation.x = 0.5 + fly * 0.4;
        if (rm.userData.jaw) rm.userData.jaw.rotation.x = 0.35 + fly * 0.5;
        return rm;
      }, { anchor: 'first' }]);
    }

    for (const [name, build, opts] of cases) {
      const res = auditModel(name, build(), opts || {});
      const clean = res.parts > 0 && res.gaps.length === 0 && res.pens.length === 0;
      const detail = clean
        ? ' (' + res.parts + ' parts, 0 gaps > 0.5mm, 0 penetrations/pass-throughs)'
        : ' (parts=' + res.parts + ' gaps=' + res.gaps.length + ' pens=' + res.pens.length + ': ' +
          (res.gaps[0] || (res.pens[0] ? res.pens[0].penMm + 'mm ' + res.pens[0].a + '<->' + res.pens[0].b : '')) + ')';
      ok(clean, '3D part-on-part ' + name + detail);
    }

    // =========================================================================
    // 4. LIVE DAMAGE STATES (100%, 50%, 10% HP) ACROSS ALL BUILDABLES
    // =========================================================================
    const liveKinds = ['wall', 'floor', 'barricade', 'sandbag', 'wire', 'railing', 'platform', 'pillar', 'stairs', 'spikes', 'mine', 'lure', 'barrel'];
    let bx = 24;
    for (const k of liveKinds) {
      bx += 4;
      const gy = T.sampleHeight(bx, 24);
      const b = T.spawnBuild(k, bx, 24);
      ok(!!b && !!b.mesh, 'live spawnBuild ' + k + ' succeeds');
      if (b && b.mesh) {
        const b100 = getBounds(b.mesh);
        const y0 = b.mesh.position.y;
        const maxHp = b.maxHp;
        // 50% HP state
        T.damageBuild(b, maxHp * 0.5, 'zombie', true);
        T.updateBuildBars();
        const b50 = getBounds(b.mesh);
        // 10% HP critical state
        T.damageBuild(b, maxHp * 0.4, 'zombie', true);
        T.updateBuildBars();
        const b10 = getBounds(b.mesh);
        const stable = Math.abs(b.mesh.position.y - y0) < 1e-4 &&
                       Math.abs(b50.min.y - b100.min.y) < 1e-4 &&
                       Math.abs(b10.min.y - b100.min.y) < 1e-4 &&
                       b10.min.y <= gy + 0.0005;
        ok(stable, 'live damage states (100%/50%/10% HP) keep ' + k + ' seated on ground without drift');
        T.removeBuild(b, true);
      }
    }

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
