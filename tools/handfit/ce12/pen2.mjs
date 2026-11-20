// CE-12 (cloud): penetration by hand part, against a gun part's own box, plus the hand frame in that part's space.
// page side: window.__pen2(side, parts?) -> { [part]: { box, G: {palm, f0..f3, thumb, web}: mm (+ inside, - clearance) }, ... }
export const install = (ev) => ev(() => {
  const T = TT, THREE = T.THREE;
  const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const group = (b0, b1, w1) => b0 === 0 ? (b1 >= 13 && w1 > 0.2 ? 'web' : 'palm') : b0 >= 13 ? (b0 === 13 ? 'web' : 'thumb') : 'f' + Math.floor((b0 - 1) / 3);
  window.__pen2 = (side = 'l', which = null) => {
    const ud = T.getMarine().userData, gun = T.weaponMeshes[T.getCurrentWeapon()], gd = gun.userData;
    const e = side === 'l' ? ud.elbowLG : ud.elbowRG, wr = e.userData.wrist, rig = wr.userData.hand;
    let sk = null; for (const s of rig.skins) if (vis(s.mesh) && (!sk || s.n > sk.n)) sk = s; if (!sk) return null;
    const m = sk.mesh; m.updateMatrixWorld(true);
    const pos = m.geometry.attributes.position, v = new THREE.Vector3();
    const out = {};
    const parts = which || ['mag', 'slide', 'frame', 'pump', 'cylinder', 'bolt'];
    for (const k of parts) {
      const o = gd[k]; if (!o || !vis(o)) continue;
      o.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(o.matrixWorld).invert(), box = new THREE.Box3();
      o.traverse((q) => { if (!q.isMesh || !q.geometry || !vis(q)) return; if (!q.geometry.boundingBox) q.geometry.computeBoundingBox(); box.union(q.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, q.matrixWorld))); });
      if (box.isEmpty()) continue;
      const s = o.getWorldScale(new THREE.Vector3()).x;
      const G = {}, deep = {};
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        const g = group(sk.seg[i], sk.b1[i], sk.w1[i]);
        let d;
        if (v.x >= box.min.x && v.x <= box.max.x && v.y >= box.min.y && v.y <= box.max.y && v.z >= box.min.z && v.z <= box.max.z) d = Math.min(v.x - box.min.x, box.max.x - v.x, v.y - box.min.y, box.max.y - v.y, v.z - box.min.z, box.max.z - v.z) * s;
        else d = -Math.hypot(Math.max(box.min.x - v.x, 0, v.x - box.max.x), Math.max(box.min.y - v.y, 0, v.y - box.max.y), Math.max(box.min.z - v.z, 0, v.z - box.max.z)) * s;   // (the test page's Box3 has no distanceToPoint)
        if (!(g in G) || d > G[g]) { G[g] = d; deep[g] = [v.x, v.y, v.z].map((x) => +(x * 1000).toFixed(0)); }
      }
      for (const g in G) G[g] = +(G[g] * 1000).toFixed(1);
      const size = box.getSize(new THREE.Vector3()).multiplyScalar(s * 1000);
      out[k] = { G, at: deep, box: { min: box.min.toArray().map((x) => +(x * 1000).toFixed(0)), max: box.max.toArray().map((x) => +(x * 1000).toFixed(0)), mm: size.toArray().map((x) => +x.toFixed(0)), s: +s.toFixed(3) } };
    }
    return out;
  };
  return true;
});
