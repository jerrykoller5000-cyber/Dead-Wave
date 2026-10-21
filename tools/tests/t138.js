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
    T.setSpareMags('m4', 0);
    ok(T.spareMagCount('m4') === 0, 'those magazines are no longer on him');
    ok(T.takeOutGun('m4') === true, 'he takes the M4 back out');
    ok(T.spareMagCount('m4') === 4, 'the same 4 magazines came back (' + T.spareMagCount('m4') + ')');
    T.openWheel('weapon');
    const keys = (T.getWheelState().keys || []).filter((k) => k !== 'unarmed');
    ok(keys.length <= 5, 'the wheel shows at most 5 guns (' + keys.join(', ') + ')');
    ok(keys.includes('m4') && keys.includes('pistol'), 'the M4 and the hip pistol are on it');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
