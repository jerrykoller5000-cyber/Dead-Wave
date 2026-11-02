// tgb269 - GB-269 (temporary): the GW-4, AK and Wasp keep every vertex where it was (unique world-space points, rounded to
// 0.1 mm, count and sum), and name their parts for the view gun: gun.userData.fpStock ('fp-stock') and gun.userData.work,
// each a direct child of the gun (docs/contracts.md). Prints the numbers so a before and an after can be compared.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  try {
    await startMatch(T, 'Hollows');
    const V = new T.THREE.Vector3();
    for (const k of ['m4', 'ak', 'uzi']) {
      const g = T.weaponMeshes[k]; if (!g) { ok(false, k + ' model'); continue; }
      const vis = g.visible; g.visible = true; g.updateMatrixWorld(true);
      const inv = g.matrixWorld.clone().invert();
      const pts = new Set(); let draws = 0;
      g.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || o === g.userData.laser || o === g.userData.flash) return;
        let p = o, shown = true; while (p && p !== g) { if (p.name === 'suppressor') { shown = false; break; } p = p.parent; }
        if (!shown) return;
        draws++;
        const P = o.geometry.attributes.position, M = inv.clone().multiply(o.matrixWorld);
        for (let i = 0; i < P.count; i++) { V.fromBufferAttribute(P, i).applyMatrix4(M); pts.add(Math.round(V.x * 1e4) + ',' + Math.round(V.y * 1e4) + ',' + Math.round(V.z * 1e4)); }
      });
      let sx = 0, sy = 0, sz = 0; for (const s of pts) { const [a, b, c] = s.split(',').map(Number); sx += a; sy += b; sz += c; }
      info(k + ': ' + pts.size + ' points, sum ' + sx + ' ' + sy + ' ' + sz + ', ' + draws + ' meshes');
      const ud = g.userData;
      if (k !== 'uzi') ok(!!ud.fpStock && ud.fpStock.parent === g && ud.fpStock.name === 'fp-stock', k + ': gun.userData.fpStock is a direct child named fp-stock');
      ok(!!ud.work && ud.work.parent === g, k + ': gun.userData.work is a direct child');
      ok(!!ud.mag && ud.mag.parent === g, k + ': the mag is still a direct child');
      g.visible = vis;
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()