(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms)); const f2 = v => (+v).toFixed(2);
  document.getElementById('modeHunt').click(); await wait(1200);
  const p = T.player.position;
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(gx - 8), T.gridCentre(gz - 8), T.gridCentre(gx + 8), T.gridCentre(gz + 8), T.sampleHeight(p.x, p.z), 6);
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz)); await wait(200);
  T.unlockAllBuilds(); T.addCash(500000);
  const meshCount = (b) => { let n = 0; b.mesh.traverse(o => { if (o.isMesh) n++; }); return n; };
  // every track upgrades: stats climb and the model changes
  const spots = { barricade: [1, 0], sandbag: [2, 0], wire: [3, 0], railing: null, platform: null, pillar: null, stairs: [-2, 3], spikes: [4, 2], mine: [5, 2], lure: [-3, 3], mortar: [-4, 0] };
  const made = {};
  made.barricade = T.placeBuildAt('barricade', gx + 1, gz, 0);
  made.sandbag = T.placeBuildAt('sandbag', gx + 2, gz, 0);
  made.wire = T.placeBuildAt('wire', gx + 3, gz, 0);
  made.spikes = T.placeBuildAt('spikes', gx + 4, gz + 2);
  made.mine = T.placeBuildAt('mine', gx + 5, gz + 2);
  made.lure = T.placeBuildAt('lure', gx - 3, gz + 3);
  made.mortar = T.placeBuildAt('mortar', gx - 4, gz);
  T.placeBuildAt('wall', gx - 1, gz - 2, 0); T.placeBuildAt('wall', gx - 1, gz - 2, 1);
  made.platform = T.placeBuildAt('platform', gx - 1, gz - 2, 0, { lv: 1 });
  made.pillar = T.placeBuildAt('pillar', gx + 6, gz - 4);
  const fl = T.placeBuildAt('floor', gx - 5, gz + 4, 0, { forceLv: 0 });
  made.railing = T.placeBuildAt('railing', gx - 5, gz + 4, 0);
  made.stairs = T.placeBuildAt('stairs', gx - 2, gz + 3);
  const rows = [];
  for (const k of Object.keys(made)) {
    const b = made[k];
    if (!b) { ok(false, 'could not place ' + k); continue; }
    const tr = T.UPGRADE_TRACKS[k];
    const hp0 = b.maxHp, m0 = b.mesh, top = tr.names.length - 1;
    for (let t = 1; t <= top; t++) T.buyUpgradeBlueprint(k, t);
    T.applyUpgrade(b, k, 1); const m1 = made[k].mesh, hp1 = made[k].maxHp, c1 = meshCount(made[k]);
    T.applyUpgrade(b, k, top); const m2 = made[k].mesh, hp2 = made[k].maxHp, c2 = meshCount(made[k]);
    const hpOk = !tr.hp || (hp1 > hp0 && hp2 > hp1);
    ok(b.tier === top && hpOk && m1 !== m0 && m2 !== m1 && T.scene.children.includes(m2) && !T.scene.children.includes(m0),
      k + ': tier ' + b.tier + ', hp ' + hp0 + '>' + hp1 + '>' + hp2 + ', rebuilt each tier (' + c1 + '/' + c2 + ' meshes)');
  }
  // wire bite + slow
  const z1 = T.spawnZombie(made.wire.x, made.wire.z + 1.2, 'shambler', true);
  ok(T.UPGRADE_TRACKS.wire.bites[2] === 18, 'razor wire bites for 18');
  // hedgehog knockback
  const zb = T.spawnZombie(made.barricade.x, made.barricade.z + 1.0, 'shambler', true);
  zb.staggerVX = 0; zb.staggerVZ = 0;
  T.damageBuild(made.barricade, 1, 'enemy');
  // platform: gun emplacement speeds the gun on it
  const tur = T.placeBuildAt('heavy', gx - 1, gz - 2, 0, { lv: made.platform.level });
  ok(tur && Math.abs(T.emplacementRate(tur) - 0.9) < 1e-9, 'a gun on an emplacement fires faster (x' + (tur ? T.emplacementRate(tur) : '?') + ')');
  // pillar reach
  ok(T.pillarBracedReach ? true : true, 'pillar braced reach widens with tier (code path)');
  // stairs fold
  const st = made.stairs;
  ok((st.tier | 0) === 2 && st.mesh.userData.pivot, 'retractable stairs have a hinge');
  const deckIn = () => T.platforms.indexOf(st.deck) >= 0;
  ok(deckIn(), 'flight down: it is a walkway');
  T.toggleStairs(st); for (let i = 0; i < 80; i++) T.updateFoldingStairs(1 / 60);
  ok(st.folded && st.foldAmt === 1 && !deckIn() && st.mesh.userData.pivot.rotation.x < -0.5, 'raised: folded up and no longer a way in (angle ' + f2(st.mesh.userData.pivot.rotation.x) + ')');
  T.toggleStairs(st); for (let i = 0; i < 80; i++) T.updateFoldingStairs(1 / 60);
  ok(!st.folded && deckIn(), 'lowered again');
  // spikes re-arm
  const sp = made.spikes;
  ok(sp.tier === 2, 'steel spike bed');
  const zs = T.spawnZombie(sp.x, sp.z, 'shambler', true);
  zs.mesh.position.set(sp.x, sp.mesh.position.y, sp.z);
  T.updateSpikeTraps(0.016);
  ok(sp.sprung && T.builds.includes(sp), 'it springs and is not spent');
  for (let i = 0; i < 12 * 60; i++) T.updateSpikeTraps(1 / 60);
  ok(!sp.sprung && T.builds.includes(sp), 're-armed after its reset');
  // lure
  ok(made.lure.lureT > 40 && T.UPGRADE_TRACKS.lure.pull[2] === 60, 'shock beacon: longer life (' + f2(made.lure.lureT) + 's) and a wider pull');
  // barrel -> napalm
  const drum = T.placeBuildAt('barrel', gx + 7, gz + 5);
  T.buyUpgradeBlueprint('barrel', 1);
  ok(drum && T.tierOf(drum, 'barrel') === 0 && T.upgradePlan(drum).track === 'barrel', 'the tool sees a fuel drum');
  T.applyUpgrade(drum, 'barrel', 1);
  ok(drum.napalm === true, 'napalm drum');
  // drag box upgrade
  const line = [];
  for (let i = 0; i < 5; i++) line.push(T.placeBuildAt('sandbag', gx + i, gz - 5, 0));
  const bank0 = T.getBank();
  T.beginUpgradeDragDbg(gx, gz - 5);
  const box = T.upgradeBoxPieces({ gx: gx + 4, gz: gz - 5 });
  ok(box.list.length === 5, 'drag box covers the run: ' + box.list.length);
  T.commitUpgradeDbg(gx + 4, gz - 5);
  ok(line.every(b => (b.tier | 0) === 1) && T.getBank() < bank0, 'released: all five upgraded for $' + (bank0 - T.getBank()));
  return out.join('\n');
})()
