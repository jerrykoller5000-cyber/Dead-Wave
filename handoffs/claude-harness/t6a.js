(async () => {
  const T = window.TT; const out = [];
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1500);
  T.unlockAllBuilds(); T.addCash(100000);
  const p = T.player.position;
  const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
  const c = T.camera.position;
  const aimAtCell = (gx, gz, y) => { const tx = T.gridCentre(gx), tz = T.gridCentre(gz); const ty = y == null ? T.sampleHeight(tx, tz) : y; T.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z); };
  T.setPlaceMode('wall');
  const z0 = pgz + 3;
  aimAtCell(pgx - 3, z0); out.push('start pt ' + JSON.stringify(T.getPlacePoint()) + ' want ' + (pgx - 3) + ',' + z0);
  T.beginPlaceClick();
  aimAtCell(pgx + 3, z0); out.push('end pt ' + JSON.stringify(T.getPlacePoint()));
  for (let gx = pgx - 3; gx <= pgx + 3; gx++) out.push(gx + ': ' + T.placeRefusalFor('wall', gx, z0));
  out.push('player ' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ' cam ' + c.x.toFixed(1) + ',' + c.y.toFixed(1) + ',' + c.z.toFixed(1));
  return out.join('\n');
})()
