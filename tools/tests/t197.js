// t197 - GB-132 (ChatGPT's GP-72 request, 2026-10-05): the pistol's no-sear banner on X (toggleFireMode) takes its
//  second line from the catalogue (ui/strings.js armory.atKiosk, the supply terminal), not the old hard-coded
//  'The auto sear is in the kiosk'. With the sear bought but not fitted it still says something else (the Armory),
//  and the pistol stays semi either way.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const banner = () => { const b = document.getElementById('bigBanner'); return { t: ((b && b.querySelector('.t')) || {}).textContent || '', s: ((b && b.querySelector('.s')) || {}).textContent || '' }; };
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await until(() => T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0, 3000);
    await wait(250);
    return T.getCurrentWeapon() === w;
  };
  try {
    const S = await import(new URL('/ui/strings.js', location.origin).href);
    const want = S.text('armory.atKiosk');
    ok(typeof want === 'string' && want.length > 0 && want !== 'armory.atKiosk', 'the catalogue has armory.atKiosk: "' + want + '"');
    await startMatch(T, 'FireBanner');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    T.addCash(50000);
    T.grantAllWeapons();
    ok(await take('pistol'), 'pistol in hand');
    const r1 = T.toggleFireMode(), b1 = banner();
    ok(r1 === false, 'no sear: X leaves the pistol on semi (' + r1 + ')');
    ok(b1.t === 'SEMI ONLY', 'banner title: ' + b1.t);
    ok(b1.s === want && !/kiosk/i.test(b1.s), 'no sear: the second line is the catalogue\'s: "' + b1.s + '"');
    T.buyPistolAuto();
    const r2 = T.toggleFireMode(), b2 = banner();
    ok(r2 === false && b2.t === 'SEMI ONLY', 'sear bought, not fitted: still semi (' + r2 + ', ' + b2.t + ')');
    ok(b2.s.length > 0 && b2.s !== want, 'sear bought, not fitted: a different line (the Armory): "' + b2.s + '"');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.clearZombies(); } catch (_) {}
  return out.join('\n');
})();
