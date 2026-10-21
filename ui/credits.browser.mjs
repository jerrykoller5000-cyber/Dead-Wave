// GP-73: the credits are reachable from, and return to, the live title screen.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';

const {chromium} = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots/gp73');
fs.mkdirSync(shots, {recursive:true});
let src = fs.readFileSync(path.join(root,'index.html'),'utf8');
if (!gpu) src = src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
const server = await serve(root,0);
let browser;
try {
  browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page = await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
  await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.TT && DWLoad.snapshot().state==='ready',null,{timeout:120000}).catch(async error=>{
    console.error('Load diagnostics:', errors, await page.evaluate(()=>({load:window.DWLoad?.snapshot?.(),card:document.getElementById('errorCardText')?.textContent})));
    throw error;
  });
  await page.evaluate(()=>DWOpening.dismissForTesting());
  await page.waitForFunction(()=>document.getElementById('opening').hidden);
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:720});
    await page.locator('#menuCreditsBtn').evaluate(el=>el.style.visibility='hidden');
    await page.screenshot({path:path.join(shots,`before-${width}${gpu?'-gpu':''}.png`)});
    await page.locator('#menuCreditsBtn').evaluate(el=>el.style.visibility='');
    await page.click('#menuCreditsBtn');
    const panel=page.locator('#menuCredits');
    assert(await panel.isVisible());
    const copy=await panel.innerText();
    for(const expected of ['Jerry Koller','Claude','Cursor','ChatGPT','Grokbot','Antigravity','Quaternius','CC0','Music'])
      assert(copy.includes(expected),expected+' missing from credits');
    const box=await panel.boundingBox();
    assert(box.x>=0 && box.x+box.width<=width,'credits fit width');
    await page.screenshot({path:path.join(shots,`after-${width}${gpu?'-gpu':''}.png`)});
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(),false,'Escape returns to title');
    assert(await page.locator('#modeHunt').isVisible(),'Play returns');
  }
  await page.click('#menuCreditsBtn');
  await page.click('#menuCreditsBack');
  assert.equal(await page.locator('#menuCredits').isVisible(),false,'Back returns to title');
  assert.deepEqual(errors,[]);
  console.log(`PASS GP-73 credits (${gpu?'WebGPU':'stand-in renderer'}): attribution, Back/Escape, 1280/390 fit, no page errors.`);
} finally {
  if(browser) await browser.close();
  server.close();
}
