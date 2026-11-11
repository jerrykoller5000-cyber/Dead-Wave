import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20097');
fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='Walkthrough';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  const capture=async(stage,expr)=>{
    const data=await page.evaluate(expr);
    rows.push({stage,data});
    await page.screenshot(path.join(out,`${String(rows.length).padStart(2,'0')}-${stage}.png`));
    return data;
  };
  const stand=site=>`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.stations[${JSON.stringify(site)}];T.player.position.set(s.front.x,tg.floorY,s.front.z);for(let i=0;i<5;i++)T.stepFrame(.016);return {site:${JSON.stringify(site)},action:T.trainingDbg.action(),prompt:document.getElementById('kioskPrompt')?.textContent,position:T.player.position.toArray(),front:s.front};})()`;
  await capture('entry',`(()=>({active:TT.trainingDbg.state().active,unarmed:TT.isUnarmed(),cash:TT.getBank(),prompt:document.getElementById('kioskPrompt')?.textContent,order:TT.WEAPON_ORDER}))()`);
  for(const site of ['kiosk','cif','armory','rangeConsole','lightSwitch','hqPanel','skullWindow']){
    await capture(`${site}-approach`,stand(site));
    const data=await capture(`${site}-open`,`(()=>{const T=TT;T.doAction();for(let i=0;i<5;i++)T.stepFrame(.016);const ids=['shop','cifPanel','armoryPanel','rangeConsole','trainingPanel'];return {site:${JSON.stringify(site)},panels:ids.map(id=>{const e=document.getElementById(id);return {id,hidden:e?.hidden,display:e?.style.display,show:e?.classList.contains('show'),text:e?.textContent?.slice(0,450)}}),prompt:document.getElementById('kioskPrompt')?.textContent,lights:T.trainingDbg.lights(),bodyText:document.body.innerText.slice(-300)};})()`);
    if(site==='kiosk')await page.evaluate('TT.closeShop()');
    if(site==='cif'||site==='armory')await page.evaluate('TT.closeCIF()');
    if(site==='rangeConsole')await page.evaluate('TT.rangeDbg.exit()');
    if(site==='hqPanel')await page.evaluate('TT.trainingDbg.panel().close()');
    if(site==='lightSwitch')await page.evaluate("TT.trainingDbg.act('trainingLights')");
    if(site==='skullWindow')await page.evaluate('TT.closeCIF?.()');
    rows.push({stage:`${site}-closed`,data:{ok:true}});
    if(data?.panels?.some(x=>x.hidden===false||x.show))console.log('OPEN',site);
  }
  assert.deepEqual(page.errors,[]);
  console.log(`PASS GP-20097 station probe: ${rows.length} states, 15 shots, 0 page errors`);
}finally{fs.writeFileSync(path.join(out,'station-probe.json'),JSON.stringify(rows,null,2));await browser.close();await server.close();}
