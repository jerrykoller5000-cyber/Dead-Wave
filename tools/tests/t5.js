(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const wallAt = (gx, gz, lv = 0) => {
    for (const s of ['edge0', 'edge1', 'edge2', 'edge3']) {
      const w = T.cellOccupant(gx, gz, lv, s);
      if (w && w.type === 'wall') return w;
    }
    return T.builds.find(b => b.type === 'wall' && b.gx === gx && b.gz === gz && (b.level | 0) === lv) || null;
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
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
  const X = pgx + 3;
  const Z = pgz - 6;
  const walls = [0, 1, 2, 3].map(q => T.placeBuildAt('wall', X, Z, q));
  ok(walls.every(Boolean), 'four walls under the platform cell');
  const plat = T.placeBuildAt('platform', X, Z);
  const rails = [0, 1, 2, 3].map(y => T.placeBuildAt('railing', X, Z, y, { lv: 1 }));
  ok(plat && rails.every(Boolean), 'four railings on one platform: ' + rails.map(r => r && r.slot).join(','));
  ok(!T.placeBuildAt('railing', X, Z, 2, { lv: 1 }), 'fifth railing on a taken edge refused (' + T.resolveTarget('railing', X, Z, 2, { lv: 1 }).refusal + ')');
  const tur = T.placeBuildAt('heavy', X, Z, 0, { lv: 1 });
  ok(!!tur, 'turret in the middle with four rails');
  const padH = T.ruleFor('platform').height, rimH = T.ruleFor('platform').edgeH;
  ok(plat && tur && Math.abs(tur.mesh.position.y - (plat.mesh.position.y + padH)) < 1e-6, 'turret on raised pad (+' + padH + ')');
  ok(plat && rails[0] && Math.abs(rails[0].mesh.position.y - (plat.mesh.position.y + rimH)) < 1e-6, 'railing on rim (+' + rimH + ')');
  const rise = padH - rimH;
  ok(plat && plat.deck && plat.deck2 && Math.abs(plat.deck2.deckY - plat.deck.deckY - rise) < 1e-6, 'two decks: rim and raised pad (Δ' + rise.toFixed(2) + ')');
  const Z2 = pgz - 9;
  T.placeBuildAt('wall', X, Z2); const fl = T.placeBuildAt('floor', X, Z2, 0, { lv: 1 });
  const pOnF = T.placeBuildAt('platform', X, Z2);
  ok(!!fl && fl.level === 1, 'floor aimed at wall tops roofs at level 1 (D-12)');
  ok(!!fl && !!pOnF, 'platform on a floor');
  ok(!T.placeBuildAt('platform', X, Z2), 'second platform on that floor refused: ' + T.resolveTarget('platform', X, Z2).refusal);
  ok(pOnF && pOnF.spanDepth === null, 'floor-mounted platform is not span support');
  const Z3 = pgz - 12;
  T.placeBuildAt('wall', X, Z3); T.placeBuildAt('platform', X, Z3);
  // Aiming at the platform deck (or forceLv above it) must refuse; a bare grounded
  // place can still boardwalk at lv0 under the tower, which is a different intent.
  const platHere = T.cellOccupant(X, Z3, 1, 'base');
  const aimPlat = T.resolveTarget('floor', X, Z3, 0, { lv: 1, piece: platHere });
  ok(!!aimPlat.refusal, 'floor aimed at a platform refused: ' + aimPlat.refusal);
  ok(!T.placeBuildAt('floor', X, Z3, 0, { forceLv: 2 }), 'forceLv floor on a platform refused: ' + T.resolveTarget('floor', X, Z3, 0, { forceLv: 2 }).refusal);
  ok(!!T.placeBuildAt('light', X, Z2, 0, { lv: 2 }), 'turret on floor-mounted platform');
  const Zr = pgz + 6;
  T.placeBuildAt('wall', X, Zr); T.placeBuildAt('wall', X, Zr + 1);
  const endW = wallAt(X, Zr, 0);
  ok(!!endW, 'end wall of the run exists');
  const deck = T.placeBuildAt('platform', X, Zr);
  ok(!!deck, 'platform seats on the wall run');
  ok(!endW.mesh.userData.arms || endW.mesh.userData.arms.length === 0, 'walls are full-edge pieces, not hub-and-arms');
  T.removeBuild(deck);
  ok(!!wallAt(X, Zr, 0) && T.builds.includes(endW), 'wall remains after the deck is scrapped');
  // --- doors ---
  const Xd = pgx - 4, Zd = pgz;
  for (let i = -1; i <= 1; i++) T.placeBuildAt('wall', Xd, Zd + i, 0);
  const host = wallAt(Xd, Zd, 0);
  const dw = T.placeBuildAt('door', Xd, Zd, 0, { piece: host });
  ok(dw && dw.opening === 'door' && dw.mesh && dw.mesh.userData.doorLeaves, 'door cut into the wall with swing leaves');
  if (!dw) return out.join('\n');
  const box = T.thinBoxFor(dw);
  ok(!!box, 'door has a thin collision box');
  const mx = box.cx, mz = box.cz;
  // Thin axis is the approach: stand just outside the box on that axis.
  const thinZ = box.hz < box.hx;
  const standOff = (thinZ ? box.hz : box.hx) + 1.05;
  const sides = thinZ
    ? [{ x: mx, z: mz + standOff }, { x: mx, z: mz - standOff }]
    : [{ x: mx + standOff, z: mz }, { x: mx - standOff, z: mz }];
  const blockPt = thinZ ? { x: mx, z: mz } : { x: mx, z: mz };
  // Closed door must push a probe at the doorway mid.
  let r = T.pushOutOfBuild(dw, mx, mz, 0.35, true, dw.mesh.position.y);
  ok(Math.hypot(r.x - mx, r.z - mz) > 0.05, 'closed door blocks the player');
  const shotA = thinZ ? [mx, dw.mesh.position.y + 1, mz - 3] : [mx - 3, dw.mesh.position.y + 1, mz];
  const shotB = thinZ ? [mx, dw.mesh.position.y + 1, mz + 3] : [mx + 3, dw.mesh.position.y + 1, mz];
  ok(T.segmentHitsBuild(dw, shotA[0], shotA[1], shotA[2], shotB[0], shotB[1], shotB[2]) !== null, 'closed door stops a round');
  let aimed = false;
  for (const s of sides) {
    p.set(s.x, T.sampleHeight(s.x, s.z), s.z);
    const yaw = Math.atan2(mx - s.x, mz - s.z);
    if (T.setAimYawDbg) T.setAimYawDbg(yaw);
    await wait(80);
    if (T.actionTarget() === 'door') { aimed = true; break; }
  }
  ok(aimed, 'E targets the door (' + T.actionTarget() + ')');
  T.doAction();
  for (let i = 0; i < 40; i++) T.updateDoors(1 / 60);
  ok(T.doorIsOpen(dw), 'door open after E');
  r = T.pushOutOfBuild(dw, mx, mz, 0.35, true, dw.mesh.position.y);
  ok(Math.hypot(r.x - mx, r.z - mz) < 1e-6, 'open door lets you through');
  ok(T.segmentHitsBuild(dw, shotA[0], shotA[1], shotA[2], shotB[0], shotB[1], shotB[2]) === null, 'open door passes rounds');
  const leaf = dw.mesh.userData.doorLeaves[0].hinge.rotation.y;
  ok(Math.abs(leaf) > 1.4, 'leaf swung ' + leaf.toFixed(2));
  T.doAction(); for (let i = 0; i < 40; i++) T.updateDoors(1 / 60);
  ok(!T.doorIsOpen(dw), 'door shut again');
  // Corner L: INTENDED for edge walls. Hub-and-arm walls refused a corner door; edge
  // walls are plain panels with no hub, so any uncut wall (including a corner cell) can
  // take a door. A second cut on the same panel is still refused.
  const Xc = pgx - 8, Zc = pgz + 3;
  T.placeBuildAt('wall', Xc, Zc, 0); T.placeBuildAt('wall', Xc + 1, Zc, 0); T.placeBuildAt('wall', Xc, Zc + 1, 1);
  const cornerHost = wallAt(Xc, Zc, 0);
  const cornerDoor = T.placeBuildAt('door', Xc, Zc, 0, { piece: cornerHost });
  ok(!!cornerDoor && cornerDoor.opening === 'door', 'a corner-cell wall can take a door (edge walls, intended)');
  ok(!T.placeBuildAt('door', Xc, Zc, 0, { piece: cornerDoor }), 'second cut refused: ' + T.resolveTarget('door', Xc, Zc, 0, { piece: cornerDoor }).refusal);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.message));
  }
  return out.join('\n');
})()
