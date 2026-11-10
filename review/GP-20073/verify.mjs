import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 60000 }), 'game loaded');
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }), 'opening dismissed');
  await page.evaluate(`(() => { document.querySelector('#playerName').value = 'J96 Armory'; document.querySelector('#modeHunt').click(); })()`);
  assert(await page.waitFor('TT.getPhase() === "prep" && !document.body.classList.contains("deploying")', { timeout: 60000 }), 'prep started');
  await page.evaluate(`TT.openMenuDbg('armory')`);
  assert(await page.waitFor('document.querySelector("#armoryPanel #shop.armory-inline")', { timeout: 15000 }), 'Armory opens with catalogue');
  await page.evaluate(`TT.addCash(-TT.getBank()); TT.armoryDbg.ui().render()`);
  const noCash = await page.evaluate(`({ disabled: document.querySelector('[data-buy-build="m240"]').disabled,
    status: document.querySelector('[data-offer-build="m240"] small').textContent })`);
  assert(noCash.disabled && /Need \d+ more/.test(noCash.status), 'unaffordable shelf card explains its shortfall');
  await page.evaluate(`TT.addCash(1000000); TT.armoryDbg.ui().render()`);
  const initial = await page.evaluate(`(() => {
    const p = document.querySelector('#armoryPanel');
    return { guns: p.querySelectorAll('[data-offer-gun]').length,
      future: !!p.querySelector('[data-offer-gun="minigun"] .armory-pic svg, [data-offer-gun="minigun"] .armory-pic img'),
      futureLocked: !!p.querySelector('[data-buy-gun="minigun"]:disabled'),
      builds: [...p.querySelectorAll('[data-offer-build]')].map(e => e.dataset.offerBuild),
      buildIcons: [...p.querySelectorAll('[data-offer-build] .armory-pic svg')].length,
      headings: [...p.querySelectorAll('#shopList .shop-section')].map(e => e.textContent.trim()),
      shelfGap: p.querySelector('.armory-locker .armory-offers').getBoundingClientRect().top - p.querySelector('.armory-locker .armory-shelf:not(.armory-offers)').getBoundingClientRect().bottom,
      overflow: p.scrollWidth > p.clientWidth + 1 };
  })()`);
  assert(initial.guns > 0 && initial.future && initial.futureLocked, 'future guns retain icons and disabled Buy');
  assert.deepEqual(initial.builds, ['m240', 'mortar'], 'separate emplacement shelf');
  assert.equal(initial.buildIcons, 2, 'distinct emplacement icons');
  assert.deepEqual(initial.headings, ['Ammo', 'Upgrades'], 'the catalogue no longer duplicates guns, mods and build plans');
  assert(initial.shelfGap < 80, 'gun shelves stack without a large empty gap');
  assert(!initial.overflow, 'Armory has no horizontal overflow');
  await page.screenshot(path.join(root, 'review/GP-20073/armory-initial-1280.png'));
  await page.setViewport(390, 844);
  const mobile = await page.evaluate(`({ panel: document.querySelector('#armoryPanel').scrollWidth <= document.querySelector('#armoryPanel').clientWidth + 1,
    viewport: document.documentElement.scrollWidth <= innerWidth + 1 })`);
  assert(mobile.panel && mobile.viewport, 'mobile Armory has no horizontal overflow');
  await page.screenshot(path.join(root, 'review/GP-20073/armory-mobile-390.png'));
  await page.setViewport(1280, 720);

  await page.evaluate(`TT.stockNoticeDbg.setDay(2); TT.armoryDbg.ui().render()`);

  const chosen = await page.evaluate(`(() => {
    const b = [...document.querySelectorAll('#armoryPanel [data-buy-gun]')].find(b => !b.disabled);
    if (!b) return null;
    const kind = b.dataset.buyGun; b.click(); return kind;
  })()`);
  assert(chosen, 'a stocked gun can be bought');
  assert(await page.evaluate(`TT.getWeaponOwned()[${JSON.stringify(chosen)}]`), 'Buy grants gun ownership');
  assert(await page.evaluate(`!!document.querySelector('#armoryPanel [data-bench="${chosen}"]') || !!document.querySelector('#armoryPanel [data-slot] .armory-name')`), 'bought gun enters loadout or shelf');

  await page.evaluate(`TT.armoryDbg.ui().bench('pistol')`);
  const beforeMod = await page.evaluate(`({ cash: TT.getBank(), owned: TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.owned,
    fitted: TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.fitted,
    button: document.querySelector('#armoryPanel [data-mod="auto"] button')?.textContent })`);
  assert(!beforeMod.owned && !beforeMod.fitted && /Buy/i.test(beforeMod.button), 'pistol auto starts buyable');
  await page.evaluate(`document.querySelector('#armoryPanel [data-mod="auto"] button').click()`);
  const afterMod = await page.evaluate(`({ cash: TT.getBank(), owned: TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.owned,
    fitted: TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.fitted,
    button: document.querySelector('#armoryPanel [data-mod="auto"] button')?.textContent })`);
  assert(afterMod.owned && afterMod.fitted && afterMod.cash < beforeMod.cash && /off|remove/i.test(afterMod.button), 'one click buys and fits');
  await page.evaluate(`document.querySelector('#armoryPanel [data-mod="auto"] button').click()`);
  const removed = await page.evaluate(`({ cash: TT.getBank(), fitted: TT.armoryDbg.mods('pistol').find(m => m.id === 'auto')?.fitted })`);
  assert(!removed.fitted && removed.cash === afterMod.cash, 'second click removes without charging');
  await page.screenshot(path.join(root, 'review/GP-20073/workbench-1280.png'));

  await page.evaluate(`TT.setMagazinesDbg('pistol', 0, []); TT.armoryDbg.ui().render()`);
  const beforeAmmo = await page.evaluate(`({ cash: TT.getBank(), spare: TT.magazinesDbg('pistol').spare.length,
    button: document.querySelector('#armoryPanel [data-buy-ammo="pistol"]')?.disabled })`);
  assert.equal(beforeAmmo.spare, 0);
  assert.equal(beforeAmmo.button, false, 'workbench ammo button enabled');
  await page.evaluate(`document.querySelector('#armoryPanel [data-buy-ammo="pistol"]').click()`);
  const afterAmmo = await page.evaluate(`({ cash: TT.getBank(), spare: TT.magazinesDbg('pistol').spare.length,
    prompt: document.querySelector('#reloadPrompt').textContent })`);
  assert(afterAmmo.spare > 0 && afterAmmo.cash < beforeAmmo.cash, 'workbench ammo purchase adds reserve and spends Cash');
  assert.match(afterAmmo.prompt, /Reload/i, 'NO AMMO prompt clears');

  await page.evaluate(`document.querySelector('[data-buy-build="m240"]').click(); document.querySelector('[data-buy-build="mortar"]').click()`);
  const emplacements = await page.evaluate(`({ plans: TT.getBuildUnlocked(), shelf: [...document.querySelectorAll('#armoryPanel [data-offer-build]')].map(e => ({
    kind: e.dataset.offerBuild, ammo: !!e.querySelector('[data-buy-build-ammo]') })) })`);
  assert(emplacements.plans.m240 && emplacements.plans.mortar, 'Watchman and mortar plans bought at their shelf');
  assert(emplacements.shelf.every(e => e.ammo), 'both emplacement cards offer ammunition');
  const beforeBelt = await page.evaluate(`({ cash: TT.getBank(), rounds: TT.getReserve()['7.62 belt'] || 0 })`);
  await page.evaluate(`document.querySelector('[data-buy-build-ammo="m240"]').click()`);
  const afterBelt = await page.evaluate(`({ cash: TT.getBank(), rounds: TT.getReserve()['7.62 belt'] || 0 })`);
  assert(afterBelt.rounds > beforeBelt.rounds && afterBelt.cash < beforeBelt.cash, 'Watchman shelf sells its belt ammunition');
  const beforeMortar = await page.evaluate(`({ cash: TT.getBank(), rounds: TT.getReserve()['60mm'] || 0 })`);
  await page.evaluate(`document.querySelector('[data-buy-build-ammo="mortar"]').click()`);
  const afterMortar = await page.evaluate(`({ cash: TT.getBank(), rounds: TT.getReserve()['60mm'] || 0 })`);
  assert(afterMortar.rounds > beforeMortar.rounds && afterMortar.cash < beforeMortar.cash, 'mortar shelf sells its shells');
  await page.evaluate(`document.querySelector('#armoryPanel [data-offer-build="m240"]').scrollIntoView({block:'center'})`);
  await page.screenshot(path.join(root, 'review/GP-20073/emplacements-1280.png'));
  await page.evaluate(`document.querySelector('#armoryPanel .armory-actions button:last-child').click(); TT.openShop(true); document.querySelector('#shopTabs [data-shop-page="builds"]').click()`);
  const kiosk = await page.evaluate(`document.querySelector('#shopList').textContent`);
  for (const name of ['Light turret', 'Flame turret', 'Heavy turret', 'Land mine']) assert(kiosk.includes(name + ' blueprint'), `${name} returned to kiosk`);
  assert(!kiosk.includes('Watchman MG blueprint') && !kiosk.includes('Mortar blueprint'), 'Watchman and mortar absent from kiosk');
  await page.evaluate(`([...document.querySelectorAll('#shopList .perk')].find(e => /Light turret blueprint/i.test(e.textContent)))?.scrollIntoView({block:'center'})`);
  await page.screenshot(path.join(root, 'review/GP-20073/kiosk-builds-1280.png'));
  await page.evaluate('TT.closeShop()');
  assert.equal(page.errors.length, 0, page.errors.join('\n'));
  console.log(`PASS GP-20073: locked-gun icons, ${chosen} purchase, one-click buy+fit/remove, workbench ammo, emplacement shelf and ammo, kiosk buildables, desktop/mobile layout, no page errors`);
} finally {
  await browser.close();
  await server.close();
}
