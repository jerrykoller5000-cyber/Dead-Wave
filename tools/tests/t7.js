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
  const box = (o) => {
    const b = new T.THREE.Box3().setFromObject(o);
    const f = (v) => v.toFixed(2);
    return 'x ' + f(b.min.x) + '..' + f(b.max.x) + ' y ' + f(b.min.y) + '..' + f(b.max.y) + ' z ' + f(b.min.z) + '..' + f(b.max.z);
  };
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
    const tx = 22, tz = -18;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  for (const t of T.trees) { t.alive = false; t.stump = false; t.falling = false; }
  for (const r of T.rocks) r.alive = false;
  const pgx = T.gridIndex(p.x) - 4, pgz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(pgx - 6), T.gridCentre(pgz - 4), T.gridCentre(pgx + 10), T.gridCentre(pgz + 4), T.sampleHeight(p.x, p.z), 8);
  await wait(100);

  for (const yawQ of [0, 1]) {
    const gx = pgx - yawQ * 4;
    T.setBuildYaw(yawQ);
    const along = yawQ === 0 ? [[0, -1], [0, 0], [0, 1]] : [[-1, 0], [0, 0], [1, 0]];
    for (const [dx, dz] of along) T.placeBuildAt('wall', gx + dx, pgz + dz);
    const host = wallAt(gx, pgz, 0);
    ok(!!host, 'yaw' + yawQ + ' host wall at cell');
    const w = T.placeBuildAt('door', gx, pgz, yawQ * (Math.PI / 2), { piece: host });
    ok(!!w && w.opening === 'door', 'yaw' + yawQ + ' door cut into wall');
    ok(!!w.mesh.userData.doorFrame, 'yaw' + yawQ + ' doorFrame exists');
    ok(Array.isArray(w.mesh.userData.doorLeaves) && w.mesh.userData.doorLeaves.length >= 1, 'yaw' + yawQ + ' doorLeaves built');
    ok(!w.mesh.userData.hubPost, 'yaw' + yawQ + ' no hub post (edge walls)');
    const closed = box(w.mesh.userData.doorFrame);
    out.push('  yaw' + yawQ + ' closed leaves: ' + closed);
    w.doorOpen = true; w.doorSide = 1;
    for (let i = 0; i < 40; i++) T.updateDoors(1 / 60);
    ok(T.doorIsOpen(w), 'yaw' + yawQ + ' door open after updateDoors');
    const leaf = w.mesh.userData.doorLeaves[0].hinge.rotation.y;
    ok(Math.abs(leaf) > 1.4, 'yaw' + yawQ + ' leaf swung ' + leaf.toFixed(2));
    out.push('  yaw' + yawQ + ' open leaves:   ' + box(w.mesh.userData.doorFrame));
  }

  T.setBuildYaw(0);
  const px = pgx + 6, pz = pgz;
  T.placeBuildAt('wall', px, pz);
  const pl = T.placeBuildAt('platform', px, pz, 0, { lv: 1 });
  ok(!!pl && pl.type === 'platform', 'platform on wall at level 1');
  out.push('platform ' + box(pl.mesh) + ' base y ' + pl.mesh.position.y.toFixed(2));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
