(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1200);
  const p = T.player.position;
  const n0 = T.builds.length;
  T.runDevCommand('basebuild');
  const made = T.builds.slice(n0);
  const kinds = {};
  for (const b of made) kinds[b.type] = (kinds[b.type] || 0) + 1;
  out.push('  built ' + made.length + ': ' + JSON.stringify(kinds));
  const want = ['floor', 'wall', 'platform', 'pillar', 'stairs', 'railing', 'barricade', 'sandbag', 'wire', 'spikes', 'mine', 'lure', 'light', 'flame', 'heavy', 'mortar'];
  ok(want.every(k => kinds[k]), 'basebuild uses every piece: missing ' + want.filter(k => !kinds[k]).join(','));
  ok(made.some(b => b.opening === 'door') || T.builds.some(b => b.opening === 'door'), 'with a door');
  ok(T.builds.some(b => b.opening === 'window'), 'and windows');
  ok(made.some(b => b.type === 'floor' && b.level === 2), 'three floors (a roof at level 2)');
  const st = made.find(b => b.type === 'stairs');
  ok(st && st.level === 1 && st.rise > 1.5, 'stairs on the ground floor reaching up (lv ' + (st && st.level) + ', rise ' + (st && st.rise && st.rise.toFixed(2)) + ')');
  // swarm
  T.runDevCommand('nodead');
  T.runDevCommand('swarm');
  const zs = T.zombies.filter(z => z.alive);
  ok(zs.length >= 90, 'swarm spawned ' + zs.length);
  const types = new Set(zs.map(z => z.typeKey));
  ok(types.size >= 10, 'every kind: ' + [...types].join(','));
  const d = zs.map(z => Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z));
  ok(Math.min(...d) > 30, 'they start out on the ring (nearest ' + Math.min(...d).toFixed(0) + 'm)');
  await wait(3000);
  const d2 = T.zombies.filter(z => z.alive).map(z => Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok(avg(d2) < avg(d), 'and close in even with nodead on (' + avg(d).toFixed(0) + ' -> ' + avg(d2).toFixed(0) + ')');
  return out.join('\n');
})()
