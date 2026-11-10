// t328 - CU-229 (Jerry's J58). Buy an attachment at the Training Ground kiosk and use it.
// The purchase is owned and not fitted. The shop covers the banner, so closing it says the
// attachment is fitted at the Armory. Using the row again says the same thing, and never
// "NOT OWNED". The laser/light, bought on the gear tab and fitted, then turns on.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const banner = () => (T.bigBannerText ? T.bigBannerText() : '');
  const rows = () => [...document.querySelectorAll('#shopList .perk')];
  const findRow = (re) => rows().find((r) => re.test((r.querySelector('.name') || {}).textContent || ''));
  try {
    if (!T.setShopTabDbg || !T.openMenuDbg || !T.armoryDbg || !T.bigBannerText) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active, 20000), 'the Training Ground is up');
    ok(T.openMenuDbg('shop'), 'the kiosk opens');
    T.setShopTabDbg('upgrades');
    await wait(50);
    ok(!rows().some((r) => /suppressor/i.test((r.querySelector('.name') || {}).textContent || '')), 'the kiosk no longer sells the pistol suppressor (D-124)');
    T.closeMenuDbg('shop');
    T.openMenuDbg('armory');
    await wait(50);
    T.armoryDbg.ui().bench('pistol');
    await wait(50);
    const supBtn = () => document.querySelector('#armoryPanel [data-mod="suppressor"] button');
    const supRow = () => (document.querySelector('#armoryPanel [data-mod="suppressor"]') || {}).textContent || '';
    const bankNow = () => (T.getBank ? T.getBank() : 0);
    if (T.addCash && T.getBank) T.addCash(-bankNow());
    T.armoryDbg.ui().bench('pistol');
    await wait(50);
    ok(!!supBtn() && !supBtn().disabled && !/need \$?\d+ more/i.test(supRow()), 'Training Ground stock is free to afford: with no Cash the workbench row shows no shortfall and the buy is on (' + supRow().slice(0, 70) + '); the shortfall line is checked in t103');
    T.addCash && T.addCash(500);
    T.armoryDbg.ui().bench('pistol');
    await wait(50);
    const priceM = /\$(\d+)/.exec(supRow());
    ok(!!priceM && !!supBtn() && !supBtn().disabled, 'the workbench row shows the suppressor price and the buy is on (' + supRow().slice(0, 70) + ')');
    const bankBefore = bankNow();
    ok(!!supBtn(), 'the pistol suppressor is for sale at the pistol workbench (D-124)');
    if (supBtn()) supBtn().click();
    await wait(50);
    ok(!!priceM && bankBefore - bankNow() === Number(priceM[1]), 'the buy took its Cash (' + bankBefore + ' -> ' + bankNow() + ', price ' + (priceM ? priceM[1] : '?') + ')');
    ok(/owned/i.test(supRow()) && !/NOT OWNED/i.test(supRow()), 'the row now says owned, not fitted (' + supRow().slice(0, 60) + ')');
    ok(!!supBtn() && !supBtn().disabled, 'the bought row offers the fit again');
    await wait(50);
    const mod = T.armoryDbg.mods('pistol').find((m) => m.id === 'suppressor');
    ok(!!mod && mod.owned && !mod.fitted, 'the Armory has the suppressor, and it is not on the pistol yet');
    const st = (document.querySelector('#armoryPanel [data-mod="suppressor"]') || {}).textContent || '';
    ok(!/NOT OWNED/i.test(st) && !/NOT OWNED/i.test(banner()), 'buying it never says NOT OWNED (' + st.slice(0, 60) + ' | ' + banner() + ')');
    T.closeMenuDbg('armory');
    await wait(100);
    ok(!/NOT OWNED/i.test(banner()), 'closing the Armory does not say NOT OWNED (' + banner() + ')');
    T.addCash && T.addCash(500);
    ok(T.openMenuDbg('armory'), 'the Armory (for the store)');
    await wait(50);
    T.setShopTabDbg('upgrades');
    await wait(50);
    const light = findRow(/laser\/light/i);
    ok(!!light, 'the laser/light is for sale in the Armory store (D-124)');
    if (light) light.querySelector('button').click();
    await wait(50);    ok(!!T.getGearOwned().laserLight, 'the laser/light is owned');
    T.armoryDbg.fit(T.getCurrentWeapon() || 'pistol', 'laserLight', true);
    T.closeMenuDbg('shop'); T.closeMenuDbg('armory');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit4', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit4', bubbles: true }));
    await wait(50);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit2', bubbles: true }));
    await wait(50);
    ok(!/NOT OWNED/i.test(banner()), 'turning the laser/light on does not say NOT OWNED (' + banner() + ')');
  } catch (e) {
    ok(false, 't328 threw: ' + String((e && e.stack) || e).slice(0, 400));
  } finally {
    try { T.closeMenuDbg && T.closeMenuDbg('shop'); } catch (_) {}
  }
  return out.join('\n');
})()
