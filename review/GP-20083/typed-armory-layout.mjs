// Visual check for GP-20083 while CB-294 supplies the live ammo state.
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Use the crew game-test slot');
const root = fileURLToPath(new URL('../..', import.meta.url));
const output = path.join(root, 'review/GP-20083');
const server = await serve(root, 0);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(server.origin + '/review/GP-20083/typed-armory-fixture.html');
  assert(await page.waitFor('!!window.fixture && !!document.querySelector(".armory-typed-list li")'));
  for (const [width, height] of [[1280, 720], [390, 844]]) {
    await page.setViewport(width, height);
    await page.evaluate('fixture.showOld()');
    await page.evaluate('document.querySelector(".armory-bench").scrollIntoView({block:"center"})');
    await page.screenshot(path.join(output, `armory-before-${width}.png`));
    await page.evaluate('fixture.showTyped()');
    await page.evaluate('document.querySelector(".armory-typed").scrollIntoView({block:"center"})');
    await page.screenshot(path.join(output, `armory-typed-${width}.png`));
    const bounds = await page.evaluate(`(()=>{const r=document.querySelector('.armory-typed-list').getBoundingClientRect();return {x:r.x,right:r.right,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
    assert(bounds.x >= 0 && bounds.right <= width, 'typed rows fit the viewport');
    assert(!bounds.overflow, 'no horizontal overflow');
  }
  assert.equal(await page.evaluate('document.querySelectorAll(".armory-typed-list li").length'), 3);
  assert.equal(await page.evaluate('document.querySelector("[data-buy-ammo-type=birdshot]").disabled'), true);
  assert.equal(await page.evaluate('document.querySelector("[data-buy-ammo-type=slug]").disabled'), true);
  assert.equal(await page.evaluate('document.querySelector("[data-ammo-type=buckshot] .armory-typed-copy small").textContent'), '15 / 20 carried');
  assert.equal(await page.evaluate('document.querySelector("[data-ammo-type=buckshot] .armory-typed-price").textContent'), 'Pack of 5 · $21 Cash');
  await page.evaluate('document.querySelector("[data-buy-ammo-type=buckshot]").click()');
  assert.equal(await page.evaluate('fixture.bought'), 'shotgun:buckshot');
  assert.deepEqual(page.errors, []);
  console.log('PASS GP-20083 typed Armory: three priced rows, full and unaffordable states, partial pack price, buy callback, 1280/390 fit, no page errors');
} finally {
  await browser.close();
  await server.close();
}
