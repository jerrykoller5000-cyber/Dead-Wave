// tcb332 - CB-326 (D) (GP-20124 follow-up, approved 13 Nov): the Training blackout warm draws one spent case per caliber
//  (each gun's own case, CB-294, and the plain cylinder), so a gun's first case is not a shader build on the first shot
//  (the Uzi's was a ~30 ms node build). The cases are there, never culled, only while the warm runs; out after.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const D = T.trainingDbg;
  try {
    if (!D || !T.scene) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    let seen = null, seenWarming = false;
    const poll = setInterval(() => { const g = T.scene.getObjectByName('case-warm'); if (g && !seen) { seen = g.children.map((m) => ({ w: m.userData.caseWarm, culled: m.frustumCulled, geo: m.geometry, mat: m.material })); seenWarming = !!D.state().warming; } }, 5);
    document.getElementById('modeTraining').click();
    const t0 = Date.now(); while (!(D.state().active && !D.state().warming) && Date.now() - t0 < 60000) await wait(50);
    clearInterval(poll);
    ok(D.state().active && !D.state().warming, 'the Training Ground is up and its warm is done');
    ok(!!seen && seenWarming, 'the warm drew the cases while it ran (' + (seen ? seen.length : 0) + ')');
    const want = ['minigun', 'm4', 'ak', 'aa12', 'pistol', 'uzi', 'shotgun', 'revolver', 'launcher', 'sniper', 'plain'];
    const got = new Set((seen || []).map((s) => s.w));
    ok(want.every((w) => got.has(w)), 'one case per caliber and the plain cylinder (' + [...got].join(', ') + ')');
    ok((seen || []).every((s) => s.culled === false && s.geo && s.mat), 'none of them culled, each with its geometry and material');
    // (the suite's fakethree page builds no case art, so here every case falls back to the cylinder; the real page uses
    // each gun's own case, the same caseLook() its first shot uses)
    out.push('INFO ' + new Set((seen || []).map((s) => s.geo.uuid)).size + ' case geometries in the warm');
    await wait(300);
    ok(!T.scene.getObjectByName('case-warm'), 'and they are out of the scene once the warm is done');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
