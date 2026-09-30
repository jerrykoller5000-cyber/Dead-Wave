// t148 - GB-90 (P-64): survivor bounties. From night 3 a campsite bounty can hold a survivor (at most once per camp per
// run) who waits by the fire. E does nothing near them while the post's guards live; once the guards are dead, E takes
// them in (survivor-rescued, getSurvivors(), the figure goes). Nothing targets them. A run reset clears it all.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && /^(survivor-|bounty-posted)/.test(detail.type)) ev.push(detail); });
  const of = (type) => ev.filter((e) => e.type === type);
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));   // on a Node (ui/prep-checklist.js reads e.target.contains)
  const pressE = async () => { key('keydown'); await wait(120); key('keyup'); await wait(200); };
  const S = () => T.survivorDbg;
  try {
    ok(S().FROM === 3 && !S().allowed({ kind: 'campsite', index: 0 }, 2) && S().allowed({ kind: 'campsite', index: 0 }, 3)
      && !S().allowed({ kind: 'cabin', index: 0 }, 9), 'only campsites, from night 3');
    await startMatch(T, 'Survivor');
    T.clearZombies(); T.runDevCommand('godmode');
    const hqx = -5.9, hqz = -2.2;
    const home = () => T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    home();
    S().setChance(1);
    // Night 2: bounties but never a survivor.
    T.setDay(1); T.startPrep(); home();
    await until(() => T.getBounties().length > 0, 8000);
    ok(T.getDay() === 2 && T.getBounties().length === 1 && T.getBounties().every((b) => b.survivor === null) && S().waiting().length === 0, 'night 2: a bounty, no survivor');
    // From night 3, with the chance forced to 1, the first campsite bounty holds one.
    let sb = null, tries = 0;
    while (!sb && tries < 25) {
      tries++;
      T.clearZombies(); T.setDay(2); T.startPrep(); home();
      await until(() => T.getBounties().length > 0, 8000);
      sb = T.getBounties().find((b) => b.survivor);
      const camp = T.getBounties().find((b) => b.kind === 'campsite');
      if (camp && !camp.survivor) { ok(false, 'a campsite bounty on night 3 without a survivor at chance 1'); break; }
    }
    ok(!!sb && sb.kind === 'campsite' && sb.survivor.state === 'waiting' && ['ranger', 'hikers', 'trapper'].includes(sb.survivor.style),
      'night 3: a campsite bounty holds a survivor (' + (sb && sb.survivor.style) + ', after ' + tries + ' prep(s))');
    const posted = of('bounty-posted').filter((e) => e.kind === 'campsite' && e.index === (sb && sb.index)).pop();
    ok(!!posted && posted.survivor === true, 'bounty-posted carries survivor: true');
    const w = S().waiting()[0];
    ok(S().waiting().length === 1 && w.shown && Math.hypot(w.x - sb.x, w.z - sb.z) < 2.5, 'the figure waits by the fire, ' + (w && Math.hypot(w.x - sb.x, w.z - sb.z).toFixed(1)) + ' m from the post');
    ok(S().campsUsed().includes(sb.index) && !S().allowed({ kind: 'campsite', index: sb.index }, 9), 'that camp can never hold another this run');
    // Guards alive: E beside them does nothing.
    const post = T.zombies.find((z) => z.alive && z.poiGuard && z.poiGuard.index === sb.index && z.poiGuard.kind === 'campsite')?.poiGuard;
    const guards = () => T.zombies.filter((z) => z.alive && z.poiGuard === post);
    ok(!!post && guards().length >= 3, guards().length + ' guards at the post');
    ok(!T.zombies.some((z) => z === post.survivor || z.target === post.survivor), 'the survivor is not a zombie or anybody\'s target');
    const stand = () => T.player.position.set(w.x + 0.9, T.sampleHeight(w.x + 0.9, w.z), w.z);
    stand(); await wait(150);
    ok(!S().inReach(), 'guards alive: not in reach of E');
    await pressE(); stand();
    ok(T.getSurvivors().length === 0 && S().waiting().length === 1 && of('survivor-rescued').length === 0, 'guards alive: E does nothing');
    // Kill the guards: the bounty settles, and now E takes the survivor in.
    for (const g of guards()) T.killZombie(g, true, { kind: 'generic', dir: { x: 0, z: 1 } });
    await wait(200); stand(); await wait(150);
    ok(guards().length === 0 && T.getBounties().find((b) => b.index === sb.index && b.kind === 'campsite').state === 'done', 'guards dead, bounty done');
    ok(S().inReach(), 'now in reach of E');
    await pressE();
    const got = T.getSurvivors();
    const re = of('survivor-rescued');
    ok(got.length === 1 && got[0].style === sb.survivor.style && got[0].camp === sb.index && got[0].day === 3, 'E takes them in: getSurvivors() = ' + JSON.stringify(got));
    ok(re.length === 1 && re[0].count === 1 && re[0].style === sb.survivor.style, 'survivor-rescued fired once');
    ok(S().waiting().length === 0 && T.getBounties().find((b) => b.index === sb.index && b.kind === 'campsite').survivor.state === 'rescued', 'the figure is gone; the board says rescued');
    await pressE();
    ok(T.getSurvivors().length === 1, 'a second E does nothing');
    // A run reset clears it all.
    T.resetGame(); await wait(300);
    ok(T.getSurvivors().length === 0 && S().campsUsed().length === 0 && S().waiting().length === 0, 'reset clears survivors and used camps');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
