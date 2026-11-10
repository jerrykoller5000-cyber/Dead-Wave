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
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 60000 })) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 })) throw new Error('opening did not dismiss');
  await page.evaluate(`(() => { document.querySelector('#playerName').value = 'Ammo Repro'; document.querySelector('#modeHunt').click(); })()`);
  if (!await page.waitFor('TT.getPhase() === "prep" && !document.body.classList.contains("deploying")', { timeout: 60000 })) throw new Error('prep did not start');
  const state = `({ cash: TT.getBank(), mag: TT.magazinesDbg('pistol'), prompt: document.querySelector('#reloadPrompt').textContent, promptClass: document.querySelector('#reloadPrompt').className, hud: document.querySelector('#ammoDetail')?.textContent, reload: TT.getReloadDbg() })`;
  await page.evaluate(`TT.addCash(200); TT.setMagazinesDbg('pistol', 0, [])`);
  console.log('EMPTY', await page.evaluate(state));
  await page.evaluate(`TT.openMenuDbg('armory'); document.querySelector('#armoryPanel .armory-actions button:nth-child(2)').click(); document.querySelector('#shopTabs [data-shop-page="supplies"]').click()`);
  console.log('SHOP', await page.evaluate(`({ mode: document.querySelector('#shopTitle')?.textContent, rows: [...document.querySelectorAll('#shopList [data-ammo]')].map(x => ({ id: x.dataset.ammo, text: x.textContent.slice(0,120), disabled: x.querySelector('button').disabled })) })`));
  await page.evaluate(`document.querySelector('#shopList [data-ammo="pistol"] button').click()`);
  console.log('BOUGHT', await page.evaluate(state));
  await page.evaluate('TT.closeShop()');
  console.log('CLOSED', await page.evaluate(state));
  await page.evaluate('TT.startReload()');
  console.log('RELOAD', await page.evaluate(state));
  if (page.errors.length) console.log('ERRORS', page.errors);
} finally {
  await browser.close();
  await server.close();
}
