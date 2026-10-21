// GP-57: visual and DOM comparison of the dawn banner with and without the dare.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const shots=path.join(root,'Claude outputs/shots/gp57');
fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);
let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/dawn-dare-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>body{background:#15251d;--font-hud:monospace}</style><link rel="stylesheet" href="/ui/hud-layout.css"></head><body><script type="module">import {mountDawn} from '/ui/dawn.js';window.card=mountDawn();card.show({day:14,kills:42,skulls:83,best:8});</script></body></html>`}));
 await page.goto(server.origin+'/dawn-dare-fixture');
 await page.waitForFunction(()=>window.card?.dialog.open);
 for(const width of [1280,390]) {
  const height=width===390?844:720;
  await page.setViewportSize({width,height});
  const bonus=page.locator('#dawnCard .dawn-dare');
  assert.equal(await bonus.isVisible(),false,'plain night has no dare line');
  await page.screenshot({path:path.join(shots,`before-${width}.png`)});
  await page.evaluate(()=>card.show({day:14,kills:42,skulls:83,best:8,dare:{day:14,earned:37}}));
  assert.match(await bonus.innerText(),/Lights out earned 37 extra skull value/);
  assert.match(await page.locator('#dawnCard .dawn-tip').last().innerText(),/Bank your skulls/);
  const box=await page.locator('#dawnCard').boundingBox();
  assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,'banner fits viewport');
  await page.screenshot({path:path.join(shots,`after-${width}.png`)});
  await page.evaluate(()=>card.show({day:15,kills:2,skulls:0,best:1,dare:{day:14,earned:37}}));
  assert.equal(await bonus.isVisible(),false,'old dare cannot appear on a new night');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS GP-57 dawn dare banner: bonus only on matching night, bank tip retained, 1280/390 fit, no page errors.');
} finally {
 if(browser)await browser.close();
 server.close();
}
