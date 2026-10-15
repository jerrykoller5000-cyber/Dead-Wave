// t251 - CU-129: hugging the lip of a cave mouth still wakes the guardian. The grab used
// to cover only 80% of the opening, so the ragged edge was a way in.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CaveEdge');
    T.runDevCommand('godmode');
    const at = (c, lx, lz) => ({
      x: c.x + lx * Math.cos(c.yaw) + lz * Math.sin(c.yaw),
      z: c.z - lx * Math.sin(c.yaw) + lz * Math.cos(c.yaw)
    });
    const caves = (T.POI.caves || []).filter((c) => c.design && !c.sealed);
    ok(caves.length >= 4, 'open caves to test (' + caves.length + ')');
    const bad = [];
    for (const c of caves) {
      const w = c.design.w, sk = c.design.skew * 1.2;
      const edge = at(c, sk + w, -1);
      const deep = at(c, sk, -4.2);
      const yard = at(c, sk, 2.2);
      const clear = at(c, sk + w + 1.5, -1);
      if (!(w > (c.mouthHalf || 0))) bad.push(c.theme + ' width');
      if (!T.inCaveGrab(c, edge.x, c.gy + 1, edge.z)) bad.push(c.theme + ' edge');
      if (!T.inCaveGrab(c, deep.x, c.gy + 1, deep.z)) bad.push(c.theme + ' deep');
      if (T.inCaveGrab(c, yard.x, c.gy + 1, yard.z)) bad.push(c.theme + ' yard');
      if (T.inCaveGrab(c, clear.x, c.gy + 1, clear.z)) bad.push(c.theme + ' outside');
    }
    ok(bad.length === 0, bad.length ? bad.join(', ') : 'the lip and the back of the black are in the grab; the yard is not');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
