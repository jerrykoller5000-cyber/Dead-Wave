// tcb251 - CB-251 (J121, Jerry's 9 Nov playtest: "I want it to be that wherever the real spinning blade hits, that is where
//  it actually cuts"): the chainsaw cut everything in a 3.1 m cone from his chest along the aim, whatever the bar was doing.
//  Its cut is now its chain, a capsule from the rear sprocket to the nose where the player SEES it (first person: the view
//  gun's own place through the main camera; third person: the saw in his hands). Checked in both views: a body on the
//  bar is cut; one a hair past the nose, or a hair beside the bar, is not (and the nose's reach is the body's radius +
//  the chain's + the slop, no more); a body 2.4 m out on the aim, where the old cone cut, is not; four bodies on the bar
//  are cut three at a time (SAW_MAX_BODIES), as before.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const SLOP = 0.12;   // combat/saw-blade.js SAW_SLOP
  const px = 10, pz = 10;
  const hold = () => { T.player.position.set(px, T.sampleHeight(px, pz), pz); T.setHp(1e6); };
  // One synchronous cut: a zombie at (x, z), one tick of the saw, the damage it took. Nothing awaits in between, so the
  // saw does not move between the blade being read and the cut.
  const cutAt = (x, z) => {
    const zb = T.spawnZombie(x, z, 'shambler', true, true);
    zb.riseT = 0; zb.speed = zb.baseSpeed = 0; zb.hp = zb.maxHp = 1000;
    zb.mesh.position.set(x, T.sampleHeight(x, z), z);
    T.sawDbg.tick();
    return 1000 - zb.hp;
  };
  const battery = async (label) => {
    T.clearZombies(); await wait(60); hold();
    const probe = T.spawnZombie(px + 3, pz + 3, 'shambler', true, true); const zr = probe.radius, zh = probe.hitH; T.clearZombies(); await wait(40); hold();
    ok(zr > 0.2 && zh > 1, label + ': a shambler is ' + zr.toFixed(2) + ' m round, ' + zh.toFixed(2) + ' m tall');
    const b = T.sawDbg.blade();
    const len = Math.hypot(b.bx - b.ax, b.by - b.ay, b.bz - b.az);
    const up = (b.ay + b.by) / 2 - T.player.position.y, away = Math.hypot((b.ax + b.bx) / 2 - px, (b.az + b.bz) / 2 - pz);
    ok(len > 0.35 && len < 1.4, label + ': the chain is ' + len.toFixed(2) + ' m long as drawn');
    ok(up > 0.2 && up < 2.0 && away < 1.6, label + ': it is ' + up.toFixed(2) + ' m up and ' + away.toFixed(2) + ' m from him');
    ok(b.r > 0.02 && b.r < 0.25, label + ': the chain is ' + b.r.toFixed(3) + ' m thick');
    const hl = Math.hypot(b.bx - b.ax, b.bz - b.az);
    if (hl < 0.3) { ok(false, label + ': the bar lies along the ground (' + hl.toFixed(2) + ' m), so the edge cases are skipped'); return; }
    const hx = (b.bx - b.ax) / hl, hz = (b.bz - b.az) / hl, sx = -hz, sz = hx;
    const mx = (b.ax + b.bx) / 2, mz = (b.az + b.bz) / 2, gap = zr + b.r + SLOP;

    ok(cutAt(mx, mz) > 0, label + ': a body on the bar is cut');
    T.clearZombies(); await wait(30); hold();
    const nose = (d) => { const bb = T.sawDbg.blade(); const l = Math.hypot(bb.bx - bb.ax, bb.bz - bb.az) || 1; const ux = (bb.bx - bb.ax) / l, uz = (bb.bz - bb.az) / l; return cutAt(bb.bx + ux * d, bb.bz + uz * d); };
    const inside = nose(gap - 0.06); T.clearZombies();
    ok(inside > 0, label + ': a body just inside the nose\'s reach (' + (gap - 0.06).toFixed(2) + ' m past it) is cut: ' + inside.toFixed(1));
    const outside = nose(gap + 0.10); T.clearZombies();
    ok(outside === 0, label + ': a body just past it (' + (gap + 0.10).toFixed(2) + ' m) is not: ' + outside.toFixed(1));
    const side = (d) => { const bb = T.sawDbg.blade(); const l = Math.hypot(bb.bx - bb.ax, bb.bz - bb.az) || 1; const ux = (bb.bx - bb.ax) / l, uz = (bb.bz - bb.az) / l; return cutAt((bb.ax + bb.bx) / 2 - uz * d, (bb.az + bb.bz) / 2 + ux * d); };
    const beside = side(gap - 0.06); T.clearZombies();
    ok(beside > 0, label + ': a body at the bar\'s side, inside its reach, is cut: ' + beside.toFixed(1));
    const wide = side(gap + 0.25); T.clearZombies();
    ok(wide === 0, label + ': a body ' + (gap + 0.25).toFixed(2) + ' m off the bar\'s middle (the old cone took it) is not: ' + wide.toFixed(1));
    const wideL = (() => { const bb = T.sawDbg.blade(); const l = Math.hypot(bb.bx - bb.ax, bb.bz - bb.az) || 1; const ux = (bb.bx - bb.ax) / l, uz = (bb.bz - bb.az) / l; return cutAt((bb.ax + bb.bx) / 2 + uz * (gap + 0.25), (bb.az + bb.bz) / 2 - ux * (gap + 0.25)); })(); T.clearZombies();
    ok(wideL === 0, label + ': nor the other side: ' + wideL.toFixed(1));

    // The old cone: 2.4 m out along the aim (inside its 3.1 m + the body's radius), a metre past the nose.
    const yaw = Math.atan2(hx, hz); T.setAimYawDbg(yaw);
    const far = cutAt(px + Math.sin(yaw) * 2.4, pz + Math.cos(yaw) * 2.4); T.clearZombies();
    ok(far === 0, label + ': a body 2.4 m out on the aim is not cut: ' + far.toFixed(1));
    const behind = cutAt(px - Math.sin(yaw) * 1.0, pz - Math.cos(yaw) * 1.0); T.clearZombies();
    ok(behind === 0, label + ': nor one behind him: ' + behind.toFixed(1));

    // Four on the bar: three a tick.
    const bb = T.sawDbg.blade();
    const zs = [0.15, 0.4, 0.6, 0.85].map((t) => {
      const x = bb.ax + (bb.bx - bb.ax) * t, z = bb.az + (bb.bz - bb.az) * t;
      const zb = T.spawnZombie(x, z, 'shambler', true, true);
      zb.riseT = 0; zb.speed = zb.baseSpeed = 0; zb.hp = zb.maxHp = 1000; zb.mesh.position.set(x, T.sampleHeight(x, z), z);
      return zb;
    });
    T.sawDbg.tick();
    const cutN = zs.filter((zb) => zb.hp < 1000).length;
    ok(cutN === 3, label + ': four on the bar, three cut in a tick (' + cutN + ')');
    T.clearZombies(); await wait(40);
  };
  try {
    if (!T.sawDbg) { ok(false, 'the hook T.sawDbg is there'); return out.join('\n'); }
    await startMatch(T, 'Chain cut');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.grantAllWeapons(); T.addCash(100000);
    const W = T.WEAPON_ORDER;
    T.setWeapon(W.indexOf('chainsaw')); await until(() => T.getCurrentWeapon() === 'chainsaw', 3000); await wait(900);
    ok(T.getCurrentWeapon() === 'chainsaw', 'the chainsaw in hand');
    hold(); await wait(200); hold();

    T.setViewFirstDbg(false); await wait(1500); hold();
    await battery('third person');

    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person (' + (T.fpDbg().w || 0).toFixed(2) + ')');
    ok(await until(() => T.sawDbg.first(), 10000), 'the view saw is up');
    await wait(600); hold();
    await battery('first person');

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  } finally {
    try { T.setViewFirstDbg && T.setViewFirstDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
