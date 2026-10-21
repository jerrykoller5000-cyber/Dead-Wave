// t199 - CL-84 (Jerry's "good", 2026-10-05): the marine's walk and run are the studio's clips.
//  - Both clips load (studio/clips/marine/walk.json, run.json) and the gait reads them.
//  - Walking on the flat, the clip has the legs (weight 1): his thigh and knee angles follow the clip's at the gait's
//    phase, and the planted foot's sole is on the ground, no deeper than before (the clip's lowest ankle is set to his
//    standing ankle height).
//  - Running, the run clip takes over (run weight to 1); crouched, the crouch's planted feet keep the legs (weight 0).
//  - With the clips off (TT.gaitDbg.GAIT.on = false) it is the old gait.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  try {
    await startMatch(T, 'Gait');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const G = T.gaitDbg;
    ok(!!G, 'TT.gaitDbg is exported');
    for (let i = 0; i < 40 && !(G.clips().walk && G.clips().run); i++) await wait(100);
    ok(!!(G.clips().walk && G.clips().run), 'the studio walk and run clips are loaded');
    const s = G.sample(0.25, 0);
    ok(!!s && Number.isFinite(s.thighL) && Number.isFinite(s.kneeR) && s.kneeL >= 0 && s.kneeL < 2.2, 'the gait samples the clip (thigh ' + (s && s.thighL.toFixed(2)) + ', knee ' + (s && s.kneeL.toFixed(2)) + ')');
    // Flat ground, walking forward along the aim.
    const x = 18, z = 18; T.levelGroundRect(x - 6, z - 6, x + 6, z + 6, T.sampleHeight(x, z), 3);
    T.player.position.set(x, T.sampleHeight(x, z), z);
    const ud = (T.marine || window.worldMarine).userData;
    const soles = [], thighs = [];
    const walk = async (running, ms) => {
      key('KeyW', true); if (running) key('ShiftLeft', true);
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        await wait(60);
        const P = T.player.position; if (Math.hypot(P.x - x, P.z - z) > 4) P.set(x, P.y, z);
        T.marine.updateMatrixWorld(true);
        const g = T.sampleHeight(P.x, P.z);
        for (const an of [ud.ankleLG, ud.ankleRG]) soles.push(an.localToWorld(new THREE.Vector3(0, -0.11, 0.05)).y - g);
        thighs.push(ud.legLG.rotation.x);
      }
      key('KeyW', false); if (running) key('ShiftLeft', false);
    };
    soles.length = 0; thighs.length = 0;
    await walk(false, 2500);
    ok(G.w() > 0.95, 'walking, the clip has the legs (weight ' + G.w().toFixed(2) + ', run ' + G.run().toFixed(2) + ')');
    const span = Math.max(...thighs) - Math.min(...thighs);
    ok(span > 0.3, 'the legs swing through the cycle (thigh range ' + span.toFixed(2) + ' rad)');
    const low = Math.min(...soles);
    ok(low > -0.06, 'walking, the lowest sole is not in the ground (' + low.toFixed(3) + ' m)');
    soles.length = 0; thighs.length = 0;
    await walk(true, 2500);
    ok(G.run() > 0.8, 'running, the run clip takes over (run ' + G.run().toFixed(2) + ')');
    ok(Math.min(...soles) > -0.08, 'running, the lowest sole is not in the ground (' + Math.min(...soles).toFixed(3) + ' m)');
    // Crouched.
    key('KeyC', true); await wait(2000);
    await walk(false, 1500);
    ok(T.getCrouching() && G.w() < 0.05, 'crouch-walking, the crouch keeps the legs (clip weight ' + G.w().toFixed(2) + ')');
    key('KeyC', false); await wait(1500);
    // Off.
    G.GAIT.on = false; await walk(false, 800);
    ok(G.w() === 0, 'with the clips off the old gait has the legs');
    G.GAIT.on = true;
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
