// t165 - CL-111 (docs/specs/secret-quest.md §6): the rune finish. Locked until the true ending; the quest's 'ending'
// grants it for good; then a gun's furniture can wear it (and a save keeps it): dark wood etched with the glyphs,
// the grooves lit at night and faint light from them. Every other finish has no light. Uniforms never take it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const R = T.runeFinishDbg;
    R.lock();
    ok(!R.unlocked() && !R.isGunFinishKey('rune'), 'locked at first');
    ok(!T.CAMO_KEYS.includes('rune'), 'it is no uniform pattern (not in CAMO_KEYS)');
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'quest', kind: 'ending' } }));
    ok(R.unlocked() && R.isGunFinishKey('rune') && localStorage.getItem('tt_rune_finish') === '1', 'the true ending grants it, for good');
    T.runDevCommand('rune');
    const mats = R.furniture().m4;
    ok(mats && mats.length && mats.every((m) => m.map === R.tex()), 'the M4\'s furniture wears it');
    const w = T.getWardrobe();
    ok(w.guns.m4 === 'rune', 'the wardrobe holds it');
    const back = R.readWardrobe();
    ok(back.guns.m4 === 'rune' && JSON.stringify(back.items) === JSON.stringify(w.items), 'a save keeps it, and the rest of the profile with it');
    // Night and day.
    const cv = R.state().cv, px = (l) => { R.glow(l); const d = cv.getContext('2d').getImageData(0, 0, 256, 256).data; let hi = 0; for (let i = 0; i < d.length; i += 4) hi = Math.max(hi, d[i + 2] - d[i]); return hi; };
    const day = px(0.04), night = px(1);
    ok(night > day + 80, 'the grooves light at night (blue over red ' + day + ' by day, ' + night + ' at night)');
    ok(mats.every((m) => m.emissiveMap === R.state().glowTex && m.emissiveIntensity > 0.5), 'and give a faint light at night');
    R.glow(0.04);
    ok(mats.every((m) => m.emissiveIntensity < 0.1), 'none by day');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
    R.lock();
    ok(R.readWardrobe().guns.m4 === undefined, 'locked again, a save can\'t hold it');
    localStorage.removeItem('tt_wardrobe');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
