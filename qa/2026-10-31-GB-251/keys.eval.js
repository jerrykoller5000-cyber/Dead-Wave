(() => {
  const T = window.TT || {};
  let get = T.getZombies;
  if (!get) for (const k of Object.keys(T)) { const v = T[k]; if (v && typeof v === 'object' && typeof v.getZombies === 'function') { get = v.getZombies; break; } }
  const zs = get ? get() : null;
  if (!zs) return { found: false, ttKeys: Object.keys(T).filter((k) => /ombie/.test(k)).slice(0, 20) };
  const alive = zs.filter((z) => z.alive);
  const counts = alive.map((z) => Object.keys(z).length).sort((a, b) => a - b);
  const kinds = {}; for (const z of alive) kinds[z.typeKey] = (kinds[z.typeKey] || 0) + 1;
  return { found: true, n: zs.length, alive: alive.length, keysMin: counts[0], keysMedian: counts[counts.length >> 1], keysMax: counts[counts.length - 1], kinds };
})()