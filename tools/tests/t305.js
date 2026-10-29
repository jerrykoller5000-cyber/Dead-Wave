// t305 - CL-263 (docs/specs/story-chain.md §6; GB-232's places): the survivors are found where they hid, as the thread
// that leads there ends: Pike beyond the hikers' camp (its far side from the HQ, behind a tree there, on dry ground), Brandt
// by the rangers' truck, Okafor in the trapper's cellar. Before night 3, or with the story gate off, nobody comes from a
// thread; with it on, nobody comes before his thread is done.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'World');
    T.clearZombies(); T.runDevCommand('godmode');
    const S = T.survivorDbg, POI = T.POI, H = T.historyProps;
    if (!S || !T.storyDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    S.setChance(0);   // no camp bounty's survivor by chance: only the threads place anyone here
    const camp = (st) => POI.campsites.find((c) => c.style === st);
    const fromThread = () => S.waiting().filter((s) => ['hikers', 'ranger', 'trapper'].includes(s.style));
    const hk = camp('hikers');
    if (hk) {
      const p = H.pikeHide;
      ok(!!p, 'the hikers\' camp has the place Pike hid');
      if (p) {
        const r = d2(p, hk), beyond = Math.hypot(p.x, p.z) - Math.hypot(hk.x, hk.z);
        // Behind a tree (or a rock) 9-30 m out and at least 2 m farther from the HQ than the camp, or with none there in
        // the open 10-16 m out (AG-154: no tree stood straight beyond this map's camp).
        ok(r > 9.5 && r < 31.5 && beyond > 1.9 && T.waterDepthAt(p.x, p.z) <= 0,
          'it is beyond the camp from the HQ (' + r.toFixed(1) + ' m out, ' + beyond.toFixed(1) + ' m further from the HQ), on dry ground');
      }
    } else ok(true, 'no hikers\' camp on this map');
    // The gate off: the threads place nobody.
    T.storyDbg.chain.reset(); T.storyDbg.gate(false); T.setDay(3);
    for (const id of ['missing', 'search', 'oldman']) T.runDevCommand('story done ' + id);
    T.storyDbg.sync(); await wait(200);
    ok(fromThread().length === 0, 'the story gate off: no survivor from a thread (' + fromThread().length + ')');
    // The gate on, night 3, the threads not done: nobody yet.
    T.storyDbg.chain.reset(); T.storyDbg.gate(true); T.setDay(3);
    T.storyDbg.sync(); await wait(200);
    ok(fromThread().length === 0, 'the gate on, the threads open: nobody waiting yet');
    // Each thread done: its survivor where he hid.
    for (const id of ['missing', 'search', 'oldman']) T.runDevCommand('story done ' + id);
    T.storyDbg.sync(); await wait(300);
    const w = fromThread(), who = (st) => w.find((s) => s.style === st);
    if (hk && H.pikeHide) {
      const pk = who('hikers');
      ok(!!pk && pk.shown && d2(pk, H.pikeHide) < 1.5, 'the hikers\' thread done: Pike where he hid' + (pk ? ' (' + d2(pk, H.pikeHide).toFixed(2) + ' m from it)' : ' (not there)'));
    }
    const rg = camp('ranger'), truck = T.rangerDbg?.ranger?.clues?.find((q) => q.source === 'truck')?.spot?.approach;
    if (rg && truck) {
      const br = who('ranger');
      ok(!!br && br.shown && d2(br, truck) < 1.5, 'the search done: Brandt by the rangers\' truck' + (br ? ' (' + d2(br, truck).toFixed(2) + ' m)' : ' (not there)'));
    } else ok(true, 'no rangers\' truck on this map');
    const tp = camp('trapper'), cellar = T.trapperDbg?.cellarSpot?.();
    if (tp && cellar) {
      const ok8 = who('trapper');
      ok(!!ok8 && ok8.shown && d2(ok8, cellar) < 0.3 && Math.abs(ok8.y - cellar.y) < 0.05, 'the old man\'s thread done: Okafor in the cellar' + (ok8 ? ' (' + d2(ok8, cellar).toFixed(2) + ' m, y ' + ok8.y.toFixed(2) + ')' : ' (not there)'));
    } else ok(true, 'no trapper\'s cellar on this map');
    T.storyDbg.gate(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
