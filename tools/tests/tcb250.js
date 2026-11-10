// tcb250 - CB-250 (J120, J122; Jerry's 9 Nov playtest). J120: "If you shoot a target with a flamethrower, the target should
//  burn up and turn to a pile of ash. The player will no longer be able to use the range computer. He can still free shoot
//  other targets he has yet to burn." J122: "Grenade launcher needs to blow range targets to pieces. The player will not
//  longer be able to use the range computer." In the Training Ground: the flamer's fuel on a standing plate burns it to a
//  pile of ash (state 'wrecked', the plate sinks, ash on its stand); a launcher shell's blast breaks a plate into pieces
//  that land on the floor; the other plates still flip when shot; rounds pass through a wrecked lane; the console refuses
//  E once anything is wrecked (and worked before); a new visit brings everything back.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  // Game time: the page draws few frames a second in the suite (dt is capped), so the burn is waited out in sim seconds.
  const gWait = async (s, cond) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < s * 60000) { if (cond && cond()) return true; await wait(25); } return cond ? !!cond() : true; };
  const D = T.trainingDbg;
  try {
    if (!D || !D.wreck) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    await wait(2500);
    const tg = D.tg(), W = T.WEAPON_ORDER, floor = tg.origin.y;
    T.grantAllWeapons && T.grantAllWeapons();
    T.setUnarmedDbg(false);
    ok(!!D.wreck() && !D.wreck().any(), 'nothing is wrecked on arrival');
    ok(tg.targets.length === 5 && tg.targets.every((t) => t.state === 'up'), 'five plates, all up');

    // The console works while the range is whole.
    D.act('rangeConsole'); await wait(300);
    const feat = () => T.rangeDbg && T.rangeDbg.feature && T.rangeDbg.feature();
    ok(!!feat() && feat().isOpen(), 'the range computer opens while every plate stands');
    T.rangeDbg.exit(); await wait(200);
    ok(!feat().isOpen(), 'and closes again');

    // (1) The flamer: lane 1 (the nearest plate), fuel straight at it.
    const lane = tg.targets[0], box = lane.box, cx = (box.minX + box.maxX) / 2, face = box.minZ;
    T.setWeapon(W.indexOf('flamer')); await until(() => T.getCurrentWeapon() === 'flamer', 3000); await wait(1200);
    T.setViewFirstDbg(false);
    const stand = () => { T.player.position.set(cx, floor, face - 4); T.setHp && T.setHp(1e6); T.setAimYawDbg(0); if (T.setAimTargetDbg) T.setAimTargetDbg(cx, face + 6); };
    stand(); await wait(600); stand();
    T.setMouseFireDbg(true);
    const lit = await gWait(8, () => { stand(); return lane.state === 'wrecked'; });
    T.setMouseFireDbg(false);
    ok(lit && lane.state === 'wrecked', 'the flame took lane 1 (' + lane.state + ')');
    if (!(lit && lane.state === 'wrecked')) { ok(false, 'so the burn, the console and the launcher are not checked'); return out.join('\n'); }
    ok(D.wreck().isWrecked(0) && D.wreck().count() >= 1, 'and the wreck knows it');
    const d0 = () => D.wreck().debug().find((x) => x.index === 0);
    ok(d0() && d0().kind === 'burn', 'it is burning (' + (d0() && d0().kind) + ')');
    await gWait(1.0);
    ok(d0() && d0().plateColor != null && d0().plateColor < 0.9, 'the plate is blackening (red channel ' + (d0() && d0().plateColor != null ? d0().plateColor.toFixed(2) : '-') + ')');
    await gWait(3.2, () => d0() && !d0().plateVisible);
    await wait(100);
    ok(d0() && !d0().plateVisible && d0().ash && d0().ashSize > 0.9, 'after the burn the plate is gone and there is a pile of ash (size ' + (d0() ? d0().ashSize.toFixed(2) : '-') + ')');
    ok(lane.state === 'wrecked' && !lane.pivot.visible, 'its lane stays out: ' + lane.state);
    ok(lane.plate.material.color.r > 0.95, 'the plate\'s own colour is back for the next visit (the shared material was never touched)');

    // Rounds and flames pass through where it stood; the other plates still flip when shot.
    const hit0 = D.hitDbg(0, { x: cx, y: lane.box.minY + 0.5, z: face }, null);
    ok(hit0 === false, 'a wrecked lane takes no more hits');
    const other = tg.targets.findIndex((t, i) => i !== 0 && t.state === 'up');
    const ob = tg.targets[other].box;
    ok(other > 0 && D.hitDbg(other, { x: (ob.minX + ob.maxX) / 2, y: ob.minY + 0.5, z: ob.minZ }, null) === true && tg.targets[other].state !== 'up', 'another plate (lane ' + (other + 1) + ') still free-shoots: ' + (tg.targets[other] && tg.targets[other].state));

    // The range computer is dead now.
    D.act('rangeConsole'); await wait(300);
    ok(!feat().isOpen(), 'the range computer will not open once a plate is wrecked');

    // (2) The launcher: a real shell at the base of a plate that is still up; its blast takes it apart.
    const idx = tg.targets.findIndex((t, i) => i !== 0 && t.state === 'up');
    ok(idx > 0, 'a plate to blow up (lane ' + (idx + 1) + ')');
    const pb = tg.targets[idx].box, pcx = (pb.minX + pb.maxX) / 2;
    T.setWeapon(W.indexOf('launcher')); await until(() => T.getCurrentWeapon() === 'launcher', 3000); await wait(1500);
    const standL = () => { T.player.position.set(pcx, floor, pb.minZ - 6); T.setHp && T.setHp(1e6); T.setAimYawDbg(0); if (T.setAimTargetDbg) T.setAimTargetDbg(pcx, pb.minZ); };
    standL(); await wait(600); standL();
    T.setMouseFireDbg(true);
    const blown = await gWait(10, () => { standL(); return tg.targets[idx].state === 'wrecked'; });
    T.setMouseFireDbg(false);
    ok(blown && tg.targets[idx].state === 'wrecked', 'the shell\'s blast took the plate (' + tg.targets[idx].state + ')');
    if (!blown) return out.join('\n');
    const di = () => D.wreck().debug().find((x) => x.index === idx);
    ok(tg.targets[idx].state === 'wrecked' && di() && di().kind === 'blow' && di().pieces >= 6 && !di().plateVisible, 'it is in pieces (' + (di() && di().pieces) + ') and the plate is gone');
    await gWait(6, () => di() && di().resting === di().pieces);
    ok(di() && di().resting === di().pieces, 'the pieces come to rest on the floor (' + (di() && di().resting) + ' of ' + (di() && di().pieces) + ') ' + JSON.stringify(di() && di().p0) + ' t ' + (di() && di().t.toFixed(1)));
    ok(D.wreck().count() >= 2 && tg.targets.some((t) => t.state === 'up'), 'two or more lanes wrecked and the rest standing (' + D.wreck().count() + ')');

    // (3) A new visit: the plates are up and whole, the ash and the pieces are gone, the computer opens.
    D.leave(); await wait(400);
    D.enter();
    ok(await until(() => D.state().active, 20000), 'back in the Training Ground');
    await wait(1200);
    ok(!D.wreck().any() && tg.targets.every((t) => t.state === 'up' && t.pivot.visible), 'a new visit brings every plate back');
    D.act('rangeConsole'); await wait(300);
    ok(!!feat() && feat().isOpen(), 'and the range computer works again');
    T.rangeDbg.exit();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  } finally {
    try { T.setMouseFireDbg && T.setMouseFireDbg(false); } catch (_) {}
  }
  return out.join('\n');
})()
