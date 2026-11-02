// t323 - CU-216: the ring outside each clearing is that place's trees.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const poi = T.POI;
    const places = [poi.campsites[0], poi.campsites[1], poi.campsites[2], poi.sheds[2], poi.mast].filter(Boolean);
    function share(p, kind, inner, outer) {
      let n = 0, k = 0;
      if (!p) return { n, k };
      for (const t of T.trees) {
        if (!t.alive || t.stump) continue;
        const d = Math.hypot(t.x - p.x, t.z - p.z);
        if (d < inner || d > outer) continue;
        let nearer = false;
        for (const o of places) {
          if (o === p) continue;
          if (Math.hypot(t.x - o.x, t.z - o.z) < d) nearer = true;
        }
        if (nearer) continue;
        n++;
        if (t.kind === kind) k++;
      }
      return { n, k };
    }
    const rangers = share(poi.campsites[0], 'pine', 14, 25);
    ok(rangers.n >= 3 && rangers.k / rangers.n >= 0.6, 'rangers ring is tall pine (' + rangers.k + '/' + rangers.n + ')');
    const hikers = share(poi.campsites[1], 'birch', 14, 25);
    ok(hikers.n >= 3 && hikers.k / hikers.n >= 0.6, 'hikers ring is birch (' + hikers.k + '/' + hikers.n + ')');
    const fuel = share(poi.sheds[2], 'birch', 14, 25);
    ok(fuel.n >= 3 && fuel.k / fuel.n >= 0.6, 'depot ring is scrub birch (' + fuel.k + '/' + fuel.n + ')');
    const trapper = share(poi.campsites[2], 'autumn', 14, 25);
    ok(trapper.n >= 3 && trapper.k / trapper.n >= 0.6, 'trapper ring is dead ash (' + trapper.k + '/' + trapper.n + ')');
    const mast = share(poi.mast, 'pine', 20, 32);
    ok(mast.n >= 3 && mast.n <= 10 && mast.k === mast.n, 'mast ring is a few bent pines (' + mast.k + '/' + mast.n + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
