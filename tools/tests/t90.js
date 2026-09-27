// t90 - GB-65 (P-70 with P-6; D-42): the dead react in the game. A zombie gets a reacting body (the studio's
// `zombie` rig and its kind's preset) the first time it is hit, through a pool of 8. A close shell's pellets are
// summed into one hit: it knocks a shambler down, the AI waits while it's down, and it gets up. A rifle round
// only jolts it. A demon goes down; a brute and a soldier don't; a spider has no body. With bodies off (or the
// pool full) today's reaction plays, and now fires on the summed shell: at 1.5 m at least 3.5 m/s and a
// knockdown, more than an AK round. One headshot bonus per shell. 48 zombies with 8 reacting: the body pass is cheap.
(async () => {
  const T = window.TT; const out = [];
  T.setMotionEnabledDbg(true);   // Claude 2026-09-27: reactions are a Settings toggle, off by default
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Reactions');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const px = 10, pz = 10;
    const hold = () => T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.levelGroundRect(px - 20, pz - 20, px + 20, pz + 20, T.sampleHeight(px, pz), 6);
    hold(); await wait(200); hold();
    const py = () => T.player.position.y;
    const put = (kind, x, z) => {
      const zz = T.spawnZombie(x, z, kind, true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      zz.hp = 5000; zz.maxHp = 5000; zz.riseT = 0;
      return zz;
    };
    // While the pellets land, nothing comes off: a zombie that loses both legs crawls and a crawler has
    // no body (by design), and a lost head leaves it on 1 hp. Either makes a check here a coin toss.
    const steady = (fn) => { const rnd = Math.random; Math.random = () => 0.99; try { fn(); } finally { Math.random = rnd; } };
    const shell = async (z, dist = 1.5) => {
      hold();
      const zx = z.mesh.position.x, zz = z.mesh.position.z;
      const ox = zx, oz = zz - dist, oy = z.mesh.position.y + 1.0;
      T.fireShellDbg(ox, oy, oz, 0, 0, 1);
      steady(() => { for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
    };
    const round = (z, dmg = 27, dist = 3) => {
      const zx = z.mesh.position.x, zz = z.mesh.position.z;
      T.fireRoundDbg(zx, z.mesh.position.y + 1.0, zz - dist, 0, 0, 1, dmg, 100, 0);
      steady(() => { for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
    };
    const until = async (cond, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (cond()) return true; await wait(30); } return cond(); };

    // (1) A close shell: one summed hit on the body; it goes down, waits, gets up.
    const s1 = put('shambler', px, pz + 4);
    const st0 = T.getMotionStats();
    await shell(s1);
    const last = s1._shotLast || { n: 0, dmg: 0 };
    const st1 = T.getMotionStats();
    ok(last.n >= 5 && st1.taken === st0.taken + 1, 'a close shell: ' + last.n + ' pellets summed into one hit (' + last.dmg.toFixed(0) + ' dmg), the body took it once (' + (st1.taken - st0.taken) + ')');
    ok(!!s1.body && (s1.body.state === 'fall' || s1.body.state === 'down'), 'it is knocked down (' + (s1.body && s1.body.state) + ')');
    let sawDown = false, windup = 0, x0 = s1.mesh.position.x, z0 = s1.mesh.position.z;
    const downOk = await until(() => { if (s1.body && s1.body.state === 'down') { sawDown = true; windup = Math.max(windup, s1.attackWindup || 0); } return sawDown; }, 3000);
    ok(downOk && T.motionDown(s1), 'it lies there, and the AI counts it as down');
    const rose = await until(() => s1.body && s1.body.state === 'animated', 7000);
    const hips = s1.mesh.userData.hips; hips.updateWorldMatrix(true, false);
    const hy = new hips.position.constructor().setFromMatrixPosition(hips.matrixWorld).y - s1.mesh.position.y;
    ok(rose && s1.alive && !T.motionDown(s1) && windup === 0, 'and it gets up (' + (s1.body && s1.body.state) + ', hips ' + f2(hy) + ' m over its feet, no windup while down)');
    // (2) A rifle round only jolts it.
    const s2 = put('shambler', px + 3, pz + 5);
    round(s2);
    ok(!!s2.body && s2.body.awake && !T.motionDown(s2), 'an AK round: the body reacts but stays up (' + (s2.body && s2.body.state) + ')');
    await wait(150);
    ok(!T.motionDown(s2), 'still up a moment later (' + (s2.body && s2.body.state) + ')');
    // A grenade throws one (its blast reaches damageZombie as 'explosive').
    const s3 = put('shambler', px - 3, pz + 5);
    const g0 = { x: s3.mesh.position.x, z: s3.mesh.position.z };
    steady(() => T.damageZombie(s3, 120, { kind: 'explosive', dir: { x: 0, z: 1 } }));
    const thrown = await until(() => T.motionDown(s3), 500);
    await wait(400);
    const moved = Math.hypot(s3.mesh.position.x - g0.x, s3.mesh.position.z - g0.z);
    ok(thrown && !!s3.body && moved > 0.3, 'a grenade throws it (' + (s3.body && s3.body.state) + ', ' + f2(moved) + ' m)');
    T.clearZombies(); await wait(100);

    // (3) Kinds, on their bodies.
    const kinds = {};
    for (const [k, dx] of [['demon', -4], ['brute', 0], ['military', 4]]) {
      const z = put(k, px + dx, pz + 4); await shell(z);
      await wait(400);
      kinds[k] = { body: !!z.body, preset: z.body && z.body.preset.name, down: T.motionDown(z) || (z.body && z.body.state === 'down') };
    }
    ok(kinds.demon.down && !kinds.brute.down && !kinds.military.down, 'a close shell drops a demon, not a brute or a soldier (' + JSON.stringify(kinds).replace(/"/g, '') + ')');
    const sp = put('spider', px + 8, pz + 4); await shell(sp);
    ok(!sp.body && !(sp.knockT > 0), 'a spider has no body and does not go down');
    T.clearZombies(); await wait(100);

    // (4) Today's reaction (bodies off, as when the pool is full), now on the summed shell.
    T.setMotionEnabledDbg(false);
    const legacy = async (k, how) => {
      const z = put(k, px, pz + 4);
      z.speed = 0; z.baseSpeed = 0;
      if (how === 'shell') await shell(z); else round(z);
      const r = { v: Math.hypot(z.staggerVX, z.staggerVZ), knock: z.knockT > 0, n: (z._shotLast || {}).n, crawl: !!z.crawling, alive: z.alive };
      T.clearZombies(); await wait(50);
      return r;
    };
    const ls = await legacy('shambler', 'shell'), la = await legacy('shambler', 'ak');
    ok(ls.v >= 3.5 && ls.knock && ls.v > la.v && !la.knock, 'old reaction: a shell at 1.5 m ' + f2(ls.v) + ' m/s and down; an AK round ' + f2(la.v) + ' m/s and up (' + JSON.stringify(ls).replace(/"/g, '') + ')');
    const ld = await legacy('demon', 'shell'), lb = await legacy('brute', 'shell'), lm = await legacy('military', 'shell'), lsp = await legacy('spider', 'shell');
    ok(ld.knock && !lb.knock && !lm.knock && !lsp.knock, 'old reaction: the demon goes down; brute, soldier and spider do not');
    // One headshot bonus per shell (the head never comes off here).
    {
      const z = put('shambler', px, pz + 4);
      const head = z.mesh.position.y + (z.hitH || 1.4) * 0.9;
      const hp0 = z.hp, rnd = Math.random;
      Math.random = () => 0.99;
      try { for (let i = 0; i < 7; i++) T.damageZombie(z, 9, { kind: 'pellet', dir: { x: 0, z: 1 }, hitY: head, shotId: 987654 }); }
      finally { Math.random = rnd; }
      T.flushShotHits();
      const loss = hp0 - z.hp, want = 63 + 9 * 0.5 * (z.headshotMul || 1) * (1 - Math.max(0, Math.min(0.6, z.armor || 0)));
      ok(Math.abs(loss - want) < 0.6, 'seven pellets in the head: one headshot bonus (' + loss.toFixed(1) + ', expected ' + want.toFixed(1) + ')');
      T.clearZombies(); await wait(50);
    }
    T.setMotionEnabledDbg(true);

    // (5) 48 zombies, ten close shells: 8 react, the rest play the old reaction; the body pass is cheap.
    const ring = [];
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r = 7 + (i % 3) * 2; const z = put('shambler', px + Math.cos(a) * r, pz + Math.sin(a) * r); z.speed = 0; z.baseSpeed = 0; ring.push(z); }
    await wait(200);
    const b0 = T.getMotionStats();
    // Nothing comes off here (a legless zombie crawls, and a crawler has no body by design).
    { const rnd = Math.random; Math.random = () => 0.99;
      try {
        for (let i = 0; i < 10; i++) {
          const z = ring[i * 4];
          for (let k = 0; k < 7; k++) T.damageZombie(z, 9, { kind: 'pellet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + 1.0, shotId: 700000 + i });
          T.flushShotHits();
        }
      } finally { Math.random = rnd; } }
    const b1 = T.getMotionStats();
    const oldWay = ring.filter((z, i) => i % 4 === 0 && i < 40 && (z.knockT > 0)).length;
    ok(b1.active <= 8 && b1.reacting <= 8 && b1.taken - b0.taken === 8 && b1.refused - b0.refused === 2 && b1.skipped === b0.skipped && oldWay === 2, 'ten shells into 48: 8 bodies react, 2 refused play the old knockdown (active ' + b1.active + ', taken ' + (b1.taken - b0.taken) + ', refused ' + (b1.refused - b0.refused) + ', skipped ' + (b1.skipped - b0.skipped) + ', old ' + oldWay + ')');
    // The EMA is sampled through the 1.5 s and the lowest reading judged: under a full parallel test run the
    // box's CPU is shared, and a busy moment says more about the box than about the pass.
    const f0 = b1.frames; let low = Infinity;
    for (let k = 0; k < 15; k++) { await wait(100); if (T.getMotionStats().frames - f0 > 5) low = Math.min(low, T.getMotionStats().ms); }
    const b2 = { ...T.getMotionStats(), ms: low };
    out.push('body pass: ' + (b2.frames - f0) + ' frames, ' + b2.ms.toFixed(2) + ' ms a frame (EMA), peak ' + b2.peak.toFixed(2) + ' ms');
    // Headless, three is fakethree and the numbers are slow and rough: the bar is one 60 Hz frame for the whole
    // pass (8.7 ms measured at GB-65, about 0.65 ms a body in update and 0.4 in apply). A real-GPU bench is
    // devBench's job, not this test's.
    ok(b2.frames - f0 > 5 && b2.ms < 16, 'the body pass fits in a frame with 8 reacting, headless (' + b2.ms.toFixed(2) + ' ms a frame, ' + (b2.ms / 8).toFixed(2) + ' ms a body)');
    T.clearZombies(); await wait(200);
    ok(T.getMotionStats().active === 0, 'cleared zombies give their slots back (' + T.getMotionStats().active + ')');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()