// t179 - CU-82 (Jerry): the HQ is locked down at night. From the alarm to the morning E at the kiosk, the Armory, the
// CIF and the HQ panel opens nothing, and the build menu (B, the wheel, a picked piece) is refused; a build in hand
// is put away. By day all of them open again.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const standAt = async (p) => { for (let i = 0; i < 20; i++) { T.player.position.set(p.x, T.sampleHeight(p.x, p.z), p.z); await wait(30); if (Math.hypot(T.player.position.x - p.x, T.player.position.z - p.z) < 0.3) break; } };
  const S = () => T.lockdownState();
  const RED = 0xff2a1a;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const lights = () => {
    const H = T.house;
    return { bay: H.bayLampMat.emissive.getHex(), flood: H.hqLight.color.getHex(), beacon: H.panelBeacon ? H.panelBeacon.emissive.getHex() : null,
      signs: (H.lockSigns || []).map((m) => m.emissive.getHex()), strobes: (H.strobes || []).map((s) => s.mat.emissive.getHex()) };
  };
  const closeAll = () => { if (T.isShopOpen()) T.closeShop(); if (T.isCIFOpen()) T.closeCIF(); if (S().briefing && T.closeHQBriefing) T.closeHQBriefing(); };
  try {
    await startMatch(T, 'Lockdown');
    T.unlockAllBuilds(); T.addCash(100000);
    ok(T.getPhase() === 'prep' && T.nightLockdown() === false, 'by day the HQ is open');
    const day0 = lights();
    ok(day0.bay !== RED && day0.flood !== RED && day0.signs.length === 2 && day0.signs.every((c) => c !== 0xff4a3a), 'by day the HQ lights are their day colours (bay ' + hex(day0.bay) + ', flood ' + hex(day0.flood) + ')');
    // By day: the build menu and a station open.
    T.setPlaceMode('barricade');
    ok(S().placeMode === 'barricade', 'by day a piece can be picked');
    await standAt(T.KIOSK);
    T.setPlaceMode(null);
    await wait(60);
    ok(T.actionTarget() === 'kiosk', 'he is at the kiosk (' + T.actionTarget() + ')');
    T.doAction();
    ok(T.isShopOpen() === true, 'by day E opens the kiosk');
    closeAll();
    // A piece in hand when night falls is put away.
    await standAt({ x: 24, z: 24 });
    T.setPlaceMode('barricade');
    T.beginWave();
    await wait(200);
    ok(T.nightLockdown() === true, 'the wave is night: the HQ is locked down');
    ok(!S().placeMode && !S().buildMode, 'the piece in hand was put away (' + S().placeMode + ')');
    const n0 = lights();
    ok(n0.bay === RED && n0.flood === RED && n0.beacon === RED && n0.signs.every((c) => c === 0xff4a3a) && n0.strobes.length === 4 && n0.strobes.every((c) => c === RED),
      'at night every HQ light is red (' + JSON.stringify({ bay: hex(n0.bay), flood: hex(n0.flood), beacon: n0.beacon && hex(n0.beacon), signs: n0.signs.map(hex), strobes: n0.strobes.map(hex) }) + ')');
    T.setPlaceMode('barricade');
    ok(!S().placeMode, 'a piece can\'t be picked at night');
    T.openWheel('build');
    ok(S().wheel !== 'build', 'the build wheel does not open at night');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', key: 'b' }));
    await wait(40);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyB', key: 'b' }));
    await wait(40);
    ok(!S().buildMode && !S().placeMode && S().wheel !== 'build', 'B does not start building at night');
    // Each station refuses on E.
    const bag = T.getSkullBag(); bag.count = 3; bag.value = 12;
    await standAt(T.HQ_WINDOW_FRONT);
    await wait(60);
    const wa = T.actionTarget();
    T.doAction();
    await wait(60);
    ok(wa === 'hqWindow' && T.hq.dep === 'idle' && T.getSkullBag().count === 3, 'at night the skull window takes nothing (target ' + wa + ', ' + T.hq.dep + ', bag ' + T.getSkullBag().count + ')');
    const stations = [['kiosk', T.KIOSK], ['hqPanel', T.HQ_PANEL_FRONT], ['cif', T.HQ_CIF_FRONT], ['armory', T.HQ_ARMORY_FRONT]];
    for (const [want, p] of stations) {
      await standAt(p);
      await wait(60);
      const a = T.actionTarget();
      T.doAction();
      await wait(60);
      const s = S();
      ok(a === want && !s.shop && !s.cif && !s.briefing, 'at night E at the ' + want + ' opens nothing (target ' + a + ', ' + JSON.stringify({ shop: s.shop, cif: s.cif, briefing: s.briefing }) + ')');
      closeAll();
    }
    ok(T.openShop() === undefined && !T.isShopOpen(), 'the kiosk refuses even when asked directly');
    T.openCIF();
    ok(!T.isCIFOpen(), 'so does the CIF');
    // The morning opens it all again.
    T.startPrep();
    await wait(200);
    ok(T.nightLockdown() === false, 'by the next morning the HQ is open again');
    const m0 = lights();
    ok(JSON.stringify(m0) === JSON.stringify(day0), 'and its lights are back to their day colours (' + JSON.stringify({ bay: hex(m0.bay), flood: hex(m0.flood) }) + ')');
    await standAt(T.HQ_CIF_FRONT);
    await wait(60);
    T.doAction();
    ok(T.isCIFOpen() === true, 'and E opens the CIF');
    closeAll();
    await standAt(T.HQ_WINDOW_FRONT);
    await wait(60);
    T.doAction();
    ok(T.hq.dep === 'open' && T.getSkullBag().count === 0, 'and the skull window takes the bag again (' + T.hq.dep + ')');
    T.setPlaceMode('barricade');
    ok(S().placeMode === 'barricade', 'and a piece can be picked');
    // The night starts with the alarm, before the wave itself.
    T.hqStartWave();
    await wait(150);
    ok(T.getPhase() === 'prep' && T.nightLockdown() === true, 'the alarm locks the HQ down before the wave begins');
    ok(!S().placeMode, 'and puts the piece in hand away');
    ok(lights().bay === RED && lights().flood === RED, 'and turns the HQ lights red as it sounds');
    T.openCIF();
    ok(!T.isCIFOpen(), 'the CIF refuses while the alarm sounds');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
