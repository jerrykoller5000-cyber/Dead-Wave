// t150 - CL-90 part 2 (P-116, D-61): the draw and holster moves. A switch puts the gun in his hand back where it
// lives and draws the next from where it lives; U is a holster alone; a gun he doesn't carry just switches.
// Cosmetic: the move never stops a shot.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const idx = (w) => T.WEAPON_ORDER.indexOf(w);
  async function until(fn, ms) { const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await wait(40); } return fn(); }
  try {
    await startMatch(T, 'Draw90');
    T.grantAllWeapons();
    // The M4 must be the actual spare on his back for the hip-to-back move.
    for (const weapon of ['m4','ak','uzi']) {
      T.handInGun(weapon);
      if (!T.takeOutGun(weapon)) throw Error('Could not equip ' + weapon);
    }
    T.setWeapon(idx('pistol'));
    await until(() => !T.drawDbg().active, 20000);
    await wait(200);
    T.carryDbg();
    const load = T.carryDbg().plan;
    ok(load.hip === null, 'the pistol is in his hand, not on his hip');
    // The pistol goes back on the hip, the M4 comes off his back.
    T.setWeapon(idx('m4'));
    const started = await until(() => { const d = T.drawDbg(); return d.active ? d : null; }, 8000);
    ok(!!started && started.from === 'pistol' && started.to === 'm4' && started.segs.join() === 'stow,reach,raise', 'pistol to M4: stow, reach, raise (' + (started && started.segs.join()) + ')');
    ok(started && started.fromAt === 'hip' && started.toAt === 'back', 'from the hip to his back');
    let peak = 0, empty = false, hipBack = false;
    await until(() => {
      const d = T.drawDbg();
      if (!d.active) return true;
      peak = Math.max(peak, d.frame.w);
      if (d.frame.inHand === null) { empty = true; if (T.carryDbg().hip === 'pistol') hipBack = true; }
      return false;
    }, 30000);
    ok(peak > 0.6, 'the arm leaves the hold for the slots (peak ' + peak.toFixed(2) + ')');
    ok(empty && hipBack, 'between the two the pistol is back in the hip holster and his hand is empty');
    const after = T.carryDbg();
    ok(!T.drawDbg().active && T.weaponMeshes.m4.visible && T.weaponMeshes.pistol.visible === false, 'the M4 is up in his hands');
    ok(after.hip === 'pistol' && !after.slung.includes('m4'), 'the pistol stays holstered, the M4 is off his back: ' + JSON.stringify(after.slung));
    // U: a holster alone.
    T.toggleHolster();
    const u = await until(() => { const d = T.drawDbg(); return d.active ? d : null; }, 8000);
    ok(!!u && u.segs.join() === 'stow,raise' && u.to === null, 'U puts the M4 back on his back (' + (u && u.segs.join()) + ')');
    await until(() => !T.drawDbg().active, 30000);
    ok(T.carryDbg().slung.includes('m4'), 'the M4 is slung again');
    T.toggleHolster();
    const d2 = await until(() => { const d = T.drawDbg(); return d.active ? d : null; }, 8000);
    ok(!!d2 && d2.segs.join() === 'reach,raise' && d2.to === 'm4', 'U again draws it off his back (' + (d2 && d2.segs.join()) + ')');
    await until(() => !T.drawDbg().active, 30000);
    // A gun he doesn't carry (the third primary of a debug grant): no move.
    if (!T.getWeaponOwned().flamer || T.getCurrentWeapon() !== 'm4' || !T.weaponMeshes.m4.visible ||
        T.carryDbg().slung.includes('flamer')) throw Error('The off-body switch needs a held M4 and an owned, unslung flamer');
    T.setWeapon(idx('flamer'));
    if (T.getCurrentWeapon() !== 'flamer') throw Error('The off-body switch was not accepted');
    await wait(400);
    const d3 = T.drawDbg();
    ok(!d3.active || d3.to !== 'flamer' || d3.segs.join() === 'stow,raise', 'the flamer, not carried, is no draw: ' + d3.segs.join());
    await until(() => !T.drawDbg().active, 30000);
    // A move never stops a shot: switch, and the gun can fire at once.
    // Start this switch with the hip pistol in hand so it actually plays a stow.
    if (!T.weaponMeshes.flamer.visible || T.weaponMeshes.m4.visible) throw Error('The off-body flamer never reached his hands');
    T.setWeapon(idx('pistol'));
    T.stepFrame(1 / 60);
    if (!(await until(() => !T.drawDbg().active && T.weaponMeshes.pistol.visible, 30000))) throw Error('The hip pistol never reached his hands');
    T.setWeapon(idx('uzi'));
    T.stepFrame(1 / 60);
    const moving = T.drawDbg();
    if (!moving.active || moving.from !== 'pistol' || moving.to !== 'uzi' || !moving.segs.includes('stow'))
      throw Error('The cooldown check needs a live pistol-to-Uzi stow');
    const sw = T.getSwapDbg();
    ok(sw.fireCooldown <= 0.001, 'the draw leaves the fire cooldown alone (' + sw.fireCooldown + ')');
    await until(() => !T.drawDbg().active, 30000);
    ok(T.weaponMeshes.uzi.visible, 'the Uzi ends up in his hand');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
