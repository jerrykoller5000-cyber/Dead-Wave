// t144 - CU-70 (P-131): the dressing room. A shirt can wear its own camo, the boots
// their own colour, and the profile keeps both.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const dress = (id) => (T.marineWardrobe(id) || []).filter((m) => m.userData && m.userData.dress);
  try {
    await startMatch(T, 'Dress');
    const seeded = T.getWardrobe();
    ok(seeded && seeded.items.mask.camo === 'coyoteBrown', 'the mask starts coyote brown');
    ok(seeded.items.shirt.camo === T.getCamo(), 'the shirt starts on the saved camo (' + seeded.items.shirt.camo + ')');
    const shirt = T.setWardrobeItem('shirt', { camo: 'flecktarn' });
    ok(shirt && shirt.items.shirt.camo === 'flecktarn' && shirt.items.trousers.camo !== 'flecktarn', 'the shirt changes on its own');
    const shirtMats = dress('shirt');
    ok(shirtMats.length > 0 && shirtMats.every((m) => m.map && m.map !== T.camoTex), 'the shirt wears its own tile');
    const trousers = dress('trousers');
    ok(trousers.some((m) => m.map === T.camoTex), 'the trousers stay on the shared tile');
    const boots = T.setWardrobeItem('boots', { colour: 'tan' });
    ok(boots && boots.items.boots.colour === 'tan', 'the boots go tan');
    ok(dress('boots').some((m) => m.color.getHex() === T.BOOT_HEX.tan), 'the boot leather is tan');
    const saved = JSON.parse(localStorage.getItem('tt_wardrobe') || 'null');
    ok(saved && saved.items.shirt.camo === 'flecktarn' && saved.items.boots.colour === 'tan', 'the profile kept the picks');
    ok(T.normalizeWardrobe({ version: 1, items: { shirt: { camo: 'nope' } } }).items.shirt.camo === T.getCamo(), 'an unknown camo falls back');
    T.setCamo('m81');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
