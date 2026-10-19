// t263 - CL-216 (D-82, docs/specs/day-missions.md §6): the utility truck's day mission (game/truck-mission.js).
// Jerry: "This one is good." The truck's toolbox is chained shut; the hikers' bolt cutters lie at the mine mouth; with
// them, E held at the chain cuts it; the truck's alarm calls the dead in; then the site is an ordinary cache.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const tap = async () => { key('keydown'); await wait(60); key('keyup'); await wait(120); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'TruckMission');
    T.clearZombies(); T.setHp(100000); T.runDevCommand('godmode');
    const D = T.truckDbg, S = () => D.state();
    await until(() => D.truck.built, 4000);
    ok(D.truck.built && !D.truck.off, 'the mission is built (an iron cave is on the map)');
    ok(!!D.truck.chain && D.truck.chain.visible && !!D.truck.cutters && !!D.truck.cutters.parent && !S().cutters, 'a chain on the toolbox, the bolt cutters at the mine mouth');   // (.visible: sceneCull hides it out of view)
    ok(D.locked() && S().stage === 'chained', 'the site is locked until the chain is cut');
    T.runDevCommand('site truck'); await wait(150);
    ok(/chained/i.test(D.prompt() || ''), 'at the toolbox without the cutters: "' + D.prompt() + '"');
    ok(D.reach() && D.reach().blockedBy === 'locked', 'the objectives cannot reach it (' + (D.reach() && D.reach().blockedBy) + ')');
    key('keydown'); await wait(500); key('keyup'); await wait(100);
    ok(S().cut === 0 && S().stage === 'chained', 'holding E there does nothing without them');
    T.runDevCommand('site truck cutters'); await wait(150);
    ok(/bolt cutters/i.test(D.prompt() || ''), 'by the cutters: "' + D.prompt() + '"');
    await tap();
    ok(S().cutters, 'E takes them');
    T.runDevCommand('site truck'); await wait(150); T.clearZombies();
    ok(/cut the chain/i.test(D.prompt() || ''), 'back at the toolbox: "' + D.prompt() + '"');
    key('keydown'); await until(() => S().cut > 0.2, 3000); key('keyup'); await wait(200);
    const kept = S().cut;
    ok(kept > 0.2 && S().stage === 'chained', 'held, it cuts; let go, the cut so far is kept (' + kept.toFixed(2) + ' s)');
    key('keydown'); const cut = await until(() => S().stage === 'alarm', 6000); key('keyup');
    ok(cut, 'held to the end, the chain gives: the alarm');
    ok(!D.truck.chain.visible, 'the chain is gone');
    await wait(200);
    const called = (T.zombies || []).filter((z) => z.alive && z.truckCalled).length;
    ok(called >= 3, 'the alarm calls the dead in at once: ' + called + ' (of ' + D.mission.calledFor(T.getDay ? T.getDay() : 1) + ')');
    T.clearZombies();
    ok(!D.locked() && D.reach() && D.reach().blockedBy !== 'locked', 'the site is open to the objectives now (' + (D.reach() && D.reach().blockedBy) + ')');
    ok(!D.prompt(), 'and the truck says nothing of its own any more');
    D.mission.state.alarm = 0.05;
    ok(await until(() => S().stage === 'open', 3000), 'the alarm stops by itself: ' + S().stage);
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
