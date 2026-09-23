(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms)); const f2 = v => (+v).toFixed(2);
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
  {
    const pl = T.player.position;
    const tx = 2, tz = -4;
    for (let i = 0; i < 70; i++) {
      await wait(200);
      pl.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(30);
      if (Math.hypot(pl.x - tx, pl.z - tz) < 0.4) break;
    }
  }
  const p = T.player.position;
  // flat open spot
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  let found = null;
  for (let tries = 0; tries < 400 && !found; tries++) {
    const cx = Math.round((Math.random() - 0.5) * 50), cz = Math.round((Math.random() - 0.5) * 50);
    let good = true;
    for (let dx = -4; dx <= 4 && good; dx++) for (let dz = -4; dz <= 4 && good; dz++) if (T.placeRefusalFor('spikes', cx + dx, cz + dz) && Math.abs(dx) + Math.abs(dz) > 1) good = false;
    if (good) found = { cx, cz };
  }
  const gx = found.cx, gz = found.cz;
  T.levelGroundRect(T.gridCentre(gx - 5), T.gridCentre(gz - 5), T.gridCentre(gx + 5), T.gridCentre(gz + 5), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), 6);
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz)); await wait(200);
  T.unlockAllBuilds(); const own = T.getUpgradeOwned(); for (const k of Object.keys(own)) delete own[k];
  T.addCash(100000);
  const aimAt = (b, dy = 1.0) => { const m = T.thinBoxFor(b) || { cx: b.x, cz: b.z }; T.setAimRay(m.cx + 0.2, b.mesh.position.y + dy + 8, m.cz + 0.25, -0.2, -8, -0.25); };
  // --- upgrade tool on a wall
  const w = T.placeBuildAt('wall', gx + 1, gz, 0);
  T.setPlaceMode('upgrade'); aimAt(w); T.updateGhostPreview();
  ok(T.upgradeTarget() === w, 'the tool finds the wall under the reticle');
  ok(/blueprint/.test(T.getUpgradeHint()), 'no blueprint yet: "' + T.getUpgradeHint() + '"');
  T.tryPlace(); ok(T.tierOf(w, 'wall') === 0, 'and it will not upgrade');
  const bank0 = T.getBank();
  T.buyUpgradeBlueprint('wall', 2); ok((own.wall | 0) === 0, 'tiers are bought in order');
  T.buyUpgradeBlueprint('wall', 1); T.buyUpgradeBlueprint('wall', 2); T.buyUpgradeBlueprint('wall', 3); T.buyUpgradeBlueprint('wall', 4);
  ok(own.wall === 4 && T.getBank() < bank0, 'wall blueprints bought ($' + (bank0 - T.getBank()) + ')');
  const hp = [w.maxHp], meshes = [w.mesh];
  for (let i = 0; i < 4; i++) { aimAt(w); T.updateGhostPreview(); T.tryPlace(); hp.push(w.maxHp); meshes.push(w.mesh); }
  ok(T.tierOf(w, 'wall') === 4, 'clicked four times: steel wall (tier ' + T.tierOf(w, 'wall') + ')');
  ok(hp.every((v, i) => i === 0 || v > hp[i - 1]), 'toughness climbs every tier: ' + hp.join(' > '));
  ok(new Set(meshes).size === 5 && T.scene.children.includes(w.mesh) && !T.scene.children.includes(meshes[0]), 'each tier is a new model, the old one removed');
  aimAt(w); T.updateGhostPreview(); ok(/fully upgraded/.test(T.getUpgradeHint()), 'then: "' + T.getUpgradeHint() + '"');
  // --- door on a wall: R picks the door
  const dw = T.placeBuildAt('wall', gx + 2, gz, 0); T.placeBuildAt('door', gx + 2, gz, 0, { piece: dw });
  T.buyUpgradeBlueprint('door', 1); T.buyUpgradeBlueprint('door', 2);
  aimAt(dw); T.updateGhostPreview();
  ok(/Doors\]/.test(T.getUpgradeHint()), 'door wall: door first, R to switch: "' + T.getUpgradeHint() + '"');
  const dh0 = dw.maxHp; T.tryPlace(); T.tryPlace();
  ok(T.tierOf(dw, 'door') === 2 && dw.maxHp === dh0 + 100 && dw.mesh.userData.doorLeaves.length === 2, 'iron door: +100 toughness, leaves rebuilt');
  T.toggleDoor(dw); for (let i = 0; i < 40; i++) T.updateDoors(1 / 60);
  ok(T.doorIsOpen(dw), 'the upgraded door still opens');
  // R -> wall part, upgrade the wall under the door: door survives the rebuild
  T.rotateBuildDbg ? T.rotateBuildDbg() : window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r' }));
  aimAt(dw); T.updateGhostPreview();
  T.tryPlace();
  ok(T.tierOf(dw, 'wall') >= 1 && T.tierOf(dw, 'door') === 2 && dw.mesh.userData.doorFrame && T.doorIsOpen(dw), 'wall under it upgraded; the door, still open, came along (' + T.getUpgradeHint() + ')');
  // --- window bars stop the reach-through
  const ww = T.placeBuildAt('wall', gx - 2, gz, 0); T.placeBuildAt('window', gx - 2, gz, 0, { piece: ww });
  const mid = T.thinBoxFor(ww);
  const zy = ww.mesh.position.y;
  const through = () => T.buildBetween(mid.cx, zy + 1.4, mid.cz + 0.8, mid.cx, zy + 1.4, mid.cz - 0.8);
  ok(through() !== ww, 'open window: a zombie outside reaches through at you');
  T.buyUpgradeBlueprint('bars', 1); T.applyUpgrade(ww, 'bars', 1);
  ok(through() === ww && ww.mesh.userData.bars, 'barred: it has to go through the wall');
  const shot = T.segmentHitsBuild(ww, mid.cx, zy + 1.4, mid.cz - 3, mid.cx, zy + 1.4, mid.cz + 3);
  ok(shot === null, 'and rounds still fly out between the bars');
  // --- gates
  T.setPlaceMode(null);
  out.push('  wire refusal: ' + T.placeRefusalFor('wire', gx, gz + 3) + ' / ' + (T.resolveTarget('wire', gx, gz + 3, 0).refusal));
  const wire = T.placeBuildAt('wire', gx, gz + 3, 0);
  if (!wire) return out.join('\n');
  const g = T.placeBuildAt('gate', gx, gz + 3, 0, { piece: wire });
  ok(g === wire && wire.opening === 'gate' && wire.maxHp === 70, 'gate cut into a run of wire (toughness ' + wire.maxHp + ')');
  const gm = T.thinBoxFor(wire);
  let r = T.pushOutOfBuild(wire, gm.cx, gm.cz + 0.05, 0.35, true, wire.mesh.position.y);
  ok(Math.abs(r.z - (gm.cz + 0.05)) > 0.05, 'shut gate blocks');
  p.set(gm.cx, wire.mesh.position.y, gm.cz - 1.0); await wait(80);
  ok(T.nearestDoor() === wire, 'E finds the gate');
  T.toggleDoor(wire); for (let i = 0; i < 40; i++) T.updateDoors(1 / 60);
  r = T.pushOutOfBuild(wire, gm.cx, gm.cz + 0.05, 0.35, true, wire.mesh.position.y);
  ok(T.doorIsOpen(wire) && Math.abs(r.z - (gm.cz + 0.05)) < 1e-6, 'open gate lets you through');
  T.buyUpgradeBlueprint('gate', 1); T.buyUpgradeBlueprint('gate', 2);
  T.applyUpgrade(wire, 'gate', 2);
  ok(wire.gateTier === 2 && wire.maxHp === 260 && T.doorIsOpen(wire), 'steel gate (toughness ' + wire.maxHp + '), still open');
  for (const k of ['barricade', 'railing']) {
    const cx = gx - 3 + (k === 'railing' ? 6 : 0);
    if (k === 'railing') T.placeBuildAt('floor', cx, gz + 4, 0, { forceLv: 0 });
    const piece = T.placeBuildAt(k, cx, gz + 4, 0);
    if (!piece) { out.push('FAIL could not place ' + k + ': ' + T.resolveTarget(k, cx, gz + 4, 0).refusal); continue; }
    const gg = piece && T.placeBuildAt('gate', piece.gx, piece.gz, 0, { piece });
    ok(gg === piece && piece.opening === 'gate', 'gate in a ' + k);
  }
  // --- turrets
  const tur = T.placeBuildAt('heavy', gx - 3, gz - 3, 0);
  const d0 = tur.damage, r0 = tur.range, i0 = tur.fireInterval, h0 = tur.maxHp;
  T.buyUpgradeBlueprint('heavy', 1); T.buyUpgradeBlueprint('heavy', 2);
  T.applyUpgrade(tur, 'heavy', 1); const d1 = tur.damage;
  T.applyUpgrade(tur, 'heavy', 2);
  ok(tur.damage === d0 * 2 && tur.range > r0 && tur.fireInterval < i0 && tur.maxHp > h0 && d1 > d0, 'heavy Mk III: damage ' + d0 + '>' + f2(d1) + '>' + tur.damage + ', range ' + r0 + '>' + f2(tur.range) + ', interval ' + i0 + '>' + f2(tur.fireInterval) + ', hp ' + h0 + '>' + f2(tur.maxHp));
  ok(!!tur.mesh.userData.dish, 'and it has its radar dish');
  // --- floors
  const fl = T.placeBuildAt('floor', gx + 3, gz - 3, 0, { forceLv: 0 });
  const dy0 = fl.deck.deckY;
  T.buyUpgradeBlueprint('floor', 1); T.buyUpgradeBlueprint('floor', 2);
  T.applyUpgrade(fl, 'floor', 2);
  ok(fl.tier === 2 && fl.maxHp === 290 && fl.deck.deckY === dy0, 'steel floor (toughness ' + fl.maxHp + '), deck where it was');
  // --- kiosk tab renders
  T.setShopTabDbg('fortify');
  const rows = document.querySelectorAll('#shopList .perk').length;
  ok(rows >= 18, 'Fortify tab lists the blueprints (' + rows + ')');
  // --- scrap refunds the upgrades too
  const spent = w.upgradeSpent;
  ok(spent > 0, 'upgrade spend recorded for refunds ($' + spent + ')');
  return out.join('\n');
})()

