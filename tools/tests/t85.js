// t85 - GB-65 to GB-67 (P-70 to P-72, D-42): reactions in the game, behind the REACTIONS switch.
// With it on: a close shotgun shell staggers or drops a shambler and it gets up, a rifle round only
// flinches it, a kill leaves a corpse lying and frozen, a brute shrugs off the shell, the marine
// staggers from a brute's blow and keeps his feet, a bomber at 1 m puts him down and he is up again
// fast, and 48 zombies with 8 reacting keep the horde's cost inside its bound. With it off (the
// default) nothing goes near the horde and the old reactions play.
// The zombies stand where they are put: the match's opening grace hour keeps them from walking or
// attacking, and each one stands straight behind the marine's back line so it faces +Z (the test
// stand-in for three has no Matrix4.makeBasis, so a body's hip and chest frames only match real three
// facing that way).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Reactions');
    T.clearZombies();
    ok(T.getReactions() === false && T.getHorde() === null, 'reactions are off by default, and the horde is never made');

    // --- On ------------------------------------------------------------------------------
    T.runDevCommand('reactions on');
    ok(T.getReactions() === true && !!T.getHorde(), 'the dev console turns them on ("reactions on")');
    const H = T.getHorde();
    const P = T.player.position;
    const home = { x: P.x, z: P.z };
    const stand = (x, z) => { T.player.position.set(x, T.sampleHeight(x, z), z); };
    // A zombie `d` m behind the marine's line (so it faces +Z, toward him), too tough to die of it.
    const spawnBehind = (type, d, x = P.x) => { const z = T.spawnZombie(x, P.z - d, type, true, true); z.hp = 9999; return z; };
    // Every event its body has from now on, and every state it passes through.
    // (and, given where it stood, how far back along -Z it was carried at most: the shove).
    const watch = (z, from = null) => {
      const b = H.body(z), rec = { ev: [], states: [], busy: false, back: 0 };
      const up = b.update;
      b.update = (dt, o) => { const e = up(dt, o); for (const x of e) rec.ev.push(x[0]); return e; };
      rec.poll = () => {
        const s = H.state(z); if (rec.states[rec.states.length - 1] !== s) rec.states.push(s); if (H.busy(z)) rec.busy = true;
        if (from !== null && z.mesh) rec.back = Math.max(rec.back, from - z.mesh.position.z);
      };
      return rec;
    };
    const runFor = async (secs, ...recs) => { const t0 = performance.now(); while (performance.now() - t0 < secs * 1000) { await frames(1); for (const r of recs) r.poll(); } };
    // The shotgun's shell on a body: seven pellets of 9, one shot number, as the projectile code sends
    // them. Pellets of 7 (the AA-12's) are the crowd's: under 8 they never take a limb off, and a body
    // with its legs shot off crawls, and a crawler keeps the old reaction.
    let shot = 1e6;
    const shell = (z, dist = 2, dmg = 9) => {
      const hy = z.mesh.position.y + 1.0; shot++;
      for (let i = 0; i < 7 && z.alive; i++) T.damageZombie(z, dmg, { kind: 'pellet', dir: { x: 0, z: -1 }, hitY: hy, dist, shot });
    };
    T.restartGraceDbg();
    await frames(3);

    // The mapping (docs/drafts/horde.md): a rifle round ~2.5, a close shell ~6.5, a grenade ~8.
    const rifle = T.reactionPower('bullet', 19, { dist: 5 }), close = 7 * T.reactionPower('pellet', 9, { dist: 2 }), nade = T.reactionPower('explosive', 55, { blast: 0 });
    ok(Math.abs(rifle - 2.5) < 0.15 && Math.abs(close - 6.5) < 0.1 && Math.abs(nade - 8) < 1e-6, `powers: an M4 round ${rifle.toFixed(2)}, a close shell ${close.toFixed(2)}, a grenade ${nade.toFixed(2)}`);

    // A real shell from the shotgun: its seven pellets carry one shot number.
    T.grantAllWeapons();
    for (let i = 0; i < 20; i++) { T.setWeapon(i); if (T.getCurrentWeapon() === 'shotgun') break; }
    await wait(600);
    // Every projectile the shot spawns (they can hit the ground and be gone before a frame is out).
    const spawned = [], arr = T.projectiles, push = arr.push;
    arr.push = function (...a) { spawned.push(...a); return push.apply(this, a); };
    T.setMouseFireDbg(true); await frames(4); T.setMouseFireDbg(false);
    arr.push = push;
    const pellets = spawned.filter((p) => p.kind === 'pellet');
    ok(pellets.length === 7 && pellets.every((p) => p.shot === pellets[0].shot && p.shot > 0), `a fired shell's pellets share a shot number (${pellets.length} pellets, shots ${[...new Set(pellets.map((p) => p.shot))].join(',')})`);
    await wait(500);

    // 1. A close shell on a shambler: it staggers or goes down, and it gets up again.
    const sh = spawnBehind('shambler', 2.2);
    await frames(4);
    const z0 = sh.mesh.position.z;
    shell(sh);
    const w1 = watch(sh, z0);
    await runFor(4.5, w1);
    const hits1 = w1.ev.filter((e) => e === 'hit').length;
    ok(hits1 === 1, `seven pellets are one push (${hits1} hit events)`);
    ok(w1.ev.includes('fall') || w1.ev.includes('stagger'), 'a close shell staggers or drops a shambler: ' + w1.ev.join(' '));
    ok(w1.ev.includes('recovered') && H.state(sh) === 'animated', 'and it gets up again: ' + w1.states.join(' > '));
    ok(w1.back > 0.25, `the shell carried it back ${w1.back.toFixed(2)} m (it got up ${(z0 - sh.mesh.position.z).toFixed(2)} m back)`);
    if (w1.ev.includes('fall')) ok(w1.busy, 'while it was down the horde had it (busy: no walking, turning or attacking)');

    // 2. A rifle round only flinches it.
    const rf = spawnBehind('shambler', 5);
    await frames(4);
    T.damageZombie(rf, 19, { kind: 'bullet', dir: { x: 0, z: -1 }, hitY: rf.mesh.position.y + 1.2, dist: 5 });
    const w2 = watch(rf);
    await runFor(2.5, w2);
    ok(w2.ev.includes('hit') && w2.ev.includes('recovered') && !w2.ev.includes('fall') && !w2.busy, 'a rifle round is a flinch: ' + w2.ev.join(' '));

    // 3. A brute shrugs off the close shell.
    const br = spawnBehind('brute', 8);
    await frames(4);
    shell(br);
    const w3 = watch(br);
    await runFor(2.5, w3);
    ok(w3.ev.includes('hit') && !w3.ev.includes('fall') && !w3.ev.includes('stagger'), 'a brute shrugs off a close shell: ' + w3.ev.join(' '));

    // 4. A kill (an M4 round into a shambler with 19 left) leaves a corpse lying on the ground, and
    // frozen once it is still: within 4 s (P-71).
    const kz = spawnBehind('shambler', 11);
    await frames(4);
    kz.hp = 19;
    T.damageZombie(kz, 19, { kind: 'bullet', dir: { x: 0, z: -1 }, hitY: kz.mesh.position.y + 1.0, dist: 11 });
    const corpse = T.corpses.find((c) => c.rag === kz);
    ok(!kz.alive && !!corpse, 'the kill is a ragdoll corpse (not the old topple)');
    const t4 = performance.now();
    while (corpse && !corpse.settled && performance.now() - t4 < 6000) await frames(1);
    const settledIn = (performance.now() - t4) / 1000;
    if (corpse) {
      const pel = H.body(kz).points().pelvis, gy = T.sampleHeight(pel[0], pel[2]);
      ok(corpse.settled && H.frozen(kz) && settledIn < 4, `it settles and is frozen (${settledIn.toFixed(1)} s)`);
      ok(pel[1] - gy < 0.35, `lying: the pelvis ${(pel[1] - gy).toFixed(2)} m off the ground`);
      const hips = corpse.mesh.userData.hips, q0 = hips.quaternion.clone(), p0 = hips.position.clone();
      await frames(10);
      ok(hips.quaternion.equals(q0) && hips.position.equals(p0), 'frozen: its pose stays put');
    }

    // 5. The marine: a brute's blow staggers him and he keeps his feet (and control, slowed).
    T.clearZombies();
    stand(home.x, home.z);
    T.setAimYawDbg(0);          // he faces +Z too (see the top)
    T.setHp(100);
    T.restartGraceDbg();
    await frames(3);
    const hb = T.spawnZombie(P.x + 1.1, P.z, 'brute', true, true);
    await frames(3);
    T.damagePlayer(16, 'brute', hb);
    const M = T.marine;
    const w5 = H.body(M) ? watch(M) : null;
    let slowed = false, floored5 = false;
    if (w5) {
      const t5 = performance.now();
      while (performance.now() - t5 < 2500) { await frames(1); w5.poll(); if (T.marineReactK() < 1 && T.marineReactK() > 0) slowed = true; if (T.marineFloored()) floored5 = true; }
    }
    ok(!!w5 && w5.ev.includes('hit') && (w5.ev.includes('stagger') || w5.ev.includes('step')) && !w5.ev.includes('fall'), 'a brute\'s blow staggers the marine and he keeps his feet: ' + (w5 ? w5.ev.join(' ') : 'no body'));
    ok(slowed && !floored5 && T.marineReactState() === 'animated', 'he keeps control while he staggers (slowed), and it passes');

    // 6. A bomber at 1 m puts him down, and he is up again within 1.5 s of landing.
    T.clearZombies();
    stand(home.x, home.z);
    T.setHp(100);
    await frames(3);
    const bomber = T.spawnZombie(P.x, P.z - 1.0, 'bomber', true, true);
    await frames(3);
    T.killZombie(bomber, false, { kind: 'bullet', dir: { x: 0, z: 0 } });
    const w6 = H.body(M) ? watch(M) : null;
    let downAt = 0, upAt = 0, floored6 = false;
    if (w6) {
      const t6 = performance.now();
      while (performance.now() - t6 < 4000) {
        await frames(1); w6.poll();
        const s = T.marineReactState();
        if (T.marineFloored()) floored6 = true;
        if (!downAt && s === 'down') downAt = performance.now();
        if (downAt && !upAt && s === 'animated') upAt = performance.now();
      }
    }
    ok(!!w6 && w6.ev.includes('down') && w6.ev.includes('recovered'), 'a bomber at 1 m puts him down and he gets up: ' + (w6 ? w6.ev.join(' ') : 'no body'));
    ok(floored6 && downAt && upAt && (upAt - downAt) / 1000 < 1.5, `up again ${downAt && upAt ? ((upAt - downAt) / 1000).toFixed(2) : '?'} s after he landed; no control while he was down`);
    ok(T.marineReactK() === 1 && T.getHp() > 0, 'control is his again');

    // 7. 48 zombies, 8 of them reacting: the horde stays inside its bound.
    T.clearZombies();
    stand(home.x, home.z);
    T.restartGraceDbg();
    const crowd = [];
    // On dry ground (a body in the water doesn't react: it keeps the old flinch).
    for (let i = 0; crowd.length < 48 && i < 400; i++) {
      const a = i * 2.39996, r = 9 + (i % 5) * 2.5;
      const x = P.x + Math.cos(a) * r, zz = P.z + Math.sin(a) * r;
      if (T.waterDepthAt(x, zz) > 0.3) continue;
      const z = T.spawnZombie(x, zz, 'shambler', true, true);
      if (z) { z.hp = 9999; crowd.push(z); }
    }
    await wait(1500);
    const idleFps = T.perfSnapshot().fps;
    // Everyone takes a hit first (three meshes adopt a frame), then eight at a time are kept reacting.
    for (let f = 0; f < 30; f++) { for (const z of crowd) if (!H.has(z)) T.damageZombie(z, 7, { kind: 'pellet', dir: { x: 0, z: -1 }, hitY: z.mesh.position.y + 1, dist: 12, shot: ++shot }); await frames(1); }
    let ms = 0, n = 0, most = 0, awakeSum = 0, fpsMin = Infinity;
    const t7 = performance.now();
    for (let f = 0; performance.now() - t7 < 4000; f++) {
      if (f % 12 === 0) for (let i = 0; i < 8; i++) shell(crowd[((f / 12) * 8 + i) % crowd.length], 6, 7);
      await frames(1);
      const s = H.stats; ms += s.ms; n++; awakeSum += s.awake; most = Math.max(most, s.awake);
      if (performance.now() - t7 > 1200) fpsMin = Math.min(fpsMin, T.perfSnapshot().fps);
    }
    const avg = ms / Math.max(1, n), perBody = ms / Math.max(1, awakeSum);
    ok(crowd.length === 48 && H.stats.attached >= 48 && H.stats.active <= 8 && most >= 6 && most <= 8, `48 zombies, at most 8 reacting at once (up to ${most} awake a frame; ${H.stats.attached} adopted, ${H.stats.active} in the pool at the end; ${H.stats.refused} hits refused and played the old way)`);
    // The bound is on the horde's own time per reacting body. This stand-in for three.js runs its maths
    // through proxies, about 25 times slower than three.js itself (motion-horde.test.mjs holds the real
    // figure: 48 attached and 8 reacting in about 0.4 ms a frame; the budget is 0.07 ms a body).
    ok(perBody < 4, `the horde costs ${perBody.toFixed(2)} ms a reacting body a frame here (${avg.toFixed(1)} ms a frame on average): bound 4 ms in this stand-in; frames ${idleFps.toFixed(0)} fps idle, ${fpsMin.toFixed(0)} fps at the slowest second with 8 reacting`);

    // --- Off -----------------------------------------------------------------------------
    T.clearZombies();
    T.runDevCommand('reactions off');
    ok(T.getReactions() === false && H.stats.attached === 0, 'turned off, every body is let go');
    T.restartGraceDbg();
    const off = spawnBehind('shambler', 2.2);
    await frames(4);
    shell(off);
    ok(!H.has(off) && off.hitReact > 0 && Math.hypot(off.staggerVX, off.staggerVZ) > 0.5, 'with reactions off a shell plays the old flinch and kick, and the horde never sees it');
    const offKill = spawnBehind('shambler', 5);
    await frames(4);
    T.damageZombie(offKill, 99999, { kind: 'bullet', dir: { x: 0, z: -1 }, hitY: offKill.mesh.position.y + 1.0, dist: 5 });
    const oc = T.corpses[T.corpses.length - 1];
    ok(!!oc && oc.rag === null && !H.has(offKill), 'and a kill topples the old way');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
