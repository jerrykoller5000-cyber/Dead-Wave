// t65 — CL-20: the pit. Bubbles rise over the hole and pop on the surface while the marine
// is anywhere near; far away they sleep. The tentacles are nowhere to be seen until the
// water bursts.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Pit');
    const H = T.LAKE_HOLE, p = T.player.position;
    // Far from the pit first.
    p.set(H.x + 200, p.y, H.z + 200);
    await wait(800);
    ok(!T.getPitBubbles().on, 'far from the pit the bubbles sleep');
    // Then on the shore side, 40 m off: well outside the grab.
    p.set(H.x + 40, T.sampleHeight(H.x + 40, H.z), H.z);
    await until(() => T.getPitBubbles().visible > 3, 8000);
    const b = T.getPitBubbles();
    ok(b.on && b.n > 10 && b.visible > 3, 'near it, bubbles rise over the hole: ' + b.visible + ' of ' + b.n);
    let popped = await until(() => T.getPitBubbles().popping > 0, 10000);
    ok(popped, 'and pop on the surface');
    ok(!T.getScriptedKill(), 'no grab from 40 m');
    // CL-66 (P-11): swimming in toward the hole, the pit warns him once a run before the arms can
    // reach: a `pit-near` event inside grabR + 8 m, none again on a second approach, and no grab yet.
    const near = [];
    window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'pit-near') near.push(e.detail); });
    const swimTo = async (r) => {
      const d = T.waterDepthAt(H.x + r, H.z), lvl = T.sampleHeight(H.x + r, H.z) + d;
      p.set(H.x + r, lvl - 0.2, H.z);
      await wait(400);
      return d;
    };
    const d19 = await swimTo(H.grabR + 6.5);
    ok(d19 > 1.3, 'deep enough to swim ' + (H.grabR + 6.5).toFixed(1) + ' m out (depth ' + d19.toFixed(1) + ')');
    await until(() => near.length > 0, 3000);
    ok(near.length === 1 && Math.abs(near[0].dist - (H.grabR + 6.5)) < 1.5 && near[0].grabR === H.grabR, 'swimming in, the pit warns him: pit-near at ' + (near[0] ? near[0].dist.toFixed(1) : '-') + ' m');
    ok(!T.getScriptedKill(), 'the arms have not reached him yet');
    ok(T.getPitBubbles().on, '(the bubbles are up while he is this close)');
    p.set(H.x + 40, T.sampleHeight(H.x + 40, H.z), H.z);
    await wait(400);
    await swimTo(H.grabR + 6.5);
    ok(near.length === 1, 'once a run: back in, no second warning (' + near.length + ')');
    p.set(H.x + 40, T.sampleHeight(H.x + 40, H.z), H.z);
    await wait(300);
    // The grab: at the start, the arms are hidden until the burst.
    T.beginScriptedKill('tentacle');
    const sk = T.getScriptedKill();
    ok(!!sk && !!sk.ring, 'the grab starts');
    if (sk && sk.ring) {
      const arms = sk.ring.userData.arms;
      ok(arms.every((a) => a.visible === false) || (sk.t || 0) >= 0.05, 'no arm shows before the burst (t ' + (sk.t || 0).toFixed(2) + ')');
      await until(() => !sk.ring || sk.ring.userData.arms.some((a) => a.visible), 4000);
      ok(!sk.ring || sk.ring.userData.arms.some((a) => a.visible), 'then they come out with it');
    }
    T.abortScriptedKill();
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
