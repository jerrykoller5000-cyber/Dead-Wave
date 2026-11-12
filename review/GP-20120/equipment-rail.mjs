// GP-20120: contextual rail witness and real Armory/CIF station actions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20120');
const report={at:new Date().toISOString(),stages:[],errors:[]};
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(`${server.origin}/index.html?debug=1`,{timeout:400000});
 if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:400000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');
 await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
 await page.evaluate(`(()=>{window.__qa={stage:'entry',last:0,spikes:[]};const f=t=>{const q=__qa;if(q.last&&t-q.last>100)q.spikes.push({stage:q.stage,ms:+(t-q.last).toFixed(1)});q.last=t;requestAnimationFrame(f);};requestAnimationFrame(f);document.getElementById('playerName').value='GP-20120 Equipment';document.getElementById('modeTraining').click();})()`);
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry');
 async function stage(name,expr,shot=true){await page.evaluate(`__qa.stage=${JSON.stringify(name)}`);const data=await page.evaluate(expr);await pause(500);if(shot)await page.screenshot(path.join(out,`${name}.png`));report.stages.push({name,data});console.log(name,JSON.stringify(data));return data;}
 await stage('rail-context',`(()=>{const T=TT,tg=T.trainingDbg.tg(),O=tg.origin;T.setWorldTime(.5);T.weather.raining=false;T.setViewFirstDbg(false);T.setUnarmedDbg(true);T.player.position.set(O.x,tg.floorY,O.z-.67);T.setVelDbg(0,0);T.setShotView({x:O.x+1.3,y:tg.floorY+1.55,z:O.z-3.7,tx:O.x,ty:tg.floorY+.35,tz:O.z+.18,fov:47});
  const bench=tg.group.getObjectByName('training-firing-bench');let n=0;bench?.traverse(o=>{if(!o.isMesh||o.material?.color?.getHex()!==0x3a4046)return;o.material=new T.THREE.MeshBasicMaterial({color:0xffdd00,side:T.THREE.DoubleSide});n++;});return {marine:T.player.position.toArray(),bench:!!bench,steelMeshes:n};})()`,true);
 await stage('armory-open-real',`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;T.setShotView(null);T.setUnarmedDbg(false);T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return {open:!document.getElementById('armoryPanel').hidden,loadout:T.armoryDbg.ui().armory.loadout()};})()`,true);
 await stage('armory-buy-real',`(()=>{const T=TT,b=document.querySelector('#armoryPanel [data-buy-gun=m4]');if(b&&!b.disabled)b.click();return {owned:!!T.getWeaponOwned().m4,loadout:T.armoryDbg.ui().armory.loadout(),disabled:b?.disabled};})()`,true);
 await stage('armory-take-real',`(()=>{const T=TT,A=T.armoryDbg.ui().armory;document.querySelector('#armoryPanel [data-slot="primary:0"]')?.click();const b=document.querySelector('#armoryPanel [data-gun="m4"]');b?.click();return {tile:!!b,loadout:A.loadout(),shelf:A.read().shelf.map(x=>x.id)};})()`,true);
 await stage('armory-stow-real',`(()=>{const T=TT,A=T.armoryDbg.ui().armory;document.querySelector('#armoryPanel [data-slot="primary:0"]')?.click();const b=document.querySelector('#armoryPanel .armory-actions button');const before={loadout:A.loadout(),button:b?.textContent,disabled:b?.disabled};if(b&&!b.disabled)b.click();return {before,after:A.loadout(),shelf:A.read().shelf.map(x=>x.id)};})()`,true);
 await stage('armory-close-real',`(()=>{TT.armoryDbg.ui().close();return {armoryHidden:document.getElementById('armoryPanel').hidden,cif:TT.isCIFOpen(),className:document.getElementById('cifPanel')?.className};})()`,false);
 await stage('cif-open-real',`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.cif.front;T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return {open:T.isCIFOpen(),action:T.trainingDbg.action(),player:T.player.position.toArray(),className:document.getElementById('cifPanel')?.className};})()`,true);
 report.cifAfterWait=await page.evaluate(`({open:TT.isCIFOpen(),className:document.getElementById('cifPanel')?.className})`);
 await stage('cif-camo-real',`(()=>{const b=document.querySelector('[data-camo=marpat]');b?.click();return {open:TT.isCIFOpen(),button:!!b,selected:b?.className,camo:TT.getCamo?.()};})()`,true);
 await stage('cif-shirt-real',`(()=>{document.querySelector('[data-cif-tab=body]')?.click();document.querySelector('[data-cif-item=shirt]')?.click();const b=document.querySelector('#cifOptions button:last-child');b?.click();return {open:TT.isCIFOpen(),shirtOption:!!b,button:b?.textContent};})()`,true);
 report.spikes=await page.evaluate('__qa.spikes');report.errors=page.errors.slice();report.warnings=page.console.filter(x=>/warn|error/i.test(x.type)||/WebGPU|validation/i.test(x.text)).map(x=>`${x.type}: ${x.text.slice(0,250)}`);
 console.log('summary',JSON.stringify({spikes:report.spikes.length,errors:report.errors.length,warnings:report.warnings.length}));
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'equipment-rail.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
