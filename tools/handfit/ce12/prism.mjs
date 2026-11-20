// CE-12 #4 (cloud): a magazine's true shape for the fits and the pen, not its axis box: the pistol's and the rifles'
// magazines are raked (the pistol's box is 93 mm deep for a 30 mm magazine), so a box says a hand is 10 mm in when it
// touches. The shape: a prism along one of its own axes (x for the box magazines, z for the drum), its cross-section the
// convex hull of every visible vertex's projection. window.__prism(obj, axis) -> { sd(v: obj-local Vector3) -> m in obj units
// (+ inside, - outside), lo, hi }. install(ev).
export const install = (ev) => ev(() => {
  const T = TT, THREE = T.THREE;
  window.__prism = (obj, axis = 'x') => {
    obj.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), v = new THREE.Vector3(), pts = [];
    const ia = axis === 'x' ? 0 : axis === 'y' ? 1 : 2, iu = (ia + 1) % 3, iv = (ia + 2) % 3;
    let alo = 1e9, ahi = -1e9;
    const vis = (o) => { for (let x = o; x && x !== obj.parent; x = x.parent) if (!x.visible) return false; return true; };
    obj.traverse((o) => { const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!pa || !vis(o)) return;
      const mm = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mm); const a = v.toArray(); alo = Math.min(alo, a[ia]); ahi = Math.max(ahi, a[ia]); pts.push([a[iu], a[iv]]); } });
    // 2D convex hull (monotone chain), counter-clockwise
    pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    const H = lower.slice(0, -1).concat(upper.slice(0, -1));
    const E = H.map((p, i) => { const q = H[(i + 1) % H.length], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); return { p, dx: dx / L, dy: dy / L, L }; });
    const am = (alo + ahi) / 2, ah = (ahi - alo) / 2;
    const poly = (u, w) => {   // signed: + inside (to the nearest edge), - outside (distance to the polygon)
      let inside = true, dmin = 1e9;
      for (const e of E) { const rx = u - e.p[0], ry = w - e.p[1], c = e.dx * ry - e.dy * rx; if (c < 0) inside = false;
        const t = Math.max(0, Math.min(e.L, rx * e.dx + ry * e.dy)), d = Math.hypot(rx - t * e.dx, ry - t * e.dy); if (d < dmin) dmin = d; }
      return inside ? dmin : -dmin;
    };
    const sd = (p) => { const a = p.toArray(), da = ah - Math.abs(a[ia] - am), dp = poly(a[iu], a[iv]);
      if (da >= 0 && dp >= 0) return Math.min(da, dp);
      return -Math.hypot(Math.min(da, 0), Math.min(dp, 0)); };
    return { sd, n: H.length, alo, ahi };
  };
  // the pen by hand part against a gun part's prism: + mm in, - mm clear
  const group = (b0, b1, w1) => b0 === 0 ? (b1 >= 13 && w1 > 0.2 ? 'web' : 'palm') : b0 >= 13 ? (b0 === 13 ? 'web' : 'thumb') : 'f' + Math.floor((b0 - 1) / 3);
  window.__pen3 = (parts = ['mag'], axes = {}) => {
    const ud = T.getMarine().userData, gun = T.weaponMeshes[T.getCurrentWeapon()], gd = gun.userData, wr = ud.elbowLG.userData.wrist, rig = wr.userData.hand;
    const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    let sk = null; for (const s of rig.skins) if (vis(s.mesh) && (!sk || s.n > sk.n)) sk = s; if (!sk) return null;
    const m = sk.mesh; m.updateMatrixWorld(true); const pos = m.geometry.attributes.position, v = new THREE.Vector3(), out = {};
    for (const k of parts) {
      const o = gd[k]; if (!o || !vis(o)) continue;
      const P = window.__prism(o, axes[k] || (T.getCurrentWeapon() === 'aa12' && k === 'mag' ? 'z' : 'x'));
      const inv = new THREE.Matrix4().copy(o.matrixWorld).invert().multiply(m.matrixWorld), s = o.getWorldScale(new THREE.Vector3()).x * 1000, G = {};
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(inv); const g = group(sk.seg[i], sk.b1[i], sk.w1[i]), d = P.sd(v) * s; if (!(g in G) || d > G[g]) G[g] = d; }
      for (const g in G) G[g] = +G[g].toFixed(1);
      out[k] = G;
    }
    return out;
  };
  return true;
});
