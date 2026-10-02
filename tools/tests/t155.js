// t155 - GB-118 (Cursor's CU-55 ask: t98's ragdoll hops). With Ragdoll on, a shambler knocked down at the marine's
// feet with a crowd piling over it stays where its body lies: its mesh moves less than 0.35 m from one frame to the
// next the whole time it's falling, down and getting up (after the pile's first 0.1 s spreading out of its spawn). Before, the crowd's separation shoved the mesh, the body's
// drift pulled it straight back, and it ping-ponged metres a frame. The crowd itself still walks (no one stuck).
(async () => {
  const T = window.TT; const out = [];
  T.setMotionEnabledDbg(true);
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  const DOWN = { fall: 1, down: 1, getup: 1 };
  try {
    await startMatch(T, 'Pile');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const px = 10, pz = 10;
    const hold = () => T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.levelGroundRect(px - 20, pz - 20, px + 20, pz + 20, T.sampleHeight(px, pz), 6);
    hold(); await wait(200); hold();
    const put = (kind, x, z) => {
      const zz = T.spawnZombie(x, z, kind, true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      zz.hp = 5000; zz.maxHp = 5000; zz.riseT = 0;
      return zz;
    };
    const steady = (fn) => { const rnd = Math.random; Math.random = () => 0.99; try { fn(); } finally { Math.random = rnd; } };
    let worst = 0, downT = 0, sawDown = false, frames = 0, crowdMoved = 0;
    for (let attempt = 0; attempt < 3 && !sawDown; attempt++) {
      T.clearZombies(); await wait(100); hold();
      // The victim 1.3 m in front of him, shot from his side so it falls at his feet.
      const v = put('shambler', px, pz + 1.3);
      await wait(150);
      for (let i = 0; i < 4 && !(v.body && DOWN[v.body.state]); i++) {
        hold();
        T.fireShellDbg(px, v.mesh.position.y + 1.0, pz - 0.2, 0, 0, 1);
        steady(() => { for (let k = 0; k < 6; k++) T.stepProjectilesDbg(1 / 60); });
        await wait(120);
      }
      if (!(v.body && DOWN[v.body.state])) continue;
      sawDown = true;
      // The pile: eight shamblers on top of it, all walking at him.
      const crowd = [];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; crowd.push(put('shambler', v.mesh.position.x + Math.cos(a) * 0.35, v.mesh.position.z + Math.sin(a) * 0.35)); }
      const c0 = crowd.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z }));
      let last = { x: v.mesh.position.x, z: v.mesh.position.z };
      const t0 = performance.now();
      while (performance.now() - t0 < 3000 && v.alive) {
        await wait(16); hold();
        const x = v.mesh.position.x, z = v.mesh.position.z;
        const st = v.body && v.body.state;
        if (st && DOWN[st] && performance.now() - t0 > 100) { worst = Math.max(worst, Math.hypot(x - last.x, z - last.z)); downT += 0.016; frames++; }   // the first 0.1 s: the pile spreads out of its spawn
        last = { x, z };
      }
      crowdMoved = crowd.filter((c, i) => c.alive && Math.hypot(c.mesh.position.x - c0[i].x, c.mesh.position.z - c0[i].z) > 0.05).length;
    }
    ok(sawDown, 'a shell at his feet puts the shambler down (its body falls)');
    ok(frames >= 20, 'it stays down long enough to watch (' + frames + ' frames down)');
    ok(worst < 0.35, 'down with a crowd on it, its mesh never jumps (worst ' + f2(worst) + ' m in one frame; before GB-118 0.7 to 3 m)');
    ok(crowdMoved >= 4, 'the crowd round it still moves (' + crowdMoved + ' of 8)');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
