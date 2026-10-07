// t190 - CU-86 (P-141, for GP-84): the Hollows' snapshot and pickup receipts. state() gives his live depth from where
// he stands and every warren's clearance in compass order; the passage a cleared warren opens is listed; a haul that
// went through is published as 'hollow-pickup'; a new run shuts every warren.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = [];
  window.addEventListener('dw-game', (e) => { const d = e.detail || {}; if (d.type === 'hollow' || d.type === 'hollow-pickup') events.push(d); });
  // Stand there and let the game run a few frames (its own clock, not the wall's: a loaded box runs fewer).
  const stand = async (p, dy = 0.05) => {
    T.player.position.set(p.x, p.y + dy, p.z);
    const t0 = T.getSimTime(); const w0 = Date.now();
    while (T.getSimTime() - t0 < 0.15 && Date.now() - w0 < 6000) await wait(40);
  };
  try {
    await startMatch(T, 'Snapshot');
    // Topside: nothing below, every warren listed and shut, the passages shut.
    let s = T.hollowState();
    ok(s.below === false && s.depth === 1 && s.place === null, 'topside: not below, depth 1');
    ok(s.warrens.length === 5 && s.warrens.every((w) => w.cleared === false && w.passage && w.passage.open === false), 'five warrens listed, none cleared, no passage open (' + s.warrens.length + ')');
    const order = s.warrens.map((w) => w.cave);
    ok(new Set(order).size === 5 && s.warrens.every((w, i) => w.passage.to === order[(i + 1) % 5]), 'each passage leads to the next warren round the compass (' + order.join(',') + ')');
    const angs = order.map((i) => T.POI.caves[i].ang);
    ok(angs.every((a, i) => i === 0 || a >= angs[i - 1]), 'and they are in compass order by the caves\' own angle');
    ok(s.warrens.every((w) => ['root', 'shale', 'iron', 'wet', 'hill'].includes(w.theme)) && !s.warrens.some((w) => T.POI.caves[w.cave].theme === 'chalk'), 'the sealed Marrow cave has no warren');

    // Down, and the depth follows his feet.
    const cave = order[2];
    const built = T.enterHollow({ theme: 'iron', cave });
    s = T.hollowState();
    ok(s.below && s.cave === cave && s.theme === 'iron' && s.place === 'warren' && s.depth === 1, 'at the mouth: depth 1 (' + s.depth + ')');
    const sl = built.points.sleepers;
    const at = (d) => sl.find((p) => p.depth === d);
    const d2 = at(2), d3 = at(3) || built.points.strongbox;
    ok(!!d2 && !!d3, 'the warren has points on the Narrows and the Deep');
    await stand(d2); s = T.hollowState();
    ok(s.depth === 2, 'on a Narrows point: depth 2 (' + s.depth + ' at y ' + d2.y.toFixed(1) + ' against the mouth ' + built.entry.y.toFixed(1) + ')');
    await stand(d3); s = T.hollowState();
    ok(s.depth === 3, 'on a Deep point: depth 3 (' + s.depth + ')');
    const depthEvents = events.filter((e) => e.type === 'hollow' && e.phase === 'depth');
    ok(depthEvents.length >= 2 && depthEvents.some((e) => e.depth === 2 && e.from === 1) && depthEvents.some((e) => e.depth === 3), 'the HUD heard each change: ' + depthEvents.map((e) => e.from + '>' + e.depth).join(' ') + ' of ' + events.map((e) => e.type + ':' + e.phase).join(' '));
    await stand(built.entry); s = T.hollowState();
    ok(s.depth === 1, 'and back at the mouth: depth 1 (' + s.depth + ')');

    // The strongbox: a receipt for the UI.
    const box = built.points.strongbox;
    await stand(box);
    const before = events.length;
    const got = T.claimHollowHere(T.player.position.x, T.player.position.y, T.player.position.z);
    const pk = events.slice(before).find((e) => e.type === 'hollow-pickup');
    ok(!!got && !!pk && pk.kind === 'box' && pk.cave === cave && pk.theme === 'iron' && pk.depth === 3, 'the box opens and says so (' + JSON.stringify(pk && { kind: pk.kind, depth: pk.depth }) + ')');
    ok(pk && pk.receiptId === got.receiptId && typeof pk.shard === 'number' && (pk.prize === null || typeof pk.prize.kind === 'string'), 'with its receipt, the shard\'s place and the prize (' + JSON.stringify(pk && { receiptId: pk.receiptId, shard: pk.shard, prize: pk.prize }) + ')');
    const n1 = events.length;
    ok(T.claimHollowHere(T.player.position.x, T.player.position.y, T.player.position.z) === null && events.length === n1, 'a spent box says nothing');

    // A tag and a crate.
    const tagPt = (built.points.tags || [])[0], crate = (built.points.crates || [])[0];
    if (tagPt) {
      await stand(tagPt);
      const b = events.length;
      const t = T.claimHollowHere(T.player.position.x, T.player.position.y, T.player.position.z);
      const te = events.slice(b).find((e) => e.type === 'hollow-pickup');
      ok(!t || (te && te.kind === 'tag' && te.id === t.id && te.count === t.count && te.total === 9), 'a tag says which one and how many of nine (' + JSON.stringify(te && { id: te.id, count: te.count, total: te.total }) + ')');
    } else ok(false, 'the warren has a tag point');
    if (crate) {
      await stand(crate);
      const b = events.length;
      const c = T.claimHollowHere(T.player.position.x, T.player.position.y, T.player.position.z);
      const ce = events.slice(b).find((e) => e.type === 'hollow-pickup');
      ok(!!c && ce && ce.kind === 'crate' && ce.receiptId === c.receiptId && ce.items.every((it) => typeof it.id === 'string' && it.qty > 0), 'a crate lists what was in it (' + JSON.stringify(ce && ce.items) + ')');
    } else ok(false, 'the warren has a crate point');

    // Cleared: held for the run, listed, and its passage open.
    T.heartDbg.markCleared();   // the Deep's set piece done, as the fight below would mark it
    s = T.hollowState();
    ok(s.cleared === true && s.clearedCaves.length === 1 && s.clearedCaves[0] === cave, 'cleared: this warren and the list say so');
    const w = s.warrens.find((x) => x.cave === cave);
    ok(w.cleared === true && w.passage.open === true && s.warrens.filter((x) => x.passage.open).length === 1, 'and its passage to the next warren is open, only that one');
    T.leaveHollow('mouth');
    s = T.hollowState();
    ok(!s.below && s.depth === 1 && s.cleared === false && s.clearedCaves.length === 1, 'up again: held for the run, not for the visit');

    // A new run shuts every warren, even from below.
    T.enterHollow({ theme: 'root', cave: order[0] });
    ok(T.hollowState().below === true, 'down again');
    T.resetGame();
    s = T.hollowState();
    ok(!s.below && s.clearedCaves.length === 0 && s.warrens.every((x) => !x.cleared && !x.passage.open), 'a new run: he is brought up, every warren and passage shut');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
