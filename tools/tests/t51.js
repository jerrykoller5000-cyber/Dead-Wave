// t51 - GP-7: getRepairSnapshot full-HP vs gone; getRepairTarget damaged-only; reportPurchase on paid repair.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    ok(typeof T.getRepairTarget === 'function', 'getRepairTarget exported');
    ok(typeof T.getRepairSnapshot === 'function', 'getRepairSnapshot exported');
    ok(typeof T.repairNearestBuild === 'function', 'repairNearestBuild exported');

    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'GP7Repair';
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
      const tx = 32, tz = 32;
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
    T.levelGroundRect(T.gridCentre(gx - 3), T.gridCentre(gz - 3), T.gridCentre(gx + 3), T.gridCentre(gz + 3), yPad, 4);
    const cx = T.gridCentre(gx), cz = T.gridCentre(gz);
    p.set(cx, T.sampleHeight(cx, cz), cz);
    await wait(80);

    const wall = T.placeBuildAt('wall', gx + 1, gz, 0);
    ok(!!wall && wall.hp >= wall.maxHp - 0.5, 'fresh wall at full HP');

    // Full HP: getRepairTarget skips (damaged-only).
    const tgtFull = T.getRepairTarget(7);
    ok(tgtFull === null, 'getRepairTarget skips full-HP wall');

    // Damage so we can read the stable id, then repair and assert completion snapshot.
    wall.hp = wall.maxHp * 0.4;
    const tgtDmg = T.getRepairTarget(7);
    ok(!!tgtDmg && tgtDmg.id && tgtDmg.cost > 0, 'getRepairTarget returns damaged wall with cost>0');
    ok(!!tgtDmg && tgtDmg.hp < tgtDmg.maxHp - 0.5, 'damaged target hp < maxHp');
    const rid = tgtDmg.id;

    const snapDmg = T.getRepairSnapshot(rid);
    ok(!!snapDmg && snapDmg.cost === tgtDmg.cost && snapDmg.hp === wall.hp, 'getRepairSnapshot matches damaged state');

    // Repair via owner path: paid HP delivery + purchase-delivered (GB-11).
    const buys = [];
    const onBuy = (e) => { if (e.detail && e.detail.type === 'purchase-delivered') buys.push(e.detail); };
    window.addEventListener('dw-game', onBuy);
    const bankBefore = T.getBank();
    T.repairNearestBuild();
    await wait(40);
    window.removeEventListener('dw-game', onBuy);
    ok(wall.hp >= wall.maxHp - 0.5, 'repairNearestBuild restored full HP');
    ok(T.getBank() < bankBefore, 'repair spent cash');
    const repairBuy = buys.find(b => b.source === 'repair' && b.cashSpent > 0);
    ok(!!repairBuy, 'purchase-delivered fired for paid repair (n=' + buys.length + ')');
    ok(!!repairBuy && repairBuy.itemId === 'wall', 'repair itemId is wall type');

    // Full HP existing target: snapshot with cost 0 (completion state for UI tick).
    const snapFull = T.getRepairSnapshot(rid);
    ok(!!snapFull, 'getRepairSnapshot returns object at full HP (not null)');
    ok(!!snapFull && snapFull.cost === 0 && snapFull.affordable === true, 'full-HP snapshot cost 0 + affordable');
    ok(!!snapFull && snapFull.id === rid && snapFull.hp >= snapFull.maxHp - 0.5, 'full-HP snapshot keeps same id');
    ok(T.getRepairTarget(7) === null, 'getRepairTarget still skips after repair (damaged-only)');

    // Gone: remove build -> null
    T.removeBuild(wall);
    await wait(20);
    ok(T.getRepairSnapshot(rid) === null, 'getRepairSnapshot null when build gone');
    ok(T.getRepairTarget(7) === null, 'getRepairTarget null when no damaged builds');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
