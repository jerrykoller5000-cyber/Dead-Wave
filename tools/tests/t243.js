// t243 - CU-105 (Jerry): the Watchman MG was sinking into the platform, and neither it nor
// the mortar could be set on that mount. A set-down carries no aim level, and a reticle
// on the wooden floor under a platform reports that floor: both used to plant the gun
// on the floor, inside the steel. Either gun now sits on the platform's plate, feet
// clear of it. A second gun in the same cell is refused rather than buried underneath.
// Open ground still takes either one. The gunner behind the Watchman has a spot on the plate.
(async () => {
  const T = window.TT, THREE = T.THREE, out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  try {
    await startMatch(T, 'Mount');
    T.clearZombies && T.clearZombies();
    T.unlockAllBuilds(); T.addCash(100000);
    for (const t of T.trees) { t.alive = false; t.stump = false; }
    for (const r of T.rocks) r.alive = false;
    const p = T.player.position;
    const gx0 = T.gridIndex(p.x), gz0 = T.gridIndex(p.z);
    T.levelGroundRect(T.gridCentre(gx0 - 8), T.gridCentre(gz0 - 8), T.gridCentre(gx0 + 8), T.gridCentre(gz0 + 8), T.sampleHeight(p.x, p.z), 6);
    await wait(50);
    const padH = T.ruleFor('platform').height;
    const seat = (gun, plat, label) => {
      if (!gun || !plat) { ok(false, label + ' placed'); return; }
      const plateTop = plat.mesh.position.y + padH + 0.04;
      gun.mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gun.mesh);
      ok(gun.level === plat.level && gun.slot === 'object', label + ' is on the platform (L' + gun.level + ' ' + gun.slot + ')');
      ok(box.min.y >= plateTop - 0.015, label + ' feet clear the plate (low ' + f2(box.min.y) + ', plate ' + f2(plateTop) + ')');
      ok(box.min.y < plateTop + 0.08, label + ' is sitting on the plate, not hovering (low ' + f2(box.min.y) + ')');
    };

    const gx = gx0 + 3, gz = gz0 - 2;
    const floor = T.placeBuildAt('floor', gx, gz);
    const plat = T.placeBuildAt('platform', gx, gz);
    ok(!!floor && floor.level === 0 && !!plat && plat.level === 1, 'a platform bolted on a floor');

    // The set-down path: placeBuildAt with no aim level.
    const mg = T.placeBuildAt('m240', gx, gz);
    seat(mg, plat, 'Watchman set down');
    if (mg) {
      const spot = T.mortarCrewSpot(mg, 0);
      ok(!!spot && spot.ok, 'Watchman gunner has a spot on the plate (' + (spot && spot.why) + ')');
      T.removeBuild(mg);
    }

    // Aiming at the floor under the platform must not bury the gun in the mount.
    const aimed = T.placeBuildAt('m240', gx, gz, 0, { lv: 0 });
    seat(aimed, plat, 'Watchman aimed at the floor under it');
    if (aimed) T.removeBuild(aimed);

    const tube = T.placeBuildAt('mortar', gx, gz);
    seat(tube, plat, 'mortar set down');
    const buried = tube ? T.placeBuildAt('m240', gx, gz) : null;
    ok(!buried && T.resolveTarget('m240', gx, gz).refusal, 'a second gun is refused, not buried under the mortar (' + (T.resolveTarget('m240', gx, gz).refusal || 'placed') + ')');
    if (tube) T.removeBuild(tube);

    const gx2 = gx + 2, gz2 = gz;
    ok(!!T.placeBuildAt('floor', gx2, gz2) && !!T.placeBuildAt('platform', gx2, gz2), 'a second platform');
    const tube2 = T.placeBuildAt('mortar', gx2, gz2, 0, { lv: 0 });
    const plat2 = T.cellOccupant(gx2, gz2, 1, 'base');
    seat(tube2, plat2, 'mortar aimed at the floor under it');

    const ground = T.placeBuildAt('m240', gx0 - 4, gz0 + 4);
    ok(!!ground && (ground.level | 0) === 0, 'open ground still takes the Watchman (L' + (ground && ground.level) + ')');
    const groundTube = T.placeBuildAt('mortar', gx0 - 4, gz0 + 5);
    ok(!!groundTube && (groundTube.level | 0) === 0, 'open ground still takes the mortar');

    // Build-wheel silhouettes: every build has an icon, and the three that were wrong
    // now show the piece (raised pad, baseplate, tripod).
    ok(T.openWheel('build') === true, 'build wheel opens');
    const svgOf = () => document.getElementById('wheelSvg').innerHTML;
    const page0 = svgOf();
    ok(page0.includes('width="11.6"'), 'platform icon is the deck with its raised pad');
    ok(!page0.includes('M5 4.6'), 'floor icon is planks, not a roof');
    T.wheelTurnPage(2);
    const page2 = svgOf();
    ok(page2.includes('ellipse') && page2.includes('M7.4 17.6'), 'mortar icon is a tube on a baseplate');
    ok(page2.includes('M12 12.2') && page2.includes('width="7.2"'), 'Watchman icon is a tripod gun');
    T.closeWheelDbg();
  } catch (e) {
    ok(false, 'threw ' + (e && e.stack || e));
  }
  return out.join('\n');
})();
