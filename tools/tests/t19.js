(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
  T.unlockAllBuilds(); T.addCash(100000);
  const p = T.player.position;
  {
    const tx = 24, tz = 20;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  // Keep HQ / base kit build
  const r = T.devBaseBuild();
  ok(r.n > 20 && r.failed.length === 0, 'devBaseBuild pieces ' + r.n + ' failed ' + r.failed.length + (r.failed.length ? ' ' + r.failed.join('|') : ''));
  const cnt = (t) => T.builds.filter(b => b.type === t).length;
  ok(cnt('wall') >= 8 && cnt('spikes') >= 1, 'base has walls and spikes (walls ' + cnt('wall') + ', spikes ' + cnt('spikes') + ')');
  // Stand on an upper floor if the keep has one
  const floors = T.builds.filter(b => b.type === 'floor' && b.level === 1).sort((a, b) => a.x - b.x);
  ok(floors.length >= 1, 'keep has upper floors: ' + floors.length);
  const fl = floors[Math.min(8, floors.length - 1)];
  p.set(fl.x, fl.deck ? fl.deck.deckY : fl.mesh.position.y + 0.2, fl.z);
  await wait(100);
  if (T.runDevCommand) T.runDevCommand('godmode');
  if (T.skipGrace) T.skipGrace();
  if (T.runDevCommand) T.runDevCommand('swarm');
  else if (T.devSwarm) T.devSwarm();
  // Time-capped: zombies must show up within ~15s (not a 120s soak)
  let alive = 0;
  for (let i = 0; i < 30; i++) {
    await wait(500);
    alive = T.zombies.filter(z => z.alive).length;
    if (alive >= 5) break;
  }
  ok(alive >= 5, 'hunt swarm produced zombies within 15s: ' + alive);
  const inside = T.zombies.filter(z => {
    if (!z.alive) return false;
    const zp = z.mesh.position;
    return Math.abs(zp.x - fl.x) < 20 && Math.abs(zp.z - fl.z) < 20;
  }).length;
  out.push('DEBUG inside~' + inside + ' walls ' + cnt('wall') + ' builds ' + T.builds.length);
  ok(T.builds.length >= r.n * 0.5, 'base still mostly standing under pressure: ' + T.builds.length);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
