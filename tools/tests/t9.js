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
  const alongX = (b) => { const t = T.thinBoxFor(b); return t.hx > t.hz; };
  const alongZ = (b) => { const t = T.thinBoxFor(b); return t.hz > t.hx; };
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
    const tx = 20, tz = 18;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  for (const t of T.trees) { t.alive = false; t.stump = false; t.falling = false; }
  for (const r of T.rocks) r.alive = false;
  const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(gx - 8), T.gridCentre(gz - 8), T.gridCentre(gx + 8), T.gridCentre(gz + 8), T.sampleHeight(p.x, p.z), 8);
  await wait(100);

  // L-shaped wall: x-run then z-run, with matching yaw
  const xCells = [];
  for (let x = gx + 2; x <= gx + 5; x++) xCells.push([x, gz - 4]);
  const zCells = [];
  for (let z = gz - 3; z <= gz - 1; z++) zCells.push([gx + 5, z]);
  T.setBuildYaw(0);
  for (const [x, z] of xCells) ok(!!T.placeBuildAt('wall', x, z), 'x-run wall ' + x + ',' + z);
  T.setBuildYaw(1);
  for (const [x, z] of zCells) ok(!!T.placeBuildAt('wall', x, z), 'z-run wall ' + x + ',' + z);

  const allCells = xCells.concat(zCells);
  const wires = allCells.map(([x, z]) => {
    const host = wallAt(x, z, 0);
    return T.placeBuildAt('wire', x, z, 0, { piece: host });
  });
  ok(wires.every(Boolean), 'wire capped on every wall of the L');
  ok(xCells.every((_, i) => alongX(wires[i])), 'wire on x-run follows the wall E-W');
  ok(zCells.every((_, i) => alongZ(wires[xCells.length + i])), 'wire on z-run follows the wall N-S');
  const cornerWire = wires[xCells.length - 1]; // gx+5, gz-4 — last of x-run (corner cell)
  ok(alongX(cornerWire), 'corner cell keeps its x-run wall edge (' + (alongX(cornerWire) ? 'EW' : 'NS') + ')');
  ok(alongX(wires[0]), 'end-of-run wire matches the wall end');

  // wire blocks walking across the strand
  const w = wires[1];
  const tb = T.thinBoxFor(w);
  const r = T.pushOutOfBuild(w, tb.cx, tb.cz + tb.hz + 0.05, 0.35, true, w.mesh.position.y);
  ok(Math.abs(r.z - (tb.cz + tb.hz + 0.05)) > 0.05, 'wire strands collide along the arm');

  // platform over wired wall refused
  ok(!T.placeBuildAt('platform', allCells[1][0], allCells[1][1], 0, { lv: 1 }),
    'no platform over wire: ' + T.resolveTarget('platform', allCells[1][0], allCells[1][1], 0, { lv: 1 }).refusal);

  // wire on platforms (rim height = pad + edgeH)
  const Z = gz + 4;
  T.setBuildYaw(0);
  for (let x = gx - 2; x <= gx + 1; x++) {
    T.placeBuildAt('wall', x, Z);
    T.placeBuildAt('platform', x, Z, 0, { lv: 1 });
  }
  const edgeH = T.ruleFor('platform').edgeH;
  const pw = [];
  for (let x = gx - 2; x <= gx + 1; x++) pw.push(T.placeBuildAt('wire', x, Z, 0, { lv: 1 }));
  ok(pw.every(b => b && b.level === 1), 'wire goes on the platform, not inside it: levels ' + pw.map(b => b && b.level));
  const plat0 = T.cellOccupant(gx - 2, Z, 1, 'base');
  ok(pw[0] && Math.abs(pw[0].mesh.position.y - (plat0.mesh.position.y + edgeH)) < 1e-6,
    'wire on platform rim height (edgeH=' + edgeH + ')');
  ok(pw.slice(1, 3).every(alongX), 'wire on a platform run follows the rim E-W');

  // drag wire along a fresh wall run
  const Z2 = gz + 1;
  for (let x = gx - 3; x <= gx; x++) T.placeBuildAt('wall', x, Z2);
  T.setPlaceMode('wire');
  const c = T.camera.position;
  const aim = (x, z, y) => {
    const tx = T.gridCentre(x), tz = T.gridCentre(z);
    T.setAimRay(c.x, c.y, c.z, tx - c.x, y - c.y, tz - c.z);
  };
  const host = wallAt(gx - 3, Z2, 0);
  const top = host.mesh.position.y + 2.0;
  aim(gx - 3, Z2, top - 0.05); T.beginPlaceClick();
  aim(gx, Z2, top - 0.05); T.updateGhostPreview();
  const plan = T.dragPlanNow();
  const n0 = T.builds.length; T.commitBuildDrag();
  const made = T.builds.length - n0;
  ok(made === 4 && plan && plan.every(w => !w), 'dragged wire along a wall: ' + made);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
