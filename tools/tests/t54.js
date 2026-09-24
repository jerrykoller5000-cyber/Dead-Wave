// t54 — GB-16: objectives combat side (radio defenders, grants, player-damaged)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    ok(typeof T.spawnObjectiveDefenders === 'function', 'spawnObjectiveDefenders exported');
    ok(typeof T.getRadioDefenderState === 'function', 'getRadioDefenderState exported');
    ok(typeof T.grantSupply === 'function', 'grantSupply exported');
    ok(typeof T.listOwnedAmmoPackChoices === 'function', 'listOwnedAmmoPackChoices exported');
    ok(typeof T.grantBuildBlueprint === 'function', 'grantBuildBlueprint exported');
    ok(!!T.RADIO_DEFENDER && T.RADIO_DEFENDER.count === 2, 'RADIO_DEFENDER.count === 2');
    ok(!!T.RADIO_DEFENDER && T.RADIO_DEFENDER.triggerR === 24, 'RADIO_DEFENDER.triggerR === 24');

    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'GB16';
    document.getElementById('modeHunt').click();
    let started = false;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
    }
    ok(started, 'match reached prep');
    if (!started) return out.join('\n');

    // (c) player-damaged
    let dmgEvents = 0; let lastDmg = null;
    const onDmg = (ev) => {
      if (ev.detail && ev.detail.type === 'player-damaged') { dmgEvents++; lastDmg = ev.detail; }
    };
    window.addEventListener('dw-game', onDmg);
    T.damagePlayer(12, 'test');
    await wait(20);
    ok(dmgEvents === 1, 'c) player-damaged fires once');
    ok(!!lastDmg && lastDmg.toHp > 0, 'c) player-damaged carries toHp');
    window.removeEventListener('dw-game', onDmg);

    // (b) grants
    // Drive medkits toward full so a big grant must leave a remainder.
    for (let i = 0; i < 5; i++) {
      const mk = T.getMedkits ? T.getMedkits() : 0;
      if (mk >= 2) break;
      T.grantSupply({ receiptId: 't54-prefill-' + i, items: [{ id: 'medkit', qty: 1 }], source: 'test' });
    }
    const g1 = T.grantSupply({ receiptId: 't54-med-partial', items: [{ id: 'medkit', qty: 5 }], source: 'objective' });
    ok(!!g1 && g1.ok, 'b) grantSupply ok');
    ok(!!g1 && Array.isArray(g1.accepted) && Array.isArray(g1.remaining), 'b) accepted+remaining arrays');
    const aq = (g1.accepted || []).reduce((s, x) => s + (x.qty || 0), 0);
    const rq = (g1.remaining || []).reduce((s, x) => s + (x.qty || 0), 0);
    ok(aq + rq === 5, 'b) accepted+remaining === 5 (got ' + aq + '+' + rq + ')');
    const g1b = T.grantSupply({ receiptId: 't54-med-partial', items: [{ id: 'medkit', qty: 5 }], source: 'objective' });
    ok(!!g1b && g1b.alreadyApplied === true, 'b) same receiptId is idempotent');

    const gN = T.grantSupply({ receiptId: 't54-nade', items: [{ id: 'grenade', qty: 1 }], source: 'objective' });
    ok(!!gN && gN.ok, 'b) grenade grant ok');

    const choices = T.listOwnedAmmoPackChoices();
    ok(Array.isArray(choices), 'b) listOwnedAmmoPackChoices returns array');
    ok(choices.some((c) => c.caliber === '9mm' || c.id === 'ammo:9mm'), 'b) 9mm choice present');

    const bp = T.grantBuildBlueprint('mortar');
    ok(!!bp && (bp.granted === true || bp.alreadyOwned === true), 'b) grantBuildBlueprint mortar');
    const bp2 = T.grantBuildBlueprint('mortar');
    ok(!!bp2 && bp2.alreadyOwned === true && bp2.granted === false, 'b) second blueprint alreadyOwned');

    // GB-17 (D-16): refuse unowned ammo; fractional saw fuel
    const gRefuse = T.grantSupply({ receiptId: 't54-refuse-338', items: [{ id: 'ammo:.338', qty: 4 }], source: 'test' });
    ok(!!gRefuse && gRefuse.ok, "GB-17 refuse grant ok");
    const refuseAcc = (gRefuse.accepted || []).reduce((s, x) => s + (x.qty || 0), 0);
    const refuseRem = (gRefuse.remaining || []).reduce((s, x) => s + (x.qty || 0), 0);
    ok(refuseAcc === 0 && refuseRem === 4, 'GB-17 unowned .338 refused (acc=' + refuseAcc + ' rem=' + refuseRem + ')');
    ok(!(T.getReserve && (T.getReserve()['.338'] > 0)), 'GB-17 .338 reserve still empty');

    // Fractional saw: own chainsaw, tank full -> remaining keeps fraction (no qty|0).
    const owned = T.getWeaponOwned ? T.getWeaponOwned() : null;
    if (owned) owned.chainsaw = true;
    const gFuel = T.grantSupply({ receiptId: 't54-fuel-frac', items: [{ id: 'ammo:chainsaw', qty: 1.25 }], source: 'test' });
    ok(!!gFuel && gFuel.ok, "GB-17 fuel grant ok");
    const fuelAcc = (gFuel.accepted || []).reduce((s, x) => s + (x.qty || 0), 0);
    const fuelRem = (gFuel.remaining || []).reduce((s, x) => s + (x.qty || 0), 0);
    ok(Math.abs((fuelAcc + fuelRem) - 1.25) < 1e-9, 'GB-17 fuel accepted+remaining === 1.25 (got ' + fuelAcc + '+' + fuelRem + ')');
    ok(fuelRem === 1.25 || fuelAcc > 0, 'GB-17 fuel fraction preserved (rem=' + fuelRem + ' acc=' + fuelAcc + ')');


    // (a) radio defenders
    T.clearZombies && T.clearZombies();
    const st0 = T.getRadioDefenderState();
    ok(!!st0 && st0.siteId === 'objective:radio-repair', 'a) radio site id');
    ok(!!st0.centre && Number.isFinite(st0.centre.x), 'a) radio centre');

    const spawn = T.spawnObjectiveDefenders({ siteId: 'radio', reset: true });
    ok(!!spawn, 'a) spawnObjectiveDefenders returned');
    const st1 = T.getRadioDefenderState();
    if (spawn.spawned > 0) {
      ok(spawn.spawned >= 1, 'a) spawned at least one defender');
      const defs = (T.zombies || []).filter((z) => z.alive && z.objectiveId === 'objective:radio-repair');
      ok(defs.length === spawn.spawned, 'a) live defenders tagged');
      ok(defs.every((z) => z.typeKey === 'shambler'), 'a) defenders are shamblers');
      const spawn2 = T.spawnObjectiveDefenders({ siteId: 'radio' });
      ok(spawn2.reason === 'already' || spawn2.spawned === 0, 'a) second call does not double-spawn');
    } else {
      ok(spawn.deferred === true || spawn.reason === 'no-seat' || spawn.reason === 'capped',
        'a) deferred when unsafe/capped/no-seat (' + (spawn && spawn.reason) + ')');
      ok(st1.pending === true || st1.fired === false, 'a) pending retained');
    }
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
