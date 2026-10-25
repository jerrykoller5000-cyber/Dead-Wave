// t281 - GB-229 (N9, Jerry: "Instead of having the player reload, let's have them auto-reload on empty. I've heard that
// complaint too many times from players."): every gun with a magazine, dry with something to load, starts its reload by
// itself (both views); R still reloads early; dry with nothing to load, it doesn't (and stays dry).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gwait = async (s, cond = () => false) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < s * 6000 + 3000) { if (cond()) return true; await wait(30); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const GUNS = ['pistol', 'revolver', 'uzi', 'm4', 'ak', 'aa12', 'shotgun', 'sniper', 'launcher', 'flamer', 'minigun'];
  const take = async (w) => {
    if (T.marineIdleDbg) T.marineIdleDbg().reset();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(T.WEAPON_ORDER.indexOf(w));
    await gwait(0.8, () => T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0);
    return T.getCurrentWeapon() === w;
  };
  const stock = (w) => {   // something to load
    if (T.magazinesDbg(w)) T.setMagazinesDbg(w, T.magazinesDbg(w).size || 30, [999, 999]);
    else T.getReserve()[T.caliberOf(w)] = 200;
  };
  const dry = (w) => {   // nothing to load
    if (T.magazinesDbg(w)) T.setMagazinesDbg(w, 0, []);
    else T.getReserve()[T.caliberOf(w)] = 0;
  };
  const autoOn = async (w, tag) => {
    if (!await take(w)) { ok(false, w + tag + ': could not take it'); return; }
    while (T.isReloading()) await wait(50);
    stock(w); T.setAmmoDbg(w, 0);
    const t0 = T.getSimTime();
    const went = await gwait(1.2, () => T.isReloading() && T.getReloadDbg().weapon === w);
    ok(went, w + tag + ': dry with ' + T.spareMagCount(w) + ' spare mags / reserve, it reloads by itself (' + (T.getSimTime() - t0).toFixed(2) + ' s game)');
    await gwait(8, () => !T.isReloading());
    ok(T.getAmmo()[w] > 0, w + tag + ': and the gun is loaded after (' + T.getAmmo()[w] + ')');
  };
  try {
    await startMatch(T, 'Auto');
    T.clearZombies(); T.runDevCommand('godmode'); T.setHp(100000); T.grantAllWeapons();
    ok(typeof T.setMagazinesDbg === 'function' && typeof T.isReloading === 'function', 'hooks exported');
    for (const w of GUNS) await autoOn(w, '');
    // First person too.
    T.setViewFirstDbg(true); await gwait(0.8);
    for (const w of ['m4', 'shotgun', 'revolver']) await autoOn(w, ' (first person)');
    T.setViewFirstDbg(false); await gwait(0.5);
    // R still reloads early.
    await take('m4'); stock('m4'); T.setAmmoDbg('m4', 10); T.startReload();
    ok(T.isReloading() && T.getReloadDbg().weapon === 'm4', 'R reloads early (10 rounds in)');
    await gwait(8, () => !T.isReloading());
    // Nothing to load: no reload, stays dry, no page error.
    for (const w of ['m4', 'shotgun']) {
      await take(w); dry(w); T.setAmmoDbg(w, 0);
      const went = await gwait(1.2, () => T.isReloading());
      ok(!went && T.getAmmo()[w] === 0, w + ': dry with nothing to load, no reload (stays at ' + T.getAmmo()[w] + ')');
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();