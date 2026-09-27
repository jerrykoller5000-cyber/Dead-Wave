// t88 - GB-63 (P-4): T and X act on his own storey only, never through a floor. Two storeys: three
// walls with platforms on them. From the ground, T won't repair the deck overhead and X won't take it
// (out of build mode or aimed at it); upstairs they work on the deck. From the deck, a wall under his
// feet is out of reach through the floor; back on the ground it's his again. getRepairTarget follows T.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tag = (b) => b ? b.type + '@' + b.gx + ',' + b.gz + ' lv' + b.level : 'none';
  try {
    await startMatch(T, 'Storeys');
    T.unlockAllBuilds(); T.addCash(5000);
    const p = T.player.position;
    const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
    const clear = (gx, gz) => { for (let i = 0; i < 3; i++) if (T.placeRefusalFor('wall', gx, gz + i) !== null) return false; return true; };
    let gx0 = null, gz0 = null;
    for (const dx of [3, -3, 4, -4, 5, -5]) { for (const dz of [0, -1, -2, 1, 2]) { if (clear(pgx + dx, pgz + dz)) { gx0 = pgx + dx; gz0 = pgz + dz; break; } } if (gx0 !== null) break; }
    ok(gx0 !== null, 'found clear ground near the marine (' + gx0 + ',' + gz0 + ')');
    if (gx0 === null) return out.join('\n');
    const walls = [], decks = [];
    for (let i = 0; i < 3; i++) { walls.push(T.placeBuildAt('wall', gx0, gz0 + i)); decks.push(T.placeBuildAt('platform', gx0, gz0 + i)); }
    ok(walls.every((w) => w && w.level === 0) && decks.every((d) => d && d.level === 1 && d.deck), 'three walls with a deck on each');
    const cx = T.gridCentre(gx0);
    const deckY = decks[2].deck.deckY;
    const onGround = async () => { const x = cx - 2.6, z = T.gridCentre(gz0 + 1); p.set(x, T.sampleHeight(x, z), z); await wait(300); };
    const onDeck = async () => { p.set(cx, deckY, T.gridCentre(gz0 + 2)); await wait(300); p.set(cx, Math.max(p.y, deckY), T.gridCentre(gz0 + 2)); };
    const aim = (tx, ty, tz) => { const ox = p.x, oy = p.y + 1.5, oz = p.z; T.setAimRay(ox, oy, oz, tx - ox, ty - oy, tz - oz); T.updateGhostPreview(); };
    const deck = decks[1];

    // (1) From the ground, the damaged deck overhead is not his.
    await onGround();
    deck.hp = deck.maxHp * 0.5;
    const bank0 = T.getBank();
    ok(T.findRepairCandidate(7) === null && T.getRepairTarget() === null, 'from the ground T finds nothing: the only damaged piece is the deck overhead (' + tag(T.findRepairCandidate(7)) + ')');
    T.repairNearestBuild();
    ok(deck.hp < deck.maxHp - 0.5 && T.getBank() === bank0, 'and T does not repair it (hp ' + Math.round(deck.hp) + '/' + deck.maxHp + ', Cash ' + bank0 + ' -> ' + T.getBank() + ')');
    const x1 = T.findScrapCandidate(7);
    ok(x1 && x1.level === 0, 'X out of build mode takes a piece on the ground, not upstairs (' + tag(x1) + ')');
    T.setPlaceMode('wall');
    aim(cx, deckY - 0.1, T.gridCentre(gz0 + 1));
    const x1b = T.scrapTarget();
    ok(!x1b || x1b.level === 0, 'in build mode, X aimed up at the deck does not take it (' + tag(x1b) + ')');
    T.setPlaceMode(null);

    // (2) Up on the deck they work.
    await onDeck();
    out.push('on the deck: y ' + p.y.toFixed(2) + ' deck ' + deckY.toFixed(2));
    ok(T.findRepairCandidate(7) === deck && T.getRepairTarget() && T.getRepairTarget().id.indexOf(':L1') > 0, 'on the deck, T finds the damaged deck (' + tag(T.findRepairCandidate(7)) + ')');
    T.repairNearestBuild();
    ok(deck.hp >= deck.maxHp - 0.5 && T.getBank() < bank0, 'and repairs it (hp ' + Math.round(deck.hp) + '/' + deck.maxHp + ')');
    const x2 = T.findScrapCandidate(7);
    ok(x2 && x2.level === 1, 'X out of build mode takes a piece on the deck (' + tag(x2) + ')');
    T.setPlaceMode('wall');
    aim(cx, deckY, T.gridCentre(gz0));
    const x2b = T.scrapTarget();
    ok(x2b && x2b.level === 1, 'in build mode, X aimed at the next deck takes it (' + tag(x2b) + ')');
    T.setPlaceMode(null);

    // (3) From the deck, the wall under his feet is through the floor.
    const under = walls[2];
    under.hp = under.maxHp * 0.5;
    ok(T.findRepairCandidate(7) === null, 'from the deck T does not reach the wall under his feet (' + tag(T.findRepairCandidate(7)) + ')');
    // (4) Back on the ground it is his.
    await onGround();
    ok(T.findRepairCandidate(7) === under, 'back on the ground T finds that wall (' + tag(T.findRepairCandidate(7)) + ')');
    T.repairNearestBuild();
    ok(under.hp >= under.maxHp - 0.5, 'and repairs it (hp ' + Math.round(under.hp) + '/' + under.maxHp + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()