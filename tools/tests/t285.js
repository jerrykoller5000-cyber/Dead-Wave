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
    ok(tabNames() === '', 'the Armory catalogue has no gun or build tabs (D-132)');
    ok(names().join('|') === 'Ammo|Upgrades', 'the Armory catalogue keeps ammo and the remaining upgrades');
    ok(!document.querySelector('#shopList [data-weapon], #shopList [data-future-weapon]'), 'guns are not catalogue rows');
    ok([...document.querySelectorAll('#shopList .perk')].some(row => /Restock all/.test(row.textContent)), 'the Armory catalogue lists the ammo supplies');
    const future = document.querySelector('#armoryPanel [data-offer-gun="minigun"]');
    ok(!!future && /night 14/i.test(future.textContent) && future.querySelector('[data-buy-gun]').disabled,
      'the minigun stays on the gun shelf with its night and a disabled Buy');
    ok(!!document.querySelector('#armoryPanel [data-offer-build="m240"]') && !!document.querySelector('#armoryPanel [data-offer-build="mortar"]'),
      'the Watchman MG and the mortar have their own shelf');
    T.closeMenuDbg('shop'); T.closeMenuDbg('armory');

    T.openShop(true);
    page('builds').click();
    ok(names().join('|') === 'Blueprints|Fortify', 'kiosk builds show plans and fortification together');
    const buildText = document.getElementById('shopList').textContent;
    ok(/Light turret/.test(buildText) && /Flame turret/.test(buildText) && /Heavy turret/.test(buildText) && /Land mine/.test(buildText),
      'the turret and mine plans are back at the kiosk');
    ok(!/Watchman MG/.test(buildText) && !/Mortar blueprint/.test(buildText), 'the Watchman MG and the mortar are not kiosk plans');
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
