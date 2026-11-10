// tcl334d - CL-334 h (Jerry, 10 Nov, J126 rule 2, D-138, standing): "No part of the hand may clip through any part of a
// weapon." First person, every gun up at the hip and settled: the hands as they are drawn (the glove and its pads, posed),
// against the gun as it is drawn (every closed part of it): no vertex of either hand more than half a millimetre inside any
// part. Inside: an odd number of the part's faces crossed on a ray from the vertex; how deep: its distance to the part's
// nearest face. Also (J128, D-140): the gloved wrist inside the sleeve at the hip (no edge of the glove through the sleeve
// or its hem above the sleeve's end).
// This one: the minigun, the launcher, the flamer and the chainsaw (tools/tests/clip-check.js).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const { clipCheck } = await import('/tools/tests/clip-check.js');
    await clipCheck(T, ['minigun', 'launcher', 'flamer', 'chainsaw'], ok, out);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
