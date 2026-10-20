// t253 - CL-193 (Jerry, 2026-10-14): V is a Max Payne shootdodge now, not the roll. "Jumping in every direction in slow
// mo. The ability to move your character and aimpoint mid-air." His calls: everything slows but the aim and the camera;
// a zombie's swing misses him in the air, the rest still hurts; on the ground he stays down shooting until a move key or
// jump; a slow-mo meter the dive drains and that refills, kills topping it up.
//  - V with W held dives up the screen: in the air, flat, slow motion (time scale ~0.28), meter drawn down.
//  - He shoots in the air: a held trigger spends rounds mid-flight.
//  - In the air a zombie's damage misses and fire does not.
//  - He lands, lies (time back to normal), stays down with no key, a fresh W gets him up, then a short cooldown.
// (CL-220: the waits are three times the game time they cover: the suite's page runs slow and dt is capped.)
//  - An empty meter: the dive still goes, at full speed. A kill tops the meter up.
//  - Shouldered (right mouse), the same dive, and the shoulder camera comes down with him.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  try {
    await startMatch(T, 'Dive');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.grantAllWeapons();
    const D = () => T.diveDbg(), P = T.player.position;
    ok(typeof T.diveDbg === 'function' && D().phase === 'idle' && D().meter === 1, 'the dive is wired, idle, a full meter');
    await wait(400);

    // V with W held: up the screen, in the air, flat, in slow motion.
    const x0 = P.x, z0 = P.z, y0 = P.y;
    key('keydown', 'KeyW'); key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(D().phase === 'air', 'V dives (' + D().phase + ')');
    // These waits are long and end on what they wait for: under load the test page may run only a frame or two a second.
    ok(await until(() => D().k < 0.35, 6000), 'time slows (' + D().k.toFixed(2) + ')');
    let top = 0, flightSpeed = 0; const t0 = Date.now();
    while (Date.now() - t0 < 6000 && D().phase === 'air' && !(Date.now() - t0 > 900 && top > 0.3 && D().flat > 0.9)) { top = Math.max(top, P.y - y0); flightSpeed = Math.max(flightSpeed, Math.hypot(D().vx, D().vz)); await wait(30); }
    ok(top > 0.25, 'he leaves the ground (' + top.toFixed(2) + ' m up)');
    ok(D().flat > 0.9, 'he lies flat in the air (' + D().flat.toFixed(2) + ')');
    ok(D().meter < 0.95, 'the meter is being drawn down (' + D().meter.toFixed(2) + ')');

    // He shoots in the air.
    const w = T.getCurrentWeapon(), a0 = T.getAmmo()[w];
    T.setMouseFireDbg(true); await wait(500); T.setMouseFireDbg(false);
    ok(D().phase === 'air' && T.getAmmo()[w] < a0, 'he fires mid-air (' + w + ' ' + a0 + ' -> ' + T.getAmmo()[w] + ')');

    // In the air a zombie's damage misses him and fire does not.
    const z = T.spawnZombie(P.x + 1, P.z + 1, 'shambler', true, true); if (z) { z.riseT = 0; z.speed = z.baseSpeed = 0; }
    const hp0 = T.getHp();
    T.damagePlayer(10, 'shambler', z);
    ok(T.getHp() === hp0, 'a zombie\'s swing misses him in the air (' + hp0 + ' -> ' + T.getHp() + ')');
    T.damagePlayer(4, 'fire');
    ok(T.getHp() < hp0, 'fire still lands (' + hp0 + ' -> ' + T.getHp() + ')');
    T.clearZombies && T.clearZombies();

    // He lands and lies; with W still held from the flight he stays down.
    ok(await until(() => D().phase === 'down', 15000), 'he lands (' + D().phase + ')');
    const travel = Math.hypot(P.x - x0, P.z - z0);
    ok(travel > 1.5 && flightSpeed > 6, 'the dive carried him ' + travel.toFixed(1) + ' m at ' + flightSpeed.toFixed(1) + ' m/s (a wall can stop it short)');
    ok(await until(() => D().k > 0.99, 4500), 'time is back to normal on the ground (' + D().k.toFixed(2) + ')');
    await wait(500);
    ok(D().phase === 'down', 'a key held through the landing does not get him up');
    key('keyup', 'KeyW'); await wait(120); key('keydown', 'KeyW');
    ok(await until(() => D().phase === 'up' || D().phase === 'idle', 4500), 'a fresh W gets him up (' + D().phase + ')');
    key('keyup', 'KeyW');
    ok(await until(() => D().phase === 'idle', 6000), 'and he is back on his feet');
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(D().phase === 'idle', 'a short cooldown before the next one');

    // An empty meter: no slow motion, the dive still goes. A kill tops it up.
    await until(() => D().cd <= 0, 6000);
    T.setDiveMeterDbg(0);
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(D().phase === 'air', 'with an empty meter he still dives');
    await wait(400);
    ok(D().k > 0.99, 'but at full speed (' + D().k.toFixed(2) + ')');
    await until(() => D().phase === 'idle', 6000);
    const m0 = D().meter, k1 = T.spawnZombie(P.x + 4, P.z + 12, 'shambler', true, true);
    if (k1) { k1.riseT = 0; T.damageZombie(k1, 99999, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: k1.mesh.position.y + k1.hitH * 0.4 }); }
    ok(D().meter > m0 + 0.03, 'a kill tops the meter up (' + m0.toFixed(2) + ' -> ' + D().meter.toFixed(2) + ')');

    // Shouldered (right mouse held): the dive works the same, and the shoulder camera comes down with his body.
    await until(() => D().phase === 'idle' && D().cd <= 0, 8000);
    T.setDiveMeterDbg(1); T.setZoomHeldDbg(true);
    ok(await until(() => T.otsDbg().w > 0.9, 5000), 'the shoulder aim is up (' + T.otsDbg().w.toFixed(2) + ')');
    const camUp = T.camera.position.y - P.y;
    key('keydown', 'KeyA'); key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(D().phase === 'air', 'shouldered, V dives');
    await until(() => D().flat > 0.95, 3000); await wait(150);
    const camDown = T.camera.position.y - P.y;
    ok(camDown < camUp - 0.3, 'the shoulder camera comes down with him (' + camUp.toFixed(2) + ' -> ' + camDown.toFixed(2) + ' m over his feet)');
    ok(await until(() => D().phase === 'down', 9000), 'and he lands (' + D().phase + ')');
    key('keyup', 'KeyA'); T.setZoomHeldDbg(false);
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
