// t107 - GB-75 (P-26): brutes wear plates. Bullets, pellets, blades and the saw do 0.45 of their damage;
// a blast or the flame's own hit at least 0.9; the burn is full; a shambler takes what it always took.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Plates');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const mk = (type, dx) => { const z = T.spawnZombie(P.x + dx, P.z + 30, type, true, true); z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0; return z; };
    const hit = (z, amount, info) => { const h0 = z.hp; T.damageZombie(z, amount, { dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + (z.hitH || 1.4) * 0.45, ...info }); return h0 - z.hp; };
    const b = mk('brute', -4), s = mk('shambler', 4);
    ok(b.armored === true && !s.armored, 'the brute is armoured, the shambler is not');
    const ak = T.WEAPON_STATS.ak.damage;
    const dAk = hit(b, ak, { kind: 'bullet' });
    ok(dAk <= ak * 0.45 + 1e-6 && dAk >= ak * 0.44, 'an AK round on a brute: ' + dAk.toFixed(1) + ' of ' + ak + ' (at most 0.45)');
    const dPel = hit(b, 20, { kind: 'pellet' }), dBlade = hit(b, 40, { kind: 'melee' }), dSaw = hit(b, 30, { kind: 'chainsaw' });
    ok(Math.abs(dPel - 9) < 0.01 && Math.abs(dBlade - 18) < 0.01 && Math.abs(dSaw - 13.5) < 0.01, 'pellets, blades and the saw too: ' + [dPel, dBlade, dSaw].map((v) => v.toFixed(1)).join(', '));
    const dBoom = hit(b, 100, { kind: 'explosive' });
    ok(dBoom >= 90 - 1e-6, 'a launcher shell: ' + dBoom.toFixed(1) + ' of 100 (at least 0.9)');
    const dFlame = hit(b, 30, { kind: 'generic', fire: true });
    ok(dFlame >= 27 - 1e-6, 'the flame\'s own hit: ' + dFlame.toFixed(1) + ' of 30 (at least 0.9)');
    const sAk = hit(s, ak, { kind: 'bullet' }), sArm = T.ZOMBIE_TYPES.shambler.armor || 0;
    ok(Math.abs(sAk - ak * (1 - sArm)) < 1e-6, 'a shambler is unchanged: ' + sAk.toFixed(1) + ' (armour ' + sArm + ')');
    // The burn: the same per second on both.
    b.burnT = s.burnT = 10; const hb = b.hp, hs = s.hp;
    await wait(1200);
    const lb = hb - b.hp, ls = hs - s.hp;
    ok(lb > 0 && ls > 0 && Math.abs(lb - ls) / ls < 0.15, 'the burn is full on a brute: ' + lb.toFixed(1) + ' vs a shambler ' + ls.toFixed(1));
    T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
