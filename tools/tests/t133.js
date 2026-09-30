// t133 - CU-69 (P-128): the M4, AK and AA-12 start on semi (one shot a click).
// The pistol stays semi until the auto sear is bought; on auto it spreads wider than the Uzi after 10 rounds.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'FireSelect');
    T.addCash(20000);
    T.grantAllWeapons();
    T.setWeapon(1);
    await wait(200);
    ok(T.getCurrentWeapon() === 'm4', 'the M4 is in hand');
    const a0 = T.getAmmo().m4;
    T.setMouseFireDbg(true);
    await wait(350);
    const dropped = a0 - T.getAmmo().m4;
    ok(dropped === 1, 'semi fires once while the button is held (dropped ' + dropped + ')');
    T.setMouseFireDbg(false);
    await wait(80);
    T.setMouseFireDbg(true);
    await wait(200);
    ok(a0 - T.getAmmo().m4 === 2, 'a second click fires again');
    T.setMouseFireDbg(false);
    await wait(80);
    T.toggleFireMode();
    const a1 = T.getAmmo().m4;
    T.setMouseFireDbg(true);
    await wait(400);
    T.setMouseFireDbg(false);
    const burst = a1 - T.getAmmo().m4;
    ok(burst > 2, 'AUTO holds a burst (' + burst + ' rounds)');
    ok(/AUTO/i.test((document.getElementById('ammoDetail') || {}).textContent || ''), 'the ammo line says AUTO');
    T.setWeapon(3);
    await wait(100);
    const p0 = T.getAmmo().pistol;
    T.setMouseFireDbg(true);
    await wait(300);
    T.setMouseFireDbg(false);
    ok(p0 - T.getAmmo().pistol === 1, 'the pistol is semi until the sear is bought');
    T.buyPistolAuto();
    T.toggleFireMode();
    ok(T.recoilSpan('pistol', 10) > T.recoilSpan('uzi', 10), 'pistol auto spreads wider than the Uzi after 10 rounds (' + T.recoilSpan('pistol', 10).toFixed(3) + ' > ' + T.recoilSpan('uzi', 10).toFixed(3) + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
