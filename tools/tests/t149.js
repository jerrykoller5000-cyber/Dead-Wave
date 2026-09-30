// t149 - GB-91 (P-65, D-52): what the survivors (GB-90) do for the rest of the run. The hikers' medic lets regen reach
// 50% (not 40%); the trapper cuts repairs to 75%; the ranger sets up one free light turret by the HQ, once a run.
// A run reset ends it all. GB-115: the free turret refunds nothing when scrapped. The survivors are granted through
// survivorHelpDbg.grant (t148 covers taking one in).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'survivor-help') ev.push(detail); });
  const H = () => T.survivorHelpDbg;
  const gifts = () => T.builds.filter((b) => b.gift === 'ranger' && b.alive !== false);
  try {
    await startMatch(T, 'Helpers');
    T.clearZombies();
    const max = () => { H().setHp(1); return H().regen(60); };
    const dmg = { maxHp: 100, hp: 0 };
    // Before anyone is taken in.
    const cap0 = max();
    ok(H().regenCapFrac() === 0.4 && cap0 > 1 && T.getHp() === cap0, 'no medic: regen stops at 40% (' + cap0.toFixed(1) + ' hp)');
    ok(H().repairCostOf(dmg) === 12, 'no trapper: a 100-hp repair costs 12');
    ok(!H().giftTurret(), 'no ranger: no free turret');
    // The hikers' medic.
    H().grant('hikers');
    const cap1 = max();
    ok(H().regenCapFrac() === 0.5 && Math.abs(cap1 / cap0 - 1.25) < 1e-6, 'the medic: regen reaches 50% (' + cap1.toFixed(1) + ' hp)');
    ok(ev.some((e) => e.style === 'hikers' && e.help === 'regen'), 'survivor-help {hikers, regen}');
    H().setHp(cap1 + 10); H().regen(60);
    ok(T.getHp() === cap1 + 10, 'regen never lowers hp above the cap');
    ok(H().repairCostOf(dmg) === 12, 'the medic does not touch repairs');
    // The trapper.
    H().grant('trapper');
    ok(H().repairCostOf(dmg) === 9 && H().repairCostOf({ maxHp: 100, hp: 99 }) === 1, 'the trapper: a 100-hp repair costs 9 (75%), never under 1');
    ok(ev.some((e) => e.style === 'trapper' && e.help === 'repairs'), 'survivor-help {trapper, repairs}');
    // The ranger.
    const n0 = T.builds.length;
    H().grant('ranger');
    const g = H().giftTurret();
    ok(!!g && g.type === 'light' && T.builds.length === n0 + 1, 'the ranger: one free light turret (' + JSON.stringify(g) + ')');
    const hd = g ? Math.hypot(g.x, g.z) : 0;
    ok(!!g && hd > 6 && hd < 16, 'by the HQ: ' + hd.toFixed(1) + ' m from its centre');
    ok(ev.some((e) => e.style === 'ranger' && e.help === 'turret'), 'survivor-help {ranger, turret}');
    H().grant('ranger');
    ok(gifts().length === 1 && !H().owed(), 'a second ranger does not add another');
    // GB-115: scrapping the free turret pays nothing back; upgrades bought on it still do.
    const gb = gifts()[0];
    ok(T.scrapRefund(gb) === 0, 'the free turret refunds nothing (' + T.scrapRefund(gb) + ')');
    gb.gift = null; const bought = T.scrapRefund(gb); gb.gift = 'ranger';
    ok(bought > 0, 'the same turret, bought, would refund ' + bought);
    gb.upgradeSpent = 45; const up = T.scrapRefund(gb); gb.upgradeSpent = 0;
    ok(up > 0 && up < bought + 45, 'an upgrade bought on it refunds ' + up);
    // A run reset ends it all.
    T.resetGame(); await wait(300);
    ok(T.getSurvivors().length === 0 && H().regenCapFrac() === 0.4 && H().repairCostOf(dmg) === 12 && gifts().length === 0 && !H().owed(), 'reset: 40% regen, full repair price, no gift turret');
    await startMatch(T, 'Helpers2');
    H().grant('ranger');
    ok(gifts().length === 1, 'a new run: the ranger can set one up again');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
