// t159 - CL-75 (D-70, docs/story.md §5): the three who lived, as themselves: Okafor (medic, aid bag), Brandt (gunner,
// a belt of 7.62, boonie and aviators), Pike (mechanic, cap backwards, bare hands, a wrench). The same figures at the
// camp (GB-90) and on the roof (GB-116), dressed through the wardrobe, each their own face.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const figs = {};
    for (const who of ['okafor', 'brandt', 'pike']) figs[who] = T.makeSurvivorFigure(who);
    ok(Object.values(figs).every((m) => m.userData.survivorWho && m.userData.dress && m.userData.dress.picked), 'three figures, each dressed');
    const picked = (w) => figs[w].userData.dress.picked;
    ok(picked('brandt').hat === 'boonie' && picked('brandt').eyewear === 'aviators' && picked('brandt').rolled, 'Brandt: boonie, aviators, sleeves rolled');
    ok(picked('pike').hat === 'ballcapBack' && !picked('pike').gloves, 'Pike: cap backwards, bare hands');
    ok(new Set(['okafor', 'brandt', 'pike'].map((w) => picked(w).skin + ':' + picked(w).hair)).size === 3, 'three different faces');
    ok(!!figs.okafor.getObjectByName('survivor-aid-bag'), 'Okafor carries her aid bag');
    ok(!!figs.brandt.getObjectByName('survivor-ammo-belt'), 'Brandt wears his belt of rounds');
    ok(!!figs.pike.getObjectByName('survivor-wrench'), 'Pike has her wrench');
    ok(!!figs.okafor.getObjectByName('survivor-rifle') && !!figs.pike.getObjectByName('survivor-rifle') && !figs.brandt.getObjectByName('survivor-rifle'), 'Okafor and Pike carry M4s; Brandt has his M240B on the roof');
    ok(!figs.okafor.userData.gearParts.helmet.some((o) => o.visible) && figs.okafor.userData.gearParts.vest.some((o) => o.visible), 'no helmet; Okafor in her vest');
    // On the roof: the figures are theirs.
    await startMatch(T, 'Survivors');
    for (const style of ['trapper', 'ranger', 'hikers']) T.survivorHelpDbg.grant(style);
    const roots = T.roofDbg.roots();
    const whos = roots.map((r) => { let w = null; r.traverse((o) => { if (o.userData && o.userData.survivorWho) w = o.userData.survivorWho; }); return w; });
    ok(JSON.stringify(whos.slice().sort()) === JSON.stringify(['brandt', 'okafor', 'pike']), 'on the roof: ' + whos.join(', '));
    T.resetGame();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
