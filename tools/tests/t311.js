// t311 - CU-198: walking reveals the map cells along the line, and a place's card comes up once.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    if (!T.mapRevealDbg || !T.POI || !T.POI.tower) { ok(false, 'the map hooks are there'); return out.join('\n'); }
    await startMatch(T, 'MapWalk');
    T.clearZombies && T.clearZombies();
    const R = () => T.mapRevealDbg();
    for (let x = 0; x <= 64; x += 8) {
      const y = T.sampleHeight(x, 0);
      T.player.position.set(x, (y == null ? 0 : y) + 0.2, 0);
      R().step();
      await wait(30);
    }
    ok(R().seen(32, 0), 'the line he walked is on the map');
    ok(R().seen(32, 16), 'the ground beside the line is revealed');
    ok(!R().seen(200, 200), 'the far valley stays unknown');
    const tower = T.POI.tower;
    const before = R().found().slice();
    const y = T.sampleHeight(tower.x, tower.z);
    T.player.position.set(tower.x, (y == null ? 0 : y) + 0.2, tower.z);
    R().step();
    await wait(40);
    const found = R().found();
    ok(found.includes('firetower'), 'walking into the tower clearing finds it (' + found.join(', ') + ')');
    const title = document.querySelector('#bigBanner .t');
    ok(!!title && /tower/i.test(title.textContent), 'the card names the tower (' + (title && title.textContent) + ')');
    R().step();
    ok(R().found().length === found.length, 'the card does not come up again');
    ok(!before.includes('firetower'), 'it was not found before he arrived');
  } catch (e) {
    ok(false, 't311 threw: ' + String((e && e.stack) || e).slice(0, 300));
  }
  return out.join('\n');
})()
