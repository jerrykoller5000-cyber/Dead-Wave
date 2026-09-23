(async () => {
  const T = window.TT; const out = []; const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1200);
  const p = T.player.position; p.set(40, T.sampleHeight(40, 40), 40); await wait(100);
  const before = T.landmarks.filter(l => l.kind === 'barrel').length;
  const r = T.devBaseBuild(); await wait(300);
  const xs = T.builds.map(b => b.x), zs = T.builds.map(b => b.z);
  const bx = [Math.min(...xs), Math.max(...xs)], bz = [Math.min(...zs), Math.max(...zs)];
  out.push('builds box ' + bx + ' / ' + bz + ' barrels before ' + before + ' after ' + T.landmarks.filter(l => l.kind === 'barrel').length);
  for (const l of T.landmarks.filter(l => l.alive && l.kind === 'barrel')) {
    const near = T.builds.filter(b => Math.abs(b.x - l.x) < 3 && Math.abs(b.z - l.z) < 3);
    if (near.length) out.push('barrel ' + l.x.toFixed(1) + ',' + l.z.toFixed(1) + ' near ' + near.map(b => b.type).join(','));
  }
  const f1 = T.builds.filter(b => b.type === 'floor' && b.level === 1 && b.deck).map(b => (b.gx) + ',' + b.gz + ':' + b.deck.deckY.toFixed(2) + (b.spanDepth ? 's' + b.spanDepth : ''));
  out.push(f1.join(' '));
  return out.join('\n');
})()
