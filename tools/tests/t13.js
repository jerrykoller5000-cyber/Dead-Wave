(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
  // Insertion owns the marine for ~9s; cutaway only runs once the match is live and
  // player teleports stick.
  {
    const pl = T.player.position;
    const tx = 2, tz = -4;
    for (let i = 0; i < 70; i++) {
      await wait(200);
      pl.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(30);
      if (Math.hypot(pl.x - tx, pl.z - tz) < 0.4) break;
    }
  }
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const p = T.player.position;
  let found = null;
  for (let tries = 0; tries < 400 && !found; tries++) {
    const cx = Math.round((Math.random() - 0.5) * 50), cz = Math.round((Math.random() - 0.5) * 50);
    let good = true;
    for (let dx = -6; dx <= 6 && good; dx++) for (let dz = -6; dz <= 6 && good; dz++) if (T.placeRefusalFor('spikes', cx + dx, cz + dz) && Math.abs(dx) + Math.abs(dz) > 1) good = false;
    if (good) found = { cx, cz };
  }
  const gx = found.cx, gz = found.cz;
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz));
  await wait(400);
  const count = (b) => { let n = 0; b.mesh.traverse(o => { if (o.isMesh) n++; }); return n; };
  // baked mesh counts
  const w = T.placeBuildAt('wall', gx + 2, gz - 3, 0);
  const wi = T.placeBuildAt('wire', gx + 3, gz - 4, 0);
  const sb = T.placeBuildAt('sandbag', gx + 4, gz - 4, 0);
  const fl = T.placeBuildAt('floor', gx - 4, gz - 4);
  out.push('  meshes: wall ' + count(w) + ' wire ' + count(wi) + ' sandbag ' + count(sb) + ' floor ' + count(fl));
  ok(count(w) <= 12 && count(wi) <= 2 && count(sb) <= 2 && count(fl) <= 3, 'pieces baked into a few meshes');
  // #1: player on ground, cell with a wired wall on its edge -> ground floor
  const cx = gx + 2, cz = gz - 3;
  T.placeBuildAt('wire', cx, cz, 0);   // cap on that wall
  out.push('  why: ' + JSON.stringify(T.resolveTarget('floor', cx, cz)) + ' refusal ' + T.placeRefusalFor('floor', cx, cz) + ' cap ' + !!T.cellOccupant(cx, cz, 0, 'cap0'));
  const f1 = T.placeBuildAt('floor', cx, cz);
  ok(f1 && f1.level === 0, 'on the ground: floor goes down beside a wired wall (lv ' + (f1 && f1.level) + ')');
  // #2: player upstairs -> floors go up
  const rx = gx - 2, rz = gz + 3;
  for (let q = 0; q < 4; q++) T.placeBuildAt('wall', rx, rz, q);
  const g0 = T.placeBuildAt('floor', rx, rz);
  ok(g0 && g0.level === 0, 'on the ground in a walled square: ground floor (' + (g0 && g0.level) + ')');
  T.placeBuildAt('wall', rx + 1, rz, 1); T.placeBuildAt('floor', rx + 1, rz); T.placeBuildAt('floor', rx + 1, rz, 0, { forceLv: 1 }); // ground, then the deck above
  const deck = T.cellOccupant(rx + 1, rz, 1, 'base');
  p.set(T.gridCentre(rx + 1), deck.deck.deckY, T.gridCentre(rz)); await wait(150);
  const up = T.placeBuildAt('floor', rx, rz);
  ok(up && up.level === 1, 'standing upstairs: floor goes on the walls (' + (up && up.level) + ')');
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz)); await wait(150);
  // #3: cutaway
  for (let q = 0; q < 4; q++) T.placeBuildAt('wall', gx, gz + 1, q);
  // Place roof via forceLv so we do not depend on standing upstairs on a far deck.
  const roof = T.placeBuildAt('floor', gx, gz + 1, 0, { forceLv: 1 });
  const tur = T.placeBuildAt('light', gx, gz + 1, 0, { lv: 1 });
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz + 1)), T.gridCentre(gz + 1));
  // Give cutaway time to ease toward FADE_DEFAULT / FADE_TURRET (~0.2s at FADE_RATE 5).
  await wait(500);
  let op = 1; roof.mesh.traverse(o => { if (o.isMesh && o.material) op = Math.min(op, o.material.opacity); });
  let top = 1; for (const m of (tur && tur._fadeMats) || []) top = Math.min(top, m.opacity);
  ok(roof && roof.level === 1 && op < 0.5 && tur && tur.mesh.visible && top >= 0.5 && top < 0.9, 'roof over the marine goes see-through, turret up there stays mostly solid (roof ' + op + ', turret ' + top + ')');
  p.set(T.gridCentre(gx) + 8, T.sampleHeight(T.gridCentre(gx) + 8, T.gridCentre(gz + 1)), T.gridCentre(gz + 1)); await wait(500);
  op = 1; roof.mesh.traverse(o => { if (o.isMesh && o.material) op = Math.min(op, o.material.opacity); });
  ok(op === 1 && tur.mesh.visible, 'and solid again once he walks out');
  // #4: house
  const h = T.house;
  if (h && h.present) {
    const hx = T.gridIndex(h.group.position.x), hz = T.gridIndex(h.group.position.z);
    const r = T.placeRefusalFor('floor', hx, hz);
    ok(r === 'that is the cabin', 'no floor inside the cabin: ' + r);
  } else out.push('SKIP no house');
  return out.join('\n');
})()
