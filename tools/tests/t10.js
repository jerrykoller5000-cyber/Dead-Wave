(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
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
  for (const t of T.trees) { t.alive = false; t.stump = false; t.falling = false; } for (const r of T.rocks) r.alive = false;
  const p = T.player.position;
  {
    const tx = 18, tz = 16;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(gx - 8), T.gridCentre(gz - 8), T.gridCentre(gx + 8), T.gridCentre(gz + 8), T.sampleHeight(p.x, p.z), 8);
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz));
  await wait(200);
  const cam = () => T.camera.position;
  const aim = (x, y, z) => { T.setAimRay(x + 0.3, y + 14, z + 0.2, -0.3, -14, -0.2); };
  const aimCell = (cx, cz, y) => aim(T.gridCentre(cx), y == null ? T.sampleHeight(T.gridCentre(cx), T.gridCentre(cz)) : y, T.gridCentre(cz));
  const f2 = (v) => v.toFixed(2);
  // --- drag a wall line along X (south edges), from the ground
  T.setPlaceMode('wall'); T.setBuildYaw(0);
  const zr = gz - 3;
  aimCell(gx - 3, zr); T.beginPlaceClick(); aimCell(gx + 3, zr); T.updateGhostPreview();
  const n0 = T.builds.length; T.commitBuildDrag();
  const run = T.builds.slice(n0);
  ok(run.length === 7, 'wall line built ' + run.length + '/7');
  const boxes = run.map(T.thinBoxFor).sort((a, b) => a.cx - b.cx);
  let contiguous = true;
  for (let i = 1; i < boxes.length; i++) if (Math.abs((boxes[i - 1].cx + boxes[i - 1].hx) - (boxes[i].cx - boxes[i].hx)) > 1e-6) contiguous = false;
  ok(contiguous, 'wall run is continuous edge to edge (no gaps)');
  ok(run.every(w => Math.abs(T.thinBoxFor(w).cz + T.thinBoxFor(w).hz - (T.gridCentre(zr) + 1)) < 1e-6), 'outer face flush with the grid line');
  ok(run.every(w => w.mesh.position.y === run[0].mesh.position.y), 'one height along the run: ' + run.map(w => f2(w.mesh.position.y)).join(' ') + ' ground ' + run.map(w => f2(T.sampleHeight(T.thinBoxFor(w).cx, T.thinBoxFor(w).cz))).join(' '));
  // --- drag along Z (east edges) from the east end: corner
  aimCell(gx + 3, zr + 1); T.setBuildYaw(1); T.beginPlaceClick(); aimCell(gx + 3, zr + 4); T.updateGhostPreview();
  const n1 = T.builds.length; T.commitBuildDrag();
  const run2 = T.builds.slice(n1);
  ok(run2.length === 4 && run2.every(w => w.slot === 'edge1'), 'z run on east edges: ' + run2.length + ' ' + run2.map(w => w.slot));
  // corner cell (gx+3, zr) now: add east wall -> two walls in one cell
  const cw = T.placeBuildAt('wall', gx + 3, zr, Math.PI / 2);
  const s0 = T.thinBoxFor(T.cellOccupant(gx + 3, zr, 0, 'edge0')), s1 = T.thinBoxFor(cw);
  ok(cw && Math.abs((s0.cx + s0.hx) - (s1.cx + s1.hx)) < 1e-6 && Math.abs((s0.cz + s0.hz) - (s1.cz + s1.hz)) < 1e-6, 'corner: both walls reach the same outer corner');
  // --- platform on a wall cell
  const pl = T.placeBuildAt('platform', gx, zr, 0, { lv: 1 });
  const baseEdge = T.cellOccupant(gx, zr, 0, 'edge0');
  ok(pl && pl.level === 1 && Math.abs(pl.mesh.position.y - (baseEdge.mesh.position.y + 2)) < 1e-6, 'platform sits on the wall top');
  // turret by aiming at the deck from above
  T.setPlaceMode('heavy');
  T.setAimRay(T.gridCentre(gx) + 0.2, pl.deck.deckY + 10, T.gridCentre(zr) - 0.2, -0.2, -10, 0.2);
  T.updateGhostPreview();
  const pt = T.getPlacePoint();
  ok(pt.lv === 1, 'aiming at the deck targets level 1 (' + pt.lv + ')');
  const nT = T.builds.length; T.tryPlace();
  const tur = T.builds[T.builds.length - 1];
  ok(T.builds.length === nT + 1 && tur.type === 'heavy' && tur.level === 1, 'turret placed on the platform');
  // --- wire on a wall by pointing at it
  T.setPlaceMode('wire'); T.setBuildYaw(1); // deliberately the wrong edge
  const w3 = T.cellOccupant(gx - 2, zr, 0, 'edge0');
  const tb = T.thinBoxFor(w3);
  aim(tb.cx, w3.mesh.position.y + 1.2, tb.cz); T.updateGhostPreview();
  const nW = T.builds.length; T.tryPlace();
  const wire = T.builds[T.builds.length - 1];
  ok(T.builds.length === nW + 1 && wire.slot === 'cap0' && Math.abs(wire.mesh.position.y - (w3.mesh.position.y + 2)) < 1e-6, 'wire strung on the wall you point at: ' + wire.slot + ' y+' + f2(wire.mesh.position.y - w3.mesh.position.y));
  ok(Math.abs(T.thinBoxFor(wire).cz - tb.cz) < 1e-6, 'wire rides the wall line');
  ok(!T.placeBuildAt('platform', gx - 2, zr, 0, { lv: 1 }), 'no deck over a wired wall: ' + T.resolveTarget('platform', gx - 2, zr, 0, { lv: 1 }).refusal);
  // barricade + sandbag on walls
  const bar = T.placeBuildAt('barricade', gx - 1, zr, 0);
  ok(bar && bar.slot === 'cap0', 'barricade on a wall: ' + (bar && bar.slot));
  const sb = T.placeBuildAt('sandbag', gx + 1, zr, 0);
  ok(sb && sb.slot === 'cap0', 'sandbags on a wall: ' + (sb && sb.slot));
  // sandbag line on the ground, contiguous
  T.setBuildYaw(0);
  const sbl = [];
  for (let x = gx - 3; x <= gx + 1; x++) sbl.push(T.placeBuildAt('sandbag', x, gz + 3, 0));
  const sbb = sbl.map(T.thinBoxFor).sort((a, b) => a.cx - b.cx);
  ok(sbl.every(Boolean), 'sandbag line all placed');
  ok(sbb.every((b, i) => i === 0 || Math.abs((sbb[i - 1].cx + sbb[i - 1].hx) - (b.cx - b.hx)) < 1e-6), 'sandbag line continuous');
  // --- door by pointing at a wall
  T.setPlaceMode('door');
  const dw = T.cellOccupant(gx + 2, zr, 0, 'edge0');
  const db = T.thinBoxFor(dw);
  aim(db.cx, dw.mesh.position.y + 1.0, db.cz); T.updateGhostPreview();
  ok(T.getGhostValid() && T.getModMarks().ok && !T.getModMarks().bad, 'door mode: the wall is outlined green');
  T.tryPlace();
  ok(dw.opening === 'door', 'door cut');
  let r = T.pushOutOfBuild(dw, db.cx, db.cz + 0.05, 0.35, true, dw.mesh.position.y);
  ok(Math.abs(r.z - (db.cz + 0.05)) > 0.1, 'shut door blocks');
  p.set(db.cx, dw.mesh.position.y, db.cz - 1.2);   // inside the cell (north of the south edge)
  await wait(80);
  ok(T.actionTarget() === 'door', 'E targets the door');
  T.doAction(); for (let i = 0; i < 30; i++) T.updateDoors(1 / 60);
  r = T.pushOutOfBuild(dw, db.cx, db.cz + 0.05, 0.35, true, dw.mesh.position.y);
  ok(T.doorIsOpen(dw) && Math.abs(r.z - (db.cz + 0.05)) < 1e-6, 'open door lets you through');
  const bx = new T.THREE.Box3().setFromObject(dw.mesh.userData.doorFrame);
  ok(bx.min.z > db.cz - 0.1, 'leaves swung away from the marine (outward): z ' + f2(bx.min.z) + '..' + f2(bx.max.z) + ' wall at ' + f2(db.cz));
  // --- window: one opening in the middle
  const ww = T.cellOccupant(gx - 3, zr, 0, 'edge0');
  T.placeBuildAt('window', gx - 3, zr, 0, { piece: ww });
  const ud = ww.mesh.userData;
  ok(ww.opening === 'window' && ud.upperMid && !ud.upperMid.visible && ud.upper && ud.upper.visible && ud.sill && ud.sill.visible, 'window: middle upper boards out, sides kept, sill shown');
  // --- scrapping the only wall under a platform drops it and the turret
  const baseW = T.cellOccupant(gx, zr, 0, 'edge0');
  const set = T.dependentsOf(baseW).map(o => o.type).sort().join(',');
  ok(set === 'heavy,platform', 'wall under platform: dependents ' + set);
  T.removeBuild(baseW);
  ok(!T.builds.includes(pl) && !T.builds.includes(tur), 'platform and turret came down with it');
  // --- floor bridging from the wall of the next cell
  const fz = gz + 1;
  T.placeBuildAt('wall', gx - 2, fz, Math.PI / 2);  // east edge of (gx-2): shared with (gx-1)
  const fl = T.placeBuildAt('floor', gx - 1, fz, 0, { forceLv: 1 });
  ok(fl && fl.level === 1 && fl.spanDepth === 1, 'floor rests on the wall of the square next door (depth ' + (fl && fl.spanDepth) + ')');
  // --- bars hidden at full health
  T.updateBuildBars();
  ok(T.builds.every(b => !b.bar || !b.bar.visible), 'no health bars at full health');
  const hb = T.builds.find(b => b.type === 'wall'); T.damageBuild(hb, 5, 'zombie', true); T.updateBuildBars();
  ok(hb.bar.visible, 'bar shows once hurt');
  // --- mortar faces away
  const m = T.placeBuildAt('mortar', gx - 4, gz - 1);
  m.mesh.updateMatrixWorld(true);
  const tube = m.mesh.userData.tube; const tip = new T.THREE.Vector3(0, 0.6, 0); tube.localToWorld(tip);
  const fwd = { x: Math.sin(m.mesh.rotation.y), z: Math.cos(m.mesh.rotation.y) };
  const along = (tip.x - m.x) * fwd.x + (tip.z - m.z) * fwd.z;
  ok(along > 0.2, 'mortar muzzle leans forward, away from the crew (' + f2(along) + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()



