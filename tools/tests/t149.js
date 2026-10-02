// t149 - GB-91 (P-65, D-52) as GB-116 (story v2) replaced it: what the survivors (GB-90) do for the rest of the run.
// GB-116 moved the trapper's repair cut to Pike (the hikers' survivor): 75% once she's on the roof. It dropped the medic's
// 50% regen (Okafor heals him to full once a day instead) and the ranger's free turret (Brandt fires the M240B from the
// roof); t156 covers the roof. A run reset ends it all. GB-115: a gifted piece (b.gift) still refunds nothing when
// scrapped; no survivor hands one out now, so this marks a bought turret. Survivors come through survivorHelpDbg.grant
// (taken in and on the roof at once; t148 covers taking one in).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'survivor-roof') ev.push(detail); });
  const H = () => T.survivorHelpDbg;
  const gifts = () => T.builds.filter((b) => b.gift && b.alive !== false);
  try {
    await startMatch(T, 'Helpers');
    T.clearZombies();
    const max = () => { H().setHp(1); return H().regen(60); };
    const dmg = { maxHp: 100, hp: 0 };
    // Before anyone is taken in.
    const cap0 = max();
    ok(H().regenCapFrac() === 0.4 && cap0 > 1 && T.getHp() === cap0, 'nobody yet: regen stops at 40% (' + cap0.toFixed(1) + ' hp)');
    ok(H().repairCostOf(dmg) === 12, 'nobody yet: a 100-hp repair costs 12');
    ok(gifts().length === 0, 'nobody yet: no gifted piece');
    // Pike (the hikers').
    H().grant('hikers');
    ok(ev.some((e) => e.who === 'pike' && e.style === 'hikers'), 'survivor-roof {pike, hikers}');
    ok(H().repairCostOf(dmg) === 9 && H().repairCostOf({ maxHp: 100, hp: 99 }) === 1, 'Pike: a 100-hp repair costs 9 (75%), never under 1');
    const cap1 = max();
    ok(H().regenCapFrac() === 0.4 && cap1 === cap0, 'GB-116: no medic regen any more, still 40% (' + cap1.toFixed(1) + ' hp)');
    H().setHp(cap1 + 10); H().regen(60);
    ok(T.getHp() === cap1 + 10, 'regen never lowers hp above the cap');
    // Okafor (the trapper's) no longer cuts repairs.
    H().grant('trapper');
    ok(H().repairCostOf(dmg) === 9 && H().regenCapFrac() === 0.4, 'Okafor: repairs stay at Pike\'s 9, regen at 40%');
    // Brandt (the rangers') sets up no turret.
    const n0 = T.builds.length;
    H().grant('ranger');
    ok(T.builds.length === n0 && gifts().length === 0, 'GB-116: Brandt sets up no free turret');
    // GB-115: a gifted piece refunds nothing; upgrades bought on it still do.
    const c0 = T.gridIndex(-9), r0 = T.gridIndex(0);
    let gb = null;
    for (let dx = 0; dx <= 6 && !gb; dx++) for (let dz = -6; dz <= 6 && !gb; dz++) {
      const gx = c0 - dx, gz = r0 + dz;
      if (T.resolveTarget('light', gx, gz, 0, null).refusal) continue;
      gb = T.placeBuildAt('light', gx, gz, 0);
    }
    ok(!!gb, 'a light turret placed by the HQ');
    if (gb) {
      gb.gift = 'test';
      ok(T.scrapRefund(gb) === 0, 'a gifted turret refunds nothing (' + T.scrapRefund(gb) + ')');
      gb.gift = null; const bought = T.scrapRefund(gb); gb.gift = 'test';
      ok(bought > 0, 'the same turret, bought, would refund ' + bought);
      gb.upgradeSpent = 45; const up = T.scrapRefund(gb); gb.upgradeSpent = 0;
      ok(up > 0 && up < bought + 45, 'an upgrade bought on it refunds ' + up);
      gb.gift = null; T.removeBuild(gb);
    }
    // A run reset ends it all.
    T.resetGame(); await wait(300);
    ok(T.getSurvivors().length === 0 && T.roofDbg.crew().length === 0 && H().regenCapFrac() === 0.4 && H().repairCostOf(dmg) === 12 && gifts().length === 0, 'reset: nobody on the roof, 40% regen, full repair price');
    await startMatch(T, 'Helpers2');
    H().grant('hikers');
    ok(H().repairCostOf(dmg) === 9, 'a new run: Pike cuts repairs again');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
