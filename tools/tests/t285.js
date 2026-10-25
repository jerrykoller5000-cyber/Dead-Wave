// t285 - GP-19967: the player sees three supply views with prices and unlock paths.
(async () => {
  const T = window.TT, out = [];
  const ok = (condition, message) => out.push((condition ? 'PASS ' : 'FAIL ') + message);
  const names = () => [...document.querySelectorAll('#shopList .shop-section')].map(el => el.textContent.trim());
  const page = key => document.querySelector('#shopTabs [data-shop-page="' + key + '"]');
  try {
    await startMatch(T, 'SupplyViews');
    T.openShop(true);
    ok([...document.querySelectorAll('#shopTabs button')].map(el => el.textContent.trim()).join('|') ===
      'Weapons & upgrades|Ammo & gear|Builds', 'three plain-language top views');
    ok(document.getElementById('shopSubtabs').hidden, 'no nested tabs');
    ok(names().join('|') === 'Ammo|Gear', 'supplies show ammo and gear together');
    const nightVision = [...document.querySelectorAll('#shopList .perk')].find(row => row.querySelector('.name')?.textContent.includes('Night vision'));
    ok(!!nightVision && /Requires Combat helmet/.test(nightVision.textContent) && nightVision.querySelector('button').disabled,
      'night vision shows its helmet prerequisite and cannot be bought early');

    page('loadout').click();
    ok(names().join('|') === 'Guns|Upgrades', 'loadout shows guns and upgrades together');
    const future = document.querySelector('#shopList [data-future-weapon="minigun"]');
    ok(!!future && /Unlocks night 14/.test(future.textContent) && /^\$\d+/.test(future.querySelector('button')?.textContent) && future.querySelector('button').disabled,
      'future gun shows both its price and unlock night without allowing purchase');
    ok(!!document.querySelector('#shopList [data-item="field-intel"]'), 'field intel remains in upgrades');
    ok([...document.querySelectorAll('#shopList .shop-section')].at(-1)?.nextElementSibling?.dataset.item === 'field-intel',
      'field intel is listed under the upgrades heading');

    page('builds').click();
    ok(names().join('|') === 'Blueprints|Fortify', 'builds show plans and fortification together');
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
