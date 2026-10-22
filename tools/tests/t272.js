// t272 - CL-241: the marine's shadow proxy (CL-140) is built at load and kept. GP-19952 found its node build and shadow
// pipeline in night 20's measured fight (frames 776-784, three runs): built a second after he landed, it was first drawn
// by the night's next timed shadow redraw. Now:
//  - it is built at load, before the staged fight, padded to 96 bones (128 for a bigger set), and drawn there;
//  - the start of a match (the rig skin baked again, CL-210) does not build it again: the signature leaves out his
//    skinned meshes, which the proxy never takes;
//  - a part shown or hidden in play builds it again at the same bone count, three's node build is kept (no new entry in
//    its node-builder cache), and the old proxy goes once the new one has drawn;
//  - in the night proper that rebuild redraws the sun's shadow map once (CL-237 draws it rarely there). No page errors.
// Real renderer only (tools/realtest.mjs t272 --soft): the test page's three has no SkinnedMesh.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const R = T.renderer, pr0 = R && R.getPixelRatio ? R.getPixelRatio() : 1;
  let part = null, gfx0 = null;
  try {
    if (typeof T.marineShadowDbg !== 'function' || !T.sun) { ok(false, 'TT.marineShadowDbg and TT.sun are there'); return out.join('\n'); }
    if (!T.sun.castShadow) { out.push('SKIP the sun casts no shadow at this quality'); return out.join('\n'); }
    const D = () => T.marineShadowDbg();
    if (!(T.THREE && T.THREE.SkinnedMesh)) { out.push('SKIP no SkinnedMesh in this three (the test page): run it with tools/realtest.mjs --soft'); return out.join('\n'); }
    const cache = R && R._nodes && R._nodes.nodeBuilderCache;   // three r175's node builds, shared by cache key
    const frames = async (n, ms) => { const f0 = D().frame; return until(() => D().frame >= f0 + n, ms || 120000); };

    // At load.
    const w = D().warm, okBones = (n) => n === 96 || n === 128;
    ok(!!w && okBones(w.bones), 'built at load, padded (' + JSON.stringify(w) + ')');
    ok(!!D().proxy && okBones(D().bones) && D().builds === 0, 'the proxy is there at the title, no build in play yet (' + D().bones + ' bones, ' + D().builds + ' builds)');
    ok(D().drawnAt >= 0, 'drawn during the load (frame ' + D().drawnAt + ')');

    // The match starts: the rig skin is baked again; the proxy is not. Medium from here, in a small canvas: the cloud's
    // software GL draws High's 2048 shadow map every frame by day, and this counts frames.
    if (T.applyGraphicsPreset && T.GFX_PRESETS && T.GFX_PRESETS.medium) { gfx0 = T.getGfx(); T.applyGraphicsPreset('medium'); }
    if (R && R.setPixelRatio) R.setPixelRatio(0.25);
    await startMatch(T, 'Shadow proxy');
    T.clearZombies && T.clearZombies();
    await frames(96);
    ok(D().builds === 0 && D().sig === w.sig, 'no rebuild when the match starts (' + D().builds + ' builds; ' + D().sig + ' vs ' + w.sig + ')');

    // A part shown, then hidden again: each a rebuild with the same shader.
    const m = T.getMarine();
    m.traverse((o) => { if (!part && o.isMesh && !o.isSkinnedMesh && !o.visible && !o.userData.skinSrc && o.parent && o.parent.visible && o.material && !o.material.transparent && !o.userData.liveShape) part = o; });
    if (!part) { ok(false, 'a hidden part to show'); return out.join('\n'); }
    for (const [tag, vis] of [['shown', true], ['hidden again', false]]) {
      const b0 = D().builds, snap = cache ? new Set(cache.values()) : null, old = D().proxy;
      part.visible = vis;
      const built = await until(() => D().builds > b0, 90000);
      const drawn = await until(() => D().retired === 0 && D().drawnAt >= 0, 60000);
      const fresh = snap ? [...cache.values()].filter((v) => !snap.has(v)).length : 0;
      ok(built && D().proxy !== old && okBones(D().bones) && D().bones === w.bones, 'a part ' + tag + ': built again at ' + D().bones + ' bones');
      ok(drawn, 'a part ' + tag + ': drawn, and the old proxy disposed (' + D().retired + ' waiting)');
      ok(!snap || fresh === 0, 'a part ' + tag + ': no new node build (' + fresh + ')');
    }

    // The night proper: a rebuild redraws the sun's map.
    T.setWorldTime(0.97);
    ok(await until(() => T.sunShadowDbg().deep, 30000), 'the night proper comes (sun ' + T.sun.intensity.toFixed(3) + ')');
    await frames(20);
    const hold = setInterval(() => { if (!T.sunShadowDbg().deep) T.setWorldTime(0.97); }, 200);
    try {
      const b0 = D().builds, r0 = T.sunShadowDbg().redraws;
      part.visible = true;
      const built = await until(() => D().builds > b0, 90000);
      ok(built && T.sunShadowDbg().redraws >= r0 + 1, 'at night a rebuild redraws the map (' + (T.sunShadowDbg().redraws - r0) + ')');
      ok(await until(() => D().retired === 0 && D().drawnAt >= 0, 60000), 'and the new proxy is drawn by it');
    } finally { clearInterval(hold); }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    ok(false, 't272 threw: ' + String((e && e.stack) || e).slice(0, 300));
  } finally {
    if (part) part.visible = false;
    if (gfx0 && T.applyGraphicsPreset) T.applyGraphicsPreset(gfx0);
    if (R && R.setPixelRatio) R.setPixelRatio(pr0);
  }
  return out.join('\n');
})()
