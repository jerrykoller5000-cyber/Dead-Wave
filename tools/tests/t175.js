// t175 - CL-81 (P-68): the kick-free's let-go. Hauled by the guardian, the last E press: the rules are done at once (no
// scripted kill, 50 HP, the receipts as GB-78) and the drag scene plays its let-go branch: he can't walk off while he's
// kicked loose and gets up (with the Ragdoll setting his body falls, lies and gets up; without it the scene stands him
// up), the guardian goes back into the dark; then he is his own again, standing, outside the lip, and it is gone.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const key = (code) => { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); };
  const hold = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  try {
    await startMatch(T, 'LetGo');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    await until(() => T.caveGrabReady(), 15000);
    const catchAt = async (ci, warnFirst) => {
      const c = T.POI.caves[ci];
      const p0 = { x: c.x + Math.sin(c.yaw) * 12, z: c.z + Math.cos(c.yaw) * 12 };
      T.player.position.set(p0.x, T.sampleHeight(p0.x, p0.z), p0.z);
      await wait(100);
      T.noteCaveMouthHit(ci);
      if (warnFirst) {
        await until(() => { const st = T.getCavePokeState(), w = st.warning; return !!w && w.age > Math.max(st.grace || 0, st.eyesFor || 0) + 0.1; }, 15000);
        T.player.position.set(p0.x, T.sampleHeight(p0.x, p0.z), p0.z); await wait(50); T.noteCaveMouthHit(ci);
      }
      await until(() => { const s = T.getScriptedKill(); return !!s && s.drag && s.dragT > 0.6; }, 45000);
      return { sk: T.getScriptedKill(), c };
    };
    const run = async (label, ci, warnFirst, presses, ragdoll) => {
      T.setMotionEnabledDbg(ragdoll);
      const { sk, c } = await catchAt(ci, warnFirst);
      const lzOf = (p) => (p.x - c.x) * Math.sin(c.yaw) + (p.z - c.z) * Math.cos(c.yaw);
      ok(!!sk && !!sk.scene, label + ': caught and hauled by the scene');
      if (!sk) throw new Error('no catch');
      ok(lzOf(T.player.position) > T.letGoDbg.LETGO_LIP, label + ': kicked free well out from the lip (' + lzOf(T.player.position).toFixed(1) + ' m)');
      T.setHp(80);
      for (let i = 0; i < presses; i++) key('KeyE');
      await wait(100);
      const L = T.letGoDbg.state();
      ok(!T.getScriptedKill() && T.getHp() > 25 && T.getHp() < 35, label + ': the rules are done at once: free, 50 HP (' + T.getHp().toFixed(0) + ')');
      ok(!!L && L.phase === 'scene' && L.sp.branched === 'letGo' && T.letGoDbg.active(), label + ': the drag scene plays its letGo branch');
      const body = L && L.sp && L.sp.actors.marine.body;
      ok(ragdoll ? !!body : !body, label + ': ' + (ragdoll ? 'his body reacts' : 'no body: the plain scene'));
      const p1 = T.player.position.clone(), states = new Set();
      hold('KeyW', true); hold('KeyD', true);
      for (let i = 0; i < 6; i++) { await wait(100); if (body) states.add(body.state); }
      hold('KeyW', false); hold('KeyD', false);
      if (ragdoll) ok([...states].some((s) => s === 'fall' || s === 'down'), label + ': kicked loose, he falls and lies (' + [...states].join(',') + ')');
      ok(T.letGoDbg.active() || !ragdoll, label + ': still down after 0.6 s');
      ok(Math.hypot(T.player.position.x - p1.x, T.player.position.z - p1.z) < 2.2, label + ': he can\'t walk off while he\'s down');
      await until(() => !T.letGoDbg.active(), 10000);
      ok(!T.letGoDbg.active(), label + ': up again');
      ok(lzOf(T.player.position) >= 2, label + ': standing outside the lip (' + lzOf(T.player.position).toFixed(1) + ' m)');
      ok(Math.abs(T.marine.rotation.x) + Math.abs(T.marine.rotation.z) < 0.01, label + ': his body upright');
      await until(() => !T.letGoDbg.state(), 15000);
      ok(!T.letGoDbg.state(), label + ': the guardian has gone back into the dark');
      const p2 = T.player.position.clone();
      hold('KeyW', true); await wait(700); hold('KeyW', false);
      ok(Math.hypot(T.player.position.x - p2.x, T.player.position.z - p2.z) > 0.4, label + ': his own again: he walks');
    };
    await run('ragdoll', 0, true, 5, true);
    await wait(300);
    await run('plain', 1, false, 8, false);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
