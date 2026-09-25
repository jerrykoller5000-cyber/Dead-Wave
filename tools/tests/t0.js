// t0 - GB-45 (GB-A9): the page's test hooks are up.
(() => {
  const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const T = window.TT, keys = T ? Object.keys(T).length : 0;
  out.push(JSON.stringify({ tt: !!T, keys }));
  ok(!!T && typeof T === 'object', 'window.TT is up');
  const core = ['player', 'camera', 'getPhase', 'spawnZombie', 'zombies', 'builds', 'POI', 'sampleHeight', 'placeBuildAt'];
  const missing = core.filter((k) => !T || !(k in T));
  ok(keys >= 300 && !missing.length, keys + ' keys, core hooks ' + (missing.length ? 'missing ' + missing.join(',') : 'all there'));
  return out.join('\n');
})()
