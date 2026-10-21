// t47 — waterAt(x, z) and felled trees as colliders (CL-5).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    // --- waterAt
    ok(typeof T.waterAt === 'function', 'waterAt is exported');
    const L = T.LAKE;
    const lake = T.waterAt(L.x, L.z);
    ok(lake.level !== null && lake.depth > 0.5 && lake.speed === 0 && lake.current.x === 0, 'open lake: deep, still (' + lake.depth.toFixed(2) + ' m)');
    ok(lake.wading === Math.min(1, lake.depth / 1.3), 'wading is depth / 1.3, capped at 1');
    const dry = T.waterAt(0, 0);
    ok(dry.level === null && dry.depth === 0 && dry.wading === 0 && dry.speed === 0, 'HQ yard: dry');
    // Find running river: walk the channel for a point with current.
    let riv = null, rp = null;
    for (let x = -200; x <= 200 && !riv; x += 3) for (let z = -200; z <= 200 && !riv; z += 3) {
      const w = T.waterAt(x, z); if (w.speed > 0.6 && w.depth > 0.2) { riv = w; rp = [x, z]; }
    }
    ok(!!riv, 'found running river water' + (rp ? ' at ' + rp.map(v => v.toFixed(0)).join(',') : ''));
    if (riv) {
      const sp = Math.hypot(riv.current.x, riv.current.z);
      ok(Math.abs(sp - riv.speed) < 1e-9 && riv.speed === T.waterCurrentAt(rp[0], rp[1]), 'current vector length is the speed (' + sp.toFixed(2) + ' m/s)');
      // Downstream: a step along the current moves towards the lake (further along the river).
      const s0 = T.riverProject(rp[0], rp[1]).s, s1 = T.riverProject(rp[0] + riv.current.x * 2 / sp, rp[1] + riv.current.z * 2 / sp).s;
      ok(s1 > s0, 'current points downstream (s ' + s0.toFixed(3) + ' -> ' + s1.toFixed(3) + ')');
    }
    // --- logs
    const tree = T.trees.find(t => t.alive && !t.falling && t.canopyTop > 6 && Math.hypot(t.x, t.z) > 40 && T.waterDepthAt(t.x, t.z) === 0);
    ok(!!tree, 'found a standing tree');
    const events = []; addEventListener('dw-log', (e) => events.push(e.detail));
    const before = T.worldSolids.length;
    T.beginTreeFall(tree, 1, 0);
    for (let i = 0; i < 600 && !tree.log; i++) T.updateFallingTrees(1 / 30);
    ok(tree.log, 'the tree fell and lies as a log');
    const logs = T.worldSolids.filter(s => s.kind === 'log' && s.tree === tree);
    ok(logs.length >= 3 && T.worldSolids.length === before + logs.length, 'log solids added along the trunk (' + logs.length + ')');
    ok(logs.every(s => s.x > tree.x - 0.5 && Math.abs(s.z - tree.z) < 0.5), 'they lie the way it fell (+x)');
    ok(logs.every(s => s.y1 - s.y0 >= 0.5 && s.y1 - s.y0 < 4), 'each is a low obstacle, 0.5-4 m tall');
    ok(events.length === 1 && events[0].state === 'down' && events[0].solids === logs.length, 'dw-log "down" fired');
    // A round fired along the ground through the log is stopped by it.
    const mid = logs[Math.floor(logs.length / 2)], y = (mid.y0 + mid.y1) / 2;
    const hit = T.segmentHitsCylinder ? T.segmentHitsCylinder(mid.x, y, mid.z - 4, mid.x, y, mid.z + 4, mid.x, mid.z, mid.radius, mid.y0, mid.y1) : 'n/a';
    if (T.segmentHitsCylinder) ok(hit !== null, 'a round through the log hits it');
    // It stays for TREE_LOG_LIE seconds, then sinks and stops blocking.
    ok(T.TREE_LOG_LIE >= 60, 'logs lie for ' + T.TREE_LOG_LIE + ' s');
    for (let i = 0; i < (T.TREE_LOG_LIE + 3) * 10; i++) T.updateFallingTrees(0.1);
    ok(T.worldSolids.filter(s => s.tree === tree).length === 0 && T.worldSolids.length === before, 'gone once it sinks');
    ok(events.length === 2 && events[1].state === 'gone', 'dw-log "gone" fired');
    T.restoreTree(tree);
    ok(tree.alive && T.worldSolids.length === before, 'restoreTree leaves no solids behind');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
