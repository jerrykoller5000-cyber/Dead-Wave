// t258 — CL-206 (story.md §5, v3): the wall of tags. Nine nails under the HQ mural; one tag hangs for each tag brought up
// (the profile's), from the next dawn; the end card says "Brought home: n of 9" on a win.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const W = T.tagWallDbg, wall = W.wall();
    ok(!!wall && wall.userData.tags.length === 9 && W.TAG_TOTAL === 9, 'nine nails on the HQ wall, nine tags to find');
    const have = W.tags().length, shown = W.refresh();
    ok(shown === Math.min(9, have) && wall.userData.tags.filter((h) => h.visible).length === shown, 'one tag on the wall for each brought up: ' + shown + ' of ' + have);
    wall.updateMatrixWorld(true);
    const p = new T.THREE.Vector3(); wall.getWorldPosition(p);
    const mural = T.house.mural; const m = new T.THREE.Vector3(); mural.getWorldPosition(m);
    ok(p.y < m.y - 1.0 && Math.hypot(p.x - m.x, p.z - m.z) < 0.3, 'under the mural (' + (m.y - p.y).toFixed(2) + ' m below its middle)');
    const inp = document.getElementById('playerName');
    inp.value = 'Hale';
    document.getElementById('modeHunt').click();
    for (let i = 0; i < 60; i++) { await wait(200); if (T.getPhase && T.getPhase() === 'prep') break; }
    T.endGame(true);
    await wait(300);
    const home = document.querySelector('#win .tags-home');
    ok(!!home && new RegExp('Brought home: ' + have + ' of 9').test(home.textContent), 'the end card counts them: ' + (home ? home.textContent : 'none'));
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
