// t248 - CU-116 (Jerry: turrets shoot through built walls). A light turret on the
// ground does not hurt a zombie on the far side of a wall. The same gun on a
// platform, muzzle above that wall, does.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hold = async (z, x, zz, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      z.x = x; z.z = zz; z.speed = 0; z.baseSpeed = 0;
      if (z.mesh) { z.mesh.position.x = x; z.mesh.position.z = zz; }
      await wait(40);
    }
  };
  try {
    await startMatch(T, 'TurretLos');
    T.unlockAllBuilds(); T.addCash(20000);
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
    const free = (gx, gz) => T.placeRefusalFor('wall', gx, gz) === null && T.placeRefusalFor('light', gx, gz) === null;
    let gx = null, gz = null;
    for (const dx of [6, -6, 8, -8, 10]) {
      for (const dz of [0, 2, -2]) {
        const a = pgx + dx, b = pgz + dz;
        if ([0, 1, 2, 3, 4].every((i) => free(a, b + i)) && free(a + 8, b)) { gx = a; gz = b; break; }
      }
      if (gx !== null) break;
    }
    ok(gx !== null, 'found a clear strip (' + gx + ',' + gz + ')');
    if (gx === null) return out.join('\n');

    // Ground gun, wall between it and the zombie.
    ok(!!T.placeBuildAt('light', gx, gz, 0), 'ground turret placed');
    ok(!!T.placeBuildAt('wall', gx, gz + 2, 0), 'wall in front of the ground turret');
    const zx = T.gridCentre(gx), zz = T.gridCentre(gz + 4);
    const z1 = T.spawnZombie(zx, zz, 'shambler', true, true);
    ok(!!z1 && z1.alive, 'zombie stands past the wall');
    const hp1 = z1.hp;
    await hold(z1, zx, zz, 1200);
    ok(z1.alive && z1.hp === hp1, 'a ground turret does not shoot through the wall (hp ' + z1.hp + '/' + hp1 + ')');
    z1.alive = false;

    // Same gun up on a platform. Three walls hold the deck; the side toward the
    // target stays open. A wall in the next cells is below the muzzle.
    const hx = gx + 8;
    ok(!!T.placeBuildAt('wall', hx, gz, 1) && !!T.placeBuildAt('wall', hx, gz, 2) && !!T.placeBuildAt('wall', hx, gz, 3), 'three walls for the mount');
    const plat = T.placeBuildAt('platform', hx, gz, 0);
    ok(!!plat && plat.level === 1, 'platform stands on those walls (level ' + (plat && plat.level) + ')');
    const gun = T.placeBuildAt('light', hx, gz, 0);
    ok(!!gun && gun.level === 1, 'turret sits on the platform (level ' + (gun && gun.level) + ')');
    const block = T.placeBuildAt('wall', hx, gz + 2, 0);
    ok(!!block, 'wall in front of the raised turret');
    if (gun && block) {
      const muzzleY = gun.mesh.position.y + (gun.mesh.userData.muzzleLocal ? gun.mesh.userData.muzzleLocal.y : 0);
      const wallTop = block.mesh.position.y + 2;
      ok(muzzleY > wallTop + 0.4, 'the raised muzzle clears the wall (' + muzzleY.toFixed(2) + ' vs ' + wallTop.toFixed(2) + ')');
    }
    const zx2 = T.gridCentre(hx), zz2 = T.gridCentre(gz + 4);
    const z2 = T.spawnZombie(zx2, zz2, 'shambler', true, true);
    ok(!!z2 && z2.alive, 'zombie stands past the raised turret\'s wall');
    const hp2 = z2.hp;
    await hold(z2, zx2, zz2, 1200);
    ok(z2.hp < hp2, 'the raised turret, with a clear line, does hit (hp ' + z2.hp + '/' + hp2 + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
