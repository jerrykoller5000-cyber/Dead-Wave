// t273 - CL-244 (D-86, Jerry's balance pass): from night 11 a zombie's hit on the player lands harder, +2.5 % a night
// (x1.25 on night 20, x1.5 at most past it), so the late nights are deadlier a minute and not only longer. A zombie kind's
// hit, a blast or ability it owns, and acid scale; fire, falls and his own blasts don't. docs/specs/balance-1.0.md.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  let day0 = null;
  try {
    const M = T.zombieHitNightMul;
    ok(typeof M === 'function', 'TT.zombieHitNightMul is there');
    if (typeof M !== 'function') return out.join('\n');
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    ok(M(1) === 1 && M(10) === 1 && near(M(11), 1.025) && near(M(15), 1.125) && near(M(20), 1.25) && M(40) === 1.5,
      'x1 to night 10, x1.025 on 11, x1.125 on 15, x1.25 on 20, x1.5 at most (' + [1, 10, 11, 15, 20, 40].map(M).join(', ') + ')');

    await startMatch(T, 'Hit ramp');
    T.clearZombies && T.clearZombies();
    day0 = T.getDay();
    // No armour at the start of a run, no streak: what he loses is the hit.
    const hit = (night, amount, cause) => { T.setDay(night); T.setHp(100); const h0 = T.getHp(); T.damagePlayer(amount, cause); return Math.round((h0 - T.getHp()) * 1000) / 1000; };
    ok(T.getArmor() === 0, 'no armour to soak the hits (' + T.getArmor() + ')');
    const a = hit(5, 20, 'brute'), b = hit(10, 20, 'brute'), c = hit(20, 20, 'brute'), d = hit(15, 20, 'acid');
    ok(a === 20 && b === 20, 'a brute\'s 20 is 20 on nights 5 and 10 (' + a + ', ' + b + ')');
    ok(c === 25, 'and 25 on night 20 (' + c + ')');
    ok(d === 23, 'acid scales too: 20 is 23 on night 15 (' + d + ')');
    const e = hit(20, 20, 'fire'), f = hit(20, 20, 'blast'), g = hit(20, 3, 'spider');
    ok(e === 20 && f === 20, 'fire and his own blast don\'t: 20 and 20 on night 20 (' + e + ', ' + f + ')');
    ok(g === 4, 'a spider\'s 3 is 4 on night 20 (rounded, never below 1) (' + g + ')');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (err) {
    ok(false, 't273 threw: ' + String((err && err.stack) || err).slice(0, 300));
  } finally {
    if (day0 != null) T.setDay(day0);
    T.setHp && T.setHp(100);
  }
  return out.join('\n');
})()
