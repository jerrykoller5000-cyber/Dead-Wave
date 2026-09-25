// t2 - deck placement probe. GB-45 (GB-A9): three wall+platform cells give a deck well above the
// ground. GB-46: in a started match (tryPlace does nothing on the menu), on ground clear of the
// cabin, a turret aimed at a deck from the ground and from the next deck goes on the deck.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    await startMatch(T, 'DeckPlace');
    T.unlockAllBuilds(); T.addCash(5000);
    const p = T.player.position;
    const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
    const clear = (gx, gz) => { for (let i = 0; i < 3; i++) if (T.placeRefusalFor('wall', gx, gz + i) !== null) return false; return true; };
    let gx0 = null, gz0 = null;
    for (const dx of [2, 3, -2, -3, 4, -4]) { for (const dz of [0, -1, -2, 1]) { if (clear(pgx + dx, pgz + dz)) { gx0 = pgx + dx; gz0 = pgz + dz; break; } } if (gx0 !== null) break; }
    ok(gx0 !== null, 'found clear ground near the marine (' + gx0 + ',' + gz0 + ')');
    if (gx0 === null) return out.join('\n');
    for (let i = 0; i < 3; i++) { T.placeBuildAt('wall', gx0, gz0 + i); T.placeBuildAt('platform', gx0, gz0 + i); }
    const plat = T.cellOccupant(gx0, gz0, 1, 'base');
    const deckY = plat.deck.deckY;
    out.push('deckY ' + deckY.toFixed(2));
    const cx = T.gridCentre(gx0), cz = T.gridCentre(gz0);
    const groundY = T.sampleHeight(cx, cz);
    const decks = [0, 1, 2].map((i) => T.cellOccupant(gx0, gz0 + i, 1, 'base'));
    ok(decks.every((d) => d && d.level === 1 && d.deck), 'all three platforms stand at lv1 with a deck');
    ok(deckY > groundY + 1.5, 'the deck is up on the walls: ' + deckY.toFixed(2) + ' over ground ' + groundY.toFixed(2));
    const made = [];
    const trial = (label, ox, oy, oz, tx, ty, tz, kind) => {
      T.setPlaceMode(kind);
      T.setAimRay(ox, oy, oz, tx - ox, ty - oy, tz - oz);
      T.updateGhostPreview();
      const pt = T.getPlacePoint(), valid = T.getGhostValid();
      const n0 = T.builds.length;
      T.tryPlace();
      const b = T.builds.length > n0 ? T.builds[T.builds.length - 1] : null;
      made.push(b ? b.type + '@' + (b.gx - gx0) + ',' + (b.gz - gz0) + ' lv' + b.level : 'none');
      out.push(label + ': pt ' + (pt.gx - gx0) + ',' + (pt.gz - gz0) + ' lv ' + pt.lv + ' valid=' + valid + ' placed=' + made[made.length - 1]);
    };
    // The marine on the ground beside the walls, aiming at the first deck from behind and above.
    p.set(cx - 3, T.sampleHeight(cx - 3, cz), cz);
    await wait(300);
    const cam = T.camera.position;   // from the real camera: a made-up origin behind him missed the deck
    trial('ground-player aim at plat', cam.x, cam.y, cam.z, cx, deckY, cz, 'light');
    // The marine up on the third deck, aiming at the middle one.
    p.set(cx, deckY, T.gridCentre(gz0 + 2));
    await wait(300);
    out.push('player y after settle ' + p.y.toFixed(2));
    trial('deck-player aim at plat', p.x - 6, p.y + 12, p.z - 4, cx, deckY, T.gridCentre(gz0 + 1), 'heavy');
    trial('deck-player aim at own cell', p.x - 6, p.y + 12, p.z - 4, p.x, deckY, p.z, 'flame');
    T.setPlaceMode(null);
    ok(made[0] === 'light@0,0 lv1' && made[1] === 'heavy@0,1 lv1', 'aimed turrets go on the decks [' + made.slice(0, 2).join(' | ') + ']');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
