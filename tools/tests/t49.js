// t49 — GB-5: floors / stairs / bridges / cover match visuals (walk, collide, block)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const f2 = (n) => (n == null || !Number.isFinite(n)) ? 'n/a' : Number(n).toFixed(2);
  try {
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'GB5Marine';
    document.getElementById('modeHunt').click();
    let started = false;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
    }
    ok(started, 'match reached prep');
    if (!started) return out.join('\n');

    const p = T.player.position;
    {
      const tx = 28, tz = 28;
      for (let i = 0; i < 70; i++) {
        await wait(200);
        p.set(tx, T.sampleHeight(tx, tz), tz);
        await wait(30);
        if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
      }
    }
    T.unlockAllBuilds(); T.addCash(100000);
    for (const t of T.trees) { t.alive = false; t.stump = false; }
    for (const r of T.rocks) r.alive = false;
    const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
    const yPad = T.sampleHeight(p.x, p.z);
    T.levelGroundRect(T.gridCentre(gx - 5), T.gridCentre(gz - 5), T.gridCentre(gx + 5), T.gridCentre(gz + 5), yPad, 6);
    p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz));
    await wait(100);

    // --- FLOORS: walkable height matches the deck you see ---
    const fx = gx - 3, fz = gz - 3;
    const fl = T.placeBuildAt('floor', fx, fz);
    ok(!!fl && fl.level === 0 && fl.deck, 'boardwalk floor placed with deck');
    const fcx = T.gridCentre(fx), fcz = T.gridCentre(fz);
    const deckY = fl.deck.deckY;
    const ph = T.platformHeightAt(fcx, fcz, deckY + 1);
    const eg = T.entityGroundY(fcx, fcz, deckY + 1);
    ok(ph != null && Math.abs(ph - deckY) < 1e-4, 'platformHeightAt on floor == deckY (' + f2(ph) + ' vs ' + f2(deckY) + ')');
    ok(Math.abs(eg - deckY) < 1e-4, 'entityGroundY stands on the floor boards (' + f2(eg) + ')');
    ok(Math.abs(deckY - (fl.mesh.position.y + T.ruleFor('floor').height)) < 1e-4, 'deckY matches mesh + floor height');
    const midY = fl.mesh.position.y + 0.1;
    const pushF = T.pushOutOfBuild(fl, fcx, fcz, T.PLAYER_RADIUS_DBG, true, midY);
    ok(Math.abs(pushF.x - fcx) < 1e-6 && Math.abs(pushF.z - fcz) < 1e-6, 'floor does not hard-shove a body on its surface');

    // --- STAIRS: ramp surface + solid sides ---
    const sx = gx + 2, sz = gz - 3;
    T.placeBuildAt('wall', sx, sz, 0);
    p.y = T.sampleHeight(p.x, p.z) + 3;
    const roof = T.placeBuildAt('floor', sx, sz);
    p.y = T.sampleHeight(p.x, p.z);
    const stairs = T.placeBuildAt('stairs', sx, sz + 1);
    ok(!!stairs && stairs.deck && stairs.deck.rise > 0, 'stairs placed with ramp deck (rise ' + f2(stairs.deck && stairs.deck.rise) + ')');
    ok(!!roof && Math.abs((stairs.deck.deckY + stairs.deck.rise) - roof.deck.deckY) < 1e-4,
      'stairs top meets the floor above (' + f2(stairs.deck.deckY + stairs.deck.rise) + ' / ' + f2(roof && roof.deck.deckY) + ')');
    const sc = Math.cos(stairs.deck.yaw), ss = Math.sin(stairs.deck.yaw);
    const midX = stairs.deck.x, midZ = stairs.deck.z;
    const midSurf = stairs.deck.deckY + stairs.deck.rise * 0.5;
    const midPh = T.platformHeightAt(midX, midZ, midSurf + 1);
    ok(midPh != null && Math.abs(midPh - midSurf) < 0.05, 'stair mid-ramp walk height (' + f2(midPh) + ' vs ' + f2(midSurf) + ')');
    const insideX = stairs.deck.x + (stairs.deck.hw * 0.5) * sc;
    const insideZ = stairs.deck.z - (stairs.deck.hw * 0.5) * ss;
    const lowY = stairs.mesh.position.y + 0.2;
    const sidePush = T.pushOutOfBuild(stairs, insideX, insideZ, 0.35, true, lowY);
    const moved = Math.hypot(sidePush.x - insideX, sidePush.z - insideZ);
    ok(moved > 0.05, 'stair sides block a body below the ramp (pushed ' + f2(moved) + ')');
    const onRamp = T.pushOutOfBuild(stairs, midX, midZ, 0.35, true, midSurf);
    ok(Math.hypot(onRamp.x - midX, onRamp.z - midZ) < 1e-4, 'on the stair ramp: no shove');

    // --- BRIDGES: walkable deck matches the landmark platform ---
    ok(Array.isArray(T.POI.bridges) && T.POI.bridges.length >= 1, 'world has bridges (' + (T.POI.bridges && T.POI.bridges.length) + ')');
    const br = T.POI.bridges[0];
    const plat = T.platforms.find(pl => pl.landmark && Math.hypot(pl.x - br.x, pl.z - br.z) < 0.5);
    ok(!!plat, 'bridge has a landmark platform entry');
    if (plat) {
      const bph = T.platformHeightAt(br.x, br.z, plat.deckY + 2);
      ok(bph != null && Math.abs(bph - plat.deckY) < 1e-3, 'bridge centre walk height == platform deckY (' + f2(bph) + ')');
      const underY = T.sampleHeight(br.x, br.z);
      const underEg = T.entityGroundY(br.x, br.z, underY + 0.5);
      ok(underEg < plat.deckY - 0.5, 'under-bridge feet stay on channel ground (' + f2(underEg) + ' << deck ' + f2(plat.deckY) + ')');
      const rails = T.worldSolids.filter(ws => Math.hypot(ws.x - br.x, ws.z - br.z) < 10 && ws.y1 > plat.deckY);
      ok(rails.length >= 2, 'bridge has rail solids above the deck (' + rails.length + ')');
      if (rails.length) {
        const rail = rails[0];
        const onDeck = T.resolveStaticProps(rail.x, rail.z, 0.4, plat.deckY);
        const under = T.resolveStaticProps(rail.x, rail.z, 0.4, underY);
        const shovedOn = Math.hypot(onDeck.x - rail.x, onDeck.z - rail.z);
        const shovedUnder = Math.hypot(under.x - rail.x, under.z - rail.z);
        ok(shovedOn > 0.05, 'on the deck, a rail shoves you (' + f2(shovedOn) + ')');
        ok(shovedUnder < 0.05, 'under the bridge, the same rail does not shove (' + f2(shovedUnder) + ')');
      }
    }

    // --- COVER: sandbag / wire / barricade vs zombie block + vault ---
    const cx = gx, cz = gz + 2;
    const bag = T.placeBuildAt('sandbag', cx, cz, 0);
    const wire = T.placeBuildAt('wire', cx + 1, cz, 0);
    const bar = T.placeBuildAt('barricade', cx + 2, cz, 0);
    ok(!!bag && !!wire && !!bar, 'sandbag, wire, barricade placed');
    ok(T.climberCanVaultBuild(bag, T.CLIMB_HEIGHT) === true, 'climber vaults sandbag (h=' + T.ruleFor('sandbag').height + ' <= ' + T.CLIMB_HEIGHT + ')');
    ok(T.climberCanVaultBuild(wire, T.CLIMB_HEIGHT) === true, 'climber vaults wire');
    ok(T.climberCanVaultBuild(bar, T.CLIMB_HEIGHT) === false, 'climber cannot vault barricade (h=' + T.ruleFor('barricade').height + ')');
    ok(T.climberCanVaultBuild({ type: 'wall' }, T.CLIMB_HEIGHT) === false, 'climber cannot vault wall');

    const tb = T.thinBoxFor(bag);
    const approachX = tb.cx, approachZ = tb.cz;
    const hard = T.resolveHardBuildCollisions(approachX, approachZ, 0.4, false, bag.mesh.position.y + 0.3, null);
    ok(Math.hypot(hard.x - approachX, hard.z - approachZ) > 0.05, 'non-climber hard-blocked by sandbag (' + f2(Math.hypot(hard.x - approachX, hard.z - approachZ)) + ')');
    const vault = T.resolveHardBuildCollisions(approachX, approachZ, 0.4, false, bag.mesh.position.y + 0.3, T.CLIMB_HEIGHT);
    ok(Math.hypot(vault.x - approachX, vault.z - approachZ) < 1e-4, 'climber hard-collision skips sandbag (vault)');

    const bt = T.thinBoxFor(bar);
    const soft = T.resolveSoftBarricades(bt.cx, bt.cz, 0.4, 1);
    ok(Math.hypot(soft.x - bt.cx, soft.z - bt.cz) > 0.02, 'soft barricade shove at barricade line');

    // Chest-height hits via the same segmentHitsBuild bullets use
    const chest = bag.mesh.position.y + T.ruleFor('sandbag').height * 0.55;
    const sandHit = T.segmentHitsBuild(bag, tb.cx - 2, chest, tb.cz, tb.cx + 2, chest, tb.cz);
    const barHit = T.segmentHitsBuild(bar, bt.cx - 2, chest, bt.cz, bt.cx + 2, chest, bt.cz);
    const wt = T.thinBoxFor(wire);
    const wChest = wire.mesh.position.y + T.ruleFor('wire').height * 0.55;
    const wireGeom = T.segmentHitsBuild(wire, wt.cx - 2, wChest, wt.cz, wt.cx + 2, wChest, wt.cz);
    ok(sandHit !== null, 'sandbag stops a chest-height shot (t=' + sandHit + ')');
    ok(barHit !== null, 'barricade stops a chest-height shot (t=' + barHit + ')');
    // Wire has geometry but updateProjectiles skips railing/wire (mostly air) — height proves low cover
    ok(wireGeom !== null && T.ruleFor('wire').height <= T.CLIMB_HEIGHT, 'wire is low cover with hit geometry (rounds skip in flight loop)');
    // --- D-8: paid tryPlace emits purchase-delivered ---
    const buys = [];
    const onBuy = (e) => { if (e.detail && e.detail.type === 'purchase-delivered') buys.push(e.detail); };
    window.addEventListener('dw-game', onBuy);
    const freeGx = gx + 4, freeGz = gz + 4;
    const d8x = T.gridCentre(freeGx), d8z = T.gridCentre(freeGz);
    const d8y = T.sampleHeight(d8x, d8z);
    p.set(d8x - 4, T.sampleHeight(d8x - 4, d8z), d8z);
    await wait(60);
    T.setBuildYaw(0);
    T.setPlaceMode('sandbag');
    T.setAimRay(d8x + 0.2, d8y + 12, d8z + 0.1, -0.2, -12, -0.1);
    T.updateGhostPreview();
    await wait(40);
    const bankBefore = T.getBank();
    const n0 = T.builds.length;
    T.tryPlace();
    await wait(40);
    window.removeEventListener('dw-game', onBuy);
    const buildBuy = buys.find(b => b.source === 'build' && b.cashSpent > 0);
    ok(T.builds.length === n0 + 1, 'D-8 tryPlace added a sandbag piece');
    ok(!!buildBuy, 'D-8 purchase-delivered for build (n=' + buys.length + ')');
    ok(!!buildBuy && buildBuy.itemId === 'sandbag' && T.getBank() === bankBefore - buildBuy.cashSpent,
      'D-8 sandbag itemId and bank debit match');


  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
