// t328 - CU-229 (Jerry's J58). Buy an attachment at the Training Ground kiosk and use it.
// The purchase is owned and not fitted. The shop covers the banner, so closing it says the
// attachment is fitted at the Armory. Using the row again says the same thing, and never
// "NOT OWNED". The flashlight, bought on the gear tab, then turns on.
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
    const supRow = () => rows().find((r) => /suppressor/i.test((r.querySelector('.name') || {}).textContent || '') && /pistol/i.test((r.querySelector('.name') || {}).textContent || ''));
    ok(!!supRow(), 'the pistol suppressor is for sale (' + rows().map((r) => (r.querySelector('.name') || {}).textContent).slice(0, 4).join(' | ') + ')');
    if (supRow()) supRow().querySelector('button').click();
    await wait(50);
    const tag = (supRow() && supRow().querySelector('.name') || {}).textContent || '';
    ok(/armory/i.test(tag), 'the row says to fit it at the Armory (' + tag + ')');
    ok(/armory/i.test(banner()) && !/NOT OWNED/i.test(banner()), 'the purchase says the Armory (' + banner() + ')');
    T.closeMenuDbg('shop');
    await wait(100);
    ok(/armory/i.test(banner()) && !/NOT OWNED/i.test(banner()), 'closing the kiosk still says the Armory (' + banner() + ')');
    const mod = T.armoryDbg.mods('pistol').find((m) => m.id === 'suppressor');
    ok(!!mod && mod.owned && !mod.fitted, 'the Armory has the suppressor, and it is not on the pistol yet');
    ok(T.openMenuDbg('shop'), 'the kiosk again');
    T.setShopTabDbg('upgrades');
    await wait(50);
    const again = rows().find((r) => /suppressor/i.test((r.querySelector('.name') || {}).textContent || '') && /pistol/i.test((r.querySelector('.name') || {}).textContent || ''));
    const btn = again && again.querySelector('button');
    ok(!!btn && !btn.disabled, 'the bought suppressor can still be used (' + (btn ? btn.textContent : 'missing') + ')');
    if (btn) btn.click();
    T.closeMenuDbg('shop');
    await wait(100);
    ok(/armory/i.test(banner()) && !/NOT OWNED/i.test(banner()), 'using it points at the Armory (' + banner() + ')');
    ok(T.openMenuDbg('shop'), 'the gear tab');
    T.setShopTabDbg('gear');
    await wait(50);
    const light = findRow(/flashlight/i);
    ok(!!light, 'the flashlight is for sale');
    if (light) light.querySelector('button').click();
    await wait(50);
    ok(!!T.getGearOwned().flashlight, 'the flashlight is owned');
    T.closeMenuDbg('shop');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit4', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit4', bubbles: true }));
    await wait(50);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit2', bubbles: true }));
    await wait(50);
    ok(!/NOT OWNED/i.test(banner()), 'turning the flashlight on does not say NOT OWNED (' + banner() + ')');
  } catch (e) {
    ok(false, 't328 threw: ' + String((e && e.stack) || e).slice(0, 400));
  } finally {
    try { T.closeMenuDbg && T.closeMenuDbg('shop'); } catch (_) {}
  }
  return out.join('\n');
})()
