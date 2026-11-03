// tgb273 - GB-273 (docs/specs/sector-cull.md): the walls' cull in the game. The stone bands are occluders, the static
// draws fill 8 m cells as sceneCull measures them, and from a seat 10 m inside the HQ ring some cells beyond it are
// hidden; the test costs under 0.15 ms a frame on average, and nothing throws. (The geometry rules - behind hidden,
// through a gap shown, the near foot never hidden, two reads to hide and one to show - are game/wall-cull.test.mjs.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'WallCull');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const d0 = T.wallCullDbg();
    ok(d0 && d0.segments > 0, 'the stone bands are occluders (' + (d0 && d0.segments) + ' segments)');
    let best = { hidden: -1 }, msSum = 0, msN = 0;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, x = Math.cos(a) * 50, z = Math.sin(a) * 50;
      T.player.position.set(x, T.sampleHeight(x, z), z);
      for (let f = 0; f < 30; f++) { await wait(33); const d = T.wallCullDbg(); msSum += d.ms; msN++; }
      const d = T.wallCullDbg();
      if (d.hidden > best.hidden) best = { hidden: d.hidden, cells: d.cells, k };
    }
    ok(best.cells > 0, 'static draws fill cells (' + best.cells + ')');
    ok(best.hidden > 0, 'from a seat 10 m inside the ring some cells are hidden (' + best.hidden + ' of ' + best.cells + ', seat ' + best.k + ')');
    out.push('INFO wall test ' + (msSum / Math.max(1, msN)).toFixed(3) + ' ms a frame (avg of ' + msN + ')');
    ok(msSum / Math.max(1, msN) < 0.15, 'the walls\' test is under 0.15 ms a frame on average');
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  ok(!errs.length, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  return out.join('\n');
})();
