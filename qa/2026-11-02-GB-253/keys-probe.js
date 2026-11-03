(() => {
  const zs = TT.zombies; const u = new Map(); const shapes = new Map();
  for (const z of zs) { const ks = Object.keys(z); const sig = ks.join(','); shapes.set(sig, (shapes.get(sig) || 0) + 1);
    for (const k of ks) { const t = z[k] === null ? 'null' : typeof z[k]; if (!u.has(k)) u.set(k, new Set()); u.get(k).add(t); } }
  return JSON.stringify({ live: zs.length, shapes: shapes.size, maxKeys: Math.max(0, ...zs.map(z => Object.keys(z).length)), minKeys: Math.min(999, ...zs.map(z => Object.keys(z).length)), keys: [...u].map(([k, s]) => k + ':' + [...s].join('|')) });
})()
