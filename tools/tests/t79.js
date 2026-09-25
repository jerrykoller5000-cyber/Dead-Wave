// t79 - GB-54 (Jerry, item 3): the guardian's grab, drag and chase, and the pit's tentacles, as
// polished as they can be. No snapping or popping between poses: every joint of the guardian, the
// marine and the grabbing arms is watched frame by frame, and the biggest one-frame turn (scaled to
// a 60 fps frame) has to stay under 0.3 rad. The marine's body reacts: one leg held straight, the
// other kicking. The arms break the water one after another and overshoot before they settle.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w)));
  const simClock = () => {
    const sk = T.getScriptedKill(); if (sk) return sk.drag && !sk.dragDone ? ['drag', sk.dragT] : ['kill', sk.t];
    const ch = T.getCaveChase(); return ch ? ['chase', ch.t] : null;
  };
  // Watch joints every frame; the worst one-frame turn, scaled to a 60 fps frame of game time.
  const watch = (getJoints, ms, stopWhen, onFrame) => new Promise((res) => {
    let prev = null, last = performance.now(), frames = 0, prevClk = null;
    let worst = { a: 0, name: '-', t: 0 };
    const t0 = performance.now();
    const step = () => {
      const now = performance.now(); let dt = (now - last) / 1000; last = now;
      // Game time, where the game has a clock for it: the page's frames and the game's steps
      // don't line up one for one when the machine is busy.
      const clk = simClock(), wall = dt;
      if (clk && prevClk && clk[0] === prevClk[0] && clk[1] > prevClk[1]) dt = clk[1] - prevClk[1];
      prevClk = clk;
      const js = getJoints();
      if (js) {
        const cur = js.map(([n, o]) => [n, { x: o.quaternion.x, y: o.quaternion.y, z: o.quaternion.z, w: o.quaternion.w }]);
        if (prev && dt > 0 && dt <= 0.1 && wall <= 0.1 && prev.length === cur.length) {
          const sc = Math.min(1, (1 / 60) / dt);
          for (let i = 0; i < cur.length; i++) {
            if (prev[i][0] !== cur[i][0]) continue;
            const a = ang(prev[i][1], cur[i][1]) * sc;
            if (a > worst.a) { const sk = T.getScriptedKill(); worst = { a, name: cur[i][0], t: sk ? +(sk.drag && !sk.dragDone ? sk.dragT : sk.t).toFixed(2) : -1 }; }
          }
          frames++;
        }
        if (onFrame) onFrame();
        prev = cur;
      } else prev = null;
      if (now - t0 < ms && !(stopWhen && stopWhen())) requestAnimationFrame(step); else res({ ...worst, frames });
    };
    requestAnimationFrame(step);
  });
  const M = () => T.marine.userData;
  const MK = ['armLG', 'armRG', 'elbowLG', 'elbowRG', 'legLG', 'legRG', 'kneeLG', 'kneeRG', 'torsoG', 'headG'];
  const marineJ = () => MK.filter((k) => M()[k]).map((k) => ['m.' + k, M()[k]]).concat([['m.root', T.marine], ['player', T.player]]);
  const guardJ = (g, legs) => { const u = g.userData; return ['armLG', 'armRG', 'torso', 'head'].concat(legs ? ['legLG', 'legRG'] : []).filter((k) => u[k]).map((k) => ['g.' + k, u[k]]); };
  const fmt = (w) => w.a.toFixed(3) + ' rad (' + w.name + ' at ' + w.t + ', ' + w.frames + ' frames)';
  try {
    await startMatch(T, 'Grabs');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    const caves = T.POI.caves, c0 = caves[0], c1 = caves[1];
    const onAxis = (c, d) => ({ x: c.x + Math.sin(c.yaw) * d, z: c.z + Math.cos(c.yaw) * d });
    const placeFront = (c, d) => { const p = onAxis(c, d); T.player.position.set(p.x, T.sampleHeight(p.x, p.z), p.z); };

    // (A) The chase, the catch and the drag back to the mouth.
    placeFront(c0, 12);
    await wait(100);
    T.noteCaveMouthHit(0);                                     // the run's warning (GB-44)
    await until(() => { const w = T.getCavePokeState().warning; return !!w && w.age > 3.2; }, 8000);
    placeFront(c0, 12);
    ok(T.noteCaveMouthHit(0) === true && !!T.getCaveChase(), 'the second shot brings it out');
    let heldKnee = [], freeKnee = [];
    const wA = await watch(() => {
      const ch = T.getCaveChase(), sk = T.getScriptedKill();
      const g = ch ? ch.g || null : (sk && sk.guardian);
      return marineJ().concat(g ? guardJ(g, false) : (sk ? guardJ(sk.guardian, false) : []));
    }, 9000, () => { const sk = T.getScriptedKill(); return !!sk && sk.dragDone; }, () => {
      const sk = T.getScriptedKill();
      if (sk && sk.drag && !sk.dragDone && sk.dragT > 0.7) {
        const held = sk.side < 0 ? 'kneeLG' : 'kneeRG', free = sk.side < 0 ? 'kneeRG' : 'kneeLG';
        heldKnee.push(M()[held].rotation.x); freeKnee.push(M()[free].rotation.x);
      }
    });
    const skA = T.getScriptedKill();
    ok(!!skA && skA.kind === 'cave' && skA.drag, 'caught and dragged');
    ok(wA.a < 0.3, '(A) chase, catch and drag: biggest one-frame turn ' + fmt(wA));
    const range = (a) => a.length ? Math.max(...a) - Math.min(...a) : 0;
    ok(heldKnee.length > 5 && Math.max(...heldKnee.map(Math.abs)) < 0.25 && range(freeKnee) > 0.4,
      'dragged by one leg: the held knee stays straight (max ' + (heldKnee.length ? Math.max(...heldKnee.map(Math.abs)).toFixed(2) : '-') + '), the other kicks (range ' + range(freeKnee).toFixed(2) + ')');
    const away = () => { T.abortScriptedKill(); T.player.position.set(0, T.sampleHeight(0, 0), 0); };   // out of every mouth, or the walk-in grab takes him again
    away();
    await wait(300);

    // (B) The walk-in snatch at a mouth, up to the cut under the black.
    const lip = onAxis(c1, 1.5);
    T.player.position.set(lip.x, c1.gy, lip.z);
    T.beginScriptedKill('cave', c1);
    ok(!!T.getScriptedKill(), 'walk-in snatch running');
    const wB = await watch(() => { const sk = T.getScriptedKill(); return sk ? marineJ().concat(guardJ(sk.guardian, true)) : null; },
      8000, () => { const sk = T.getScriptedKill(); return !sk || sk.t > 4.3; });
    ok(wB.a < 0.3, '(B) the snatch: biggest one-frame turn ' + fmt(wB));
    away();
    await wait(300);

    // (C) The pit.
    const H = T.LAKE_HOLE;
    T.player.position.set(H.x + 14, T.sampleHeight(H.x + 14, H.z), H.z);
    if (T.getScriptedKill()) away();
    T.player.position.set(H.x + 14, T.sampleHeight(H.x + 14, H.z), H.z);
    T.beginScriptedKill('tentacle');
    const skC = T.getScriptedKill();
    ok(!!skC && !!skC.ring, 'the pit takes him');
    const armsJ = () => {
      const sk = T.getScriptedKill();
      if (!sk || !sk.ring) return null;
      const js = [];
      sk.grabArms.forEach((arm, k) => { if (!arm.visible) return; js.push(['arm' + k, arm]); arm.userData.segs.forEach((s, i) => js.push(['arm' + k + '.s' + i, s])); });
      return marineJ().concat(js);
    };
    const peak = new Map(), at12 = new Map(), y0 = new Map(), rose = new Map();
    const wC = await watch(armsJ, 8000, () => { const sk = T.getScriptedKill(); return !sk || sk.t > 4.2; }, () => {
      const sk = T.getScriptedKill();
      if (!sk || !sk.ring) return;
      const others = sk.ring.userData.arms.filter((a) => sk.grabArms.indexOf(a) < 0);
      for (const a of others) {
        if (!y0.has(a)) y0.set(a, a.position.y);
        else if (!rose.has(a) && a.position.y - y0.get(a) > 1.5) rose.set(a, sk.t);
      }
      for (const a of others) {
        if (sk.t < 1.0) peak.set(a, Math.max(peak.get(a) || -1e9, a.position.y));
        if (sk.t >= 1.2 && sk.t < 1.6 && !at12.has(a)) at12.set(a, a.position.y);
      }
    });
    ok(wC.a < 0.3, '(C) the pit: biggest one-frame turn ' + fmt(wC));
    const over = [...at12.keys()].filter((a) => peak.get(a) - at12.get(a) > 0.2).length;
    const rt = [...rose.values()], spread = rt.length ? Math.max(...rt) - Math.min(...rt) : 0;
    ok(rt.length >= 3 && spread >= 0.12, 'the arms break the water one after another (first 1.5 m reached over ' + spread.toFixed(2) + ' s by ' + rt.length + ' arms)');
    ok(at12.size > 0 && over >= Math.ceil(at12.size / 2), 'and overshoot before they settle (' + over + ' of ' + at12.size + ')');
    away();
    ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
