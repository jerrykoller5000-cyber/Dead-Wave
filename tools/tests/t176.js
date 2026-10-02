// t176 - CL-82 (P-84): the caves and the pit sound alive. Standing at a cave mouth the cave breathes (a rush of air in
// and out, a low hum) and the calm music draws back; far from every cave and the lake, none of it; near the pit the
// lake's floor hums, and once the signal is silenced the pit is quiet.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(100); } return !!f(); };
  const A = T.AudioSys, ps = () => A.placesState(), f3 = (v) => (+v).toFixed(4);
  const put = (x, z) => T.player.position.set(x, T.sampleHeight(x, z), z);
  try {
    await startMatch(T, 'Places');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    if (A.setMuted) A.setMuted(false);
    if (!A.musicState().playing) A.startMusic();
    // Far from every cave and from the lake.
    const caves = T.POI.caves, L = T.LAKE_HOLE;
    let far = null;
    for (let r = 60; r < 400 && !far; r += 20) for (let a = 0; a < 16 && !far; a++) {
      const x = Math.cos(a / 16 * Math.PI * 2) * r, z = Math.sin(a / 16 * Math.PI * 2) * r;
      if (caves.every((c) => Math.hypot(c.x - x, c.z - z) > 60) && Math.hypot(L.x - x, L.z - z) > 100 && T.sampleHeight(x, z) > -1) far = { x, z };
    }
    ok(!!far, 'a spot far from every cave and the lake');
    put(far.x, far.z);
    await wait(3000);
    ok(ps().cave < 0.002 && ps().pit < 0.002, 'far off: no cave breathing, no pit (' + f3(ps().cave) + ', ' + f3(ps().pit) + ')');
    const c = caves.find((q) => q.theme !== 'chalk') || caves[0];
    const mx = c.x + Math.sin(c.yaw) * 7, mz = c.z + Math.cos(c.yaw) * 7;
    put(mx, mz);
    const b0 = ps().breaths;
    await until(() => ps().cave > 0.006, 8000);
    ok(ps().cave > 0.006 && ps().caveLow > 0.002, 'at a cave mouth the cave breathes (' + f3(ps().cave) + ', low ' + f3(ps().caveLow) + ')');
    await wait(5000);
    ok(ps().breaths > b0, 'in and out (' + (ps().breaths - b0) + ' breaths in)');
    await until(() => A.musicState().dread < 0.85, 8000);
    ok(A.musicState().stage !== 'calm' || A.musicState().dread < 0.85, 'the calm music draws back at the mouth (' + f3(A.musicState().dread) + ', ' + A.musicState().stage + ')');
    put(far.x, far.z);
    await until(() => ps().cave < 0.002 && A.musicState().dread > 0.95, 10000);
    ok(ps().cave < 0.002 && A.musicState().dread > 0.95, 'walk away: it fades, the music comes back (' + f3(ps().cave) + ', ' + f3(A.musicState().dread) + ')');
    // The pit: by the lake over the hole (on the shore side, out of the water if it can).
    let shore = null;
    for (let r = 20; r < 60 && !shore; r += 4) for (let a = 0; a < 24 && !shore; a++) {
      const x = L.x + Math.cos(a / 24 * Math.PI * 2) * r, z = L.z + Math.sin(a / 24 * Math.PI * 2) * r;
      if (T.sampleHeight(x, z) > T.LAKE.level + 0.2 && caves.every((q) => Math.hypot(q.x - x, q.z - z) > 40)) shore = { x, z };
    }
    const at = shore || { x: L.x + 25, z: L.z };
    put(at.x, at.z);
    await until(() => ps().pit > 0.003, 8000);
    ok(ps().pit > 0.003, 'by the pit the lake\'s floor hums (' + f3(ps().pit) + ', ' + Math.hypot(at.x - L.x, at.z - L.z).toFixed(0) + ' m)');
    T.setPitSilenced(true);
    await until(() => ps().pit < 0.002, 10000);
    ok(ps().pit < 0.002, 'silenced, the pit is quiet (' + f3(ps().pit) + ')');
    T.setPitSilenced(false);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
