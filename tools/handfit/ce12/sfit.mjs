// CE-12 #4 (cloud): fit the support hand ON a held magazine as the game has it now (a reload frozen at a beat), against the
// magazine's true shape (prism.mjs: a raked magazine's box is far deeper than the magazine). The magazine is slid across
// (its own axes other than push, dA/dB mm) and along push (+ away from the hand) until the OPEN hand just touches it, then
// each finger and the thumb close until they touch. install(ev) puts window.__sfit(spec) on the page (prism.mjs first).
// spec: { push: 'x'|'y'|'z' (the magazine's own axis to slide along), dAs, dBs (mm), thumbs: [[6 values]...], fingers, side,
// axis (the prism's axis), top, now (just measure the hand as it is) }
// -> best { off: [x, y, z] mm in the magazine's own space (its move), G (mm), tn (the thumb's share within 2 mm), pose }
export const install = (ev) => ev(() => {
  const T = TT, THREE = T.THREE, ud = T.getMarine().userData, wr = ud.elbowLG.userData.wrist, rig = wr.userData.hand;
  const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const skin = () => { let b = null; for (const s of rig.skins) if (vis(s.mesh) && (!b || s.n > b.n)) b = s; return b; };
  const grp = (b0, b1, w1) => b0 === 0 ? (b1 >= 13 && w1 > 0.2 ? 'web' : 'palm') : b0 === 13 ? 'web' : b0 > 13 ? 'thumb' : 'f' + Math.floor((b0 - 1) / 3);
  const open = { f: [[0.1, 0.1, 0.05, 0.03], [0.1, 0.1, 0.05, 0], [0.1, 0.1, 0.05, -0.02], [0.1, 0.1, 0.05, -0.05]], t: [0, 0.55, 0, 0, 0, 0] };
  const fist = { f: [[1.412, 0.938, 0.84, 0], [1.495, 1.013, 0.943, 0], [1.425, 1.0, 0.899, 0], [1.212, 0.725, 0.693, 0]] };
  window.__sfit = (spec) => {
    const gun = T.weaponMeshes[T.getCurrentWeapon()], mag = gun.userData[spec.obj || 'mag'], sk = skin(), mesh = sk.mesh;
    const keep = JSON.parse(JSON.stringify(rig.pose));
    mesh.updateMatrixWorld(true); mag.updateMatrixWorld(true);
    const P = window.__prism(mag, spec.axis || 'x');
    const M = new THREE.Matrix4().copy(mag.matrixWorld).invert().multiply(mesh.matrixWorld);   // mesh -> magazine
    const S = mag.getWorldScale(new THREE.Vector3()).x * 1000, TOL = 0.3 / S, v = new THREE.Vector3();
    const measure = (pose, off) => {
      rig.set(pose).update(true); const p = mesh.geometry.attributes.position.array, G = {}; let near = 0, tn = 0;
      for (let i = 0; i < sk.n; i++) {
        v.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(M).sub(off);
        const d = P.sd(v), g = grp(sk.seg[i], sk.b1[i], sk.w1[i]); if (!(g in G) || d > G[g]) G[g] = d;
        if (g === 'thumb') { tn++; if (d > -2 / S) near++; }
      }
      G._tn = tn ? near / tn : 0; return G;
    };
    const mmG = (G) => Object.fromEntries(Object.entries(G).filter(([k]) => k[0] !== '_').map(([k, x]) => [k, +(x * S).toFixed(1)]));
    if (spec.now) { const G = measure(keep, new THREE.Vector3()); rig.set(keep).update(true); return { G: mmG(G), tn: +G._tn.toFixed(2) }; }
    const lerp = (a, b, k) => a + (b - a) * k;
    let shutT = null;
    const poseAt = (cf, ct) => ({ f: fist.f.map((r, i) => r.map((x, j) => lerp(open.f[i][j], x, cf[i]))), t: shutT.map((x, j) => lerp(open.t[j] || 0, x, ct)) });
    const close = (off) => { const cf = [0, 0, 0, 0]; let ct = 0;
      for (let i = 0; i < 5; i++) { const at = (c) => { const f = cf.slice(); let t = ct; if (i < 4) f[i] = c; else t = c; return measure(poseAt(f, t), off)[i < 4 ? 'f' + i : 'thumb']; };
        let lo = 0, hi = 1; if (at(0) > TOL) continue; if (at(1) <= TOL) lo = 1; else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (at(m) <= TOL) lo = m; else hi = m; }
        if (i < 4) cf[i] = lo; else ct = lo; }
      return { cf, ct, G: measure(poseAt(cf, ct), off) }; };
    const res = [], ip = 'xyz'.indexOf(spec.push || 'y'), iA = (ip + 1) % 3, iB = (ip + 2) % 3;
    let mkOff = (a, b, t) => { const o = [0, 0, 0]; o[iA] = a / S; o[iB] = b / S; o[ip] = t; return new THREE.Vector3().fromArray(o); };
    if (spec.pushV) {   // push along any direction in the object's space (+ away from the hand)
      const n = new THREE.Vector3().fromArray(spec.pushV).normalize(), eA = new THREE.Vector3(1, 0, 0); if (Math.abs(n.x) > 0.9) eA.set(0, 1, 0);
      eA.sub(n.clone().multiplyScalar(eA.dot(n))).normalize(); const eB = new THREE.Vector3().crossVectors(n, eA);
      mkOff = (a, b, t) => new THREE.Vector3().addScaledVector(eA, a / S).addScaledVector(eB, b / S).addScaledVector(n, t);
    }
    for (const ti of spec.thumbs.keys()) for (const a of spec.dAs || [0]) for (const b of spec.dBs || [0]) {
      shutT = spec.thumbs[ti];
      const any = (t) => { const G = measure(open, mkOff(a, b, t)); delete G._tn; return Math.max(...Object.values(G)); };
      const R = (spec.range || 60) / S;
      if (any(R) > TOL) continue;
      let lo = -R, hi = R; for (let k = 0; k < 13; k++) { const m = (lo + hi) / 2; if (any(m) > TOL) lo = m; else hi = m; }
      const off = mkOff(a, b, hi), r = close(off), G = r.G, tn = G._tn; delete G._tn;
      const inMax = Math.max(...Object.values(G));
      const fs = ['f0', 'f1', 'f2', 'f3'].map((k) => -G[k]).sort((x, y) => x - y), need = spec.fingers ?? 2;
      let score = Math.max(-G.palm, -G.web, -G.thumb, need ? fs[need - 1] : -1) + (inMax > 0.6 / S ? 1 + inMax : 0);
      if (spec.side) score += (spec.side * 2 / S) * (1 - tn);
      res.push({ score: +(score * S).toFixed(1), ti, a, b, off: off.toArray().map((x) => +(x * S).toFixed(1)), tn: +tn.toFixed(2), G: mmG(G), pose: poseAt(r.cf, r.ct) });
    }
    rig.set(keep).update(true);
    res.sort((x, y) => x.score - y.score);
    return { hull: P.n, res: res.slice(0, spec.top || 4).map((r) => ({ ...r, pose: { f: r.pose.f.map((x) => x.map((q) => +q.toFixed(3))), t: r.pose.t.map((q) => +q.toFixed(3)) } })) };
  };
  return true;
});
