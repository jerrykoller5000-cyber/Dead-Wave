// t304 - GB-232 (places; docs/specs/story-chain.md 6): with the gate on, day 3, 'story done oldman' finds Okafor in the
// trapper's cellar (trapper.cellarSpot, within 0.5 m, at its floor height, not pushed out by AG-137's cellar colliders);
// E from the yard above (more than 1.6 m up) doesn't reach her, from the cellar floor beside her it does. Brandt, when
// the search is done, waits by the rangers' truck's door if its clue spot is set (else the fire), Pike at the fire.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Places');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    const W = () => T.survivorDbg.waiting();
    T.setDay(3); T.storyDbg.sync(); T.storyDbg.gate(true);
    T.runDevCommand('story done oldman');
    ok(await until(() => W().some((s) => s.style === 'trapper'), 4000), 'day 3, the old man done: Okafor waits (' + W().map((s) => s.style).join(',') + ')');
    const ok1 = W().find((s) => s.style === 'trapper'), cs = T.trapperDbg.cellarSpot();
    ok(!!cs, 'the trapper exposes cellarSpot');
    if (ok1 && cs) {
      const d = Math.hypot(ok1.x - cs.x, ok1.z - cs.z);
      ok(d < 0.5 && Math.abs(ok1.y - cs.y) < 0.05, 'Okafor at cellarSpot: ' + d.toFixed(2) + ' m, y ' + ok1.y.toFixed(2) + ' vs ' + cs.y.toFixed(2));
      T.clearZombies && T.clearZombies();
      const yard = T.sampleHeight(cs.x, cs.z);
      T.player.position.set(cs.x, Math.max(yard, cs.y + 2.2), cs.z); await wait(200);
      ok(!T.survivorDbg.inReach(), 'from the yard above (' + (T.player.position.y - cs.y).toFixed(2) + ' m up): not in reach');
      T.player.position.set(cs.x + 0.6, cs.y + 0.02, cs.z); await wait(200);
      ok(T.survivorDbg.inReach(), 'on the cellar floor beside her: in reach');
    }
    T.runDevCommand('story done search'); T.runDevCommand('story done missing');
    await until(() => W().some((s) => s.style === 'ranger'), 4000);
    const br = W().find((s) => s.style === 'ranger'), truck = T.rangerDbg.ranger.clues.find((c) => c.source === 'truck'), door = truck && truck.spot && truck.spot.approach;
    if (br && door) ok(Math.hypot(br.x - door.x, br.z - door.z) < 1.0, 'Brandt by the truck door (' + Math.hypot(br.x - door.x, br.z - door.z).toFixed(2) + ' m)');
    else out.push('INFO Brandt: ' + (br ? 'waiting' : 'not waiting') + ', truck spot ' + (door ? 'set' : 'not built yet (fire)'));
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
    T.runDevCommand('godmode off');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
