// t154 - CU-79: a ladder up the HQ. The roof holds him; the walls still do below.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Ladder');
    const L = T.hqLadderAt();
    ok(L && L.roof > L.y + 4, 'the ladder reaches the roof (' + (L.roof - L.y).toFixed(1) + ' m)');
    T.player.position.set(L.x, L.y, L.z);
    let roof = false, guard = 0;
    while (!roof && guard++ < 40) roof = T.stepHqLadder(1, 0.2).roof;
    ok(roof && T.onHqRoof(), 'he climbs onto the roof');
    ok(Math.abs(T.player.position.y - L.roof) < 0.3, 'he is standing on it (' + T.player.position.y.toFixed(2) + ')');
    const g = T.entityGroundY(T.player.position.x, T.player.position.z, T.player.position.y + 1);
    ok(Math.abs(g - L.roof) < 0.2, 'the roof is the ground up there');
    const down = T.stepHqLadder(-1, 3);
    ok(!down.roof && T.player.position.y < L.roof - 1, 'he can climb back down');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
