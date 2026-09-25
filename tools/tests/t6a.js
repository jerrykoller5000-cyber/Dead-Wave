// t6a - drag-placing a wall row. GB-45 (GB-A9): the drag starts and ends on the cells aimed at,
// and every cell of the row is placeable.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
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
  aimAtCell(pgx - 3, z0); const sp = Object.assign({}, T.getPlacePoint()); out.push('start pt ' + JSON.stringify(sp) + ' want ' + (pgx - 3) + ',' + z0);
  T.beginPlaceClick();
  aimAtCell(pgx + 3, z0); const ep = Object.assign({}, T.getPlacePoint()); out.push('end pt ' + JSON.stringify(ep));
  const refusals = [];
  for (let gx = pgx - 3; gx <= pgx + 3; gx++) { const r = T.placeRefusalFor('wall', gx, z0); refusals.push(r); out.push(gx + ': ' + r); }
  out.push('player ' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ' cam ' + c.x.toFixed(1) + ',' + c.y.toFixed(1) + ',' + c.z.toFixed(1));
  ok(sp.gx === pgx - 3 && sp.gz === z0 && ep.gx === pgx + 3 && ep.gz === z0,
    'drag from ' + sp.gx + ',' + sp.gz + ' to ' + ep.gx + ',' + ep.gz + ' (want ' + (pgx - 3) + '..' + (pgx + 3) + ',' + z0 + ')');
  ok(refusals.every((r) => r === null), 'all seven cells of the row take a wall [' + refusals.join(',') + ']');
  return out.join('\n');
})()
