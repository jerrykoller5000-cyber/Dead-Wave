// t145 — CL-73 (P-52, D-45): the boat comes in. On GB-85's 'extraction' 'due' three flares go up from the end of the
// dock and the boat slides in from out on the lake to nose in to the dock's end, lamp lit; it waits there (rocking,
// a deck to board from, GB-86); 'gone' sends it back out; a new run clears it. No light is added to the scene.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const lights = () => { let n = 0; T.scene.traverse((o) => { if (o.isLight) n++; }); return n; };
    const before = lights();
    const send = (phase) => window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'extraction', phase, day: 20, runId: 'test' } }));
    ok(T.getExtractionBoat() === null || T.getExtractionBoat().state() === 'away', 'no boat before it is due');
    send('due');
    const b = T.getExtractionBoat();
    ok(!!b && b.state() === 'arriving', 'due: the boat is coming in: ' + (b && b.state()));
    const step = (s) => { for (let i = 0; i < Math.round(s / 0.1); i++) b.update(0.1); };
    step(0.5);
    const d0 = Math.hypot(b.group.position.x - b.berth.x, b.group.position.z - b.berth.z);
    ok(d0 > 50, 'it starts out on the lake: ' + d0.toFixed(1) + ' m from its berth');
    step(3);
    ok(b.flares.filter((f) => f.visible).length === 3, 'three flares up over the dock: ' + b.flares.filter((f) => f.visible).length);
    const f = b.flares[0];
    const deckY = T.POI.dock.deckY != null ? T.POI.dock.deckY : 0;
    ok(f.position.y > deckY + 15, 'the first flare is high over the dock: ' + (f.position.y - deckY).toFixed(1) + ' m up');
    step(10);
    const d1 = Math.hypot(b.group.position.x - b.berth.x, b.group.position.z - b.berth.z);
    ok(d1 < d0 && b.state() === 'arriving', 'it closes in: ' + d1.toFixed(1) + ' m to go');
    step(12);
    ok(b.state() === 'waiting', 'it waits at the dock: ' + b.state());
    const deck = b.deck();
    const end = b.end;
    const fromEnd = Math.hypot(deck.x - end.x, deck.z - end.z);
    ok(!!deck && fromEnd < 5 && deck.r > 1.5, 'its deck is just off the end of the dock: ' + fromEnd.toFixed(2) + ' m, r ' + deck.r);
    const depth = T.waterDepthAt(deck.x, deck.z);
    ok(depth > 0.4, 'in water, not on the bank: ' + depth.toFixed(2) + ' m deep');
    ok(Math.abs(deck.y - (T.POI.dock.deckY != null ? T.POI.dock.deckY : deck.y)) < 1.2, 'its deck is near the dock\'s height: ' + deck.y.toFixed(2));
    step(15);
    ok(b.flares.every((f) => !f.visible), 'the flares burn out');
    ok(b.state() === 'waiting', 'still waiting: the boat stays through the dawn');
    send('due');
    ok(b.state() === 'waiting', 'a second due does not restart it');
    send('gone');
    ok(b.state() === 'leaving', 'gone: it backs off: ' + b.state());
    step(21);
    ok(b.state() === 'away' && !b.group.visible, 'and is gone');
    send('due'); step(1);
    T.resetGame();
    ok(b.state() === 'away' && !b.group.visible, 'a new run starts with no boat');
    ok(lights() === before, 'no light added to the scene: ' + before + ' → ' + lights());
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
