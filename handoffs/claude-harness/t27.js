(async () => {
  const T = window.TT; const wait = (ms) => new Promise(r => setTimeout(r, ms)); const out = [];
  document.getElementById('modeHunt').click(); await wait(1200);
  const visible = (o) => { let p = o; while (p) { if (p.visible === false) return false; p = p.parent; } return true; };
  const countIn = (root) => { let n = 0; root.traverse(o => { if (o.isMesh && visible(o)) n++; }); return n; };
  const tally = () => {
    const owner = new Map();
    for (const b of T.builds) owner.set(b.mesh, 'build:' + b.type);
    for (const z of T.zombies) owner.set(z.mesh, 'zombie');
    const t = {}; let total = 0;
    for (const c of T.scene.children) {
      const n = countIn(c); if (!n) continue; total += n;
      const k = owner.get(c) || (c.isInstancedMesh ? 'instanced' : (c.name || c.type || 'other'));
      t[k] = (t[k] || 0) + n;
    }
    return { total, t };
  };
  const a = tally();
  out.push('EMPTY WORLD visible meshes: ' + a.total);
  const r = T.devBaseBuild(); await wait(300);
  const b = tally();
  out.push('AFTER BASEBUILD: ' + b.total);
  out.push(Object.entries(b.t).filter(([k]) => k.startsWith('build')).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ' ' + v + ' (' + (v / T.builds.filter(q => 'build:' + q.type === k).length).toFixed(1) + '/piece)').join('\n'));
  T.runDevCommand('swarm'); await wait(500);
  const c = tally();
  out.push('AFTER SWARM: ' + c.total + ' zombies ' + (c.t.zombie || 0) + ' (' + ((c.t.zombie || 0) / T.zombies.filter(z => z.alive).length).toFixed(1) + '/zombie)');
  out.push('other: ' + Object.entries(c.t).filter(([k]) => !k.startsWith('build') && k !== 'zombie').sort((x, y) => y[1] - x[1]).slice(0, 12).map(([k, v]) => k + ' ' + v).join(', '));
  // walls by tier
  const byTier = {}; for (const bb of T.builds) if (bb.type === 'wall') { const k = 't' + (bb.tier | 0) + (bb.opening ? '-' + bb.opening : ''); byTier[k] = byTier[k] || [0, 0]; byTier[k][0]++; byTier[k][1] += countIn(bb.mesh); }
  out.push('walls: ' + Object.entries(byTier).map(([k, v]) => k + ' ' + (v[1] / v[0]).toFixed(1) + '/wall').join(', '));
  return out.join('\n');
})()
