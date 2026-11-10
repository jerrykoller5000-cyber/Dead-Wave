import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const results = [];
const ok = (name, value) => { results.push({ name, pass: !!value }); console.log(`${value ? 'PASS' : 'FAIL'} ${name}`); };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 60000 })) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 })) throw new Error('opening did not dismiss');
  await page.evaluate(`(() => { document.querySelector('#playerName').value = 'CIF Training'; document.querySelector('#modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 })) throw new Error('Training Ground did not start');
  const before = await page.evaluate('TT.getBank()');
  await page.evaluate('TT.openCIF()');
  ok('Training CIF opens', await page.evaluate('TT.isCIFOpen()'));
  ok('Training helmet is marked free', await page.evaluate(`document.querySelector('#cifIssue [data-cif-buy="helmet"]')?.textContent.includes('Free training stock')`));
  await page.evaluate(`document.querySelector('#cifIssue [data-cif-buy="helmet"] button').click()`);
  ok('Training helmet bought and worn without Cash charge', await page.evaluate(`TT.getGearOwned().helmet && TT.getArmor() === 25 && TT.getBank() === ${before}`));
  await page.evaluate(`document.querySelector('#cifIssue [data-cif-buy="nvg"] button').click(); document.querySelector('#cifTabs [data-cif-tab="kit"]').click(); document.querySelector('#cifIssue [data-cif-buy="vest"] button').click(); document.querySelector('#cifIssue [data-cif-buy="pads"] button').click()`);
  ok('Training NODs, vest and pads bought without Cash charge', await page.evaluate(`TT.getGearOwned().nvg && TT.getGearOwned().vest && TT.getGearOwned().pads && TT.getBank() === ${before} && TT.getArmor() === 90`));
  await page.screenshot(path.join(root, 'review/GP-20069/training-kit.png'));
  await page.evaluate('TT.closeCIF(); TT.trainingDbg.start()');
  if (!await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 })) throw new Error('Training restart did not finish');
  ok('Training restart resets gear', await page.evaluate('Object.values(TT.getGearOwned()).every(v => !v) && TT.getArmor() === 0'));
  if (page.errors.length) console.log('Browser errors:', page.errors.slice(0, 4));
  if (results.some(r => !r.pass) || page.errors.length) throw new Error(`${results.filter(r => !r.pass).length} checks failed, ${page.errors.length} browser errors`);
  console.log(`${results.length} passed, 0 failed`);
} finally {
  await browser.close();
  await server.close();
}
