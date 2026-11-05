import fs from 'fs';
const { deopts, mapEv } = JSON.parse(fs.readFileSync('qa/2026-11-03-GB-272/maps-events.json','utf8'));
for (const s of [44,54,63]) {
  const ds = deopts.filter(t => Math.round(t/1e6)===s); const t0 = Math.min(...ds), t1 = Math.max(...ds);
  console.log('== burst', s, 'first', t0, 'last', t1, 'n', ds.length);
  const near = mapEv.filter(([t]) => t >= t0 - 30000 && t <= t0 + 2000);
  console.log('events within 30 ms before first deopt:', near.length);
  for (const [t, l] of near.slice(-14)) console.log(t - t0, l);
}
