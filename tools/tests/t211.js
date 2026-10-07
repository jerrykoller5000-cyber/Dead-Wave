// t211 - GB-138 (Jerry's playthrough 1: "Watchmen MG never got created"): the Watchman made real. Its rounds leave
//  its own muzzle (not the hidden rifle in his hands) with a flash there; its own feed, the linked 7.62 the kiosk sells
//  once its plans are bought: R on the gun changes the belt (no fire meanwhile), and an empty belt feeds itself while
//  there are rounds; the HUD shows the belt while he is on it. (t141 keeps the buy/mount/carry basics; t156 Brandt.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const f2 = (v) => (+v).toFixed(2);
  try {
    await startMatch(T, 'Watchman');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const D = () => T.m240Dbg();
    ok(typeof T.m240Dbg === 'function' && typeof T.feedM240 === 'function' && T.M240_FEED_S > 2, 'hooks: m240Dbg, feedM240, M240_FEED_S ' + T.M240_FEED_S);
    // (1) The feed is sold once the plans are bought.
    ok(!T.stockedLooseCalibers().includes('7.62 belt'), 'no plans: no 7.62 belt at the kiosk');
    T.unlockAllBuilds();
    ok(T.stockedLooseCalibers().includes('7.62 belt'), 'with the plans: the kiosk sells the 7.62 belt');
    const R = T.getReserve();
    const r0 = R['7.62 belt'] | 0;
    T.addCash(500);
    ok(T.buyAmmo('7.62 belt', true) === true && (R['7.62 belt'] | 0) === r0 + 300, 'bought a 300-round belt: reserve ' + (R['7.62 belt'] | 0));
    // (2) Mount: the HUD shows the belt.
    // Out in the open, 12 m off the HQ (the start is beside it and its walls take rounds).
    const p = T.player.position;
    const hc = T.house && T.house.group ? T.house.group.position : { x: p.x - 1, z: p.z };
    let ux = p.x - hc.x, uz = p.z - hc.z; { const l = Math.hypot(ux, uz); if (l < 0.5) { ux = 1; uz = 0; } else { ux /= l; uz /= l; } }
    const half = (T.house && T.house.half) || 6, S = { x: hc.x + ux * (half + 12), z: hc.z + uz * (half + 12) };
    p.set(S.x, T.sampleHeight(S.x, S.z), S.z);
    await wait(150);
    const gun = T.spawnBuild('m240', S.x + ux * 1.2, S.z + uz * 1.2);
    ok(!!gun && gun.belt === 500, 'placed with 500 on the belt');
    ok(T.mountMortar(gun) === true, 'manned');
    await wait(100);
    ok(D().hudName === 'Watchman MG' && /^500 \/ 1000/.test(D().hud) && D().hud.indexOf(String(R['7.62 belt'] | 0)) >= 0, 'the HUD shows the belt: ' + D().hudName + ' - ' + D().hud);
    // (3) A round leaves the gun's own muzzle, and it flashes there.
    const yaw = gun.mesh.rotation.y, gx = gun.mesh.position.x, gz = gun.mesh.position.z;
    const tx = gx + Math.sin(yaw) * 16, tz = gz + Math.cos(yaw) * 16;
    const mz = T.m240MuzzleWorld(gun.mesh, T.player.position.clone());
    const handMuzzle = T.player.position.clone();
    T.setAimTargetDbg(tx, tz);
    const before = new Set(); T.scene.traverse((o) => { if (o.isMesh && o.visible) before.add(o); });
    T.fireMortar();
    let fresh = null; T.scene.traverse((o) => { if (!fresh && o.isMesh && o.visible && !before.has(o) && o.position.distanceTo(mz) < 0.08) fresh = o; });
    ok(gun.belt === 499, 'one round off the belt');
    ok(!!fresh, 'a round starts at the Watchman\'s muzzle (' + f2(mz.x - gx) + ', ' + f2(mz.y - gun.mesh.position.y) + ', ' + f2(mz.z - gz) + ' from its foot)');
    ok(mz.distanceTo(handMuzzle) > 0.3 && Math.hypot(mz.x - gx, mz.z - gz) > 0.5, 'and that is the gun, not his hands: ' + f2(mz.distanceTo(handMuzzle)) + ' m from him');
    ok(D().flash === true, 'the muzzle flashes');
    await wait(250);
    ok(D().flash === false, 'and the flash goes out');
    // (4) Rounds aimed at a zombie in front of it hit it.
    const z = T.spawnZombie(tx, tz, 'shambler', true, true);
    z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0;
    // The reticle over a body aims at the body (updateMouseAim's rayPickZombie): at its chest.
    const zp = z.mesh.position.clone(); let gone = -1;
    for (let i = 0; i < 25; i++) { if (!z.mesh || !z.alive) { gone = i; break; } T.aimPointDbg(zp.x, zp.y + 1.0, zp.z); T.fireMortar(); await wait(110); }
    ok(z.hp < 1e6 - 50, 'aimed at a zombie 16 m out, it hits it: ' + Math.round(1e6 - z.hp) + ' damage from ' + (499 - gun.belt) + ' rounds (zombie ' + f2(Math.hypot(zp.x - mz.x, zp.z - mz.z)) + ' m' + (gone >= 0 ? ', gone after ' + gone + ' rounds, alive ' + z.alive : '') + ')');
    T.clearZombies && T.clearZombies();
    // (5) R changes the belt: no fire meanwhile, then the belt fills from the reserve.
    const beltNow = gun.belt, res1 = R['7.62 belt'] | 0;
    T.startReload();
    ok(D().feedT > 0 && /Reloading/.test(D().hud), 'R on the gun starts a belt change (' + f2(D().feedT) + ' s)');
    T.fireMortar();
    ok(gun.belt === beltNow, 'no fire while the belt is changed');
    await until(() => D().feedT === 0, 8000);
    const want = Math.min(1000 - beltNow, res1);
    ok(gun.belt === beltNow + want && (R['7.62 belt'] | 0) === res1 - want, 'the belt is fed from the reserve: ' + gun.belt + ' on, ' + (R['7.62 belt'] | 0) + ' left');
    // (6) Empty with nothing in reserve: the empty click; with rounds in reserve it feeds itself.
    gun.belt = 0; R['7.62 belt'] = 0;
    await wait(400);
    T.fireMortar();
    ok(gun.belt === 0 && D().feedT === 0, 'empty, nothing in reserve: no feed');
    R['7.62 belt'] = 40;
    await wait(400);
    T.fireMortar();
    ok(D().feedT > 0, 'empty with 40 in reserve: the trigger starts a belt change');
    await until(() => D().feedT === 0, 8000);
    ok(gun.belt === 40 && (R['7.62 belt'] | 0) === 0, 'it takes what there is: ' + gun.belt);
    // (7) Off the gun: a belt change stops, and the HUD is his own gun again.
    gun.belt = 10; R['7.62 belt'] = 100;
    T.startReload();
    ok(D().feedT > 0, 'a belt change started');
    T.shoulderMortar();
    await wait(200);
    const carried = T.getMortarCarried();
    ok(!!carried && carried.kind === 'm240' && carried.belt === 10 && (R['7.62 belt'] | 0) === 100, 'shouldered mid-change: nothing fed, the belt goes with it (' + (carried && carried.belt) + ')');
    ok(D().belt === null && D().hudName !== 'Watchman MG', 'off the gun the HUD is his own gun: ' + D().hudName);
    // (8) Brandt's roof gun (t156 has the rest of him): its rounds leave its muzzle, and it flashes there.
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    const RD = T.roofDbg, L = T.hqLadderAt();
    T.setDay(3); T.startPrep(); await wait(100); RD.takeIn('ranger'); T.startPrep(); await wait(100);
    const bg = T.brandtGunDbg();
    ok(!!bg, 'Brandt is on the roof with his M240');
    const cx = L.x + 5.15, cz = L.z;
    const zb = T.spawnZombie(cx + 16, cz + 3, 'shambler', true, true); zb.riseT = 0; zb.hp = zb.maxHp = 1e6; zb.speed = zb.baseSpeed = 0;
    T.player.position.set(-5.9, T.sampleHeight(-5.9, -2.2), -2.2);
    T.hqStartWave();
    await until(() => T.brandtGunDbg() && T.brandtGunDbg().shots >= 4 && zb.hp < 1e6, 8000);
    const bm = T.m240MuzzleWorld(bg.gun, T.player.position.clone()), post = RD.crew().find((c) => c.who === 'brandt');
    ok(T.brandtGunDbg().shots >= 4 && zb.hp < 1e6, 'Brandt fires and hits: ' + T.brandtGunDbg().shots + ' rounds, ' + Math.round(1e6 - zb.hp) + ' damage');
    ok(T.brandtGunDbg().flashed === true, 'his M240 flashes at its muzzle');
    ok(Math.hypot(bm.x - post.x, bm.z - post.z) > 0.6 && bm.y > post.y + 0.4, 'his muzzle is the gun\'s, out in front of his post (' + f2(Math.hypot(bm.x - post.x, bm.z - post.z)) + ' m out, ' + f2(bm.y - post.y) + ' m up)');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();