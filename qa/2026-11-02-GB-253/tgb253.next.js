// tgb253 - GB-253 probe (temporary, Grokbot 2026-11-02): t80 (1)-(2), then (3) the open-field spider traced. Not a suite check; delete after GB-253.
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
    const watch = async (kind, x, z, secs, at) => {
      const stand = at || post;
      p.set(stand.x, T.sampleHeight(stand.x, stand.z), stand.z);
      const zz = T.spawnZombie(x, z, kind, true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      const s = { z: zz, blocked0: crossesHouse(x, z, p.x, p.z), clearAt: null, minD: 1e9, endD: 0, after: 0, afterClear: 0 };
      const t0 = T.getSimTime(), wall0 = Date.now();
      while (T.getSimTime() - t0 < secs && zz.alive && Date.now() - wall0 < Math.max(90000, secs * 20000)) {
        await wait(50);
        p.set(stand.x, T.sampleHeight(stand.x, stand.z), stand.z);   // he stays put (no knockback drift)
        const q = zz.mesh.position, d = Math.hypot(q.x - p.x, q.z - p.z);
        s.minD = Math.min(s.minD, d); s.endD = d;
        if (s.clearAt === null && !crossesHouse(q.x, q.z, p.x, p.z)) s.clearAt = T.getSimTime() - t0;
        else if (s.clearAt !== null) { s.after++; if (!crossesHouse(q.x, q.z, p.x, p.z)) s.afterClear++; }
      }
      s.end = crossesHouse(zz.mesh.position.x, zz.mesh.position.z, p.x, p.z) ? 'still behind the house' : 'clear of the house';
      return s;
    };
    // (1) A spider on the far side of the house, 13 m out: inside its hold band, no line.
    const a = await watch('spider', hx + hh + 2, hz + 2, 12);
    ok(a.blocked0, 'the spider starts with the house between them');
    ok(a.clearAt !== null && a.end === 'clear of the house', 'it comes round until the house is out of the line (clear after ' + (a.clearAt === null ? '-' : a.clearAt.toFixed(1)) + ' s, in the line ' + (a.after ? Math.round(100 * a.afterClear / a.after) : 100) + '% of the time after; ' + a.end + ')');
    ok(a.minD > 4, 'and it stays at range: never closer than ' + a.minD.toFixed(1) + ' m');
    T.clearZombies(); await wait(200);
    // (2) The spitter is a creeper, not a holder: behind the house it keeps closing (slowly), it
    // never parks out of sight.
    const b0 = Math.hypot(hx + hh + 2 - p.x, hz - 1 - p.z);
    const b = await watch('spitter', hx + hh + 2, hz - 1, 14);
    const bMoved = Math.hypot(b.z.mesh.position.x - (hx + hh + 2), b.z.mesh.position.z - (hz - 1));
    ok(b.blocked0 && bMoved > 1.5 && b.endD < b0, 'a spitter behind the house keeps creeping in (moved ' + bMoved.toFixed(1) + ' m, ' + b0.toFixed(1) + ' to ' + b.endD.toFixed(1) + ' m)');
    T.clearZombies(); await wait(200);
    for (let run = 0; run < 3; run++) {
      const x = post.x - 11, z0 = post.z;
      p.set(post.x, T.sampleHeight(post.x, post.z), post.z);
      const zz = T.spawnZombie(x, z0, 'spider', true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z0), z0);
      const t0 = T.getSimTime(); let minD = 1e9, last = '', ev = [], sawAt = null, frames = 0, prevSim = t0, maxStep = 0;
      while (T.getSimTime() - t0 < 6 && zz.alive) {
        await wait(50);
        p.set(post.x, T.sampleHeight(post.x, post.z), post.z);
        const q = zz.mesh.position, d = Math.hypot(q.x - p.x, q.z - p.z), st = T.getSimTime();
        maxStep = Math.max(maxStep, st - prevSim); prevSim = st; frames++;
        minD = Math.min(minD, d);
        const key = 'lc=' + zz.lineClear + ' sb=' + zz.lineSawBlock + ' go=' + ((zz.lineGo || 0) > 0 ? 1 : 0);
        if (key !== last) { ev.push((st - t0).toFixed(2) + 's d' + d.toFixed(1) + ' @' + q.x.toFixed(1) + ',' + q.z.toFixed(1) + ' ' + key); last = key; }
        if (sawAt === null && zz.lineSawBlock) sawAt = (st - t0).toFixed(2);
      }
      out.push('FAIL TRACE run' + run + ' minD ' + minD.toFixed(2) + ' sawBlockAt ' + sawAt + ' samples ' + frames + ' maxSimStep ' + maxStep.toFixed(3) + ' proto ' + Object.getPrototypeOf(zz).constructor.name + ' | ' + ev.join(' ; '));
      T.clearZombies(); await wait(200);
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
