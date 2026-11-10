// tcb248 - CB-248 (J114, Jerry's 9 Nov playtest: "Add 3 1/2 inch slug and buckshot ammo options to shotgun. Not AA-12. Just regular
//  Shotgun."). The pump shotgun gets two more loads, 3.5-inch buckshot and a 3.5-inch slug, bought once at its Armory workbench and
//  fitted there, one at a time; the Breacher (aa12) gets none. Checked: the workbench lists both for the shotgun and neither for the
//  Breacher; a load is refused until bought; buying it through the workbench's own button charges once and fits it; fitting one takes
//  the other out; taking it off goes back to the issued shell; a new run forgets them. Then fired for real from a standing player at
//  a shambler on a level field with the random numbers pinned to the cone's middle (so every pellet flies true): the issued shell
//  lands 7 pellets, buckshot 10, the slug 1; and at the cone's edge the slug (a tight cone) still hits where the shell and the
//  buckshot (wide cones) miss; and the reach is the sheet's: a shell stops short of 25 m, buckshot reaches it, the slug reaches 40 m.
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
    await startMatch(T, 'Magnum loads');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    T.addCash(5000);
    T.grantAllWeapons();

    // ---- the workbench ------------------------------------------------------------------------------------------------------
    const B = D.base;
    ok(B.pellets === 7 && B.damage === 9 && B.range === 22 && Math.abs(B.spread - 0.14) < 1e-9, 'the issued shell: ' + B.pellets + ' pellets of ' + B.damage + ', spread ' + B.spread + ', ' + B.range + ' m');
    ok(D.fitted() === 'std' && JSON.stringify(D.stats()) === JSON.stringify(B), 'it is what the pump fires with to begin with');
    const mods = D.mods('shotgun');
    ok(mods.length === 2 && mods.map((m) => m.id).sort().join() === 'load:buck,load:slug', 'the shotgun\'s workbench offers both loads (' + mods.map((m) => m.id).join(', ') + ')');
    ok(mods.every((m) => !m.owned && !m.fitted && m.price > 0 && /3\.5/.test(m.name) && m.desc.length > 10), 'each unowned, unfitted, priced, named for its 3.5 inches: ' + mods.map((m) => m.name + ' $' + m.price).join(' · '));
    ok(D.mods('aa12').length === 0 && T.armoryDbg.mods('aa12').every((m) => !m.id.startsWith('load:')), 'the Breacher\'s workbench offers neither');
    ok(T.armoryDbg.mods('m4').every((m) => !m.id.startsWith('load:')), 'nor any other gun\'s');
    ok(T.armoryDbg.fit('shotgun', 'load:slug', true) === false && D.fitted() === 'std', 'a load that is not bought will not fit');

    T.closeMenuDbg && T.closeMenuDbg('shop');
    T.setPhase && T.setPhase('prep');
    T.openMenuDbg('armory');
    const ui = T.armoryDbg.ui(); ui.bench('shotgun'); await wait(150);
    const row = (id) => document.querySelector('#armoryPanel [data-mod="' + id + '"]');
    const btn = (id) => row(id) && row(id).querySelector('button');
    ok(!!row('load:buck') && !!row('load:slug'), 'the bench shows both rows');
    const slugPrice = mods.find((m) => m.id === 'load:slug').price, buckPrice = mods.find((m) => m.id === 'load:buck').price;
    const bank0 = T.getBank();
    btn('load:slug').click(); await wait(150);
    ok(D.owned().slug === true && D.fitted() === 'slug', 'buying the slug at the bench owns it and fits it (' + D.fitted() + ')');
    ok(T.getBank() === bank0 - slugPrice, 'it cost ' + slugPrice + ' (bank ' + bank0 + ' to ' + T.getBank() + ')');
    let s = D.stats();
    ok(s.pellets === 1 && s.damage === 70 && s.range === 44 && s.spread < 0.03 && s.interval > B.interval, 'the pump now fires one slug: ' + s.pellets + ' x ' + s.damage + ', spread ' + f2(s.spread) + ', ' + s.range + ' m, every ' + f2(s.interval) + ' s');
    ok(s.name === B.name && s.maxAmmo === B.maxAmmo && s.reload === B.reload && s.speed === B.speed, 'its name, tube, reload and muzzle speed are the gun\'s own');
    ok(/fitted/i.test(row('load:slug').textContent), 'the row says it is fitted');
    btn('load:buck').click(); await wait(150);
    ok(D.owned().buck === true && D.fitted() === 'buck', 'buying the buckshot fits it and the slug comes out (' + D.fitted() + ')');
    ok(T.getBank() === bank0 - slugPrice - buckPrice, 'and it cost ' + buckPrice);
    s = D.stats();
    ok(s.pellets === 10 && s.damage === 10 && s.range === 26 && s.spread > B.spread && s.interval === B.interval, 'the pump now throws ' + s.pellets + ' pellets of ' + s.damage + ', spread ' + f2(s.spread) + ', ' + s.range + ' m');
    btn('load:buck').click(); await wait(150);   // owned and fitted: the button takes it off
    ok(D.fitted() === 'std' && JSON.stringify(D.stats()) === JSON.stringify(B), 'taking it off goes back to the issued shell');
    btn('load:slug').click(); await wait(150);
    ok(D.fitted() === 'slug' && T.getBank() === bank0 - slugPrice - buckPrice, 'an owned load fits free (' + D.fitted() + ')');
    ui.bench('aa12'); await wait(100);
    ok(!row('load:slug') && !row('load:buck'), 'the Breacher\'s bench has neither row');
    T.closeMenuDbg && T.closeMenuDbg('armory');
    D.clear();

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
    ok(/3\.5"? SLUG/i.test(D.hud()), 'the ammo line says which shell is in the tube: "' + D.hud() + '"');
    D.clear(); await wait(100);
    ok(!/3\.5/.test(D.hud()), 'and says nothing of it once it is off: "' + D.hud() + '"');
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
    D.fit('buck'); const buck = await pull(0, 0, 'buckshot');
    D.fit('slug'); const slug = await pull(0, 0, 'slug');
    ok(std.fired && std.air.length === 7, 'the issued shell: seven pellets leave (' + std.air.length + ')');
    ok(buck.fired && buck.air.length === 10, 'buckshot: ten leave (' + buck.air.length + ')');
    ok(slug.fired && slug.air.length === 1, 'the slug: one leaves (' + slug.air.length + ')');
    ok(std.air[0] && std.air[0].base === 9 && std.air[0].dmg === 9 && buck.air[0] && buck.air[0].dmg === 10 && slug.air[0] && slug.air[0].dmg === 70, 'each carries its sheet\'s damage: 9, 10, 70');

    // ... and on a body: those very pellets, with the tags the game put on them, through the game's own damage rules. Jerry's hit
    // sheet scores a whole shell as 270% of a shambler (24): the issued shell must take that, buckshot a shell of 100 over 63 of it
    // more, the slug 70 over 63, however the shell is cut up.
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
    ok(Math.abs(tBuck - whole * 100 / 63) < whole * 0.02, 'buckshot takes ' + tBuck.toFixed(1) + ', x1.59 of it (' + (whole * 100 / 63).toFixed(1) + ')');
    ok(Math.abs(tSlug - whole * 70 / 63) < whole * 0.02, 'the slug takes ' + tSlug.toFixed(1) + ', x1.11 of it (' + (whole * 70 / 63).toFixed(1) + ')');

    // the cone: the dice at the cone's edge; the angle off the middle of the aim is each shell's spread
    D.clear();   const eStd = await pull(0, 0.99, 'issued edge');
    D.fit('buck'); const eBuck = await pull(0, 0.99, 'buckshot edge');
    D.fit('slug'); const eSlug = await pull(0, 0.99, 'slug edge');
    const mid = std.air[0] && std.air[0].dir;
    const aS = mid && eStd.air[0] ? ang(mid, eStd.air[0].dir) : 0, aB = mid && eBuck.air[0] ? ang(mid, eBuck.air[0].dir) : 0, aG = mid && eSlug.air[0] ? ang(mid, eSlug.air[0].dir) : 0;
    ok(aS > 0.08 && aS < 0.16, 'the issued shell leaves the aim by ' + aS.toFixed(3) + ' rad at the edge (spread 0.14)');
    ok(aS > 0 && Math.abs(aB / aS - 0.16 / 0.14) < 0.1, 'buckshot ' + aB.toFixed(3) + ' rad, a seventh wider than the shell (' + (aB / aS).toFixed(2) + ' of it)');
    ok(aS > 0 && aG / aS > 0.08 && aG / aS < 0.25, 'the slug ' + aG.toFixed(3) + ' rad, a few times tighter than the shell\'s cone (' + (aG / aS).toFixed(2) + ' of it)');

    // the reach: what is in the air flies the sheet's range, and a real body feels it
    ok(std.air[0] && Math.abs(std.air[0].reach - 22) < 0.5 && buck.air[0] && Math.abs(buck.air[0].reach - 26) < 0.5 && slug.air[0] && Math.abs(slug.air[0].reach - 44) < 0.5,
      'in the air: the shell flies ' + (std.air[0] ? std.air[0].reach.toFixed(1) : '-') + ' m, buckshot ' + (buck.air[0] ? buck.air[0].reach.toFixed(1) : '-') + ', the slug ' + (slug.air[0] ? slug.air[0].reach.toFixed(1) : '-'));
    D.clear();   const near0 = await pull(16, 0, 'issued');
    const far0 = await pull(24, 0, 'issued');
    D.fit('buck'); const far1 = await pull(24, 0, 'buckshot');
    D.fit('slug'); const far2 = await pull(38, 0, 'slug');
    ok(near0.n > 0, 'a body 16 m out feels the shell (' + near0.n + ' of 7 land): the aim is true');
    ok(far0.n === 0, 'a body 24 m out is beyond it (' + far0.n + ' land)');
    ok(far1.n > 0, 'and within buckshot (' + far1.n + ' of 10 land)');
    ok(far2.n === 1, 'the slug reaches a body 38 m out (' + far2.n + ' lands)');

    // a new run forgets them
    D.fit('buck');
    T.resetGame();
    ok(D.fitted() === 'std' && !D.owned().buck && !D.owned().slug && JSON.stringify(D.stats()) === JSON.stringify(B), 'a new run starts on the issued shell with nothing bought');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  } finally {
    Math.random = rndReal;
    try { T.setMouseFireDbg && T.setMouseFireDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
