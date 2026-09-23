(async () => {
  const T = window.TT; const out = [];
  document.getElementById('modeHunt').click();
  await new Promise(r => setTimeout(r, 1500));
  T.unlockAllBuilds(); T.addCash(50000);
  const p = T.player.position;
  const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
  // a wall run along x = pgx+3, z from pgz-4..pgz+4, with platforms and railings on the outer edge
  const wx = pgx + 3;
  for (let dz = -4; dz <= 4; dz++) { T.placeBuildAt('wall', wx, pgz + dz); T.placeBuildAt('platform', wx, pgz + dz); }
  T.setBuildYaw(1);
  for (let dz = -4; dz <= 4; dz++) T.placeBuildAt('railing', wx, pgz + dz);
  await new Promise(r => setTimeout(r, 400));
  const cam = T.camera.position;
  out.push('player ' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ',' + p.z.toFixed(1) + ' cam ' + cam.x.toFixed(1) + ',' + cam.y.toFixed(1) + ',' + cam.z.toFixed(1));
  for (const kind of ['light', 'heavy']) for (let dz = -4; dz <= 4; dz += 2) {
    const tgt = T.cellOccupant(wx, pgz + dz, 1, 'base');
    T.setPlaceMode(kind);
    const tx = T.gridCentre(wx), tz = T.gridCentre(pgz + dz), ty = tgt.deck.deckY;
    T.setAimRay(cam.x, cam.y, cam.z, tx - cam.x, ty - cam.y, tz - cam.z);
    T.updateGhostPreview();
    const pt = T.getPlacePoint();
    const n0 = T.builds.length; T.tryPlace();
    out.push(kind + ' dz=' + dz + ' -> cell ' + (pt.gx - wx) + ',' + (pt.gz - pgz) + ' valid=' + T.getGhostValid() + ' placed=' + (T.builds.length - n0));
  }
  return out.join('\n');
})()
