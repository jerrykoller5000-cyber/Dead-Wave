// t103 - CU-109 (Jerry): the laser/light starts locked. 2 does nothing until the
// combo is bought and fitted; the gear kiosk sells it. Once owned and fitted, 2 still toggles the light.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Flashlight');
    const g = T.getGearOwned();
    ok(g.laserLight === false, 'a fresh run does not own the laser/light');
    ok(!g.flashlight && !g.laser, 'a fresh run does not own a separate flashlight or laser');
    ok(T.flashlight.intensity === 0, 'the light starts dark');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2' }));
    await wait(200);
    ok(T.flashlight.intensity === 0, '2 does nothing until the laser/light is bought');
    T.setShopTabDbg('gear');
    const text = document.getElementById('shopList').textContent;
    ok(!/laser\/light/i.test(text), 'the kiosk no longer sells the laser/light (D-124)');
    ok(!/Combat helmet/.test(text), 'the kiosk no longer sells the Combat helmet (D-124)');
    T.closeMenuDbg('shop'); T.openMenuDbg('cif');
    const headTab = document.querySelector('#cifTabs [data-cif-tab="head"]'); if (headTab) headTab.click();
    await wait(80);
    ok(!!document.querySelector('#cif [data-cif-buy="helmet"]'), 'the CIF Head tab sells the Combat helmet (D-124)');
    T.closeMenuDbg('cif');
    T.closeMenuDbg('shop'); T.openMenuDbg('armory');
    T.setShopTabDbg('upgrades');
    ok(/laser\/light/i.test(document.getElementById('shopList').textContent), 'the Armory store sells the laser/light (D-124)');
    T.closeMenuDbg('shop'); T.closeMenuDbg('armory');
    T.addCash(-T.getBank());
    T.openMenuDbg('armory'); await wait(80);
    T.armoryDbg.ui().bench('pistol'); await wait(80);
    const supRowEl = document.querySelector('#armoryPanel [data-mod="suppressor"]');
    ok(!!supRowEl && /need \$?\d+ more/i.test(supRowEl.textContent) && supRowEl.querySelector('button').disabled, 'out of Cash: the pistol workbench row shows the shortfall and the buy is off (' + (supRowEl ? supRowEl.textContent.slice(0, 70) : 'no row') + ')');
    T.closeMenuDbg('armory');
    T.setGearDbg('laserLight');
    T.armoryDbg.fit(T.getCurrentWeapon(), 'laserLight', true);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2' }));
    await wait(200);
    ok(T.flashlight.intensity > 0, '2 turns a bought laser/light on (' + T.flashlight.intensity + ')');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2' }));
    await wait(200);
    ok(T.flashlight.intensity === 0, '2 turns it off again');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
