// t113 — CL-62 (Jerry 2026-09-29): the guardian never stands on the hill over its cave, and it comes out of
// the dark. The walk-in grab at every mouth keeps its feet on the cave floor (it used to be put on the
// hill's surface 3-6 m up for its first frames, then drop: "a few frames where the guardian jumps into the
// air"); 3 m in it is nearly black and on the apron its own colour; it has a low growl.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Floor');
    ok(typeof T.AudioSys.guardianGrowl === 'function', 'the guardian has a low growl (AudioSys.guardianGrowl)');
    const caves = T.POI.caves;
    let worst = { up: -1, cave: '', t: 0 }, frames = 0, grabs = 0, darkIn = null, lightOut = null;
    for (const c of caves) {
      // Clear of the last one first (and nowhere near a mouth, so no real grab starts on its own).
      for (let i = 0; i < 40 && T.getScriptedKill(); i++) { T.abortScriptedKill(); await wait(100); }
      T.player.position.set(c.x + Math.sin(c.yaw) * 1.5, c.gy, c.z + Math.cos(c.yaw) * 1.5);
      try { T.beginScriptedKill('cave', c); } catch (e) { ok(false, 'begin ' + c.theme + ': ' + e.message); continue; }
      const sk = T.getScriptedKill();
      if (!sk || sk.cave !== c) { ok(false, 'no grab of its own at ' + c.theme + (sk ? ' (still ' + sk.cave.theme + ')' : '')); continue; }
      grabs++;
      const g = sk.guardian;
      let lastT = -1;
      const t0 = performance.now();
      while (T.getScriptedKill() === sk && sk.t < 3.4 && performance.now() - t0 < 15000) {
        if (sk.t !== lastT && g.visible) {
          lastT = sk.t; frames++;
          const up = g.position.y - c.gy;
          if (up > worst.up) worst = { up, cave: c.theme, t: +sk.t.toFixed(2) };
          const lz = (g.position.x - c.x) * Math.sin(c.yaw) + (g.position.z - c.z) * Math.cos(c.yaw);
          const d = g.userData._shadeD;
          if (d !== undefined && lz < -3.2 && (darkIn === null || d > darkIn)) darkIn = d;
          if (d !== undefined && lz > 0.6 && (lightOut === null || d < lightOut)) lightOut = d;
        }
        await wait(16);
      }
      const far = { x: c.x + Math.sin(c.yaw) * 60, z: c.z + Math.cos(c.yaw) * 60 };
      T.player.position.set(far.x, T.sampleHeight(far.x, far.z), far.z);
      T.abortScriptedKill();
      await wait(300);
    }
    ok(grabs === caves.length, 'a walk-in grab at each of the ' + caves.length + ' mouths: ' + grabs);
    ok(frames > 30 && worst.up < 0.35, 'its feet stay on the cave floor at every mouth: highest ' + worst.up.toFixed(2) + ' m above it (' + worst.cave + ' at ' + worst.t + ' s, ' + frames + ' frames)');
    ok(darkIn !== null && darkIn < 0.2, 'deep in the mouth it is nearly black: ' + darkIn);
    ok(lightOut === null || lightOut > 0.9, 'out on the apron it is its own colour: ' + lightOut);
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
