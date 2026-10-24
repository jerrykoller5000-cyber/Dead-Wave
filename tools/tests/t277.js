// t277 - GB-222 (D-87, for CL-249 true first person): each gun's sight point (game/sight-points.js) sits on its own
// gun: above the bore, behind the muzzle, over its centre line, looking along the bore within a few degrees. It also
// measures every gun (INFO lines: muzzle, box, rear/front top of the sight strip) so the table can be re-derived.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Sights');
    const THREE = T.THREE, V = (x, y, z) => new THREE.Vector3(x, y, z), f3 = (p) => [p.x, p.y, p.z].map((v) => v.toFixed(3)).join(',');
    let SIGHT = null; try { SIGHT = (await import('/game/sight-points.js')).SIGHT; } catch (e) { out.push('INFO no game/sight-points.js yet: ' + e.message); }
    for (const [k, gun] of Object.entries(T.weaponMeshes)) {
      gun.updateMatrixWorld(true); const inv = gun.matrixWorld.clone().invert();
      const mz = (gun.userData.muzzleBase || gun.userData.muzzleLocal || V(0, 0, 0)).clone();
      const pts = [];
      gun.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        for (let q = o; q && q !== gun; q = q.parent) if (!q.visible) return;
        if (o === gun.userData.flash || /flash|laser|beam/i.test(o.name || '')) return;
        const m = inv.clone().multiply(o.matrixWorld), pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 3000));
        for (let i = 0; i < pa.count; i += st) { const q = V().fromBufferAttribute(pa, i).applyMatrix4(m); if (q.z <= Math.max(mz.z, 0) + 0.05) pts.push(q); }
      });
      const bb = new THREE.Box3().setFromPoints(pts);
      out.push('INFO ' + k + ' muzzle ' + f3(mz) + ' box ' + f3(bb.min) + ' / ' + f3(bb.max));
      const dirZ = mz.z >= (bb.min.z + bb.max.z) / 2 ? 1 : -1, z0 = dirZ > 0 ? bb.min.z : bb.max.z, len = Math.abs(mz.z - z0) || 1;
      const strip = pts.filter((p) => Math.abs(p.x - mz.x) < 0.015);
      const at = (p) => (p.z - z0) * dirZ / len;
      const top = (a, b) => strip.filter((p) => at(p) >= a && at(p) <= b).reduce((m, p) => (!m || p.y > m.y ? p : m), null);
      const rear = top(0.25, 0.6), front = top(0.75, 1.02);
      out.push('INFO ' + k + ' dir ' + dirZ + ' rearTop ' + (rear ? f3(rear) : '-') + ' frontTop ' + (front ? f3(front) : '-'));
      if (!SIGHT) continue;
      const s = SIGHT[k]; ok(!!s, k + ': has a sight point'); if (!s) continue;
      const p = V(...s.pos), f = V(...s.fwd).normalize(), ang = Math.acos(Math.min(1, f.z * dirZ)) * 180 / Math.PI;
      ok(p.y > mz.y && (mz.z - p.z) * dirZ > 0.1 && Math.abs(p.x - mz.x) < 0.02 && ang < 4, k + ': eye above the bore, behind the muzzle, on its centre line, along it (' + ang.toFixed(2) + ' deg)');
      ok(s.kind === 'optic' ? p.y < bb.max.y && p.y > bb.max.y - 0.06 : p.y >= (rear ? rear.y : bb.max.y) - 0.005 && p.y <= bb.max.y + 0.08, k + ': eye clears the top line and stays near it (eye y ' + p.y.toFixed(3) + ', top ' + bb.max.y.toFixed(3) + ')');
    }
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  return out.join('\n');
})()