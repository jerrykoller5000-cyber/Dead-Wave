// t180 - CL-113 (Jerry): the Armory overhaul.
//  - The kiosk sells attachments; buying one doesn't put it on. The Armory's workbench does (and takes it off).
//  - The Armory shows pictures of the real guns, with what they wear; the HQ hatch's rack holds the stored guns.
//  - The weapon wheel never has more than five spaces (2 primaries, 2 secondaries, the hip pistol); Q steps only
//    through those; unarmed is the hub. The Bigtex shooter cheat alone shows every gun.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(100); } return !!f(); };
  const A = T.armoryDbg;
  try {
    await startMatch(T, 'ArmoryX');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    // --- the wheel before anything: the pistol and four empty spaces
    T.openWheel('weapon');
    let keys = T.getWheelState().keys;
    ok(keys.length === 5 && keys.filter((k) => k.startsWith('empty')).length === 4 && keys.includes('pistol'), 'a fresh run: five spaces, four empty and the pistol (' + keys.join(',') + ')');
    T.closeWheelDbg();
    // --- buy everything there is (as a player would: one gun at a time)
    T.addCash(1e6);
    T.grantAllWeapons();   // every gun owned (not the cheat: the wheel keeps to five)
    T.openWheel('weapon'); keys = T.getWheelState().keys; T.closeWheelDbg();
    ok(keys.length === 5, 'every gun owned: still five spaces (' + keys.join(',') + ')');
    ok(keys.includes('pistol') && keys.filter((k) => !k.startsWith('empty')).length === 5, 'two primaries, two secondaries and the pistol (' + keys.join(',') + ')');
    const reach = A.inReach();
    ok(reach.length <= 5 && reach.includes('pistol'), 'Q steps through only those (' + reach.join(',') + ')');
    const seen = new Set();
    for (let i = 0; i < 12; i++) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ', bubbles: true })); T.closeWheelDbg && T.closeWheelDbg(); await wait(30); seen.add(T.getCurrentWeapon()); }
    ok([...seen].every((k) => reach.includes(k)), 'Q never reaches a stored gun (' + [...seen].join(',') + ')');
    // --- the kiosk sells, the Armory fits
    T.buySuppressor('m4'); T.buyExtMag('ak'); T.buyPistolAuto();
    let mods = A.mods('m4');
    ok(mods.find((m) => m.id === 'suppressor').owned && !mods.find((m) => m.id === 'suppressor').fitted, 'a suppressor bought for the M4 is owned, not on it');
    ok(!T.weaponMeshes.m4.userData.suppressed, 'the M4 has no can yet');
    ok(T.weaponMods('ak').ext && T.weaponMods('ak').fitted === null, 'the AK\'s extended mag is owned, not fitted');
    ok(A.fit('m4', 'suppressor', true) && T.weaponMeshes.m4.userData.suppressed === true, 'fitted in the Armory: the can is on the M4');
    ok(A.fit('ak', 'ext', true) && T.weaponMods('ak').fitted === 'ext', 'the AK takes its extended mag');
    const look = T.weaponMeshes.ak.userData.extLook || T.weaponMeshes.ak.userData.magBaseScale;
    ok(!!look && (!T.weaponMeshes.ak.userData.extLook || T.weaponMeshes.ak.userData.extLook.visible), 'and it shows: a longer magazine on the AK');
    ok(!A.fit('m4', 'heavy', true), 'an attachment he hasn\'t bought can\'t go on');
    ok(A.fit('m4', 'suppressor', false) && !T.weaponMeshes.m4.userData.suppressed, 'and one can come off again');
    A.fit('pistol', 'auto', true);
    ok(A.mods('pistol').find((m) => m.id === 'auto').fitted, 'the auto sear goes on the pistol');
    // --- the Armory window: real pictures, the workbench
    T.setPhase && T.setPhase('prep');
    T.openCIF();
    const openBtn = document.getElementById('armoryOpen');
    openBtn.click();
    const panel = document.getElementById('armoryPanel');
    ok(!panel.hidden, 'the Armory opens');
    ok(panel.querySelectorAll('.armory-slots button').length === 4, 'four slot tiles');
    await until(() => panel.querySelectorAll('.armory-pic.real img').length >= 3, 20000);
    const real = panel.querySelectorAll('.armory-pic.real img').length;
    ok(real >= 3, 'pictures of the real guns on the shelves and in the slots (' + real + ', ' + JSON.stringify(A.pics()) + ')');
    const img = panel.querySelector('.armory-pic.real img');
    ok(!!img && /^data:image\/png/.test(img.src) && img.src.length > 2000, 'a real picture, not a blank (' + (img ? img.src.length : 0) + ' chars)');
    // Workbench on a stored gun: its attachments listed, fitted from here.
    const stored = panel.querySelector('.armory-shelf .armory-tune');
    ok(!!stored, 'a stored gun can go to the workbench');
    A.ui().bench('ak'); await wait(50);
    const benchMods = [...panel.querySelectorAll('.armory-mods li')].map((li) => li.dataset.mod + ':' + li.className);
    ok(benchMods.some((m) => m.startsWith('ext:fitted')) && benchMods.some((m) => m.startsWith('heavy:missing')), 'the workbench lists the AK\'s attachments (' + benchMods.join(' ') + ')');
    const take = panel.querySelector('.armory-mods li[data-mod="ext"] button');
    take.click(); await wait(50);
    ok(T.weaponMods('ak').fitted === null, 'its button takes the mag off');
    panel.querySelector('.armory-mods li[data-mod="ext"] button').click(); await wait(50);
    ok(T.weaponMods('ak').fitted === 'ext', 'and puts it back on');
    const chips = [...panel.querySelectorAll('.armory-chips i')].map((i) => i.textContent);
    ok(chips.some((c) => /magazine/i.test(c)), 'fitted attachments show as tags on the gun (' + chips.join(', ') + ')');
    // Swap a stored gun into a slot from the shelves; the wheel follows.
    panel.querySelector('[data-slot="primary:0"]').click();
    const shelfGun = [...panel.querySelectorAll('.armory-shelf button[data-gun]')].find((b) => !b.disabled);
    const want = shelfGun && shelfGun.dataset.gun;
    shelfGun && shelfGun.click();
    panel.querySelector('.armory-actions button:last-child').click();
    T.closeCIF();
    T.openWheel('weapon'); keys = T.getWheelState().keys; T.closeWheelDbg();
    ok(!!want && keys.includes(want) && keys.length === 5, 'the gun taken from the shelf is on the wheel (' + want + ': ' + keys.join(',') + ')');
    // --- the HQ hatch's rack: the stored guns, real copies
    A.refreshRack();
    const rack = A.rack(), storedKinds = A.stored();
    ok(Array.isArray(rack) && rack.length === storedKinds.length && storedKinds.length > 0 && storedKinds.every((k) => rack.includes(k)), 'the HQ rack holds the stored guns (' + (rack || []).join(',') + ')');
    ok(!rack.includes(keys.find((k) => !k.startsWith('empty') && k !== 'pistol')), 'not the ones he carries');
    // --- unarmed is the hub
    T.openWheel('weapon');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: cx + 150, clientY: cy, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: cx, clientY: cy, bubbles: true }));
    const hubOn = document.getElementById('wheelHub').classList.contains('unarmed');
    T.closeWheelDbg(true);
    ok(hubOn, 'back in the middle, the hub says unarmed');
    // --- the Bigtex shooter cheat: every gun
    T.runDevCommand ? T.runDevCommand('bigtex shooter') : null;
    if (A.bigtex()) {
      T.openWheel('weapon'); keys = T.getWheelState().keys; T.closeWheelDbg();
      ok(keys.length > 5 && keys.length === T.WEAPON_ORDER.filter((k) => T.getWeaponOwned()[k]).length, 'Bigtex shooter: every gun he owns (' + keys.length + ')');
      T.runDevCommand('bigtex shooter off');
      T.openWheel('weapon'); keys = T.getWheelState().keys; T.closeWheelDbg();
      ok(keys.length === 5, 'off again: five spaces (' + keys.length + ')');
    } else ok(false, 'the bigtex shooter command is reachable from the test (TT.runDevCommand)');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
