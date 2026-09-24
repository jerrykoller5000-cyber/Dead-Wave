// t46 — caveWarn(cave, level): the wave director's hook for a cave about to open (CL-4).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    const caves = T.POI.caves; const c = caves[0];
    ok(typeof T.caveWarn === 'function', 'caveWarn is exported');
    ok(T.caveWarn('cave:nope', 1) === false && T.caveWarn(99, 1) === false, 'unknown caves are refused');
    const events = []; addEventListener('dw-cave-warn', (e) => events.push(e.detail));
    // Stand well away from the cave: without a warning its eyes are hidden out there.
    const L = { x: c.x + Math.sin(c.yaw) * 55, z: c.z + Math.cos(c.yaw) * 55 };
    T.player.position.set(L.x, T.sampleHeight(L.x, L.z), L.z);
    await wait(400);
    ok(!c.eyeRig.visible, 'at 55 m, unwarned: no eyes');
    ok(T.caveWarn(c, 1) === true, 'level 1 by object');
    await wait(400);
    const op1 = Math.max(...c.eyeSprites.map(e => e.material.opacity));
    ok(c.eyeRig.visible && op1 > 0.2, 'level 1: eyes show from 55 m (' + op1.toFixed(2) + ')');
    ok(T.caveWarn('cave:' + c.theme, 1) === true && events.length === 1, 'same level again: no second event (' + events.length + ')');
    const halo0 = c.eyeSprites.find(e => e.userData.halo).scale.x;
    ok(T.caveWarn(0, 2) === true && events.length === 2 && events[1].level === 2 && events[1].id === 'cave:' + c.theme, 'level 2 by index fires { id, index, level }');
    await wait(400);
    const halo2 = c.eyeSprites.find(e => e.userData.halo).scale.x;
    ok(halo2 > halo0, 'level 2: the halo grows (' + halo0.toFixed(2) + ' -> ' + halo2.toFixed(2) + ')');
    // Dust: the level-2 burst plus the stream put motes near the mouth.
    // The stream is per second of game time, so a loaded machine (the suite runs pages in
    // parallel) needs longer to show it: look for up to 3 s, same threshold.
    const [mx, mz] = [c.x + Math.sin(c.yaw) * 1, c.z + Math.cos(c.yaw) * 1];
    const countNear = () => (T.motes || []).filter(m => Math.hypot(m.mesh.position.x - mx, m.mesh.position.z - mz) < 12).length;
    let nearMouth = countNear();
    for (let i = 0; i < 12 && T.motes && nearMouth <= 5; i++) { await wait(250); nearMouth = countNear(); }
    out.push('motes near the mouth: ' + nearMouth + (T.motes ? '' : ' (TT.motes not exported)'));
    if (T.motes) ok(nearMouth > 5, 'level 2: dust at the mouth');
    ok(T.caveWarn(c, 0) === true && events.length === 3 && events[2].level === 0, 'level 0 turns it off');
    await wait(400);
    ok(!c.eyeRig.visible, 'off again: no eyes from 55 m');
    // Put the player back where the other checks expect nothing in particular.
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
