// t66 — CL-18: puddles lie on the ground. Each is draped over the terrain under it, so no
// half of it sinks into a slope, and they only gather on nearly flat ground.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Puddles');
    T.weather.raining = true; T.weather.rainTimeLeft = 120; T.weather.intensity = 0.9;
    const vis = () => T.getPuddles().filter((p) => p.active && p.mesh.visible);
    await until(() => vis().length >= 3 && vis().some((p) => p.wetness > 0.3), 30000);
    const list = vis();
    ok(list.length >= 3, 'it rains and puddles gather: ' + list.length);
    let worstBelow = Infinity, worstAbove = -Infinity, spread = 0, n = 0;
    for (const p of list) {
      const P = p.mesh.geometry.attributes.position.array;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < P.length; i += 3) {
        const d = P[i + 1] - T.sampleHeight(P[i], P[i + 2]);
        worstBelow = Math.min(worstBelow, d); worstAbove = Math.max(worstAbove, d);
        lo = Math.min(lo, P[i + 1]); hi = Math.max(hi, P[i + 1]); n++;
      }
      spread = Math.max(spread, hi - lo);
    }
    ok(worstBelow >= 0.02 && worstAbove <= 0.06, 'every vertex sits just over the ground: ' + worstBelow.toFixed(3) + '..' + worstAbove.toFixed(3) + ' m (' + n + ' vertices)');
    ok(list.every((p) => p.drawR > 0.2 && p.drawR <= p.baseR + 0.01), 'draped at their current size');
    ok(list.every((p) => T.terrainSlope(p.x, p.z) <= 0.05), 'only on nearly flat ground');
    out.push('INFO largest height change across one puddle: ' + spread.toFixed(3) + ' m');
    T.weather.raining = false; T.weather.intensity = 0;
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
