// t101 - CU-60 (Jerry direct): the kiosk doesn't show an upgrade until the tier under it is owned.
// Fortify lists a track only once its piece's build blueprint is bought (window mesh needs the
// window), and then only the tiers owned plus the next one. Night vision stays off the Gear list
// until the helmet is bought.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const names = () => [...document.querySelectorAll('#shopList .perk .name')].map((n) => n.firstChild ? n.firstChild.textContent.trim() : '');
  const has = (n) => names().includes(n);
  try {
    await startMatch(T, 'KioskTiers');
    const unlocked = T.getBuildUnlocked(), own = T.getUpgradeOwned(), gear = T.getGearOwned();
    for (const k of Object.keys(own)) delete own[k];
    for (const k of Object.keys(unlocked)) if (!['barricade', 'shovel', 'upgrade'].includes(k)) delete unlocked[k];
    T.addCash(100000);

    T.setShopTabDbg('fortify');
    ok(has('Braced barricade blueprint') && !has('Czech hedgehog blueprint'), 'barricades: tier 1 shown, tier 2 hidden');
    ok(!has('Reinforced wood wall blueprint') && !has('Light turret Mk II blueprint'), 'walls and turrets hidden before their build blueprints');
    ok(!has('Steel mesh window blueprint'), 'window mesh hidden before the window');

    unlocked.wall = true; unlocked.window = true; T.setShopTabDbg('fortify');
    ok(has('Reinforced wood wall blueprint') && !has('Stone wall blueprint'), 'wall bought: its first tier shows, the next does not');
    ok(has('Steel mesh window blueprint'), 'window bought: the mesh shows');

    own.wall = 1; T.setShopTabDbg('fortify');
    ok(has('Reinforced wood wall blueprint') && has('Stone wall blueprint') && !has('Reinforced stone wall blueprint'),
      'tier 1 owned: tier 2 shows, tier 3 does not');

    T.setShopTabDbg('gear');
    ok(!gear.helmet && has('Combat helmet') && !has('Night vision'), 'night vision hidden without the helmet');
    gear.helmet = true; T.setShopTabDbg('gear');
    ok(has('Night vision'), 'helmet owned: night vision shows');
    ok(!document.querySelector('#shopList').textContent.includes('LOCKED'), 'no LOCKED rows left on the gear list');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
