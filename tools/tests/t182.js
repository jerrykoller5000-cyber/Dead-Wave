// t182 - CL-115 (Jerry): the Training Ground. From the title menu straight into the range (no insertion): five
// pop-up targets past a yellow line, the CIF / supply terminal / Armory on the left wall (copies of the HQ's), the
// build room through the door with the HQ panel (it calls zombies in), the skull window and the infirmary bed.
// Zombies stay in the build room; dying here is a blackout and a wake-up on the bed, not a burial.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    // --- the title menu's button
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const btn = document.getElementById('modeTraining');
    ok(!!btn && /training/i.test(btn.textContent), 'the title menu has a Training Ground button (' + (btn && btn.textContent) + ')');
    const nameEl = document.getElementById('playerName'); if (nameEl && !nameEl.value) nameEl.value = 'Trainee';
    btn.click();
    await until(() => D.state().active, 5000);
    const st = D.state(), tg = D.tg();
    ok(st.active && T.isGameStarted ? T.isGameStarted() !== false : st.active, 'it starts straight away, no insertion');
    ok(document.body.classList.contains('training'), 'the page knows it is in training');
    const p = T.localPlayer ? T.localPlayer.position : T.player.position;
    ok(Math.abs(p.z - tg.spawn.z) < 1 && Math.abs(p.y - tg.floorY) < 0.5, 'he stands behind the firing line (' + p.x.toFixed(1) + ', ' + p.y.toFixed(1) + ', ' + p.z.toFixed(1) + ')');
    ok(Math.hypot(p.x, p.z) > 400, 'far from the map: the world is not around him');
    // CU-120 (Jerry): he walks in unarmed, the pistol holstered (U draws it); the kiosks teach the rest.
    ok(T.getBank() >= 100000 && T.isUnarmed(), 'he walks in unarmed, Cash to spare (CU-120)');
    // --- the room: targets, the line, the stations
    ok(tg.targets.length === 5 && tg.group.getObjectByName('firing-line'), 'five targets and a yellow firing line');
    const copies = ['cif', 'kiosk', 'armory', 'hqPanel', 'skullWindow'].filter((k) => tg.group.getObjectByName('training-' + k));
    ok(copies.length === 5, 'copies of the HQ\'s CIF, supply terminal, Armory, panel and skull window (' + copies.join(',') + ')');
    const kioskCopy = tg.group.getObjectByName('training-kiosk');
    let shared = false; kioskCopy.traverse((o) => { if (o.isMesh && !shared) { T.KIOSK && T.KIOSK.group && T.KIOSK.group.traverse((q) => { if (q.isMesh && q.geometry === o.geometry) shared = true; }); } });
    ok(shared || !T.KIOSK, 'the copy is built from the HQ\'s own pieces (a change there shows here)');
    // --- E at each station
    const stand = (k) => { const f = tg.stations[k].front; p.set(f.x, tg.floorY, f.z); };
    const want = { cif: 'cif', kiosk: 'kiosk', armory: 'armory', hqPanel: 'trainingPanel', skullWindow: 'hqWindow' };
    for (const [k, a] of Object.entries(want)) { stand(k); ok(D.action() === a, 'at the ' + k + ', E is ' + a + ' (' + D.action() + ')'); }
    stand('kiosk'); T.doAction(); await wait(50);
    ok(T.isShopOpen ? T.isShopOpen() : document.getElementById('shop').classList.contains('show'), 'the supply terminal opens here');
    T.closeShop();
    stand('armory'); T.doAction(); await wait(50);
    ok(!document.getElementById('armoryPanel').hidden, 'the Armory opens here');
    document.querySelector('#armoryPanel .armory-actions button:last-child').click(); T.closeCIF && T.closeCIF();
    await wait(50);
    // --- the targets: a round down lane 3 drops its target
    p.set(tg.spawn.x, tg.floorY, tg.spawn.z);
    const t3 = tg.targets[2];
    const round = { prev: { x: t3.box.minX + 0.3, y: (t3.box.minY + t3.box.maxY) / 2, z: t3.box.minZ - 1 }, pos: { x: t3.box.minX + 0.3, y: (t3.box.minY + t3.box.maxY) / 2, z: t3.box.minZ + 1 }, hit: false };
    ok(D.round(round) && round.hit && t3.state === 'falling' && D.state().hits === 1, 'a round down lane 3 drops its target');
    for (let i = 0; i < 80; i++) D.update(0.05);
    ok(t3.state === 'up', 'and it stands up again');
    const wallRound = { prev: { x: tg.origin.x - 7, y: tg.floorY + 1, z: tg.origin.z - 5 }, pos: { x: tg.origin.x - 9, y: tg.floorY + 1, z: tg.origin.z - 5 }, hit: false };
    ok(D.round(wallRound) && wallRound.hit, 'the walls stop rounds');
    // --- he stays in the rooms
    p.set(tg.origin.x + 20, tg.floorY, tg.origin.z); await wait(150);
    ok(p.x < tg.origin.x + 8, 'he can\'t walk through the walls (' + (p.x - tg.origin.x).toFixed(2) + ')');
    // --- the HQ panel calls zombies in (CL-171, GP-155, GP-167): a five-second countdown with the security shutter down,
    // then they walk out of the dark tunnel behind the release gate into the build room and come for him.
    const sim = () => (T.getSimTime ? T.getSimTime() : Date.now() / 1000);
    const simUntil = async (f, s, ms = 60000) => { const s0 = sim(), w0 = Date.now(); while (!f() && sim() - s0 < s && Date.now() - w0 < ms) await wait(50); return !!f(); };
    await wait(3200);   // the first seconds sweep out the title screen's warm-up leftovers
    const room = { x: tg.origin.x - 14, z: tg.origin.z - 8 };
    p.set(room.x, tg.floorY, room.z); await wait(200);
    const panel = D.panel(); D.openPanel(); ok(panel.isOpen(), 'it opens');
    ok(!!panel.element.querySelector('[data-kind="shambler"]') && !panel.element.querySelector('[data-kind="caveguard"]'), 'the HQ panel lists the kinds (' + panel.element.querySelectorAll('[data-kind]').length + ')');
    panel.pick('shambler', 3);
    panel.element.querySelector('.tp-spawn').click();
    ok(!panel.isOpen() && !!D.state().deployment.read(), 'spawn: the countdown starts (' + JSON.stringify(D.state().deployment.read()) + ')');
    ok(D.state().security.read().blocked, 'the security shutter comes down');
    await simUntil(() => D.alive() === 3, 12);
    ok(D.alive() === 3, 'three shamblers called in (' + D.alive() + ')');
    const near = () => Math.min(...T.zombies.filter((z) => z.alive).map((z) => Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z)));
    p.set(room.x, tg.floorY, room.z);
    const d0 = near(); await simUntil(() => near() < d0 - 2, 6); const d1 = near();
    ok(d1 < d0 - 1, 'in the build room they come for him (' + d0.toFixed(1) + ' m -> ' + d1.toFixed(1) + ' m)');
    const why = T.placeRefusalFor ? T.placeRefusalFor('wall', Math.round(p.x), Math.round(p.z)) : null;
    ok(typeof why === 'string' && why.length > 0, 'no building while they are out (' + why + ')');
    p.set(tg.spawn.x, tg.floorY, tg.spawn.z);
    ok(D.clear() === 3 && D.alive() === 0, 'clear all');
    // --- dying: a blackout, then the infirmary bed
    T.setHp ? T.setHp(1) : null;
    T.runDevCommand ? T.runDevCommand('rip') : null;
    await simUntil(() => !!D.state().wake && !D.state().wake.purge, 6);
    ok(!!D.state().wake && !T.isGameOver?.(), 'killed here: no burial, a blackout (' + JSON.stringify({ wake: !!D.state().wake }) + ')');
    ok(document.getElementById('trainingBlackout').classList.contains('on'), 'the screen goes black');
    ok(D.alive() === 0 && T.getHp() > 0, 'the zombies are gone and he is patched up');
    const bed = tg.bed;
    ok(Math.hypot(p.x - bed.x, p.z - bed.z) < 1.4 && /lying|sit/.test((D.state().wake || {}).phase || ''), 'he lies on the infirmary bed (' + ((D.state().wake || {}).phase) + ', his root ' + Math.hypot(p.x - bed.x, p.z - bed.z).toFixed(2) + ' m from the pad)');
    await simUntil(() => !D.state().wake, 12);
    ok(!D.state().wake && Math.abs(p.x - bed.stand.x) < 0.3 && Math.abs(p.z - bed.stand.z) < 0.3, 'then up beside it');
    ok(!document.getElementById('trainingBlackout').classList.contains('on'), 'and the lights are back');
    // --- building: the range is not for it (the build room is, CL-143); leaving puts it all away
    p.set(tg.spawn.x, tg.floorY, tg.spawn.z);
    const why2 = T.placeRefusalFor ? T.placeRefusalFor('wall', Math.round(p.x), Math.round(p.z)) : null;
    ok(typeof why2 === 'string' && why2.length > 0, 'standing on the range, no building there (' + why2 + ')');
    D.leave();
    ok(!D.state().active && !document.body.classList.contains('training') && !tg.group.parent, 'leaving takes the Training Ground away');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
