(async () => {
  const T = window.TT; const wait = (ms) => new Promise(r => setTimeout(r, ms)); const out = [];
  document.getElementById('modeHunt').click(); await wait(1200);
  const r = T.devBaseBuild();
  out.push('pieces ' + r.n + ' failed ' + r.failed.length + ' ' + r.failed.join('|'));
  const cnt = (t) => T.builds.filter(b => b.type === t).length;
  const kinds = {}; for (const b of T.builds) kinds[b.type] = (kinds[b.type] || 0) + 1; out.push(JSON.stringify(kinds));
  // stand on the keep's upper floor
  const fl = T.builds.filter(b => b.type === 'floor' && b.level === 1).sort((a, b) => a.x - b.x)[8];
  T.player.position.set(fl.x, fl.deck ? fl.deck.deckY : fl.mesh.position.y + 0.2, fl.z);
  T.runDevCommand('godmode'); T.runDevCommand('swarm');
  const t0 = performance.now(); let frames0 = T.frameCount ? T.frameCount() : 0;
  for (let s = 10; s <= 120; s += 10) {
    await wait(10000);
    const alive = T.zombies.filter(z => z.alive);
    const inside = alive.filter(z => { const p = z.mesh.position; return Math.abs(p.x - fl.x) < 14 && Math.abs(p.z - fl.z) < 14; }).length;
    out.push(s + 's alive ' + alive.length + ' insideWalls~' + inside + ' walls ' + cnt('wall') + ' spikes ' + cnt('spikes') + ' mines ' + cnt('mine') + ' wire ' + cnt('wire') + ' barricade ' + cnt('barricade') + ' turrets ' + (cnt('light') + cnt('heavy') + cnt('flame')) + ' builds ' + T.builds.length);
  }
  return out.join('\n');
})()
