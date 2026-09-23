(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // Play needs a callsign; without a live match the swarm still spawns but AI never ticks.
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
  // Insertion owns the marine for ~9s; park him once teleports stick so the swarm ring is stable.
  {
    const pl = T.player.position;
    const tx = 2, tz = -4;
    for (let i = 0; i < 70; i++) {
      await wait(200);
      pl.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(30);
      if (Math.hypot(pl.x - tx, pl.z - tz) < 0.4) break;
    }
  }
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
  // swarm — nodead freezes the wave clock; swarm still hunts once grace is cleared.
  T.runDevCommand('nodead');
  T.runDevCommand('swarm');
  if (T.skipGrace) T.skipGrace();
  const zs = T.zombies.filter(z => z.alive);
  ok(zs.length >= 90, 'swarm spawned ' + zs.length);
  const types = new Set(zs.map(z => z.typeKey));
  ok(types.size >= 10, 'every kind: ' + [...types].join(','));
  const d = zs.map(z => Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z));
  ok(Math.min(...d) > 30, 'they start out on the ring (nearest ' + Math.min(...d).toFixed(0) + 'm)');
  await wait(5000);
  const d2 = T.zombies.filter(z => z.alive).map(z => Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok(avg(d2) < avg(d), 'and close in even with nodead on (' + avg(d).toFixed(0) + ' -> ' + avg(d2).toFixed(0) + ')');
  return out.join('\n');
})()
