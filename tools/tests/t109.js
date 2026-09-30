// t109 - GB-77 (P-28): shoot a bomber in the crowd and the chain is his: every kill of its blast (and of the
// bombers it sets off) feeds his streak and pays at his rate. A bomber a turret kills, or one that goes off
// on its own, still counts for nothing, and no bomber blast pokes a cave.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Chain');
    await until(() => T.getPoiGuards().zombies.length > 0, 8000);
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const put = (type, dx, dz) => { const z = T.spawnZombie(P.x + dx, P.z + dz, type, true, true); z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = z.maxHp = 5; return z; };
    const crowd = (ox) => [put('bomber', ox, 20), put('shambler', ox + 0.8, 20), put('shambler', ox - 0.8, 20.4), put('bomber', ox + 2.2, 20), put('shambler', ox + 3, 20.5), put('shambler', ox + 2.4, 21)];
    const shoot = (z, defense) => T.damageZombie(z, 1e4, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + 0.6, defense });
    // His shot.
    const a = crowd(0);
    T.setCombo(0);
    shoot(a[0], false);
    await wait(100);
    const dead = a.filter((z) => !z.alive).length;
    ok(dead === a.length, 'the chain takes the crowd: ' + dead + '/' + a.length);
    ok(T.getCombo() === a.length, 'the streak rises by the whole chain: ' + T.getCombo() + ' (want ' + a.length + ')');
    // A turret's kill: nothing for the streak, the blast's kills included.
    const b = crowd(-12);
    T.setCombo(0);
    shoot(b[0], true);
    await wait(100);
    ok(b.every((z) => !z.alive) && T.getCombo() === 0, 'a bomber a turret kills: the chain still goes off, the streak stays ' + T.getCombo());
    // No poke: a chain he sets off at a cave mouth leaves the cave calm.
    const cv = T.POI.caves[0];
    if (cv) {
      const pokeSig = () => { const st = T.getCavePokeState(); return JSON.stringify({ used: (st.used || []).slice(), warned: !!st.warned, warning: st.warning ? st.warning.caveIndex : null, chase: !!T.getCaveChase(), sk: !!T.getScriptedKill() }); };
      const before = pokeSig();
      const z = T.spawnZombie(cv.x + 1, cv.z + 1, 'bomber', true, true); z.riseT = 0; z.speed = z.baseSpeed = 0;
      shoot(z, false);
      await wait(100);
      const after = pokeSig();
      ok(before === after, 'a bomber he shoots at a cave mouth never pokes the cave ' + (before === after ? '' : before + ' -> ' + after));
    }
    T.clearZombies(); T.setCombo(0);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
