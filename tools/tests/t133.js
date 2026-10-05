// t133 - CU-69 (P-128): the fire selector (K) on the M4, AK and AA-12; GB-127 (Jerry): they START on AUTO.
// The pistol stays semi until the auto sear is fitted, then it starts on auto too; on auto it spreads wider than the Uzi after 10 rounds.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hud = () => (document.getElementById('ammoDetail') || {}).textContent || '';
  try {
    await startMatch(T, 'FireSelect');
    T.addCash(20000);
    T.grantAllWeapons();
    T.setWeapon(1);
    await wait(200);
    ok(T.getCurrentWeapon() === 'm4', 'the M4 is in hand');
    for (let i = 0; i < 60 && T.getSwapDbg().swapT > 0; i++) await wait(50);   // the swap finished, so the trigger is live
    await wait(250);
    ok(/AUTO/i.test(hud()), 'GB-127: the ammo line says AUTO from the start (' + hud().trim() + ')');
    const a0 = T.getAmmo().m4;
    T.setMouseFireDbg(true);
    await wait(400);
    T.setMouseFireDbg(false);
    const burst = a0 - T.getAmmo().m4;
    ok(burst > 2, 'GB-127: it starts on AUTO, holding the button fires a burst (' + burst + ' rounds)');
    await wait(80);
    T.toggleFireMode();
    ok(/SEMI/i.test(hud()), 'K: the ammo line says SEMI');
    const a1 = T.getAmmo().m4;
    T.setMouseFireDbg(true);
    await wait(350);
    const dropped = a1 - T.getAmmo().m4;
    ok(dropped === 1, 'semi fires once while the button is held (dropped ' + dropped + ')');
    T.setMouseFireDbg(false);
    await wait(80);
    T.setMouseFireDbg(true);
    await wait(200);
    ok(a1 - T.getAmmo().m4 === 2, 'a second click fires again');
    T.setMouseFireDbg(false);
    await wait(80);
    T.setWeapon(3);
    await wait(100);
    const p0 = T.getAmmo().pistol;
    T.setMouseFireDbg(true);
    await wait(300);
    T.setMouseFireDbg(false);
    ok(p0 - T.getAmmo().pistol === 1, 'the pistol is semi until the sear is fitted');
    T.buyPistolAuto();
    T.armoryDbg.fit('pistol', 'auto', true);   // CL-113: fitted at the Armory
    await wait(100);
    ok(/AUTO/i.test(hud()), 'GB-127: with the sear fitted the pistol starts on AUTO (' + hud().trim() + ')');
    ok(T.recoilSpan('pistol', 10) > T.recoilSpan('uzi', 10), 'pistol auto spreads wider than the Uzi after 10 rounds (' + T.recoilSpan('pistol', 10).toFixed(3) + ' > ' + T.recoilSpan('uzi', 10).toFixed(3) + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
