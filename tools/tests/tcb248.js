// tcb248 - CB-248 (J114) then CB-294 (J133, Jerry 10 Nov; --review): the pump shotgun's shells. CB-248's two 3.5-inch loads, bought
//  once and fitted at the workbench, gave way to ammo types: birdshot (issued), buckshot and slug, bought by the pack and changed
//  with X (the change itself is tcb294's). Checked here: no workbench lists a fitted load; packs of slugs and buckshot are bought
//  and counted; with each type in the tube the gun fires that type's sheet; the Breacher has none. Then fired for real from a
//  standing player at a shambler on a level field with the random numbers pinned to the cone's middle (so every pellet flies true):
//  birdshot lands 18 pellets (CB-327, J151 note 13: more than buck; was 7), buckshot 8, the slug 1; on a body slug > buckshot > birdshot (x1.59, x1.27, x1.00 of Jerry's hit
//  sheet's shell); at the cone's edge the slug (a tight cone) still hits; and the reach is the sheet's: birdshot stops short of
//  25 m, buckshot reaches it, the slug reaches 40 m. A new run: birdshot, nothing else carried.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  // Game time: the page draws few frames a second in the suite, so flight is waited out in sim seconds.
  const gWait = async (s, cond) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < s * 60000) { if (cond && cond()) return true; await wait(25); } return cond ? !!cond() : true; };
  const f2 = (v) => (+v).toFixed(2);
  const D = T.shotLoadDbg;
  const rndReal = Math.random;
  try {
    if (!D) { ok(false, 'the hook T.shotLoadDbg is there'); return out.join('\n'); }
    await startMatch(T, 'Shotgun types');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    T.addCash(5000);
    T.grantAllWeapons();

    // ---- the types (CB-294, J133: these replaced CB-248's fitted 3.5-inch loads; --review) ------------------------------------
    const B = D.base;
    ok(B.pellets === 18 && B.damage === 3.5 && B.pellets * B.damage === 63 && B.range === 22 && Math.abs(B.spread - 0.16) < 1e-9, 'birdshot, the issued shell: ' + B.pellets + ' pellets of ' + B.damage + ', spread ' + B.spread + ', ' + B.range + ' m');
    ok(D.fitted() === 'birdshot' && JSON.stringify(D.stats()) === JSON.stringify(B), 'it is what the pump fires with to begin with');
    ok(D.mods('shotgun').length === 0 && T.armoryDbg.mods('aa12').every((m) => !m.id.startsWith('load:')) && T.armoryDbg.mods('m4').every((m) => !m.id.startsWith('load:')), 'no workbench lists a fitted load any more');
    const bank0 = T.getBank();
    const st = T.ammoTypeState('shotgun');
    ok(D.buy('slug') && D.owned().slug === st.types.slug.pack && T.getBank() === bank0 - st.types.slug.price, 'a pack of slugs bought: ' + D.owned().slug + ' for $' + (bank0 - T.getBank()));
    ok(D.buy('buckshot') && D.owned().buckshot === st.types.buckshot.pack, 'and a pack of buckshot: ' + D.owned().buckshot);
    ok(T.ammoTypeState('aa12') === null, 'the Breacher has no types');
    D.fit('slug');
    let s = D.stats();
    ok(s.pellets === 1 && s.damage === 100 && s.range === 44 && s.spread < 0.03, 'slugs in the tube: ' + s.pellets + ' x ' + s.damage + ', spread ' + f2(s.spread) + ', ' + s.range + ' m');
    ok(s.name === B.name && s.maxAmmo === B.maxAmmo && s.reload === B.reload && s.speed === B.speed && s.interval === B.interval, 'its name, tube, reload, pump and muzzle speed are the gun\'s own');
    D.fit('buckshot');
    s = D.stats();
    ok(s.pellets === 8 && s.damage === 10 && s.range === 26 && s.spread < B.spread, 'buckshot: ' + s.pellets + ' pellets of ' + s.damage + ', spread ' + f2(s.spread) + ', ' + s.range + ' m');
    D.clear();
    ok(D.fitted() === 'birdshot' && JSON.stringify(D.stats()) === JSON.stringify(B), 'birdshot again: the gun\'s own sheet');

    // ---- fired for real ------------------------------------------------------------------------------------------------------
    // A standing player on a level field, the shotgun in hand, the dice (Math.random) pinned while one pull is in the air.
    // Every pellet of a pull shares the dice, so they fly together: with the dice at 0 they fly down the aim itself; at 0.99
    // they leave it by the cone's edge. The pellets are read in the air (the page's own list), and their hits on a shambler
    // whose health is its sheet's real 24 (the hit sheet scores a gun's damage as a part of the body's health).
    T.setViewFirstDbg(false);
    const px = 10, pz = 10, gy = T.sampleHeight(px, pz);
    T.levelGroundRect(px - 8, pz - 4, px + 8, pz + 60, gy, 6);
    const hold = () => { T.player.position.set(px, gy, pz); T.setHp && T.setHp(1e6); };
    await wait(800);   // the Armory shutting puts a gun that left the shelf back to the hip pistol, a beat later
    for (let k = 0; k < 6 && T.getCurrentWeapon() !== 'shotgun'; k++) { T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(500); }
    await wait(900);
    ok(T.getCurrentWeapon() === 'shotgun', 'the shotgun in hand (' + T.getCurrentWeapon() + ')');
    if (T.getCurrentWeapon() !== 'shotgun') return out.join('\n');
    D.fit('slug'); await wait(100);
    ok(/SLUG/i.test(D.hud()), 'the ammo line says which shell is in the tube: "' + D.hud() + '"');   // ui/strings.js ammo.type.<id>.tag
    D.clear(); await wait(100);
    ok(/BIRD/i.test(D.hud()) && !/SLUG/i.test(D.hud()), 'and birdshot when that is in: "' + D.hud() + '"');
    const aimAt = (d) => [px, gy + 0.8, pz + d];   // waist high, `d` m out
    const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    // One pull. `dist` m out there is a shambler (or none, 0); returns the pellets in the air as the shot left, and what landed.
    const pull = async (dist, dice, label) => {
      T.clearZombies(); await wait(30); hold(); T.setAmmoDbg('shotgun', 8);
      let z = null;
      if (dist > 0) {
        const zx = px, zz = pz + dist;
        z = T.spawnZombie(zx, zz, 'shambler', true, true);
        z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = 5000; z.maxHp = T.ZOMBIE_TYPES.shambler.hp; z.mesh.position.set(zx, gy, zz);
      }
      const AIM = aimAt(dist > 0 ? dist : 6);   // a pull at a body aims at its waist; one at nothing aims where the 6 m body's waist was
      const aim = () => { T.setAimTargetDbg(AIM[0], AIM[2]); T.aimPointDbg(AIM[0], AIM[1], AIM[2]); };   // the target locked, then its height
      T.setAimYawDbg(0); aim();
      await wait(250); hold(); aim();
      const a0 = T.getAmmo().shotgun;
      const seen = new Set(D.flight().map((q) => q.shot));
      let air = [];
      Math.random = () => dice;
      T.setMouseFireDbg(true);
      const fired = await until(() => { hold(); aim(); const f = D.flight().filter((q) => !seen.has(q.shot)); if (f.length) air = f; return T.getAmmo().shotgun < a0 && air.length > 0; }, 6000);
      T.setMouseFireDbg(false);
      if (dist > 0) await gWait(Math.min(2, dist / 60 + 0.6), () => { hold(); return false; });
      else await gWait(0.7, () => { hold(); return false; });
      Math.random = rndReal;
      const last = (z && z._shotLast) || { n: 0 };
      const r = { fired, air, n: last.n | 0, took: z ? 5000 - z.hp : 0, label, alive: z ? z.alive : true };
      out.push('INFO pull ' + label + ' at ' + dist + ' m, dice ' + dice + ': ' + air.length + ' in the air' + (air[0] ? ' (' + air[0].base + ' base, ' + air[0].dmg.toFixed(1) + ' scored, reach ' + air[0].reach.toFixed(1) + ' m)' : '') + ', ' + r.n + ' landed, ' + r.took.toFixed(1) + ' off' + (r.alive ? '' : ' (it died)'));
      T.clearZombies();
      return r;
    };

    // what each shell is, in the air: the dice at the middle, nothing in the way (the aim 6 m out)
    D.clear();   const std = await pull(0, 0, 'issued');
    D.fit('buckshot'); const buck = await pull(0, 0, 'buckshot');
    D.fit('slug'); const slug = await pull(0, 0, 'slug');
    ok(std.fired && std.air.length === 18, 'the issued shell: eighteen pellets of birdshot leave (' + std.air.length + ')');
    ok(std.air.length > buck.air.length, 'J151 note 13: birdshot puts more pellets in the air than buckshot (' + std.air.length + ' vs ' + buck.air.length + ')');
    ok(buck.fired && buck.air.length === 8, 'buckshot: eight leave (' + buck.air.length + ')');
    ok(slug.fired && slug.air.length === 1, 'the slug: one leaves (' + slug.air.length + ')');
    ok(std.air[0] && std.air[0].base === 3.5 && std.air[0].dmg === 3.5 && buck.air[0] && buck.air[0].dmg === 10 && slug.air[0] && slug.air[0].dmg === 100, 'each carries its sheet\'s damage: 3.5, 10, 100 (' + [std, buck, slug].map((x) => x.air[0] && x.air[0].dmg).join(', ') + ')');   // CB-327: birdshot 18 x 3.5 (was 9)

    // ... and on a body: those very pellets, with the tags the game put on them, through the game's own damage rules. Jerry's hit
    // sheet scores a whole shell as 270% of a shambler (24): the issued shell must take that, buckshot a shell of 80 over 63 of it
    // more, the slug 100 over 63, however the shell is cut up (CB-294: slug > buckshot > birdshot).
    const whole = T.ZOMBIE_TYPES.shambler.hp * 2.7;
    const score = (air) => {
      T.clearZombies();
      const z = T.spawnZombie(px, pz + 6, 'shambler', true, true);
      z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = 5000; z.maxHp = T.ZOMBIE_TYPES.shambler.hp; z.mesh.position.set(px, gy, pz + 6);
      const info = T.roundInfoDbg(z, gy + 0.5);
      const dice = Math.random; Math.random = () => 0.99;   // as t90: no dice in the damage rules (a limb or a head coming off kills the 5000 as well)
      try { for (const q of air) T.damageZombie(z, q.dmg, { kind: 'pellet', hitWeapon: 'shotgun', hitBase: q.base, pelletOf: q.of > 1 ? q.of : undefined, shotId: 424242 + air.length, ...info }); }
      finally { Math.random = dice; }
      T.flushShotHits && T.flushShotHits();
      const took = 5000 - z.hp, up = z.alive; T.clearZombies();
      if (!up) out.push('INFO the body died under ' + air.length + ' pellets after ' + took.toFixed(1));
      return up ? took : -1;
    };
    const tStd = score(std.air), tBuck = score(buck.air), tSlug = score(slug.air);
    out.push('INFO the sheet: shell ' + tStd.toFixed(1) + ', buckshot ' + tBuck.toFixed(1) + ', slug ' + tSlug.toFixed(1) + ' of ' + whole.toFixed(1));
    ok(Math.abs(tStd - whole) < whole * 0.01, 'the issued shell takes the sheet\'s 270%: ' + tStd.toFixed(1) + ' of a shambler\'s 24 (' + whole.toFixed(1) + ')');
    ok(Math.abs(tBuck - whole * 80 / 63) < whole * 0.02, 'buckshot takes ' + tBuck.toFixed(1) + ', x1.27 of it (' + (whole * 80 / 63).toFixed(1) + ')');
    ok(Math.abs(tSlug - whole * 100 / 63) < whole * 0.02, 'the slug takes ' + tSlug.toFixed(1) + ', x1.59 of it (' + (whole * 100 / 63).toFixed(1) + ')');
    ok(tSlug > tBuck && tBuck > tStd, 'slug > buckshot > birdshot on a body');

    // the cone: the dice at the cone's edge; the angle off the middle of the aim is each shell's spread
    D.clear();   const eStd = await pull(0, 0.99, 'issued edge');
    D.fit('buckshot'); const eBuck = await pull(0, 0.99, 'buckshot edge');
    D.fit('slug'); const eSlug = await pull(0, 0.99, 'slug edge');
    const mid = std.air[0] && std.air[0].dir;
    const aS = mid && eStd.air[0] ? ang(mid, eStd.air[0].dir) : 0, aB = mid && eBuck.air[0] ? ang(mid, eBuck.air[0].dir) : 0, aG = mid && eSlug.air[0] ? ang(mid, eSlug.air[0].dir) : 0;
    ok(aS > B.spread * 0.57 && aS < B.spread * 1.01, 'the issued shell leaves the aim by ' + aS.toFixed(3) + ' rad at the edge (spread ' + B.spread + ')');   // CB-327: the sheet's spread (0.14 then, 0.16 now)
    ok(aS > 0 && Math.abs(aB / aS - 0.12 / B.spread) < 0.1, 'buckshot ' + aB.toFixed(3) + ' rad, tighter than birdshot by the sheets (' + (aB / aS).toFixed(2) + ' of it, ' + (0.12 / B.spread).toFixed(2) + ')');
    ok(aS > 0 && aG / aS > 0.08 && aG / aS < 0.25, 'the slug ' + aG.toFixed(3) + ' rad, a few times tighter than the shell\'s cone (' + (aG / aS).toFixed(2) + ' of it)');

    // the reach: what is in the air flies the sheet's range, and a real body feels it
    ok(std.air[0] && Math.abs(std.air[0].reach - 22) < 0.5 && buck.air[0] && Math.abs(buck.air[0].reach - 26) < 0.5 && slug.air[0] && Math.abs(slug.air[0].reach - 44) < 0.5,
      'in the air: the shell flies ' + (std.air[0] ? std.air[0].reach.toFixed(1) : '-') + ' m, buckshot ' + (buck.air[0] ? buck.air[0].reach.toFixed(1) : '-') + ', the slug ' + (slug.air[0] ? slug.air[0].reach.toFixed(1) : '-'));
    D.clear();   const near0 = await pull(16, 0, 'issued');
    const far0 = await pull(24, 0, 'issued');
    D.fit('buckshot'); const far1 = await pull(24, 0, 'buckshot');
    D.fit('slug'); const far2 = await pull(38, 0, 'slug');
    ok(near0.n > 0, 'a body 16 m out feels the shell (' + near0.n + ' of ' + B.pellets + ' land): the aim is true');
    ok(far0.n === 0, 'a body 24 m out is beyond it (' + far0.n + ' land)');
    ok(far1.n > 0, 'and within buckshot (' + far1.n + ' of 8 land)');
    ok(far2.n === 1, 'the slug reaches a body 38 m out (' + far2.n + ' lands)');

    // a new run forgets them
    D.fit('buckshot');
    T.resetGame();
    ok(D.fitted() === 'birdshot' && !D.owned().buckshot && !D.owned().slug && JSON.stringify(D.stats()) === JSON.stringify(B), 'a new run starts on birdshot with no buckshot or slugs');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  } finally {
    Math.random = rndReal;
    try { T.setMouseFireDbg && T.setMouseFireDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
