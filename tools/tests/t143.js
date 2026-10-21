// t143 - GB-89 (P-61): a colossus walks a trail by day, the 'wanderer' bounty. On the odd nights from 7 (never a
// colossus night or a guardian night) the prep posts one with the day's bounties. It keeps to a trail at least 45 m from
// the HQ and walks it while unaware (at least 10 m in 20 s); stuck, it turns back; a hit wakes it; killing it adds the
// post's reward (150 on nights 7-13) to the skull bag with bounty-done; the alarm sends it away (bounty-expired 'alarm').
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', (e) => { const d = e.detail; if (d && /^(bounty-|alarm-started)/.test(d.type)) ev.push(d); });
  const of = (type) => ev.filter((e) => e.type === type);
  try {
    const yes = [7, 9, 11, 13, 17, 19, 21], no = [1, 5, 6, 8, 10, 12, 14, 15, 18, 20, 25];
    ok(yes.every((d) => T.wandererAllowed(d)) && no.every((d) => !T.wandererAllowed(d)), 'its days: 7, 9, 11, 13, 17, 19, 21; not 5-6, 8, 10, 12, 15, 18, 20, 25');
    ok(T.wandererReward(7) === 150 && T.wandererReward(13) === 150 && T.wandererReward(14) === 300, 'reward 150 on nights 7-13, 300 from 14');
    await startMatch(T, 'Wanderer');
    T.runDevCommand('godmode');
    const hqx = -5.9, hqz = -2.2;
    const home = () => T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    T.clearZombies(); home();
    ok(T.wandererTrails().length > 0, T.wandererTrails().length + ' stretches of trail 45 m or more from the HQ');
    // Night 9's prep posts one with the day's bounties.
    const p0 = of('bounty-posted').length;
    T.setDay(8); T.startPrep(); home();
    const posted = await until(() => T.getBounties().some((b) => b.wanderer), 8000);
    const wb = T.getBounties().find((b) => b.wanderer);
    const pe = of('bounty-posted').slice(p0).find((e) => e.kind === 'wanderer');
    ok(posted && T.getDay() === 9 && wb.kind === 'wanderer' && wb.reward === 150 && wb.state === 'open' && wb.guards === 1 && !!pe && pe.reward === 150, 'night 9: a wanderer is posted (reward ' + (wb && wb.reward) + ', bounty-posted ' + !!pe + ')');
    ok(T.getBounties().filter((b) => !b.wanderer).length === 2, 'beside the two ordinary bounties');
    const cz = () => T.zombies.find((z) => z.alive && z.poiGuard && z.poiGuard.wanderer);
    let g = cz();
    ok(!!g && g.typeKey === 'colossus' && !g.poiAwake, 'it is a colossus, unaware');
    const hd = (z) => Math.hypot(z.mesh.position.x, z.mesh.position.z);
    ok(!!g && hd(g) >= 44, 'it starts ' + (g && hd(g).toFixed(0)) + ' m from the HQ');
    // It walks its trail.
    let walked = 0, minHq = 1e9, lx = g.mesh.position.x, lz = g.mesh.position.z;
    for (let k = 0; k < 80; k++) {
      await wait(250); home();
      walked += Math.hypot(g.mesh.position.x - lx, g.mesh.position.z - lz);
      lx = g.mesh.position.x; lz = g.mesh.position.z; minHq = Math.min(minHq, hd(g));
    }
    const snap = T.getBounties().find((b) => b.wanderer);
    ok(g.alive && !g.poiAwake && walked >= 10, 'unaware, it walks ' + walked.toFixed(1) + ' m in 20 s');
    ok(minHq >= 40, 'and stays out on the trail (never nearer than ' + minHq.toFixed(0) + ' m to the HQ)');
    ok(!!snap && Math.hypot(snap.x - g.mesh.position.x, snap.z - g.mesh.position.z) < 1.5, 'the board snapshot follows it');
    // Stuck, it turns back.
    const w = g.poiGuard.wanderer, rp0 = w.repaths;
    const sp0 = g.speed; w.chkT = 99; await wait(100); const i0 = w.i; w.cx = g.mesh.position.x; w.cz = g.mesh.position.z; w.chkT = 0.001; g.speed = 0;
    await wait(300);
    ok(w.repaths === rp0 + 1 && w.i !== i0, 'stuck, it turns back (repaths ' + rp0 + ' -> ' + w.repaths + ', next point ' + i0 + ' -> ' + w.i + ')');
    g.speed = sp0;
    // A hit wakes it.
    T.damageZombie(g, 5, { kind: 'generic', dir: { x: 0, z: 1 } });
    const woke = await until(() => g.poiAwake, 2000);
    ok(woke && g.poiWake === 'hit', 'a hit wakes it (' + g.poiWake + ')');
    // Killing it pays the post's reward into the bag.
    const bag0 = T.getSkullBag().value, d0 = of('bounty-done').length;
    T.killZombie(g, true, { kind: 'generic', dir: { x: 0, z: 1 } });
    await wait(100);
    const done = of('bounty-done').slice(d0);
    const gain = T.getSkullBag().value - bag0;
    ok(done.length === 1 && done[0].kind === 'wanderer' && done[0].reward === 150 && gain >= 120, 'the kill: bounty-done {wanderer, 150}, the bag +' + gain);
    ok(T.getBounties().find((b) => b.wanderer).state === 'done', 'the board says done');
    // The alarm sends an open one away.
    await wait(3500);   // COLOSSUS DOWN's slow-mo and banner
    const post2 = T.spawnWanderer(9);
    g = cz();
    ok(!!post2 && !!g && g.poiGuard === post2, 'another wanderer out on a trail');
    const e0 = of('bounty-expired').length, al0 = of('alarm-started').length;
    home(); T.hqStartWave();
    await until(() => of('alarm-started').length > al0, 3000);
    await wait(100);
    const exp = of('bounty-expired').slice(e0).filter((e) => e.kind === 'wanderer');
    ok(exp.length === 1 && exp[0].reason === 'alarm' && !T.zombies.some((z) => z.alive && z.poiGuard === post2), 'the alarm sends it away: bounty-expired {wanderer, reason ' + (exp[0] && exp[0].reason) + '}, gone');
    await until(() => T.getPhase() === 'wave', 25000);
    T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
