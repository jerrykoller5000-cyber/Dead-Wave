// t137 - GB-113, D-86, D-93: kill skulls pay full value through night 7, then lose 6% per night to a 40% floor from
// night 17 (D-93, Jerry 2026-10-26: "Money ending at roughly $4,200"; D-86's was 4% from night 9 to 60%).
// The floor holds on endless nights. The night's other multipliers
// (blood moon, the dare) still stack on top. Measured on the skull a kill actually drops.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'LateCash');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    ok(T.ZOMBIE_TYPES.shambler.cashDrop === 2, 'D-86: a normal shambler carries 2 skulls');
    ok(T.BUILD_UNLOCK_PRICE.m240 === 260, 'D-86: Watchman blueprint costs $260');
    ok(T.LATE_CASH_NIGHT === 8 && T.LATE_CASH_FACTOR === 0.40 && T.LATE_CASH_STEP === 0.06, 'the trim: starts night ' + T.LATE_CASH_NIGHT + ', loses ' + T.LATE_CASH_STEP + ' a night to x' + T.LATE_CASH_FACTOR);
    ok([[1, 1], [7, 1], [8, .94], [9, .88], [10, .82], [11, .76], [14, .58], [17, .40], [20, .40], [27, .40]].every(([n, want]) => Math.abs(T.lateCashMul(n) - want) < 1e-9),
      'nights 1-7 x1; 8-17 ramp to x0.40 (D-93); endless nights hold x0.40');
    // A shambler worth 100 killed 20 m off (past the zip) with no streak: the skull it drops, and the meter.
    const killPays = () => {
      const z = T.spawnZombie(P.x + 20, P.z + 20, 'shambler', true, true);
      z.riseT = 0; z.cashDrop = 100;
      const n = T.cashDrops.length, m0 = T.skullValueDbg();
      T.killZombie(z);
      const d = T.cashDrops.length > n ? T.cashDrops[T.cashDrops.length - 1] : null;
      return { v: d ? d.value : null, meter: T.skullValueDbg() - m0 };
    };
    const nightOf = async (d) => {
      T.clearZombies(); T.setDay(d - 1); T.startPrep(); T.skipGrace && T.skipGrace();
      T.beginWave(); T.clearZombies(); await wait(300);
      return T.getWaveDirectorState().day;
    };
    for (const [d, want] of [[7, 100], [8, 94], [9, 88], [10, 82], [11, 76], [14, 58], [18, 40], [20, 40], [23, 40]]) {   // D-93
      const got = await nightOf(d);
      const mul = T.nightPayMul();
      const k = killPays();
      const expect = Math.floor(want * mul + 1e-6);
      ok(got === d && k.v != null && Math.abs(k.v - expect) <= 1 && k.meter === k.v,
        'night ' + got + ': a 100 skull kill drops ' + k.v + ' (want ' + expect + (mul !== 1 ? ', night pay x' + mul : '') + '; meter +' + k.meter + ')');
    }
    // The table itself is untouched: the trim is applied at the kill, not by rewriting cashDrop.
    const z = T.spawnZombie(P.x + 25, P.z, 'colossus', true, true);
    ok(z.cashDrop === 120, 'the colossus still carries cashDrop 120 in the table (' + z.cashDrop + ')');
    T.clearZombies();
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
