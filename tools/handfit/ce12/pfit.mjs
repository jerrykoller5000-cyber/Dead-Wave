// CE-12 (cloud): fit.mjs on the game's own left glove (the third person's mesh, its layout space), refining a canonical start.
// install(ev) puts window.__pfit(spec) on the page. spec: { w, d, len (game mm: the box across up x fwd, along up, along fwd),
// c: [x, y, z] canonical start (box middle), up, fwd (canonical), th: [deg...] extra turns about up, dx/dy/dz: [offsets m],
// thumbs: [[t..]], fingers: n that must touch, under: the palm under the box's end (any part may touch first),
// side: 1 = score the thumb by its pad lying along the box's near side (CE-12 #4: not a thumbs-up) }
// -> the best few { c (canonical), up, fwd, G (mm), pose }
export const install = (ev) => ev(() => {
  const T = TT, THREE = T.THREE, ud = T.getMarine().userData, wr = ud.elbowLG.userData.wrist, rig = wr.userData.hand;
  const glove = () => { let b = null; for (const s of rig.skins) { if (s.kind === 'glove') return s; if (!b || s.n > b.n) b = s; } return b; };
  const g0 = wr.userData.grip, ox = g0.x, gz = g0.z - 0.008, HS = 1.18;
  const grp = (b0, b1, w1) => b0 === 0 ? (b1 >= 13 && w1 > 0.2 ? 'web' : 'palm') : b0 === 13 ? 'web' : b0 > 13 ? 'thumb' : 'f' + Math.floor((b0 - 1) / 3);
  const open = { f: [[0.1, 0.1, 0.05, 0.03], [0.1, 0.1, 0.05, 0], [0.1, 0.1, 0.05, -0.02], [0.1, 0.1, 0.05, -0.05]], t: [0, 0.55, 0, 0, 0, 0] };
  const fist = { f: [[1.412, 0.938, 0.84, 0], [1.495, 1.013, 0.943, 0], [1.425, 1.0, 0.899, 0], [1.212, 0.725, 0.693, 0]] };
  window.__pfit = (spec) => {
    const sk = glove(), TOL = 0.0003, keep = JSON.parse(JSON.stringify(rig.pose));
    const pa = () => sk.mesh.geometry.attributes.position.array;
    const L2 = (v) => new THREE.Vector3(-v[0], v[1], v[2]);
    // per part: the deepest vertex (+ in, - out) and, for the thumb, how many of its vertices lie within 2 mm of the box (its pad along it)
    const measure = (pose, B) => {
      rig.set(pose).update(true); const p = pa(), G = {}; let near = 0, tn = 0;
      for (let i = 0; i < sk.n; i++) {
        const x = p[i * 3] - B.c.x, y = p[i * 3 + 1] - B.c.y, z = p[i * 3 + 2] - B.c.z;
        const a = Math.abs(x * B.ax.x + y * B.ax.y + z * B.ax.z) - B.h[0], b = Math.abs(x * B.ay.x + y * B.ay.y + z * B.ay.z) - B.h[1], c = Math.abs(x * B.az.x + y * B.az.y + z * B.az.z) - B.h[2];
        const d = a < 0 && b < 0 && c < 0 ? -Math.max(a, b, c) : -Math.hypot(Math.max(a, 0), Math.max(b, 0), Math.max(c, 0));
        const g = grp(sk.seg[i], sk.b1[i], sk.w1[i]); if (!(g in G) || d > G[g]) G[g] = d;
        if (g === 'thumb') { tn++; if (d > -0.002) near++; }
      }
      G._thumbNear = tn ? near / tn : 0;
      return G;
    };
    const lerp = (a, b, k) => a + (b - a) * k;
    let shutT = null;
    const poseAt = (cf, ct) => ({ f: fist.f.map((r, i) => r.map((x, j) => lerp(open.f[i][j], x, cf[i]))), t: shutT.map((x, j) => lerp(open.t[j] || 0, x, ct)) });
    const close = (B) => { const cf = [0, 0, 0, 0]; let ct = 0;
      for (let i = 0; i < 5; i++) { const at = (c) => { const f = cf.slice(); let t = ct; if (i < 4) f[i] = c; else t = c; return measure(poseAt(f, t), B)[i < 4 ? 'f' + i : 'thumb']; };
        let lo = 0, hi = 1; if (at(0) > TOL) continue; if (at(1) <= TOL) lo = 1; else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (at(m) <= TOL) lo = m; else hi = m; }
        if (i < 4) cf[i] = lo; else ct = lo; }
      return { cf, ct, G: measure(poseAt(cf, ct), B) }; };
    const res = [];
    const S = 1 / HS / 1000, hw = spec.w * S / 2, hd = spec.d * S / 2, hl = spec.len * S / 2;
    for (const thd of spec.th || [0]) for (const ti of spec.thumbs.keys()) for (const dx of spec.dx || [0]) for (const dy of spec.dy || [0]) {
      shutT = spec.thumbs[ti];
      // the box's axes (left layout): up (its length), fwd (the d side), side (the w side), turned th about up
      const up = L2(spec.up).normalize(), f0 = L2(spec.fwd).normalize(), th = thd * Math.PI / 180;
      const fwd = f0.clone().applyAxisAngle(up, th), side = new THREE.Vector3().crossVectors(up, fwd);
      const c0 = new THREE.Vector3(ox - spec.c[0] - dx, spec.c[1] + dy, gz + spec.c[2]);
      const nrm = new THREE.Vector3(0, 0, 1);   // the palm's normal: push the box onto the palm along it
      const mk = (dz) => ({ c: c0.clone().addScaledVector(nrm, dz), ax: side, ay: up, az: fwd, h: [hw, hl, hd] });
      let lo = -0.04, hi = 0.06; const palmAt = (dz) => { const G = measure(open, mk(dz)); delete G._thumbNear; return spec.under ? Math.max(...Object.values(G)) : G.palm; };
      if (palmAt(hi) > TOL) continue;
      for (let k = 0; k < 11; k++) { const m = (lo + hi) / 2; if (palmAt(m) > TOL) lo = m; else hi = m; }
      const B = mk(hi), r = close(B), G = r.G, tnear = G._thumbNear; delete G._thumbNear;
      const inMax = Math.max(...Object.values(G));
      const fs = ['f0', 'f1', 'f2', 'f3'].map((k) => -G[k]).sort((a, b) => a - b), need = spec.fingers ?? 2;
      let score = Math.max(-G.palm, -G.web, -G.thumb, need ? fs[need - 1] : -1) + (inMax > 0.0006 ? 1 + inMax : 0);
      if (spec.side) score += 0.004 * (1 - tnear);   // the thumb's pad along the box (a thumb touching with its tip only scores worse)
      const mm = (x) => +(x * 1000).toFixed(1), cc = B.c;
      res.push({ score: mm(score), thd, ti, dx, dy, dz: +hi.toFixed(4), tnear: +tnear.toFixed(2), c: [+(ox - cc.x).toFixed(4), +cc.y.toFixed(4), +(cc.z - gz).toFixed(4)],
        up: [-up.x, up.y, up.z].map((x) => +x.toFixed(4)), fwd: [-fwd.x, fwd.y, fwd.z].map((x) => +x.toFixed(4)),
        G: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, mm(v)])), pose: poseAt(r.cf, r.ct) });
    }
    rig.set(keep).update(true);
    res.sort((a, b) => a.score - b.score);
    return res.slice(0, spec.top || 3).map((r) => ({ ...r, pose: { f: r.pose.f.map((x) => x.map((v) => +v.toFixed(3))), t: r.pose.t.map((v) => +v.toFixed(3)) } }));
  };
  return true;
});
