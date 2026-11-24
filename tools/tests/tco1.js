// CO-1 (Claude 14, Jerry direct: the building audit): what scrapping takes down, the GPU memory a removed piece and
// a ghost give back, and turrets that only fire once the gun bears.
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
  const platAt = (gx, gz, lv = 1) => T.cellOccupant(gx, gz, lv, 'base');
  try {
  await startMatch(T, 'TestMarine');
  ok(T.getPhase() === 'prep', 'match reached prep after Play');
  T.unlockAllBuilds(); T.addCash(100000);
  const p = T.player.position;
  {
    const tx = 24, tz = 20;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(40);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  for (const t of T.trees) { t.alive = false; t.stump = false; t.falling = false; }
  for (const r of T.rocks) r.alive = false;
  const pgx = T.gridIndex(p.x), pgz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(pgx - 8), T.gridCentre(pgz - 10), T.gridCentre(pgx + 6), T.gridCentre(pgz + 6), T.sampleHeight(p.x, p.z), 8);
  p.set(T.gridCentre(pgx), T.sampleHeight(T.gridCentre(pgx), T.gridCentre(pgz)), T.gridCentre(pgz));
  await wait(200);
  { const p0 = T.player.position, w0 = Date.now(); while (Date.now() - w0 < 8000 && Math.hypot(T.camera.position.x - p0.x, T.camera.position.z - p0.z) > 8) await new Promise((r) => setTimeout(r, 100)); }   // GB-268: the camera catches up with him first (CU-209's landing is 40 m from here)
  const cam = () => T.camera.position;
  // --- 1. scrapping the one wall under a floor: the floor and the turret on it are in the set and the refund ---
  const gx = pgx + 2, gz = pgz - 2;
  const wall = T.placeBuildAt('wall', gx, gz, 0, null);
  const floor = T.placeBuildAt('floor', gx, gz, 0, { forceLv: 1 });
  const tur = T.placeBuildAt('light', gx, gz, 0, { lv: 1 });
  ok(wall && floor && floor.level === 1 && tur && tur.level === 1, 'wall, a floor on it, a turret on the floor (' + [!!wall, floor && floor.level, tur && tur.level] + ')');
  const set = T.scrapSet(wall);
  ok(set.indexOf(floor) >= 0 && set.indexOf(tur) >= 0, 'scrap set holds the floor and the turret that fall with the wall (' + set.map(b => b.type) + ')');
  const quoted = T.scrapRefund(wall);
  ok(quoted > 9 + 15, 'refund counts what falls with it: ' + quoted);
  const nBefore = T.builds.length;
  ok(T.cellOccupant(gx, gz, 1, 'base') === floor && T.scrapSet(wall).length === set.length, 'asking changed nothing (cell map and spans put back)');
  const before = T.getBank();
  T.addCash(quoted); T.removeBuild(wall);
  ok(T.builds.indexOf(floor) < 0 && T.builds.indexOf(tur) < 0 && T.builds.length === nBefore - 3, 'and they did fall: ' + (nBefore - T.builds.length));
  // A floor held by a wall in the next square as well stays up, and is not in the set.
  const a = T.placeBuildAt('wall', gx, gz, 0, null), b2 = T.placeBuildAt('wall', gx, gz, 2, null);
  const f2 = T.placeBuildAt('floor', gx, gz, 0, { forceLv: 1 });
  ok(f2 && T.scrapSet(a).indexOf(f2) < 0, 'a floor another wall still holds is not in the set (' + T.scrapSet(a).map(b => b.type) + ')');
  T.removeBuild(a);
  ok(T.builds.indexOf(f2) >= 0, 'and it stays up');
  // --- 2. a removed piece gives its geometry back ---
  const w3 = T.placeBuildAt('wall', gx + 3, gz, 0, null);
  let geos = 0, freed = 0; const seen = new Set();
  w3.mesh.traverse((o) => { if (o.isMesh && o.geometry && !seen.has(o.geometry) && !o.geometry.userData.shared) { seen.add(o.geometry); geos++; const g = o.geometry, d0 = g.dispose; g.dispose = function () { freed++; return d0 && d0.apply(this, arguments); }; } });
  T.removeBuild(w3);
  ok(geos > 0 && freed === geos, 'removed wall disposed ' + freed + ' of ' + geos + ' geometries');
  // --- 3. turrets hold fire until the gun bears ---
  for (const z of T.zombies) if (z.alive) z.alive = false;
  const tg = T.placeBuildAt('heavy', gx - 3, gz - 3, 0, null);
  ok(!!tg, 'heavy turret placed');
  if (tg) {
    tg.mesh.rotation.y = 0; tg.scanBase = 0; tg.fireCd = 0;
    // behind it (the gun faces +Z), 7 m away
    const zx = tg.x, zz = tg.z - 7;
    T.skipGrace && T.skipGrace();
    const z = T.spawnZombie(zx, zz, 'shambler', true, true);
    const zb = z || T.zombies.find((q) => q.alive);
    let shots = 0, worst = 0, firstAt = null; const t0 = performance.now(); let lastCd = tg.fireCd;
    while (performance.now() - t0 < 4000) {
      await wait(8);
      if (!zb || !zb.alive) break;
      if (tg.recoil > 0.85 && tg.fireCd > lastCd + 0.2) {
        const ang = Math.atan2(zb.mesh.position.x - tg.x, zb.mesh.position.z - tg.z);
        let d = ang - tg.mesh.rotation.y; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        worst = Math.max(worst, Math.abs(d)); shots++; if (firstAt == null) firstAt = performance.now() - t0;
      }
      lastCd = tg.fireCd;
    }
    ok(shots > 0, 'it still fires at what is behind it (' + shots + ' shots, first at ' + (firstAt | 0) + ' ms)');
    ok(worst <= 0.3, 'every shot left with the barrel on the target (worst ' + worst.toFixed(2) + ' rad off)');
  }
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
