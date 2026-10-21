// t191 - CU-72 (P-143): passages. A cleared warren opens a passage at its Deep for the rest of the run: E there takes him
// up out of the next cave round the compass. An uncleared one does nothing; a new run shuts them all.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = [];
  window.addEventListener('dw-game', (e) => { const d = e.detail || {}; if (d.type === 'hollow') events.push(d); });
  const settle = async () => { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < 0.15 && Date.now() - w0 < 6000) await wait(40); };
  const stand = async (p, dy = 0.05) => { T.player.position.set(p.x, p.y + dy, p.z); await settle(); };
  try {
    await startMatch(T, 'Passages');
    const ring = T.hollowState().warrens.map((w) => w.cave);
    const A = ring[1], B = ring[2];   // B is the next round the compass
    let built = T.enterHollow({ theme: 'shale', cave: A });
    const deep = built.exits.deep;
    const mark = built.group.getObjectByName('passage-mark');
    ok(!!mark && mark.visible === false, 'the Deep has a place for its passage, dark while the warren is not cleared');

    // Not cleared: nothing at the passage.
    await stand(deep);
    ok(T.actionTarget() !== 'hollowPassage', 'uncleared: E at the passage means nothing (' + T.actionTarget() + ')');
    T.doAction(); await settle();
    ok(T.hollowState().below === true, 'and E does not take him anywhere');
    ok(mark.visible === false, 'the crack of daylight is not lit');

    // Cleared: lit, and E takes him out at the next mouth.
    T.heartDbg.markCleared();
    await settle();
    ok(mark.visible === true, 'cleared: the passage shows its daylight');
    ok(T.actionTarget() === 'hollowPassage', 'E at the passage is the way through (' + T.actionTarget() + ')');
    await stand({ x: deep.x + 6, y: deep.y, z: deep.z + 6 }); // away from it, in the Deep
    ok(T.actionTarget() !== 'hollowPassage', 'away from it, E means something else (' + T.actionTarget() + ')');
    await stand(deep);
    const n0 = events.length;
    T.doAction(); await settle();
    const s = T.hollowState();
    const mouth = T.POI.caves[B], P = T.player.position;
    const dMouth = Math.hypot(P.x - mouth.x, P.z - mouth.z);
    ok(!s.below, 'he is up');
    ok(dMouth > 5 && dMouth < 12, 'at the NEXT cave\'s mouth, not the one he went in by (' + dMouth.toFixed(1) + ' m from cave ' + B + ', ' + Math.hypot(P.x - T.POI.caves[A].x, P.z - T.POI.caves[A].z).toFixed(0) + ' m from cave ' + A + ')');
    const lv = events.slice(n0).find((e) => e.phase === 'leave');
    ok(!!lv && lv.how === 'passage' && lv.cave === A && lv.to === B, 'the HUD heard it: ' + JSON.stringify(lv && { how: lv.how, cave: lv.cave, to: lv.to }));
    ok(s.clearedCaves.includes(A) && s.warrens.find((w) => w.cave === A).passage.open, 'and the passage stays open for the run');
    ok(Math.abs(P.y - T.sampleHeight(P.x, P.z)) < 1, 'standing on the valley\'s ground');

    // The neighbour's own warren is still shut: it has to be cleared itself.
    built = T.enterHollow({ theme: 'iron', cave: B });
    await stand(built.exits.deep);
    ok(T.actionTarget() !== 'hollowPassage' && built.group.getObjectByName('passage-mark').visible === false, 'the next warren is its own: its passage is shut until it is cleared');
    T.leaveHollow('mouth');
    // Back into the first, still open.
    built = T.enterHollow({ theme: 'shale', cave: A });
    await stand(built.exits.deep);
    ok(T.actionTarget() === 'hollowPassage' && built.group.getObjectByName('passage-mark').visible === true, 'down the first again: still open');

    // A new run shuts them.
    T.resetGame();
    ok(T.hollowState().clearedCaves.length === 0, 'a new run: nothing cleared');
    await startMatch(T, 'Passages2');
    built = T.enterHollow({ theme: 'shale', cave: A });
    await stand(built.exits.deep);
    ok(T.actionTarget() !== 'hollowPassage' && built.group.getObjectByName('passage-mark').visible === false, 'and the first warren\'s passage is shut again');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
