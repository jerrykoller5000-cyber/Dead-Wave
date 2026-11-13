// tce10 - CE-10 (J151, Jerry's playtest 13 Nov). Claude 5. Frames stepped by hand (T.flightHold, T.stepFrame).
//  note 14 "The red dot appears to slide while firing the shotgun ADS": the RMR on the shotgun and the GW-4, down the
//    sights, one round: every frame of the kick the dot stays in its window (within 0.4 of the glass's half-height of its
//    centre), rides up with it and comes back to the aim. (It was drawn 400 m out along the optic's line: on the shotgun's
//    kick it went 0.24 ndc up with its window at 0.04, six window-heights out of the housing.)
//  note 12 "The trigger gets pulled each time the player ejects rounds to switch shotgun ammo types": through X's unload
//    the trigger and the index stay still; the action-release paddle right behind the trigger is pressed on the first
//    shell's stroke only.
//  GT-20101 (ChatGPT 2's witness, the support ring finger in the pistol's .45 live round at 75% of the reload): the
//    pistol's rack from the seat back to the hold, the support glove out of the round, the gun and the slide's shape.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const st = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) T.stepFrame(dt); };
  const D = T.trainingDbg; let held = false;
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    T.runDevCommand && T.runDevCommand('godmode');
    T.grantAllWeapons(); T.setUnarmedDbg && T.setUnarmedDbg(false);
    T.setViewFirstDbg(true);
    ok(await until(() => T.fpDbg().first && T.fpDbg().w > 0.9, 20000), 'first person');
    T.flightHold(true); held = true;
    const v = () => T.viewmodelDbg(), THREE = T.THREE || window.THREE;
    const arm = (k) => { for (let i = 0; i < 20 && T.getCurrentWeapon() !== k; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(k)); st(5); } st(30); return T.getCurrentWeapon() === k; };
    for (const key of ['shotgun', 'm4']) {
      ok(arm(key), key + ' in hand');
      T.opticDbg.grant(key, 'rmr'); ok(T.opticDbg.fit(key, 'rmr'), key + ' rmr fitted');
      T.setOtsAimDbg(0, 0); st(10); T.setZoomHeldDbg(true); st(40);
      const L = T.opticDbg.line(key), V = v();
      const sc = Math.hypot(L.dot[0] - L.eye[0], L.dot[1] - L.eye[1], L.dot[2] - L.eye[2]) / 0.046;
      const P = (p) => { const w = V.viewPoint(new THREE.Vector3(p[0], p[1], p[2])); return V.ndc(w); };
      const d0 = V.opticDotOffset();
      ok(!!d0 && Math.hypot(d0.x, d0.y) < 0.004, key + ': at rest the dot is on the sight line (' + (d0 ? (d0.x * 1000).toFixed(1) + ', ' + (d0.y * 1000).toFixed(1) : 'none') + ' x0.001 ndc)');
      const n0 = T.weaponMeshes[key].userData.shots | 0;
      T.setAmmoDbg && T.setAmmoDbg(key, 20);
      T.setMouseFireDbg(true); T.stepFrame(1 / 60); T.setMouseFireDbg(false);
      let worst = 0, rise = 0, end = 0, n = 0;
      for (let i = 0; i < 36; i++) {
        T.stepFrame(1 / 60);
        const dot = V.opticDotOffset(), win = P(L.dot), top = P([L.dot[0], L.dot[1] + 0.008 * sc, L.dot[2]]);
        const hh = Math.abs(top.y - win.y), off = Math.hypot(dot.x - win.x, dot.y - win.y) / Math.max(1e-6, hh);
        worst = Math.max(worst, off); rise = Math.max(rise, dot.y); n++;
        if (i === 35) end = Math.hypot(dot.x, dot.y);
        if (i < 3 || i % 8 === 0) out.push('INFO ' + key + ' frame ' + i + ': dot y ' + (dot.y * 1000).toFixed(1) + ', window y ' + (win.y * 1000).toFixed(1) + ', half-height ' + (hh * 1000).toFixed(1) + ' x0.001 ndc');
      }
      ok(((T.weaponMeshes[key].userData.shots | 0) - n0) === 1, key + ': a round fired down the sights');
      ok(worst <= 0.4, key + ': every frame of the kick the dot stays in its window, within 0.4 of its half-height of the centre (worst ' + worst.toFixed(2) + ' over ' + n + ' frames)');
      ok(rise > 0.01, key + ': the dot rides the kick with its window (up ' + (rise * 1000).toFixed(1) + ' x0.001 ndc)');
      ok(end < 0.006, key + ': and comes back to the aim (' + (end * 1000).toFixed(1) + ')');
      T.setZoomHeldDbg(false); st(20); T.opticDbg.clear(key); st(5);
    }
    // J151 note 12 ("the trigger gets pulled each time the player ejects rounds to switch shotgun ammo types"): through X's
    // unload the view's trigger and its index stay still; the action-release paddle right behind the trigger is pressed for
    // the first shell's stroke only, the other shells' strokes run free
    {
      ok(arm('shotgun'), 'the pump shotgun in hand (note 12)');
      const A = T.ammoDbg; A.carry('shotgun', 'buckshot', 10); T.setAmmoDbg('shotgun', 4); st(10);
      const V = v(), sr = V.gun && V.gun.ctrls && V.gun.ctrls.slideRelease, tr = V.gun && V.gun.ctrls && V.gun.ctrls.trigger;
      ok(!!sr && !!tr, 'the view gun has its slide release and trigger');
      const r0 = sr.position.clone(), t0 = tr.quaternion.clone(), press = {}, trig = { k: 0, turn: 0 };
      ok(A.start(A.loaded && A.loaded().shotgun === 'buckshot' ? 'birdshot' : 'buckshot') !== false, 'X starts the change');
      let n = 0;
      for (let i = 0; i < 600; i++) {
        T.stepFrame(1 / 60); const s2 = T.vmStateDbg(), sw = s2 && s2.ammoSwitch;
        if (!sw) { if (i > 10) break; continue; }
        if (sw.phase !== 'unload') continue;
        n++; const shell = sw.unloaded | 0;
        press[shell] = Math.max(press[shell] || 0, sr.position.distanceTo(r0));
        trig.k = Math.max(trig.k, +V.info.trigger || 0); { const q = tr.quaternion, d = Math.abs(q.x * t0.x + q.y * t0.y + q.z * t0.z + q.w * t0.w); trig.turn = Math.max(trig.turn, 2 * Math.acos(Math.min(1, d))); }
      }
      const shells = Object.keys(press).map(Number).sort((a, b) => a - b), mm = (x) => (x * 1000).toFixed(2);
      out.push('INFO note 12: ' + n + ' unload frames; paddle travel per shell (gun mm): ' + shells.map((k) => k + ':' + mm(press[k])).join(' '));
      ok(shells.length >= 3, 'the unload took the shells out one by one (' + shells.length + ')');
      ok(press[0] > 0.0015, 'the first shell: the action release pressed (' + mm(press[0] || 0) + ' mm)');
      ok(shells.filter((k) => k > 0).every((k) => press[k] < 0.0001), 'the other shells: the release left alone (' + shells.filter((k) => k > 0).map((k) => mm(press[k])).join(', ') + ' mm)');
      ok(trig.k < 0.001 && trig.turn < 0.001, 'the trigger and the index never move through the unload (index ' + trig.k.toFixed(3) + ', trigger ' + trig.turn.toFixed(4) + ' rad)');
      for (let i = 0; i < 200 && T.vmStateDbg().ammoSwitch; i++) T.stepFrame(1 / 30);
    }
    // GT-20101 (ChatGPT 2's reload witness: the support ring finger 2.2 mm into the .45 live round at 75%): the pistol's rack,
    // the support hand up round the slide's left side, over the top and onto its rear serrations, the slide back and home,
    // and back down to the hold: nowhere in the live round or any closed part of the gun (0.5 mm), never inside the slide's
    // outer shape (its shell is hollow: 1.5 gun mm, the chamfers), and on the slide while it racks (within 1 view mm)
    {
      ok(arm('pistol'), 'the pistol in hand (GT-20101)');
      T.setOtsAimDbg(0, -0.08); st(20);
      const RC = (await import('/tools/tests/tce10-contact.js')).makeRoundContact(T), V = v(), src = T.weaponMeshes.pistol.userData.magazineTopRound;
      const scale = () => { const e = V.gun.root.matrixWorld.elements; return Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])); };
      const env = () => { const WI = V.gun.work.matrixWorld.clone().invert(), p = new THREE.Vector3(); let w = 0;
        for (const mk of ['glove', 'glovePads']) { const mm = V.arms.l.meshes[mk]; if (!mm || !mm.visible) continue; const M = WI.clone().multiply(mm.matrixWorld), pa = mm.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) { p.fromBufferAttribute(pa, i).applyMatrix4(M); w = Math.max(w, Math.min(p.x + 0.023, 0.023 - p.x, p.y + 0.044, 0.024 - p.y, p.z + 0.14, 0.26 - p.z)); } }
        return w * 1000; };
      const gap = () => { const GI = V.gun.root.matrixWorld.clone().invert(), p = new THREE.Vector3(), tris = [];
        V.gun.work.traverse((m) => { if (!m.isMesh || !m.visible || !m.geometry) return; const pa = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : pa.count, M = GI.clone().multiply(m.matrixWorld), P = [];
          for (let i = 0; i < n; i++) { p.fromBufferAttribute(pa, ix ? ix.getX(i) : i).applyMatrix4(M); P.push([p.x, p.y, p.z]); } for (let i = 0; i + 2 < P.length; i += 3) tris.push([P[i], P[i + 1], P[i + 2]]); });
        const dPT = (q, a, b, c) => { const ab = [b[0]-a[0],b[1]-a[1],b[2]-a[2]], ac = [c[0]-a[0],c[1]-a[1],c[2]-a[2]], ap = [q[0]-a[0],q[1]-a[1],q[2]-a[2]], dot = (x, y) => x[0]*y[0]+x[1]*y[1]+x[2]*y[2];
          const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
          const bp = [q[0]-b[0],q[1]-b[1],q[2]-b[2]], d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
          const vc = d1*d4 - d3*d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1/(d1-d3); return Math.hypot(ap[0]-ab[0]*t, ap[1]-ab[1]*t, ap[2]-ab[2]*t); }
          const cp = [q[0]-c[0],q[1]-c[1],q[2]-c[2]], d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
          const vb = d5*d2 - d1*d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2/(d2-d6); return Math.hypot(ap[0]-ac[0]*t, ap[1]-ac[1]*t, ap[2]-ac[2]*t); }
          const va = d3*d6 - d5*d4; if (va <= 0 && d4-d3 >= 0 && d5-d6 >= 0) { const t = (d4-d3)/((d4-d3)+(d5-d6)); return Math.hypot(q[0]-(b[0]+(c[0]-b[0])*t), q[1]-(b[1]+(c[1]-b[1])*t), q[2]-(b[2]+(c[2]-b[2])*t)); }
          const den = 1/(va+vb+vc), t1 = vb*den, t2 = vc*den; return Math.hypot(ap[0]-ab[0]*t1-ac[0]*t2, ap[1]-ab[1]*t1-ac[1]*t2, ap[2]-ab[2]*t1-ac[2]*t2); };
        const mm = V.arms.l.meshes.glove, M = GI.clone().multiply(mm.matrixWorld), pa = mm.geometry.attributes.position; let best = 9;
        for (let i = 0; i < pa.count; i += 2) { p.fromBufferAttribute(pa, i).applyMatrix4(M); const q = [p.x, p.y, p.z]; if (Math.abs(q[0]) > 0.04 || q[1] < -0.06 || q[1] > 0.12) continue; for (const t of tris) best = Math.min(best, dPT(q, t[0], t[1], t[2])); }
        return best * scale() * 1000; };
      T.setAmmoDbg('pistol', 5); T.startReload();
      const rows = []; let worstR = 0, worstG = 0, worstE = 0, worstGap = 0, gWhere = '', racked = 0;
      for (const u of [0.65, 0.66, 0.67, 0.68, 0.69, 0.70, 0.71, 0.72, 0.76, 0.84, 0.88, 0.91, 0.93, 0.95, 0.97, 0.98]) {
        T.reloadClipDbg.hold(u); for (let i = 0; i < 3; i++) T.stepFrame(1 / 60); V.root.updateMatrixWorld(true);
        const eye = V.gun.pairs.find(([p]) => p === src)?.[1], rc = eye ? RC(V, eye) : null, gc = RC.gun(V, (m) => m === eye), e = env();
        const r = rc ? rc.l.worst * 1000 : 0, g = gc.l.worst * 1000; worstR = Math.max(worstR, r); worstE = Math.max(worstE, e);
        if (g > worstG) { worstG = g; gWhere = u.toFixed(2) + ' ' + gc.l.where.split(' box')[0]; }
        if (V.info.handPlace === 'work' && u >= 0.72 && u <= 0.88) { worstGap = Math.max(worstGap, gap()); racked++; }
        rows.push(u.toFixed(2) + ':' + r.toFixed(1) + '/' + g.toFixed(1) + '/' + e.toFixed(1));
      }
      T.reloadClipDbg.hold(null);
      out.push('INFO GT-20101 rack (u: round/gun view mm, slide shape gun mm): ' + rows.join(' '));
      ok(worstR <= 0.5, 'GT-20101: the support hand never in the .45 live round (worst ' + worstR.toFixed(2) + ' mm)');
      ok(worstG <= 0.5, 'GT-20101: nor in any closed part of the pistol from the seat to the hold (worst ' + worstG.toFixed(2) + ' mm' + (gWhere ? ' at ' + gWhere : '') + ')');
      ok(worstE <= 1.5, 'GT-20101: never inside the slide\'s outer shape (worst ' + worstE.toFixed(2) + ' gun mm)');
      ok(racked >= 4 && worstGap <= 1.0, 'GT-20101: on the slide while it racks (' + racked + ' frames, farthest ' + worstGap.toFixed(2) + ' mm)');
      for (let i = 0; i < 120; i++) T.stepFrame(1 / 30);
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { try { if (held) T.flightHold(false); T.setZoomHeldDbg && T.setZoomHeldDbg(false); } catch (_) {} }
  return out.join('\n');
})()
