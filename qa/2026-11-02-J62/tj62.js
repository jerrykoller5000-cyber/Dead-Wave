// tj62 - J62 for GP-20016 (temporary): the launcher keeps every vertex where it was (unique gun-space points,
// 0.1 mm, count and sum) and carries a direct-child gun.userData.fpStock ('fp-stock') holding the stock tube,
// olive body, rubber pad and the two side slabs with their bolts; the drum stays a direct child.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  try {
    await startMatch(T, 'Hollows');
    const V = new T.THREE.Vector3();
    const pointsOf = (g, root) => {
      g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert(); const pts = []; let draws = 0;
      root.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || o === g.userData.laser || o === g.userData.flash) return;
        let p = o, shown = true; while (p && p !== g) { if (p.name === 'suppressor') { shown = false; break; } p = p.parent; }
        if (!shown) return; draws++;
        const P = o.geometry.attributes.position, M = inv.clone().multiply(o.matrixWorld);
        for (let i = 0; i < P.count; i++) { V.fromBufferAttribute(P, i).applyMatrix4(M); pts.push([V.x, V.y, V.z]); }
      });
      return { pts, draws };
    };
    const g = T.weaponMeshes.launcher;
    if (!g) ok(false, 'launcher model');
    else {
      const vis = g.visible; g.visible = true;
      const { pts, draws } = pointsOf(g, g);
      const set = new Set(pts.map(([x, y, z]) => Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4)));
      let sx = 0, sy = 0, sz = 0; for (const s of set) { const [a, b, c] = s.split(',').map(Number); sx += a; sy += b; sz += c; }
      info('launcher: ' + set.size + ' points, sum ' + sx + ' ' + sy + ' ' + sz + ', ' + draws + ' meshes');
      const st = g.userData.fpStock;
      ok(!!st && st.parent === g && st.name === 'fp-stock', 'launcher: gun.userData.fpStock is a direct child named fp-stock');
      if (st) {
        const s = pointsOf(g, st); let zmax = -9, zmin = 9; for (const p of s.pts) { zmax = Math.max(zmax, p[2]); zmin = Math.min(zmin, p[2]); }
        info('launcher: fp-stock ' + s.draws + ' meshes, ' + s.pts.length + ' verts, z ' + zmin.toFixed(3) + ' to ' + zmax.toFixed(3));
        ok(s.draws >= 1 && s.pts.length > 0, 'launcher: fp-stock holds the stock parts (' + s.draws + ' meshes after the per-material merge)');
        ok(zmax <= -0.249, 'launcher: nothing in fp-stock reaches forward of the stock tube (front z ' + zmax.toFixed(3) + ')');
      }
      ok(!!g.userData.drum && g.userData.drum.parent === g && g.userData.mag === g.userData.drum, 'launcher: the drum is still a direct child and the mag');
      g.visible = vis;
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()