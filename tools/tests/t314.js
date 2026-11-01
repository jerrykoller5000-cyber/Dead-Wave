// t314 - CU-201: each HQ utility is earned from its lead, waits when it must, and comes on when it can.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    if (!T.utilityDbg || !T.worldChangeDbg || !T.runDevCommand) { ok(false, 'the utility hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Utilities');
    T.clearZombies && T.clearZombies();
    const U = T.utilityDbg, S = () => U.read().state;
    ok(U.on() === false, 'the timer page starts with the utilities off');
    ok(U.on(true) === true, 'a check can turn them on');
    T.runDevCommand('story gate on');
    T.stockNoticeDbg.setDay(2);
    await wait(50);
    ok(T.worldChangeDbg.powered() === false, 'day 2, before the generator lead, the HQ is dark');
    U.lead('missing');
    ok(S().plumbing === 'earned' && U.why('plumbing') === 'needs:power', 'the pump is earned and waiting on power (' + U.why('plumbing') + ')');
    ok(U.install('plumbing') === false, 'the pump cannot be fitted without power');
    const lit = U.lead('generator');
    ok(S().power === 'on' && lit.indexOf('power') >= 0, 'the generator lead brings the power on');
    ok(T.worldChangeDbg.powered() === true, 'hqPowered reads that one truth');
    ok(U.why('plumbing') === 'install', 'with power, the pump is ready to fit');
    ok(U.install('plumbing') === true && S().plumbing === 'on', 'fitting the pump turns the water on');
    U.step(30);
    ok(U.tank() > 0.4 && U.tank() < 0.7, 'the tank has risen about halfway in half a minute (' + U.tank().toFixed(2) + ')');
    const pump = U.spots().pump;
    const fire = T.spawnGroundFire(pump.x + 3, pump.z, false, 0, true);
    ok(!!fire, 'a fire is within reach of the hose');
    ok(U.hose() > 0, 'the hose marks that fire out');
    U.lead('truck');
    ok(U.why('workshop') === 'install', 'the bench is waiting on Clarke\'s battery');
    const cost = U.cost();
    ok(U.install('workshop') === true && S().workshop === 'on', 'fitting the battery powers the bench');
    ok(U.cost() === cost * 0.75, 'repairs at the bench cost less (' + U.cost() + ')');
    U.lead('search');
    ok(U.why('alarm') === 'install', 'the roof socket is waiting on the siren');
    ok(U.install('alarm') === true && S().alarm === 'on', 'fitting the siren turns it on');
    const shoes = U.lead('oldman');
    ok(S().iron === 'on' && shoes.indexOf('iron') >= 0 && U.supply() === 4, 'the old man\'s lead hangs four horseshoe sets');
    const row = document.getElementById('ironStat'), num = document.getElementById('ironCount');
    ok(!!row && !row.hidden && num.textContent === '4', 'the HUD counts them (' + (num && num.textContent) + ')');
    ok(U.lead('relay').indexOf('comms') >= 0 && S().comms === 'on', 'the relay lead brings communications on');
    ok(U.lead('medical').indexOf('infirmary') >= 0 && S().infirmary === 'on', 'the medical lead brings the infirmary on');
    const saved = U.read();
    U.reset();
    ok(S().power === 'off' && S().plumbing === 'off' && U.supply() === 0, 'a reset puts every utility off');
    ok(U.spots() && Number.isFinite(U.spots().pump.x) && Number.isFinite(U.spots().siren.y), 'the pump and the siren have places');
    ok(saved.state.iron === 'on', 'the snapshot kept the iron (' + saved.state.iron + ')');
  } catch (e) {
    ok(false, 't314 threw: ' + String((e && e.stack) || e).slice(0, 400));
  }
  return out.join('\n');
})()
