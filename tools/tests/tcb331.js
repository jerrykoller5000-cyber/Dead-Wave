// tcb331 - CB-328 (J151 note 37, Jerry 13 Nov: "Chainsaw goes above players head while trying to cut dummy in 3rd person",
//  review/J151-playtest/04): GP-20100's held-gun wall pull pitched the saw up to 81 degrees whenever a solid sat in front of
//  its tip, and the Training dummy is a solid (its prop collider), so walking up to cut it stood the bar on end over his
//  head. The saw is meant to touch what it cuts: for the chainsaw the dummy (and the trees) no longer pull it; the room's
//  walls, the stations and the props still do. Third person; the bar's ends from TT.sawDbg.blade().
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (!D || !T.sawDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    await wait(2500);
    T.grantAllWeapons && T.grantAllWeapons();
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); await until(() => T.getCurrentWeapon() === 'chainsaw', 3000); await wait(1200);
    T.setUnarmedDbg(false); await wait(800);
    ok(T.getCurrentWeapon() === 'chainsaw' && !T.isUnarmed(), 'the chainsaw in hand');
    T.setViewFirstDbg(false);
    const tr = D.state(), dummy = tr.dummy, s = dummy && dummy.solid, floor = tr.tg.floorY;
    ok(!!s, 'the dummy is there');
    // The bar's angle up from his facing, heel (A, -z on the chain) to nose (B): 0 level, 90 straight up, past 90 over his head.
    let facing = { x: 0, z: 1 };
    const pitchOf = () => {
      const b = T.sawDbg.blade(), P = T.player.position;
      const along = (b.bx - b.ax) * facing.x + (b.bz - b.az) * facing.z;
      return { deg: Math.atan2(b.by - b.ay, along) * 180 / Math.PI, top: Math.max(b.ay, b.by) - P.y };
    };
    // Stand d metres from the dummy's centre, facing it, the cursor on its chest; read the bar over half a second.
    const face = async (cx, cz, yaw, d, aimY) => {
      const fx = Math.sin(yaw), fz = Math.cos(yaw); facing = { x: fx, z: fz };
      const at = () => { T.player.position.set(cx - fx * d, floor, cz - fz * d); T.setHp && T.setHp(1e6); T.setAimYawDbg(yaw); if (T.aimPointDbg) T.aimPointDbg(cx, aimY, cz); };
      at(); await wait(600); at(); await wait(400);
      let worst = -180, top = 0;
      for (let i = 0; i < 5; i++) { at(); await wait(100); const p = pitchOf(); worst = Math.max(worst, p.deg); top = Math.max(top, p.top); }
      return { deg: worst, top };
    };
    const rows = [];
    for (const d of [0.7, 0.9, 1.1, 1.4]) {
      const r = await face(s.cx, s.cz, -Math.PI / 2, d, floor + 1.2);
      rows.push(d.toFixed(1) + ' m: ' + r.deg.toFixed(0) + ' deg, top ' + r.top.toFixed(2) + ' m');
      ok(Math.abs(r.deg) < 25 && r.top < 1.75, 'walking up to the dummy, ' + d.toFixed(1) + ' m: the bar stays low and near level (' + r.deg.toFixed(0) + ' deg up, its top ' + r.top.toFixed(2) + ' m; his head ~1.75 m)');
    }
    // Cutting: the trigger held at the cutting distance.
    T.setMouseFireDbg && T.setMouseFireDbg(true);
    const cut = await face(s.cx, s.cz, -Math.PI / 2, 0.9, floor + 1.2);
    await wait(1200);
    const cut2 = await face(s.cx, s.cz, -Math.PI / 2, 0.9, floor + 1.2);
    T.setMouseFireDbg && T.setMouseFireDbg(false);
    ok(Math.abs(cut.deg) < 25 && Math.abs(cut2.deg) < 25 && Math.max(cut.top, cut2.top) < 1.75, 'cutting the dummy (trigger held): the bar stays at the cut, below his head (' + Math.max(cut.deg, cut2.deg).toFixed(0) + ' deg, top ' + Math.max(cut.top, cut2.top).toFixed(2) + ' m)');
    // A wall still lifts it: face the range's +x wall from 0.6 m (GP-20100's pull is kept for everything the saw doesn't cut).
    const TR = D.TRAINING, O = TR.ORIGIN;
    const wall = await face(O.x + TR.RANGE.maxX + 0.3, O.z + 14, Math.PI / 2, 0.9, floor + 1.2);
    ok(wall.deg > 25, 'nose to a wall the pull still lifts the bar off it (' + wall.deg.toFixed(0) + ' deg)');
    out.push('INFO ' + rows.join(' | ') + ' | wall ' + wall.deg.toFixed(0) + ' deg');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
