// t185 - GB-127 (Jerry): every gun that can fire full auto starts on AUTO.
//  - A new run: the M4, AK and AA-12 (fire selector) show AUTO and fire a burst while the button is held; the Uzi,
//    minigun, flamethrower and chainsaw are auto; the pistol is semi until its sear is fitted, then AUTO at once.
//  - Semi-only guns (shotgun, revolver, sniper, launcher) are unchanged: one shot a click.
//  - AUTO survives a swap, a reload and a holster; a K press (SEMI) is kept for that gun through swaps for the
//    rest of the run, and a new run puts it back on AUTO.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const hud = () => ((document.getElementById('ammoDetail') || {}).textContent || '').trim();
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await until(() => T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0, 3000);
    await wait(250);
    return T.getCurrentWeapon() === w;
  };
  // Rounds fired while the button is held for `ms` (the magazine topped up first so a reload cannot get in the way).
  const held = async (w, ms) => {
    T.setAmmoDbg(w, 20); await wait(150);
    const a = T.getAmmo()[w];
    T.setMouseFireDbg(true); await wait(ms); T.setMouseFireDbg(false);
    await wait(120);
    return a - T.getAmmo()[w];
  };
  try {
    await startMatch(T, 'FullAuto');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    T.addCash(50000);
    T.grantAllWeapons();
    // Selector guns: AUTO from the start, and a held trigger fires a burst.
    for (const w of ['m4', 'ak', 'aa12']) {
      ok(await take(w), w + ' in hand');
      ok(/AUTO/.test(hud()), w + ' starts on AUTO (HUD: ' + hud() + ')');
      const n = await held(w, 450);
      ok(n > 1, w + ' fires full auto while held (' + n + ' rounds)');
    }
    // Always-auto guns.
    for (const w of ['uzi', 'minigun', 'flamer', 'chainsaw']) ok(!!(T.WEAPON_STATS[w] && T.WEAPON_STATS[w].auto), w + ' is an auto weapon');
    ok(await take('uzi'), 'uzi in hand');
    { const n = await held('uzi', 400); ok(n > 1, 'the Uzi fires full auto while held (' + n + ' rounds)'); }
    // Semi-only guns stay semi.
    for (const w of ['shotgun', 'revolver', 'sniper']) {
      ok(await take(w), w + ' in hand');
      ok(!(T.WEAPON_STATS[w].auto), w + ' has no auto');
      const n = await held(w, 300);
      ok(n === 1, w + ' still fires one shot a click (' + n + ')');
    }
    // The pistol: semi until the sear is fitted, then AUTO straight away.
    ok(await take('pistol'), 'pistol in hand');
    ok(/SEMI/.test(hud()) && (await held('pistol', 300)) === 1, 'no sear: the pistol is semi (' + hud() + ')');
    T.buyPistolAuto(); T.armoryDbg.fit('pistol', 'auto', true);
    await wait(150);
    ok(/AUTO/.test(hud()), 'sear fitted: the pistol is on AUTO without pressing K (' + hud() + ')');
    { const n = await held('pistol', 400); ok(n > 1, 'and fires full auto while held (' + n + ' rounds)'); }
    // Still AUTO after a swap, a reload and a holster.
    await take('ak');
    T.setAmmoDbg('ak', 5); T.startReload();
    await until(() => !T.isReloading(), 6000); await wait(200);
    ok(/AUTO/.test(hud()), 'after a reload the AK is still on AUTO (' + hud() + ')');
    T.toggleHolster(); await until(() => !T.drawDbg().active, 8000); await wait(300);
    T.toggleHolster(); await until(() => !T.drawDbg().active, 8000); await wait(300);
    ok(!T.isUnarmed() && /AUTO/.test(hud()), 'holstered and drawn again: the gun he draws is on AUTO (' + T.getCurrentWeapon() + ': ' + hud() + ')');
    await take('ak');
    ok(/AUTO/.test(hud()), 'and the AK is still on AUTO (' + hud() + ')');
    // His choice is kept for that gun.
    ok(T.toggleFireMode() === 'semi' && /SEMI/.test(hud()), 'K puts the AK on SEMI');
    await take('m4');
    ok(/AUTO/.test(hud()), 'the M4 keeps its own mode (AUTO)');
    await take('ak');
    ok(/SEMI/.test(hud()), 'back to the AK: still SEMI, his choice is kept (' + hud() + ')');
    // A new run: AUTO again.
    T.resetEconomyDbg();
    await take('pistol');   // a real new run draws the pistol (setWeapon), which refreshes the HUD
    T.grantAllWeapons();
    await take('ak');
    ok(/AUTO/.test(hud()), 'a new run: the AK is back on AUTO (' + hud() + ')');
    await take('pistol');
    ok(/SEMI/.test(hud()), 'a new run: the pistol has no sear again, so it is semi (' + hud() + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
