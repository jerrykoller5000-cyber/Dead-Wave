// t4 - aiming at a wall run's decks. GB-45 (GB-A9): the run stands, and the camera is the
// third-person one, up and behind the marine. GB-46: in a started match (tryPlace does nothing on
// the menu), on ground clear of the cabin: a light aimed at each deck lands on that deck, and a
// heavy aimed at a deck that already has one is refused instead of dropping under the deck.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    await startMatch(T, 'DeckAim');
    T.unlockAllBuilds(); T.addCash(50000);
    const p = T.player.position;
    const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
    // A run of five cells along z, clear for the player's own checks (no cabin, trees or water).
    const clear = (gx, gz) => { for (let i = 0; i < 5; i++) if (T.placeRefusalFor('wall', gx, gz + i) !== null) return false; return true; };
    let wx = null, wz = null;
    for (const dx of [3, 4, -3, -4, 5, -5]) { for (const dz of [-2, -1, 0, -3, 1]) { if (clear(pgx + dx, pgz + dz)) { wx = pgx + dx; wz = pgz + dz; break; } } if (wx !== null) break; }
    ok(wx !== null, 'found a clear run near the marine (' + wx + ',' + wz + ' from ' + pgx + ',' + pgz + ')');
    if (wx === null) return out.join('\n');
    for (let i = 0; i < 5; i++) { T.placeBuildAt('wall', wx, wz + i); T.placeBuildAt('platform', wx, wz + i); }
    await wait(400);
    const cam = T.camera.position;
    out.push('player ' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ',' + p.z.toFixed(1) + ' cam ' + cam.x.toFixed(1) + ',' + cam.y.toFixed(1) + ',' + cam.z.toFixed(1));
    const missing = [];
    for (let i = 0; i < 5; i++) { const d = T.cellOccupant(wx, wz + i, 1, 'base'); if (!d || !d.deck) missing.push(i); }
    ok(!missing.length, 'all five wall+platform cells of the run stand' + (missing.length ? ' [no deck at ' + missing.join(',') + ']' : ''));
    const camUp = cam.y - p.y, camBack = Math.hypot(cam.x - p.x, cam.z - p.z);
    ok(camUp > 4 && camBack > 4 && camBack < 14, 'camera up ' + camUp.toFixed(1) + ' m and back ' + camBack.toFixed(1) + ' m from the marine');
    const res = { light: [], heavy: [] };
    for (const kind of ['light', 'heavy']) for (let i = 0; i < 5; i += 2) {
      const tgt = T.cellOccupant(wx, wz + i, 1, 'base');
      T.setPlaceMode(kind);
      const tx = T.gridCentre(wx), tz = T.gridCentre(wz + i), ty = tgt.deck.deckY;
      T.setAimRay(cam.x, cam.y, cam.z, tx - cam.x, ty - cam.y, tz - cam.z);
      T.updateGhostPreview();
      const pt = T.getPlacePoint(), valid = T.getGhostValid();
      const n0 = T.builds.length; T.tryPlace();
      const made = T.builds.length > n0 ? T.builds[T.builds.length - 1] : null;
      res[kind].push({ cell: (pt.gx - wx) + ',' + (pt.gz - wz - i), valid, made: made ? made.type + '@lv' + made.level : null });
      out.push(kind + ' deck ' + i + ' -> cell ' + (pt.gx - wx) + ',' + (pt.gz - wz - i) + ' lv ' + pt.lv + ' valid=' + valid + ' placed=' + (made ? made.type + ' lv' + made.level : 'none'));
    }
    T.setPlaceMode(null);
    ok(res.light.every((r) => r.cell === '0,0' && r.valid && r.made === 'light@lv1'), 'a light aimed at each deck lands on it [' + res.light.map((r) => r.cell + ' ' + r.made).join(' | ') + ']');
    const under = [0, 2, 4].filter((i) => T.cellOccupant(wx, wz + i, 0, 'object'));
    ok(res.heavy.every((r) => !r.valid && !r.made) && !under.length, 'a heavy aimed at a deck that has one is refused, nothing under the decks [' + res.heavy.map((r) => r.made).join(',') + ' under ' + under.join(',') + ']');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
