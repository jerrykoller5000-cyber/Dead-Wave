// GB-153 fit: loaded after grip-page.js (manual clock, __step). __fitHands(w, mode) curls each finger of each holding
// hand from straight until it first touches its targets; returns the curls and the contact distances.
(() => {
  const T = window.TT, THREE = T.THREE || window.THREE, V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const m = T.getMarine(), ud = m.userData;
  // world triangles of objs (visible meshes) within R of c: [ax..cz, nx, ny, nz]
  function trisNear(objs, c, R) {
    const out = [], a = V(), b = V(), d = V(), e1 = V(), e2 = V(), n = V();
    for (const root of objs) root.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      for (let x = o; x; x = x.parent) { if (!x.visible) return; if (x === root) break; }
      o.updateMatrixWorld(true);
      const P = o.geometry.attributes.position, I = o.geometry.index, N = I ? I.count : P.count, mw = o.matrixWorld;
      for (let k = 0; k + 2 < N; k += 3) {
        const i0 = I ? I.getX(k) : k, i1 = I ? I.getX(k + 1) : k + 1, i2 = I ? I.getX(k + 2) : k + 2;
        a.fromBufferAttribute(P, i0).applyMatrix4(mw); b.fromBufferAttribute(P, i1).applyMatrix4(mw); d.fromBufferAttribute(P, i2).applyMatrix4(mw);
        const cx = (a.x + b.x + d.x) / 3, cy = (a.y + b.y + d.y) / 3, cz = (a.z + b.z + d.z) / 3;
        const rr = Math.max(a.distanceTo(b), b.distanceTo(d), d.distanceTo(a));
        if (Math.hypot(cx - c.x, cy - c.y, cz - c.z) > R + rr) continue;
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(d, a)); const L = n.length(); if (L < 1e-12) continue; n.divideScalar(L);
        out.push([a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z, n.x, n.y, n.z]);
      }
    });
    return out;
  }
  // closest point on triangle (Ericson), returns signed distance (by the face normal)
  function sd(px, py, pz, t) {
    const ax = t[0], ay = t[1], az = t[2], abx = t[3] - ax, aby = t[4] - ay, abz = t[5] - az, acx = t[6] - ax, acy = t[7] - ay, acz = t[8] - az;
    const apx = px - ax, apy = py - ay, apz = pz - az;
    const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
    let qx, qy, qz;
    if (d1 <= 0 && d2 <= 0) { qx = ax; qy = ay; qz = az; }
    else {
      const bpx = px - t[3], bpy = py - t[4], bpz = pz - t[5];
      const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
      if (d3 >= 0 && d4 <= d3) { qx = t[3]; qy = t[4]; qz = t[5]; }
      else {
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); qx = ax + abx * v; qy = ay + aby * v; qz = az + abz * v; }
        else {
          const cpx = px - t[6], cpy = py - t[7], cpz = pz - t[8];
          const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
          if (d6 >= 0 && d5 <= d6) { qx = t[6]; qy = t[7]; qz = t[8]; }
          else {
            const vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); qx = ax + acx * w; qy = ay + acy * w; qz = az + acz * w; }
            else {
              const va = d3 * d6 - d5 * d4;
              if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); qx = t[3] + (t[6] - t[3]) * w; qy = t[4] + (t[7] - t[4]) * w; qz = t[5] + (t[8] - t[5]) * w; }
              else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; qx = ax + abx * v + acx * w; qy = ay + aby * v + acy * w; qz = az + abz * v + acz * w; }
            }
          }
        }
      }
    }
    const dx = px - qx, dy = py - qy, dz = pz - qz, dist = Math.hypot(dx, dy, dz);
    return (dx * t[9] + dy * t[10] + dz * t[11]) < 0 ? -dist : dist;
  }
  // The signed distance of a point to a set: the nearest triangle's.
  function sdSet(px, py, pz, tris) {
    let best = Infinity, bs = 1;
    for (const t of tris) { const s = sd(px, py, pz, t), a = Math.abs(s); if (a < best) { best = a; bs = s; } }
    return bs;
  }
  // The world vertices of segments segs (every step-th) of hand rig's glove skin, for its current pose.
  function segPts(wr, segs, step = 2) {
    const rig = wr.userData.hand, sk = rig.skins[0], mesh = sk.mesh; mesh.updateMatrixWorld(true);
    const P = mesh.geometry.attributes.position, out = [], v = V();
    for (let i = 0; i < P.count; i += step) if (segs.includes(sk.seg[i])) { v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld); out.push([v.x, v.y, v.z]); }
    return out;
  }
  // Every vertex of a hand (for the other hand's targets): as tiny triangles is overkill; use the mesh itself.
  window.__handsSD = { trisNear, sdSet, segPts };
  window.__fitHands = async (w, which) => {
    const HG = await import('/studio/hand-grips.js?' + Date.now());
    m.updateMatrixWorld(true);
    const res = {};
    let gun = T.weaponMeshes[w]; const off = T.offhandMeshes && T.offhandMeshes[w];
    const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    let gunKey = w;
    if (!shown(gun) && ud.weaponMount) { gun = ud.weaponMount; gunKey = 'weaponMount'; }   // the minigun is not in weaponMeshes
    for (const hand of which) {
      const side = hand.name === 'L' ? -1 : 1, e = side < 0 ? ud.elbowLG : ud.elbowRG, wr = e.userData.wrist, rig = wr.userData.hand;
      const grip = wr.localToWorld(wr.userData.grip.clone().sub(wr.position));
      const objs = [hand.gun === 'off' ? off : gun];
      if (hand.role === 'support' && trisNear(objs, grip, 0.045).length === 0) { res.support = { none: true }; continue; }
      if (hand.alsoHand) objs.push(ud.elbowRG.userData.wrist);
      const tris = trisNear(objs, grip, 0.16);
      const pose = HG.gripPose(HG.FIST);
      // straight start for all fingers so fitting one does not collide with a curled neighbour's state
      const entry = { f: [0, 0, 0, 0], t: [0, hand.swing, null] }, near = [], dists = [];
      const evalDigit = (i, c) => {
        if (i < 4) pose.f[i] = HG.digit(c); else { pose.t[0] = c; pose.t[1] = hand.swing; pose.t[2] = c * 0.6; }
        rig.set(pose).update(true);
        const segs = i < 4 ? [1 + i * 3, 2 + i * 3, 3 + i * 3] : [13, 14];
        let mn = Infinity; for (const p of segPts(wr, segs)) mn = Math.min(mn, sdSet(p[0], p[1], p[2], tris));
        return mn;
      };
      for (let i = 0; i < 4; i++) pose.f[i] = HG.digit(0);
      pose.t = [0, hand.swing, 0];
      for (let i = 0; i < 5; i++) {
        // Close the digit as far as it goes without going into the gun (or the hand it wraps): from a full curl, open
        // until its deepest point is no more than 3 mm in; then it should be touching (within 4 mm), or it is free.
        const max = 1.45, scan = [];
        for (let c = max; c >= -1e-9; c -= 0.05) scan.push([Math.max(0, c), evalDigit(i, Math.max(0, c))]);
        // A digit whose root is already in the gun straight (the knuckle on the grip) may sink no further than that, and
        // 1.5 mm more, as it curls.
        const d0 = scan[scan.length - 1][1], thr = Math.min(-0.003, d0 - 0.0015);
        let pick = scan.find(([, d]) => d >= thr), tag;
        if (pick) {
          // refine between pick and the next-larger curl
          const k = scan.indexOf(pick);
          if (k > 0) { let lo = pick[0], hi = scan[k - 1][0]; for (let j = 0; j < 6; j++) { const mid = (lo + hi) / 2; if (evalDigit(i, mid) >= thr) lo = mid; else hi = mid; } pick = [lo, evalDigit(i, lo)]; }
          tag = pick[1] <= 0.004 ? (d0 < -0.003 ? 'touch(root in)' : 'touch') : 'free';
        } else { pick = scan.reduce((b, x) => (x[1] > b[1] ? x : b)); tag = 'clip'; }
        let c = pick[0];
        if (tag === 'free') c = i < 4 ? HG.FIST.f[i] : HG.FIST.t[0];
        const d = evalDigit(i, c);
        if (i < 4) entry.f[i] = +c.toFixed(3); else entry.t[0] = +c.toFixed(3);
        dists.push(+d.toFixed(4)); near.push(tag);
      }
      entry.t = [entry.t[0], hand.swing];
      res[hand.role] = { entry, dists, near, tris: tris.length, dbg: { cur: T.getCurrentWeapon(), wShown: shown(T.weaponMeshes[w]), wVis: T.weaponMeshes[w].visible, wPar: T.weaponMeshes[w].parent && (T.weaponMeshes[w].parent.name || T.weaponMeshes[w].parent.type), wParVis: T.weaponMeshes[w].parent && T.weaponMeshes[w].parent.visible, gunKey, gunVis: objs.map((o) => !!o && o.visible), grip: grip.toArray().map((x) => +x.toFixed(3)), gunAt: objs[0] ? objs[0].getWorldPosition(V()).toArray().map((x) => +x.toFixed(3)) : null } };
    }
    return res;
  };
})();
