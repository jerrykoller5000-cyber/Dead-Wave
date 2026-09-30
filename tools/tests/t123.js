// t123 — CL-105 (Jerry, 2026-09-29): the burial detail always wears woodland MARPAT. Whatever camo the player picked,
// no piece of the two diggers uses his camo texture; their uniform pieces use the MARPAT one; he keeps his own.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const pick = T.CAMO_KEYS.find((k) => k !== 'marpat' && k !== 'm81') || 'm81';
    T.setCamo(pick, false);
    const crew = T.ensureCrew();
    const maps = new Set(); let his = 0, camoPieces = 0;
    for (const c of crew) c.m.traverse((o) => {
      if (!o.isMesh) return;
      for (const mat of [].concat(o.material)) {
        if (!mat || !mat.map) continue;
        if (mat.map === T.camoTex) his++;
        else if (mat.map.image && mat.map.image.width === T.camoTex.image.width) { camoPieces++; maps.add(mat.map); }
      }
    });
    ok(his === 0, 'no digger piece wears the player\'s camo (' + pick + '): ' + his);
    ok(camoPieces >= 3 && maps.size === 1, 'their uniform pieces share one MARPAT texture: ' + camoPieces + ' pieces, ' + maps.size + ' texture(s)');
    let mine = 0; T.player.traverse((o) => { if (o.isMesh) for (const mat of [].concat(o.material)) if (mat && mat.map === T.camoTex) mine++; });
    ok(mine >= 3, 'the marine still wears his own pick: ' + mine + ' pieces');
    T.setCamo('m81', false);
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
