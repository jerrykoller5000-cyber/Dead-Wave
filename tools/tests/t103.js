// t103 - CU-75 (P-147, D-68): the gun flashlight is his from a fresh run. L still toggles it,
// and the kiosk no longer sells it.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Flashlight');
    ok(T.getGearOwned().flashlight === true, 'a fresh run already has the flashlight');
    ok(T.flashlight.intensity === 0, 'it starts off');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL', key: 'l' }));
    await wait(200);
    ok(T.flashlight.intensity > 0, 'L turns it on (' + T.flashlight.intensity + ')');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL', key: 'l' }));
    await wait(200);
    ok(T.flashlight.intensity === 0, 'L turns it off again');
    T.setShopTabDbg('gear');
    const text = document.getElementById('shopList').textContent;
    ok(!/flashlight/i.test(text), 'the kiosk has no flashlight row');
    ok(/Combat helmet/.test(text), 'the gear list still shows');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
