// tcl285a - CL-285 part A (D-102, Jerry: "make sure that they are not visible or interactable before the time of their
// introduction"): with the story gate on, the three who lived are not placed, seen or taken in before their lead's day
// (Pike the missing hikers, day 5; Brandt the search, day 7; Okafor the old man, day 8), even with every thread done on
// night 3; each comes on his own day, where he hid. A dev step back to an earlier day hides him again and E does
// nothing beside him; his day again, he is there and E reaches him.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CL285A');
    T.clearZombies(); T.runDevCommand('godmode');
    const S = T.survivorDbg, POI = T.POI;
    if (!S || !S.introDay || !T.storyDbg) { ok(false, 'the hooks are there (survivorDbg.introDay, storyDbg)'); return out.join('\n'); }
    S.setChance(0);
    ok(S.introDay('hikers') === 5 && S.introDay('ranger') === 7 && S.introDay('trapper') === 8,
      'their days: Pike 5, Brandt 7, Okafor 8 (' + ['hikers', 'ranger', 'trapper'].map((s) => S.introDay(s)).join(', ') + ')');
    const has = (st) => POI.campsites.some((c) => c.style === st);
    const here = (st) => S.waiting().find((s) => s.style === st && s.thread);
    const sync = async () => { T.storyDbg.sync(); await wait(250); T.storyDbg.sync(); await wait(150); };
    T.storyDbg.chain.reset(); T.storyDbg.gate(true);
    T.setDay(3); await sync();
    for (const id of ['missing', 'search', 'oldman']) T.runDevCommand('story done ' + id);
    await sync();
    ok(!S.waiting().some((s) => s.thread), 'night 3, every thread done: nobody yet (' + S.waiting().map((s) => s.style).join(',') + ')');
    T.setDay(4); await sync();
    ok(!S.waiting().some((s) => s.thread), 'day 4: still nobody');
    T.setDay(5); await sync();
    if (has('hikers')) ok(!!here('hikers') && here('hikers').visible, 'day 5: Pike is there');
    ok(!here('ranger') && !here('trapper'), 'day 5: not Brandt or Okafor');
    T.setDay(7); await sync();
    if (has('ranger')) ok(!!here('ranger') && here('ranger').visible, 'day 7: Brandt is there');
    ok(!here('trapper'), 'day 7: not Okafor');
    T.setDay(8); await sync();
    if (has('trapper')) ok(!!here('trapper') && here('trapper').visible, 'day 8: Okafor is there');
    // A dev step back: Pike hidden and out of E's reach; his day again: seen and in reach.
    const pk = here('hikers');
    if (pk) {
      T.clearZombies();
      const stand = () => T.player.position.set(pk.x + 0.9, T.sampleHeight(pk.x + 0.9, pk.z), pk.z);
      T.setDay(4); await sync(); stand(); await wait(150);
      ok(!here('hikers').visible && !S.inReach() && !S.introduced('hikers'), 'stepped back to day 4: Pike not seen, E does not reach him');
      T.setDay(5); await sync(); stand(); await wait(150);
      ok(here('hikers').visible && S.inReach() && S.introduced('hikers'), 'day 5 again: seen, and E reaches him');
    } else ok(true, 'no hikers\' camp on this map');
    T.storyDbg.gate(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
    T.runDevCommand('godmode off');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
