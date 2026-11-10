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
  await page.evaluate(`(() => { document.querySelector('#playerName').value = 'J105 Armory'; document.querySelector('#modeHunt').click(); })()`);
  assert(await page.waitFor('TT.getPhase() === "prep" && !document.body.classList.contains("deploying")', { timeout: 60000 }), 'prep started');
  await page.evaluate(`TT.addCash(1000000); TT.stockNoticeDbg.setDay(2); TT.openMenuDbg('armory')`);
  assert(await page.waitFor('document.querySelector("#armoryPanel #shop.armory-inline")', { timeout: 15000 }), 'one Armory panel opens');
  const integrated = await page.evaluate(`(() => {
    const p = document.querySelector('#armoryPanel');
    return { resupply: !!p.querySelector('.armory-catalogue #shop.armory-inline'),
      oldHeading: p.textContent.includes('Stock and supplies'),
      overflow: p.scrollWidth > p.clientWidth + 1 };
  })()`);
  assert(integrated.resupply && !integrated.oldHeading && !integrated.overflow, 'resupply integrated without horizontal clipping');

  await page.evaluate(`TT.armoryDbg.ui().bench('pistol')`);
  const pistolPair = await page.evaluate(`({ text: document.querySelector('#armoryPanel [data-mod="pair"]')?.textContent,
    button: document.querySelector('#armoryPanel [data-mod="pair"] button')?.textContent,
    descriptionOverflow: getComputedStyle(document.querySelector('#armoryPanel #shop .perk .desc')).overflow })`);
  assert(/Pistol pair/i.test(pistolPair.text) && /Buy/i.test(pistolPair.button), 'pair bought at the pistol workbench');
  assert.equal(pistolPair.descriptionOverflow, 'visible', 'resupply descriptions are not clipped');
  await page.screenshot(path.join(root, 'review/GP-20074/after-workbench-1280.png'));
  await page.setViewport(390, 844);
  const mobile = await page.evaluate(`({ panel: document.querySelector('#armoryPanel').scrollWidth <= document.querySelector('#armoryPanel').clientWidth + 1,
    viewport: document.documentElement.scrollWidth <= innerWidth + 1 })`);
  assert(mobile.panel && mobile.viewport, 'mobile workbench fits without horizontal overflow');
  await page.screenshot(path.join(root, 'review/GP-20074/after-armory-390.png'));
  await page.setViewport(1280, 720);

  await page.evaluate(`document.querySelector('[data-buy-gun="shotgun"]').click()`);
  const purchased = await page.evaluate(`({ load: TT.armoryDbg.ui().armory.loadout(), shelf: TT.armoryDbg.ui().armory.read().shelf.map(g => g.id), rack: TT.armoryDbg.rack() })`);
  assert(purchased.shelf.includes('shotgun') && purchased.load.primary.every(x => !x) && purchased.rack.includes('shotgun'), 'new shotgun starts on physical shelf');
  await page.evaluate(`document.querySelector('[data-gun="shotgun"]').click()`);
  const carried = await page.evaluate(`({ load: TT.armoryDbg.ui().armory.loadout(), shelf: TT.armoryDbg.ui().armory.read().shelf.map(g => g.id), rack: TT.armoryDbg.rack() })`);
  assert(carried.load.primary.includes('shotgun') && !carried.shelf.includes('shotgun') && !carried.rack.includes('shotgun'), 'carried shotgun leaves both shelves');
  await page.evaluate(`document.querySelector('#armoryPanel .armory-actions button:first-child').click()`);
  const stowed = await page.evaluate(`({ load: TT.armoryDbg.ui().armory.loadout(), shelf: TT.armoryDbg.ui().armory.read().shelf.map(g => g.id), rack: TT.armoryDbg.rack() })`);
  assert(stowed.load.primary.every(x => !x) && stowed.shelf.includes('shotgun') && stowed.rack.includes('shotgun'), 'stowed shotgun returns to both shelves');

  await page.evaluate(`document.querySelector('[data-buy-gun="uzi"]').click(); document.querySelector('[data-gun="uzi"]').click(); TT.armoryDbg.ui().bench('uzi')`);
  const beforePair = await page.evaluate(`({ cash: TT.getBank(), pair: TT.armoryDbg.mods('uzi').find(m => m.id === 'pair') })`);
  assert(!beforePair.pair.owned && !beforePair.pair.fitted, 'Uzi pair starts unbought');
  await page.evaluate(`document.querySelector('#armoryPanel [data-mod="pair"] button').click()`);
  const fittedPair = await page.evaluate(`({ cash: TT.getBank(), load: TT.armoryDbg.ui().armory.loadout(), pair: TT.armoryDbg.mods('uzi').find(m => m.id === 'pair') })`);
  assert(fittedPair.cash < beforePair.cash && fittedPair.pair.owned && fittedPair.pair.fitted &&
    fittedPair.load.secondary.includes('uzi') && fittedPair.load.secondary.includes('uzi:second'), 'one click buys and carries second Uzi');
  await page.evaluate(`document.querySelector('#armoryPanel [data-slot="secondary:1"]').click(); document.querySelector('#armoryPanel .armory-actions button:first-child').click()`);
  const pairStowed = await page.evaluate(`({ load: TT.armoryDbg.ui().armory.loadout(), shelf: TT.armoryDbg.ui().armory.read().shelf.map(g => g.id) })`);
  assert(!pairStowed.load.secondary.includes('uzi:second') && pairStowed.shelf.includes('uzi:second'), 'second Uzi can be depopulated independently');
  await page.evaluate(`TT.closeMenuDbg('armory'); TT.setWeapon(TT.WEAPON_ORDER.indexOf('uzi')); TT.toggleDualWieldDbg()`);
  assert(!(await page.evaluate('TT.vaultDbg.flags().akimbo')), 'Y cannot conjure a stored second gun');
  await page.evaluate(`TT.openMenuDbg('armory'); TT.armoryDbg.ui().bench('uzi'); document.querySelector('#armoryPanel [data-mod="pair"] button').click()`);
  assert(await page.evaluate(`TT.armoryDbg.ui().armory.loadout().secondary.includes('uzi:second')`), 'owned pair can be carried again free');
  await page.evaluate(`TT.closeMenuDbg('armory'); TT.toggleDualWieldDbg()`);
  assert(await page.evaluate('TT.vaultDbg.flags().akimbo'), 'Y draws two Uzi guns only when both are carried');
  assert.equal(page.errors.length, 0, page.errors.join('\n'));
  await page.close();

  const training = await browser.newPage({ width: 1280, height: 720 });
  await training.goto(`${server.origin}/index.html?debug=1`);
  assert(await training.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 60000 }), 'training page loaded');
  await training.evaluate('DWOpening.dismissForTesting()');
  assert(await training.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }), 'training opening dismissed');
  await training.evaluate(`(() => { document.querySelector('#playerName').value = 'J108 Training'; document.querySelector('#modeTraining').click(); })()`);
  assert(await training.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 60000 }), 'Training Ground started');
  await training.evaluate(`TT.openMenuDbg('armory'); TT.addCash(1000000); document.querySelector('[data-buy-gun="uzi"]').click(); TT.armoryDbg.ui().bench('uzi')`);
  const palette = await training.evaluate(`({ title: document.querySelector('#armoryPanel .armory-laser h4')?.textContent,
    count: document.querySelectorAll('#armoryPanel .armory-laser [data-laser]').length,
    disabled: document.querySelectorAll('#armoryPanel .armory-laser [data-laser]:disabled').length })`);
  assert.equal(palette.title, 'Laser color');
  assert.equal(palette.count, 7);
  assert.equal(palette.disabled, 0, 'every laser color is available in training');
  await training.evaluate(`document.querySelector('#armoryPanel .armory-laser [data-laser="white"]').click()`);
  assert(await training.evaluate(`document.querySelector('#armoryPanel .armory-laser [data-laser="white"]').getAttribute('aria-pressed') === 'true'`), 'white laser can be selected in training');
  assert.equal(training.errors.length, 0, training.errors.join('\n'));
  await training.close();
  console.log('PASS GP-20074: integrated resupply and readable layout, shelf inventory, workbench pair, independent stow/Y gate, seven training laser colors, no page errors');
} finally {
  await browser.close();
  await server.close();
}
