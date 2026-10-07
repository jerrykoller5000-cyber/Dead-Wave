// t214 - GB-137 (Jerry's playthrough 1: "True Magazine and reload system never got implemented"): a reload swaps a
//  real magazine. R pockets the magazine in the gun with the rounds left in it and the fullest one he carries goes in;
//  every magazine keeps its own count (nothing is topped up from a loose pool); R never swaps in an emptier one; with
//  none left it does nothing; a double tap drops it; the revolver keeps its live rounds in a part-full loader; akimbo
//  swaps both; a bought magazine comes full beside the part-used ones; the calibre's reserve reads exactly the spare
//  rounds, and the minigun's boxes stay off the Watchman's 7.62 belt. The HUD strip (GP-144) shows the real magazines.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const sorted = (a) => a.slice().sort((x, y) => y - x).join(',');
  const sum = (a) => a.reduce((n, v) => n + v, 0);
  const snap = (w) => T.magazinesDbg(w);
  const hudRounds = () => [...document.querySelectorAll('#ammoMags .mag-glyph')].map((g) => +g.dataset.rounds);
  const reload = async () => { T.startReload(); const started = T.isReloading(); await until(() => !T.isReloading(), 9000); await wait(60); return started; };
  try {
    await startMatch(T, 'Magazines');
    T.clearZombies(); T.runDevCommand('godmode');
    T.grantAllWeapons(); T.addCash(100000);
    const W = T.WEAPON_ORDER;
    const toGun = async (w) => { T.setWeapon(W.indexOf(w)); await until(() => T.getCurrentWeapon() === w, 1500); await wait(450); return T.getCurrentWeapon() === w; };
    ok(typeof T.magazinesDbg === 'function' && typeof T.setMagazinesDbg === 'function' && typeof T.reloadGainsMagazine === 'function', 'hooks: magazinesDbg, setMagazinesDbg, reloadGainsMagazine');

    // (1) R pockets the part-used magazine with its rounds; the fullest comes in.
    ok(await toGun('ak'), 'the AK in hand');
    T.setMagazinesDbg('ak', 7, [12, 30, 30]);
    const total0 = T.getAmmo().ak + sum(snap('ak').spare);
    ok(await reload(), 'R starts a reload with 7 in the gun');
    let s = snap('ak');
    ok(s.loaded[0] === 30 && sorted(s.spare) === '30,12,7', 'a full magazine went in, the 7-round one is kept as a spare: loaded ' + s.loaded[0] + ', spares ' + sorted(s.spare));
    ok(T.getAmmo().ak + sum(s.spare) === total0, 'no round made or lost: ' + total0 + ' -> ' + (T.getAmmo().ak + sum(s.spare)));
    ok((T.getReserve()['7.62mm'] | 0) === sum(s.spare), 'the 7.62 reserve reads exactly the spare rounds: ' + T.getReserve()['7.62mm'] + ' = ' + sum(s.spare));
    ok(sorted(hudRounds()) === sorted(s.spare), 'the HUD strip shows each magazine: ' + sorted(hudRounds()));
    ok(new RegExp('\\b' + sum(s.spare) + ' Bullets').test(document.getElementById('ammoDetail').textContent), 'the Bullets total is the spare rounds: ' + document.getElementById('ammoDetail').textContent);

    // (2) Partial magazines keep their counts; the next R takes the fullest, not the next in line.
    T.setAmmoDbg('ak', 3);
    await reload();
    s = snap('ak');
    ok(s.loaded[0] === 30 && sorted(s.spare) === '12,7,3', 'second reload: the last full one in, 3 kept, 12 and 7 untouched: ' + s.loaded[0] + ' | ' + sorted(s.spare));

    // (3) Never an emptier magazine: 20 in the gun and nothing fuller carried, R does nothing.
    T.setAmmoDbg('ak', 20);
    ok(!T.reloadGainsMagazine('ak'), 'nothing fuller than 20 carried');
    T.startReload();
    s = snap('ak');
    ok(!T.isReloading() && s.loaded[0] === 20 && sorted(s.spare) === '12,7,3', 'R with no fuller magazine starts nothing and swaps nothing: ' + s.loaded[0] + ' | ' + sorted(s.spare));
    T.setAmmoDbg('ak', 5);
    ok(T.reloadGainsMagazine('ak'), 'with 5 in the gun the 12 is fuller');
    await reload();
    s = snap('ak');
    ok(s.loaded[0] === 12 && sorted(s.spare) === '7,5,3', 'and R takes it: ' + s.loaded[0] + ' | ' + sorted(s.spare));

    // (4) No magazines left: nothing happens, the gun keeps what it has.
    T.setMagazinesDbg('ak', 4, []);
    T.startReload();
    ok(!T.isReloading() && T.getAmmo().ak === 4 && snap('ak').spare.length === 0 && (T.getReserve()['7.62mm'] | 0) === 0, 'no magazines left: no reload, 4 still in the gun, reserve 0');

    // (5) A double tap drops the magazine (it is not pocketed).
    T.setMagazinesDbg('ak', 10, [30]);
    T.startReload(); await wait(80); T.startReload();
    ok(!!T.getReloadDbg && T.isReloading(), 'double tap: still reloading (the faster drop)');
    await until(() => !T.isReloading(), 9000); await wait(60);
    s = snap('ak');
    ok(s.loaded[0] === 30 && s.spare.length === 0, 'the 10-round magazine went to the ground, not the pouch: loaded ' + s.loaded[0] + ', spares [' + s.spare + ']');

    // (6) A bought magazine comes full; the part-used ones are not topped up.
    T.setMagazinesDbg('ak', 30, [7]);
    ok(T.buyAmmo('ak', true) === true, 'bought an AK magazine');
    ok(sorted(snap('ak').spare) === '30,7', 'it comes as a full one beside the 7: ' + sorted(snap('ak').spare));

    // (7) The revolver: the empties fall, the live rounds go back into a loader.
    ok(await toGun('revolver'), 'the revolver in hand');
    T.setMagazinesDbg('revolver', 4, [6, 6]);
    await reload();
    s = snap('revolver');
    ok(s.loaded[0] === 6 && sorted(s.spare) === '6,4', 'revolver R: a full loader in, the 4 live rounds kept in a loader: ' + s.loaded[0] + ' | ' + sorted(s.spare));
    T.setMagazinesDbg('revolver', 2, [6]);
    T.startReload(); await wait(80); T.startReload();
    await until(() => !T.isReloading(), 9000); await wait(60);
    s = snap('revolver');
    ok(s.loaded[0] === 6 && s.spare.length === 0, 'revolver double tap: the cylinder dumped, nothing pocketed: ' + s.loaded[0] + ' | [' + s.spare + ']');

    // (8) Akimbo: both magazines swap together, each hand gets the fullest left.
    ok(await toGun('uzi'), 'the Uzi in hand');
    T.toggleDualWieldDbg(); await wait(100);
    T.setMagazinesDbg('uzi', 5, [32, 32, 10], 0);
    s = snap('uzi');
    const uziTotal = sum(s.loaded) + sum(s.spare);
    ok(s.loaded.length === 2 && s.loaded.join() === '5,0', 'akimbo Uzis with 5 and 0: ' + s.loaded.join());
    await reload();
    s = snap('uzi');
    ok(s.loaded.join() === '32,32' && sorted(s.spare) === '10,5', 'both swapped: ' + s.loaded.join() + ' | ' + sorted(s.spare) + ' (the empty one thrown away)');
    ok(sum(s.loaded) + sum(s.spare) === uziTotal, 'akimbo: no round made or lost (' + uziTotal + ')');
    T.toggleDualWieldDbg(); await wait(100);

    // (9) The minigun's belt boxes stay off the Watchman's 7.62 belt reserve.
    const R = T.getReserve(); R['7.62 belt'] = 40;
    T.setMagazinesDbg('minigun', 100, [300, 300]);
    ok((T.getReserve()['7.62 belt'] | 0) === 40, 'minigun boxes do not fill the Watchman belt reserve: ' + T.getReserve()['7.62 belt']);

    // (10) The pistol's .45 read-out follows the magazines down as well as up.
    T.setMagazinesDbg('pistol', 12, [12, 12, 12]);
    ok((T.getReserve()['.45'] | 0) === 36, '.45 reads 36 with three full spares');
    T.setMagazinesDbg('pistol', 12, [5]);
    ok((T.getReserve()['.45'] | 0) === 5, 'and 5 with one part-used spare (it used to stay at its highest)');

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
