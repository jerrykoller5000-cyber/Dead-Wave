(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const wallAt = (gx, gz, lv = 0) => {
    for (const s of ['edge0', 'edge1', 'edge2', 'edge3']) {
      const w = T.cellOccupant(gx, gz, lv, s);
      if (w && w.type === 'wall') return w;
    }
    return null;
  };
  const platAt = (gx, gz, lv = 1) => T.cellOccupant(gx, gz, lv, 'base');
  try {
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
  T.unlockAllBuilds(); T.addCash(100000);
  const p = T.player.position;
  {
    const tx = 24, tz = 20;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  for (const t of T.trees) { t.alive = false; t.stump = false; t.falling = false; }
  for (const r of T.rocks) r.alive = false;
  const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(pgx - 8), T.gridCentre(pgz - 10), T.gridCentre(pgx + 6), T.gridCentre(pgz + 6), T.sampleHeight(p.x, p.z), 8);
  p.set(T.gridCentre(pgx), T.sampleHeight(T.gridCentre(pgx), T.gridCentre(pgz)), T.gridCentre(pgz));
  await wait(200);
  const cam = () => T.camera.position;
  const aimAtCell = (gx, gz, y) => { const c = cam(); const tx = T.gridCentre(gx), tz = T.gridCentre(gz); const ty = y == null ? T.sampleHeight(tx, tz) : y; T.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z); };
  // --- drag a wall line along x ---
  T.setPlaceMode('wall');
  const z0 = pgz + 3;
  aimAtCell(pgx - 3, z0); T.beginPlaceClick();
  ok(!!T.getBuildDrag(), 'drag started');
  aimAtCell(pgx + 3, z0); T.updateGhostPreview();
  const bank0 = T.getBank(); const n0 = T.builds.length;
  T.commitBuildDrag();
  const made = T.builds.length - n0;
  ok(made === 7, 'dragged wall line built ' + made + ' of 7');
  const wallCost = (T.COST && T.COST.wall) || 14;
  ok(bank0 - T.getBank() === made * wallCost, 'charged per piece: ' + (bank0 - T.getBank()));
  const mid = wallAt(pgx, z0, 0);
  ok(!!mid && mid.type === 'wall', 'middle of the run is a full-edge wall');
  ok(!mid.mesh.userData.arms || mid.mesh.userData.arms.length === 0, 'walls no longer grow hub arms along a run');
  // --- drag platforms on top of that line ---
  T.setPlaceMode('platform');
  const wy = mid.mesh.position.y + 2.0;
  aimAtCell(pgx - 3, z0, wy - 0.05); T.beginPlaceClick();
  aimAtCell(pgx + 3, z0, wy - 0.05); T.updateGhostPreview();
  const n1 = T.builds.length; T.commitBuildDrag();
  ok(T.builds.length - n1 === 7, 'platforms dragged onto the wall run: ' + (T.builds.length - n1));
  // --- drag railings along the run ---
  T.setPlaceMode('railing'); T.setBuildYaw(1);
  const plat = platAt(pgx, z0, 1);
  ok(!!plat && plat.deck, 'platform deck at mid cell');
  const dy = plat.deck.deckY;
  aimAtCell(pgx - 3, z0, dy); T.beginPlaceClick();
  aimAtCell(pgx + 3, z0, dy); T.updateGhostPreview();
  const n2 = T.builds.length; T.commitBuildDrag();
  const rl = T.builds.slice(n2).filter(b => b.type === 'railing');
  ok(rl.length === 7 && rl.every(r => Math.round(r.yaw / (Math.PI / 2)) % 2 === 0), 'railings run along the drag (' + rl.length + ', yaws ' + [...new Set(rl.map(r => Math.round(r.yaw / (Math.PI / 2))))] + ')');
  // --- single click still works for draggables ---
  T.setPlaceMode('sandbag');
  aimAtCell(pgx - 5, pgz - 5); T.beginPlaceClick(); T.updateGhostPreview();
  const n3 = T.builds.length; T.commitBuildDrag();
  ok(T.builds.length - n3 === 1, 'click without drag places one sandbag');
  // --- scrap highlight (X held so banner fills) ---
  T.setPlaceMode('light');
  const wall = wallAt(pgx + 1, z0, 0);
  ok(!!wall, 'wall under platform exists for scrap aim');
  T.setScrapHeld(true);
  aimAtCell(pgx + 1, z0, wall.mesh.position.y + 1.0);
  T.updateGhostPreview();
  const tgt = T.scrapTarget();
  ok(tgt === wall, 'aiming at the wall face targets the wall, not the rail on top (' + (tgt && tgt.type) + ')');
  ok(T.scrapSet(wall).length === 3, 'wall carries platform + railing: set ' + T.scrapSet(wall).length);
  const hint = T.getScrapHint();
  ok(/X scraps: Wall \+ 2 on it/.test(hint), 'banner: ' + hint);
  { const tx = T.gridCentre(pgx + 2), tz = T.gridCentre(z0); T.setAimRay(tx + 0.3, dy + 12, tz - 0.5, -0.3, -12, 0.5); } T.updateGhostPreview();
  const t2 = T.scrapTarget();
  ok(t2 && t2.type === 'platform', 'aiming at the deck targets the platform (' + (t2 && t2.type) + ')');
  T.setScrapHeld(false);
  const before = T.getBank(); const exp = T.scrapRefund(wall);
  aimAtCell(pgx + 1, z0, wall.mesh.position.y + 1.0); T.updateGhostPreview();
  T.sellNearestBuild();
  ok(T.getBank() - before === exp && !platAt(pgx + 1, z0, 1), 'scrapping the wall refunds the stack (+' + (T.getBank() - before) + ')');
  // --- floor chain: aim at wall tops from the ground must roof, not boardwalk (GB-8) ---
  const zf = pgz - 3;
  T.placeBuildAt('wall', pgx - 1, zf); T.placeBuildAt('wall', pgx + 3, zf);
  T.setPlaceMode('floor');
  const fy = wallAt(pgx - 1, zf, 0).mesh.position.y + 2.0;
  aimAtCell(pgx - 1, zf, fy); T.beginPlaceClick();
  aimAtCell(pgx + 3, zf, fy); T.updateGhostPreview();
  const plan = T.dragPlanNow();
  ok(plan && plan.length === 5 && plan.every(w => !w), 'floor drag preview all green: ' + JSON.stringify(plan));
  const n4 = T.builds.length; T.commitBuildDrag();
  const roofs = T.builds.slice(n4).filter(b => b.type === 'floor');
  ok(roofs.length === 5, 'floor dragged wall-to-wall across a gap: ' + roofs.length);
  ok(roofs.every(f => f.level === 1), 'dragged floors are roofs at level 1 (not boardwalks): ' + roofs.map(f => f.level).join(','));
  // Sanity: forceLv still pins a boardwalk when asked.
  const zb = pgz - 6;
  const bw = T.placeBuildAt('floor', pgx, zb, 0, { forceLv: 0 });
  ok(!!bw && bw.level === 0, 'forceLv:0 still places a boardwalk');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
