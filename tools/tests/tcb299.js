// tcb299 - CB-299 (ChatGPT 2, GT-20079: "Revolver rack displays reload-only props through the closed cylinder"): a rack or carry
// copy made while the gun is mid-reload (its empties, speedloader and palm rounds showing) keeps them hidden: every part the
// model marks reloadParts.<key>.visibleAtRest false, and the palm rounds. The cylinder and the rest of the gun stay shown.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    if (!T.carryGunCopyDbg) { ok(false, 'the hook T.carryGunCopyDbg is there'); return out.join('\n'); }
    await startMatch(T, 'CB299');
    T.grantAllWeapons();
    const src = T.weaponMeshes.revolver, ud = src.userData, RP = ud.reloadParts || {};
    const hidden = Object.entries(RP).filter(([k, v]) => v && v.visibleAtRest === false && ud[k] && ud[k].isObject3D).map(([k]) => k);
    if (ud.palmRounds && ud.palmRounds.isObject3D) hidden.push('palmRounds');
    ok(hidden.length >= 2, 'the revolver marks its reload-only parts: ' + hidden.join(', '));
    // as if mid-reload: every one of them showing on the gun itself
    const was = hidden.map((k) => ud[k].visible);
    for (const k of hidden) { ud[k].visible = true; ud[k].traverse((o) => { o.visible = true; }); }
    const g = T.carryGunCopyDbg('revolver');
    ok(!!g, 'a carry copy is made');
    // the copy's own part: the same place in the walk (lights left out, as carryGunCopy does)
    const orig = [], copy = [];
    src.traverse((o) => { if (!o.isLight) orig.push(o); });
    const root = g.children.length === 1 && !g.userData.carryKind ? g.children[0] : g;   // carryGunCopy hands back a wrap round the copy
    root.traverse((o) => copy.push(o));
    const twin = (o) => copy[orig.indexOf(o)];
    for (const k of hidden) {
      const c = twin(ud[k]);
      let shown = false; if (c) { let vis = c.visible; for (let p = c.parent; p && vis; p = p.parent) vis = p.visible; shown = vis; }
      ok(!!c && !shown, k + ' is hidden on the copy (' + (c ? 'found' : 'not found') + ')');
    }
    const cyl = ud.cylinder && twin(ud.cylinder);
    ok(!ud.cylinder || (cyl && cyl.visible), 'the cylinder still shows');
    let meshes = 0; g.traverseVisible((o) => { if (o.isMesh) meshes++; });
    ok(meshes > 10, 'the rest of the gun shows (' + meshes + ' meshes)');
    hidden.forEach((k, i) => { ud[k].visible = was[i]; });
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
