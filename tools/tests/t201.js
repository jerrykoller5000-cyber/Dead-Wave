// t201 - GB-133 (Jerry's playthrough 1, 2026-10-06): two bugs.
//  (1) "When you reload the launcher, 6 casings come out for every 1." The 40 mm drum reloads shell by shell and every
//      shell threw the drum's brass again. Now a reload throws one case per round he fired: 1 after 1, 3 after 3, 6 after 6,
//      and a reload with nothing fired throws none.
//  (2) "No way seen to upgrade build items." Upgrade is now the first wedge of the build wheel's first page (Structure), and
//      its no-blueprint line comes from the catalogue (build.message.requiresUpgrade, the supply terminal, not "the kiosk").
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await until(() => T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0, 3000);
    await wait(250);
    return T.getCurrentWeapon() === w;
  };
  const ammo = () => T.getAmmo().launcher | 0;
  // Fire until the drum holds `left` (one pull at a time; the launcher is semi).
  const fireTo = async (left) => {
    const t0 = Date.now();
    while (ammo() > left && Date.now() - t0 < 12000) { T.setMouseFireDbg(true); await wait(90); T.setMouseFireDbg(false); await wait(160); }
    T.setMouseFireDbg(false);
    return ammo() === left;
  };
  const reloadAll = async () => { T.startReload(); await until(() => T.isReloading(), 1000); await until(() => !T.isReloading(), 15000); await wait(200); return !T.isReloading(); };
  try {
    const S = await import(new URL('/ui/strings.js', location.origin).href);
    await startMatch(T, 'LauncherBrass');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    T.addCash(100000);
    T.grantAllWeapons();
    T.getReserve()['40mm'] = 60;
    ok(typeof T.launcherBrassDbg === 'function', 'TT.launcherBrassDbg is there');
    ok(await take('launcher'), 'launcher in hand');
    T.setAmmoDbg('launcher', 6); await wait(150);
    const thrown = () => T.launcherBrassDbg().thrown;
    for (const n of [1, 3, 6]) {
      const b0 = thrown();
      ok(await fireTo(6 - n), 'fired ' + n + ' (drum ' + ammo() + ', brass in it ' + T.launcherBrassDbg().spent + ')');
      ok(await reloadAll() && ammo() === 6, 'reloaded to ' + ammo());
      const d = thrown() - b0;
      ok(d === n, 'reload after ' + n + ' fired threw ' + d + ' case(s), one per round');
    }
    { const b0 = thrown(); T.setAmmoDbg('launcher', 4); await wait(100); await reloadAll();
      ok(thrown() - b0 === 0 && ammo() === 6, 'two chambers empty but nothing fired: the reload throws no brass (' + (thrown() - b0) + ')'); }

    // (2) Upgrade on the wheel.
    ok(T.BUILD_PAGES[0].keys[0] === 'upgrade', 'Upgrade is the first wedge of page 1 (' + T.BUILD_PAGES[0].name + '): ' + T.BUILD_PAGES[0].keys.join(','));
    ok(T.BUILD_PAGES.flatMap((p) => p.keys).filter((k) => k === 'upgrade').length === 1, 'and only there');
    if (T.openWheel('build')) { const s = T.getWheelState(); ok(s.page === 0 && s.keys[0] === 'upgrade', 'the build wheel opens on Structure with Upgrade first: ' + s.keys.join(',')); T.closeWheelDbg(); }
    else ok(false, 'the build wheel would not open');
    // Its line with no blueprint: the catalogue's.
    const tpl = S.text('build.message.requiresUpgrade', { name: '@@' }).split('@@');
    for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
    const p = T.player.position;
    const gx = Math.round(p.x / 2) + 3, gz = Math.round(p.z / 2) + 3;
    let w = null, cx = gx, cz = gz;
    for (let tries = 0; tries < 200 && !w; tries++) {
      cx = Math.round((Math.random() - 0.5) * 40); cz = Math.round((Math.random() - 0.5) * 40);
      if (T.placeRefusalFor('wall', cx, cz)) continue;
      T.levelGroundRect(T.gridCentre(cx - 3), T.gridCentre(cz - 3), T.gridCentre(cx + 3), T.gridCentre(cz + 3), T.sampleHeight(T.gridCentre(cx), T.gridCentre(cz)), 6);
      w = T.placeBuildAt('wall', cx + 1, cz, 0);
    }
    ok(!!w, 'a wall to upgrade');
    if (w) {
      p.set(T.gridCentre(cx), T.sampleHeight(T.gridCentre(cx), T.gridCentre(cz)), T.gridCentre(cz)); await wait(200);
      T.unlockAllBuilds(); const own = T.getUpgradeOwned(); for (const k of Object.keys(own)) delete own[k];
      const m = T.thinBoxFor(w) || { cx: w.x, cz: w.z };
      T.setPlaceMode('upgrade'); T.setAimRay(m.cx + 0.2, w.mesh.position.y + 9, m.cz + 0.25, -0.2, -8, -0.25); T.updateGhostPreview();
      const h = T.getUpgradeHint();
      ok(T.upgradeTarget() === w, 'the Upgrade tool finds the wall');
      ok(h.startsWith(tpl[0]) && h.endsWith(tpl[1]) && !/kiosk/i.test(h), 'no blueprint: "' + h + '" (the catalogue line)');
      T.setPlaceMode(null);
    }
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.setMouseFireDbg(false); T.clearZombies(); } catch (_) {}
  return out.join('\n');
})();
