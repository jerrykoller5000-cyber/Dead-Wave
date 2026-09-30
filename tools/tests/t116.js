// t116 - GB-102 (P-109, D-60): rain puts fires out. In full rain a burning shambler burns out at least twice as fast
// as in the dry and lights nobody it touches (in the dry it lights its neighbour); a campfire's light drops to a fifth
// while it pours and comes back after; a butt dropped in the rain leaves no ember; and a lit cigarette goes out when
// a shower starts.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(30); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const W = T.weather;
  const rain = (on) => { W.raining = on; W.rainTimeLeft = on ? 90 : 0; W.intensity = on ? 1 : 0; };
  try {
    await startMatch(T, 'Rain');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const pair = (dx) => {
      const a = T.spawnZombie(P.x + dx, P.z + 25, 'shambler', true, true), b = T.spawnZombie(P.x + dx + 0.7, P.z + 25, 'shambler', true, true);
      for (const z of [a, b]) { z.riseT = 0; z.speed = z.baseSpeed = 0; z.hp = z.maxHp = 1e6; }
      return [a, b];
    };
    const burnFor = async (a) => { const t0 = performance.now(); T.igniteZombie(a, 3); await until(() => !(a.burnT > 0), 6000); return (performance.now() - t0) / 1000; };
    // Dry.
    rain(false);
    const [d1, d2] = pair(-6);
    const dryT = await burnFor(d1);
    const dryCaught = d2.burnT > 0 || d2.hp < d2.maxHp;
    T.clearZombies();
    // Full rain.
    rain(true);
    ok(Math.abs(T.rainWet() - 1) < 1e-6, 'full rain: rainWet 1');
    const [w1, w2] = pair(6);
    const wetT = await burnFor(w1);
    const wetCaught = w2.burnT > 0 || w2.hp < w2.maxHp;
    ok(wetT * 2 <= dryT + 0.15, 'in full rain it burns out at least twice as fast: ' + wetT.toFixed(2) + ' s vs ' + dryT.toFixed(2) + ' s dry (x' + (1 + T.RAIN_BURN_MUL) + ' expected)');
    ok(dryCaught && !wetCaught, 'in the dry it lights its neighbour (' + dryCaught + '); in the rain it lights nobody (' + wetCaught + ')');
    T.clearZombies();
    // A campfire at night.
    const cf = (T.campfires || []).find((f) => !f.dead && !f.beacon && !f.lantern && f.light);
    if (!cf) ok(true, 'no campfire on this map (skipped)');
    else {
      T.runDevCommand('night ops');
      rain(false); await wait(400);
      const lit = cf.light.intensity;
      rain(true); await wait(400);
      const wet = cf.light.intensity;
      rain(false); await wait(400);
      const back = cf.light.intensity;
      ok(lit > 1 && wet < lit * 0.35 && back > 1, 'a campfire drops to embers in the rain and comes back: ' + lit.toFixed(2) + ' -> ' + wet.toFixed(2) + ' -> ' + back.toFixed(2));
    }
    // A butt in the rain leaves no ember; in the dry it does.
    const gx = P.x + 3, gz = P.z + 3;
    rain(true);
    const wetButt = T.spawnGroundFire(gx, gz, false, 0, true);
    rain(false);
    const dryButt = T.spawnGroundFire(gx + 1, gz, false, 0, true);
    ok(wetButt == null && dryButt != null, 'a dropped butt: no ember in the rain (' + (wetButt == null) + '), an ember in the dry (' + (dryButt != null) + ')');
    // A lit cigarette goes out when a shower starts.
    const mi = T.marineIdleDbg();
    Object.assign(mi.state, { quiet: 40, phase: 'smoking', time: 5, lit: true, number: 1 });
    rain(true);
    await until(() => mi.state.phase !== 'smoking', 1500);
    await wait(300);
    ok(!mi.state.lit && mi.state.phase !== 'smoking' && mi.state.phase !== 'pack' && mi.state.quiet <= 24.5, 'a shower starts: the cigarette goes out and he does not light another (' + mi.state.phase + ', quiet ' + mi.state.quiet.toFixed(1) + ')');
    rain(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
