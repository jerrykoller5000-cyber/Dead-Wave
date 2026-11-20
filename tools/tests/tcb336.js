// tcb336 - CB-335 (ChatGPT's GP-20142 find): in the Training Ground every top-level light's target follows its light. The
// valley is hidden on the way in (trainingHideWorld), and a hidden object's matrix is frozen; the sun's target was hidden
// with it, so its matrix stayed where he left the valley and the sun's shadow camera looked toward that old spot: the
// Training Ground fell outside the shadow map. Checked: no light's target is among the hidden, and each target's world
// position is its own position (they sit at the top level) a few frames after the light was moved.
(async () => {
  const T = window.TT, out = [], ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 60000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(50); } return !!f(); };
  try {
    if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
    const name = document.getElementById('playerName'); if (name) name.value = 'CB-335';
    if (!T.trainingDbg.state().active) document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active), 'the Training Ground opened');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 30000), 'the entry blackout cleared');
    const hid = T.getHidWorld() || [];
    ok(hid.length > 0, 'the valley is hidden (' + hid.length + ' top-level objects)');
    const lights = T.scene.children.filter((o) => o.isLight && o.target && o.target.isObject3D && o.target.parent === T.scene);
    ok(lights.length >= 1, lights.length + ' top-level light(s) with a target in the scene');
    const hidden = lights.filter((l) => hid.some((h) => h.o === l.target));
    ok(!hidden.length, 'no light\'s target is hidden with the valley' + (hidden.length ? ': ' + hidden.map((l) => l.type + ' ' + (l.name || '')).join(', ') : ''));
    await wait(400);   // the frame loop moves the sun over him; its target goes with it
    const stale = [];
    for (const l of lights) {
      const t = l.target, w = t.matrixWorld.elements, d = Math.hypot(w[12] - t.position.x, w[13] - t.position.y, w[14] - t.position.z);
      if (d > 0.001) stale.push(l.type + ' ' + (l.name || '') + ' ' + d.toFixed(2) + ' m');
    }
    ok(!stale.length, 'each light\'s target is drawn where it is (world = its position)' + (stale.length ? ': ' + stale.join('; ') : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
