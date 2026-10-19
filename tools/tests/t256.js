// t256 — CL-205 (story v3, Jerry): nobody rescued, nobody pats the earth down: the grave fills on its own while the camera
// holds, and the tags he brought up this run are laid on it before the earth closes over them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const inp = document.getElementById('playerName');
    inp.value = 'Hale';
    document.getElementById('modeHunt').click();
    for (let i = 0; i < 60; i++) { await wait(200); if (T.getPhase && T.getPhase() === 'prep') break; }
    ok(T.getPhase() === 'prep' && T.burialDbg.whos().length === 0, 'a fresh run: nobody rescued');
    T.burialDbg.setRunTags(['root:1', 'iron:2']);
    const p = T.player.position;
    for (let i = 0; i < 60; i++) { await wait(200); p.set(12, T.sampleHeight(12, 12), 12); await wait(40); if (Math.hypot(p.x - 12, p.z - 12) < 0.4) break; }
    T.spawnZombie(p.x + 20, p.z, 'shambler', true);
    T.damagePlayer(9999);
    let c = null;
    for (let i = 0; i < 80; i++) { await wait(100); c = T.getCine(); if (c && c.setup && c.rec.g) break; }
    ok(c && c.setup && c.rec.kind === 'grave', 'burial set up on a plot');
    ok(T.getCrew().length === 0 && c.diggers.length === 0 && c.selfFill, 'no diggers: the grave fills itself');
    const M = T.burialDbg.MOUND;
    const y0 = c.rec.mound.scale.y;
    ok(y0 < M.ry * 0.5, 'the grave starts open: mound ' + y0.toFixed(3) + ' of ' + M.ry);
    ok(c.tagMeshes.length === 2 && c.tagMeshes.every((m) => m.parent), 'two tags laid on the earth: ' + c.tagMeshes.length);
    let mid = 0;
    for (let i = 0; i < 80; i++) { await wait(100); if (c.t > 7) { mid = c.rec.mound.scale.y; break; } }
    ok(mid > y0 + 0.05, 'the earth rises on its own: ' + y0.toFixed(3) + ' to ' + mid.toFixed(3));
    ok(c.tagMeshes.length === 0, 'the tags are under it');
    for (let i = 0; i < 120; i++) { await wait(100); if (document.getElementById('win').classList.contains('show')) break; }
    ok(Math.abs(c.rec.mound.scale.y - M.ry) < 0.01, 'and settles full: ' + c.rec.mound.scale.y.toFixed(3));
    ok(document.getElementById('win').classList.contains('grave'), 'the panel over the grave');
    document.getElementById('again').click(); await wait(300);
    ok(T.burialDbg.runTags().length === 0, 'a new run starts with no tags of its own');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
