// t64 — CL-19: the watchtower's railings stop the marine. On the deck he can walk up to the
// rails but not through them; the ladder gap on the south side is still the way down; jump
// higher than the rails and you clear them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Tower');
    const st = T.getTowerState();
    if (!st.tower) { ok(true, 'this map rolled no watchtower: nothing to test'); return out.join('\n'); }
    const tw = st.tower, p = T.player.position;
    const put = async (dx, dz, dy = 0) => { T.towerDeckDbg(); p.set(tw.x + dx, tw.deckY + dy, tw.z + dz); await wait(400); };
    ok(T.towerDeckDbg() && T.getTowerState().onDeck, 'up on the deck');
    await put(2.2, 0);
    ok(T.getTowerState().onDeck && p.x - tw.x < 1.0 && p.x - tw.x > 0.8, 'east: the rail holds him (' + (p.x - tw.x).toFixed(2) + ' m out)');
    await put(0, 2.2);
    ok(T.getTowerState().onDeck && p.z - tw.z < 1.0, 'north: held (' + (p.z - tw.z).toFixed(2) + ')');
    await put(-2.2, -2.2);
    ok(T.getTowerState().onDeck && Math.abs(p.x - tw.x) < 1.0 && Math.abs(p.z - tw.z) < 1.0, 'the south-west corner: held');
    await put(1.0, -2.2);
    ok(T.getTowerState().onDeck && p.z - tw.z > -1.0, 'south, beside the gap: the rail holds him');
    await put(0.1, -1.3);
    ok(T.getTowerState().onDeck && p.z - tw.z < -1.2, 'lined up with the ladder gap he can step into it (' + (p.z - tw.z).toFixed(2) + ')');
    await put(0.1, -1.7);
    ok(!T.getTowerState().onDeck, 'and off the edge there: the way down');
    await put(2.2, 0, 1.2);
    ok(!T.getTowerState().onDeck, 'jumping higher than the rails clears them');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
