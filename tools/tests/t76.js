// t76 - GB-51 (Jerry): zombies need an idle. A zombie with nothing to chase (the POI guards,
// one waiting) sways, breathes, turns its head and shuffles a step now and then, each with its
// own timing so a group never moves in step. The walk and the attack stay as they are.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const range = (a) => Math.max(...a) - Math.min(...a);
  try {
    await startMatch(T, 'Idle');
    T.setHp(100000);
    await until(() => T.getPoiGuards().zombies.length >= 2, 8000);
    // Stand 25 m off the post (they wake inside 18 m), on the camera's side so they are drawn
    // close up rather than as the far LOD (beyond 40 m from the camera the joints freeze).
    const post = T.getPoiGuards().post;
    const hqx = post.x, hqz = post.z - 25;
    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);
    await wait(500);
    const gz = () => T.getPoiGuards().zombies.filter((z) => z.alive);
    const G = gz();
    ok(G.length >= 2 && G.every((z) => !z.poiAwake), 'guards asleep at their post (' + G.length + ')');
    ok(G.every((z) => !z.farLod), 'drawn close up, not the far LOD (' + G.map((z) => !!z.farLod).join('/') + ')');
    await wait(300);
    // (1) Four seconds of the guards standing: breath, sway, head turns, all on their own clocks.
    const p0 = G.map((z) => ({ x: z.mesh.position.x, z: z.mesh.position.z }));
    const S = G.map(() => ({ head: [], sway: [], hips: [], moved: 0 }));
    const t0 = Date.now();
    while (Date.now() - t0 < 4000) {
      G.forEach((z, k) => {
        const ud = z.mesh.userData;
        S[k].head.push(ud.head ? ud.head.rotation.y : 0);
        S[k].sway.push(ud.torso ? ud.torso.rotation.z : 0);
        S[k].hips.push(ud.hips ? ud.hips.position.y : 0);
        S[k].moved = Math.max(S[k].moved, Math.hypot(z.mesh.position.x - p0[k].x, z.mesh.position.z - p0[k].z));
      });
      await wait(40);
    }
    const n = S[0].sway.length;
    ok(n > 60, 'sampled ' + n + ' frames');
    ok(S.every((s) => range(s.sway) > 0.03), 'each one sways (torso roll ranges ' + S.map((s) => range(s.sway).toFixed(3)).join('/') + ')');
    ok(S.every((s) => range(s.hips) > 0.004), 'each one breathes (hips ' + S.map((s) => (range(s.hips) * 1000).toFixed(1)).join('/') + ' mm)');
    ok(S.every((s) => range(s.head) > 0.08), 'each one looks about (head turn ranges ' + S.map((s) => range(s.head).toFixed(2)).join('/') + ' rad)');
    let minDiff = 9;
    for (let a = 0; a < S.length; a++) for (let b = a + 1; b < S.length; b++) {
      let d = 0; for (let i = 0; i < n; i++) d += Math.abs(S[a].sway[i] - S[b].sway[i]);
      minDiff = Math.min(minDiff, d / n);
    }
    ok(minDiff > 0.01, 'never in step: the closest pair differs by ' + minDiff.toFixed(3) + ' rad on average');
    const rates = G.map((z) => z.idle && z.idle.breath);
    ok(new Set(rates.map((r) => r && r.toFixed(3))).size === G.length, 'own breathing rates (' + rates.map((r) => r && r.toFixed(2)).join('/') + ')');
    ok(S.every((s) => s.moved < 0.3), 'they hold the post (moved at most ' + Math.max(...S.map((s) => s.moved)).toFixed(2) + ' m)');
    // (2) A shuffle: a leg lifts, the body turns a little and stays at its post.
    const g = G[0];
    const st0 = g.idle.steps, yaw0 = g.mesh.rotation.y;
    g.idle.stepT = 0;
    let lift = 0; const t1 = Date.now();
    while (Date.now() - t1 < 1200) {
      const ud = g.mesh.userData;
      lift = Math.max(lift, -(ud.legLG ? ud.legLG.rotation.x : 0), -(ud.legRG ? ud.legRG.rotation.x : 0));
      await wait(30);
    }
    ok(g.idle.steps === st0 + 1 && lift > 0.15, 'shuffles a step: leg lift ' + lift.toFixed(2) + ' rad, turn ' + (g.mesh.rotation.y - yaw0).toFixed(2) + ' rad');
    ok(Math.hypot(g.mesh.position.x - p0[0].x, g.mesh.position.z - p0[0].z) < 0.3, 'and is still at its post');
    // (3) One in the main walk loop with nothing to do: held by the start-of-match grace it stands and idles.
    T.clearZombies && T.clearZombies();
    const px = 18, pz = 18;
    T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.restartGraceDbg();
    await wait(300);
    const sp = T.spawnZombie(px + 15, pz, 'shambler', true, true);
    await wait(1500);
    const hd = [], wp0 = sp.walkPhase || 0; const t2 = Date.now();
    while (Date.now() - t2 < 2500) { hd.push(sp.mesh.userData.head ? sp.mesh.userData.head.rotation.y : 0); await wait(40); }
    ok(T.graceActiveDbg() && sp.alive && sp.idle && sp.idle.amt > 0.9, 'a zombie held in the grace idles (amt ' + (sp.idle ? sp.idle.amt.toFixed(2) : '-') + ', grace ' + T.graceActiveDbg() + ')');
    ok((sp.walkPhase || 0) === wp0, 'it stands instead of walking on the spot');
    ok(range(hd) > 0.05, 'and looks about (' + range(hd).toFixed(2) + ' rad)');
    T.skipGrace();
    // (4) The walk stays as it is: a shambler coming for him walks and does not idle.
    T.clearZombies && T.clearZombies();
    await wait(200);
    const w = T.spawnZombie(px + 25, pz, 'shambler', true, true);
    const wp1 = w.walkPhase || 0;
    await wait(1200);
    ok((w.walkPhase || 0) > wp1 + 3 && (!w.idle || w.idle.amt < 0.05), 'a walker walks (phase +' + ((w.walkPhase || 0) - wp1).toFixed(1) + ', idle ' + (w.idle ? w.idle.amt.toFixed(2) : 0) + ')');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 1).join('').slice(0, 80) + ')');
    T.clearZombies && T.clearZombies();
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
