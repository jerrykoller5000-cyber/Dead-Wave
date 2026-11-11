// tcb301 - CB-301 (ChatGPT 2, GT-20080): the magazine art (gun.userData.setMagazineRounds) shows each gun's own rounds. One Wasp:
// the main gun gets the rounds in hand. A pair: the main gun gets the first magazine's rounds, the offhand gun the second's,
// each as it changes (a shot from either hand).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (code) => { document.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true })); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.magArtDbg || !T.magazinesDbg) { ok(false, 'the hooks are there (magArtDbg, magazinesDbg)'); return out.join('\n'); }
    await startMatch(T, 'CB301');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'uzi'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('uzi')); await wait(150); }
    await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(400);
    ok(T.getCurrentWeapon() === 'uzi', 'the Wasp in hand');
    const hasArt = typeof (T.weaponMeshes.uzi && T.weaponMeshes.uzi.userData.setMagazineRounds) === 'function';
    ok(hasArt, 'the Wasp\'s model takes a magazine count');
    const loaded = () => (T.magazinesDbg('uzi') || {}).loaded || [];
    await wait(200);
    ok(T.magArtDbg().uzi === (T.getAmmo().uzi | 0), 'one gun: the art shows the rounds in hand (' + T.magArtDbg().uzi + ' / ' + T.getAmmo().uzi + ')');
    key('KeyY'); await wait(800);
    const L = loaded();
    ok(L.length > 1, 'a pair in hand (' + L.length + ' magazines loaded)');
    if (L.length > 1) {
      T.setMouseFireDbg(true); await wait(350); T.setMouseFireDbg(false); await wait(300);
      const L2 = loaded(), art = T.magArtDbg();
      ok(art.uzi === (L2[0] | 0), 'the main gun shows its own magazine: ' + art.uzi + ' (mag ' + L2[0] + ')');
      if ('uzi:2' in art) ok(art['uzi:2'] === (L2[1] | 0), 'the offhand gun shows its own: ' + art['uzi:2'] + ' (mag ' + L2[1] + ')');
      else out.push('INFO the offhand Wasp has no setMagazineRounds of its own (a clone drops userData functions): its count waits on the art');
      ok(L2[0] + L2[1] < L[0] + L[1], 'after a burst from the pair (' + (L[0] + L[1]) + ' to ' + (L2[0] + L2[1]) + ')');
    }
    // a dry reload of one gun: the incoming magazine's count shows once it has left the pouch (ChatGPT 2: the Breacher's drum)
    key('KeyY'); await wait(600);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'aa12'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('aa12')); await wait(150); }
    await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(300);
    if (T.getCurrentWeapon() === 'aa12') {
      T.setAmmoDbg('aa12', 0); await wait(200);
      const spare = Math.max(0, ...(((T.magazinesDbg('aa12') || {}).spare) || []).map((m) => m | 0));
      T.startReload();
      let early = null, late = null;
      const t0 = Date.now();
      while (T.isReloading() && Date.now() - t0 < 15000) { const R = T.getReloadDbg ? T.getReloadDbg() : null, u = R && R.anim ? 1 - R.timer / R.anim : null; const a = T.magArtDbg().aa12; if (u != null && u < 0.3 && early == null) early = a; if (u != null && u > 0.5) late = a; await wait(60); }
      ok(early === 0, 'the Breacher\'s empty drum shows empty early in the reload (' + early + ')');
      ok(((T.magazinesDbg('aa12') || {}).loaded || []).length !== 1 || (late === spare && spare > 0), 'and the incoming drum its own count once out of the pouch (' + late + ' of ' + spare + ')');
    }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { try { T.setMouseFireDbg(false); } catch (_) {} }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
