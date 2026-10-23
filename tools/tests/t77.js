// t77 - GB-52 (Jerry): the knife and the chainsaw are a bit too strong. Less per hit on the
// bigger kinds, a longer knife recovery, and the saw's gas and heat matter: it burns faster in
// a body, heats up, stalls when it overheats and restarts once cooled. It bites at most 3 a tick.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  // CL-231: the saw's gas, heat, starter pull and cooling all run on game time, and the suite's page can draw a few frames
  // a second (dt capped at 0.05). From the saw on, durations are game time (gWait, gUntil), with long wall-clock caps.
  const gWait = async (ms) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < ms / 1000 && Date.now() - w0 < ms * 40) await wait(20); };
  const gUntil = async (cond, ms) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < ms / 1000 && Date.now() - w0 < ms * 40) { if (cond()) return true; await wait(20); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const B = T.BLADE_STATS, W = T.WEAPON_STATS;
    // GB-94 follow-up (Jerry 2026-10-05: "Buff the knife a little"): the knife's damage is 26 (was 22); the GB-52 checks are the same.
    ok(B.knife.cd === 0.55 && B.knife.dmg === 26 && B.machete.cd === 0.5 && B.machete.maxHits === 3, 'blades: knife cd ' + B.knife.cd + ', machete cd ' + B.machete.cd + ' max ' + B.machete.maxHits);
    ok(W && W.chainsaw.damage === 14 && W.chainsaw.arc === 0.2, 'saw: ' + (W && W.chainsaw.damage) + ' a tick, arc ' + (W && W.chainsaw.arc));
    ok(T.meleeSizeMul({ typeKey: 'shambler' }) === 1 && T.meleeSizeMul({ typeKey: 'brute' }) === 0.6 && T.meleeSizeMul({ typeKey: 'colossus' }) === 0.35, 'size: shambler 1, brute 0.6, colossus 0.35');
    await startMatch(T, 'Blades');
    await until(() => T.getPoiGuards().zombies.length > 0, 8000);
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.setHp(1e6);
    const px = 10, pz = 10;
    const hold = () => T.player.position.set(px, T.sampleHeight(px, pz), pz);
    hold(); await wait(200); hold();
    // (1) The knife on a shambler: 26 x its Blade weakness 1.5 (GB-104, D-62) = 39. On a brute: 26 x (1 - 0.55 plates, GB-75) x 0.6 = 7.0 (at 22: 33 and 5.9).
    const hitOnce = async (kind) => {
      T.clearZombies(); await wait(50);
      const z = T.spawnZombie(px, pz + 1.6, kind, true, true);
      z.mesh.position.set(px, T.sampleHeight(px, pz + 1.6), pz + 1.6);
      z.hp = 1000; z.maxHp = 1000;
      hold(); T.setAimYawDbg(0); T.setKnifeCd(0); T.knifeAttack(); await wait(30);
      return 1000 - z.hp;
    };
    const ds = await hitOnce('shambler'), db = await hitOnce('brute');
    // D-86: Jerry's sheet uses each test body's own 1000 max HP.
    const kSh = T.listedBodyDamage('knife', 'shambler', undefined, 1000), kBr = T.listedBodyDamage('knife', 'brute', undefined, 1000);
    ok(Math.abs(ds - kSh) < 0.6, 'knife on a shambler: ' + ds.toFixed(1) + ' (sheet ' + kSh.toFixed(1) + ', CU-127)');
    ok(Math.abs(db - kBr) < 0.6, 'knife on a brute: ' + db.toFixed(1) + ' (sheet ' + kBr.toFixed(1) + ', plates on)');
    // (1b) The saw no longer takes the head off anything in a second: ten saw ticks on a brute
    // (8.4 after its size, 3.8 after its plates since GB-75) leave it standing with its head on; twenty-five at most kill it.
    {
      T.clearZombies(); await wait(50);
      const br = T.spawnZombie(px + 30, pz, 'brute', true, true);
      br.hp = 85; br.maxHp = 85;
      const tick = W.chainsaw.damage * T.meleeSizeMul(br);
      for (let i = 0; i < 10; i++) T.damageZombie(br, tick, { kind: 'chainsaw', dir: { x: 0, z: 1 } });
      ok(br.alive && !(br.partsLost && br.partsLost.head), 'ten saw ticks: the brute stands, head on (hp ' + br.hp.toFixed(1) + '/' + br.maxHp + ', parts ' + JSON.stringify(br.partsLost || {}).replace(/"/g, '') + ')');
      let n = 10;
      for (; n < 25 && br.alive; n++) T.damageZombie(br, tick, { kind: 'chainsaw', dir: { x: 0, z: 1 } });
      ok(!br.alive, 'twenty-five at most kill it (' + n + ')');
    }
    T.clearZombies(); await wait(50);
    // (2) The saw: bought, in hand, held down in a ring of big bodies.
    { const wo = T.getWeaponOwned(); wo.chainsaw = true; }
    const WO = T.WEAPON_ORDER || [];
    T.setWeapon(WO.indexOf('chainsaw'));
    await gWait(300);
    await gUntil(() => !T.sawStartDbg || T.sawStartDbg().phase === 'ready', 3000);   // GP-188: the starter pull (1.02 s) before it runs
    ok(T.getCurrentWeapon() === 'chainsaw' && T.getSawFuel() > 50, 'saw in hand, ' + T.getSawFuel().toFixed(0) + ' s of gas');
    T.runDevCommand('godmode');   // no knockback: the marine stays in the ring
    const run = async (ms) => {
      const f0 = T.getSawFuel(), h0 = T.getSawHeat().heat;
      T.setMouseFireDbg(true); await gWait(ms); T.setMouseFireDbg(false);
      return { fuel: f0 - T.getSawFuel(), heat: T.getSawHeat().heat - h0 };
    };
    // Running free (nothing to cut): 1 s of gas a second, heat creeps.
    T.setSawHeatDbg(0);
    const free = await run(1500);
    const ring = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, x = px + Math.sin(a) * 1.6, z = pz + Math.cos(a) * 1.6;
      const b = T.spawnZombie(x, z, 'brute', true, true);
      b.mesh.position.set(x, T.sampleHeight(x, z), z); b.hp = 1e6; b.maxHp = T.ZOMBIE_TYPES.brute.hp; // durable fixture; sheet damage uses a brute's normal max HP
      ring.push(b);
    }
    await gWait(150);
    // One tick: at most 3 bodies bitten.
    const hp0 = ring.map((b) => b.hp);
    T.setSawHeatDbg(0);
    T.setMouseFireDbg(true);
    await gUntil(() => ring.some((b, k) => b.hp < hp0[k]), 1500);
    await gWait(40);
    T.setMouseFireDbg(false);
    const bitten = ring.filter((b, k) => b.hp < hp0[k]).length;
    ok(bitten >= 1 && bitten <= 3, 'one tick bites at most 3 of 8 (' + bitten + ')');
    await gWait(300);
    // In bodies: gas 2.5x as fast, heat 5x as fast (the same wall time as running free).
    T.setSawHeatDbg(0);
    const cut = await run(1500);
    ok(cut.fuel > free.fuel * 2, 'gas burns faster in a body: ' + cut.fuel.toFixed(2) + ' s vs ' + free.fuel.toFixed(2) + ' s running free (x' + (cut.fuel / free.fuel).toFixed(1) + ')');
    ok(cut.heat > free.heat * 3 && cut.heat > 0.05, 'and heats up: +' + cut.heat.toFixed(3) + ' vs +' + free.heat.toFixed(3) + ' (x' + (cut.heat / Math.max(1e-6, free.heat)).toFixed(1) + ')');
    // Near the top it overheats and stalls, trigger still held.
    T.setSawHeatDbg(0.93);
    T.setMouseFireDbg(true);
    const stalled = await gUntil(() => T.getSawHeat().overheat, 4000);
    ok(stalled, 'overheats at 1 (heat ' + T.getSawHeat().heat.toFixed(2) + ')');
    const hpS = ring.map((b) => b.hp);
    await gWait(600);
    ok(ring.every((b, k) => b.hp === hpS[k]) && T.getSawHeat().overheat, 'stalled: no bites while it is hot, trigger still held');
    const cooled = await gUntil(() => !T.getSawHeat().overheat, 5000);
    ok(cooled && T.getSawHeat().heat <= 0.46, 'cools to ' + T.getSawHeat().heat.toFixed(2) + ' and can be started again');
    // D-86: the first three in the saw arc can lose their limbs before restart. Give the
    // restarted chain fresh live targets in that same arc; the assertion still requires a bite.
    const restartTargets = [0, 1, 7].map((i) => {
      const a = i / 8 * Math.PI * 2, x = px + Math.sin(a) * 1.6, z = pz + Math.cos(a) * 1.6;
      const b = T.spawnZombie(x, z, 'brute', true, true);
      b.mesh.position.set(x, T.sampleHeight(x, z), z);
      b.riseT = 0; b.speed = b.baseSpeed = 0; b.hp = 1e6; b.maxHp = T.ZOMBIE_TYPES.brute.hp;
      return b;
    });
    const restartHp = restartTargets.map((b) => b.hp);
    const fR = T.getSawFuel(), hR = T.getSawHeat().heat;
    await gWait(700);
    const dist = restartTargets.map((b) => b.mesh ? Math.hypot(b.mesh.position.x - T.player.position.x, b.mesh.position.z - T.player.position.z).toFixed(1) : (b.alive ? 'nomesh' : 'dead')).join(',') + ' phase ' + T.getPhase() + ' zl ' + T.zombies.length;
    ok(restartTargets.some((b, k) => b.hp < restartHp[k]), 'and it cuts again once restarted (fuel -' + (fR - T.getSawFuel()).toFixed(2) + ', heat ' + hR.toFixed(2) + '->' + T.getSawHeat().heat.toFixed(2) + ', w ' + T.getCurrentWeapon() + ', paused ' + (T.isPaused ? T.isPaused() : '?') + ', d ' + dist + ')');
    T.setMouseFireDbg(false);
    await gWait(300);
    const h1 = T.getSawHeat().heat; await gWait(1000);
    ok(T.getSawHeat().heat < h1 - 0.2, 'off, it cools (' + h1.toFixed(2) + ' -> ' + T.getSawHeat().heat.toFixed(2) + ')');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 1).join('').slice(0, 80) + ')');
    T.clearZombies();
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  try { window.TT.setMouseFireDbg(false); } catch (_) {}
  return out.join('\n');
})()
