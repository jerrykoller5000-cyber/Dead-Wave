// tcb249 - CB-249 (J118, Jerry's 10 Nov playtest: "the revolver won't reload after buying ammo"): a revolver that has run
//  dry, or is part-empty, takes a loader bought at the kiosk or the Armory on R. The buy puts a full loader beside the
//  gun, R starts a reload, the cylinder ends full and the loader it used is gone; the gun, the HUD and the calibre's
//  read-out all agree afterwards. Covered: the empty gun with no loader at all, the part-full gun, the buy that is
//  refused when the pouch is full, and the restock of the whole pouch.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const sorted = (a) => a.slice().sort((x, y) => y - x).join(',');
  const snap = () => T.magazinesDbg('revolver');
  const reload = async () => { T.startReload(); const started = T.isReloading(); await until(() => !T.isReloading(), 30000); await wait(80); return started; };
  try {
    await startMatch(T, 'Revolver ammo');
    T.clearZombies(); T.runDevCommand('godmode');
    T.grantAllWeapons(); T.addCash(100000);
    const W = T.WEAPON_ORDER;
    T.setWeapon(W.indexOf('revolver')); await until(() => T.getCurrentWeapon() === 'revolver', 1500); await wait(450);
    ok(T.getCurrentWeapon() === 'revolver', 'the revolver in hand');
    const size = snap().size;

    // (1) Run dry: nothing in the cylinder, no loader in the pouch. R does nothing; the buy; R now reloads.
    T.setMagazinesDbg('revolver', 0, []);
    ok(T.getAmmo().revolver === 0 && snap().spare.length === 0, 'dry: 0 in the cylinder, no loader');
    T.startReload();
    ok(!T.isReloading(), 'R with no loader starts nothing');
    ok(T.buyAmmo('revolver') === true, 'the kiosk sells a loader');
    let s = snap();
    ok(s.spare.length === 1 && s.spare[0] === size, 'one full loader (' + size + ') in the pouch: ' + s.spare.join());
    ok(T.reloadGainsMagazine('revolver') === true, 'a reload would gain rounds');
    ok(await reload(), 'R starts the reload after the buy');
    s = snap();
    ok(s.loaded[0] === size && s.spare.length === 0 && T.getAmmo().revolver === size, 'the cylinder full, the loader used: ' + s.loaded.join() + ' | [' + s.spare + '] | gun ' + T.getAmmo().revolver);
    ok((T.getReserve()['.44'] | 0) === 0, 'the .44 read-out follows the pouch down to 0: ' + T.getReserve()['.44']);

    // (2) Part-full: 2 of 6 in the cylinder, no loader; buy; R keeps the 2 live rounds in a loader and loads the full one.
    T.setMagazinesDbg('revolver', 2, []);
    T.buyAmmo('revolver');
    ok(await reload(), 'R starts the reload with 2 in the cylinder after a buy');
    s = snap();
    ok(s.loaded[0] === size, 'the cylinder full after it: ' + s.loaded.join());
    ok(s.spare.length === 1 && s.spare[0] === 2, 'the 2 live rounds kept in a loader: [' + s.spare + ']');

    // (3) The pouch full refuses a buy and spends nothing.
    T.setMagazinesDbg('revolver', size, [size, size, size, size, size, size, size, size]);
    const cap = snap().maxSpare;
    T.setMagazinesDbg('revolver', size, new Array(cap).fill(size));
    const cash0 = T.getCash ? T.getCash() : null;
    ok(T.buyAmmo('revolver') === false, 'a full pouch refuses another loader');
    if (cash0 != null) ok(T.getCash() === cash0, 'and the refusal costs nothing');

    // (4) Run dry again and restock the whole pouch (the Armory's button buys every missing loader); R reloads.
    T.setMagazinesDbg('revolver', 0, []);
    let bought = 0; while (bought < 40 && T.buyAmmo('revolver')) bought++;
    s = snap();
    ok(bought === cap && s.spare.length === cap, 'the restock fills the pouch to its ' + cap + ' loaders: bought ' + bought);
    ok(await reload(), 'R starts the reload after the restock');
    s = snap();
    ok(s.loaded[0] === size && s.spare.length === cap - 1, 'one loader used: ' + s.loaded.join() + ' | ' + s.spare.length + ' left');

    // (5) The Armory's own workbench button (the real DOM, as Jerry clicks it), the revolver on the shelf and then in a slot.
    const q = (sel) => document.querySelector('#armoryPanel ' + sel);
    const click = async (sel) => { const el = q(sel); if (!el || el.disabled) return false; el.click(); await wait(120); return true; };
    T.setMagazinesDbg('revolver', 0, []);
    T.openMenuDbg('armory'); await wait(200);
    ok(await click('[data-bench="revolver"]'), 'the stored revolver opens on the workbench');
    ok(!!q('[data-buy-ammo="revolver"]') && !q('[data-buy-ammo="revolver"]').disabled, 'the workbench offers "Buy ammo" for a dry revolver');
    ok(await click('[data-buy-ammo="revolver"]'), 'Buy ammo clicked on the workbench');
    s = snap();
    ok(s.spare.length === cap && s.spare.every((r) => r === size), 'the workbench restock put ' + cap + ' full loaders in the pouch: [' + s.spare + ']');
    // Take the gun out of storage into a slot, close the Armory, draw it: the purchase must still be there.
    ok(T.takeOutGun('revolver') === true, 'the revolver taken out of storage into a slot');
    s = snap();
    ok(s.spare.length === cap, 'taking the gun out kept the bought loaders: ' + s.spare.length + ' of ' + cap);
    T.closeMenuDbg('armory'); await wait(150);
    T.setWeapon(W.indexOf('revolver')); await until(() => T.getCurrentWeapon() === 'revolver', 1500); await wait(450);
    ok(T.getCurrentWeapon() === 'revolver', 'the revolver drawn from its slot');
    ok(T.getAmmo().revolver === 0, 'the cylinder is still dry: ' + T.getAmmo().revolver);
    ok(await reload(), 'R starts the reload after the workbench purchase');
    s = snap();
    ok(s.loaded[0] === size && s.spare.length === cap - 1, 'cylinder full, one loader used: ' + s.loaded.join() + ' | ' + s.spare.length + ' left');

    // (6) Buy at the workbench with the gun carried; hand another gun in and out of the slots; the loaders stay and R works.
    T.setMagazinesDbg('revolver', 0, []);
    T.openMenuDbg('armory'); await wait(200);
    const slotSel = '[data-slot^="secondary"]';
    const carried = [...document.querySelectorAll('#armoryPanel ' + slotSel)];
    ok(carried.length >= 1, 'the secondary slots are on the panel');
    const mine = carried.find((el) => /revolver/i.test(el.textContent));
    if (mine) { mine.click(); await wait(150); }
    const buyBtn = q('[data-buy-ammo="revolver"]');
    ok(!!buyBtn && !buyBtn.disabled, 'the carried revolver\'s workbench offers "Buy ammo"');
    if (buyBtn && !buyBtn.disabled) { buyBtn.click(); await wait(150); }
    ok(snap().spare.length === cap, 'carried: the workbench restock filled the pouch: ' + snap().spare.length);
    T.takeOutGun('uzi'); await wait(100);
    ok(snap().spare.length === cap, 'taking another gun out leaves the revolver\'s loaders alone: ' + snap().spare.length);
    T.closeMenuDbg('armory'); await wait(150);
    T.setWeapon(W.indexOf('revolver')); await until(() => T.getCurrentWeapon() === 'revolver', 1500); await wait(450);
    ok(await reload(), 'R starts the reload after the carried workbench purchase');
    ok(snap().loaded[0] === size, 'cylinder full: ' + snap().loaded.join());

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
