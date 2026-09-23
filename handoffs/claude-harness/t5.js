(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1500);
  T.unlockAllBuilds(); T.addCash(100000);
  const p = T.player.position;
  const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
  const X = pgx + 3;
  // --- multiple items on a platform ---
  const Z = pgz - 6;
  T.placeBuildAt('wall', X, Z); const plat = T.placeBuildAt('platform', X, Z);
  const rails = [0, 1, 2, 3].map(y => T.placeBuildAt('railing', X, Z, y));
  ok(rails.every(Boolean), 'four railings on one platform: ' + rails.map(r => r && r.slot).join(','));
  ok(!T.placeBuildAt('railing', X, Z, 2), 'fifth railing on a taken edge refused (' + T.resolveTarget('railing', X, Z, 2).refusal + ')');
  const tur = T.placeBuildAt('heavy', X, Z);
  ok(!!tur, 'turret in the middle with four rails');
  ok(Math.abs(tur.mesh.position.y - (plat.mesh.position.y + 0.40)) < 1e-6, 'turret on raised pad (+0.40)');
  ok(Math.abs(rails[0].mesh.position.y - (plat.mesh.position.y + 0.25)) < 1e-6, 'railing on rim (+0.25)');
  ok(plat.deck && plat.deck2 && Math.abs(plat.deck2.deckY - plat.deck.deckY - 0.15) < 1e-6, 'two decks: rim and raised pad');
  // --- floors vs platforms ---
  const Z2 = pgz - 9;
  T.placeBuildAt('wall', X, Z2); const fl = T.placeBuildAt('floor', X, Z2);
  const pOnF = T.placeBuildAt('platform', X, Z2);
  ok(!!fl && !!pOnF, 'platform on a floor');
  ok(!T.placeBuildAt('platform', X, Z2), 'second platform on that floor refused: ' + T.resolveTarget('platform', X, Z2).refusal);
  ok(pOnF && pOnF.spanDepth === null, 'floor-mounted platform is not span support');
  const Z3 = pgz - 12;
  T.placeBuildAt('wall', X, Z3); T.placeBuildAt('platform', X, Z3);
  ok(!T.placeBuildAt('floor', X, Z3), 'floor on a platform refused: ' + T.resolveTarget('floor', X, Z3).refusal);
  ok(!!T.placeBuildAt('light', X, Z2), 'turret on floor-mounted platform');
  // --- deck-flush wall ends ---
  const Zr = pgz + 6;
  T.placeBuildAt('wall', X, Zr); T.placeBuildAt('wall', X, Zr + 1);
  const endW = T.cellOccupant(X, Zr, 0, 'base');
  const visBefore = endW.mesh.userData.arms.filter(a => a.visible).length;
  T.placeBuildAt('platform', X, Zr);
  const visAfter = endW.mesh.userData.arms.filter(a => a.visible).length;
  ok(visBefore === 1 && visAfter === 2, 'end wall grows its far arm under a deck (' + visBefore + '->' + visAfter + ')');
  T.removeBuild(T.cellOccupant(X, Zr, 1, 'base'));
  ok(endW.mesh.userData.arms.filter(a => a.visible).length === 1, 'and loses it when the deck goes');
  // --- doors ---
  const Xd = pgx - 4, Zd = pgz;
  for (let i = -1; i <= 1; i++) T.placeBuildAt('wall', Xd, Zd + i);
  const dw = T.placeBuildAt('door', Xd, Zd);
  ok(dw && dw.opening === 'door' && dw.doorAxis === 'z', 'door cut, axis ' + (dw && dw.doorAxis));
  const cx = T.gridCentre(Xd), cz = T.gridCentre(Zd);
  let r = T.pushOutOfBuild(dw, cx + 0.05, cz, 0.35, true, dw.mesh.position.y);
  ok(Math.abs(r.x - (cx + 0.05)) > 0.1, 'closed door blocks the player');
  const shotShut = T.segmentHitsBuild(dw, cx - 3, dw.mesh.position.y + 1, cz, cx + 3, dw.mesh.position.y + 1, cz);
  ok(shotShut !== null, 'closed door stops a round');
  // walk the player near and use E
  p.set(cx - 1.2, dw.mesh.position.y, cz);
  await wait(100);
  ok(T.actionTarget() === 'door', 'E targets the door (' + T.actionTarget() + ')');
  T.doAction();
  for (let i = 0; i < 30; i++) T.updateDoors(1 / 60);
  ok(T.doorIsOpen(dw), 'door open after E');
  r = T.pushOutOfBuild(dw, cx + 0.05, cz, 0.35, true, dw.mesh.position.y);
  ok(Math.abs(r.x - (cx + 0.05)) < 1e-6, 'open door lets you through');
  ok(T.segmentHitsBuild(dw, cx - 3, dw.mesh.position.y + 1, cz, cx + 3, dw.mesh.position.y + 1, cz) === null, 'open door passes rounds');
  const leaf = dw.mesh.userData.doorLeaves[0].hinge.rotation.y;
  ok(Math.abs(leaf) > 1.4, 'leaf swung ' + leaf.toFixed(2));
  T.doAction(); for (let i = 0; i < 30; i++) T.updateDoors(1 / 60);
  ok(!T.doorIsOpen(dw), 'door shut again');
  // corner door refused
  const Xc = pgx - 8, Zc = pgz + 3;
  T.placeBuildAt('wall', Xc, Zc); T.placeBuildAt('wall', Xc + 1, Zc); T.placeBuildAt('wall', Xc, Zc + 1);
  ok(!T.placeBuildAt('door', Xc, Zc) || T.cellOccupant(Xc, Zc, 0, 'base').opening !== 'door', 'door in a corner refused: ' + T.resolveTarget('door', Xc, Zc).refusal);
  return out.join('\n');
})()
