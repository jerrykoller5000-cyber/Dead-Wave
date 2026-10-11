// t80 - GB-56 (the 20 nights played through): a spit holder (the spider, the only kind with 'spit'
// tactics) holds its firing line only where it has a line. Played through with the marine at the HQ, spiders parked on the far side of
// the house lobbing acid over it: he could not shoot back and four nights would not end. Now one
// behind the house keeps coming round until the house is out of the line, and one in the open still
// holds its band and does not walk into melee. And a flanker whose flank point is across the house
// no longer walks into the wall and stands there.
// GB-58: the night-12 spider was not the ammo kiosk (it stops nothing); the line check now also sees
// what else stops his rounds (his own pieces, the landmark solids), checked with a wall he built.
// And a round now meets his wall or the house before any body behind it, whatever its step.
// GB-131: the two spider watches that used to time wall clock (round the house; the corner-grazing line)
// wait on T.getSimTime() instead, same thresholds, so a busy PC still gives the spider its full walk.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'SpitLine');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.runDevCommand('godmode'); T.skipGrace && T.skipGrace();
    const H = T.house;
    ok(H && H.present && H.group, 'the HQ house is there');
    const hx = H.group.position.x, hz = H.group.position.z, hh = H.half;
    // The marine at the HQ window, just off the west wall.
    const post = { x: hx - hh - 0.9, z: hz - 2.2 }, p = T.player.position;
    p.set(post.x, T.sampleHeight(post.x, post.z), post.z);
    // Does the flat segment a-b cross the house square?
    const crossesHouse = (ax, az, bx, bz) => {
      for (let i = 1; i < 40; i++) { const u = i / 40, x = ax + (bx - ax) * u, z = az + (bz - az) * u; if (Math.abs(x - hx) < hh && Math.abs(z - hz) < hh) return true; }
      return false;
    };
    // GB-131: wait on game time (same thresholds, nothing weakened). Wall clock is only a safety cap.
for(let repeat=0;repeat<4;repeat++){T.clearZombies();await wait(200);    // (6) A spider where the line from his chest to it grazes the house corner (0.3 m clear):
    // played through, one held there while every round from his gun (held off to the side of
    // his chest) hit the corner, 224 rounds with no kill. It should take a line with room to spare.
    const post4 = { x: hx - hh - 3.6, z: hz - 1.2 };
    const clearance = (qx, qz) => { let m = 1e9; for (let i = 1; i < 40; i++) { const u = i / 40, x = post4.x + (qx - post4.x) * u, z = post4.z + (qz - post4.z) * u; const dx = Math.max(0, Math.abs(x - hx) - hh), dz = Math.max(0, Math.abs(z - hz) - hh); m = Math.min(m, Math.hypot(dx, dz)); } return m; };
    const g0x = hx - hh + 0.3, g0z = hz - hh - 0.8;
    const gz = T.spawnZombie(g0x, g0z, 'spider', true, true);
    gz.mesh.position.set(g0x, T.sampleHeight(g0x, g0z), g0z);
    const c0 = clearance(g0x, g0z); let tight = 0, n6 = 0, gMin = 1e9; const g0 = T.getSimTime(), gWall = Date.now();   // GB-131: game time
    // Sample once per 0.1 s of game time (same cadence as the old 100 ms wall polls), so a busy PC
    // does not inflate the tight-% by stacking extra polls in one sim step.
    let gSample = -1;
    while (T.getSimTime() - g0 < 10 && gz.alive && Date.now() - gWall < 90000) {
      p.set(post4.x, T.sampleHeight(post4.x, post4.z), post4.z);
      await wait(50);
      const q = gz.mesh.position; gMin = Math.min(gMin, Math.hypot(q.x - p.x, q.z - p.z));
      const elapsed = T.getSimTime() - g0;
      if (elapsed > 3) {
        const bucket = Math.floor(elapsed * 10);
        if (bucket !== gSample) { gSample = bucket; n6++; if (clearance(q.x, q.z) < 0.45) tight++; }
      }
    }
    const cEnd = clearance(gz.mesh.position.x, gz.mesh.position.z);
    ok(c0 < 0.45 && tight / Math.max(1, n6) < 0.25 && cEnd >= 0.45 && gMin > 3, 'a spider on a line that grazes the corner takes one with room (start ' + c0.toFixed(2) + ' m clear, end ' + cEnd.toFixed(2) + ' m; tight ' + Math.round(100 * tight / Math.max(1, n6)) + '% of the time after 3 s; closest ' + gMin.toFixed(1) + ' m)');
}
}catch(e){out.push("FAIL "+e.stack);}return out.join("\n");})()