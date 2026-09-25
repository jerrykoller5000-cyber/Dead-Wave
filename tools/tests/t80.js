// t80 - GB-56 (the 20 nights played through): a spit holder (the spider, the only kind with 'spit'
// tactics) holds its firing line only where it has a line. Played through with the marine at the HQ, spiders parked on the far side of
// the house lobbing acid over it: he could not shoot back and four nights would not end. Now one
// behind the house keeps coming round until the house is out of the line, and one in the open still
// holds its band and does not walk into melee. And a flanker whose flank point is across the house
// no longer walks into the wall and stands there.
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
    const watch = async (kind, x, z, secs, at) => {
      const stand = at || post;
      p.set(stand.x, T.sampleHeight(stand.x, stand.z), stand.z);
      const zz = T.spawnZombie(x, z, kind, true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      const s = { z: zz, blocked0: crossesHouse(x, z, p.x, p.z), clearAt: null, minD: 1e9, endD: 0, after: 0, afterClear: 0 };
      const t0 = Date.now();
      while (Date.now() - t0 < secs * 1000 && zz.alive) {
        await wait(100);
        p.set(stand.x, T.sampleHeight(stand.x, stand.z), stand.z);   // he stays put (no knockback drift)
        const q = zz.mesh.position, d = Math.hypot(q.x - p.x, q.z - p.z);
        s.minD = Math.min(s.minD, d); s.endD = d;
        if (s.clearAt === null && !crossesHouse(q.x, q.z, p.x, p.z)) s.clearAt = (Date.now() - t0) / 1000;
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
    // (3) A spider in the open, a clear line: it holds its band as before.
    const c = await watch('spider', post.x - 11, post.z, 6);
    ok(!c.blocked0 && c.minD > 5.5 && c.endD < 16.5, 'a spider in the open holds its band (' + c.minD.toFixed(1) + ' to ' + c.endD.toFixed(1) + ' m)');
    T.clearZombies(); await wait(200);
    // (4) A flanker (a shale-cave shambler) on the far side of the house, with him down at the
    // south-west corner and it flanking the way that puts its flank point straight south, across
    // the house. Played through, flankers steered straight at such a point stood in the middle of
    // the north wall for good (66 on one night); now it comes round to him.
    const post2 = { x: hx - hh - 0.6, z: hz - hh - 0.4 };
    const fz0 = T.spawnZombie(hx + 0.5, hz + hh + 3, 'shambler', true, true);
    fz0.mesh.position.set(hx + 0.5, T.sampleHeight(hx + 0.5, hz + hh + 3), hz + hh + 3);
    fz0.flankSide = 1; fz0.tactics = 'flank';
    let fMin = 1e9; const f0 = Date.now();
    while (Date.now() - f0 < 30000 && fz0.alive) {
      p.set(post2.x, T.sampleHeight(post2.x, post2.z), post2.z);
      await wait(100); fz0.flankSide = 1;
      fMin = Math.min(fMin, Math.hypot(fz0.mesh.position.x - p.x, fz0.mesh.position.z - p.z));
    }
    ok(fMin < 3, 'a flanker behind the house comes round to him (closest ' + fMin.toFixed(1) + ' m in 30 s; ended at ' + fz0.mesh.position.x.toFixed(1) + ',' + fz0.mesh.position.z.toFixed(1) + ')');
    T.clearZombies(); await wait(200);
    // (5) A spider already inside its back-off distance with the house between them (him at the
    // west wall near the north-west corner, it just past the corner on the north side). Backing off
    // blind took it out of range, walking in blind brought it back: it rocked there without ever
    // having a line (played through: spiders lost at 6 to 8 m). Now it comes on until it has one.
    const post3 = { x: hx - hh - 0.9, z: hz + 2 };
    const e = await watch('spider', hx - 2, hz + hh + 1.5, 12, post3);
    ok(e.blocked0 && e.clearAt !== null && e.end === 'clear of the house', 'a spider blind inside its back-off range comes on round the corner (clear after ' + (e.clearAt === null ? '-' : e.clearAt.toFixed(1)) + ' s; ' + e.end + '; ' + e.minD.toFixed(1) + ' to ' + e.endD.toFixed(1) + ' m)');
    T.clearZombies(); await wait(200);
    // (6) A spider where the line from his chest to it grazes the house corner (0.3 m clear):
    // played through, one held there while every round from his gun (held off to the side of
    // his chest) hit the corner, 224 rounds with no kill. It should take a line with room to spare.
    const post4 = { x: hx - hh - 3.6, z: hz - 1.2 };
    const clearance = (qx, qz) => { let m = 1e9; for (let i = 1; i < 40; i++) { const u = i / 40, x = post4.x + (qx - post4.x) * u, z = post4.z + (qz - post4.z) * u; const dx = Math.max(0, Math.abs(x - hx) - hh), dz = Math.max(0, Math.abs(z - hz) - hh); m = Math.min(m, Math.hypot(dx, dz)); } return m; };
    const g0x = hx - hh + 0.3, g0z = hz - hh - 0.8;
    const gz = T.spawnZombie(g0x, g0z, 'spider', true, true);
    gz.mesh.position.set(g0x, T.sampleHeight(g0x, g0z), g0z);
    const c0 = clearance(g0x, g0z); let tight = 0, n6 = 0, gMin = 1e9; const g0 = Date.now();
    while (Date.now() - g0 < 10000 && gz.alive) {
      p.set(post4.x, T.sampleHeight(post4.x, post4.z), post4.z);
      await wait(100);
      const q = gz.mesh.position; gMin = Math.min(gMin, Math.hypot(q.x - p.x, q.z - p.z));
      if (Date.now() - g0 > 3000) { n6++; if (clearance(q.x, q.z) < 0.45) tight++; }
    }
    const cEnd = clearance(gz.mesh.position.x, gz.mesh.position.z);
    ok(c0 < 0.45 && tight / Math.max(1, n6) < 0.25 && cEnd >= 0.45 && gMin > 3, 'a spider on a line that grazes the corner takes one with room (start ' + c0.toFixed(2) + ' m clear, end ' + cEnd.toFixed(2) + ' m; tight ' + Math.round(100 * tight / Math.max(1, n6)) + '% of the time after 3 s; closest ' + gMin.toFixed(1) + ' m)');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
