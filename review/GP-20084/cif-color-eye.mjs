import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20084');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
 assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
 await page.evaluate('DWOpening.dismissForTesting()');
 assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
 await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20084 CIF';document.getElementById('modeTraining').click()})()`);
 assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
 assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
 await page.evaluate(`(()=>{document.getElementById('perf')?.classList.remove('on');TT.trainingDbg.act('cif');document.querySelector('[data-cif-tab="body"]').click();document.querySelector('[data-cif-item="shirt"]').click()})()`);
 for(const width of [1280,390]){
  await page.setViewport(width,width===390?844:720);
  const found=await page.evaluate(`(()=>{const h=[...document.querySelectorAll('#cif .cif-group')].find(e=>e.textContent==='Plain colors');if(!h)return false;h.scrollIntoView({block:'center'});return true})()`);
  assert(found,'Plain colors group is visible in CIF body/shirt');
  await page.evaluate(`([...document.querySelectorAll('#cif .cif-group')].find(e=>e.textContent==='Plain colors')).textContent='Plain colours'`);
  await page.screenshot(path.join(out,`before-${width}-cif-colors.png`));
  await page.evaluate(`([...document.querySelectorAll('#cif .cif-group')].find(e=>e.textContent==='Plain colours')).textContent='Plain colors'`);
  await page.screenshot(path.join(out,`after-${width}-cif-colors.png`));
 }
 assert.deepEqual(page.errors,[]);
 console.log('PASS GP-20084 CIF color: exact previous/current wording at 1280/390, no page errors');
}finally{await browser.close();await server.close();}
