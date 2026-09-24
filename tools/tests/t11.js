(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // Play refuses with no callsign; wait until prep so scripted builds see a live match.
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
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const p = T.player.position; const gx = T.gridIndex(p.x) + 3, gz = T.gridIndex(p.z);
  // one-cell tower: four walls, platform, four railings, turret
  const Z = gz - 6;
  const walls = [0, 1, 2, 3].map(q => T.placeBuildAt('wall', gx, Z, q));
  ok(walls.every(Boolean), 'four walls round one square');
  const pl = T.placeBuildAt('platform', gx, Z);
  const rails = [0, 1, 2, 3].map(q => T.placeBuildAt('railing', gx, Z, q, { lv: 1 }));
  ok(pl && rails.every(r => r && r.level === 1), 'platform with four railings: ' + rails.map(r => r && r.slot + '@' + r.level));
  const padH = T.ruleFor('platform').height;
  const rimH = T.ruleFor('platform').edgeH;
  const tur = T.placeBuildAt('light', gx, Z, 0, { lv: 1 });
  ok(tur && tur.level === 1 && Math.abs(tur.mesh.position.y - pl.mesh.position.y - padH) < 1e-6, 'turret on the raised pad');
  ok(Math.abs(rails[0].mesh.position.y - pl.mesh.position.y - rimH) < 1e-6, 'railings on the rim');
  // floor on the walls: D-12 needs elevated aim (opts.lv) for a roof from the ground;
  // then platform bolted onto that floor; only one platform per floor.
  const Z2 = gz - 9;
  T.placeBuildAt('wall', gx, Z2, 0);
  const fl = T.placeBuildAt('floor', gx, Z2, 0, { lv: 1 });
  const pof = T.placeBuildAt('platform', gx, Z2);
  ok(fl && fl.level === 1 && pof && pof.level === 2 && pof.spanDepth === null, 'platform on a floor (aimed roof)');
  ok(!T.placeBuildAt('platform', gx, Z2), 'only one platform per floor: ' + T.resolveTarget('platform', gx, Z2).refusal);
  // A floor will not stand on a platform deck (unforced + forceLv sanity).
  const Z3 = gz - 12;
  T.placeBuildAt('wall', gx, Z3, 0); T.placeBuildAt('platform', gx, Z3);
  const platHere = T.cellOccupant(gx, Z3, 1, 'base');
  const onPlat = T.resolveTarget('floor', gx, Z3, 0, { lv: 1, piece: platHere });
  ok(!!onPlat.refusal && /platform/i.test(onPlat.refusal), 'no floor aimed at a platform: ' + onPlat.refusal);
  ok(!T.placeBuildAt('floor', gx, Z3, 0, { forceLv: 2 }), 'forceLv placeBuildAt refuses floor on platform');
  // stacked walls
  const s1 = T.placeBuildAt('wall', gx + 3, Z, 0);
  const s2 = T.placeBuildAt('wall', gx + 3, Z, 0);
  const s3 = T.placeBuildAt('wall', gx + 3, Z, 0);
  ok(s1 && s2 && s2.level === 1 && Math.abs(s2.mesh.position.y - s1.mesh.position.y - 2) < 1e-6 && !s3, 'walls stack two high: ' + T.resolveTarget('wall', gx + 3, Z, 0).refusal);
  // wall on a deck edge
  const wd = T.placeBuildAt('wall', gx, Z3, 1, { lv: 1 });
  ok(wd && wd.level === 1, 'wall on a deck edge');
  // spikes in a walled square
  const Zs = gz + 4;
  T.placeBuildAt('wall', gx, Zs, 0);
  ok(!!T.placeBuildAt('spikes', gx, Zs), 'spike trap inside a walled square');
  ok(!!T.placeBuildAt('wall', gx, Zs, 2), 'and another wall on that square');
  return out.join('\n');
})()
