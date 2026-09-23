(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1500);
  T.unlockAllBuilds(); T.addCash(100000);
  const p = T.player.position;
  // find open ground: a 15x24 block of cells that all accept a wall
  let found = null;
  T.setPlaceMode('wall');
  for (const t of T.trees) { t.alive = false; t.stump = false; t.falling = false; }
  for (const r of T.rocks) r.alive = false;
  for (let tries = 0; tries < 400 && !found; tries++) {
    const cx = Math.round((Math.random() - 0.5) * 50), cz = Math.round((Math.random() - 0.5) * 50);
    let good = true;
    for (let dx = -6; dx <= 4 && good; dx++) for (let dz = -9; dz <= 4 && good; dz++) {
      if (T.placeRefusalFor('wall', cx + dx, cz + dz) && !(dx === 0 && dz === 0)) good = false;
    }
    if (good) found = { cx, cz };
  }
  out.push('open block ' + JSON.stringify(found));
  p.set(T.gridCentre(found.cx), T.sampleHeight(T.gridCentre(found.cx), T.gridCentre(found.cz)), T.gridCentre(found.cz));
  await wait(600);
  const pgx = found.cx, pgz = found.cz;
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
  ok(bank0 - T.getBank() === made * 14, 'charged per piece: ' + (bank0 - T.getBank()));
  const mid = T.cellOccupant(pgx, z0, 0, 'base');
  ok(mid && mid.mesh.userData.arms.filter(a => a.visible).length === 2, 'middle of the run links both ways');
  // --- drag platforms on top of that line (aim at wall tops) ---
  T.setPlaceMode('platform');
  const wy = mid.mesh.position.y + 2.0;
  aimAtCell(pgx - 3, z0, wy - 0.05); T.beginPlaceClick();
  aimAtCell(pgx + 3, z0, wy - 0.05); T.updateGhostPreview();
  const n1 = T.builds.length; T.commitBuildDrag();
  ok(T.builds.length - n1 === 7, 'platforms dragged onto the wall run: ' + (T.builds.length - n1));
  // --- drag railings along the run: should lie along x ---
  T.setPlaceMode('railing'); T.setBuildYaw(1);
  const dy = T.cellOccupant(pgx, z0, 1, 'base').deck.deckY;
  aimAtCell(pgx - 3, z0, dy); T.beginPlaceClick();
  aimAtCell(pgx + 3, z0, dy); T.updateGhostPreview();
  const n2 = T.builds.length; T.commitBuildDrag();
  const rl = T.builds.slice(n2);
  ok(rl.length === 7 && rl.every(r => Math.round(r.yaw / (Math.PI / 2)) % 2 === 0), 'railings run along the drag (' + rl.length + ', yaws ' + [...new Set(rl.map(r => Math.round(r.yaw / (Math.PI / 2))))] + ')');
  // --- single click still works for draggables ---
  T.setPlaceMode('sandbag');
  aimAtCell(pgx - 5, pgz - 5); T.beginPlaceClick(); T.updateGhostPreview();
  const n3 = T.builds.length; T.commitBuildDrag();
  ok(T.builds.length - n3 === 1, 'click without drag places one sandbag');
  // --- scrap highlight: point at the wall side under the platform ---
  T.setPlaceMode('light');
  const wall = T.cellOccupant(pgx + 1, z0, 0, 'base');
  aimAtCell(pgx + 1, z0, wall.mesh.position.y + 1.0);
  T.updateGhostPreview();
  const tgt = T.scrapTarget();
  ok(tgt === wall, 'aiming at the wall face targets the wall, not the rail on top (' + (tgt && tgt.type) + ')');
  ok(T.scrapSet(wall).length === 3, 'wall carries platform + railing: set ' + T.scrapSet(wall).length);
  ok(/X scraps: Wall \+ 2 on it/.test(T.getScrapHint()), 'banner: ' + T.getScrapHint());
  // aim at deck: platform targeted
  { const tx = T.gridCentre(pgx + 2), tz = T.gridCentre(z0); T.setAimRay(tx + 0.3, dy + 12, tz - 0.5, -0.3, -12, 0.5); } T.updateGhostPreview();
  const t2 = T.scrapTarget();
  ok(t2 && t2.type === 'platform', 'aiming at the deck targets the platform (' + (t2 && t2.type) + ')');
  const before = T.getBank(); const exp = T.scrapRefund(wall);
  aimAtCell(pgx + 1, z0, wall.mesh.position.y + 1.0); T.updateGhostPreview();
  T.sellNearestBuild();
  ok(T.getBank() - before === exp && !T.cellOccupant(pgx + 1, z0, 1, 'base'), 'scrapping the wall refunds the stack (+' + (T.getBank() - before) + ')');
  // --- floor chain drag across open space from a wall ---
  const zf = pgz - 3;
  T.placeBuildAt('wall', pgx - 1, zf); T.placeBuildAt('wall', pgx + 3, zf);
  T.setPlaceMode('floor');
  const fy = T.cellOccupant(pgx - 1, zf, 0, 'base').mesh.position.y + 2.0;
  aimAtCell(pgx - 1, zf, fy); T.beginPlaceClick();
  aimAtCell(pgx + 3, zf, fy); T.updateGhostPreview();
  out.push('floor drag from ' + JSON.stringify(T.getBuildDrag()) + ' to ' + JSON.stringify(T.getPlacePoint()) + ' want ' + (pgx-1) + '..' + (pgx+3) + ',' + zf);
  for (let gx = pgx - 1; gx <= pgx + 3; gx++) out.push('  ' + gx + ' ' + T.placeRefusalFor('floor', gx, zf) + ' ' + JSON.stringify(T.resolveTarget('floor', gx, zf)));
  const plan = T.dragPlanNow();
  ok(plan && plan.length === 5 && plan.every(w => !w), 'floor drag preview all green: ' + JSON.stringify(plan));
  const n4 = T.builds.length; T.commitBuildDrag();
  ok(T.builds.length - n4 === 5, 'floor dragged wall-to-wall across a gap: ' + (T.builds.length - n4));
  return out.join('\n');
})()
