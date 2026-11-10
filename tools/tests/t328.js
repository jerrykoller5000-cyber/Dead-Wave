// t328 - CU-229 (Jerry's J58), updated for D-124 and GP-20074. Buy an attachment at the
// Training Ground Armory workbench and use it. A workbench purchase fits it immediately;
// the laser/light is bought there too, rather than at the kiosk.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const banner = () => (T.bigBannerText ? T.bigBannerText() : '');
  try {
    if (!T.setShopTabDbg || !T.openMenuDbg || !T.armoryDbg || !T.bigBannerText) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active, 20000), 'the Training Ground is up');
    ok(T.openMenuDbg('shop'), 'the kiosk opens');
    T.setShopTabDbg('upgrades');
    await wait(50);
    ok(!/suppressor/i.test(document.getElementById('shopList').textContent), 'the kiosk no longer sells the pistol suppressor (D-124)');
    T.closeMenuDbg('shop');
    T.openMenuDbg('armory');
    await wait(50);
    T.armoryDbg.ui().bench('pistol');
    await wait(50);
    const supBtn = () => document.querySelector('#armoryPanel [data-mod="suppressor"] button');
    const supRow = () => (document.querySelector('#armoryPanel [data-mod="suppressor"]') || {}).textContent || '';
    const bankNow = () => (T.getBank ? T.getBank() : 0);
    // Training replenishes practice Cash to 999999 in updateCoinHud.
    ok(bankNow() >= 999999 && !!supBtn() && !supBtn().disabled,
      'Training funds the priced workbench purchase (' + bankNow() + ' Cash; ' + supRow().slice(0, 70) + ')');
    T.armoryDbg.ui().bench('pistol');
    await wait(50);
    const priceM = /\$(\d+)/.exec(supRow());
    ok(!!priceM && !!supBtn() && !supBtn().disabled, 'the workbench row shows the suppressor price and the buy is on (' + supRow().slice(0, 70) + ')');
    const bankBefore = bankNow();
    ok(!!supBtn(), 'the pistol suppressor is for sale at the pistol workbench (D-124)');
    if (supBtn()) supBtn().click();
    await wait(50);
    ok(!!priceM && Number(priceM[1]) > 0 && bankBefore === 999999 && bankNow() === bankBefore,
      'the priced Training buy stays funded (' + bankBefore + ' -> ' + bankNow() + ', price ' + (priceM ? priceM[1] : '?') + ')');
    ok(/fitted/i.test(supRow()) && !/NOT OWNED/i.test(supRow()), 'the purchase fitted the suppressor (' + supRow().slice(0, 60) + ')');
    ok(!!supBtn() && !supBtn().disabled, 'the fitted row offers Remove');
    await wait(50);
    const mod = T.armoryDbg.mods('pistol').find((m) => m.id === 'suppressor');
    ok(!!mod && mod.owned && mod.fitted, 'the Armory owns and fitted the pistol suppressor');
    const st = (document.querySelector('#armoryPanel [data-mod="suppressor"]') || {}).textContent || '';
    ok(!/NOT OWNED/i.test(st) && !/NOT OWNED/i.test(banner()), 'buying it never says NOT OWNED (' + st.slice(0, 60) + ' | ' + banner() + ')');
    T.closeMenuDbg('armory');
    await wait(100);
    ok(!/NOT OWNED/i.test(banner()), 'closing the Armory does not say NOT OWNED (' + banner() + ')');
    ok(T.openMenuDbg('armory'), 'the Armory (for the laser/light)');
    await wait(50);
    T.armoryDbg.ui().bench('pistol');
    await wait(50);
    const light = document.querySelector('#armoryPanel [data-mod="laserLight"]');
    ok(!!light, 'the laser/light is for sale at the pistol workbench (D-124)');
    if (light) light.querySelector('button').click();
    await wait(50);
    ok(!!T.getGearOwned().laserLight, 'the laser/light is owned');
    ok(!!T.armoryDbg.mods('pistol').find(m => m.id === 'laserLight')?.fitted, 'the workbench fitted the bought laser/light');
    T.closeMenuDbg('armory');
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
