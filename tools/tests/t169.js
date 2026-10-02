// t169 - CL-112 (docs/specs/secret-quest.md §5): the heart in the Marrow builds in the game (its carvings drawn on
// canvases), stands where the runtime puts it, and its parts are where the fight needs them: the way in at the top of
// the tunnel, the guardian's ground, the dead's rise round the source, six columns that come down, no errors.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const h = T.buildHeart();
    T.scene.add(h.group);
    ok(h.group.name === 'heart' && Math.abs(h.group.position.y - T.HEART.ORIGIN.y) < 1e-6, 'built where the runtime goes below (' + h.group.position.y + ')');
    ok(h.groundAt(h.entry.x, h.entry.z) != null && h.groundAt(h.source.x, h.source.z) == null, 'floor at the way in, none in the source');
    ok(h.columns.length === 6 && h.columns.every((c) => c.mesh && c.solid), 'six columns, each with its solid');
    let bands = 0; h.group.traverse((o) => { if (o.isMesh && o.material && o.material.map && o.material.map.image && o.material.map.image.getContext) bands++; });
    ok(bands >= 12, 'the columns\' glyph bands are drawn (' + bands + ')');
    ok(h.points.rise.length === 12 && h.points.guardian && h.exits.back, 'the rise, the guardian\'s ground and the way back');
    const s = h.fellColumn(2);
    ok(s && h.columns[2].down && h.solids.includes(s), 'a column comes down and its solid lies with it');
    T.renderOnce && T.renderOnce();
    h.dispose();
    ok(!h.group.parent, 'disposed');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
