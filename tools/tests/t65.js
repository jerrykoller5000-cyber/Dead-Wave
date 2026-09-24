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
