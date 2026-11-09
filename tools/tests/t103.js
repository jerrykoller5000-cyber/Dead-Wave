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
    ok(/Combat helmet/.test(text), 'the gear list still shows');
    T.closeMenuDbg('shop'); T.openMenuDbg('armory');
    document.querySelector('#armoryPanel .armory-actions button:nth-child(2)').click();
    T.setShopTabDbg('upgrades');
    ok(/laser\/light/i.test(document.getElementById('shopList').textContent), 'the Armory store sells the laser/light (D-124)');
    T.closeMenuDbg('shop'); T.closeMenuDbg('armory');
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
