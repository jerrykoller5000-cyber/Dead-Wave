// t122 - CU-68 (P-127): a suppressor in the kiosk for each gun that has a can.
// Buying it shows the can and moves the muzzle. The AA-12 has no row. A fresh run takes it off.
// The shot itself does not change (that is P-129).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Suppressor');
    T.addCash(20000);
    T.buyWeapon('m4');
    T.buyWeapon('aa12');
    const gun = T.weaponMeshes.m4;
    const bare = gun.userData.muzzleLocal.z;
    ok(gun.userData.suppressed !== true && !(gun.userData.suppressor && gun.userData.suppressor.visible), 'the M4 starts without a can');
    const bank = T.getBank();
    T.buySuppressor('aa12');
    ok(T.getBank() === bank, 'the AA-12 has nothing to buy');
    T.buySuppressor('m4');
    ok(T.getBank() === bank - T.SUPPRESSOR_PRICE.m4, 'the M4 can costs ' + T.SUPPRESSOR_PRICE.m4);
    ok(gun.userData.suppressed !== true, 'CL-113: bought, it waits for the Armory');
    T.armoryDbg.fit('m4', 'suppressor', true);   // CL-113: fitted at the Armory's workbench
    ok(gun.userData.suppressed === true && gun.userData.suppressor.visible === true, 'the can is on the M4');
    ok(gun.userData.muzzleLocal.z > bare, 'the muzzle point moved to the end of the can');
    const pair = T.offhandMeshes.pistol;
    const pairBare = pair.userData.muzzleLocal.z;
    T.buySuppressor('pistol');
    T.armoryDbg.fit('pistol', 'suppressor', true);   // CL-113
    ok(pair.userData.suppressed === true && pair.userData.suppressor.visible === true, 'the off-hand pistol wears one too');
    ok(pair.userData.muzzleLocal.z > pairBare, 'and its muzzle moved');
    ok(T.weaponMeshes.pistol.userData.suppressed === true, 'so does the pistol in his hand');
    const spent = T.SUPPRESSOR_PRICE.m4 + T.SUPPRESSOR_PRICE.pistol;
    T.buySuppressor('m4');
    ok(T.getBank() === bank - spent, 'buying it again does not charge');
    T.openShop(true);
    const weapons = document.querySelector('[data-shop-page="weapons"]');
    if (weapons) weapons.click();
    const tab = document.querySelector('[data-shop-page="upgrades"]');
    if (tab) tab.click();
    const text = (document.getElementById('shopList') || {}).innerText || '';
    ok(/suppressor/i.test(text), 'the upgrades tab lists a suppressor');
    ok(!/AA-?12[^\n]*suppressor/i.test(text), 'the AA-12 has no suppressor row');
    T.resetGame();
    ok(gun.userData.suppressed !== true && gun.userData.suppressor.visible !== true, 'a fresh run takes the can off');
    ok(pair.userData.suppressed !== true, 'and off the off-hand');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
