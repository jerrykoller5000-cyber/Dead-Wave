// t292 - CL-263 (docs/specs/story-chain.md; Jerry's N24: "They should chain together in one elegant story that plays out
// and becomes available day by day"). The story chain in the game:
//  - day 1 opens no lead; day 2's dawn opens the generator and says so ('story-lead');
//  - a lead's mission done in play marks it done (the relay, by its own puzzle) and says so;
//  - the next dawn opens the next lead;
//  - with the gate on (as it is in play), a site whose lead isn't open is locked ('story') and an open one isn't; off
//    (an automated check's start), nothing changes;
//  - a new run starts the chain again.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const events = []; window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'story-lead') events.push(e.detail); });
  try {
    if (!T.storyDbg) { ok(false, 'the CL-263 hook is there'); return out.join('\n'); }
    await startMatch(T, 'Story');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    const S = T.storyDbg, R = () => S.read();
    S.sync();
    ok(R().day === 1 && R().open.length === 0, 'day 1: no lead (' + R().open.join(',') + ')');
    ok(R().gate === false && R().gatePlay === true, 'in play the gate is on (since GP-19969 and AG-125, 2026-10-26); an automated check starts with it off (' + R().gate + ', in play ' + R().gatePlay + ')');

    T.setDay(2); S.sync();
    ok(R().open.join() === 'generator', "day 2's dawn: the generator (" + R().open.join(',') + ')');
    const e1 = events.find((e) => e.phase === 'open' && e.id === 'generator');
    ok(!!e1 && e1.site === 'objective:fuel-depot' && e1.by === 'Price' && e1.day === 2, "and it says so: 'story-lead' open generator, Price's, day 2");

    // The gate: the trapper's site is locked while its lead is closed; the fuel depot's isn't.
    const trap = T.getObjectiveProps().props['objective:trapper-cache'];
    ok(!!trap, 'the trapper cache is placed');
    if (trap) {
      T.player.position.set(trap.approach.x, trap.approach.y, trap.approach.z); await wait(250);
      ok(S.reach('objective:trapper-cache').blockedBy !== 'story', 'gate off: the trapper cache is as before (' + S.reach('objective:trapper-cache').blockedBy + ')');
      S.gate(true);
      ok(S.reach('objective:trapper-cache').blockedBy === 'story', "gate on: closed by the story, its lead not open");
      ok(!S.closedSite('objective:fuel-depot') && S.closedSite('objective:radio-repair'), 'the generator\'s site open, the relay\'s closed');
      S.gate(false);
    }

    // The relay done in play (its puzzle unlocked), even before its lead opened: done, and said.
    T.relayDbg.puzzle.unlock(); S.sync(); await wait(100);
    ok(R().done.includes('relay'), 'the relay done in play marks its lead done (' + R().done.join(',') + ')');
    ok(events.some((e) => e.phase === 'done' && e.id === 'relay'), "'story-lead' done relay");

    // The generator done (dev), the next dawns.
    T.runDevCommand('story done generator');
    T.setDay(3); S.sync();
    ok(!R().open.includes('medical'), "day 3: the medical run waits for day 4 (" + R().open.join(',') + ')');
    T.setDay(4); S.sync();
    ok(R().open.includes('medical'), 'day 4: the medical run opens (' + R().open.join(',') + ')');

    // A new run starts the chain again.
    T.runDevCommand('godmode off');
    document.getElementById('quitMenuBtn').click();
    document.getElementById('quitConfirmBtn').click();
    ok(await until(() => T.getPhase() === 'idle', 10000), 'quit to the menu');
    await startMatch(T, 'Story2');
    S.sync();
    ok(R().day === 1 && R().open.length === 0 && R().done.length === 0, 'a new run: the chain starts again (day ' + R().day + ', open ' + R().open.join(',') + ', done ' + R().done.join(',') + ')');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
