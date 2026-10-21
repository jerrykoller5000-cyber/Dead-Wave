// t87 - GB-62 (P-3): a build refusal says why, on the place banner while he aims and on the banner
// when he clicks. Four cases: short of Cash on open ground reads NOT ENOUGH CASH (it used to read
// "CAN'T BUILD THERE - No room"); up on a deck a turret aimed at his own cell is refused ("You are
// standing there") and goes on the next deck; a tree, a rock and the HQ are named; on the ground,
// his own cell says it is him, not "something in the way".
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const banner = () => { const el = document.getElementById('bigBanner'); return el ? (el.querySelector('.t').textContent + ' | ' + el.querySelector('.s').textContent) : ''; };
  const why = () => { const el = document.querySelector('#placeBanner .place-why'); return el ? el.textContent : ''; };
  try {
    await startMatch(T, 'Refusals');
    T.unlockAllBuilds(); T.addCash(5000);
    const p = T.player.position;
    const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
    const clear = (gx, gz, n) => { for (let i = 0; i < n; i++) if (T.placeRefusalFor('wall', gx, gz + i) !== null) return false; return true; };
    let gx0 = null, gz0 = null;
    for (const dx of [3, -3, 4, -4, 5, -5]) { for (const dz of [0, -1, -2, 1, 2]) { if (clear(pgx + dx, pgz + dz, 3)) { gx0 = pgx + dx; gz0 = pgz + dz; break; } } if (gx0 !== null) break; }
    ok(gx0 !== null, 'found clear ground near the marine (' + gx0 + ',' + gz0 + ')');
    if (gx0 === null) return out.join('\n');
    // Aim straight down at a cell and look at what the ghost and a click say.
    const aimAt = (kind, x, y, z) => { T.setPlaceMode(kind); T.setAimRay(x + 0.01, y + 14, z - 0.01, -0.01, -14, 0.01); T.updateGhostPreview(); return { valid: T.getGhostValid(), hint: T.getPlaceHint(), shown: why(), pt: T.getPlacePoint() }; };
    const click = () => { const n0 = T.builds.length; T.tryPlace(); return { made: T.builds.length > n0 ? T.builds[T.builds.length - 1] : null, banner: banner() }; };
    const cx = T.gridCentre(gx0), cz = T.gridCentre(gz0);

    // (1) Short of Cash on open ground.
    const bank0 = T.getBank(); T.addCash(-bank0);
    const a1 = aimAt('wall', cx, T.sampleHeight(cx, cz), cz);
    const c1 = click();
    T.addCash(bank0);
    ok(!a1.valid && a1.hint === 'Not enough Cash' && a1.shown === 'Not enough Cash', 'broke on open ground, the banner says why while he aims ("' + a1.hint + '", shown "' + a1.shown + '")');
    ok(!c1.made && /^NOT ENOUGH CASH \| .*costs/.test(c1.banner), 'and the click says NOT ENOUGH CASH, not "No room" (' + c1.banner + ')');
    const a1b = aimAt('wall', cx, T.sampleHeight(cx, cz), cz);
    ok(a1b.valid && a1b.hint === '' && a1b.shown === '', 'with the Cash back the hint is gone (valid ' + a1b.valid + ', "' + a1b.hint + '")');

    // (2) Up on a deck: not under his feet.
    for (let i = 0; i < 3; i++) { T.placeBuildAt('wall', gx0, gz0 + i); T.placeBuildAt('platform', gx0, gz0 + i); }
    const d2 = T.cellOccupant(gx0, gz0 + 2, 1, 'base'), d1 = T.cellOccupant(gx0, gz0 + 1, 1, 'base');
    ok(d1 && d2 && d2.deck, 'two decks up on the walls');
    const deckY = d2.deck.deckY;
    p.set(cx, deckY, T.gridCentre(gz0 + 2));
    await wait(300);
    const a2 = aimAt('flame', p.x, deckY, p.z);
    const c2 = click();
    ok(a2.pt.gx === gx0 && a2.pt.gz === gz0 + 2 && !a2.valid && a2.hint === 'You are standing there', 'aimed at the deck cell he stands on, the ghost is red and says so (cell ' + (a2.pt.gx - gx0) + ',' + (a2.pt.gz - gz0) + ' lv ' + a2.pt.lv + ', "' + a2.hint + '")');
    ok(!c2.made && /You are standing there/.test(c2.banner), 'and no turret lands under his feet (' + (c2.made ? c2.made.type + ' lv' + c2.made.level : 'none') + '; ' + c2.banner + ')');
    const a2b = aimAt('flame', cx, deckY, T.gridCentre(gz0 + 1));
    const c2b = click();
    ok(a2b.valid && c2b.made && c2b.made.type === 'flame' && c2b.made.level === 1, 'the next deck takes it (' + (c2b.made ? c2b.made.type + ' lv' + c2b.made.level : 'none; ' + a2b.hint) + ')');
    T.setPlaceMode(null);
    p.set(cx - 6, T.sampleHeight(cx - 6, cz), cz);
    await wait(300);

    // (3) A tree, a rock and the HQ are named.
    const far = (x, z) => Math.hypot(x - p.x, z - p.z) > 4;
    let tree = null, treeWhy = null;
    for (const t of T.trees) {
      if (!t.alive || t.stump || !far(t.x, t.z)) continue;
      const r = T.placeRefusalFor('floor', T.gridIndex(t.x), T.gridIndex(t.z));
      if (r === 'a tree in the way') { tree = t; treeWhy = r; break; }
    }
    ok(!!tree && T.refusalText(treeWhy) === 'A tree in the way', 'a floor on a tree names the tree ("' + (treeWhy && T.refusalText(treeWhy)) + '")');
    if (tree) {
      const g = T.gridCentre(T.gridIndex(tree.x)), h = T.gridCentre(T.gridIndex(tree.z));
      // He stands 4 m off it (the ghost only goes within his reach) and aims from the side,
      // low: straight down, the ray meets the canopy first.
      p.set(g - 4, T.sampleHeight(g - 4, h), h); await wait(200);
      const y3 = T.sampleHeight(g, h);
      T.setPlaceMode('floor'); T.setAimRay(g - 5, y3 + 1.2, h, 5, -1.2, 0); T.updateGhostPreview();
      const pt3 = T.getPlacePoint(), shown3 = why(), hint3 = T.getPlaceHint();
      ok(!T.getGhostValid() && shown3 === 'A tree in the way', 'and says it while he aims ("' + shown3 + '"; hint "' + hint3 + '", cell ' + (pt3 && (pt3.gx - T.gridIndex(tree.x)) + ',' + (pt3.gz - T.gridIndex(tree.z)) + ' lv ' + pt3.lv) + ')');
    }
    let rockWhy = null;
    for (const r of T.rocks) {
      if (!r.alive || !far(r.x, r.z)) continue;
      const w = T.placeRefusalFor('floor', T.gridIndex(r.x), T.gridIndex(r.z));
      if (w === 'a rock in the way') { rockWhy = w; break; }
    }
    ok(rockWhy && T.refusalText(rockWhy) === 'A rock in the way', 'a floor on a rock names the rock ("' + (rockWhy && T.refusalText(rockWhy)) + '")');
    const H = T.house;
    const hqWhy = T.placeRefusalFor('floor', T.gridIndex(H.group.position.x), T.gridIndex(H.group.position.z));
    ok(hqWhy === 'that is the cabin' && T.refusalText(hqWhy) === 'That is the HQ', 'a floor on the HQ names it ("' + T.refusalText(hqWhy) + '"; build.reason.cabin, renamed by ChatGPT for P-10)');

    // (4) On the ground, his own cell is him.
    const mgx = T.gridIndex(p.x), mgz = T.gridIndex(p.z);
    const meWhy = T.placeRefusalFor('light', mgx, mgz);
    ok(meWhy === 'you are standing there', 'a turret on his own cell on the ground says it is him ("' + meWhy + '")');
    T.setPlaceMode(null);
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()