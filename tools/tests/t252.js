// t252 - GB-167 (Jerry, 2026-10-13): "The X button to switch between semi and full auto needs a little click sound.
// Also a small little thumb animation for each weapon that has both semi and full auto."
//  - X (toggleFireMode) on the M4 and the AK plays the selector click (semi / auto) and starts the thumb flick, which
//    moves the firing hand's thumb and is over inside 0.35 s.
//  - A semi-only gun (shotgun) and the sear-less pistol get neither.
//  - The flick never holds up the gun: a held trigger still fires a burst while it runs.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await until(() => T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0, 3000);
    await wait(250);
    return T.getCurrentWeapon() === w;
  };
  try {
    await startMatch(T, 'Selector');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode'); T.grantAllWeapons();
    const F = T.selectorFlick, A = T.AudioSys;
    ok(!!F && !!A.selectorClick, 'the flick and the click are wired');
    for (const w of ['m4', 'ak']) {
      if (!(await take(w))) { ok(false, 'could not take ' + w); continue; }
      const n0 = F.state.count, mode = T.toggleFireMode();
      ok(F.state.count === n0 + 1 && F.state.weapon === w, w + ': X starts the thumb flick');
      const last = A.selectorLast();
      ok(last.mode === mode, w + ': the selector click plays for ' + mode + ' (' + JSON.stringify(last) + ')');
      ok(F.phase(w) >= 0, w + ': the flick is running');
      await wait(450);
      ok(F.phase(w) === -1, w + ': and it is over in under half a second');
      T.toggleFireMode();
    }
    for (const w of ['shotgun', 'pistol']) {
      if (!(await take(w))) { ok(false, 'could not take ' + w); continue; }
      const n0 = F.state.count; T.toggleFireMode();
      ok(F.state.count === n0, w + ': no flick on a gun without both modes');
    }
    // the flick is visual: an M4 on AUTO still fires a burst with the flick running
    await take('m4');
    if (T.toggleFireMode() !== 'auto') T.toggleFireMode();
    T.setAmmoDbg('m4', 20); await wait(150);
    const a0 = T.getAmmo().m4; T.toggleFireMode(); T.toggleFireMode();
    T.setMouseFireDbg(true); await wait(700); T.setMouseFireDbg(false);
    ok(a0 - T.getAmmo().m4 >= 2, 'M4 fires a burst through the flick (' + (a0 - T.getAmmo().m4) + ' rounds)');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
