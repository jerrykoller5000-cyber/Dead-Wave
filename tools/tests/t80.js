// t80 — CL-53 (Jerry): no fish over the pit. The black specks over the runes were fish that had
// swum over the sinkhole and down the well; now none ever comes within 3 m of the hole's edge.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const L = T.LAKE_HOLE, R = L.r + 3;
    const inPit = (f) => Math.hypot(f.mesh.position.x - L.x, f.mesh.position.z - L.z) < R;
    ok(T.fishes.length > 0, 'there are fish: ' + T.fishes.length);
    ok(T.fishes.filter(inPit).length === 0, 'none over the pit at the start');
    // Two simulated minutes, with the lake schools sent straight at the pit.
    for (const s of T.fishSchools) if (s.habitat === 'lake') { s.tx = L.x; s.tz = L.z; s.retarget = 60; }
    T.player.position.set(0, T.sampleHeight(0, 0), 0);
    let over = 0, samples = 0, closest = 1e9;
    for (let k = 0; k < 2400; k++) {
      T.updateFish(0.05, 0, 0);
      if (k % 10) continue;
      for (const f of T.fishes) {
        samples++;
        const d = Math.hypot(f.mesh.position.x - L.x, f.mesh.position.z - L.z);
        closest = Math.min(closest, d);
        if (d < R) over++;
      }
    }
    ok(over === 0, 'no fish over the pit in two minutes, even sent at it (' + over + '/' + samples + ', closest ' + closest.toFixed(1) + ' m from the middle; clear is ' + R.toFixed(1) + ')');
    ok(T.fishes.every((f) => f.alive), 'and none got stuck or lost doing it');
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  return out.join('\n');
})()
