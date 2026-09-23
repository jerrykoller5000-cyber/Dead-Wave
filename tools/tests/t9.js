(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1200);
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const p = T.player.position; const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  const vis = (b) => b.mesh.userData.arms.map(a => a.visible ? 1 : 0).join('');
  const worldArms = (b) => { const t = ((Math.round(b.yaw / (Math.PI / 2)) % 4) + 4) % 4; return [0,1,2,3].map(d => b.mesh.userData.arms[(d - t + 4) % 4].visible ? 'NESW'[d] : '').join(''); };
  // L-shaped wall: along x from gx+2..gx+5 at gz-4, then down z from gz-4..gz-1 at gx+5
  const cells = [];
  for (let x = gx + 2; x <= gx + 5; x++) cells.push([x, gz - 4]);
  for (let z = gz - 3; z <= gz - 1; z++) cells.push([gx + 5, z]);
  for (const [x, z] of cells) T.placeBuildAt('wall', x, z);
  // wire on every wall, placed with yaw 0 (the "wrong" way for the x run)
  T.setBuildYaw(0);
  const wires = cells.map(([x, z]) => T.placeBuildAt('wire', x, z, 0));
  ok(wires.every(Boolean), 'wire on every wall');
  out.push('  wire arms: ' + wires.map(worldArms).join(' '));
  ok(worldArms(wires[1]) === 'EW', 'wire on x run follows the wall E-W (' + worldArms(wires[1]) + ')');
  ok(worldArms(wires[3]).split('').sort().join('') === 'SW', 'corner wire turns the corner (' + worldArms(wires[3]) + ')');
  ok(worldArms(wires[5]) === 'NS', 'wire on z run follows N-S (' + worldArms(wires[5]) + ')');
  ok(worldArms(wires[0]) === 'E', 'end-of-run wire matches the wall end (' + worldArms(wires[0]) + ')');
  // wire blocks walking across
  const w = wires[1]; const wx = T.gridCentre(cells[1][0]), wz = T.gridCentre(cells[1][1]);
  const r = T.pushOutOfBuild(w, wx + 0.6, wz + 0.05, 0.35, true, w.mesh.position.y);
  ok(Math.abs(r.z - (wz + 0.05)) > 0.1, 'wire strands collide along the arm');
  // platform over wired wall refused
  ok(!T.placeBuildAt('platform', cells[1][0], cells[1][1]), 'no platform over wire: ' + T.resolveTarget('platform', cells[1][0], cells[1][1]).refusal);
  // wire on platforms
  const Z = gz + 4;
  for (let x = gx - 2; x <= gx + 1; x++) { T.placeBuildAt('wall', x, Z); T.placeBuildAt('platform', x, Z); }
  const pw = []; for (let x = gx - 2; x <= gx + 1; x++) pw.push(T.placeBuildAt('wire', x, Z, 0));
  ok(pw.every(b => b && b.level === 1), 'wire goes on the platform, not inside it: levels ' + pw.map(b => b && b.level));
  ok(pw[0] && Math.abs(pw[0].mesh.position.y - (T.cellOccupant(gx - 2, Z, 1, 'base').mesh.position.y + 0.25)) < 1e-6, 'wire on platform rim height');
  ok(worldArms(pw[1]) === 'EW', 'wire on a platform run links to its neighbours (' + worldArms(pw[1]) + ')');
  // drag wire along the platforms of a new run
  const Z2 = gz - 4;
  for (let x = gx - 3; x <= gx; x++) out.push('  wall ' + x + ' ' + !!T.placeBuildAt('wall', x, Z2));
  T.setPlaceMode('wire');
  const c = T.camera.position;
  const aim = (x, z, y) => { const tx = T.gridCentre(x), tz = T.gridCentre(z); T.setAimRay(c.x, c.y, c.z, tx - c.x, y - c.y, tz - c.z); };
  const top = T.cellOccupant(gx, Z2, 0, 'base').mesh.position.y + 2.0;
  aim(gx - 3, Z2, top - 0.05); T.beginPlaceClick(); aim(gx, Z2, top - 0.05); T.updateGhostPreview();
  out.push('  drag ' + JSON.stringify(T.getBuildDrag()) + ' -> ' + JSON.stringify(T.getPlacePoint()) + ' plan ' + JSON.stringify(T.dragPlanNow()) + ' want ' + (gx-2) + '..' + (gx+2) + ',' + Z2 + ' player ' + gx + ',' + gz);
  const n0 = T.builds.length; T.commitBuildDrag();
  ok(T.builds.length - n0 === 4, 'dragged wire along a wall: ' + (T.builds.length - n0));
  return out.join('\n');
})()
