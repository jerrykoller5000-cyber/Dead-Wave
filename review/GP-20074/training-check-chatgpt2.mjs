import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launch } from '../../tools/cdp.mjs';
import { serve } from '../../tools/serve.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through the crew game-test slot');
const server = await serve(fileURLToPath(new URL('../../', import.meta.url)), 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(server.origin + '/index.html?debug=1');
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden'));
  await page.evaluate("document.querySelector('#playerName').value = 'Training Armory'; document.querySelector('#modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"'), 'Training started');
  await page.evaluate("TT.openMenuDbg('armory'); TT.addCash(1000000); document.querySelector('[data-buy-gun=\"uzi\"]').click(); TT.armoryDbg.ui().bench('uzi')");
  const palette = await page.evaluate(`(() => {
    const area = document.querySelector('#armoryPanel .armory-laser');
    return { title: area.querySelector('h4').textContent,
      colors: Array.from(area.querySelectorAll('[data-laser]'), b => b.dataset.laser),
      disabled: area.querySelectorAll('[data-laser]:disabled').length };
  })()`);
  assert.equal(palette.title, 'Laser color');
  assert.equal(new Set(palette.colors).size, 7);
  assert.equal(palette.disabled, 0);
  await page.evaluate("document.querySelector('#armoryPanel [data-laser=\"white\"]').click()");
  assert.equal(await page.evaluate("document.querySelector('#armoryPanel [data-laser=\"white\"]').getAttribute('aria-pressed')"), 'true');
  assert.deepEqual(page.errors, []);
  console.log('PASS Training Armory:', palette.colors.join(', '), 'available; white selected; 0 page errors');
} finally {
  await browser.close();
  await server.close();
}
