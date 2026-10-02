// t158 - CL-110 (D-70, docs/story.md §1, §3): Heron, the PGB's floatplane, is the way out. It comes in through the
// air over the hills, sets down on the lake (never on land), runs in on its floats, and lies across the end of the
// dock with its left float along the planks; it pulls off, runs out over the water and climbs away.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const send = (phase) => window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'extraction', phase, day: 20, runId: 'test' } }));
    send('due');
    const h = T.getExtractionBoat();
    ok(!!h && h.group.name === 'heron', 'the craft is Heron');
    ok(h.group.getObjectByName('heron-wing') && h.group.children.filter((c) => c.name === 'heron-float').length === 2, 'a high wing and two floats');
    // Along its arrival.
    let landOnly = 0, airLow = 0, firstWater = null;
    for (let i = 0; i <= 200; i++) {
      const u = i / 200, p = h.path(u);
      if (p.onWater) {
        if (firstWater == null) firstWater = u;
        if (T.waterDepthAt(p.x, p.z) <= 0.2) landOnly++;
      } else if (p.y < T.sampleHeight(p.x, p.z) + 6 && u < 0.3) airLow++;
    }
    ok(firstWater != null && firstWater > 0.3, 'in the air first, on the water from ' + (firstWater || 0).toFixed(2));
    ok(landOnly === 0, 'every moment on its floats is over the lake (' + landOnly + ' over land)');
    ok(airLow === 0, 'it clears the hills on the way in (' + airLow + ' too low)');
    // At the dock.
    h.update(30);
    ok(h.state() === 'waiting', 'it lies at the dock: ' + h.state());
    const deck = h.deck(), end = h.end;
    const fromEnd = Math.hypot(deck.x - end.x, deck.z - end.z);
    ok(fromEnd < 1.6, 'its float is along the end of the dock: ' + fromEnd.toFixed(2) + ' m');
    const mid = Math.hypot(h.group.position.x - end.x, h.group.position.z - end.z);
    ok(mid > fromEnd + 1.5, 'the plane itself lies off the dock, not on it: ' + mid.toFixed(2) + ' m');
    {
      const y = h.group.rotation.y, nx = Math.sin(y), nz = Math.cos(y), ax = Math.cos(y), az = -Math.sin(y), P = h.group.position;
      const ends = [];
      for (const sx of [-1, 1]) for (const f of [4.4, -3.6]) ends.push(T.waterDepthAt(P.x + nx * f + ax * sx * 2.4, P.z + nz * f + az * sx * 2.4));
      ok(ends.every((d) => d > 0), 'both floats lie in the water, end to end (' + ends.map((d) => d.toFixed(2)).join(', ') + ' m)');
    }
    const props = h.group.children.filter((c) => c.name === 'heron-prop');
    const a0 = props[0].rotation.z; h.update(0.5);
    ok(props.length === 2 && props[0].rotation.z !== a0, 'the engines idle: the propellers turn');
    // Leaving.
    send('gone');
    let landRun = 0, climbed = false;
    for (let i = 0; i <= 200; i++) {
      const p = h.path(i / 200, true);
      if (p.onWater && T.waterDepthAt(p.x, p.z) <= 0.2) landRun++;
      if (i === 200 && p.y > T.sampleHeight(p.x, p.z) + 15) climbed = true;
    }
    ok(landRun === 0, 'its take-off run is over the water (' + landRun + ' over land)');
    ok(climbed, 'and it climbs away over the hills');
    h.update(25);
    ok(h.state() === 'away' && !h.group.visible, 'gone');
    T.resetGame();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
