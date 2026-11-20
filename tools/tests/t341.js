// t341 - CD-14 #8 (Claude 1, 19 Nov; the Director's loan of VM_RELOADS.cylinder, 09:22Z): the revolver's reload, first
// person, held at its beats (TT.reloadClipDbg.hold) on the suite's fake three: rules 24 and 25 (J126/J128, D-138/D-140)
// through the whole reload, not just at the hip (tcl334b). For the empty reload (six fired) and the tactical one (three
// live left), every beat from the start to the end: no vertex of either hand (the glove and its pads, or the bare hand and
// its nails) more than half a millimetre inside any closed body of the view gun (clip-check.js's own test: odd ray hits,
// then the nearest face), nor of either sleeve (the forearm and its cuff), and neither hand into the other.
// It was: at u .02 the right glove 6.5 mm and the left 14.8 mm inside the walnut grip (Claude 1's s25 probe).
// budget: 600
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const st = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) T.stepFrame(dt); };
  const THREE = T.THREE || window.THREE, TOL = 0.0005, D = T.trainingDbg; let held = false;
  const OPT = window.__T341 || {};   // the probe's knobs (beats, stride); the gate runs with none
  const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const worldTris = (m) => {
    const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count, o = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld); o[i * 3] = v.x; o[i * 3 + 1] = v.y; o[i * 3 + 2] = v.z; }
    return o;
  };
  const key5 = (P, i) => Math.round(P[i * 3] * 1e5) + ',' + Math.round(P[i * 3 + 1] * 1e5) + ',' + Math.round(P[i * 3 + 2] * 1e5);
  const closedOf = (P) => {
    const E = new Map();
    for (let t = 0; t < P.length / 9; t++) { const k = [key5(P, t * 3), key5(P, t * 3 + 1), key5(P, t * 3 + 2)]; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = k[a] < k[b] ? k[a] + '|' + k[b] : k[b] + '|' + k[a]; E.set(e, (E.get(e) || 0) + 1); } }
    for (const c of E.values()) if (c !== 2) return false;
    return true;
  };
  const bodiesOf = (P) => {
    const n = P.length / 9, par = new Int32Array(n), first = new Map();
    for (let t = 0; t < n; t++) par[t] = t;
    const fd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let t = 0; t < n; t++) { const k = [key5(P, t * 3), key5(P, t * 3 + 1), key5(P, t * 3 + 2)]; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = k[a] < k[b] ? k[a] + '|' + k[b] : k[b] + '|' + k[a]; const f = first.get(e); if (f === undefined) first.set(e, t); else par[fd(t)] = fd(f); } }
    const g = new Map(); for (let t = 0; t < n; t++) { const r = fd(t); if (!g.has(r)) g.set(r, []); g.get(r).push(t); }
    if (g.size === 1) return [P];
    return [...g.values()].map((ts) => { const B = new Float32Array(ts.length * 9); ts.forEach((t, i) => B.set(P.subarray(t * 9, t * 9 + 9), i * 9)); return B; });
  };
  const rayHits = (P, x, y, z) => {
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
  const distTri = (P, t, px, py, pz) => {
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
  // the same parity and nearest-face tests, culled: the faces bucketed once per body on the ray's own plane (a ray meets only
  // the faces over its cell) and in a 3D grid for the nearest face (rings out until the nearest found is inside the ring)
  const RD = [0.8366, 0.3419, 0.4279], E1 = (() => { const a = [RD[1], -RD[0], 0], l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l, 0]; })(), E2 = [RD[1] * E1[2] - RD[2] * E1[1], RD[2] * E1[0] - RD[0] * E1[2], RD[0] * E1[1] - RD[1] * E1[0]];
  const C2 = 0.003, C3 = 0.005;
  const accel = (pt) => {
    if (pt.g2) return pt; const P = pt.P, g2 = new Map(), g3 = new Map();
    for (let t = 0; t < P.length; t += 9) {
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let k = 0; k < 3; k++) { const x = P[t + k * 3], y = P[t + k * 3 + 1], z = P[t + k * 3 + 2], a = x * E1[0] + y * E1[1] + z * E1[2], b = x * E2[0] + y * E2[1] + z * E2[2];
        a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y); lo[2] = Math.min(lo[2], z); hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y); hi[2] = Math.max(hi[2], z); }
      for (let i = Math.floor(a0 / C2); i <= Math.floor(a1 / C2); i++) for (let j = Math.floor(b0 / C2); j <= Math.floor(b1 / C2); j++) { const k = i + ',' + j; let L = g2.get(k); if (!L) g2.set(k, L = []); L.push(t); }
      for (let i = Math.floor(lo[0] / C3); i <= Math.floor(hi[0] / C3); i++) for (let j = Math.floor(lo[1] / C3); j <= Math.floor(hi[1] / C3); j++) for (let k = Math.floor(lo[2] / C3); k <= Math.floor(hi[2] / C3); k++) { const kk = i + ',' + j + ',' + k; let L = g3.get(kk); if (!L) g3.set(kk, L = []); L.push(t); }
    }
    pt.g2 = g2; pt.g3 = g3; return pt;
  };
  const hitsFast = (pt, x, y, z) => {
    const L = pt.g2.get(Math.floor((x * E1[0] + y * E1[1] + z * E1[2]) / C2) + ',' + Math.floor((x * E2[0] + y * E2[1] + z * E2[2]) / C2)); if (!L) return 0;
    const P = pt.P, dx = RD[0], dy = RD[1], dz = RD[2]; let n = 0;
    for (const t of L) {
      const ax = P[t], ay = P[t + 1], az = P[t + 2], e1x = P[t + 3] - ax, e1y = P[t + 4] - ay, e1z = P[t + 5] - az, e2x = P[t + 6] - ax, e2y = P[t + 7] - ay, e2z = P[t + 8] - az;
      const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x, det = e1x * hx + e1y * hy + e1z * hz;
      if (Math.abs(det) < 1e-16) continue; const f = 1 / det, sx = x - ax, sy = y - ay, sz = z - az, u = f * (sx * hx + sy * hy + sz * hz); if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = f * (dx * qx + dy * qy + dz * qz); if (w < 0 || u + w > 1) continue;
      if (f * (e2x * qx + e2y * qy + e2z * qz) > 0) n++;
    }
    return n;
  };
  const nearFast = (pt, x, y, z) => {
    const ci = Math.floor(x / C3), cj = Math.floor(y / C3), ck = Math.floor(z / C3); let best = 1;
    for (let r = 0; r <= 12; r++) {
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) for (let k = ck - r; k <= ck + r; k++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== r) continue;
        const L = pt.g3.get(i + ',' + j + ',' + k); if (L) for (const t of L) { const e = distTri(pt.P, t, x, y, z); if (e < best) best = e; }
      }
      if (best <= r * C3) return best;
    }
    for (let t = 0; t < pt.P.length; t += 9) { const e = distTri(pt.P, t, x, y, z); if (e < best) best = e; }
    return best;
  };
  const boxOf = (P) => { const box = new THREE.Box3(), v = new THREE.Vector3(); for (let i = 0; i < P.length; i += 3) box.expandByPoint(v.set(P[i], P[i + 1], P[i + 2])); return box; };
  const depthIn = (pt, v) => { if (!pt.box.containsPoint(v)) return 0; if (OPT.brute) { if ((rayHits(pt.P, v.x, v.y, v.z) & 1) === 0) return 0; let d = 1; for (let t = 0; t < pt.P.length; t += 9) { const e = distTri(pt.P, t, v.x, v.y, v.z); if (e < d) d = e; } return d; }
    accel(pt); if ((hitsFast(pt, v.x, v.y, v.z) & 1) === 0) return 0; return nearFast(pt, v.x, v.y, v.z); };
  const HAND = ['glove', 'glovePads', 'bare', 'bareNails'], ARM = ['fore', 'cuff'], STRIDE = OPT.stride || 1;
  // one beat: { r, l: deepest hand vertex in the gun (m), where; ra, la: the sleeves; hh: hand into hand }
  const probe = (V) => {
    V.root.updateMatrixWorld(true);
    const near = []; for (const sd of ['r', 'l']) { const A = V.arms && V.arms[sd]; if (!A) continue; for (const mk of HAND.concat(ARM)) { const m = A.meshes[mk]; if (m && vis(m)) near.push(new THREE.Box3().setFromObject(m).expandByScalar(0.005)); } }
    const parts = []; V.gun.root.traverse((m) => { if (!(m.isMesh && m.geometry && m.geometry.attributes.position && vis(m))) return; const mb = new THREE.Box3().setFromObject(m); if (!near.some((b) => b.intersectsBox(mb))) return; for (const P of bodiesOf(worldTris(m))) if (closedOf(P)) parts.push({ name: [m.name, m.parent && m.parent.name, m.material && m.material.name].filter(Boolean).join('/') || '?', P, box: boxOf(P) }); });
    const res = { r: 0, l: 0, ra: 0, la: 0, hh: 0, where: {} }, v = new THREE.Vector3();
    for (const sd of ['r', 'l']) {
      const A = V.arms && V.arms[sd]; if (!A) continue;
      for (const [grp, keyN] of [[HAND, sd], [ARM, sd + 'a']]) {
        for (const mk of grp) {
          const m = A.meshes[mk]; if (!m || !vis(m)) continue;
          const pa = m.geometry.attributes.position;
          for (let i = 0; i < pa.count; i += STRIDE) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); for (const pt of parts) { const d = depthIn(pt, v); if (d > res[keyN]) { res[keyN] = d; res.where[keyN] = mk + ' in ' + pt.name; } } }
        }
      }
    }
    const G = ['r', 'l'].map((sd) => { const A = V.arms && V.arms[sd], m = A && [A.meshes.glove, A.meshes.bare].find((x) => x && vis(x)); if (!m) return null; const P = worldTris(m); return { m, P, box: boxOf(P) }; });
    // a glove is open at its cuff, so one ray's parity can call a point inside that is not: inside the other glove only when
    // three rays in different directions all say so (the gun's bodies above are closed, checked by closedOf)
    const in3 = (g, v) => { if (!g.box.containsPoint(v)) return 0; for (const D of [[0.8366, 0.3419, 0.4279], [-0.3, 0.9, -0.3162], [0.2, -0.4, 0.8944]]) { let n = 0; const P = g.P; for (let t = 0; t < P.length; t += 9) { const ax = P[t], ay = P[t + 1], az = P[t + 2], e1x = P[t + 3] - ax, e1y = P[t + 4] - ay, e1z = P[t + 5] - az, e2x = P[t + 6] - ax, e2y = P[t + 7] - ay, e2z = P[t + 8] - az;
      const hx = D[1] * e2z - D[2] * e2y, hy = D[2] * e2x - D[0] * e2z, hz = D[0] * e2y - D[1] * e2x, det = e1x * hx + e1y * hy + e1z * hz; if (Math.abs(det) < 1e-16) continue; const f = 1 / det, sx = v.x - ax, sy = v.y - ay, sz = v.z - az, uu = f * (sx * hx + sy * hy + sz * hz); if (uu < 0 || uu > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, ww = f * (D[0] * qx + D[1] * qy + D[2] * qz); if (ww < 0 || uu + ww > 1) continue; if (f * (e2x * qx + e2y * qy + e2z * qz) > 0) n++; } if ((n & 1) === 0) return 0; }
      let d = 1; for (let t = 0; t < g.P.length; t += 9) { const e = distTri(g.P, t, v.x, v.y, v.z); if (e < d) d = e; } return d; };
    if (G[0] && G[1] && G[0].box.intersectsBox(G[1].box)) for (const [a, b] of [[0, 1], [1, 0]]) { const pa = G[a].m.geometry.attributes.position; for (let i = 0; i < pa.count; i += STRIDE) { v.fromBufferAttribute(pa, i).applyMatrix4(G[a].m.matrixWorld); const d = in3(G[b], v); if (d > res.hh) res.hh = d; } }
    return res;
  };
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    T.runDevCommand && T.runDevCommand('godmode');
    T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false);
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person');
    T.flightHold(true); held = true;
    const vm = () => T.viewmodelDbg();
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'revolver'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('revolver')); st(5); }
    T.setOtsAimDbg && T.setOtsAimDbg(0, -0.25);
    for (let i = 0; i < 120 && !(vm().info.active && vm().info.key === 'revolver' && vm().info.raise > 0.999); i++) st(1);
    st(30);
    ok(vm().info.key === 'revolver' && vm().info.raise > 0.999, 'the revolver up in first person');
    const hip = probe(vm());
    out.push('INFO hip (no reload): r ' + (hip.r * 1000).toFixed(1) + ' / l ' + (hip.l * 1000).toFixed(1) + ' mm');
    const beats = OPT.beats || Array.from({ length: 50 }, (_, i) => +(i * 0.02).toFixed(2)).concat([0.99]);
    const PM = OPT.variants ? await import('/game/viewmodel-poses.js') : null, RC = PM && PM.VM_RELOADS.cylinder, keep = RC && JSON.stringify(RC);
    for (const VAR of OPT.variants || [null]) {
    if (VAR) { const k0 = JSON.parse(keep); for (const k in k0) RC[k] = k0[k]; VAR.patch(RC, T, vm()); out.push('INFO variant ' + VAR.name); }
    for (const [kind, left] of [['empty', 0], ['tactical', 3]]) {
      if (OPT.kinds && !OPT.kinds.includes(kind)) continue;
      T.reloadClipDbg.hold(null); for (let i = 0; i < 200 && T.isReloading && T.isReloading(); i++) st(3);
      T.setAmmoDbg('revolver', left); st(2); T.startReload(); st(1);
      ok(!!(T.isReloading && T.isReloading()), kind + ': the reload started');
      const wristOver = { r: [0, ''], l: [0, ''] };
      const rows = []; const worst = { r: [0, ''], l: [0, ''], ra: [0, ''], la: [0, ''], hh: [0, ''] };
      for (const u of beats) {
        T.reloadClipDbg.hold(u); st(3, 1 / 60);
        const V = vm(); if (V.info.reloadU == null) { rows.push(u.toFixed(2) + ':-'); continue; }
        const r = probe(V);
        for (const sd of ['r', 'l']) { const wb = V.arms[sd] && V.arms[sd].wristBend; if (wb && wb.over > wristOver[sd][0]) wristOver[sd] = [wb.over, u.toFixed(2)]; }
        for (const k in worst) if (r[k] > worst[k][0]) worst[k] = [r[k], u.toFixed(2) + ' ' + (r.where[k] || '')];
        rows.push(u.toFixed(2) + ':' + [r.r, r.l, r.ra, r.la, r.hh].map((x) => (x * 1000).toFixed(1)).join('/') + (OPT.place ? ' ' + V.info.handPlace : ''));
      }
      T.reloadClipDbg.hold(null);
      out.push('INFO ' + kind + ' reload (u: r hand / l hand / r sleeve / l sleeve / hand-in-hand, mm): ' + rows.join(' '));
      out.push('INFO ' + kind + ': the wrists\' wanted bend over the limit ellipse before the clamp (1 = at it; the clamp holds every wrist inside, rule 25): r ' + wristOver.r[0] + ' at ' + wristOver.r[1] + ', l ' + wristOver.l[0] + ' at ' + wristOver.l[1]);
      const mm = (w) => (w[0] * 1000).toFixed(1) + ' mm' + (w[0] > TOL ? ' at ' + w[1] : '');
      ok(worst.r[0] <= TOL, kind + ': the firing hand never inside the gun (deepest ' + mm(worst.r) + ')');
      ok(worst.l[0] <= TOL, kind + ': the support hand never inside the gun (deepest ' + mm(worst.l) + ')');
      ok(worst.ra[0] <= TOL && worst.la[0] <= TOL, kind + ': neither sleeve inside the gun (r ' + mm(worst.ra) + ', l ' + mm(worst.la) + ')');
      ok(worst.hh[0] <= TOL, kind + ': neither hand through the other (deepest ' + mm(worst.hh) + ')');
    }
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  try { T.reloadClipDbg.hold(null); if (held) T.flightHold(false); } catch { /* */ }
  return out.join('\n');
})()
