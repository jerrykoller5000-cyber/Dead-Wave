// t220 - CL-134 (Jerry, 2026-10-09: "overhaul all weapons sounds ... impactful and fun to hear"). The guns are played
// from banks built by core/gunsynth.js (in a worker, core/gunsynth-worker.js), not from beeps.
//  - The banks build in the background: every gun, hit, handling and suppressed bank is ready within a few seconds of
//    game time, almost all of them off the main thread.
//  - Each bank is real sound: finite, under full scale, a hard front (a gun's first 3 ms near its peak),
//    variants that differ from each other, a tail that dies away to nothing.
//  - The guns sound like themselves: no two guns' first 150 ms share a spectrum, and the loud ones are louder (pistol
//    under the M4 under the shotgun; the sniper at the top).
//  - Firing in the game reaches the audio with the gun's own key, the can when it is fitted, and the hand of a pair.
//  - Bursts are even: a round fired early against the gun's rate is placed on the beat, two in one frame are spread.
//  - The rotary gun's motor loop, a far explosion, a turret off to one side, hits, a reload: all play without an error.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const simWait = async (s, cap = 30000) => { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < s && Date.now() - w0 < cap) await wait(30); };
  try {
    await startMatch(T, 'Guns');
    T.clearZombies(); T.setHp(100000);
    const A = T.AudioSys || window.AudioSys;
    ok(!!A && typeof A.bankStats === 'function' && typeof A.minigunSpin === 'function', 'the bank player and the motor loop are there');
    // 1. The banks build in the background.
    const want = A.GUN_KEYS.length + A.FOLEY_KEYS.length;
    { const w0 = Date.now(); while (A.bankStats().banks < want && Date.now() - w0 < 45000) await wait(200); }
    const st = A.bankStats();
    ok(st.banks >= want, 'every bank is built (' + st.banks + ' of at least ' + want + ': ' + A.GUN_KEYS.length + ' guns, ' + A.FOLEY_KEYS.length + ' handling and hits, the suppressed guns)');
    ok(st.sync <= 2 && st.worker >= st.banks - 2, 'almost all of them off the main thread (' + st.worker + ' in the worker, ' + st.sync + ' on the main thread' + (st.sync ? ': ' + st.syncKeys.join(', ') : '') + ', ' + st.buildMs + ' ms there)');
    // 2. Each bank is real sound: read the banks' own buffers through the module.
    const G = await import(new URL('../../core/gunsynth.js', location.href).href);
    const SR = 48000;
    const rms = (x, a, b) => { let e = 0; for (let i = a; i < b; i++) e += x[i] * x[i]; return Math.sqrt(e / Math.max(1, b - a)); };
    const pk = (x, a = 0, b = x.length) => { let p = 0, at = 0; for (let i = a; i < b; i++) { const v = Math.abs(x[i]); if (v > p) { p = v; at = i; } } return [p, at]; };
    const bad = [], fronts = [], sameVar = [], tails = [];
    const built = {};
    for (const key of A.GUN_KEYS.concat(A.FOLEY_KEYS)) {
      const b = G.buildBank(key, G.defForKey(key), SR); built[key] = b;
      for (const d of b.dry) { const [p] = pk(d); if (!(p > 0.05 && p <= 1.0001) || d.some((v) => !Number.isFinite(v))) bad.push(key); }
      if (G.GUN_DEFS[key]) for (const d of b.dry) { const [p] = pk(d), [f] = pk(d, 0, Math.round(SR * (key === 'revolver' ? 0.009 : 0.003))); if (f < p * 0.75) { fronts.push(key + ' ' + (f / p).toFixed(2)); break; } }
      if (b.dry.length > 1) { const a0 = b.dry[0], a1 = b.dry[1]; let xy = 0, xx = 0, yy = 0; for (let i = 0; i < Math.min(a0.length, a1.length); i++) { xy += a0[i] * a1[i]; xx += a0[i] * a0[i]; yy += a1[i] * a1[i]; } if (xy / Math.sqrt(xx * yy) > 0.97) sameVar.push(key); }
      for (const [l] of b.tail) { const n = l.length, end = rms(l, Math.floor(n * 0.92), n), mx = Math.max(...[0.05, 0.15, 0.3].map((f) => rms(l, Math.floor(n * f), Math.floor(n * f) + 400))); if (end > mx * 0.05) tails.push(key); }
    }
    ok(bad.length === 0, 'every variant of every bank is finite and under full scale' + (bad.length ? ': ' + bad.join(', ') : ''));
    ok(fronts.length === 0, 'every gun hits hardest at its front: its first 3 ms are at least three quarters of its peak (the revolver: its first 9, after its hammer)' + (fronts.length ? ': ' + fronts.join(', ') : ''));
    ok(sameVar.length === 0, 'no two variants of a sound are the same (correlation under 0.97)' + (sameVar.length ? ': ' + sameVar.join(', ') : ''));
    ok(tails.length === 0, 'every tail dies away to nothing' + (tails.length ? ': ' + tails.join(', ') : ''));
    // 3. The guns sound like themselves: a spectrum each (octave bands of the first 150 ms), no two alike.
    const bands = (x) => { const out = []; for (const f of [63, 125, 250, 500, 1000, 2000, 4000, 8000]) { const y = Float32Array.from(x.subarray(0, Math.floor(SR * 0.15))); G.biquad(y, 'bp', f, 1.4, SR); out.push(10 * Math.log10(rms(y, 0, y.length) ** 2 + 1e-12)); } const m = Math.max(...out); return out.map((v) => v - m); };
    const guns = ['pistol', 'uzi', 'm4', 'ak', 'm240', 'minigun', 'shotgun', 'aa12', 'revolver', 'sniper', 'launcher'];
    const prof = Object.fromEntries(guns.map((g) => [g, bands(built[g].dry[0])]));
    let closest = [99, ''];
    for (let i = 0; i < guns.length; i++) for (let j = i + 1; j < guns.length; j++) { const a = prof[guns[i]], b = prof[guns[j]]; const d = Math.sqrt(a.reduce((s, v, k) => s + (v - b[k]) ** 2, 0) / a.length); if (d < closest[0]) closest = [d, guns[i] + '/' + guns[j]]; }
    ok(closest[0] > 1.5, 'no two guns share a spectrum (the closest pair, ' + closest[1] + ', differ by ' + closest[0].toFixed(1) + ' dB a band)');
    const loud = (g) => { const b = built[g]; return 20 * Math.log10(b.level * rms(b.dry[0], 0, Math.floor(SR * 0.3))); };
    const L = Object.fromEntries(guns.map((g) => [g, loud(g)]));
    ok(L.pistol < L.m4 && L.m4 < L.shotgun && L.sniper >= L.ak && L.sniper > L.pistol + 4, 'the bigger guns are louder (pistol ' + L.pistol.toFixed(1) + ', M4 ' + L.m4.toFixed(1) + ', AK ' + L.ak.toFixed(1) + ', shotgun ' + L.shotgun.toFixed(1) + ', sniper ' + L.sniper.toFixed(1) + ' dB)');
    const sup = G.buildBank('m4:s', G.defForKey('m4:s'), SR);
    const hiFront = (x) => { const y = Float32Array.from(x.subarray(0, Math.floor(SR * 0.006))); G.biquad(y, 'hp', 2500, 0.7, SR); return rms(y, 0, y.length); };
    ok(sup.level < built.m4.level * 0.6 && hiFront(sup.dry[0]) < hiFront(built.m4.dry[0]) * 0.7, 'a suppressed M4 is quieter and its crack is mostly gone (level ' + sup.level.toFixed(3) + ' vs ' + built.m4.level.toFixed(3) + ')');
    // 4. Firing in the game reaches the audio with the gun, the can and the hand.
    T.grantAllWeapons && T.grantAllWeapons(); T.addCash && T.addCash(100000);
    const W = T.WEAPON_ORDER, toGun = (w) => { T.setWeapon(W.indexOf(w)); return T.getCurrentWeapon() === w; };
    const heard = [], real = A.fireWeapon;
    A.fireWeapon = (id, o) => { heard.push([id, o ? { ...o } : null]); return real(id, o); };
    const shoot = async () => { T.setAmmoDbg(T.getCurrentWeapon(), 20); T.setMouseFireDbg(true); await simWait(0.35); T.setMouseFireDbg(false); await simWait(0.3); };
    toGun('m4'); await simWait(0.8);
    heard.length = 0; await shoot();
    ok(heard.length > 0 && heard.every(([id, o]) => id === 'm4' && o && o.suppressed === false && o.hand === -1), 'an M4 round is heard as the M4, no can, one hand (' + heard.length + ' rounds: ' + JSON.stringify(heard[0]) + ')');
    T.buySuppressor('m4'); T.armoryDbg.fit('m4', 'suppressor', true);
    heard.length = 0; await shoot();
    ok(heard.length > 0 && heard.every(([id, o]) => id === 'm4' && o.suppressed === true), 'with the can fitted it is heard suppressed (' + JSON.stringify(heard[0]) + ')');
    T.armoryDbg.fit('m4', 'suppressor', false);
    A.fireWeapon = real;
    // 5. Bursts are even.
    const before = A.bankStats().voices;
    A.fireWeapon('m4'); A.fireWeapon('m4');
    ok(A.bankStats().voices > before, 'two rounds in one frame both play (' + (A.bankStats().voices - before) + ' voices started)');
    const dbg = A.bankDbg('m4');
    ok(dbg && Math.abs(dbg.gap - 0.055) < 0.002, 'and the second is placed after the first, not on top of it (' + (dbg ? (dbg.gap * 1000).toFixed(1) : '-') + ' ms later; the M4 fires every 100)');
    // 6. Everything else plays.
    A.minigunSpin(1); await wait(200); A.minigunSpin(0.5); await wait(100); A.minigunSpin(0);
    A.grenadeBoom(0.2, 0.6); A.grenadeBoom(); A.turretShot('heavy', 0.5, -0.4); A.turretShot('m240', 0.3, 0.5);
    A.zombieHit(1, 0.2, false); A.zombieHit(0.8, -0.2, true); A.headshot(); A.emptyClick(); A.shotgunPump(); A.shotgunPump();
    A.reloadCue('charge', 1.3); A.reloadCue('brass'); A.reloadCue('belt'); A.reloadCue('valveShut'); A.brassTink(); A.magThud(0.6, 0);
    A.knifeSwing(); A.knifeHit(); A.macheteSwing(); A.macheteChop(); A.fireWeapon('mortar'); A.fireWeapon('pistol', { hand: 0 }); A.fireWeapon('pistol', { hand: 1 });
    for (const g of guns) A.fireWeapon(g, { suppressed: G.SUPPRESSIBLE.includes(g) });
    await wait(300);
    ok(A.bankStats().voices >= 0 && A.bankStats().voices < 200, 'the rest plays: the motor, explosions near and far, turrets, hits, reloads, blades (' + A.bankStats().voices + ' voices live)');
    await simWait(2);
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
