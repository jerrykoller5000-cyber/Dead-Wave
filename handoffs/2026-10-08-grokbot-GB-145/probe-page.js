// GB-145 probe, evaluated in the page: per gun, single and akimbo, at sampled reload beats, where each hand and each
// magazine is. Returns rows. window.__gb145probe(opts) -> Promise<rows>
window.__gb145probe = async function (opts = {}) {
  const T = window.TT, THREE = T.THREE || window.THREE, V = () => new THREE.Vector3();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const R = T.reloadClipDbg;
  const m = T.marine || window.worldMarine, ud = m.userData;
  const handL = () => ud.elbowLG.localToWorld(V().set(0.02, -0.27, 0.13));
  const handR = () => ud.elbowRG.localToWorld(V().set(-0.01, -0.26, 0.12));
  const shown = (o) => { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === T.scene) break; } return true; };
  const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
  const aimer = setInterval(pin, 5); pin();
  const rows = [];
  const guns = opts.guns || ['pistol', 'uzi', 'm4', 'ak', 'aa12', 'sniper', 'revolver', 'shotgun', 'launcher', 'minigun'];
  const US = opts.us || [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.97];
  try {
    for (const w of guns) for (const aki of (['pistol', 'uzi', 'revolver'].includes(w) ? [false, true] : [false])) {
      if (opts.akimboOnly && !aki) continue;
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
      await wait(opts.settle || 2600);
      if (T.getCurrentWeapon() !== w) { rows.push({ w, aki, err: 'could not take it' }); continue; }
      const isAki = () => !!(T.akimboOn ? T.akimboOn() : false);
      const dualNow = () => !!T.offhandMeshes[w] && T.offhandMeshes[w].visible;
      if (aki !== dualNow()) { T.toggleDualWieldDbg(); await wait(900); }
      const gunsNow = [T.weaponMeshes[w]]; if (aki && T.offhandMeshes[w]) gunsNow.push(T.offhandMeshes[w]);
      // seated feet, gun space
      const seat = gunsNow.map((g) => {
        const mag = g.userData.mag; if (!mag || !g.userData.baseMagPos) return null;
        g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mag);
        const foot = V().set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
        return { inMag: mag.worldToLocal(foot.clone()), inGun: g.worldToLocal(foot.clone()), len: box.max.y - box.min.y };
      });
      T.setAmmoDbg(w, 1);
      if (T.setMagazinesDbg && ['pistol', 'uzi', 'm4', 'ak', 'aa12', 'sniper', 'revolver', 'minigun'].includes(w)) T.setMagazinesDbg(w, 1, [99, 99, 99], 1);
      T.startReload();
      await wait(60);
      const started = T.getReloadDbg().weapon === w || !!T.getReloadDbg().timer;
      for (const u of US) {
        R.hold(u); await wait(opts.beat || 350);
        m.updateMatrixWorld(true);
        const hl = handL(), hr = handR();
        const row = { w, aki, u, started, hL: hl.toArray().map((x) => +x.toFixed(3)), hR: hr.toArray().map((x) => +x.toFixed(3)), guns: [] };
        gunsNow.forEach((g, gi) => {
          g.updateMatrixWorld(true);
          const s = seat[gi], mag = g.userData.mag, e = { gi };
          e.grip = g.localToWorld(V().fromArray(T.getShoulderDbg ? T.getShoulderDbg().holds[w].grip : [0, 0, 0]));
          if (s && mag) {
            const footNow = mag.localToWorld(s.inMag.clone()), well = g.localToWorld(s.inGun.clone());
            e.magShown = shown(mag);
            e.dWell = +footNow.distanceTo(well).toFixed(3);
            e.dHandL = +footNow.distanceTo(hl).toFixed(3); e.dHandR = +footNow.distanceTo(hr).toFixed(3);
            e.wellHL = +well.distanceTo(hl).toFixed(3); e.wellHR = +well.distanceTo(hr).toFixed(3);
          }
          if (g.userData.reloadShell) { const rs = g.userData.reloadShell; e.shellShown = shown(rs); const p = rs.getWorldPosition(V()); e.shellHL = +p.distanceTo(hl).toFixed(3); }
          e.gripHR = +e.grip.distanceTo(hr).toFixed(3); e.gripHL = +e.grip.distanceTo(hl).toFixed(3); delete e.grip;
          row.guns.push(e);
        });
        rows.push(row);
      }
      R.hold(null);
      for (let i = 0; i < 80 && T.getReloadDbg().weapon; i++) await wait(100);
      if (aki) { T.toggleDualWieldDbg(); await wait(600); }
    }
  } finally { clearInterval(aimer); R.hold(null); }
  return rows;
};
