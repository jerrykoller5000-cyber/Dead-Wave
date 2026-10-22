// t270 - CL-227: every zombie body's skeleton is one fixed size. three writes a skeleton's length into the skinning
// vertex shader, so each new bone count was a new shader and a render pipeline built mid-fight (AG-106: 20-22 of night
// 20's long frames). CL-232: and one shared glow graph (a body's own graph was a node build each). skinZombieMesh pads to 32 bones (64 for a bigger rig) with repeats of the last one; nothing is
// weighted to the padding. Real renderer only (tools/realtest.mjs t270 --soft): the test page's three has no SkinnedMesh.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 400)));
  try {
    const kinds = ['shambler', 'feral', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'demon', 'bomber', 'leaper'];
    const sizes = new Map(), bad = [], weights = [], glowNodes = new Set(), glowBad = [];
    let skins = 0;
    for (const k of kinds) for (let n = 0; n < 2; n++) {
      const z = T.spawnZombie(-4 + n * 6, 22 + kinds.indexOf(k) * 3, k, true, true);
      if (!z) { bad.push(k + ' did not spawn'); continue; }
      for (const s of z.mesh.userData.skinMeshes || []) {
        skins++;
        const L = s.skeleton.bones.length; sizes.set(L, (sizes.get(L) || 0) + 1);
        // CL-232: every glowing body shares one emissive graph, reading its own eye and ember levels.
        if (s.geometry.attributes.zGlow) {
          glowNodes.add(s.material.emissiveNode);
          const ud = z.mesh.userData, eye = ud.eyeMats && ud.eyeMats[0] ? ud.eyeMats[0].emissiveIntensity : 0;
          if (Math.abs((s.userData.zEyeGlow || 0) - (+eye || 0)) > 1e-6) glowBad.push(k + ' eye ' + s.userData.zEyeGlow + ' vs ' + eye);
          if (ud.emberMat && Math.abs(s.userData.zFireGlow - ud.emberMat.emissiveIntensity) > 1e-6) glowBad.push(k + ' fire');
        }
        if (L !== 32 && L !== 64) bad.push(k + ' ' + L);
        // The padding repeats the last real bone; every weight sits on a real index, and the body still poses.
        const I = s.geometry.attributes.skinIndex, W = s.geometry.attributes.skinWeight;
        let real = L; while (real > 1 && s.skeleton.bones[real - 1] === s.skeleton.bones[real - 2]) real--;
        let maxIdx = 0; for (let i = 0; i < I.count; i++) for (let c = 0; c < 4; c++) if (W.getComponent(i, c) > 0) maxIdx = Math.max(maxIdx, I.getComponent(i, c));
        if (maxIdx >= real) weights.push(k + ' weight on ' + maxIdx + ' of ' + real);
        z.mesh.updateMatrixWorld(true); s.skeleton.update();
        const v = new z.mesh.position.constructor(); s.getVertexPosition(Math.floor(I.count / 2), v);
        if (!Number.isFinite(v.x + v.y + v.z)) weights.push(k + ' posed vertex ' + v.x);
      }
    }
    if (!skins) { ok(true, 'no zombie skins on this page (the test page has no SkinnedMesh): run tools/realtest.mjs t270 --soft'); return out.join('\n'); }
    ok(!bad.length, 'every zombie skeleton is 32 or 64 bones (' + [...sizes].map(([a, b]) => a + ' x' + b).join(', ') + (bad.length ? '; ' + bad.join(', ') : '') + ')');
    ok(sizes.size <= 2, 'at most two skeleton sizes over ten kinds, two each (' + sizes.size + ')');
    ok(!weights.length, 'no vertex is weighted to the padding, and a posed vertex is finite' + (weights.length ? ': ' + weights.slice(0, 4).join(', ') : ''));
    ok(glowNodes.size === 1 && !glowBad.length, 'one shared glow graph for every glowing body, each reading its own levels (' + glowNodes.size + ' graphs' + (glowBad.length ? '; ' + glowBad.slice(0, 3).join(', ') : '') + ')');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
