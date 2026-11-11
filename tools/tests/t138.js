// t138 - CU-65 (P-113): a gun handed in at the Armory comes back with the same magazines.
// Once a loadout is applied, the weapon wheel shows at most the four slots plus the hip pistol.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Armory');
    T.grantAllWeapons();
    ok(T.setSpareMags('m4', 4) === 4, 'the M4 is holding 4 magazines');
    T.handInGun('m4');
    const armory = T.armoryDbg.ui().armory;
    const shelved = armory.read().shelf.find((gun) => gun.id === 'm4');
    ok(shelved?.magazines.length === 4, 'the M4 shelf record keeps the same 4 magazines');
    ok(T.spareMagCount('m4') === 4, 'the live magazine ledger keeps the same 4 while stored');
    ok(T.takeOutGun('m4') === true, 'he takes the M4 back out');
    ok(T.spareMagCount('m4') === 4, 'the same 4 magazines came back (' + T.spareMagCount('m4') + ')');
    T.setSpareMags('m4', 1); T.handInGun('m4');
    ok(T.spareMagCount('m4') === 1, 'one live M4 magazine remains before a workbench buy');
    T.addCash(10000); T.setPhase && T.setPhase('prep'); T.openCIF();
    document.getElementById('armoryOpen').click();
    T.armoryDbg.ui().bench('m4');
    const buy = document.querySelector('#armoryPanel [data-buy-ammo="m4"]');
    ok(!!buy && !buy.disabled, 'the stored M4 can buy magazines at its workbench');
    buy?.click();
    const bought = T.spareMagCount('m4');
    ok(bought > 1, 'the workbench purchase adds live M4 magazines (' + bought + ')');
    T.closeCIF();
    ok(T.takeOutGun('m4') === true, 'he takes the restocked M4 back out');
    ok(T.spareMagCount('m4') === bought, 'taking it out keeps all ' + bought + ' purchased magazines');
    T.openWheel('weapon');
    const keys = (T.getWheelState().keys || []).filter((k) => k !== 'unarmed');
    ok(keys.length <= 5, 'the wheel shows at most 5 guns (' + keys.join(', ') + ')');
    ok(keys.includes('m4') && keys.includes('pistol'), 'the M4 and the hip pistol are on it');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
