// t97 - GB-74 (P-22, D-52): streaks heal. From the 5th kill of a streak, each of the marine's own kills gives
// back 1 HP (2 from the 20th), up to 70% of max. Past 70% it does nothing (and never takes any away). A trap or
// turret kill (a defence kill) neither counts nor heals. Natural regen still stops at 40%. The combo line says
// "kills heal" once it does.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Streak');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace();
    const p = T.player.position;
    let n = 0;
    const mine = () => { const z = T.spawnZombie(p.x + 6 + (n++ % 5), p.z + 6, 'shambler', true, true); T.killZombie(z, true, { kind: 'generic', dir: { x: 0, z: 0 }, defense: false }); };
    const trap = () => { const z = T.spawnZombie(p.x + 6, p.z + 8, 'shambler', true, true); T.killZombie(z, true); };   // no deathInfo: a defence kill
    const max = T.getMaxHp ? T.getMaxHp() : 100;
    ok(T.STREAK_HEAL_CAP_FRAC === 0.7, 'the cap is 70% (' + T.STREAK_HEAL_CAP_FRAC + ')');

    // (1) Kills 1-4 of a streak heal nothing; the 5th heals 1.
    T.setCombo(3); T.setHp(30); mine();
    ok(T.getCombo() === 4 && T.getHp() === 30, 'the 4th kill: no heal (combo ' + T.getCombo() + ', HP ' + f2(T.getHp()) + ')');
    mine();
    ok(T.getCombo() === 5 && T.getHp() === 31, 'the 5th kill heals 1: HP 30 -> ' + f2(T.getHp()));
    mine();
    ok(T.getHp() === 32, 'and so does the 6th (' + f2(T.getHp()) + ')');

    // (2) From the 20th, 2 a kill.
    T.setCombo(18); T.setHp(30); mine();
    ok(T.getCombo() === 19 && T.getHp() === 31, 'the 19th kill heals 1 (' + f2(T.getHp()) + ')');
    mine();
    ok(T.getCombo() === 20 && T.getHp() === 33, 'the 20th heals 2 (' + f2(T.getHp()) + ')');

    // (3) The 70% cap.
    T.setCombo(25); T.setHp(0.7 * max - 0.5); mine();
    ok(Math.abs(T.getHp() - 0.7 * max) < 1e-9, 'half an HP under 70%: tops up to 70% exactly (' + f2(T.getHp()) + ')');
    mine();
    ok(Math.abs(T.getHp() - 0.7 * max) < 1e-9, 'at 70%: nothing (' + f2(T.getHp()) + ')');
    T.setHp(85); mine();
    ok(T.getHp() === 85, 'above 70% (85): nothing, and nothing taken (' + f2(T.getHp()) + ')');

    // (4) A trap kill: no streak, no heal.
    T.setCombo(10); T.setHp(30); trap();
    ok(T.getCombo() === 10 && T.getHp() === 30, 'a trap kill: combo stays 10, HP stays 30 (' + T.getCombo() + ', ' + f2(T.getHp()) + ')');

    // (5) The combo line.
    T.setCombo(6); await wait(200);
    const line = (document.querySelector('#combo .m') || {}).textContent || '';
    ok(/kills heal/.test(line), 'at 6 the combo line says so ("' + line + '")');
    ok(T.streakHealHp() === 1, 'streakHealHp at 6: 1');
    T.setCombo(3); await wait(100);
    ok(T.streakHealHp() === 0, 'at 3: 0');

    // (6) Regen still stops at 40%.
    T.setCombo(0); T.setHp(35); await wait(4000);
    ok(Math.abs(T.getHp() - 0.4 * max) < 0.01, 'regen from 35 stops at 40% (' + f2(T.getHp()) + ')');

    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()