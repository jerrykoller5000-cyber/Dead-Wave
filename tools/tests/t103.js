// t103 - CU-109 (Jerry): the flashlight and the laser start locked. 2 does nothing until the
// light is bought; the gear kiosk sells it again. Once owned, 2 still toggles it.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Flashlight');
    const g = T.getGearOwned();
    ok(g.flashlight === false, 'a fresh run does not own the flashlight');
    ok(g.laser === false, 'a fresh run does not own the laser');
    ok(T.flashlight.intensity === 0, 'the light starts dark');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2' }));
    await wait(200);
    ok(T.flashlight.intensity === 0, '2 does nothing until the flashlight is bought');
    T.setShopTabDbg('gear');
    const text = document.getElementById('shopList').textContent;
    ok(/flashlight/i.test(text), 'the kiosk sells the flashlight');
    ok(/Combat helmet/.test(text), 'the gear list still shows');
    T.setGearDbg('flashlight');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2' }));
    await wait(200);
    ok(T.flashlight.intensity > 0, '2 turns a bought flashlight on (' + T.flashlight.intensity + ')');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2' }));
    await wait(200);
    ok(T.flashlight.intensity === 0, '2 turns it off again');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
