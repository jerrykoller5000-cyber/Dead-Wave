// tcb249 - CB-249 (J118, Jerry's 10 Nov playtest: "the revolver won't reload after buying ammo"): a revolver that has run
//  dry, or is part-empty, takes the rounds bought at the kiosk or the Armory on R. Since GP-20136 (J153 27) the revolver
//  carries loose .44 rounds, not loaders (reserveKind 'rounds', spareRounds): the buy puts rounds in his reserve, R starts
//  a reload, the cylinder fills from the reserve and the rounds it took are gone from it; the gun, the HUD and the
//  calibre's read-out all agree afterwards, and no round is made or lost on the way. Covered: the empty gun with no
//  reserve at all, the part-full gun, the buy that is refused when the reserve is full, the restock of the whole reserve,
//  and the Armory's workbench button with the gun stored, then carried. (CB-335: re-expressed from loaders to rounds,
//  every case kept, nothing loosened.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const snap = () => T.magazinesDbg('revolver');
  const spare = () => snap().spareRounds | 0;
  const readout = () => T.getReserve()['.44'] | 0;
  const reload = async () => { T.startReload(); const started = T.isReloading(); await until(() => !T.isReloading(), 30000); await wait(80); return started; };
  try {
    await startMatch(T, 'Revolver ammo');
    T.clearZombies(); T.runDevCommand('godmode');
    T.grantAllWeapons(); T.addCash(100000);
    const W = T.WEAPON_ORDER;
    T.setWeapon(W.indexOf('revolver')); await until(() => T.getCurrentWeapon() === 'revolver', 1500); await wait(450);
    ok(T.getCurrentWeapon() === 'revolver', 'the revolver in hand');
    ok(snap().reserveKind === 'rounds', 'the revolver carries loose rounds (GP-20136): ' + snap().reserveKind);
    const size = snap().size, cap = size * snap().maxSpare;
    ok(size > 0 && cap > size, 'a cylinder of ' + size + ', a reserve of up to ' + cap + ' rounds');

    // (1) Run dry: nothing in the cylinder, nothing in reserve. R does nothing; the buy; R now reloads.
    T.setMagazinesDbg('revolver', 0, []);
    ok(T.getAmmo().revolver === 0 && spare() === 0, 'dry: 0 in the cylinder, 0 in reserve');
    T.startReload();
    ok(!T.isReloading(), 'R with no rounds in reserve starts nothing');
    ok(T.buyAmmo('revolver') === true, 'the kiosk sells .44 rounds');
    const pack = spare();
    ok(pack >= size, 'the buy put at least a cylinder\'s worth in reserve: ' + pack);
    ok(T.reloadGainsMagazine('revolver') === true, 'a reload would gain rounds');
    ok(await reload(), 'R starts the reload after the buy');
    let s = snap();
    ok(s.loaded[0] === size && spare() === pack - size && T.getAmmo().revolver === size, 'the cylinder full, its rounds taken from the reserve: ' + s.loaded.join() + ' | ' + spare() + ' left of ' + pack + ' | gun ' + T.getAmmo().revolver);
    ok(readout() === spare(), 'the .44 read-out follows the reserve: ' + readout() + ' vs ' + spare());

    // (2) Part-full: 2 in the cylinder, nothing in reserve; buy; R fills the cylinder and no round is made or lost.
    T.setMagazinesDbg('revolver', 2, []);
    T.buyAmmo('revolver');
    const before2 = 2 + spare();
    ok(await reload(), 'R starts the reload with 2 in the cylinder after a buy');
    s = snap();
    ok(s.loaded[0] === size, 'the cylinder full after it: ' + s.loaded.join());
    ok(s.loaded[0] + spare() === before2, 'every round kept (the 2 live ones stay in the gun): ' + (s.loaded[0] + spare()) + ' of ' + before2);

    // (3) A full reserve refuses a buy and spends nothing.
    T.setMagazinesDbg('revolver', size, new Array(snap().maxSpare).fill(size));
    ok(spare() === cap, 'the reserve full: ' + spare() + ' of ' + cap);
    const cash0 = T.getCash ? T.getCash() : null;
    ok(T.buyAmmo('revolver') === false, 'a full reserve refuses another buy');
    if (cash0 != null) ok(T.getCash() === cash0, 'and the refusal costs nothing');

    // (4) Run dry again and restock the whole reserve (the Armory's button buys every missing round); R reloads.
    T.setMagazinesDbg('revolver', 0, []);
    let bought = 0; while (bought < 40 && T.buyAmmo('revolver')) bought++;
    ok(spare() === cap && bought === Math.ceil(cap / pack), 'the restock fills the reserve to its ' + cap + ' rounds: ' + spare() + ' in ' + bought + ' buys');
    ok(await reload(), 'R starts the reload after the restock');
    s = snap();
    ok(s.loaded[0] === size && spare() === cap - size, 'one cylinder taken: ' + s.loaded.join() + ' | ' + spare() + ' left');

    // (5) The Armory's own workbench button (the real DOM, as Jerry clicks it), the revolver on the shelf and then in a slot.
    const q = (sel) => document.querySelector('#armoryPanel ' + sel);
    const click = async (sel) => { const el = q(sel); if (!el || el.disabled) return false; el.click(); await wait(120); return true; };
    T.setMagazinesDbg('revolver', 0, []);
    T.openMenuDbg('armory'); await wait(200);
    ok(await click('[data-bench="revolver"]'), 'the stored revolver opens on the workbench');
    ok(!!q('[data-buy-ammo="revolver"]') && !q('[data-buy-ammo="revolver"]').disabled, 'the workbench offers "Buy ammo" for a dry revolver');
    ok(await click('[data-buy-ammo="revolver"]'), 'Buy ammo clicked on the workbench');
    ok(spare() === cap, 'the workbench restock filled the reserve: ' + spare() + ' of ' + cap);
    // Take the gun out of storage into a slot, close the Armory, draw it: the purchase must still be there.
    ok(T.takeOutGun('revolver') === true, 'the revolver taken out of storage into a slot');
    ok(spare() === cap, 'taking the gun out kept the bought rounds: ' + spare() + ' of ' + cap);
    T.closeMenuDbg('armory'); await wait(150);
    T.setWeapon(W.indexOf('revolver')); await until(() => T.getCurrentWeapon() === 'revolver', 1500); await wait(450);
    ok(T.getCurrentWeapon() === 'revolver', 'the revolver drawn from its slot');
    ok(T.getAmmo().revolver === 0, 'the cylinder is still dry: ' + T.getAmmo().revolver);
    ok(await reload(), 'R starts the reload after the workbench purchase');
    s = snap();
    ok(s.loaded[0] === size && spare() === cap - size, 'cylinder full, one cylinder taken: ' + s.loaded.join() + ' | ' + spare() + ' left');

    // (6) Buy at the workbench with the gun carried; hand another gun in and out of the slots; the rounds stay and R works.
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
    ok(spare() === cap, 'carried: the workbench restock filled the reserve: ' + spare());
    T.takeOutGun('uzi'); await wait(100);
    ok(spare() === cap, 'taking another gun out leaves the revolver\'s rounds alone: ' + spare());
    T.closeMenuDbg('armory'); await wait(150);
    T.setWeapon(W.indexOf('revolver')); await until(() => T.getCurrentWeapon() === 'revolver', 1500); await wait(450);
    ok(await reload(), 'R starts the reload after the carried workbench purchase');
    ok(snap().loaded[0] === size, 'cylinder full: ' + snap().loaded.join());
    ok(readout() === spare(), 'the .44 read-out agrees with the reserve: ' + readout() + ' vs ' + spare());

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
