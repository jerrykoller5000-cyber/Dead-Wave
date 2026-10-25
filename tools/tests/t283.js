// t283 - GB-227 (N12, Jerry: "a circle appears around the muzzle and the water disappears inside it"): a gun's muzzle flash
// ball is always in the scene at opacity 0 between shots; writing depth, it cut a disc out of the water (and anything else
// transparent) behind it. Every player gun's flash, the akimbo copies' and the turrets' write no depth.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Muzzle');
    const bad = [], seen = [];
    for (const [w, g] of Object.entries(T.weaponMeshes)) { const f = g && g.userData.flash; if (!f) continue; seen.push(w); if (f.material.depthWrite) bad.push(w); }
    for (const [w, g] of Object.entries(T.offhandMeshes || {})) { const f = g && g.userData.flash; if (!f) continue; seen.push(w + '(akimbo)'); if (f.material.depthWrite) bad.push(w + '(akimbo)'); }
    ok(seen.length >= 11, seen.length + ' gun flashes found (' + seen.join(', ') + ')');
    ok(bad.length === 0, 'none writes depth' + (bad.length ? ': ' + bad.join(', ') : ''));
    // A turret of each kind with a flash ball.
    const tb = [];
    T.scene.traverse((o) => { if (o.userData && o.userData.flash && o.userData.pitchG && o.userData.flash.material && o.userData.flash.material.depthWrite) tb.push(o.name || o.uuid.slice(0, 6)); });
    ok(tb.length === 0, 'no turret flash in the scene writes depth' + (tb.length ? ': ' + tb.join(', ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})();