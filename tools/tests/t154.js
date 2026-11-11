// t154 - CU-79: a ladder up the HQ. The roof holds him; the walls still do below.
// CE-4 (11 Nov): and it climbs in the running game. Held W with real frames (it only climbed when the test called
// stepHqLadder without a frame: the ground movement put him back at its foot every frame), the rungs along the wall
// (they stood straight out of it), the rails clear of the pier, his hands on the rungs between the rails.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const key = (type) => document.body.dispatchEvent(new KeyboardEvent(type, { code: 'KeyW', key: 'w', bubbles: true }));
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
    // CE-4: the ladder as built: the rungs along the west wall, the rails off the middle pier
    let lad = null; T.scene.traverse((o) => { if (!lad && o.name === 'hq-ladder') lad = o; });
    ok(!!lad, 'the HQ ladder is in the scene');
    if (lad) {
      lad.updateMatrixWorld(true);
      // each part by its own box (the test page's three has no geometry types): rungs flat and long, rails tall
      const boxes = lad.children.map((m) => new T.THREE.Box3().setFromObject(m)), size = (b) => ({ x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z });
      const rungs = boxes.filter((b) => size(b).y < 0.05 && Math.max(size(b).x, size(b).z) > 0.3), rails = boxes.filter((b) => size(b).y > 4);
      const flat = rungs.filter((b) => size(b).z > 0.3 && size(b).x < 0.06).length;
      ok(rungs.length >= 10 && flat === rungs.length, 'the rungs run along the wall (' + flat + ' of ' + rungs.length + ' rungs along it, ' + (rungs[0] ? size(rungs[0]).z.toFixed(2) + ' m long, ' + size(rungs[0]).x.toFixed(3) + ' m out' : '') + ')');
      const all = new T.THREE.Box3(); boxes.forEach((b) => all.union(b));
      const pierFace = L.x + 0.15, rx = rails.length ? Math.max(...rails.map((b) => b.max.x)) : NaN;
      ok(rails.length === 2 && rx < pierFace - 0.05 && all.max.x <= pierFace + 0.002, 'the rails stand off the pier and nothing goes into it (rails to x ' + rx.toFixed(2) + ', the ladder to ' + all.max.x.toFixed(3) + ', the pier\'s face ' + pierFace.toFixed(2) + ')');
    }
    // CE-4: the climb in the running game: from its foot, W held, frame by frame
    T.player.position.set(L.x - 0.5, L.y, L.z);
    for (let i = 0; i < 10; i++) T.stepFrame(1 / 30);
    T.player.position.set(L.x, L.y, L.z);
    key('keydown');
    const ys = [];
    let worst = 0, outside = 0;
    for (let i = 0; i < 400 && !T.onHqRoof(); i++) {
      key('keydown'); T.stepFrame(1 / 60);
      if (i % 30 === 29) ys.push(+(T.player.position.y - L.y).toFixed(2));
      const hs = T.lightningDbg && T.lightningDbg.handTargets ? T.lightningDbg.handTargets() : null;
      if (hs && T.lightningDbg.ladderNow()) for (const h of hs) { const off = Math.abs(h.z - L.z); if (off > 0.19 - 0.045) outside = Math.max(outside, off); worst = Math.max(worst, Math.abs(h.x - L.x)); }
    }
    key('keyup');
    ok(ys.length > 1 && ys[0] > 0.6, 'W climbs it in play (metres up each half second: ' + ys.join(', ') + ')');
    ok(T.onHqRoof(), 'and over the top onto the roof');
    ok(outside === 0, 'his hands on the rungs between the rails' + (outside ? ' (one ' + outside.toFixed(3) + ' m off the middle)' : ''));
    ok(worst < 0.13, 'his hands at the rungs\' line, off it only while reaching (within ' + (worst * 100).toFixed(1) + ' cm)');
    T.stepFrame(1 / 30);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
