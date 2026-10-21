// t151 - CL-80 (P-95, docs/specs/secret-quest.md §2, §4): the stones carry the eight glyphs; with a word set, at night,
// from the tower's deck only, they flare the word in order; a silenced day puts the Pit out.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const S = T.pitSignal;
    ok(S.marks.length === 8 && S.beams.length === 8, 'eight stones, eight glyphs, eight beams');
    ok(new Set(S.marks.map((m) => m.geometry.attributes.uv.getX(0).toFixed(3))).size === 8, 'each stone shows its own glyph');
    const word = [3, 0, 6, 1, 5];
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'quest', kind: 'word', order: word } }));
    ok(JSON.stringify(S.word) === JSON.stringify(word), 'the quest model\'s word reaches the stones');
    // Off the tower: nothing flares.
    T.setOnTowerDeckDbg(false);
    let any = false;
    for (let t = 0; t < 12; t += 0.1) { T.updatePitSignal(0.1, { night: true }); if (S.beams.some((b) => b.visible)) any = true; }
    ok(!any, 'from the ground, no stone flares');
    // On the deck: the word, in order.
    T.setOnTowerDeckDbg(true);
    S.t = 0;
    const seen = [];
    for (let t = 0; t < 12; t += 0.05) {
      T.updatePitSignal(0.05, { night: true });
      const k = S.beams.findIndex((b) => b.visible && b.material.opacity > 0.25);
      if (k >= 0 && seen[seen.length - 1] !== k) seen.push(k);
    }
    ok(JSON.stringify(seen.slice(0, 5)) === JSON.stringify(word), 'from the tower at night the stones flare the word: ' + seen.join(','));
    // Silenced: the Pit goes out.
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'quest', kind: 'silenced' } }));
    for (let i = 0; i < 20; i++) T.updatePitSignal(0.1, { night: true });
    ok(S.silenced && S.runeMat.opacity < 0.2 && S.deepGlowMat.opacity === 0 && S.beams.every((b) => !b.visible), 'silenced: the runes dim, the glow and the stones go out');
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'quest', kind: 'dawn' } }));
    T.updatePitSignal(0.1);
    ok(!S.silenced && S.runeMat.opacity > 0.9, 'the dawn brings the tone back');
    T.setOnTowerDeckDbg(false); T.setPitWord(null);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
