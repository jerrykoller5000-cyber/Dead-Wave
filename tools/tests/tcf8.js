// tcf8 - CF-8 (J151, Jerry 13 Nov).
//  - Note 53, "The flame sizzle effect sometimes lingers well after the flames are out": the burning hiss and the fire
//    crackle are pulse beds (core/audio.js pulse(): a loop kept alive by being set; one not set for `hold` s fades and
//    stops, in pulseBeds()). updateAmbience, which reaps them outdoors, returns at once in the Training Ground, so a
//    plate's ignite hiss or a ground fire's crackle played on for ever there. Training's frame (updateMusic's training
//    branch) reaps them too. (The suite's page can't load Jerry's takes, so this reads the frame's code; the live proof,
//    with the takes, is in handoffs/2026-11-13-claude6-CF-8.md.)
//  - Note 34, "The chainsaw glows when the trigger is pulled": the game's heat material (userData.heatMat) is the exhaust
//    shield alone, and its colour is a dark red (pictures: review/CF-8/), so a running saw shows no glow; nothing else on the saw
//    glows. The motor enamel and its covers have no emissive colour.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const src = await (await fetch(new URL('/core/audio.js', location.origin).href, { cache: 'no-store' })).text();
    const fn = src.slice(src.indexOf('function updateMusic('), src.indexOf('function updateMusic(') + 900);
    const branch = (fn.match(/if\s*\(\s*trainingMode\s*\)\s*\{([^}]*)\}/) || [])[1] || '';
    ok(branch.length > 0, 'updateMusic has its Training branch');
    ok(/pulseBeds\(\)/.test(branch) && branch.indexOf('pulseBeds()') < branch.indexOf('return'), "Training's frame reaps the pulse beds (the fire's hiss and crackle stop once nothing keeps them): " + branch.trim().slice(0, 160));
    const amb = src.slice(src.indexOf('function updateAmbience('), src.indexOf('function updateAmbience(') + 200);
    ok(/if\s*\(\s*trainingMode\s*\)\s*return/.test(amb) ? /pulseBeds\(\)/.test(branch) : true, 'where updateAmbience is off (Training), the beds are reaped elsewhere');

    const { makeChainsawModel } = await import(new URL('/studio/weapon-heavy.js', location.origin).href);
    const saw = T.weaponMeshes ? T.weaponMeshes.chainsaw : null;
    const gun = saw || null;
    ok(!!gun && !!gun.userData.heatMat, 'the game chainsaw has its heat material');
    if (gun && gun.userData.heatMat) {
      const hm = gun.userData.heatMat;
      let users = 0, others = [];
      gun.traverse((o) => {
        if (!o.isMesh) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (!m) continue;
          if (m === hm) users++;
          else if (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.02 && !/pilot|lamp|led|tritium|glow/i.test(m.name || '')) others.push(m.name || '(unnamed)');
        }
      });
      ok(users >= 1 && users <= 3, 'the heat shows on the exhaust shield only (' + users + ' mesh(es), material ' + hm.name + ')');
      const e = hm.emissive, peak = Math.max(e.r, e.g, e.b);
      ok(peak < 0.25, 'the heat colour is a dark red, under a quarter of the old orange (peak channel ' + peak.toFixed(3) + ' < 0.25, sRGB): a running saw shows no glow');
      ok(peak * 1.2 > 0.02, 'an overheated saw (1.2) still shows a dull red on the muffler (' + (peak * 1.2).toFixed(3) + ')');
      ok(!others.length, 'nothing else on the chainsaw glows: ' + (others.join(', ') || 'none'));
      let enamel = null; gun.traverse((o) => { if (o.isMesh && /motor enamel/.test(o.material?.name || '')) enamel = o.material; });
      ok(!enamel || (enamel.emissive.r + enamel.emissive.g + enamel.emissive.b) === 0, 'the motor enamel has no emissive colour');
    }
    ok(typeof makeChainsawModel === 'function', 'makeChainsawModel exported');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
