// t67 — CL-22: the world's voices. A poked cave's guardian screeches (D-25 'aggro'), the pit
// rumbles when the grab starts and now and then when you are near it, and a cave you stand
// by breathes.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  const A = T.AudioSys; const calls = { caveScreech: [], caveGroan: [], pitRumble: [] };
  for (const k of Object.keys(calls)) { const f = A[k]; ok(typeof f === 'function', k + ' exists'); A[k] = (...a) => { calls[k].push(a); try { return f(...a); } catch (e) { calls[k].push(['threw', String(e)]); } }; }
  try {
    await startMatch(T, 'Voices');
    if (A.setMuted) A.setMuted(false);
    const c = T.POI.caves[0];
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'cave-guardian', caveIndex: 0, x: c.x, z: c.z, phase: 'aggro' } }));
    await wait(100);
    ok(calls.caveScreech.length === 1 && calls.caveScreech[0][0] >= 0.45, 'aggro: the guardian screeches (' + JSON.stringify(calls.caveScreech[0]) + ')');
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'cave-guardian', caveIndex: 0, x: c.x, z: c.z, phase: 'other' } }));
    await wait(100);
    ok(calls.caveScreech.length === 1, 'only on aggro');
    // Stand by a cave, outside its mouth.
    const p = T.player.position;
    p.set(c.x + Math.sin(c.yaw) * 14, T.sampleHeight(c.x + Math.sin(c.yaw) * 14, c.z + Math.cos(c.yaw) * 14), c.z + Math.cos(c.yaw) * 14);
    await until(() => calls.caveGroan.length > 0, 20000);
    ok(calls.caveGroan.length > 0 && calls.caveGroan[0][0] > 0, 'near a cave it breathes (' + JSON.stringify(calls.caveGroan[0]) + ')');
    // The pit.
    const H = T.LAKE_HOLE;
    p.set(H.x + 40, T.sampleHeight(H.x + 40, H.z), H.z);
    await until(() => calls.pitRumble.length > 0, 20000);
    ok(calls.pitRumble.length > 0 && calls.pitRumble[0][0] > 0 && calls.pitRumble[0][0] < 0.6, 'near the pit it rumbles, softly (' + JSON.stringify(calls.pitRumble[0]) + ')');
    const before = calls.pitRumble.length;
    T.beginScriptedKill('tentacle');
    await wait(200);
    ok(calls.pitRumble.length > before && calls.pitRumble[calls.pitRumble.length - 1][0] === 1, 'the grab: the pit wakes, full strength');
    T.abortScriptedKill();
    ok(!Object.values(calls).flat().some((a) => a[0] === 'threw'), 'no sound threw');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
