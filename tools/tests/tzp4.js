// tzp4 - J154 Zombie Pass 4 call site (Claude 2, with Claude 5's game/zombie-react.js, zombie-clips.js, zombie-falls.js).
// A rifle round puts a snap into the reaction layer and it settles back to nothing; an explosion knocks a shambler down on
// the fall clip (not the old plank: its body is not pitched), the hit column follows it down and is back to its height
// when it is up, the clip ends inside knockDur, it walks again after; a brute keeps its keyed get-up; nothing throws.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m); const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'ZP4 call site');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const still = (type, dx, dz) => { const z = T.spawnZombie(P.x + dx, P.z + dz, type, true, true); if (z) { z.riseT = 0; z.hp = z.maxHp = 1e5; z.speed = z.baseSpeed = 0; } return z; };
    // 1. a rifle round: the layer wakes, then sleeps with nothing left on the bones
    let z = still('shambler', 0, 6);
    await wait(400);
    T.damageZombie(z, 20, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + (z.hitH || 1.6) * 0.6 });
    const woke = !!(z._react && z._react.awake);
    // on game time (the test page can run a few frames a second): 4 s of game, 30 s of wall at most
    let slept = false; const t0 = performance.now(), g0 = T.getSimTime();
    while (T.getSimTime() - g0 < 4 && performance.now() - t0 < 30000) { await wait(50); if (z._react && !z._react.awake) { slept = true; break; } }
    ok(woke && slept, 'a rifle round snaps the reaction layer awake and it settles back to sleep (' + woke + ', ' + slept + ')');
    // 2. an explosion: the shambler goes down on the fall clip
    T.clearZombies(); await wait(100);
    z = still('shambler', 0, 6);
    await wait(400);
    const H0 = z.hitH;
    T.damageZombie(z, 30, { kind: 'explosive', dir: { x: 0, z: 1 } });
    const planned = !!z._fall, dur = z.knockDur;
    let minH = Infinity, maxPitch = 0, endedIn = null, frames = 0;
    const s0 = T.getSimTime ? T.getSimTime() : performance.now() / 1000;
    while (frames < 2000) {
      await new Promise((r) => requestAnimationFrame(r)); frames++;
      minH = Math.min(minH, z.hitH);
      maxPitch = Math.max(maxPitch, Math.abs(z.mesh.rotation.x || 0));
      if (!z._fall && !(z.knockT > 0)) { endedIn = (T.getSimTime ? T.getSimTime() : performance.now() / 1000) - s0; break; }
    }
    ok(planned && dur > 0, 'an explosion knocks a shambler down on the fall clip (planned ' + planned + ', knockDur ' + (dur || 0).toFixed(2) + ' s)');
    ok(minH < H0 * 0.6, 'its hit column follows it down (lowest ' + minH.toFixed(2) + ' of ' + H0.toFixed(2) + ' m)');
    ok(maxPitch < 0.05, 'its body is not pitched like the old plank (largest pitch ' + maxPitch.toFixed(3) + ' rad)');
    ok(endedIn !== null && Math.abs(z.hitH - H0) < 1e-6, 'the clip ends and its hit column is its own height again (' + (endedIn === null ? 'never ended' : endedIn.toFixed(2) + ' s') + ', ' + z.hitH.toFixed(3) + ')');
    ok(endedIn !== null && endedIn <= dur + 0.25, 'within its knockDur (' + (endedIn || 0).toFixed(2) + ' vs ' + (dur || 0).toFixed(2) + ' s, a frame or two of slack)');
    // 2b. a body cleared while it is down: the next one on that pooled mesh starts clean (no clip, its own height)
    T.clearZombies(); await wait(100);
    let zd = still('shambler', 0, 6); await wait(400);
    const Hd = zd.hitH;
    T.damageZombie(zd, 30, { kind: 'explosive', dir: { x: 0, z: 1 } });
    for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r));
    const midFall = !!zd._fall && zd.hitH < Hd;
    T.clearZombies(); await wait(200);
    const zr = still('shambler', 0, 6); await wait(400);
    ok(midFall && !zr._fall && !(zr.knockT > 0) && Math.abs(zr.hitH - Hd) < 1e-6 && Math.abs(zr.mesh.rotation.x || 0) < 1e-6, 'a body cleared mid-fall: the next shambler starts standing at its own height (mid-fall ' + midFall + ', next hitH ' + zr.hitH.toFixed(3) + ' of ' + Hd.toFixed(3) + ', clip ' + !!zr._fall + ')');
    // 3. a brute keeps its keyed get-up (no clip)
    T.clearZombies(); await wait(100);
    const b = still('brute', 0, 6); await wait(400);
    T.damageZombie(b, 30, { kind: 'explosive', dir: { x: 0, z: 1 } });
    ok(!b._fall, 'a brute keeps its own keyed get-up (no fall clip: ' + !!b._fall + ', knockKeyed ' + !!b.knockKeyed + ')');
    T.clearZombies();
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
    T.resetGame();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
