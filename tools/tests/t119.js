// t119 - GB-104 (P-119, D-62): every kind has a weakness. One hit of each damage type (bullet, pellet, fire, blast,
// blade, crush) on each kind takes the share in game/weaknesses.js's WEAKNESS table, within 1%. A cave role stacks
// on top (an iron-cave military takes 0.63 of a bullet; a wet-cave demon's fire stays at the 0.2 floor); the burn
// tick reads the table (the brute's burn is full); a hit with no type (the shock beacon) keeps the old flat armour.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const TYPES = { bullet: { kind: 'bullet' }, pellet: { kind: 'pellet' }, fire: { kind: 'generic', fire: true },
    blast: { kind: 'explosive' }, blade: { kind: 'melee' }, crush: { kind: 'crush' } };
  try {
    await startMatch(T, 'Weakness');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position, W = T.WEAKNESS;
    ok(W && Object.keys(W).length === 13 && Object.isFrozen(W), 'the table is game/weaknesses.js\'s frozen WEAKNESS (13 kinds)');
    let n = 0;
    const fresh = (kind, dx) => {
      const z = T.spawnZombie(P.x + dx, P.z + 30, kind, true, true);
      z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = z.maxHp = 1e7;
      return z;
    };
    // One hit of 10 of a type: how much came off (the head-gone x1.15 accounted for if a hit took the head).
    const hit = (z, t) => {
      const headGone = !!(z.partsLost && z.partsLost.head);
      const h0 = z.hp;
      T.damageZombie(z, 10, { ...TYPES[t], dir: { x: 0, z: 1 }, defense: true });
      return (h0 - z.hp) / 10 / (headGone ? 1.15 : 1);
    };
    for (const kind of Object.keys(W)) {
      if (kind === 'guardian') continue;   // the fightable guardian is a scripted spawn; its row is checked below
      const z = fresh(kind, (n++ % 7) * 3 - 9);
      const bad = [];
      for (const t of Object.keys(TYPES)) {
        const got = hit(z, t), want = W[kind][t];
        if (!(Math.abs(got - want) <= want * 0.01)) bad.push(t + ' ' + got.toFixed(3) + ' (table ' + want + ')');
      }
      ok(bad.length === 0, kind + ': all six types take the table share' + (bad.length ? ': ' + bad.join(', ') : ''));
      T.clearZombies();
    }
    // The guardian's row, through weakShare (the same function damageZombie uses).
    const g = { typeKey: 'guardian' };
    ok(Object.keys(TYPES).every((t) => Math.abs(T.weakShare(g, t) - W.guardian[t]) < 1e-9), 'guardian: weakShare gives its row');
    // Cave roles stack on top.
    const mil = fresh('military', 0);
    T.applyCaveRole(mil, 'iron');
    const milB = hit(mil, 'bullet');
    ok(mil.roleArmorAdd > 0 && Math.abs(milB - 0.63) <= 0.0063, 'an iron-cave military takes 0.63 of a bullet (' + milB.toFixed(3) + ')');
    T.clearZombies();
    const dem = fresh('demon', 0);
    T.applyCaveRole(dem, 'wet');
    const demF = hit(dem, 'fire');
    ok(dem.roleFireAdd > 0 && Math.abs(demF - T.WEAK_MIN) <= 0.002, 'a wet-cave demon\'s fire stays at the floor ' + T.WEAK_MIN + ' (' + demF.toFixed(3) + ')');
    T.clearZombies();
    // The burn tick reads the table.
    ok(T.weakShare({ typeKey: 'brute' }, 'burn') === 1 && T.weakShare({ typeKey: 'spider' }, 'burn') === W.spider.fire &&
      T.weakShare({ typeKey: 'demon' }, 'burn') === W.demon.fire, 'the burn: brute full, spider and demon their Fire column');
    // No type: the old flat armour.
    const sh = fresh('military', 0);
    const armor = T.ZOMBIE_TYPES.military.armor || 0;
    const h0 = sh.hp; T.damageZombie(sh, 10, { kind: 'generic', dir: { x: 0, z: 1 }, defense: true });
    const gen = (h0 - sh.hp) / 10;
    ok(T.weakTypeOf('generic', {}) === null && Math.abs(gen - (1 - armor)) <= 0.01, 'a shock (no type) keeps the flat armour: ' + gen.toFixed(3) + ' (1 - ' + armor + ')');
    T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
