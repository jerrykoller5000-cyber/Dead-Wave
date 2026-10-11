// t223 - CL-135 (Jerry, 2026-10-09: "Good job on the low end. Definitely keep that. The reloads though sound like bones
// clinking together or a xylophone. We need realism for them. The weapons switching should sound like a CRT TV static
// switching. The high end of the weapons sounds like a xylophone as well").
//  - No reload, handling, impact or switch sound is made of tones any more: each plays from its bank (steel, polymer,
//    hands and dirt, built from shaped noise) and not one oscillator is started by any of them.
//  - Nothing in a bank rings like a struck bar (the measure core/gunsynth.test.mjs uses: it hears a 3 kHz ringing
//    sine at ~1, noise at ~0.2; every bank stays under 0.5, flesh and the ricochet's whine aside).
//  - Changing weapons is a CRT changing channel: a burst of broadband static, flickering, cut dead after ~150 ms; it
//    plays once per change (number keys, the wheel, the holster); the wheel moving over a gun ticks the dial instead.
//  - The sniper's bolt is heard on the animation's beats (GB-146), up, back, forward, down, after every round but the last.
//  - The low end is untouched: the guns' thump and sub layers are as CL-134 left them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const simWait = async (s, cap = 30000) => { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < s && Date.now() - w0 < cap) await wait(30); };
  try {
    await startMatch(T, 'Switch');
    T.clearZombies(); T.setHp(100000);
    const A = T.AudioSys || window.AudioSys;
    ok(!!A && typeof A.weaponSwitch === 'function' && typeof A.wheelTick === 'function', 'the switch and the dial tick are there');
    const want = A.GUN_KEYS.length + A.FOLEY_KEYS.length;
    { const w0 = Date.now(); while (A.bankStats().banks < want && Date.now() - w0 < 45000) await wait(200); }
    ok(A.bankStats().banks >= want, 'every bank is built (' + A.bankStats().banks + ' of ' + want + ')');
    // 1. No tones: count the oscillators each call starts (synchronously, so nothing else in the game is counted).
    const P = (window.BaseAudioContext || window.AudioContext).prototype, realOsc = P.createOscillator;
    let oscN = 0; P.createOscillator = function () { oscN++; return realOsc.call(this); };
    const plays = (k) => { const d = A.bankDbg(k); return d ? d.plays : 0; };
    const calls = [
      ['emptyClick', [], 'dryFire'], ['shotgunPump', [], 'pumpBack'], ['slideRack', [], 'slideFwd'], ['revolverCylinder', [], 'cylinderOpen'],
      ['revolverSpin', [], 'cylinderSpin'], ['launcherDrum', [], 'tubeOpen'], ['launcherShellInsert', [], 'tubeShell'], ['reloadStart', [], 'grab'],
      ['reloadDone', [], 'settle'], ['brassTink', [], 'brass'], ['magThud', [0.8, 0], 'magDrop'], ['grenadeThrow', [], 'grenadePin'],
      ['weaponSwitch', [], 'weaponSwitch'], ['wheelTick', [], 'wheelTick']
    ];
    for (const n of ['magRelease', 'magOut', 'magIn', 'magSlap', 'slideBack', 'slideFwd', 'akRockOut', 'akRockIn', 'drumOut', 'drumIn', 'boltUp', 'boltBack', 'boltFwd',
      'boltDown', 'boxLatch', 'belt', 'boxSeat', 'shell', 'bigBrass', 'grab', 'valveShut', 'valveOpen', 'tankOff', 'tankOn', 'igniter', 'motorBlip']) calls.push(['reloadCue', [n], n]);
    calls.push(['reloadCue', ['charge'], 'slideBack'], ['reloadCue', ['brass'], 'brass']);
    for (const [s, k] of [['rock', 'impactRock'], ['metal', 'impactMetal'], ['wood', 'impactWood'], ['dirt', 'impactDirt'], ['water', 'impactWater'], ['sand', 'impactSand']]) calls.push(['bulletImpact', [s, 1, 0], k]);
    calls.push(['grenadeBounce', [1, 0], 'grenadeBounce']);
    const tones = [], silent = [];
    for (const [fn, args, key] of calls) {
      const p0 = plays(key), n0 = oscN;
      A[fn](...args);
      if (oscN > n0) tones.push(fn + (args.length ? '(' + args[0] + ')' : ''));
      if (plays(key) <= p0) silent.push(fn + (args.length ? '(' + args[0] + ')' : '') + ' -> ' + key);
      await wait(fn === 'weaponSwitch' ? 90 : 40);   // past each sound's own cooldown
    }
    P.createOscillator = realOsc;
    ok(tones.length === 0, 'no reload, handling, impact, grenade or switch sound starts an oscillator (' + calls.length + ' calls' + (tones.length ? '; tones from: ' + tones.join(', ') : '') + ')');
    ok(silent.length === 0, 'and each of them plays its own bank' + (silent.length ? ': not heard ' + silent.join(', ') : ''));
    // 2. Nothing rings like a struck bar.
    const G = await import(new URL('../../core/gunsynth.js', location.href).href);
    const SR = 48000;
    const ring = (x) => {
      const y = Float32Array.from(x); G.biquad(y, 'hp', 2000, 0.7, SR); G.biquad(y, 'hp', 2000, 0.7, SR); G.biquad(y, 'lp', 14000, 0.7, SR);
      const N = 288, H = 96; let num = 0, den = 0, Em = 0; const fr = [];
      for (let i = 0; i + N + 30 < y.length; i += H) { let e = 0; for (let k = 0; k < N; k++) e += y[i + k] * y[i + k]; fr.push([i, e]); if (e > Em) Em = e; }
      for (const [i, e] of fr) {
        if (e < Em * 1e-3) continue;
        let best = 0;
        for (let L = 3; L < 25; L++) { let xy = 0, yy = 0; for (let k = 0; k < N; k++) { xy += y[i + k] * y[i + k + L]; yy += y[i + k + L] * y[i + k + L]; } best = Math.max(best, xy / Math.sqrt(e * yy + 1e-30)); }
        num += best * e; den += e;
      }
      return den ? num / den : 0;
    };
    const bar = new Float32Array(SR * 0.1); for (let i = 0; i < bar.length; i++) bar[i] = Math.sin(2 * Math.PI * 3000 * i / SR) * Math.exp(-i / SR / 0.016);
    const skip = { hit: 1, hitHeavy: 1, knifeHit: 1, macheteChop: 1, ricochet: 1 };
    const rings = [];
    let worst = [0, ''];
    for (const key of A.GUN_KEYS.concat(A.FOLEY_KEYS)) {
      if (skip[key]) continue;
      const b = G.buildBank(key, G.defForKey(key), SR);
      const s = b.dry.reduce((a, d) => a + ring(d), 0) / b.dry.length;
      if (s > worst[0]) worst = [s, key];
      if (s >= 0.5) rings.push(key + ' ' + s.toFixed(2));
    }
    ok(ring(bar) > 0.9, 'the measure hears a ringing bar (' + ring(bar).toFixed(2) + ')');
    ok(rings.length === 0, 'and no bank rings like one (the most, ' + worst[1] + ', at ' + worst[0].toFixed(2) + ')' + (rings.length ? ': ' + rings.join(', ') : ''));
    const layerKinds = new Set(); for (const D of [G.GUN_DEFS, G.FOLEY_DEFS]) for (const k in D) for (const L of D[k].layers) layerKinds.add(L.k);
    ok(!layerKinds.has('mech') && !layerKinds.has('spring'), 'no layer is the old modal metal or the buffer spring (' + [...layerKinds].join(', ') + ')');
    // 3. The CRT: broadband static that flickers, then is cut.
    const sw = G.buildBank('weaponSwitch', G.defForKey('weaponSwitch'), SR).dry[0];
    const seg = (a, b) => { let e = 0; for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) e += sw[i] * sw[i]; return e / Math.max(1, Math.floor(b * SR) - Math.floor(a * SR)); };
    const hiShare = (() => { const y = Float32Array.from(sw.subarray(0, Math.floor(0.15 * SR))); G.biquad(y, 'hp', 3000, 0.7, SR); let e = 0, t = 0; for (let i = 0; i < y.length; i++) { e += y[i] * y[i]; t += sw[i] * sw[i]; } return e / t; })();
    const frames = []; for (let f = 0; f < 7; f++) frames.push(seg(0.02 + f / 60, 0.02 + (f + 1) / 60));
    const flick = Math.max(...frames) / Math.min(...frames);
    ok(seg(0.02, 0.14) > 0 && seg(0.19, 0.25) < seg(0.02, 0.14) * 0.05, 'a weapon change is ~150 ms of static, then cut (after: ' + (10 * Math.log10(seg(0.19, 0.25) / seg(0.02, 0.14))).toFixed(1) + ' dB)');
    ok(hiShare > 0.35 && flick > 1.3, 'broadband (above 3 kHz: ' + Math.round(hiShare * 100) + '% of it), flickering frame to frame (loudest frame / quietest: ' + flick.toFixed(2) + ')');
    // 4. It plays once per change: number keys / Q, the holster.
    T.grantAllWeapons && T.grantAllWeapons();
    const W = T.WEAPON_ORDER;
    await wait(120);
    let p0 = plays('weaponSwitch');
    T.setWeapon(W.indexOf('m4')); await wait(120);
    T.setWeapon(W.indexOf('shotgun')); await wait(120);
    ok(plays('weaponSwitch') - p0 === 2, 'two weapon changes, two channel changes (' + (plays('weaponSwitch') - p0) + ')');
    if (typeof T.toggleHolster === 'function') {
      p0 = plays('weaponSwitch'); T.toggleHolster(); await wait(120); T.toggleHolster(); await wait(120);
      ok(plays('weaponSwitch') - p0 === 2, 'holstering and drawing: one each (' + (plays('weaponSwitch') - p0) + ')');
    }
    // 5. The sniper's bolt, on its beats.
    T.setWeapon(W.indexOf('sniper')); await simWait(0.8);
    const bolt = () => ['boltUp', 'boltBack', 'boltFwd', 'boltDown'].map(plays);
    T.setAmmoDbg('sniper', 3);
    const b0 = bolt();
    T.setMouseFireDbg(true); await simWait(0.06); T.setMouseFireDbg(false);
    await simWait(1.1);
    const b1 = bolt();
    ok(b1.every((v, i) => v - b0[i] === 1), 'a sniper round, then the bolt: up, back, forward, down, once each (' + b1.map((v, i) => v - b0[i]).join(' ') + ')');
    T.setAmmoDbg('sniper', 1); await simWait(0.3);
    const b2 = bolt();
    T.setMouseFireDbg(true); await simWait(0.06); T.setMouseFireDbg(false);
    await simWait(1.1);
    ok(bolt().every((v, i) => v === b2[i]), 'after the last round the bolt stays shut (the reload works it)');
    // 6. The low end as CL-134 left it.
    const lows = []; for (const k of A.GUN_KEYS) for (const L of G.GUN_DEFS[k].layers) if (L.k === 'thump' || L.k === 'sub') lows.push(k + ':' + L.k + ':' + L.f.join('/') + ':' + L.d);
    ok(lows.length >= 25 && lows.includes('shotgun:sub:42/37:220') && lows.includes('m4:thump:185/105:44') && lows.includes('boom:sub:34/28:500'), 'the punch and the sub are untouched (' + lows.length + ' layers; the shotgun\'s sub 42 to 37 Hz over 220 ms)');
    await simWait(0.5);
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
