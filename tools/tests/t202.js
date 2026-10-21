// t202 - GB-136 (D-77, Jerry's playthrough 1): the maimed dead. One leg off: it hops at 75% of its speed. Both legs off:
//  it crawls (35%, as before). Every limb off: it dies, killed by the hit that took the last one (no crawling torsos).
//  An arm or two off on its own changes nothing about its walk. (Claude animates the crawl and the hop in CL-129.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  try {
    await startMatch(T, 'Maimed');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    ok(typeof T.dismemberDbg === 'function' && T.MAIMED_HOP_MUL === 0.75, 'hooks: TT.dismemberDbg, MAIMED_HOP_MUL ' + T.MAIMED_HOP_MUL);
    const p = T.player.position;
    const mk = (dx) => { const z = T.spawnZombie(p.x + 40 + dx, p.z + 40, 'shambler', true, true); z.hp = z.maxHp = 1000; return z; };
    // One leg, then the other.
    const a = mk(0); const s0 = a.speed;
    ok(T.dismemberDbg(a, 'legL') && a.hopping === true && !a.crawling, 'one leg off: it hops');
    ok(Math.abs(a.speed / a.baseSpeed - 0.75) < 1e-9, 'at 75% of its speed: ' + f2(a.speed) + ' of ' + f2(a.baseSpeed) + ' (walked at ' + f2(s0) + ')');
    ok(T.dismemberDbg(a, 'legR') && a.crawling === true && a.hopping === false, 'the other leg off: it crawls, no hop');
    ok(Math.abs(a.speed / a.baseSpeed - 0.35) < 1e-9 && a.alive, 'crawling at 35% (' + f2(a.speed) + '), alive');
    // Arms alone: no change to the walk.
    const b = mk(3); const sb = b.speed;
    T.dismemberDbg(b, 'armL'); T.dismemberDbg(b, 'armR');
    ok(b.alive && b.speed === sb && !b.hopping && !b.crawling, 'both arms off, legs on: walks on at ' + f2(b.speed) + ', alive');
    // Three limbs off by hand, the last by a hit: the hit kills it.
    const c = mk(6);
    for (const k of ['armL', 'armR', 'legL']) T.dismemberDbg(c, k);
    ok(c.alive && c.hopping, 'three limbs off: still alive, hopping');
    T.damageZombie(c, 200, { kind: 'chainsaw', dir: { x: 0, z: 1 } });   // a saw step (18% of 1000) takes the last limb
    ok(c.partsLost.legR, 'the saw took the last leg');
    ok(!c.alive, 'no limbs left: it is dead (hp ' + f2(c.hp) + ', alive ' + c.alive + ')');
    // Legs first, arms after: the same.
    const d = mk(9);
    for (const k of ['legL', 'legR', 'armL']) T.dismemberDbg(d, k);
    ok(d.alive && d.crawling, 'no legs, one arm: it crawls');
    T.damageZombie(d, 200, { kind: 'chainsaw', dir: { x: 0, z: 1 } });
    ok(d.partsLost.armR && !d.alive, 'the last arm off: dead');
    // A body with its head still on but every limb gone never walks the field: none alive.
    await wait(300);
    ok(!T.zombies.some((z) => z.alive && z.partsLost && z.partsLost.armL && z.partsLost.armR && z.partsLost.legL && z.partsLost.legR), 'no limbless body left alive');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.clearZombies(); } catch (_) {}
  return out.join('\n');
})();
