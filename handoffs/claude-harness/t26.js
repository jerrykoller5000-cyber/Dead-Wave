(async () => {
  const T = window.TT; const wait = (ms) => new Promise(r => setTimeout(r, ms)); const out = [];
  document.getElementById('modeHunt').click(); await wait(1200);
  const r = T.devBaseBuild();
  out.push('pieces ' + r.n + ' failed: ' + r.failed.join('|'));
  const tally = {};
  const add = (k) => tally[k] = (tally[k] || 0) + 1;
  for (const b of T.builds) {
    if (b.type === 'wall') { add('wall t' + (b.tier | 0)); if (b.opening === 'door') add('door t' + (b.doorTier | 0)); if (b.opening === 'window') add('window ' + (b.barred ? 'barred' : 'open')); }
    if (b.type === 'floor') add('floor t' + (b.tier | 0));
    if (b.range > 0 && b.type !== 'mortar') add(b.type + ' Mk' + ((b.tier | 0) + 1));
    if (b.opening === 'gate') add(b.type + ' gate t' + (b.gateTier | 0));
  }
  out.push(Object.keys(tally).sort().map(k => k + ': ' + tally[k]).join('\n'));
  return out.join('\n');
})()
