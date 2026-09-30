// t128 - GB-101 (P-106, D-59, docs/skills.md): the combat counters feed addSkillXp, and the farms don't.
// Stopping power: a headshot kill and a one-shot kill pay 1 each; a two-hit body kill, a turret kill and a TT
// spawn pay nothing. Quick hands: a reload at a quarter mag or less with a zombie within 8 m after a shot pays 1;
// a fuller mag, no shot since, or nobody near pays nothing. Grenadier: his blast killing 5 pays 2, 3 pays 1, 2
// pays nothing, a bomber's blast nothing. Fleet foot: 10 s running in a wave with the nearest zombie coming at him
// pays 1 (not when it moves away, not walking, not in prep), the Shift+W run is seen by the watch, and a roll
// beside a swinging zombie pays 1 (not one 5 m off). Vitality: a comeback from under 25% (a zombie's damage) to
// over 50% pays 1 once a night, not from a fall; a dawn pays 2. Scavenger: 25 skulls banked pay 2, 5 more pay 1.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  try {
    await startMatch(T, 'Skills');
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const P = T.player.position;
    const xp = (k) => T.players[0].skills[k].xp;
    const real = (type, dx, dz) => { const z = T.spawnZombie(P.x + dx, P.z + dz, type, true, true); z.riseT = 0; z.ttSpawn = false; z.speed = z.baseSpeed = 0; return z; };
    const shoot = (z, amt, frac, extra) => T.damageZombie(z, amt, Object.assign({ kind: 'bullet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + z.hitH * frac }, extra || {}));

    // Stopping power
    let p0 = xp('power');
    const a = real('shambler', 0, 20); shoot(a, 99999, 0.92);
    ok(!a.alive && xp('power') - p0 === 2, 'a one-shot headshot kill pays 2 (' + (xp('power') - p0) + ')');
    p0 = xp('power'); const b = real('shambler', 2, 20); shoot(b, 99999, 0.4);
    ok(!b.alive && xp('power') - p0 === 1, 'a one-shot body kill pays 1 (' + (xp('power') - p0) + ')');
    p0 = xp('power'); const c = real('shambler', 4, 20); shoot(c, 1, 0.4); shoot(c, 99999, 0.4);
    ok(!c.alive && xp('power') === p0, 'a two-hit body kill pays nothing (' + (xp('power') - p0) + ')');
    p0 = xp('power'); const d = T.spawnZombie(P.x + 6, P.z + 20, 'shambler', true, true); d.riseT = 0; shoot(d, 99999, 0.92);
    ok(!d.alive && xp('power') === p0, 'a TT (debug) spawn pays nothing');
    p0 = xp('power'); const e = real('shambler', 8, 20); shoot(e, 99999, 0.92, { defense: true });
    ok(!e.alive && xp('power') === p0, 'a turret kill pays nothing');
    T.clearZombies();

    // Quick hands
    const w = T.getCurrentWeapon(); const s = T.skillDbg();
    const reloadCase = async (ammo, fired, zd) => {
      await until(() => !T.isReloading(), 5000);
      const z = real('shambler', zd, 0);
      T.setAmmoDbg(w, ammo); s.fired = fired;
      const h0 = xp('hands'); T.startReload();
      const started = T.isReloading(), got = xp('hands') - h0;
      T.clearZombies();
      return { started, got };
    };
    let r = await reloadCase(1, true, 5);
    ok(r.started && r.got === 1, 'a reload at 1 round with a zombie 5 m off after a shot pays 1 (' + w + ', ' + JSON.stringify(r) + ')');
    r = await reloadCase(8, true, 5);
    ok(r.got === 0, 'at 8 rounds (over a quarter) it pays nothing (' + JSON.stringify(r) + ')');
    r = await reloadCase(1, false, 5);
    ok(r.started && r.got === 0, 'with no shot since the last reload it pays nothing (' + JSON.stringify(r) + ')');
    r = await reloadCase(1, true, 20);
    ok(r.started && r.got === 0, 'with nobody within 8 m it pays nothing (' + JSON.stringify(r) + ')');
    await until(() => !T.isReloading(), 5000);

    // Grenadier
    const pack = (n, dz) => { const zs = []; for (let i = 0; i < n; i++) { const z = real('shambler', (i % 3) * 0.8 - 0.8, dz + Math.floor(i / 3) * 0.8); z.hp = z.maxHp = 5; zs.push(z); } return zs; };
    const boomAt = (dz) => ({ pos: { x: P.x, y: T.sampleHeight(P.x, P.z + dz) + 0.3, z: P.z + dz }, mesh: null, damage: 200 });
    let g0 = xp('grenadier'); let zs = pack(5, 18); T.explodeGrenade(boomAt(18.4));
    ok(zs.every((z) => !z.alive) && xp('grenadier') - g0 === 2, 'his blast killing 5 pays 2 (' + (xp('grenadier') - g0) + ')');
    g0 = xp('grenadier'); zs = pack(3, 18); T.explodeGrenade(boomAt(18.2));
    ok(zs.every((z) => !z.alive) && xp('grenadier') - g0 === 1, 'killing 3 pays 1 (' + (xp('grenadier') - g0) + ')');
    g0 = xp('grenadier'); zs = pack(2, 18); T.explodeGrenade(boomAt(18.1));
    ok(zs.every((z) => !z.alive) && xp('grenadier') === g0, 'killing 2 pays nothing');
    g0 = xp('grenadier'); zs = pack(5, 18); T.bomberBlast(P.x, T.sampleHeight(P.x, P.z + 18.4) + 0.3, P.z + 18.4, true);
    ok(zs.every((z) => !z.alive) && xp('grenadier') === g0, 'a bomber\'s blast (even one he shot) pays nothing');
    T.clearZombies();

    // Fleet foot: the chase, through the watch
    T.beginWave(); T.clearZombies();
    const chase = (running, towards) => {
      const z = real('shambler', 10, 0); s.runT = 0; s.nz = null;
      const l0 = xp('legs');
      for (let i = 0; i < 105; i++) {
        s.running = running;
        const dx = P.x - z.mesh.position.x, dz = P.z - z.mesh.position.z, dl = Math.hypot(dx, dz) || 1;
        const step = towards ? 0.08 : -0.08;   // 0.8 m/s, a walking shambler (the watch wants > 0.3 m/s closing)
        z.mesh.position.x += dx / dl * step; z.mesh.position.z += dz / dl * step;
        T.skillWatchDbg(0.1);
      }
      T.clearZombies();
      return xp('legs') - l0;
    };
    ok(chase(true, true) === 1, '10.5 s running in a wave with a zombie coming at him pays 1');
    ok(chase(true, false) === 0, 'with it moving away, nothing');
    ok(chase(false, true) === 0, 'walking, nothing');
    // The real Shift+W run reaches the watch: it picks up the zombie within 15 m.
    const zr = real('shambler', 10, 0); s.nz = null;
    key('keydown', 'ShiftLeft'); key('keydown', 'KeyW');
    await wait(400);
    const seen = s.nz === zr;
    key('keyup', 'KeyW'); key('keyup', 'ShiftLeft');
    ok(seen, 'holding Shift+W in a wave, the watch sees him running with the zombie near');
    T.clearZombies();
    T.startPrep();
    ok(T.getPhase() === 'prep' && chase(true, true) === 0, 'in prep, nothing');

    // Fleet foot: the roll
    await wait(1500);
    let l0 = xp('legs'); const far = real('shambler', 0, 5); far.swingT = 0.6;
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(xp('legs') === l0, 'a roll 5 m from a swinging zombie pays nothing');
    T.clearZombies();
    await wait(1600);
    l0 = xp('legs'); const near = real('shambler', 0, 1.1); near.swingT = 0.6;
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(xp('legs') - l0 === 1, 'a roll 1.1 m from a swinging zombie pays 1 (' + (xp('legs') - l0) + ')');
    T.clearZombies();
    await wait(1200);

    // Vitality: the comeback
    const zb = real('shambler', 0, 30);
    const downTo = (att, cause) => { for (let i = 0; i < 40 && T.getHp() >= 25; i++) T.damagePlayer(5, cause, att); };
    let v0 = xp('vitality');
    T.setHp(40); downTo(null, 'fall'); T.setHp(60); await wait(300);
    ok(T.getHp() > 50 && xp('vitality') === v0, 'back over 50% after a fall pays nothing');
    T.setHp(40); downTo(zb, 'shambler'); const low = T.getHp(); T.setHp(60); await wait(300);
    ok(low < 25 && xp('vitality') - v0 === 1, 'under 25% from a zombie (' + low + ') and back over 50% within 30 s pays 1 (' + (xp('vitality') - v0) + ')');
    v0 = xp('vitality'); T.setHp(40); downTo(zb, 'shambler'); T.setHp(60); await wait(300);
    ok(xp('vitality') === v0, 'a second comeback the same night pays nothing');
    T.clearZombies(); T.setHp(100);
    // Vitality: the dawn
    T.beginWave(); T.clearZombies(); v0 = xp('vitality'); T.startPrep();
    ok(xp('vitality') - v0 === 2, 'a dawn he lives to see pays 2 (' + (xp('vitality') - v0) + ')');

    // Scavenger: banked at the HQ window
    const bank = async (n) => {
      const bag = T.getSkullBag(); bag.count = n; bag.value = n * 4;
      P.set(T.HQ_WINDOW_FRONT.x, T.sampleHeight(T.HQ_WINDOW_FRONT.x, T.HQ_WINDOW_FRONT.z), T.HQ_WINDOW_FRONT.z); await wait(250);
      T.doAction();
      await until(() => T.hq.dep === 'green', 15000);
      const got = T.hq.dep === 'green';
      await until(() => T.hq.dep !== 'green', 15000);
      return got;
    };
    let s0 = xp('scavenger');
    const b1 = await bank(25);
    ok(b1 && xp('scavenger') - s0 === 2, '25 skulls banked pay 2 (' + (xp('scavenger') - s0) + ')');
    const b2 = await bank(5);
    ok(b2 && xp('scavenger') - s0 === 3, '5 more make 30: 3 in all (' + (xp('scavenger') - s0) + ')');
    T.resetGame();
    ok(xp('power') === 0 && xp('legs') === 0 && T.skillDbg().skulls === 0, 'a fresh start clears the XP and the counters');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message || e)); }
  return out.join('\n');
})()
