// t285 - GP-19967: the player sees three supply views with prices and unlock paths.
(async () => {
  const T = window.TT, out = [];
  const ok = (condition, message) => out.push((condition ? 'PASS ' : 'FAIL ') + message);
  const names = () => [...document.querySelectorAll('#shopList .shop-section')].map(el => el.textContent.trim());
  const page = key => document.querySelector('#shopTabs [data-shop-page="' + key + '"]');
  try {
    await startMatch(T, 'SupplyViews');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const tabNames = () => [...document.querySelectorAll('#shopTabs button')].map(el => el.textContent.trim()).join('|');
    T.openShop(true);
    ok(tabNames() === 'Supplies|Builds', 'the kiosk has two plain-language top views, Supplies and Builds (D-124; was three)');
    ok(document.getElementById('shopSubtabs').hidden, 'no nested tabs');
    ok(!!document.querySelector('#shopList [data-item="field-intel"]'), 'field intel is sold at the kiosk supplies view');
    ok(!/Combat helmet|Night vision|Armor plates|Ballistic/i.test(document.getElementById('shopList').textContent) && !document.querySelector('#shopList [data-item="field-intel"]').textContent.includes('LOCKED'),
      'the kiosk supplies view no longer lists wearables (D-124: they are at the CIF)');
    ok(![...document.querySelectorAll('#shopList .perk')].some(row => /Night vision/.test(row.querySelector('.name')?.textContent || '')),
      'night vision is not sold at the kiosk');
    T.closeShop();
    T.openMenuDbg('cif');
    const headTab = document.querySelector('#cifTabs [data-cif-tab="head"]'); if (headTab) headTab.click();
    await wait(80);
    const nvRow = document.querySelector('#cif [data-cif-buy="nvg"]');
    ok(!!nvRow && /helmet/i.test(nvRow.textContent) && nvRow.querySelector('button').disabled,
      'night vision at the CIF shows its helmet prerequisite and cannot be bought early');
    T.closeMenuDbg('cif');

    T.openMenuDbg('armory'); await wait(80);
    T.setShopTabDbg('loadout'); await wait(80);
    ok(tabNames() === 'Guns|Ammo|Weapon builds', 'the Armory store has three top views, Guns, Ammo and Weapon builds');
    ok(names().join('|') === 'Guns|Upgrades', 'the Armory guns view shows guns and upgrades together');
    const future = document.querySelector('#shopList [data-future-weapon="minigun"]');
    ok(!!future && /Unlocks night 14/.test(future.textContent) && /^\$\d+/.test(future.querySelector('button')?.textContent) && future.querySelector('button').disabled,
      'future gun shows both its price and unlock night without allowing purchase');
    page('supplies').click();
    ok([...document.querySelectorAll('#shopList .perk')].some(row => /Restock all/.test(row.textContent)), 'the Armory ammo view lists the ammo supplies');
    page('builds').click();
    ok(names().join('|') === 'Blueprints|Fortify', 'the Armory weapon builds view shows plans and fortification together');
    T.closeMenuDbg('shop'); T.closeMenuDbg('armory');

    T.openShop(true);
    page('builds').click();
    ok(names().join('|') === 'Blueprints|Fortify', 'kiosk builds show plans and fortification together');
    const locked = [...document.querySelectorAll('#shopList .perk')].find(row => /Requires .* blueprint/.test(row.textContent));
    ok(!!locked && /^\$\d+/.test(locked.querySelector('button')?.textContent) && locked.querySelector('button').disabled,
      'locked fortification shows its cost and required base blueprint');
    ok(document.querySelectorAll('#shopList .shop-icon').length > 0 &&
      [...document.querySelectorAll('#shopList .perk')].every(row => row.querySelector('.shop-icon') || row.dataset.item === 'field-intel'),
      'cards have category symbols');
    T.closeShop();
  } catch (error) { ok(false, 'threw ' + (error?.stack || error)); }
  return out.join('\n');
})();
