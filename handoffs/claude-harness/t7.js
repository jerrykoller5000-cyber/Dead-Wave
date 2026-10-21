(async () => {
  const T = window.TT; const out = [];
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1500);
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; }
  for (const r of T.rocks) r.alive = false;
  const p = T.player.position; const pgx = T.gridIndex(p.x) - 4, pgz = T.gridIndex(p.z);
  const box = (o) => { const b = new T.THREE.Box3().setFromObject(o); const f = (v) => v.toFixed(2); return 'x ' + f(b.min.x) + '..' + f(b.max.x) + ' y ' + f(b.min.y) + '..' + f(b.max.y) + ' z ' + f(b.min.z) + '..' + f(b.max.z); };
  for (const yawQ of [0, 1]) {
    const gx = pgx - yawQ * 4;
    T.setBuildYaw(yawQ);
    const along = yawQ === 0 ? [[0, -1], [0, 0], [0, 1]] : [[-1, 0], [0, 0], [1, 0]];
    for (const [dx, dz] of along) T.placeBuildAt('wall', gx + dx, pgz + dz);
    const w = T.placeBuildAt('door', gx, pgz);
    out.push('yaw' + yawQ + ' axis ' + w.doorAxis + ' cell centre ' + T.gridCentre(gx) + ',' + T.gridCentre(pgz) + ' base y ' + w.mesh.position.y.toFixed(2));
    out.push('  closed leaves: ' + box(w.mesh.userData.doorFrame));
    w.doorOpen = true; w.doorSide = 1; for (let i = 0; i < 40; i++) T.updateDoors(1 / 60);
    out.push('  open leaves:   ' + box(w.mesh.userData.doorFrame));
    out.push('  hub post visible: ' + w.mesh.userData.hubPost.visible);
  }
  T.setBuildYaw(0);
  T.placeBuildAt('wall', pgx + 6, pgz); const pl = T.placeBuildAt('platform', pgx + 6, pgz);
  out.push('platform ' + box(pl.mesh) + ' base y ' + pl.mesh.position.y.toFixed(2));
  return out.join('\n');
})()
