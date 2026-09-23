(async () => {
  const T = window.TT; const wait = (ms) => new Promise(r => setTimeout(r, ms)); const out = [];
  document.getElementById('modeHunt').click(); await wait(1200);
  for (const tk of ['shambler', 'brute', 'military', 'spider']) {
    const z = T.spawnZombie(T.player.position.x + 20, T.player.position.z, tk, true);
    const ud = z.mesh.userData;
    const named = new Map(); for (const [k, v] of Object.entries(ud)) if (v && v.isObject3D) named.set(v, k);
    const rows = [];
    const walk = (o, depth) => {
      let direct = 0, mats = new Set();
      for (const c of o.children) if (c.isMesh && c.visible) { direct++; mats.add(c.material); }
      if (direct) rows.push((named.get(o) || o.type) + ':' + direct + 'm/' + mats.size + 'mat');
      for (const c of o.children) if (!c.isMesh || c.children.length) walk(c, depth + 1);
    };
    walk(z.mesh, 0);
    let tot = 0; z.mesh.traverse(o => { if (o.isMesh && o.visible) tot++; });
    out.push(tk + ' total ' + tot + ': ' + rows.join(' '));
  }
  return out.join('\n');
})()
