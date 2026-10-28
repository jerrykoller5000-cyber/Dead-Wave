// t303 - CL-263 part 2 (docs/specs/story-chain.md §4: each lead's "what changes"): the world answers what he's done.
// The generator (day 2): the first night the HQ has power; from the second dawn until he pours the can it has none (no
// flood at night, the bay lamps out, the fans still); poured, the lamps stutter on. The relay (day 3): the mast's nav
// light is dark until the relay's back up, then blinks at night. Clarke's truck (day 6): after the cut its one good
// headlamp burns at night. The search (day 7): the log's last entry names the trapper. With the story gate off (every
// other check) the HQ has power and the mast blinks, as before.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const sim = async (s) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < s * 15000) await wait(30); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'World');
    T.clearZombies(); T.runDevCommand('godmode');
    const W = T.worldChangeDbg;
    if (!W) { ok(false, 'the hooks are there'); return out.join('\n'); }
    // The gate off (the checks): power and the mast as before.
    T.storyDbg.gate(false);
    T.setDay(2); T.startPrep(); await sim(0.3);
    ok(W.powered() === true && W.mastLive() === true, 'the story gate off: the HQ has power and the mast is live, as every other check expects');
    // The gate on: day 1 powered, day 2 on, until the can.
    T.storyDbg.gate(true);
    T.setRelayUpDbg(false);
    T.setDay(0); T.startPrep(); await sim(0.3);   // (startPrep is the dawn: it moves the day on by one)
    ok(W.powered() === true, 'the first day and night: the generator still runs');
    T.setDay(1); T.startPrep(); await sim(0.4);
    const f0 = W.fan(); await sim(0.5);
    ok(W.powered() === false && W.bay() < 0.1 && W.fan() === f0, 'the second dawn, no can poured: no power (bay lamps ' + W.bay() + ', the fans still)');
    ok(W.mastLive() === false, 'the relay not up: the mast is dead');
    // Night, unpowered: no flood, no beacon.
    T.hqStartWave(); await until(() => T.getPhase() === 'wave', 30000); await sim(1.0);
    ok(W.night() === true, 'the night came');
    let beaconMax = 0; for (let i = 0; i < 20; i++) { await sim(0.07); beaconMax = Math.max(beaconMax, W.beacon() || 0); }
    ok(W.flood() === 0 && beaconMax === 0, 'night with no power and no relay: the flood dark, the mast dark (' + W.flood() + ', ' + beaconMax + ')');
    // He pours the can: the lamps stutter on, then stay.
    ok(W.pour() === true && W.powered() === true, 'the can poured: power');
    await sim(0.1);
    ok(W.flicker() > 0, 'the lamps stutter as it comes back (' + W.flicker().toFixed(2) + ' s of it left)');
    await sim(1.6);
    ok(W.bay() > 1.3 && W.flood() > 2, 'then the bay lamps and the flood are on (' + W.bay() + ', ' + W.flood() + ')');
    // The relay up: the mast blinks.
    T.setRelayUpDbg(true); beaconMax = 0; let beaconMin = 9;
    for (let i = 0; i < 24; i++) { await sim(0.07); const b = W.beacon() || 0; beaconMax = Math.max(beaconMax, b); beaconMin = Math.min(beaconMin, b); }
    ok(W.mastLive() === true && beaconMax > 1 && beaconMin === 0, 'the relay up: the mast\'s light blinks at night (' + beaconMin + ' to ' + beaconMax + ')');
    // The truck: after the cut its lamp burns at night.
    const M = T.truckDbg.mission;
    if (T.truckDbg.locked()) {
      await sim(0.2);
      ok(W.truckLamp() !== true, 'chained: the truck is dark');
      M.takeCutters(); for (let i = 0; i < 80 && !M.unlocked(); i++) M.hold(0.25);
      await sim(0.3);
      ok(M.unlocked() && W.truckLamp() === true, 'cut: its headlamp burns at night');
    } else ok(true, 'no truck mission on this map (no iron cave): nothing to light');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
