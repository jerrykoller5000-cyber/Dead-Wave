// t344 - CD-24 (Jerry D-237 #8, "Fighting gameplay not smooth enough to get into"; ChatGPT's GP-20220 rank 5; Director GO A+B):
// the first-person gun change runs on the game's own swap time. In first person after a weapon change (what Q calls) the new
// view gun is fully up within 0.30 s (SWAP_DUR is 0.28 s; it waited ~0.5-0.6 s for his third-person draw to put the gun in
// his hand, with no gun on the screen for ~0.25 s while it could fire), and a shot fired during the change snaps the new
// view gun up within 4 frames (the flash came from a gun still below the screen). Third person is unchanged (no view gun).
// budget: 420
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Unarmed');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000); T.grantAllWeapons && T.grantAllWeapons();
    const vm = () => T.viewmodelDbg();
    const step = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 60); };
    const take = (w) => { for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); step(10); } step(90); };
    const upIn = (w, max) => { for (let f = 1; f <= max; f++) { step(1); const I = vm().info; if (I.active && I.key === w && I.raise >= 1) return f; } return null; };
    T.flightHold(true);
    T.setViewFirstDbg(true);
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    for (const [a, b] of [['m4', 'pistol'], ['pistol', 'm4'], ['ak', 'pistol'], ['m4', 'uzi']]) {   // CD-25: + the Wasp
      take(a);
      ok(T.getCurrentWeapon() === a && vm().info.active && vm().info.key === a, a + ' up in first person');
      T.setWeapon(T.WEAPON_ORDER.indexOf(b));
      const f = upIn(b, 60);
      ok(f != null && f <= 18, a + ' -> ' + b + ': the new view gun fully up in ' + (f == null ? 'over 60' : f) + ' frames (bar 18 = 0.30 s)');
      step(60);
    }
    // a shot during the change: the new gun snaps up
    // CD-25 (D-240 #3, GP-20254): and the frame that carries the shot already shows it up (raise >= 0.85), the pistol and the Wasp
    for (const w of ['pistol', 'uzi']) {
      take('m4');
      const cap = w === 'uzi' ? 32 : 12;
      T.setMagazinesDbg && T.setMagazinesDbg(w, cap, [cap, cap]);
      T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      step(5);
      const m0 = T.magazinesDbg(w).loaded[0];
      T.setMouseFireDbg(true); step(1); T.setMouseFireDbg(false);
      const m1 = T.magazinesDbg(w).loaded[0], I1 = vm().info;
      ok(m1 === m0 - 1, 'm4 -> ' + w + ': a click 5 frames into the change fires (' + m0 + ' -> ' + m1 + ')');
      ok(I1.active && I1.key === w && I1.raise >= 0.85, 'm4 -> ' + w + ': the shot\'s own frame shows the new view gun up (raise ' + (+I1.raise).toFixed(2) + ', bar 0.85)');
      const g = upIn(w, 30);
      ok(g != null && g <= 4, 'm4 -> ' + w + ': the shot snaps the view gun fully up in ' + (g == null ? 'over 30' : g) + ' frames (bar 4)');
      step(60);
    }
    // third person: no view gun at any point of the change
    T.setViewFirstDbg(false); step(60);
    T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
    let on = 0; for (let i = 0; i < 45; i++) { step(1); if (vm() && vm().info.active) on++; }
    ok(on === 0, 'third person: the view stays off through the change (' + on + ' frames on)');
    T.flightHold(false);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
