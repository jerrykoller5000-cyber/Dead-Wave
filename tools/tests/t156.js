// t156 - GB-116 (story v2, D-70, docs/story.md 5): the survivors on the roof, in place of GB-91's helps. The camp says
// who: the trapper's Okafor, the rangers' Brandt, the hikers' Pike. Taken in, they're on the HQ roof from the next dawn,
// each at a post; asleep by day, standing to at the alarm and firing (Brandt the M240B, the others M4s) at the dead they
// can see near the HQ. Okafor heals him to full once a day (E beside her on the roof); Pike cuts repairs to 75% once
// she's back. No free turret, no medic regen. Nothing targets them. A run reset clears the roof.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && /^survivor-/.test(detail.type)) ev.push(detail); });
  const of = (type) => ev.filter((e) => e.type === type);
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const pressE = async () => { key('keydown'); await wait(120); key('keyup'); await wait(200); };
  const R = () => T.roofDbg, H = () => T.survivorHelpDbg;
  const crew = (who) => R().crew().find((c) => c.who === who);
  const dmg = { maxHp: 100, hp: 0 };
  try {
    ok(R().WHO.trapper === 'okafor' && R().WHO.ranger === 'brandt' && R().WHO.hikers === 'pike', 'trapper Okafor, rangers Brandt, hikers Pike');
    await startMatch(T, 'Roof');
    T.clearZombies();
    const L = T.hqLadderAt();
    const n0 = T.builds.length;
    const cap0 = H().regenCapFrac();
    // Taken in today: not on the roof until the next dawn, and no help yet.
    T.setDay(3); T.startPrep(); await wait(100);
    const d0 = T.getDay();
    ok(R().takeIn('trapper') === 'okafor' && R().takeIn('hikers') === 'pike', 'two taken in on day ' + d0);
    const res = of('survivor-rescued');
    ok(res.length === 2 && res[0].who === 'okafor' && res[1].who === 'pike' && res[1].count === 2, 'survivor-rescued carries who');
    ok(R().crew().length === 0 && T.getSurvivors().every((s) => s.roof === false), 'the same day: nobody on the roof yet');
    ok(H().repairCostOf(dmg) === 12, 'Pike not back yet: a 100-hp repair still costs 12');
    T.startPrep(); await wait(100);
    ok(T.getDay() === d0 + 1 && R().crew().length === 2 && !!crew('okafor') && !!crew('pike'), 'the next dawn: Okafor and Pike are on the roof');
    ok(of('survivor-roof').length === 2 && T.getSurvivors().every((s) => s.roof === true), 'survivor-roof x2; getSurvivors() says roof');
    ok(JSON.stringify(T.getSurvivors()).length > 10, 'getSurvivors() stays plain data');
    ok(H().repairCostOf(dmg) === 9 && H().repairCostOf({ maxHp: 100, hp: 99 }) === 1, 'Pike: a 100-hp repair costs 9 (75%), never under 1');
    R().takeIn('ranger'); T.startPrep(); await wait(100);
    ok(R().crew().length === 3 && crew('brandt').gun && !crew('okafor').gun && !crew('pike').gun, 'Brandt up the next dawn, with the M240B on its mount');
    // Their posts are on the roof, clear of the ladder's top, and they sleep by day.
    const half = 5, cx = L.x + 5.15, cz = L.z;
    for (const c of R().crew()) {
      const onRoof = Math.abs(c.y - L.roof) < 0.01 && Math.abs(c.x - cx) < half - 0.5 && Math.abs(c.z - cz) < half - 0.5;
      ok(onRoof && c.shown && Math.hypot(c.x - (L.x + 0.8), c.z - L.z) > 3, c.who + ': a post on the roof (' + c.x.toFixed(1) + ', ' + c.z.toFixed(1) + '), clear of the ladder');
    }
    ok(R().crew().every((c) => !c.awake) && !R().alert(), 'by day all three sleep');
    // GB-91's helps are gone.
    ok(T.builds.length === n0 && !T.builds.some((b) => b.gift), 'no free turret from Brandt');
    ok(H().regenCapFrac() === cap0 && cap0 === 0.4, 'no medic: regen still stops at 40%');
    // Okafor's heal: E beside her on the roof, once a day.
    T.player.position.set(L.x, L.y, L.z);
    let up = false, guard = 0;
    while (!up && guard++ < 40) up = T.stepHqLadder(1, 0.2).roof;
    ok(up && T.onHqRoof(), 'he climbs the ladder');
    const ok0 = crew('okafor');
    T.player.position.set(ok0.x + 0.8, L.roof, ok0.z - 0.4);
    H().setHp(30); await wait(150);
    ok(R().inReach() === 'okafor' && /okafor/i.test(R().prompt()), 'beside Okafor: "' + R().prompt() + '"');
    await pressE();
    const heal = of('survivor-heal')[0];
    ok(of('survivor-heal').length === 1 && heal.who === 'okafor' && heal.from === 30 && heal.to > 30 && T.getHp() === heal.to, 'E: Okafor heals him to full (30 -> ' + T.getHp() + ')');
    H().setHp(30); await wait(100);
    ok(/talk/i.test(R().prompt()) && R().act() === 'talk' && T.getHp() < 60, 'the same day: no second heal, E talks (' + Math.round(T.getHp()) + ' hp, regen only)');
    const talk = of('survivor-talk').pop();
    ok(!!talk && talk.who === 'okafor' && talk.awake === false && talk.lineKey === 'story.survivor.okafor.roof', 'survivor-talk {okafor, asleep, lineKey}');
    const pk = crew('pike');
    T.player.position.set(pk.x - 0.8, L.roof, pk.z + 0.4); await wait(100);
    ok(R().inReach() === 'pike' && R().act() === 'talk' && T.getHp() < 60, 'Pike talks; she does not heal');
    T.player.position.set(ok0.x + 0.8, L.roof, ok0.z - 0.4);
    T.startPrep(); await wait(100);
    ok(R().act() === 'heal' && T.getHp() > 30, 'the next day Okafor heals again');
    T.stepHqLadder(-1, 3);
    T.player.position.set(ok0.x + 0.8, T.sampleHeight(ok0.x + 0.8, ok0.z), ok0.z);
    ok(!R().inReach(), 'from the ground, nobody is in reach');
    // The alarm: they stand to and fire at the dead near the HQ that they can see.
    T.runDevCommand('godmode');
    const hold = (x, z) => { const zb = T.spawnZombie(x, z, 'shambler', true, true); zb.riseT = 0; zb.hp = zb.maxHp = 1e6; zb.speed = zb.baseSpeed = 0; return zb; };
    const east = hold(cx + 16, cz + 3), nw = hold(cx - 12, cz + 12);
    const brP = crew('brandt'), pkP = crew('pike');
    ok(!R().lineClear(brP.x, brP.y + 1.1, brP.z, cx - 5.4, 0.8 + T.sampleHeight(cx - 5.4, cz - 4), cz - 4), 'Brandt cannot fire through the roof at the far wall');
    T.player.position.set(-5.9, T.sampleHeight(-5.9, -2.2), -2.2);
    T.hqStartWave();
    await until(() => R().alert(), 4000);
    await until(() => R().crew().every((c) => c.awake), 2000);
    ok(R().crew().every((c) => c.awake), 'the alarm: all three stand to');
    await until(() => R().crew().every((c) => c.shots > 0) && east.hp < 1e6 && nw.hp < 1e6, 6000);
    ok(R().crew().every((c) => c.shots > 0), 'they all fire');
    await wait(2000);
    ok(crew('brandt').shots >= 4 && crew('brandt').shots > crew('okafor').shots, 'Brandt\'s belt outpaces the M4s: Brandt ' + crew('brandt').shots + ', Okafor ' + crew('okafor').shots + ', Pike ' + crew('pike').shots);
    ok(east.hp < 1e6 && nw.hp < 1e6, 'their rounds land (east -' + Math.round(1e6 - east.hp) + ', north-west -' + Math.round(1e6 - nw.hp) + ')');
    const roots = R().roots();
    ok(!T.zombies.some((z) => roots.includes(z.mesh) || roots.includes(z.target)) && !T.builds.some((b) => roots.includes(b.mesh)), 'nothing targets them: in no zombie or build list');
    // Dawn: back to sleep.
    await until(() => T.getPhase() === 'wave', 25000);
    T.clearZombies(); T.startPrep(); await wait(300);
    ok(!R().alert() && R().crew().every((c) => !c.awake), 'dawn: asleep again');
    // A run reset clears the roof.
    T.resetGame(); await wait(300);
    ok(R().crew().length === 0 && roots.every((r) => !r.parent) && T.getSurvivors().length === 0 && R().healDay() === -1, 'reset: the roof is empty');
    ok(H().repairCostOf(dmg) === 12, 'reset: full repair price');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
