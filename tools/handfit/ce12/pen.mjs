// no-penetration check per pose: the support glove's vertices against the magazine's and the slide's own boxes (mm inside)
const L = await import('/home/claude/ce12/lib.mjs?t=' + Date.now());
export default async ({ ev, log }) => {
  const res = {};
  for (const g of (await ev(() => window.__penGuns)) || ['pistol', 'm4', 'ak', 'aa12', 'shotgun', 'revolver']) {
    await L.equip(ev, g, { settle: 1.5 });
    await ev((g) => { const T = TT; const m = T.magazinesDbg(g); if (m) T.setMagazinesDbg(g, 1, [99, 99, 99]); else T.setAmmoDbg(g, 1); T.reloadClipDbg.hold(0.0); T.startReload(); }, g);
    const rows = [];
    for (let u = 0.04; u < 0.97; u += 0.04) {
      await ev((u) => { window.__held = false; TT.reloadClipDbg.hold(u); }, +u.toFixed(2)); await ev(() => window.__sim(0.25));
      rows.push(await ev((u) => {
        const T = TT, THREE = T.THREE, ud = T.getMarine().userData, gun = T.weaponMeshes[T.getCurrentWeapon()];
        const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
        const glove = (e) => { const rig = e.userData.wrist && e.userData.wrist.userData.hand; let best = null; if (rig) for (const sk of rig.skins) if (vis(sk.mesh) && (!best || sk.n > best.n)) best = sk; return best && best.mesh; };
        const parts = {}; const gd = gun.userData;
        for (const [k, o] of [['mag', gd.mag], ['slide', gd.slide], ['frame', gd.frame], ['pump', gd.pump], ['cyl', gd.cylinder]]) if (o && vis(o)) parts[k] = o;
        const out = { u: +u.toFixed(2) };
        for (const [side, e] of [['l', ud.elbowLG], ['r', ud.elbowRG]]) {
          const m = glove(e); if (!m) continue; m.updateMatrixWorld(true);
          const pos = m.geometry.attributes.position, v = new THREE.Vector3();
          for (const [k, o] of Object.entries(parts)) {
            o.updateMatrixWorld(true);
            const box = new THREE.Box3(); const inv = new THREE.Matrix4().copy(o.matrixWorld).invert();
            o.traverse((q) => { if (!q.isMesh || !q.geometry || !vis(q)) return; if (!q.geometry.boundingBox) q.geometry.computeBoundingBox(); box.union(q.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, q.matrixWorld))); });
            if (box.isEmpty()) continue;
            const s = o.getWorldScale(new THREE.Vector3()).x;
            let worst = 0;
            for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
              if (box.containsPoint(v)) { const d = Math.min(v.x - box.min.x, box.max.x - v.x, v.y - box.min.y, box.max.y - v.y, v.z - box.min.z, box.max.z - v.z) * s; if (d > worst) worst = d; } }
            if (worst > 0.0005) out[side + ':' + k] = +(worst * 1000).toFixed(1);
          }
        }
        return out;
      }, u));
    }
    await ev(() => { window.__held = false; TT.reloadClipDbg.hold(null); }); await ev(() => window.__sim(2));
    res[g] = rows.filter((r) => Object.keys(r).length > 1);
    log('pen', g, JSON.stringify(res[g]));
  }
  return res;
};
