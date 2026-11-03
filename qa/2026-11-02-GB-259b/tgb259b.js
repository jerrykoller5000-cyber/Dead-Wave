// tgb259b - GB-259 for GP-20014 (temporary): the shotgun, Breacher-12 and sniper keep every vertex where it was
// (unique gun-space points, 0.1 mm, count and sum) and carry a direct-child gun.userData.fpStock ('fp-stock');
// the revolver's hammer stays at least 5 mm under the sight line (notch .114 @ -0.05 to blade .121 @ .318) at rest.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  try {
    await startMatch(T, 'Hollows');
    const V = new T.THREE.Vector3();
    const pointsOf = (g, root, skip) => {
      g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert(); const pts = []; let draws = 0;
      root.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || o === g.userData.laser || o === g.userData.flash) return;
        let p = o, shown = true; while (p && p !== g) { if (p.name === 'suppressor' || (skip && skip(p))) { shown = false; break; } p = p.parent; }
        if (!shown) return; draws++;
        const P = o.geometry.attributes.position, M = inv.clone().multiply(o.matrixWorld);
        for (let i = 0; i < P.count; i++) { V.fromBufferAttribute(P, i).applyMatrix4(M); pts.push([V.x, V.y, V.z]); }
      });
      return { pts, draws };
    };
    for (const k of ['shotgun', 'aa12', 'sniper']) {
      const g = T.weaponMeshes[k]; if (!g) { ok(false, k + ' model'); continue; }
      const vis = g.visible; g.visible = true;
      const { pts, draws } = pointsOf(g, g);
      const set = new Set(pts.map(([x, y, z]) => Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4)));
      let sx = 0, sy = 0, sz = 0; for (const s of set) { const [a, b, c] = s.split(',').map(Number); sx += a; sy += b; sz += c; }
      info(k + ': ' + set.size + ' points, sum ' + sx + ' ' + sy + ' ' + sz + ', ' + draws + ' meshes');
      const st = g.userData.fpStock;
      ok(!!st && st.parent === g && st.name === 'fp-stock', k + ': gun.userData.fpStock is a direct child named fp-stock');
      if (st) {
        const s = pointsOf(g, st).pts; let zmax = -9; for (const p of s) zmax = Math.max(zmax, p[2]);
        info(k + ': fp-stock ' + s.length + ' verts, its front at z ' + zmax.toFixed(3));
      }
      if (k !== 'shotgun') ok(!!g.userData.mag && g.userData.mag.parent === g, k + ': the mag is still a direct child');
      g.visible = vis;
    }
    const r = T.weaponMeshes.revolver;
    if (!r || !r.userData.hammer) ok(false, 'revolver hammer');
    else {
      const vis = r.visible; r.visible = true; const hm = r.userData.hammer; const base = hm.rotation.x;
      const line = (z) => 0.114 + (z + 0.05) * (0.007 / 0.368);
      for (const [name, rx] of [['rest', base], ['cocked', base - 0.55]]) {
        hm.rotation.x = rx; hm.updateMatrixWorld(true);
        const { pts } = pointsOf(r, hm); let worst = 9, at = null, top = -9;
        for (const p of pts) { if (Math.abs(p[0]) > 0.012) continue; const c = line(p[2]) - p[1]; if (c < worst) { worst = c; at = p; } top = Math.max(top, p[1]); }
        info('revolver hammer ' + name + ': top y ' + top.toFixed(4) + ', least clearance under the line ' + (worst * 1000).toFixed(1) + ' mm at z ' + at[2].toFixed(3) + ' y ' + at[1].toFixed(4));
        if (name === 'rest') ok(worst >= 0.005, 'revolver: the idle hammer is at least 5 mm under the sight line (' + (worst * 1000).toFixed(1) + ' mm)');
      }
      hm.rotation.x = base; r.visible = vis;
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()