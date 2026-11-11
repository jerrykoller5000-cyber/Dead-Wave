// tcb294 - CB-294 (J133, Jerry 10 Nov: the ammo system; J134, D-150, standing: no ammo types on full-auto guns).
// - J134: no gun with types can fire full-auto; X on the M4 is still its selector, on the pump shotgun it changes the ammo.
// - The state the Armory and the HUD read (GP-20083): the shotgun's three types, birdshot issued and loaded, the counts, caps,
//   prices rising birdshot < buckshot < slug; null for the M4, the AA-12 and the pistol.
// - Buying a pack of a type at the Armory: its count up by the pack, the bank down by its price; birdshot is the 12ga reserve;
//   near the cap a part pack at its part of the price; at the cap no sale.
// - The sheet the gun fires with is the loaded type's (slug: one round of 100; buckshot: eight of 10).
// - X: every round in the gun comes out first, one at a time, back into its own count (he keeps them), then the new type goes
//   in up to the tube; the type flips at the first round in; it takes a real time (eight out, eight in: about 6.5 s).
// - A shot during the change stops it where it is; R during it stops it and reloads the type in the gun.
// - A reload takes from the loaded type's count only. The pump throws the hull of the type that was fired.
// - The view's state carries the change as it runs (st.ammoSwitch) and the type in the gun (st.ammoType).
// - A new run: birdshot loaded, no buckshot or slugs.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const sim = () => T.getSimTime();
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const pressX = async () => { key('KeyX', true); await wait(40); key('KeyX', false); await wait(40); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const A = T.ammoDbg;
    if (!A || !T.ammoTypeState || !T.buyAmmoType) { ok(false, 'the CB-294 hooks are there'); return out.join('\n'); }
    await startMatch(T, 'CB294');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons(); T.addCash(5000);
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(200); return T.getCurrentWeapon() === w; };

    // J134
    ok(A.j134().length === 0, 'J134: no gun with types can fire full-auto (' + (A.j134().join(', ') || 'none') + ')');
    for (const g of ['m4', 'ak', 'aa12', 'pistol', 'uzi', 'minigun']) ok(T.ammoTypeState(g) === null, g + ' has no ammo types');
    ok(await take('m4'), 'the M4 in hand');
    const hud = () => ((document.getElementById('ammoDetail') || {}).textContent || '').trim();
    const m0 = /AUTO/.test(hud()); await pressX(); const m1 = /SEMI/.test(hud()); await pressX();
    ok(m0 && m1 && /AUTO/.test(hud()) && A.count() === 0, 'X on the M4 is its selector (AUTO, SEMI, AUTO) and changes no ammo');

    // the state
    ok(await take('shotgun'), 'the pump shotgun in hand');
    let S = T.ammoTypeState('shotgun');
    ok(S && S.order.join() === 'birdshot,buckshot,slug' && S.loaded === 'birdshot', 'its types in order, birdshot loaded (' + (S && S.order.join()) + ', ' + (S && S.loaded) + ')');
    ok(S.types.birdshot.price < S.types.buckshot.price && S.types.buckshot.price < S.types.slug.price, 'prices rise: ' + S.order.map((k) => k + ' $' + S.types[k].price).join(', '));
    ok(S.order.every((k) => S.types[k].cap > 0 && typeof S.types[k].canBuy === 'boolean' && S.types[k].room >= 0), 'each type has a cap, room and canBuy for the Armory');
    ok(S.switching === null && typeof S.canSwitch === 'boolean', 'no change running');
    const st0 = A.loaded(), base = T.shotLoadDbg.base;
    ok(T.WEAPON_STATS.shotgun.pellets === base.pellets && T.WEAPON_STATS.shotgun.damage === base.damage, 'birdshot fires the gun\'s own sheet (' + T.WEAPON_STATS.shotgun.pellets + ' x ' + T.WEAPON_STATS.shotgun.damage + ')');

    // buying
    A.carry('shotgun', 'buckshot', -999); A.carry('shotgun', 'slug', -999);
    const bank0 = T.getBank(), slug0 = A.carried().slug, bird0 = A.carried().birdshot;
    const r = T.buyAmmoType('shotgun', 'slug');
    ok(r && r.bought === S.types.slug.pack && A.carried().slug === slug0 + r.bought && T.getBank() === bank0 - S.types.slug.price, 'a pack of slugs: +' + (r && r.bought) + ', $' + (bank0 - T.getBank()));
    T.buyAmmoType('shotgun', 'buckshot');
    ok(A.carried().buckshot === S.types.buckshot.pack, 'a pack of buckshot: ' + A.carried().buckshot);
    A.carry('shotgun', 'birdshot', -A.carried().birdshot);
    T.buyAmmoType('shotgun', 'birdshot');
    ok(A.carried().birdshot === S.types.birdshot.pack && T.getReserve()['12ga'] === A.carried().birdshot, 'birdshot is the 12ga reserve as always (' + T.getReserve()['12ga'] + ')');
    A.carry('shotgun', 'birdshot', 30);
    {   // near the cap: a part pack at its part of the price
      const cap = T.ammoTypeState('shotgun').types.slug.cap, sl = A.carried().slug;
      A.carry('shotgun', 'slug', cap - 5 - sl);
      const st = T.ammoTypeState('shotgun').types.slug, b0 = T.getBank(), r2 = T.buyAmmoType('shotgun', 'slug');
      ok(st.buyN === 5 && r2 && r2.bought === 5 && T.getBank() === b0 - st.buyPrice && st.buyPrice === Math.ceil(st.price * 5 / st.pack), 'five short of the cap: five slugs for $' + (b0 - T.getBank()) + ' (the snapshot said ' + st.buyN + ' for $' + st.buyPrice + ')');
      ok(T.buyAmmoType('shotgun', 'slug') === false && T.ammoTypeState('shotgun').types.slug.canBuy === false, 'at the cap: no sale, canBuy false');
      A.carry('shotgun', 'slug', -(A.carried().slug - 20));
    }

    // X: unload, then load
    T.setAmmoDbg('shotgun', 8);
    const c0 = A.carried();
    await pressX();
    S = T.ammoTypeState('shotgun');
    ok(S.switching && S.switching.from === 'birdshot' && S.switching.to === 'buckshot' && S.switching.phase === 'unload', 'X: the change starts, birdshot out first, buckshot next (' + JSON.stringify(S.switching && { f: S.switching.from, t: S.switching.to, p: S.switching.phase }) + ')');
    ok(/UNLOADING/i.test(hud()), 'the HUD says so: "' + hud() + '"');
    T.setViewFirstDbg && T.setViewFirstDbg(true);
    await wait(300);
    const vs = T.vmStateDbg && T.vmStateDbg();
    ok(vs && vs.ammoSwitch && vs.ammoSwitch.from === 'birdshot' && vs.ammoType === 'birdshot', 'the view\'s state carries the change and the type in the gun (CE-3)');
    const t0 = sim();
    let loadedBeforeEmpty = false, flippedEarly = false, emptyAt = null, firstInAt = null;
    await until(() => {
      const st = A.state(), inGun = T.getAmmo().shotgun;
      if (st && st.phase === 'unload' && A.carried().buckshot < c0.buckshot) loadedBeforeEmpty = true;
      if (inGun > 0 && A.loaded().shotgun === 'buckshot' && emptyAt == null) flippedEarly = true;
      if (inGun === 0 && emptyAt == null) emptyAt = sim() - t0;
      if (A.loaded().shotgun === 'buckshot' && firstInAt == null && inGun > 0) firstInAt = sim() - t0;
      return !st;
    }, 60000);
    const dur = sim() - t0;
    ok(!loadedBeforeEmpty && !flippedEarly, 'nothing new goes in before every old round is out');
    ok(emptyAt != null && Math.abs(emptyAt - 8 * 0.36) < 0.5, 'eight out in ' + (emptyAt != null ? emptyAt.toFixed(2) : '-') + ' s (0.36 s a shell)');
    ok(A.carried().birdshot === c0.birdshot + 8, 'he keeps the eight birdshot (' + c0.birdshot + ' to ' + A.carried().birdshot + ')');
    ok(T.getAmmo().shotgun === 8 && A.carried().buckshot === c0.buckshot - 8 && A.loaded().shotgun === 'buckshot', 'eight buckshot in, from his buckshot (' + c0.buckshot + ' to ' + A.carried().buckshot + ')');
    ok(dur > 5.5 && dur < 8, 'a real time: ' + dur.toFixed(2) + ' s');
    ok(T.WEAPON_STATS.shotgun.pellets === 8 && T.WEAPON_STATS.shotgun.damage === 10, 'the gun now fires buckshot: ' + T.WEAPON_STATS.shotgun.pellets + ' x ' + T.WEAPON_STATS.shotgun.damage);
    ok(/BUCK/i.test(hud()), 'the HUD names it: "' + hud() + '"');   // ui/strings.js ammo.type.<id>.tag
    T.setViewFirstDbg && T.setViewFirstDbg(false);

    // a shot stops a change; the hull is the type fired
    await pressX();   // to slug
    await until(() => A.state() && A.state().unloaded >= 2, 8000);
    const mid = { inGun: T.getAmmo().shotgun, bird: A.carried().buckshot };
    T.setMouseFireDbg(true); await until(() => !A.state(), 3000); T.setMouseFireDbg(false);
    ok(!A.state() && A.loaded().shotgun === 'buckshot', 'a shot stops the change; the tube still holds buckshot');
    await until(() => A.hulls().length > 0, 4000);
    const hulls = A.hulls();
    ok(hulls.length > 0 && hulls[hulls.length - 1] === 'buckshot', 'the pump throws a buckshot hull (' + hulls.slice(-3).join(', ') + ')');
    info('stopped after ' + (8 - mid.inGun) + ' out; then fired');

    // a reload takes the loaded type only
    await until(() => !(T.isReloading && T.isReloading()), 3000);
    const b1 = A.carried(), inGun1 = T.getAmmo().shotgun;
    T.startReload();
    await until(() => !(T.isReloading && T.isReloading()), 15000);
    const b2 = A.carried(), added = T.getAmmo().shotgun - inGun1;
    ok(added > 0 && b2.buckshot === b1.buckshot - added && b2.birdshot === b1.birdshot && b2.slug === b1.slug, 'R tops up from his buckshot only (+' + added + '; birdshot ' + b1.birdshot + '/' + b2.birdshot + ', slug ' + b1.slug + '/' + b2.slug + ')');

    // R during a change: it stops and reloads the type in the gun
    T.setAmmoDbg('shotgun', 6);
    await pressX();
    await until(() => A.state() && A.state().unloaded >= 1, 8000);
    T.startReload();
    ok(!A.state() && A.loaded().shotgun === 'buckshot', 'R stops the change (the tube keeps buckshot)');
    await until(() => !(T.isReloading && T.isReloading()), 15000);

    // to slug, all the way: one round of 100
    await pressX();
    await until(() => !A.state(), 60000);
    ok(A.loaded().shotgun === 'slug' && T.WEAPON_STATS.shotgun.pellets === 1 && T.WEAPON_STATS.shotgun.damage === 100, 'slugs in: one round of ' + T.WEAPON_STATS.shotgun.damage);
    // nothing else to change to
    A.carry('shotgun', 'birdshot', -9999); A.carry('shotgun', 'buckshot', -9999);
    const n0 = A.count(); await pressX();
    ok(A.count() === n0 && !A.state(), 'with no other type carried X starts nothing');
    // a new run
    T.resetGame();
    await wait(300);
    ok(A.loaded().shotgun === 'birdshot' && A.carried().buckshot === 0 && A.carried().slug === 0, 'a new run: birdshot loaded, no buckshot or slugs');
    ok(T.WEAPON_STATS.shotgun.pellets === base.pellets && T.WEAPON_STATS.shotgun.damage === base.damage, 'and the gun\'s own sheet');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { try { T.setMouseFireDbg(false); } catch (_) {} }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
