// t249 - CU-127 and D-86: Jerry's New-Hit.xlsx. A tagged body hit deals that percent of
// this body's own max health. 100 is the whole bar. A Military helmet scales up from the chest number.
// An untagged hit still uses the weakness table.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Hits');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    let n = 0;
    const mk = (type) => {
      const z = T.spawnZombie(P.x + (n++ * 3), P.z + 28, type, true, true);
      z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0;
      return z;
    };
    const bodyY = (z) => z.mesh.position.y + (z.hitH || 1.4) * 0.45;
    const hit = (z, weapon, kind, extra) => {
      const h0 = z.hp;
      const base = (T.WEAPON_STATS[weapon] && T.WEAPON_STATS[weapon].damage) || 26;
      T.damageZombie(z, base, Object.assign({
        kind, dir: { x: 0, z: 1 }, hitY: bodyY(z), hitWeapon: weapon, hitBase: base
      }, extra || {}));
      return h0 - z.hp;
    };
    const want = (weapon, type) => T.listedBodyDamage(weapon, type, undefined, 1e6);
    const near = (got, exp, label) => ok(Math.abs(got - exp) < 0.05, label + ': ' + got.toFixed(2) + ' (sheet ' + exp.toFixed(2) + ')');

    const sh = mk('shambler');
    near(hit(sh, 'pistol', 'bullet'), want('pistol', 'shambler'), 'pistol on a shambler');
    const raised = mk('feral'); raised.maxHp = raised.hp = 73;
    near(hit(raised, 'pistol', 'bullet'), 73, '100% pistol hit uses this feral\'s own 73 HP bar');
    ok(!raised.alive, '100% of the body\'s own max HP kills');
    const plain0 = sh.hp;
    T.damageZombie(sh, 10, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: bodyY(sh) });
    ok(Math.abs((plain0 - sh.hp) - 10) < 0.05, 'an untagged bullet of 10 still does 10 (' + (plain0 - sh.hp).toFixed(2) + ')');

    const mil = mk('military');
    near(hit(mil, 'pistol', 'bullet', { militaryZone: 'chest' }), want('pistol', 'military'), 'pistol on a military chest');
    near(hit(mil, 'pistol', 'bullet', { militaryZone: 'helmet' }), want('pistol', 'military') * 0.6 / 0.5, 'pistol on a military helmet');

    near(hit(mk('brute'), 'pistol', 'bullet'), want('pistol', 'brute'), 'pistol on a brute with its plates on');
    near(hit(mk('drowned'), 'flamer', 'generic', { fire: true }), want('flamer', 'drowned'), 'one flamethrower tick on a drowned');
    near(hit(mk('shambler'), 'shotgun', 'pellet'), want('shotgun', 'shambler'), 'one shotgun pellet on a shambler');
    near(hit(mk('demon'), 'chainsaw', 'chainsaw', { hitScale: 1 }), want('chainsaw', 'demon'), 'one chainsaw bite on a demon');
    near(hit(mk('shambler'), 'knife', 'melee', { hitScale: 1 }), want('knife', 'shambler'), 'a knife swing on a shambler');
    near(hit(mk('colossus'), 'sniper', 'bullet'), want('sniper', 'colossus'), 'a sniper round on a colossus');

    T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
