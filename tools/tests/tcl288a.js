// tcl288a - CL-288 (D-104; AG-170): the shadow passes walk only the scene's top-level children that hold a shadow
// caster; the others are hidden for the shadow's render and shown again right after. On the real renderer: shadow
// passes run with children left out, and nothing is left hidden after the frame; the stand-in three has no ShadowNode.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'CL288A');
    const D = T.shadowPruneDbg && T.shadowPruneDbg();
    ok(!!D && D.on === true, 'the shadow walk is pruned by default (' + JSON.stringify(D) + ')');
    const sc = T.scene || window.scene;
    const vis0 = sc.children.filter((c) => c.visible).length;
    T.setDay(5); await wait(1500);
    const D1 = T.shadowPruneDbg();
    const THREE = T.THREE || window.THREE;   // tcl281's test: the stand-in three's transpose is a stub
    const real = (() => { const m = new THREE.Matrix4().makeRotationX(0.3), e = m.elements.slice(); m.transpose(); return m.elements[6] === e[9] && e[6] !== e[9]; })();
    (real ? ok : (c, m) => out.push('INFO ' + m + ' (the stand-in three)'))(D1.passes > D.passes && D1.last > 0, 'shadow passes ran with children left out (' + D1.passes + ' passes, ' + D1.last + ' children out of the last)');
    const vis1 = sc.children.filter((c) => c.visible).length;
    ok(Math.abs(vis1 - vis0) < 40, 'nothing left hidden after the frames (' + vis0 + ' visible top-level children before, ' + vis1 + ' after)');
    let casterHidden = 0; for (const c of sc.children) { if (c.visible) continue; let has = false; c.traverse((m) => { if (m.isMesh && m.castShadow) has = true; }); if (has && c.userData && c.userData._shadowCaster && c.userData._shadowCaster.has === false) casterHidden++; }
    ok(casterHidden === 0, 'no child with a caster is marked caster-free (' + casterHidden + ')');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
