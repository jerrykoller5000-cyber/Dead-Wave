// t253 - CL-193 (Jerry, 2026-10-14) made V a Max Payne shootdodge: a dive in slow motion, with a meter the dive drained
// and that refilled, kills topping it up. CL-248 (D-87, Jerry after his friends' playtest, 2026-10-23: "We are going to
// get rid of slo-mo dive mechanic. Instead it will just slow down time instead of making the player dive."): V slows
// time and he stays on his feet. This check is rewritten for that (the dive's own checks went with it):
//  - V slows time (time scale ~0.28) and draws the meter down; no dive: he never leaves the ground or lies down, and
//    his walking keeps going (W held, he moves);
//  - he shoots in it: a held trigger spends rounds;
//  - a zombie's swing still lands (the dive's mid-air miss went with the dive);
//  - it ends by itself (DIVE.slowFor, 2.5 s of real time), time comes back, a short cooldown before the next one;
//  - with too little meter, V does nothing; a kill tops the meter up;
//  - in first person (the 5 key, CL-247) the same.
// (CL-220: the waits are long and end on what they wait for: the suite's page runs slow and dt is capped.)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  try {
    await startMatch(T, 'Slow-mo');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.grantAllWeapons();
    const D = () => T.diveDbg(), P = T.player.position;
    ok(typeof T.diveDbg === 'function' && D().phase === 'idle' && D().meter === 1 && !D().slowing, 'wired, idle, a full meter, no slow motion');
    await wait(400);

    // V with W held: time slows, he stays on his feet and keeps walking.
    const x0 = P.x, z0 = P.z, y0 = T.sampleHeight(P.x, P.z);
    key('keydown', 'KeyW'); key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(D().slowing && D().phase === 'idle', 'V slows time, no dive (' + D().phase + ', slowing ' + D().slowing + ')');
    ok(await until(() => D().k < 0.35, 6000), 'time slows (' + D().k.toFixed(2) + ')');
    let up = 0; const t0 = Date.now();
    while (Date.now() - t0 < 1200) { up = Math.max(up, P.y - T.sampleHeight(P.x, P.z)); await wait(30); }
    ok(up < 0.15 && D().flat < 0.01 && D().phase === 'idle', 'on his feet all through: never off the ground or lying (' + up.toFixed(2) + ' m up, flat ' + D().flat.toFixed(2) + ')');
    ok(Math.hypot(P.x - x0, P.z - z0) > 0.2, 'and W still walks him (' + Math.hypot(P.x - x0, P.z - z0).toFixed(2) + ' m in slow time)');
    ok(D().meter < 0.95, 'the meter is being drawn down (' + D().meter.toFixed(2) + ')');
    key('keyup', 'KeyW');

    // He shoots in it.
    const w = T.getCurrentWeapon(), a0 = T.getAmmo()[w];
    T.setMouseFireDbg(true); await wait(500); T.setMouseFireDbg(false);
    ok(D().slowing && T.getAmmo()[w] < a0, 'he fires in slow motion (' + w + ' ' + a0 + ' -> ' + T.getAmmo()[w] + ')');

    // A zombie's swing lands: the mid-air miss went with the dive.
    const z = T.spawnZombie(P.x + 1, P.z + 1, 'shambler', true, true); if (z) { z.riseT = 0; z.speed = z.baseSpeed = 0; }
    const hp0 = T.getHp();
    T.damagePlayer(10, 'shambler', z);
    ok(T.getHp() < hp0, 'a zombie\'s swing still lands (' + hp0 + ' -> ' + T.getHp() + ')');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100);

    // It ends by itself; then a short cooldown.
    ok(await until(() => !D().slowing, 12000), 'it ends by itself (' + (D().slowT || 0).toFixed(2) + ' s left)');
    ok(await until(() => D().k > 0.99, 4500), 'time is back to normal (' + D().k.toFixed(2) + ')');
    if (D().cd > 0) { key('keydown', 'KeyV'); key('keyup', 'KeyV'); ok(!D().slowing, 'a short cooldown before the next one'); }
    else ok(true, 'the cooldown had run out already (the page is slow)');

    // Too little meter: nothing. A kill tops it up.
    await until(() => D().cd <= 0, 6000);
    T.setDiveMeterDbg(0);
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    await wait(400);
    ok(!D().slowing && D().k > 0.99 && D().phase === 'idle', 'with an empty meter V does nothing (k ' + D().k.toFixed(2) + ')');
    const m0 = D().meter, k1 = T.spawnZombie(P.x + 4, P.z + 12, 'shambler', true, true);
    if (k1) { k1.riseT = 0; T.damageZombie(k1, 99999, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: k1.mesh.position.y + k1.hitH * 0.4 }); }
    ok(D().meter > m0 + 0.03, 'a kill tops the meter up (' + m0.toFixed(2) + ' -> ' + D().meter.toFixed(2) + ')');

    // First person (the 5 key, CL-247): the same.
    T.setDiveMeterDbg(1); T.setViewFirstDbg && T.setViewFirstDbg(true);
    await until(() => !T.otsDbg || T.otsDbg().w > 0.9, 5000);
    key('keydown', 'KeyV'); key('keyup', 'KeyV');
    ok(D().slowing && await until(() => D().k < 0.35, 6000) && D().phase === 'idle', 'in first person V slows time the same (' + D().k.toFixed(2) + ')');
    T.setViewFirstDbg && T.setViewFirstDbg(false);
    await until(() => !D().slowing, 12000);
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
